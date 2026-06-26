# Recoil-to-Jotai Migration Retrospective

**Date:** 2026-04-04
**Scope:** `/projects/LibreEco/LibreChat/client/src/`

---

## 1. Scope

| Metric | Value |
|--------|-------|
| Recoil atoms/selectors at start | 103 |
| Dead atoms identified and removed | 6 |
| Atoms migrated to Jotai | 97 |
| Pre-existing Jotai atoms (unchanged) | 5 |
| Total Jotai atoms post-migration | ~102 |
| Recoil hook call sites migrated | ~680 |
| Files importing `from 'recoil'` at start | 219 |
| Files importing `from 'recoil'` at end | 0 |
| Store definition files modified | 14 |
| Consumer files modified | ~170 |
| Test files modified | ~32 |
| Total files modified | ~216 |
| Lines of code changed (estimated) | ~3,000+ |

### Atom Breakdown by Type

| Type | Count |
|------|-------|
| Simple atoms (no effects) | 20 |
| localStorage atoms (`atomWithLocalStorage` -> `createStorageAtom`) | 42 |
| Atom families (`atomFamily` -> Jotai `atomFamily`) | 17 |
| Selectors (`selector` -> derived `atom`) | 4 |
| Selector families (`selectorFamily` -> `atomFamily` + derived) | 8 |
| Custom hooks with `useRecoilCallback` (-> `useStore`/`getDefaultStore`) | 11 |

---

## 2. Timeline

### Phase 1: Census, Planning, and Pilot

- **Census:** Cataloged all 103 Recoil atoms across 14 store files, 680 hook call sites across 219 consumer files, and the complete dependency graph.
- **Translation guide:** Documented 1:1 mappings for all Recoil APIs to Jotai equivalents.
- **Migration plan:** Organized atoms into 20 migration units across 4 phases, ordered by risk level (1-4).
- **Conventions:** Established coding patterns (`debugLabel`, `createStorageAtom`, RESET handling).
- **Pilot:** Migrated `search-state` (1 atom, 9 call sites, 9 consumer files) plus removed 6 dead atoms. Confirmed the mechanical nature of hook translation and validated coexistence.
- **Units 4-5:** Migrated `settings-static` (4 atoms) and `preset-state` (2 atoms).

### Phase 2: Risk-2 Bulk Migration (Units 6-12)

- Migrated 7 units covering simple atoms and localStorage atoms.
- Key units: `artifacts-state` (5 atoms with logging effects), `user-state` (2 atoms including auth-critical `user`), `prompts-state` (7 atoms, 35 call sites), `settings-general` (11 localStorage atoms), `settings-chat-features` (12 localStorage atoms).
- `settings.ts` reached zero Recoil imports by end of this phase.

### Phase 3: Effects and Selectors (Units 13-16)

- Tackled Risk-3 patterns: selector families, atom families, complex consumer files.
- `misc-state`: Converted `conversationAttachmentsSelector` (selectorFamily -> atomFamily + derived atom).
- `settings-speech`: Largest single unit -- 16 atoms, 89 call sites, ~31 files.
- `input-popovers`: 4 atom families, introduced Jotai `atomFamily` aliasing to coexist with remaining Recoil families.
- `audio-families`: 5 atom families. `useClearStates.ts` accumulated Jotai store resets for all 9 migrated families.

### Phase 4: Core State and Final Cleanup (Units 17-20)

- `agents-state`: 1 atomFamily + 3 custom hooks with `snapshot.getPromise`/`getLoadable` patterns, converted to synchronous `store.get()`.
- `conversation-families`: The core of the application -- 29 atoms/selectors/families including the complex `conversationByIndex` with its write-through localStorage/URL-param effects.
- Replaced Recoil types (`RecoilState`, `SetterOrUpdater`) with Jotai equivalents in shared type definitions.
- Removed `ToggleSwitch` bridge component (no longer needed).
- Removed `<RecoilRoot>` from `App.jsx`.
- Updated test harness and all 32 test files (24 using `<RecoilRoot>`, 8 mocking `recoil`).
- Removed `recoil` from `package.json`.

### Post-Migration Stabilization

- **Agent 1 (Ghost Hunter):** Verified 0 hard Recoil references remain. Found 9 stale comments and stale lockfile entry.
- **Agent 2 (Stress Tester):** Full type check (111 errors, all pre-existing), full test suite (1462/1462 passing), behavioral audit of all critical patterns (effects timing, RESET, store access, atomFamily cleanup).
- **Agent 4 (Documenter):** Deleted 3 empty store modules (`submission.ts`, `endpoints.ts`, `project.ts`), fixed all 9 stale Recoil comments, verified clean lockfile.

---

## 3. Issues Encountered

### 3.1 Atom Family Naming Collision
During Phase 3, `families.ts` needed both Recoil `atomFamily` and Jotai `atomFamily` simultaneously. Resolved by aliasing the Jotai import as `jotaiAtomFamily` during coexistence, removed after Phase 4.

### 3.2 Multi-Phase Bridging in `useClearStates.ts`
This file resets atom families from multiple migration units. During Phases 3-4, it needed to reset both Jotai and Recoil atoms simultaneously. Used `getDefaultStore()` for imperative Jotai resets inside `useRecoilCallback`, simplified to pure Jotai in Phase 4.

### 3.3 Complex `conversationByIndex` Effects
The most complex atom in the codebase -- `onSet` effect performs localStorage sync and URL parameter updates. Converted to a write-through derived atom pattern in Jotai, which is actually more reliable (synchronous vs Recoil's sometimes-async `onSet`).

### 3.4 Snapshot Pattern Translation
11 locations used `snapshot.getPromise`/`snapshot.getLoadable` for imperative atom reads. Replaced with synchronous `store.get(atom)` via `getDefaultStore()`. The sync-vs-async difference was a net improvement.

### 3.5 Type Replacements in Shared Interfaces
`RecoilState<boolean>` and `SetterOrUpdater<T>` types were embedded in shared type definitions (`src/common/types.ts`) and component props. Required careful replacement with Jotai's `WritableAtom` and equivalent setter types.

---

## 4. What Worked Well

1. **The barrel export pattern (`store.X`) made migration transparent.** Consumers import atoms via `store.atomName` -- they don't care whether the underlying atom is Recoil or Jotai. Only the hook call (`useRecoilValue` -> `useAtomValue`) changes.

2. **Mechanical hook translation.** For simple atoms, the work was purely mechanical: swap the import source and hook name. No logic changes needed. The updater-function pattern (`setState((prev) => ...)`) works identically in both libraries.

3. **Safe coexistence.** Recoil and Jotai coexisted without issues throughout the migration. `RecoilRoot` and Jotai's provider-less mode operated independently. Mixed imports in the same file caused no problems.

4. **Pre-existing Jotai infrastructure.** The codebase already had `createStorageAtom`, `createStorageAtomWithEffect`, and `createTabIsolatedAtom` utilities from earlier Jotai adoption (MCP, favorites, fontSize). The 42 localStorage atoms mapped directly to `createStorageAtom`.

5. **Comprehensive census before starting.** The full atom catalog with dependency graph, effect types, and consumer counts made planning deterministic. No surprises emerged during execution.

6. **Unit-based migration with dependency ordering.** Grouping atoms into 20 units by feature domain and ordering by risk level (simple atoms first, families last) minimized coexistence complexity.

7. **Type check and test suite as regression gates.** Running `tsc --noEmit` and `jest` after each phase caught issues immediately. Zero migration-related regressions were introduced.

---

## 5. What We'd Do Differently

1. **Delete dead atoms immediately rather than leaving empty files.** The pilot left `submission.ts`, `endpoints.ts`, and `project.ts` as empty modules "to avoid breaking transitive imports." They were already removed from the barrel -- there was nothing to break. This created unnecessary cleanup work in stabilization.

2. **Migrate `useClearStates.ts` last.** This file is a cross-cutting concern that resets atoms from many units. Migrating its dependencies incrementally created a multi-phase bridging pattern (`getDefaultStore()` inside `useRecoilCallback`). Deferring it entirely to the final phase would have been simpler.

3. **Track stale comments during migration.** The 9 Recoil comments found in stabilization could have been caught and fixed during the phase that modified each file. Adding a grep-for-stale-comments step to the per-unit checklist would eliminate this cleanup pass.

4. **Remove `bun.lock` or regenerate it.** The project uses npm, but `bun.lock` was left stale with recoil references. Either delete the file or ensure it stays in sync.

5. **Consider migrating the `ToggleSwitch` bridge component earlier.** The dual Recoil/Jotai bridge in `ToggleSwitch.tsx` added runtime type detection complexity. Once the majority of atoms were migrated (end of Phase 2), it could have been simplified to Jotai-only rather than waiting for Phase 4.

---

## 6. Remaining Technical Debt

### 6.1 Jotai Optimizations Available

These are improvements enabled by Jotai's architecture, not regressions from the migration:

| Opportunity | Impact | Effort |
|-------------|--------|--------|
| `selectAtom` for granular field subscriptions (especially `conversationByIndex`) | High -- reduces re-renders when only one field changes | Low |
| `jotai-devtools` integration | Medium -- improves debugging DX | Low |
| `atomFamily.remove()` in clear functions instead of resetting to defaults | Low -- reduces memory from cached family instances | Low |
| `splitAtom` for list management (badges, banners) | Low | Medium |
| Per-conversation `<Provider>` scoping | High -- true isolation between conversation panels | High |
| `focusAtom` with optics for nested state | Medium | Medium |

### 6.2 Pre-existing Type Errors (111)

All 111 `tsc --noEmit` errors predate the migration. Categories: missing module declarations (~15), data provider type drift (~30), component prop mismatches (~12), test file type mismatches (~20), unrelated code issues (~34). None are in migration-modified files.

### 6.3 Test Warning: "Detected multiple Jotai instances"

Appears during tests because `getDefaultStore()` in `src/store/agents.ts` loads Jotai through multiple module resolution paths in the test environment. Not a production issue (single bundled instance). Could be resolved by using `useStore()` from a Provider instead of `getDefaultStore()`.

### 6.4 Stale `bun.lock`

The `bun.lock` file still references `recoil@0.7.7` and its `hamt_plus` transitive dependency. `bun` is not installed on this server. Either install bun and regenerate, or delete `bun.lock` if npm is the canonical package manager.

---

## 7. Bundle Size Impact

| Library | Size (minified) | Status |
|---------|----------------|--------|
| Recoil | ~80 KB | **Removed** |
| Jotai | ~8 KB | Already installed (no new addition) |
| **Net reduction** | **~72 KB** | From client bundle |

Recoil was the heavier library due to its snapshot system, batching infrastructure, and graph-based dependency tracking. Jotai's minimal atom-based architecture achieves the same functionality at roughly 1/10th the size. The `hamt_plus` transitive dependency (~4 KB) was also removed with Recoil.

---

## 8. Final Verification

| Check | Result |
|-------|--------|
| `grep -r "from 'recoil'" src/` | 0 matches |
| `grep -rn "Recoil" src/ --include='*.ts' --include='*.tsx'` | 0 matches |
| `tsc --noEmit` | 111 errors (all pre-existing, 0 migration-related) |
| `jest --no-coverage` | 1462/1462 tests passing |
| Empty store modules deleted | `submission.ts`, `endpoints.ts`, `project.ts` removed |
| Stale comments fixed | 9/9 updated to reference Jotai |
| `package-lock.json` clean | No recoil references |
| Dead atoms accounted for | 6 removed, 97 migrated = 103 total (matches census) |

**Migration status: COMPLETE.**
