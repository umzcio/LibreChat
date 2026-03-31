import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FolderClosed,
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Upload,
  X,
  MessageSquare,
} from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Textarea,
  Spinner,
  useToastContext,
} from '@librechat/client';
import type { TFile } from 'librechat-data-provider';
import { dataService } from 'librechat-data-provider';
import {
  useGetProjectQuery,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useListProjectsQuery,
} from '~/data-provider';
import { useLocalize } from '~/hooks';

const COLORS = [
  '#3b82f6',
  '#ef4444',
  '#22c55e',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
];

export default function ProjectView() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: project, isLoading, refetch: refetchProject } = useGetProjectQuery(projectId || '', {
    enabled: !!projectId,
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [files, setFiles] = useState<TFile[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setInstructions(project.instructions || '');
      setColor(project.color || COLORS[0]);
      setHasChanges(false);
    }
  }, [project]);

  useEffect(() => {
    if (projectId) {
      dataService
        .getProjectFiles(projectId)
        .then((f) => setFiles(f))
        .catch(() => setFiles([]));
    }
  }, [projectId]);

  const updateMutation = useUpdateProjectMutation({
    onSuccess: () => {
      showToast({ message: localize('com_ui_project_saved'), status: 'success' });
      setHasChanges(false);
    },
    onError: () => {
      showToast({ message: localize('com_ui_error_save_project'), status: 'error' });
    },
  });

  const deleteMutation = useDeleteProjectMutation({
    onSuccess: () => {
      showToast({ message: localize('com_ui_project_deleted'), status: 'success' });
      navigate('/c/new');
    },
    onError: () => {
      showToast({ message: localize('com_ui_error_delete_project'), status: 'error' });
    },
  });

  const handleSave = useCallback(() => {
    if (!projectId || !name.trim()) {
      return;
    }
    updateMutation.mutate({
      projectId,
      data: {
        name: name.trim(),
        description: description.trim() || undefined,
        instructions: instructions.trim() || undefined,
        color,
      },
    });
  }, [projectId, name, description, instructions, color, updateMutation]);

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    if (projectId) {
      deleteMutation.mutate(projectId);
    }
  };

  const handleFieldChange =
    (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(e.target.value);
      setHasChanges(true);
    };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || !projectId) {
      return;
    }
    setUploading(true);
    for (let i = 0; i < selectedFiles.length; i++) {
      const formData = new FormData();
      formData.append('file', selectedFiles[i]);
      try {
        const uploaded = await dataService.uploadProjectFile(projectId, formData);
        setFiles((prev) => [...prev, uploaded]);
      } catch (err) {
        showToast({
          message: `Error uploading ${selectedFiles[i].name}`,
          status: 'error',
        });
      }
    }
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!projectId) {
      return;
    }
    try {
      await dataService.deleteProjectFile(projectId, fileId);
      setFiles((prev) => prev.filter((f) => f.file_id !== fileId));
    } catch (err) {
      showToast({ message: localize('com_ui_error_delete_file'), status: 'error' });
    }
  };

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
        <p className="text-text-secondary">{localize('com_ui_project_not_found')}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full">
      {/* Left side: Chat area */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center gap-3 border-b border-border-light px-6 py-3">
          <button
            type="button"
            className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
            onClick={() => navigate('/c/new')}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {localize('com_ui_all_projects')}
          </button>
        </div>

        {/* Project header */}
        <div className="px-6 py-6">
          <div className="flex items-center gap-3">
            <FolderClosed
              className="size-8 shrink-0"
              style={{ color: color }}
              aria-hidden="true"
            />
            <div>
              <h1 className="text-xl font-bold text-text-primary">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-text-secondary">{project.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Start new chat button */}
        <div className="px-6 pb-4">
          <Button
            className="w-full"
            onClick={() => navigate(`/p/${projectId}/c/new`)}
          >
            <MessageSquare className="mr-2 size-4" aria-hidden="true" />
            {localize('com_ui_start_chat_in_project')}
          </Button>
        </div>

        {/* Placeholder for project conversations list */}
        <div className="flex-1 overflow-y-auto px-6">
          <p className="text-xs font-medium uppercase text-text-tertiary">
            {localize('com_ui_project_conversations')}
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            {localize('com_ui_project_conversations_desc')}
          </p>
        </div>
      </div>

      {/* Right side: Project configuration */}
      <div className="w-80 shrink-0 overflow-y-auto border-l border-border-light bg-surface-secondary p-4">
        {/* Name */}
        <div className="mb-4 space-y-1">
          <Label htmlFor="project-name" className="text-xs font-medium uppercase text-text-tertiary">
            {localize('com_ui_name')}
          </Label>
          <Input id="project-name" value={name} onChange={handleFieldChange(setName)} className="text-text-primary" />
        </div>

        {/* Description */}
        <div className="mb-4 space-y-1">
          <Label
            htmlFor="project-desc"
            className="text-xs font-medium uppercase text-text-tertiary"
          >
            {localize('com_ui_description')}
          </Label>
          <Input
            id="project-desc"
            value={description}
            onChange={handleFieldChange(setDescription)}
            placeholder={localize('com_ui_project_description_placeholder')}
            className="text-text-primary"
          />
        </div>

        {/* Color */}
        <div className="mb-4 space-y-1">
          <Label className="text-xs font-medium uppercase text-text-tertiary">
            {localize('com_ui_color')}
          </Label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`size-5 rounded-full border-2 transition-transform ${
                  color === c ? 'scale-110 border-text-primary' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
                onClick={() => {
                  setColor(c);
                  setHasChanges(true);
                }}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-4 space-y-1">
          <Label
            htmlFor="project-instructions"
            className="text-xs font-medium uppercase text-text-tertiary"
          >
            {localize('com_ui_project_instructions')}
          </Label>
          <Textarea
            id="project-instructions"
            value={instructions}
            onChange={handleFieldChange(setInstructions)}
            placeholder={localize('com_ui_project_instructions_placeholder')}
            rows={6}
            className="resize-y text-sm text-text-primary"
          />
        </div>

        {/* Save button */}
        {hasChanges && (
          <div className="mb-4">
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={updateMutation.isLoading || !name.trim()}
            >
              {localize('com_ui_save')}
            </Button>
          </div>
        )}

        {/* Knowledge Base */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium uppercase text-text-tertiary">
              {localize('com_ui_knowledge_base')}
            </Label>
            <button
              type="button"
              className="rounded p-1 text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label={localize('com_ui_upload_files')}
            >
              {uploading ? <Spinner className="size-4" /> : <Upload className="size-4" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
          {files.length === 0 ? (
            <button
              type="button"
              className="w-full rounded-lg border border-dashed border-border-medium p-3 text-center hover:bg-surface-hover"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="mx-auto mb-1 size-6 text-text-tertiary" aria-hidden="true" />
              <p className="text-xs text-text-secondary">{localize('com_ui_upload_files')}</p>
            </button>
          ) : (
            <div className="space-y-1">
              {files.map((file) => (
                <div
                  key={file.file_id}
                  className="group flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-surface-hover"
                >
                  <FileText className="size-4 shrink-0 text-text-tertiary" aria-hidden="true" />
                  <span className="flex-1 truncate text-text-primary">{file.filename}</span>
                  <button
                    type="button"
                    className="shrink-0 rounded p-0.5 text-text-tertiary opacity-0 hover:text-red-500 group-hover:opacity-100"
                    onClick={() => handleDeleteFile(file.file_id)}
                    aria-label={localize('com_ui_delete')}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Delete project */}
        <div className="border-t border-border-light pt-4">
          <Button
            variant="outline"
            className={`w-full ${confirmDelete ? 'border-red-500 text-red-500 hover:bg-red-500/10' : ''}`}
            onClick={handleDelete}
            disabled={deleteMutation.isLoading}
          >
            <Trash2 className="mr-2 size-4" aria-hidden="true" />
            {confirmDelete ? localize('com_ui_confirm_delete') : localize('com_ui_delete_project')}
          </Button>
        </div>
      </div>
    </div>
  );
}
