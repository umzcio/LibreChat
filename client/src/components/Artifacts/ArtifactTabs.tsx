import { useRef, useMemo, useEffect } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import type { SandpackPreviewRef } from '@codesandbox/sandpack-react/unstyled';
import type { editor } from 'monaco-editor';
import type { Artifact } from '~/common';
import { useCodeState } from '~/Providers/EditorContext';
import useArtifactProps from '~/hooks/Artifacts/useArtifactProps';
import { HtmlRenderer, SvgRenderer, isDirectHtml, isDirectSvg, RendererErrorBoundary } from './renderers';
import { ArtifactCodeEditor } from './ArtifactCodeEditor';
import { useGetStartupConfig } from '~/data-provider';
import { ArtifactPreview } from './ArtifactPreview';

export default function ArtifactTabs({
  artifact,
  previewRef,
  isSharedConvo,
  onSwitchToCode,
}: {
  artifact: Artifact;
  previewRef: React.MutableRefObject<SandpackPreviewRef>;
  isSharedConvo?: boolean;
  onSwitchToCode?: () => void;
}) {
  const { currentCode, setCurrentCode } = useCodeState();
  const { data: startupConfig } = useGetStartupConfig();
  const monacoRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const lastIdRef = useRef<string | null>(null);
  const lastContentRef = useRef<string | undefined>();

  useEffect(() => {
    if (artifact.id !== lastIdRef.current || artifact.content !== lastContentRef.current) {
      setCurrentCode(undefined);
    }
    lastIdRef.current = artifact.id;
    lastContentRef.current = artifact.content;
  }, [setCurrentCode, artifact.id, artifact.content]);

  const { files, fileKey, template, sharedProps } = useArtifactProps({ artifact });
  const previewContent = currentCode ?? artifact.content ?? '';

  const useDirectHtml = useMemo(
    () => isDirectHtml(artifact.type ?? '', previewContent),
    [artifact.type, previewContent],
  );
  const useDirectSvg = useMemo(() => isDirectSvg(artifact.type ?? ''), [artifact.type]);

  return (
    <div className="flex h-full w-full flex-col">
      <Tabs.Content
        value="code"
        id="artifacts-code"
        className="h-full w-full flex-grow overflow-auto"
        tabIndex={-1}
      >
        <ArtifactCodeEditor artifact={artifact} monacoRef={monacoRef} readOnly={isSharedConvo} />
      </Tabs.Content>

      <Tabs.Content
        value="preview"
        className="h-full w-full flex-grow overflow-hidden"
        tabIndex={-1}
      >
        <RendererErrorBoundary onSwitchToCode={onSwitchToCode}>
          {useDirectHtml ? (
            <HtmlRenderer content={previewContent} />
          ) : useDirectSvg ? (
            <SvgRenderer content={previewContent} />
          ) : (
            <ArtifactPreview
              files={files}
              fileKey={fileKey}
              template={template}
              previewRef={previewRef}
              sharedProps={sharedProps}
              currentCode={currentCode}
              startupConfig={startupConfig}
            />
          )}
        </RendererErrorBoundary>
      </Tabs.Content>
    </div>
  );
}
