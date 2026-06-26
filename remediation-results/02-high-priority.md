# Remediation Agent 2: High-Priority Fixes Report

## Fix 2.1: Unify chatV1/chatV2 Assistant Controllers

### Step 1: Extract `checkBalanceBeforeRun` (DONE)

**Created:** `api/server/controllers/assistants/shared.js`

The `checkBalanceBeforeRun` function was identical in both `chatV1.js` and `chatV2.js` (~45 lines each). It was extracted into a shared module that accepts all required parameters explicitly rather than closing over local variables.

**Updated files:**
- `api/server/controllers/assistants/chatV1.js` -- removed inline definition, imports from `./shared`, passes parameters at call site
- `api/server/controllers/assistants/chatV2.js` -- same treatment
- Both files had their import sections cleaned up: removed `countTokens`, `checkBalance`, `getBalanceConfig`, `getModelMaxTokens` from `@librechat/api`; removed `getMultiplier`, `getTransactions`, `findBalanceByUser`, `upsertBalanceFields`, `createAutoRefillTransaction` from `~/models`; removed `logViolation` from `~/cache`

### Step 2: Consolidate Error Handlers (DONE)

**Deleted:** `api/server/controllers/agents/errors.js`

The agents `errors.js` was a simpler clone of the assistants `errors.js`. Key differences:
1. Agents version lacked `thread_id` in context and `messageData`
2. Agents version did not call `openai.beta.threads.runs.cancel()`, `recordUsage`, or `checkMessageGaps`
3. Agents version checked `!openai || !run_id` vs assistants checking `!openai || !thread_id || !run_id`

**Resolution:** Updated `api/server/controllers/assistants/errors.js` to handle both paths:
- When `thread_id` is present in context: performs full thread-level cleanup (cancel run, record usage, check message gaps) -- the assistants path
- When `thread_id` is `undefined`: skips all thread operations, builds a simpler `finalEvent` without `runMessages` -- the agents path
- The guard `!openai || !run_id || (thread_id !== undefined && !thread_id)` handles both: agents (no thread_id key at all = skip thread check) and assistants (thread_id present but falsy = fail early)

The agents `errors.js` was confirmed unused -- no file imports from `~/server/controllers/agents/errors` anywhere in the codebase. It was safely deleted.

### Step 3: Migrate chatV1 to Use `createErrorHandler` (DONE)

**Updated:** `api/server/controllers/assistants/chatV1.js`

The inline `handleError` function in chatV1 was ~130 lines of error handling that duplicated `createErrorHandler`. It was replaced with:

```js
const getContext = () => ({
  openai, run_id, endpoint, cacheKey, thread_id,
  completedRun, assistant_id, conversationId,
  parentMessageId, responseMessageId,
});
const handleError = createErrorHandler({ req, res, getContext });
```

**Behavioral differences preserved:**
- chatV1 used `EModelEndpoint.azureAssistants` for the "Files invalid" check; `errors.js` uses the string `'azureAssistants'`. These are equivalent (`EModelEndpoint.azureAssistants === 'azureAssistants'`).
- chatV1 used `sleep()` from `@librechat/agents`; `errors.js` uses `setTimeout`. Functionally identical.
- All other logic (error classification, run cancellation, usage recording, message gap checking) was identical.

**Imports cleaned up:** Removed `ViolationTypes`, `ContentTypes`, `checkMessageGaps`, `sendResponse` imports that were only used by the old inline handler. Added `createErrorHandler` import.

### Step 4: Extract Common Orchestration Flow (PLAN ONLY)

Both chatV1 and chatV2 share a nearly identical orchestration flow:

1. **Validation phase:** Check for existing conversation thread_id, validate assistant_id, initialize OpenAI client, validate author
2. **Message construction:** Build user message (differs: v1 uses string content, v2 uses structured content array with ContentTypes)
3. **File handling:** `getRequestFileIds()` -- significantly different between v1 (file_ids/attachments for Azure) and v2 (attachments with tool types, image handling)
4. **Thread initialization:** `initializeThread()` -- nearly identical, except v1 also has `addVisionPrompt()`
5. **Balance check:** Now shared via `checkBalanceBeforeRun`
6. **Run processing:** `processRun()` -- nearly identical, except v1 passes `visionPromise` to `StreamRunManager`, v2 does not
7. **Response handling:** Nearly identical, except v2 adds `text: response.text` and `streamRate` config
8. **Post-processing:** Identical (save messages, add title, add thread metadata, record usage)

**Proposed shared orchestrator:**

```
createAssistantChat({ version }) => (req, res) => {
  // Shared: validation, client init, balance check, thread init, run processing, post-processing
  // Adapters:
  //   messageAdapter(version) -- v1: string content; v2: structured content
  //   fileAdapter(version) -- v1: file_ids/Azure attachments; v2: tool-typed attachments
  //   runAdapter(version) -- v1: visionPromise; v2: streamRate
}
```

**Adapters needed:**
- `createUserMessage(version, text)` -- returns string content for v1, `[{ type: TEXT, text }]` for v2
- `getRequestFileIds(version, ...)` -- v1 logic with Azure attachments vs v2 logic with tool types
- `createStreamRunManager(version, ...)` -- v1 includes visionPromise, v2 includes streamRate/parentMessageId
- `buildResponseMessage(version, response)` -- v2 adds `text` field

This would reduce the combined ~1000 lines to ~500 lines shared + ~100 lines per version adapter.

---

## Fix 2.2: Test Coverage for Assistant Controllers

### Created Test Files

**`api/server/controllers/assistants/__tests__/errors.spec.js`** (14 test cases):
- Error classification: Run cancelled, Request closed (completed/not completed), Files invalid (standard + Azure), string too long, TOKEN_BALANCE, unrecognized errors
- Thread-based cleanup (assistants path): checkMessageGaps called, run cancelled via API, usage recorded
- Agent path (no thread_id): thread operations skipped, simpler finalEvent built
- Cache-based cancellation: run already cancelled in cache
- Custom originPath: used in log messages
- messageData shape: includes all expected fields

**`api/server/controllers/assistants/__tests__/helpers.spec.js`** (10 test cases):
- Version extraction from URL (/v1, /v2)
- Fallback to req.body.version
- Lookup from endpoint config
- Default version from defaultAssistantsVersion
- Null version throws Error (not TypeError) -- validates optional chaining fix
- URL version takes priority over body version
- Deeply nested URL path handling

---

## Fix 2.3: Skipped Tests Investigation

### 1. `packages/data-provider/specs/utils.spec.ts` (line 46)
**Status:** Intentionally obsolete  
**Reason:** Comment says "No longer the expected behavior". The test asserts `extractEnvVariable` should NOT process multiple `${VAR}` patterns in a single string, but the function was updated to support this. The test documents the old behavior.  
**Action:** Clarified the comment to explain why it's obsolete. No code change needed -- keeping as reference is appropriate.

### 2. `api/app/clients/prompts/formatAgentMessages.spec.js` (line 209)
**Status:** Feature not yet implemented  
**Reason:** The test asserts that consecutive assistant messages should be merged into a single AIMessage. This merging behavior is not implemented in `formatAgentMessages` (from `@librechat/agents`). The test describes desired future behavior.  
**Action:** Added clarifying comment. Cannot re-enable without implementing the merge logic in the external `@librechat/agents` package.

### 3. `packages/api/src/stream/__tests__/RedisJobStore.stream_integration.spec.ts` (line 492)
**Status:** Infrastructure-dependent bug  
**Reason:** Comment says "TODO: Debug consumer group timing with Redis Streams". The test checks resume-from-offset behavior with Redis consumer groups. There's a timing issue where messages added after group creation with `$` start ID may not be consistently delivered. This is a known Redis Streams edge case.  
**Action:** Added clarifying comment. Requires a running Redis instance and timing investigation to fix.

### 4. `packages/api/src/mcp/__tests__/ConnectionsRepository.test.ts` (line 231)
**Status:** Stale -- behavior changed  
**Reason:** The test expects `repository.get('nonexistent')` to throw `'Server not found in configuration'`. However, `ConnectionsRepository.get()` was refactored to return `null` for non-existent servers instead of throwing. The test assertion is wrong.  
**Action:** Added comment explaining the test is stale and should be rewritten to assert null-return behavior, or removed entirely.

### 5. `packages/api/src/storage/s3/__tests__/s3.integration.spec.ts` (line 65)
**Status:** Properly conditional  
**Reason:** Skipped when `AWS_TEST_BUCKET_NAME` environment variable is not set. This is the correct pattern for infrastructure-dependent integration tests.  
**Action:** No change needed. The skip message is already self-documenting.

---

## Files Modified

| File | Change |
|------|--------|
| `api/server/controllers/assistants/shared.js` | **Created** -- shared `checkBalanceBeforeRun` |
| `api/server/controllers/assistants/chatV1.js` | Extracted balance check, replaced inline error handler with `createErrorHandler`, cleaned imports |
| `api/server/controllers/assistants/chatV2.js` | Extracted balance check, cleaned imports |
| `api/server/controllers/assistants/errors.js` | Unified to support both assistant (with thread_id) and agent (without thread_id) paths |
| `api/server/controllers/agents/errors.js` | **Deleted** -- unused duplicate |
| `api/server/controllers/assistants/__tests__/errors.spec.js` | **Created** -- 14 test cases |
| `api/server/controllers/assistants/__tests__/helpers.spec.js` | **Created** -- 10 test cases |
| `packages/data-provider/specs/utils.spec.ts` | Clarified skip comment |
| `api/app/clients/prompts/formatAgentMessages.spec.js` | Clarified skip comment |
| `packages/api/src/stream/__tests__/RedisJobStore.stream_integration.spec.ts` | Clarified skip comment |
| `packages/api/src/mcp/__tests__/ConnectionsRepository.test.ts` | Clarified skip comment (stale test) |

## Net Impact

- **Lines removed:** ~175 (inline error handler in chatV1, duplicate balance check in both files, agents errors.js)
- **Lines added:** ~90 (shared.js) + ~280 (test files) + ~15 (comments on skipped tests)
- **Duplication eliminated:** `checkBalanceBeforeRun` (was in 2 files), error handler (was in 3 locations: chatV1 inline + assistants errors.js + agents errors.js)
