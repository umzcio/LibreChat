# Merge Conflict Analysis: upstream/main vs feat/projects

**Date:** 2026-04-04
**Merge base:** `6ecd1b510` (last merged upstream commit)
**Upstream commits to merge:** 11 commits (`ed02fe40e..8ed0bcf5c`)

---

## Summary

| Classification | Count |
|---|---|
| CLEAN | 4 |
| OVERLAP (auto-mergeable, review needed) | 4 |
| CONFLICT (will produce git conflicts) | 2 |
| SEMANTIC CONFLICT (compiles but breaks at runtime) | 1 |

**Overall Risk: HIGH** -- Multiple Recoil-back-to-Jotai semantic conflicts, plus direct git conflicts on config/permissions files where upstream removes project-related code we added.

---

## Recoil Pattern Check (CRITICAL)

The upstream diff introduces **222 `from 'recoil'` lines**, **596 Recoil hook calls**, and **64 Recoil primitives** across client files. These are NOT new Recoil additions -- they represent the upstream baseline where Recoil still exists. However, several upstream commits modify files we have already converted to Jotai:

### Files with Recoil-to-Jotai Semantic Conflicts

| File | Upstream Commit | Upstream adds `from 'recoil'` | Our code uses `from 'jotai'` |
|---|---|---|---|
| `client/src/components/Chat/Messages/MultiMessage.tsx` | b4d97bd88 | `useRecoilState` | `useAtom` |
| `client/src/components/Chat/Messages/MessagesView.tsx` | b4d97bd88 | `useRecoilValue` | `useAtomValue` |
| `client/src/components/Chat/Messages/MessageParts.tsx` | b4d97bd88 | `useRecoilValue` | `useAtomValue` |
| `client/src/components/UnifiedSidebar/ConversationsSection.tsx` | 936936596 | `useSetRecoilState`, `useRecoilValue` | `useAtomValue`, `useSetAtom` |
| `client/src/hooks/AuthContext.tsx` | 261941c05 | `useRecoilState`, `useSetRecoilState` | `useAtom`, `useSetAtom` |
| `client/src/hooks/Input/useAutoSave.ts` | 162ac9c25 | `useRecoilValue`, `SetterOrUpdater` | `useAtomValue`, `AtomSetter` |
| `client/src/hooks/__tests__/AuthContext.spec.tsx` | 261941c05 | `RecoilRoot` | We removed `RecoilRoot` |
| `client/src/data-provider/roles.ts` | 261941c05 | `console.error` (replaces `logger.error`) | We already use `logger.error` |
| `packages/client/src/hooks/useLocalize.ts` | 2140729a5 | Removes `useAtomValue`/`langAtom` | We already use Jotai here |
| `packages/client/src/store.ts` | 2140729a5 | Removes `langAtom` | We already use Jotai here |

---

## Per-Commit Analysis

---

### Commit ed02fe40e: Allow Nested `addParams` in Config Schema (#12526)
**Classification:** CONFLICT

| File | Local Change | Upstream Change | Interaction |
|---|---|---|---|
| `.gitignore` | Added entries | Adds `.codex` ignore | OVERLAP (low risk) |
| `packages/data-provider/src/config.ts` | Un-exported `getSchemaDefaults`; kept `branding` field | Re-exports `getSchemaDefaults`; removes `branding`; adds `addParamsSchema`, `fileStorageSchema`; removes `endpointsMenu`/`sidePanel` | **CONFLICT** |
| `packages/data-provider/specs/config-schemas.spec.ts` | No local changes | Adds new test cases | CLEAN |

**Risk:** HIGH
**Notes:**
- **DIRECT CONFLICT on `config.ts`:** We un-exported `getSchemaDefaults` (dead code removal), upstream re-exports it. We kept `branding` in `TStartupConfig` and `configSchema`, upstream removes both. We kept `endpointsMenu`/`sidePanel` in `interfaceSchema`, upstream removes them. The `fileStrategy` schema type changes (`fileSourceSchema` -> `fileStorageSchema`). All these are in overlapping regions.
- Resolution: Accept upstream's `addParamsSchema`/`fileStorageSchema`/`endpointsMenu`/`sidePanel` removals, but RE-ADD our `branding` field (needed for our fork). Re-export `getSchemaDefaults` per upstream since they now use it.

---

### Commit fa4a43da2: Strip `code_challenge` from Admin OAuth (#12534)
**Classification:** CLEAN

| File | Local Change | Upstream Change | Interaction |
|---|---|---|---|
| `api/server/routes/admin/auth.js` | No local changes | Refactors PKCE handling | CLEAN |
| `packages/api/src/auth/adminPkce.spec.ts` | N/A (new file) | New test file | CLEAN |
| `packages/api/src/auth/exchange.ts` | N/A (new file) | New PKCE utility | CLEAN |

**Risk:** NONE

---

### Commit b4d97bd88: Eliminate Unstable React Keys During SSE Lifecycle (#12536)
**Classification:** SEMANTIC CONFLICT

| File | Local Change | Upstream Change | Interaction |
|---|---|---|---|
| `client/src/components/Chat/Messages/Message.tsx` | No local changes | Removes `key={messageId}` from MultiMessage | CLEAN |
| `client/src/components/Chat/Messages/MessageIcon.tsx` | No local changes | Refactors `arePropsEqual`, removes logger | CLEAN |
| `client/src/components/Chat/Messages/MessageParts.tsx` | Jotai migration (`useAtomValue`) | Adds `useRecoilValue` import, removes `key={messageId}` | **SEMANTIC CONFLICT** |
| `client/src/components/Chat/Messages/MessagesView.tsx` | Jotai migration (`useAtomValue`) | Adds `useRecoilValue`, removes `key={conversationId}` | **SEMANTIC CONFLICT** |
| `client/src/components/Chat/Messages/MultiMessage.tsx` | Jotai migration (`useAtom`) | Replaces `useAtom` with `useRecoilState`; refactors to `sharedProps` pattern | **SEMANTIC CONFLICT** |
| `client/src/components/Messages/MessageContent.tsx` | No local changes | Removes `key={messageId}` | CLEAN |
| `.../__tests__/MessageIcon.render.test.tsx` | N/A (new file) | New test | CLEAN |

**Risk:** HIGH
**Notes:**
- Three files (MultiMessage, MessagesView, MessageParts) will have Recoil imports merged where we use Jotai. Git will auto-merge these because the import lines are different, but the result will have BOTH Recoil and Jotai imports, which will fail at runtime (Recoil is not installed).
- The actual logic changes (removing unstable keys, `sharedProps` pattern) are valuable and should be kept. Just need to convert Recoil -> Jotai in the merge result.
- `MultiMessage.tsx` is the most complex: upstream refactors the entire render section with `sharedProps` while changing the state hook. This will likely auto-merge incorrectly.

---

### Commit ea28dbfa8: Clean Up Config Fields (#12537)
**Classification:** CONFLICT

| File | Local Change | Upstream Change | Interaction |
|---|---|---|---|
| `client/src/components/Chat/Messages/MessageIcon.tsx` | No local changes | Removes debug logger, simplifies | CLEAN |
| `.../__tests__/MessageIcon.render.test.tsx` | N/A (new file) | Refactors tests | CLEAN |
| `librechat.example.yaml` | No local changes | Version bump to 1.3.7 | CLEAN |
| `packages/api/src/admin/config.handler.spec.ts` | N/A (new file) | New test | CLEAN |
| `packages/api/src/admin/config.spec.ts` | N/A (new file) | New test | CLEAN |
| `packages/api/src/admin/config.ts` | N/A (new file) | Config changes | CLEAN |
| `packages/api/src/app/AppService.spec.ts` | N/A (new file) | Test changes | CLEAN |
| `packages/api/src/app/checks.ts` | N/A (new file) | Removes config fields | CLEAN |
| `packages/api/src/app/config.test.ts` | N/A (new file) | Test changes | CLEAN |
| `packages/api/src/app/service.spec.ts` | N/A (new file) | Test changes | CLEAN |
| `packages/data-provider/package.json` | No local changes | Version bump 0.8.406 -> 0.8.407 | OVERLAP (trivial) |
| `packages/data-provider/specs/config-schemas.spec.ts` | No local changes | Adds new tests | CLEAN |
| `packages/data-provider/src/config.ts` | (same as ed02fe40e) | Removes `endpointsMenu`/`sidePanel`/`branding` | **CONFLICT** (same file, same commit chain) |
| `packages/data-schemas/src/app/interface.ts` | No local changes | Removes `endpointsMenu`/`sidePanel` fields | CLEAN |
| `packages/data-schemas/src/app/resolution.spec.ts` | N/A (new file) | Test changes | CLEAN |
| `packages/data-schemas/src/methods/config.spec.ts` | N/A (new file) | Test changes | CLEAN |
| `packages/data-schemas/src/types/app.ts` | Added `branding` field | Removes `branding` field; changes `FileSources` -> `FileStorage` | **CONFLICT** |

**Risk:** HIGH
**Notes:**
- `packages/data-schemas/src/types/app.ts`: We added `branding?: TCustomConfig['branding']`, upstream removes it. Direct conflict on adjacent/overlapping lines.
- The `FileSources` -> `FileStorage` type change for `fileStrategy` is a breaking rename that affects our code too.

---

### Commit 936936596: Only show Searchbar if enabled (#12424)
**Classification:** SEMANTIC CONFLICT

| File | Local Change | Upstream Change | Interaction |
|---|---|---|---|
| `client/src/components/UnifiedSidebar/ConversationsSection.tsx` | Jotai migration (`useAtomValue`, `useSetAtom`) | Replaces Jotai with Recoil (`useRecoilValue`, `useSetRecoilState`); changes `conversationIdByIndex(0)` to `conversationByIndex(0)`; adds `{search.enabled && ...}` guard | **SEMANTIC CONFLICT** |

**Risk:** MEDIUM
**Notes:**
- Recoil imports will conflict with our Jotai migration. The actual logic change (conditional SearchBar rendering + `conversationByIndex` instead of `conversationIdByIndex`) is useful.
- Additional concern: upstream uses `store.conversationByIndex(0)` which returns a full conversation object, while we use `store.conversationIdByIndex(0)` which returns just the ID. Need to verify our store has `conversationByIndex`.

---

### Commit 261941c05: Custom Role Permissions (#12528)
**Classification:** OVERLAP + SEMANTIC CONFLICT

| File | Local Change | Upstream Change | Interaction |
|---|---|---|---|
| `api/server/routes/__tests__/roles.spec.js` | N/A (new file) | New test | CLEAN |
| `api/server/routes/roles.js` | No local changes | Removes `.toUpperCase()`, adds `isOwnRole` gate | CLEAN |
| `client/src/components/Sharing/PeoplePickerAdminSettings.tsx` | No local changes | Refactors to use `useRoleSelector` | CLEAN |
| `client/src/components/ui/AdminSettingsDialog.tsx` | No local changes | Refactors to use `useRoleSelector` | CLEAN |
| `client/src/data-provider/roles.ts` | Uses `logger.error` | Adds `useListRoles`; replaces `logger.error` with `console.error` | **OVERLAP** |
| `client/src/hooks/AuthContext.tsx` | Jotai migration (`useAtom`, `useSetAtom`) | Adds Recoil imports + custom role fetching logic | **SEMANTIC CONFLICT** |
| `client/src/hooks/__tests__/AuthContext.spec.tsx` | Jotai migration (no `RecoilRoot`) | Adds `RecoilRoot` wrapping + new custom role tests | **SEMANTIC CONFLICT** |
| `client/src/hooks/index.ts` | No local changes | Adds `useRoleSelector` export | CLEAN |
| `client/src/hooks/useRoleSelector.ts` | N/A (new file) | New hook | CLEAN |
| `packages/data-provider/src/api-endpoints.ts` | Added project/code endpoints | Adds `adminRoles` endpoint; changes `getRole` to use `encodeURIComponent` | **OVERLAP** |
| `packages/data-provider/src/data-service.ts` | Added project/code services | Adds `listRoles` function | **OVERLAP** |
| `packages/data-provider/src/keys.ts` | Added project/code query keys | Adds `rolesList` key | **OVERLAP** |
| `packages/data-provider/src/roles.ts` | Added `PROJECTS` permission type | Adds `isSystemRoleName` function; removes `PROJECTS` references | **CONFLICT** |
| `packages/data-provider/src/types/queries.ts` | No local changes | Adds `ListRolesResponse` type | CLEAN |

**Risk:** HIGH
**Notes:**
- `AuthContext.tsx` and its test are the biggest concerns: upstream adds custom role logic with Recoil hooks, we need to convert to Jotai.
- `roles.ts` in data-provider: upstream adds `isSystemRoleName` and removes our `PROJECTS`-related permission entries. We need both.
- `data-service.ts`, `api-endpoints.ts`, `keys.ts`: Our project/code additions are in different sections from upstream's role additions, so git should auto-merge, but review is needed.

---

### Commit 162ac9c25: Properly Restore Draft Text (#12384)
**Classification:** SEMANTIC CONFLICT

| File | Local Change | Upstream Change | Interaction |
|---|---|---|---|
| `client/src/hooks/Input/useAutoSave.spec.ts` | N/A (new file) | New test file | CLEAN |
| `client/src/hooks/Input/useAutoSave.ts` | Jotai migration (`useAtomValue`, `AtomSetter`) | Replaces Jotai with Recoil (`useRecoilValue`, `SetterOrUpdater`); fixes `restoreText` blank draft bug; replaces `logger.error` with `console.error` | **SEMANTIC CONFLICT** |

**Risk:** MEDIUM
**Notes:**
- The draft restoration fix is valuable but comes with Recoil imports. We need the logic fix but must keep Jotai.
- The `AtomSetter` type (our custom Jotai type) vs `SetterOrUpdater` (Recoil type) will need translation.

---

### Commit 2140729a5: Prevent useLocalize from Overwriting Host App Language (#12515)
**Classification:** OVERLAP

| File | Local Change | Upstream Change | Interaction |
|---|---|---|---|
| `packages/client/src/hooks/useLocalize.ts` | Jotai migration (already uses Jotai) | Removes `langAtom`/`useAtomValue` imports, simplifies to `useCallback` only | **OVERLAP (convergent)** |
| `packages/client/src/store.ts` | Jotai (already uses Jotai atoms) | Removes `langAtom` export | **OVERLAP (convergent)** |

**Risk:** LOW
**Notes:**
- This is a **convergent change** -- upstream removes the language atom dependency from `useLocalize`, which aligns with our Jotai approach. Both sides end up without language state in this hook. The upstream version is simpler (no atom at all). Should auto-merge or be trivially resolvable.

---

### Commit b44ce264a: Bump mongodb-memory-server, mermaid, npm audit (#12543)
**Classification:** OVERLAP

| File | Local Change | Upstream Change | Interaction |
|---|---|---|---|
| `api/package.json` | Various changes | Bumps `mongodb-memory-server` | **OVERLAP** |
| `client/package.json` | Various changes | Bumps `mermaid` | **OVERLAP** |
| `package-lock.json` | Various changes | Large lockfile update | **OVERLAP** |
| `packages/data-schemas/package.json` | No local changes | Bumps `mongodb-memory-server` | CLEAN |
| `packages/data-schemas/src/methods/convoStructure.spec.ts` | No local changes | Uses deterministic timestamps | CLEAN |

**Risk:** LOW
**Notes:**
- `package.json` files likely auto-merge since version bumps are in different dependency entries.
- `package-lock.json` will definitely conflict (always does with parallel changes). Standard resolution: regenerate with `npm install` after merge.

---

### Commit 33ee7dea1: Explicit Primary Key for Meilisearch (#12542)
**Classification:** CLEAN

| File | Local Change | Upstream Change | Interaction |
|---|---|---|---|
| `packages/data-schemas/src/models/plugins/mongoMeili.spec.ts` | N/A (new file) | New tests | CLEAN |
| `packages/data-schemas/src/models/plugins/mongoMeili.ts` | No local changes | Fixes Meilisearch primary key | CLEAN |

**Risk:** NONE

---

### Commit 8ed0bcf5c: Reuse Existing MCP OAuth Client Registrations (#11925)
**Classification:** OVERLAP

| File | Local Change | Upstream Change | Interaction |
|---|---|---|---|
| `api/server/routes/__tests__/mcp.spec.js` | N/A (new file) | New OAuth tests | CLEAN |
| `api/server/routes/mcp.js` | Local: asyncHandler wrapper, cosmetics controller removal | Upstream: adds failFlow OAuth error handling, removes cosmetics route, removes `checkAdmin` import | **OVERLAP** |
| `api/server/services/MCP.js` | No local changes | Adds `deleteTokens` to tokenMethods | CLEAN |
| `packages/api/src/mcp/MCPConnectionFactory.ts` | No local changes | Adds client reuse + stale cleanup | CLEAN |
| `packages/api/src/mcp/__tests__/*` | No local changes | New/updated tests | CLEAN |
| `packages/api/src/mcp/oauth/handler.ts` | No local changes | Adds findToken/reuse logic | CLEAN |
| `packages/api/src/mcp/oauth/tokens.ts` | No local changes | Adds deleteClientRegistration | CLEAN |
| `packages/api/src/mcp/oauth/types.ts` | No local changes | Adds reusedStoredClient flag | CLEAN |

**Risk:** MEDIUM
**Notes:**
- `api/server/routes/mcp.js`: Both we and upstream remove the cosmetics route. Upstream adds ~23 lines of OAuth failFlow handling in the callback route. We added `asyncHandler` wrapper to routes. These touch different parts of the file but the cosmetics removal overlaps. Should mostly auto-merge but review the cosmetics section.

---

## Cross-Cutting Concerns

### 1. Project-Related Code Removal by Upstream

Upstream removes project-related code that we added in multiple shared packages:

| File | What upstream removes | Impact |
|---|---|---|
| `packages/data-provider/src/permissions.ts` | `PermissionTypes.PROJECTS`, `projectPermissionsSchema` | Our project permission checks break |
| `packages/data-provider/src/roles.ts` | `PROJECTS` permission entries in `roleDefaults` | Our project role defaults disappear |
| `packages/data-provider/src/accessPermissions.ts` | `ResourceType.PROJECT`, `AccessRoleIds.PROJECT_*` | Our project ACL breaks |
| `packages/data-provider/src/schemas.ts` | `projectId` from `tConversationSchema` | Our project-conversation link breaks |
| `packages/data-provider/src/api-endpoints.ts` | Project and code endpoint functions | Our project API calls break |
| `packages/data-provider/src/data-service.ts` | Project and code service functions | Our project data layer breaks |
| `packages/data-provider/src/keys.ts` | Project and code query/mutation keys | Our project React Query hooks break |
| `packages/data-provider/src/index.ts` | `types/code`, `types/projects` exports | Our project type imports break |
| `packages/data-provider/src/types/mcpServers.ts` | `MCPServerCosmeticUpdateParams`, `source` field | Our MCP cosmetic overrides break |
| `packages/data-provider/src/mcp.ts` | `MCPServerCosmeticUpdateSchema` | Our MCP cosmetic validation breaks |
| `api/server/controllers/mcp.js` | `updateMCPServerCosmeticsController` | Our cosmetic update endpoint breaks |

**Resolution:** All of these are "our additions that don't exist in upstream yet." The upstream diff shows them being "removed" because they exist in our HEAD but not in upstream/main. During merge, git will see these as conflicting additions. We need to KEEP all project/code/cosmetic-related additions.

### 2. Dead Code Re-export Conflicts

We un-exported several functions; upstream re-exports some:

| File | Function | We did | Upstream does |
|---|---|---|---|
| `packages/data-provider/src/config.ts` | `getSchemaDefaults` | Un-exported (dead code) | Re-exports it (used by new config tests) |
| `packages/data-provider/src/accessPermissions.ts` | `permBitsToAccessLevel` | Un-exported (dead code) | Re-exports it |
| `packages/data-provider/src/accessPermissions.ts` | `accessRoleToPermBits` | Un-exported (dead code) | Re-exports it |

**Resolution:** Re-export these functions since upstream now uses them.

### 3. Branding Field Conflict

| File | We did | Upstream does |
|---|---|---|
| `packages/data-provider/src/config.ts` | Kept `branding` in `TStartupConfig` and `configSchema` | Removes `branding` from both |
| `packages/data-schemas/src/types/app.ts` | Added `branding` to `AppConfig` | Removes `branding` from `AppConfig` |

**Resolution:** We need `branding` for our fork. Re-add after merge.

### 4. File Rename Conflict: initalize.js vs initialize.js

We renamed `api/server/services/Endpoints/assistants/initalize.js` to `initialize.js` (typo fix). Upstream keeps the misspelled name. During merge, upstream will recreate `initalize.js`. We'll end up with both files. Need to delete the misspelled one post-merge.

---

## Merge Strategy Recommendations

### Pre-merge preparation:
1. Back up current branch: `git branch feat/projects-backup`

### Merge execution:
2. Run: `git merge upstream/main`
3. Expect conflicts in:
   - `packages/data-provider/src/config.ts` (branding, getSchemaDefaults, interface fields)
   - `packages/data-provider/src/roles.ts` (PROJECTS permissions + isSystemRoleName)
   - `packages/data-provider/src/permissions.ts` (PROJECTS permission type)
   - `packages/data-provider/src/accessPermissions.ts` (PROJECT resource type + export changes)
   - `packages/data-provider/src/schemas.ts` (projectId + googleGenConfigSchema)
   - `packages/data-schemas/src/types/app.ts` (branding field)
   - `package-lock.json` (always conflicts)

### Post-merge fixups (CRITICAL):
4. **Recoil-to-Jotai conversion** in these files (will auto-merge with wrong imports):
   - `client/src/components/Chat/Messages/MultiMessage.tsx`
   - `client/src/components/Chat/Messages/MessagesView.tsx`
   - `client/src/components/Chat/Messages/MessageParts.tsx`
   - `client/src/components/UnifiedSidebar/ConversationsSection.tsx`
   - `client/src/hooks/AuthContext.tsx`
   - `client/src/hooks/__tests__/AuthContext.spec.tsx`
   - `client/src/hooks/Input/useAutoSave.ts`
   - `client/src/data-provider/roles.ts`

5. **Re-add project/code/branding code** that upstream "removes" (it's our additions):
   - Project endpoints, data-service, keys, types
   - MCP cosmetic override types/schemas
   - Branding config field

6. **Delete duplicate file:** `api/server/services/Endpoints/assistants/initalize.js`

7. **Regenerate lockfile:** `npm install` to fix `package-lock.json`

8. **Build and test:** `npm run build` then verify no Recoil references remain in client code

---

## File Overlap Matrix (Complete)

Files modified ONLY by upstream (no local changes -- safe to accept):

- `api/server/routes/admin/auth.js`
- `api/server/routes/__tests__/roles.spec.js`
- `api/server/routes/__tests__/mcp.spec.js`
- `api/server/routes/roles.js`
- `api/server/services/MCP.js`
- `client/src/components/Chat/Messages/Message.tsx`
- `client/src/components/Chat/Messages/MessageIcon.tsx`
- `client/src/components/Chat/Messages/__tests__/MessageIcon.render.test.tsx`
- `client/src/components/Messages/MessageContent.tsx`
- `client/src/components/Sharing/PeoplePickerAdminSettings.tsx`
- `client/src/components/ui/AdminSettingsDialog.tsx`
- `client/src/hooks/index.ts`
- `client/src/hooks/Input/useAutoSave.spec.ts`
- `client/src/hooks/useRoleSelector.ts`
- `librechat.example.yaml`
- `packages/api/src/admin/config*.ts`
- `packages/api/src/app/*.ts`
- `packages/api/src/auth/*.ts`
- `packages/api/src/mcp/**/*` (OAuth changes)
- `packages/client/src/hooks/useLocalize.ts`
- `packages/client/src/store.ts`
- `packages/data-provider/package.json`
- `packages/data-provider/specs/config-schemas.spec.ts`
- `packages/data-schemas/package.json`
- `packages/data-schemas/src/app/interface.ts`
- `packages/data-schemas/src/app/resolution.spec.ts`
- `packages/data-schemas/src/methods/config.spec.ts`
- `packages/data-schemas/src/methods/convoStructure.spec.ts`
- `packages/data-schemas/src/models/plugins/mongoMeili.*`
- `packages/data-provider/src/types/queries.ts`

Files modified in BOTH (require careful merge):

- `packages/data-provider/src/config.ts` -- **CONFLICT**
- `packages/data-provider/src/roles.ts` -- **CONFLICT**
- `packages/data-provider/src/permissions.ts` -- **CONFLICT**
- `packages/data-provider/src/accessPermissions.ts` -- **CONFLICT**
- `packages/data-provider/src/schemas.ts` -- **CONFLICT**
- `packages/data-provider/src/api-endpoints.ts` -- OVERLAP
- `packages/data-provider/src/data-service.ts` -- OVERLAP
- `packages/data-provider/src/keys.ts` -- OVERLAP
- `packages/data-provider/src/index.ts` -- OVERLAP
- `packages/data-provider/src/mcp.ts` -- OVERLAP
- `packages/data-provider/src/types/mcpServers.ts` -- OVERLAP
- `packages/data-schemas/src/types/app.ts` -- **CONFLICT**
- `api/server/routes/mcp.js` -- OVERLAP
- `api/server/controllers/mcp.js` -- OVERLAP
- `api/package.json` -- OVERLAP
- `client/package.json` -- OVERLAP
- `package-lock.json` -- **CONFLICT** (always)
- `client/src/components/Chat/Messages/MultiMessage.tsx` -- SEMANTIC CONFLICT
- `client/src/components/Chat/Messages/MessagesView.tsx` -- SEMANTIC CONFLICT
- `client/src/components/Chat/Messages/MessageParts.tsx` -- SEMANTIC CONFLICT
- `client/src/components/UnifiedSidebar/ConversationsSection.tsx` -- SEMANTIC CONFLICT
- `client/src/hooks/AuthContext.tsx` -- SEMANTIC CONFLICT
- `client/src/hooks/__tests__/AuthContext.spec.tsx` -- SEMANTIC CONFLICT
- `client/src/hooks/Input/useAutoSave.ts` -- SEMANTIC CONFLICT
- `client/src/data-provider/roles.ts` -- OVERLAP
- `.gitignore` -- OVERLAP
