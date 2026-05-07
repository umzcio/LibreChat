# Merge Plan

**Date:** 2026-04-04
**Branch:** `feat/projects` merging 11 commits from `upstream/main`
**Upstream range:** `ed02fe40e..8ed0bcf5c`

---

## Commit Grouping by Merge Strategy

### Group A: Auto-merge / CLEAN (cherry-pick or batch merge, no local interaction)

| # | Commit | Message |
|---|--------|---------|
| 2 | fa4a43da2 | Strip `code_challenge` from Admin OAuth (#12534) |
| 10 | 33ee7dea1 | Explicit Primary Key for Meilisearch (#12542) |

These commits touch files with ZERO local modifications. They will apply cleanly with no intervention.

### Group B: Review-then-merge / OVERLAP (same files, different sections)

| # | Commit | Message | Overlap Details |
|---|--------|---------|-----------------|
| 6 | 261941c05 | Custom Role Permissions (#12528) | `api-endpoints.ts`, `data-service.ts`, `keys.ts` have our project additions in different sections; `roles.ts` in client adds `useListRoles`; `roles.ts` in data-provider adds `isSystemRoleName` but removes our PROJECTS entries |
| 8 | 2140729a5 | Prevent useLocalize from Overwriting Host App Language (#12515) | Convergent change -- upstream removes `langAtom` usage, aligns with our Jotai direction |
| 9 | b44ce264a | Bump mongodb-memory-server, mermaid, npm audit (#12543) | `package.json` files overlap; `package-lock.json` always conflicts |
| 11 | 8ed0bcf5c | Reuse MCP OAuth Client Registrations (#11925) | `api/server/routes/mcp.js` -- both sides remove cosmetics route; upstream adds failFlow logic |

### Group C: Manual Resolution / CONFLICT (git conflicts expected)

| # | Commit | Message | Conflict Files |
|---|--------|---------|----------------|
| 1 | ed02fe40e | Allow Nested `addParams` in Config Schema (#12526) | `packages/data-provider/src/config.ts` (branding, getSchemaDefaults, interface fields) |
| 4 | ea28dbfa8 | Clean Up Config Fields (#12537) | `packages/data-provider/src/config.ts` (same file, sequential changes), `packages/data-schemas/src/types/app.ts` (branding + FileSources->FileStorage) |

Note: Commits 1 and 4 both modify `config.ts`. Since we use `git merge`, they arrive together as the combined upstream state, producing ONE conflict to resolve (not two sequential ones).

### Group D: Adaptation / SEMANTIC CONFLICT (merges cleanly but breaks runtime)

| # | Commit | Message | Semantic Conflict Details |
|---|--------|---------|--------------------------|
| 3 | b4d97bd88 | Eliminate Unstable React Keys (#12536) | `MultiMessage.tsx`, `MessagesView.tsx`, `MessageParts.tsx` -- upstream changes Jotai -> Recoil (their baseline), git auto-merges with BOTH imports, runtime crash |
| 5 | 936936596 | Only show Searchbar if enabled (#12424) | `ConversationsSection.tsx` -- Recoil imports + `conversationByIndex` vs our `conversationIdByIndex` |
| 6 | 261941c05 | Custom Role Permissions (#12528) | `AuthContext.tsx` + test -- Recoil hooks in upstream additions |
| 7 | 162ac9c25 | Properly Restore Draft Text (#12384) | `useAutoSave.ts` -- Recoil imports + `SetterOrUpdater` type; new test mocks `recoil` |

---

## Recommended Merge Method

**Method: `git merge upstream/main` (merge commit)**

**Justification:**
- This is a fork that syncs regularly. A merge commit preserves the fork point, making future `git merge upstream/main` operations clean -- git knows where the last sync happened.
- Cherry-pick would lose the merge base, causing git to re-detect the same conflicts on every future sync.
- Rebase is inappropriate for a feature branch that has already been pushed and has its own commit history.
- The 11 commits are a coherent set from upstream; merging them as a batch is the standard workflow.

---

## Recoil-to-Jotai Translation Reference

For every upstream diff that introduces Recoil patterns into files we have already migrated to Jotai:

### Import Translations

| Upstream (Recoil) | Our Fork (Jotai) |
|---|---|
| `import { useRecoilState } from 'recoil';` | `import { useAtom } from 'jotai';` |
| `import { useRecoilValue } from 'recoil';` | `import { useAtomValue } from 'jotai';` |
| `import { useSetRecoilState } from 'recoil';` | `import { useSetAtom } from 'jotai';` |
| `import { SetterOrUpdater } from 'recoil';` | `import type { AtomSetter } from '~/common';` |
| `import { RecoilRoot } from 'recoil';` | Remove entirely (Jotai uses default store, no provider needed) |
| `jest.mock('recoil', ...)` | `jest.mock('jotai', ...)` |

### Hook Translations

| Upstream (Recoil) | Our Fork (Jotai) |
|---|---|
| `useRecoilState(store.X)` | `useAtom(store.X)` |
| `useRecoilValue(store.X)` | `useAtomValue(store.X)` |
| `useRecoilValue<boolean>(store.X)` | `useAtomValue(store.X)` (no generic needed) |
| `useSetRecoilState<boolean>(store.X)` | `useSetAtom(store.X)` (no generic needed) |

### Per-File Translation Plan

#### 1. `client/src/components/Chat/Messages/MultiMessage.tsx`
- **Upstream changes:** `useRecoilState` import + `sharedProps` refactor + key removal
- **Our current state:** `import { useAtom } from 'jotai';` + `useAtom(store.messagesSiblingIdxFamily(messageId))`
- **Resolution:** Keep `import { useAtom } from 'jotai'`, accept ALL other upstream changes (sharedProps, key removal, currentSiblingIdx, JSDoc comment). Replace `useRecoilState` with `useAtom` on the hook call line.

#### 2. `client/src/components/Chat/Messages/MessagesView.tsx`
- **Upstream changes:** Removes `key={conversationId}` from MultiMessage
- **Our current state:** `import { useAtomValue } from 'jotai';`
- **Resolution:** Keep our Jotai import, accept the key removal change. The upstream diff context shows `useRecoilValue` but the actual change is just the key removal -- auto-merge may handle this if imports are in different lines. Verify post-merge.

#### 3. `client/src/components/Chat/Messages/MessageParts.tsx`
- **Upstream changes:** Removes `key={message.messageId}` from component
- **Our current state:** `import { useAtomValue } from 'jotai';`
- **Resolution:** Same as MessagesView -- keep Jotai import, accept key removal. Verify no Recoil import sneaks in.

#### 4. `client/src/components/UnifiedSidebar/ConversationsSection.tsx`
- **Upstream changes:** Recoil imports + `conversationByIndex(0)` (full object) + `{search.enabled && <SearchBar>}` guard
- **Our current state:** `import { useAtomValue, useSetAtom } from 'jotai';` + `conversationIdByIndex(0)`
- **Resolution:**
  - Keep `import { useAtomValue, useSetAtom } from 'jotai';`
  - Change `conversationIdByIndex(0)` to `conversationByIndex(0)` (our store exports both; upstream now uses the full conversation object)
  - Rename variable from `conversationId` to `conversation`
  - Update usages: `conversationId` -> `conversation?.conversationId`
  - Accept the `{search.enabled && ...}` guard (valuable bugfix)
  - Keep `useSetAtom` for `setSidebarExpanded` (replaces `useSetRecoilState`)

#### 5. `client/src/hooks/AuthContext.tsx`
- **Upstream changes:** Adds `isSystemRoleName` import, `userRoleName`/`isCustomRole` variables, `useGetRole` for custom roles, spreads custom role into `roles` map, expands `useMemo` dependency array
- **Our current state:** `import { useAtom, useSetAtom } from 'jotai';` + `useAtom(store.user)` + `useSetAtom(store.queriesEnabled)`
- **Resolution:**
  - Keep `import { useAtom, useSetAtom } from 'jotai';`
  - Keep `useAtom(store.user)` (replaces upstream's `useRecoilState(store.user)`)
  - Keep `useSetAtom(store.queriesEnabled)` (replaces upstream's `useSetRecoilState<boolean>(store.queriesEnabled)`)
  - Accept ALL new upstream logic: `isSystemRoleName` import, `userRoleName`, `isCustomRole`, custom `useGetRole`, spread into roles, expanded deps array
  - Add `useListRoles` mock to `data-provider` mock (for test file)

#### 6. `client/src/hooks/__tests__/AuthContext.spec.tsx`
- **Upstream changes:** Adds `RecoilRoot` wrapper, `useListRoles` mock, `data-roles` attribute, 130 lines of custom role tests
- **Our current state:** No `RecoilRoot` (Jotai uses default store)
- **Resolution:**
  - Do NOT add `import { RecoilRoot } from 'recoil';`
  - Do NOT add `<RecoilRoot>` wrapper (Jotai atoms work without a provider)
  - Accept: `useListRoles` mock addition, `data-roles` attribute in TestConsumer, all new custom role test cases
  - The new test cases should work as-is since they test the AuthContext logic, not the state library

#### 7. `client/src/hooks/Input/useAutoSave.ts`
- **Upstream changes:** Recoil imports + `SetterOrUpdater` type + simplified `restoreText` + `console.error` replacing `logger.error`
- **Our current state:** `import { useAtomValue } from 'jotai';` + `AtomSetter` type + `logger.error`
- **Resolution:**
  - Keep `import { useAtomValue } from 'jotai';`
  - Keep `import type { ExtendedFile, AtomSetter } from '~/common';` (replaces `SetterOrUpdater`)
  - Accept the `restoreText` simplification: `setValue('text', getDraft(id) ?? '')`
  - Accept `console.error` replacing `logger.error` (upstream decision, keep consistent)
  - Keep `import { clearDraft, getDraft, setDraft } from '~/utils';` (remove `logger` import per upstream)

#### 8. `client/src/hooks/Input/useAutoSave.spec.ts` (NEW FILE)
- **Upstream changes:** New 110-line test file that mocks `recoil`
- **Resolution:**
  - Accept the file but rewrite the mock header:
    - Replace `jest.mock('recoil', ...)` with `jest.mock('jotai', ...)`
    - Replace `import { useRecoilValue } from 'recoil';` with `import { useAtomValue } from 'jotai';`
    - Replace `(useRecoilValue as jest.Mock)` with `(useAtomValue as jest.Mock)`
    - Replace mock store atom format: `{ key: 'saveDrafts', default: true }` with just `true` (Jotai atom primitive)

#### 9. `client/src/data-provider/roles.ts`
- **Upstream changes:** Adds `useListRoles` hook, replaces `logger.error` with `console.error`
- **Our current state:** Uses `logger.error`
- **Resolution:** Accept `useListRoles` addition. Accept `console.error` change (or keep `logger.error` if we prefer -- low stakes). Auto-merge should handle this since changes are in different sections.

---

## Preserving Project/Workspace/Code-Execution Code

These are our local additions that do NOT exist in upstream. During merge, git will show them as "removed" because they're absent from the upstream side. This is the standard pattern for syncing a feature fork.

**Rule: During conflict resolution, KEEP all our additions AND take upstream's changes.**

### Files where we must preserve our additions:

| File | Our Addition to Preserve |
|---|---|
| `packages/data-provider/src/permissions.ts` | `PermissionTypes.PROJECTS`, `projectPermissionsSchema` |
| `packages/data-provider/src/roles.ts` | `PROJECTS` permission entries in `defaultRolesSchema` and `roleDefaults` |
| `packages/data-provider/src/accessPermissions.ts` | `ResourceType.PROJECT`, `AccessRoleIds.PROJECT_*` |
| `packages/data-provider/src/schemas.ts` | `projectId` in `tConversationSchema` |
| `packages/data-provider/src/api-endpoints.ts` | Project and code endpoint functions |
| `packages/data-provider/src/data-service.ts` | Project and code service functions |
| `packages/data-provider/src/keys.ts` | Project and code query/mutation keys |
| `packages/data-provider/src/index.ts` | `types/code`, `types/projects` exports |
| `packages/data-provider/src/types/mcpServers.ts` | `MCPServerCosmeticUpdateParams`, `source` field |
| `packages/data-provider/src/mcp.ts` | `MCPServerCosmeticUpdateSchema` |
| `api/server/controllers/mcp.js` | `updateMCPServerCosmeticsController` |
| `packages/data-schemas/src/types/app.ts` | `branding` field |
| `packages/data-provider/src/config.ts` | `branding` in `TStartupConfig` and `configSchema` |

### Dead code re-exports to restore:

Upstream now uses functions we previously un-exported. Re-export them:

| File | Function | Action |
|---|---|---|
| `packages/data-provider/src/config.ts` | `getSchemaDefaults` | Re-export (upstream uses in new config tests) |
| `packages/data-provider/src/accessPermissions.ts` | `permBitsToAccessLevel` | Re-export (upstream uses) |
| `packages/data-provider/src/accessPermissions.ts` | `accessRoleToPermBits` | Re-export (upstream uses) |

---

## Merge Execution Plan

### Pre-merge Checklist
- [ ] Clean working tree (`git status` shows no uncommitted changes -- stash or commit current work)
- [ ] Backup branch: `git branch pre-upstream-merge-20260404`
- [ ] Upstream fetched: `git fetch upstream`
- [ ] Verify upstream range: `git log --oneline HEAD..upstream/main` shows 11 commits

### Merge Execution

**Method:** Merge commit
**Command:**
```bash
git merge upstream/main -m "merge: upstream/main — 11 commits (nested addParams, PKCE strip, SSE key stability, config cleanup, searchbar guard, custom roles, draft text fix, useLocalize simplify, dep bumps, meilisearch fix, MCP OAuth reuse)"
```

### Expected Git Conflicts (resolve manually):

1. **`packages/data-provider/src/config.ts`**
   - Accept upstream's `addParamsSchema`, `fileStorageSchema`, `CONFIG_VERSION` bump
   - Accept upstream's removal of `endpointsMenu`/`sidePanel` from `interfaceSchema`
   - RE-ADD our `branding` field in `TStartupConfig` and `configSchema`
   - Re-export `getSchemaDefaults` (upstream now uses it)

2. **`packages/data-provider/src/roles.ts`**
   - Accept upstream's `isSystemRoleName` function
   - KEEP our `PROJECTS` permission entries in both `defaultRolesSchema` and `roleDefaults`
   - Accept upstream's import change removing `projectPermissionsSchema` -- but re-add if our schema block needs it

3. **`packages/data-schemas/src/types/app.ts`**
   - Accept upstream's `FileSources` -> `FileStorage` type change for `fileStrategy`
   - RE-ADD our `branding?: TCustomConfig['branding']` field

4. **`package-lock.json`**
   - Accept either side, then regenerate: `npm install`

5. **`packages/data-provider/src/permissions.ts`** (possible conflict)
   - KEEP our `PermissionTypes.PROJECTS` and `projectPermissionsSchema`
   - Accept any upstream changes to existing permission types

6. **`packages/data-provider/src/accessPermissions.ts`** (possible conflict)
   - KEEP our `ResourceType.PROJECT` and `AccessRoleIds.PROJECT_*`
   - Re-export `permBitsToAccessLevel` and `accessRoleToPermBits`
   - Accept any upstream changes

7. **`packages/data-provider/src/schemas.ts`** (possible conflict)
   - KEEP our `projectId` in `tConversationSchema`
   - Accept any upstream changes

### Post-merge Manual Fixes Required (SEMANTIC CONFLICTS):

These files will auto-merge without git conflicts but will contain invalid Recoil imports:

1. **`client/src/components/Chat/Messages/MultiMessage.tsx`:**
   - Replace `import { useRecoilState } from 'recoil';` with `import { useAtom } from 'jotai';`
   - Replace `useRecoilState(store.messagesSiblingIdxFamily(messageId))` with `useAtom(store.messagesSiblingIdxFamily(messageId))`

2. **`client/src/components/Chat/Messages/MessagesView.tsx`:**
   - Verify import is `import { useAtomValue } from 'jotai';` (not `useRecoilValue`)
   - If Recoil import sneaked in, replace with Jotai

3. **`client/src/components/Chat/Messages/MessageParts.tsx`:**
   - Same as MessagesView -- verify Jotai import is intact

4. **`client/src/components/UnifiedSidebar/ConversationsSection.tsx`:**
   - Replace any `useSetRecoilState`/`useRecoilValue` with `useSetAtom`/`useAtomValue` from `'jotai'`
   - Change `store.conversationIdByIndex(0)` to `store.conversationByIndex(0)`
   - Rename variable `conversationId` to `conversation`
   - Update usages: `clearMessagesCache(queryClient, conversation?.conversationId)`

5. **`client/src/hooks/AuthContext.tsx`:**
   - Replace `import { useRecoilState, useSetRecoilState } from 'recoil';` with `import { useAtom, useSetAtom } from 'jotai';`
   - Replace `useRecoilState(store.user)` with `useAtom(store.user)`
   - Replace `useSetRecoilState<boolean>(store.queriesEnabled)` with `useSetAtom(store.queriesEnabled)`

6. **`client/src/hooks/__tests__/AuthContext.spec.tsx`:**
   - Remove `import { RecoilRoot } from 'recoil';`
   - Remove `<RecoilRoot>` / `</RecoilRoot>` wrappers from both `renderProvider()` and `renderProviderLive()`
   - Add `useListRoles` to the data-provider mock

7. **`client/src/hooks/Input/useAutoSave.ts`:**
   - Replace `import { SetterOrUpdater, useRecoilValue } from 'recoil';` with `import { useAtomValue } from 'jotai';`
   - Keep `import type { ExtendedFile, AtomSetter } from '~/common';`
   - Replace `setFiles: SetterOrUpdater<Map<string, ExtendedFile>>` with `setFiles: AtomSetter<Map<string, ExtendedFile>>`
   - Replace `useRecoilValue<boolean>(store.saveDrafts)` with `useAtomValue(store.saveDrafts)`

8. **`client/src/hooks/Input/useAutoSave.spec.ts`** (new file):
   - Replace `jest.mock('recoil', ...)` with `jest.mock('jotai', ...)`
   - Replace `import { useRecoilValue } from 'recoil';` with `import { useAtomValue } from 'jotai';`
   - Replace all `useRecoilValue` references with `useAtomValue`
   - Fix mock store: `{ key: 'saveDrafts', default: true }` -> just the atom reference (Jotai atoms don't use key/default objects)

### Post-merge Cleanup:

9. **Delete duplicate file:** `api/server/services/Endpoints/assistants/initalize.js` (misspelled; upstream recreates it, we renamed to `initialize.js`)

10. **Regenerate lockfile:** `npm install` (after resolving package.json conflicts)

### Post-merge Verification

```bash
# 1. ZERO Recoil references in client code
grep -r "from 'recoil'" client/src/ packages/ --include="*.ts" --include="*.tsx"
# Expected: 0 results

# 2. Build data-provider
npm run build:data-provider
# Expected: success

# 3. Full build
npm run build
# Expected: success

# 4. TypeScript check
cd packages/data-schemas && npx tsc --noEmit
# Expected: error count same or lower than pre-merge

# 5. Run new upstream tests
cd api && npx jest adminPkce
cd api && npx jest roles.spec
cd api && npx jest mcp.spec
cd packages/data-provider && npx jest config-schemas
cd packages/data-schemas && npx jest mongoMeili
cd packages/data-schemas && npx jest convoStructure
cd client && npx jest MessageIcon.render
cd client && npx jest AuthContext.spec
cd client && npx jest useAutoSave

# 6. Container build
docker compose up -d --build api
```

---

## Effort Estimate

| Task | Estimated Time |
|---|---|
| Pre-merge prep (backup, fetch, verify) | 2 min |
| Run `git merge upstream/main` | 1 min |
| Resolve ~7 git conflicts | 20 min |
| Fix ~8 Recoil-to-Jotai semantic conflicts | 15 min |
| Fix useAutoSave.spec.ts Jotai mocks | 5 min |
| Verify project/branding code preserved | 5 min |
| Delete misspelled file, regenerate lockfile | 3 min |
| Run verification checks (build, tests, grep) | 10 min |
| Debug any unexpected failures | 10 min |
| **Total** | **~70 min** |
