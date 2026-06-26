import { useState, useId, useCallback, useMemo } from 'react';
import * as Ariakit from '@ariakit/react';
import { useNavigate } from 'react-router-dom';
import { DropdownPopup, useToastContext } from '@librechat/client';
import { Ellipsis, Pen, Trash } from 'lucide-react';
import type { MouseEvent } from 'react';
import type { TZdock } from 'librechat-data-provider';
import { useUpdateZdockMutation, useDeleteZdockMutation } from '~/data-provider';
import { getProjectIcon } from '~/components/SidePanel/Zdocks/ZdockCreateDialog';
import RenameForm from '~/components/Conversations/RenameForm';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

export default function ZdockCard({ project }: { project: TZdock }) {
  const navigate = useNavigate();
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const menuId = useId();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [titleInput, setTitleInput] = useState(project.name);

  const updateMutation = useUpdateZdockMutation({
    onSuccess: () => {
      setRenaming(false);
    },
    onError: () => {
      showToast({ message: localize('com_ui_error_save_zdock'), status: 'error' });
    },
  });

  const deleteMutation = useDeleteZdockMutation({
    onSuccess: () => {
      showToast({ message: localize('com_ui_zdock_deleted'), status: 'success' });
    },
    onError: () => {
      showToast({ message: localize('com_ui_error_delete_zdock'), status: 'error' });
    },
  });

  const handleRename = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      setTitleInput(project.name);
      setRenaming(true);
      setIsMenuOpen(false);
    },
    [project.name],
  );

  const handleSubmitRename = useCallback(
    (title: string) => {
      const trimmed = title.trim() || project.name;
      updateMutation.mutate({
        zdockId: project.zdockId,
        data: { name: trimmed },
      });
    },
    [project.zdockId, project.name, updateMutation],
  );

  const handleDelete = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      setIsMenuOpen(false);
      deleteMutation.mutate(project.zdockId);
    },
    [project.zdockId, deleteMutation],
  );

  const dropdownItems = useMemo(
    () => [
      {
        label: localize('com_ui_rename'),
        onClick: handleRename,
        icon: <Pen className="icon-sm mr-2 text-text-primary" aria-hidden="true" />,
      },
      {
        label: localize('com_ui_delete'),
        onClick: handleDelete,
        icon: <Trash className="icon-sm mr-2 text-text-primary" aria-hidden="true" />,
      },
    ],
    [localize, handleRename, handleDelete],
  );

  return (
    <div className="group relative flex w-full items-center rounded-lg text-sm text-text-primary hover:bg-surface-hover">
      {renaming ? (
        <RenameForm
          titleInput={titleInput}
          setTitleInput={setTitleInput}
          onSubmit={handleSubmitRename}
          onCancel={() => {
            setRenaming(false);
            setTitleInput(project.name);
          }}
          localize={localize}
        />
      ) : null}
      <button
        type="button"
        className="flex flex-1 items-center gap-2 overflow-hidden px-2 py-1.5"
        onClick={() => navigate(`/p/${project.zdockId}`)}
      >
        {(() => {
          const Icon = getProjectIcon(project.icon);
          return (
            <Icon
              className="size-4 shrink-0"
              style={{ color: project.color || '#3b82f6' }}
              aria-hidden="true"
            />
          );
        })()}
        <span className="truncate">{project.name}</span>
      </button>
      <div className="flex shrink-0 items-center pr-1">
        <DropdownPopup
          portal={true}
          menuId={menuId}
          focusLoop={true}
          className="z-[125]"
          unmountOnHide={true}
          isOpen={isMenuOpen}
          setIsOpen={setIsMenuOpen}
          trigger={
            <Ariakit.MenuButton
              id={`project-menu-${project.zdockId}`}
              aria-label={localize('com_ui_zdock_options')}
              aria-expanded={isMenuOpen}
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-md border-none p-0 text-sm ring-ring-primary transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50',
                isMenuOpen
                  ? 'opacity-100'
                  : 'opacity-0 focus:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 data-[open]:opacity-100',
              )}
              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
              }}
            >
              <Ellipsis className="icon-md text-text-secondary" aria-hidden={true} />
            </Ariakit.MenuButton>
          }
          items={dropdownItems}
        />
      </div>
    </div>
  );
}
