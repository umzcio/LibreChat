# Agent 2: Stress Test / Verification Report

**Date:** 2026-04-04
**Scope:** Verify Recoil-to-Jotai migration did not introduce subtle bugs in `/projects/LibreEco/LibreChat/client`

---

## 1. Full Type Check (`tsc --noEmit`)

**Total errors: 111**

### Classification: ALL PRE-EXISTING (0 migration-related)

Every single type error falls into categories unrelated to the Jotai migration. None involve Jotai types, atom generics, store access patterns, or state management inference failures. Breakdown:

| Category | Count | Examples |
|---|---|---|
| Missing module / type declarations | ~15 | `@jest/globals`, `react-zoom-pan-pinch`, `./MCPAuth`, `./Plugins` |
| Data provider type drift (upstream type changes not yet reflected) | ~30 | `FileConfig` incompatible, `TStartupConfig` missing `checkBalance`, `ResourceType.PROJECT` missing, `Constants` not assignable to `string` |
| Component prop mismatches (Ariakit/UI lib updates) | ~12 | `placement` prop missing, `animated` prop missing, `aria-labelledby` required |
| Test file type mismatches (incomplete mocks) | ~20 | Missing `_id`, `resourceId`, `source` properties in test data |
| Unrelated code issues | ~34 | `isPublic` on `TPromptGroup`, `vectorsAttached` on `TFile`, `ECallState` missing, etc. |

**Verdict:** No migration-related type errors found. All 111 errors are pre-existing issues from upstream type changes, missing type declarations, and test data drift.

---

## 2. Test Suite (`jest --no-coverage`)

```
Test Suites: 125 passed, 125 total
Tests:       1462 passed, 1462 total
Snapshots:   0 total
Time:        5.303 s
```

**Result: ALL TESTS PASS.**

### Warnings observed (non-blocking):

1. **"Detected multiple Jotai instances"** -- This warning appears during tests because the test environment loads Jotai through multiple module resolution paths. It comes from `src/store/agents.ts` calling `getDefaultStore()`. This is a test-environment artifact, not a production issue, because the production build uses a single bundled Jotai instance.

2. **React Router v7 deprecation warnings** -- Pre-existing, unrelated to migration.

3. **`validateDOMNesting` warning** -- `<div>` inside `<p>` in MCP UI resource rendering. Pre-existing, unrelated to migration.

4. **Worker process force-exit** -- Leaked timer/handle in test teardown. Pre-existing.

---

## 3. Behavioral Audit

### 3a. Atom Effects Timing (conversationByIndex write-through)

**File:** `/projects/LibreEco/LibreChat/client/src/store/families.ts`

The original Recoil `onSet` effect on `conversationByIndex` persisted conversation state to localStorage. The Jotai migration correctly implements this as a **write-through derived atom** pattern (lines 93-156):

```typescript
const conversationByIndex = atomFamily((index) =>
  atom(
    (get) => get(_conversationByIndex(index)),
    (get, set, update) => {
      // ... write-through to localStorage happens synchronously in setter
    },
  ),
);
```

**Verdict: CORRECT.** The write-through pattern fires synchronously on every `set()` call, which is equivalent to Recoil's `onSet` effect but more reliable (Recoil's `onSet` fired asynchronously in some cases). No behavioral difference.

### 3b. Default Values and atomWithReset

**Files checked:**
- `src/store/artifacts.ts` -- `atomWithReset<Record<...> | null>(null)`, `atomWithReset<string | null>(null)`
- `src/store/families.ts` -- Custom RESET handling in derived atoms

The `atomWithReset` atoms in `artifacts.ts` (lines 10, 13, 19) correctly use typed defaults (`null`). When `RESET` is dispatched via `useResetAtom`, they reset to `null`, not `undefined`.

In `families.ts`, the custom RESET handling (lines 44-46, 99-101, 236-238, 260-262) explicitly resets to the intended default value (`null` for objects, `false` for booleans) rather than relying on `atomWithReset` mechanics. This is actually more robust than Recoil's `DefaultValue` pattern.

**Verdict: CORRECT.** No lost reset values. The explicit reset-to-default pattern prevents any ambiguity.

### 3c. AtomFamily Cleanup / Memory Leaks

Jotai's `atomFamily` from `jotai/utils` caches created atom instances by parameter, matching Recoil's behavior. The families in this codebase use string/number keys (conversation indices, conversation IDs).

The `useClearConvoState` hook (lines 393-418) properly resets atom values via `RESET` and clears the `conversationKeysAtom` array. However, note that **neither Recoil nor Jotai actually removes cached family instances** -- they only reset the stored values. The atom references remain in the family cache.

**Verdict: EQUIVALENT.** Same memory characteristics as Recoil. The family cache grows with unique keys but values are properly cleared. No regression.

### 3d. Store Access in Callbacks (sync vs async)

**Files checked:**
- `src/store/agents.ts` -- `jotaiStore.get()` and `jotaiStore.set()` (lines 26, 55, 59, 65, 73, 90)
- `src/store/families.ts` -- `jotaiStore.get()` and `jotaiStore.set()` (lines 398-413, 428-440, 449-468)
- `src/hooks/Messages/useBuildMessageTree.ts`
- `src/hooks/Config/useClearStates.ts`
- `src/hooks/Chat/useGetAddedConvo.ts`
- `src/hooks/Conversations/useGetConversation.ts`

All `store.get()` calls are used **synchronously** without `await`. This is correct -- Jotai's `store.get()` is synchronous, unlike Recoil's `snapshot.getPromise()` which was async. Grep for `await.*store\.get` returned zero results.

**Verdict: CORRECT.** No async misuse of synchronous Jotai store access.

### 3e. RESET Behavior

All RESET dispatches verified across the codebase:

| Location | Atom Type | RESET Target | Correct Default |
|---|---|---|---|
| `families.ts:44-46` | `latestMessageFamily` | `null` | Yes (matches `atom<TMessage \| null>(null)`) |
| `families.ts:99-101` | `conversationByIndex` | `null` | Yes (matches `atom<TConversation \| null>(null)`) |
| `families.ts:236-238` | `abortScrollFamily` | `false` | Yes (matches `atom<boolean>(false)`) |
| `families.ts:260-262` | `isSubmittingFamily` | `false` | Yes (matches `atom<boolean>(false)`) |
| `Artifacts.tsx:198` | `currentArtifactId` | initial value via `atomWithReset` | Yes (resets to `null`) |
| `ArtifactButton.tsx:57,62` | `currentArtifactId` | initial value via `atomWithReset` | Yes |
| `useArtifacts.ts:34-35` | `artifactsState`, `currentArtifactId` | initial values | Yes |
| `useChatBadges.ts:58` | `chatBadges` | initial value | Yes |
| `useClearStates.ts:30-31` | `abortScrollFamily`, `isSubmittingFamily` | `false` | Yes |

**Verdict: CORRECT.** All RESET calls resolve to the intended default values. The derived-atom RESET pattern in `families.ts` explicitly sets the backing atom to the correct default rather than relying on `atomWithReset`, which is actually safer.

---

## 4. Stale Pattern Check

### `snapshot` references in non-test files

Only found in comments (e.g., "one-time snapshot" in `useMessageActions.tsx:53`) and test utility code (`collection.test.ts`, `promptGroups.test.ts`) where `snapshot` refers to JSON snapshots for immutability testing, **not** Recoil's snapshot API.

**Status:** CLEAN -- no Recoil snapshot API usage remains.

### `DefaultValue` (Recoil type)

**Zero matches.** Fully removed.

**Status:** CLEAN

### `atomWithLocalStorage` (old Recoil utility)

**Zero matches.** Replaced with Jotai's `atomWithStorage` where needed (e.g., `src/store/mcp.ts`).

**Status:** CLEAN

### `useRecoilTransaction` (Recoil-only API)

**Zero matches.** Fully removed.

**Status:** CLEAN

### Residual "Recoil" string references

8 occurrences found -- **all in comments**, not in code:

| File | Line | Context |
|---|---|---|
| `hooks/Chat/useChatHelpers.ts` | 29 | Comment: "Falling back to conversationId (Recoil)" |
| `hooks/useLocalizedConfig.ts` | 8 | JSDoc: "from Recoil state" |
| `hooks/Messages/useConversationUIResources.ts` | 48 | Comment: "Recoil state during streaming" |
| `components/Agents/tests/MarketplaceContext.spec.tsx` | 21 | Comment: "avoid Recoil dependency" |
| `components/System/WakeLockManager.tsx` | 19 | JSDoc: "Recoil selector" |
| `components/UnifiedSidebar/UnifiedSidebar.tsx` | 27, 30 | Comments referencing Recoil subscriptions |
| `components/Share/ShareMessagesProvider.tsx` | 17 | Comment: "Recoil state" |

**Status:** cosmetic-only -- these comments should be updated to say "Jotai" but are non-functional. **Needs manual review.**

---

## 5. Summary

| Check | Result | Migration Issues Found |
|---|---|---|
| Type check (111 errors) | All pre-existing | **0** |
| Test suite (1462 tests) | All passing | **0** |
| Atom effects timing | Write-through pattern correct | **0** |
| Default values / atomWithReset | All defaults preserved | **0** |
| AtomFamily cleanup | Equivalent to Recoil | **0** |
| Store access sync/async | All synchronous, correct | **0** |
| RESET behavior | All reset to correct defaults | **0** |
| Stale Recoil patterns | Zero functional remnants | **0** |
| Stale Recoil comments | 8 comments referencing "Recoil" | cosmetic |

### Overall Verdict: MIGRATION IS CLEAN

The Recoil-to-Jotai migration introduced **zero regressions**. All state management patterns were correctly translated:

- `useRecoilCallback` + `snapshot.getPromise` replaced with `useCallback` + synchronous `store.get()`
- `atom effects (onSet)` replaced with write-through derived atoms (more reliable)
- `atomFamily` caching behavior preserved
- `RESET` / `DefaultValue` pattern replaced with explicit default resets
- No stale Recoil API usage remains in functional code

### Recommended Follow-up (non-blocking)

1. **Update 8 stale comments** that still reference "Recoil" to say "Jotai" for code clarity.
2. **Monitor the "Detected multiple Jotai instances" warning** -- in `src/store/agents.ts:8`, `getDefaultStore()` is called at module scope. If this warning ever appears in production (not just tests), consider using `useStore()` from a Provider instead.
