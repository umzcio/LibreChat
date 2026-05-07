import { useMemo, useState, useEffect } from 'react';
import { matchSorter } from 'match-sorter';
import { SystemRoles, PermissionTypes, Permissions } from 'librechat-data-provider';
import {
  Button,
  Checkbox,
  Spinner,
  FilterInput,
  useToastContext,
} from '@librechat/client';
import type { TUserMemory } from 'librechat-data-provider';
import {
  useUpdateMemoryPreferencesMutation,
  useMemoriesQuery,
  useGetUserQuery,
} from '~/data-provider';
import { useLocalize, useAuthContext, useHasAccess } from '~/hooks';
import AdminSettings from './AdminSettings';
import MemoryList from './MemoryList';

const pageSize = 10;

export default function MemoryPanel() {
  const localize = useLocalize();
  const { user } = useAuthContext();
  const { data: userData } = useGetUserQuery();
  const { data: memData, isLoading } = useMemoriesQuery();
  const { showToast } = useToastContext();
  const [pageIndex, setPageIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [referenceSavedMemories, setReferenceSavedMemories] = useState(true);

  const updateMemoryPreferencesMutation = useUpdateMemoryPreferencesMutation({
    onSuccess: () => {
      showToast({
        message: localize('com_ui_preferences_updated'),
        status: 'success',
      });
    },
    onError: () => {
      showToast({
        message: localize('com_ui_error_updating_preferences'),
        status: 'error',
      });
      setReferenceSavedMemories((prev) => !prev);
    },
  });

  useEffect(() => {
    if (userData?.personalization?.memories !== undefined) {
      setReferenceSavedMemories(userData.personalization.memories);
    }
  }, [userData?.personalization?.memories]);

  const handleMemoryToggle = (checked: boolean) => {
    setReferenceSavedMemories(checked);
    updateMemoryPreferencesMutation.mutate({ memories: checked });
  };

  const hasReadAccess = useHasAccess({
    permissionType: PermissionTypes.MEMORIES,
    permission: Permissions.READ,
  });

  const hasUpdateAccess = useHasAccess({
    permissionType: PermissionTypes.MEMORIES,
    permission: Permissions.UPDATE,
  });

  const hasOptOutAccess = useHasAccess({
    permissionType: PermissionTypes.MEMORIES,
    permission: Permissions.OPT_OUT,
  });

  const memories: TUserMemory[] = useMemo(() => memData?.memories ?? [], [memData]);

  const filteredMemories = useMemo(() => {
    return matchSorter(memories, searchQuery, {
      keys: ['value'],
    });
  }, [memories, searchQuery]);

  const currentRows = useMemo(() => {
    return filteredMemories.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  }, [filteredMemories, pageIndex]);

  useEffect(() => {
    setPageIndex(0);
  }, [searchQuery]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <Spinner />
      </div>
    );
  }

  if (!hasReadAccess) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="text-center">
          <p className="text-sm text-text-secondary">{localize('com_ui_no_read_access')}</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(filteredMemories.length / pageSize);

  return (
    <div className="flex h-auto w-full flex-col px-3 pb-3 pt-2">
      <div role="region" aria-label={localize('com_ui_memories')} className="space-y-2">
        {/* Header: Filter */}
        <div className="flex items-center gap-2">
          <FilterInput
            inputId="memory-search"
            label={localize('com_ui_memories_filter')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            containerClassName="flex-1"
          />
        </div>

        {/* Memory Toggle */}
        {hasOptOutAccess && (
          <div className="flex items-center justify-end">
            <Button
              size="sm"
              variant="outline"
              className={`${referenceSavedMemories ? 'bg-surface-hover hover:bg-surface-hover' : ''}`}
              onClick={() => handleMemoryToggle(!referenceSavedMemories)}
              aria-label={localize('com_ui_use_memory')}
              aria-pressed={referenceSavedMemories}
              disabled={updateMemoryPreferencesMutation.isLoading}
            >
              <Checkbox
                checked={referenceSavedMemories}
                tabIndex={-1}
                aria-hidden="true"
                className="pointer-events-none mr-2"
              />
              {localize('com_ui_use_memory')}
            </Button>
          </div>
        )}

        {/* Memory List */}
        <MemoryList
          memories={currentRows}
          hasUpdateAccess={hasUpdateAccess}
          isFiltered={searchQuery.length > 0}
        />

        {/* Footer: Admin Settings + Pagination */}
        {(user?.role === SystemRoles.ADMIN || filteredMemories.length > pageSize) && (
          <div className="flex items-center justify-between gap-2">
            {user?.role === SystemRoles.ADMIN ? <AdminSettings /> : <div />}

            {filteredMemories.length > pageSize && (
              <div className="flex items-center gap-2" role="navigation" aria-label="Pagination">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageIndex((prev) => Math.max(prev - 1, 0))}
                  disabled={pageIndex === 0}
                  aria-label={localize('com_ui_prev')}
                >
                  {localize('com_ui_prev')}
                </Button>
                <div className="whitespace-nowrap text-sm" aria-live="polite">
                  {pageIndex + 1} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageIndex((prev) => (prev + 1 < totalPages ? prev + 1 : prev))}
                  disabled={pageIndex + 1 >= totalPages}
                  aria-label={localize('com_ui_next')}
                >
                  {localize('com_ui_next')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
