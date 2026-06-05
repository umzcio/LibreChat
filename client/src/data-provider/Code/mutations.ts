import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MutationKeys, QueryKeys, dataService } from 'librechat-data-provider';
import type { UseMutationOptions } from '@tanstack/react-query';
import type { TCodeWorkspaceSession } from 'librechat-data-provider';

function invalidateWorkspaceQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
) {
  queryClient.invalidateQueries([QueryKeys.codeSession, conversationId]);
  queryClient.invalidateQueries([QueryKeys.codeFiles, conversationId]);
  queryClient.invalidateQueries([QueryKeys.codeChanges, conversationId]);
  queryClient.invalidateQueries([QueryKeys.codeDiff, conversationId]);
}

export const useUpdateCodeWorkspaceSessionMutation = (
  options?: UseMutationOptions<
    Pick<TCodeWorkspaceSession, 'activeFile' | 'conversationId' | 'mode' | 'openFiles'>,
    Error,
    {
      activeFile?: string;
      conversationId: string;
      openFiles?: string[];
    }
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation(
    [MutationKeys.updateZdock, 'code-session'],
    (payload: { activeFile?: string; conversationId: string; openFiles?: string[] }) =>
      dataService.updateCodeWorkspaceSession(payload),
    {
      ...options,
      onSuccess: (data, variables, context) => {
        invalidateWorkspaceQueries(queryClient, variables.conversationId);
        options?.onSuccess?.(data, variables, context);
      },
    },
  );
};

export const useSaveCodeFileContentMutation = (
  options?: UseMutationOptions<
    { path: string; saved: boolean },
    Error,
    { content: string; conversationId: string; path: string }
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation(
    [MutationKeys.updateZdock, 'code-file'],
    (payload: { content: string; conversationId: string; path: string }) =>
      dataService.saveCodeFileContent(payload),
    {
      ...options,
      onSuccess: (data, variables, context) => {
        invalidateWorkspaceQueries(queryClient, variables.conversationId);
        options?.onSuccess?.(data, variables, context);
      },
    },
  );
};

export const useCreateCodeItemMutation = (
  options?: UseMutationOptions<
    { created: boolean; path: string; type: 'directory' | 'file' },
    Error,
    { conversationId: string; path: string; type: 'directory' | 'file' }
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation(
    [MutationKeys.updateZdock, 'code-create'],
    (payload: { conversationId: string; path: string; type: 'directory' | 'file' }) =>
      dataService.createCodeFile(payload),
    {
      ...options,
      onSuccess: (data, variables, context) => {
        invalidateWorkspaceQueries(queryClient, variables.conversationId);
        options?.onSuccess?.(data, variables, context);
      },
    },
  );
};

export const useDeleteCodeItemMutation = (
  options?: UseMutationOptions<
    { deleted: boolean; path: string },
    Error,
    { conversationId: string; path: string }
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation(
    [MutationKeys.updateZdock, 'code-delete'],
    (payload: { conversationId: string; path: string }) =>
      dataService.deleteCodeFile(payload.conversationId, payload.path),
    {
      ...options,
      onSuccess: (data, variables, context) => {
        invalidateWorkspaceQueries(queryClient, variables.conversationId);
        options?.onSuccess?.(data, variables, context);
      },
    },
  );
};

export const useRenameCodeItemMutation = (
  options?: UseMutationOptions<
    { newPath: string; path: string; renamed: true },
    Error,
    { conversationId: string; path: string; newPath: string }
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation(
    [MutationKeys.updateZdock, 'code-rename'],
    (payload: { conversationId: string; path: string; newPath: string }) =>
      dataService.renameCodeFile(payload),
    {
      ...options,
      onSuccess: (data, variables, context) => {
        invalidateWorkspaceQueries(queryClient, variables.conversationId);
        options?.onSuccess?.(data, variables, context);
      },
    },
  );
};

export const useApplyCodeChangesMutation = (
  options?: UseMutationOptions<
    TCodeWorkspaceSession,
    Error,
    {
      conversationId: string;
      paths?: string[];
    }
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation(
    [MutationKeys.updateZdock, 'code-apply'],
    (payload: { conversationId: string; paths?: string[] }) => dataService.applyCodeChanges(payload),
    {
      ...options,
      onSuccess: (data, variables, context) => {
        invalidateWorkspaceQueries(queryClient, variables.conversationId);
        if (data.zdockId) {
          queryClient.invalidateQueries([QueryKeys.zdockFiles, data.zdockId]);
        }
        options?.onSuccess?.(data, variables, context);
      },
    },
  );
};

export const useDiscardCodeChangesMutation = (
  options?: UseMutationOptions<
    { discarded: boolean },
    Error,
    {
      conversationId: string;
      paths?: string[];
    }
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation(
    [MutationKeys.updateZdock, 'code-discard'],
    (payload: { conversationId: string; paths?: string[] }) =>
      dataService.discardCodeChanges(payload),
    {
      ...options,
      onSuccess: (data, variables, context) => {
        invalidateWorkspaceQueries(queryClient, variables.conversationId);
        options?.onSuccess?.(data, variables, context);
      },
    },
  );
};

export const usePromoteCodeWorkspaceMutation = (
  options?: UseMutationOptions<
    TCodeWorkspaceSession,
    Error,
    {
      conversationId: string;
      zdockId?: string;
      projectName?: string;
    }
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation(
    [MutationKeys.updateZdock, 'code-promote'],
    (payload: { conversationId: string; zdockId?: string; projectName?: string }) =>
      dataService.promoteCodeWorkspace(payload),
    {
      ...options,
      onSuccess: (data, variables, context) => {
        invalidateWorkspaceQueries(queryClient, variables.conversationId);
        if (data.zdockId) {
          queryClient.invalidateQueries([QueryKeys.zdock, data.zdockId]);
          queryClient.invalidateQueries([QueryKeys.zdockFiles, data.zdockId]);
          queryClient.invalidateQueries([QueryKeys.zdockConversations, data.zdockId]);
        }
        queryClient.invalidateQueries([QueryKeys.conversation, variables.conversationId]);
        queryClient.invalidateQueries([QueryKeys.allConversations]);
        options?.onSuccess?.(data, variables, context);
      },
    },
  );
};
