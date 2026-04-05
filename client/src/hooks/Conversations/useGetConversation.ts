import { useCallback } from 'react';
import { useStore } from 'jotai';
import type { TConversation } from 'librechat-data-provider';
import store from '~/store';

export default function useGetConversation(index: string | number = 0) {
  const jotaiStore = useStore();
  return useCallback(
    () => jotaiStore.get(store.conversationByKeySelector(index)) as TConversation | null,
    [jotaiStore, index],
  );
}
