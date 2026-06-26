# selectAtom Optimization Pass -- Agent 2: Optimization Plan

Generated: 2026-04-04

---

## Overview

This plan defines 12 concrete changes, grouped by priority and risk. Changes are ordered so that Group 2 (zero new code) ships first, followed by Group 1 (single-field selectAtom for hot paths), Group 3 (multi-field selectAtom), and Group 4 (complex cases deferred or skipped).

**Total new selector definitions:** 7
**Total consumer file edits:** 17
**Zero-new-code swaps (Group 2):** 6 consumer edits

---

## Definitions Location

All new selector atom families will be defined in `client/src/store/families.ts`, immediately after the existing block of `conversationIdByIndex` / `conversationEndpointByIndex` / etc. (after line 205). They will be added to the default export object.

For the `user` atom, new derived atoms go in `client/src/store/user.ts`.

For `ephemeralAgentByConvoId`, the new selector goes in `client/src/store/agents.ts`.

All new atoms use `atom` (derived read-only) via `atomFamily` -- the same pattern already used by `conversationIdByIndex`. We do NOT use `selectAtom` from `jotai/utils` because the existing codebase pattern uses `atomFamily(() => atom((get) => ...))` which provides the same caching semantics and is already established. Consistency with the existing codebase takes priority over introducing a new API.

---

## Group 2: Reuse Existing Selectors (Zero New Code)

These changes only modify consumer files to use already-exported derived atoms.

### Change 1: ConversationsSection -- use `conversationIdByIndex`

- **Group:** 2
- **Atom:** `conversationByIndex` -> `conversationIdByIndex`
- **Consumer(s):** `ConversationsSection` in `src/components/UnifiedSidebar/ConversationsSection.tsx`
- **Current:** `const conversation = useAtomValue(store.conversationByIndex(0));` then reads `conversation?.conversationId`
- **Proposed:** `const conversationId = useAtomValue(store.conversationIdByIndex(0));`
- **selectAtom definition:** Already exists at families.ts:170-174
- **Equality function:** N/A (primitive string)
- **Risk:** None. Direct field replacement.
- **Re-render reduction:** Stops re-rendering on any of the other 61 conversation fields changing (settings, model, endpoint, messages, etc.)

### Change 2: ExpandedPanel/NewChatButton -- use `conversationIdByIndex`

- **Group:** 2
- **Atom:** `conversationByIndex` -> `conversationIdByIndex`
- **Consumer(s):** `NewChatButton` in `src/components/UnifiedSidebar/ExpandedPanel.tsx`
- **Current:** `const conversation = useAtomValue(store.conversationByIndex(0));` then reads `conversation?.conversationId`
- **Proposed:** `const conversationId = useAtomValue(store.conversationIdByIndex(0));`
- **selectAtom definition:** Already exists
- **Equality function:** N/A
- **Risk:** None
- **Re-render reduction:** Same as Change 1

### Change 3: NewChat -- use `conversationIdByIndex`

- **Group:** 2
- **Atom:** `conversationByIndex` -> `conversationIdByIndex`
- **Consumer(s):** `NewChat` in `src/components/Nav/NewChat.tsx`
- **Current:** `const conversation = useAtomValue(store.conversationByIndex(0));` then reads `conversation?.conversationId`
- **Proposed:** `const conversationId = useAtomValue(store.conversationIdByIndex(0));`
- **selectAtom definition:** Already exists
- **Equality function:** N/A
- **Risk:** None
- **Re-render reduction:** Same as Change 1

### Change 4: ExportAndShareMenu -- use `conversationIdByIndex`

- **Group:** 2
- **Atom:** `conversationByIndex` -> `conversationIdByIndex`
- **Consumer(s):** `ExportAndShareMenu` in `src/components/Chat/ExportAndShareMenu.tsx`
- **Current:** `const conversation = useAtomValue(store.conversationByIndex(0));` then reads `conversation?.conversationId`
- **Proposed:** `const conversationId = useAtomValue(store.conversationIdByIndex(0));`
- **selectAtom definition:** Already exists
- **Equality function:** N/A
- **Risk:** None
- **Re-render reduction:** Same as Change 1

### Change 5: useUnifiedSidebarLinks -- use `conversationEndpointByIndex`

- **Group:** 2
- **Atom:** `conversationByIndex` -> `conversationEndpointByIndex`
- **Consumer(s):** `useUnifiedSidebarLinks` in `src/hooks/Nav/useUnifiedSidebarLinks.ts`
- **Current:** `const conversation = useAtomValue(store.conversationByIndex(0));` then reads `conversation?.endpoint`
- **Proposed:** `const endpoint = useAtomValue(store.conversationEndpointByIndex(0));`
- **selectAtom definition:** Already exists at families.ts:176-180
- **Equality function:** N/A
- **Risk:** Verify no other fields from `conversation` are used in this hook. Grep confirms only `endpoint` is accessed.
- **Re-render reduction:** Sidebar stops re-rendering on non-endpoint conversation changes

### Change 6: Artifacts -- use `conversationIdByIndex` (already done) + verify

- **Group:** 2
- **Atom:** `conversationByIndex` -> already using `conversationIdByIndex`
- **Consumer(s):** `ArtifactsProvider` in `src/Providers/ArtifactsContext.tsx`
- **Current:** Already uses `const conversationId = useAtomValue(store.conversationIdByIndex(0));` (line 24). No change needed for `conversationByIndex`.
- **Proposed:** SKIP -- already optimized for this atom.
- **Note:** The `latestMessageFamily` subscription in this file IS a candidate (see Change 8).

---

## Group 1: Hot Path, Single Field selectAtom

These create new single-field derived atoms for the streaming-hot `latestMessageFamily`.

### Change 7: useTextarea -- new `latestMessageErrorFamily`

- **Group:** 1
- **Atom:** `latestMessageFamily`
- **Consumer(s):** `useTextarea` in `src/hooks/Input/useTextarea.ts`
- **Current:**
  ```ts
  const latestMessage = useAtomValue(store.latestMessageFamily(index));
  // ...
  const isNotAppendable = latestMessage?.error === true && !isAssistant;
  ```
- **Proposed:**
  ```ts
  const latestMessageError = useAtomValue(store.latestMessageErrorFamily(index));
  // ...
  const isNotAppendable = latestMessageError === true && !isAssistant;
  ```
- **selectAtom definition:** In `families.ts`:
  ```ts
  const latestMessageErrorFamily = atomFamily((param: string | number) =>
    atom<boolean | undefined>((get) => get(latestMessageFamily(param))?.error),
  );
  ```
- **Equality function:** Not needed (primitive boolean/undefined)
- **Risk:** Low. The `error` field is only set once when a message errors. No other fields from `latestMessage` are used in this hook.
- **Re-render reduction:** Input textarea stops re-rendering on every streaming token. This is the single highest-impact change because `useTextarea` is mounted in every chat view and the `latestMessageFamily` atom updates per token during generation.

### Change 8: ArtifactsContext -- new `latestMessageArtifactInfoFamily`

- **Group:** 1 (multi-field but critical hot path)
- **Atom:** `latestMessageFamily`
- **Consumer(s):** `ArtifactsProvider` in `src/Providers/ArtifactsContext.tsx`
- **Current:**
  ```ts
  const latestMessage = useAtomValue(store.latestMessageFamily(0));
  // Uses: latestMessage?.text, latestMessage?.content, latestMessage?.messageId
  ```
- **Proposed:**
  ```ts
  const latestArtifactInfo = useAtomValue(store.latestMessageArtifactInfoFamily(0));
  // latestArtifactInfo is { text, content, messageId } | null
  ```
- **selectAtom definition:** In `families.ts`:
  ```ts
  const latestMessageArtifactInfoFamily = atomFamily((param: string | number) =>
    atom((get) => {
      const msg = get(latestMessageFamily(param));
      if (!msg) { return null; }
      return { text: msg.text, content: msg.content, messageId: msg.messageId };
    }),
  );
  ```
- **Equality function:** This is a derived `atom`, not `selectAtom`, so Jotai uses referential equality by default. The atom will return a new object reference every time the base atom updates, which means it will still trigger re-renders on every token. **Two options:**

  **Option A (recommended):** Use `selectAtom` with custom equality:
  ```ts
  import { selectAtom } from 'jotai/utils';

  const latestMessageArtifactInfoFamily = atomFamily((param: string | number) =>
    selectAtom(
      latestMessageFamily(param),
      (msg) => msg ? { text: msg.text ?? null, content: msg.content ?? null, messageId: msg.messageId ?? null } : null,
      (a, b) => a?.text === b?.text && a?.messageId === b?.messageId && a?.content === b?.content,
    ),
  );
  ```
  **Note:** `text` changes every token during streaming, so this selector will still fire per token. The win is that changes to the other 29 fields (sender, model, endpoint, etc.) no longer trigger re-renders. The `content` field is an array and needs shallow comparison; if `content` is set once (not updated per token), the equality check on `text` and `messageId` alone may suffice. Investigate whether `content` updates per token or is set once.

  **Option B (simpler):** Keep three separate single-field selectors (`latestMessageTextFamily`, `latestMessageContentFamily`, `latestMessageIdFamily`) and subscribe to each individually in `ArtifactsProvider`. This avoids custom equality entirely.

- **Risk:** Medium. The `getLatestText` utility receives `{ text, content, messageId }` cast as `TMessage`. Need to verify it only accesses those three fields. If it accesses other fields at runtime, the selector would silently produce incorrect results.
- **Re-render reduction:** Artifact panel stops re-rendering when non-text/content/messageId fields change on the latest message.

### Change 9: useHandleKeyUp -- new `latestMessageParentIdFamily`

- **Group:** 1
- **Atom:** `latestMessageFamily`
- **Consumer(s):** `useHandleKeyUp` in `src/hooks/Input/useHandleKeyUp.ts`
- **Current:**
  ```ts
  const latestMessage = useAtomValue(store.latestMessageFamily(index));
  // Uses: latestMessage?.parentMessageId (for scroll-to-edit on ArrowUp)
  ```
- **Proposed:**
  ```ts
  const latestParentMessageId = useAtomValue(store.latestMessageParentIdFamily(index));
  ```
- **selectAtom definition:** In `families.ts`:
  ```ts
  const latestMessageParentIdFamily = atomFamily((param: string | number) =>
    atom<string | null | undefined>((get) => get(latestMessageFamily(param))?.parentMessageId),
  );
  ```
- **Equality function:** Not needed (primitive string)
- **Risk:** Low. Only `parentMessageId` is used. The null check on `latestMessage` maps to checking `latestParentMessageId` for truthiness.
- **Re-render reduction:** Key handler stops re-rendering per streaming token. `parentMessageId` only changes when the message tree structure changes (new message), not per token.

### Change 10: ShareButton -- new `latestMessageIdFamily`

- **Group:** 1
- **Atom:** `latestMessageFamily`
- **Consumer(s):** `ShareButton` in `src/components/Conversations/ConvoOptions/ShareButton.tsx`
- **Current:**
  ```ts
  const latestMessage = useAtomValue(store.latestMessageFamily(0));
  // Uses: latestMessage?.messageId (passed as targetMessageId prop)
  ```
- **Proposed:**
  ```ts
  const latestMessageId = useAtomValue(store.latestMessageIdFamily(0));
  ```
- **selectAtom definition:** In `families.ts`:
  ```ts
  const latestMessageIdFamily = atomFamily((param: string | number) =>
    atom<string | null | undefined>((get) => get(latestMessageFamily(param))?.messageId),
  );
  ```
- **Equality function:** Not needed (primitive string)
- **Risk:** None. Direct field replacement.
- **Re-render reduction:** ShareButton dialog stops re-rendering per streaming token. `messageId` is set once per message, not per token.

---

## Group 3: New Multi-Field selectAtom

### Change 11: BookmarkMenu -- new `conversationBookmarkInfoByIndex`

- **Group:** 3
- **Atom:** `conversationByIndex`
- **Consumer(s):** `BookmarkMenu` in `src/components/Chat/Menus/BookmarkMenu.tsx`
- **Current:**
  ```ts
  const conversation = useAtomValue(store.conversationByIndex(0)) || undefined;
  const conversationId = conversation?.conversationId ?? '';
  const tags = conversation?.tags;
  const isTemporary = conversation?.expiredAt != null;
  ```
- **Proposed:**
  ```ts
  const bookmarkInfo = useAtomValue(store.conversationBookmarkInfoByIndex(0));
  const conversationId = bookmarkInfo?.conversationId ?? '';
  const tags = bookmarkInfo?.tags;
  const isTemporary = bookmarkInfo?.expiredAt != null;
  ```
- **selectAtom definition:** In `families.ts`:
  ```ts
  import { selectAtom } from 'jotai/utils';

  const conversationBookmarkInfoByIndex = atomFamily((index: string | number) =>
    selectAtom(
      conversationByIndex(index),
      (conv) => conv
        ? { conversationId: conv.conversationId, tags: conv.tags, expiredAt: conv.expiredAt }
        : null,
      (a, b) =>
        a?.conversationId === b?.conversationId &&
        a?.expiredAt === b?.expiredAt &&
        a?.tags === b?.tags,
    ),
  );
  ```
- **Equality function:** Yes. `tags` is an array reference -- the equality check uses referential equality (`===`) which is sufficient because tags are replaced as a whole array, not mutated in place.
- **Risk:** Low. Three fields, all read-only access.
- **Re-render reduction:** Bookmark menu stops re-rendering on model/endpoint/settings changes. Only re-renders when tags, conversationId, or expiredAt change.

### Change 12: TemporaryChat -- new `conversationHasMessagesByIndex`

- **Group:** 3 (but simple enough to be near Group 1)
- **Atom:** `conversationByIndex`
- **Consumer(s):** `TemporaryChat` in `src/components/Chat/TemporaryChat.tsx`
- **Current:**
  ```ts
  const conversation = useAtomValue(store.conversationByIndex(0));
  // Uses: Array.isArray(conversation?.messages) && conversation.messages.length >= 1
  ```
- **Proposed:**
  ```ts
  const hasMessages = useAtomValue(store.conversationHasMessagesByIndex(0));
  ```
- **selectAtom definition:** In `families.ts`:
  ```ts
  const conversationHasMessagesByIndex = atomFamily((index: string | number) =>
    atom<boolean>((get) => {
      const conv = get(conversationByIndex(index));
      return Array.isArray(conv?.messages) && conv.messages.length >= 1;
    }),
  );
  ```
- **Equality function:** Not needed (primitive boolean)
- **Risk:** None. Derives a boolean from array length.
- **Re-render reduction:** Temporary chat badge stops re-rendering on any conversation change that does not add/remove messages.

---

## Group 4: Complex Cases (Deferred or Requires Further Analysis)

### Change 13 (DEFERRED): useChatHelpers -- latestMessageFamily

- **Group:** 4
- **Atom:** `latestMessageFamily`
- **Consumer(s):** `useChatHelpers` in `src/hooks/Chat/useChatHelpers.ts`
- **Current:** Uses `useAtom` (read+write) on `latestMessageFamily`. Reads `messageId`, `depth`, `parentMessageId`. Also passes the full `latestMessage` object to `useChatFunctions` and stores it in a ref.
- **Why deferred:** The hook needs both read AND write access to the full atom (it calls `setLatestMessage`). It also passes the whole object to `useChatFunctions`. A selectAtom would only help the read side, but the write subscription would still cause re-renders. Splitting this would require refactoring `useChatFunctions` to accept partial data, which is a larger change.
- **Recommendation:** Revisit after Group 1-3 changes are landed and profiled.

### Change 14 (DEFERRED): StreamAudio -- latestMessageFamily

- **Group:** 4
- **Atom:** `latestMessageFamily`
- **Consumer(s):** `StreamAudio` in `src/components/Chat/Input/StreamAudio.tsx`
- **Current:** Reads `conversationId`, `text`, `content`, `isCreatedByUser`, `messageId` from latestMessage. Also passes the full object to `getLatestText()`.
- **Why deferred:** The component reads 5+ fields including `text` which changes every token. Since `text` changes per token, a selectAtom would not reduce re-render frequency during streaming. The only benefit would be preventing re-renders from non-text field changes (e.g., `error`, `depth`), which is marginal.
- **Recommendation:** Low ROI. Skip unless profiling shows this component is a bottleneck.

### Change 15 (DEFERRED): useResumeOnLoad -- conversationByIndex

- **Group:** 4
- **Atom:** `conversationByIndex`
- **Consumer(s):** `useResumeOnLoad` in `src/hooks/SSE/useResumeOnLoad.ts`
- **Current:** Reads `endpoint` and `endpointType` from conversation.
- **Why deferred:** This hook runs on mount/reconnect only, not in a hot path. Low update frequency means the waste ratio is high but absolute impact is low. Could use `conversationEndpointByIndex` for the `endpoint` field, but `endpointType` would need a new selector or a compound one.
- **Recommendation:** Create `conversationEndpointTypeByIndex` if more consumers need it. Otherwise skip.

### Change 16 (LOW PRIORITY): user atom selectors

- **Group:** 3
- **Atom:** `user`
- **Consumer(s):** `MarkdownAnchor`, `Sources`, `FilePreviewDialog` (all read `user.id`), `useGetStartupConfig` (truthiness only)
- **Current:** `const user = useAtomValue(store.user);` then accesses `user?.id`
- **Why low priority:** The `user` atom updates very rarely (login only). Even though `MarkdownAnchor` is in a hot path (many instances per message), the atom almost never changes, so re-renders from this subscription are near zero in practice.
- **Recommendation:** Define `userIdAtom` in `user.ts` for correctness, but prioritize after Group 1-3.
- **Definition if implemented:**
  ```ts
  // In user.ts
  const userIdAtom = atom<string | undefined>((get) => get(user)?.id);
  userIdAtom.debugLabel = 'userIdAtom';
  ```

### Change 17 (LOW PRIORITY): ephemeralAgentByConvoId -- mcp field

- **Group:** 3
- **Atom:** `ephemeralAgentByConvoId`
- **Consumer(s):** `useMCPSelect` in `src/hooks/MCP/useMCPSelect.ts`
- **Current:** `const [ephemeralAgent, setEphemeralAgent] = useAtom(ephemeralAgentByConvoId(key));` then reads `ephemeralAgent?.mcp` and also writes the full atom.
- **Why low priority:** Uses `useAtom` (read+write). A selectAtom only optimizes reads. The write subscription ties this to the full atom regardless. Also, the ephemeral agent has only 5 fields -- the waste is real but small in absolute terms.
- **Recommendation:** Skip. The write dependency makes selectAtom ineffective here.

---

## Implementation Order

| Phase | Changes | Files Modified | New Atoms | Risk |
|-------|---------|----------------|-----------|------|
| **Phase 1** | 1, 2, 3, 4, 5 | 5 consumer files | 0 | None |
| **Phase 2** | 7, 9, 10 | 3 consumer files + families.ts | 3 (`latestMessageErrorFamily`, `latestMessageParentIdFamily`, `latestMessageIdFamily`) | Low |
| **Phase 3** | 11, 12 | 2 consumer files + families.ts | 2 (`conversationBookmarkInfoByIndex`, `conversationHasMessagesByIndex`) | Low |
| **Phase 4** | 8 | 1 consumer file + families.ts | 1-3 (depending on Option A vs B) | Medium |
| **Deferred** | 13, 14, 15, 16, 17 | -- | -- | -- |

---

## Verification Strategy

After each phase:

1. **Build check:** `npm run build` from project root to verify TypeScript compilation
2. **Grep audit:** Search for any remaining `useAtomValue(store.conversationByIndex` or `useAtomValue(store.latestMessageFamily` calls that were supposed to be replaced
3. **Runtime smoke test:** Open the app, switch conversations, send a message, verify no regressions in sidebar, chat header, bookmarks, artifacts, or input area
4. **React DevTools profiler (optional):** Record a streaming response before and after Phase 2 to measure re-render reduction in `useTextarea` and `useHandleKeyUp`

---

## Notes

- All new atoms follow the existing `atomFamily(() => atom((get) => ...))` pattern for consistency, except `conversationBookmarkInfoByIndex` which requires `selectAtom` with custom equality because it returns an object.
- The `latestMessageFamily` has a custom read/write wrapper. New derived atoms read from the public `latestMessageFamily` (not `_latestMessageFamily`), which is correct since the public atom's read function delegates to the private one.
- `conversationByIndex` also has a custom read/write wrapper with the same delegation pattern. Existing selectors like `conversationIdByIndex` already read from the public wrapper, confirming this approach works.
- The `selectAtom` import from `jotai/utils` is only needed for Change 11 (BookmarkMenu). All other new atoms use plain derived `atom` since they return primitives.
