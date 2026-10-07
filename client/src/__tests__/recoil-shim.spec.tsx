import React from 'react';
import { createStore, Provider } from 'jotai';
import { atomWithReset } from 'jotai/utils';
import { act, renderHook } from '@testing-library/react';
import { atom, useRecoilCallback, useResetRecoilState } from '~/recoil-shim';

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
