import { useCallback } from 'react';
import { useStore } from 'jotai';
import { RESET } from 'jotai/utils';
import { showSkillsPopoverFamily } from '~/components/Chat/Input/skillsState';
import { clearLocalStorage } from '~/utils/localStorage';
import store from '~/store';

export default function useClearStates() {
  const jotaiStore = useStore();
  const clearConversations = store.useClearConvoState();
  const clearSubmissions = store.useClearSubmissionState();
  const clearLatestMessages = store.useClearLatestMessages('useClearStates');

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
        jotaiStore.set(showSkillsPopoverFamily(key), false);
        jotaiStore.set(store.activePromptByIndex(key), undefined);
        jotaiStore.set(store.globalAudioURLFamily(key), null);
        jotaiStore.set(store.globalAudioFetchingFamily(key), false);
        jotaiStore.set(store.globalAudioPlayingFamily(key), false);
        jotaiStore.set(store.activeRunFamily(key), null);
        jotaiStore.set(store.audioRunFamily(key), null);
        jotaiStore.set(store.messagesSiblingIdxFamily(key.toString()), 0);
        jotaiStore.set(store.pendingManualSkillsByConvoId(key.toString()), []);
        jotaiStore.set(store.pendingQuotesByConvoId(key.toString()), []);

        /**
         * Pending skill/quote queues are keyed by the conversation id the
         * composer wrote under, not this UI index — also clear by the resolved
         * id so queued-but-unsent selections don't linger.
         */
        const convoId = jotaiStore.get(store.conversationByIndex(key))?.conversationId;
        if (convoId != null) {
          jotaiStore.set(store.pendingManualSkillsByConvoId(convoId), []);
          jotaiStore.set(store.pendingQuotesByConvoId(convoId), []);
        }
      }

      clearLocalStorage(skipFirst);
    },
    [jotaiStore, clearSubmissions, clearConversations, clearLatestMessages],
  );

  return clearStates;
}
