# Upstream Commit Inventory

**Date:** 2026-04-04
**Branch:** `feat/projects` (behind `upstream/main` by 11 commits)
**Range:** `HEAD..upstream/main`

---

## Recoil Pattern Summary

**CRITICAL:** The combined `git diff HEAD..upstream/main` reports ~798 lines matching Recoil patterns. However, these are almost entirely **contextual conflicts** from our Jotai migration, not new Recoil code being introduced by upstream. The actual per-commit Recoil exposure is:

| Commit | Recoil in Diff? | Details |
|--------|----------------|---------|
| ed02fe40e | No | Pure packages/data-provider |
| fa4a43da2 | No | Pure backend (api + packages/api) |
| b4d97bd88 | Comment only | Commit message mentions "Recoil siblingIdxFamily" in a comment — no code imports |
| ea28dbfa8 | No | Config/schema cleanup, MessageIcon cleanup |
| 936936596 | No | One-line conditional change |
| 261941c05 | **YES** | `AuthContext.tsx` uses `useSetRecoilState` (existing line, not added, but will conflict with our Jotai version) |
| 162ac9c25 | **YES (test only)** | New test `useAutoSave.spec.ts` mocks `recoil` with `jest.mock('recoil', ...)` and imports `useRecoilValue` |
| 2140729a5 | No | Removes Jotai usage from `packages/client` (removes `langAtom`/`useAtomValue`) — already aligned with our direction |
| b44ce264a | No | Dependency bumps only |
| 33ee7dea1 | No | Backend Meilisearch fix |
| 8ed0bcf5c | No | Backend MCP OAuth |

**Action items:**
- Commit `261941c05` (Custom Role Permissions): `AuthContext.tsx` will **conflict** because upstream still has `useSetRecoilState(store.queriesEnabled)` — we use Jotai. Must manually adapt the custom role additions to our Jotai-based AuthContext.
- Commit `162ac9c25` (Draft Text): New test file mocks Recoil — must be rewritten to mock Jotai in our fork.

---

## Commit Inventory (oldest to newest)

### Commit [1]: ed02fe40e — Allow Nested `addParams` in Config Schema (#12526)
- **Type:** bugfix
- **Author:** Danny Avila
- **Date:** 2026-04-02
- **Files changed:** 3 files (+199, -3)
- **Areas:** packages/data-provider, root (.gitignore)
- **Summary:** The `addParams` config field in `librechat.yaml` previously only accepted flat key-value pairs (string/number/boolean/null). This commit adds a recursive `paramValueSchema` using `z.lazy()` to support nested objects and arrays. Also adds a `superRefine` validator ensuring `web_search` remains boolean. Adds `.codex` to `.gitignore`.
- **Key changes:**
  - `packages/data-provider/src/config.ts`: New `paramValueSchema` (recursive union), `addParamsSchema` with `web_search` validation. Applied to both `azureBaseSchema.addParams` and `endpointSchema.addParams`.
  - `packages/data-provider/specs/config-schemas.spec.ts`: +171 lines of edge case tests for nested addParams.
  - `.gitignore`: Added `.codex` directory.
- **Recoil:** None

---

### Commit [2]: fa4a43da2 — Strip `code_challenge` from Admin OAuth requests before Passport (#12534)
- **Type:** bugfix
- **Author:** Danny Avila
- **Date:** 2026-04-02
- **Files changed:** 3 files (+298, -34)
- **Areas:** api/server, packages/api
- **Summary:** openid-client v6's Passport Strategy uses `currentUrl.searchParams.size === 0` to distinguish auth requests from callbacks. The admin-panel-specific `code_challenge` query param caused misclassification. Extracts PKCE helpers (`stripChallengeFromUrl`, `storeAndStripChallenge`) into `packages/api/src/auth/exchange.ts` with dependency injection (Keyv param). Applied to all 7 admin OAuth providers.
- **Key changes:**
  - `api/server/routes/admin/auth.js`: Refactored 7 OAuth provider routes to use `storeAndStripChallenge` from `@librechat/api`. Removed inline PKCE logic (-34 lines).
  - `packages/api/src/auth/exchange.ts`: New exports: `stripChallengeFromUrl()`, `storeAndStripChallenge()`, `PkceStrippableRequest` interface.
  - `packages/api/src/auth/adminPkce.spec.ts`: 211-line test file covering strip logic, cache storage, and edge cases.
- **Recoil:** None

---

### Commit [3]: b4d97bd88 — Eliminate Unstable React Keys During SSE Lifecycle (#12536)
- **Type:** refactor (performance)
- **Author:** Danny Avila
- **Date:** 2026-04-02
- **Files changed:** 7 files (+264, -66)
- **Areas:** client/src
- **Summary:** During SSE message streaming, `messageId` changes 3 times (client UUID -> createdHandler ID -> server ID). Using `key={message.messageId}` caused React to destroy/recreate the entire message subtree on each change, producing visible icon flickering. Removes explicit keys from `MultiMessage`, `Message`, `MessageParts`, `MessageContent`, and `MessagesView`, relying on React positional reconciliation. Also adds debug instrumentation to `MessageIcon` (lifecycle logging, render counting, memo diff logging).
- **Key changes:**
  - `client/src/components/Chat/Messages/MultiMessage.tsx`: Removed `key={message.messageId}` from all three render branches (MessageParts, MessageContent, Message). Extracted `sharedProps` object to DRY the prop passing. Added JSDoc explaining why no key is used.
  - `client/src/components/Chat/Messages/MessageIcon.tsx`: Replaced individual field comparisons in `arePropsEqual` with array-based loop + `logger.log('icon_memo_diff', ...)` instrumentation. Added lifecycle mount/unmount logging via `useEffect` + `useRef`.
  - `client/src/components/Chat/Messages/Message.tsx`: Removed `key={messageId}` from child MultiMessage.
  - `client/src/components/Chat/Messages/MessageParts.tsx`: Same key removal.
  - `client/src/components/Chat/Messages/MessagesView.tsx`: Removed `key={conversationId}` from root MultiMessage.
  - `client/src/components/Messages/MessageContent.tsx`: Same key removal.
  - `client/src/components/Chat/Messages/__tests__/MessageIcon.render.test.tsx`: New 193-line test file for render counting.
- **Recoil:** Commit message mentions "Recoil siblingIdxFamily" in prose — NO actual Recoil code in diff. Our fork uses Jotai atomFamily equivalent.

---

### Commit [4]: ea28dbfa8 — Clean Up Config Fields (#12537)
- **Type:** config/refactor
- **Author:** Danny Avila
- **Date:** 2026-04-03
- **Files changed:** 17 files (+211, -190)
- **Areas:** packages/data-provider, packages/data-schemas, packages/api, client/src, root (librechat.example.yaml)
- **Summary:** Removes unused `interface.endpointsMenu` and `interface.sidePanel` config fields. Restricts `fileStrategy`/`fileStrategies` schemas to valid storage backends (new `fileStorageSchema`/`FileStorage` type). Removes debug logging from MessageIcon that was added in commit [3]. Bumps librechat-data-provider to 0.8.407 and config version to 1.3.7.
- **Key changes:**
  - `packages/data-provider/src/config.ts`: New `FILE_STORAGE_BACKENDS` const, `fileStorageSchema`, `FileStorage` type. Removed `endpointsMenu` and `sidePanel` from `interfaceSchema`. Bumped `CONFIG_VERSION` to `'1.3.7'` and `VERSION` stays `'v0.8.4'`. Package version bumped to `0.8.407`.
  - `packages/data-schemas/src/app/interface.ts`: Removed `endpointsMenu` and `sidePanel` from `loadDefaultInterface`.
  - `packages/data-schemas/src/types/app.ts`: Changed `fileStrategy` type from union of `FileSources` literals to new `FileStorage` type.
  - `client/src/components/Chat/Messages/MessageIcon.tsx`: Removed all debug instrumentation from commit [3] (lifecycle logging, render counting, icon_memo_diff logging). Cleaned up `arePropsEqual` to remove field name labels from checks. Removed `logger` import.
  - Multiple test files updated to match new schemas.
- **Recoil:** None

---

### Commit [5]: 936936596 — Only show Searchbar if enabled (#12424)
- **Type:** bugfix
- **Author:** Daniel Lew
- **Date:** 2026-04-03
- **Files changed:** 1 file (+1, -1)
- **Areas:** client/src
- **Summary:** The search bar in the sidebar was rendering even when search capability was disabled. Wraps `<SearchBar>` in `{search.enabled && ...}` conditional.
- **Key changes:**
  - `client/src/components/UnifiedSidebar/ConversationsSection.tsx`: Changed `<SearchBar isSmallScreen={isSmallScreen} />` to `{search.enabled && <SearchBar isSmallScreen={isSmallScreen} />}`.
- **Recoil:** None

---

### Commit [6]: 261941c05 — Custom Role Permissions (#12528)
- **Type:** feature/bugfix
- **Author:** Dustin Healy + Danny Avila
- **Date:** 2026-04-03
- **Files changed:** 14 files (+462, -82)
- **Areas:** api/server, client/src, packages/data-provider
- **Summary:** Users with custom roles (non-USER/ADMIN) had all permissions fail because `AuthContext` only fetched system roles. This commit adds custom role detection and fetching in AuthContext, adds `isSystemRoleName()` helper, `useListRoles` hook, `listRoles` data service, a new `useRoleSelector` hook, and updates admin settings UI to dynamically list custom roles. Backend changes fix authorization gates (prototype pollution prevention via `Object.hasOwn`, own-role read bypass).
- **Key changes:**
  - `client/src/hooks/AuthContext.tsx`: **CONFLICT RISK** — adds `userRoleName`, `isCustomRole` variables, new `useGetRole` for custom role, spreads custom role into `roles` map in `useMemo`. The existing line `const setQueriesEnabled = useSetRecoilState<boolean>(store.queriesEnabled)` will conflict with our Jotai version.
  - `client/src/hooks/useRoleSelector.ts`: **New file** — 64-line hook extracting role selection logic from admin settings.
  - `client/src/hooks/index.ts`: Exports `useRoleSelector`.
  - `client/src/data-provider/roles.ts`: New `useListRoles` query hook.
  - `client/src/components/ui/AdminSettingsDialog.tsx`: Refactored to use `useRoleSelector` hook.
  - `client/src/components/Sharing/PeoplePickerAdminSettings.tsx`: Same refactoring.
  - `api/server/routes/roles.js`: Removed `toUpperCase()` normalization, added `isOwnRole` + `Object.hasOwn` authorization gate.
  - `api/server/routes/__tests__/roles.spec.js`: 155-line test file.
  - `client/src/hooks/__tests__/AuthContext.spec.tsx`: 136+ lines of new tests.
  - `packages/data-provider/src/api-endpoints.ts`: Added `adminRoles()` endpoint, changed `getRole` to use `encodeURIComponent` instead of `toLowerCase`.
  - `packages/data-provider/src/data-service.ts`: Added `listRoles()` function.
  - `packages/data-provider/src/keys.ts`: Added `rolesList` query key.
  - `packages/data-provider/src/roles.ts`: Added `isSystemRoleName()` helper with Set-based lookup.
  - `packages/data-provider/src/types/queries.ts`: Added `ListRolesResponse` type.
- **Recoil:** YES — `AuthContext.tsx` diff context includes `useSetRecoilState` (not a new addition, but the surrounding code we'll need to merge into has been migrated to Jotai in our fork).

---

### Commit [7]: 162ac9c25 — Properly Restore Draft Text When Switching Conversations (#12384)
- **Type:** bugfix
- **Author:** Daniel Lew
- **Date:** 2026-04-03
- **Files changed:** 2 files (+111, -5)
- **Areas:** client/src
- **Summary:** When switching from conversation A (with draft text) to conversation B (no draft), the draft from A leaked into B. The `restoreText()` function did not restore blank text. Fix: `setValue('text', getDraft(id) ?? '')` — always restores whatever draft is found, falling back to empty string.
- **Key changes:**
  - `client/src/hooks/Input/useAutoSave.ts`: Simplified `restoreText` from 4 lines to 1 — `setValue('text', getDraft(id) ?? '')`.
  - `client/src/hooks/Input/useAutoSave.spec.ts`: **New 110-line test file**. Mocks `recoil` with `jest.mock('recoil', ...)` and imports `useRecoilValue`.
- **Recoil:** YES (test only) — The new test file mocks `recoil`. Must be adapted to mock Jotai in our fork.

---

### Commit [8]: 2140729a5 — Prevent `@librechat/client` useLocalize from Overwriting Host App Language State (#12515)
- **Type:** bugfix
- **Author:** Shahryar Tayeb + Danny Avila
- **Date:** 2026-04-04
- **Files changed:** 2 files (+7, -13)
- **Areas:** packages/client
- **Summary:** The `useLocalize` hook in `@librechat/client` was managing language state (via `langAtom` + `i18n.changeLanguage`), which overwrote host app language settings. Simplified to just return the `t()` function wrapped in `useCallback`. Removed `langAtom` from `packages/client/src/store.ts`. Note: this package already used Jotai (`useAtomValue` from `jotai`), and this commit *removes* that dependency — aligning with our direction.
- **Key changes:**
  - `packages/client/src/hooks/useLocalize.ts`: Removed `useAtomValue(langAtom)`, `useEffect` for `i18n.changeLanguage`, and `i18n` destructure. Now just `useCallback((phraseKey, options) => t(phraseKey, options), [t])`.
  - `packages/client/src/store.ts`: Removed `langAtom` export.
- **Recoil:** None. Actually removes Jotai dependency (good for us).

---

### Commit [9]: b44ce264a — Bump `mongodb-memory-server` to v11.0.1, `mermaid` to v11.14.0, npm audit (#12543)
- **Type:** dependency
- **Author:** Danny Avila
- **Date:** 2026-04-03
- **Files changed:** 5 files (+296, -66)
- **Areas:** api, client, packages/data-schemas, root (package-lock.json)
- **Summary:** Bumps `mongodb-memory-server` from 10.1.4 to 11.0.1 (MongoDB 8.x), `mermaid` from old to 11.14.0, and runs `npm audit fix`. Fixes a test that relied on insertion-order return (no longer guaranteed in MongoDB 8.x) by using deterministic sequential timestamps.
- **Key changes:**
  - `api/package.json`: `mongodb-memory-server` 10.1.4 -> 11.0.1.
  - `client/package.json`: `mermaid` bumped to 11.14.0.
  - `packages/data-schemas/package.json`: `mongodb-memory-server` 10.1.4 -> 11.0.1.
  - `packages/data-schemas/src/methods/convoStructure.spec.ts`: Added sequential `overrideTimestamp` to test fixtures.
  - `package-lock.json`: 350 lines of lockfile changes.
- **Recoil:** None

---

### Commit [10]: 33ee7dea1 — Specify Explicit Primary Key for Meilisearch Document Operations (#12542)
- **Type:** bugfix
- **Author:** Danny Avila
- **Date:** 2026-04-03
- **Files changed:** 2 files (+105, -15)
- **Areas:** packages/data-schemas
- **Summary:** Meilisearch v1.0+ refuses to auto-infer the primary key when a document has multiple `*id` fields. The messages index has both `conversationId` and `messageId`, causing silent failures. Passes explicit `{ primaryKey }` to `addDocumentsInBatches`, `addDocuments`, and `updateDocuments`. Also fixes `deleteObjectFromMeili` to use the Meilisearch primary key (e.g., `messageId`) instead of MongoDB `_id`. Replaces `collection.updateMany` with `collection.updateOne` for semantic correctness.
- **Key changes:**
  - `packages/data-schemas/src/models/plugins/mongoMeili.ts`: Added `primaryKey` to factory config, passed to all Meilisearch operations, fixed delete to use correct key, added `preprocessObjectForIndex` call in update path.
  - `packages/data-schemas/src/models/plugins/mongoMeili.spec.ts`: +97 lines testing primaryKey passing, delete path, and update path.
- **Recoil:** None

---

### Commit [11]: 8ed0bcf5c — Reuse Existing MCP OAuth Client Registrations to Prevent `client_id` Mismatch (#11925)
- **Type:** bugfix (major)
- **Author:** Denis Palnitsky + Danny Avila
- **Date:** 2026-04-04
- **Files changed:** 11 files (+1245, -26)
- **Areas:** api/server, packages/api
- **Summary:** In multi-replica deployments, concurrent `initiateOAuthFlow` calls each registered a new OAuth client via DCR, causing `client_id` mismatches at token exchange. This commit adds client registration reuse by checking for existing stored registrations before DCR. Includes issuer validation, redirect_uri matching, stale client cleanup via `isClientRejection()` heuristic, CSRF-gated `failFlow` on OAuth error callbacks, and `deleteClientRegistration()` for recovery. Guards `findToken` behind `deleteTokens` availability to prevent infinite stale-client loops.
- **Key changes:**
  - `packages/api/src/mcp/oauth/handler.ts`: Major changes to `initiateOAuthFlow` — adds client reuse logic (look up existing registration, validate issuer/redirect_uri, set `reusedStoredClient` flag). New `clearStaleClientIfRejected()` private method. New `isClientRejection()` helper.
  - `packages/api/src/mcp/oauth/tokens.ts`: New `deleteClientRegistration()` method, new `getClientInfoAndMetadata()` method.
  - `packages/api/src/mcp/oauth/types.ts`: Added `reusedStoredClient` to `MCPOAuthFlowMetadata`.
  - `packages/api/src/mcp/MCPConnectionFactory.ts`: Passes `findToken`/`deleteTokens` to OAuth handler, calls `clearStaleClientIfRejected` on failure paths.
  - `api/server/routes/mcp.js`: Added CSRF-gated `failFlow` logic in OAuth error callback path.
  - `api/server/services/MCP.js`: Added `deleteTokens` to `tokenMethods` object.
  - 5 test files: 1018+ lines of new tests covering reuse, race conditions, stale cleanup, issuer mismatch, CSRF gating.
- **Recoil:** None

---

## Area Summary

| Area | Commits |
|------|---------|
| `packages/data-provider` | [1], [4], [6] |
| `packages/data-schemas` | [4], [9], [10] |
| `packages/api` | [2], [4], [11] |
| `packages/client` | [8] |
| `api/server` | [2], [6], [11] |
| `client/src` | [3], [4], [5], [6], [7] |
| Root config | [1] (.gitignore), [4] (librechat.example.yaml), [9] (package-lock.json) |

## Conflict Risk Assessment

| Risk Level | Commits | Reason |
|------------|---------|--------|
| **HIGH** | [6] 261941c05 | `AuthContext.tsx` uses Recoil; our fork uses Jotai. Must manually adapt custom role additions. |
| **HIGH** | [3]+[4] b4d97bd88+ea28dbfa8 | `MessageIcon.tsx` modified in two sequential commits. Need to check our fork's version. |
| **MEDIUM** | [7] 162ac9c25 | New test file mocks Recoil — must adapt to Jotai mocks. |
| **MEDIUM** | [4] ea28dbfa8 | `config.ts` in data-provider — both commits [1] and [4] modify it; if we have local changes too, triple conflict. |
| **MEDIUM** | [9] b44ce264a | `package-lock.json` will definitely conflict. `package.json` files may conflict if we have different versions. |
| **LOW** | [1], [2], [5], [8], [10], [11] | Clean applies expected — minimal overlap with our modifications. |

## Files Modified By Multiple Upstream Commits

- `packages/data-provider/src/config.ts`: [1] + [4] (addParams schema + config cleanup)
- `client/src/components/Chat/Messages/MessageIcon.tsx`: [3] + [4] (instrumentation added then removed)
- `client/src/components/Chat/Messages/__tests__/MessageIcon.render.test.tsx`: [3] + [4] (tests added then rewritten)
- `packages/data-provider/specs/config-schemas.spec.ts`: [1] + [4] (tests for addParams + config cleanup)
