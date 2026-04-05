const express = require('express');
const { generateCheckAccess } = require('@librechat/api');
const { logger } = require('@librechat/data-schemas');
const { PermissionTypes, Permissions } = require('librechat-data-provider');
const { toggleUserMemories, getRoleByName } = require('~/models');
const mem0 = require('~/server/services/Mem0Client');
const asyncHandler = require('~/server/middleware/asyncHandler');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

const memoryPayloadLimit = express.json({ limit: '100kb' });

const checkMemoryRead = generateCheckAccess({
  permissionType: PermissionTypes.MEMORIES,
  permissions: [Permissions.USE, Permissions.READ],
  getRoleByName,
});
const checkMemoryUpdate = generateCheckAccess({
  permissionType: PermissionTypes.MEMORIES,
  permissions: [Permissions.USE, Permissions.UPDATE],
  getRoleByName,
});
const checkMemoryOptOut = generateCheckAccess({
  permissionType: PermissionTypes.MEMORIES,
  permissions: [Permissions.USE, Permissions.OPT_OUT],
  getRoleByName,
});

router.use(requireJwtAuth);

/**
 * Maps a Mem0 memory record to the frontend TUserMemory shape.
 */
function toUserMemory(mem) {
  return {
    key: mem.id,
    value: mem.memory,
    updated_at: mem.updated_at || mem.created_at || new Date().toISOString(),
    tokenCount: 0,
  };
}

/**
 * GET /memories
 * Returns all memories for the authenticated user from Mem0.
 */
router.get(
  '/',
  checkMemoryRead,
  asyncHandler(async (req, res) => {
    const memories = await mem0.listMemories(req.user.id);
    const mapped = memories.map(toUserMemory);
    const sorted = mapped.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );

    res.json({
      memories: sorted,
      totalTokens: 0,
      tokenLimit: null,
      charLimit: 10000,
      usagePercentage: null,
    });
  }),
);

/**
 * POST /memories
 * Manually adds a memory via Mem0.
 * Body: { key: string (ignored), value: string }
 */
router.post(
  '/',
  memoryPayloadLimit,
  checkMemoryRead,
  asyncHandler(async (req, res) => {
    const { value } = req.body;

    if (typeof value !== 'string' || value.trim() === '') {
      return res.status(400).json({ error: 'Value is required and must be a non-empty string.' });
    }

    const result = await mem0.addMemories([{ role: 'user', content: value.trim() }], req.user.id);

    const newId = result?.results?.[0]?.id;
    const memory = {
      key: newId || 'new',
      value: value.trim(),
      updated_at: new Date().toISOString(),
      tokenCount: 0,
    };

    res.status(201).json({ created: true, memory });
  }),
);

/**
 * PATCH /memories/preferences
 * Updates the user's memory preferences (enable/disable).
 */
router.patch(
  '/preferences',
  checkMemoryOptOut,
  asyncHandler(async (req, res) => {
    const { memories } = req.body;

    if (typeof memories !== 'boolean') {
      return res.status(400).json({ error: 'memories must be a boolean value.' });
    }

    const updatedUser = await toggleUserMemories(req.user.id, memories);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      updated: true,
      preferences: {
        memories: updatedUser.personalization?.memories ?? true,
      },
    });
  }),
);

/**
 * PATCH /memories/:key
 * Mem0 memories are immutable — create new first, then delete old (safe ordering).
 * :key is the Mem0 memory ID.
 */
router.patch(
  '/:key',
  memoryPayloadLimit,
  checkMemoryUpdate,
  asyncHandler(async (req, res) => {
    const { key: memoryId } = req.params;
    const { value } = req.body || {};

    if (typeof value !== 'string' || value.trim() === '') {
      return res.status(400).json({ error: 'Value is required and must be a non-empty string.' });
    }

    const result = await mem0.addMemories([{ role: 'user', content: value.trim() }], req.user.id);

    const newId = result?.results?.[0]?.id;
    if (!newId) {
      return res.status(500).json({ error: 'Failed to create replacement memory' });
    }

    try {
      await mem0.deleteMemory(memoryId);
    } catch (deleteError) {
      logger.warn('[PATCH /memories/:key] New memory created but old memory deletion failed', {
        oldId: memoryId,
        newId,
        error: deleteError.message,
      });
    }

    res.json({
      updated: true,
      memory: {
        key: newId,
        value: value.trim(),
        updated_at: new Date().toISOString(),
        tokenCount: 0,
      },
    });
  }),
);

/**
 * DELETE /memories/:key
 * Deletes a memory by its Mem0 ID.
 */
router.delete(
  '/:key',
  checkMemoryUpdate,
  asyncHandler(async (req, res) => {
    const { key: memoryId } = req.params;

    const success = await mem0.deleteMemory(memoryId);
    if (!success) {
      return res.status(404).json({ error: 'Memory not found.' });
    }
    res.json({ deleted: true });
  }),
);

module.exports = router;
