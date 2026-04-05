import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { useAtomValue } from 'jotai';
import type { EModelEndpoint, TConversation } from 'librechat-data-provider';
import type { ConvoGenerator } from '~/common';
import { useGetConversation, useNewConvo } from '~/hooks';
import store from '~/store';

interface ModelSelectorChatContextValue {
  endpoint?: EModelEndpoint | null;
  model?: string | null;
  spec?: string | null;
  agent_id?: string | null;
  assistant_id?: string | null;
  getConversation: () => TConversation | null;
  newConversation: ConvoGenerator;
}

const ModelSelectorChatContext = createContext<ModelSelectorChatContextValue | undefined>(
  undefined,
);

export function ModelSelectorChatProvider({ children }: { children: React.ReactNode }) {
  const getConversation = useGetConversation(0);
  const { newConversation: nextNewConversation } = useNewConvo();

  const spec = useAtomValue(store.conversationSpecByIndex(0));
  const model = useAtomValue(store.conversationModelByIndex(0));
  const agent_id = useAtomValue(store.conversationAgentIdByIndex(0));
  const endpoint = useAtomValue(store.conversationEndpointByIndex(0));
  const assistant_id = useAtomValue(store.conversationAssistantIdByIndex(0));

  const newConversationRef = useRef(nextNewConversation);
  newConversationRef.current = nextNewConversation;
  const newConversation = useCallback<ConvoGenerator>(
    (params) => newConversationRef.current(params),
    [],
  );

  /** Context value only created when relevant conversation properties change */
  const contextValue = useMemo<ModelSelectorChatContextValue>(
    () => ({
      model,
      spec,
      agent_id,
      endpoint,
      assistant_id,
      getConversation,
      newConversation,
    }),
    [endpoint, model, spec, agent_id, assistant_id, getConversation, newConversation],
  );

  return (
    <ModelSelectorChatContext.Provider value={contextValue}>
      {children}
    </ModelSelectorChatContext.Provider>
  );
}

export function useModelSelectorChatContext() {
  const context = useContext(ModelSelectorChatContext);
  if (!context) {
    throw new Error('useModelSelectorChatContext must be used within ModelSelectorChatProvider');
  }
  return context;
}
