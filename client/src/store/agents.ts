import { useCallback } from 'react';
import { atom, getDefaultStore } from 'jotai';
import { atomFamily } from 'jotai/utils';
import { Constants } from 'librechat-data-provider';
import type { TEphemeralAgent } from 'librechat-data-provider';
import { logger } from '~/utils';

const jotaiStore = getDefaultStore();

export const ephemeralAgentByConvoId = atomFamily((convId: string) => {
  const base = atom<TEphemeralAgent | null>(null);
  base.debugLabel = `ephemeralAgentByConvoId(${convId})`;
  base.onMount = (set) => {
    const unsub = jotaiStore.sub(base, () => {
      const newValue = jotaiStore.get(base);
      logger.log('agents', 'Setting ephemeral agent:', { conversationId: convId, newValue });
    });
    return unsub;
  };
  return base;
});

export function useUpdateEphemeralAgent() {
  const updateEphemeralAgent = useCallback(
    (convoId: string, agent: TEphemeralAgent | null) => {
      jotaiStore.set(ephemeralAgentByConvoId(convoId), agent);
    },
    [],
  );

  return updateEphemeralAgent;
}

/**
 * Creates a callback function to apply the ephemeral agent state
 * from the "new" conversation template to a specified conversation ID.
 */
export function useApplyNewAgentTemplate() {
  const applyTemplate = useCallback(
    (
      targetId: string,
      _sourceId: string | null = Constants.NEW_CONVO,
      ephemeralAgentState?: TEphemeralAgent | null,
    ) => {
      const sourceId = _sourceId || Constants.NEW_CONVO;
      logger.log('agents', `Attempting to apply template from "${sourceId}" to "${targetId}"`);

      if (targetId === sourceId) {
        logger.warn('agents', `Attempted to apply template to itself ("${sourceId}"). Skipping.`);
        return;
      }

      try {
        const agentTemplate =
          ephemeralAgentState ?? jotaiStore.get(ephemeralAgentByConvoId(sourceId));

        if (agentTemplate) {
          logger.log('agents', `Applying agent template to "${targetId}":`, agentTemplate);
          jotaiStore.set(ephemeralAgentByConvoId(targetId), agentTemplate);
        } else {
          logger.warn(
            'agents',
            `Agent template from "${sourceId}" is null or unset. Setting agent for "${targetId}" to null.`,
          );
          jotaiStore.set(ephemeralAgentByConvoId(targetId), null);
        }
      } catch (error) {
        logger.error(
          'agents',
          `Error applying agent template from "${sourceId}" to "${targetId}":`,
          error,
        );
        jotaiStore.set(ephemeralAgentByConvoId(targetId), null);
      }
    },
    [],
  );

  return applyTemplate;
}

/**
 * Creates a callback function to get the current ephemeral agent state
 * for a specified conversation ID without subscribing the component.
 */
export function useGetEphemeralAgent() {
  const getEphemeralAgent = useCallback(
    (conversationId: string): TEphemeralAgent | null => {
      logger.log('agents', `[useGetEphemeralAgent] Getting loadable for ID: ${conversationId}`);
      return jotaiStore.get(ephemeralAgentByConvoId(conversationId));
    },
    [],
  );

  return getEphemeralAgent;
}
