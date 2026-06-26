# Audit Report: Bugs, Anti-Patterns, and Code Smells

Generated: 2026-04-04

---

### [CRITICAL] Null dereference in `getCurrentVersion` when `version` is null

- **File:** `api/server/controllers/assistants/helpers.js`
- **Lines:** 19-33
- **Category:** bug
- **Description:** The `getCurrentVersion` function can crash with a `TypeError: Cannot read properties of null (reading 'length')` when `version` is `null`. The three assignment branches (URL parsing, `req.body.version`, endpoint config) can all fail to assign a value, leaving `version` as `null`. The validation on line 29 uses optional chaining for `startsWith` (`!version?.startsWith('v')`) which correctly evaluates to `true` when `version` is `null`, but the second condition `version.length !== 2` accesses `.length` on `null` without optional chaining, causing a crash.
- **Evidence:**
  ```js
  // Line 21: version starts as null
  let version = index !== -1 ? req.baseUrl.substring(index + 1, index + 3) : null;
  // Lines 22-28: both fallback branches can leave version as null
  // Line 29: BUG - version.length throws on null
  if (!version?.startsWith('v') && version.length !== 2) {
    throw new Error(`[${req.baseUrl}] Invalid version: ${version}`);
  }
  ```
- **Risk:** Any assistants API request where the version cannot be resolved from the URL, body, or config will crash the server with an unhandled `TypeError` instead of throwing the intended validation error. This affects all assistant listing, creation, and chat operations.
- **Suggested fix:** Add optional chaining: `version?.length !== 2`, or better yet, check `!version` first as an early guard before the format validation.

---

### [CRITICAL] Missing `req.config` in project file upload route causes crash in multer storage

- **File:** `api/server/routes/projects.js`
- **Lines:** 225-239
- **Category:** bug
- **Description:** The project file upload route (`POST /api/projects/:projectId/files`) uses `createMulterInstance()` which relies on the shared `multer.diskStorage` configuration. The storage's `destination` callback accesses `req.config.paths.uploads` (defined in `api/server/routes/files/multer.js`, line 16). However, unlike the main file upload routes (which use `configMiddleware` to populate `req.config`), the projects route does NOT apply `configMiddleware`. When multer's storage callback runs, `req.config` is `undefined`, causing `TypeError: Cannot read properties of undefined (reading 'paths')`.
- **Evidence:**
  ```js
  // multer.js line 14-18 (storage destination)
  destination: function (req, file, cb) {
    const appConfig = req.config; // undefined for /api/projects routes
    const outputPath = path.join(appConfig.paths.uploads, 'temp', req.user.id); // CRASH
    ...
  }

  // projects.js line 225 - no configMiddleware in chain
  router.post('/:projectId/files', async (req, res, next) => {
    const upload = await createMulterInstance();
    upload.single('file')(req, res, (err) => { ... });
  }, async (req, res) => { ... });
  ```
  Compare with `api/server/routes/files/index.js` lines 20-21 which properly applies `configMiddleware`:
  ```js
  router.use(requireJwtAuth);
  router.use(configMiddleware);
  ```
- **Risk:** All project file uploads will fail with a server crash. This is a complete blocker for the project knowledge base feature.
- **Suggested fix:** Add `configMiddleware` to the project file upload route middleware chain, either at the router level or specifically on the upload handler.

---

### [HIGH] Global `EventEmitter.defaultMaxListeners` mutation affects entire process

- **File:** `api/server/controllers/agents/client.js`
- **Lines:** 1
- **Category:** anti-pattern
- **Description:** The file sets `require('events').EventEmitter.defaultMaxListeners = 100` at module top level. This is a global side effect that changes the max listeners limit for ALL EventEmitter instances in the entire Node.js process, not just agent-related ones. This masks genuine memory leak warnings from other subsystems (HTTP servers, database connections, stream handlers) that legitimately have listener leaks.
- **Evidence:**
  ```js
  require('events').EventEmitter.defaultMaxListeners = 100;
  ```
- **Risk:** Genuine memory leaks from listener accumulation elsewhere in the application will be silently suppressed. If the agent client is the source of excess listeners, the root cause should be fixed rather than raising the global limit.
- **Suggested fix:** Use `emitter.setMaxListeners(100)` on the specific emitter instance(s) that need a higher limit, or investigate why agent runs create so many listeners and fix the root cause.

---

### [HIGH] `deleteUserController` deletes user record before cleaning up user-owned resources

- **File:** `api/server/controllers/UserController.js`
- **Lines:** 295-349
- **Category:** bug
- **Description:** In `deleteUserController`, `db.deleteUserById(user.id)` is called on line 327, but several cleanup operations that depend on the user record still existing run AFTER the user is deleted (lines 328-342): `deleteAllSharedLinks`, `deleteUserFiles`, `deleteFiles`, `deleteToolCalls`, `deleteUserAgents`, `deleteAllAgentApiKeys`, `deleteAssistants`, `deleteConversationTags`, `deleteAllUserMemories`, `deleteUserPrompts`, `deleteUserMcpServers`, `deleteActions`, `deleteTokens`, `removeUserFromAllGroups`, `deleteAclEntries`. If any of these operations query the user record (e.g., for ownership verification), they will fail silently. Additionally, if any operation after `deleteUserById` throws an error, the user record is already gone but resources remain orphaned.
- **Evidence:**
  ```js
  await deleteUserPluginAuth(user.id, null, true);
  await db.deleteUserById(user.id);       // <-- User deleted HERE
  await db.deleteAllSharedLinks(user.id);  // Runs after user is gone
  await deleteUserFiles(req);              // Runs after user is gone
  await db.deleteFiles(null, user.id);     // ...etc
  // ... 10+ more cleanup operations
  ```
  Compare with the admin cascade (`api/server/routes/admin/users.js` lines 16-47) which uses `Promise.allSettled` and deletes the user AFTER all cleanup.
- **Risk:** If any post-delete cleanup step throws, the user is already deleted but their data remains orphaned in the database. Resources that need the user record for authorization checks may fail during cleanup.
- **Suggested fix:** Move `db.deleteUserById` to be the LAST operation in the cascade, after all resource cleanup. Consider using `Promise.allSettled` like the admin cascade does to ensure all cleanup steps execute even if some fail.

---

### [HIGH] `sendError` dead code path due to `...rest` spread overriding `error: true`

- **File:** `api/server/middleware/error.js`
- **Lines:** 33-44, 63-81
- **Category:** bug
- **Description:** The `sendError` function constructs `errorMessage` with `error: true` hardcoded on line 39, but immediately after applies `...rest` on line 43 which can override ANY field, including `error`. The code on lines 63-81 checks `if (!errorMessage.error)` -- this path is only reachable when a caller explicitly passes `error: false` in the options. While this does work for the abort middleware (line 249 of `abortMiddleware.js`), the construction is fragile: the `shouldSaveMessage` check on line 49 runs BEFORE the `error` check, meaning when `error: false` is passed with `shouldSaveMessage: true`, the message will be saved and THEN the non-error event path also triggers, potentially sending conflicting responses.
- **Evidence:**
  ```js
  const errorMessage = {
    // ...
    error: true,     // Line 39 - hardcoded
    // ...
    ...rest,          // Line 43 - can override error: true with error: false
  };

  if (shouldSaveMessage) {   // Line 49 - saves message regardless of error flag
    await saveMessage(...);
  }

  if (!errorMessage.error) { // Line 63 - unreachable UNLESS rest contains error: false
    // ... send event
  }

  handleError(res, errorMessage); // Line 83 - ALSO runs when error: false
  ```
  When `error: false` is set, line 63's `if` branch returns with `sendEvent`, so line 83 is skipped (correct). But the pattern is confusing and error-prone.
- **Risk:** A maintenance change that removes the `...rest` spread or reorders fields would silently break the abort middleware's partial-text flow, making aborted messages appear as errors instead of partial responses.
- **Suggested fix:** Make the `error` field explicitly configurable rather than relying on spread override. Accept `error` as a named parameter in the options destructuring (line 23) with a default of `true`.

---

### [HIGH] `req.file_id` undefined in project file upload creates records with null file_id

- **File:** `api/server/routes/projects.js`
- **Lines:** 277, 289
- **Category:** bug
- **Description:** The project file upload route uses `req.file_id` in two places: when calling `uploadVectors` (line 277) and when creating the file database record (line 289). The `req.file_id` is set by multer's `filename` callback in the shared storage configuration. However, since the `configMiddleware` is missing (see separate finding), the multer storage's `destination` function will crash before `filename` runs -- but even if that were fixed, the `req.file_id` assignment depends on multer's internal disk storage flow completing successfully.
- **Evidence:**
  ```js
  // Line 274-278: req.file_id used for vector upload
  await uploadVectors({
    req,
    file: req.file,
    file_id: req.file_id,   // could be undefined
  });

  // Line 286-302: req.file_id used for DB record
  const fileDoc = await db.createFile({
    user: req.user._id || req.user.id,
    file_id: req.file_id,   // could be undefined
    ...
  });
  ```
- **Risk:** If the multer `filename` callback doesn't run (storage error, custom memory storage, etc.), file records are created with `undefined` as the `file_id`, making them impossible to reference or delete later.
- **Suggested fix:** Generate a fallback `file_id` using `crypto.randomUUID()` at the start of the handler if `req.file_id` is not set.

---

### [MEDIUM] Synchronous file read blocks event loop in project file upload handler

- **File:** `api/server/routes/projects.js`
- **Lines:** 263
- **Category:** anti-pattern
- **Description:** The project file upload handler uses `fs.readFileSync` to read uploaded files for text extraction. This is a synchronous I/O operation that blocks the Node.js event loop for the duration of the read. For large files, this can block all other requests from being processed.
- **Evidence:**
  ```js
  text = fs.readFileSync(filepath, 'utf-8');
  ```
- **Risk:** Large file uploads (e.g., multi-MB JSON or CSV files) will block the event loop, causing latency spikes for all concurrent users. In a production environment with multiple simultaneous uploads, this could cause request timeouts.
- **Suggested fix:** Replace with `await fs.promises.readFile(filepath, 'utf-8')`.

---

### [MEDIUM] `deleteUserController` sequential await cascade is unnecessarily slow

- **File:** `api/server/controllers/UserController.js`
- **Lines:** 315-342
- **Category:** anti-pattern
- **Description:** The `deleteUserController` function performs 20+ sequential `await` calls to delete user resources, each waiting for the previous to complete. These operations are independent and could run concurrently. The admin version of the same logic (`api/server/routes/admin/users.js`, lines 16-47) correctly uses `Promise.allSettled` for parallel execution.
- **Evidence:**
  ```js
  // Each line blocks until the previous completes
  await db.deleteMessages({ user: user.id });
  await db.deleteAllUserSessions({ userId: user.id });
  await db.deleteTransactions({ user: user.id });
  await db.deleteUserKey({ userId: user.id, all: true });
  await db.deleteBalances({ user: user._id });
  // ... 15+ more sequential awaits
  ```
  vs. admin cascade:
  ```js
  const results = await Promise.allSettled(ops.map((op) => op()));
  ```
- **Risk:** User account deletion takes significantly longer than necessary, potentially timing out HTTP requests. Each database operation adds round-trip latency.
- **Suggested fix:** Use `Promise.allSettled` to run independent cleanup operations concurrently, similar to the admin cascade pattern.

---

### [MEDIUM] `Access-Control-Allow-Origin` header allows request origin fallback to wildcard

- **File:** `api/server/middleware/setHeaders.js`
- **Lines:** 1-10
- **Category:** bug
- **Description:** The SSE `setHeaders` middleware sets `Access-Control-Allow-Origin` to `req.headers.origin || process.env.DOMAIN_CLIENT || '*'`. If neither the request's `Origin` header nor the `DOMAIN_CLIENT` environment variable is set, it falls back to `'*'`. Combined with cookie-based authentication, this creates a CORS misconfiguration -- browsers will NOT send cookies with `Access-Control-Allow-Origin: *`, but if credentials are not required for SSE connections, this opens the endpoint to cross-origin requests from any domain.
- **Evidence:**
  ```js
  function setHeaders(req, res, next) {
    res.writeHead(200, {
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Access-Control-Allow-Origin': req.headers.origin || process.env.DOMAIN_CLIENT || '*',
      'X-Accel-Buffering': 'no',
    });
    next();
  }
  ```
- **Risk:** If `DOMAIN_CLIENT` is not configured, SSE endpoints are open to cross-origin requests. When reflecting `req.headers.origin` without validation, any origin that can reach the server gets CORS access. The `Access-Control-Allow-Credentials` header is not set here, which mitigates credential-based attacks, but data exfiltration from unauthenticated SSE streams remains possible.
- **Suggested fix:** Validate `req.headers.origin` against a whitelist (e.g., `DOMAIN_CLIENT`) before reflecting it. Never fall back to `'*'` in production.

---

### [MEDIUM] Duplicate code between `deleteUserController` and `deleteUserCascade`

- **File:** `api/server/controllers/UserController.js` (lines 295-349) and `api/server/routes/admin/users.js` (lines 16-47)
- **Lines:** N/A (cross-file)
- **Category:** anti-pattern
- **Description:** Two independent implementations of user resource deletion exist. The user self-deletion controller (`deleteUserController`) and the admin cascade (`deleteUserCascade`) perform nearly identical cleanup operations but with different ordering, different error handling, and different sets of resources cleaned. The admin cascade is missing `deleteUserMcpServers`, and the user cascade is missing `deleteConfig`.
- **Evidence:**
  User controller (sequential):
  ```js
  await db.deleteMessages({ user: user.id });
  await db.deleteAllUserSessions({ userId: user.id });
  // ... deleteUserMcpServers included
  // ... deleteConfig NOT included
  ```
  Admin cascade (parallel):
  ```js
  () => db.deleteMessages({ user: userId }),
  () => db.deleteAllUserSessions({ userId }),
  // ... deleteUserMcpServers NOT included
  // ... deleteConfig included
  ```
- **Risk:** When resources are added in the future, developers must remember to update both deletion paths. The divergence has already produced inconsistencies (missing `deleteUserMcpServers` in admin, missing `deleteConfig` in user self-delete).
- **Suggested fix:** Extract a shared `cleanupUserResources(userId, userObjectId)` function that both paths can call, ensuring consistent resource cleanup.

---

### [MEDIUM] Memory update route `PATCH /memories/:key` deletes before recreating -- data loss on failure

- **File:** `api/server/routes/memories.js`
- **Lines:** 131-160
- **Category:** bug
- **Description:** The memory update route first deletes the existing memory, then creates a new one. If the `addMemories` call fails after the delete succeeds, the original memory is permanently lost with no recovery path.
- **Evidence:**
  ```js
  router.patch('/:key', memoryPayloadLimit, checkMemoryUpdate, async (req, res) => {
    // ...
    try {
      await mem0.deleteMemory(memoryId);     // Step 1: DELETE (irreversible)
      const result = await mem0.addMemories(  // Step 2: CREATE (can fail)
        [{ role: 'user', content: value.trim() }],
        req.user.id,
      );
      // ...
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  ```
- **Risk:** Network errors, Mem0 service outages, or rate limits during the `addMemories` call will result in silent data loss. The user receives a 500 error with no indication that their original memory was already deleted.
- **Suggested fix:** Create the new memory first, then delete the old one only after successful creation. Alternatively, use Mem0's native update API if available.

---

### [LOW] Dead code: `sendError` check on line 63 is unreachable in normal error flows

- **File:** `api/server/middleware/error.js`
- **Lines:** 63-81
- **Category:** smell
- **Description:** The `if (!errorMessage.error)` block on line 63 is only reachable when a caller explicitly passes `error: false` in the options `rest` parameter, overriding the hardcoded `error: true` on line 39. This currently only happens in the abort middleware's partial text path. The code is misleading because it appears to handle a "non-error" case within a function named `sendError`.
- **Evidence:**
  ```js
  const errorMessage = {
    error: true,    // hardcoded
    ...rest,         // can override
  };
  // ...
  if (!errorMessage.error) {  // only reachable if rest includes error: false
  ```
- **Risk:** Low -- the code works correctly but is confusing for maintainers. The function's name and the hardcoded `error: true` suggest the `!errorMessage.error` branch should never execute.
- **Suggested fix:** Document the `error: false` override behavior with a comment, or refactor `sendError` to accept `error` as an explicit named parameter.

---

### [LOW] `getUserController` does not handle the case where `req.user` is undefined

- **File:** `api/server/controllers/UserController.js`
- **Lines:** 28-54
- **Category:** smell
- **Description:** `getUserController` accesses `req.user.toObject` on line 31 and `req.user?.role` on line 29. The inconsistent use of optional chaining (`?.` on line 29 but direct access on line 31) suggests incomplete null guarding. If JWT auth middleware fails to populate `req.user`, line 31 will throw `TypeError: Cannot read properties of undefined`.
- **Evidence:**
  ```js
  const getUserController = async (req, res) => {
    const appConfig = await getAppConfig({ role: req.user?.role, tenantId: req.user?.tenantId });
    const userData = req.user.toObject != null ? req.user.toObject() : { ...req.user };
    //                 ^-- no optional chaining, will crash if req.user is undefined
  ```
- **Risk:** Low in practice since JWT middleware should always populate `req.user`, but defensive coding would prevent crashes if middleware ordering changes.
- **Suggested fix:** Add an early guard `if (!req.user) return res.status(401).json(...)` or use consistent optional chaining.

---

### [LOW] `AgentClient` constructor sets `maxContextTokens` globally from options, bypasses property protection

- **File:** `api/server/controllers/agents/client.js`
- **Lines:** 64-109
- **Category:** smell
- **Description:** The `AgentClient` constructor destructures `maxContextTokens` from options but also assigns ALL remaining options via `this.options = Object.assign(...)`. The explicit `this.maxContextTokens = maxContextTokens` on line 86 means the property is shadowed and won't be updated if `this.options` is later mutated. The separation between "explicit properties" and "the options bag" is inconsistent across the class.
- **Evidence:**
  ```js
  const {
    agentConfigs,
    contentParts,
    collectedUsage,
    artifactPromises,
    maxContextTokens,
    ...clientOptions
  } = options;

  this.maxContextTokens = maxContextTokens;
  this.options = Object.assign({ endpoint: options.endpoint }, clientOptions);
  ```
- **Risk:** Low -- a maintenance change that expects `this.options.maxContextTokens` to exist will find it undefined since it was destructured away.
- **Suggested fix:** Document which properties live on `this` vs `this.options`, or consolidate the pattern.
