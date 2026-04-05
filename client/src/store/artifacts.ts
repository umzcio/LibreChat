import { atom } from 'jotai';
import { atomWithReset } from 'jotai/utils';
import type { Artifact } from '~/common';

export type ArtifactPanelMode = 'side' | 'fullscreen';

const artifactsPanelMode = atom<ArtifactPanelMode>('side');
artifactsPanelMode.debugLabel = 'artifactsPanelMode';

const artifactsState = atomWithReset<Record<string, Artifact | undefined> | null>(null);
artifactsState.debugLabel = 'artifactsState';

const currentArtifactId = atomWithReset<string | null>(null);
currentArtifactId.debugLabel = 'currentArtifactId';

const artifactsVisibility = atom<boolean>(true);
artifactsVisibility.debugLabel = 'artifactsVisibility';

const visibleArtifacts = atomWithReset<Record<string, Artifact | undefined> | null>(null);
visibleArtifacts.debugLabel = 'visibleArtifacts';

export {
  artifactsPanelMode,
  artifactsState,
  currentArtifactId,
  artifactsVisibility,
  visibleArtifacts,
};
