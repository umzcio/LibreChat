import { QueryKeys, MutationKeys, dataService } from 'librechat-data-provider';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import type {
  UseQueryOptions,
  UseMutationOptions,
  QueryObserverResult,
} from '@tanstack/react-query';
import type {
  TProject,
  TProjectListResponse,
  TCreateProjectRequest,
  TUpdateProjectRequest,
} from 'librechat-data-provider';

export const useListProjectsQuery = (
  params?: { isArchived?: boolean; search?: string },
  config?: UseQueryOptions<TProjectListResponse>,
): QueryObserverResult<TProjectListResponse> => {
  return useQuery<TProjectListResponse>(
    [QueryKeys.projects, params],
    () => dataService.listProjects(params),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      ...config,
    },
  );
};

export const useGetProjectQuery = (
  projectId: string,
  config?: UseQueryOptions<TProject>,
): QueryObserverResult<TProject> => {
  return useQuery<TProject>(
    [QueryKeys.project, projectId],
    () => dataService.getProject(projectId),
    {
      enabled: !!projectId,
      refetchOnWindowFocus: false,
      ...config,
    },
  );
};

export const useCreateProjectMutation = (
  options?: UseMutationOptions<TProject, Error, TCreateProjectRequest>,
) => {
  const queryClient = useQueryClient();
  return useMutation<TProject, Error, TCreateProjectRequest>(
    [MutationKeys.createProject],
    (data: TCreateProjectRequest) => dataService.createProject(data),
    {
      ...options,
      onSuccess: (...params) => {
        queryClient.invalidateQueries([QueryKeys.projects]);
        options?.onSuccess?.(...params);
      },
    },
  );
};

export const useUpdateProjectMutation = (
  options?: UseMutationOptions<TProject, Error, { projectId: string; data: TUpdateProjectRequest }>,
) => {
  const queryClient = useQueryClient();
  return useMutation<TProject, Error, { projectId: string; data: TUpdateProjectRequest }>(
    [MutationKeys.updateProject],
    ({ projectId, data }) => dataService.updateProject(projectId, data),
    {
      ...options,
      onSuccess: (...params) => {
        queryClient.invalidateQueries([QueryKeys.projects]);
        queryClient.invalidateQueries([QueryKeys.project]);
        options?.onSuccess?.(...params);
      },
    },
  );
};

export const useDeleteProjectMutation = (
  options?: UseMutationOptions<{ message: string }, Error, string>,
) => {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, Error, string>(
    [MutationKeys.deleteProject],
    (projectId: string) => dataService.deleteProject(projectId),
    {
      ...options,
      onSuccess: (...params) => {
        queryClient.invalidateQueries([QueryKeys.projects]);
        options?.onSuccess?.(...params);
      },
    },
  );
};

export const useAssignConversationsMutation = (
  options?: UseMutationOptions<
    { message: string },
    Error,
    { projectId: string; conversationIds: string[] }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation<
    { message: string },
    Error,
    { projectId: string; conversationIds: string[] }
  >(
    ({ projectId, conversationIds }) =>
      dataService.assignConversationsToProject(projectId, conversationIds),
    {
      ...options,
      onSuccess: (...params) => {
        queryClient.invalidateQueries([QueryKeys.allConversations]);
        queryClient.invalidateQueries([QueryKeys.projects]);
        options?.onSuccess?.(...params);
      },
    },
  );
};
