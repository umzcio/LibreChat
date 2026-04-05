const { CacheKeys, ViolationTypes, ContentTypes } = require('librechat-data-provider');

jest.mock('@librechat/data-schemas', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('~/server/services/Threads', () => ({
  recordUsage: jest.fn(),
  checkMessageGaps: jest.fn(),
}));

jest.mock('~/server/middleware/error', () => ({
  sendResponse: jest.fn(),
}));

jest.mock('~/cache/getLogStores', () => {
  const store = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };
  return jest.fn(() => store);
});

jest.mock('~/models', () => ({
  getConvo: jest.fn(),
}));

const { createErrorHandler } = require('../errors');
const { recordUsage, checkMessageGaps } = require('~/server/services/Threads');
const { sendResponse } = require('~/server/middleware/error');
const getLogStores = require('~/cache/getLogStores');
const { getConvo } = require('~/models');
const { logger } = require('@librechat/data-schemas');

describe('createErrorHandler', () => {
  let req, res, getContext, cache;

  beforeEach(() => {
    jest.clearAllMocks();
    cache = getLogStores(CacheKeys.ABORT_KEYS);

    req = { user: { id: 'user-1' } };
    res = { end: jest.fn() };

    getContext = jest.fn(() => ({
      openai: {
        beta: {
          threads: {
            runs: {
              cancel: jest.fn().mockResolvedValue({ id: 'run-1', status: 'cancelled' }),
              retrieve: jest.fn().mockResolvedValue({
                usage: { prompt_tokens: 10, completion_tokens: 20 },
                model: 'gpt-4',
              }),
            },
          },
        },
      },
      run_id: 'run-1',
      endpoint: 'assistants',
      cacheKey: 'user-1:conv-1',
      thread_id: 'thread-1',
      completedRun: false,
      assistant_id: 'asst-1',
      conversationId: 'conv-1',
      parentMessageId: 'parent-1',
      responseMessageId: 'resp-1',
    }));
  });

  it('should return a function', () => {
    const handler = createErrorHandler({ req, res, getContext });
    expect(typeof handler).toBe('function');
  });

  describe('error classification', () => {
    it('should end response for "Run cancelled"', async () => {
      const handler = createErrorHandler({ req, res, getContext });
      await handler(new Error('Run cancelled'));
      expect(res.end).toHaveBeenCalled();
      expect(sendResponse).not.toHaveBeenCalled();
    });

    it('should return silently for "Request closed" when run is completed', async () => {
      getContext.mockReturnValue({
        ...getContext(),
        completedRun: true,
      });
      const handler = createErrorHandler({ req, res, getContext });
      await handler(new Error('Request closed'));
      expect(res.end).not.toHaveBeenCalled();
      expect(sendResponse).not.toHaveBeenCalled();
    });

    it('should log debug for "Request closed" when run is not completed and no openai/run_id', async () => {
      getContext.mockReturnValue({
        ...getContext(),
        completedRun: false,
        openai: null,
        run_id: null,
      });
      const handler = createErrorHandler({ req, res, getContext });
      await handler(new Error('Request closed'));
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Request aborted on close'),
      );
      expect(sendResponse).toHaveBeenCalledWith(
        req,
        res,
        expect.objectContaining({ sender: 'System' }),
        expect.stringContaining('failed to initialize'),
      );
    });

    it('should handle "Files are invalid" errors', async () => {
      getContext.mockReturnValue({
        ...getContext(),
        openai: null,
      });
      const handler = createErrorHandler({ req, res, getContext });
      await handler(new Error('Files uploaded are invalid'));
      expect(sendResponse).toHaveBeenCalledWith(
        req,
        res,
        expect.any(Object),
        expect.stringContaining('Files are invalid'),
      );
    });

    it('should include Azure message for azureAssistants endpoint on file error', async () => {
      getContext.mockReturnValue({
        ...getContext(),
        endpoint: 'azureAssistants',
        openai: null,
      });
      const handler = createErrorHandler({ req, res, getContext });
      await handler(new Error('Files uploaded are invalid'));
      expect(sendResponse).toHaveBeenCalledWith(
        req,
        res,
        expect.any(Object),
        expect.stringContaining('Azure OpenAI'),
      );
    });

    it('should handle "string too long" errors', async () => {
      getContext.mockReturnValue({
        ...getContext(),
        openai: null,
      });
      const handler = createErrorHandler({ req, res, getContext });
      await handler(new Error('string too long'));
      expect(sendResponse).toHaveBeenCalledWith(
        req,
        res,
        expect.any(Object),
        expect.stringContaining('32,768 characters'),
      );
    });

    it('should handle TOKEN_BALANCE errors', async () => {
      getContext.mockReturnValue({
        ...getContext(),
        openai: null,
      });
      const handler = createErrorHandler({ req, res, getContext });
      const balanceError = new Error(`${ViolationTypes.TOKEN_BALANCE}: insufficient balance`);
      await handler(balanceError);
      expect(sendResponse).toHaveBeenCalledWith(
        req,
        res,
        expect.any(Object),
        balanceError.message,
      );
    });

    it('should log unrecognized errors', async () => {
      getContext.mockReturnValue({
        ...getContext(),
        openai: null,
        run_id: null,
      });
      const handler = createErrorHandler({ req, res, getContext });
      const unknownError = new Error('something unexpected');
      await handler(unknownError);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('/assistants/chat/'),
        unknownError,
      );
    });
  });

  describe('thread-based cleanup (assistants path)', () => {
    it('should call checkMessageGaps when thread_id is provided', async () => {
      cache.get.mockResolvedValue(null);
      cache.delete.mockResolvedValue(undefined);
      getConvo.mockResolvedValue({ conversationId: 'conv-1' });
      checkMessageGaps.mockResolvedValue([
        { content: [{ text: { value: 'test' }, type: ContentTypes.TEXT }] },
      ]);

      const handler = createErrorHandler({ req, res, getContext });
      await handler(new Error('some error'));

      expect(checkMessageGaps).toHaveBeenCalledWith(
        expect.objectContaining({
          thread_id: 'thread-1',
          run_id: 'run-1',
        }),
      );
    });

    it('should cancel run via openai API when thread_id is present', async () => {
      cache.get.mockResolvedValue(null);
      cache.delete.mockResolvedValue(undefined);
      getConvo.mockResolvedValue({ conversationId: 'conv-1' });
      checkMessageGaps.mockResolvedValue([{ content: [] }]);

      const cancelMock = jest.fn().mockResolvedValue({ id: 'run-1', status: 'cancelled' });
      const retrieveMock = jest.fn().mockResolvedValue({
        usage: { prompt_tokens: 10, completion_tokens: 20 },
        model: 'gpt-4',
      });
      getContext.mockReturnValue({
        openai: { beta: { threads: { runs: { cancel: cancelMock, retrieve: retrieveMock } } } },
        run_id: 'run-1',
        endpoint: 'assistants',
        cacheKey: 'user-1:conv-1',
        thread_id: 'thread-1',
        completedRun: false,
        assistant_id: 'asst-1',
        conversationId: 'conv-1',
        parentMessageId: 'parent-1',
        responseMessageId: 'resp-1',
      });

      const handler = createErrorHandler({ req, res, getContext });
      await handler(new Error('some error'));

      expect(cancelMock).toHaveBeenCalledWith('run-1', {
        thread_id: 'thread-1',
      });
    });

    it('should record usage when thread_id is present', async () => {
      cache.get.mockResolvedValue(null);
      cache.delete.mockResolvedValue(undefined);
      getConvo.mockResolvedValue({ conversationId: 'conv-1' });
      checkMessageGaps.mockResolvedValue([{ content: [] }]);

      const handler = createErrorHandler({ req, res, getContext });
      await handler(new Error('some error'));

      expect(recordUsage).toHaveBeenCalledWith(
        expect.objectContaining({
          user: 'user-1',
          conversationId: 'conv-1',
        }),
      );
    });
  });

  describe('agent path (no thread_id)', () => {
    it('should skip thread operations when thread_id is undefined', async () => {
      getContext.mockReturnValue({
        ...getContext(),
        thread_id: undefined,
      });
      cache.get.mockResolvedValue(null);
      cache.delete.mockResolvedValue(undefined);
      getConvo.mockResolvedValue({ conversationId: 'conv-1' });

      const handler = createErrorHandler({ req, res, getContext });
      await handler(new Error('some error'));

      expect(checkMessageGaps).not.toHaveBeenCalled();
      expect(recordUsage).not.toHaveBeenCalled();
    });

    it('should still build a finalEvent without runMessages', async () => {
      getContext.mockReturnValue({
        ...getContext(),
        thread_id: undefined,
      });
      cache.get.mockResolvedValue(null);
      cache.delete.mockResolvedValue(undefined);
      getConvo.mockResolvedValue({ conversationId: 'conv-1' });

      const handler = createErrorHandler({ req, res, getContext });
      await handler(new Error('some error'));

      expect(sendResponse).toHaveBeenCalledWith(
        req,
        res,
        expect.objectContaining({
          final: true,
          conversation: { conversationId: 'conv-1' },
        }),
      );
    });
  });

  describe('cache-based cancellation', () => {
    it('should end response when run is already cancelled in cache', async () => {
      cache.get.mockResolvedValue('cancelled');

      const handler = createErrorHandler({ req, res, getContext });
      await handler(new Error('some error'));

      expect(res.end).toHaveBeenCalled();
    });
  });

  describe('custom originPath', () => {
    it('should use custom originPath in log messages', async () => {
      getContext.mockReturnValue({
        ...getContext(),
        openai: null,
        run_id: null,
      });
      const handler = createErrorHandler({
        req,
        res,
        getContext,
        originPath: '/agents/chat/',
      });
      await handler(new Error('test error'));
      expect(logger.error).toHaveBeenCalledWith('[/agents/chat/]', expect.any(Error));
    });
  });

  describe('messageData shape', () => {
    it('should include thread_id in messageData when available', async () => {
      getContext.mockReturnValue({
        ...getContext(),
        openai: null,
        run_id: null,
      });
      const handler = createErrorHandler({ req, res, getContext });
      await handler(new Error('unknown'));

      expect(sendResponse).toHaveBeenCalledWith(
        req,
        res,
        expect.objectContaining({
          thread_id: 'thread-1',
          assistant_id: 'asst-1',
          conversationId: 'conv-1',
          parentMessageId: 'parent-1',
          messageId: 'resp-1',
          sender: 'System',
          user: 'user-1',
          shouldSaveMessage: false,
          endpoint: 'assistants',
        }),
        expect.any(String),
      );
    });
  });
});
