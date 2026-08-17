import { useEffect, useCallback } from 'react';
import { atom } from 'jotai';
import { useStore, useAtomValue, useSetAtom } from 'jotai';
import { createSearchParams } from 'react-router-dom';
import { atomFamily, selectAtom, RESET } from 'jotai/utils';
import { LocalStorageKeys, isEphemeralAgentId, Constants } from 'librechat-data-provider';
import type { EModelEndpoint, TConversation, TMessage, TSubmission, TPreset } from 'librechat-data-provider';
import type { GenerationProtocolVersion } from '~/data-provider/SSE/protocol';
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
        /** Mirror, not navigation: Back-worthy entries are minted by real
         * `navigate()` calls (useNewConvo), and in-place writers like
         * ProjectLandingChip deliberately replace. Pushing here buried the
         * Back target under one inert entry per draft edit. */
        window.history.replaceState({}, '', url);
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
 * in flight, `pending` means the server queued it (awaiting its injection
 * boundary — the next tool batch, or the next safe token boundary when
 * `preempt` was armed), `failed` keeps the text recoverable after a rejected
 * POST. The chip disappears when `on_steer_applied` lands (the inline content
 * part becomes the durable record).
 */
export type PendingSteer = {
  steerId: string;
  /** Optimistic id echoed by server state when SYNC beats the POST callback. */
  clientSteerId?: string;
  text: string;
  status: 'sending' | 'pending' | 'failed';
  /** The transport failed without a definitive server rejection. The durable
   * enqueue may have committed. Same-id Retry is safe only under protocol v2;
   * edit/queue/remove stay hidden until ownership is resolved. */
  deliveryUncertain?: boolean;
  /** Protocol selected for the generation that owns this attempt. */
  generationProtocolVersion?: GenerationProtocolVersion;
  createdAt: number;
  files?: TMessage['files'];
  quotes?: string[];
  manualSkills?: string[];
  /** Asked the run to seal generation at the next safe boundary rather than
   *  wait for a tool step. Labelling only — the server owns the behaviour and
   *  echoes what it actually armed. */
  preempt?: boolean;
  /** Monotonic server revision; delayed ACKs cannot undo SSE corrections. */
  preemptRevision?: number;
  /** Exact server generation this steer belongs to. Conversation ids are
   * reused by later turns, so retries/arm/cancel must retain this epoch rather
   * than mutating whatever generation currently occupies the conversation. */
  generationCreatedAt?: number;
  /** Exact client queue identity/order to restore if this accepted steer is
   *  returned as a terminal leftover before injection. */
  queuedOrigin?: QueuedMessageOrigin;
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
  /** Stable only for this queued recovery attempt and its transport retries.
   * A failed generation re-converts the durable source with a fresh key. */
  clientRequestId?: string;
  /** Correlation used only to durably dismiss/reclaim the parked source. */
  recoveryClientSteerId?: string;
  recoverySteerId?: string;
  /** Generation observed before this queued follow-up became eligible. */
  expectedPredecessorCreatedAt?: number;
  files?: TMessage['files'];
  quotes?: string[];
  manualSkills?: string[];
  priority?: boolean;
};

/** Snapshot of a queued item's logical position while it is temporarily sent
 * into a live run. Neighbour ids make restoration resilient to concurrent
 * drains and sends without minting a replacement item. */
export type QueuedMessageOrigin = {
  item: QueuedMessage;
  beforeIds: string[];
  afterIds: string[];
};

/**
 * Per-conversation client-side queue of follow-up messages. Drained one per
 * run completion by `useQueueDrain` (each dequeued message starts a normal
 * turn whose own final event drains the next).
 */
const queuedMessagesByConvoId = atomFamily((_param: string) => {
  const a = atom<QueuedMessage[]>([]);
  a.debugLabel = 'queuedMessagesByConvoId';
  return a;
});

/**
 * One-shot run-termination signal written by the SSE final/error handlers and
 * consumed (reset to null) by `useQueueDrain`. Keyed by chat index like
 * `isSubmittingFamily`. Carrying the outcome lets the drain skip auto-send on
 * user aborts/errors while `startedAsNewConvo` migrates a queue keyed under
 * `Constants.NEW_CONVO` to the real conversation id.
 */
export type RunEnd = {
  conversationId: string | null;
  outcome: 'completed' | 'aborted' | 'error';
  startedAsNewConvo?: boolean;
  endedAt: number;
  /** Exact terminal epoch whose idle transition may release one queued start. */
  generationCreatedAt?: number;
  /** Armed "Interrupt & send" flag traveling with a PARKED signal, so
   *  another run on the same pane can neither consume nor clear it. */
  interruptArmed?: boolean;
};

type RunEndUpdate = RunEnd | null | typeof RESET;

/** A pane can receive A's terminal frame after the user has navigated to and
 * started B. Keep each terminal epoch until the queue drain has either parked
 * or consumed it; a single replaceable slot loses A when B finishes first. */
const runEndsByIndex = atomFamily((_param: string | number) => {
  const a = atom<RunEnd[]>([]);
  a.debugLabel = 'runEndsByIndex';
  return a;
});

/** Preserve the original nullable one-shot API for stream writers while the
 * backing state retains every not-yet-consumed terminal epoch. Writing null
 * consumes only the visible (oldest) signal; RESET clears all. */
const runEndByIndex = atomFamily((index: string | number) =>
  atom(
    (get) => get(runEndsByIndex(index))[0] ?? null,
    (get, set, value: RunEndUpdate) => {
      if (value === RESET) {
        set(runEndsByIndex(index), []);
        return;
      }
      if (value == null) {
        set(runEndsByIndex(index), (prev) => prev.slice(1));
        return;
      }
      set(runEndsByIndex(index), (prev) => [...prev, value]);
    },
  ),
);

/** Foreign terminal epochs are moved off the shared pane immediately. This
 * per-conversation carrier is queued for the same reason as the pane carrier:
 * successive epochs cannot overwrite one another while the chat is hidden. */
const pendingRunEndsByConvoId = atomFamily((_param: string) => {
  const a = atom<RunEnd[]>([]);
  a.debugLabel = 'pendingRunEndsByConvoId';
  return a;
});

const pendingRunEndByConvoId = atomFamily((conversationId: string) =>
  atom(
    (get) => get(pendingRunEndsByConvoId(conversationId))[0] ?? null,
    (get, set, value: RunEndUpdate) => {
      if (value === RESET) {
        set(pendingRunEndsByConvoId(conversationId), []);
        return;
      }
      if (value == null) {
        set(pendingRunEndsByConvoId(conversationId), (prev) => prev.slice(1));
        return;
      }
      set(pendingRunEndsByConvoId(conversationId), (prev) => [...prev, value]);
    },
  ),
);

export type DrainAfterAbort = {
  conversationId: string;
  generationCreatedAt: number;
};

/**
 * One-shot override armed by "interrupt & send": the next `aborted` run-end
 * for the exact conversation generation drains the queue exactly once (a
 * plain Stop press leaves queued chips for manual send). `false` remains the
 * clear value used by stream reconciliation paths.
 */
const drainAfterAbortByIndex = atomFamily((_param: string | number) => {
  const a = atom<DrainAfterAbort | false>(false);
  a.debugLabel = 'drainAfterAbortByIndex';
  return a;
});

/**
 * Server steer ids whose `on_steer_applied` event already landed. The 202 ACK
 * and the SSE ride different connections, so the applied event can arrive
 * FIRST — the ACK handler checks this set and drops its local chip instead of
 * minting a `pending` chip whose only removal event has already passed. A late
 * ACK can land after the run's final event, so the set is capped, never cleared.
 */
const appliedSteerIdsByConvoId = atomFamily((_param: string) => {
  const a = atom<string[]>([]);
  a.debugLabel = 'appliedSteerIdsByConvoId';
  return a;
});

/** Optimistic ids the server has proven accepted via ACK or SYNC. Separate
 * from `appliedSteerIdsByConvoId`: accepted-but-still-queued steers must not
 * be suppressed by terminal conversion, but a late POST error must not
 * resurrect them after Cancel/Edit/Convert removes the visible chip. */
const acceptedSteerClientIdsByConvoId = atomFamily((_param: string) => {
  const a = atom<string[]>([]);
  a.debugLabel = 'acceptedSteerClientIdsByConvoId';
  return a;
});

/** Server generation epoch currently attached for each conversation. Stream
 * ids are conversation-scoped and reused by later turns; every mutation that
 * can affect a live run carries this value as an optimistic concurrency fence. */
const activeGenerationCreatedAtByConvoId = atomFamily((_param: string) => {
  const a = atom<number | null>(null);
  a.debugLabel = 'activeGenerationCreatedAtByConvoId';
  return a;
});

/** Negotiated behavior contract for the active generation. Missing echoes are
 * legacy by definition, so the safe default is always v1. */
const activeGenerationProtocolVersionByConvoId = atomFamily((_param: string) => {
  const a = atom<GenerationProtocolVersion>(1);
  a.debugLabel = 'activeGenerationProtocolVersionByConvoId';
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
  acceptedSteerClientIdsByConvoId,
  activeGenerationCreatedAtByConvoId,
  activeGenerationProtocolVersionByConvoId,
  updateConversationSelector,
};
