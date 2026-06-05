import { useEffect, useState } from 'react';
import type { ComponentType, FormEvent } from 'react';
import { useAtomValue } from 'jotai';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Button,
  Input,
  OGDialog,
  OGDialogContent,
  OGDialogFooter,
  OGDialogHeader,
  OGDialogTitle,
  Spinner,
  useToastContext,
} from '@librechat/client';
import { Constants, QueryKeys } from 'librechat-data-provider';
import { useQueryClient } from '@tanstack/react-query';
import {
  FileCode2,
  FileDiff,
  FilePlus2,
  FolderClosed,
  FolderOpen,
  FolderPlus,
  GitCompareArrows,
  PenLine,
  Save,
  Trash2,
} from 'lucide-react';
import {
  useCreateCodeItemMutation,
  useDeleteCodeItemMutation,
  useListZdocksQuery,
  usePromoteCodeWorkspaceMutation,
  useCodeChangesQuery,
  useCodeDiffQuery,
  useCodeFileContentQuery,
  useCodeFilesQuery,
  useCodeWorkspaceSessionQuery,
  useApplyCodeChangesMutation,
  useDiscardCodeChangesMutation,
  useRenameCodeItemMutation,
  useSaveCodeFileContentMutation,
  useUpdateCodeWorkspaceSessionMutation,
} from '~/data-provider';
import { ToolCallsMapProvider } from '~/Providers';
import { useLocalize } from '~/hooks';
import ChatView from '~/components/Chat/ChatView';
import useConversationRoute from '~/routes/useConversationRoute';
import { NotificationSeverity } from '~/common';
import { buildConversationPath, cn } from '~/utils';
import { getArtifactWorkspacePath } from '~/utils/artifacts';
import store from '~/store';

type WorkspacePanel = 'files' | 'editor' | 'changes';

function toClientWorkspacePath(filePath: string) {
  return filePath.startsWith('/') ? filePath : `/${filePath}`;
}

function buildRenameTarget(currentPath: string, nextName: string) {
  const trimmedName = nextName.trim().replace(/^\/+/, '');
  if (!trimmedName) {
    return null;
  }

  if (trimmedName.includes('/')) {
    return toClientWorkspacePath(trimmedName);
  }

  const currentSegments = currentPath.replace(/^\/+/, '').split('/');
  currentSegments[currentSegments.length - 1] = trimmedName;
  return toClientWorkspacePath(currentSegments.join('/'));
}

function getChangeBadge(status?: 'modified' | 'new' | 'deleted' | 'unchanged') {
  switch (status) {
    case 'modified':
      return { label: 'M', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' };
    case 'new':
      return { label: 'N', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' };
    case 'deleted':
      return { label: 'D', className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' };
    default:
      return null;
  }
}

type WorkspaceFileNodeProps = {
  activeFile: string;
  conversationId: string;
  changes: Array<{
    path: string;
    status: 'modified' | 'new' | 'deleted' | 'unchanged';
  }>;
  node: {
    name: string;
    path: string;
    type: 'file' | 'directory';
  };
  onDeleteItem: (filePath: string) => Promise<void>;
  onRenameItem: (filePath: string, nextName: string) => Promise<void>;
  onSelectFile: (filePath: string) => void;
  pendingConversation: boolean;
};

function WorkspaceFileNode({
  activeFile,
  conversationId,
  changes,
  node,
  onDeleteItem,
  onRenameItem,
  onSelectFile,
  pendingConversation,
}: WorkspaceFileNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const localize = useLocalize();
  const { data, isFetching } = useCodeFilesQuery(conversationId, node.path, {
    enabled: expanded && node.type === 'directory' && !pendingConversation,
  });
  const directChange = changes.find((change) => change.path === node.path)?.status;
  const nestedChange =
    node.type === 'directory'
      ? changes.some(
          (change) => change.path !== node.path && change.path.startsWith(`${node.path}/`),
        )
      : false;
  const changeBadge = getChangeBadge(directChange);

  const handleRename = async () => {
    const nextName = window.prompt(localize('com_ui_rename'), node.name);
    if (!nextName || nextName.trim() === node.name) {
      return;
    }
    await onRenameItem(node.path, nextName);
  };

  if (node.type === 'file') {
    return (
      <div className="group flex items-center gap-1">
        <button
          type="button"
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
            activeFile === node.path
              ? 'bg-surface-active text-text-primary'
              : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
          )}
          onClick={() => onSelectFile(node.path)}
        >
          <FileCode2 className="h-4 w-4 shrink-0" />
          <span className="truncate">{node.name}</span>
          {changeBadge ? (
            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', changeBadge.className)}>
              {changeBadge.label}
            </span>
          ) : null}
        </button>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            className="rounded p-1 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            onClick={handleRename}
            aria-label={localize('com_ui_rename')}
          >
            <PenLine className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded p-1 text-text-secondary hover:bg-surface-hover hover:text-red-500"
            onClick={() => onDeleteItem(node.path)}
            aria-label={localize('com_ui_delete')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group space-y-1">
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-text-primary transition-colors hover:bg-surface-hover"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? (
            <FolderOpen className="h-4 w-4 shrink-0" />
          ) : (
            <FolderClosed className="h-4 w-4 shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
          {changeBadge ? (
            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', changeBadge.className)}>
              {changeBadge.label}
            </span>
          ) : nestedChange ? (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-surface-active text-text-primary">
              •
            </span>
          ) : null}
        </button>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            className="rounded p-1 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            onClick={handleRename}
            aria-label={localize('com_ui_rename')}
          >
            <PenLine className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded p-1 text-text-secondary hover:bg-surface-hover hover:text-red-500"
            onClick={() => onDeleteItem(node.path)}
            aria-label={localize('com_ui_delete')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {expanded ? (
        <div className="ml-4 space-y-1 border-l border-border-light pl-2">
          {isFetching ? (
            <div className="flex items-center gap-2 px-2 py-1 text-xs text-text-secondary">
              <Spinner className="size-3" />
              <span>{localize('com_ui_loading')}</span>
            </div>
          ) : data?.entries?.length ? (
            data.entries.map((entry) => (
              <WorkspaceFileNode
                key={entry.path}
                activeFile={activeFile}
                conversationId={conversationId}
                changes={changes}
                node={entry}
                onDeleteItem={onDeleteItem}
                onRenameItem={onRenameItem}
                onSelectFile={onSelectFile}
                pendingConversation={pendingConversation}
              />
            ))
          ) : (
            <div className="px-2 py-1 text-xs text-text-secondary">
              {localize('com_ui_code_folder_empty')}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function FilesPanel({
  activeFile,
  conversationId,
  onSelectFile,
  pendingConversation,
}: {
  activeFile: string;
  conversationId: string;
  onSelectFile: (filePath: string) => void;
  pendingConversation: boolean;
}) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { data: changesData } = useCodeChangesQuery(conversationId, {
    enabled: !pendingConversation,
  });
  const { data, isLoading } = useCodeFilesQuery(conversationId, '/', {
    enabled: !pendingConversation,
  });
  const createItemMutation = useCreateCodeItemMutation();
  const deleteItemMutation = useDeleteCodeItemMutation();
  const renameItemMutation = useRenameCodeItemMutation();
  const [draftType, setDraftType] = useState<'file' | 'directory' | null>(null);
  const [draftPath, setDraftPath] = useState('');

  const changes = changesData?.changes ?? [];

  const handleCreateItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draftType || !draftPath.trim()) {
      return;
    }

    try {
      const result = await createItemMutation.mutateAsync({
        conversationId,
        path: draftPath.trim(),
        type: draftType,
      });

      if (draftType === 'file') {
        onSelectFile(result.path);
      }

      setDraftPath('');
      setDraftType(null);
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : localize('com_ui_error'),
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
    }
  };

  const handleDeleteItem = async (filePath: string) => {
    try {
      await deleteItemMutation.mutateAsync({
        conversationId,
        path: filePath,
      });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : localize('com_ui_error'),
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
    }
  };

  const handleRenameItem = async (filePath: string, nextName: string) => {
    const nextPath = buildRenameTarget(filePath, nextName);
    if (!nextPath) {
      return;
    }

    try {
      await renameItemMutation.mutateAsync({
        conversationId,
        newPath: nextPath,
        path: filePath,
      });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : localize('com_ui_error'),
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
    }
  };

  if (pendingConversation) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-text-secondary">
        {localize('com_ui_code_workspace_pending')}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="text-text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          {localize('com_ui_files')}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            onClick={() => setDraftType('file')}
            aria-label={localize('com_ui_add_file')}
          >
            <FilePlus2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
            onClick={() => setDraftType('directory')}
            aria-label={localize('com_ui_add_folder')}
          >
            <FolderPlus className="h-4 w-4" />
          </button>
        </div>
      </div>
      {draftType ? (
        <form className="mb-3 space-y-2 rounded-xl border border-border-light p-3" onSubmit={handleCreateItem}>
          <Input
            autoFocus
            value={draftPath}
            onChange={(event) => setDraftPath(event.target.value)}
            placeholder={localize('com_ui_code_path_placeholder')}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() => {
                setDraftPath('');
                setDraftType(null);
              }}
            >
              {localize('com_ui_cancel')}
            </Button>
            <Button size="sm" type="submit" disabled={!draftPath.trim() || createItemMutation.isLoading}>
              {localize('com_ui_create')}
            </Button>
          </div>
        </form>
      ) : null}
      {data?.entries?.length ? (
        <div className="space-y-1">
          {data.entries.map((entry) => (
            <WorkspaceFileNode
              key={entry.path}
              activeFile={activeFile}
              conversationId={conversationId}
              changes={changes}
              node={entry}
              onDeleteItem={handleDeleteItem}
              onRenameItem={handleRenameItem}
              onSelectFile={onSelectFile}
              pendingConversation={pendingConversation}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border-light px-4 py-5 text-sm text-text-secondary">
          {localize('com_ui_code_no_files')}
        </div>
      )}
    </div>
  );
}

function ChangesPanel({
  conversationId,
  hasProject,
  onSelectFile,
  onPromote,
  pendingConversation,
}: {
  conversationId: string;
  hasProject: boolean;
  onSelectFile: (filePath: string) => void;
  onPromote: () => void;
  pendingConversation: boolean;
}) {
  const localize = useLocalize();
  const { data, isLoading } = useCodeChangesQuery(conversationId, {
    enabled: !pendingConversation,
  });

  if (pendingConversation) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-text-secondary">
        {localize('com_ui_code_workspace_pending')}
      </div>
    );
  }

  if (!hasProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-sm text-text-secondary">
          {localize('com_ui_code_changes_local_only')}
        </div>
        <Button size="sm" onClick={onPromote}>
          {localize('com_ui_code_promote_project')}
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="text-text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary">
        {localize('com_ui_code_changes')}
      </div>
      {data?.changes?.length ? (
        <div className="space-y-2">
          {data.changes.map((change) => (
            <button
              key={`${change.path}-${change.status}`}
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-border-light px-3 py-2 text-left transition-colors hover:bg-surface-hover"
              onClick={() => onSelectFile(change.path)}
            >
              <div className="min-w-0">
                <div className="truncate text-sm text-text-primary">{change.path.replace(/^\//, '')}</div>
                <div className="text-xs uppercase tracking-wide text-text-secondary">
                  {change.status}
                </div>
              </div>
              <GitCompareArrows className="h-4 w-4 shrink-0 text-text-secondary" />
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border-light px-4 py-5 text-sm text-text-secondary">
          {localize('com_ui_code_changes_none')}
        </div>
      )}
    </div>
  );
}

function EditorPanel({
  activeFile,
  conversationId,
  hasProject,
  onPromote,
  pendingConversation,
}: {
  activeFile: string;
  conversationId: string;
  hasProject: boolean;
  onPromote: () => void;
  pendingConversation: boolean;
}) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const { data, isLoading } = useCodeFileContentQuery(conversationId, activeFile, {
    enabled: !!activeFile && !pendingConversation,
  });
  const { data: diff } = useCodeDiffQuery(conversationId, activeFile, {
    enabled: !!activeFile && !pendingConversation && hasProject,
  });
  const saveMutation = useSaveCodeFileContentMutation();
  const applyMutation = useApplyCodeChangesMutation();
  const discardMutation = useDiscardCodeChangesMutation();
  const [draft, setDraft] = useState('');

  useEffect(() => {
    setDraft(data?.content ?? '');
  }, [data?.content, activeFile]);

  const isDirty = draft !== (data?.content ?? '');
  const changeStatus = diff?.status ?? 'unchanged';

  if (pendingConversation) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-text-secondary">
        {localize('com_ui_code_workspace_pending')}
      </div>
    );
  }

  if (!activeFile) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-text-secondary">
        {localize('com_ui_code_select_file')}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="text-text-primary" />
      </div>
    );
  }

  const handleSave = async () => {
    await saveMutation.mutateAsync({
      content: draft,
      conversationId,
      path: activeFile,
    });
  };

  const handleApply = async () => {
    if (isDirty) {
      await handleSave();
    }

    await applyMutation.mutateAsync({
      conversationId,
      paths: [activeFile],
    });
    queryClient.invalidateQueries([QueryKeys.zdockFiles]);
  };

  const handleDiscard = async () => {
    await discardMutation.mutateAsync({
      conversationId,
      paths: [activeFile],
    });
    queryClient.invalidateQueries([QueryKeys.codeFiles, conversationId, 'content', activeFile]);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-text-primary">
            {activeFile.replace(/^\//, '')}
          </div>
          <div className="text-xs uppercase tracking-wide text-text-secondary">
            {hasProject ? `${localize('com_ui_code_working_copy')} • ${changeStatus}` : localize('com_ui_code_local_workspace')}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDiscard}
            disabled={discardMutation.isLoading || (!hasProject && !isDirty)}
          >
            {localize('com_ui_code_discard')}
          </Button>
          {hasProject ? (
            <Button
              size="sm"
              onClick={handleApply}
              disabled={applyMutation.isLoading || discardMutation.isLoading}
            >
              {localize('com_ui_code_apply_project')}
            </Button>
          ) : (
            <Button size="sm" onClick={onPromote}>
              {localize('com_ui_code_promote_project')}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleSave} disabled={!isDirty || saveMutation.isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {localize('com_ui_save')}
          </Button>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 gap-3 p-3 xl:grid-cols-2">
        <div className="flex min-h-0 flex-col rounded-2xl border border-border-light bg-surface-primary">
          <div className="border-b border-border-light px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {localize('com_ui_code_working_copy')}
          </div>
          <textarea
            className="min-h-0 flex-1 resize-none bg-transparent px-4 py-3 font-mono text-sm text-text-primary outline-none"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            spellCheck={false}
          />
        </div>
        <div className="flex min-h-0 flex-col rounded-2xl border border-border-light bg-surface-primary">
          <div className="border-b border-border-light px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {hasProject ? localize('com_ui_code_project_version') : localize('com_ui_code_local_workspace')}
          </div>
          <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap px-4 py-3 font-mono text-sm text-text-secondary">
            {hasProject ? diff?.originalContent ?? '' : data?.content ?? ''}
          </pre>
        </div>
      </div>
    </div>
  );
}

function WorkspaceButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-xl transition-colors',
        active ? 'bg-surface-active text-text-primary' : 'text-text-secondary hover:bg-surface-hover',
      )}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function RightPanel({
  activeFile,
  conversationId,
  hasProject,
  onSelectFile,
  onPromote,
  pendingConversation,
}: {
  activeFile: string;
  conversationId: string;
  hasProject: boolean;
  onSelectFile: (filePath: string) => void;
  onPromote: () => void;
  pendingConversation: boolean;
}) {
  const localize = useLocalize();
  const [activePanel, setActivePanel] = useState<WorkspacePanel>('files');

  useEffect(() => {
    if (activeFile) {
      setActivePanel('editor');
    }
  }, [activeFile]);

  const handleSelectFile = (filePath: string) => {
    setActivePanel('editor');
    onSelectFile(filePath);
  };

  return (
    <div className="flex h-full shrink-0 border-l border-border-light bg-surface-primary-alt">
      <div className="w-[520px] min-w-[520px]">
        {activePanel === 'files' ? (
          <FilesPanel
            activeFile={activeFile}
            conversationId={conversationId}
            onSelectFile={handleSelectFile}
            pendingConversation={pendingConversation}
          />
        ) : null}
        {activePanel === 'editor' ? (
          <EditorPanel
            activeFile={activeFile}
            conversationId={conversationId}
            hasProject={hasProject}
            onPromote={onPromote}
            pendingConversation={pendingConversation}
          />
        ) : null}
        {activePanel === 'changes' ? (
          <ChangesPanel
            conversationId={conversationId}
            hasProject={hasProject}
            onSelectFile={handleSelectFile}
            onPromote={onPromote}
            pendingConversation={pendingConversation}
          />
        ) : null}
      </div>
      <div className="flex flex-col gap-2 border-l border-border-light px-2 py-3">
        <WorkspaceButton
          active={activePanel === 'files'}
          icon={FolderClosed}
          label={localize('com_ui_files')}
          onClick={() => setActivePanel('files')}
        />
        <WorkspaceButton
          active={activePanel === 'editor'}
          icon={FileCode2}
          label={localize('com_ui_code')}
          onClick={() => setActivePanel('editor')}
        />
        <WorkspaceButton
          active={activePanel === 'changes'}
          icon={FileDiff}
          label={localize('com_ui_code_changes')}
          onClick={() => setActivePanel('changes')}
        />
      </div>
    </div>
  );
}

export default function CodePage() {
  const localize = useLocalize();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToastContext();
  const { conversationId = '' } = useParams();
  const { conversation, isAuthenticated, isConversationReady, isLoading } = useConversationRoute();
  const artifacts = useAtomValue(store.artifactsState);
  const { data: workspaceSession } = useCodeWorkspaceSessionQuery(conversationId, {
    enabled: !!conversationId,
  });
  const { data: projectsData } = useListZdocksQuery();
  const promoteMutation = usePromoteCodeWorkspaceMutation();
  const createItemMutation = useCreateCodeItemMutation();
  const saveFileMutation = useSaveCodeFileContentMutation();
  const updateSessionMutation = useUpdateCodeWorkspaceSessionMutation();
  const [activeFile, setActiveFile] = useState('');
  const [promotionMode, setPromotionMode] = useState<'create' | 'existing'>('create');
  const [projectName, setProjectName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);

  useEffect(() => {
    document.title = `LibreCode | ${localize('com_ui_code')}`;
  }, [localize]);

  useEffect(() => {
    if (workspaceSession?.activeFile) {
      setActiveFile(workspaceSession.activeFile);
      return;
    }

    if (workspaceSession?.openFiles?.[0]) {
      setActiveFile(workspaceSession.openFiles[0]);
      return;
    }

    setActiveFile('');
  }, [workspaceSession?.activeFile, workspaceSession?.openFiles]);

  const pendingConversation =
    conversationId === Constants.NEW_CONVO || workspaceSession?.pendingConversation === true;
  const hasProject = workspaceSession?.hasProject ?? Boolean(conversation?.zdockId);

  useEffect(() => {
    const requestedFile = searchParams.get('openFile');
    if (!isAuthenticated || !conversationId || !isConversationReady || !requestedFile || pendingConversation) {
      return;
    }

    const nextPath = toClientWorkspacePath(requestedFile);
    const nextOpenFiles = workspaceSession?.openFiles ?? [];

    setActiveFile(nextPath);
    updateSessionMutation.mutate({
      activeFile: nextPath,
      conversationId,
      openFiles: nextOpenFiles.includes(nextPath) ? nextOpenFiles : [...nextOpenFiles, nextPath],
    });

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('openFile');
    setSearchParams(nextParams, { replace: true });
  }, [
    conversationId,
    isAuthenticated,
    isConversationReady,
    pendingConversation,
    searchParams,
    setSearchParams,
    updateSessionMutation,
    workspaceSession?.openFiles,
  ]);

  useEffect(() => {
    const requestedArtifactId = searchParams.get('openArtifact');
    if (
      !isAuthenticated ||
      !conversationId ||
      !isConversationReady ||
      !requestedArtifactId ||
      pendingConversation ||
      artifacts == null
    ) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('openArtifact');
    setSearchParams(nextParams, { replace: true });

    const artifact = artifacts[requestedArtifactId];
    if (!artifact?.content) {
      showToast({
        message: localize('com_ui_error'),
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
      return;
    }

    const relativePath = getArtifactWorkspacePath(artifact);
    const clientPath = toClientWorkspacePath(relativePath);

    void (async () => {
      try {
        try {
          await createItemMutation.mutateAsync({
            conversationId,
            path: relativePath,
            type: 'file',
          });

          await saveFileMutation.mutateAsync({
            content: artifact.content ?? '',
            conversationId,
            path: clientPath,
          });
        } catch (error) {
          if (!(error instanceof Error) || !error.message.includes('Path already exists')) {
            throw error;
          }
        }

        setActiveFile(clientPath);
        const nextOpenFiles = workspaceSession?.openFiles ?? [];
        updateSessionMutation.mutate({
          activeFile: clientPath,
          conversationId,
          openFiles: nextOpenFiles.includes(clientPath)
            ? nextOpenFiles
            : [...nextOpenFiles, clientPath],
        });
      } catch (error) {
        showToast({
          message: error instanceof Error ? error.message : localize('com_ui_error'),
          severity: NotificationSeverity.ERROR,
          showIcon: true,
        });
      }
    })();
  }, [
    artifacts,
    conversationId,
    createItemMutation,
    isAuthenticated,
    isConversationReady,
    localize,
    pendingConversation,
    saveFileMutation,
    searchParams,
    setSearchParams,
    showToast,
    updateSessionMutation,
    workspaceSession?.openFiles,
  ]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center" aria-live="polite" role="status">
        <Spinner className="text-text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !conversationId || !isConversationReady) {
    return null;
  }

  const handleSelectFile = (filePath: string) => {
    setActiveFile(filePath);

    if (pendingConversation) {
      return;
    }

    const openFiles = workspaceSession?.openFiles ?? [];
    updateSessionMutation.mutate({
      activeFile: filePath,
      conversationId,
      openFiles: openFiles.includes(filePath) ? openFiles : [...openFiles, filePath],
    });
  };

  const handlePromote = async () => {
    const trimmedName = projectName.trim();
    const canPromote =
      promotionMode === 'existing' ? Boolean(selectedProjectId) : Boolean(trimmedName);
    if (!canPromote || pendingConversation) {
      return;
    }

    try {
      const session = await promoteMutation.mutateAsync({
        conversationId,
        ...(promotionMode === 'existing'
          ? { zdockId: selectedProjectId }
          : { projectName: trimmedName }),
      });

      setShowPromoteDialog(false);
      setPromotionMode('create');
      setProjectName('');
      setSelectedProjectId('');
      showToast({
        message: localize(
          promotionMode === 'existing' ? 'com_ui_moved_to_project' : 'com_ui_project_created',
        ),
        severity: NotificationSeverity.SUCCESS,
        showIcon: true,
      });
      navigate(
        buildConversationPath({
          conversationId,
          mode: 'code',
          zdockId: session.zdockId ?? undefined,
        }),
        { replace: true },
      );
    } catch {
      showToast({
        message: localize(
          promotionMode === 'existing'
            ? 'com_ui_error_move_to_project'
            : 'com_ui_error_create_project',
        ),
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
    }
  };

  return (
    <>
      <OGDialog open={showPromoteDialog} onOpenChange={setShowPromoteDialog}>
        <OGDialogContent className="w-11/12 max-w-md" showCloseButton={false}>
          <OGDialogHeader>
            <OGDialogTitle>{localize('com_ui_create_project')}</OGDialogTitle>
          </OGDialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              {localize('com_ui_code_promote_description')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={promotionMode === 'create' ? 'default' : 'outline'}
                onClick={() => setPromotionMode('create')}
              >
                {localize('com_ui_create_project')}
              </Button>
              <Button
                variant={promotionMode === 'existing' ? 'default' : 'outline'}
                onClick={() => setPromotionMode('existing')}
              >
                {localize('com_ui_open_project')}
              </Button>
            </div>
            {promotionMode === 'create' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">
                  {localize('com_ui_project_name')}
                </label>
                <Input
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder={localize('com_ui_project_name_placeholder')}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">
                  {localize('com_ui_open_project')}
                </label>
                <select
                  className="flex h-10 w-full rounded-md border border-border-light bg-transparent px-3 text-sm text-text-primary outline-none"
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                >
                  <option value="">{localize('com_ui_select')}</option>
                  {(projectsData?.projects ?? []).map((project) => (
                    <option key={project.zdockId} value={project.zdockId}>
                      {project.name}
                    </option>
                  ))}
                </select>
                {!projectsData?.projects?.length ? (
                  <p className="text-sm text-text-secondary">{localize('com_ui_no_projects')}</p>
                ) : null}
              </div>
            )}
          </div>
          <OGDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPromoteDialog(false);
                setPromotionMode('create');
                setProjectName('');
                setSelectedProjectId('');
              }}
            >
              {localize('com_ui_cancel')}
            </Button>
            <Button
              onClick={handlePromote}
              disabled={
                promoteMutation.isLoading ||
                (promotionMode === 'existing' ? !selectedProjectId : !projectName.trim())
              }
            >
              {localize('com_ui_code_promote_project')}
            </Button>
          </OGDialogFooter>
        </OGDialogContent>
      </OGDialog>
      <div className="flex h-full w-full overflow-hidden">
        <div className="min-w-0 flex-1">
          <ToolCallsMapProvider conversationId={conversation?.conversationId ?? ''}>
            <ChatView index={0} showArtifactsPanel={false} />
          </ToolCallsMapProvider>
        </div>
        <RightPanel
          activeFile={activeFile}
          conversationId={conversationId}
          hasProject={hasProject}
          onSelectFile={handleSelectFile}
          onPromote={() => {
            const existingProjects = projectsData?.projects ?? [];
            setPromotionMode(existingProjects.length > 0 ? 'existing' : 'create');
            setProjectName(conversation?.title?.trim() || '');
            setSelectedProjectId(existingProjects[0]?.zdockId ?? '');
            setShowPromoteDialog(true);
          }}
          pendingConversation={pendingConversation}
        />
      </div>
    </>
  );
}
