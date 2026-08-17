const { v4 } = require('uuid');
const { sleep } = require('@librechat/agents');
const { logger } = require('@librechat/data-schemas');
const {
  sendEvent,
  countTokens,
  checkBalance,
  getBalanceConfig,
  getModelMaxTokens,
  ATTACHMENT_ONLY_TEXT,
} = require('@librechat/api');
const {
  Time,
  Constants,
  RunStatus,
  CacheKeys,
  VisionModes,
  EModelEndpoint,
  ImageVisionTool,
  checkOpenAIStorage,
  AssistantStreamEvents,
} = require('librechat-data-provider');
const {
  initThread,
  recordUsage,
  saveUserMessage,
  addThreadMetadata,
  saveAssistantMessage,
} = require('~/server/services/Threads');
const { runAssistant, createOnTextProgress } = require('~/server/services/AssistantService');
const { createErrorHandler } = require('~/server/controllers/assistants/errors');
const { validateAuthor } = require('~/server/middleware/assistants/validateAuthor');
const { formatMessage, createVisionPrompt } = require('~/app/clients/prompts');
const { encodeAndFormat } = require('~/server/services/Files/images/encode');
const { createRun, StreamRunManager } = require('~/server/services/Runs');
const { addTitle } = require('~/server/services/Endpoints/assistants');
const { createRunBody } = require('~/server/services/createRunBody');
const { checkBalanceBeforeRun } = require('./shared');
const { getConvo } = require('~/models');
const { getLogStores } = require('~/cache');
const { getOpenAIClient } = require('./helpers');

/**
 * @route POST /
 * @desc Chat with an assistant
 * @access Public
 * @param {object} req - The request object, containing the request data.
 * @param {object} req.body - The request payload.
 * @param {Express.Response} res - The response object, used to send back a response.
 * @returns {void}
 */
const chatV1 = async (req, res) => {
  const appConfig = req.config;
  logger.debug('[/assistants/chat/] req.body', req.body);

  const {
    text,
    model,
    endpoint,
    files = [],
    promptPrefix,
    assistant_id,
    instructions,
    endpointOption,
    thread_id: _thread_id,
    messageId: _messageId,
    conversationId: convoId,
    parentMessageId: _parentId = Constants.NO_PARENT,
    clientTimestamp,
  } = req.body;

  /** @type {OpenAI} */
  let openai;
  /** @type {string|undefined} - the current thread id */
  let thread_id = _thread_id;
  /** @type {string|undefined} - the current run id */
  let run_id;
  /** @type {string|undefined} - the parent messageId */
  let parentMessageId = _parentId;
  /** @type {TMessage[]} */
  let previousMessages = [];
  /** @type {import('librechat-data-provider').TConversation | null} */
  let conversation = null;
  /** @type {string[]} */
  let file_ids = [];
  /** @type {Set<string>} */
  let attachedFileIds = new Set();
  /** @type {TMessage | null} */
  let requestMessage = null;
  /** @type {undefined | Promise<ChatCompletion>} */
  let visionPromise;

  const userMessageId = v4();
  const responseMessageId = v4();

  /** @type {string} - The conversation UUID - created if undefined */
  const conversationId = convoId ?? v4();

  const cache = getLogStores(CacheKeys.ABORT_KEYS);
  const cacheKey = `${req.user.id}:${conversationId}`;

  /** @type {Run | undefined} - The completed run, undefined if incomplete */
  let completedRun;

  const getContext = () => ({
    openai,
    run_id,
    endpoint,
    cacheKey,
    thread_id,
    completedRun,
    assistant_id,
    conversationId,
    parentMessageId,
    responseMessageId,
  });

  const handleError = createErrorHandler({ req, res, getContext });

  try {
    res.on('close', async () => {
      if (!completedRun) {
        await handleError(new Error('Request closed'));
      }
    });

    if (convoId && !_thread_id) {
      completedRun = true;
      throw new Error('Missing thread_id for existing conversation');
    }

    if (!assistant_id) {
      completedRun = true;
      throw new Error('Missing assistant_id');
    }

    const { openai: _openai } = await getOpenAIClient({
      req,
      res,
      endpointOption,
    });

    openai = _openai;
    await validateAuthor({ req, openai });

    if (previousMessages.length) {
      parentMessageId = previousMessages[previousMessages.length - 1].messageId;
    }

    /**
     * Threads rejects an empty message body, so an attachment-only turn sends
     * a minimal note instead. The persisted message keeps its empty text.
     */
    const isAttachmentOnly = !text?.trim() && files.length > 0;
    let userMessage = {
      role: 'user',
      content: isAttachmentOnly ? ATTACHMENT_ONLY_TEXT : text,
      metadata: {
        messageId: userMessageId,
      },
    };

    /** @type {CreateRunBody | undefined} */
    const body = createRunBody({
      assistant_id,
      model,
      promptPrefix,
      instructions,
      endpointOption,
      clientTimestamp,
    });

    const getRequestFileIds = async () => {
      let thread_file_ids = [];
      if (convoId) {
        const convo = await getConvo(req.user.id, convoId);
        if (convo && convo.file_ids) {
          thread_file_ids = convo.file_ids;
        }
      }

      file_ids = files.map(({ file_id }) => file_id);
      if (file_ids.length || thread_file_ids.length) {
        attachedFileIds = new Set([...file_ids, ...thread_file_ids]);
        if (endpoint === EModelEndpoint.azureAssistants) {
          userMessage.attachments = Array.from(attachedFileIds).map((file_id) => ({
            file_id,
            tools: [{ type: 'file_search' }],
          }));
        } else {
          userMessage.file_ids = Array.from(attachedFileIds);
        }
      }
    };

    const addVisionPrompt = async () => {
      if (!endpointOption.attachments) {
        return;
      }

      /** @type {MongoFile[]} */
      const attachments = await endpointOption.attachments;
      if (attachments && attachments.every((attachment) => checkOpenAIStorage(attachment.source))) {
        return;
      }

      const assistant = await openai.beta.assistants.retrieve(assistant_id);
      const visionToolIndex = assistant.tools.findIndex(
        (tool) => tool?.function && tool?.function?.name === ImageVisionTool.function.name,
      );

      if (visionToolIndex === -1) {
        return;
      }

      let visionMessage = {
        role: 'user',
        content: '',
      };
      const { files, image_urls } = await encodeAndFormat(
        req,
        attachments,
        {
          endpoint: EModelEndpoint.assistants,
        },
        VisionModes.generative,
      );
      visionMessage.image_urls = image_urls.length ? image_urls : undefined;
      if (!visionMessage.image_urls?.length) {
        return;
      }

      const imageCount = visionMessage.image_urls.length;
      const plural = imageCount > 1;
      visionMessage.content = createVisionPrompt(plural);
      visionMessage = formatMessage({ message: visionMessage, endpoint: EModelEndpoint.openAI });

      visionPromise = openai.chat.completions
        .create({
          messages: [visionMessage],
          max_tokens: 4000,
        })
        .catch((error) => {
          logger.error('[/assistants/chat/] Error creating vision prompt', error);
        });

      const pluralized = plural ? 's' : '';
      body.additional_instructions = `${
        body.additional_instructions ? `${body.additional_instructions}\n` : ''
      }The user has uploaded ${imageCount} image${pluralized}.
      Use the \`${ImageVisionTool.function.name}\` tool to retrieve ${
        plural ? '' : 'a '
      }detailed text description${pluralized} for ${plural ? 'each' : 'the'} image${pluralized}.`;

      return files;
    };

    /** @type {Promise<Run>|undefined} */
    let userMessagePromise;

    const initializeThread = async () => {
      /** @type {[ undefined | MongoFile[]]}*/
      const [processedFiles] = await Promise.all([addVisionPrompt(), getRequestFileIds()]);
      // TODO: may allow multiple messages to be created beforehand in a future update
      const initThreadBody = {
        messages: [userMessage],
        metadata: {
          user: req.user.id,
          conversationId,
        },
      };

      if (processedFiles) {
        for (const file of processedFiles) {
          if (!checkOpenAIStorage(file.source)) {
            attachedFileIds.delete(file.file_id);
            const index = file_ids.indexOf(file.file_id);
            if (index > -1) {
              file_ids.splice(index, 1);
            }
          }
        }

        userMessage.file_ids = file_ids;
      }

      const result = await initThread({ openai, body: initThreadBody, thread_id });
      thread_id = result.thread_id;

      createOnTextProgress({
        openai,
        conversationId,
        userMessageId,
        messageId: responseMessageId,
        thread_id,
      });

      requestMessage = {
        user: req.user.id,
        text,
        messageId: userMessageId,
        parentMessageId,
        // TODO: make sure client sends correct format for `files`, use zod
        files,
        file_ids,
        conversationId,
        isCreatedByUser: true,
        assistant_id,
        thread_id,
        model: assistant_id,
        endpoint,
      };

      previousMessages.push(requestMessage);

      /* asynchronous */
      userMessagePromise = saveUserMessage(req, { ...requestMessage, model });

      conversation = {
        conversationId,
        endpoint,
        promptPrefix: promptPrefix,
        instructions: instructions,
        assistant_id,
        // model,
      };

      if (file_ids.length) {
        conversation.file_ids = file_ids;
      }
    };

    const promises = [
      initializeThread(),
      checkBalanceBeforeRun({
        appConfig,
        req,
        res,
        model,
        text,
        promptPrefix,
        parentMessageId,
        _thread_id,
        conversationId,
      }),
    ];
    await Promise.all(promises);

    const sendInitialResponse = () => {
      sendEvent(res, {
        sync: true,
        conversationId,
        // messages: previousMessages,
        requestMessage,
        responseMessage: {
          user: req.user.id,
          messageId: openai.responseMessage.messageId,
          parentMessageId: userMessageId,
          conversationId,
          assistant_id,
          thread_id,
          model: assistant_id,
        },
      });
    };

    /** @type {RunResponse | typeof StreamRunManager | undefined} */
    let response;

    const processRun = async (retry = false) => {
      if (endpoint === EModelEndpoint.azureAssistants) {
        body.model = openai._options.model;
        openai.attachedFileIds = attachedFileIds;
        openai.visionPromise = visionPromise;
        if (retry) {
          response = await runAssistant({
            openai,
            thread_id,
            run_id,
            in_progress: openai.in_progress,
          });
          return;
        }

        /* NOTE:
         * By default, a Run will use the model and tools configuration specified in Assistant object,
         * but you can override most of these when creating the Run for added flexibility:
         */
        const run = await createRun({
          openai,
          thread_id,
          body,
        });

        run_id = run.id;
        await cache.set(cacheKey, `${thread_id}:${run_id}`, Time.TEN_MINUTES);
        sendInitialResponse();

        // todo: retry logic
        response = await runAssistant({ openai, thread_id, run_id });
        return;
      }

      /** @type {{[AssistantStreamEvents.ThreadRunCreated]: (event: ThreadRunCreated) => Promise<void>}} */
      const handlers = {
        [AssistantStreamEvents.ThreadRunCreated]: async (event) => {
          await cache.set(cacheKey, `${thread_id}:${event.data.id}`, Time.TEN_MINUTES);
          run_id = event.data.id;
          sendInitialResponse();
        },
      };

      const streamRunManager = new StreamRunManager({
        req,
        res,
        openai,
        handlers,
        thread_id,
        visionPromise,
        attachedFileIds,
        responseMessage: openai.responseMessage,
        // streamOptions: {

        // },
      });

      await streamRunManager.runAssistant({
        thread_id,
        body,
      });

      response = streamRunManager;
    };

    await processRun();
    logger.debug('[/assistants/chat/] response', {
      run: response.run,
      steps: response.steps,
    });

    if (response.run.status === RunStatus.CANCELLED) {
      logger.debug('[/assistants/chat/] Run cancelled, handled by `abortRun`');
      return res.end();
    }

    if (response.run.status === RunStatus.IN_PROGRESS) {
      processRun(true);
    }

    completedRun = response.run;

    /** @type {ResponseMessage} */
    const responseMessage = {
      ...(response.responseMessage ?? response.finalMessage),
      parentMessageId: userMessageId,
      conversationId,
      user: req.user.id,
      assistant_id,
      thread_id,
      model: assistant_id,
      endpoint,
      spec: endpointOption.spec,
      iconURL: endpointOption.iconURL,
    };

    sendEvent(res, {
      final: true,
      conversation,
      requestMessage: {
        parentMessageId,
        thread_id,
      },
    });
    res.end();

    if (userMessagePromise) {
      await userMessagePromise;
    }
    await saveAssistantMessage(req, { ...responseMessage, model });

    if (parentMessageId === Constants.NO_PARENT && !_thread_id) {
      addTitle(req, {
        text,
        responseText: response.text,
        conversationId,
      });
    }

    await addThreadMetadata({
      openai,
      thread_id,
      messageId: responseMessage.messageId,
      messages: response.messages,
    });

    if (!response.run.usage) {
      await sleep(3000);
      completedRun = await openai.beta.threads.runs.retrieve(response.run.id, { thread_id });
      if (completedRun.usage) {
        await recordUsage({
          ...completedRun.usage,
          user: req.user.id,
          model: completedRun.model ?? model,
          conversationId,
        });
      }
    } else {
      await recordUsage({
        ...response.run.usage,
        user: req.user.id,
        model: response.run.model ?? model,
        conversationId,
      });
    }
  } catch (error) {
    await handleError(error);
  }
};

module.exports = chatV1;
