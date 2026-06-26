# Audit Summary

**Date:** 2026-04-04
**Branch:** feat/projects

---

## Findings by Severity

| Severity | Count | Source |
|----------|-------|--------|
| CRITICAL | 2 | Bugs report (null deref in helpers.js, missing configMiddleware in projects.js) |
| HIGH | 5 | Bugs report (EventEmitter mutation, delete ordering, sendError override, req.file_id, agents run variable) |
| MEDIUM | 8 | Bugs/improvements (CORS, sequential deletes, memory update, duplications, structural) |
| LOW | 5 | Bugs/improvements (dead code paths, inconsistent null guards, smells) |
| Dead code | 16 | Dead code report (3 unused files, 8 unused exports, 3 vestigial, 2 unused deps) |
| Improvements | 14 | Improvements report (5 duplications, 2 shared code, 3 structural, 4 modernization) |
| Testing gaps | 4 | Improvements report (assistant controllers, routes, skipped tests, bug in error handler) |

---

## Changes Executed

### Batch 1: Safe Fixes
| Change | LOC Removed | Files Touched |
|--------|-------------|---------------|
| Remove 8 unused exports (keyword only) | 0 | 5 files |
| Delete `essentialShadcnComponents` constant | 15 | 1 file |
| Delete `googleGenConfigSchema` schema | 20 | 1 file |
| Delete `setAcceptLanguageHeader` function | 3 | 1 file |
| Delete `cleanup.js` (unused file) | 14 | 1 file deleted |
| Delete react-query module (unused files) | 570 | 2 files deleted, 1 dir removed |
| Remove commented-out code (index.ts, CustomFormContext) | 4 | 2 files |
| Rename `initalize.js` -> `initialize.js` + update imports | 0 | 3 files |

### Batch 2: Bug Fixes
| Change | Impact | Files Touched |
|--------|--------|---------------|
| Fix null dereference in `getCurrentVersion` (optional chaining) | Prevents TypeError crash on assistants API | 1 file |
| Remove dead `run` variable block + unused import | Removes always-failing code path | 1 file |

### Totals
| Metric | Value |
|--------|-------|
| **Files modified** | 14 |
| **Files deleted** | 3 |
| **Files renamed** | 1 |
| **LOC removed** | ~637 |
| **Bugs fixed** | 2 |
| **Unused exports cleaned** | 8 |
| **Commented-out code removed** | 4 blocks |

---

## Remaining Items for Human Review

### Critical (should fix soon)
1. **Missing `configMiddleware` in project file upload route** (`api/server/routes/projects.js:225`) -- All project file uploads will crash. This is on the active `feat/projects` branch and needs testing. (Batch 3 item 3.6)
2. **`deleteUserController` deletes user before cleanup** (`api/server/controllers/UserController.js:327`) -- User deletion can orphan resources. Recommend moving `deleteUserById` to last and using `Promise.allSettled`. (Batch 3 item 3.5)

### High Priority Refactors
3. **Unify chatV1/chatV2 assistant controllers** -- ~450 lines of duplicated code. (Batch 3 item 3.1)
4. **Consolidate error handlers** (3 copies across assistants/agents). (Batch 3 item 3.2)
5. **Add test coverage for assistant controllers** -- Zero tests for 2,361 lines of critical code. (Improvements report)

### Medium Priority
6. **Create `asyncHandler` wrapper** -- Eliminate 85+ try/catch boilerplate blocks across 20+ routes. (Batch 3 item 3.4)
7. **Replace `Record<string, unknown>`** -- 148 occurrences violating project type-safety standards. (Improvements report)
8. **Fix `Access-Control-Allow-Origin` wildcard fallback** in SSE headers. (Bugs report)
9. **Memory update route** deletes before recreating, risking data loss. (Bugs report)
10. **Global `EventEmitter.defaultMaxListeners = 100`** masks leak warnings. (Bugs report)

### Low Priority
11. Review 22+ TODO/FIXME comments for resolution or issue tracking.
12. Replace 45 `@ts-ignore` with `@ts-expect-error` + explanatory comments.
13. Review `regenerator-runtime` and `mammoth` dependency redundancy.
14. 5 skipped tests that may hide regressions.
