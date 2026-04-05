import { useQuery } from '@tanstack/react-query';
import { QueryKeys, dataService } from 'librechat-data-provider';
import type { UseQueryOptions, QueryObserverResult } from '@tanstack/react-query';
import type {
  TCodeChangesResponse,
  TCodeDiff,
  TCodeDirectoryResponse,
  TCodeFileResponse,
  TCodeWorkspaceSession,
} from 'librechat-data-provider';

export const useCodeWorkspaceSessionQuery = (
  conversationId: string,
  config?: UseQueryOptions<TCodeWorkspaceSession>,
): QueryObserverResult<TCodeWorkspaceSession> => {
  return useQuery<TCodeWorkspaceSession>(
    [QueryKeys.codeSession, conversationId],
    () => dataService.getCodeWorkspaceSession(conversationId),
    {
      enabled: !!conversationId,
      refetchOnWindowFocus: false,
      ...config,
    },
  );
};

export const useCodeFilesQuery = (
  conversationId: string,
  filePath = '/',
  config?: UseQueryOptions<TCodeDirectoryResponse>,
): QueryObserverResult<TCodeDirectoryResponse> => {
  return useQuery<TCodeDirectoryResponse>(
    [QueryKeys.codeFiles, conversationId, filePath],
    () => dataService.listCodeFiles(conversationId, filePath),
    {
      enabled: !!conversationId,
      refetchOnWindowFocus: false,
      ...config,
    },
  );
};

export const useCodeFileContentQuery = (
  conversationId: string,
  filePath: string,
  config?: UseQueryOptions<TCodeFileResponse>,
): QueryObserverResult<TCodeFileResponse> => {
  return useQuery<TCodeFileResponse>(
    [QueryKeys.codeFiles, conversationId, 'content', filePath],
    () => dataService.getCodeFileContent(conversationId, filePath),
    {
      enabled: !!conversationId && !!filePath,
      refetchOnWindowFocus: false,
      ...config,
    },
  );
};

export const useCodeChangesQuery = (
  conversationId: string,
  config?: UseQueryOptions<TCodeChangesResponse>,
): QueryObserverResult<TCodeChangesResponse> => {
  return useQuery<TCodeChangesResponse>(
    [QueryKeys.codeChanges, conversationId],
    () => dataService.getCodeChanges(conversationId),
    {
      enabled: !!conversationId,
      refetchOnWindowFocus: false,
      ...config,
    },
  );
};

export const useCodeDiffQuery = (
  conversationId: string,
  filePath: string,
  config?: UseQueryOptions<TCodeDiff>,
): QueryObserverResult<TCodeDiff> => {
  return useQuery<TCodeDiff>(
    [QueryKeys.codeDiff, conversationId, filePath],
    () => dataService.getCodeDiff(conversationId, filePath),
    {
      enabled: !!conversationId && !!filePath,
      refetchOnWindowFocus: false,
      ...config,
    },
  );
};
