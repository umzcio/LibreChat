import React, { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { TConversation } from 'librechat-data-provider';
import type { CellMeasurerCache, List } from 'react-virtualized';

let mockCapturedCache: CellMeasurerCache | null = null;

jest.mock('react-virtualized', () => {
  const actual = jest.requireActual('react-virtualized');
  const mockReact = jest.requireActual('react');
  return {
    ...actual,
    AutoSizer: ({
      children,
    }: {
      children: (size: { width: number; height: number }) => React.ReactNode;
    }) => children({ width: 300, height: 600 }),
    CellMeasurer: ({
      children,
    }: {
      children: (opts: { registerChild: () => void }) => React.ReactNode;
    }) => children({ registerChild: () => {} }),
    List: mockReact.forwardRef(
      (
        {
          rowRenderer,
          rowCount,
          deferredMeasurementCache,
        }: {
          rowRenderer: (opts: {
            index: number;
            key: string;
            style: object;
            parent: object;
          }) => React.ReactNode;
          rowCount: number;
          deferredMeasurementCache: CellMeasurerCache;
          [key: string]: unknown;
        },
        ref,
      ) => {
        mockCapturedCache = deferredMeasurementCache;

        return (
          <div ref={ref} data-testid="virtual-list" data-row-count={rowCount}>
            {Array.from({ length: Math.min(rowCount, 10) }, (_, i) =>
              rowRenderer({ index: i, key: `row-${i}`, style: {}, parent: {} }),
            )}
          </div>
        );
      },
    ),
  };
});

jest.mock('~/store', () => {
  const { atom } = jest.requireActual('jotai');
  return {
    __esModule: true,
    default: {
      search: atom({ query: '' }),
    },
  };
});

type FavoriteEntry = { agentId?: string; model?: string; endpoint?: string };
type ProjectEntry = { projectId: string; name: string };

const mockFavoritesState: { favorites: FavoriteEntry[]; isLoading: boolean } = {
  favorites: [],
  isLoading: false,
};

let mockProjects: ProjectEntry[] = [];
let mockProjectsExpanded = true;
let mockShowMarketplace = true;
let mockGroupedConversations: Array<[string, TConversation[]]> = [];

jest.mock('~/hooks', () => ({
  useFavorites: () => mockFavoritesState,
  useLocalize: () => (key: string, params?: { date?: string }) => {
    if (key === 'com_a11y_chats_date_section') {
      return `Chats from ${params?.date ?? ''}`;
    }

    return key;
  },
  useLocalStorage: (key: string, defaultValue: boolean) => {
    if (key === 'projectsExpanded') {
      return [mockProjectsExpanded, jest.fn()];
    }

    return [defaultValue, jest.fn()];
  },
  useShowMarketplace: () => mockShowMarketplace,
  useNewConvo: () => ({ newConversation: jest.fn() }),
  TranslationKeys: {},
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock('@librechat/client', () => ({
  Spinner: () => <div data-testid="spinner" />,
  useMediaQuery: () => false,
  TooltipAnchor: ({ render }: { render: React.ReactNode }) => render,
  NewChatIcon: () => <svg data-testid="new-chat-icon" />,
}));

jest.mock('~/data-provider', () => ({
  useActiveJobs: () => ({ data: undefined }),
  useListProjectsQuery: () => ({ data: { projects: mockProjects } }),
}));

jest.mock('~/utils', () => ({
  groupConversationsByDate: () => mockGroupedConversations,
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

jest.mock('~/components/Nav/Favorites/FavoritesList', () => ({
  __esModule: true,
  default: () => <div data-testid="favorites-list" />,
}));

jest.mock('~/components/SidePanel/Projects/ProjectCreateDialog', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('~/components/SidePanel/Projects', () => ({
  ProjectCard: ({ project }: { project: ProjectEntry }) => <div>{project.name}</div>,
}));

jest.mock('../Convo', () => ({
  __esModule: true,
  default: () => <div data-testid="convo" />,
}));

import Conversations from '../Conversations';

describe('Conversations – favorites CellMeasurerCache key invalidation', () => {
  const containerRef = createRef<List>();

  beforeEach(() => {
    mockCapturedCache = null;
    mockFavoritesState.favorites = [];
    mockFavoritesState.isLoading = false;
    mockProjects = [];
    mockProjectsExpanded = true;
    mockShowMarketplace = true;
    mockGroupedConversations = [];
  });

  const createConversation = (conversationId: string): TConversation =>
    ({
      conversationId,
      title: conversationId,
      endpoint: 'openAI',
    }) as TConversation;

  const Wrapper = () => (
    <Conversations
      conversations={[]}
      moveToTop={jest.fn()}
      toggleNav={jest.fn()}
      containerRef={containerRef}
      loadMoreConversations={jest.fn()}
      isLoading={false}
      isSearchLoading={false}
      isChatsExpanded={true}
      setIsChatsExpanded={jest.fn()}
    />
  );

  it('should invalidate the cached favorites height when favorites count changes', () => {
    const { rerender } = render(<Wrapper />);
    const cache = mockCapturedCache!;
    expect(cache).toBeDefined();

    cache.set(0, 0, 300, 48);
    expect(cache.has(0, 0)).toBe(true);
    expect(cache.getHeight(0, 0)).toBe(48);

    mockFavoritesState.favorites = [{ model: 'gpt-4', endpoint: 'openAI' }];
    rerender(<Wrapper />);

    expect(cache.has(0, 0)).toBe(false);
  });

  it('should invalidate the cached favorites height when loading state transitions', () => {
    mockFavoritesState.isLoading = true;
    const { rerender } = render(<Wrapper />);
    const cache = mockCapturedCache!;

    cache.set(0, 0, 300, 80);
    expect(cache.has(0, 0)).toBe(true);

    mockFavoritesState.isLoading = false;
    rerender(<Wrapper />);

    expect(cache.has(0, 0)).toBe(false);
  });

  it('should invalidate the cached favorites height when marketplace visibility changes', () => {
    mockFavoritesState.favorites = [{ model: 'gpt-4', endpoint: 'openAI' }];
    const { rerender } = render(<Wrapper />);
    const cache = mockCapturedCache!;

    cache.set(0, 0, 300, 48);
    expect(cache.has(0, 0)).toBe(true);

    mockShowMarketplace = false;
    rerender(<Wrapper />);

    expect(cache.has(0, 0)).toBe(false);
  });

  it('should retain the cached favorites height when content state is unchanged', () => {
    mockFavoritesState.favorites = [{ model: 'gpt-4', endpoint: 'openAI' }];
    const { rerender } = render(<Wrapper />);
    const cache = mockCapturedCache!;

    cache.set(0, 0, 300, 88);
    expect(cache.has(0, 0)).toBe(true);
    expect(cache.getHeight(0, 0)).toBe(88);

    rerender(<Wrapper />);

    expect(cache.has(0, 0)).toBe(true);
    expect(cache.getHeight(0, 0)).toBe(88);
  });

  it('should invalidate the cached projects height when project count changes', () => {
    const { rerender } = render(<Wrapper />);
    const cache = mockCapturedCache!;

    cache.set(1, 0, 300, 72);
    expect(cache.has(1, 0)).toBe(true);

    mockProjects = [{ projectId: 'project-1', name: 'Test New' }];
    rerender(<Wrapper />);

    expect(cache.has(1, 0)).toBe(false);
  });

  it('should invalidate the cached projects height when projects expanded state changes', () => {
    mockProjects = [{ projectId: 'project-1', name: 'Test New' }];
    const { rerender } = render(<Wrapper />);
    const cache = mockCapturedCache!;

    cache.set(1, 0, 300, 72);
    expect(cache.has(1, 0)).toBe(true);

    mockProjectsExpanded = false;
    rerender(<Wrapper />);

    expect(cache.has(1, 0)).toBe(false);
  });

  it('should keep the first date header flush after favorites, projects, and chats header rows', () => {
    mockProjects = [{ projectId: 'project-1', name: 'Test New' }];
    mockGroupedConversations = [['Today', [createConversation('conversation-1')]]];

    render(<Wrapper />);

    expect(screen.getByText('Today')).toHaveClass('mt-0');
  });
});
