# Execution Plan

**Agent:** 5 (SURGEON)
**Date:** 2026-04-04

---

## Batch 1: Safe Fixes (Dead Code, Unused Exports, Formatting)

### 1.1 Remove unused `export` keywords (keep functions used internally)

| # | File | Export to Remove | Risk | Rollback |
|---|------|-----------------|------|----------|
| 1 | `packages/data-provider/src/parsers.ts:118` | `export` on `getFirstDefinedValue` | None -- used internally | Restore `export` keyword |
| 2 | `packages/data-provider/src/feedback.ts:32` | `export` on `FEEDBACK_TAGS` | None -- used internally | Restore `export` keyword |
| 3 | `packages/data-provider/src/feedback.ts:107-108` | `export` on `feedbackTagKeySchema` and `feedbackRatingSchema` | None -- used in same file only | Restore `export` keyword |
| 4 | `packages/data-provider/src/config.ts:92` | `export` on `getSchemaDefaults` | None -- used internally | Restore `export` keyword |
| 5 | `packages/data-provider/src/accessPermissions.ts:308,318` | `export` on `permBitsToAccessLevel` and `accessRoleToPermBits` | None -- zero external imports | Restore `export` keyword |

### 1.2 Remove unused exported constants/schemas

| # | File | What | Risk | Rollback |
|---|------|------|------|----------|
| 6 | `packages/data-provider/src/artifacts.ts:3090-3104` | `essentialShadcnComponents` export | Low -- zero imports | Restore block |
| 7 | `packages/data-provider/src/schemas.ts:1018-1037` | `googleGenConfigSchema` export | Low -- zero imports | Restore block |
| 8 | `packages/data-provider/src/headers-helpers.ts:3-5` | `setAcceptLanguageHeader` export | Low -- zero imports | Restore function |

### 1.3 Remove unused files

| # | File | LOC | Risk | Rollback |
|---|------|-----|------|----------|
| 9 | `api/server/services/cleanup.js` | 14 | None -- zero imports | `git checkout` |
| 10 | `packages/data-provider/src/react-query/react-query-service.ts` | 569 | None -- only ref is commented-out | `git checkout` |
| 11 | `packages/data-provider/src/react-query/index.ts` | 1 | None -- barrel for above | `git checkout` |

**NOT removing** `api/server/experimental.js` -- it is referenced by `package.json` script `backend:experimental`.

### 1.4 Remove commented-out code and vestigial references

| # | File | What | Risk | Rollback |
|---|------|------|------|----------|
| 12 | `packages/data-provider/src/index.ts:47-48` | Commented-out react-query export lines | None | Restore lines |
| 13 | `client/src/Providers/CustomFormContext.tsx:4,16` | Commented-out `FieldErrors` import and interface property | None | Restore lines |

### 1.5 Fix misspelled filename

| # | File | What | Risk | Rollback |
|---|------|------|------|----------|
| 14 | `api/server/services/Endpoints/assistants/initalize.js` | Rename to `initialize.js` | Low -- 2 imports to update | `git mv` back |
| 14a | `api/server/services/Endpoints/assistants/index.js` | Update import path | Low | Restore old path |
| 14b | `api/server/services/Endpoints/assistants/title.js` | Update import path | Low | Restore old path |

---

## Batch 2: Bug Fixes

### 2.1 Null dereference in `getCurrentVersion`

| # | File | What | Risk | Rollback |
|---|------|------|------|----------|
| 15 | `api/server/controllers/assistants/helpers.js:29` | Add optional chaining on `version.length` | Low -- purely defensive | Revert line |

### 2.2 Unassigned `run` variable in agents error handler

| # | File | What | Risk | Rollback |
|---|------|------|------|----------|
| 16 | `api/server/controllers/agents/errors.js:114-124` | Remove dead `recordUsage` block that dereferences unassigned `run` | Low -- code was always broken | Restore block |

---

## Batch 3: Refactors (PLAN ONLY -- do not execute)

### 3.1 Unify chatV1/chatV2 assistant controllers
- Extract shared `checkBalanceBeforeRun` function
- Migrate chatV1 to use `createErrorHandler` from `errors.js`
- Extract common orchestration flow
- **Files:** `chatV1.js`, `chatV2.js`, new shared module
- **LOC impact:** +80 / -450
- **Effort:** 4hr+

### 3.2 Consolidate error handlers (assistants + agents)
- Merge `agents/errors.js` into `assistants/errors.js` with optional params
- **Files:** `agents/errors.js`, `assistants/errors.js`, `chatV1.js`
- **LOC impact:** +20 / -270
- **Effort:** 1-2hr

### 3.3 Extract shared avatar upload utility
- Create `uploadEntityAvatar` with entity-specific callbacks
- **Files:** `files/avatar.js`, `assistants/v1.js`, `agents/v1.js`
- **LOC impact:** +60 / -150
- **Effort:** 1-2hr

### 3.4 Create `asyncHandler` wrapper for route error handling
- Replace 85+ try/catch blocks across 20+ route files
- Standardize error response shape
- **Files:** 20+ route files, new middleware
- **LOC impact:** +15 / -300
- **Effort:** 2-4hr

### 3.5 Fix user deletion ordering in `deleteUserController`
- Move `deleteUserById` to last operation
- Consider `Promise.allSettled` for parallel execution
- **Files:** `api/server/controllers/UserController.js`
- **LOC impact:** +10 / -5
- **Effort:** 1hr

### 3.6 Add `configMiddleware` to project file upload route
- Fix the CRITICAL missing `req.config` bug
- **Files:** `api/server/routes/projects.js`
- **Effort:** <1hr
- **Note:** This is CRITICAL but touches active feature branch code; needs careful testing

### 3.7 Replace `Record<string, unknown>` with explicit types in data-schemas
- 148 occurrences across 20 files
- **Effort:** 4hr+

### 3.8 Add test coverage for assistant controllers
- Zero tests currently for critical code paths
- **Effort:** 4hr+
