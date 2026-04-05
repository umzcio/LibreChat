const {
  countTokens,
  checkBalance,
  getBalanceConfig,
  getModelMaxTokens,
} = require('@librechat/api');
const { Constants } = require('librechat-data-provider');
const {
  getMultiplier,
  getTransactions,
  findBalanceByUser,
  upsertBalanceFields,
  createAutoRefillTransaction,
} = require('~/models');
const { logViolation } = require('~/cache');

/**
 * Checks the user's token balance before initiating a run.
 * @param {object} params
 * @param {object} params.appConfig - The application config from req.config.
 * @param {ServerRequest} params.req - The Express request object.
 * @param {Express.Response} params.res - The Express response object.
 * @param {string} params.model - The model identifier.
 * @param {string} params.text - The user's message text.
 * @param {string|null} params.promptPrefix - Optional prompt prefix.
 * @param {string} params.parentMessageId - The parent message ID.
 * @param {string|undefined} params._thread_id - The existing thread ID, if any.
 * @param {string} params.conversationId - The conversation ID.
 * @returns {Promise<void>}
 */
const checkBalanceBeforeRun = async ({
  appConfig,
  req,
  res,
  model,
  text,
  promptPrefix,
  parentMessageId,
  _thread_id,
  conversationId,
}) => {
  const balanceConfig = getBalanceConfig(appConfig);
  if (!balanceConfig?.enabled) {
    return;
  }
  const transactions =
    (await getTransactions({
      user: req.user.id,
      context: 'message',
      conversationId,
    })) ?? [];

  const totalPreviousTokens = Math.abs(transactions.reduce((acc, curr) => acc + curr.rawAmount, 0));

  // TODO: make promptBuffer a config option; buffer for titles, needs buffer for system instructions
  const promptBuffer = parentMessageId === Constants.NO_PARENT && !_thread_id ? 200 : 0;
  // 5 is added for labels
  let promptTokens = (await countTokens(text + (promptPrefix ?? ''))) + 5;
  promptTokens += totalPreviousTokens + promptBuffer;
  // Count tokens up to the current context window
  promptTokens = Math.min(promptTokens, getModelMaxTokens(model));

  await checkBalance(
    {
      req,
      res,
      txData: {
        model,
        user: req.user.id,
        tokenType: 'prompt',
        amount: promptTokens,
      },
    },
    {
      findBalanceByUser,
      getMultiplier,
      createAutoRefillTransaction,
      logViolation,
      balanceConfig,
      upsertBalanceFields,
    },
  );
};

module.exports = { checkBalanceBeforeRun };
