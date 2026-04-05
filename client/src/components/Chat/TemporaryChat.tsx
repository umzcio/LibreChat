import React, { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { TooltipAnchor } from '@librechat/client';
import { MessageCircleDashed } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import store from '~/store';

export function TemporaryChat() {
  const localize = useLocalize();
  const [isTemporary, setIsTemporary] = useAtom(store.isTemporary);
  const hasMessages = useAtomValue(store.conversationHasMessagesByIndex(0));
  const isSubmitting = useAtomValue(store.isSubmittingFamily(0));

  const handleBadgeToggle = useCallback(() => {
    setIsTemporary(!isTemporary);
  }, [isTemporary, setIsTemporary]);

  if (hasMessages || isSubmitting) {
    return null;
  }

  return (
    <div className="relative flex flex-wrap items-center gap-2">
      <TooltipAnchor
        description={localize('com_ui_temporary')}
        render={
          <button
            onClick={handleBadgeToggle}
            aria-label={localize('com_ui_temporary')}
            aria-pressed={isTemporary}
            className={cn(
              'inline-flex size-9 flex-shrink-0 items-center justify-center rounded-xl border border-border-light text-text-primary transition-all ease-in-out',
              isTemporary
                ? 'bg-surface-active'
                : 'bg-presentation shadow-sm hover:bg-surface-active-alt',
            )}
          >
            <MessageCircleDashed className="icon-md" aria-hidden="true" />
          </button>
        }
      />
    </div>
  );
}
