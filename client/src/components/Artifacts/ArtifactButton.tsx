import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAtom, useSetAtom } from 'jotai';
import { useResetAtom } from 'jotai/utils';
import type { Artifact } from '~/common';
import ArtifactRow from '~/components/Chat/Messages/Content/Parts/ArtifactRow';
import { artifactRowKind } from '~/utils/artifacts';
import { logger, isArtifactRoute } from '~/utils';
import store from '~/store';

const ArtifactButton = ({ artifact }: { artifact: Artifact | null }) => {
  const location = useLocation();
  const setVisible = useSetAtom(store.artifactsVisibility);
  const [artifacts, setArtifacts] = useAtom(store.artifactsState);
  const [currentArtifactId, setCurrentArtifactId] = useAtom(store.currentArtifactId);
  const resetCurrentArtifactId = useResetAtom(store.currentArtifactId);
  const isSelected = artifact?.id === currentArtifactId;
  const [visibleArtifacts, setVisibleArtifacts] = useAtom(store.visibleArtifacts);

  useEffect(() => {
    if (artifact == null || artifact?.id == null || artifact.id === '') {
      return;
    }

    if (!isArtifactRoute(location.pathname)) {
      return;
    }

    logger.log('artifacts_visibility', 'Caching visible artifact from Artifact button', artifact);
    setVisibleArtifacts((prev) => {
      const cachedArtifact = prev?.[artifact.id];
      if (
        cachedArtifact != null &&
        cachedArtifact.content === artifact.content &&
        cachedArtifact.lastUpdateTime === artifact.lastUpdateTime
      ) {
        return prev;
      }

      return {
        ...(prev ?? {}),
        [artifact.id]: artifact,
      };
    });
  }, [artifact, location.pathname, setVisibleArtifacts]);

  if (artifact === null || artifact === undefined) {
    return null;
  }

  const handleOpen = () => {
    if (isSelected) {
      resetCurrentArtifactId();
      setVisible(false);
      return;
    }

    setCurrentArtifactId(artifact.id);
    setVisible(true);

    if (artifacts?.[artifact.id] == null) {
      setArtifacts((prev) => ({
        ...(visibleArtifacts ?? {}),
        ...(prev ?? {}),
        [artifact.id]: artifact,
      }));
    }
  };

  /* Model-authored artifacts have no file behind them — the panel's own
   * `DownloadArtifact` serializes the (possibly edited) content, which
   * needs the editor context this row doesn't sit in. */
  return (
    <ArtifactRow
      title={artifact.title ?? ''}
      kind={artifactRowKind(artifact)}
      isSelected={isSelected}
      onOpen={handleOpen}
      artifactId={artifact.id}
    />
  );
};

export default ArtifactButton;
