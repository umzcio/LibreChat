import React from 'react';
import { render } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import { logger, isArtifactRoute } from '~/utils';
import { ArtifactUpdate, applySearchReplace } from '../ArtifactUpdate';

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
}));

const mockUseAtomValue = jest.fn();
const mockUseSetAtom = jest.fn();

jest.mock('jotai', () => ({
  useAtomValue: (...args: unknown[]) => mockUseAtomValue(...args),
  useSetAtom: (...args: unknown[]) => mockUseSetAtom(...args),
}));

jest.mock('~/utils', () => ({
  logger: {
    log: jest.fn(),
  },
  isArtifactRoute: jest.fn(),
}));

jest.mock('~/store/artifacts', () => ({
  artifactsState: { key: 'artifactsState' },
  currentArtifactId: { key: 'currentArtifactId' },
}));

jest.mock('../ArtifactButton', () => () => null);

describe('ArtifactUpdate', () => {
  const mockSetArtifacts = jest.fn();
  const mockSetCurrentArtifactId = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useLocation as jest.Mock).mockReturnValue({ pathname: '/c/test-conversation' });
    (isArtifactRoute as jest.Mock).mockReturnValue(true);
    mockUseAtomValue.mockReturnValue({
      'artifact-1': {
        id: 'artifact-1',
        identifier: 'widget',
        content: 'const value = 1;\nconst label = "hello";\n',
        lastUpdateTime: 1,
      },
    });
    mockUseSetAtom.mockImplementation((atom: { key: string }) =>
      atom?.key === 'artifactsState' ? mockSetArtifacts : mockSetCurrentArtifactId,
    );
  });

  describe('applySearchReplace', () => {
    it('does not patch when SEARCH is only a trimmed match', () => {
      const original = 'const value = 1;\n';
      const updated = applySearchReplace(original, [
        {
          search: 'const value = 1;\n ',
          replace: 'const value = 2;',
        },
      ]);

      expect(updated).toBe(original);
      expect(logger.log).toHaveBeenCalledWith(
        'artifacts',
        'artifact-update: SEARCH block not found, aborting all blocks',
        expect.objectContaining({ search: 'const value = 1;\n ' }),
      );
    });

    it('does not patch when SEARCH matches multiple locations', () => {
      const original = 'const value = 1;\nconst value = 1;\n';
      const updated = applySearchReplace(original, [
        {
          search: 'const value = 1;\n',
          replace: 'const value = 2;\n',
        },
      ]);

      expect(updated).toBe(original);
      expect(logger.log).toHaveBeenCalledWith(
        'artifacts',
        'artifact-update: SEARCH block matched multiple locations, aborting',
        expect.objectContaining({ search: 'const value = 1;\n' }),
      );
    });
  });

  it('reapplies when rawContent changes for the same mounted component', () => {
    const { rerender } = render(
      <ArtifactUpdate
        identifier="widget"
        rawContent={`<<<SEARCH
const value = 1;
>>>REPLACE
const value = 2;`}
        node={null}
      />,
    );

    expect(mockSetArtifacts).toHaveBeenCalledTimes(1);

    rerender(
      <ArtifactUpdate
        identifier="widget"
        rawContent={`<<<SEARCH
const label = "hello";
>>>REPLACE
const label = "updated";`}
        node={null}
      />,
    );

    expect(mockSetArtifacts).toHaveBeenCalledTimes(2);
    expect(mockSetCurrentArtifactId).toHaveBeenLastCalledWith('artifact-1');
  });
});
