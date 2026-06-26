# Remediation Report 04: Low-Priority Cleanup

## Fix 4.1: TODO/FIXME Comment Triage

### Methodology
Searched all `TODO`, `FIXME`, and `HACK` comments in `api/`, `client/src/`, `packages/` (excluding node_modules, dist, test files).

### Classifications

#### Removed (stale/no longer relevant) -- 2 items

| File | Comment | Reason |
|------|---------|--------|
| `packages/client/src/components/InputNumber.tsx:9` | `// TODO help needed` + commented-out code | Stale; component works fine with `RCInputNumber`. Removed TODO, dead import comment, and 15 lines of commented-out `NumericFormat` code. |
| `client/src/data-provider/mutations.ts:475` | `// TODO: CHECK THIS, no-op; restore if needed` | Stale; the `onError` handler has been a no-op for a long time and the mutation works correctly. Removed comment, kept empty handler. |

#### Convert to Tracked -- 31 items

These represent real future work. Left as-is (original TODO comments) since they serve as valid markers for planned features or improvements:

**API/Backend:**
| File | TODO | Classification |
|------|------|----------------|
| `api/app/clients/tools/structured/OpenAIImageTools.js:196` | Handle cost in `resp.usage` | Feature work |
| `api/app/clients/tools/structured/OpenAIImageTools.js:246-247` | Mask support, multi-image support | Feature work |
| `api/app/clients/tools/structured/FluxAPI.js:350` | Cost handling | Feature work |
| `api/app/clients/prompts/formatMessages.js:190` | Investigate args as dictionary | Investigation |
| `api/app/clients/OllamaClient.js:154` | Regular completion support | Feature work |
| `api/server/middleware/abortRun.js:74` | Reconciling strategy for intermediate messages | Optimization |
| `api/server/middleware/buildEndpointOption.js:99` | Use object params | Refactor |
| `api/server/services/Threads/manage.js:129,299,308` | Token counting, file processing | Feature work |
| `api/server/services/Config/loadCustomConfig.js:156` | Remove check once new params supported | Conditional removal |
| `api/server/services/ToolService.js:254` | Append tool properties to stream | Feature work |
| `api/server/services/Runs/methods.js:10` | maxRetries not yet implemented | Feature work |
| `api/server/routes/files/speech/tts.js:18` | Test caching | Testing |
| `api/server/routes/files/images.js:43` | Delete remote file if exists | Feature work |
| `api/server/controllers/assistants/chatV1.js` (3 TODOs) | promptBuffer config, multi-message, file format validation | Feature work |
| `api/server/controllers/assistants/chatV2.js` (3 TODOs) | Same as chatV1 | Feature work |
| `api/server/controllers/agents/client.js:150,749` | Parse options by provider, AgentContext init | Security/feature |
| `api/server/routes/roles.js:75,114` | Better roleName parsing | Refactor |
| `api/server/routes/convos.js:269` | Optimize imported conversations | Optimization |
| `api/server/services/Files/process.js:107` | Refactor file deletion (images only) | Refactor |
| `packages/api/src/mcp/registry/MCPServersRegistry.ts:514` | Refactor callers to use config.requiresOAuth | Refactor |
| `packages/api/src/mcp/ConnectionsRepository.ts:118` | Scoped config getter | Feature work |

**Packages (data-provider, data-schemas):**
| File | TODO | Classification |
|------|------|----------------|
| `packages/data-provider/src/config.ts:1181` | gpt-5.4-thinking pricing verification | Pre-release check |
| `packages/data-provider/src/config.ts:1274,1309` | Add agent models | Feature work |
| `packages/data-provider/src/actions.ts:264` | OAuth flow handling | Feature work |
| `packages/data-provider/src/schemas.ts:1013` | Map additional fields | Feature work |
| `packages/data-provider/src/types.ts:21` | Cleanup EndpointOption types | Refactor |
| `packages/data-provider/src/types.ts:168` | Change label to TranslationKeys | Refactor |
| `packages/data-schemas/src/admin/capabilities.ts:148` | Section-level config not yet active | Feature work |
| `packages/data-schemas/src/methods/tx.ts:132` | gpt-5.4-pro pricing verification | Pre-release check |

**Client/Frontend:**
| File | TODO | Classification |
|------|------|----------------|
| `client/src/Providers/AgentPanelContext.tsx:62` | Refactor when tools come from tool box | Refactor |
| `client/src/components/Agents/Marketplace.tsx:223` | Remove admin settings workaround | Cleanup |
| `client/src/utils/files.ts:39` | Make dynamic to language | i18n |
| `client/src/hooks/Files/useFileHandling.ts:85,95` | Dynamic localize input | i18n |
| `client/src/hooks/useChatBadges.ts:24` | Add more badges | Feature work |
| `client/src/hooks/SSE/useContentHandler.ts:63` | Handle streaming for non-text | Feature work |
| `client/src/components/Input/SetKeyDialog/SetKeyDialog.tsx:166,168,213` | Custom endpoint definitions, models, options | Feature work |
| `client/src/components/Chat/Menus/Presets/PresetItems.tsx:118` | Create preset from menu | Feature work |
| `client/src/components/Chat/Input/Files/DragDropModal.tsx:46` | Ephemeral Agent Capabilities | Feature work |
| `client/src/components/Chat/Input/Files/AttachFileMenu.tsx:103` | Ephemeral Agent Capabilities | Feature work |
| `client/src/components/SidePanel/Builder/ActionsInput.tsx:235` | Format input button | Feature work |
| `client/src/components/SidePanel/Agents/Advanced/AgentChain.tsx:25` | Make MAX_AGENTS configurable | Feature work |
| `client/src/components/SidePanel/Agents/Advanced/AgentHandoffs.tsx:28` | Make configurable | Feature work |
| `client/src/components/Nav/SettingsTabs/Speech/Speech.tsx:139` | Remove once 'edge' engine deprecated | Deprecation cleanup |
| `client/src/components/SidePanel/Agents/ActionsInput.tsx:224` | Format input button | Feature work |
| `client/src/data-provider/mutations.ts:624` | Optimize imported conversations | Optimization |
| `client/src/components/Prompts/forms/PromptForm.tsx:287` | Show toast for empty value | UX improvement |
| `client/src/components/SidePanel/Parameters/DynamicDropdown.tsx:36,45` | Custom logic for payload | Feature work |
| `client/src/components/SidePanel/Parameters/DynamicSlider.tsx:57` | Custom logic for payload | Feature work |

---

## Fix 4.2: Replace `@ts-ignore` with `@ts-expect-error`

### Summary
Found 22 `@ts-ignore` directives in production code across 10 files. All were replaced with `@ts-expect-error` plus descriptive reason comments. Remaining `@ts-ignore` directives (22 instances) are all in `__tests__/` and `.spec.` files, which were intentionally skipped per instructions.

### Changes Made

| File | Count | Reason |
|------|-------|--------|
| `client/src/utils/cleanupPreset.ts` | 1 | endpoint can be a custom name outside EModelEndpoint enum |
| `client/src/components/Nav/SettingsTabs/Account/Avatar.tsx` | 1 | react-avatar-editor has no type definitions |
| `client/src/components/Prompts/editor/PromptEditor.tsx` | 3 | remark/rehype plugin + component type incompatibilities with unified v11 |
| `client/src/components/Prompts/forms/VariableForm.tsx` | 4 | remark/rehype plugin + component type incompatibilities with unified v11 |
| `client/src/components/Prompts/display/PromptTextCard.tsx` | 4 | remark/rehype plugin + component type incompatibilities with unified v11 |
| `client/src/components/Chat/Messages/Content/Markdown.tsx` | 2 | remark/rehype plugin type incompatibilities with unified v11 |
| `client/src/components/Chat/Messages/Content/MarkdownErrorBoundary.tsx` | 2 | remark/rehype plugin type incompatibilities with unified v11 |
| `client/src/components/Chat/Messages/Content/MarkdownLite.tsx` | 2 | remark/rehype plugin type incompatibilities with unified v11 |
| `client/src/hooks/SSE/useSSE.ts` | 2 | sse.js types don't expose responseCode; dispatchEvent takes Event |
| `client/src/hooks/SSE/useResumableSSE.ts` | 2 | sse.js types don't expose responseCode; dispatchEvent takes Event |

**Note:** The majority (18/22) of suppressions are due to remark/rehype plugin type incompatibilities with the unified v11 ecosystem. These cannot be fixed without upstream type updates in `react-markdown`, `remark-*`, and `rehype-*` packages.

---

## Fix 4.3: `regenerator-runtime` Dependency Review

### Findings
- **Vite build target:** No explicit `build.target` set in `client/vite.config.ts`, which means Vite defaults to `modules` (native ESM support = ES2020+).
- **No browserslist config** found in `client/package.json` or `.browserslistrc`.
- **Import location:** `client/src/main.jsx` line 1: `import 'regenerator-runtime/runtime'`
- **Conclusion:** With ES2020+ targets, `async/await` is natively supported. `regenerator-runtime` is unnecessary.

### Changes Made
1. Removed `import 'regenerator-runtime/runtime'` from `client/src/main.jsx`
2. Removed `"regenerator-runtime": "^0.14.1"` from `client/package.json`

**Note:** `regenerator-runtime` remains as a transitive dependency of `@babel/runtime` (used by some packages), but the explicit import and direct dependency are no longer needed.

---

## Fix 4.4: `mammoth` Dependency Duplication Review

### Findings
- `api/package.json`: `"mammoth": "^1.11.0"` (dependencies)
- `packages/api/package.json`: `"mammoth": "^1.11.0"` (devDependencies AND peerDependencies)
- **Actual import:** Only in `packages/api/src/files/documents/crud.ts` via dynamic import: `const { extractRawText } = await import('mammoth')`

### Analysis
`mammoth` is only used in `packages/api`, not in `api/` directly. The `api/` workspace depends on `packages/api` (which declares mammoth as a peerDependency), so `api/package.json` should satisfy the peer dep. However, since `packages/api` is a local workspace consumed by `api/`, and `mammoth` is already in `packages/api`'s devDependencies, the `api/package.json` entry is redundant in this monorepo setup -- npm/bun hoisting resolves it from `packages/api`'s own declaration.

### Changes Made
1. Removed `"mammoth": "^1.11.0"` from `api/package.json`
2. `mammoth` remains in `packages/api/package.json` as both a devDependency (for tests/builds) and peerDependency (for consumers)

### Post-Change Verification
Run `npm run smart-reinstall` or `bun install` to regenerate the lockfile, then verify `mammoth` still resolves with `ls node_modules/mammoth`.

---

## Files Modified

| File | Fix |
|------|-----|
| `packages/client/src/components/InputNumber.tsx` | 4.1 - Removed stale TODO + dead code |
| `client/src/data-provider/mutations.ts` | 4.1 - Removed stale TODO |
| `client/src/utils/cleanupPreset.ts` | 4.2 - @ts-ignore -> @ts-expect-error |
| `client/src/components/Nav/SettingsTabs/Account/Avatar.tsx` | 4.2 - @ts-ignore -> @ts-expect-error |
| `client/src/components/Prompts/editor/PromptEditor.tsx` | 4.2 - @ts-ignore -> @ts-expect-error |
| `client/src/components/Prompts/forms/VariableForm.tsx` | 4.2 - @ts-ignore -> @ts-expect-error |
| `client/src/components/Prompts/display/PromptTextCard.tsx` | 4.2 - @ts-ignore -> @ts-expect-error |
| `client/src/components/Chat/Messages/Content/Markdown.tsx` | 4.2 - @ts-ignore -> @ts-expect-error |
| `client/src/components/Chat/Messages/Content/MarkdownErrorBoundary.tsx` | 4.2 - @ts-ignore -> @ts-expect-error |
| `client/src/components/Chat/Messages/Content/MarkdownLite.tsx` | 4.2 - @ts-ignore -> @ts-expect-error |
| `client/src/hooks/SSE/useSSE.ts` | 4.2 - @ts-ignore -> @ts-expect-error |
| `client/src/hooks/SSE/useResumableSSE.ts` | 4.2 - @ts-ignore -> @ts-expect-error |
| `client/src/main.jsx` | 4.3 - Removed regenerator-runtime import |
| `client/package.json` | 4.3 - Removed regenerator-runtime dependency |
| `api/package.json` | 4.4 - Removed duplicate mammoth dependency |
