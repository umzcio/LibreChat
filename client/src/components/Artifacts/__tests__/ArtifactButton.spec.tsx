import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import ArtifactButton from '../ArtifactButton';

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
}));

const mockUseSetAtom = jest.fn();
const mockUseAtom = jest.fn();

jest.mock('jotai', () => ({
  useSetAtom: (...args: unknown[]) => mockUseSetAtom(...args),
  useAtom: (...args: unknown[]) => mockUseAtom(...args),
}));

jest.mock('jotai/utils', () => ({
  RESET: Symbol('RESET'),
}));

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
}));

jest.mock('~/utils', () => ({
  cn: () => 'artifact-button',
  getFileType: () => 'artifact',
  logger: {
    log: jest.fn(),
  },
  isArtifactRoute: () => true,
}));

jest.mock('~/store', () => ({
  __esModule: true,
  default: {
    artifactsVisibility: { key: 'artifactsVisibility' },
    artifactsState: { key: 'artifactsState' },
    currentArtifactId: { key: 'currentArtifactId' },
    visibleArtifacts: { key: 'visibleArtifacts' },
  },
}));

jest.mock('~/components/Chat/Input/Files/FilePreview', () => () => (
  <div data-testid="artifact-file-preview" />
));

describe('ArtifactButton', () => {
  const mockSetVisible = jest.fn();
  const mockSetArtifacts = jest.fn();
  const mockSetCurrentArtifactId = jest.fn();
  const mockSetVisibleArtifacts = jest.fn();

  const artifact = {
    id: 'artifact-1',
    title: 'Test Artifact',
    content: 'artifact content',
    lastUpdateTime: 1,
    type: 'text/plain',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    (useLocation as jest.Mock).mockReturnValue({ pathname: '/c/test-conversation' });
    mockUseSetAtom.mockImplementation((atom: { key: string }) => {
      if (atom?.key === 'artifactsVisibility') return mockSetVisible;
      return jest.fn();
    });
    mockUseAtom.mockImplementation((atom: { key: string }) => {
      if (atom?.key === 'artifactsState') return [null, mockSetArtifacts];
      if (atom?.key === 'currentArtifactId') return [null, mockSetCurrentArtifactId];
      if (atom?.key === 'visibleArtifacts') return [null, mockSetVisibleArtifacts];
      return [null, jest.fn()];
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('restores the selected artifact even when cached visibleArtifacts is empty', () => {
    render(<ArtifactButton artifact={artifact} />);

    fireEvent.click(screen.getByRole('button'));
    jest.runAllTimers();

    expect(mockSetVisible).toHaveBeenCalledWith(true);
    expect(mockSetArtifacts).toHaveBeenCalledTimes(1);
    expect(mockSetCurrentArtifactId).toHaveBeenCalledWith('artifact-1');

    const restore = mockSetArtifacts.mock.calls[0][0];
    expect(restore(null)).toEqual({
      'artifact-1': artifact,
    });
  });
});
