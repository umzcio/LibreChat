# Changes Made Log

**Agent:** 5 (SURGEON)
**Date:** 2026-04-04

---

## Batch 1: Safe Fixes

### 1. Removed unused `export` keyword from `getFirstDefinedValue`
- **File:** `packages/data-provider/src/parsers.ts:118`
- **What:** Removed `export` keyword; function is used internally by `parseConvo` and `parseCompactConvo` in the same file
- **Why:** Zero external imports

### 2. Removed unused `export` keyword from `FEEDBACK_TAGS`
- **File:** `packages/data-provider/src/feedback.ts:32`
- **What:** Removed `export` keyword; constant is used internally by `getTagsForRating` and `getTagByKey` in the same file
- **Why:** Zero external imports

### 3. Removed unused `export` keywords from `feedbackTagKeySchema` and `feedbackRatingSchema`
- **File:** `packages/data-provider/src/feedback.ts:107-108`
- **What:** Removed `export` from both; used internally by `feedbackSchema` in the same file
- **Why:** Zero external imports

### 4. Removed unused `export` keyword from `getSchemaDefaults`
- **File:** `packages/data-provider/src/config.ts:92`
- **What:** Removed `export` keyword; function is called internally by `getConfigDefaults` on line 1112
- **Why:** Zero external imports

### 5. Removed unused `export` keywords from `permBitsToAccessLevel` and `accessRoleToPermBits`
- **File:** `packages/data-provider/src/accessPermissions.ts:308,318`
- **What:** Removed `export` from both utility functions
- **Why:** Zero imports (internal or external); scaffolded for future use

### 6. Removed unused `essentialShadcnComponents` export
- **File:** `packages/data-provider/src/artifacts.ts:3090-3104`
- **What:** Deleted the entire 15-line constant (never referenced anywhere)
- **Why:** Zero imports; `shadcnComponents` (the full set) is what's actually used

### 7. Removed unused `googleGenConfigSchema` export
- **File:** `packages/data-provider/src/schemas.ts:1018-1037`
- **What:** Deleted the entire 20-line Zod schema (never referenced anywhere)
- **Why:** Zero imports; completely dead code

### 8. Removed unused `setAcceptLanguageHeader` export
- **File:** `packages/data-provider/src/headers-helpers.ts:3-5`
- **What:** Deleted the entire function (never referenced anywhere)
- **Why:** Zero imports; companion `setTokenHeader` is widely used

### 9. Deleted unused file `api/server/services/cleanup.js`
- **What:** Removed 14-line file containing `cleanup()` function that calls `deleteNullOrEmptyConversations`
- **Why:** Zero imports/requires anywhere in codebase; verified via grep

### 10. Deleted unused react-query module files
- **Files:** `packages/data-provider/src/react-query/react-query-service.ts` (569 lines), `packages/data-provider/src/react-query/index.ts` (1 line), and empty `react-query/` directory
- **What:** Removed entire unused module and directory
- **Why:** Only reference was a commented-out export in `index.ts`; client has its own react-query hooks

### 11. Removed commented-out react-query export lines
- **File:** `packages/data-provider/src/index.ts:47-48`
- **What:** Removed 2 commented-out lines: `// /* react query hooks */` and `// export * from './react-query/react-query-service';`
- **Why:** Vestigial reference to deleted module

### 12. Removed commented-out `FieldErrors` references
- **File:** `client/src/Providers/CustomFormContext.tsx:4,16`
- **What:** Removed `// FieldErrors,` from import and `// errors: FieldErrors<TFieldValues>;` from interface
- **Why:** Vestigial commented-out code

### 13. Renamed misspelled file `initalize.js` to `initialize.js`
- **File:** `api/server/services/Endpoints/assistants/initalize.js` -> `initialize.js`
- **What:** Fixed typo in filename (missing second 'i' in "initialize")
- **Also updated imports in:**
  - `api/server/services/Endpoints/assistants/index.js` (line 3)
  - `api/server/services/Endpoints/assistants/title.js` (line 5)

---

## Batch 2: Bug Fixes

### 14. Fixed null dereference in `getCurrentVersion`
- **File:** `api/server/controllers/assistants/helpers.js:29`
- **What:** Changed `version.length !== 2` to `version?.length !== 2` (added optional chaining)
- **Why:** When `version` is null (URL parsing fails, no body version, no endpoint config), `version.length` throws `TypeError: Cannot read properties of null`. With optional chaining, it correctly evaluates to `undefined !== 2` (true), which proceeds to throw the intended validation `Error` instead of an unhandled `TypeError`.
- **Before:** `if (!version?.startsWith('v') && version.length !== 2) {`
- **After:** `if (!version?.startsWith('v') && version?.length !== 2) {`

### 15. Removed dead `recordUsage` block with unassigned `run` variable
- **File:** `api/server/controllers/agents/errors.js:114-124`
- **What:** Removed 10-line block that declared `let run;` then accessed `run.usage` and `run.model`, which always throws `TypeError`. Also removed the now-unused `recordUsage` import from `~/server/services/Threads`.
- **Why:** `run` was never assigned a value. The try/catch silently swallowed the TypeError, making this pure dead code that wasted execution time. The assistants version correctly calls `openai.beta.threads.runs.retrieve()` to populate `run`, but agents have no equivalent.
- **Lines removed:** 10 (code block) + 1 (import) = 11

---

## Files Modified (16 total)

| File | Change Type |
|------|------------|
| `packages/data-provider/src/parsers.ts` | Remove unused export |
| `packages/data-provider/src/feedback.ts` | Remove unused exports (3) |
| `packages/data-provider/src/config.ts` | Remove unused export |
| `packages/data-provider/src/accessPermissions.ts` | Remove unused exports (2) |
| `packages/data-provider/src/artifacts.ts` | Delete unused constant |
| `packages/data-provider/src/schemas.ts` | Delete unused schema |
| `packages/data-provider/src/headers-helpers.ts` | Delete unused function |
| `packages/data-provider/src/index.ts` | Remove commented-out lines |
| `client/src/Providers/CustomFormContext.tsx` | Remove commented-out code |
| `api/server/services/Endpoints/assistants/initialize.js` | Renamed from `initalize.js` |
| `api/server/services/Endpoints/assistants/index.js` | Update import path |
| `api/server/services/Endpoints/assistants/title.js` | Update import path |
| `api/server/controllers/assistants/helpers.js` | Fix null dereference |
| `api/server/controllers/agents/errors.js` | Remove dead code block + unused import |

## Files Deleted (3 total)

| File | LOC |
|------|-----|
| `api/server/services/cleanup.js` | 14 |
| `packages/data-provider/src/react-query/react-query-service.ts` | 569 |
| `packages/data-provider/src/react-query/index.ts` | 1 |

## Note

Linting could not be run due to shell permission restrictions. Manual linting verification is recommended:
```bash
cd /projects/LibreEco/LibreChat && npx eslint --no-error-on-unmatched-pattern [changed files listed above]
```
