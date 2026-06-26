# Phase 3 Migration Results (Units 13-16)

**Date:** 2026-04-04
**Risk Level:** 3 (selectors, atom families, complex patterns)

---

## Unit 13: misc-state

**Atoms migrated (6):**
- `hideBannerHint` -- `atomWithLocalStorage` -> `createStorageAtom`
- `messageAttachmentsMap` -- Recoil `atom` -> Jotai `atom`
- `conversationAttachmentsSelector` -- Recoil `selectorFamily` -> Jotai `atomFamily` + derived `atom((get) => ...)`
- `queriesEnabled` -- Recoil `atom` -> Jotai `atom`
- `isEditingBadges` -- Recoil `atom` -> Jotai `atom`
- `chatBadges` -- `atomWithLocalStorage` -> `createStorageAtom`

**Files modified (14):**
- `src/store/misc.ts` -- full rewrite to Jotai
- `src/components/Banners/Banner.tsx` -- `useRecoilState` -> `useAtom`
- `src/routes/Layouts/Login.tsx` -- `useRecoilState` -> `useAtom`
- `src/hooks/AuthContext.tsx` -- `useSetRecoilState` -> `useSetAtom`
- `src/hooks/SSE/useAttachmentHandler.ts` -- `useSetRecoilState` -> `useSetAtom`
- `src/hooks/Messages/useAttachments.ts` -- `useRecoilValue` -> `useAtomValue`
- `src/hooks/Messages/useConversationUIResources.ts` -- `useRecoilValue` -> `useAtomValue`
- `src/hooks/useChatBadges.ts` -- hybrid Jotai+Recoil reset pattern
- `src/components/Chat/Input/ChatForm.tsx` -- `useRecoilState` -> `useAtom` for badges
- `src/components/Chat/Input/BadgeRow.tsx` -- `useRecoilValue` -> `useAtomValue` for isEditingBadges
- `src/data-provider/Auth/mutations.ts` -- `useSetRecoilState` -> `useSetAtom`
- `src/data-provider/Auth/queries.ts` -- `useRecoilValue` -> `useAtomValue`
- `src/data-provider/Endpoints/queries.ts` -- `useRecoilValue` -> `useAtomValue`
- `src/data-provider/Files/queries.ts` -- `useRecoilValue` -> `useAtomValue`
- `src/data-provider/Misc/queries.ts` -- `useRecoilValue` -> `useAtomValue`

**Notes:**
- `conversationAttachmentsSelector` was Recoil `selectorFamily` -- converted to Jotai `atomFamily` wrapping a derived read-only `atom((get) => ...)`.
- `useChatBadges.useResetChatBadges()` now uses `useSetAtom` + `RESET` for the Jotai `chatBadges` atom, combined with `useRecoilCallback` for any remaining Recoil badge atoms.

---

## Unit 14: settings-speech

**Atoms migrated (16):**
`conversationMode`, `advancedMode`, `speechToText`, `engineSTT`, `languageSTT`, `autoTranscribeAudio`, `decibelValue`, `autoSendText`, `textToSpeech`, `engineTTS`, `voice`, `cloudBrowserVoices`, `languageTTS`, `automaticPlayback`, `playbackRate`, `cacheTTS`

All converted from `atomWithLocalStorage` (Recoil) to `createStorageAtom` (Jotai) with `debugLabel`.

**Files modified (~31):**
- `src/store/settings.ts` -- replaced all 16 atoms, removed `atomWithLocalStorage` import
- `src/components/Nav/SettingsTabs/ToggleSwitch.tsx` -- kept bridge pattern, no type changes needed
- `src/components/Nav/SettingsTabs/Speech/Speech.tsx` -- 16x `useRecoilState` -> `useAtom`
- `src/hooks/Config/useSpeechSettingsInit.ts` -- 16x `useSetRecoilState` -> `useSetAtom`
- All STT/TTS sub-components (8 files)
- Audio hooks: useTTSBrowser, useTTSExternal, useTextToSpeech, useTextToSpeechExternal, useTextToSpeechBrowser, useSpeechToTextBrowser, useSpeechToTextExternal, useGetAudioSettings
- UI components: HoverButtons, MessageAudio, StreamAudio, TTS, Voices, ChatForm

**Notes:**
- `settings.ts` now has ZERO Recoil imports.
- Files using both speech atoms and family atoms (StreamAudio, TTS hooks) have mixed Jotai+Recoil imports during coexistence.

---

## Unit 15: input-popovers

**Atom families migrated (4):**
- `showMentionPopoverFamily` -- Recoil `atomFamily` -> Jotai `atomFamily` (from `jotai/utils`)
- `showPlusPopoverFamily` -- same
- `showPromptsPopoverFamily` -- same
- `activePromptByIndex` -- same

**Files modified (7):**
- `src/store/families.ts` -- added `jotaiAtom`/`jotaiAtomFamily` imports (aliased to avoid collision with Recoil `atomFamily`)
- `src/components/Chat/Input/ChatForm.tsx` -- `useRecoilState` -> `useAtom` for popovers
- `src/hooks/Input/useHandleKeyUp.ts` -- `useSetRecoilState` -> `useSetAtom`, replaced `SetterOrUpdater` type
- `src/hooks/Input/useTextarea.ts` -- `useRecoilState` -> `useAtom` for activePrompt
- `src/hooks/Messages/useSubmitMessage.ts` -- `useSetRecoilState` -> `useSetAtom`
- `src/components/Chat/Input/PromptsCommand.tsx` -- `useSetRecoilState`/`useRecoilValue` -> `useSetAtom`/`useAtomValue`
- `src/hooks/Config/useClearStates.ts` -- Recoil `reset()` -> `jotaiStore.set(atom, default)` for 4 families

**Notes:**
- `families.ts` now has both Jotai `atomFamily` (aliased as `jotaiAtomFamily`) and Recoil `atomFamily` coexisting.
- `useClearStates.ts` uses `getDefaultStore()` from Jotai to imperatively reset the Jotai atom families within a `useRecoilCallback`.

---

## Unit 16: audio-families

**Atom families migrated (5):**
- `globalAudioURLFamily` -- Recoil `atomFamily` -> Jotai `atomFamily`
- `globalAudioFetchingFamily` -- same
- `globalAudioPlayingFamily` -- same
- `activeRunFamily` -- same
- `audioRunFamily` -- same

**Files modified (9):**
- `src/store/families.ts` -- replaced 5 audio families with Jotai `atomFamily`
- `src/hooks/Config/useClearStates.ts` -- added Jotai store resets for audio families
- `src/hooks/Audio/usePauseGlobalAudio.ts` -- full conversion to Jotai hooks
- `src/hooks/SSE/useSSE.ts` -- `useSetRecoilState` -> `useSetAtom` for activeRunFamily
- `src/hooks/SSE/useResumableSSE.ts` -- same
- `src/components/Chat/Input/StreamAudio.tsx` -- mixed conversion (audio = Jotai, conversation = Recoil)
- `src/hooks/Audio/useTTSBrowser.ts` -- `useRecoilValue` -> `useAtomValue` for globalAudioPlayingFamily
- `src/hooks/Audio/useTTSExternal.ts` -- same
- `src/hooks/Input/useTextToSpeech.ts` -- same
- `src/hooks/Input/useTextToSpeechExternal.ts` -- same

**Notes:**
- `useClearStates.ts` now resets all 9 Jotai atom families (4 popovers + 5 audio) via `jotaiStore.set()`.
- Several files have mixed Jotai/Recoil imports for the coexistence period (conversation families remain Recoil).

---

## TypeScript Status

All 4 units pass `tsc --noEmit` with no new errors. Pre-existing errors in unrelated files (conversationTags.spec, e2e configs, etc.) remain unchanged.
