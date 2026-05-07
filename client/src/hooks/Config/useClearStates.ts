import { useCallback } from 'react';
import { useStore } from 'jotai';
import { RESET } from 'jotai/utils';
import { clearLocalStorage } from '~/utils/localStorage';
import store from '~/store';

export default function useClearStates() {
  const jotaiStore = useStore();
  const clearConversations = store.useClearConvoState();
  const clearSubmissions = store.useClearSubmissionState();
  const clearLatestMessages = store.useClearLatestMessages();

  const clearStates = useCallback(
    (skipFirst?: boolean) => {
      clearSubmissions(skipFirst);
      clearConversations(skipFirst);
      clearLatestMessages(skipFirst);

      const keys = jotaiStore.get(store.conversationKeysAtom);

      for (const key of keys) {
        if (skipFirst === true && key === 0) {
          continue;
        }

        jotaiStore.set(store.filesByIndex(key), new Map());
        jotaiStore.set(store.presetByIndex(key), null);
        jotaiStore.set(store.textByIndex(key), '');
        jotaiStore.set(store.showStopButtonByIndex(key), false);
        jotaiStore.set(store.abortScrollFamily(key), RESET);
        jotaiStore.set(store.isSubmittingFamily(key), RESET);
        jotaiStore.set(store.optionSettingsFamily(key), {});
        jotaiStore.set(store.showPopoverFamily(key), false);

        jotaiStore.set(store.showMentionPopoverFamily(key), false);
        jotaiStore.set(store.showPlusPopoverFamily(key), false);
        jotaiStore.set(store.showPromptsPopoverFamily(key), false);
        jotaiStore.set(store.showSkillsPopoverFamily(key), false);
        jotaiStore.set(store.activePromptByIndex(key), undefined);
        jotaiStore.set(store.globalAudioURLFamily(key), null);
        jotaiStore.set(store.globalAudioFetchingFamily(key), false);
        jotaiStore.set(store.globalAudioPlayingFamily(key), false);
        jotaiStore.set(store.activeRunFamily(key), null);
        jotaiStore.set(store.audioRunFamily(key), null);
        jotaiStore.set(store.messagesSiblingIdxFamily(key.toString()), 0);
        jotaiStore.set(store.pendingManualSkillsByConvoId(key.toString()), []);
      }

      clearLocalStorage(skipFirst);
    },
    [jotaiStore, clearSubmissions, clearConversations, clearLatestMessages],
  );

  return clearStates;
}
