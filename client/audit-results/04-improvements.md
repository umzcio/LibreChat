# 04 - Structural Improvements & Modernization

**Agent:** 4 (ARCHITECT)
**Date:** 2026-04-04
**Scope:** `/projects/LibreEco/LibreChat/client/src`

---

## Summary

| Category | Findings | Est. LOC Impact |
|----------|----------|-----------------|
| Duplication | 6 | -1,200 to -1,500 |
| Shared code opportunities | 5 | -400 to -600 |
| Structural improvements | 5 | net neutral |
| Modernization | 4 | -200 to -400 (Recoil long-term: -2,000+) |
| Testing gaps | 3 | +2,000 to +4,000 |

---

## 1. Duplication Analysis

### [DUPLICATION] Agents/Builder ActionsTable — identical files (Columns.tsx, Table.tsx)

- **Impact:** medium
- **Effort:** small (<1hr)
- **Files affected:**
  - `src/components/SidePanel/Agents/ActionsTable/Columns.tsx` (54 lines)
  - `src/components/SidePanel/Builder/ActionsTable/Columns.tsx` (54 lines)
  - `src/components/SidePanel/Agents/ActionsTable/Table.tsx` (48 lines)
  - `src/components/SidePanel/Builder/ActionsTable/Table.tsx` (48 lines)
- **Current state:** Both `Columns.tsx` files are byte-for-byte identical (including dead `fakeData` exports flagged in Agent 3's report). Both `Table.tsx` files differ only in a single CSS class (`text-text-secondary-alt` present in one `<th>` but not the other).
- **Proposed state:** Create `src/components/SidePanel/shared/ActionsTable/` with a single `Columns.tsx`, `Table.tsx`, and `index.ts`. Both Agents and Builder import from this shared location. Remove `fakeData` entirely.
- **Migration path:**
  1. Create shared directory with the canonical versions
  2. Update imports in both `Agents/ActionsInput.tsx` and `Builder/ActionsInput.tsx`
  3. Delete the duplicates
- **LOC impact:** +0 / -104

---

### [DUPLICATION] Agents/Builder ActionsInput — ~85% identical logic

- **Impact:** high
- **Effort:** medium (1-4hr)
- **Files affected:**
  - `src/components/SidePanel/Agents/ActionsInput.tsx` (286 lines)
  - `src/components/SidePanel/Builder/ActionsInput.tsx` (298 lines)
- **Current state:** Both components share the same `debouncedValidation` setup, `handleResult`, all `useState` calls, both `useEffect` hooks, the `saveAction` handler (including the identical `removeSensitiveFields` inner function and the entire auth branching logic), `handleInputChange`, button content logic, and the complete JSX layout. The only differences are: (1) the mutation hook used (`useUpdateAgentAction` vs `useUpdateAction`), (2) the entity ID parameter name (`agent_id` vs `assistant_id`), (3) Builder passes extra `endpoint`/`version`/`model` params to the mutation, (4) Builder has an extra `assistantMap` context lookup, (5) the Agent version uses `logger.log` while Builder uses `console.log`.
- **Proposed state:** Extract a shared `ActionsInputBase` component or a `useActionsForm` hook that encapsulates the shared validation logic, spec parsing, and auth form building. The Agent and Builder variants become thin wrappers providing entity-specific mutation hooks and params.
- **Migration path:**
  1. Extract `useActionsForm({ onMutate })` hook containing validation, state, effects, and `saveAction` builder
  2. Parameterize the mutation call signature via a callback
  3. Refactor both files to use the shared hook
  4. Replace `console.log` in Builder version with `logger.log`
- **LOC impact:** +80 / -300

---

### [DUPLICATION] Agents/Builder ActionsPanel — ~90% identical structure

- **Impact:** medium
- **Effort:** medium (1-4hr)
- **Files affected:**
  - `src/components/SidePanel/Agents/ActionsPanel.tsx` (163 lines)
  - `src/components/SidePanel/Builder/ActionsPanel.tsx` (181 lines)
- **Current state:** Both panels share identical form setup with `useForm<ActionAuthForm>` and the same `defaultValues` object (13 fields), the same `useEffect` to reset form on action change, the same JSX layout (back button, delete dialog with `OGDialogTemplate`, title, `ActionsAuth`, `ActionsInput`). Differences: Agent version uses `useAgentPanelContext` + `useDeleteAgentAction`, Builder receives props + uses `useDeleteAction` with extra `endpoint`/`model` params.
- **Proposed state:** Extract `ActionsPanelLayout` component that accepts `deleteHandler`, `entityLabel`, `actionsInputSlot`, and `actionsAuthSlot` as props. Both variants become thin wrappers.
- **Migration path:**
  1. Create `SidePanel/shared/ActionsPanelLayout.tsx`
  2. Extract the shared form setup and JSX
  3. Wire Agent and Builder panels to use the shared layout
- **LOC impact:** +90 / -200

---

### [DUPLICATION] Agents/Builder ImageVision — functionally identical components

- **Impact:** low
- **Effort:** small (<1hr)
- **Files affected:**
  - `src/components/SidePanel/Agents/ImageVision.tsx` (41 lines)
  - `src/components/SidePanel/Builder/ImageVision.tsx` (42 lines)
- **Current state:** Both components render the same checkbox pattern for `Capabilities.image_vision`. The only difference is the form type generic (`AgentForm` vs `AssistantForm`) and the Builder version adds `aria-labelledby` and `id` attributes (better a11y). The checkbox logic, click handler, and label are identical.
- **Proposed state:** Single generic `CapabilityCheckbox<T>` component parameterized by capability name and form type. The Builder's a11y attributes should be used as the canonical version.
- **Migration path:**
  1. Create `SidePanel/shared/CapabilityCheckbox.tsx` with a generic form type
  2. Replace both ImageVision files with thin wrappers or direct usage
  3. Apply the same pattern to the similar `Retrieval.tsx` pair
- **LOC impact:** +30 / -50

---

### [DUPLICATION] Agents/Builder Retrieval — ~85% identical

- **Impact:** low
- **Effort:** small (<1hr)
- **Files affected:**
  - `src/components/SidePanel/Agents/Retrieval.tsx` (91 lines)
  - `src/components/SidePanel/Builder/Retrieval.tsx` (112 lines)
- **Current state:** Both components share the same `HoverCard` + `Controller` + `Checkbox` + `OptionHover` structure for the retrieval/file-search capability. The Builder version adds a `vectorStores` memo (unused in the JSX shown), version-aware label text, and an `aria-labelledby` attribute. The core checkbox logic, disabled state, and model checking are identical.
- **Proposed state:** Use the same `CapabilityCheckbox` pattern proposed above, with an optional `version` prop for the label variation.
- **Migration path:** Same as ImageVision above
- **LOC impact:** +10 / -80

---

### [DUPLICATION] AgentDetail / AgentDetailContent — duplicated "start chat" logic

- **Impact:** medium
- **Effort:** small (<1hr)
- **Files affected:**
  - `src/components/Agents/AgentDetail.tsx`
  - `src/components/Agents/AgentDetailContent.tsx`
- **Current state:** Both files define identical `SupportContact` and `AgentWithSupport` interfaces. Both contain identical `handleFavoriteClick` and `handleStartChat` functions (including the same `JSON.parse(JSON.stringify(listResp.data))` deep-clone pattern, the same query cache manipulation, the same template construction). `AgentDetail` wraps content in an `OGDialog`; `AgentDetailContent` provides just the dialog content. Despite the wrapper/content split, the business logic is fully duplicated.
- **Proposed state:** `AgentDetail` renders `<OGDialog><AgentDetailContent /></OGDialog>`. Move all shared logic into `AgentDetailContent`. Extract `useStartAgentChat` hook for the agent-start logic.
- **Migration path:**
  1. Extract shared types and `useStartAgentChat` hook
  2. Have `AgentDetail` delegate to `AgentDetailContent` instead of reimplementing
- **LOC impact:** +30 / -120

---

## 2. Shared Code Opportunities

### [SHARED-CODE] Safe JSON parse utility

- **Impact:** high
- **Effort:** small (<1hr)
- **Files affected:** 30+ files with `JSON.parse()` calls (see Agent 2 findings on crash risks in `localStorage.ts`, `useLocalStorage.tsx`, `useSSE.ts`, `BadgeRowContext.tsx`, `endpoints.ts`)
- **Current state:** `JSON.parse()` is called in ~40 locations across the codebase. Only ~13 of those are wrapped in try/catch. The `jotai-utils.ts` and `store/utils.ts` files have proper error handling; `localStorage.ts`, `useLocalStorage.tsx`, and `useSSE.ts` do not. The project already has `isJson()` and `formatJSON()` in `utils/json.ts` but no safe parse.
- **Proposed state:** Add a `safeJsonParse<T>(raw: string, fallback: T): T` utility to `utils/json.ts`. Use it everywhere localStorage or external data is parsed.
  ```typescript
  function safeJsonParse<T>(raw: string | null, fallback: T): T {
    if (raw == null) return fallback;
    try { return JSON.parse(raw) as T; }
    catch { return fallback; }
  }
  ```
- **Migration path:**
  1. Add `safeJsonParse` to `utils/json.ts` and export from `utils/index.ts`
  2. Replace unguarded `JSON.parse` calls in `localStorage.ts` (3 calls), `useLocalStorage.tsx` (2 calls), `BadgeRowContext.tsx` (5 calls), `endpoints.ts` (4 calls)
  3. Address `useSSE.ts` line 103 separately (the critical bug from Agent 2)
- **LOC impact:** +5 / -40

---

### [SHARED-CODE] HTML sanitization wrapper

- **Impact:** high (security)
- **Effort:** small (<1hr)
- **Files affected:**
  - `src/components/Banners/Banner.tsx`
  - `src/components/Chat/Input/MCPConfigDialog.tsx`
  - `src/components/SidePanel/MCPBuilder/MCPServerDialog/sections/TrustSection.tsx`
  - `src/components/MCP/CustomUserVarsSection.tsx` (existing correct usage)
- **Current state:** `DOMPurify` is only imported in 2 files (`CustomUserVarsSection.tsx` and `useMermaid.ts`). Three other files use `dangerouslySetInnerHTML` without any sanitization (the 3 critical XSS bugs from Agent 2). Each file would need to independently import and configure DOMPurify.
- **Proposed state:** Create a `sanitizeHtml(html: string, options?: { allowedTags?: string[] }): string` utility in `utils/sanitize.ts` that wraps DOMPurify with sensible defaults (allow `a`, `strong`, `em`, `br`, `code`, `span`). All `dangerouslySetInnerHTML` usage goes through this function.
  ```typescript
  import DOMPurify from 'dompurify';
  const DEFAULT_ALLOWED = ['a', 'strong', 'em', 'br', 'code', 'span'];
  export function sanitizeHtml(html: string, allowedTags = DEFAULT_ALLOWED): string {
    return DOMPurify.sanitize(html, { ALLOWED_TAGS: allowedTags });
  }
  ```
- **Migration path:**
  1. Create `utils/sanitize.ts`
  2. Fix the 3 XSS-vulnerable files by wrapping their HTML in `sanitizeHtml()`
  3. Refactor `CustomUserVarsSection.tsx` to use the shared utility
  4. Add an ESLint rule or code review checklist item: no `dangerouslySetInnerHTML` without `sanitizeHtml`
- **LOC impact:** +15 / -5

---

### [SHARED-CODE] Deep clone utility to replace JSON.parse(JSON.stringify())

- **Impact:** medium
- **Effort:** small (<1hr)
- **Files affected:**
  - `src/utils/collection.ts` (5 occurrences)
  - `src/data-provider/Agents/mutations.ts` (1)
  - `src/data-provider/mutations.ts` (1)
  - `src/components/Agents/AgentDetail.tsx` (1)
  - `src/components/Agents/AgentDetailContent.tsx` (1)
  - `src/hooks/Conversations/useUpdateTagsInConvo.ts` (1)
- **Current state:** 10 occurrences of `JSON.parse(JSON.stringify(data))` for deep cloning. This is slow for large objects, loses `Date` instances, `undefined` values, and `Map`/`Set` types. The project already uses `structuredClone` in 4 places in `data-provider/prompts.ts`, showing awareness of the better API.
- **Proposed state:** Replace all `JSON.parse(JSON.stringify(...))` with `structuredClone()` (available in all supported browsers and Node 17+). No wrapper needed since it is a global function.
- **Migration path:**
  1. Find-and-replace `JSON.parse(JSON.stringify(X))` with `structuredClone(X)` in each file
  2. Ensure TypeScript `lib` includes `"ESNext"` or `"ES2022"` (already does based on usage)
- **LOC impact:** +0 / -0 (same line count, better semantics and performance)

---

### [SHARED-CODE] Consistent logging via logger utility

- **Impact:** low
- **Effort:** medium (1-4hr)
- **Files affected:** 105 files with raw `console.*` calls vs 5 files using `logger.*`
- **Current state:** The project has a well-designed `logger` utility in `utils/logger.ts` with tag filtering, environment-aware logging, and proper formatting. However, it is only used in 5 files (9 total calls). Meanwhile, raw `console.log/warn/error/info/debug` appears in 105 files (299 total calls). This means most debugging output bypasses the logger's tag filtering and environment gating.
- **Proposed state:** Replace `console.*` calls in production code (not test files) with `logger.*`. This enables tag-based filtering and automatic suppression in production builds.
- **Migration path:**
  1. Audit `console.*` calls: keep only in test files and error boundaries
  2. Replace with `logger.*` in hooks, data-provider, components, and utils
  3. Consider adding an ESLint rule: `no-console` with exceptions for test files
- **LOC impact:** +100 / -100 (net neutral, quality improvement)

---

### [SHARED-CODE] Reusable toast pattern for mutation callbacks

- **Impact:** low
- **Effort:** medium (1-4hr)
- **Files affected:** 90 files with `showToast({...})` calls (265 total occurrences)
- **Current state:** The `showToast({ message, status })` pattern is repeated in nearly every mutation's `onSuccess` and `onError` callbacks. The error handling pattern (`(error as Error).message ?? localize('com_..._error')`) is copy-pasted with minor variations. Some use `(error as Error).message ||`, others use `(error as Error | undefined)?.message ??`.
- **Proposed state:** Create a `useMutationToast` helper that returns standardized `onSuccess` and `onError` callbacks:
  ```typescript
  function useMutationToast(successKey: string, errorKey: string) {
    const localize = useLocalize();
    const { showToast } = useToastContext();
    return {
      onSuccess: () => showToast({ message: localize(successKey), status: 'success' }),
      onError: (error: unknown) => showToast({
        message: (error as Error)?.message ?? localize(errorKey),
        status: 'error',
      }),
    };
  }
  ```
- **Migration path:**
  1. Create `hooks/useMutationToast.ts`
  2. Gradually adopt in new mutations; refactor existing ones opportunistically
- **LOC impact:** +20 / -200 (across all adopters)

---

## 3. Structural Improvements

### [STRUCTURE] data-provider layer imports from store — broken layered architecture

- **Impact:** high
- **Effort:** medium (1-4hr)
- **Files affected:**
  - `src/data-provider/prompts.ts` (imports `store` for 19 Recoil operations)
  - `src/data-provider/Auth/queries.ts`
  - `src/data-provider/Auth/mutations.ts`
  - `src/data-provider/Endpoints/queries.ts`
  - `src/data-provider/Files/queries.ts`
  - `src/data-provider/Misc/queries.ts`
- **Current state:** The `data-provider` layer (React Query hooks) imports from `~/store` (Recoil atoms) in 6 files. This creates a circular dependency path: components -> hooks -> data-provider -> store, where data-provider should be a lower-level layer than store. The `prompts.ts` file is the worst offender with 19 Recoil state operations mixed into its query/mutation hooks.
- **Proposed state:** Data-provider hooks should accept callbacks or return data that consumers use to update state. Move Recoil state updates into custom hooks in `~/hooks` that compose data-provider hooks with store operations.
- **Migration path:**
  1. For each data-provider file, identify which Recoil operations are performed
  2. Extract those operations into hook wrappers in `~/hooks/{Feature}/`
  3. Have component consumers use the hook wrappers instead of the raw data-provider hooks
  4. Remove store imports from data-provider files
- **LOC impact:** +100 / -60 (net +40, but proper layering)

---

### [STRUCTURE] hooks layer imports from components — inverted dependency

- **Impact:** medium
- **Effort:** medium (1-4hr)
- **Files affected:**
  - `src/hooks/Nav/useSideNavLinks.ts` (8 component imports)
  - `src/hooks/Nav/useUnifiedSidebarLinks.ts` (1 component import)
  - `src/hooks/Prompts/useCategories.tsx` (1 component import)
  - `src/hooks/Input/useMentions.ts` (1 component import)
  - `src/hooks/Files/useSharePointPicker.ts` (1 type import)
- **Current state:** 5 hook files import from `~/components`, inverting the expected dependency direction (components should depend on hooks, not vice versa). The worst case is `useSideNavLinks.ts` which imports 8 actual component references (MCPBuilderPanel, AgentPanelSwitch, BookmarkPanel, PanelSwitch, Parameters, MemoryPanel, ProjectPanel, FilesPanel, PromptsAccordion) to build a panel registry.
- **Proposed state:** For `useSideNavLinks.ts`, the component references should be passed as a registry/config object from the calling component, or use React.lazy with string identifiers. For type-only imports from components (like `useSharePointPicker.ts`), move the type definition to `~/common`.
- **Migration path:**
  1. Move `SPPickerConfig` type from `components/SidePanel/Agents/config.ts` to `~/common`
  2. For `useSideNavLinks`, accept a `panelRegistry` parameter instead of importing components directly
  3. For `useCategories`, move `CategoryIcon` to a shared location or pass as a render prop
  4. For `useMentions`, move `EndpointIcon` to a shared icons location
- **LOC impact:** +30 / -20

---

### [STRUCTURE] Store barrel exports mix Recoil default export with Jotai named exports

- **Impact:** medium
- **Effort:** small (<1hr)
- **Files affected:**
  - `src/store/index.ts`
  - All 175+ files importing from `~/store`
- **Current state:** `store/index.ts` exports a default object spreading 14 Recoil modules (`...artifacts`, `...families`, etc.) plus 4 named re-exports for Jotai atoms (`export * from './mcp'`, `export * from './favorites'`, `export * from './project'`, `export * from './agents'`). Consumers access Recoil atoms via `store.someAtom` (default import) but Jotai atoms via named imports. This dual pattern creates confusion about which state system a given atom belongs to.
- **Proposed state:** During the Jotai migration (see Modernization section), create separate entry points: `~/store/recoil` for legacy atoms and `~/store/jotai` for new atoms. Or at minimum, add a comment convention and naming prefix (`j_` or `jotai_`) to Jotai atoms to distinguish them at usage sites.
- **Migration path:**
  1. Add JSDoc comments to `store/index.ts` clarifying which exports are Recoil vs Jotai
  2. As atoms are migrated, move them from the default export to named exports
  3. Eventually remove the default export pattern entirely
- **LOC impact:** +10 / -0

---

### [STRUCTURE] 28 React Context providers — consolidation opportunity

- **Impact:** medium
- **Effort:** large (4hr+)
- **Files affected:** `src/Providers/` (28 context files), consuming components
- **Current state:** 28 separate React Context providers, many of which are thin wrappers around a single value or a small group of related values. Some are deeply nested in the provider tree. Examples of candidates for consolidation:
  - `ChatContext` + `AddedChatContext` + `SetConvoContext` could be a single `ConversationContext`
  - `AssistantsMapContext` + `AgentsMapContext` could be a single `EntityMapsContext`
  - `FileMapContext` + `DragDropContext` could merge into `FileContext`
- **Proposed state:** Reduce to ~18-20 contexts by merging closely related providers. Use object values with selective property access via custom hooks to prevent unnecessary re-renders.
- **Migration path:**
  1. Audit which contexts are always used together (co-occurrence analysis)
  2. Merge candidates that share the same consumer components
  3. Provide backward-compatible hook aliases during migration
- **LOC impact:** +50 / -200

---

### [STRUCTURE] Inconsistent import patterns for shared SidePanel components

- **Impact:** low
- **Effort:** small (<1hr)
- **Files affected:**
  - `src/components/SidePanel/Agents/ActionsInput.tsx` imports `ActionCallback` from `~/components/SidePanel/Builder/ActionCallback`
  - `src/components/SidePanel/Agents/ActionsPanel.tsx` imports `ActionsAuth` from `~/components/SidePanel/Builder/ActionsAuth`
- **Current state:** The Agents panel imports 2 components from the Builder directory, creating cross-feature dependencies. These are shared components that happen to live in the Builder directory because it was built first.
- **Proposed state:** Move truly shared SidePanel components (`ActionCallback`, `ActionsAuth`) to `src/components/SidePanel/shared/`.
- **Migration path:**
  1. Create `SidePanel/shared/` directory
  2. Move `ActionCallback.tsx` and `ActionsAuth.tsx`
  3. Update imports in both Agents and Builder
- **LOC impact:** +0 / -0 (reorganization only)

---

## 4. Modernization Opportunities

### [MODERNIZATION] Recoil to Jotai migration

- **Impact:** high
- **Effort:** large (4hr+ per phase, multi-sprint effort)
- **Files affected:** 15 Recoil store files, 180 consumer files (614 Recoil hook calls), vs 2 Jotai store files, 15 consumer files (34 Jotai hook calls)
- **Current state:** Recoil (`^0.7.7`) is the primary state management library with 614 hook call sites across 180 files. It is effectively unmaintained (last release June 2023, Meta has deprioritized it). Jotai (`^2.12.5`) is being incrementally adopted with 34 call sites across 15 files. The Jotai adoption is concentrated in newer features: MCP, favorites, font size, show thinking, and message rendering. The project already has mature Jotai utilities (`jotai-utils.ts`: `createStorageAtom`, `createStorageAtomWithEffect`, `createTabIsolatedStorage`, `initializeFromStorage`).
- **Proposed state:** Complete migration from Recoil to Jotai over multiple sprints. Jotai is actively maintained, has better TypeScript support, smaller bundle size (~3KB vs ~80KB), and the project already has proven patterns for it.
- **Migration path (phased):**
  1. **Phase 1 — Leaf atoms (effort: medium):** Migrate simple atoms that have few consumers: `text.ts` (dead, remove), `toast.ts` (dead, remove), `search.ts` (9 consumers), `preset.ts`, `lang/language.ts`. These are self-contained atoms without complex selectors.
  2. **Phase 2 — Settings atoms (effort: medium):** Migrate `settings.ts` (speech, UI preferences). These already have Jotai parallels in `fontSize.ts` and `showThinking.ts`.
  3. **Phase 3 — Core atoms (effort: large):** Migrate `families.ts` (atom families for per-conversation state), `submission.ts`, `endpoints.ts`. These have the most consumers and complex selector chains. Requires creating Jotai atom families.
  4. **Phase 4 — Remove Recoil:** Remove `recoil` dependency and `RecoilRoot` provider.
- **LOC impact:** Phase 1-2: +100 / -150. Full migration: +500 / -2,500 (net -2,000)

---

### [MODERNIZATION] Replace JSON.parse(JSON.stringify()) deep clones with structuredClone

- **Impact:** medium
- **Effort:** small (<1hr)
- **Files affected:** 10 call sites across 6 files (see Shared Code section)
- **Current state:** 10 uses of the `JSON.parse(JSON.stringify(data))` anti-pattern for deep cloning. This loses `undefined` values, fails on circular references, and is slower than `structuredClone`.
- **Proposed state:** Use `structuredClone()` globally. It is available in all modern browsers (Chrome 98+, Firefox 94+, Safari 15.4+) and Node 17+.
- **Migration path:** Direct replacement in each file.
- **LOC impact:** +0 / -0

---

### [MODERNIZATION] TypeScript `any` usage — 65 occurrences across 30 files

- **Impact:** medium
- **Effort:** medium (1-4hr)
- **Files affected:** 30 files with explicit `: any` annotations (65 total occurrences). Heaviest in test files (expected), but also in production code: `src/utils/timestamps.ts` (1), `src/components/Web/Sources.tsx` (2), `src/components/Projects/ProjectMemoryModal.tsx` (2), `src/components/Chat/Menus/Endpoints/components/SearchResults.tsx` (2), `src/components/MCP/CustomUserVarsSection.tsx` (2), `src/hooks/Files/useSharePointToken.ts` (2), `src/hooks/Files/useSharePointPicker.ts` (2), `src/hooks/Files/useSharePointFileHandling.ts` (2), `src/components/Chat/Input/BadgeRow.tsx` (1), `src/components/VirtualizedAgentGrid.tsx` (1).
- **Current state:** The project's CLAUDE.md explicitly states "Never use `any`". The SharePoint-related files are the worst offenders in production code with 6 `any` uses across 3 files, likely due to an untyped SharePoint SDK.
- **Proposed state:** Replace `any` with proper types. For SharePoint SDK interactions, create typed wrappers in `~/common/types.ts`. For test files, use `unknown` with type guards or proper mocking types.
- **Migration path:**
  1. Fix production code `any` types (15 occurrences across ~12 files)
  2. Fix test file `any` types (50 occurrences, lower priority)
- **LOC impact:** +40 / -0

---

### [MODERNIZATION] Class components — 4 ErrorBoundary components

- **Impact:** low
- **Effort:** small (<1hr) per component (or skip — see note)
- **Files affected:**
  - `src/components/Artifacts/renderers/ErrorBoundary.tsx`
  - `src/components/Messages/Content/Mermaid/MermaidErrorBoundary.tsx`
  - `src/components/Web/SourcesErrorBoundary.tsx`
  - `src/components/Chat/Messages/Content/MarkdownErrorBoundary.tsx`
- **Current state:** 4 class components, all error boundaries. React still requires class components for error boundaries (no hook equivalent for `componentDidCatch`/`getDerivedStateFromError`).
- **Proposed state:** **No change needed.** Class components for error boundaries are the correct pattern in React 18. When React 19's `useErrorBoundary` hook (or a community equivalent like `react-error-boundary`) is adopted, these can be converted. This finding is noted for tracking, not as an action item.
- **Migration path:** Wait for React 19 adoption, then convert to hooks.
- **LOC impact:** N/A

---

## 5. Testing Gaps

### [TESTING] Zero component-level tests for Auth, Artifacts, Conversations, Nav, Prompts

- **Impact:** high
- **Effort:** large (4hr+)
- **Files affected:**
  - `src/components/Auth/` — 0 test files (LoginForm, Registration, TwoFactorScreen, ResetPassword — critical auth flows)
  - `src/components/Artifacts/` — 2 spec files exist in `__tests__/` but they test `ArtifactButton` and `ArtifactUpdate` only. The main `Artifacts.tsx` (440 lines, flagged as god function) and `Artifact.tsx` have 0 tests.
  - `src/components/Conversations/` — 1 test file (`Conversations.test.tsx`). The `Convo.tsx`, `ConvoOptions/`, and archive/delete flows are untested.
  - `src/components/Nav/` — 1 test file (`ThemeSelector.spec.tsx`). Settings tabs, sidebar, favorites — all untested.
  - `src/components/Prompts/` — 0 test files. `PromptForm.tsx` (27 imports, one of the highest fan-out files) is untested.
  - `src/components/Banners/` — 0 test files (and contains a critical XSS vulnerability).
  - `src/components/MCP/` — 0 test files (and contains a critical XSS vulnerability).
- **Current state:** 128 test files exist across the codebase, but coverage is heavily skewed toward utilities (31 test files in `utils/`) and hooks (15 test files). Component tests exist mainly for `SidePanel/Agents/` (12 tests), `Chat/Messages/Content/` (6 tests), and `Chat/Input/Files/` (2 tests). The Auth flow, which handles login, registration, 2FA, and password reset, has zero component tests.
- **Proposed state:** Priority test additions:
  1. Auth flow: Login, Registration, 2FA, password reset (critical user path)
  2. Banner.tsx, MCPConfigDialog.tsx, TrustSection.tsx (XSS-vulnerable components — tests should verify sanitization after fix)
  3. `Artifacts.tsx` (god function, complex state management, drag handling)
  4. `PromptForm.tsx` (high fan-out, complex form logic)
- **Migration path:**
  1. Create `Auth/__tests__/` with tests for login success/error/2FA flows
  2. Create sanitization tests after implementing the `sanitizeHtml` utility
  3. Add Artifacts integration tests after refactoring the god function
- **LOC impact:** +2,000 to +4,000

---

### [TESTING] SSE and streaming hooks — minimal coverage for critical path

- **Impact:** high
- **Effort:** large (4hr+)
- **Files affected:**
  - `src/hooks/SSE/useSSE.ts` — 1 test file exists but coverage is incomplete (the uncaught JSON.parse bug indicates the main message handler path is untested)
  - `src/hooks/SSE/useEventHandlers.ts` — 1 test file, but the `finalHandler` (200+ lines, god function) needs significantly more coverage
  - `src/hooks/SSE/useResumableSSE.ts` — 1 test file exists
  - `src/hooks/SSE/useStepHandler.ts` — 1 test file exists
- **Current state:** The SSE hooks handle the core chat streaming experience. While test files exist, the bugs found by Agent 2 (uncaught JSON.parse in message handler, stale closure in completed state, error handler leaving stop button visible) indicate gaps in test coverage for error and edge cases.
- **Proposed state:** Expand SSE test suites with:
  - Malformed JSON message handling (the critical bug)
  - Concurrent stream management (the `completed` Set mutation issue)
  - Error event handling with unparseable data
  - Component unmount during active stream
- **Migration path:** Add test cases to existing spec files
- **LOC impact:** +500 to +800

---

### [TESTING] data-provider layer — 2 test files for 13 feature modules

- **Impact:** medium
- **Effort:** large (4hr+)
- **Files affected:**
  - `src/data-provider/__tests__/connection.test.ts`
  - `src/data-provider/__tests__/memories.test.ts`
  - Missing: Auth, Agents, Endpoints, Files, Code, Projects, Messages, Misc, Tools, Favorites, MCP, SSE, prompts, mutations, queries, roles, tags
- **Current state:** Only 2 of 21 data-provider modules have any test coverage. The data-provider layer is the bridge between the React Query cache and the backend API. The `prompts.ts` file alone has 19 Recoil state operations embedded in it, making it the most complex data-provider module.
- **Proposed state:** Add integration tests for at minimum: Auth mutations (token refresh, login), Agents mutations (create, update, delete), and File operations (upload, delete).
- **Migration path:**
  1. Create test files for each feature module
  2. Use React Query test utilities and MSW for API mocking
  3. Test cache invalidation and optimistic update behavior
- **LOC impact:** +1,500 to +2,500

---

## Priority Matrix

| Priority | Finding | Impact | Effort |
|----------|---------|--------|--------|
| P0 | HTML sanitization wrapper (fixes 3 XSS) | high | small |
| P0 | Safe JSON parse utility (fixes 5+ crash bugs) | high | small |
| P1 | Auth component tests | high | large |
| P1 | SSE error path tests | high | large |
| P1 | data-provider / store layer separation | high | medium |
| P1 | Agents/Builder ActionsInput dedup | high | medium |
| P2 | Recoil-to-Jotai Phase 1 (leaf atoms) | high | medium |
| P2 | structuredClone replacement | medium | small |
| P2 | ActionsTable dedup | medium | small |
| P2 | ActionsPanel dedup | medium | medium |
| P2 | AgentDetail/Content dedup | medium | small |
| P2 | Context provider consolidation | medium | large |
| P3 | TypeScript `any` cleanup | medium | medium |
| P3 | Console.log to logger migration | low | medium |
| P3 | Hooks/components dependency inversion | medium | medium |
| P3 | Reusable toast pattern | low | medium |
| P3 | CapabilityCheckbox shared component | low | small |
| P4 | Recoil-to-Jotai Phases 2-4 | high | large |
| P4 | data-provider test coverage | medium | large |
