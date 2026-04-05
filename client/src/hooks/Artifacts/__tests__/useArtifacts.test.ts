import { renderHook, act } from '@testing-library/react';
import { Constants } from 'librechat-data-provider';
import type { Artifact } from '~/common';

/** Mock dependencies */
jest.mock('~/Providers', () => ({
  useArtifactsContext: jest.fn(),
}));

jest.mock('~/utils', () => ({
  logger: {
    log: jest.fn(),
  },
}));

/** Mock store before importing */
jest.mock('~/store', () => ({
  __esModule: true,
  default: {
    artifactsState: { key: 'artifactsState' },
    currentArtifactId: { key: 'currentArtifactId' },
    artifactsVisibility: { key: 'artifactsVisibility' },
  },
}));

const mockUseAtomValue = jest.fn();
const mockUseSetAtom = jest.fn();
const mockUseAtom = jest.fn();

jest.mock('jotai', () => ({
  useAtomValue: (...args: unknown[]) => mockUseAtomValue(...args),
  useSetAtom: (...args: unknown[]) => mockUseSetAtom(...args),
  useAtom: (...args: unknown[]) => mockUseAtom(...args),
}));

jest.mock('jotai/utils', () => ({
  RESET: Symbol('RESET'),
}));

/** Import mocked functions after mocking */
import { useArtifactsContext } from '~/Providers';
import { logger } from '~/utils';
import useArtifacts from '../useArtifacts';

describe('useArtifacts', () => {
  const mockResetArtifacts = jest.fn();
  const mockSetCurrentArtifactId = jest.fn();

  const createArtifact = (partial: Partial<Artifact>): Artifact => ({
    id: 'artifact-1',
    title: 'Test Artifact',
    type: 'application/vnd.react',
    content: 'const App = () => <div>Test</div>',
    messageId: 'msg-1',
    lastUpdateTime: Date.now(),
    ...partial,
  });

  const defaultContext = {
    isSubmitting: false,
    latestMessageId: 'msg-1',
    latestMessageText: '',
    conversationId: 'conv-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    (useArtifactsContext as jest.Mock).mockReturnValue(defaultContext);
    mockUseAtomValue.mockReturnValue({});
    mockUseSetAtom.mockReturnValue(mockResetArtifacts);
    mockUseAtom.mockReturnValue([null, mockSetCurrentArtifactId]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should initialize with preview tab active', () => {
      const { result } = renderHook(() => useArtifacts());
      expect(result.current.activeTab).toBe('preview');
    });

    it('should return null currentArtifact when no artifacts exist', () => {
      mockUseAtomValue.mockReturnValue({});
      const { result } = renderHook(() => useArtifacts());
      expect(result.current.currentArtifact).toBeNull();
    });

    it('should return empty orderedArtifactIds when no artifacts exist', () => {
      mockUseAtomValue.mockReturnValue({});
      const { result } = renderHook(() => useArtifacts());
      expect(result.current.orderedArtifactIds).toEqual([]);
    });
  });

  describe('artifact ordering', () => {
    it('should order artifacts by lastUpdateTime', () => {
      const artifacts = {
        'artifact-3': createArtifact({ id: 'artifact-3', lastUpdateTime: 3000 }),
        'artifact-1': createArtifact({ id: 'artifact-1', lastUpdateTime: 1000 }),
        'artifact-2': createArtifact({ id: 'artifact-2', lastUpdateTime: 2000 }),
      };

      mockUseAtomValue.mockReturnValue(artifacts);

      const { result } = renderHook(() => useArtifacts());

      expect(result.current.orderedArtifactIds).toEqual(['artifact-1', 'artifact-2', 'artifact-3']);
    });

    it('should automatically select latest artifact', () => {
      const artifacts = {
        'artifact-1': createArtifact({ id: 'artifact-1', lastUpdateTime: 1000 }),
        'artifact-2': createArtifact({ id: 'artifact-2', lastUpdateTime: 2000 }),
      };

      mockUseAtomValue.mockReturnValue(artifacts);

      renderHook(() => useArtifacts());

      expect(mockSetCurrentArtifactId).toHaveBeenCalledWith('artifact-2');
    });
  });

  describe('tab switching - enclosed artifacts', () => {
    it('should switch to preview when enclosed artifact is detected during generation', () => {
      mockUseAtomValue.mockReturnValue({});
      mockUseAtom.mockReturnValue([null, mockSetCurrentArtifactId]);

      (useArtifactsContext as jest.Mock).mockReturnValue({
        ...defaultContext,
        isSubmitting: false,
        latestMessageText: '',
      });

      const { result, rerender } = renderHook(() => useArtifacts());

      /** Generation starts with enclosed artifact */
      (useArtifactsContext as jest.Mock).mockReturnValue({
        ...defaultContext,
        isSubmitting: true,
        latestMessageText: ':::artifact{title="Test"}\nconst App = () => <div>Test</div>\n:::',
      });

      rerender();

      /** Should switch to preview when enclosed detected */
      expect(result.current.activeTab).toBe('preview');
    });

    it('should not switch to preview if artifact is not enclosed', () => {
      const artifact = createArtifact({
        content: 'const App = () => <div>Test</div>',
      });
      mockUseAtomValue.mockReturnValue({});
      mockUseAtom.mockReturnValue(['artifact-1', mockSetCurrentArtifactId]);

      const { result, rerender } = renderHook(() => useArtifacts());

      /** Update with non-enclosed artifact */
      mockUseAtomValue.mockReturnValue({ 'artifact-1': artifact });
      (useArtifactsContext as jest.Mock).mockReturnValue({
        ...defaultContext,
        isSubmitting: true,
        latestMessageText: ':::artifact{title="Test"}\nconst App = () => <div>Test</div>',
      });

      rerender();

      /** Should switch to code since artifact content is in message and not enclosed */
      expect(result.current.activeTab).toBe('code');
      expect(logger.log).not.toHaveBeenCalledWith(
        'artifacts',
        expect.stringContaining('Enclosed artifact'),
      );
    });

    it('should only switch to preview once per artifact', () => {
      const artifact = createArtifact({});
      mockUseAtomValue.mockReturnValue({ 'artifact-1': artifact });

      const { rerender } = renderHook(() => useArtifacts());

      (useArtifactsContext as jest.Mock).mockReturnValue({
        ...defaultContext,
        isSubmitting: true,
        latestMessageText: ':::artifact{title="Test"}\ncode\n:::',
      });

      rerender();

      const firstCallCount = (logger.log as jest.Mock).mock.calls.filter((call) =>
        call[1]?.includes('Enclosed artifact'),
      ).length;

      (useArtifactsContext as jest.Mock).mockReturnValue({
        ...defaultContext,
        isSubmitting: true,
        latestMessageText: ':::artifact{title="Test"}\ncode\n:::\nMore text',
      });

      rerender();

      const secondCallCount = (logger.log as jest.Mock).mock.calls.filter((call) =>
        call[1]?.includes('Enclosed artifact'),
      ).length;

      expect(secondCallCount).toBe(firstCallCount);
    });
  });

  describe('tab switching - non-enclosed artifacts', () => {
    it('should switch to code when non-enclosed artifact content appears', () => {
      const artifact = createArtifact({
        content: 'const App = () => <div>Test Component</div>',
      });
      mockUseAtomValue.mockReturnValue({ 'artifact-1': artifact });
      mockUseAtom.mockReturnValue(['artifact-1', mockSetCurrentArtifactId]);

      (useArtifactsContext as jest.Mock).mockReturnValue({
        ...defaultContext,
        isSubmitting: true,
        latestMessageText: 'Here is the code: const App = () => <div>Test Component</div>',
      });

      const { result } = renderHook(() => useArtifacts());

      expect(result.current.activeTab).toBe('code');
    });

    it('should not switch to code if artifact content is not in message text', () => {
      const artifact = createArtifact({
        content: 'const App = () => <div>Test</div>',
      });
      mockUseAtomValue.mockReturnValue({ 'artifact-1': artifact });
      mockUseAtom.mockReturnValue(['artifact-1', mockSetCurrentArtifactId]);

      (useArtifactsContext as jest.Mock).mockReturnValue({
        ...defaultContext,
        isSubmitting: true,
        latestMessageText: 'Some other text here',
      });

      const { result } = renderHook(() => useArtifacts());

      expect(result.current.activeTab).toBe('preview');
    });
  });

  describe('conversation changes', () => {
    it('should reset artifacts when conversation changes', () => {
      mockUseAtomValue.mockReturnValue({});

      const { rerender } = renderHook(() => useArtifacts());

      (useArtifactsContext as jest.Mock).mockReturnValue({
        ...defaultContext,
        conversationId: 'conv-2',
      });

      rerender();

      expect(mockResetArtifacts).toHaveBeenCalled();
    });

    it('should not reset artifacts on initial render', () => {
      mockUseAtomValue.mockReturnValue({});
      renderHook(() => useArtifacts());

      expect(mockResetArtifacts).not.toHaveBeenCalled();
    });
  });

  describe('manual tab switching', () => {
    it('should allow manually switching tabs', () => {
      const { result } = renderHook(() => useArtifacts());

      expect(result.current.activeTab).toBe('preview');

      act(() => {
        result.current.setActiveTab('code');
      });

      expect(result.current.activeTab).toBe('code');
    });

    it('should allow switching back to preview after manual switch to code', () => {
      const { result } = renderHook(() => useArtifacts());

      act(() => {
        result.current.setActiveTab('code');
      });

      expect(result.current.activeTab).toBe('code');

      act(() => {
        result.current.setActiveTab('preview');
      });

      expect(result.current.activeTab).toBe('preview');
    });
  });

  describe('currentIndex calculation', () => {
    it('should return correct index for current artifact', () => {
      const artifacts = {
        'artifact-1': createArtifact({ id: 'artifact-1', lastUpdateTime: 1000 }),
        'artifact-2': createArtifact({ id: 'artifact-2', lastUpdateTime: 2000 }),
        'artifact-3': createArtifact({ id: 'artifact-3', lastUpdateTime: 3000 }),
      };

      mockUseAtomValue.mockReturnValue(artifacts);
      mockUseAtom.mockReturnValue(['artifact-2', mockSetCurrentArtifactId]);

      const { result } = renderHook(() => useArtifacts());

      expect(result.current.currentIndex).toBe(1);
    });

    it('should return -1 for non-existent artifact', () => {
      const artifacts = {
        'artifact-1': createArtifact({ id: 'artifact-1' }),
      };

      mockUseAtomValue.mockReturnValue(artifacts);
      mockUseAtom.mockReturnValue(['non-existent', mockSetCurrentArtifactId]);

      const { result } = renderHook(() => useArtifacts());

      expect(result.current.currentIndex).toBe(-1);
    });
  });

  describe('edge cases', () => {
    it('should handle null artifacts gracefully', () => {
      mockUseAtomValue.mockReturnValue(null);

      const { result } = renderHook(() => useArtifacts());

      expect(result.current.orderedArtifactIds).toEqual([]);
      expect(result.current.currentArtifact).toBeNull();
    });

    it('should handle undefined artifacts gracefully', () => {
      mockUseAtomValue.mockReturnValue(undefined);

      const { result } = renderHook(() => useArtifacts());

      expect(result.current.orderedArtifactIds).toEqual([]);
      expect(result.current.currentArtifact).toBeNull();
    });

    it('should handle empty latestMessageText', () => {
      (useArtifactsContext as jest.Mock).mockReturnValue({
        ...defaultContext,
        isSubmitting: true,
        latestMessageText: '',
      });

      const { result } = renderHook(() => useArtifacts());

      expect(result.current.activeTab).toBe('preview');
    });
  });
});
