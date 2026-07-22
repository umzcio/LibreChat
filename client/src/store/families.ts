import { useEffect, useCallback } from 'react';
import { atom } from 'jotai';
import { useStore, useAtomValue, useSetAtom } from 'jotai';
import { createSearchParams } from 'react-router-dom';
import { atomFamily, selectAtom, RESET } from 'jotai/utils';
import { LocalStorageKeys, isEphemeralAgentId, Constants } from 'librechat-data-provider';
import type { EModelEndpoint, TConversation, TMessage, TSubmission, TPreset } from 'librechat-data-provider';
import type { TOptionSettings, ExtendedFile } from '~/common';
import {
  clearModelForNonEphemeralAgent,
  createChatSearchParams,
  storeEndpointSettings,
  logger,
} from '~/utils';
import { useSetConvoContext } from '~/Providers/SetConvoContext';

const conversationKeysAtom = atom<(string | number)[]>([]);
conversationKeysAtom.debugLabel = 'conversationKeysAtom';

const latestMessageKeysAtom = atom<(string | number)[]>([]);
latestMessageKeysAtom.debugLabel = 'latestMessageKeysAtom';

const submissionKeysAtom = atom<(string | number)[]>([]);
submissionKeysAtom.debugLabel = 'submissionKeysAtom';

const _latestMessageFamily = atomFamily((_param: string | number | null) => {
  const a = atom<TMessage | null>(null);
  a.debugLabel = 'latestMessageFamily';
  return a;
});

type LatestMsgUpdate = TMessage | null | typeof RESET | ((prev: TMessage | null) => TMessage | null);

const latestMessageFamily = atomFamily((param: string | number | null) =>
  atom(
    (get) => get(_latestMessageFamily(param)),
    (get, set, update: LatestMsgUpdate) => {
      if (update === RESET) {
        set(_latestMessageFamily(param), null);
        return;
      }
      const newValue = typeof update === 'function' ? update(get(_latestMessageFamily(param))) : update;
      logger.log('Setting latestMessage', { key: param, newValue });
      set(_latestMessageFamily(param), newValue);
    },
  ),
);

const submissionByIndex = atomFamily((_param: string | number) => {
  const a = atom<TSubmission | null>(null);
  a.debugLabel = 'submissionByIndex';
  return a;
});

const latestMessageKeysSelector = atom(
  (get) => {
    const keys = get(conversationKeysAtom);
    return keys.filter((key) => get(latestMessageFamily(key)) !== null);
  },
  (_get, set, newKeys: (string | number)[]) => {
    logger.log('setting latestMessageKeys', { newKeys });
    set(latestMessageKeysAtom, newKeys);
  },
);
latestMessageKeysSelector.debugLabel = 'latestMessageKeysSelector';

const submissionKeysSelector = atom(
  (get) => {
    const keys = get(conversationKeysAtom);
    return keys.filter((key) => get(submissionByIndex(key)) !== null);
  },
  (_get, set, newKeys: (string | number)[]) => {
    logger.log('setting submissionKeysAtom', newKeys);
    set(submissionKeysAtom, newKeys);
  },
);
submissionKeysSelector.debugLabel = 'submissionKeysSelector';

const _conversationByIndex = atomFamily((_param: string | number) => {
  const a = atom<TConversation | null>(null);
  a.debugLabel = 'conversationByIndex';
  return a;
});

type ConvoUpdate = TConversation | null | typeof RESET | ((prev: TConversation | null) => TConversation | null);

const conversationByIndex = atomFamily((index: string | number) =>
  atom(
    (get) => get(_conversationByIndex(index)),
    (get, set, update: ConvoUpdate) => {
      const oldValue = get(_conversationByIndex(index));

      if (update === RESET) {
        set(_conversationByIndex(index), null);
        return;
      }

      const newValue = typeof update === 'function' ? update(oldValue) : update;
      set(_conversationByIndex(index), newValue);

      logger.log('conversation', 'Setting conversation:', { index, newValue, oldValue });
      if (newValue?.assistant_id != null && newValue.assistant_id) {
        localStorage.setItem(
          `${LocalStorageKeys.ASST_ID_PREFIX}${index}${newValue.endpoint}`,
          newValue.assistant_id,
        );
      }
      if (newValue?.agent_id != null && !isEphemeralAgentId(newValue.agent_id)) {
        localStorage.setItem(`${LocalStorageKeys.AGENT_ID_PREFIX}${index}`, newValue.agent_id);
      }
      if (newValue?.spec != null && newValue.spec) {
        localStorage.setItem(LocalStorageKeys.LAST_SPEC, newValue.spec);
      }
      if (newValue?.tools && Array.isArray(newValue.tools)) {
        localStorage.setItem(
          LocalStorageKeys.LAST_TOOLS,
          JSON.stringify(newValue.tools.filter((el) => !!el)),
        );
      }

      if (!newValue) {
        return;
      }

      storeEndpointSettings(newValue);

      const convoToStore = { ...newValue };
      clearModelForNonEphemeralAgent(convoToStore);
      localStorage.setItem(
        `${LocalStorageKeys.LAST_CONVO_SETUP}_${index}`,
        JSON.stringify(convoToStore),
      );

      const disableParams = newValue.disableParams === true;
      const shouldUpdateParams =
        Number(index) === 0 &&
        !disableParams &&
        newValue.createdAt === '' &&
        JSON.stringify(newValue) !== JSON.stringify(oldValue) &&
        (oldValue as TConversation)?.conversationId === Constants.NEW_CONVO;

      if (shouldUpdateParams) {
        const newParams = createChatSearchParams(newValue);
        if (newValue.chatProjectId) {
          newParams.set('projectId', newValue.chatProjectId);
        }
        const searchParams = createSearchParams(newParams);
        const url = `${window.location.pathname}?${searchParams.toString()}`;
        window.history.pushState({}, '', url);
      }
    },
  ),
);

const filesByIndex = atomFamily((_param: string | number) => {
  const a = atom<Map<string, ExtendedFile>>(new Map());
  a.debugLabel = 'filesByIndex';
  return a;
});

const allConversationsSelector = atom((get) => {
  const keys = get(conversationKeysAtom);
  return keys.map((key) => get(conversationByIndex(key))).map((convo) => convo?.conversationId);
});
allConversationsSelector.debugLabel = 'allConversationsSelector';

const conversationIdByIndex = atomFamily((index: string | number) =>
  atom<string | null>((get) =>
    get(conversationByIndex(index))?.conversationId ?? null,
  ),
);

const conversationEndpointByIndex = atomFamily((index: string | number) =>
  atom<EModelEndpoint | null>((get) =>
    get(conversationByIndex(index))?.endpoint ?? null,
  ),
);

const conversationModelByIndex = atomFamily((index: string | number) =>
  atom<string | null>((get) =>
    get(conversationByIndex(index))?.model ?? null,
  ),
);

const conversationSpecByIndex = atomFamily((index: string | number) =>
  atom<string | null>((get) =>
    get(conversationByIndex(index))?.spec ?? null,
  ),
);

const conversationAgentIdByIndex = atomFamily((index: string | number) =>
  atom<string | null>((get) =>
    get(conversationByIndex(index))?.agent_id ?? null,
  ),
);

const conversationAssistantIdByIndex = atomFamily((index: string | number) =>
  atom<string | null>((get) =>
    get(conversationByIndex(index))?.assistant_id ?? null,
  ),
);

const latestMessageErrorFamily = atomFamily((param: string | number) => {
  const a = atom<boolean | undefined>((get) => get(latestMessageFamily(param))?.error);
  a.debugLabel = 'latestMessageErrorFamily';
  return a;
});

const latestMessageParentIdFamily = atomFamily((param: string | number) => {
  const a = atom<string | null | undefined>((get) => get(latestMessageFamily(param))?.parentMessageId);
  a.debugLabel = 'latestMessageParentIdFamily';
  return a;
});

const latestMessageIdFamily = atomFamily((param: string | number) => {
  const a = atom<string | null | undefined>((get) => get(latestMessageFamily(param))?.messageId);
  a.debugLabel = 'latestMessageIdFamily';
  return a;
});

const conversationBookmarkInfoByIndex = atomFamily((index: string | number) =>
  selectAtom(
    conversationByIndex(index),
    (conv) =>
      conv
        ? { conversationId: conv.conversationId, tags: conv.tags, expiredAt: conv.expiredAt }
        : null,
    (a, b) =>
      a?.conversationId === b?.conversationId &&
      a?.expiredAt === b?.expiredAt &&
      a?.tags === b?.tags,
  ),
);

const conversationHasMessagesByIndex = atomFamily((index: string | number) => {
  const a = atom<boolean>((get) => {
    const conv = get(conversationByIndex(index));
    return Array.isArray(conv?.messages) && conv.messages.length >= 1;
  });
  a.debugLabel = 'conversationHasMessagesByIndex';
  return a;
});

const presetByIndex = atomFamily((_param: string | number) => {
  const a = atom<TPreset | null>(null);
  a.debugLabel = 'presetByIndex';
  return a;
});

const textByIndex = atomFamily((_param: string | number) => {
  const a = atom<string>('');
  a.debugLabel = 'textByIndex';
  return a;
});

const showStopButtonByIndex = atomFamily((_param: string | number) => {
  const a = atom<boolean>(false);
  a.debugLabel = 'showStopButtonByIndex';
  return a;
});

const _abortScrollFamily = atomFamily((_param: string | number) => {
  const a = atom<boolean>(false);
  a.debugLabel = 'abortScrollFamily';
  return a;
});

type BoolUpdate = boolean | typeof RESET | ((prev: boolean) => boolean);

const abortScrollFamily = atomFamily((param: string | number) =>
  atom(
    (get) => get(_abortScrollFamily(param)),
    (get, set, update: BoolUpdate) => {
      if (update === RESET) {
        set(_abortScrollFamily(param), false);
        return;
      }
      const newValue = typeof update === 'function' ? update(get(_abortScrollFamily(param))) : update;
      logger.log('message_scrolling', 'Setting abortScrollByIndex', {
        key: param,
        newValue,
      });
      set(_abortScrollFamily(param), newValue);
    },
  ),
);

const _isSubmittingFamily = atomFamily((_param: string | number) => {
  const a = atom<boolean>(false);
  a.debugLabel = 'isSubmittingFamily';
  return a;
});

const isSubmittingFamily = atomFamily((param: string | number) =>
  atom(
    (get) => get(_isSubmittingFamily(param)),
    (get, set, update: BoolUpdate) => {
      if (update === RESET) {
        set(_isSubmittingFamily(param), false);
        return;
      }
      const newValue = typeof update === 'function' ? update(get(_isSubmittingFamily(param))) : update;
      logger.log('message_stream', 'Setting isSubmittingByIndex', {
        key: param,
        newValue,
      });
      set(_isSubmittingFamily(param), newValue);
    },
  ),
);

const anySubmittingSelector = atom<boolean>((get) => {
  const keys = get(conversationKeysAtom);
  return keys.some((key) => get(isSubmittingFamily(key)) === true);
});
anySubmittingSelector.debugLabel = 'anySubmittingSelector';

const optionSettingsFamily = atomFamily((_param: string | number) => {
  const a = atom<TOptionSettings>({});
  a.debugLabel = 'optionSettingsFamily';
  return a;
});

const showPopoverFamily = atomFamily((_param: string | number) => {
  const a = atom<boolean>(false);
  a.debugLabel = 'showPopoverFamily';
  return a;
});

const activePromptByIndex = atomFamily(
  (_param: string | number | null) => {
    const a = atom<string | undefined>(undefined);
    a.debugLabel = 'activePromptByIndex';
    return a;
  },
);

const showMentionPopoverFamily = atomFamily(
  (_param: string | number | null) => {
    const a = atom<boolean>(false);
    a.debugLabel = 'showMentionPopoverFamily';
    return a;
  },
);

/** Returns `endpointType ?? endpoint`, matching the effective endpoint used for feature gating. */
const effectiveEndpointByIndex = atomFamily((index: string | number) =>
  atom((get) => {
    const convo = get(conversationByIndex(index));
    return convo?.endpointType ?? convo?.endpoint ?? null;
  }),
);

const showPlusPopoverFamily = atomFamily(
  (_param: string | number | null) => {
    const a = atom<boolean>(false);
    a.debugLabel = 'showPlusPopoverFamily';
    return a;
  },
);

const showPromptsPopoverFamily = atomFamily(
  (_param: string | number | null) => {
    const a = atom<boolean>(false);
    a.debugLabel = 'showPromptsPopoverFamily';
    return a;
  },
);

const globalAudioURLFamily = atomFamily(
  (_param: string | number | null) => {
    const a = atom<string | null>(null);
    a.debugLabel = 'globalAudioURLFamily';
    return a;
  },
);

const globalAudioFetchingFamily = atomFamily(
  (_param: string | number | null) => {
    const a = atom<boolean>(false);
    a.debugLabel = 'globalAudioFetchingFamily';
    return a;
  },
);

const globalAudioPlayingFamily = atomFamily(
  (_param: string | number | null) => {
    const a = atom<boolean>(false);
    a.debugLabel = 'globalAudioPlayingFamily';
    return a;
  },
);

const activeRunFamily = atomFamily(
  (_param: string | number | null) => {
    const a = atom<string | null>(null);
    a.debugLabel = 'activeRunFamily';
    return a;
  },
);

const audioRunFamily = atomFamily(
  (_param: string | number | null) => {
    const a = atom<string | null>(null);
    a.debugLabel = 'audioRunFamily';
    return a;
  },
);

const showSkillsPopoverFamily = atomFamily((_param: string | number | null) => {
  const a = atom<boolean>(false);
  a.debugLabel = 'showSkillsPopoverFamily';
  return a;
});

/**
 * Per-conversation queue of skill names the user invoked manually via the
 * `$` popover for the next submission. Structured channel that the submit
 * pipeline (`useChatFunctions.ask`) drains and pins onto the user message's
 * `manualSkills` field (also echoed at the top of the payload for the
 * runtime resolver), then resets to `[]`. Compose-time chips above the
 * textarea read this atom directly so users see (and can dismiss) their
 * current selection before hitting send.
 */
const pendingManualSkillsByConvoId = atomFamily((_param: string) => {
  const a = atom<string[]>([]);
  a.debugLabel = 'pendingManualSkillsByConvoId';
  return a;
});

/**
 * Per-conversation queue of verbatim excerpts the user quoted via the
 * "Add to chat" selection popup for the next submission. The submit pipeline
 * (`useChatFunctions.ask`) drains this onto the user message's `quotes` field,
 * then resets to `[]`. Compose-time chips above the textarea read this atom
 * directly so users can see and dismiss each quote before sending.
 */
const pendingQuotesByConvoId = atomFamily((_param: string) => {
  const a = atom<string[]>([]);
  a.debugLabel = 'pendingQuotesByConvoId';
  return a;
});

const messagesSiblingIdxFamily = atomFamily((_param: string | null | undefined) => {
  const a = atom<number>(0);
  a.debugLabel = 'messagesSiblingIdxFamily';
  return a;
});

/**
 * A steer message submitted mid-run. Server truth: `sending` covers the POST
 * in flight, `pending` means the server queued it (awaiting a tool-batch
 * boundary), `failed` keeps the text recoverable after a rejected POST. The
 * chip disappears when `on_steer_applied` lands.
 */
export type PendingSteer = {
  steerId: string;
  text: string;
  status: 'sending' | 'pending' | 'failed';
  createdAt: number;
  files?: TMessage['files'];
  quotes?: string[];
  manualSkills?: string[];
};

const pendingSteersByConvoId = atomFamily((_param: string) => {
  const a = atom<PendingSteer[]>([]);
  a.debugLabel = 'pendingSteersByConvoId';
  return a;
});

/** A message composed during a run, queued to send after it finishes. */
export type QueuedMessage = {
  id: string;
  text: string;
  createdAt: number;
  files?: TMessage['files'];
  quotes?: string[];
  manualSkills?: string[];
  priority?: boolean;
};

const queuedMessagesByConvoId = atomFamily((_param: string) => {
  const a = atom<QueuedMessage[]>([]);
  a.debugLabel = 'queuedMessagesByConvoId';
  return a;
});

const pendingRunEndByConvoId = atomFamily((_param: string) => {
  const a = atom<RunEnd | null>(null);
  a.debugLabel = 'pendingRunEndByConvoId';
  return a;
});

/** One-shot run-termination signal consumed by `useQueueDrain`. */
export type RunEnd = {
  conversationId: string | null;
  outcome: 'completed' | 'aborted' | 'error';
  startedAsNewConvo?: boolean;
  endedAt: number;
  interruptArmed?: boolean;
};

const runEndByIndex = atomFamily((_param: string | number) => {
  const a = atom<RunEnd | null>(null);
  a.debugLabel = 'runEndByIndex';
  return a;
});

const drainAfterAbortByIndex = atomFamily((_param: string | number) => {
  const a = atom<boolean>(false);
  a.debugLabel = 'drainAfterAbortByIndex';
  return a;
});

const appliedSteerIdsByConvoId = atomFamily((_param: string) => {
  const a = atom<string[]>([]);
  a.debugLabel = 'appliedSteerIdsByConvoId';
  return a;
});

/** Setter-only access to the conversation atom: registers the key like
 * `useCreateConversationAtom` but never subscribes to the value, so callers
 * that only write (navigation, per-row actions) don't re-render on every
 * conversation update. */
function useSetConversationAtom(key: string | number) {
  const hasSetConversation = useSetConvoContext();
  const setKeys = useSetAtom(conversationKeysAtom);
  const setConversation = useSetAtom(conversationByIndex(key));

  useEffect(() => {
    setKeys((prevKeys) => {
      if (prevKeys.includes(key)) {
        return prevKeys;
      }
      return [...prevKeys, key];
    });
  }, [key, setKeys]);

  return { hasSetConversation, setConversation };
}

function useCreateConversationAtom(key: string | number) {
  const { hasSetConversation, setConversation } = useSetConversationAtom(key);
  const conversation = useAtomValue(conversationByIndex(key));

  return { hasSetConversation, conversation, setConversation };
}

function useClearConvoState() {
  const jotaiStore = useStore();

  const clearAllConversations = useCallback(
    (skipFirst?: boolean) => {
      const conversationKeys = jotaiStore.get(conversationKeysAtom);

      for (const conversationKey of conversationKeys) {
        if (skipFirst === true && conversationKey == 0) {
          continue;
        }

        jotaiStore.set(conversationByIndex(conversationKey), RESET);

        const conversation = jotaiStore.get(conversationByIndex(conversationKey));
        if (conversation) {
          jotaiStore.set(latestMessageFamily(conversationKey), RESET);
        }
      }

      jotaiStore.set(conversationKeysAtom, []);
    },
    [jotaiStore],
  );

  return clearAllConversations;
}

const conversationByKeySelector = conversationByIndex;

function useClearSubmissionState() {
  const jotaiStore = useStore();

  const clearAllSubmissions = useCallback(
    (skipFirst?: boolean) => {
      const submissionKeys = jotaiStore.get(submissionKeysSelector);
      logger.log('submissionKeys', submissionKeys);

      for (const key of submissionKeys) {
        if (skipFirst === true && key == 0) {
          continue;
        }

        logger.log('resetting submission', key);
        jotaiStore.set(submissionByIndex(key), null);
      }

      jotaiStore.set(submissionKeysSelector, []);
    },
    [jotaiStore],
  );

  return clearAllSubmissions;
}

function useClearLatestMessages(context?: string) {
  const jotaiStore = useStore();

  const clearAllLatestMessages = useCallback(
    (skipFirst?: boolean) => {
      const latestMessageKeys = jotaiStore.get(latestMessageKeysSelector);
      logger.log('[clearAllLatestMessages] latestMessageKeys', latestMessageKeys);
      if (context != null && context) {
        logger.log(`[clearAllLatestMessages] context: ${context}`);
      }

      for (const key of latestMessageKeys) {
        if (skipFirst === true && key == 0) {
          continue;
        }

        logger.log(`[clearAllLatestMessages] resetting latest message; key: ${key}`);
        jotaiStore.set(latestMessageFamily(key), RESET);
      }

      jotaiStore.set(latestMessageKeysSelector, []);
    },
    [jotaiStore],
  );

  return clearAllLatestMessages;
}

const updateConversationSelector = atomFamily((conversationId: string) =>
  atom(
    () => null as Partial<TConversation> | null,
    (get, set, newPartialConversation: Partial<TConversation>) => {
      const keys = get(conversationKeysAtom);
      keys.forEach((key) => {
        const prevConversation = get(conversationByIndex(key));
        if (prevConversation && prevConversation.conversationId === conversationId) {
          set(conversationByIndex(key), {
            ...prevConversation,
            ...newPartialConversation,
          });
        }
      });
    },
  ),
);

export default {
  conversationKeysAtom,
  conversationByIndex,
  filesByIndex,
  presetByIndex,
  submissionByIndex,
  submissionKeysAtom,
  submissionKeysSelector,
  textByIndex,
  showStopButtonByIndex,
  abortScrollFamily,
  isSubmittingFamily,
  optionSettingsFamily,
  showPopoverFamily,
  messagesSiblingIdxFamily,
  anySubmittingSelector,
  allConversationsSelector,
  conversationIdByIndex,
  conversationEndpointByIndex,
  effectiveEndpointByIndex,
  conversationModelByIndex,
  conversationSpecByIndex,
  conversationAgentIdByIndex,
  conversationAssistantIdByIndex,
  latestMessageFamily,
  latestMessageKeysAtom,
  latestMessageKeysSelector,
  latestMessageErrorFamily,
  latestMessageParentIdFamily,
  latestMessageIdFamily,
  conversationBookmarkInfoByIndex,
  conversationHasMessagesByIndex,
  conversationByKeySelector,
  useClearConvoState,
  useClearLatestMessages,
  useCreateConversationAtom,
  useSetConversationAtom,
  showMentionPopoverFamily,
  globalAudioURLFamily,
  activeRunFamily,
  audioRunFamily,
  globalAudioPlayingFamily,
  globalAudioFetchingFamily,
  showPlusPopoverFamily,
  activePromptByIndex,
  useClearSubmissionState,
  showPromptsPopoverFamily,
  showSkillsPopoverFamily,
  pendingManualSkillsByConvoId,
  pendingQuotesByConvoId,
  pendingSteersByConvoId,
  queuedMessagesByConvoId,
  runEndByIndex,
  pendingRunEndByConvoId,
  drainAfterAbortByIndex,
  appliedSteerIdsByConvoId,
  updateConversationSelector,
};
