# Recoil-to-Jotai Translation Guide

**Date:** 2026-04-04
**Scope:** `/projects/LibreEco/LibreChat/client/src/`
**Based on:** `01-census.md` and direct source analysis

---

## 1. Core Hook Translations

### 1.1 `useRecoilState` -> `useAtom`

**322 call sites.** Direct 1:1 replacement.

```tsx
// BEFORE (src/hooks/useNewConvo.ts)
import { useRecoilState } from 'recoil';
const [files, setFiles] = useRecoilState(store.filesByIndex(index));

// AFTER
import { useAtom } from 'jotai';
const [files, setFiles] = useAtom(store.filesByIndex(index));
```

The setter signature is identical: accepts either a value or an updater function `(prev) => next`.

### 1.2 `useRecoilValue` -> `useAtomValue`

**170 call sites.** Direct 1:1 replacement.

```tsx
// BEFORE (src/hooks/useNewConvo.ts)
import { useRecoilValue } from 'recoil';
const defaultPreset = useRecoilValue(store.defaultPreset);
const saveBadgesState = useRecoilValue<boolean>(store.saveBadgesState);

// AFTER
import { useAtomValue } from 'jotai';
const defaultPreset = useAtomValue(store.defaultPreset);
const saveBadgesState = useAtomValue(store.saveBadgesState);
```

Note: Recoil allows `useRecoilValue<T>(atom)` with an explicit type parameter. Jotai's `useAtomValue` infers the type from the atom, so the generic parameter can be dropped.

### 1.3 `useSetRecoilState` -> `useSetAtom`

**139 call sites.** Direct 1:1 replacement.

```tsx
// BEFORE (src/hooks/useNewConvo.ts)
import { useSetRecoilState } from 'recoil';
const setSubmission = useSetRecoilState<TSubmission | null>(store.submissionByIndex(index));

// AFTER
import { useSetAtom } from 'jotai';
const setSubmission = useSetAtom(store.submissionByIndex(index));
```

### 1.4 `useResetRecoilState` -> `useSetAtom` + `RESET`

**23 call sites.** Jotai has no direct `useResetRecoilState` equivalent. Two approaches:

**Approach A: `RESET` symbol from `jotai/utils` (for `atomWithStorage` / resettable atoms)**

```tsx
// BEFORE (src/hooks/Artifacts/useArtifacts.ts)
import { useResetRecoilState } from 'recoil';
const resetArtifacts = useResetRecoilState(store.artifactsState);
const resetCurrentArtifactId = useResetRecoilState(store.currentArtifactId);
// usage: resetArtifacts();

// AFTER
import { useSetAtom } from 'jotai';
import { RESET } from 'jotai/utils';
const setArtifacts = useSetAtom(store.artifactsState);
const setCurrentArtifactId = useSetAtom(store.currentArtifactId);
// usage: setArtifacts(RESET);  // resets to default value
```

This requires the atom to be created with `atomWithReset` or `atomWithStorage` (which already supports `RESET`). All `createStorageAtom`-based atoms support this natively.

**Approach B: Custom reset wrapper for plain atoms**

For plain `atom(defaultValue)` atoms, wrap with `atomWithReset`:

```tsx
// BEFORE
const artifactsState = atom<Record<string, Artifact> | null>({
  key: 'artifactsState',
  default: null,
});

// AFTER
import { atomWithReset } from 'jotai/utils';
const artifactsState = atomWithReset<Record<string, Artifact> | null>(null);
```

**Recommended approach for this codebase:** Use `atomWithReset` for all atoms that have `useResetRecoilState` call sites (artifacts atoms, `latestMessageFamily`, `defaultPreset`, `visibleArtifacts`, and all family atoms reset in `useClearStates`). This keeps the consumer code clean with `set(RESET)`.

---

## 2. Atom Definition Translations

### 2.1 Plain Atoms

```tsx
// BEFORE (src/store/submission.ts)
import { atom } from 'recoil';
const submission = atom<TSubmission | null>({
  key: 'submission',
  default: null,
});

// AFTER
import { atom } from 'jotai';
const submission = atom<TSubmission | null>(null);
```

For atoms that need reset support:

```tsx
// AFTER (with reset support)
import { atomWithReset } from 'jotai/utils';
const submission = atomWithReset<TSubmission | null>(null);
```

**Key difference:** Recoil atoms require a unique `key` string. Jotai atoms do not need keys (they use object identity). The `key` strings can be dropped entirely. However, for debugging purposes, atoms can be given a `debugLabel`:

```tsx
const submission = atom<TSubmission | null>(null);
submission.debugLabel = 'submission';
```

### 2.2 Atom Families

**17 atom families in the codebase.** Jotai's `atomFamily` from `jotai/utils` has a different signature.

```tsx
// BEFORE (src/store/families.ts)
import { atomFamily } from 'recoil';
const textByIndex = atomFamily<string, string | number>({
  key: 'textByIndex',
  default: '',
});
// usage: textByIndex(0) returns a RecoilState<string>

// AFTER
import { atomFamily } from 'jotai/utils';
const textByIndex = atomFamily<string | number, string>(
  (_param: string | number) => '',
);
// usage: textByIndex(0) returns an Atom<string>
```

**IMPORTANT: Jotai `atomFamily` has REVERSED generic parameter order compared to Recoil.**

- Recoil: `atomFamily<Value, Param>({ key, default })`
- Jotai: `atomFamily<Param, Value>((param) => initialValue)` -- but actually it takes a function that returns an atom or value.

The correct Jotai pattern:

```tsx
import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';

// Simple family (most common in this codebase)
const textByIndex = atomFamily((param: string | number) =>
  atom<string>('')
);

// Family with reset support (for families used with `reset()`)
import { atomWithReset } from 'jotai/utils';
const conversationByIndex = atomFamily((param: string | number) =>
  atomWithReset<TConversation | null>(null)
);
```

Jotai's `atomFamily` uses `===` equality by default for params. For the string/number params used throughout this codebase, that works fine. If an object param were needed, provide an equality function as the second argument.

### 2.3 Selectors -> Derived Atoms

```tsx
// BEFORE (src/store/endpoints.ts)
import { selector } from 'recoil';
const endpointsFilter = selector({
  key: 'endpointsFilter',
  get: ({ get }) => {
    const config = get(endpointsConfig) || {};
    const filter = {};
    for (const key of Object.keys(config)) {
      filter[key] = !!config[key];
    }
    return filter;
  },
});

// AFTER
import { atom } from 'jotai';
const endpointsFilter = atom((get) => {
  const config = get(endpointsConfig) || {};
  const filter: Record<string, boolean> = {};
  for (const key of Object.keys(config)) {
    filter[key] = !!config[key];
  }
  return filter;
});
```

The `get` function works identically in both libraries. Read-only derived atoms are the simplest translation.

### 2.4 Writable Selectors -> Read-Write Derived Atoms

```tsx
// BEFORE (src/store/families.ts)
const latestMessageKeysSelector = selector<(string | number)[]>({
  key: 'latestMessageKeysSelector',
  get: ({ get }) => {
    const keys = get(conversationKeysAtom);
    return keys.filter((key) => get(latestMessageFamily(key)) !== null);
  },
  set: ({ set }, newKeys) => {
    set(latestMessageKeysAtom, newKeys);
  },
});

// AFTER
import { atom } from 'jotai';
const latestMessageKeysSelector = atom(
  (get) => {
    const keys = get(conversationKeysAtom);
    return keys.filter((key) => get(latestMessageFamily(key)) !== null);
  },
  (_get, set, newKeys: (string | number)[]) => {
    set(latestMessageKeysAtom, newKeys);
  },
);
```

### 2.5 Selector Families -> `atomFamily` Wrapping Derived Atoms

```tsx
// BEFORE (src/store/families.ts)
import { selectorFamily } from 'recoil';
const conversationIdByIndex = selectorFamily<string | null, string | number>({
  key: 'conversationIdByIndex',
  get:
    (index: string | number) =>
    ({ get }) =>
      get(conversationByIndex(index))?.conversationId ?? null,
});

// AFTER
import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
const conversationIdByIndex = atomFamily((index: string | number) =>
  atom<string | null>((get) =>
    get(conversationByIndex(index))?.conversationId ?? null
  )
);
```

### 2.6 Writable Selector Family (`updateConversationSelector`)

```tsx
// BEFORE (src/store/families.ts)
const updateConversationSelector = selectorFamily({
  key: 'updateConversationSelector',
  get: () => () => null as Partial<TConversation> | null,
  set:
    (conversationId: string) =>
    ({ set, get }, newPartialConversation) => {
      if (newPartialConversation instanceof DefaultValue) {
        return;
      }
      const keys = get(conversationKeysAtom);
      keys.forEach((key) => {
        set(conversationByIndex(key), (prevConversation) => {
          if (prevConversation && prevConversation.conversationId === conversationId) {
            return { ...prevConversation, ...newPartialConversation };
          }
          return prevConversation;
        });
      });
    },
});

// AFTER
import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
const updateConversationSelector = atomFamily((conversationId: string) =>
  atom(
    () => null as Partial<TConversation> | null,
    (get, set, newPartialConversation: Partial<TConversation>) => {
      const keys = get(conversationKeysAtom);
      keys.forEach((key) => {
        set(conversationByIndex(key), (prevConversation) => {
          if (prevConversation && prevConversation.conversationId === conversationId) {
            return { ...prevConversation, ...newPartialConversation };
          }
          return prevConversation;
        });
      });
    },
  )
);
```

Note: Jotai has no `DefaultValue` sentinel. Instead, the write function receives the actual value. The `DefaultValue` guard is unnecessary.

---

## 3. `atomWithLocalStorage` Migration

This is the most critical translation -- **42 atoms** use this pattern.

### 3.1 Current Recoil Implementation (`src/store/utils.ts`)

```tsx
export function atomWithLocalStorage<T>(key: string, defaultValue: T) {
  return atom<T>({
    key,
    default: defaultValue,
    effects_UNSTABLE: [
      ({ setSelf, onSet }) => {
        const savedValue = localStorage.getItem(key);
        if (savedValue !== null) {
          try {
            const parsedValue = JSON.parse(savedValue);
            setSelf(parsedValue);
          } catch (e) {
            localStorage.setItem(key, JSON.stringify(defaultValue));
            setSelf(defaultValue);
          }
        }
        onSet((newValue: T) => {
          localStorage.setItem(key, JSON.stringify(newValue));
        });
      },
    ],
  });
}
```

### 3.2 Existing Jotai Implementation (`src/store/jotai-utils.ts`)

```tsx
export function createStorageAtom<T>(key: string, defaultValue: T) {
  return atomWithStorage<T>(key, defaultValue, undefined, {
    getOnInit: true,
  });
}
```

### 3.3 Compatibility Analysis

Both implementations:
- Read from `localStorage` on initialization
- Write to `localStorage` on every update
- Use JSON serialization

**They are functionally equivalent.** The Jotai version is simpler because `atomWithStorage` handles all the plumbing. The `getOnInit: true` option ensures synchronous hydration (matching Recoil's `setSelf` in the effect).

**One difference:** The Recoil version has error handling that resets corrupted localStorage values. The Jotai `atomWithStorage` with default storage also handles parse errors gracefully (returns defaultValue). This is acceptable.

**`RESET` support:** `atomWithStorage` from `jotai/utils` natively supports the `RESET` symbol, which maps directly to Recoil's `useResetRecoilState` behavior. No extra work needed.

### 3.4 Migration Path

Replace every `atomWithLocalStorage` call with `createStorageAtom`:

```tsx
// BEFORE (src/store/settings.ts)
import { atomWithLocalStorage } from '~/store/utils';
const autoScroll = atomWithLocalStorage('autoScroll', false);
const enterToSend = atomWithLocalStorage('enterToSend', true);

// AFTER (src/store/settings.ts)
import { createStorageAtom } from '~/store/jotai-utils';
const autoScroll = createStorageAtom('autoScroll', false);
const enterToSend = createStorageAtom('enterToSend', true);
```

This is a mechanical find-and-replace. All 42 localStorage atoms can be migrated this way.

### 3.5 Special Case: `lang` Atom

The `lang` atom in `src/store/language.ts` may have a dynamic default value (browser language / cookie). Verify that `createStorageAtom` handles this correctly -- the default is computed at module load time, so it should work identically.

---

## 4. Atom Effects Migration

### 4.1 Logging-Only Effects (10 atoms)

These atoms use `onSet` purely for debug logging:
- `latestMessageFamily`, `abortScrollFamily`, `isSubmittingFamily`
- `ephemeralAgentByConvoId`
- All 5 `artifacts.ts` atoms

**Strategy: Drop them.** The logging is for development debugging only. In Jotai, equivalent logging can be added via:

**Option A: `atomEffect` from `jotai-effect` (third-party)**
**Option B: Derived write atom wrapper**
**Option C (recommended): Jotai DevTools or `onMount`**

For this codebase, since the effects are logging-only:

```tsx
// BEFORE (src/store/artifacts.ts)
export const artifactsState = atom<Record<string, Artifact> | null>({
  key: 'artifactsState',
  default: null,
  effects: [
    ({ onSet, node }) => {
      onSet(async (newValue) => {
        logger.log('artifacts', 'Setting artifactsState', { key: node.key, newValue });
      });
    },
  ],
});

// AFTER -- Option 1: Drop logging entirely (simplest, recommended)
export const artifactsState = atomWithReset<Record<string, Artifact> | null>(null);

// AFTER -- Option 2: Keep logging via write-through atom
const _artifactsState = atomWithReset<Record<string, Artifact> | null>(null);
export const artifactsState = atom(
  (get) => get(_artifactsState),
  (get, set, value: Record<string, Artifact> | null) => {
    logger.log('artifacts', 'Setting artifactsState', { newValue: value });
    set(_artifactsState, value);
  },
);
```

**Recommendation:** Drop logging effects during migration. They can be re-added later with Jotai DevTools if needed.

### 4.2 Complex Effect: `conversationByIndex` (localStorage + URL sync)

This is the most complex effect in the codebase. The `onSet` handler for `conversationByIndex`:
1. Persists `assistant_id`, `agent_id`, `spec`, `tools` to localStorage
2. Stores endpoint settings
3. Stores full conversation setup to localStorage
4. Updates browser URL params for index 0

**Strategy: Write-through atom wrapper**

```tsx
import { atom } from 'jotai';
import { atomFamily, atomWithReset } from 'jotai/utils';

// Base atom family (holds the raw state)
const _conversationByIndex = atomFamily((index: string | number) =>
  atomWithReset<TConversation | null>(null)
);

// Public atom family (adds side effects on write)
const conversationByIndex = atomFamily((index: string | number) =>
  atom(
    (get) => get(_conversationByIndex(index)),
    (get, set, newValue: TConversation | null | typeof RESET) => {
      const oldValue = get(_conversationByIndex(index));
      set(_conversationByIndex(index), newValue);

      // Skip effects if resetting
      if (newValue === RESET || newValue == null) {
        return;
      }

      // localStorage sync (same logic as Recoil effect)
      if (newValue.assistant_id != null && newValue.assistant_id) {
        localStorage.setItem(
          `${LocalStorageKeys.ASST_ID_PREFIX}${index}${newValue.endpoint}`,
          newValue.assistant_id,
        );
      }
      if (newValue.agent_id != null && !isEphemeralAgentId(newValue.agent_id)) {
        localStorage.setItem(`${LocalStorageKeys.AGENT_ID_PREFIX}${index}`, newValue.agent_id);
      }
      if (newValue.spec != null && newValue.spec) {
        localStorage.setItem(LocalStorageKeys.LAST_SPEC, newValue.spec);
      }
      if (newValue.tools && Array.isArray(newValue.tools)) {
        localStorage.setItem(
          LocalStorageKeys.LAST_TOOLS,
          JSON.stringify(newValue.tools.filter((el) => !!el)),
        );
      }

      storeEndpointSettings(newValue);

      const convoToStore = { ...newValue };
      clearModelForNonEphemeralAgent(convoToStore);
      localStorage.setItem(
        `${LocalStorageKeys.LAST_CONVO_SETUP}_${index}`,
        JSON.stringify(convoToStore),
      );

      // URL param update (index 0 only)
      const numIndex = Number(index);
      const disableParams = newValue.disableParams === true;
      const shouldUpdateParams =
        numIndex === 0 &&
        !disableParams &&
        newValue.createdAt === '' &&
        JSON.stringify(newValue) !== JSON.stringify(oldValue) &&
        (oldValue as TConversation)?.conversationId === Constants.NEW_CONVO;

      if (shouldUpdateParams) {
        const newParams = createChatSearchParams(newValue);
        const searchParams = createSearchParams(newParams);
        const url = `${window.location.pathname}?${searchParams.toString()}`;
        window.history.pushState({}, '', url);
      }
    },
  )
);
```

**Important:** The Recoil `onSet` effect has access to `node.key` to extract the index via string splitting (`node.key.split('__')[1]`). In Jotai, the `index` parameter is captured in the closure directly, which is cleaner.

**Important:** The Recoil effect also fires asynchronously. The Jotai write function is synchronous but the side effects (localStorage writes) are synchronous too, so this is fine.

---

## 5. `useRecoilCallback` Patterns

**26 call sites.** This is the hardest translation. There are 4 distinct patterns used:

### 5.1 Pattern A: Read Multiple Atoms via `snapshot.getPromise` (9 sites)

Used in: `useClearConvoState`, `useClearSubmissionState`, `useClearLatestMessages`, `useClearStates`, `useApplyNewAgentTemplate`, `useBuildMessageTree`

**Strategy: `useCallback` + Jotai `useStore` / `store.get`**

```tsx
// BEFORE (src/hooks/Messages/useBuildMessageTree.ts)
import { useRecoilCallback } from 'recoil';

const getSiblingIdx = useRecoilCallback(
  ({ snapshot }) =>
    async (messageId: string | null | undefined) =>
      await snapshot.getPromise(store.messagesSiblingIdxFamily(messageId)),
  [],
);

// AFTER
import { useCallback } from 'react';
import { useStore } from 'jotai';

export default function useBuildMessageTree() {
  const jotaiStore = useStore();

  const getSiblingIdx = useCallback(
    (messageId: string | null | undefined) =>
      jotaiStore.get(store.messagesSiblingIdxFamily(messageId)),
    [jotaiStore],
  );
  // ...
}
```

**Key difference:** Jotai's `store.get()` is synchronous (returns the value directly), unlike Recoil's `snapshot.getPromise()` which returns a Promise. This means all `await snapshot.getPromise(...)` calls become synchronous `jotaiStore.get(...)` calls, and the `async` keyword can be removed from many callbacks.

### 5.2 Pattern B: Set Multiple Atoms (3 sites)

Used in: `useUpdateEphemeralAgent`, some parts of `useClearStates`

```tsx
// BEFORE (src/store/agents.ts)
import { useRecoilCallback } from 'recoil';

export function useUpdateEphemeralAgent() {
  const updateEphemeralAgent = useRecoilCallback(
    ({ set }) =>
      (convoId: string, agent: TEphemeralAgent | null) => {
        set(ephemeralAgentByConvoId(convoId), agent);
      },
    [],
  );
  return updateEphemeralAgent;
}

// AFTER
import { useCallback } from 'react';
import { useStore } from 'jotai';

export function useUpdateEphemeralAgent() {
  const jotaiStore = useStore();

  const updateEphemeralAgent = useCallback(
    (convoId: string, agent: TEphemeralAgent | null) => {
      jotaiStore.set(ephemeralAgentByConvoId(convoId), agent);
    },
    [jotaiStore],
  );
  return updateEphemeralAgent;
}
```

### 5.3 Pattern C: Read + Set + Reset Combined (5 sites)

Used in: `useClearConvoState`, `useClearStates`, `useClearSubmissionState`, `useClearLatestMessages`

```tsx
// BEFORE (src/store/families.ts)
function useClearConvoState() {
  const clearAllConversations = useRecoilCallback(
    ({ reset, snapshot }) =>
      async (skipFirst?: boolean) => {
        const conversationKeys = await snapshot.getPromise(conversationKeysAtom);
        for (const conversationKey of conversationKeys) {
          if (skipFirst === true && conversationKey == 0) {
            continue;
          }
          reset(conversationByIndex(conversationKey));
          const conversation = await snapshot.getPromise(conversationByIndex(conversationKey));
          if (conversation) {
            reset(latestMessageFamily(conversationKey));
          }
        }
        reset(conversationKeysAtom);
      },
    [],
  );
  return clearAllConversations;
}

// AFTER
import { useCallback } from 'react';
import { useStore } from 'jotai';
import { RESET } from 'jotai/utils';

function useClearConvoState() {
  const jotaiStore = useStore();

  const clearAllConversations = useCallback(
    (skipFirst?: boolean) => {
      const conversationKeys = jotaiStore.get(conversationKeysAtom);
      for (const conversationKey of conversationKeys) {
        if (skipFirst === true && conversationKey == 0) {
          continue;
        }
        jotaiStore.set(conversationByIndex(conversationKey), RESET);
        const conversation = jotaiStore.get(conversationByIndex(conversationKey));
        if (conversation) {
          jotaiStore.set(latestMessageFamily(conversationKey), RESET);
        }
      }
      jotaiStore.set(conversationKeysAtom, RESET);
    },
    [jotaiStore],
  );
  return clearAllConversations;
}
```

**Key simplification:** All `async/await` can be removed since `jotaiStore.get()` is synchronous.

**Reset via store:** `jotaiStore.set(someAtom, RESET)` works for `atomWithReset` atoms. This replaces `reset(someAtom)` from Recoil callbacks.

### 5.4 Pattern D: Synchronous Loadable Read (2 sites)

Used in: `useGetEphemeralAgent`, `useGetAddedConvo`

```tsx
// BEFORE (src/hooks/Chat/useGetAddedConvo.ts)
import { useRecoilCallback } from 'recoil';

export default function useGetAddedConvo() {
  return useRecoilCallback(
    ({ snapshot }) =>
      () =>
        snapshot.getLoadable(store.conversationByKeySelector(1)).getValue(),
    [],
  );
}

// AFTER
import { useCallback } from 'react';
import { useStore } from 'jotai';

export default function useGetAddedConvo() {
  const jotaiStore = useStore();
  return useCallback(
    () => jotaiStore.get(store.conversationByKeySelector(1)),
    [jotaiStore],
  );
}
```

**Key simplification:** `snapshot.getLoadable(atom).getValue()` and `snapshot.getLoadable(atom).contents` both become simply `jotaiStore.get(atom)`.

### 5.5 Pattern E: Complex Callback (`useClearStates`)

```tsx
// BEFORE (src/hooks/Config/useClearStates.ts)
const clearStates = useRecoilCallback(
  ({ reset, snapshot }) =>
    async (skipFirst?: boolean) => {
      await clearSubmissions(skipFirst);
      await clearConversations(skipFirst);
      await clearLatestMessages(skipFirst);
      const keys = await snapshot.getPromise(store.conversationKeysAtom);
      for (const key of keys) {
        if (skipFirst === true && key === 0) { continue; }
        reset(store.filesByIndex(key));
        reset(store.presetByIndex(key));
        // ... 15 more resets
      }
      clearLocalStorage(skipFirst);
    },
  [],
);

// AFTER
const clearStates = useCallback(
  (skipFirst?: boolean) => {
    clearSubmissions(skipFirst);
    clearConversations(skipFirst);
    clearLatestMessages(skipFirst);
    const keys = jotaiStore.get(store.conversationKeysAtom);
    for (const key of keys) {
      if (skipFirst === true && key === 0) { continue; }
      jotaiStore.set(store.filesByIndex(key), RESET);
      jotaiStore.set(store.presetByIndex(key), RESET);
      // ... 15 more resets using jotaiStore.set(atom, RESET)
    }
    clearLocalStorage(skipFirst);
  },
  [jotaiStore, clearSubmissions, clearConversations, clearLatestMessages],
);
```

### 5.6 Summary of `useRecoilCallback` Translation Rules

| Recoil Pattern | Jotai Equivalent |
|---|---|
| `useRecoilCallback(({ snapshot }) => ...)` | `useCallback` + `useStore()` |
| `snapshot.getPromise(atom)` | `jotaiStore.get(atom)` (synchronous) |
| `snapshot.getLoadable(atom).getValue()` | `jotaiStore.get(atom)` |
| `snapshot.getLoadable(atom).contents` | `jotaiStore.get(atom)` |
| `set(atom, value)` inside callback | `jotaiStore.set(atom, value)` |
| `reset(atom)` inside callback | `jotaiStore.set(atom, RESET)` |
| `useRecoilCallback(fn, [])` deps array | `useCallback(fn, [jotaiStore, ...])` |

**All 26 `useRecoilCallback` sites follow one of the 5 patterns above.** None use `gotoSnapshot`, `useRecoilTransactionObserver`, or other advanced Recoil APIs.

---

## 6. Type Migrations

### 6.1 `RecoilState<T>`

Used in `src/common/types.ts` (line 64) and `src/components/Nav/SettingsTabs/ToggleSwitch.tsx`.

```tsx
// BEFORE
import type { RecoilState } from 'recoil';
export type BadgeItem = {
  atom: RecoilState<boolean>;
  // ...
};

// AFTER
import type { PrimitiveAtom } from 'jotai';
export type BadgeItem = {
  atom: PrimitiveAtom<boolean>;
  // ...
};
```

**Or, if the atom might be a derived writable atom:**

```tsx
import type { WritableAtom } from 'jotai';
export type BadgeItem = {
  atom: WritableAtom<boolean, [boolean], void>;
  // ...
};
```

For this codebase, `PrimitiveAtom<boolean>` is sufficient since all badge atoms are plain writable atoms.

### 6.2 `SetterOrUpdater<T>`

Used in `src/common/types.ts` (line 152), `src/Providers/AddedChatContext.tsx`, `src/hooks/Conversations/useDebouncedInput.ts`, `src/hooks/Input/useHandleKeyUp.ts`, `src/hooks/Input/useAutoSave.ts`.

```tsx
// BEFORE
import type { SetterOrUpdater } from 'recoil';
export type FileSetter =
  | SetterOrUpdater<Map<string, ExtendedFile>>
  | React.Dispatch<React.SetStateAction<Map<string, ExtendedFile>>>;

// AFTER -- Option A: Inline the type
export type FileSetter =
  | ((value: Map<string, ExtendedFile> | ((prev: Map<string, ExtendedFile>) => Map<string, ExtendedFile>)) => void)
  | React.Dispatch<React.SetStateAction<Map<string, ExtendedFile>>>;

// AFTER -- Option B: Create a local type alias (recommended)
type SetterOrUpdater<T> = (value: T | ((prevValue: T) => T)) => void;
export type FileSetter =
  | SetterOrUpdater<Map<string, ExtendedFile>>
  | React.Dispatch<React.SetStateAction<Map<string, ExtendedFile>>>;
```

**Recommended:** Create a local `SetterOrUpdater<T>` type alias in `src/common/types.ts` to minimize consumer changes:

```tsx
// src/common/types.ts -- add this near the top
export type SetterOrUpdater<T> = (value: T | ((prevValue: T) => T)) => void;
```

This is functionally identical to Recoil's `SetterOrUpdater` type. Consumer files importing `SetterOrUpdater` from `~/common` would need no changes (just update `types.ts` to export the local version instead of re-exporting from recoil).

### 6.3 `DefaultValue`

Used in `updateConversationSelector` in `src/store/families.ts`.

```tsx
// BEFORE
import { DefaultValue } from 'recoil';
if (newPartialConversation instanceof DefaultValue) { return; }

// AFTER
// Not needed in Jotai. The write function receives the actual value.
// Just remove the DefaultValue guard.
```

### 6.4 Complete List of Recoil Type Imports to Remove

| Import | Files | Replacement |
|---|---|---|
| `RecoilState<T>` | `common/types.ts`, `ToggleSwitch.tsx`, `BadgeRow.tsx` | `PrimitiveAtom<T>` or `WritableAtom<T, [T], void>` |
| `SetterOrUpdater<T>` | `common/types.ts`, 4 hook files | Local type alias (same signature) |
| `DefaultValue` | `families.ts` | Remove (not needed) |

---

## 7. Provider/Infrastructure Migration

### 7.1 App Entry Point

```tsx
// BEFORE (src/App.jsx)
import { RecoilRoot } from 'recoil';

<QueryClientProvider client={queryClient}>
  <RecoilRoot>
    <LiveAnnouncer>
      {/* ... */}
    </LiveAnnouncer>
  </RecoilRoot>
</QueryClientProvider>

// AFTER -- Option A: Provider-less (simplest, works today)
// Just remove <RecoilRoot>. Jotai already runs provider-less.

<QueryClientProvider client={queryClient}>
  <LiveAnnouncer>
    {/* ... */}
  </LiveAnnouncer>
</QueryClientProvider>

// AFTER -- Option B: Explicit Jotai Provider (recommended for testing)
import { Provider } from 'jotai';

<QueryClientProvider client={queryClient}>
  <Provider>
    <LiveAnnouncer>
      {/* ... */}
    </LiveAnnouncer>
  </Provider>
</QueryClientProvider>
```

**Recommendation:** Use an explicit `<Provider>` for consistency with tests and to allow test isolation. The existing Jotai atoms (MCP, favorites, fontSize, showThinking) already work provider-less, and adding a `<Provider>` wrapping the whole app will capture them automatically.

**During coexistence phase:** Keep both `<RecoilRoot>` and `<Provider>` mounted until all Recoil atoms are migrated:

```tsx
<QueryClientProvider client={queryClient}>
  <RecoilRoot>
    <Provider>
      <LiveAnnouncer>{/* ... */}</LiveAnnouncer>
    </Provider>
  </RecoilRoot>
</QueryClientProvider>
```

### 7.2 Test Utilities

```tsx
// BEFORE (test/layout-test-utils.tsx)
import { RecoilRoot } from 'recoil';

function Wrapper({ children }) {
  return (
    <QueryClientProvider client={client}>
      <RecoilRoot>
        <Router>
          <AuthContextProvider authConfig={{ loginRedirect: '', test: true }}>
            {children}
          </AuthContextProvider>
        </Router>
      </RecoilRoot>
    </QueryClientProvider>
  );
}

// AFTER
import { Provider } from 'jotai';

function Wrapper({ children }) {
  return (
    <QueryClientProvider client={client}>
      <Provider>
        <Router>
          <AuthContextProvider authConfig={{ loginRedirect: '', test: true }}>
            {children}
          </AuthContextProvider>
        </Router>
      </Provider>
    </QueryClientProvider>
  );
}
```

Using `<Provider>` in tests ensures each test gets an isolated atom store (same behavior as `<RecoilRoot>`). This is already the pattern used in `src/hooks/MCP/__tests__/useMCPSelect.test.tsx`.

### 7.3 Test Files with `jest.mock('recoil', ...)`

**8 test files** mock the recoil module directly. These need to be refactored to either:
1. Mock `jotai` instead (same pattern, different import names)
2. Or preferably, use real atoms with `<Provider>` + initial values

```tsx
// BEFORE (typical mock pattern)
jest.mock('recoil', () => ({
  useRecoilState: jest.fn(),
  useRecoilValue: jest.fn(),
  useSetRecoilState: jest.fn(),
  useResetRecoilState: jest.fn(),
  atom: jest.fn(),
}));

// AFTER (mock pattern -- if still needed)
jest.mock('jotai', () => ({
  useAtom: jest.fn(),
  useAtomValue: jest.fn(),
  useSetAtom: jest.fn(),
  atom: jest.fn(),
  useStore: jest.fn(),
}));
jest.mock('jotai/utils', () => ({
  RESET: Symbol('RESET'),
  atomFamily: jest.fn(),
  atomWithReset: jest.fn(),
  atomWithStorage: jest.fn(),
}));
```

**Preferred approach:** Following CLAUDE.md testing philosophy ("real logic over mocks"), refactor these tests to use `<Provider>` with real atoms instead of mocking.

---

## 8. The Coexistence Bridge (ToggleSwitch)

### 8.1 Current Implementation

`src/components/Nav/SettingsTabs/ToggleSwitch.tsx` implements a dual-mode adapter:

```tsx
interface ToggleSwitchProps {
  stateAtom: RecoilState<boolean> | WritableAtom<boolean, [boolean], void>;
  // ...
}

function isRecoilState<T>(atom: unknown): atom is RecoilState<T> {
  return atom != null && typeof atom === 'object' && 'key' in atom;
}

// Routes to RecoilToggle or JotaiToggle based on atom type
```

The detection heuristic is: Recoil atoms have a `key` property, Jotai atoms do not.

### 8.2 Migration Strategy

**During migration:** This component is useful as-is. When migrating settings atoms from Recoil to Jotai, the `ToggleSwitch` callers need NO changes -- the component automatically detects the new Jotai atom type.

**After migration:** Once all atoms passed to `ToggleSwitch` are Jotai atoms, simplify:

```tsx
// AFTER (final, post-migration)
import { WritableAtom, useAtom } from 'jotai';

interface ToggleSwitchProps {
  stateAtom: WritableAtom<boolean, [boolean], void>;
  // ...
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  stateAtom, localizationKey, hoverCardText, switchId,
  onCheckedChange, disabled = false, strongLabel = false, showSwitch = true,
}) => {
  const [switchState, setSwitchState] = useAtom(stateAtom);
  // ... single implementation, no bridge needed
};
```

### 8.3 Should Other Components Follow This Pattern?

**No.** The dual-bridge pattern is only useful for `ToggleSwitch` because it accepts atoms as props from many different callers. Most other components reference atoms directly via `store.atomName`, so they should be migrated by changing the atom definition (in `src/store/`) and the hook import (from `recoil` to `jotai`). The callers do not need an adapter.

---

## 9. Barrel File (`src/store/index.ts`) Migration Strategy

### 9.1 Current Structure

```tsx
// Default export: spread merge of all Recoil modules
export default {
  ...artifacts, ...families, ...endpoints, ...user,
  ...submission, ...search, ...prompts, ...preset,
  ...lang, ...settings, ...misc, ...isTemporary,
};

// Named exports: Jotai modules
export * from './agents';
export * from './mcp';
export * from './favorites';
export * from './project';
```

Consumers use `store.atomName` for Recoil atoms and named imports for Jotai atoms.

### 9.2 Migration Path

**Option A (recommended): Keep the default export pattern but with Jotai atoms**

As each store file is migrated from Recoil to Jotai, the barrel export stays the same. Consumer code (`store.atomName`) requires no changes.

```tsx
// After migrating settings.ts, submission.ts, etc. -- barrel stays identical
import settings from './settings'; // now exports Jotai atoms
export default {
  ...settings,
  // ...
};
```

This works because consumers access atoms as `store.enterToSend` regardless of whether the atom is Recoil or Jotai.

**Option B: Move everything to named exports (eventual cleanup)**

After full migration, the distinction between "default export = Recoil, named = Jotai" is gone. The barrel can be simplified to all named exports. This is a post-migration cleanup step, not a migration blocker.

---

## 10. Import Translation Quick Reference

### Package Imports

| Recoil Import | Jotai Import |
|---|---|
| `import { atom } from 'recoil'` | `import { atom } from 'jotai'` |
| `import { selector } from 'recoil'` | `import { atom } from 'jotai'` (derived atom) |
| `import { atomFamily } from 'recoil'` | `import { atomFamily } from 'jotai/utils'` |
| `import { selectorFamily } from 'recoil'` | `import { atomFamily } from 'jotai/utils'` + `import { atom } from 'jotai'` |
| `import { useRecoilState } from 'recoil'` | `import { useAtom } from 'jotai'` |
| `import { useRecoilValue } from 'recoil'` | `import { useAtomValue } from 'jotai'` |
| `import { useSetRecoilState } from 'recoil'` | `import { useSetAtom } from 'jotai'` |
| `import { useResetRecoilState } from 'recoil'` | `import { useSetAtom } from 'jotai'` + `import { RESET } from 'jotai/utils'` |
| `import { useRecoilCallback } from 'recoil'` | `import { useCallback } from 'react'` + `import { useStore } from 'jotai'` |
| `import { RecoilRoot } from 'recoil'` | `import { Provider } from 'jotai'` |
| `import { DefaultValue } from 'recoil'` | (remove -- not needed) |
| `import type { RecoilState } from 'recoil'` | `import type { PrimitiveAtom } from 'jotai'` |
| `import type { SetterOrUpdater } from 'recoil'` | Local type alias (see section 6.2) |

### Store Utility Imports

| Current | Replacement |
|---|---|
| `import { atomWithLocalStorage } from '~/store/utils'` | `import { createStorageAtom } from '~/store/jotai-utils'` |

---

## 11. Migration Order Recommendation

Based on dependency analysis, migrate in this order:

1. **Leaf atoms with no dependents** (easiest, highest confidence):
   - `submission.ts` (2 atoms)
   - `user.ts` (2 atoms)
   - `search.ts` (1 atom)
   - `preset.ts` (2 atoms)
   - `project.ts` (1 atom)

2. **localStorage atoms** (42 atoms, mechanical replacement):
   - `settings.ts` (38 localStorage + 4 static)
   - `prompts.ts` (7 atoms)
   - `language.ts` (1 atom)
   - `temporary.ts` (2 atoms)
   - `misc.ts` localStorage atoms (`hideBannerHint`, `chatBadges`)

3. **Atoms with logging-only effects**:
   - `artifacts.ts` (5 atoms)

4. **Endpoints** (has one selector):
   - `endpoints.ts` (2 atoms + 1 selector)

5. **Misc selectors**:
   - `misc.ts` remaining atoms + `conversationAttachmentsSelector`

6. **Agent families** (medium complexity):
   - `agents.ts` (1 atomFamily + 3 hooks with `useRecoilCallback`)

7. **Families** (highest complexity, most dependents):
   - `families.ts` (16 families, 8 selectors, 5 hooks)
   - Migrate `conversationByIndex` last within this file (complex effect)

8. **Infrastructure cleanup**:
   - `common/types.ts` type replacements
   - `ToggleSwitch.tsx` bridge removal
   - `App.jsx` RecoilRoot removal
   - Test utilities
   - Remove `src/store/utils.ts` (Recoil atomWithLocalStorage)
   - Remove `recoil` from `package.json`
