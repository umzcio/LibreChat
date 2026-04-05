import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAtom, useSetAtom } from 'jotai';
import { RESET } from 'jotai/utils';
import type { Artifact } from '~/common';
import FilePreview from '~/components/Chat/Input/Files/FilePreview';
import { cn, getFileType, logger, isArtifactRoute } from '~/utils';
import { useLocalize } from '~/hooks';
import store from '~/store';

const ArtifactButton = ({ artifact }: { artifact: Artifact | null }) => {
  const localize = useLocalize();
  const location = useLocation();
  const setVisible = useSetAtom(store.artifactsVisibility);
  const [artifacts, setArtifacts] = useAtom(store.artifactsState);
  const [currentArtifactId, setCurrentArtifactId] = useAtom(store.currentArtifactId);
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
  const fileType = getFileType('artifact');

  return (
    <div className="group relative my-4 rounded-xl text-sm text-text-primary">
      {(() => {
        const handleClick = () => {
          if (isSelected) {
            setCurrentArtifactId(RESET);
            setVisible(false);
            return;
          }

          setCurrentArtifactId(RESET);
          setVisible(true);

          if (artifacts?.[artifact.id] == null) {
            setArtifacts((prev) => ({
              ...(visibleArtifacts ?? {}),
              ...(prev ?? {}),
              [artifact.id]: artifact,
            }));
          }

          setTimeout(() => {
            setCurrentArtifactId(artifact.id);
          }, 15);
        };

        const buttonClass = cn(
          'relative overflow-hidden rounded-xl transition-all duration-300 hover:border-border-medium hover:bg-surface-hover hover:shadow-lg active:scale-[0.98]',
          {
            'border-border-medium bg-surface-hover shadow-lg': isSelected,
            'border-border-light bg-surface-tertiary shadow-sm': !isSelected,
          },
        );

        const actionLabel = isSelected
          ? localize('com_ui_click_to_close')
          : localize('com_ui_artifact_click');

        return (
          <button type="button" onClick={handleClick} className={buttonClass}>
            <div className="w-fit p-2">
              <div className="flex flex-row items-center gap-2">
                <FilePreview fileType={fileType} className="relative" />
                <div className="overflow-hidden text-left">
                  <div className="truncate font-medium">{artifact.title}</div>
                  <div className="truncate text-text-secondary">{actionLabel}</div>
                </div>
              </div>
            </div>
          </button>
        );
      })()}
      <br />
    </div>
  );
};

export default ArtifactButton;
