const express = require('express');
const { PrincipalType } = require('librechat-data-provider');
const { createAdminUsersHandlers } = require('@librechat/api');
const { logger, SystemCapabilities } = require('@librechat/data-schemas');
const { requireCapability } = require('~/server/middleware/roles/capabilities');
const { deleteUserMcpServers } = require('~/server/controllers/UserController');
const { deleteUserPluginAuth } = require('~/server/services/PluginService');
const { requireJwtAuth } = require('~/server/middleware');
const {
  drainAgentTriggerDeliveriesForUser,
  prepareAgentTriggerUserPurge,
  cancelAgentTriggerUserPurge,
  purgeAgentTriggerDeliveriesForUser,
} = require('~/server/services/Agents/triggers');
const db = require('~/models');

const router = express.Router();

const requireAdminAccess = requireCapability(SystemCapabilities.ACCESS_ADMIN);
const requireReadUsers = requireCapability(SystemCapabilities.READ_USERS);
// const requireManageUsers = requireCapability(SystemCapabilities.MANAGE_USERS);

async function deleteUserCascade(userId, userObjectId) {
  const ops = [
    () => db.deleteMessages({ user: userId }),
    () => db.deleteAllUserSessions({ userId }),
    () => db.deleteTransactions({ user: userId }),
    () => db.deleteUserKey({ userId, all: true }),
    () => db.deleteBalances({ user: userObjectId }),
    () => db.deletePresets(userId),
    () => db.deleteConvos(userId),
    () => deleteUserPluginAuth(userId, null, true),
    () => db.deleteAllSharedLinks(userId),
    () => db.deleteFiles(null, userId),
    () => db.deleteToolCalls(userId),
    () => db.deleteUserAgents(userId),
    () => db.deleteAllAgentApiKeys(userObjectId),
    () => db.deleteAssistants({ user: userId }),
    () => db.deleteConversationTags({ user: userId }),
    () => db.deleteAllUserMemories(userId),
    () => db.deleteUserPrompts(userId),
    () => deleteUserMcpServers(userId),
    () => db.deleteActions({ user: userId }),
    () => db.deleteTokens({ userId }),
    () => db.removeUserFromAllGroups(userId),
    () => db.deleteConfig(PrincipalType.USER, userId),
    () => db.deleteAclEntries({ principalType: PrincipalType.USER, principalId: userObjectId }),
  ];
  const results = await Promise.allSettled(ops.map((op) => op()));
  for (const r of results) {
    if (r.status === 'rejected') {
      logger.error('[deleteUserCascade] cleanup step failed for user:', userId, r.reason);
    }
  }
}

const handlers = createAdminUsersHandlers({
  findUsers: db.findUsers,
  countUsers: db.countUsers,
  beginAgentTriggerUserDeletion: db.beginAgentTriggerUserDeletion,
  cancelAgentTriggerUserDeletion: db.cancelAgentTriggerUserDeletion,
  drainAgentTriggerDeliveriesForUser,
  prepareAgentTriggerUserPurge,
  cancelAgentTriggerUserPurge,
  purgeAgentTriggerDeliveriesForUser,
  deleteUserById: db.deleteUserById,
  deleteConfig: db.deleteConfig,
  deleteAclEntries: db.deleteAclEntries,
  deleteUserCascade,
});

router.use(requireJwtAuth, requireAdminAccess);

router.get('/', requireReadUsers, handlers.listUsers);
router.get('/search', requireReadUsers, handlers.searchUsers);
// router.delete('/:id', requireManageUsers, handlers.deleteUser);

module.exports = router;
