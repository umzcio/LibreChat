# Post-Migration Residual Scan: Recoil Ghost Hunt

**Date:** 2026-04-04
**Scope:** Entire `/projects/LibreEco/LibreChat/` tree
**Agent:** 01 (Ghost Hunter)

---

## Executive Summary

The Recoil-to-Jotai migration is **structurally complete**. Zero Recoil imports, hooks, or types remain in source code. All 103 original atoms have been accounted for (97 migrated to Jotai, 6 confirmed dead and removed). Two actionable issues were found: a stale lockfile entry and 9 stale comments referencing Recoil as if it were still in use.

---

## 1. Hard References

### 1.1 `import from 'recoil'` in .ts/.tsx/.js/.jsx files
**Result: ZERO matches.** Clean.

### 1.2 `recoil` in package.json (all workspaces)
**Result: ZERO matches.** Removed from all `package.json` files.

### 1.3 Recoil types (`RecoilState`, `RecoilValue`, `RecoilLoadable`, `RecoilRoot`)
**Result: ZERO matches** in source code.

### 1.4 Recoil hooks (`useRecoilState`, `useRecoilValue`, `useSetRecoilState`, `useRecoilCallback`, `useResetRecoilState`)
**Result: ZERO matches** in source code.

### 1.5 `recoil` in lockfile
**Result: FOUND.** See Residual #1 below.

---

## 2. Soft References (Comments & Documentation)

Nine comments in source files still reference Recoil as though it is the current state management library. These are cosmetic but misleading for future contributors.

### Residual: stale-comment
- **Location:** `client/vite.config.ts:15`
- **Content:** `* consuming module (e.g. recoil) is hoisted to the monorepo root, Vite 7's ESM resolver walks up`
- **Action needed:** update -- change `recoil` example to a current dependency (e.g. `jotai`) since recoil is no longer installed

### Residual: stale-comment
- **Location:** `client/src/components/System/WakeLockManager.tsx:19`
- **Content:** `@see anySubmittingSelector - Recoil selector tracking if any conversation is generating`
- **Action needed:** update -- change "Recoil selector" to "Jotai derived atom"

### Residual: stale-comment
- **Location:** `client/src/components/Agents/tests/MarketplaceContext.spec.tsx:21`
- **Content:** `// Mock useChatHelpers to avoid Recoil dependency`
- **Action needed:** update -- change "Recoil" to "Jotai"

### Residual: stale-comment
- **Location:** `client/src/components/UnifiedSidebar/UnifiedSidebar.tsx:27`
- **Content:** `Isolates useChatHelpers Recoil subscriptions from the sidebar layout.`
- **Action needed:** update -- change "Recoil subscriptions" to "Jotai subscriptions"

### Residual: stale-comment
- **Location:** `client/src/components/UnifiedSidebar/UnifiedSidebar.tsx:30`
- **Content:** `This works because Recoil subscriptions don't propagate to parent components.`
- **Action needed:** update -- change "Recoil subscriptions" to "Jotai subscriptions" (note: Jotai subscriptions also do not propagate to parents, so the statement remains accurate)

### Residual: stale-comment
- **Location:** `client/src/hooks/Messages/useConversationUIResources.ts:48`
- **Content:** `// Collect from in-flight messages (Recoil state during streaming - only when we have a conversationId)`
- **Action needed:** update -- change "Recoil state" to "Jotai state"

### Residual: stale-comment
- **Location:** `client/src/hooks/Chat/useChatHelpers.ts:29`
- **Content:** `Falling back to conversationId (Recoil) only if paramId is not available`
- **Action needed:** update -- change "(Recoil)" to "(Jotai)" or remove the parenthetical

### Residual: stale-comment
- **Location:** `client/src/hooks/useLocalizedConfig.ts:8`
- **Content:** `Automatically retrieves the current language from Recoil state.`
- **Action needed:** update -- change "Recoil state" to "Jotai state"

### Residual: stale-comment
- **Location:** `client/src/components/Share/ShareMessagesProvider.tsx:17`
- **Content:** `need to check Recoil state for in-flight messages during streaming.`
- **Action needed:** update -- change "Recoil state" to "Jotai state"

---

## 3. Ghost Atoms

### 3.1 Dead atoms (6) -- confirmed removed

The final report states 6 atoms were identified as dead and removed in Phase 1. Verification:

| Dead Atom | Original File | Current Status | Verified |
|-----------|--------------|----------------|----------|
| `submission` | `submission.ts` | File exports `{}` -- atom removed | YES |
| `isSubmitting` | `submission.ts` | File exports `{}` -- atom removed | YES |
| `endpointsConfig` | `endpoints.ts` | File exports `{}` -- atom removed | YES |
| `endpointsQueryEnabled` | `endpoints.ts` | File exports `{}` -- atom removed | YES |
| `endpointsFilter` | `endpoints.ts` | File exports `{}` -- atom removed | YES |
| `activeProjectId` | `project.ts` | File exports `{}` -- atom removed | YES |

Note: `submission.ts`, `endpoints.ts`, and `project.ts` are now empty modules exporting `{}` or `export {}`. These files could be deleted entirely, but they are harmless as-is and the barrel `index.ts` still spreads them (spreading an empty object is a no-op).

### 3.2 Migrated atoms (97) -- Jotai equivalents verified

All store files now import exclusively from `jotai` and `jotai/utils`. The following files contain Jotai atom definitions:

| Store File | Jotai Imports | Status |
|-----------|--------------|--------|
| `families.ts` | `atom`, `atomFamily`, `RESET`, `useStore`, `useAtomValue`, `useSetAtom` | Migrated (29 atoms/selectors/families) |
| `agents.ts` | `atom`, `getDefaultStore`, `atomFamily` | Migrated (1 atomFamily + 3 hooks) |
| `artifacts.ts` | `atom`, `atomWithReset` | Migrated (5 atoms) |
| `settings.ts` | `atom` + `createStorageAtom` from jotai-utils | Migrated (42 atoms) |
| `misc.ts` | `atom`, `atomFamily` | Migrated (5 atoms) |
| `prompts.ts` | `atom` + `createStorageAtom` | Migrated (7 atoms) |
| `user.ts` | `atom` | Migrated (2 atoms) |
| `search.ts` | `atom` | Migrated (1 atom) |
| `preset.ts` | `atom` | Migrated (2 atoms) |
| `language.ts` | `createStorageAtom` | Migrated (1 atom) |
| `temporary.ts` | `createStorageAtom` | Migrated (2 atoms) |
| `mcp.ts` | `atom`, `atomFamily`, `atomWithStorage` | Pre-existing Jotai (3 atoms) |
| `favorites.ts` | `createTabIsolatedAtom` | Pre-existing Jotai (1 atom) |
| `fontSize.ts` | `createStorageAtomWithEffect` | Pre-existing Jotai (1 atom) |
| `showThinking.ts` | `createStorageAtom` | Pre-existing Jotai (1 atom) |

**Total accounted for: 97 migrated + 6 dead = 103. Matches census exactly.**

No ghost atoms found -- every original Recoil atom either has a Jotai equivalent or was intentionally removed.

---

## 4. Lockfile Check

### Residual: stale-lockfile-entry
- **Location:** `bun.lock:207`
- **Content:** `"recoil": "^0.7.7"` listed as a direct dependency in the client workspace section
- **Action needed:** remove -- run `bun install` (or equivalent) to regenerate the lockfile now that `recoil` is removed from `package.json`. This will also remove the resolved entry at `bun.lock:4312` and the transitive `hamt_plus` dependency.

### Residual: stale-lockfile-entry
- **Location:** `bun.lock:4312`
- **Content:** `"recoil": ["recoil@0.7.7", "", { "dependencies": { "hamt_plus": "1.0.2" }, ... }]` -- resolved package entry
- **Action needed:** remove -- will be cleaned up automatically when the lockfile is regenerated (see above)

---

## 5. Summary Table

| Category | Findings | Action Items |
|----------|----------|-------------|
| Hard references (imports, hooks, types) | 0 | None |
| package.json entries | 0 | None |
| Lockfile entries | 2 (direct + resolved) | Regenerate `bun.lock` |
| Stale comments | 9 | Update "Recoil" to "Jotai" |
| Ghost atoms (missing Jotai equivalents) | 0 | None |
| Dead atom cleanup (empty modules) | 3 files | Optional: delete empty store modules |

**Total residuals: 11 (2 lockfile + 9 comments)**
**Blocking issues: 1 (lockfile still installs recoil)**
**Migration completeness: 100% (103/103 atoms accounted for)**
