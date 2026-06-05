import { QueryKeys, MutationKeys, dataService } from 'librechat-data-provider';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import type {
  UseQueryOptions,
  UseMutationOptions,
  QueryObserverResult,
} from '@tanstack/react-query';
import type {
  TZdock,
  TZdockListResponse,
  TCreateZdockRequest,
  TUpdateZdockRequest,
  ConversationListResponse,
} from 'librechat-data-provider';

export const useListZdocksQuery = (
  params?: { isArchived?: boolean; search?: string },
  config?: UseQueryOptions<TZdockListResponse>,
): QueryObserverResult<TZdockListResponse> => {
  return useQuery<TZdockListResponse>(
    [QueryKeys.zdocks, params],
    () => dataService.listZdocks(params),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      ...config,
    },
  );
};

export const useGetZdockQuery = (
  zdockId: string,
  config?: UseQueryOptions<TZdock>,
): QueryObserverResult<TZdock> => {
  return useQuery<TZdock>(
    [QueryKeys.zdock, zdockId],
    () => dataService.getZdock(zdockId),
    {
      enabled: !!zdockId,
      refetchOnWindowFocus: false,
      ...config,
    },
  );
};

export const useCreateZdockMutation = (
  options?: UseMutationOptions<TZdock, Error, TCreateZdockRequest>,
) => {
  const queryClient = useQueryClient();
  return useMutation<TZdock, Error, TCreateZdockRequest>(
    [MutationKeys.createZdock],
    (data: TCreateZdockRequest) => dataService.createZdock(data),
    {
      ...options,
      onSuccess: (...params) => {
        queryClient.invalidateQueries([QueryKeys.zdocks]);
        options?.onSuccess?.(...params);
      },
    },
  );
};

export const useUpdateZdockMutation = (
  options?: UseMutationOptions<TZdock, Error, { zdockId: string; data: TUpdateZdockRequest }>,
) => {
  const queryClient = useQueryClient();
  return useMutation<TZdock, Error, { zdockId: string; data: TUpdateZdockRequest }>(
    [MutationKeys.updateZdock],
    ({ zdockId, data }) => dataService.updateZdock(zdockId, data),
    {
      ...options,
      onSuccess: (...params) => {
        queryClient.invalidateQueries([QueryKeys.zdocks]);
        queryClient.invalidateQueries([QueryKeys.zdock]);
        options?.onSuccess?.(...params);
      },
    },
  );
};

export const useDeleteZdockMutation = (
  options?: UseMutationOptions<{ message: string }, Error, string>,
) => {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, Error, string>(
    [MutationKeys.deleteZdock],
    (zdockId: string) => dataService.deleteZdock(zdockId),
    {
      ...options,
      onSuccess: (...params) => {
        queryClient.invalidateQueries([QueryKeys.zdocks]);
        options?.onSuccess?.(...params);
      },
    },
  );
};

export const useGetZdockConversationsQuery = (
  zdockId: string,
  config?: UseQueryOptions<ConversationListResponse>,
): QueryObserverResult<ConversationListResponse> => {
  return useQuery<ConversationListResponse>(
    [QueryKeys.zdockConversations, zdockId],
    () => dataService.getZdockConversations(zdockId),
    {
      enabled: !!zdockId,
      refetchOnWindowFocus: false,
      ...config,
    },
  );
};

export const useAssignConversationsToZdockMutation = (
  options?: UseMutationOptions<
    { message: string },
    Error,
    { zdockId: string; conversationIds: string[] }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation<
    { message: string },
    Error,
    { zdockId: string; conversationIds: string[] }
  >(
    ({ zdockId, conversationIds }) =>
      dataService.assignConversationsToProject(zdockId, conversationIds),
    {
      ...options,
      onSuccess: (...params) => {
        queryClient.invalidateQueries([QueryKeys.allConversations]);
        queryClient.invalidateQueries([QueryKeys.zdocks]);
        options?.onSuccess?.(...params);
      },
    },
  );
};
