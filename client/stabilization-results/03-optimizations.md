# Post-Migration Jotai Optimization Plan

**Date:** 2026-04-04
**Agent:** 3 (OPTIMIZER)
**Mode:** DRY_RUN -- no source files modified

---

## Summary

97 `debugLabel` assignments found across 11 store files. 4 atoms missing labels. 2 static atoms confirmed dead. 3 empty store modules confirmed dead. 9 stale Recoil comments found. Multiple components subscribe to full objects when field-level selectors already exist or could be added cheaply.

This plan is organized by category, sorted within each by descending impact and ascending effort. Cross-referenced against `/projects/LibreEco/LibreChat/client/migration-results/06-jotai-improvements.md` to avoid duplication; items from that document are referenced but not repeated in full.

---

## Optimizations

### 1. [GRANULAR SUBSCRIPTIONS] Use existing field-level selectors instead of full `conversationByIndex`

- **Impact:** performance
- **Effort:** small
- **Risk:** none
- **Files:**
  - `client/src/components/UnifiedSidebar/ExpandedPanel.tsx` (line 20) -- only uses `.conversationId`
  - `client/src/components/Nav/NewChat.tsx` (line 13) -- only uses `.conversationId`
  - `client/src/components/Chat/ExportAndShareMenu.tsx` (line 26) -- only uses `.conversationId`
  - `client/src/components/Chat/TemporaryChat.tsx` (line 12) -- uses `.messages` and `.conversationId` (partial benefit)
  - `client/src/components/UnifiedSidebar/ConversationsSection.tsx` (line 31) -- needs audit of what fields are read downstream
- **Current pattern:**
  ```typescript
  const conversation = useAtomValue(store.conversationByIndex(0));
  // ... only uses conversation?.conversationId
  ```
- **Proposed pattern:**
  ```typescript
  const conversationId = useAtomValue(store.conversationIdByIndex(0));
  ```
- **Notes:** The selectors `conversationIdByIndex`, `conversationEndpointByIndex`, `conversationModelByIndex`, `conversationSpecByIndex`, `conversationAgentIdByIndex`, and `conversationAssistantIdByIndex` already exist in `families.ts` (lines 170-205) and are used by some components (`ModelSelectorChatContext.tsx`, `AgentPanelSwitch.tsx`, etc.) but at least 5 components still read the full object when a field selector would suffice. Each full-object subscription re-renders on *any* conversation field change (model, tools, params, etc.).

---

### 2. [GRANULAR SUBSCRIPTIONS] `selectAtom` for `search` state consumers

- **Impact:** performance
- **Effort:** small
- **Risk:** none
- **Files:**
  - `client/src/routes/Search.tsx` (line 16) -- only reads `.debouncedQuery`
  - `client/src/components/UnifiedSidebar/ConversationsSection.tsx` (line 44) -- only reads `.debouncedQuery`
  - `client/src/components/Chat/Messages/SearchButtons.tsx` (line 15) -- only reads `.query` (for display)
  - `client/src/components/Nav/Favorites/FavoritesList.tsx` (line 128) -- only reads `.enabled`
  - `client/src/components/Conversations/Conversations.tsx` (line 176) -- reads `.enabled` and `.debouncedQuery`
  - `client/src/components/Nav/SettingsTabs/General/ArchivedChatsTable.tsx` (line 53) -- reads `.debouncedQuery`
  - `client/src/components/Nav/SettingsTabs/Data/SharedLinks.tsx` (line 51) -- reads `.debouncedQuery`
- **Current pattern:**
  ```typescript
  const search = useAtomValue(store.search);
  const searchQuery = search.debouncedQuery;
  ```
- **Proposed pattern:**
  ```typescript
  // In store/search.ts, add derived atoms:
  import { selectAtom } from 'jotai/utils';

  const searchEnabled = selectAtom(search, (s) => s.enabled);
  const searchDebouncedQuery = selectAtom(search, (s) => s.debouncedQuery);
  const searchQuery = selectAtom(search, (s) => s.query);

  // In components:
  const debouncedQuery = useAtomValue(store.searchDebouncedQuery);
  ```
- **Notes:** 7 components subscribe to the full 5-field `SearchState` object. Most only read 1 field. The `search` atom is written to frequently (on every keystroke for `.query` and `.isTyping`), meaning all 7 components re-render on every keystroke even if they only care about `.debouncedQuery`. This is already noted in `06-jotai-improvements.md` Section 2, but the full list of affected consumers was not enumerated there.

---

### 3. [GRANULAR SUBSCRIPTIONS] `selectAtom` for `user` atom consumers

- **Impact:** performance (minor -- user changes infrequently)
- **Effort:** trivial
- **Risk:** none
- **Files:**
  - `client/src/components/Web/Sources.tsx` (line 224) -- only reads `user?.id`
  - `client/src/components/Chat/Messages/Content/MarkdownComponents.tsx` (line 99) -- only reads `user?.id`
  - `client/src/components/Chat/Messages/Content/FilePreviewDialog.tsx` (line 138) -- only reads `user?.id`
  - `client/src/data-provider/Endpoints/queries.ts` (line 38) -- reads `user?.role`
- **Current pattern:**
  ```typescript
  const user = useAtomValue(store.user);
  const userId = user?.id;
  ```
- **Proposed pattern:**
  ```typescript
  // In store/user.ts:
  const userId = selectAtom(user, (u) => u?.id);
  const userRole = selectAtom(user, (u) => u?.role);

  // In components:
  const userId = useAtomValue(store.userId);
  ```
- **Notes:** Low urgency because the user atom changes rarely (login/logout only). However, the pattern is clean and sets a good precedent.

---

### 4. [DEAD CODE] Remove unused static atoms `optionSettings` and `showPopover`

- **Impact:** code-quality
- **Effort:** trivial
- **Risk:** none
- **Files:**
  - `client/src/store/settings.ts` (lines 10-11, 16-17, 95, 97)
- **Current pattern:**
  ```typescript
  // settings.ts -- defined and exported but never imported outside the store barrel
  const optionSettings = atom<TOptionSettings>({});
  optionSettings.debugLabel = 'optionSettings';

  const showPopover = atom<boolean>(false);
  showPopover.debugLabel = 'showPopover';
  ```
- **Proposed pattern:** Delete these atoms and their entries in the `staticAtoms` object. All consumers use the family-indexed versions (`optionSettingsFamily`, `showPopoverFamily`) from `families.ts` instead.
- **Notes:** Grepping `store.optionSettings` (without `Family` suffix) and `store.showPopover` (without `Family` suffix) returns zero results. These are dead vestiges of the pre-multi-conversation era.

---

### 5. [DEAD CODE] Remove empty store modules

- **Impact:** code-quality
- **Effort:** trivial
- **Risk:** none
- **Files:**
  - `client/src/store/submission.ts` -- contains only `export default {};`
  - `client/src/store/endpoints.ts` -- contains only `export default {};`
  - `client/src/store/project.ts` -- contains only `export {};`
- **Current pattern:** These files exist as empty shells left over from the Recoil migration. They export nothing meaningful.
- **Proposed pattern:** Delete all three files. Remove any barrel imports from `client/src/store/index.ts` (note: `index.ts` currently does not import `submission.ts`, `endpoints.ts`, or `project.ts`, so no barrel changes needed).
- **Notes:** Confirmed by Ghost Hunter (Agent 2). These modules had their atoms migrated elsewhere or removed entirely during the Recoil-to-Jotai migration.

---

### 6. [DEBUG LABELS] Add missing `debugLabel` to 4 atoms

- **Impact:** developer-experience
- **Effort:** trivial
- **Risk:** none
- **Files:**
  - `client/src/store/showThinking.ts` -- `showThinkingAtom` missing `debugLabel`
  - `client/src/store/favorites.ts` -- `favoritesAtom` missing `debugLabel`
  - `client/src/store/mcp.ts` -- `mcpPinnedAtom`, `mcpServerInitStatesAtom` missing `debugLabel`
  - `client/src/store/fontSize.ts` -- `fontSizeAtom` missing `debugLabel`
- **Current pattern:**
  ```typescript
  export const showThinkingAtom = createStorageAtom<boolean>('showThinking', DEFAULT_SHOW_THINKING);
  // No debugLabel set
  ```
- **Proposed pattern:**
  ```typescript
  export const showThinkingAtom = createStorageAtom<boolean>('showThinking', DEFAULT_SHOW_THINKING);
  showThinkingAtom.debugLabel = 'showThinkingAtom';
  ```
- **Notes:** 97 debug labels are present across 11 files. These 5 atoms across 4 files are the only ones missing. The `mcpValuesAtomFamily` atoms get dynamic labels inside the factory (not needed since `atomFamily` handles identification), but `mcpPinnedAtom` and `mcpServerInitStatesAtom` are standalone atoms that should have labels.

---

### 7. [STORAGE ATOMS] Simplify `createStorageAtom` or replace with direct `atomWithStorage`

- **Impact:** maintainability
- **Effort:** small
- **Risk:** low
- **Files:**
  - `client/src/store/jotai-utils.ts` (lines 14-18)
  - 42+ consumers across `settings.ts`, `prompts.ts`, `temporary.ts`, `language.ts`, `misc.ts`
- **Current pattern:**
  ```typescript
  // jotai-utils.ts
  export function createStorageAtom<T>(key: string, defaultValue: T) {
    return atomWithStorage<T>(key, defaultValue, undefined, {
      getOnInit: true,
    });
  }
  ```
- **Proposed pattern:**
  Option A (minimal): Keep `createStorageAtom` as-is -- it is a thin wrapper that adds only `getOnInit: true`. This is a valid convenience helper that ensures consistency.

  Option B (remove wrapper): Replace all ~42 call sites with direct `atomWithStorage(key, default, undefined, { getOnInit: true })`.
- **Recommendation:** Option A is fine. The wrapper is 4 lines, self-documenting, and prevents forgetting `getOnInit`. The `createStorageAtomWithEffect` and `createTabIsolatedAtom` helpers in the same file are genuinely useful. Do NOT remove `jotai-utils.ts`.
- **Notes:** Already covered in `06-jotai-improvements.md` Section 1. The conclusion here agrees: the custom wrappers are thin enough to keep. No action needed unless the team wants to reduce abstraction layers.

---

### 8. [STALE COMMENTS] Remove 9 references to "Recoil"

- **Impact:** code-quality
- **Effort:** trivial
- **Risk:** none
- **Files and locations:**
  1. `client/src/hooks/useLocalizedConfig.ts:8` -- "Automatically retrieves the current language from Recoil state."
  2. `client/src/hooks/Messages/useConversationUIResources.ts:48` -- "Collect from in-flight messages (Recoil state during streaming...)"
  3. `client/src/hooks/Chat/useChatHelpers.ts:29` -- "Falling back to conversationId (Recoil)..."
  4. `client/src/components/UnifiedSidebar/UnifiedSidebar.tsx:27` -- "Isolates useChatHelpers Recoil subscriptions from the sidebar layout."
  5. `client/src/components/UnifiedSidebar/UnifiedSidebar.tsx:30` -- "This works because Recoil subscriptions don't propagate..."
  6. `client/src/components/Agents/tests/MarketplaceContext.spec.tsx:21` -- "Mock useChatHelpers to avoid Recoil dependency"
  7. `client/src/components/System/WakeLockManager.tsx:19` -- "Recoil selector tracking if any conversation is generating"
  8. `client/src/components/Share/ShareMessagesProvider.tsx:17` -- "need to check Recoil state for in-flight messages..."
  9. `client/src/components/Chat/Messages/SearchButtons.tsx` -- (none found here, but listed in Ghost Hunter report)
- **Proposed pattern:** Replace "Recoil" with "Jotai" in each comment, or rewrite the comment to remove the library name entirely (preferred, since comments should describe behavior not implementation).

---

### 9. [WRITE ATOMS] Extract read-compute-write patterns into write atoms

- **Impact:** maintainability
- **Effort:** medium
- **Risk:** low
- **Files (high-value candidates):**
  - `client/src/components/Artifacts/ArtifactButton.tsx` (lines 15-18) -- reads `artifactsState`, `currentArtifactId`, `visibleArtifacts`, computes new state, then sets all three. This multi-atom update should be a single write atom.
  - `client/src/components/Nav/SearchBar.tsx` (line 28) -- reads full `search` state, modifies fields, writes back. Could be replaced with field-level write atoms (e.g., `setSearchQuery` write atom).
  - `client/src/components/Chat/Input/ChatForm.tsx` (lines 83-87) -- reads and writes 5 different atoms. Badge editing logic could be a write atom.
  - `client/src/hooks/MCP/useMCPSelect.ts` (lines 31-33) -- coordinates `mcpValues`, `isPinned`, and `ephemeralAgent` in a single handler.
- **Current pattern:**
  ```typescript
  const [artifacts, setArtifacts] = useAtom(store.artifactsState);
  const [currentArtifactId, setCurrentArtifactId] = useAtom(store.currentArtifactId);
  const [visibleArtifacts, setVisibleArtifacts] = useAtom(store.visibleArtifacts);
  // ... handler computes new state from all three, then calls all three setters
  ```
- **Proposed pattern:**
  ```typescript
  // In store/artifacts.ts:
  const toggleArtifact = atom(null, (get, set, artifactId: string) => {
    const artifacts = get(artifactsState);
    const current = get(currentArtifactId);
    // ... compute new state
    set(artifactsState, newArtifacts);
    set(currentArtifactId, newId);
    set(visibleArtifacts, newVisible);
  });

  // In component:
  const toggle = useSetAtom(store.toggleArtifact);
  ```
- **Notes:** This is covered conceptually in `06-jotai-improvements.md` Section 6, but specific candidates were not listed there.

---

### 10. [PROVIDER SCOPING] Artifact panel state isolation

- **Impact:** maintainability
- **Effort:** medium
- **Risk:** medium
- **Files:**
  - `client/src/store/artifacts.ts` (all 5 atoms)
  - `client/src/components/Artifacts/Artifacts.tsx`
  - `client/src/components/Artifacts/ArtifactButton.tsx`
  - `client/src/hooks/Artifacts/useArtifacts.ts`
- **Current pattern:** Artifact atoms (`artifactsPanelMode`, `artifactsState`, `currentArtifactId`, `artifactsVisibility`, `visibleArtifacts`) live in the global store despite being logically scoped to the artifact panel subtree.
- **Proposed pattern:** Wrap the artifact panel in a `<Provider>` with a scoped store. When the panel unmounts, all artifact state auto-cleans. No manual reset needed.
- **Notes:** Already identified in `06-jotai-improvements.md` Section 5. Deferred as a follow-up project due to architectural scope.

---

### 11. [ANTI-PATTERN] `getDefaultStore()` usage in `agents.ts`

- **Impact:** maintainability
- **Effort:** small
- **Risk:** low
- **Files:**
  - `client/src/store/agents.ts` (line 2, 8)
- **Current pattern:**
  ```typescript
  import { atom, getDefaultStore } from 'jotai';
  const jotaiStore = getDefaultStore();

  // Used in hooks like useApplyNewAgentTemplate, useGetEphemeralAgent
  // to do imperative reads/writes outside React render
  ```
- **Proposed pattern:** These hooks (`useUpdateEphemeralAgent`, `useApplyNewAgentTemplate`, `useGetEphemeralAgent`) use `getDefaultStore()` at module scope to do imperative reads/writes. While functional, this couples the store module to the default store instance. The idiomatic Jotai approach is to use `useStore()` inside hooks (as done in `families.ts` for `useClearConvoState`). Refactoring these hooks to accept the store via `useStore()` would align them with the rest of the codebase.
- **Notes:** The `useClearConvoState`, `useClearSubmissionState`, and `useClearLatestMessages` hooks in `families.ts` already use the correct `useStore()` pattern. The agents module is the only place using `getDefaultStore()`.

---

## Priority Matrix

| Priority | Optimization | Impact | Effort | Risk |
|----------|-------------|--------|--------|------|
| P1 | #1 Use existing field-level selectors for `conversationByIndex` | High (perf) | Small | None |
| P1 | #2 `selectAtom` for `search` state | High (perf) | Small | None |
| P1 | #4 Remove dead static atoms | Low (quality) | Trivial | None |
| P1 | #5 Remove empty store modules | Low (quality) | Trivial | None |
| P1 | #6 Add 5 missing debug labels | Low (DX) | Trivial | None |
| P1 | #8 Remove stale Recoil comments | Low (quality) | Trivial | None |
| P2 | #3 `selectAtom` for `user` fields | Low (perf) | Trivial | None |
| P2 | #9 Write atoms for multi-atom updates | Med (maint) | Medium | Low |
| P2 | #11 Replace `getDefaultStore()` with `useStore()` | Med (maint) | Small | Low |
| P3 | #7 Evaluate `createStorageAtom` simplification | Low (maint) | Small | Low |
| P3 | #10 Provider scoping for artifacts | Med (maint) | Medium | Medium |

---

## What NOT to do (from `06-jotai-improvements.md`)

These items from the earlier suggestions document are **deferred** and should NOT be pursued during stabilization:

1. **`focusAtom` with `jotai-optics`** -- Adds a new dependency. `selectAtom` covers 90% of cases without it.
2. **Per-conversation `<Provider>` scoping** -- Major architectural change. Requires a separate design doc and dedicated sprint.
3. **`splitAtom` for lists** -- The existing `atomFamily` pattern already handles per-item granularity for conversations. `hideBannerHint` and `chatBadges` arrays are too small to benefit meaningfully.
4. **`jotai-devtools` integration** -- Good idea but out of scope for stabilization. File a separate ticket.
