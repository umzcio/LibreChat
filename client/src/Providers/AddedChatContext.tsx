import { createContext, useContext } from 'react';
import type { TConversation } from 'librechat-data-provider';
import type { ConvoGenerator, AtomSetter } from '~/common';

type TAddedChatContext = {
  conversation: TConversation | null;
  setConversation: AtomSetter<TConversation | null>;
  generateConversation: ConvoGenerator;
};

export const AddedChatContext = createContext<TAddedChatContext>({} as TAddedChatContext);
export const useAddedChatContext = () => useContext(AddedChatContext);
