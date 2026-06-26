# 05 - Execution Plan

**Agent:** 5 (SURGEON)
**Date:** 2026-04-04
**Source:** Reports 01-04 (Inventory, Bugs, Dead Code, Improvements)

---

## Batch 1 -- Safe Dead Code Removal (LOW RISK)

These are pure removals of unreferenced code. No behavior changes. Rollback: `git checkout` the deleted/modified files.

| # | File(s) | Description | Risk | Rollback |
|---|---------|-------------|------|----------|
| 1.1 | `src/utils/convos.fakeData.ts` | Delete entire file (568 LOC). Unused fake conversation data with `@ts-nocheck`. Zero imports anywhere. | Negligible | Restore file from git |
| 1.2 | `src/utils/resetConvo.ts` | Delete entire file (24 LOC). Unused utility, not exported from barrel, zero imports. | Negligible | Restore file from git |
| 1.3 | `src/utils/buildTree.ts` | Delete entire file (19 LOC). Exports `groupIntoList` which is never imported. All `buildTree` usage comes from `librechat-data-provider`. | Negligible | Restore file from git |
| 1.4 | `src/hooks/useRenderChangeLog.ts` | Delete entire file (67 LOC). Debug hook never wired into any component, not in hooks barrel. | Negligible | Restore file from git |
| 1.5 | `src/hooks/useVirtualGrid.ts` | Delete entire file (67 LOC). Never imported, not in hooks barrel. | Negligible | Restore file from git |
| 1.6 | `src/Providers/ArtifactContext.tsx` | Delete entire file (32 LOC). Provider never rendered, hooks never called. Not in Providers barrel. Distinct from ArtifactsContext (plural) which IS used. | Negligible | Restore file from git |
| 1.7 | `src/store/toast.ts` | Delete entire file (14 LOC). Recoil atom never consumed. Remove `...toast` spread from `src/store/index.ts`. (Note: `packages/client` has a separate Jotai `toastState` that IS used.) | Low | Restore file + revert index.ts |
| 1.8 | `src/store/text.ts` | Delete entire file (9 LOC). Recoil atom never consumed. Remove `...text` spread from `src/store/index.ts`. Per-conversation text uses `textByIndex` from families.ts. | Low | Restore file + revert index.ts |
| 1.9 | `src/utils/index.ts` | Remove `capitalizeFirstLetter` function (~3 LOC). Zero imports anywhere in codebase. | Negligible | Revert edit |
| 1.10 | `src/components/SidePanel/Agents/ActionsTable/Columns.tsx` | Remove `fakeData` export (20 LOC) and commented-out column block (10 LOC). | Negligible | Revert edit |
| 1.11 | `src/components/SidePanel/Builder/ActionsTable/Columns.tsx` | Remove `fakeData` export (20 LOC) and commented-out column block (10 LOC). | Negligible | Revert edit |
| 1.12 | `src/Providers/EditorContext.tsx` | Remove deprecated `useEditorContext` function (9 LOC). Zero consumers. | Negligible | Revert edit |
| 1.13 | `src/components/SidePanel/Agents/ActionsInput.tsx` | Remove commented-out examples select block (13 LOC). | Negligible | Revert edit |
| 1.14 | `src/components/SidePanel/Builder/ActionsInput.tsx` | Remove commented-out examples select block (14 LOC). | Negligible | Revert edit |

**Estimated LOC removed:** ~870
**Files deleted:** 7
**Files modified:** 7

---

## Batch 2 -- Bug Fixes (MEDIUM RISK)

These fix identified bugs with clear before/after behavior. Each should be tested individually.

| # | File(s) | Description | Risk | Rollback |
|---|---------|-------------|------|----------|
| 2.1 | `src/components/Banners/Banner.tsx` | XSS fix: sanitize `banner.message` with DOMPurify before `dangerouslySetInnerHTML`. | Medium | Revert edit |
| 2.2 | `src/components/SidePanel/MCPBuilder/MCPServerDialog/sections/TrustSection.tsx` | XSS fix: sanitize trust checkbox label/sublabel with DOMPurify. | Medium | Revert edit |
| 2.3 | `src/components/Chat/Input/MCPConfigDialog.tsx` | XSS fix: sanitize `details.description` with DOMPurify. | Medium | Revert edit |
| 2.4 | `src/hooks/SSE/useSSE.ts` (line ~103) | Wrap `JSON.parse(e.data)` in try/catch in the message event handler. Follow pattern from `useResumableSSE.ts`. | Medium | Revert edit |
| 2.5 | `src/utils/localStorage.ts` | Wrap 3 `JSON.parse` calls in try/catch, returning defaults on failure. | Medium | Revert edit |
| 2.6 | `src/hooks/useLocalStorage.tsx` (line ~28) | Wrap storage event handler `JSON.parse` in try/catch, fallback to `defaultValue`. | Medium | Revert edit |
| 2.7 | `src/components/Artifacts/Artifact.tsx` | Add cleanup effect to cancel throttled function on unmount. | Low-Medium | Revert edit |
| 2.8 | `src/components/Auth/Registration.tsx` | Store interval ID in ref, clear on unmount. | Low-Medium | Revert edit |
| 2.9 | `src/hooks/SSE/useSSE.ts` (line ~220) | Add `setShowStopButton(false)` to error handler catch block. | Low | Revert edit |

**Prerequisite for 2.1-2.3:** Create `src/utils/sanitize.ts` with shared `sanitizeHtml()` wrapper around DOMPurify (as proposed in report 04).

---

## Batch 3 -- Refactors (HIGHER RISK)

These consolidate duplication and improve structure. Require careful testing and potentially multi-file coordination.

| # | File(s) | Description | Risk | Rollback |
|---|---------|-------------|------|----------|
| 3.1 | `src/components/SidePanel/{Agents,Builder}/ActionsTable/` | Consolidate identical Columns.tsx and Table.tsx into shared directory. | Medium | Revert all files |
| 3.2 | `src/components/SidePanel/{Agents,Builder}/ActionsInput.tsx` | Extract shared `useActionsForm` hook, make both files thin wrappers. | High | Revert all files |
| 3.3 | `src/components/SidePanel/{Agents,Builder}/ActionsPanel.tsx` | Extract shared `ActionsPanelLayout` component. | Medium-High | Revert all files |
| 3.4 | `src/components/Agents/AgentDetail{,Content}.tsx` | Extract `useStartAgentChat` hook, deduplicate interfaces. | Medium | Revert both files |
| 3.5 | `src/data-provider/prompts.ts` + related | Move Recoil state operations out of data-provider into hooks layer. | High | Revert all files |
| 3.6 | `JSON.parse(JSON.stringify(...))` (10 sites) | Replace with `structuredClone()`. | Low | Revert each file |
| 3.7 | `src/components/SidePanel/{Agents,Builder}/ImageVision.tsx` | Consolidate into shared `CapabilityCheckbox` component. | Low | Revert all files |
| 3.8 | `src/components/SidePanel/{Agents,Builder}/Retrieval.tsx` | Consolidate into shared component. | Low | Revert all files |
| 3.9 | `src/components/Input/ModelSelect/` (10 files) | Delete entire dead directory (~350 LOC). | Medium | Restore from git |
| 3.10 | `src/components/Input/Generations/` (3 files) | Delete entire dead directory (~60 LOC). | Medium | Restore from git |

**Note:** Items 3.9 and 3.10 are dead directory removals. They were placed in Batch 3 per the task instructions to NOT touch `ModelSelect/` or `Generations/` directories yet.

---

## Execution Order

1. Execute all Batch 1 items (this session)
2. Run `npx tsc --noEmit` to verify no type errors
3. Batch 2 in a follow-up session (XSS fixes are highest priority)
4. Batch 3 items can be done individually in any order
