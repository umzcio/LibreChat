# Remediation Report: Critical Fixes 1.1 and 1.2

## Fix 1.1: Missing `configMiddleware` on project file upload route

### Problem

The POST route at `/api/projects/:projectId/files` calls `createMulterInstance()`, whose storage callback accesses `req.config.paths.uploads` to determine the upload directory. However, the projects router never applied `configMiddleware`, leaving `req.config` as `undefined`. Every project file upload would crash with a `TypeError: Cannot read properties of undefined (reading 'paths')`.

### File Changed

`api/server/routes/projects.js`

### What Was Changed

Added `configMiddleware` to the router-level middleware chain, matching the pattern used in `api/server/routes/files/index.js`.

**Before:**
```js
const requireJwtAuth = require('~/server/middleware/requireJwtAuth');
const db = require('~/models');

const router = express.Router();
router.use(requireJwtAuth);
```

**After:**
```js
const { requireJwtAuth, configMiddleware } = require('~/server/middleware');
const db = require('~/models');

const router = express.Router();
router.use(requireJwtAuth);
router.use(configMiddleware);
```

### Why Router-Level

`configMiddleware` is applied at router level (not just on the upload route) because `req.config` provides app configuration that may benefit other project routes in the future, and this matches the established pattern in the files router.

---

## Fix 1.2: `deleteUserController` deletes user record before resource cleanup

### Problem

In `deleteUserController`, `deleteUserById(user.id)` was called on line 328 (approximately), but 15+ cleanup operations ran AFTER it. If any cleanup failed after the user record was already deleted, those resources would be permanently orphaned with no way to retry cleanup.

Additionally, sequential `await` calls meant any single failure would abort all subsequent cleanup steps (the `deleteConvos` call was wrapped in try/catch, but nothing else was).

Two consistency issues were also identified between the user self-delete path (`deleteUserController`) and the admin cascade path (`deleteUserCascade` in `admin/users.js`):
- **User self-delete was missing:** `deleteConfig(PrincipalType.USER, userId)` -- user config records would be orphaned
- **Admin cascade was missing:** `deleteUserMcpServers(userId)` -- MCP servers solely owned by the user would be orphaned
- **User self-delete `deleteAclEntries` was missing `principalType`** -- the admin cascade correctly passes both `principalType` and `principalId`

### Files Changed

1. `api/server/controllers/UserController.js`
2. `api/server/routes/admin/users.js`

### Changes to `UserController.js`

**Import added:**
```js
// Added PrincipalType to the librechat-data-provider import
const {
  Tools, CacheKeys, Constants, FileSources, ResourceType, PrincipalType,
} = require('librechat-data-provider');
```

**Before (deleteUserController cleanup section):**
```js
await db.deleteMessages({ user: user.id });
await db.deleteAllUserSessions({ userId: user.id });
await db.deleteTransactions({ user: user.id });
await db.deleteUserKey({ userId: user.id, all: true });
await db.deleteBalances({ user: user._id });
await db.deletePresets(user.id);
try {
  await db.deleteConvos(user.id);
} catch (error) {
  logger.error('[deleteUserController] Error deleting user convos, likely no convos', error);
}
await deleteUserPluginAuth(user.id, null, true);
await db.deleteUserById(user.id);          // <-- USER DELETED HERE (too early)
await db.deleteAllSharedLinks(user.id);    // <-- These 15 ops run AFTER deletion
await deleteUserFiles(req);
await db.deleteFiles(null, user.id);
// ... remaining cleanup operations ...
await db.deleteAclEntries({ principalId: user._id });  // <-- missing principalType
```

**After:**
```js
const ops = [
  () => db.deleteMessages({ user: user.id }),
  () => db.deleteAllUserSessions({ userId: user.id }),
  () => db.deleteTransactions({ user: user.id }),
  () => db.deleteUserKey({ userId: user.id, all: true }),
  () => db.deleteBalances({ user: user._id }),
  () => db.deletePresets(user.id),
  () => db.deleteConvos(user.id),
  () => deleteUserPluginAuth(user.id, null, true),
  () => db.deleteAllSharedLinks(user.id),
  () => deleteUserFiles(req),
  () => db.deleteFiles(null, user.id),
  () => db.deleteToolCalls(user.id),
  () => db.deleteUserAgents(user.id),
  () => db.deleteAllAgentApiKeys(user._id),
  () => db.deleteAssistants({ user: user.id }),
  () => db.deleteConversationTags({ user: user.id }),
  () => db.deleteAllUserMemories(user.id),
  () => db.deleteUserPrompts(user.id),
  () => deleteUserMcpServers(user.id),
  () => db.deleteActions({ user: user.id }),
  () => db.deleteTokens({ userId: user.id }),
  () => db.removeUserFromAllGroups(user.id),
  () => db.deleteConfig(PrincipalType.USER, user.id),           // <-- ADDED (was missing)
  () => db.deleteAclEntries({ principalType: PrincipalType.USER, principalId: user._id }), // <-- FIXED: added principalType
];
const results = await Promise.allSettled(ops.map((op) => op()));
for (const r of results) {
  if (r.status === 'rejected') {
    logger.warn('[deleteUserController] cleanup step failed:', r.reason);
  }
}
await db.deleteUserById(user.id);  // <-- NOW LAST, after all cleanup
```

### Changes to `admin/users.js`

**Import added:**
```js
const { deleteUserMcpServers } = require('~/server/controllers/UserController');
```

**Added to `deleteUserCascade` ops array** (between `deleteUserPrompts` and `deleteActions`):
```js
() => deleteUserMcpServers(userId),
```

### Summary of Improvements

| Issue | Before | After |
|---|---|---|
| User record deletion timing | Called mid-cleanup; 15+ ops ran after | Called last, after all cleanup completes |
| Cleanup failure handling | Sequential awaits; one failure aborts the rest | `Promise.allSettled` -- all ops run regardless of individual failures |
| Missing `deleteConfig` (self-delete) | Not called; user config orphaned | Added to cleanup ops |
| Missing `deleteUserMcpServers` (admin) | Not called; MCP servers orphaned | Added to admin cascade ops |
| `deleteAclEntries` filter (self-delete) | Missing `principalType` | Now includes `principalType: PrincipalType.USER` matching admin pattern |
| Failed cleanup logging | Only `deleteConvos` had error handling | All failures logged as warnings |

### Verification Steps

1. Confirmed `configMiddleware` is exported from `~/server/middleware` (used in `api/server/routes/files/index.js`)
2. Confirmed `db.deleteConfig` is available via `createMethods` -> `createConfigMethods` in `packages/data-schemas`
3. Confirmed `deleteUserMcpServers` is exported from `UserController.js` module exports
4. Confirmed `PrincipalType` is available from `librechat-data-provider`
5. Verified both deletion paths (self-delete and admin cascade) now have consistent cleanup operations
6. Verified `deleteUserById` is the final operation in both paths (admin cascade calls it via `createAdminUsersHandlers` after `deleteUserCascade` returns)
