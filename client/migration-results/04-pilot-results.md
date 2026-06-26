# Pilot Migration Results: `search-state` Unit

**Date:** 2026-04-04
**Agent:** 4 (SCAFFOLDER)

---

## 1. Scope

- **Atom migrated:** `search` in `src/store/search.ts`
- **Dead atoms removed:** 6 (see Section 5)
- **Consumer files updated:** 9
- **Total files modified:** 13

---

## 2. Changes by File

### 2.1 Atom Definition: `src/store/search.ts`

**Before:**
```typescript
import { atom } from 'recoil';
const search = atom<SearchState>({ key: 'search', default: { ... } });
```

**After:**
```typescript
import { atom } from 'jotai';
const search = atom<SearchState>({ enabled: null, query: '', ... });
search.debugLabel = 'search';
```

### 2.2 Barrel: `src/store/index.ts`

- Removed `import endpoints from './endpoints'`
- Removed `import submission from './submission'`
- Removed `export * from './project'`
- Removed `...endpoints`, `...submission` from default export spread

### 2.3 Consumer Migrations (8 files -- Recoil fully removed)

| File | Before | After |
|---|---|---|
| `src/components/Nav/SettingsTabs/General/ArchivedChatsTable.tsx` | `useRecoilValue` from `recoil` | `useAtomValue` from `jotai` |
| `src/components/Conversations/Conversations.tsx` | `useRecoilValue` from `recoil` | `useAtomValue` from `jotai` |
| `src/components/Nav/SettingsTabs/Data/SharedLinks.tsx` | `useRecoilValue` from `recoil` | `useAtomValue` from `jotai` |
| `src/routes/Search.tsx` | `useRecoilValue` from `recoil` | `useAtomValue` from `jotai` |
| `src/components/Nav/SearchBar.tsx` | `useRecoilState` from `recoil` | `useAtom` from `jotai` |
| `src/components/Nav/Favorites/FavoritesList.tsx` | `useRecoilValue` from `recoil` | `useAtomValue` from `jotai` |
| `src/components/Chat/Messages/SearchButtons.tsx` | `useRecoilValue` from `recoil` | `useAtomValue` from `jotai` |
| `src/hooks/Conversations/useSearchEnabled.ts` | `useSetRecoilState` from `recoil` | `useSetAtom` from `jotai` |

### 2.4 Consumer Migration (1 file -- Recoil kept for other atoms)

| File | Change |
|---|---|
| `src/components/UnifiedSidebar/ConversationsSection.tsx` | Added `import { useAtomValue } from 'jotai'`; changed `useRecoilValue(store.search)` to `useAtomValue(store.search)`; kept `recoil` import for `store.sidebarExpanded` and `store.conversationByIndex(0)` |

---

## 3. Dead Atom Removal

| Atom | File | Verification |
|---|---|---|
| `submission` | `src/store/submission.ts` | Grep for `store.submission` (excluding `submissionBy`) -- 0 hits |
| `isSubmitting` | `src/store/submission.ts` | Grep for `store.isSubmitting` (excluding `isSubmittingF`) -- 0 hits |
| `endpointsConfig` | `src/store/endpoints.ts` | Grep for `store.endpointsConfig` -- 0 hits |
| `endpointsQueryEnabled` | `src/store/endpoints.ts` | Grep for `store.endpointsQueryEnabled` -- 0 hits |
| `endpointsFilter` | `src/store/endpoints.ts` | Grep for `store.endpointsFilter` -- 0 hits |
| `activeProjectId` | `src/store/project.ts` | Grep for `store.activeProjectId` and named `activeProjectId` -- 0 consumer hits |

Files `submission.ts` and `endpoints.ts` now export empty default objects. `project.ts` exports nothing. The `defaultConfig` value from `endpoints.ts` was only referenced internally and had 0 external consumers.

---

## 4. Verification

### TypeScript
```
npx tsc --noEmit 2>&1 | grep -E "store/(search|submission|endpoints|project|index)|SearchBar|..."
```
**Result: 0 errors in any modified file.** All pre-existing errors are in unrelated files (`conversationTags.spec.ts`, `resources.ts`, e2e configs).

### Recoil Import Check
Grep for `from 'recoil'` in all 10 modified consumer/store files:
- **8 files:** Zero remaining Recoil imports (fully migrated)
- **1 file** (`ConversationsSection.tsx`): Retains Recoil import for other atoms -- expected

---

## 5. Surprises and Adjustments

1. **No surprises.** The migration was entirely mechanical. The Jotai `atom()` accepts the default value directly (no `{ key, default }` wrapper), and the hook APIs are 1:1 compatible.

2. **Setter compatibility confirmed.** `useSearchEnabled.ts` uses the updater-function pattern `setSearch((prev) => ({ ...prev, enabled: true }))`. This works identically with Jotai's `useSetAtom` -- no changes needed in the callback body.

3. **The `SearchState` type export** from `search.ts` was preserved unchanged. No consumers import this type directly (it's inferred from the atom), but keeping it available is good practice.

4. **Empty store files.** After removing all atoms from `submission.ts` and `endpoints.ts`, the files export empty objects rather than being deleted. This avoids breaking any transitive imports and can be cleaned up when the barrel is refactored.

---

## 6. Lessons for Full Migration

1. **Hook translation is purely mechanical.** For simple atoms, the only work is swapping the import source and hook name. No logic changes needed.

2. **Mixed-library files are safe.** `ConversationsSection.tsx` now imports from both `recoil` and `jotai` with no issues. This confirms the coexistence model works.

3. **The barrel export pattern (`store.X`) is migration-friendly.** Consumers don't care whether `store.search` is a Recoil atom or a Jotai atom -- only the hook call changes.

4. **Dead atom removal is trivial** once verified by grep. The key verification is `store.<atomName>` -- if zero hits, the atom is dead.

5. **No test changes needed for this unit.** The `Conversations.test.tsx` file wraps in `<RecoilRoot>` but doesn't directly reference `store.search`. It will need updating when `RecoilRoot` is removed in Unit 20 but not before.

---

## 7. Metrics

| Metric | Value |
|---|---|
| Recoil atoms removed (dead) | 6 |
| Recoil atoms migrated to Jotai | 1 |
| Consumer files updated | 9 |
| Files fully free of Recoil | 8 of 9 consumers + 1 store file |
| TypeScript errors introduced | 0 |
| Lines of code changed (approx) | ~25 |
| Recoil call sites eliminated | 9 of ~680 (1.3%) |
