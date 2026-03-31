import { FolderClosed } from 'lucide-react';
import type { TProject } from 'librechat-data-provider';
import { useNavigate } from 'react-router-dom';

export default function ProjectCard({ project }: { project: TProject }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text-primary hover:bg-surface-hover"
      onClick={() => navigate(`/p/${project.projectId}`)}
    >
      <FolderClosed
        className="size-4 shrink-0"
        style={{ color: project.color || '#3b82f6' }}
        aria-hidden="true"
      />
      <span className="truncate">{project.name}</span>
    </button>
  );
}
