import { useState } from 'react';
import { FolderInput } from 'lucide-react';
import {
  OGDialog,
  OGDialogContent,
  OGDialogHeader,
  OGDialogTitle,
  Spinner,
  useToastContext,
} from '@librechat/client';
import type { TZdock } from 'librechat-data-provider';
import { useListZdocksQuery, useAssignConversationsToZdockMutation } from '~/data-provider';
import { getProjectIcon } from '~/components/SidePanel/Zdocks/ZdockCreateDialog';
import { useLocalize } from '~/hooks';

export default function MoveToZdockDialog({
  open,
  onOpenChange,
  conversationIds,
  triggerRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationIds: string[];
  triggerRef?: React.RefObject<HTMLButtonElement>;
}) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [search, setSearch] = useState('');
  const { data: projectsData, isLoading } = useListZdocksQuery(undefined, {
    enabled: open,
  });

  const assignMutation = useAssignConversationsToZdockMutation({
    onSuccess: () => {
      showToast({ message: localize('com_ui_moved_to_zdock'), status: 'success' });
      onOpenChange(false);
    },
    onError: () => {
      showToast({ message: localize('com_ui_error_move_to_zdock'), status: 'error' });
    },
  });

  const projects = projectsData?.projects ?? [];
  const filtered = search
    ? projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : projects;

  const handleSelect = (project: TZdock) => {
    if (conversationIds.length === 0) {
      return;
    }
    assignMutation.mutate({
      zdockId: project.zdockId,
      conversationIds,
    });
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="max-w-sm gap-0 p-0">
        <OGDialogHeader className="px-5 pb-2 pt-5">
          <OGDialogTitle className="flex items-center gap-2 text-base">
            <FolderInput className="size-5" aria-hidden="true" />
            {localize('com_ui_move_to_zdock')}
          </OGDialogTitle>
        </OGDialogHeader>

        <div className="px-5 pb-3">
          <input
            type="text"
            className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
            placeholder={localize('com_ui_search_zdocks')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="max-h-64 overflow-y-auto px-3 pb-3">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner className="size-5" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-secondary">
              {localize('com_ui_no_zdocks_found')}
            </p>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((project) => {
                const Icon = getProjectIcon(project.icon);
                return (
                  <button
                    key={project.zdockId}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-primary hover:bg-surface-hover"
                    onClick={() => handleSelect(project)}
                    disabled={assignMutation.isLoading}
                  >
                    <Icon
                      className="size-4 shrink-0"
                      style={{ color: project.color || '#3b82f6' }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{project.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </OGDialogContent>
    </OGDialog>
  );
}
