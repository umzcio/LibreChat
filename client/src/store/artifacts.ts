import { atom } from 'jotai';
import { atomWithReset, atomFamily } from 'jotai/utils';
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

/**
 * Per-artifact-id claim used by `ToolArtifactCard` to dedup the same file
 * across tool calls / messages. Holds the unique component-instance key
 * of whichever card most recently mounted for that id; cards whose key
 * doesn't match return `null` so the same chip doesn't render twice.
 *
 * Keyed by `artifact.id` (which is `tool-artifact-${file_id}`), so each
 * card subscribes only to its own slice — adding or removing a claim
 * for one artifact never re-renders cards for unrelated artifacts.
 *
 * Lifetime: atom entries remain in the family map even after a card
 * unmounts (Jotai's atomFamily doesn't GC entries by default). Card
 * unmount resets the value to `null`, so the residual cost per artifact
 * is one key + a `null` value — negligible at typical session scale.
 */
const toolArtifactClaim = atomFamily((_id: string) => {
  const a = atom<string | null>(null);
  a.debugLabel = 'toolArtifactClaim';
  return a;
});

/**
 * Per-artifact-id slice of `artifactsState`. Used by `ToolArtifactCard`
 * for self-heal registration: the card subscribes only to its own
 * entry, so the registration effect re-runs deterministically when the
 * entry is wiped (e.g. by `useArtifacts`'s panel-unmount cleanup) or
 * when the artifact's content meaningfully changes — instead of firing
 * on every parent render via a no-deps `useEffect`.
 */
const artifactByIdSelector = atomFamily((artifactId: string) => {
  const derived = atom((get) => {
    const artifacts = get(artifactsState);
    return artifacts?.[artifactId];
  });
  derived.debugLabel = 'artifactByIdSelector';
  return derived;
});

/**
 * One-shot signal that an attachment's deferred preview just transitioned
 * from `pending` to `ready` during the current session — keyed by
 * `file_id` (raw, NOT the `tool-artifact-${file_id}` form).
 *
 * The preview-sync hook flips this to `true` on the pending→ready edge.
 * `ToolArtifactCard` reads it on mount; if set, it auto-opens the panel
 * (even when no submission is in flight) and then resets the flag, so
 * subsequent re-mounts (panel close/reopen, re-render of the same card
 * from history) do not steal focus a second time.
 *
 * Why a separate signal rather than reusing `mountedDuringStreamRef`:
 * the deferred render can complete *after* the SSE stream has closed,
 * so the card mounts with `isSubmitting === false` and the existing
 * focus/open path skips. Without this signal, a freshly resolved
 * artifact would render in place but not auto-open — which is exactly
 * the bug the deferred-preview flow was designed to mask in the first
 * place. Auto-open ONLY on the pending→ready edge means a user
 * scrolling through history doesn't get the panel popping open every
 * time a previously resolved chip enters the viewport.
 */
const previewJustResolved = atomFamily((_fileId: string) => {
  const a = atom<boolean>(false);
  a.debugLabel = 'previewJustResolved';
  return a;
});

export {
  artifactsPanelMode,
  artifactsState,
  currentArtifactId,
  artifactsVisibility,
  visibleArtifacts,
  toolArtifactClaim,
  artifactByIdSelector,
  previewJustResolved,
};
