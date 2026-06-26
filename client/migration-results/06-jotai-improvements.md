# Jotai Improvement Suggestions

**Date:** 2026-04-04
**Agent:** 6 (CLOSER)

Post-migration opportunities to leverage Jotai's advanced features for cleaner, more performant state management.

---

## 1. `atomWithStorage` Instead of Custom `createStorageAtom`

The codebase uses a custom `createStorageAtom` wrapper (in `src/store/jotai-utils.ts`) around Jotai's built-in `atomWithStorage`. While the wrapper adds `getOnInit: true` and optional side-effect support, many of the 42+ localStorage atoms do not need the side-effect variant. These could use Jotai's built-in `atomWithStorage` directly, reducing the abstraction layer.

**Candidates (no side effects, pure storage):**
- All 16 speech settings atoms (`conversationMode`, `speechToText`, `voice`, etc.)
- All 11 general settings atoms (`autoScroll`, `enterToSend`, `maximizeChatSpace`, etc.)
- All 12 chat-feature settings atoms (`forkSetting`, `modularChat`, `LaTeXParsing`, etc.)
- `autoSendPrompts`, `alwaysMakeProd`, `promptsEditorMode`
- `isTemporary`, `defaultTemporaryChat`
- `hideBannerHint`, `chatBadges`
- `lang`

**Keep `createStorageAtom` for:** `fontSizeAtom` (applies CSS class on write via `createStorageAtomWithEffect`).

**Recommendation:** Consider simplifying `createStorageAtom` to be a thin alias for `atomWithStorage` with `getOnInit: true`, or replace it entirely with direct `atomWithStorage` calls and a shared storage config.

---

## 2. `selectAtom` for Granular Subscriptions

Several components read large state objects but only use a single field. `selectAtom` (from `jotai/utils`) would prevent re-renders when unrelated fields change.

**Candidates:**

| Consumer | Atom | Field Used | Improvement |
|----------|------|-----------|-------------|
| `useSearchEnabled.ts` | `search` | `enabled` | `selectAtom(search, s => s.enabled)` |
| `SearchButtons.tsx` | `search` | `query` | `selectAtom(search, s => s.query)` |
| `FavoritesList.tsx` | `search` | `enabled` | `selectAtom(search, s => s.enabled)` |
| Components reading `conversationByIndex(i)` | conversation atom | `.endpoint`, `.model`, `.agentId` | Use field-level selectors instead of full conversation object |

**Impact:** The `conversationByIndex` family atoms hold full `TConversation` objects. Components that only read `.endpoint` or `.model` currently re-render on any conversation field change. Field-level `selectAtom` derivatives would significantly reduce unnecessary renders.

---

## 3. `splitAtom` for List Management

`splitAtom` (from `jotai/utils`) creates per-item atoms from a list atom, enabling fine-grained updates without re-rendering the entire list.

**Candidates:**

| Atom | Current Pattern | Improvement |
|------|----------------|-------------|
| `conversationKeysAtom` | Array of keys, iterated to access families | `splitAtom` could manage the key list with per-key atoms |
| `hideBannerHint` | Array of dismissed banner IDs | `splitAtom` for per-banner dismissal state |
| `chatBadges` | Array of badge objects | `splitAtom` for per-badge editing without re-rendering badge list |

**Note:** The conversation families pattern (keysAtom + atomFamily lookup) is already a manual implementation of what `splitAtom` provides. A future refactor could unify these.

---

## 4. `focusAtom` with Optics for Nested State

`focusAtom` (from `jotai-optics`) allows lens-based access to nested state fields, creating derived writable atoms for sub-properties.

**Candidates:**

| Atom | Nested Structure | Improvement |
|------|-----------------|-------------|
| `search` | `{ enabled, query, ... }` | `focusAtom(search, o => o.prop('enabled'))` for `useSearchEnabled` |
| `conversationByIndex(i)` | Full `TConversation` | `focusAtom` for `.endpoint`, `.model`, `.tools` etc. |
| `artifactsState` | Complex artifact object | Field-level focus atoms for panel mode, visibility, current ID |

**Trade-off:** Requires adding `jotai-optics` dependency. The `selectAtom` approach (read-only) covers most cases without the extra package.

---

## 5. Provider Scoping for State Isolation

The codebase currently uses provider-less mode (default store). Jotai `<Provider>` with scoped stores could improve state isolation.

**Opportunities:**

### Per-Conversation Providers
Wrap each conversation panel in a `<Provider>` with its own store. This would:
- Eliminate the need for atom families keyed by conversation index
- Simplify `conversationByIndex(i)` to a plain `conversationAtom` within each provider scope
- Make `useClearStates` trivial (just unmount the provider)
- Prevent cross-conversation state leaks

### Settings Panel Provider
The settings panel reads 30+ atoms. A scoped provider could:
- Buffer changes until "Save" is clicked
- Enable "Cancel" without reverting individual atoms

### Artifact Panel Provider
Artifact state (`artifactsState`, `currentArtifactId`, `artifactsVisibility`) is self-contained. A scoped provider would isolate it from the main chat state tree.

**Caveat:** Provider scoping is a significant architectural change. It should be planned as a follow-up project, not mixed into the migration.

---

## 6. Write-Through Atom Simplification

Several patterns in the codebase use intermediate state that could be simplified with Jotai's derived atom patterns.

### Current Pattern: Manual Sync in `conversationByIndex`
The `conversationByIndex` atom family has an `onSet` effect that syncs to localStorage and URL params. In Jotai, this can be a derived write atom:

```typescript
const conversationByIndexBase = atomFamily((index: string) => atom<TConversation | null>(null));

const conversationByIndex = atomFamily((index: string) =>
  atom(
    (get) => get(conversationByIndexBase(index)),
    (get, set, update: TConversation | null) => {
      set(conversationByIndexBase(index), update);
      // Sync to localStorage
      syncToLocalStorage(update);
      // Sync URL params
      syncUrlParams(update);
    }
  )
);
```

### Current Pattern: `useClearConvoState` with Snapshot
The snapshot-based clear functions iterate over keys and reset each family member. With Jotai, `atomFamily.remove(key)` from `jotai/utils` directly evicts cached entries, which is cleaner than resetting to defaults.

### Current Pattern: `useRecoilCallback` for Imperative Access
11 locations use `useRecoilCallback` with `snapshot.getPromise`/`snapshot.getLoadable` for imperative atom reads. Jotai's `useStore` hook + `store.get(atom)` is the direct equivalent, but many of these could be refactored to reactive patterns using derived atoms instead.

---

## 7. DevTools Integration

Jotai has official DevTools support via `jotai-devtools`. Adding `debugLabel` to atoms (already done during migration) enables:
- Atom value inspection in React DevTools
- State time-travel debugging
- Atom dependency graph visualization

**Recommendation:** Add `jotai-devtools` as a dev dependency and mount `<DevTools />` in development mode.

---

## Priority Ranking

| # | Improvement | Effort | Impact | Priority |
|---|------------|--------|--------|----------|
| 1 | `selectAtom` for conversation fields | Low | High (render perf) | Do first |
| 2 | DevTools integration | Low | Medium (DX) | Do first |
| 3 | Simplify `createStorageAtom` | Low | Low (code cleanliness) | When convenient |
| 4 | `atomFamily.remove()` in clear functions | Medium | Medium (code simplicity) | Next sprint |
| 5 | `splitAtom` for badge/banner lists | Medium | Low | When touching those features |
| 6 | Per-conversation providers | High | High (architecture) | Plan as separate project |
| 7 | `focusAtom` with optics | Medium | Medium | Evaluate need first |
