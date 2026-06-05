import { useState } from 'react';
import { Plus, Check, MessageSquare } from 'lucide-react';
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
import type { TConversation } from 'librechat-data-provider';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAssignConversationsToZdockMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

export default function AddConversationsToZdockDialog({
  open,
  onOpenChange,
  zdockId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zdockId: string;
}) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const { showToast } = useToastContext();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery(
    ['recentConversations', search],
    () => dataService.listConversations({ isArchived: false, search: search || undefined }),
    { enabled: open, refetchOnWindowFocus: false },
  );

  const assignMutation = useAssignConversationsToZdockMutation({
    onSuccess: () => {
      showToast({ message: localize('com_ui_moved_to_project'), status: 'success' });
      queryClient.invalidateQueries([QueryKeys.zdockConversations, zdockId]);
      onOpenChange(false);
      setSelected(new Set());
    },
    onError: () => {
      showToast({ message: localize('com_ui_error_move_to_project'), status: 'error' });
    },
  });

  const conversations = (data?.conversations ?? []).filter(
    (c: TConversation) => c.zdockId !== zdockId,
  );

  const toggleSelect = (convoId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(convoId)) {
        next.delete(convoId);
      } else {
        next.add(convoId);
      }
      return next;
    });
  };

  const handleAdd = () => {
    if (selected.size === 0) {
      return;
    }
    assignMutation.mutate({
      zdockId,
      conversationIds: Array.from(selected),
    });
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="max-w-md gap-0 p-0">
        <OGDialogHeader className="px-5 pb-2 pt-5">
          <OGDialogTitle className="text-base">
            {localize('com_ui_add_conversations')}
          </OGDialogTitle>
        </OGDialogHeader>

        <div className="px-5 pb-3">
          <input
            type="text"
            className="w-full rounded-lg border border-border-medium bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
            placeholder={localize('com_ui_search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="max-h-72 overflow-y-auto px-3 pb-3">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner className="size-5" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-secondary">
              {localize('com_ui_no_conversation_found')}
            </p>
          ) : (
            <div className="space-y-0.5">
              {conversations.map((convo: TConversation) => {
                const isSelected = selected.has(convo.conversationId ?? '');
                return (
                  <button
                    key={convo.conversationId}
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-primary',
                      isSelected ? 'bg-surface-active-alt' : 'hover:bg-surface-hover',
                    )}
                    onClick={() => toggleSelect(convo.conversationId ?? '')}
                  >
                    <div
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded border',
                        isSelected
                          ? 'border-text-primary bg-text-primary'
                          : 'border-border-medium',
                      )}
                    >
                      {isSelected && <Check className="size-3 text-surface-primary" />}
                    </div>
                    <MessageSquare className="size-4 shrink-0 text-text-tertiary" aria-hidden="true" />
                    <span className="flex-1 truncate text-left">
                      {convo.title || 'New Chat'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <OGDialogFooter className="border-t border-border-light px-5 py-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {localize('com_ui_cancel')}
          </Button>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={selected.size === 0 || assignMutation.isLoading}
          >
            {assignMutation.isLoading ? (
              <Spinner className="size-4" />
            ) : (
              <>
                <Plus className="mr-1 size-4" />
                {localize('com_ui_add')} ({selected.size})
              </>
            )}
          </Button>
        </OGDialogFooter>
      </OGDialogContent>
    </OGDialog>
  );
}
