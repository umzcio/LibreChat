import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Constants } from 'librechat-data-provider';
import { useToastContext } from '@librechat/client';
import type { TConversation } from 'librechat-data-provider';
import { useUpdateConversationMutation } from '~/data-provider';
import { ConvoOptions } from '~/components/Conversations/ConvoOptions';
import RenameForm from '~/components/Conversations/RenameForm';
import { useNavigateToConvo, useLocalize } from '~/hooks';
import { NotificationSeverity } from '~/common';
import { cn, logger } from '~/utils';

export default function ZdockConvoItem({
  conversation,
  zdockId,
  onConvoRemoved,
  relativeTime,
}: {
  conversation: TConversation;
  zdockId: string;
  onConvoRemoved?: () => void;
  relativeTime?: string;
}) {
  const params = useParams();
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { navigateToConvo } = useNavigateToConvo();

  const currentConvoId = useMemo(() => params.conversationId, [params.conversationId]);
  const updateConvoMutation = useUpdateConversationMutation(currentConvoId ?? '');
  const { conversationId, title = '' } = conversation;

  const [titleInput, setTitleInput] = useState(title || '');
  const [renaming, setRenaming] = useState(false);
  const [isPopoverActive, setIsPopoverActive] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const previousTitle = useRef(title);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (title !== previousTitle.current) {
      setTitleInput(title as string);
      previousTitle.current = title;
    }
  }, [title]);

  const isActiveConvo = currentConvoId === conversationId;

  const handleRename = () => {
    setIsPopoverActive(false);
    setTitleInput(title as string);
    setRenaming(true);
  };

  const handleRenameSubmit = async (newTitle: string) => {
    if (!conversationId || newTitle === title) {
      setRenaming(false);
      return;
    }
    try {
      await updateConvoMutation.mutateAsync({
        conversationId,
        title: newTitle.trim() || localize('com_ui_untitled'),
      });
      setRenaming(false);
    } catch (error) {
      logger.error('Error renaming conversation', error);
      setTitleInput(title as string);
      showToast({
        message: localize('com_ui_rename_failed'),
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
      setRenaming(false);
    }
  };

  const handleMouseEnter = useCallback(() => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }
  }, [hasInteracted]);

  const handleMouseLeave = useCallback(() => {
    if (!isPopoverActive) {
      setHasInteracted(false);
    }
  }, [isPopoverActive]);

  const handlePopoverOpenChange = useCallback((open: boolean) => {
    setIsPopoverActive(open);
    if (!open) {
      requestAnimationFrame(() => {
        const container = containerRef.current;
        if (container && !container.contains(document.activeElement)) {
          setHasInteracted(false);
        }
      });
    }
  }, []);

  const handleClick = () => {
    if (renaming || isPopoverActive) {
      return;
    }
    navigateToConvo({ ...conversation, zdockId } as TConversation, {
      currentConvoId,
      resetLatestMessage: true,
    });
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'group relative flex h-10 w-full items-center rounded-lg',
        isActiveConvo || isPopoverActive
          ? 'bg-surface-active-alt'
          : 'hover:bg-surface-hover',
      )}
      role="button"
      tabIndex={renaming ? -1 : 0}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (!renaming && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      style={{ cursor: renaming ? 'default' : 'pointer' }}
    >
      {renaming ? (
        <RenameForm
          titleInput={titleInput}
          setTitleInput={setTitleInput}
          onSubmit={handleRenameSubmit}
          onCancel={() => {
            setRenaming(false);
            setTitleInput(title as string);
          }}
          localize={localize}
        />
      ) : (
        <div className="flex flex-1 items-center gap-2 overflow-hidden px-2.5">
          <div
            className={cn(
              'size-[3px] shrink-0 rounded-full',
              isActiveConvo ? 'opacity-100' : 'opacity-0',
            )}
            style={{ background: 'var(--text-primary)' }}
          />
          <span className="flex-1 truncate text-[13px] text-text-primary">
            {title || 'New Chat'}
          </span>
          {relativeTime && (
            <span className="shrink-0 text-[11px] text-text-tertiary">{relativeTime}</span>
          )}
        </div>
      )}
      <div
        className={cn(
          'mr-2 flex shrink-0',
          isPopoverActive || isActiveConvo
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100',
        )}
      >
        {!renaming && (hasInteracted || isActiveConvo) && (
          <ConvoOptions
            conversationId={conversationId}
            title={title}
            retainView={onConvoRemoved ?? (() => {})}
            renameHandler={handleRename}
            isActiveConvo={isActiveConvo}
            isPopoverActive={isPopoverActive}
            setIsPopoverActive={handlePopoverOpenChange}
            index={0}
            zdockId={zdockId}
          />
        )}
      </div>
    </div>
  );
}
