import { useMemo, useState } from 'react';
import { Plus, FolderKanban } from 'lucide-react';
import { matchSorter } from 'match-sorter';
import {
  Button,
  Spinner,
  FilterInput,
  OGDialogTrigger,
  TooltipAnchor,
} from '@librechat/client';
import type { TZdock } from 'librechat-data-provider';
import { useListZdocksQuery } from '~/data-provider';
import { useLocalize } from '~/hooks';
import ZdockCreateDialog from './ZdockCreateDialog';
import ZdockCard from './ZdockCard';

export default function ZdockPanel() {
  const localize = useLocalize();
  const { data, isLoading } = useListZdocksQuery();
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const projects: TZdock[] = useMemo(() => data?.projects ?? [], [data]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery) {
      return projects;
    }
    return matchSorter(projects, searchQuery, {
      keys: ['name', 'description'],
    });
  }, [projects, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex h-auto w-full flex-col px-3 pb-3">
      <div role="region" aria-label={localize('com_ui_zdocks')} className="space-y-2">
        <div className="flex items-center gap-2">
          <FilterInput
            inputId="project-search"
            label={localize('com_ui_zdocks_filter')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            containerClassName="flex-1"
          />
          <ZdockCreateDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <OGDialogTrigger asChild>
              <TooltipAnchor
                description={localize('com_ui_create_zdock')}
                side="bottom"
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0 bg-transparent"
                    aria-label={localize('com_ui_create_zdock')}
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </Button>
                }
              />
            </OGDialogTrigger>
          </ZdockCreateDialog>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <FolderKanban className="size-8 text-text-tertiary" aria-hidden="true" />
            <p className="text-sm text-text-secondary">
              {searchQuery
                ? localize('com_ui_no_zdocks_found')
                : localize('com_ui_no_zdocks')}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredProjects.map((project) => (
              <ZdockCard key={project.zdockId} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
