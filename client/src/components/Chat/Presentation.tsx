import { lazy, Suspense, useEffect, useMemo, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { useResetAtom } from 'jotai/utils';
import { EModelEndpoint, FileSources, LocalStorageKeys } from 'librechat-data-provider';
import type { ExtendedFile } from '~/common';
import useResetArtifactsOnConversationChange from '~/hooks/Artifacts/useResetArtifactsOnConversationChange';
import { ParentSubagentsProvider } from '~/components/Chat/Subagents/ParentSubagentsProvider';
import DragDropWrapper from '~/components/Chat/Input/Files/DragDropWrapper';
import { EditorProvider, ArtifactsProvider } from '~/Providers';
import { useDeleteFilesMutation } from '~/data-provider';
import { SidePanelGroup } from '~/components/SidePanel';
import { activeSubagentPanel } from '~/store/subagents';
import { useSetFilesToDelete } from '~/hooks';
import store from '~/store';

const Artifacts = lazy(() => import('~/components/Artifacts/Artifacts'));
const SubagentThreadPanel = lazy(() => import('~/components/Chat/Subagents/SubagentThreadPanel'));

export default function Presentation({
  children,
  showArtifactsPanel = true,
}: {
  children: React.ReactNode;
  showArtifactsPanel?: boolean;
}) {
  const artifacts = useAtomValue(store.artifactsState);
  const artifactsVisibility = useAtomValue(store.artifactsVisibility);
  // Render-gating the panel on `currentArtifactId != null` (in addition
  // to visibility + non-empty artifacts) means the side panel only opens
  // when *something* is actively focused. Conversation navigation
  // resets `currentArtifactId` to null, so the panel stays closed when
  // a user revisits an old conversation full of artifacts. New artifacts
  // arriving via SSE auto-focus through `ToolArtifactCard`'s mount effect
  // (gated on `isSubmitting`), restoring the legacy streaming UX.
  const currentArtifactId = useAtomValue(store.currentArtifactId);
  const conversationId = useAtomValue(store.conversationIdByIndex(0));
  const conversationEndpoint = useAtomValue(store.effectiveEndpointByIndex(0));
  const conversationAgentId = useAtomValue(store.conversationAgentIdByIndex(0));
  const selectedSubagent = useAtomValue(activeSubagentPanel);
  const resetSelectedSubagent = useResetAtom(activeSubagentPanel);
  const previousConversationIdRef = useRef<string | null>(null);

  useResetArtifactsOnConversationChange();

  useEffect(() => {
    const previous = previousConversationIdRef.current;
    const next = conversationId ?? null;
    previousConversationIdRef.current = next;
    if (previous != null && previous !== next) resetSelectedSubagent();
  }, [conversationId, resetSelectedSubagent]);

  const setFilesToDelete = useSetFilesToDelete();

  const { mutateAsync } = useDeleteFilesMutation({
    onSuccess: () => {
      console.log('Temporary Files deleted');
      setFilesToDelete({});
    },
    onError: (error) => {
      console.log('Error deleting temporary files:', error);
    },
  });

  useEffect(() => {
    const filesToDelete = localStorage.getItem(LocalStorageKeys.FILES_TO_DELETE);
    const map = JSON.parse(filesToDelete ?? '{}') as Record<string, ExtendedFile>;
    const files = Object.values(map)
      .filter(
        (file) =>
          file.filepath != null && file.source && !(file.embedded ?? false) && file.temp_file_id,
      )
      .map((file) => ({
        file_id: file.file_id,
        filepath: file.filepath as string,
        source: file.source as FileSources,
        embedded: !!(file.embedded ?? false),
      }));

    if (files.length === 0) {
      return;
    }
    mutateAsync({ files });
  }, [mutateAsync]);

  const artifactsElement = useMemo(() => {
    if (!showArtifactsPanel) {
      return null;
    }

    if (
      artifactsVisibility === true &&
      currentArtifactId != null &&
      Object.keys(artifacts ?? {}).length > 0
    ) {
      return (
        <ArtifactsProvider>
          <EditorProvider>
            <Suspense fallback={null}>
              <Artifacts />
            </Suspense>
          </EditorProvider>
        </ArtifactsProvider>
      );
    }
    return null;
  }, [showArtifactsPanel, artifactsVisibility, artifacts, currentArtifactId]);

  useEffect(() => {
    if (artifactsElement != null && selectedSubagent != null) resetSelectedSubagent();
  }, [artifactsElement, resetSelectedSubagent, selectedSubagent]);

  const subagentElement = useMemo(() => {
    if (
      selectedSubagent == null ||
      selectedSubagent.host !== 'conversation' ||
      selectedSubagent.parentConversationId !== conversationId
    ) {
      return null;
    }
    return (
      <Suspense fallback={null}>
        <SubagentThreadPanel selection={selectedSubagent} />
      </Suspense>
    );
  }, [conversationId, selectedSubagent]);

  const panelElement = artifactsElement ?? subagentElement;

  return (
    <DragDropWrapper className="relative flex w-full grow overflow-hidden bg-presentation">
      <ParentSubagentsProvider
        conversationId={conversationId ?? ''}
        enabled={conversationEndpoint === EModelEndpoint.agents && conversationAgentId != null}
      >
        <SidePanelGroup panel={panelElement}>
          <main className="flex h-full flex-col overflow-y-auto" role="main">
            {children}
          </main>
        </SidePanelGroup>
      </ParentSubagentsProvider>
    </DragDropWrapper>
  );
}
