# Recoil-to-Jotai Migration Census

**Date:** 2026-04-04
**Scope:** `/projects/LibreEco/LibreChat/client/src/`

---

## 1. Summary Statistics

| Metric | Count |
|--------|-------|
| Files importing `from 'recoil'` | 219 |
| Files importing `from 'jotai'` or `from 'jotai/utils'` | 18 |
| Unique Recoil atoms/selectors defined | 103 (via store barrel references) |
| Total Recoil hook call sites (excluding test mocks) | ~680 |
| `useRecoilValue` calls | 322 |
| `useRecoilState` calls | 170 |
| `useSetRecoilState` calls | 139 |
| `useRecoilCallback` calls | 26 |
| `useResetRecoilState` calls | 23 |
| `useRecoilTransaction_UNSTABLE` calls | 0 |
| `useRecoilStateLoadable` calls | 0 |
| `useRecoilValueLoadable` calls | 0 |
| Jotai `useAtom` calls | 13 |
| Jotai `useAtomValue` calls | 21 |
| Jotai `useSetAtom` calls | 0 |

---

## 2. Infrastructure

### 2.1 RecoilRoot

**Location:** `src/App.jsx` (line 49)

```jsx
<QueryClientProvider client={queryClient}>
  <RecoilRoot>
    <LiveAnnouncer>
      ...
    </LiveAnnouncer>
  </RecoilRoot>
</QueryClientProvider>
```

- No `initializeState` callback.
- No Recoil DevTools.
- No Recoil persistence plugins.
- No `useRecoilSnapshot` usage.

### 2.2 Jotai Provider

**No Jotai Provider is mounted.** Jotai atoms currently use the default implicit store (provider-less mode). The MCP test file (`src/hooks/MCP/__tests__/useMCPSelect.test.tsx`) uses `Provider` and `createStore` from jotai for testing.

### 2.3 Test Infrastructure

**`test/layout-test-utils.tsx`** wraps all rendered components in `<RecoilRoot>`.

**Test files using `<RecoilRoot>` directly (24 files):**
- `src/components/Agents/tests/AgentDetail.spec.tsx`
- `src/components/Conversations/__tests__/Conversations.test.tsx`
- `src/components/MCPUIResource/__tests__/MCPUIResource.test.tsx`
- `src/components/MCPUIResource/__tests__/MCPUIResourceCarousel.test.tsx`
- `src/components/Nav/Favorites/tests/FavoritesList.spec.tsx`
- `src/components/Nav/SettingsTabs/General/LangSelector.spec.tsx`
- `src/components/Nav/SettingsTabs/General/ThemeSelector.spec.tsx`
- `src/components/Nav/SettingsTabs/Speech/ConversationModeSwitch.spec.tsx`
- `src/components/Nav/SettingsTabs/Speech/STT/__tests__/AutoTranscribeAudioSwitch.spec.tsx`
- `src/components/Nav/SettingsTabs/Speech/STT/__tests__/SpeechToTextSwitch.spec.tsx`
- `src/components/Nav/SettingsTabs/Speech/TTS/__tests__/AutomaticPlaybackSwitch.spec.tsx`
- `src/components/Nav/SettingsTabs/Speech/TTS/__tests__/CacheTTSSwitch.spec.tsx`
- `src/components/Nav/SettingsTabs/Speech/TTS/__tests__/CloudBrowserVoicesSwitch.spec.tsx`
- `src/components/Nav/SettingsTabs/Speech/TTS/__tests__/TextToSpeechSwitch.spec.tsx`
- `src/components/Chat/Input/Files/__tests__/AttachFileChat.spec.tsx`
- `src/components/Chat/Input/Files/__tests__/AttachFileMenu.spec.tsx`
- `src/components/Chat/Messages/Content/__tests__/AgentHandoff.test.tsx`
- `src/components/Chat/Messages/Content/__tests__/ImageGen.test.tsx`
- `src/components/Chat/Messages/Content/__tests__/Markdown.mcpui.test.tsx`
- `src/components/Chat/Messages/Content/__tests__/RetrievalCall.test.tsx`
- `src/components/Chat/Messages/Content/__tests__/ToolCall.test.tsx`
- `src/hooks/Config/__tests__/useAppStartup.spec.tsx`
- `src/hooks/__tests__/AuthContext.spec.tsx`
- `src/hooks/MCP/__tests__/useMCPSelect.test.tsx`
- `src/hooks/Plugins/__tests__/useToolToggle.test.tsx`

**Test files using `jest.mock('recoil', ...)` (8 files):**
- `src/hooks/SSE/__tests__/useEventHandlers.spec.ts`
- `src/hooks/SSE/__tests__/useResumableSSE.spec.ts`
- `src/hooks/Artifacts/__tests__/useArtifacts.test.ts`
- `src/hooks/Input/useQueryParams.spec.ts`
- `src/hooks/Files/__tests__/useFileHandling.test.ts`
- `src/components/Artifacts/__tests__/ArtifactUpdate.spec.tsx`
- `src/components/Artifacts/__tests__/ArtifactButton.spec.tsx`
- `src/components/Agents/tests/Accessibility.spec.tsx`

### 2.4 Recoil Type Exports

`src/common/types.ts` imports and re-exports Recoil types:
- `import type { SetterOrUpdater, RecoilState } from 'recoil'` (line 5)
- `RecoilState<boolean>` used in `BadgeItem` type (line 64)
- `SetterOrUpdater<Map<string, ExtendedFile>>` used in type union (line 152)

Other files importing Recoil types:
- `src/Providers/AddedChatContext.tsx` -- `SetterOrUpdater`
- `src/hooks/Conversations/useDebouncedInput.ts` -- `SetterOrUpdater`
- `src/hooks/Input/useHandleKeyUp.ts` -- `SetterOrUpdater`
- `src/hooks/Input/useAutoSave.ts` -- `SetterOrUpdater`
- `src/components/Nav/SettingsTabs/ToggleSwitch.tsx` -- `RecoilState`

### 2.5 Custom Recoil Utilities

**`src/store/utils.ts`** -- `atomWithLocalStorage<T>(key, defaultValue)`:
- Creates Recoil `atom` with `effects_UNSTABLE` for localStorage sync
- Uses `setSelf` to hydrate from localStorage on mount
- Uses `onSet` to persist to localStorage on write
- **Used extensively** by: `settings.ts`, `prompts.ts`, `misc.ts`, `language.ts`, `temporary.ts`

### 2.6 Dual Recoil/Jotai Bridge Component

**`src/components/Nav/SettingsTabs/ToggleSwitch.tsx`:**
- Accepts either `RecoilState<boolean>` or `WritableAtom<boolean, [boolean], void>`
- Runtime detection via `isRecoilState()` check (`'key' in atom`)
- Renders `RecoilToggle` or `JotaiToggle` accordingly
- This is the active bridge pattern for incremental migration

---

## 3. Complete Atom/Selector Catalog

### 3.1 `src/store/families.ts` -- Atom Families & Selectors

| Name | Type | Key String | Default | Effects | Dependencies |
|------|------|-----------|---------|---------|--------------|
| `latestMessageKeysAtom` | atom | `latestMessageKeys` | `[]` | -- | -- |
| `submissionKeysAtom` | atom | `submissionKeys` | `[]` | -- | -- |
| `latestMessageFamily` | atomFamily | `latestMessageByIndex` | `null` | `onSet` (logging) | -- |
| `submissionByIndex` | atomFamily | `submissionByIndex` | `null` | -- | -- |
| `latestMessageKeysSelector` | selector | `latestMessageKeysSelector` | -- | -- | `conversationKeysAtom`, `latestMessageFamily` |
| `submissionKeysSelector` | selector | `submissionKeysSelector` | -- | -- | `conversationKeysAtom`, `submissionByIndex` |
| `conversationByIndex` | atomFamily | `conversationByIndex` | `null` | `onSet` (localStorage sync, URL params) | -- |
| `filesByIndex` | atomFamily | `filesByIndex` | `new Map()` | -- | -- |
| `conversationKeysAtom` | atom | `conversationKeys` | `[]` | -- | -- |
| `allConversationsSelector` | selector | `allConversationsSelector` | -- | -- | `conversationKeysAtom`, `conversationByIndex` |
| `conversationIdByIndex` | selectorFamily | `conversationIdByIndex` | -- | -- | `conversationByIndex` |
| `conversationEndpointByIndex` | selectorFamily | `conversationEndpointByIndex` | -- | -- | `conversationByIndex` |
| `conversationModelByIndex` | selectorFamily | `conversationModelByIndex` | -- | -- | `conversationByIndex` |
| `conversationSpecByIndex` | selectorFamily | `conversationSpecByIndex` | -- | -- | `conversationByIndex` |
| `conversationAgentIdByIndex` | selectorFamily | `conversationAgentIdByIndex` | -- | -- | `conversationByIndex` |
| `conversationAssistantIdByIndex` | selectorFamily | `conversationAssistantIdByIndex` | -- | -- | `conversationByIndex` |
| `presetByIndex` | atomFamily | `presetByIndex` | `null` | -- | -- |
| `textByIndex` | atomFamily | `textByIndex` | `''` | -- | -- |
| `showStopButtonByIndex` | atomFamily | `showStopButtonByIndex` | `false` | -- | -- |
| `abortScrollFamily` | atomFamily | `abortScrollByIndex` | `false` | `onSet` (logging) | -- |
| `isSubmittingFamily` | atomFamily | `isSubmittingByIndex` | `false` | `onSet` (logging) | -- |
| `anySubmittingSelector` | selector | `anySubmittingSelector` | -- | -- | `conversationKeysAtom`, `isSubmittingFamily` |
| `optionSettingsFamily` | atomFamily | `optionSettingsByIndex` | `{}` | -- | -- |
| `showPopoverFamily` | atomFamily | `showPopoverByIndex` | `false` | -- | -- |
| `activePromptByIndex` | atomFamily | `activePromptByIndex` | `undefined` | -- | -- |
| `showMentionPopoverFamily` | atomFamily | `showMentionPopoverByIndex` | `false` | -- | -- |
| `showPlusPopoverFamily` | atomFamily | `showPlusPopoverByIndex` | `false` | -- | -- |
| `showPromptsPopoverFamily` | atomFamily | `showPromptsPopoverByIndex` | `false` | -- | -- |
| `globalAudioURLFamily` | atomFamily | `globalAudioURLByIndex` | `null` | -- | -- |
| `globalAudioFetchingFamily` | atomFamily | `globalAudioisFetchingByIndex` | `false` | -- | -- |
| `globalAudioPlayingFamily` | atomFamily | `globalAudioisPlayingByIndex` | `false` | -- | -- |
| `activeRunFamily` | atomFamily | `activeRunByIndex` | `null` | -- | -- |
| `audioRunFamily` | atomFamily | `audioRunByIndex` | `null` | -- | -- |
| `messagesSiblingIdxFamily` | atomFamily | `messagesSiblingIdx` | `0` | -- | -- |
| `updateConversationSelector` | selectorFamily | `updateConversationSelector` | -- | -- | `conversationKeysAtom`, `conversationByIndex` |
| `conversationByKeySelector` | alias | -- | -- | -- | (alias for `conversationByIndex`) |

**Custom hooks exported from families.ts:**
- `useCreateConversationAtom(key)` -- uses `useSetRecoilState`, `useRecoilValue`
- `useSetConversationAtom(key)` -- wraps `useCreateConversationAtom`
- `useClearConvoState()` -- uses `useRecoilCallback` with snapshot
- `useClearSubmissionState()` -- uses `useRecoilCallback` with snapshot
- `useClearLatestMessages(context?)` -- uses `useRecoilCallback` with snapshot

### 3.2 `src/store/agents.ts`

| Name | Type | Key String | Default | Effects | Dependencies |
|------|------|-----------|---------|---------|--------------|
| `ephemeralAgentByConvoId` | atomFamily | `ephemeralAgentByConvoId` | `null` | `onSet` (logging) | -- |

**Custom hooks:**
- `useUpdateEphemeralAgent()` -- `useRecoilCallback` with `set`
- `useApplyNewAgentTemplate()` -- `useRecoilCallback` with `snapshot.getPromise` and `set`
- `useGetEphemeralAgent()` -- `useRecoilCallback` with `snapshot.getLoadable`

### 3.3 `src/store/artifacts.ts`

| Name | Type | Key String | Default | Effects |
|------|------|-----------|---------|---------|
| `artifactsPanelMode` | atom | `artifactsPanelMode` | `'side'` | `onSet` (logging) |
| `artifactsState` | atom | `artifactsState` | `null` | `onSet` (logging) |
| `currentArtifactId` | atom | `currentArtifactId` | `null` | `onSet` (logging) |
| `artifactsVisibility` | atom | `artifactsVisibility` | `true` | `onSet` (logging) |
| `visibleArtifacts` | atom | `visibleArtifacts` | `null` | `onSet` (logging) |

### 3.4 `src/store/endpoints.ts`

| Name | Type | Key String | Default | Effects | Dependencies |
|------|------|-----------|---------|---------|--------------|
| `endpointsConfig` | atom | `endpointsConfig` | `defaultConfig` | -- | -- |
| `endpointsQueryEnabled` | atom | `endpointsQueryEnabled` | `true` | -- | -- |
| `endpointsFilter` | selector | `endpointsFilter` | -- | -- | `endpointsConfig` |

### 3.5 `src/store/misc.ts`

| Name | Type | Key String | Default | Effects | Dependencies |
|------|------|-----------|---------|---------|--------------|
| `hideBannerHint` | atom (localStorage) | `hideBannerHint` | `[]` | localStorage sync | -- |
| `messageAttachmentsMap` | atom | `messageAttachmentsMap` | `{}` | -- | -- |
| `conversationAttachmentsSelector` | selectorFamily | `conversationAttachments` | -- | -- | `messageAttachmentsMap` |
| `queriesEnabled` | atom | `queriesEnabled` | `true` | -- | -- |
| `isEditingBadges` | atom | `isEditingBadges` | `false` | -- | -- |
| `chatBadges` | atom (localStorage) | `chatBadges` | `[{id:'1'}]` | localStorage sync | -- |

### 3.6 `src/store/settings.ts`

**Static atoms (4):**

| Name | Key String | Default |
|------|-----------|---------|
| `abortScroll` | `abortScroll` | `false` |
| `optionSettings` | `optionSettings` | `{}` |
| `currentSettingsView` | `currentSettingsView` | `SettingsViews.default` |
| `showPopover` | `showPopover` | `false` |

**localStorage atoms (38):**

| Name | Key String | Default |
|------|-----------|---------|
| `autoScroll` | `autoScroll` | `false` |
| `sidebarExpanded` | `unifiedSidebarExpanded` | responsive |
| `enableUserMsgMarkdown` | `enableUserMsgMarkdown` | `true` |
| `keepScreenAwake` | `keepScreenAwake` | `true` |
| `enterToSend` | `enterToSend` | `true` |
| `maximizeChatSpace` | `maximizeChatSpace` | `false` |
| `chatDirection` | `chatDirection` | `'LTR'` |
| `autoExpandTools` | `autoExpandTools` | `false` |
| `saveDrafts` | `saveDrafts` | `true` |
| `showScrollButton` | `showScrollButton` | `true` |
| `forkSetting` | `forkSetting` | `''` |
| `splitAtTarget` | `splitAtTarget` | `false` |
| `rememberDefaultFork` | `rememberDefaultFork` | `false` |
| `showThinking` | `showThinking` | `false` |
| `saveBadgesState` | `saveBadgesState` | `false` |
| `modularChat` | `modularChat` | `true` |
| `LaTeXParsing` | `LaTeXParsing` | `true` |
| `centerFormOnLanding` | `centerFormOnLanding` | `true` |
| `showFooter` | `showFooter` | `true` |
| `atCommand` | `atCommand` | `true` |
| `plusCommand` | `plusCommand` | `true` |
| `slashCommand` | `slashCommand` | `true` |
| `conversationMode` | `conversationMode` | `false` |
| `advancedMode` | `advancedMode` | `false` |
| `speechToText` | `speechToText` | `true` |
| `engineSTT` | `engineSTT` | `'browser'` |
| `languageSTT` | `languageSTT` | `''` |
| `autoTranscribeAudio` | `autoTranscribeAudio` | `false` |
| `decibelValue` | `decibelValue` | `-45` |
| `autoSendText` | `autoSendText` | `-1` |
| `textToSpeech` | `textToSpeech` | `true` |
| `engineTTS` | `engineTTS` | `'browser'` |
| `voice` | `voice` | `undefined` |
| `cloudBrowserVoices` | `cloudBrowserVoices` | `false` |
| `languageTTS` | `languageTTS` | `''` |
| `automaticPlayback` | `automaticPlayback` | `false` |
| `playbackRate` | `playbackRate` | `null` |
| `cacheTTS` | `cacheTTS` | `true` |
| `UsernameDisplay` | `UsernameDisplay` | `true` |

### 3.7 `src/store/submission.ts`

| Name | Type | Key String | Default |
|------|------|-----------|---------|
| `submission` | atom | `submission` | `null` |
| `isSubmitting` | atom | `isSubmitting` | `false` |

### 3.8 `src/store/user.ts`

| Name | Type | Key String | Default |
|------|------|-----------|---------|
| `user` | atom | `user` | `undefined` |
| `availableTools` | atom | `availableTools` | `{}` |

### 3.9 `src/store/search.ts`

| Name | Type | Key String | Default |
|------|------|-----------|---------|
| `search` | atom | `search` | `{ enabled: null, query: '', ... }` |

### 3.10 `src/store/preset.ts`

| Name | Type | Key String | Default |
|------|------|-----------|---------|
| `defaultPreset` | atom | `defaultPreset` | `null` |
| `presetModalVisible` | atom | `presetModalVisible` | `false` |

### 3.11 `src/store/prompts.ts`

| Name | Type | Key String | Default |
|------|------|-----------|---------|
| `promptsName` | atom | `promptsName` | `''` |
| `promptsCategory` | atom | `promptsCategory` | `''` |
| `promptsPageNumber` | atom | `promptsPageNumber` | `1` |
| `promptsPageSize` | atom | `promptsPageSize` | `10` |
| `autoSendPrompts` | atom (localStorage) | `autoSendPrompts` | `true` |
| `alwaysMakeProd` | atom (localStorage) | `alwaysMakeProd` | `true` |
| `promptsEditorMode` | atom (localStorage) | `promptsEditorMode` | `PromptsEditorMode.SIMPLE` |

### 3.12 `src/store/language.ts`

| Name | Type | Key String | Default |
|------|------|-----------|---------|
| `lang` | atom (localStorage) | `lang` | browser language or cookie |

### 3.13 `src/store/temporary.ts`

| Name | Type | Key String | Default |
|------|------|-----------|---------|
| `isTemporary` | atom (localStorage) | `isTemporary` | `false` |
| `defaultTemporaryChat` | atom (localStorage) | `defaultTemporaryChat` | `false` |

### 3.14 `src/store/project.ts`

| Name | Type | Key String | Default |
|------|------|-----------|---------|
| `activeProjectId` | atom | `activeProjectId` | `null` |

---

## 4. Existing Jotai Usage (Already Migrated)

### 4.1 Jotai Atom Definitions

**`src/store/jotai-utils.ts`** -- Utility functions:
- `createStorageAtom<T>(key, defaultValue)` -- `atomWithStorage` with `getOnInit`
- `createStorageAtomWithEffect<T>(key, defaultValue, onWrite)` -- storage + side effects via derived atom
- `createTabIsolatedStorage<Value>()` -- SyncStorage adapter that prevents cross-tab sync
- `createTabIsolatedAtom<T>(key, defaultValue)` -- storage atom with tab isolation
- `initializeFromStorage<T>(key, defaultValue, onInit?)` -- startup hydration helper

**`src/store/mcp.ts`** (Jotai):
- `mcpValuesAtomFamily(conversationId)` -- atomFamily via `jotai/utils` with tab-isolated storage
- `mcpPinnedAtom` -- `atomWithStorage<boolean>`
- `mcpServerInitStatesAtom` -- plain Jotai `atom<Record<string, MCPServerInitState>>`

**`src/store/fontSize.ts`** (Jotai):
- `fontSizeAtom` -- `createStorageAtomWithEffect` (applies CSS class on write)

**`src/store/showThinking.ts`** (Jotai):
- `showThinkingAtom` -- `createStorageAtom<boolean>`

**`src/store/favorites.ts`** (Jotai):
- `favoritesAtom` -- `createTabIsolatedAtom<FavoritesState>`

### 4.2 Jotai Hook Usage Sites

| File | Hook | Atom |
|------|------|------|
| `src/hooks/MCP/useMCPServerManager.ts` | `useAtom` | `mcpServerInitStatesAtom` |
| `src/hooks/MCP/useMCPSelect.ts` | `useAtom` | `mcpPinnedAtom`, `mcpValuesAtomFamily` |
| `src/hooks/useFavorites.ts` | `useAtom` | `favoritesAtom` |
| `src/components/Nav/SettingsTabs/Chat/ShowThinking.tsx` | `useAtom` | `showThinkingAtom` |
| `src/components/Nav/SettingsTabs/Chat/FontSizeSelector.tsx` | `useAtom` | `fontSizeAtom` |
| `src/components/Nav/SettingsTabs/ToggleSwitch.tsx` | `useAtom` | (dynamic, via props) |
| `src/components/Messages/ContentRender.tsx` | `useAtomValue` | `fontSizeAtom` |
| `src/components/Share/Message.tsx` | `useAtomValue` | `fontSizeAtom` |
| `src/components/Chat/Messages/MessageParts.tsx` | `useAtomValue` | `fontSizeAtom` |
| `src/components/Chat/Messages/ui/MessageRender.tsx` | `useAtomValue` | `fontSizeAtom` |
| `src/components/Chat/Messages/SearchMessage.tsx` | `useAtomValue` | `fontSizeAtom` |
| `src/components/Chat/Messages/MessagesView.tsx` | `useAtomValue` | `fontSizeAtom` |
| `src/components/Chat/Messages/Content/Parts/Thinking.tsx` | `useAtomValue` | `fontSizeAtom`, `showThinkingAtom` |
| `src/components/Chat/Messages/Content/Parts/Summary.tsx` | `useAtomValue` | `fontSizeAtom` |
| `src/components/Chat/Messages/Content/Parts/Reasoning.tsx` | `useAtomValue` | `showThinkingAtom` |

### 4.3 Coexistence Pattern

Recoil and Jotai coexist cleanly:
- **RecoilRoot** wraps the entire app in `App.jsx`
- **No Jotai Provider** -- Jotai uses its default provider-less store
- The `ToggleSwitch` component has a dual adapter that detects Recoil vs Jotai atoms at runtime
- New features (MCP, favorites, fontSize, showThinking) use Jotai
- All legacy state remains in Recoil
- The `src/store/index.ts` barrel file exports Recoil atoms via default export and named exports; Jotai atoms are imported directly from their files

---

## 5. Dependency Graph

### 5.1 Root Atoms (no dependencies)

All atoms listed in sections 3.1-3.14 are root atoms, except selectors below.

### 5.2 Derived Selectors and Chains

```
conversationKeysAtom
  |
  +-> allConversationsSelector (reads conversationByIndex for each key)
  +-> anySubmittingSelector (reads isSubmittingFamily for each key)
  +-> latestMessageKeysSelector (reads latestMessageFamily for each key)
  +-> submissionKeysSelector (reads submissionByIndex for each key)

conversationByIndex(i)
  |
  +-> conversationIdByIndex(i)
  +-> conversationEndpointByIndex(i)
  +-> conversationModelByIndex(i)
  +-> conversationSpecByIndex(i)
  +-> conversationAgentIdByIndex(i)
  +-> conversationAssistantIdByIndex(i)
  +-> allConversationsSelector (via conversationKeysAtom)
  +-> updateConversationSelector(id)

endpointsConfig
  |
  +-> endpointsFilter

messageAttachmentsMap
  |
  +-> conversationAttachmentsSelector(conversationId)
```

### 5.3 Circular Dependencies

**None found.** All selector chains are acyclic.

### 5.4 Atom Families and Their Parameter Patterns

All atom families use `string | number` as their parameter (conversation index or ID), except:
- `ephemeralAgentByConvoId` -- keyed by `string` (conversation ID)
- `messagesSiblingIdxFamily` -- keyed by `string | null | undefined` (message ID)
- `globalAudio*Family`, `activeRunFamily`, `audioRunFamily` -- keyed by `string | number | null`

### 5.5 Atoms with Effects (require special migration attention)

| Atom | Effect Type | Details |
|------|------------|---------|
| `latestMessageFamily` | `onSet` | Logging only |
| `conversationByIndex` | `onSet` | **Complex**: localStorage sync (assistant_id, agent_id, spec, tools, endpoint settings), URL parameter updates |
| `abortScrollFamily` | `onSet` | Logging only |
| `isSubmittingFamily` | `onSet` | Logging only |
| `ephemeralAgentByConvoId` | `onSet` | Logging only |
| `artifactsPanelMode` | `onSet` | Logging only |
| `artifactsState` | `onSet` | Logging only |
| `currentArtifactId` | `onSet` | Logging only |
| `artifactsVisibility` | `onSet` | Logging only |
| `visibleArtifacts` | `onSet` | Logging only |
| All `atomWithLocalStorage` atoms (42) | `setSelf` + `onSet` | localStorage hydration and persistence |

### 5.6 Snapshot Usage (require `useRecoilCallback` equivalent)

| File | Pattern |
|------|---------|
| `src/store/families.ts` (useClearConvoState) | `snapshot.getPromise(conversationKeysAtom)`, `snapshot.getPromise(conversationByIndex)` |
| `src/store/families.ts` (useClearSubmissionState) | `snapshot.getPromise(submissionKeysSelector)` |
| `src/store/families.ts` (useClearLatestMessages) | `snapshot.getPromise(latestMessageKeysSelector)` |
| `src/store/agents.ts` (useApplyNewAgentTemplate) | `snapshot.getPromise(ephemeralAgentByConvoId)` |
| `src/store/agents.ts` (useGetEphemeralAgent) | `snapshot.getLoadable(ephemeralAgentByConvoId)` |
| `src/hooks/Messages/useBuildMessageTree.ts` | `snapshot.getPromise(messagesSiblingIdxFamily)` |
| `src/hooks/Chat/useGetAddedConvo.ts` | `snapshot.getLoadable(conversationByKeySelector)` |
| `src/hooks/Config/useClearStates.ts` | `snapshot.getPromise(conversationKeysAtom)` |
| `src/components/Chat/Input/BadgeRow.tsx` | `snapshot.getPromise(badgeAtom)` |

---

## 6. Top 15 Most-Referenced Atoms

Based on `store.<name>` reference counts across all source files:

| Rank | Atom | References |
|------|------|-----------|
| 1 | `conversationByIndex` | 13 |
| 2 | `queriesEnabled` | 12 |
| 3 | `promptsCategory` | 11 |
| 4 | `voice` | 10 |
| 5 | `promptsName` | 10 |
| 6 | `speechToText` | 9 |
| 7 | `textToSpeech` | 9 |
| 8 | `search` | 9 |
| 9 | `latestMessageFamily` | 9 |
| 10 | `user` | 8 |
| 11 | `promptsPageSize` | 7 |
| 12 | `playbackRate` | 7 |
| 13 | `globalAudioPlayingFamily` | 7 |
| 14 | `defaultPreset` | 7 |
| 15 | `autoExpandTools` | 7 |

---

## 7. Files with Most Recoil Usage (Hotspots)

| File | Recoil Hooks | Notes |
|------|-------------|-------|
| `src/components/Nav/SettingsTabs/Speech/Speech.tsx` | 18 `useRecoilState` | All speech settings at once |
| `src/hooks/Config/useSpeechSettingsInit.ts` | 16 `useSetRecoilState` | Initializes all speech atoms |
| `src/components/Chat/Input/ChatForm.tsx` | 10 hooks | Mix of `useRecoilValue` and `useRecoilState` |
| `src/components/Chat/Input/StreamAudio.tsx` | 11 hooks | Audio state families |
| `src/hooks/Chat/useChatHelpers.ts` | 12 hooks | Core chat state management |
| `src/hooks/useNewConvo.ts` | 8 hooks + `useRecoilCallback` | Conversation switching |
| `src/hooks/Conversations/usePresets.ts` | 8 hooks | Preset management |
| `src/data-provider/prompts.ts` | 18 `useRecoilValue` | Prompts query parameters (6 queries x 3 atoms) |
| `src/components/Artifacts/ArtifactButton.tsx` | 6 hooks | Artifact UI state |
| `src/hooks/Audio/usePauseGlobalAudio.ts` | 5 hooks | Audio state families |

---

## 8. Barrel File Structure

### `src/store/index.ts`

**Default export** (spread merge):
- `artifacts.*` (5 atoms)
- `families.*` (34 atoms/selectors/hooks)
- `endpoints.*` (3 atoms/selectors)
- `user.*` (2 atoms)
- `submission.*` (2 atoms)
- `search.*` (1 atom)
- `prompts.*` (7 atoms)
- `preset.*` (2 atoms)
- `lang.*` (1 atom)
- `settings.*` (42 atoms)
- `misc.*` (6 atoms/selectors)
- `isTemporary.*` (2 atoms)

**Named re-exports** (via `export *`):
- `./agents` -- `ephemeralAgentByConvoId`, `useUpdateEphemeralAgent`, `useApplyNewAgentTemplate`, `useGetEphemeralAgent`
- `./mcp` -- Jotai atoms (`mcpValuesAtomFamily`, `mcpPinnedAtom`, `mcpServerInitStatesAtom`, etc.)
- `./favorites` -- Jotai atom (`favoritesAtom`)
- `./project` -- `activeProjectId`

Note: The barrel re-exports both Recoil atoms (default export) and Jotai atoms (named exports). Consumers import Recoil atoms as `store.atomName` and Jotai atoms as named imports `{ atomName }`.

---

## 9. Migration Complexity Assessment

### Low complexity (simple atoms, no effects, no families):
- All `src/store/settings.ts` localStorage atoms (38) -- direct mapping to `createStorageAtom`
- All `src/store/prompts.ts` atoms (7)
- `src/store/submission.ts` (2)
- `src/store/user.ts` (2)
- `src/store/search.ts` (1)
- `src/store/preset.ts` (2)
- `src/store/language.ts` (1)
- `src/store/temporary.ts` (2)
- `src/store/project.ts` (1)
- `src/store/endpoints.ts` atoms (2, not the selector)
- `src/store/misc.ts` simple atoms (`queriesEnabled`, `isEditingBadges`)

### Medium complexity (selectors, simple effects):
- `src/store/endpoints.ts` `endpointsFilter` selector
- `src/store/misc.ts` `conversationAttachmentsSelector` (selectorFamily)
- `src/store/artifacts.ts` (5 atoms with logging effects)
- Selector families in `families.ts` that derive from `conversationByIndex`

### High complexity (families, snapshot usage, complex effects):
- `src/store/families.ts` -- 16 atom families, 8 selectors, 5 custom hooks with snapshot access
- `src/store/agents.ts` -- atomFamily with 3 hooks using snapshot.getPromise/getLoadable
- `conversationByIndex` -- complex onSet effect with localStorage, URL param sync
- All `useRecoilCallback` sites (11 unique locations) -- need Jotai store.get/store.set equivalents
- `src/components/Nav/SettingsTabs/ToggleSwitch.tsx` -- bridge component, last to migrate
- `src/common/types.ts` -- Recoil types in shared interfaces (`RecoilState`, `SetterOrUpdater`)

---

## 10. Recoil Atom Count Summary

| Category | Atoms | AtomFamilies | Selectors | SelectorFamilies | Total |
|----------|-------|-------------|-----------|-----------------|-------|
| families.ts | 3 | 16 | 3 | 7 (+1 alias) | 29 |
| agents.ts | 0 | 1 | 0 | 0 | 1 |
| artifacts.ts | 5 | 0 | 0 | 0 | 5 |
| endpoints.ts | 2 | 0 | 1 | 0 | 3 |
| misc.ts | 4 | 0 | 0 | 1 | 5 |
| settings.ts | 42 | 0 | 0 | 0 | 42 |
| submission.ts | 2 | 0 | 0 | 0 | 2 |
| user.ts | 2 | 0 | 0 | 0 | 2 |
| search.ts | 1 | 0 | 0 | 0 | 1 |
| preset.ts | 2 | 0 | 0 | 0 | 2 |
| prompts.ts | 7 | 0 | 0 | 0 | 7 |
| language.ts | 1 | 0 | 0 | 0 | 1 |
| temporary.ts | 2 | 0 | 0 | 0 | 2 |
| project.ts | 1 | 0 | 0 | 0 | 1 |
| **TOTAL** | **74** | **17** | **4** | **8** | **103** |

Plus 5 Jotai atoms already migrated (across 4 files).
