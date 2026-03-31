import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Button,
  Input,
  Label,
  Textarea,
  OGDialog,
  OGDialogContent,
  OGDialogHeader,
  OGDialogTitle,
  OGDialogFooter,
  useToastContext,
} from '@librechat/client';
import { useCreateProjectMutation } from '~/data-provider';
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

export default function ProjectCreateDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactNode;
}) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  const createMutation = useCreateProjectMutation({
    onSuccess: () => {
      showToast({ message: localize('com_ui_project_created'), status: 'success' });
      onOpenChange(false);
      setName('');
      setDescription('');
      setInstructions('');
      setColor(COLORS[0]);
    },
    onError: () => {
      showToast({ message: localize('com_ui_error_create_project'), status: 'error' });
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      instructions: instructions.trim() || undefined,
      color,
    });
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      {children}
      <OGDialogContent className="max-w-md">
        <OGDialogHeader>
          <OGDialogTitle>{localize('com_ui_create_project')}</OGDialogTitle>
        </OGDialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="project-name">{localize('com_ui_name')}</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={localize('com_ui_project_name_placeholder')}
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="project-description">{localize('com_ui_description')}</Label>
            <Input
              id="project-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={localize('com_ui_project_description_placeholder')}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="project-instructions">{localize('com_ui_project_instructions')}</Label>
            <Textarea
              id="project-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={localize('com_ui_project_instructions_placeholder')}
              rows={4}
            />
          </div>
          <div className="space-y-1">
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
                  onClick={() => setColor(c)}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </div>
        <OGDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {localize('com_ui_cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || createMutation.isLoading}
          >
            {localize('com_ui_create')}
          </Button>
        </OGDialogFooter>
      </OGDialogContent>
    </OGDialog>
  );
}
