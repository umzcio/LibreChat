import type { TUserMemory } from 'librechat-data-provider';
import MemoryCardActions from './MemoryCardActions';
import { cn } from '~/utils';

interface MemoryCardProps {
  memory: TUserMemory;
  hasUpdateAccess: boolean;
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function MemoryCard({ memory, hasUpdateAccess }: MemoryCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg px-3 py-2.5',
        'border border-border-light bg-transparent',
        'hover:bg-surface-secondary',
      )}
    >
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-sm text-text-primary" title={memory.value}>
          {memory.value}
        </p>
        {hasUpdateAccess && (
          <div className="shrink-0">
            <MemoryCardActions memory={memory} />
          </div>
        )}
      </div>
      <div className="mt-1">
        <span className="text-xs text-text-secondary">
          {formatDate(memory.updated_at)}
        </span>
      </div>
    </div>
  );
}
