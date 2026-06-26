# Recoil-to-Jotai Migration Plan

**Date:** 2026-04-04
**Agent:** 3 (SURVEYOR)
**Scope:** 103 Recoil atoms/selectors across ~680 call sites in 181 consumer files

---

## 1. Dependency Graph Summary

### 1.1 Selector Chains (must migrate together with their source atoms)

```
conversationKeysAtom
  +-> allConversationsSelector          (reads conversationByIndex for each key)
  +-> anySubmittingSelector             (reads isSubmittingFamily for each key)
  +-> latestMessageKeysSelector         (reads latestMessageFamily for each key)
  +-> submissionKeysSelector            (reads submissionByIndex for each key)
  +-> updateConversationSelector        (reads/writes conversationByIndex for each key)

conversationByIndex(i)
  +-> conversationIdByIndex(i)
  +-> conversationEndpointByIndex(i)
  +-> conversationModelByIndex(i)
  +-> conversationSpecByIndex(i)
  +-> conversationAgentIdByIndex(i)
  +-> conversationAssistantIdByIndex(i)
  +-> allConversationsSelector          (via conversationKeysAtom)
  +-> updateConversationSelector        (via conversationKeysAtom)

endpointsConfig
  +-> endpointsFilter

messageAttachmentsMap
  +-> conversationAttachmentsSelector
```

### 1.2 Atom Family Groups (used together in consumers)

- **Conversation index families:** conversationByIndex, filesByIndex, presetByIndex, submissionByIndex, textByIndex, showStopButtonByIndex, abortScrollFamily, isSubmittingFamily, optionSettingsFamily, showPopoverFamily, latestMessageFamily, messagesSiblingIdxFamily -- all keyed by conversation index, all consumed together in `useChatHelpers`, `useClearStates`
- **Input popover families:** showMentionPopoverFamily, showPlusPopoverFamily, showPromptsPopoverFamily, activePromptByIndex -- consumed together in input components
- **Audio families:** globalAudioURLFamily, globalAudioFetchingFamily, globalAudioPlayingFamily, activeRunFamily, audioRunFamily -- consumed together in audio hooks/components
- **Speech settings:** speechToText, textToSpeech, engineSTT, engineTTS, languageSTT, languageTTS, voice, autoTranscribeAudio, decibelValue, autoSendText, cloudBrowserVoices, automaticPlayback, playbackRate, cacheTTS, conversationMode, advancedMode -- all consumed together in Speech.tsx (18 hooks)

### 1.3 Cross-Unit Coupling Hotspots

These files consume atoms from multiple units and create coupling:

| File | Units Touched |
|------|---------------|
| `hooks/Config/useClearStates.ts` | conversation-families, input-popovers, audio-families (resets all) |
| `hooks/Chat/useChatHelpers.ts` | conversation-families (12 hooks) |
| `hooks/useNewConvo.ts` | conversation-families, preset, settings |
| `hooks/Config/useSpeechSettingsInit.ts` | speech-settings (16 setters) |
| `components/Chat/Input/ChatForm.tsx` | conversation-families, speech, settings, misc, temporary |
| `components/Nav/SettingsTabs/Speech/Speech.tsx` | speech-settings (18 hooks) |
| `data-provider/prompts.ts` | prompts (18 refs) |

### 1.4 Dead Atoms (defined but zero external consumers)

| Atom | File | Action |
|------|------|--------|
| `submission` | `submission.ts` | Remove during migration |
| `isSubmitting` | `submission.ts` | Remove during migration |
| `endpointsConfig` | `endpoints.ts` | Remove (0 `store.` refs; variable name used locally in utils) |
| `endpointsQueryEnabled` | `endpoints.ts` | Remove |
| `endpointsFilter` | `endpoints.ts` | Remove |
| `defaultConfig` | `endpoints.ts` | Remove (exported value, not atom -- check utils) |
| `activeProjectId` | `project.ts` | Remove |
| `latestMessageKeysAtom` | `families.ts` | Internal only (used by selector) |
| `submissionKeysAtom` | `families.ts` | Internal only (used by selector) |

**Note:** `endpointsConfig` as a *variable name* appears in 60 files, but zero of them reference `store.endpointsConfig`. The atom itself has no consumers. Similarly, `submission` and `isSubmitting` from `submission.ts` are shadowed by local variables everywhere. The family versions (`submissionByIndex`, `isSubmittingFamily`) are the ones actually used.

---

## 2. Migration Units

### Unit 1: `dead-atoms` (cleanup)
**Atoms:** `submission`, `isSubmitting` (submission.ts), `endpointsConfig`, `endpointsQueryEnabled`, `endpointsFilter` (endpoints.ts), `activeProjectId` (project.ts)
**Total atoms:** 6
**Files modified:** `src/store/submission.ts`, `src/store/endpoints.ts`, `src/store/project.ts`, `src/store/index.ts`
**Call sites:** 0
**Risk:** 1 -- No consumers, pure deletion
**Dependencies:** None
**Tests:** None needed (verify no runtime errors)

---

### Unit 2: `project-id` (already dead, merged into Unit 1)
*(Merged into Unit 1)*

---

### Unit 3: `search-state`
**Atoms:** `search` (search.ts)
**Files modified (9):**
- `src/store/search.ts`
- `src/components/Nav/Favorites/FavoritesList.tsx`
- `src/components/Conversations/Conversations.tsx`
- `src/components/UnifiedSidebar/ConversationsSection.tsx`
- `src/routes/Search.tsx`
- `src/hooks/Conversations/useSearchEnabled.ts`
- `src/components/Nav/SettingsTabs/General/ArchivedChatsTable.tsx`
- `src/components/Nav/SettingsTabs/Data/SharedLinks.tsx`
- `src/components/Nav/SearchBar.tsx`
- `src/components/Chat/Messages/SearchButtons.tsx`
**Call sites:** 9
**Risk:** 1 -- Simple atom, no effects, no families, straightforward hooks
**Dependencies:** None
**Tests:** `Conversations.test.tsx` uses RecoilRoot

---

### Unit 4: `preset-state`
**Atoms:** `defaultPreset`, `presetModalVisible` (preset.ts)
**Files modified (7):**
- `src/store/preset.ts`
- `src/hooks/Config/useAppStartup.ts`
- `src/data-provider/Auth/mutations.ts`
- `src/hooks/Conversations/usePresets.ts`
- `src/hooks/useNewConvo.ts`
- `src/components/Chat/Menus/Presets/PresetItems.tsx`
- `src/components/Chat/Menus/Presets/EditPresetDialog.tsx`
**Call sites:** 9
**Risk:** 1 -- Simple atoms, no effects
**Dependencies:** None
**Tests:** None specific

---

### Unit 5: `user-state`
**Atoms:** `user`, `availableTools` (user.ts)
**Files modified (11):**
- `src/store/user.ts`
- `src/hooks/AuthContext.tsx`
- `src/data-provider/Endpoints/queries.ts`
- `src/components/Web/Sources.tsx`
- `src/components/Nav/SettingsTabs/Account/Avatar.tsx`
- `src/components/Nav/SettingsTabs/Account/BackupCodesItem.tsx`
- `src/components/Nav/SettingsTabs/Account/TwoFactorAuthentication.tsx`
- `src/components/Chat/Messages/Content/MarkdownComponents.tsx`
- `src/components/Chat/Messages/Content/FilePreviewDialog.tsx`
- `src/hooks/Conversations/usePresets.ts`
- `src/hooks/Input/useSelectMention.ts`
- `src/hooks/Input/useQueryParams.ts`
**Call sites:** 12
**Risk:** 2 -- Simple atoms but `user` is referenced in 8 files including auth
**Dependencies:** None
**Tests:** `AuthContext.spec.tsx`

---

### Unit 6: `temporary-chat`
**Atoms:** `isTemporary`, `defaultTemporaryChat` (temporary.ts) -- both localStorage
**Files modified (4):**
- `src/store/temporary.ts`
- `src/hooks/Chat/useChatFunctions.ts`
- `src/components/Chat/Input/ChatForm.tsx`
- `src/components/Nav/SettingsTabs/Chat/Chat.tsx`
- `src/components/Chat/TemporaryChat.tsx`
**Call sites:** 4
**Risk:** 2 -- localStorage atoms, requires `atomWithLocalStorage` utility to be migrated first
**Dependencies:** Unit 0 (storage utility)

---

### Unit 7: `language`
**Atoms:** `lang` (language.ts) -- localStorage
**Files modified (5):**
- `src/store/language.ts`
- `src/hooks/Files/useSharePointPicker.ts`
- `src/hooks/useLocalize.ts`
- `src/hooks/useLocalizedConfig.ts`
- `src/components/Share/ShareView.tsx`
- `src/components/Nav/SettingsTabs/General/General.tsx`
**Call sites:** 5
**Risk:** 2 -- localStorage atom, used in localization hook (wide reach via useLocalize)
**Dependencies:** Unit 0 (storage utility)

---

### Unit 8: `misc-state`
**Atoms:** `hideBannerHint` (localStorage), `messageAttachmentsMap`, `conversationAttachmentsSelector`, `queriesEnabled`, `isEditingBadges`, `chatBadges` (localStorage)
**Files modified (14):**
- `src/store/misc.ts`
- `src/components/Banners/Banner.tsx`
- `src/components/Chat/Input/BadgeRow.tsx`
- `src/components/Chat/Input/ChatForm.tsx`
- `src/hooks/useChatBadges.ts`
- `src/hooks/SSE/useAttachmentHandler.ts`
- `src/hooks/Messages/useAttachments.ts`
- `src/hooks/Messages/useConversationUIResources.ts`
- `src/routes/Layouts/Login.tsx`
- `src/hooks/AuthContext.tsx`
- `src/data-provider/Files/queries.ts`
- `src/data-provider/Auth/queries.ts`
- `src/data-provider/Auth/mutations.ts`
- `src/data-provider/Misc/queries.ts`
- `src/data-provider/Endpoints/queries.ts`
**Call sites:** 21 (9 misc refs + 12 queriesEnabled)
**Risk:** 3 -- Contains selectorFamily (`conversationAttachmentsSelector`), localStorage atoms, useRecoilCallback in `useChatBadges`, and `queriesEnabled` is used across 7 data-provider files
**Dependencies:** Unit 0 (storage utility for hideBannerHint, chatBadges)

---

### Unit 9: `artifacts-state`
**Atoms:** `artifactsPanelMode`, `artifactsState`, `currentArtifactId`, `artifactsVisibility`, `visibleArtifacts` (artifacts.ts)
**Files modified (7):**
- `src/store/artifacts.ts`
- `src/hooks/Artifacts/useArtifacts.ts`
- `src/hooks/Chat/useIdChangeEffect.ts`
- `src/components/Artifacts/Artifacts.tsx`
- `src/components/Artifacts/ArtifactButton.tsx`
- `src/components/Share/ShareArtifacts.tsx`
- `src/components/Code/CodePage.tsx`
- `src/components/Chat/Presentation.tsx`
**Call sites:** 18
**Risk:** 2 -- All atoms have logging-only `onSet` effects (trivial to migrate). Self-contained feature area
**Dependencies:** None
**Tests:** `useArtifacts.test.ts` (mocks recoil), `ArtifactButton.spec.tsx`, `ArtifactUpdate.spec.tsx`

---

### Unit 10: `prompts-state`
**Atoms:** `promptsName`, `promptsCategory`, `promptsPageNumber`, `promptsPageSize` (static), `autoSendPrompts`, `alwaysMakeProd`, `promptsEditorMode` (localStorage)
**Files modified (11):**
- `src/store/prompts.ts`
- `src/routes/Layouts/DashBreadcrumb.tsx`
- `src/data-provider/prompts.ts`
- `src/components/Prompts/buttons/ManagePrompts.tsx`
- `src/components/Prompts/buttons/AutoSendPrompt.tsx`
- `src/components/Prompts/buttons/AlwaysMakeProd.tsx`
- `src/components/Prompts/sidebar/FilterPrompts.tsx`
- `src/components/Prompts/sidebar/GroupSidePanel.tsx`
- `src/components/Prompts/forms/PromptForm.tsx`
- `src/components/Nav/SettingsTabs/Chat/Chat.tsx`
- `src/hooks/Prompts/usePromptGroupsNav.ts`
- `src/hooks/Messages/useSubmitMessage.ts`
**Call sites:** 35
**Risk:** 2 -- Mostly simple atoms. `data-provider/prompts.ts` has 18 references (6 queries x 3 atoms) but straightforward `useRecoilValue` calls
**Dependencies:** Unit 0 (storage utility for 3 localStorage atoms)

---

### Unit 11: `settings-static`
**Atoms:** `abortScroll`, `optionSettings`, `currentSettingsView`, `showPopover` (settings.ts, non-localStorage)
**Files modified (4):**
- `src/store/settings.ts` (partial)
- `src/hooks/SSE/useEventHandlers.ts`
- `src/components/Endpoints/AlternativeSettings.tsx`
- `src/components/Endpoints/EndpointSettings.tsx`
- `src/components/Chat/Input/PopoverButtons.tsx`
**Call sites:** 4
**Risk:** 1 -- Simple atoms, few consumers
**Dependencies:** None (these are non-localStorage atoms in settings.ts; can be migrated independently)

---

### Unit 12: `settings-general`
**Atoms:** `autoScroll`, `sidebarExpanded`, `enableUserMsgMarkdown`, `keepScreenAwake`, `enterToSend`, `maximizeChatSpace`, `chatDirection`, `autoExpandTools`, `saveDrafts`, `showScrollButton`, `UsernameDisplay` (11 localStorage atoms)
**Files modified (~30):**
- `src/store/settings.ts` (partial)
- Various components under Nav/SettingsTabs/General, Chat/Messages, Chat/Input, etc.
**Call sites:** ~37
**Risk:** 2 -- All localStorage atoms with straightforward `useRecoilState`/`useRecoilValue` patterns. Many consumers but simple access patterns
**Dependencies:** Unit 0 (storage utility)

---

### Unit 13: `settings-chat-features`
**Atoms:** `forkSetting`, `splitAtTarget`, `rememberDefaultFork`, `showThinking`, `saveBadgesState`, `modularChat`, `LaTeXParsing`, `centerFormOnLanding`, `showFooter`, `atCommand`, `plusCommand`, `slashCommand` (12 localStorage atoms)
**Files modified (~17):**
- `src/store/settings.ts` (partial)
- `src/components/Nav/SettingsTabs/Chat/Chat.tsx`
- `src/components/Nav/SettingsTabs/Chat/ForkSettings.tsx`
- `src/components/Nav/SettingsTabs/Chat/SaveBadgesState.tsx`
- `src/components/Nav/SettingsTabs/Commands/Commands.tsx`
- `src/components/Chat/Messages/Fork.tsx`
- `src/components/Chat/Messages/Content/Markdown.tsx`
- `src/hooks/Messages/useMessageActions.tsx`
- `src/hooks/Input/useHandleKeyUp.ts`
- `src/hooks/Input/useSelectMention.ts`
- `src/hooks/Input/useQueryParams.ts`
- `src/hooks/useNewConvo.ts`
- `src/hooks/Conversations/usePresets.ts`
- `src/components/Chat/ChatView.tsx`
- `src/components/Chat/Messages/SearchMessage.tsx`
- `src/components/Nav/SettingsTabs/Account/DisplayUsernameMessages.tsx`
- `src/components/Chat/Input/ChatForm.tsx`
**Call sites:** ~28
**Risk:** 2 -- All localStorage atoms, many consumers but simple patterns
**Dependencies:** Unit 0 (storage utility)

---

### Unit 14: `settings-speech`
**Atoms:** `conversationMode`, `advancedMode`, `speechToText`, `engineSTT`, `languageSTT`, `autoTranscribeAudio`, `decibelValue`, `autoSendText`, `textToSpeech`, `engineTTS`, `voice`, `cloudBrowserVoices`, `languageTTS`, `automaticPlayback`, `playbackRate`, `cacheTTS` (16 localStorage atoms)
**Files modified (~31):**
- `src/store/settings.ts` (partial)
- `src/hooks/Config/useSpeechSettingsInit.ts` (16 setters)
- `src/components/Nav/SettingsTabs/Speech/Speech.tsx` (18 hooks)
- All Speech settings UI components (STT/*, TTS/*, ConversationModeSwitch)
- `src/hooks/Audio/*` (useTTSBrowser, useTTSExternal, usePauseGlobalAudio)
- `src/hooks/Input/useTextToSpeech*.ts`, `useSpeechToText*.ts`, `useGetAudioSettings.ts`
- `src/components/Audio/TTS.tsx`, `Voices.tsx`
- `src/components/Chat/Input/StreamAudio.tsx`, `ChatForm.tsx`
- `src/components/Chat/Messages/MessageAudio.tsx`, `HoverButtons.tsx`
- `src/components/Chat/Menus/Endpoints/ModelSelectorChatContext.tsx`
**Call sites:** ~89
**Risk:** 3 -- Large atom group, Speech.tsx has 18 hooks in one component, `useSpeechSettingsInit` has 16 setters. Tightly coupled but self-contained feature area
**Dependencies:** Unit 0 (storage utility)
**Tests:** `ConversationModeSwitch.spec.tsx`, `AutoTranscribeAudioSwitch.spec.tsx`, `SpeechToTextSwitch.spec.tsx`, `TextToSpeechSwitch.spec.tsx`, `AutomaticPlaybackSwitch.spec.tsx`, `CacheTTSSwitch.spec.tsx`, `CloudBrowserVoicesSwitch.spec.tsx`

---

### Unit 15: `input-popovers`
**Atoms:** `showMentionPopoverFamily`, `showPlusPopoverFamily`, `showPromptsPopoverFamily`, `activePromptByIndex` (4 atom families from families.ts)
**Files modified (6):**
- `src/store/families.ts` (partial)
- `src/hooks/Config/useClearStates.ts`
- `src/hooks/Messages/useSubmitMessage.ts`
- `src/hooks/Input/useTextarea.ts`
- `src/hooks/Input/useHandleKeyUp.ts`
- `src/components/Chat/Input/ChatForm.tsx`
- `src/components/Chat/Input/PromptsCommand.tsx`
**Call sites:** 11
**Risk:** 3 -- Atom families (require Jotai `atomFamily` pattern), consumed in `useClearStates` alongside other families
**Dependencies:** Must coordinate with Unit 17 (conversation-families) since `useClearStates` resets both

---

### Unit 16: `audio-families`
**Atoms:** `globalAudioURLFamily`, `globalAudioFetchingFamily`, `globalAudioPlayingFamily`, `activeRunFamily`, `audioRunFamily` (5 atom families from families.ts)
**Files modified (9):**
- `src/store/families.ts` (partial)
- `src/hooks/Config/useClearStates.ts`
- `src/hooks/Audio/useTTSBrowser.ts`
- `src/hooks/Audio/useTTSExternal.ts`
- `src/hooks/Audio/usePauseGlobalAudio.ts`
- `src/hooks/Input/useTextToSpeechExternal.ts`
- `src/hooks/Input/useTextToSpeech.ts`
- `src/hooks/SSE/useSSE.ts`
- `src/hooks/SSE/useResumableSSE.ts`
- `src/components/Chat/Input/StreamAudio.tsx`
**Call sites:** 22
**Risk:** 3 -- Atom families, consumed in `useClearStates` alongside other families
**Dependencies:** Must coordinate with Unit 17 (conversation-families) since `useClearStates` resets both

---

### Unit 17: `conversation-families` (CORE)
**Atoms (20):**
- `conversationKeysAtom`, `conversationByIndex`, `filesByIndex`, `presetByIndex`, `submissionByIndex`, `textByIndex`, `showStopButtonByIndex`, `abortScrollFamily`, `isSubmittingFamily`, `optionSettingsFamily`, `showPopoverFamily`, `latestMessageFamily`, `messagesSiblingIdxFamily`
- `latestMessageKeysAtom`, `submissionKeysAtom`
- Selectors: `allConversationsSelector`, `anySubmittingSelector`, `latestMessageKeysSelector`, `submissionKeysSelector`, `conversationIdByIndex`, `conversationEndpointByIndex`, `conversationModelByIndex`, `conversationSpecByIndex`, `conversationAgentIdByIndex`, `conversationAssistantIdByIndex`, `updateConversationSelector`, `conversationByKeySelector`
- Custom hooks: `useCreateConversationAtom`, `useSetConversationAtom`, `useClearConvoState`, `useClearSubmissionState`, `useClearLatestMessages`

**Files modified (~40+):**
- `src/store/families.ts`
- All files in census section 5.6 (snapshot usage)
- `src/hooks/Chat/useChatHelpers.ts` (12 hooks)
- `src/hooks/useNewConvo.ts` (8 hooks + callback)
- `src/hooks/Config/useClearStates.ts` (20 resets)
- `src/hooks/SSE/*` (multiple files)
- `src/hooks/Conversations/*` (multiple files)
- `src/hooks/Messages/*`
- `src/components/Chat/*` (multiple files)
- `src/components/UnifiedSidebar/*`
- `src/components/SidePanel/Agents/*`
- `src/Providers/ArtifactsContext.tsx`

**Call sites:** ~94 (64 family refs + 17 selector refs + 13 custom hook refs)
**Risk:** 5 -- Core state of the entire application. Complex `onSet` effects on `conversationByIndex` (localStorage sync, URL params). 5 custom hooks with `useRecoilCallback` + `snapshot.getPromise`/`snapshot.getLoadable`. Multiple atom families. Half the app depends on this
**Dependencies:** None (but almost everything else depends on this being stable)
**Tests:** `useAppStartup.spec.tsx`

---

### Unit 18: `agents-state`
**Atoms:** `ephemeralAgentByConvoId` (atomFamily from agents.ts)
**Custom hooks:** `useUpdateEphemeralAgent`, `useApplyNewAgentTemplate`, `useGetEphemeralAgent`
**Files modified (~13):**
- `src/store/agents.ts`
- `src/Providers/BadgeRowContext.tsx`
- `src/hooks/MCP/useMCPSelect.ts`
- `src/hooks/Chat/useChatFunctions.ts`
- `src/hooks/Plugins/useToolToggle.ts`
- `src/hooks/Agents/useApplyModelSpecAgents.ts`
- `src/hooks/Files/useDragHelpers.ts`
- `src/hooks/Files/useFileHandling.ts`
- `src/components/Chat/Input/Files/DragDropModal.tsx`
- `src/components/Chat/Input/Files/AttachFileMenu.tsx`
**Call sites:** ~52 (includes test files)
**Risk:** 4 -- AtomFamily with 3 custom hooks using `useRecoilCallback` with `snapshot.getPromise` and `snapshot.getLoadable`. Complex patterns
**Dependencies:** None (independent of conversation families)
**Tests:** `useToolToggle.test.tsx`, `useMCPSelect.test.tsx`, `useFileHandling.test.ts`, `Accessibility.spec.tsx`

---

### Unit 0: `storage-utility` (PREREQUISITE)
**Files:** `src/store/utils.ts` (Recoil `atomWithLocalStorage`), `src/store/jotai-utils.ts` (already has Jotai equivalents)
**Action:** The Jotai `createStorageAtom` in `jotai-utils.ts` already exists and serves as the replacement. This unit just ensures the utility mapping is documented and tested before any localStorage atom units proceed
**Call sites:** 0 (utility, not a hook)
**Risk:** 2 -- Must work correctly since 42 atoms depend on it
**Dependencies:** None
**Tests:** Should add unit tests for `createStorageAtom`

---

### Unit 19: `recoil-types` (CLEANUP, LAST)
**Files:** `src/common/types.ts`, `src/Providers/AddedChatContext.tsx`, `src/hooks/Conversations/useDebouncedInput.ts`, `src/hooks/Input/useHandleKeyUp.ts`, `src/hooks/Input/useAutoSave.ts`, `src/components/Nav/SettingsTabs/ToggleSwitch.tsx`
**Action:** Replace `RecoilState<boolean>` with Jotai `WritableAtom` and `SetterOrUpdater` with Jotai's equivalent setter type. Remove `ToggleSwitch` bridge (no longer needed when all atoms are Jotai)
**Call sites:** ~6 type references
**Risk:** 2 -- Type-only changes plus bridge removal, but touches shared types
**Dependencies:** ALL other units must be complete first

---

### Unit 20: `recoil-root-removal` (FINAL)
**Files:** `src/App.jsx`, `test/layout-test-utils.tsx`, all 24 test files with `<RecoilRoot>`
**Action:** Remove `<RecoilRoot>` wrapper, remove `recoil` package dependency, update test harness
**Call sites:** ~26
**Risk:** 2 -- Mechanical removal once all atoms are migrated
**Dependencies:** ALL other units must be complete

---

## 3. Ordered Migration Sequence

| # | Unit | Atoms | Call Sites | Risk | Cumulative Sites | Phase |
|---|------|-------|-----------|------|-----------------|-------|
| 1 | `dead-atoms` | 6 | 0 | 1 | 0/680 | 1 |
| 2 | `storage-utility` | 0 | 0 | 2 | 0/680 | 1 |
| 3 | `search-state` | 1 | 9 | 1 | 9/680 | 1 |
| 4 | `settings-static` | 4 | 4 | 1 | 13/680 | 1 |
| 5 | `preset-state` | 2 | 9 | 1 | 22/680 | 1 |
| 6 | `artifacts-state` | 5 | 18 | 2 | 40/680 | 2 |
| 7 | `user-state` | 2 | 12 | 2 | 52/680 | 2 |
| 8 | `temporary-chat` | 2 | 4 | 2 | 56/680 | 2 |
| 9 | `language` | 1 | 5 | 2 | 61/680 | 2 |
| 10 | `prompts-state` | 7 | 35 | 2 | 96/680 | 2 |
| 11 | `settings-general` | 11 | 37 | 2 | 133/680 | 2 |
| 12 | `settings-chat-features` | 12 | 28 | 2 | 161/680 | 2 |
| 13 | `misc-state` | 6 | 21 | 3 | 182/680 | 3 |
| 14 | `settings-speech` | 16 | 89 | 3 | 271/680 | 3 |
| 15 | `input-popovers` | 4 | 11 | 3 | 282/680 | 3 |
| 16 | `audio-families` | 5 | 22 | 3 | 304/680 | 3 |
| 17 | `agents-state` | 1 | 52 | 4 | 356/680 | 4 |
| 18 | `conversation-families` | 29 | 94 | 5 | 450/680 | 4 |
| 19 | `recoil-types` | 0 | 6 | 2 | 456/680 | 4 |
| 20 | `recoil-root-removal` | 0 | ~224* | 2 | 680/680 | 4 |

*The remaining ~224 call sites are accounted for by: (a) Recoil hook imports in files that use atoms via store.X (the hook import is the call site, counted per-file), (b) test files mocking/wrapping RecoilRoot, and (c) the `from 'recoil'` imports in store definition files themselves that get removed as each unit migrates. The per-unit call site counts above track consumer-side references; the final removal pass catches all remaining `import ... from 'recoil'` lines.

---

## 4. Pilot Unit Recommendation

**Recommended pilot: Unit 3 -- `search-state`**

Rationale:
- **Smallest practical unit:** 1 atom, 9 call sites, 9 consumer files
- **Low risk (1):** Simple atom with no effects, no families, no async, no snapshots
- **Isolated:** No dependencies on other atoms. No other atoms depend on it
- **User-facing:** Controls search UI visibility and query state -- real functionality
- **Test coverage:** `Conversations.test.tsx` exercises the search-dependent code path
- **Clear success criteria:** Search works after migration
- **Representative pattern:** Uses `useRecoilState` and `useRecoilValue` -- the two most common hooks (492 of 680 call sites)

**Alternative pilot: Unit 4 -- `preset-state`** if you prefer 2 atoms in the pilot.

---

## 5. Phase Schedule

### Phase 1: Foundation + Pilot (Units 1-5)
**Scope:** 13 atoms, 22 call sites
**Estimated effort:** 1-2 days
**Goals:**
- Remove dead atoms (Unit 1)
- Validate storage utility mapping (Unit 2)
- Complete pilot migration (Unit 3: search-state)
- Migrate remaining risk-1 atoms (Units 4-5)
- Establish migration patterns, update test harness

### Phase 2: Risk-2 Bulk Migration (Units 6-12)
**Scope:** 40 atoms, 141 call sites (cumulative: 53 atoms, 163 sites)
**Estimated effort:** 3-5 days
**Goals:**
- Migrate all standalone atoms and localStorage atoms
- Includes artifacts (with trivial logging effects), user, prompts, and most settings
- After this phase, all simple atoms are on Jotai

### Phase 3: Effects and Selectors (Units 13-16)
**Scope:** 31 atoms, 143 call sites (cumulative: 84 atoms, 306 sites)
**Estimated effort:** 3-5 days
**Goals:**
- Migrate selectorFamilies (`conversationAttachmentsSelector`)
- Migrate atom families for input popovers and audio
- Handle speech settings mega-migration (89 call sites but mechanical)
- Coordinate `useClearStates.ts` -- this file resets atoms from Units 15, 16, and 17. Migrate Units 15 and 16 first, then handle `useClearStates` as part of Unit 17

### Phase 4: Core State + Cleanup (Units 17-20)
**Scope:** 30 atoms + types/root, ~374 call sites (cumulative: 103 atoms, 680 sites)
**Estimated effort:** 5-8 days
**Goals:**
- Migrate `agents-state` (atomFamily + snapshot callbacks)
- Migrate `conversation-families` (the big one -- 29 atoms, complex effects, snapshots)
- Replace Recoil types in shared interfaces
- Remove `ToggleSwitch` bridge component
- Remove `<RecoilRoot>`, uninstall `recoil` package
- Final verification: zero Recoil imports remain

---

## 6. Atom-to-Unit Assignment Verification

**Total atoms across all units: 103** (matches census)

| Unit | Atom Count | Source File |
|------|-----------|-------------|
| dead-atoms | 6 | submission.ts (2), endpoints.ts (3), project.ts (1) |
| search-state | 1 | search.ts |
| preset-state | 2 | preset.ts |
| user-state | 2 | user.ts |
| temporary-chat | 2 | temporary.ts |
| language | 1 | language.ts |
| misc-state | 6 | misc.ts (4 atoms + 1 selector + 1 selectorFamily) |
| artifacts-state | 5 | artifacts.ts |
| prompts-state | 7 | prompts.ts |
| settings-static | 4 | settings.ts (non-localStorage) |
| settings-general | 11 | settings.ts (localStorage, non-speech) |
| settings-chat-features | 12 | settings.ts (localStorage, chat/beta/commands) |
| settings-speech | 16 | settings.ts (localStorage, speech) |
| input-popovers | 4 | families.ts |
| audio-families | 5 | families.ts |
| conversation-families | 29 | families.ts (13 atom/atomFamilies + 3 internal atoms + 8 selectors + 5 hooks counted as 1 unit with their atoms) |
| agents-state | 1 | agents.ts (1 atomFamily + 3 hooks) |
| **TOTAL** | **103** | |

Note: `latestMessageKeysAtom` and `submissionKeysAtom` are internal to `families.ts` (only consumed by selectors in the same file). They are counted in `conversation-families`. The `conversationByKeySelector` is an alias for `conversationByIndex` and is counted once.

---

## 7. Risk Mitigation Notes

1. **`useClearStates.ts` is the scariest file.** It resets 20+ atom families from Units 15, 16, and 17. Strategy: migrate Units 15 and 16 first (during Phase 3), then handle `useClearStates` as a bridging step when migrating Unit 17 in Phase 4. During the bridge period, `useClearStates` will temporarily import both Jotai and Recoil atoms.

2. **`conversationByIndex` has complex `onSet` effects** (localStorage sync, URL param updates). The Jotai equivalent will use `atomEffect` or a derived write atom. Test thoroughly with manual conversation switching.

3. **`snapshot.getPromise` / `snapshot.getLoadable` patterns** (11 locations) need Jotai `store.get()` equivalents. The Jotai `useStore` hook or explicit store instance will be needed. These are all in Phase 4.

4. **The `ToggleSwitch` bridge** currently handles dual Recoil/Jotai atoms at runtime. It should be the last component cleaned up (Unit 19) after all atoms are Jotai.

5. **Test files:** 24 files use `<RecoilRoot>` directly, 8 files mock `recoil`. Each must be updated as part of the unit that contains its tested atoms. The test harness (`layout-test-utils.tsx`) should be updated in Phase 1 to support both Recoil and Jotai, then simplified in Phase 4.
