/**
 * Recoil compatibility shim — maps Recoil's public API to Jotai equivalents.
 *
 * This module is aliased as 'recoil' in vite.config.ts so that upstream code
 * which imports from 'recoil' transparently resolves to Jotai. This eliminates
 * the need for manual Recoil→Jotai conversion after every upstream merge.
 *
 * Coverage:
 *   Hooks  — useRecoilState, useRecoilValue, useSetRecoilState,
 *            useResetRecoilState, useRecoilCallback
 *   Core   — atom, selector, atomFamily, selectorFamily, RecoilRoot
 *   Types  — RecoilState, SetterOrUpdater, Resetter
 */

import { atom as jotaiAtom, useAtom, useAtomValue, useSetAtom, useStore } from 'jotai';
import { atomFamily as jotaiAtomFamily, RESET, useResetAtom } from 'jotai/utils';
import type { WritableAtom, PrimitiveAtom } from 'jotai';
import type { SetStateAction } from 'react';

// ---------------------------------------------------------------------------
// Type aliases — drop-in replacements for Recoil's exported types
// ---------------------------------------------------------------------------

/** Equivalent to Recoil's `RecoilState<T>` */
export type RecoilState<T> = WritableAtom<T, [SetStateAction<T>], void>;

/** Equivalent to Recoil's `SetterOrUpdater<T>` */
export type SetterOrUpdater<T> = (valOrUpdater: SetStateAction<T>) => void;

/** Equivalent to Recoil's `Resetter` */
export type Resetter = () => void;

// ---------------------------------------------------------------------------
// atom({ key, default }) → jotaiAtom(default)
// ---------------------------------------------------------------------------

interface RecoilAtomOptions<T> {
  key: string;
  default: T;
  effects?: unknown[];
  effects_UNSTABLE?: unknown[];
}

export function atom<T>(options: RecoilAtomOptions<T>): PrimitiveAtom<T> {
  const a = jotaiAtom<T>(options.default);
  a.debugLabel = options.key;
  return a;
}

// ---------------------------------------------------------------------------
// selector({ key, get }) → jotaiAtom((get) => ...)
// selector({ key, get, set }) → jotaiAtom(getter, setter)
// ---------------------------------------------------------------------------

type RecoilGetRecoilValue = <T>(a: WritableAtom<T, never[], unknown>) => T;

interface RecoilSelectorGetOpts {
  get: RecoilGetRecoilValue;
}

interface RecoilSelectorSetOpts {
  get: RecoilGetRecoilValue;
  set: <T>(a: WritableAtom<T, [SetStateAction<T>], void>, v: T | SetStateAction<T>) => void;
  reset: <T>(a: WritableAtom<T, [typeof RESET], void>) => void;
}

interface RecoilSelectorReadOnly<T> {
  key: string;
  get: (opts: RecoilSelectorGetOpts) => T;
}

interface RecoilSelectorReadWrite<T> {
  key: string;
  get: (opts: RecoilSelectorGetOpts) => T;
  set: (opts: RecoilSelectorSetOpts, newValue: T | SetStateAction<T>) => void;
}

export function selector<T>(
  options: RecoilSelectorReadOnly<T> | RecoilSelectorReadWrite<T>,
): WritableAtom<T, [SetStateAction<T>], void> {
  const getter = (get: <V>(a: WritableAtom<V, never[], unknown>) => V) =>
    options.get({ get });

  let a: WritableAtom<T, [SetStateAction<T>], void>;

  if ('set' in options && typeof options.set === 'function') {
    const recoilSet = options.set;
    a = jotaiAtom(
      getter,
      (get, set, newValue: SetStateAction<T>) => {
        const resetFn = <V>(target: WritableAtom<V, [typeof RESET], void>) =>
          set(target, RESET as never);
        recoilSet(
          { get, set: set as never, reset: resetFn },
          newValue,
        );
      },
    ) as WritableAtom<T, [SetStateAction<T>], void>;
  } else {
    a = jotaiAtom(getter) as WritableAtom<T, [SetStateAction<T>], void>;
  }

  a.debugLabel = options.key;
  return a;
}

// ---------------------------------------------------------------------------
// atomFamily(options) → jotaiAtomFamily(param => jotaiAtom(default))
// ---------------------------------------------------------------------------

interface RecoilAtomFamilyOptions<T, P> {
  key: string;
  default: T | ((param: P) => T);
}

export function atomFamily<T, P>(
  options: RecoilAtomFamilyOptions<T, P>,
): (param: P) => PrimitiveAtom<T> {
  const family = jotaiAtomFamily((param: P) => {
    const defaultVal =
      typeof options.default === 'function'
        ? (options.default as (p: P) => T)(param)
        : options.default;
    const a = jotaiAtom<T>(defaultVal);
    a.debugLabel = `${options.key}__${String(param)}`;
    return a;
  });
  return family;
}

// ---------------------------------------------------------------------------
// selectorFamily(options) → jotaiAtomFamily(param => jotaiAtom(getter))
// ---------------------------------------------------------------------------

interface RecoilSelectorFamilyOptions<T, P> {
  key: string;
  get: (param: P) => (opts: RecoilSelectorGetOpts) => T;
  set?: (param: P) => (opts: RecoilSelectorSetOpts, newValue: T | SetStateAction<T>) => void;
}

export function selectorFamily<T, P>(
  options: RecoilSelectorFamilyOptions<T, P>,
): (param: P) => WritableAtom<T, [SetStateAction<T>], void> {
  const family = jotaiAtomFamily((param: P) => {
    const getter = (get: <V>(a: WritableAtom<V, never[], unknown>) => V) =>
      options.get(param)({ get });

    let a: WritableAtom<T, [SetStateAction<T>], void>;

    if (options.set) {
      const recoilSet = options.set;
      a = jotaiAtom(
        getter,
        (get, set, newValue: SetStateAction<T>) => {
          const resetFn = <V>(target: WritableAtom<V, [typeof RESET], void>) =>
            set(target, RESET as never);
          recoilSet(param)(
            { get, set: set as never, reset: resetFn },
            newValue,
          );
        },
      ) as WritableAtom<T, [SetStateAction<T>], void>;
    } else {
      a = jotaiAtom(getter) as WritableAtom<T, [SetStateAction<T>], void>;
    }

    a.debugLabel = `${options.key}__${String(param)}`;
    return a;
  });
  return family;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Drop-in for `useRecoilState(atom)` → `useAtom(atom)` */
export function useRecoilState<T>(
  a: WritableAtom<T, [SetStateAction<T>], void>,
): [T, SetterOrUpdater<T>] {
  return useAtom(a);
}

/** Drop-in for `useRecoilValue(atom)` → `useAtomValue(atom)` */
export function useRecoilValue<T>(a: WritableAtom<T, never[], unknown>): T {
  return useAtomValue(a);
}

/** Drop-in for `useSetRecoilState(atom)` → `useSetAtom(atom)` */
export function useSetRecoilState<T>(
  a: WritableAtom<T, [SetStateAction<T>], void>,
): SetterOrUpdater<T> {
  return useSetAtom(a);
}

/** Drop-in for `useResetRecoilState(atom)` → `useResetAtom(atom)` */
export function useResetRecoilState<T>(
  a: WritableAtom<T, [typeof RESET], void>,
): Resetter {
  return useResetAtom(a);
}

/**
 * Drop-in for `useRecoilCallback`.
 *
 * Recoil signature: useRecoilCallback(({get, set, reset, snapshot}) => (...args) => result, deps)
 * We map to Jotai's store.get / store.set.
 */
type RecoilLoadable<T> = {
  state: 'hasValue' | 'loading' | 'hasError';
  contents: T;
  valueMaybe: () => T | undefined;
  valueOrThrow: () => T;
  getValue: () => T;
};

function makeLoadable<T>(value: T): RecoilLoadable<T> {
  return {
    state: 'hasValue',
    contents: value,
    valueMaybe: () => value,
    valueOrThrow: () => value,
    getValue: () => value,
  };
}

export function useRecoilCallback<Args extends unknown[], Result>(
  fn: (iface: {
    get: RecoilGetRecoilValue;
    set: <T>(a: WritableAtom<T, [SetStateAction<T>], void>, v: T | SetStateAction<T>) => void;
    reset: <T>(a: WritableAtom<T, [typeof RESET], void>) => void;
    snapshot: {
      getPromise: <T>(a: WritableAtom<T, never[], unknown>) => Promise<T>;
      getLoadable: <T>(a: WritableAtom<T, never[], unknown>) => RecoilLoadable<T>;
    };
  }) => (...args: Args) => Result,
  deps?: unknown[],
): (...args: Args) => Result {
  const store = useStore();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return ((...args: Args) => {
    const get = <T>(a: WritableAtom<T, never[], unknown>) => store.get(a);
    const set = <T>(a: WritableAtom<T, [SetStateAction<T>], void>, v: T | SetStateAction<T>) =>
      store.set(a, v);
    const reset = <T>(a: WritableAtom<T, [typeof RESET], void>) =>
      store.set(a, RESET);
    const snapshot = {
      getPromise: async <T>(a: WritableAtom<T, never[], unknown>) => store.get(a),
      getLoadable: <T>(a: WritableAtom<T, never[], unknown>) => makeLoadable(store.get(a)),
    };
    return fn({ get, set, reset, snapshot })(...args);
  }) as (...args: Args) => Result;
}

// ---------------------------------------------------------------------------
// RecoilRoot — pass-through, Jotai uses Provider from jotai at the app root
// ---------------------------------------------------------------------------

/**
 * No-op wrapper. The app already has Jotai's Provider at the root.
 * This exists so upstream code that renders `<RecoilRoot>` in tests doesn't break.
 */
export function RecoilRoot({ children }: { children: React.ReactNode }) {
  return children;
}

// ---------------------------------------------------------------------------
// Utility: isRecoilState — upstream uses this in ToggleSwitch
// ---------------------------------------------------------------------------

export function isRecoilState<T>(a: unknown): a is RecoilState<T> {
  return (
    a != null &&
    typeof a === 'object' &&
    'read' in a &&
    typeof (a as Record<string, unknown>).read === 'function'
  );
}
