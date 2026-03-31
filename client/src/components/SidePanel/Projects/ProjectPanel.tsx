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
import type { TProject } from 'librechat-data-provider';
import { useListProjectsQuery } from '~/data-provider';
import { useLocalize } from '~/hooks';
import ProjectCreateDialog from './ProjectCreateDialog';
import ProjectCard from './ProjectCard';

export default function ProjectPanel() {
  const localize = useLocalize();
  const { data, isLoading } = useListProjectsQuery();
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const projects: TProject[] = useMemo(() => data?.projects ?? [], [data]);

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
      <div role="region" aria-label={localize('com_ui_projects')} className="space-y-2">
        <div className="flex items-center gap-2">
          <FilterInput
            inputId="project-search"
            label={localize('com_ui_projects_filter')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            containerClassName="flex-1"
          />
          <ProjectCreateDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <OGDialogTrigger asChild>
              <TooltipAnchor
                description={localize('com_ui_create_project')}
                side="bottom"
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0 bg-transparent"
                    aria-label={localize('com_ui_create_project')}
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="size-4" aria-hidden="true" />
                  </Button>
                }
              />
            </OGDialogTrigger>
          </ProjectCreateDialog>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <FolderKanban className="size-8 text-text-tertiary" aria-hidden="true" />
            <p className="text-sm text-text-secondary">
              {searchQuery
                ? localize('com_ui_no_projects_found')
                : localize('com_ui_no_projects')}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.projectId} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
