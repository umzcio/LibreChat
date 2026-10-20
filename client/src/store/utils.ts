import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import type { SyncStorage } from 'jotai/vanilla/utils/atomWithStorage';
import { FRESH_READ } from '~/recoil-shim';
import { logger } from '~/utils';

/**
 * A localStorage-backed atom whose saved value and default both pass through
 * `normalizeSavedValue`. The default is normalized once at creation, so a
 * default the normalizer rejects is corrected before anything subscribes; a
 * saved value the normalizer changes is rewritten in place; an unparsable
 * saved value is replaced by the normalized default.
 */
export function atomWithLocalStorage<T>(
  key: string,
  defaultValue: T,
  normalizeSavedValue: (value: T) => T = (value) => value,
) {
  const normalizedDefault = normalizeSavedValue(defaultValue);
  const base = createJSONStorage<T>(() => localStorage);
  const storage: SyncStorage<T> = {
    ...base,
    getItem: (storageKey, initialValue) => {
      const saved = localStorage.getItem(storageKey);
      if (saved === null) {
        return initialValue;
      }
      try {
        const parsed = JSON.parse(saved) as T;
        const normalized = normalizeSavedValue(parsed);
        if (!Object.is(normalized, parsed)) {
          localStorage.setItem(storageKey, JSON.stringify(normalized));
        }
        return normalized;
      } catch (error) {
        logger.error('store', `Error parsing localStorage key "${storageKey}"`, error);
        localStorage.setItem(storageKey, JSON.stringify(initialValue));
        return initialValue;
      }
    },
  };
  const storageAtom = atomWithStorage<T>(key, normalizedDefault, storage, { getOnInit: true });
  return Object.assign(storageAtom, {
    [FRESH_READ]: () => storage.getItem(key, normalizeSavedValue(defaultValue)),
  });
}
