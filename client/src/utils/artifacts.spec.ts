import { getArtifactWorkspaceFilename, getArtifactWorkspacePath } from './artifacts';

describe('artifacts utilities', () => {
  it('uses stable filenames for artifact workspace imports', () => {
    expect(getArtifactWorkspaceFilename('application/vnd.mermaid')).toBe('diagram.mmd');
    expect(getArtifactWorkspaceFilename('text/markdown')).toBe('content.md');
    expect(getArtifactWorkspaceFilename('text/plain')).toBe('content.txt');
    expect(getArtifactWorkspaceFilename('image/svg+xml')).toBe('image.svg');
    expect(getArtifactWorkspaceFilename('application/vnd.react')).toBe('App.tsx');
  });

  it('builds a sanitized workspace path for artifact imports', () => {
    expect(
      getArtifactWorkspacePath({
        content: '# Hello',
        id: 'artifact-1234567890',
        identifier: 'Widget',
        lastUpdateTime: Date.now(),
        title: 'Landing Page',
        type: 'text/markdown',
      }),
    ).toBe('artifacts/widget-landing-page-artifact-123/content.md');
  });
});
