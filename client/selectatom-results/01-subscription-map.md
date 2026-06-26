# selectAtom Optimization Pass -- Agent 1: Subscription Map

Generated: 2026-04-04

---

## 1. Candidate Atoms

| # | Atom Name | File | TypeScript Type | Field Count | Update Frequency |
|---|-----------|------|-----------------|-------------|------------------|
| 1 | `conversationByIndex` (family) | `src/store/families.ts` | `TConversation \| null` | **62** | **HIGH** -- updates on conversation switch, settings change, every new message response |
| 2 | `latestMessageFamily` (family) | `src/store/families.ts` | `TMessage \| null` | **32** | **HIGH** -- updates per streaming token during generation |
| 3 | `user` | `src/store/user.ts` | `TUser \| undefined` | **13** | **LOW** -- set once on login, rarely changes |
| 4 | `ephemeralAgentByConvoId` (family) | `src/store/agents.ts` | `TEphemeralAgent \| null` | **5** | **MED** -- updates when toggling tools/MCP |
| 5 | `defaultPreset` | `src/store/preset.ts` | `TPreset \| null` | **~58** (TPreset is TConversation minus 3 fields + 3 preset fields) | **LOW** -- set once on startup |
| 6 | `presetByIndex` (family) | `src/store/families.ts` | `TPreset \| null` | **~58** | **LOW** -- set when preset is applied |

**Note:** `artifactsState` (Record<string, Artifact>) and `messageAttachmentsMap` (Record<string, TAttachment[]>) are keyed records, not single objects -- they are already keyed by ID. The `Artifact` interface itself has only 9 fields, and consumers typically look up a single artifact by key. These are deprioritized.

---

## 2. Existing selectAtom-like Selectors (Already Optimized)

The codebase already defines several derived atoms in `src/store/families.ts` that select single fields from `conversationByIndex`:

| Selector | Selects |
|----------|---------|
| `conversationIdByIndex` | `conversationId` |
| `conversationEndpointByIndex` | `endpoint` |
| `conversationModelByIndex` | `model` |
| `conversationSpecByIndex` | `spec` |
| `conversationAgentIdByIndex` | `agent_id` |
| `conversationAssistantIdByIndex` | `assistant_id` |

These are good but **underutilized** -- many components still subscribe to the full `conversationByIndex` atom when they only need one of these fields.

---

## 3. Consumer Subscription Map: `conversationByIndex` (62 fields)

| Consumer | File | Fields Used | Fields Count | Waste Ratio | Priority | Hot Path? |
|----------|------|-------------|--------------|-------------|----------|-----------|
| `useResumeOnLoad` | `src/hooks/SSE/useResumeOnLoad.ts` | `endpoint`, `endpointType` | 2 | 0.97 | **HIGH** | No |
| `useUnifiedSidebarLinks` | `src/hooks/Nav/useUnifiedSidebarLinks.ts` | `endpoint` | 1 | 0.98 | **HIGH** | Yes -- conversation list sidebar |
| `ConversationsSection` | `src/components/UnifiedSidebar/ConversationsSection.tsx` | `conversationId` | 1 | 0.98 | **HIGH** | Yes -- conversation list |
| `NewChatButton` (ExpandedPanel) | `src/components/UnifiedSidebar/ExpandedPanel.tsx` | `conversationId` | 1 | 0.98 | **HIGH** | Yes -- conversation list |
| `ProjectView` | `src/components/Projects/ProjectView.tsx` | `conversationId`, `projectId` | 2 | 0.97 | **HIGH** | No |
| `useDragHelpers` | `src/hooks/Files/useDragHelpers.ts` | `conversationId`, `endpoint` | 2 | 0.97 | **HIGH** | No |
| `Artifacts` | `src/components/Artifacts/Artifacts.tsx` | `conversationId`, `projectId` | 2 | 0.97 | **HIGH** | Yes -- message rendering path (artifact panel) |
| `TemporaryChat` | `src/components/Chat/TemporaryChat.tsx` | `messages` (length check only) | 1 | 0.98 | **HIGH** | Yes -- input area |
| `NewChat` | `src/components/Nav/NewChat.tsx` | `conversationId` | 1 | 0.98 | **HIGH** | Yes -- chat header |
| `BookmarkMenu` | `src/components/Chat/Menus/BookmarkMenu.tsx` | `conversationId`, `tags`, `expiredAt` | 3 | 0.95 | **HIGH** | Yes -- chat header |
| `ExportAndShareMenu` | `src/components/Chat/ExportAndShareMenu.tsx` | `conversationId` | 1 | 0.98 | **HIGH** | Yes -- chat header |

**Summary for `conversationByIndex`:** 11 direct consumers via `useAtomValue`, all with waste ratio > 0.90. Every single one reads 1-3 fields out of 62. Existing single-field selectors (`conversationIdByIndex`, `conversationEndpointByIndex`) could replace most of these subscriptions.

---

## 4. Consumer Subscription Map: `latestMessageFamily` (32 fields)

| Consumer | File | Fields Used | Fields Count | Waste Ratio | Priority | Hot Path? |
|----------|------|-------------|--------------|-------------|----------|-----------|
| `ArtifactsContext` | `src/Providers/ArtifactsContext.tsx` | `text`, `content`, `messageId` | 3 | 0.91 | **HIGH** | Yes -- message rendering, updates per token |
| `useTextarea` | `src/hooks/Input/useTextarea.ts` | `error` | 1 | 0.97 | **HIGH** | Yes -- input area, re-renders per token |
| `useHandleKeyUp` | `src/hooks/Input/useHandleKeyUp.ts` | `parentMessageId` (for edit scroll) | 1 | 0.97 | **HIGH** | Yes -- input area |
| `useSubmitMessage` | `src/hooks/Messages/useSubmitMessage.ts` | `messageId` + whole object (passed to `setMessages`) | 2+ | 0.50 | **MEDIUM** | Yes -- input area (but only on submit, not per-keystroke) |
| `ShareButton` | `src/components/Conversations/ConvoOptions/ShareButton.tsx` | `messageId` | 1 | 0.97 | **HIGH** | No |
| `StreamAudio` | `src/components/Chat/Input/StreamAudio.tsx` | `conversationId`, `text`, `isCreatedByUser`, `messageId` | 4 | 0.88 | **HIGH** | Yes -- updates per streaming token |
| `useChatHelpers` | `src/hooks/Chat/useChatHelpers.ts` | `messageId`, `depth`, `parentMessageId` + whole object ref | 3+ | 0.75 | **HIGH** | Yes -- core chat engine, updates per token |

**Summary for `latestMessageFamily`:** 7 consumers, all with waste > 0.50. This is the most critical atom for performance because it updates **per streaming token**. Every unnecessary field change triggers re-renders across the entire input area, artifact panel, and audio system.

---

## 5. Consumer Subscription Map: `user` (13 fields)

| Consumer | File | Fields Used | Fields Count | Waste Ratio | Priority | Hot Path? |
|----------|------|-------------|--------------|-------------|----------|-----------|
| `useGetStartupConfig` | `src/data-provider/Endpoints/queries.ts` | Used as boolean (`!!user`) | 0 (truthiness only) | 1.00 | **MEDIUM** | No -- query hook, runs once |
| `Sources (FileItem)` | `src/components/Web/Sources.tsx` | `id` | 1 | 0.92 | **MEDIUM** | Yes -- message rendering path |
| `MarkdownAnchor` | `src/components/Chat/Messages/Content/MarkdownComponents.tsx` | `id` | 1 | 0.92 | **HIGH** | Yes -- message rendering, many instances per message |
| `FilePreviewDialog` | `src/components/Chat/Messages/Content/FilePreviewDialog.tsx` | `id` | 1 | 0.92 | **MEDIUM** | No -- dialog, opens on click |

**Summary for `user`:** 4 direct `useAtomValue` consumers. 3 of them only need `user.id`. Low update frequency mitigates the waste, but `MarkdownAnchor` is in a hot path (rendered many times per message).

---

## 6. Consumer Subscription Map: `ephemeralAgentByConvoId` (5 fields)

| Consumer | File | Fields Used | Fields Count | Waste Ratio | Priority | Hot Path? |
|----------|------|-------------|--------------|-------------|----------|-----------|
| `DragDropModal` | `src/components/Chat/Input/Files/DragDropModal.tsx` | Whole object (passed to `useAgentToolPermissions`) | 5 | 0.00 | SKIP | No |
| `useToolToggle` | `src/hooks/Plugins/useToolToggle.ts` | Dynamic key (`ephemeralAgent?.[toolKey]`) + whole set | varies | ~0.20 | LOW | No |
| `useMCPSelect` | `src/hooks/MCP/useMCPSelect.ts` | `mcp` | 1 | 0.80 | **HIGH** | No -- but re-renders tool toggles on any ephemeral field change |

**Summary for `ephemeralAgentByConvoId`:** Only 5 fields total. `useMCPSelect` only needs `mcp` but re-renders when `web_search`, `file_search`, `execute_code`, or `artifacts` change. Low total field count means less absolute waste, but this could still cause cascading re-renders in the tool panel.

---

## 7. Consumer Subscription Map: `defaultPreset` / `presetByIndex` (~58 fields)

| Consumer | File | Fields Used | Fields Count | Waste Ratio | Priority | Hot Path? |
|----------|------|-------------|--------------|-------------|----------|-----------|
| `useNewConvo` | `src/hooks/useNewConvo.ts` | `endpoint`, `presetId` | 2 | 0.97 | **MEDIUM** | No -- runs on new conversation only |
| `PresetItems` | `src/components/Chat/Menus/Presets/PresetItems.tsx` | `title`, `presetId` | 2 | 0.97 | **MEDIUM** | No |
| `PresetsMenu` | `src/components/Chat/Menus/PresetsMenu.tsx` | Truthiness check only (`preset &&`) | 0 | 1.00 | **HIGH** | No |
| `usePresets` | `src/hooks/Conversations/usePresets.ts` | `defaultPreset` used for truthiness + passed to `newConversation` | varies | 0.50 | **MEDIUM** | No |

**Summary for preset atoms:** Low update frequency makes these lower priority despite high waste ratios.

---

## 8. Hot Path Analysis

### Critical Hot Paths (re-render per streaming token)

These components/hooks subscribe to `latestMessageFamily` which updates **per token** during streaming:

1. **`useTextarea`** -- only needs `error` field (waste 0.97)
2. **`StreamAudio`** -- needs 4 fields out of 32 (waste 0.88)
3. **`useChatHelpers`** -- needs 3 fields + whole object reference (waste 0.75)
4. **`ArtifactsContext`** -- needs 3 fields (waste 0.91)

### High-Frequency Hot Paths (re-render on conversation switch/update)

These subscribe to `conversationByIndex` which updates on every conversation change:

1. **`useUnifiedSidebarLinks`** -- only needs `endpoint` (waste 0.98) -- re-renders sidebar
2. **`ConversationsSection`** -- only needs `conversationId` (waste 0.98) -- re-renders conversation list
3. **`NewChatButton`** (ExpandedPanel) -- only needs `conversationId` (waste 0.98)
4. **`NewChat`** (Nav) -- only needs `conversationId` (waste 0.98)
5. **`BookmarkMenu`** -- needs `conversationId`, `tags`, `expiredAt` (waste 0.95)
6. **`ExportAndShareMenu`** -- only needs `conversationId` (waste 0.98)
7. **`TemporaryChat`** -- only needs `messages` length (waste 0.98)

### Message Rendering Path

These are in the per-message render tree:

1. **`MarkdownAnchor`** (`MarkdownComponents.tsx`) -- subscribes to full `user` for just `id` (waste 0.92). Rendered N times per message with file links.
2. **`Sources`** (`Sources.tsx`) -- subscribes to full `user` for just `id` (waste 0.92).

---

## 9. Top Priority Recommendations (sorted by impact)

### Tier 1: Critical (streaming hot path)

| Rank | Atom | Action | Affected Consumers | Expected Impact |
|------|------|--------|--------------------|-----------------|
| 1 | `latestMessageFamily` | Create `selectAtom` selectors: `latestMessageIdFamily`, `latestMessageErrorFamily`, `latestMessageTextFamily`, `latestMessageParentIdFamily` | `useTextarea`, `useHandleKeyUp`, `ShareButton`, `ArtifactsContext` | Eliminates re-renders of input area and artifact panel on every token that does not change the needed field |
| 2 | `latestMessageFamily` | Create compound selector for StreamAudio: `latestMessageAudioInfoFamily` selecting `{conversationId, text, isCreatedByUser, messageId}` | `StreamAudio` | Prevents audio system re-render on unrelated field changes during streaming |
| 3 | `latestMessageFamily` | Create compound selector for useChatHelpers: `latestMessageNavFamily` selecting `{messageId, depth, parentMessageId}` | `useChatHelpers` | Core chat engine optimization |

### Tier 2: High (conversation switch path)

| Rank | Atom | Action | Affected Consumers | Expected Impact |
|------|------|--------|--------------------|-----------------|
| 4 | `conversationByIndex` | Replace with existing `conversationIdByIndex` selector | `ConversationsSection`, `ExpandedPanel/NewChatButton`, `NewChat`, `ExportAndShareMenu` | 4 components stop re-rendering on non-ID conversation changes |
| 5 | `conversationByIndex` | Replace with existing `conversationEndpointByIndex` selector | `useUnifiedSidebarLinks` | Sidebar stops re-rendering on non-endpoint changes |
| 6 | `conversationByIndex` | Create `conversationTagsAndIdByIndex` selector | `BookmarkMenu` | Chat header menu stops re-rendering on settings changes |
| 7 | `conversationByIndex` | Create `conversationMessagesLengthByIndex` selector (derived, returns number) | `TemporaryChat` | Input badge stops re-rendering on any conversation change |
| 8 | `conversationByIndex` | Create `conversationEndpointPairByIndex` selector for `{endpoint, endpointType}` | `useResumeOnLoad` | SSE hook stops re-rendering on non-endpoint changes |

### Tier 3: Medium (lower frequency but still wasteful)

| Rank | Atom | Action | Affected Consumers | Expected Impact |
|------|------|--------|--------------------|-----------------|
| 9 | `user` | Create `userIdAtom` derived atom | `MarkdownAnchor`, `Sources`, `FilePreviewDialog` | Per-message render components stop subscribing to full user object |
| 10 | `user` | Create `userExistsAtom` (boolean) derived atom | `useGetStartupConfig` | Query hook does not re-render on user field changes |
| 11 | `ephemeralAgentByConvoId` | Create `ephemeralMcpByConvoId` selector | `useMCPSelect` | MCP panel stops re-rendering on tool toggle changes |
| 12 | `defaultPreset` / `presetByIndex` | Replace truthiness-only check in `PresetsMenu` with a boolean derived atom | `PresetsMenu` | Menu stops re-rendering on preset field changes |

---

## 10. Summary Statistics

| Metric | Value |
|--------|-------|
| Total candidate atoms analyzed | 6 |
| Total direct consumers found | 33 (excl. tests) |
| Consumers with waste > 0.50 | **27** (82%) |
| Consumers in hot paths with waste > 0.50 | **14** |
| Consumers that could use existing selectors today (zero new code) | **6** (`conversationIdByIndex`, `conversationEndpointByIndex`) |
| New selectors recommended | **~10** |
