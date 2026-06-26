# selectAtom Optimization Pass -- Agent 3: Execution Log

Generated: 2026-04-04

---

## Baseline

- **TypeScript errors:** 111 (pre-existing, unrelated to changes)
- **Tests:** 125 suites, 1462 tests, all passing

---

## Group 2: Reuse Existing Selectors (Zero New Code)

### Change 1: ConversationsSection -- DONE
- File: `client/src/components/UnifiedSidebar/ConversationsSection.tsx`
- Replaced `store.conversationByIndex(0)` with `store.conversationIdByIndex(0)`
- Updated `conversation?.conversationId` refs to `conversationId`
- `clearMessagesCache` accepts `string | undefined | null`, so `conversationId` (type `string | null`) is compatible directly

### Change 2: ExpandedPanel/NewChatButton -- DONE
- File: `client/src/components/UnifiedSidebar/ExpandedPanel.tsx`
- Replaced `store.conversationByIndex(0)` with `store.conversationIdByIndex(0)`
- Updated `conversation?.conversationId` refs and dependency array

### Change 3: NewChat -- DONE
- File: `client/src/components/Nav/NewChat.tsx`
- Replaced `store.conversationByIndex(0)` with `store.conversationIdByIndex(0)`

### Change 4: ExportAndShareMenu -- SKIPPED
- File: `client/src/components/Chat/ExportAndShareMenu.tsx`
- **Reason:** Component passes full `conversation` object to `<ExportModal conversation={conversation} />` on line 102. Cannot replace with `conversationIdByIndex` without refactoring ExportModal. Plan did not account for this dependency.

### Change 5: useUnifiedSidebarLinks -- DONE
- File: `client/src/hooks/Nav/useUnifiedSidebarLinks.ts`
- Replaced `store.conversationByIndex(0)` with `store.conversationEndpointByIndex(0)`
- Removed intermediate `conversation` variable; `endpoint` is now read directly from the derived atom
- `endpoint` type is `EModelEndpoint | null`, compatible with all downstream usages (all use `endpoint ?? ''` pattern)

### Verification after Group 2
- TypeScript errors: 111 (matches baseline)
- Tests: 1462/1462 passing

---

## Group 1: New Single-Field Selectors for latestMessageFamily

### New Atoms Added to `families.ts`

1. **`latestMessageErrorFamily`** -- returns `message?.error` (type `boolean | undefined`)
2. **`latestMessageParentIdFamily`** -- returns `message?.parentMessageId` (type `string | null | undefined`)
3. **`latestMessageIdFamily`** -- returns `message?.messageId` (type `string | null | undefined`)

All three:
- Use `atomFamily((param) => { const a = atom(...); a.debugLabel = '...'; return a; })` pattern with debugLabels
- Return primitives, so no custom equality function needed
- Defined after `conversationAssistantIdByIndex`, before `presetByIndex`
- Added to default export object

### Change 7: useTextarea -- DONE
- File: `client/src/hooks/Input/useTextarea.ts`
- Replaced `store.latestMessageFamily(index)` with `store.latestMessageErrorFamily(index)`
- Updated `latestMessage?.error === true` to `latestMessageError === true`
- Updated useEffect dependency array: `latestMessage` -> `latestMessageError`
- **Impact:** Highest single change. Input textarea no longer re-renders on every streaming token.

### Change 9: useHandleKeyUp -- DONE
- File: `client/src/hooks/Input/useHandleKeyUp.ts`
- Replaced `store.latestMessageFamily(index)` with `store.latestMessageParentIdFamily(index)`
- Updated `latestMessage` check and `latestMessage.parentMessageId` to `latestParentMessageId`
- `parentMessageId` is set once per message, not per token

### Change 10: ShareButton -- DONE
- File: `client/src/components/Conversations/ConvoOptions/ShareButton.tsx`
- Replaced `store.latestMessageFamily(0)` with `store.latestMessageIdFamily(0)`
- Updated `latestMessage?.messageId` to `latestMessageId ?? undefined` (to match `string | undefined` prop type)

### Verification after Group 1
- TypeScript errors: 111 (matches baseline)
- Tests: 1462/1462 passing

---

## Group 3: New Compound Selectors

### New Atoms Added to `families.ts`

1. **`conversationBookmarkInfoByIndex`** -- uses `selectAtom` from `jotai/utils` with custom equality
   - Returns `{ conversationId, tags, expiredAt } | null`
   - Custom equality: compares `conversationId`, `expiredAt`, and `tags` (reference equality for tags array, which is replaced wholesale)
   - This is the only atom in the codebase using `selectAtom` -- justified because it returns an object and needs custom equality

2. **`conversationHasMessagesByIndex`** -- derived boolean atom
   - Returns `Array.isArray(conv?.messages) && conv.messages.length >= 1`
   - Primitive return, no custom equality needed
   - Has debugLabel

### Change 11: BookmarkMenu -- DONE
- File: `client/src/components/Chat/Menus/BookmarkMenu.tsx`
- Replaced `store.conversationByIndex(0)` with `store.conversationBookmarkInfoByIndex(0)`
- Updated `conversation` references to `bookmarkInfo`
- `isActiveConvo` truthiness check updated to use `bookmarkInfo`

### Change 12: TemporaryChat -- DONE
- File: `client/src/components/Chat/TemporaryChat.tsx`
- Replaced `store.conversationByIndex(0)` with `store.conversationHasMessagesByIndex(0)`
- Replaced `(Array.isArray(conversation?.messages) && conversation.messages.length >= 1)` with `hasMessages`
- Removed `conversation` variable entirely

### Verification after Group 3
- TypeScript errors: 111 (matches baseline)
- Tests: 1462/1462 passing

---

## Group 4: ArtifactsContext -- SKIPPED

- File: `client/src/Providers/ArtifactsContext.tsx`
- **Reason:** The component reads `text`, `content`, and `messageId` from `latestMessage`. Since `text` changes every streaming token, a selector including `text` would not reduce re-render frequency during streaming. The component already uses `useMemo` with appropriate dependencies. ROI is low and risk is medium (the `getLatestText` utility receives a cast `TMessage`). Deferred per plan's own risk assessment.

---

## Summary

| Metric | Before | After |
|--------|--------|-------|
| TypeScript errors | 111 | 111 |
| Tests passing | 1462/1462 | 1462/1462 |
| Consumer files edited | -- | 8 |
| New derived atoms | 0 | 5 |
| Changes completed | -- | 9 of 12 planned (Changes 1-3, 5, 7, 9-12) |
| Changes skipped | -- | 3 (Changes 4, 6, 8) |

### Files Modified

- `client/src/store/families.ts` -- added 5 new derived atoms + `selectAtom` import
- `client/src/components/UnifiedSidebar/ConversationsSection.tsx` -- Change 1
- `client/src/components/UnifiedSidebar/ExpandedPanel.tsx` -- Change 2
- `client/src/components/Nav/NewChat.tsx` -- Change 3
- `client/src/hooks/Nav/useUnifiedSidebarLinks.ts` -- Change 5
- `client/src/hooks/Input/useTextarea.ts` -- Change 7
- `client/src/hooks/Input/useHandleKeyUp.ts` -- Change 9
- `client/src/components/Conversations/ConvoOptions/ShareButton.tsx` -- Change 10
- `client/src/components/Chat/Menus/BookmarkMenu.tsx` -- Change 11
- `client/src/components/Chat/TemporaryChat.tsx` -- Change 12

### Skip Reasons
- **Change 4 (ExportAndShareMenu):** Needs full `conversation` object for `ExportModal` prop
- **Change 6:** Already optimized (plan noted this)
- **Change 8 (ArtifactsContext):** `text` field changes per token; selector won't reduce streaming re-renders; medium risk with `TMessage` cast
