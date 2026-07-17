import { useState } from 'react';
import { Trans } from 'react-i18next';
import {
  Label,
  Spinner,
  OGDialog,
  TrashIcon,
  TooltipAnchor,
  OGDialogTrigger,
  OGDialogTemplate,
  useToastContext,
} from '@librechat/client';
import type { TUserMemory } from 'librechat-data-provider';
import { useDeleteMemoryMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface MemoryCardActionsProps {
  memory: TUserMemory;
}

export default function MemoryCardActions({ memory }: MemoryCardActionsProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { mutate: deleteMemory, isLoading: isDeleting } = useDeleteMemoryMutation();

  const confirmDelete = () => {
    deleteMemory(
      { key: memory.key, agentId: memory.agentId },
      {
        onSuccess: () => {
          showToast({ message: localize('com_ui_deleted'), status: 'success' });
          setDeleteOpen(false);
        },
        onError: () => {
          showToast({ message: localize('com_ui_error'), status: 'error' });
        },
      },
    );
  };

  return (
    <OGDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <OGDialogTrigger asChild>
        <TooltipAnchor
          description={localize('com_ui_delete_memory')}
          side="top"
          render={
            <button
              className={cn(
                'flex size-7 items-center justify-center rounded-md',
                'transition-colors duration-150',
                'text-text-secondary hover:text-text-primary',
                'hover:bg-surface-tertiary',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-border-heavy',
              )}
              aria-label={localize('com_ui_delete')}
              onClick={() => setDeleteOpen(true)}
            >
              {isDeleting ? (
                <Spinner className="size-3.5" />
              ) : (
                <TrashIcon className="size-3.5" aria-hidden="true" />
              )}
            </button>
          }
        />
      </OGDialogTrigger>
      <OGDialogTemplate
        showCloseButton={false}
        title={localize('com_ui_delete_memory')}
        className="w-11/12 max-w-lg"
        main={
          <Label className="text-left text-sm font-medium">
            <Trans
              i18nKey="com_ui_delete_memory_confirm"
              defaults="Are you sure you want to delete this memory?"
            />
          </Label>
        }
        selection={{
          selectHandler: confirmDelete,
          selectClasses:
            'bg-red-700 dark:bg-red-600 hover:bg-red-800 dark:hover:bg-red-800 text-white',
          selectText: localize('com_ui_delete'),
        }}
      />
    </OGDialog>
  );
}
