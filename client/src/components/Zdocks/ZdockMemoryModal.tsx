import { X, Trash2 } from 'lucide-react';
import {
  Button,
  OGDialog,
  OGDialogContent,
  OGDialogHeader,
  OGDialogTitle,
  OGDialogFooter,
  Spinner,
  useToastContext,
} from '@librechat/client';
import { QueryKeys, dataService } from 'librechat-data-provider';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalize } from '~/hooks';

export default function ZdockMemoryModal({
  open,
  onOpenChange,
  zdockId,
  memory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zdockId: string;
  memory: string[];
}) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const queryClient = useQueryClient();

  const handleDeleteEntry = async (index: number) => {
    try {
      await dataService.deleteProjectMemoryEntry(zdockId, index);
      queryClient.setQueryData(
        [QueryKeys.zdock, zdockId],
        (old: { memory?: string[]; memoryUpdatedAt?: string } | undefined) => {
          if (!old) {
            return old;
          }
          const newMemory = [...(old.memory || [])];
          newMemory.splice(index, 1);
          return { ...old, memory: newMemory };
        },
      );
    } catch {
      showToast({ message: 'Error deleting memory entry', status: 'error' });
    }
  };

  const handleClearAll = async () => {
    try {
      await dataService.clearProjectMemory(zdockId);
      queryClient.setQueryData(
        [QueryKeys.zdock, zdockId],
        (old: { memory?: string[]; memoryUpdatedAt?: string } | undefined) => {
          if (!old) {
            return old;
          }
          return { ...old, memory: [], memoryUpdatedAt: undefined };
        },
      );
      onOpenChange(false);
    } catch {
      showToast({ message: 'Error clearing memory', status: 'error' });
    }
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="max-w-md gap-0 p-0">
        <OGDialogHeader className="px-5 pb-3 pt-5">
          <OGDialogTitle className="text-base">
            {localize('com_ui_project_memory')}
          </OGDialogTitle>
        </OGDialogHeader>

        <div className="max-h-[400px] overflow-y-auto px-5 pb-4">
          {memory.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-secondary">
              No memory entries yet. Memory is generated automatically from your conversations.
            </p>
          ) : (
            <div className="space-y-1">
              {memory.map((entry, index) => (
                <div
                  key={index}
                  className="group flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-hover"
                >
                  <span className="mt-0.5 text-text-tertiary">·</span>
                  <span className="flex-1 text-xs leading-relaxed text-text-secondary">{entry}</span>
                  <button
                    type="button"
                    className="mt-0.5 shrink-0 rounded p-0.5 text-text-tertiary opacity-0 hover:text-red-500 group-hover:opacity-100"
                    onClick={() => handleDeleteEntry(index)}
                    aria-label="Delete entry"
                  >
                    <X className="size-3" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {memory.length > 0 && (
          <OGDialogFooter className="border-t border-border-light px-5 py-3">
            <Button
              variant="outline"
              size="sm"
              className="border-red-800/35 text-red-700 hover:bg-red-500/10"
              onClick={handleClearAll}
            >
              <Trash2 className="mr-1.5 size-3.5" aria-hidden="true" />
              Clear all
            </Button>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {localize('com_ui_close')}
            </Button>
          </OGDialogFooter>
        )}
      </OGDialogContent>
    </OGDialog>
  );
}
