import { useEffect, useCallback } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useToastContext } from '@librechat/client';
import { useParams, useSearchParams } from 'react-router-dom';
import { Constants, EModelEndpoint } from 'librechat-data-provider';
import { useGetModelsQuery } from 'librechat-data-provider/react-query';
import type { TConversation, TPreset } from 'librechat-data-provider';
import {
  mergeQuerySettingsWithSpec,
  processValidSettings,
  getDefaultModelSpec,
  getModelSpecPreset,
  isNotFoundError,
  logger,
} from '~/utils';
import {
  useAssistantListMap,
  useIdChangeEffect,
  useAppStartup,
  useNewConvo,
  useLocalize,
} from '~/hooks';
import { useGetConvoIdQuery, useGetStartupConfig, useGetEndpointsQuery } from '~/data-provider';
import { NotificationSeverity } from '~/common';
import useAuthRedirect from './useAuthRedirect';
import temporaryStore from '~/store/temporary';
import store from '~/store';

export default function useConversationRoute(index = 0) {
  const { data: startupConfig } = useGetStartupConfig();
  const { isAuthenticated, user, roles } = useAuthRedirect();

  const defaultTemporaryChat = useAtomValue(temporaryStore.defaultTemporaryChat);
  const setIsTemporary = useSetAtom(temporaryStore.isTemporary);

  useAppStartup({ startupConfig, user });

  const [searchParams] = useSearchParams();
  const { conversationId = '', zdockId } = useParams();
  useIdChangeEffect(conversationId);
  const { hasSetConversation, conversation } = store.useCreateConversationAtom(index);
  const { newConversation } = useNewConvo();
  const localize = useLocalize();
  const { showToast } = useToastContext();

  const modelsQuery = useGetModelsQuery({
    enabled: isAuthenticated,
    refetchOnMount: 'always',
  });
  const initialConvoQuery = useGetConvoIdQuery(conversationId, {
    enabled:
      isAuthenticated && conversationId !== Constants.NEW_CONVO && !hasSetConversation.current,
  });
  const endpointsQuery = useGetEndpointsQuery({ enabled: isAuthenticated });
  const assistantListMap = useAssistantListMap();

  const isTemporaryChat = conversation && conversation.expiredAt ? true : false;

  useEffect(() => {
    if (conversationId === Constants.NEW_CONVO) {
      setIsTemporary(defaultTemporaryChat);
    } else if (isTemporaryChat) {
      setIsTemporary(isTemporaryChat);
    } else {
      setIsTemporary(false);
    }
  }, [conversationId, isTemporaryChat, setIsTemporary, defaultTemporaryChat]);

  useEffect(() => {
    const rolesLoaded = roles?.USER != null;
    const shouldSetConvo =
      (startupConfig && rolesLoaded && !hasSetConversation.current && !modelsQuery.data?.initial) ??
      false;

    if (!shouldSetConvo) {
      return;
    }

    const isNewConvo = conversationId === Constants.NEW_CONVO;

    const getNewConvoPreset = () => {
      const result = getDefaultModelSpec(startupConfig);
      const spec = result?.default ?? result?.last;
      const specPreset = spec ? getModelSpecPreset(spec) : undefined;
      const queryParams: Record<string, string> = {};

      searchParams.forEach((value, key) => {
        if (key !== 'prompt' && key !== 'q' && key !== 'submit') {
          queryParams[key] = value;
        }
      });

      const querySettings = processValidSettings(queryParams);
      return Object.keys(querySettings).length > 0
        ? mergeQuerySettingsWithSpec(specPreset, querySettings)
        : specPreset;
    };

    if (isNewConvo && endpointsQuery.data && modelsQuery.data) {
      const preset = getNewConvoPreset();
      const convoTemplate = conversation
        ? { ...conversation, ...(zdockId ? { zdockId } : {}) }
        : zdockId
          ? ({ zdockId } as Partial<TConversation>)
          : undefined;

      newConversation({
        modelsData: modelsQuery.data,
        template: convoTemplate,
        ...(preset ? { preset } : {}),
      });

      hasSetConversation.current = true;
      return;
    }

    if (initialConvoQuery.data && endpointsQuery.data && modelsQuery.data) {
      newConversation({
        keepLatestMessage: true,
        modelsData: modelsQuery.data,
        preset: initialConvoQuery.data as TPreset,
        template: { ...initialConvoQuery.data, ...(zdockId ? { zdockId } : {}) },
      });
      hasSetConversation.current = true;
      return;
    }

    if (
      conversationId &&
      endpointsQuery.data &&
      modelsQuery.data &&
      initialConvoQuery.isError &&
      isNotFoundError(initialConvoQuery.error)
    ) {
      const result = getDefaultModelSpec(startupConfig);
      const spec = result?.default ?? result?.last;

      showToast?.({
        message: localize('com_ui_conversation_not_found'),
        severity: NotificationSeverity.WARNING,
      });

      logger.log(
        'conversation',
        'useConversationRoute initialConvoQuery isNotFoundError',
        initialConvoQuery.error,
      );

      newConversation({
        modelsData: modelsQuery.data,
        ...(spec ? { preset: getModelSpecPreset(spec) } : {}),
      });
      hasSetConversation.current = true;
      return;
    }

    if (
      isNewConvo &&
      assistantListMap[EModelEndpoint.assistants] &&
      assistantListMap[EModelEndpoint.azureAssistants]
    ) {
      const preset = getNewConvoPreset();

      newConversation({
        modelsData: modelsQuery.data,
        template: conversation
          ? { ...conversation, ...(zdockId ? { zdockId } : {}) }
          : zdockId
            ? ({ zdockId } as Partial<TConversation>)
            : undefined,
        ...(preset ? { preset } : {}),
      });
      hasSetConversation.current = true;
      return;
    }

    if (
      assistantListMap[EModelEndpoint.assistants] &&
      assistantListMap[EModelEndpoint.azureAssistants]
    ) {
      newConversation({
        keepLatestMessage: true,
        modelsData: modelsQuery.data,
        preset: initialConvoQuery.data as TPreset,
        template: initialConvoQuery.data,
      });
      hasSetConversation.current = true;
    }
  }, [
    roles,
    startupConfig,
    initialConvoQuery.data,
    initialConvoQuery.isError,
    endpointsQuery.data,
    modelsQuery.data,
    assistantListMap,
  ]);

  const isLoading = endpointsQuery.isLoading || modelsQuery.isLoading;
  const isConversationReady =
    !!conversationId &&
    conversation?.conversationId !== Constants.SEARCH &&
    (conversation?.conversationId === conversationId || !!conversation);

  return {
    conversation,
    conversationId,
    hasSetConversation,
    initialConvoQuery,
    isAuthenticated,
    isConversationReady,
    isLoading,
    zdockId,
  };
}
