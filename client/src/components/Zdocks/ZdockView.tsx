import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Code2,
  Plus,
  Trash2,
  FileText,
  FileSpreadsheet,
  FileType,
  Settings,
  PenLine,
  X,
} from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Textarea,
  Spinner,
  useToastContext,
  OGDialog,
  OGDialogContent,
  OGDialogHeader,
  OGDialogTitle,
  OGDialogFooter,
} from '@librechat/client';
import type { TFile } from 'librechat-data-provider';
import { Constants, QueryKeys, dataService } from 'librechat-data-provider';
import type { TConversation } from 'librechat-data-provider';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetZdockQuery,
  useUpdateZdockMutation,
  useDeleteZdockMutation,
  useGetZdockConversationsQuery,
} from '~/data-provider';
import { useLocalize, useNewConvo } from '~/hooks';
import {
  getProjectIcon,
  IconColorPicker,
  PROJECT_COLORS,
} from '~/components/SidePanel/Zdocks/ZdockCreateDialog';
import ZdockMemoryModal from './ZdockMemoryModal';
import AddConversationsToZdockDialog from './AddConversationsToZdockDialog';
import ZdockConvoItem from './ZdockConvoItem';
import { buildConversationPath, clearMessagesCache, cn } from '~/utils';
import store from '~/store';

/** Group conversations by recency */
function groupByRecency(conversations: TConversation[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; convos: TConversation[] }[] = [
    { label: 'Today', convos: [] },
    { label: 'Yesterday', convos: [] },
    { label: 'Previous 7 days', convos: [] },
    { label: 'Older', convos: [] },
  ];

  for (const c of conversations) {
    const d = new Date(c.updatedAt || c.createdAt || 0);
    if (d >= today) {
      groups[0].convos.push(c);
    } else if (d >= yesterday) {
      groups[1].convos.push(c);
    } else if (d >= weekAgo) {
      groups[2].convos.push(c);
    } else {
      groups[3].convos.push(c);
    }
  }
  return groups.filter((g) => g.convos.length > 0);
}

/** Relative time label */
function relativeTime(dateStr?: string): string {
  if (!dateStr) {
    return '';
  }
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) {
    return `${mins}m`;
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return `${hrs}h`;
  }
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

/** Get file icon by mimetype */
function getFileIcon(mimetype?: string) {
  if (mimetype?.includes('spreadsheet') || mimetype?.includes('excel') || mimetype?.includes('csv')) {
    return FileSpreadsheet;
  }
  if (mimetype?.includes('pdf')) {
    return FileType;
  }
  return FileText;
}

/** Format bytes */
function formatBytes(bytes?: number): string {
  if (!bytes) {
    return '';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Render instructions as prose with basic markdown support */
function renderInstructions(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} className="my-1 list-inside list-disc space-y-0.5">
          {listItems.map((item, j) => (
            <li key={j}>{item}</li>
          ))}
        </ul>,
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Horizontal rule
    if (/^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed)) {
      flushList();
      elements.push(<hr key={i} className="my-2 border-border-light" />);
      continue;
    }

    // Heading
    const heading = trimmed.match(/^#{1,3}\s+(.+)/);
    if (heading) {
      flushList();
      elements.push(
        <div key={i} className="mt-1.5 first:mt-0">
          <strong className="text-text-primary">{heading[1]}</strong>
        </div>,
      );
      continue;
    }

    // List item (* or -)
    const listMatch = trimmed.match(/^[-*]\s+(.+)/);
    if (listMatch) {
      listItems.push(listMatch[1]);
      continue;
    }

    // Empty line
    if (trimmed === '') {
      flushList();
      continue;
    }

    // Regular text
    flushList();
    elements.push(<div key={i}>{trimmed}</div>);
  }

  flushList();
  return elements;
}

export default function ZdockView() {
  const { zdockId } = useParams<{ zdockId: string }>();
  const navigate = useNavigate();
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const queryClient = useQueryClient();
  const { newConversation } = useNewConvo();
  const conversation = useAtomValue(store.conversationByIndex(0));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: project, isLoading } = useGetZdockQuery(zdockId || '', {
    enabled: !!zdockId,
  });
  const { data: convosData, refetch: refetchConvos } = useGetZdockConversationsQuery(zdockId || '', {
    enabled: !!zdockId,
  });

  const [showAddConvos, setShowAddConvos] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [showEditInstructions, setShowEditInstructions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [files, setFiles] = useState<TFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Settings dialog state
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editColor, setEditColor] = useState(PROJECT_COLORS[6]);
  const [editIcon, setEditIcon] = useState('FolderClosed');

  // Instructions edit state
  const [editInstructions, setEditInstructions] = useState('');

  useEffect(() => {
    if (project) {
      setEditName(project.name);
      setEditDesc(project.description || '');
      setEditColor(project.color || PROJECT_COLORS[6]);
      setEditIcon(project.icon || 'FolderClosed');
      setEditInstructions(project.instructions || '');
    }
  }, [project]);

  useEffect(() => {
    if (zdockId) {
      dataService
        .getZdockFiles(zdockId)
        .then((f) => setFiles(f))
        .catch(() => setFiles([]));
    }
  }, [zdockId]);

  const updateMutation = useUpdateZdockMutation({
    onSuccess: () => {
      showToast({ message: localize('com_ui_zdock_saved'), status: 'success' });
    },
    onError: () => {
      showToast({ message: localize('com_ui_error_save_zdock'), status: 'error' });
    },
  });

  const deleteMutation = useDeleteZdockMutation({
    onSuccess: () => {
      showToast({ message: localize('com_ui_zdock_deleted'), status: 'success' });
      navigate('/c/new');
    },
    onError: () => {
      showToast({ message: localize('com_ui_error_delete_zdock'), status: 'error' });
    },
  });

  const handleSaveSettings = useCallback(() => {
    if (!zdockId || !editName.trim()) {
      return;
    }
    updateMutation.mutate({
      zdockId,
      data: {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        color: editColor,
        icon: editIcon,
      },
    });
    setShowSettings(false);
  }, [zdockId, editName, editDesc, editColor, editIcon, updateMutation]);

  const handleSaveInstructions = useCallback(() => {
    if (!zdockId) {
      return;
    }
    updateMutation.mutate({
      zdockId,
      data: { instructions: editInstructions.trim() || undefined },
    });
    setShowEditInstructions(false);
  }, [zdockId, editInstructions, updateMutation]);

  const handleConvoRemoved = useCallback(() => {
    refetchConvos();
  }, [refetchConvos]);

  const handleDelete = () => {
    if (zdockId) {
      deleteMutation.mutate(zdockId);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || !zdockId) {
      return;
    }
    setUploading(true);
    for (let i = 0; i < selectedFiles.length; i++) {
      const formData = new FormData();
      formData.append('file', selectedFiles[i]);
      try {
        const uploaded = await dataService.uploadProjectFile(zdockId, formData);
        setFiles((prev) => [...prev, uploaded]);
      } catch {
        showToast({ message: `Error uploading ${selectedFiles[i].name}`, status: 'error' });
      }
    }
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!zdockId) {
      return;
    }
    try {
      await dataService.deleteProjectFile(zdockId, fileId);
      setFiles((prev) => prev.filter((f) => f.file_id !== fileId));
    } catch {
      showToast({ message: localize('com_ui_error_delete_file'), status: 'error' });
    }
  };

  const handleOpenFileInCode = useCallback(
    (file: TFile) => {
      if (!zdockId) {
        return;
      }

      const nextConversationId =
        conversation?.zdockId === zdockId &&
        conversation?.conversationId &&
        conversation.conversationId !== Constants.SEARCH
          ? conversation.conversationId
          : Constants.NEW_CONVO;

      navigate(
        `${buildConversationPath({
          conversationId: nextConversationId,
          mode: 'code',
          zdockId,
        })}?openFile=${encodeURIComponent(file.filename)}`,
      );
    },
    [conversation?.conversationId, conversation?.zdockId, navigate, zdockId],
  );

  const grouped = useMemo(
    () => groupByRecency((convosData?.conversations ?? []) as TConversation[]),
    [convosData],
  );

  const color = project?.color || PROJECT_COLORS[6];
  const ProjectIcon = getProjectIcon(project?.icon);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-text-secondary">{localize('com_ui_zdock_not_found')}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full">
      {/* ── MAIN PANEL ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border-light px-5 py-3.5">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
            style={{ background: `${color}26` }}
          >
            <ProjectIcon className="size-[18px]" style={{ color }} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-medium text-text-primary">{project.name}</div>
            {project.description && (
              <div className="truncate text-xs text-text-secondary">{project.description}</div>
            )}
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md border border-border-medium bg-transparent px-2.5 py-1.5 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              onClick={() => setShowAddConvos(true)}
            >
              <Plus className="size-3" aria-hidden="true" />
              {localize('com_ui_add')}
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md border border-border-medium bg-transparent px-2.5 py-1.5 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="size-3" aria-hidden="true" />
              {localize('com_ui_settings')}
            </button>
          </div>
        </div>

        {/* New chat bar */}
        <button
          type="button"
          className="mx-4 mt-3.5 mb-2.5 flex items-center gap-2.5 rounded-lg border border-border-medium bg-surface-tertiary px-3.5 py-2.5 text-[13px] text-text-secondary transition-colors hover:border-border-heavy hover:text-text-primary"
          onClick={() => {
            clearMessagesCache(queryClient, conversation?.conversationId);
            queryClient.invalidateQueries([QueryKeys.messages]);
            newConversation({ template: { zdockId } });
          }}
        >
          <PenLine className="size-3.5" aria-hidden="true" />
          {localize('com_ui_start_chat_in_zdock')}
        </button>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2">
          {grouped.length > 0 ? (
            grouped.map((group) => (
              <div key={group.label}>
                <div className="px-2 pb-1 pt-2.5 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                  {group.label}
                </div>
                {group.convos.map((convo) => (
                  <ZdockConvoItem
                    key={convo.conversationId}
                    conversation={convo}
                    zdockId={zdockId || ''}
                    onConvoRemoved={handleConvoRemoved}
                    relativeTime={relativeTime(convo.updatedAt)}
                  />
                ))}
              </div>
            ))
          ) : (
            <p className="px-3 pt-4 text-sm text-text-secondary">
              {localize('com_ui_zdock_conversations_desc')}
            </p>
          )}
        </div>
      </div>

      {/* ── DETAIL PANEL ── */}
      <div className="flex w-64 shrink-0 flex-col overflow-y-auto border-l border-border-light bg-surface-secondary">
        {/* Overview */}
        <div className="border-b border-border-light p-4">
          <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-text-tertiary">
            {localize('com_ui_overview')}
          </div>
          <div className="flex gap-1.5">
            <div className="flex-1 rounded-lg border border-border-light bg-surface-hover p-2.5">
              <div className="text-xl font-medium text-text-primary">
                {convosData?.conversations?.length ?? 0}
              </div>
              <div className="mt-0.5 text-[11px] text-text-secondary">chats</div>
            </div>
            <div className="flex-1 rounded-lg border border-border-light bg-surface-hover p-2.5">
              <div className="text-xl font-medium text-text-primary">{files.length}</div>
              <div className="mt-0.5 text-[11px] text-text-secondary">files</div>
            </div>
            <div className="flex-1 rounded-lg border border-border-light bg-surface-hover p-2.5">
              <div className="text-xl font-medium text-text-primary">
                {relativeTime(project.updatedAt) || '—'}
              </div>
              <div className="mt-0.5 text-[11px] text-text-secondary">active</div>
            </div>
          </div>
        </div>

        {/* Project Memory */}
        <div className="border-b border-border-light p-4">
          <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-text-tertiary">
            {localize('com_ui_zdock_memory')}
          </div>
          {project.memory && project.memory.length > 0 ? (
            <div className="rounded-lg border border-border-light bg-surface-hover p-2.5">
              {project.memoryUpdatedAt && (
                <div className="mb-2 text-[10px] text-text-tertiary">
                  Updated {relativeTime(project.memoryUpdatedAt)} ago
                </div>
              )}
              <ul className="mb-2 space-y-1" style={{ listStyle: 'none' }}>
                {project.memory.slice(0, 4).map((entry, i) => (
                  <li key={i} className="relative pl-3 text-xs leading-relaxed text-text-secondary">
                    <span className="absolute left-0 text-text-tertiary">·</span>
                    {entry}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="text-[11px] opacity-80 hover:opacity-100"
                style={{ color }}
                onClick={() => setShowMemoryModal(true)}
              >
                View full memory →
              </button>
            </div>
          ) : (
            <p className="text-xs text-text-tertiary">
              Memory is generated automatically from your conversations in this project.
            </p>
          )}
        </div>

        {/* Instructions */}
        <div className="border-b border-border-light p-4">
          <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-text-tertiary">
            {localize('com_ui_zdock_instructions')}
          </div>
          {project.instructions ? (
            <>
              <div className="rounded-lg border border-border-light bg-surface-hover p-2.5" style={{ maxHeight: '200px', overflow: 'hidden' }}>
                <div className="text-xs leading-relaxed text-text-secondary">
                  {renderInstructions(project.instructions)}
                </div>
              </div>
              <button
                type="button"
                className="mt-2 text-[11px] opacity-80 hover:opacity-100"
                style={{ color }}
                onClick={() => setShowEditInstructions(true)}
              >
                Edit instructions →
              </button>
            </>
          ) : (
            <button
              type="button"
              className="w-full rounded-lg border border-dashed border-border-medium p-3 text-center text-xs text-text-tertiary hover:bg-surface-hover hover:text-text-secondary"
              onClick={() => setShowEditInstructions(true)}
            >
              Add project instructions
            </button>
          )}
        </div>

        {/* Knowledge Base */}
        <div className="border-b border-border-light p-4">
          <div className="mb-2.5 text-[10px] font-medium uppercase tracking-widest text-text-tertiary">
            {localize('com_ui_knowledge_base')}
          </div>
          <div className="space-y-1.5">
            {files.map((file) => {
              const FileIcon = getFileIcon(file.type);
              return (
                <div
                  key={file.file_id}
                  className="group flex items-center gap-2.5 rounded-lg border border-border-light bg-surface-hover p-2.5 hover:bg-surface-active-alt"
                >
                  <div
                    className="flex size-[30px] shrink-0 items-center justify-center rounded-[7px]"
                    style={{ background: `${color}26` }}
                  >
                    <FileIcon className="size-3.5" style={{ color }} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-text-primary">{file.filename}</div>
                    <div className="text-[11px] text-text-tertiary">{formatBytes(file.bytes)}</div>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded p-0.5 text-text-tertiary opacity-0 hover:text-text-primary group-hover:opacity-100"
                    onClick={() => handleOpenFileInCode(file)}
                    aria-label={localize('com_ui_open_in_librecode')}
                  >
                    <Code2 className="size-3" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="shrink-0 rounded p-0.5 text-text-tertiary opacity-0 hover:text-red-500 group-hover:opacity-100"
                    onClick={() => handleDeleteFile(file.file_id)}
                    aria-label={localize('com_ui_delete')}
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="mt-2 flex items-center gap-1.5 px-0.5 text-xs text-text-tertiary hover:text-text-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Spinner className="size-3.5" />
            ) : (
              <Plus className="size-3.5" aria-hidden="true" />
            )}
            {localize('com_ui_add_file')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Delete */}
        <div className="p-4">
          <button
            type="button"
            className="w-full rounded-[7px] border border-red-800/35 px-3 py-2 text-center text-xs text-red-700 hover:bg-red-500/10"
            onClick={() => setShowDeleteConfirm(true)}
          >
            {localize('com_ui_delete_zdock')}
          </button>
        </div>
      </div>

      {/* ── DIALOGS ── */}

      {/* Settings dialog */}
      <OGDialog open={showSettings} onOpenChange={setShowSettings}>
        <OGDialogContent className="max-w-sm gap-0 p-0">
          <OGDialogHeader className="px-5 pb-3 pt-5">
            <OGDialogTitle className="text-base">{localize('com_ui_settings')}</OGDialogTitle>
          </OGDialogHeader>
          <div className="space-y-4 px-5 pb-4">
            <div className="space-y-1">
              <Label className="text-xs text-text-tertiary">{localize('com_ui_name')}</Label>
              <div className="flex items-center gap-2">
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                  style={{ background: `${editColor}26` }}
                >
                  {(() => {
                    const Icon = getProjectIcon(editIcon);
                    return <Icon className="size-5" style={{ color: editColor }} aria-hidden="true" />;
                  })()}
                </div>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-text-primary"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-text-tertiary">{localize('com_ui_description')}</Label>
              <Input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder={localize('com_ui_zdock_description_placeholder')}
                className="text-text-primary"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-text-tertiary">{localize('com_ui_icon_and_color')}</Label>
              <IconColorPicker
                icon={editIcon}
                color={editColor}
                onIconChange={setEditIcon}
                onColorChange={setEditColor}
              />
            </div>
          </div>
          <OGDialogFooter className="border-t border-border-light px-5 py-3">
            <Button variant="outline" size="sm" onClick={() => setShowSettings(false)}>
              {localize('com_ui_cancel')}
            </Button>
            <Button size="sm" onClick={handleSaveSettings} disabled={!editName.trim()}>
              {localize('com_ui_save')}
            </Button>
          </OGDialogFooter>
        </OGDialogContent>
      </OGDialog>

      {/* Edit Instructions dialog */}
      <OGDialog open={showEditInstructions} onOpenChange={setShowEditInstructions}>
        <OGDialogContent className="max-w-lg gap-0 p-0">
          <OGDialogHeader className="px-5 pb-3 pt-5">
            <OGDialogTitle className="text-base">{localize('com_ui_zdock_instructions')}</OGDialogTitle>
          </OGDialogHeader>
          <div className="px-5 pb-4">
            <Textarea
              value={editInstructions}
              onChange={(e) => setEditInstructions(e.target.value)}
              placeholder={localize('com_ui_zdock_instructions_placeholder')}
              className="min-h-[400px] resize-y text-sm text-text-primary"
              autoFocus
            />
          </div>
          <OGDialogFooter className="border-t border-border-light px-5 py-3">
            <Button variant="outline" size="sm" onClick={() => setShowEditInstructions(false)}>
              {localize('com_ui_cancel')}
            </Button>
            <Button size="sm" onClick={handleSaveInstructions}>
              {localize('com_ui_save')}
            </Button>
          </OGDialogFooter>
        </OGDialogContent>
      </OGDialog>

      {/* Project Memory modal */}
      {showMemoryModal && (
        <ZdockMemoryModal
          open={showMemoryModal}
          onOpenChange={setShowMemoryModal}
          zdockId={zdockId || ''}
          memory={project.memory || []}
        />
      )}

      {/* Add Conversations dialog */}
      {showAddConvos && (
        <AddConversationsToZdockDialog
          open={showAddConvos}
          onOpenChange={setShowAddConvos}
          zdockId={zdockId || ''}
        />
      )}

      {/* Delete Confirmation dialog */}
      <OGDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <OGDialogContent className="max-w-sm gap-0 p-0">
          <OGDialogHeader className="px-5 pb-3 pt-5">
            <OGDialogTitle className="text-base text-red-500">
              {localize('com_ui_delete_zdock')}
            </OGDialogTitle>
          </OGDialogHeader>
          <div className="px-5 pb-4">
            <p className="text-sm leading-relaxed text-text-secondary">
              {localize('com_ui_delete_zdock_confirm', {
                count: convosData?.conversations?.length ?? 0,
              })}
            </p>
          </div>
          <OGDialogFooter className="border-t border-border-light px-5 py-3">
            <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>
              {localize('com_ui_cancel')}
            </Button>
            <Button
              size="sm"
              className="border-red-600 bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                setShowDeleteConfirm(false);
                handleDelete();
              }}
              disabled={deleteMutation.isLoading}
            >
              <Trash2 className="mr-1.5 size-3.5" aria-hidden="true" />
              {localize('com_ui_delete_zdock')}
            </Button>
          </OGDialogFooter>
        </OGDialogContent>
      </OGDialog>
    </div>
  );
}
