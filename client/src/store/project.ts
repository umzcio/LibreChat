import { atom } from 'recoil';

export const activeProjectId = atom<string | null>({
  key: 'activeProjectId',
  default: null,
});
