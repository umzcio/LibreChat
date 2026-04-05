import { memo, useRef, useEffect } from 'react';
import { FileCode2, Globe, Image, GitFork, FileText, File } from 'lucide-react';
import { cn } from '~/utils';
import type { Artifact } from '~/common';

const typeIcons: Record<string, typeof FileCode2> = {
  'application/vnd.react': FileCode2,
  'application/vnd.ant.react': FileCode2,
  'text/html': Globe,
  'application/vnd.code-html': Globe,
  'image/svg+xml': Image,
  'application/vnd.mermaid': GitFork,
  'text/markdown': FileText,
  'text/md': FileText,
  'text/plain': File,
};

function getIcon(type: string) {
  return typeIcons[type] ?? File;
}

function ArtifactTabBar({
  artifacts,
  orderedIds,
  currentId,
  onSelect,
}: {
  artifacts: Record<string, Artifact | undefined> | null;
  orderedIds: string[];
  currentId: string | null;
  onSelect: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentId]);

  if (orderedIds.length <= 1) {
    return null;
  }

  return (
    <div
      ref={scrollRef}
      className="flex flex-shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border-light bg-surface-primary-alt px-1 scrollbar-thin"
    >
      {orderedIds.map((id) => {
        const artifact = artifacts?.[id];
        if (!artifact) {
          return null;
        }
        const isActive = id === currentId;
        const Icon = getIcon(artifact.type ?? '');
        return (
          <button
            key={id}
            ref={isActive ? activeRef : undefined}
            onClick={() => onSelect(id)}
            className={cn(
              'flex max-w-[160px] flex-shrink-0 items-center gap-1.5 rounded-t-md px-2.5 py-1.5 text-xs transition-colors',
              isActive
                ? 'bg-surface-primary text-text-primary border-b-2 border-blue-500 font-medium'
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
            )}
            title={artifact.title ?? artifact.identifier ?? 'Artifact'}
          >
            <Icon size={12} className="flex-shrink-0" aria-hidden="true" />
            <span className="truncate">{artifact.title ?? artifact.identifier ?? 'Artifact'}</span>
          </button>
        );
      })}
    </div>
  );
}

export default memo(ArtifactTabBar);
