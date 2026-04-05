import { useEffect, useCallback, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useLocation } from 'react-router-dom';
import type { Artifact } from '~/common';
import { logger, isArtifactRoute } from '~/utils';
import { artifactsState, currentArtifactId } from '~/store/artifacts';
import ArtifactButton from './ArtifactButton';

interface SearchReplaceBlock {
  search: string;
  replace: string;
}

export function parseSearchReplaceBlocks(text: string): SearchReplaceBlock[] {
  const blocks: SearchReplaceBlock[] = [];
  const searchDelimiter = '<<<SEARCH';
  const replaceDelimiter = '>>>REPLACE';

  let remaining = text;
  while (remaining.length > 0) {
    const searchStart = remaining.indexOf(searchDelimiter);
    if (searchStart === -1) {
      break;
    }

    const afterSearch = remaining.slice(searchStart + searchDelimiter.length);
    const searchContent = afterSearch.startsWith('\n') ? afterSearch.slice(1) : afterSearch;

    const replaceStart = searchContent.indexOf(replaceDelimiter);
    if (replaceStart === -1) {
      break;
    }

    let search = searchContent.slice(0, replaceStart);
    if (search.endsWith('\n')) {
      search = search.slice(0, -1);
    }

    const afterReplace = searchContent.slice(replaceStart + replaceDelimiter.length);
    const replaceContent = afterReplace.startsWith('\n') ? afterReplace.slice(1) : afterReplace;

    const nextSearchStart = replaceContent.indexOf(searchDelimiter);
    let replace: string;
    if (nextSearchStart === -1) {
      replace = replaceContent.replace(/\n$/, '');
      remaining = '';
    } else {
      replace = replaceContent.slice(0, nextSearchStart);
      if (replace.endsWith('\n')) {
        replace = replace.slice(0, -1);
      }
      remaining = replaceContent.slice(nextSearchStart);
    }

    if (search.length > 0 || replace.length > 0) {
      blocks.push({ search, replace });
    }
  }
  return blocks;
}

export function applySearchReplace(content: string, blocks: SearchReplaceBlock[]): string {
  let result = content;
  for (const block of blocks) {
    if (block.search.length === 0) {
      logger.log('artifacts', 'artifact-update: empty SEARCH block, aborting all blocks');
      return content;
    }

    const idx = result.indexOf(block.search);
    if (idx === -1) {
      logger.log('artifacts', 'artifact-update: SEARCH block not found, aborting all blocks', {
        search: block.search.slice(0, 100),
      });
      return content;
    }

    const nextIdx = result.indexOf(block.search, idx + block.search.length);
    if (nextIdx !== -1) {
      logger.log('artifacts', 'artifact-update: SEARCH block matched multiple locations, aborting', {
        search: block.search.slice(0, 100),
      });
      return content;
    }

    result = result.slice(0, idx) + block.replace + result.slice(idx + block.search.length);
  }
  return result;
}

function findArtifactByIdentifier(
  artifacts: Record<string, Artifact | undefined>,
  identifier: string,
): [string, Artifact] | null {
  let best: [string, Artifact] | null = null;
  for (const [key, artifact] of Object.entries(artifacts)) {
    if (artifact?.identifier !== identifier) {
      continue;
    }
    if (best === null || (artifact.lastUpdateTime ?? 0) > (best[1].lastUpdateTime ?? 0)) {
      best = [key, artifact];
    }
  }
  return best;
}

export function ArtifactUpdate({
  node: _node,
  ...props
}: {
  identifier?: string;
  rawContent?: string;
  children?: React.ReactNode;
  node: unknown;
}) {
  const location = useLocation();
  const setArtifacts = useSetAtom(artifactsState);
  const artifacts = useAtomValue(artifactsState);
  const setCurrentArtifactId = useSetAtom(currentArtifactId);
  const appliedRef = useRef(false);

  const applyUpdate = useCallback(() => {
    const identifier = props.identifier;
    const rawContent = props.rawContent ?? '';
    if (!identifier || !artifacts || !rawContent || !isArtifactRoute(location.pathname)) {
      return;
    }

    if (appliedRef.current) {
      return;
    }

    const blocks = parseSearchReplaceBlocks(rawContent);
    if (blocks.length === 0) {
      return;
    }

    const found = findArtifactByIdentifier(artifacts, identifier);
    if (!found) {
      logger.log('artifacts', 'artifact-update: identifier not found', identifier);
      return;
    }

    const [originalKey, originalArtifact] = found;
    if (!originalArtifact.content) {
      return;
    }

    const updatedContent = applySearchReplace(originalArtifact.content, blocks);
    if (updatedContent === originalArtifact.content) {
      return;
    }

    appliedRef.current = true;
    setArtifacts((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        [originalKey]: {
          ...originalArtifact,
          content: updatedContent,
          lastUpdateTime: Date.now(),
        },
      };
    });
    setCurrentArtifactId(originalKey);
  }, [
    props.identifier,
    props.rawContent,
    artifacts,
    location.pathname,
    setArtifacts,
    setCurrentArtifactId,
  ]);

  useEffect(() => {
    appliedRef.current = false;
  }, [props.identifier, props.rawContent]);

  useEffect(() => {
    applyUpdate();
  }, [applyUpdate]);

  if (!artifacts || !props.identifier) {
    return null;
  }

  const found = findArtifactByIdentifier(artifacts, props.identifier);
  if (!found) {
    return null;
  }

  return <ArtifactButton artifact={found[1]} />;
}
