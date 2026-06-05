import { renderHook, act } from '@testing-library/react';
import { Constants } from 'librechat-data-provider';
import type { EventSubmission, TConversation, TMessage } from 'librechat-data-provider';

const mockNavigate = jest.fn();
const mockLocation = {
  pathname: '/code/new',
  search: '',
};
const mockParams: {
  conversationId?: string;
  zdockId?: string;
} = {};
const mockSetQueryData = jest.fn();
const mockGetQueryData = jest.fn();
const mockFindAllQueries = jest.fn(() => []);
const mockQueueTitleGeneration = jest.fn();
const mockAnnouncePolite = jest.fn();
const mockAttachmentHandler = jest.fn();
const mockApplyAgentTemplate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: () => mockLocation,
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}));

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueryClient: () => ({
    getQueryData: mockGetQueryData,
    getQueryCache: () => ({
      findAll: mockFindAllQueries,
    }),
    setQueryData: mockSetQueryData,
  }),
}));

jest.mock('~/Providers', () => ({
  useLiveAnnouncer: () => ({
    announcePolite: mockAnnouncePolite,
  }),
}));

jest.mock('~/data-provider', () => ({
  startupConfigKey: jest.fn(() => ['startupConfig']),
  queueTitleGeneration: (...args: unknown[]) => mockQueueTitleGeneration(...args),
}));

jest.mock('~/hooks/Agents', () => ({
  useApplyAgentTemplate: () => mockApplyAgentTemplate,
}));

jest.mock('~/hooks/AuthContext', () => ({
  useAuthContext: () => ({
    token: 'test-token',
  }),
}));

jest.mock('~/hooks/SSE/useAttachmentHandler', () => jest.fn(() => mockAttachmentHandler));

jest.mock('~/hooks/SSE/useContentHandler', () =>
  jest.fn(() => ({
    contentHandler: jest.fn(),
    resetContentHandler: jest.fn(),
  })),
);

jest.mock('~/hooks/SSE/useStepHandler', () =>
  jest.fn(() => ({
    clearStepMaps: jest.fn(),
    stepHandler: jest.fn(),
    syncStepMessage: jest.fn(),
  })),
);

jest.mock('~/store', () => ({
  __esModule: true,
  default: {
    abortScroll: jest.fn(),
  },
}));

import useEventHandlers from '~/hooks/SSE/useEventHandlers';

function createMessage(overrides: Partial<TMessage> = {}): TMessage {
  return {
    messageId: 'message-1',
    conversationId: 'convo-current',
    isCreatedByUser: false,
    parentMessageId: `${Constants.NO_PARENT}`,
    sender: 'Assistant',
    text: 'response',
    ...overrides,
  };
}

function createSubmission(overrides: Partial<EventSubmission> = {}): EventSubmission {
  const conversationId =
    (overrides.conversation as Partial<TConversation> | undefined)?.conversationId ??
    `${Constants.NEW_CONVO}`;

  return {
    conversation: {
      conversationId,
      endpoint: 'openAI',
      ...((overrides.conversation as Partial<TConversation> | undefined) ?? {}),
    },
    initialResponse: createMessage({
      content: [{ type: 'text', text: { value: 'draft' } }] as TMessage['content'],
      conversationId,
      messageId: 'response-initial',
      parentMessageId: 'request-1',
      text: '',
    }),
    isTemporary: false,
    messages: [],
    userMessage: createMessage({
      conversationId,
      isCreatedByUser: true,
      messageId: 'request-1',
      parentMessageId: `${Constants.NO_PARENT}`,
      sender: 'User',
      text: 'hello',
    }),
    ...overrides,
  } as EventSubmission;
}

describe('useEventHandlers', () => {
  const setCompleted = jest.fn();
  const setMessages = jest.fn();
  const setConversation = jest.fn();
  const setIsSubmitting = jest.fn();
  const setShowStopButton = jest.fn();
  const getMessages = jest.fn(() => [createMessage({ messageId: 'existing-message' })]);

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation.pathname = '/code/new';
    mockLocation.search = '';
    mockParams.conversationId = Constants.NEW_CONVO;
    delete mockParams.zdockId;
    getMessages.mockReturnValue([createMessage({ messageId: 'existing-message' })]);
    mockGetQueryData.mockReturnValue(undefined);
    mockFindAllQueries.mockReturnValue([]);
  });

  function renderHandlers() {
    return renderHook(() =>
      useEventHandlers({
        getMessages,
        setCompleted,
        setConversation,
        setIsSubmitting,
        setMessages,
        setShowStopButton,
      }),
    );
  }

  it('keeps code-mode navigation on early aborts', () => {
    mockLocation.pathname = '/p/project-1/code/temp-stream';
    mockLocation.search = '?openArtifact=artifact-1';
    mockParams.zdockId = 'project-1';

    const submission = createSubmission({
      conversation: {
        conversationId: Constants.NEW_CONVO,
        zdockId: 'project-1',
      } as Partial<TConversation>,
    });

    const { result } = renderHandlers();

    act(() => {
      result.current.finalHandler(
        {
          conversation: {
            conversationId: '',
          },
          earlyAbort: true,
          requestMessage: submission.userMessage,
          responseMessage: submission.initialResponse,
        } as never,
        submission,
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('/p/project-1/code/new?openArtifact=artifact-1', {
      replace: true,
    });
  });

  it('keeps users on /code/new for no-response cancellations', () => {
    mockLocation.pathname = '/code/new';
    mockLocation.search = '?openFile=README.md';

    const submission = createSubmission({
      conversation: {
        conversationId: Constants.NEW_CONVO,
      } as Partial<TConversation>,
    });

    const responseMessage = createMessage({
      content: submission.initialResponse.content,
      conversationId: '',
      messageId: 'response-final',
      parentMessageId: submission.userMessage.messageId,
      text: '',
    });

    const { result } = renderHandlers();

    act(() => {
      result.current.finalHandler(
        {
          conversation: {
            conversationId: '',
          },
          requestMessage: submission.userMessage,
          responseMessage,
        } as never,
        submission,
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('/code/new?openFile=README.md', {
      replace: true,
      state: { focusChat: true },
    });
  });

  it('replaces new project code routes with persisted code conversation routes', () => {
    mockLocation.pathname = '/p/project-1/code/new';
    mockLocation.search = '?openFile=README.md';
    mockParams.zdockId = 'project-1';

    const submission = createSubmission({
      conversation: {
        conversationId: `${Constants.NEW_CONVO}`,
        zdockId: 'project-1',
      } as Partial<TConversation>,
      initialResponse: createMessage({
        content: [{ type: 'text', text: { value: 'draft' } }] as TMessage['content'],
        conversationId: `${Constants.NEW_CONVO}`,
        messageId: 'response-initial',
        parentMessageId: 'request-1',
        text: '',
      }),
    });

    const persistedConversation = {
      conversationId: 'convo-persisted',
      zdockId: 'project-1',
      title: 'Generated Conversation',
    };

    const responseMessage = createMessage({
      content: [{ type: 'text', text: { value: 'final answer' } }] as TMessage['content'],
      conversationId: 'convo-persisted',
      messageId: 'response-final',
      parentMessageId: submission.userMessage.messageId,
      text: '',
    });

    const { result } = renderHandlers();

    act(() => {
      result.current.finalHandler(
        {
          conversation: persistedConversation,
          requestMessage: submission.userMessage,
          responseMessage,
        } as never,
        submission,
      );
    });

    expect(mockQueueTitleGeneration).toHaveBeenCalledWith('convo-persisted');
    expect(mockNavigate).toHaveBeenCalledWith('/p/project-1/code/convo-persisted?openFile=README.md', {
      replace: true,
    });
  });
});
