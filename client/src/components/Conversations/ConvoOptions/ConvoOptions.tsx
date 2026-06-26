import { useState, useId, useRef, memo, useCallback, useMemo } from 'react';
import * as Ariakit from '@ariakit/react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import {
  QueryKeys,
  PermissionTypes,
  Permissions,
  dataService,
} from 'librechat-data-provider';
import { useQueryClient } from '@tanstack/react-query';
import { DropdownPopup, Spinner, useToastContext } from '@librechat/client';
import {
  Ellipsis,
  Share2,
  CopyPlus,
  Archive,
  Pen,
  Pin,
  Trash,
  FolderInput,
  FolderOutput,
  FolderX,
  Code2,
} from 'lucide-react';
import type { MouseEvent } from 'react';
import type { TMessage } from 'librechat-data-provider';
import type { MouseEvent } from 'react';
import {
  useDuplicateConversationMutation,
  useDeleteConversationMutation,
  useGetStartupConfig,
  useArchiveConvoMutation,
  usePinConversationMutation,
} from '~/data-provider';
import { useHasAccess, useLocalize, useNavigateToConvo, useNewConvo } from '~/hooks';
import { NotificationSeverity } from '~/common';
import MoveToZdockDialog from '~/components/Zdocks/MoveToZdockDialog';
import DeleteButton from './DeleteButton';
import ShareButton from './ShareButton';
import { buildConversationPath, cn, getConversationModeFromPath } from '~/utils';

function ConvoOptions({
  conversationId,
  title,
  isPinned = false,
  retainView,
  renameHandler,
  isPopoverActive,
  setIsPopoverActive,
  isActiveConvo,
  isShiftHeld = false,
  index = 0,
  zdockId,
}: {
  conversationId: string | null;
  title: string | null;
  isPinned?: boolean;
  retainView: () => void;
  renameHandler: (e: MouseEvent) => void;
  isPopoverActive: boolean;
  setIsPopoverActive: (open: boolean) => void;
  isActiveConvo: boolean;
  isShiftHeld?: boolean;
  index?: number;
  zdockId?: string;
}) {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const { data: startupConfig } = useGetStartupConfig();
  const { navigateToConvo } = useNavigateToConvo(index);
  const { showToast } = useToastContext();

  const navigate = useNavigate();
  const location = useLocation();
  const { conversationId: currentConvoId, zdockId: routeProjectId } = useParams();
  const { newConversation } = useNewConvo();

  const menuId = useId();
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const moveButtonRef = useRef<HTMLButtonElement>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const canCreateSharedLinks = useHasAccess({
    permissionType: PermissionTypes.SHARED_LINKS,
    permission: Permissions.CREATE,
  });

  const archiveConvoMutation = useArchiveConvoMutation();
  const pinConvoMutation = usePinConversationMutation();

  const deleteMutation = useDeleteConversationMutation({
    onSuccess: () => {
      if (currentConvoId === conversationId || currentConvoId === 'new') {
        newConversation();
        navigate(
          buildConversationPath({
            conversationId: 'new',
            mode: getConversationModeFromPath(location.pathname),
            zdockId: zdockId ?? routeProjectId,
          }),
          { replace: true },
        );
      }
      retainView();
      showToast({
        message: localize('com_ui_convo_delete_success'),
        severity: NotificationSeverity.SUCCESS,
        showIcon: true,
      });
    },
    onError: () => {
      showToast({
        message: localize('com_ui_convo_delete_error'),
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
    },
  });

  const duplicateConversation = useDuplicateConversationMutation({
    onSuccess: (data) => {
      navigateToConvo(data.conversation);
      showToast({
        message: localize('com_ui_duplication_success'),
        status: 'success',
      });
      setIsPopoverActive(false);
    },
    onMutate: () => {
      showToast({
        message: localize('com_ui_duplication_processing'),
        status: 'info',
      });
    },
    onError: () => {
      showToast({
        message: localize('com_ui_duplication_error'),
        status: 'error',
      });
    },
  });

  const isDuplicateLoading = duplicateConversation.isLoading;
  const isArchiveLoading = archiveConvoMutation.isLoading;
  const isPinLoading = pinConvoMutation.isLoading;
  const isDeleteLoading = deleteMutation.isLoading;

  const shareHandler = useCallback(() => {
    setShowShareDialog(true);
  }, []);

  const deleteHandler = useCallback(() => {
    setShowDeleteDialog(true);
  }, []);

  const handleInstantDelete = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      const convoId = conversationId ?? '';
      if (!convoId) {
        return;
      }
      const messages = queryClient.getQueryData<TMessage[]>([QueryKeys.messages, convoId]);
      const thread_id = messages?.[messages.length - 1]?.thread_id;
      const endpoint = messages?.[messages.length - 1]?.endpoint;
      deleteMutation.mutate({ conversationId: convoId, thread_id, endpoint, source: 'button' });
    },
    [conversationId, deleteMutation, queryClient],
  );

  const handleArchiveClick = useCallback(
    async (e?: MouseEvent) => {
      e?.stopPropagation();
      const convoId = conversationId ?? '';
      if (!convoId) {
        return;
      }

      archiveConvoMutation.mutate(
        { conversationId: convoId, isArchived: true },
        {
          onSuccess: () => {
            setAnnouncement(localize('com_ui_convo_archived'));
            setTimeout(() => {
              setAnnouncement('');
            }, 10000);
            if (currentConvoId === convoId || currentConvoId === 'new') {
              newConversation();
              navigate(
                buildConversationPath({
                  conversationId: 'new',
                  mode: getConversationModeFromPath(location.pathname),
                  zdockId: zdockId ?? routeProjectId,
                }),
                { replace: true },
              );
            }
            retainView();
            setIsPopoverActive(false);
          },
          onError: () => {
            showToast({
              message: localize('com_ui_archive_error'),
              severity: NotificationSeverity.ERROR,
              showIcon: true,
            });
          },
        },
      );
    },
    [
      conversationId,
      currentConvoId,
      archiveConvoMutation,
      navigate,
      newConversation,
      zdockId,
      routeProjectId,
      retainView,
      setIsPopoverActive,
      showToast,
      localize,
    ],
  );

  const handlePinClick = useCallback(() => {
    const convoId = conversationId ?? '';
    if (!convoId) {
      return;
    }
    pinConvoMutation.mutate(
      { conversationId: convoId, pinned: !isPinned },
      {
        onSuccess: () => setIsPopoverActive(false),
        onError: () => {
          showToast({
            message: localize(isPinned ? 'com_ui_unpin_error' : 'com_ui_pin_error'),
            severity: NotificationSeverity.ERROR,
            showIcon: true,
          });
        },
      },
    );
  }, [conversationId, isPinned, pinConvoMutation, setIsPopoverActive, showToast, localize]);

  const handleDuplicateClick = useCallback(() => {
    duplicateConversation.mutate({
      conversationId: conversationId ?? '',
    });
  }, [conversationId, duplicateConversation]);

  const dropdownItems = useMemo(
    () => [
      {
        label: localize('com_ui_share'),
        onClick: shareHandler,
        icon: <Share2 className="icon-sm mr-2 text-text-primary" aria-hidden="true" />,
        show: startupConfig && startupConfig.sharedLinksEnabled && canCreateSharedLinks,
        ariaHasPopup: 'dialog' as const,
        ariaControls: 'share-conversation-dialog',
        /** NOTE: THE FOLLOWING PROPS ARE REQUIRED FOR MENU ITEMS THAT OPEN DIALOGS */
        hideOnClick: false,
        ref: shareButtonRef,
        render: (props) => <button {...props} />,
      },
      {
        label: localize(isPinned ? 'com_ui_unpin' : 'com_ui_pin'),
        onClick: handlePinClick,
        hideOnClick: false,
        icon: isPinLoading ? (
          <Spinner className="size-4" />
        ) : (
          <Pin className="icon-sm mr-2 text-text-primary" aria-hidden="true" />
        ),
      },
      {
        label: localize('com_ui_rename'),
        onClick: renameHandler,
        icon: <Pen className="icon-sm mr-2 text-text-primary" aria-hidden="true" />,
      },
      {
        label: localize('com_ui_duplicate'),
        onClick: handleDuplicateClick,
        hideOnClick: false,
        icon: isDuplicateLoading ? (
          <Spinner className="size-4" />
        ) : (
          <CopyPlus className="icon-sm mr-2 text-text-primary" aria-hidden="true" />
        ),
      },
      {
        label: localize('com_ui_open_in_librecode'),
        onClick: () => {
          if (!conversationId) {
            return;
          }

          navigate(
            buildConversationPath({
              conversationId,
              mode: 'code',
              zdockId,
            }),
          );
          setIsPopoverActive(false);
        },
        icon: <Code2 className="icon-sm mr-2 text-text-primary" aria-hidden="true" />,
      },
      {
        label: localize('com_ui_move_to_zdock'),
        onClick: () => {
          setShowMoveDialog(true);
        },
        icon: <FolderInput className="icon-sm mr-2 text-text-primary" aria-hidden="true" />,
        ariaHasPopup: 'dialog' as const,
        ariaControls: 'move-to-project-dialog',
        hideOnClick: false,
        ref: moveButtonRef,
        render: (props) => <button {...props} />,
      },
      {
        label: localize('com_ui_remove_from_zdock'),
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          if (!zdockId || !conversationId) {
            return;
          }
          // Optimistic: remove from cache immediately
          queryClient.setQueryData(
            [QueryKeys.zdockConversations, zdockId],
            (old: { conversations: Array<{ conversationId?: string }> } | undefined) => {
              if (!old) {
                return old;
              }
              return {
                ...old,
                conversations: old.conversations.filter(
                  (c) => c.conversationId !== conversationId,
                ),
              };
            },
          );
          // Fire API call in background
          dataService.removeConversationFromProject(zdockId, conversationId).catch(() => {
            // Revert on failure
            queryClient.invalidateQueries([QueryKeys.zdockConversations, zdockId]);
            showToast({
              message: localize('com_ui_error_remove_from_zdock'),
              severity: NotificationSeverity.ERROR,
              showIcon: true,
            });
          });
          showToast({
            message: localize('com_ui_removed_from_zdock'),
            severity: NotificationSeverity.SUCCESS,
            showIcon: true,
          });
        },
        icon: <FolderOutput className="icon-sm mr-2 text-text-primary" aria-hidden="true" />,
        show: !!zdockId,
      },
      {
        label: localize('com_ui_archive'),
        onClick: handleArchiveClick,
        hideOnClick: false,
        icon: isArchiveLoading ? (
          <Spinner className="size-4" />
        ) : (
          <Archive className="icon-sm mr-2 text-text-primary" aria-hidden="true" />
        ),
      },
      {
        label: localize('com_ui_delete'),
        onClick: deleteHandler,
        icon: <Trash className="icon-sm mr-2 text-text-primary" aria-hidden="true" />,
        ariaHasPopup: 'dialog' as const,
        ariaControls: 'delete-conversation-dialog',
        /** NOTE: THE FOLLOWING PROPS ARE REQUIRED FOR MENU ITEMS THAT OPEN DIALOGS */
        hideOnClick: false,
        ref: deleteButtonRef,
        render: (props) => <button {...props} />,
      },
    ],
    [
      localize,
      isPinned,
      isPinLoading,
      shareHandler,
      startupConfig,
      renameHandler,
      deleteHandler,
      isArchiveLoading,
      isDuplicateLoading,
      handlePinClick,
      handleArchiveClick,
      canCreateSharedLinks,
      handleDuplicateClick,
      zdockId,
      conversationId,
      queryClient,
      showToast,
      setIsPopoverActive,
      retainView,
      navigate,
      location.pathname,
    ],
  );

  const buttonClassName = cn(
    'inline-flex h-7 w-7 items-center justify-center rounded-md border-none p-0 text-sm font-medium ring-ring-primary transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50',
    isActiveConvo === true || isPopoverActive
      ? 'opacity-100'
      : 'opacity-0 focus:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 data-[open]:opacity-100',
  );

  if (isShiftHeld && isActiveConvo && !isPopoverActive && !showShareDialog && !showDeleteDialog) {
    return (
      <div className="flex items-center gap-0.5">
        <button
          aria-label={localize('com_ui_archive')}
          className={cn(buttonClassName, 'hover:bg-surface-hover')}
          onClick={handleArchiveClick}
          disabled={isArchiveLoading}
        >
          {isArchiveLoading ? (
            <Spinner className="size-4" />
          ) : (
            <Archive className="icon-md text-text-secondary" aria-hidden={true} />
          )}
        </button>
        <button
          aria-label={localize('com_ui_delete')}
          className={cn(buttonClassName, 'hover:bg-surface-hover')}
          onClick={handleInstantDelete}
          disabled={isDeleteLoading}
        >
          {isDeleteLoading ? (
            <Spinner className="size-4" />
          ) : (
            <Trash className="icon-md text-text-secondary" aria-hidden={true} />
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
      <DropdownPopup
        portal={true}
        menuId={menuId}
        focusLoop={true}
        className="z-[125]"
        unmountOnHide={true}
        isOpen={isPopoverActive}
        setIsOpen={setIsPopoverActive}
        trigger={
          <Ariakit.MenuButton
            id={`conversation-menu-${conversationId}`}
            aria-label={localize('com_nav_convo_menu_options')}
            aria-expanded={isPopoverActive}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center gap-2 rounded-md border-none p-0 text-sm font-medium ring-ring-primary transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50',
              isActiveConvo === true || isPopoverActive
                ? 'opacity-100'
                : 'opacity-0 focus:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 data-[open]:opacity-100',
            )}
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
            }}
            onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
              }
            }}
          >
            <Ellipsis className="icon-md text-text-secondary" aria-hidden={true} />
          </Ariakit.MenuButton>
        }
        items={dropdownItems}
      />
      {showShareDialog && (
        <ShareButton
          conversationId={conversationId ?? ''}
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          triggerRef={shareButtonRef}
        />
      )}
      {showDeleteDialog && (
        <DeleteButton
          title={title ?? ''}
          retainView={retainView}
          triggerRef={deleteButtonRef}
          setMenuOpen={setIsPopoverActive}
          showDeleteDialog={showDeleteDialog}
          conversationId={conversationId ?? ''}
          setShowDeleteDialog={setShowDeleteDialog}
        />
      )}
      {showMoveDialog && (
        <MoveToZdockDialog
          open={showMoveDialog}
          onOpenChange={setShowMoveDialog}
          conversationIds={conversationId ? [conversationId] : []}
          triggerRef={moveButtonRef}
        />
      )}
    </>
  );
}

export default memo(ConvoOptions, (prevProps, nextProps) => {
  return (
    prevProps.conversationId === nextProps.conversationId &&
    prevProps.title === nextProps.title &&
    prevProps.isPinned === nextProps.isPinned &&
    prevProps.isPopoverActive === nextProps.isPopoverActive &&
    prevProps.isActiveConvo === nextProps.isActiveConvo &&
    prevProps.isShiftHeld === nextProps.isShiftHeld &&
    prevProps.zdockId === nextProps.zdockId &&
    prevProps.retainView === nextProps.retainView
  );
});
