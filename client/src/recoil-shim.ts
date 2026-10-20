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

import {
  atom as jotaiAtom,
  createStore,
  Provider,
  useAtom,
  useAtomValue,
  useSetAtom,
  useStore,
} from 'jotai';
import { atomFamily as jotaiAtomFamily, RESET } from 'jotai/utils';
import type { Atom, WritableAtom, PrimitiveAtom } from 'jotai';
import { createElement, useCallback, useState } from 'react';
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

/**
 * Recoil's `set`, generic over the atom so the value type is read off the atom
 * itself. Inferring it from the write signature instead widens a resettable
 * atom's value with `typeof RESET`.
 */
export type RecoilSet = <T>(a: Atom<T>, value: SetStateAction<T>) => void;

/**
 * Storage-backed atoms expose a fresh read of localStorage under this key, so a
 * detached snapshot sees what Recoil's lazily-run effect would have seen.
 */
export const FRESH_READ: unique symbol = Symbol('recoil-shim.freshRead');

type FreshReadable<T> = { [FRESH_READ]?: () => T };

/**
 * Anything Recoil's `reset` accepts. Plain shim atoms only take a
 * `SetStateAction`, resettable Jotai atoms take `RESET`; `resetToDefault`
 * handles both at runtime.
 */
export type Resettable<T> =
  | WritableAtom<T, [SetStateAction<T>], void>
  | WritableAtom<T, [typeof RESET], void>;

/**
 * Recoil passes a `DefaultValue` instance to a selector's `set` when the caller
 * resets it; upstream setters test for it with `instanceof` before writing.
 */
export class DefaultValue {}

/** The `initializeState` argument of `RecoilRoot`, as upstream specs type it. */
export interface MutableSnapshot {
  set: RecoilSet;
  reset?: <T>(a: Resettable<T>) => void;
}

type ResetGet = <V>(a: Atom<V>) => V;
type ResetSet = (a: WritableAtom<unknown, [never], void>, value: never) => void;

/**
 * Recoil's `reset` restores any atom's default. Jotai honors `RESET` only on
 * resettable atoms (`atomWithReset`, `atomWithStorage`) and writes the symbol
 * itself into a primitive atom, so fall back to the atom's `init` there.
 */
function hasInit(a: object): a is { init: unknown } {
  return 'init' in a;
}

function resetToDefault(get: ResetGet, set: ResetSet, a: WritableAtom<unknown, [never], void>) {
  set(a, RESET as never);
  if (get(a) === RESET && hasInit(a)) {
    set(a, a.init as never);
  }
}

// ---------------------------------------------------------------------------
// atom({ key, default }) → jotaiAtom(default)
// ---------------------------------------------------------------------------

type OnSetHandler<T> = (newValue: T, oldValue: T, isReset: boolean) => void;

/** The subset of Recoil's `AtomEffect` surface that upstream atoms actually use. */
interface RecoilAtomEffectOpts<T> {
  node: { key: string };
  trigger: 'get' | 'set';
  setSelf: (value: T) => void;
  resetSelf: () => void;
  onSet: (handler: OnSetHandler<T>) => void;
}

type RecoilAtomEffect<T> = (opts: RecoilAtomEffectOpts<T>) => void | (() => void);

interface RecoilAtomOptions<T> {
  key: string;
  default: T;
  effects?: RecoilAtomEffect<T>[];
  effects_UNSTABLE?: RecoilAtomEffect<T>[];
}

/**
 * Builds one atom honoring Recoil `effects`. Effects run once at atom creation
 * (`trigger: 'get'`); a synchronous `setSelf` there overrides the default, and
 * `onSet` handlers fire after every write with the new and previous value, as
 * Recoil does. Writing `RESET` restores the default and reports `isReset`.
 */
function resolveUpdate<T>(update: SetStateAction<T> | typeof RESET, previous: T, fallback: T): T {
  if (update === RESET) {
    return fallback;
  }
  if (typeof update === 'function') {
    return (update as (prev: T) => T)(previous);
  }
  return update;
}

function atomWithEffects<T>(
  key: string,
  defaultValue: T,
  effects: RecoilAtomEffect<T>[],
): PrimitiveAtom<T> {
  const handlers: OnSetHandler<T>[] = [];
  let initial = defaultValue;
  let initializing = true;
  for (const effect of effects) {
    effect({
      node: { key },
      trigger: 'get',
      setSelf: (value) => {
        if (initializing) {
          initial = value;
        }
      },
      resetSelf: () => {
        if (initializing) {
          initial = defaultValue;
        }
      },
      onSet: (handler) => handlers.push(handler),
    });
  }
  initializing = false;
  const base = jotaiAtom<T>(initial);
  base.debugLabel = `${key}__base`;
  const a = jotaiAtom(
    (get) => get(base),
    (get, set, update: SetStateAction<T> | typeof RESET) => {
      const previous = get(base);
      const isReset = update === RESET;
      const next = resolveUpdate(update, previous, defaultValue);
      set(base, next);
      for (const handler of handlers) {
        handler(next, previous, isReset);
      }
    },
  ) as unknown as PrimitiveAtom<T>;
  a.debugLabel = key;
  return a;
}

export function atom<T>(options: RecoilAtomOptions<T>): PrimitiveAtom<T> {
  const effects = options.effects ?? options.effects_UNSTABLE;
  if (effects && effects.length > 0) {
    return atomWithEffects(options.key, options.default, effects);
  }
  const a = jotaiAtom<T>(options.default);
  a.debugLabel = options.key;
  return a;
}

// ---------------------------------------------------------------------------
// selector({ key, get }) → jotaiAtom((get) => ...)
// selector({ key, get, set }) → jotaiAtom(getter, setter)
// ---------------------------------------------------------------------------

type RecoilGetRecoilValue = <T>(a: Atom<T>) => T;

interface RecoilSelectorGetOpts {
  get: RecoilGetRecoilValue;
}

interface RecoilSelectorSetOpts {
  get: RecoilGetRecoilValue;
  set: RecoilSet;
  reset: <T>(a: Resettable<T>) => void;
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
  const getter = (get: <V>(a: Atom<V>) => V) => options.get({ get });

  let a: WritableAtom<T, [SetStateAction<T>], void>;

  if ('set' in options && typeof options.set === 'function') {
    const recoilSet = options.set;
    a = jotaiAtom(getter, (get, set, newValue: SetStateAction<T>) => {
      const resetFn = <V>(target: Resettable<V>) =>
        resetToDefault(get, set as never, target as never);
      recoilSet({ get, set: set as never, reset: resetFn }, newValue);
    }) as WritableAtom<T, [SetStateAction<T>], void>;
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
  effects?: RecoilAtomEffect<T>[] | ((param: P) => RecoilAtomEffect<T>[]);
  effects_UNSTABLE?: RecoilAtomEffect<T>[] | ((param: P) => RecoilAtomEffect<T>[]);
}

export function atomFamily<T, P>(
  options: RecoilAtomFamilyOptions<T, P>,
): (param: P) => PrimitiveAtom<T> {
  const family = jotaiAtomFamily((param: P) => {
    const defaultVal =
      typeof options.default === 'function'
        ? (options.default as (p: P) => T)(param)
        : options.default;
    const key = `${options.key}__${String(param)}`;
    const rawEffects = options.effects ?? options.effects_UNSTABLE;
    const effects = typeof rawEffects === 'function' ? rawEffects(param) : rawEffects;
    if (effects && effects.length > 0) {
      return atomWithEffects(key, defaultVal, effects);
    }
    const a = jotaiAtom<T>(defaultVal);
    a.debugLabel = key;
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
    const getter = (get: <V>(a: Atom<V>) => V) => options.get(param)({ get });

    let a: WritableAtom<T, [SetStateAction<T>], void>;

    if (options.set) {
      const recoilSet = options.set;
      a = jotaiAtom(getter, (get, set, newValue: SetStateAction<T>) => {
        const resetFn = <V>(target: Resettable<V>) =>
          resetToDefault(get, set as never, target as never);
        recoilSet(param)({ get, set: set as never, reset: resetFn }, newValue);
      }) as WritableAtom<T, [SetStateAction<T>], void>;
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
export function useRecoilState<T>(a: Atom<T>): [T, SetterOrUpdater<T>] {
  return useAtom(a as PrimitiveAtom<T>);
}

/** Drop-in for `useRecoilValue(atom)` → `useAtomValue(atom)` */
export function useRecoilValue<T>(a: Atom<T>): T {
  return useAtomValue(a);
}

/** Drop-in for `useSetRecoilState(atom)` → `useSetAtom(atom)` */
export function useSetRecoilState<T>(a: Atom<T>): SetterOrUpdater<T> {
  return useSetAtom(a as PrimitiveAtom<T>);
}

/** Drop-in for `useResetRecoilState(atom)` → `useResetAtom(atom)` */
export function useResetRecoilState<T>(a: Resettable<T>): Resetter {
  const store = useStore();
  return useCallback(() => resetToDefault(store.get, store.set as never, a as never), [store, a]);
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
    set: RecoilSet;
    reset: <T>(a: Resettable<T>) => void;
    snapshot: {
      getPromise: <T>(a: Atom<T>) => Promise<T>;
      getLoadable: <T>(a: Atom<T>) => RecoilLoadable<T>;
    };
  }) => (...args: Args) => Result,
  deps: unknown[] = [],
): (...args: Args) => Result {
  const store = useStore();

  /**
   * Recoil keys the returned callback on `deps` alone and ignores `fn`'s
   * identity, so callers pass an inline arrow and still get a stable
   * reference. Reproducing that is load-bearing, not a nicety: upstream code
   * puts the result straight into a `useEffect` dependency array, and an
   * unstable callback there re-fires the effect on every render — an infinite
   * loop as soon as that effect writes an atom.
   */
  /* eslint-disable react-hooks/exhaustive-deps */
  return useCallback(
    (...args: Args) => {
      const get = <T>(a: Atom<T>) => store.get(a);
      const set: RecoilSet = (a, v) => store.set(a as never, v as never);
      const reset = <T>(a: Resettable<T>) =>
        resetToDefault(store.get, store.set as never, a as never);
      const snapshot = {
        getPromise: async <T>(a: Atom<T>) => store.get(a),
        getLoadable: <T>(a: Atom<T>) => makeLoadable(store.get(a)),
      };
      return fn({ get, set, reset, snapshot })(...args);
    },
    [store, ...deps],
  ) as (...args: Args) => Result;
  /* eslint-enable react-hooks/exhaustive-deps */
}

// ---------------------------------------------------------------------------
// RecoilRoot — pass-through, Jotai uses Provider from jotai at the app root
// ---------------------------------------------------------------------------

/**
 * Drop-in for `<RecoilRoot>`, which upstream specs use both to seed atoms via
 * `initializeState` and — just as often — to get a clean slate per render. Each
 * root therefore gets its own Jotai store, reproducing both halves: the seed is
 * applied before first render, and sibling roots never see each other's writes.
 *
 * Isolation requires that state modules never bind `getDefaultStore()` at module
 * scope, or their writes land in the default store while a Provider-scoped read
 * looks elsewhere. `store/agents.ts` was lifted onto `useStore()` for exactly
 * that reason; `store/usage.ts` still calls it from the non-hook
 * `hydrateSnapshots`, which is why that one is worth watching if a spec ever
 * reads hydrated usage through a root.
 */
export function RecoilRoot({
  children,
  initializeState,
}: {
  children: React.ReactNode;
  initializeState?: (snapshot: MutableSnapshot) => void;
}) {
  /** Recoil seeds once at mount, before the first render of its children. */
  const [store] = useState(() => {
    const created = createStore();
    initializeState?.({
      set: (a, value) => created.set(a as never, value as never),
      reset: (a) => resetToDefault(created.get, created.set as never, a as never),
    });
    return created;
  });
  return createElement(Provider, { store }, children);
}

/**
 * Recoil's `snapshot_UNSTABLE`: a detached read of atom values. Each call gets
 * its own store, so a `getOnInit` storage atom re-reads localStorage here, which
 * is what the store specs rely on.
 */
export function snapshot_UNSTABLE(initializeState?: (snapshot: MutableSnapshot) => void) {
  const store = createStore();
  initializeState?.({
    set: (a, value) => store.set(a as never, value as never),
    reset: (a) => resetToDefault(store.get, store.set as never, a as never),
  });
  const read = <T>(a: Atom<T>) => {
    const fresh = (a as FreshReadable<T>)[FRESH_READ];
    return fresh ? fresh() : store.get(a);
  };
  return {
    getLoadable: <T>(a: Atom<T>) => makeLoadable(read(a)),
    getPromise: async <T>(a: Atom<T>) => read(a),
  };
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
