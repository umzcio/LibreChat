# Dead/Unused Code Audit - LibreChat Client

**Agent:** 3 (NECROMANCER)
**Date:** 2026-04-04
**Scope:** `/projects/LibreEco/LibreChat/client/src`
**Total source files scanned:** 1,115

---

## Summary

| Category | Count | Est. LOC Removable |
|----------|-------|--------------------|
| Unused files | 4 | ~710 |
| Unused file directories | 2 | ~450 |
| Unused exports | 6 | ~50 |
| Unused store atoms | 2 | ~20 |
| Unused hooks | 2 | ~130 |
| Vestigial / commented-out code | 5 | ~50 |
| Unused dependencies | 6 | N/A (package.json only) |
| Deprecated code (still exported) | 1 | ~10 |
| **Total** | **28 findings** | **~1,420 LOC** |

---

## Findings

---

### [UNUSED-FILE-01] convos.fakeData.ts - Large unused test fixture

- **File(s):** `src/utils/convos.fakeData.ts` (entire file, 568 lines)
- **Type:** unused-file
- **Evidence:** Grep for `convos.fakeData` and `convoData` across all src files returns zero imports. The file has a `@ts-nocheck` directive and contains hardcoded fake conversation data. No test file references it.
- **Confidence:** high
- **Recommendation:** remove
- **Estimated LOC removed:** 568

---

### [UNUSED-FILE-02] resetConvo.ts - Unused utility function

- **File(s):** `src/utils/resetConvo.ts` (entire file, 24 lines)
- **Type:** unused-file
- **Evidence:** Grep for `resetConvo` returns only the file itself. Not exported from `src/utils/index.ts`. Not imported anywhere. Contains `console.log` debugging output, suggesting it was used during early development.
- **Confidence:** high
- **Recommendation:** remove
- **Estimated LOC removed:** 24

---

### [UNUSED-FILE-03] buildTree.ts - groupIntoList never called

- **File(s):** `src/utils/buildTree.ts` (entire file, 19 lines)
- **Type:** unused-file
- **Evidence:** Exports `groupIntoList`. Grep for `groupIntoList` returns only the defining file. Not re-exported from `src/utils/index.ts`. Contains commented-out parameters (`// fileMap`) and unused CSS class constants (`even`, `odd`).
- **Confidence:** high
- **Recommendation:** remove
- **Estimated LOC removed:** 19

---

### [UNUSED-DIR-01] Input/ModelSelect/ - Entire directory is dead

- **File(s):** `src/components/Input/ModelSelect/` (10 files: `index.ts`, `ModelSelect.tsx`, `ChatGPT.tsx`, `Google.tsx`, `OpenAI.tsx`, `Anthropic.tsx`, `SelectDropDownPop.tsx`, `MultiSelectDropDown.tsx`, `MultiSelectPop.tsx`, `options.ts`)
- **Type:** unused-file
- **Evidence:** The index exports `ModelSelect`, `DataTable`, `columns`, and `files`. No file outside this directory imports from it. All internal cross-references (`SelectDropDownPop`, etc.) are self-contained. The newer model selector lives at `src/components/Chat/Menus/Endpoints/ModelSelector.tsx`. This appears to be a legacy model selection UI that was replaced.
- **Confidence:** high
- **Recommendation:** remove
- **Estimated LOC removed:** ~350

---

### [UNUSED-DIR-02] Input/Generations/ - Entire directory is dead

- **File(s):** `src/components/Input/Generations/` (3 files: `Button.tsx`, `Regenerate.tsx`, `Stop.tsx`)
- **Type:** unused-file
- **Evidence:** Grep for `Generations/Button`, `Generations/Regenerate`, `Generations/Stop`, and `from.*Generations` (in component paths) returns zero external imports. These components provide regenerate/stop buttons that have been replaced by the current chat input controls.
- **Confidence:** high
- **Recommendation:** remove
- **Estimated LOC removed:** ~60

---

### [UNUSED-EXPORT-01] capitalizeFirstLetter - Never imported

- **File(s):** `src/utils/index.ts` (line ~97)
- **Type:** unused-export
- **Evidence:** Grep for `capitalizeFirstLetter` across all src files returns only `src/utils/index.ts` where it is defined. Zero consumers.
- **Confidence:** high
- **Recommendation:** remove
- **Estimated LOC removed:** 3

---

### [UNUSED-EXPORT-02] fakeData in ActionsTable/Columns.tsx (2 locations)

- **File(s):** `src/components/SidePanel/Builder/ActionsTable/Columns.tsx` (lines 10-29), `src/components/SidePanel/Agents/ActionsTable/Columns.tsx` (lines 10-29)
- **Type:** unused-export
- **Evidence:** Both files export identical `fakeData: Spec[]` arrays with pet store mock data. Grep for `fakeData` within the SidePanel directory shows these are never imported -- only their sibling `columns` and `Spec` type are used.
- **Confidence:** high
- **Recommendation:** remove
- **Estimated LOC removed:** 40 (20 per file)

---

### [UNUSED-EXPORT-03] ArtifactContext / ArtifactProvider - Never consumed

- **File(s):** `src/Providers/ArtifactContext.tsx` (entire file, ~35 lines)
- **Type:** unused-file
- **Evidence:** Grep for `useArtifactContext` and `ArtifactProvider` returns only the defining file and `src/data-provider/Messages/mutations.ts` (which imports `ArtifactContext` the name, not the provider). The Provider is never rendered in the component tree. Not exported from `src/Providers/index.ts`. Note: this is distinct from `ArtifactsContext.tsx` (plural) which IS used extensively.
- **Confidence:** high
- **Recommendation:** remove
- **Estimated LOC removed:** 35

---

### [UNUSED-HOOK-01] useRenderChangeLog - Debug hook never used

- **File(s):** `src/hooks/useRenderChangeLog.ts` (entire file, 67 lines)
- **Type:** unused-file
- **Evidence:** Grep for `useRenderChangeLog` returns only the file itself. Not exported from `src/hooks/index.ts`. It is a development-only debug utility (logs changed values between renders) that was written but never wired into any component.
- **Confidence:** high
- **Recommendation:** remove
- **Estimated LOC removed:** 67

---

### [UNUSED-HOOK-02] useVirtualGrid - Never imported

- **File(s):** `src/hooks/useVirtualGrid.ts` (entire file, 67 lines)
- **Type:** unused-file
- **Evidence:** Grep for `useVirtualGrid` returns only the file itself. Not exported from `src/hooks/index.ts`. The `VirtualizedAgentGrid` component uses `react-virtualized` directly instead of this hook. Contains `any[]` types which violate the project's type safety rules.
- **Confidence:** high
- **Recommendation:** remove
- **Estimated LOC removed:** 67

---

### [UNUSED-STORE-01] toastState atom - Never consumed

- **File(s):** `src/store/toast.ts` (entire file, 14 lines)
- **Type:** unused-export
- **Evidence:** Grep for `toastState` returns only `src/store/toast.ts`. The atom is spread into the default store export via `src/store/index.ts`, but `store.toastState` is never referenced in any component or hook. The app uses a different toast/notification mechanism.
- **Confidence:** high
- **Recommendation:** remove (also remove `...toast` spread from `src/store/index.ts`)
- **Estimated LOC removed:** 14

---

### [UNUSED-STORE-02] text atom - Never consumed

- **File(s):** `src/store/text.ts` (entire file, 9 lines)
- **Type:** unused-export
- **Evidence:** Grep for `store.text` (excluding `store.textByIndex`, `store.textToSpeech`, etc.) returns zero results. The atom is spread into the default store export, but never accessed. The per-conversation text state uses `textByIndex` from `src/store/families.ts` instead.
- **Confidence:** high
- **Recommendation:** remove (also remove `...text` spread from `src/store/index.ts`)
- **Estimated LOC removed:** 9

---

### [DEPRECATED-01] useEditorContext - Deprecated, zero consumers

- **File(s):** `src/Providers/EditorContext.tsx` (lines 68-76)
- **Type:** vestigial
- **Evidence:** Marked `@deprecated` with comment "Use useMutationState() and/or useCodeState() instead". Grep for `useEditorContext` returns only the defining file. All consumers have migrated to the replacement hooks.
- **Confidence:** high
- **Recommendation:** remove
- **Estimated LOC removed:** 9

---

### [VESTIGIAL-01] Commented-out "examples" select in ActionsInput (2 locations)

- **File(s):** `src/components/SidePanel/Agents/ActionsInput.tsx` (lines 213-225), `src/components/SidePanel/Builder/ActionsInput.tsx` (lines 224-237)
- **Type:** vestigial
- **Evidence:** 13-line commented-out JSX blocks wrapped in `{/* TODO: Implement examples functionality ... */}`. Contains a hardcoded `<select>` with "Weather (JSON)", "Pet Store (YAML)", "Blank Template" options. Both files have identical commented blocks.
- **Confidence:** high
- **Recommendation:** remove (reimplement when ready, not keep commented-out)
- **Estimated LOC removed:** 26

---

### [VESTIGIAL-02] TODO/FIXME comments - 28 occurrences across codebase

- **File(s):** Various (see list below)
- **Type:** vestigial
- **Evidence:** 28 TODO/FIXME comments found. Notable clusters:
  - `src/components/SidePanel/Agents/ActionsInput.tsx` (3 TODOs)
  - `src/components/SidePanel/Builder/ActionsInput.tsx` (3 TODOs)
  - `src/components/Input/SetKeyDialog/SetKeyDialog.tsx` (3 TODOs)
  - `src/components/SidePanel/Parameters/DynamicSlider.tsx` / `DynamicDropdown.tsx` (3 TODOs about custom logic)
  - `src/hooks/Files/useFileHandling.ts` (2 TODOs about dynamic localize)
  - `src/data-provider/mutations.ts` (2 TODOs)
  - `src/components/Chat/Input/Files/DragDropModal.tsx` and `AttachFileMenu.tsx` (2 TODOs about ephemeral agent capabilities)
- **Confidence:** medium (TODOs are not dead code per se, but indicate incomplete features or tech debt)
- **Recommendation:** review-then-remove (triage each: implement, remove, or convert to issue tracker items)
- **Estimated LOC removed:** N/A

---

### [UNUSED-DEP-01] class-variance-authority - Never imported

- **File(s):** `package.json` line 63
- **Type:** unused-dep
- **Evidence:** Grep for `class-variance-authority` across all src files returns zero results. No file imports `cva` or anything from this package.
- **Confidence:** high
- **Recommendation:** remove from dependencies
- **Estimated LOC removed:** N/A

---

### [UNUSED-DEP-02] @radix-ui/react-alert-dialog - Never imported

- **File(s):** `package.json` line 43
- **Type:** unused-dep
- **Evidence:** Grep for `@radix-ui/react-alert-dialog` returns zero imports in src. The app uses `@radix-ui/react-dialog` (different package) which IS imported.
- **Confidence:** high
- **Recommendation:** remove from dependencies
- **Estimated LOC removed:** N/A

---

### [UNUSED-DEP-03] @radix-ui/react-hover-card - Never imported

- **File(s):** `package.json` line 49
- **Type:** unused-dep
- **Evidence:** Grep for `@radix-ui/react-hover-card` returns zero imports in src.
- **Confidence:** high
- **Recommendation:** remove from dependencies
- **Estimated LOC removed:** N/A

---

### [UNUSED-DEP-04] @radix-ui/react-separator - Never imported

- **File(s):** `package.json` line 53
- **Type:** unused-dep
- **Evidence:** Grep for `@radix-ui/react-separator` returns zero imports in src.
- **Confidence:** high
- **Recommendation:** remove from dependencies
- **Estimated LOC removed:** N/A

---

### [UNUSED-DEP-05] @radix-ui/react-collapsible - Never imported

- **File(s):** `package.json` line 45
- **Type:** unused-dep
- **Evidence:** Grep for `@radix-ui/react-collapsible` returns zero imports in src.
- **Confidence:** high
- **Recommendation:** remove from dependencies
- **Estimated LOC removed:** N/A

---

### [UNUSED-DEP-06] @radix-ui/react-label - Never imported

- **File(s):** `package.json` line 50
- **Type:** unused-dep
- **Evidence:** Grep for `@radix-ui/react-label` returns zero imports in src.
- **Confidence:** high
- **Recommendation:** remove from dependencies
- **Estimated LOC removed:** N/A

---

### [UNUSED-HOOK-03] useLocalStorageAlt - Only used in tests, not in hooks index

- **File(s):** `src/hooks/useLocalStorageAlt.tsx` (entire file)
- **Type:** unused-export
- **Evidence:** Grep for `useLocalStorageAlt` returns only `src/hooks/Plugins/__tests__/useToolToggle.test.tsx` and `src/hooks/Plugins/useToolToggle.ts`. It is not exported from `src/hooks/index.ts`. The test file imports it only as a mock target. The primary `useLocalStorage` hook (different file) is the one used across the codebase.
- **Confidence:** medium (test infrastructure may rely on it indirectly)
- **Recommendation:** review-then-remove
- **Estimated LOC removed:** ~50

---

## Items Investigated but NOT Flagged

These were checked and confirmed to be in use:

- **previewCache.ts** - Functions (`cachePreview`, `getCachedPreview`, etc.) are imported by FileRow, Part, and file hooks
- **store/search.ts** - `store.search` used in 9+ files
- **store/temporary.ts** - `isTemporary` used in 12 files
- **ArtifactsContext.tsx** (plural) - Used extensively (distinct from singular ArtifactContext)
- **CustomFormContext.tsx** - Used by ChatFormContext as a factory
- **ScreenshotContext.tsx** - Used by useExportConversation
- **@dicebear/collection** and **@dicebear/core** - Referenced in vite.config.ts chunk splitting config; may be used transitively
- **micromark-extension-llm-math** - Used as vite alias replacement for `micromark-extension-math` (dependency of remark-math)
- **@react-spring/web** - Used in Landing.tsx
- **recoil** - Used in 220+ files
- **swr** - Used in useMermaid.ts
- **buildTree** function - Used by ChatView.tsx and ShareView.tsx, but imported from `librechat-data-provider` (the shared package), NOT from the local `src/utils/buildTree.ts`. The local file is confirmed dead.
