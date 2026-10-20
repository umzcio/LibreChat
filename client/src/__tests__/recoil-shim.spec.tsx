import React from 'react';
import { createStore, Provider } from 'jotai';
import { atomWithReset, RESET } from 'jotai/utils';
import { act, renderHook } from '@testing-library/react';
import { atom, atomFamily, useRecoilCallback, useResetRecoilState } from '~/recoil-shim';

function wrapperFor(store: ReturnType<typeof createStore>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };
}

describe('recoil-shim reset', () => {
  it('restores a primitive atom to its default instead of storing the RESET symbol', () => {
    const store = createStore();
    const count = atom({ key: 'shimResetCount', default: 3 });
    store.set(count, 9);

    const { result } = renderHook(() => useResetRecoilState(count), {
      wrapper: wrapperFor(store),
    });
    act(() => result.current());

    expect(store.get(count)).toBe(3);
  });

  it('resets through useRecoilCallback', () => {
    const store = createStore();
    const label = atom({ key: 'shimResetLabel', default: 'initial' });
    store.set(label, 'changed');

    const { result } = renderHook(
      () =>
        useRecoilCallback(
          ({ reset }) =>
            () =>
              reset(label),
          [],
        ),
      { wrapper: wrapperFor(store) },
    );
    act(() => result.current());

    expect(store.get(label)).toBe('initial');
  });

  it('still honors RESET on resettable atoms', () => {
    const store = createStore();
    const resettable = atomWithReset(1);
    store.set(resettable, 5);

    const { result } = renderHook(() => useResetRecoilState(resettable), {
      wrapper: wrapperFor(store),
    });
    act(() => result.current());

    expect(store.get(resettable)).toBe(1);
  });
});

describe('recoil-shim effects', () => {
  it('fires onSet with the new and previous value after a write', () => {
    const store = createStore();
    const seen: Array<[number, number, boolean]> = [];
    const counter = atom({
      key: 'shimEffectCounter',
      default: 1,
      effects: [
        ({ onSet }) => {
          onSet((next, prev, isReset) => seen.push([next, prev, isReset]));
        },
      ],
    });

    store.set(counter, 5);
    store.set(counter, (prev) => prev + 1);
    store.set(counter, RESET as never);

    expect(store.get(counter)).toBe(1);
    expect(seen).toEqual([
      [5, 1, false],
      [6, 5, false],
      [1, 6, true],
    ]);
  });

  it('lets a synchronous setSelf override the default', () => {
    const store = createStore();
    const seeded = atom({
      key: 'shimEffectSeeded',
      default: 'default',
      effects: [({ setSelf }) => setSelf('from-effect')],
    });

    expect(store.get(seeded)).toBe('from-effect');
  });

  it('exposes the family member key the way upstream parses it', () => {
    const store = createStore();
    const keys: string[] = [];
    const family = atomFamily<string | null, number>({
      key: 'shimEffectFamily',
      default: null,
      effects: [
        ({ node, onSet }) => {
          onSet(() => keys.push(node.key));
        },
      ],
    });

    store.set(family(3), 'x');

    expect(keys).toEqual(['shimEffectFamily__3']);
    expect(Number(keys[0].split('__')[1])).toBe(3);
  });
});
