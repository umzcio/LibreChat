import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FolderClosed, Plus, Trash2, FileText, MessageSquare } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Textarea,
  Spinner,
  useToastContext,
} from '@librechat/client';
import type { TFile } from 'librechat-data-provider';
import {
  useGetProjectQuery,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
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

  const { data: project, isLoading } = useGetProjectQuery(projectId || '', {
    enabled: !!projectId,
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setInstructions(project.instructions || '');
      setColor(project.color || COLORS[0]);
      setHasChanges(false);
    }
  }, [project]);

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

  const handleFieldChange = (setter: (v: string) => void) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setter(e.target.value);
    setHasChanges(true);
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
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <FolderClosed
          className="size-8 shrink-0"
          style={{ color: project.color || '#3b82f6' }}
          aria-hidden="true"
        />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-text-primary">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-text-secondary">{project.description}</p>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(`/p/${projectId}/c/new`)}
        >
          <MessageSquare className="mr-2 size-4" aria-hidden="true" />
          {localize('com_ui_new_chat')}
        </Button>
      </div>

      {/* Name & Description */}
      <div className="mb-6 space-y-3">
        <div className="space-y-1">
          <Label htmlFor="project-name">{localize('com_ui_name')}</Label>
          <Input
            id="project-name"
            value={name}
            onChange={handleFieldChange(setName)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="project-desc">{localize('com_ui_description')}</Label>
          <Input
            id="project-desc"
            value={description}
            onChange={handleFieldChange(setDescription)}
            placeholder={localize('com_ui_project_description_placeholder')}
          />
        </div>
      </div>

      {/* Color */}
      <div className="mb-6 space-y-2">
        <Label>{localize('com_ui_color')}</Label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`size-6 rounded-full border-2 transition-transform ${
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
      <div className="mb-6 space-y-2">
        <Label htmlFor="project-instructions">{localize('com_ui_project_instructions')}</Label>
        <p className="text-xs text-text-tertiary">
          {localize('com_ui_project_instructions_desc')}
        </p>
        <Textarea
          id="project-instructions"
          value={instructions}
          onChange={handleFieldChange(setInstructions)}
          placeholder={localize('com_ui_project_instructions_placeholder')}
          rows={6}
          className="resize-y"
        />
      </div>

      {/* Knowledge Base */}
      <div className="mb-6 space-y-2">
        <Label>{localize('com_ui_knowledge_base')}</Label>
        <p className="text-xs text-text-tertiary">
          {localize('com_ui_knowledge_base_desc')}
        </p>
        <div className="rounded-lg border border-dashed border-border-medium p-4 text-center">
          <FileText className="mx-auto mb-2 size-8 text-text-tertiary" aria-hidden="true" />
          <p className="text-sm text-text-secondary">
            {localize('com_ui_knowledge_base_coming_soon')}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-border-light pt-4">
        <Button
          variant="outline"
          className={confirmDelete ? 'border-red-500 text-red-500 hover:bg-red-500/10' : ''}
          onClick={handleDelete}
          disabled={deleteMutation.isLoading}
        >
          <Trash2 className="mr-2 size-4" aria-hidden="true" />
          {confirmDelete ? localize('com_ui_confirm_delete') : localize('com_ui_delete_project')}
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isLoading || !name.trim()}
        >
          {localize('com_ui_save')}
        </Button>
      </div>
    </div>
  );
}
