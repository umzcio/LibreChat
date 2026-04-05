import { renderHook } from '@testing-library/react';
import useArtifactProps from '../useArtifactProps';
import type { Artifact } from '~/common';

describe('useArtifactProps', () => {
  const createArtifact = (partial: Partial<Artifact>): Artifact => ({
    id: 'test-id',
    lastUpdateTime: Date.now(),
    ...partial,
  });

  describe('markdown artifacts', () => {
    it('should handle text/markdown type with content.md as fileKey', () => {
      const artifact = createArtifact({
        type: 'text/markdown',
        content: '# Hello World\n\nThis is markdown.',
      });

      const { result } = renderHook(() => useArtifactProps({ artifact }));

      expect(result.current.fileKey).toBe('content.md');
      expect(result.current.template).toBe('static');
    });

  });

  describe('plain text artifacts', () => {
    it('should handle text/plain type with content.txt as fileKey', () => {
      const artifact = createArtifact({
        type: 'text/plain',
        content: 'Plain text content',
      });

      const { result } = renderHook(() => useArtifactProps({ artifact }));

      expect(result.current.fileKey).toBe('content.txt');
      expect(result.current.template).toBe('static');
      expect(result.current.files['content.txt']).toBe('Plain text content');
      expect(result.current.files['index.html']).toContain('<pre>');
    });

    it('should escape html in plain text preview output', () => {
      const artifact = createArtifact({
        type: 'text/plain',
        content: '<script>alert("xss")</script>',
      });

      const { result } = renderHook(() => useArtifactProps({ artifact }));

      expect(result.current.files['content.txt']).toBe('<script>alert("xss")</script>');
      expect(result.current.files['index.html']).toContain('&lt;script&gt;alert("xss")&lt;/script&gt;');
    });
  });

  describe('markdown artifacts', () => {
    it('should include content.md in files with original markdown', () => {
      const markdownContent = '# Test\n\n- Item 1\n- Item 2';
      const artifact = createArtifact({
        type: 'text/markdown',
        content: markdownContent,
      });

      const { result } = renderHook(() => useArtifactProps({ artifact }));

      expect(result.current.files['content.md']).toBe(markdownContent);
    });

    it('should include index.html with static markdown rendering', () => {
      const artifact = createArtifact({
        type: 'text/markdown',
        content: '# Test',
      });

      const { result } = renderHook(() => useArtifactProps({ artifact }));

      expect(result.current.files['index.html']).toContain('<!DOCTYPE html>');
      expect(result.current.files['index.html']).toContain('marked.parse');
    });

    it('should include all required markdown files', () => {
      const artifact = createArtifact({
        type: 'text/markdown',
        content: '# Test',
      });

      const { result } = renderHook(() => useArtifactProps({ artifact }));

      expect(result.current.files['content.md']).toBeDefined();
      expect(result.current.files['index.html']).toBeDefined();
    });

    it('should escape special characters in markdown content', () => {
      const artifact = createArtifact({
        type: 'text/markdown',
        content: 'Code: `const x = 1;`\nPath: C:\\Users',
      });

      const { result } = renderHook(() => useArtifactProps({ artifact }));

      expect(result.current.files['content.md']).toContain('`const x = 1;`');
      expect(result.current.files['content.md']).toContain('C:\\Users');

      expect(result.current.files['index.html']).toContain('\\`');
      expect(result.current.files['index.html']).toContain('\\\\');
    });

    it('should handle empty markdown content', () => {
      const artifact = createArtifact({
        type: 'text/markdown',
        content: '',
      });

      const { result } = renderHook(() => useArtifactProps({ artifact }));

      expect(result.current.files['content.md']).toBe('# No content provided');
    });

    it('should handle undefined markdown content', () => {
      const artifact = createArtifact({
        type: 'text/markdown',
      });

      const { result } = renderHook(() => useArtifactProps({ artifact }));

      expect(result.current.files['content.md']).toBe('# No content provided');
    });

    it('should have no custom dependencies for markdown (uses CDN)', () => {
      const artifact = createArtifact({
        type: 'text/markdown',
        content: '# Test',
      });

      const { result } = renderHook(() => useArtifactProps({ artifact }));

      const deps = result.current.sharedProps.customSetup?.dependencies ?? {};
      expect(deps).toEqual({});
    });

    it('should update files when content changes', () => {
      const artifact = createArtifact({
        type: 'text/markdown',
        content: '# Original',
      });

      const { result, rerender } = renderHook(({ artifact }) => useArtifactProps({ artifact }), {
        initialProps: { artifact },
      });

      expect(result.current.files['content.md']).toBe('# Original');

      const updatedArtifact = createArtifact({
        ...artifact,
        content: '# Updated',
      });

      rerender({ artifact: updatedArtifact });

      expect(result.current.files['content.md']).toBe('# Updated');
    });
  });

  describe('mermaid artifacts', () => {
    it('should handle mermaid type with content.md as fileKey', () => {
      const artifact = createArtifact({
        type: 'application/vnd.mermaid',
        content: 'graph TD\n  A-->B',
      });

      const { result } = renderHook(() => useArtifactProps({ artifact }));

      expect(result.current.fileKey).toBe('diagram.mmd');
      expect(result.current.template).toBe('react-ts');
    });
  });

  describe('react artifacts', () => {
    it('should handle react type with App.tsx as fileKey', () => {
      const artifact = createArtifact({
        type: 'application/vnd.react',
        content: 'export default () => <div>Test</div>',
      });

      const { result } = renderHook(() => useArtifactProps({ artifact }));

      expect(result.current.fileKey).toBe('App.tsx');
      expect(result.current.template).toBe('react-ts');
    });
  });

  describe('html artifacts', () => {
    it('should handle html type with index.html as fileKey', () => {
      const artifact = createArtifact({
        type: 'text/html',
        content: '<html><body>Test</body></html>',
      });

      const { result } = renderHook(() => useArtifactProps({ artifact }));

      expect(result.current.fileKey).toBe('index.html');
      expect(result.current.template).toBe('static');
    });
  });

  describe('svg artifacts', () => {
    it('should handle svg type with image.svg as fileKey', () => {
      const artifact = createArtifact({
        type: 'image/svg+xml',
        content: '<svg viewBox="0 0 10 10"></svg>',
      });

      const { result } = renderHook(() => useArtifactProps({ artifact }));

      expect(result.current.fileKey).toBe('image.svg');
      expect(result.current.template).toBe('static');
      expect(result.current.files['image.svg']).toBe('<svg viewBox="0 0 10 10"></svg>');
    });
  });

  describe('edge cases', () => {
    it('should handle artifact with language parameter', () => {
      const artifact = createArtifact({
        type: 'text/markdown',
        language: 'en',
        content: '# Test',
      });

      const { result } = renderHook(() => useArtifactProps({ artifact }));

      expect(result.current.fileKey).toBe('content.md');
      expect(result.current.files['content.md']).toBe('# Test');
    });

    it('should handle artifact with undefined type', () => {
      const artifact = createArtifact({
        content: '# Test',
      });

      const { result } = renderHook(() => useArtifactProps({ artifact }));

      expect(result.current.template).toBe('static');
    });
  });
});
