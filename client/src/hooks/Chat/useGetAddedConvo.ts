import { useCallback } from 'react';
import { useStore } from 'jotai';
import store from '~/store';

export default function useGetAddedConvo() {
  const jotaiStore = useStore();
  return useCallback(
    () => jotaiStore.get(store.conversationByKeySelector(1)),
    [jotaiStore],
  );
}
