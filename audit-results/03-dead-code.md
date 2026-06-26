# Dead Code Audit Report

**Agent:** 3 (NECROMANCER)
**Date:** 2026-04-04
**Scope:** `/api`, `/client/src`, `/packages/api/src`, `/packages/data-provider/src`, `/packages/data-schemas/src`, `/packages/client/src`

---

## Unused Files

### [UNUSED-FILE-1] Unused react-query module in data-provider

- **File(s):** `packages/data-provider/src/react-query/react-query-service.ts` (entire file, 569 lines), `packages/data-provider/src/react-query/index.ts` (entire file, 1 line)
- **Type:** unused-file
- **Evidence:** The only reference is a commented-out export in `packages/data-provider/src/index.ts` (line 48: `// export * from './react-query/react-query-service';`). No file in the project imports from this module. The client has its own react-query hooks in `client/src/data-provider/`.
- **Confidence:** high
- **Recommendation:** remove
- **Estimated LOC removed:** 570

### [UNUSED-FILE-2] Experimental server entry point never imported

- **File(s):** `api/server/experimental.js` (entire file, 443 lines)
- **Type:** unused-file
- **Evidence:** Zero imports/requires of this file found in the codebase. It is an alternative Express server bootstrap with cluster/Redis support that is never referenced by any script, Dockerfile, or entry point.
- **Confidence:** high
- **Recommendation:** review-then-remove (confirm no external tooling references it, e.g. Docker Compose or scripts not in repo)
- **Estimated LOC removed:** 443

### [UNUSED-FILE-3] Unused cleanup service

- **File(s):** `api/server/services/cleanup.js` (entire file, 14 lines)
- **Type:** unused-file
- **Evidence:** Zero imports/requires of `services/cleanup` found anywhere in the codebase. The `cleanup` function (which calls `deleteNullOrEmptyConversations`) is never invoked.
- **Confidence:** high
- **Recommendation:** remove
- **Estimated LOC removed:** 14

---

## Unused Exports

### [UNUSED-EXPORT-1] `getFirstDefinedValue` in parsers.ts

- **File(s):** `packages/data-provider/src/parsers.ts` (line 118)
- **Type:** unused-export
- **Evidence:** Used internally within `parsers.ts` by `parseConvo` and `parseCompactConvo`, but never imported by any other file in the codebase. The `export` keyword is dead; the function value is used internally.
- **Confidence:** medium
- **Recommendation:** review-then-remove (remove `export` keyword only)
- **Estimated LOC removed:** 0 (just remove `export`)

### [UNUSED-EXPORT-2] `setAcceptLanguageHeader` in headers-helpers.ts

- **File(s):** `packages/data-provider/src/headers-helpers.ts` (line 3)
- **Type:** unused-export
- **Evidence:** Zero imports found outside this file. The companion `setTokenHeader` from the same file is widely used; `setAcceptLanguageHeader` is not.
- **Confidence:** high
- **Recommendation:** remove
- **Estimated LOC removed:** 3

### [UNUSED-EXPORT-3] `essentialShadcnComponents` in artifacts.ts

- **File(s):** `packages/data-provider/src/artifacts.ts` (lines 3090-3104)
- **Type:** unused-export
- **Evidence:** Only reference is its definition. The full `shadcnComponents` object (line 3048) is used by `client/src/utils/artifacts.ts`, but `essentialShadcnComponents` is never imported anywhere.
- **Confidence:** high
- **Recommendation:** remove
- **Estimated LOC removed:** 15

### [UNUSED-EXPORT-4] `googleGenConfigSchema` in schemas.ts

- **File(s):** `packages/data-provider/src/schemas.ts` (lines 1018-1037)
- **Type:** unused-export
- **Evidence:** Only one reference in the entire codebase: its own definition. Not used internally by any other schema, not imported by any file.
- **Confidence:** high
- **Recommendation:** remove
- **Estimated LOC removed:** 20

### [UNUSED-EXPORT-5] `FEEDBACK_TAGS` constant in feedback.ts

- **File(s):** `packages/data-provider/src/feedback.ts` (lines 32-101)
- **Type:** unused-export
- **Evidence:** Only used internally by `getTagsForRating` in the same file. Never imported by any other file. The `export` keyword is dead.
- **Confidence:** medium
- **Recommendation:** review-then-remove (remove `export` keyword only)
- **Estimated LOC removed:** 0 (just remove `export`)

### [UNUSED-EXPORT-6] `feedbackTagKeySchema` and `feedbackRatingSchema` in feedback.ts

- **File(s):** `packages/data-provider/src/feedback.ts` (lines 107-108)
- **Type:** unused-export
- **Evidence:** Neither schema is imported by any other file in the codebase. Zero references outside the defining file.
- **Confidence:** high
- **Recommendation:** remove
- **Estimated LOC removed:** 2

### [UNUSED-EXPORT-7] `getSchemaDefaults` in config.ts

- **File(s):** `packages/data-provider/src/config.ts` (lines 92-106)
- **Type:** unused-export
- **Evidence:** Only called internally by `getConfigDefaults` (line 1112) in the same file. Never imported by any external file. The `export` keyword is dead; the function value is used internally.
- **Confidence:** medium
- **Recommendation:** review-then-remove (remove `export` keyword only)
- **Estimated LOC removed:** 0 (just remove `export`)

### [UNUSED-EXPORT-8] Multiple access-permission schemas never imported externally

- **File(s):** `packages/data-provider/src/accessPermissions.ts`
- **Type:** unused-export
- **Evidence:** The following exports have zero imports outside the defining file:
  - `permBitsToAccessLevel` (line 308)
  - `accessRoleToPermBits` (line 318)
  - `effectivePermissionsResponseSchema` (line 274)
  - `getResourcePermissionsResponseSchema` (line 256)
- **Confidence:** high
- **Recommendation:** review-then-remove (these appear scaffolded for future use; confirm they are not needed)
- **Estimated LOC removed:** ~60

---

## Vestigial Features

### [VESTIGIAL-1] Commented-out react-query export in data-provider index

- **File(s):** `packages/data-provider/src/index.ts` (line 47-48)
- **Type:** vestigial
- **Evidence:** `// /* react query hooks */` and `// export * from './react-query/react-query-service';` have been commented out. The react-query module itself is fully unused (see UNUSED-FILE-1).
- **Confidence:** high
- **Recommendation:** remove (along with the files it references)
- **Estimated LOC removed:** 2

### [VESTIGIAL-2] TODO/FIXME comments throughout codebase (22+ instances)

- **File(s):** Multiple files across `api/`, `client/src/`, `packages/`
- **Type:** vestigial
- **Evidence:** Found 22+ TODO/FIXME comments in production code (excluding test files). Notable ones:
  - `packages/data-provider/src/config.ts:1181` - TODO about gpt-5.4-thinking pricing
  - `packages/data-provider/src/config.ts:1274` - TODO about agent models
  - `packages/data-schemas/src/methods/tx.ts:132` - TODO about gpt-5.4-pro pricing
  - `api/server/services/Threads/manage.js:129` - Commented-out token counting code
  - `api/server/services/Threads/manage.js:299-308` - TODO about processing generated files
  - `api/app/clients/tools/structured/FluxAPI.js:350` - TODO about cost handling
  - `api/app/clients/tools/structured/OpenAIImageTools.js:196,246,247` - Multiple TODOs
  - `api/server/middleware/buildEndpointOption.js:99` - TODO about object params
  - `client/src/components/Agents/Marketplace.tsx:223` - TODO about admin settings
  - `client/src/components/SidePanel/Agents/ActionsInput.tsx:224` - TODO about format input button
  - `client/src/components/SidePanel/Agents/Advanced/AgentChain.tsx:25` - TODO make configurable
  - `client/src/components/SidePanel/Agents/Advanced/AgentHandoffs.tsx:28` - TODO make configurable
  - `api/server/controllers/assistants/chatV1.js:281,433,472` - Multiple TODOs
  - `api/server/controllers/assistants/chatV2.js:154,274,299` - Multiple TODOs
  - `api/server/services/Config/loadCustomConfig.js:156` - TODO about removing a check
  - `packages/data-provider/src/types.ts:21,168` - TODO about type cleanup
  - `packages/data-provider/src/actions.ts:264` - TODO about OAuth flow
  - `api/server/services/ToolService.js:254` - TODO about streaming
  - `api/server/services/Files/process.js:107` - TODO about refactoring
- **Confidence:** high
- **Recommendation:** review-then-remove (triage each TODO: resolve, remove, or convert to tracked issue)
- **Estimated LOC removed:** ~25 (commented-out code lines only)

### [VESTIGIAL-3] Commented-out FieldErrors import in CustomFormContext

- **File(s):** `client/src/Providers/CustomFormContext.tsx` (lines 4, 17)
- **Type:** vestigial
- **Evidence:** `// FieldErrors,` import and `// errors: FieldErrors<TFieldValues>;` interface property are commented out.
- **Confidence:** high
- **Recommendation:** remove
- **Estimated LOC removed:** 2

---

## Unused Dependencies

### [UNUSED-DEP-1] `regenerator-runtime` in client/package.json

- **File(s):** `client/package.json` (line 104)
- **Type:** unused-dep
- **Evidence:** Only imported in `client/src/main.jsx` as a polyfill. However, modern build targets (Vite with ES2020+) no longer need this runtime. The project already uses ESNext features natively. This warrants review of whether the polyfill is still needed for any supported browser.
- **Confidence:** medium
- **Recommendation:** review-then-remove (verify minimum browser support requirements first)
- **Estimated LOC removed:** 0 (package.json entry only)

### [UNUSED-DEP-2] `mammoth` in api/package.json

- **File(s):** `api/package.json` (line 85)
- **Type:** unused-dep
- **Evidence:** Zero imports of `mammoth` in `api/` directory. It IS imported in `packages/api/src/files/text.ts` where it is listed as a devDependency. The `api/package.json` direct dependency appears redundant since `packages/api` already declares it.
- **Confidence:** medium
- **Recommendation:** review-then-remove (the api workspace may need it at runtime since packages/api lists it as devDependency; verify the actual resolution)
- **Estimated LOC removed:** 0 (package.json entry only)

---

## Summary

| Category | Count | Estimated LOC |
|----------|-------|---------------|
| Unused files | 3 | 1,027 |
| Unused exports | 8 | ~100 |
| Vestigial features | 3 | ~29 |
| Unused dependencies | 2 | 0 (config only) |
| **Total** | **16** | **~1,156** |

### High-Impact Removals

1. **react-query module** (570 LOC) - Entire module with commented-out export, completely superseded by client-side hooks.
2. **experimental.js** (443 LOC) - Alternative server entry point with zero references.
3. **googleGenConfigSchema** (20 LOC) - Zod schema defined but never used anywhere.
4. **essentialShadcnComponents** (15 LOC) - Subset of shadcn components object, never imported.
5. **Access permission schemas** (~60 LOC) - Four exported schemas/functions with zero external consumers.
