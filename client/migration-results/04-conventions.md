# Recoil-to-Jotai Migration Conventions

**Date:** 2026-04-04
**Agent:** 4 (SCAFFOLDER)

---

## 1. Atom File Layout

Jotai atoms live in the same `src/store/` directory structure as the Recoil atoms they replace. Each store file retains its name (`search.ts`, `settings.ts`, etc.) and its default export shape. No new directories are introduced.

## 2. Naming Convention

Keep existing variable names unchanged. Consumers import atoms via the barrel (`store.search`, `store.user`, etc.), so the exported name is the public API -- not the Recoil `key` string. Recoil `key` strings are dropped entirely since Jotai atoms are identified by reference.

## 3. Import Patterns

```typescript
import { atom } from 'jotai';                    // core primitives
import { useAtom, useAtomValue, useSetAtom } from 'jotai';  // hooks
import { atomWithReset, atomWithStorage, RESET } from 'jotai/utils';  // utilities
```

Do not import from `jotai/react` or `jotai/vanilla` -- use the top-level re-exports.

## 4. Provider Strategy

Jotai already runs **provider-less** in this codebase (no `<Provider>` mounted). All migrated atoms use the default implicit store. This does not change. `RecoilRoot` remains active during coexistence and is removed only in the final cleanup unit (Unit 20).

## 5. Coexistence Model

During incremental migration, both `RecoilRoot` and the Jotai default store are active simultaneously. A single component may consume both Recoil atoms (via `useRecoilValue`) and Jotai atoms (via `useAtomValue`). The `ToggleSwitch` bridge component handles the dual-library pattern for settings toggles and is removed last.

## 6. Debug Labels

Every migrated atom must have a `debugLabel` set immediately after creation:

```typescript
const search = atom<SearchState>({ ... });
search.debugLabel = 'search';
export default { search };
```

This provides parity with Recoil's `key` for devtools and debugging.

## 7. Storage Atoms

The existing `createStorageAtom` from `src/store/jotai-utils.ts` replaces Recoil's `atomWithLocalStorage` from `src/store/utils.ts`. The API is:

```typescript
// Recoil (BEFORE)
import { atomWithLocalStorage } from './utils';
const lang = atomWithLocalStorage<string>('lang', defaultLang);

// Jotai (AFTER)
import { createStorageAtom } from './jotai-utils';
const lang = createStorageAtom<string>('lang', defaultLang);
```

For atoms with side effects on write, use `createStorageAtomWithEffect` from the same file.

## 8. Type Migration

| Recoil Type | Jotai Equivalent | Notes |
|---|---|---|
| `RecoilState<T>` | `PrimitiveAtom<T>` (from `jotai`) | For writable atoms passed as props |
| `SetterOrUpdater<T>` | `(value: T \| ((prev: T) => T)) => void` | Inline or local type alias |
| `atom<T>({ key, default })` | `atom<T>(default)` | Drop key, add debugLabel |
| `atomFamily<T, P>(opts)` | `atomFamily<T, P>(param => atom(default))` (from `jotai/utils`) | |
| `selector<T>({ key, get })` | `atom<T>((get) => ...)` | Derived read-only atom |
| `selectorFamily<T, P>` | `atomFamily<T, P>(param => atom(get => ...))` | |

## 9. Hook Translation Quick Reference

| Recoil Hook | Jotai Hook | Import From |
|---|---|---|
| `useRecoilState` | `useAtom` | `jotai` |
| `useRecoilValue` | `useAtomValue` | `jotai` |
| `useSetRecoilState` | `useSetAtom` | `jotai` |
| `useResetRecoilState` | `useSetAtom` + `RESET` | `jotai` + `jotai/utils` |
| `useRecoilCallback` | `useCallback` + `store.get`/`store.set` | `jotai` |

## 10. Import Ordering

Follow the project convention from `CLAUDE.md`:

1. **Package imports** -- sorted shortest to longest (`react` first)
2. **`import type` imports** -- sorted longest to shortest (package types first, then local)
3. **Local/project imports** -- sorted longest to shortest

When replacing `import { useRecoilValue } from 'recoil'` with `import { useAtomValue } from 'jotai'`, the new import takes the same position in the package imports section, sorted by line length.
