/**
 * Mem0 REST API Client
 *
 * Wraps the self-hosted Mem0 API for memory operations:
 * - add: auto-extract memories from conversation messages
 * - search: semantic search for relevant memories
 * - list: get all memories for a user
 * - delete: remove a specific memory
 * - deleteAll: clear all memories for a user
 */

const { logger } = require('@librechat/data-schemas');

const MEM0_BASE_URL = process.env.MEM0_BASE_URL || 'http://mem0:8000';
const MEM0_TIMEOUT = parseInt(process.env.MEM0_TIMEOUT || '30000', 10);

/**
 * @param {string} path
 * @param {object} [options]
 * @returns {Promise<any>}
 */
async function mem0Fetch(path, options = {}) {
  const url = `${MEM0_BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MEM0_TIMEOUT);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Mem0 ${options.method || 'GET'} ${path} failed (${res.status}): ${body}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Add memories from conversation messages.
 * Mem0 auto-extracts facts, preferences, and relationships.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {string} userId
 * @param {object} [options]
 * @param {string} [options.agentId]
 * @param {string} [options.metadata]
 * @returns {Promise<{results: Array, relations: object}>}
 */
async function addMemories(messages, userId, options = {}) {
  const body = {
    messages,
    user_id: userId,
  };

  if (options.agentId) {
    body.agent_id = options.agentId;
  }
  if (options.metadata) {
    body.metadata = options.metadata;
  }

  try {
    const result = await mem0Fetch('/memories', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const count = result?.results?.length || 0;
    if (count > 0) {
      logger.info(`[Mem0] Extracted ${count} memories for user ${userId}`);
    }
    return result;
  } catch (error) {
    logger.error('[Mem0] Failed to add memories:', { message: error.message, name: error.name, code: error.code, stack: error.stack?.split('\n')[1] });
    return { results: [], relations: {} };
  }
}

/**
 * Semantic search for memories relevant to a query.
 *
 * @param {string} query - The search query (usually the user's current message)
 * @param {string} userId
 * @param {object} [options]
 * @param {number} [options.limit=10]
 * @param {string} [options.agentId]
 * @returns {Promise<Array<{id: string, memory: string, score: number}>>}
 */
async function searchMemories(query, userId, options = {}) {
  const body = {
    query,
    user_id: userId,
    limit: options.limit || 10,
  };

  if (options.agentId) {
    body.agent_id = options.agentId;
  }

  try {
    const result = await mem0Fetch('/search', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return result?.results?.results || result?.results || [];
  } catch (error) {
    logger.error('[Mem0] Failed to search memories:', { message: error.message, name: error.name, code: error.code });
    return [];
  }
}

/**
 * List all memories for a user.
 *
 * @param {string} userId
 * @returns {Promise<Array<{id: string, memory: string, created_at: string, updated_at: string}>>}
 */
async function listMemories(userId) {
  try {
    const result = await mem0Fetch(`/memories?user_id=${encodeURIComponent(userId)}`);
    return result?.results?.results || result?.results || [];
  } catch (error) {
    logger.error('[Mem0] Failed to list memories:', error.message);
    return [];
  }
}

/**
 * Delete a specific memory by ID.
 *
 * @param {string} memoryId
 * @returns {Promise<boolean>}
 */
async function deleteMemory(memoryId) {
  try {
    await mem0Fetch(`/memories/${encodeURIComponent(memoryId)}`, {
      method: 'DELETE',
    });
    return true;
  } catch (error) {
    logger.error('[Mem0] Failed to delete memory:', error.message);
    return false;
  }
}

/**
 * Delete all memories for a user.
 *
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function deleteAllMemories(userId) {
  try {
    await mem0Fetch('/memories', {
      method: 'DELETE',
      body: JSON.stringify({ user_id: userId }),
    });
    return true;
  } catch (error) {
    logger.error('[Mem0] Failed to delete all memories:', error.message);
    return false;
  }
}

/**
 * Check if Mem0 service is available.
 *
 * @returns {Promise<boolean>}
 */
async function isAvailable() {
  try {
    const result = await mem0Fetch('/health');
    return result?.status === 'ok' && result?.initialized === true;
  } catch {
    return false;
  }
}

module.exports = {
  addMemories,
  searchMemories,
  listMemories,
  deleteMemory,
  deleteAllMemories,
  isAvailable,
};
