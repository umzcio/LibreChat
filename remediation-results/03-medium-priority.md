# Remediation Report 03: Medium-Priority Fixes

## Fix 3.1: `asyncHandler` Wrapper and Route Migration

### What was done

Created `api/server/middleware/asyncHandler.js` -- a thin utility that wraps async route handlers and forwards rejected promises to Express's `next(err)`, which is caught by the existing `ErrorController` (registered at the bottom of `api/server/index.js` line 227).

Migrated 6 route files to use `asyncHandler`, removing boilerplate try/catch blocks:

| File | Routes migrated | Notes |
|---|---|---|
| `api/server/routes/projects.js` | 14 handlers | File upload middleware handler kept its own try/catch for Multer-specific error responses |
| `api/server/routes/messages.js` | 9 handlers | All uniform 500 catch blocks removed |
| `api/server/routes/convos.js` | 10 handlers | OpenAI thread deletion try/catch preserved (specific retry logic) |
| `api/server/routes/tags.js` | 5 handlers | Clean migration |
| `api/server/routes/memories.js` | 5 handlers | Clean migration |
| `api/server/routes/share.js` | 6 handlers | Clean migration |

**Not migrated:** `api/server/routes/mcp.js` -- This file contains complex OAuth flow handlers with redirect-based error responses, CSRF validation, and multi-step token exchange logic. The catch blocks produce specific redirect URLs and flow state updates that would be lost with a generic error handler.

### Files changed
- **Created:** `/projects/LibreEco/LibreChat/api/server/middleware/asyncHandler.js`
- **Modified:** 6 route files listed above

---

## Fix 3.2: CORS Wildcard Fallback in SSE Headers

### Problem
`api/server/middleware/setHeaders.js` set `Access-Control-Allow-Origin` with a fallback chain that ended at `'*'`, which is overly permissive for SSE endpoints.

### What was done
Replaced the fallback logic:

- **When `DOMAIN_CLIENT` is set:** Only allow that origin. If the request origin doesn't match, the header is set to `DOMAIN_CLIENT` (browser will reject cross-origin SSE from unauthorized origins).
- **When `DOMAIN_CLIENT` is not set (development):** Use the request's `origin` header and log a warning encouraging configuration.
- **Never falls back to `'*'`.**

### File changed
- `/projects/LibreEco/LibreChat/api/server/middleware/setHeaders.js`

---

## Fix 3.3: Memory Update Route Delete-Before-Create Data Loss

### Problem
`PATCH /memories/:key` deleted the existing memory before creating the replacement. If `addMemories` failed after deletion, the original memory was lost with no recovery path.

### What was done
Reversed the operation order:
1. Create the new memory first via `mem0.addMemories()`
2. Verify the new memory ID was returned (fail fast if not)
3. Delete the old memory only after successful creation
4. If deletion fails, log a warning but still return success (the new memory exists; stale old entry is a minor issue vs data loss)

Also added `logger` import (was missing from this file).

### File changed
- `/projects/LibreEco/LibreChat/api/server/routes/memories.js`

---

## Fix 3.4: Global `EventEmitter.defaultMaxListeners` Mutation

### Problem
Line 1 of `api/server/controllers/agents/client.js` set `require('events').EventEmitter.defaultMaxListeners = 100`, mutating a global that affects every EventEmitter in the process.

### What was done
- Removed the global mutation
- Added `abortController.signal.setMaxListeners(100)` on the specific AbortController signal used during agent runs (the likely source of the MaxListeners warnings, since the signal gets many `abort` listeners from parallel agent tool invocations)
- Used a feature check (`typeof setMaxListeners === 'function'`) for Node.js version compatibility

### File changed
- `/projects/LibreEco/LibreChat/api/server/controllers/agents/client.js`

---

## Fix 3.5: Replace `Record<string, unknown>` with Explicit Types (Partial)

### Analysis
Scanned 27 files with 192 occurrences in `packages/data-schemas/src/`. The vast majority fall into these categories:

1. **Mongoose update operators** (`$push`, `$set`, `$pull`, filter queries) -- genuinely dynamic, Mongoose's own types are similarly broad
2. **`.lean()` results** -- return plain objects that could use interface types
3. **JWT payloads and model parameters** -- genuinely dynamic

### What was done

**`packages/data-schemas/src/methods/conversation.ts`** (4 occurrences fixed):
- `convoMap` return type: `Record<string, unknown>` -> `Record<string, IConversation>`
- `ConversationMethods.getConvosQueried` interface updated to match
- `bulkSaveConvos` parameter: `Array<Record<string, unknown>>` -> `Array<Partial<IConversation>>`
- Cursor `lastReturned` cast: removed `as Record<string, unknown>`, use `keyof IConversation`

**`packages/data-schemas/src/methods/agent.ts`** (4 occurrences fixed):
- Created `AgentListItem` interface for the projected fields returned by `getListAgentsByAccess`
- `getListAgentsByAccess` return type `data`: `Array<Record<string, unknown>>` -> `Array<AgentListItem>`
- Lean query result cast updated to use `AgentListItem`
- `createAgent` parameter: `Record<string, unknown>` -> `Partial<IAgent> & { id: string }`

**`packages/data-schemas/src/methods/prompt.ts`** (4 occurrences fixed):
- Created `PromptGroupLean` type alias for lean prompt group objects
- `attachProductionPrompts` parameter and return type updated to use `PromptGroupLean`
- All callers updated to cast to `PromptGroupLean` instead of `Record<string, unknown>`

### Remaining occurrences (not changed)
The remaining ~180 occurrences are:
- **Mongoose update/filter objects** (agent.ts `updateData`, `$push`, `versionEntry`; conversation.ts `update`, `updateOperation`; prompt.ts filter params) -- these use MongoDB operators with dynamic keys that would require complex generic Mongoose update types for marginal benefit
- **mongoMeili.ts** (17 occurrences) -- MeiliSearch integration layer with genuinely polymorphic document shapes
- **tenantIsolation.ts** (7 occurrences) -- Mongoose middleware operating on arbitrary update payloads
- **config.ts, session.ts** -- JWT payloads and config objects that are intentionally open-ended

### Files changed
- `/projects/LibreEco/LibreChat/packages/data-schemas/src/methods/conversation.ts`
- `/projects/LibreEco/LibreChat/packages/data-schemas/src/methods/agent.ts`
- `/projects/LibreEco/LibreChat/packages/data-schemas/src/methods/prompt.ts`
