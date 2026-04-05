import { atom } from 'jotai';
import type { TPreset } from 'librechat-data-provider';

const defaultPreset = atom<TPreset | null>(null);
defaultPreset.debugLabel = 'defaultPreset';

const presetModalVisible = atom<boolean>(false);
presetModalVisible.debugLabel = 'presetModalVisible';

export default {
  defaultPreset,
  presetModalVisible,
};
