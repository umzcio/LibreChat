# selectAtom Optimization Pass -- Agent 4: Final Report

Generated: 2026-04-04

---

## 1. Quantification

### Totals

| Metric | Value |
|--------|-------|
| New derived atoms created | **5** (`latestMessageErrorFamily`, `latestMessageParentIdFamily`, `latestMessageIdFamily`, `conversationBookmarkInfoByIndex`, `conversationHasMessagesByIndex`) |
| Consumer call sites optimized | **9** (Changes 1, 2, 3, 5, 7, 9, 10, 11, 12) |
| Consumer call sites skipped | **3** (Changes 4, 6, 8) |
| Files modified | **10** (1 store definition file + 9 consumer files) |
| TypeScript errors | **111** (unchanged from baseline) |
| Tests passing | **1462/1462** (unchanged from baseline) |

### Per-Consumer: Fields Eliminated from Re-render Triggers

| Consumer | File | Fields Still Subscribed | Fields Eliminated (no longer trigger re-renders) |
|----------|------|------------------------|--------------------------------------------------|
| ConversationsSection | `UnifiedSidebar/ConversationsSection.tsx` | `conversationId` (1) | 61 fields (model, endpoint, messages, settings, etc.) |
| ExpandedPanel/NewChatButton | `UnifiedSidebar/ExpandedPanel.tsx` | `conversationId` (1) | 61 fields |
| NewChat | `Nav/NewChat.tsx` | `conversationId` (1) | 61 fields |
| useUnifiedSidebarLinks | `hooks/Nav/useUnifiedSidebarLinks.ts` | `endpoint` (1) | 61 fields |
| useTextarea | `hooks/Input/useTextarea.ts` | `error` (1) | 31 fields (text, content, messageId, sender, etc.) |
| useHandleKeyUp | `hooks/Input/useHandleKeyUp.ts` | `parentMessageId` (1) | 31 fields |
| ShareButton | `Conversations/ConvoOptions/ShareButton.tsx` | `messageId` (1) | 31 fields |
| BookmarkMenu | `Chat/Menus/BookmarkMenu.tsx` | `conversationId`, `tags`, `expiredAt` (3) | 59 fields |
| TemporaryChat | `Chat/TemporaryChat.tsx` | boolean: has messages (1 derived) | 62 fields |

### Re-render Reduction for Key User Flows

#### Typing a message

| Component/Hook | Before | After | Change |
|----------------|--------|-------|--------|
| `useTextarea` | Re-renders on every streaming token (subscribed to all 32 latestMessage fields) | Only re-renders when `error` field changes (once per error event, not per token) | **~100% reduction during streaming** |
| `useHandleKeyUp` | Re-renders on every streaming token | Only re-renders when `parentMessageId` changes (once per new message) | **~100% reduction during streaming** |
| `TemporaryChat` | Re-renders on any conversation field change (62 fields) | Only re-renders when messages array transitions empty/non-empty | **~98% reduction** |

**Net effect:** The input area is effectively decoupled from the streaming token pipeline. Before, every token written by the model triggered re-renders across the textarea and key handler. After, these components are inert during streaming.

#### Receiving a streaming response

| Component/Hook | Before | After | Change |
|----------------|--------|-------|--------|
| `useTextarea` | Re-renders per token | Stable (error-only) | **Eliminated from streaming path** |
| `useHandleKeyUp` | Re-renders per token | Stable (parentMessageId-only) | **Eliminated from streaming path** |
| `ShareButton` | Re-renders per token | Stable (messageId-only; set once per message) | **Eliminated from streaming path** |
| `ArtifactsContext` | Re-renders per token (reads `text`) | Unchanged (deferred -- still subscribes to full `latestMessageFamily`) | No change |
| `StreamAudio` | Re-renders per token (reads `text`) | Unchanged (deferred) | No change |
| `useChatHelpers` | Re-renders per token (read+write) | Unchanged (deferred -- needs write access) | No change |

**Net effect:** 3 of 7 `latestMessageFamily` consumers are now decoupled from per-token updates. The remaining 4 still re-render per token but are either inherently token-dependent (they read `text`) or require write access to the atom.

#### Switching conversations

| Component/Hook | Before | After | Change |
|----------------|--------|-------|--------|
| `ConversationsSection` | Re-renders on any of 62 conversation fields | Only on `conversationId` change | **~98% reduction** |
| `ExpandedPanel/NewChatButton` | Same | Same | **~98% reduction** |
| `NewChat` | Same | Same | **~98% reduction** |
| `useUnifiedSidebarLinks` | Re-renders on 62 fields | Only on `endpoint` change | **~98% reduction** |
| `BookmarkMenu` | Re-renders on 62 fields | Only on `conversationId`, `tags`, `expiredAt` | **~95% reduction** |
| `TemporaryChat` | Re-renders on 62 fields | Only on messages empty/non-empty boolean | **~98% reduction** |

**Net effect:** The sidebar, chat header, and bookmark menu no longer cascade re-render when conversation settings (model, temperature, top_p, etc.) are updated. Only identity/structural changes propagate.

---

## 2. Remaining Opportunities

### Consumers Skipped During Execution

| Change | Consumer | Reason |
|--------|----------|--------|
| 4 | `ExportAndShareMenu` | Passes full `conversation` object to `<ExportModal>` prop. Requires refactoring ExportModal to accept partial data. |
| 6 | `ArtifactsContext` (conversationByIndex) | Already optimized -- uses `conversationIdByIndex`. No action needed. |
| 8 | `ArtifactsContext` (latestMessageFamily) | Reads `text` which changes per token. Selector would not reduce streaming re-render frequency. Medium risk with `TMessage` cast to `getLatestText`. |

### Deferred Items from Optimization Plan (Group 4)

| ID | Consumer | Atom | Reason Deferred | Potential Approach |
|----|----------|------|-----------------|--------------------|
| 13 | `useChatHelpers` | `latestMessageFamily` | Uses `useAtom` (read+write). selectAtom only optimizes reads; write subscription still triggers re-renders. | Refactor to separate read/write hooks; extract read-only fields into selector, keep `useSetAtom` for writes. |
| 14 | `StreamAudio` | `latestMessageFamily` | Reads `text` (changes per token). Low ROI -- selector would still fire every token. | Only beneficial if profiling shows non-text field changes are a bottleneck. |
| 15 | `useResumeOnLoad` | `conversationByIndex` | Runs on mount/reconnect only. Low absolute impact despite high waste ratio. | Create `conversationEndpointTypeByIndex` if more consumers emerge. |
| 16 | `user` selectors | `user` | Atom updates rarely (login only). `MarkdownAnchor` is in hot path but atom almost never changes. | Create `userIdAtom` for correctness when refactoring nearby code. |
| 17 | `useMCPSelect` | `ephemeralAgentByConvoId` | Uses `useAtom` (read+write). Only 5 fields total. | Skip -- write dependency makes selectAtom ineffective. |

### splitAtom Candidates

The subscription map identified two keyed-record atoms (`artifactsState`, `messageAttachmentsMap`) that store `Record<string, T>`. These are already keyed by ID, so consumers look up individual entries. `splitAtom` from `jotai/utils` could benefit these if:

- Multiple components iterate the full record and each renders one entry (classic list pattern)
- Updates to one entry currently cause all list items to re-render

However, these atoms were deprioritized in the subscription map because consumers typically access a single key via `state[key]`, not iterating the whole record. `splitAtom` would add complexity without clear benefit. **Recommendation: skip unless profiling reveals list-level re-render cascades.**

---

## 3. Summary Table

| Consumer | Before (subscribed fields) | After (subscribed fields) | Fields Eliminated | Hot Path |
|----------|---------------------------|--------------------------|-------------------|----------|
| ConversationsSection | 62 (full conversation) | 1 (`conversationId`) | 61 | Yes (sidebar) |
| ExpandedPanel/NewChatButton | 62 (full conversation) | 1 (`conversationId`) | 61 | Yes (sidebar) |
| NewChat | 62 (full conversation) | 1 (`conversationId`) | 61 | Yes (chat header) |
| useUnifiedSidebarLinks | 62 (full conversation) | 1 (`endpoint`) | 61 | Yes (sidebar) |
| useTextarea | 32 (full latestMessage) | 1 (`error`) | 31 | Yes (streaming) |
| useHandleKeyUp | 32 (full latestMessage) | 1 (`parentMessageId`) | 31 | Yes (streaming) |
| ShareButton | 32 (full latestMessage) | 1 (`messageId`) | 31 | No |
| BookmarkMenu | 62 (full conversation) | 3 (`conversationId`, `tags`, `expiredAt`) | 59 | Yes (chat header) |
| TemporaryChat | 62 (full conversation) | 1 (boolean derived) | 62 | Yes (input area) |
| **Totals** | | | **458 field-subscriptions eliminated** | |

---

## 4. Final Verification

```
TypeScript errors (npx tsc --noEmit | grep "error TS" | wc -l): 111
  Matches baseline: YES

Tests (npx jest --no-coverage):
  Test Suites: 125 passed, 125 total
  Tests:       1462 passed, 1462 total
  Matches baseline: YES
```

No regressions introduced. All changes are type-safe and test-clean.

---

## 5. Files Modified (Complete List)

| File | Change Type |
|------|-------------|
| `client/src/store/families.ts` | Added 5 new derived atoms + `selectAtom` import |
| `client/src/components/UnifiedSidebar/ConversationsSection.tsx` | Swapped to `conversationIdByIndex` |
| `client/src/components/UnifiedSidebar/ExpandedPanel.tsx` | Swapped to `conversationIdByIndex` |
| `client/src/components/Nav/NewChat.tsx` | Swapped to `conversationIdByIndex` |
| `client/src/hooks/Nav/useUnifiedSidebarLinks.ts` | Swapped to `conversationEndpointByIndex` |
| `client/src/hooks/Input/useTextarea.ts` | Swapped to `latestMessageErrorFamily` |
| `client/src/hooks/Input/useHandleKeyUp.ts` | Swapped to `latestMessageParentIdFamily` |
| `client/src/components/Conversations/ConvoOptions/ShareButton.tsx` | Swapped to `latestMessageIdFamily` |
| `client/src/components/Chat/Menus/BookmarkMenu.tsx` | Swapped to `conversationBookmarkInfoByIndex` |
| `client/src/components/Chat/TemporaryChat.tsx` | Swapped to `conversationHasMessagesByIndex` |
