import { atom } from 'jotai';
import type { TUser, TPlugin } from 'librechat-data-provider';

const user = atom<TUser | undefined>(undefined);
user.debugLabel = 'user';

const availableTools = atom<Record<string, TPlugin>>({});
availableTools.debugLabel = 'availableTools';

export default {
  user,
  availableTools,
};
