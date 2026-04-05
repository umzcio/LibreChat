import { atom } from 'jotai';
import { createStorageAtom } from '~/store/jotai-utils';
import { PromptsEditorMode } from '~/common';

const promptsName = atom<string>('');
promptsName.debugLabel = 'promptsName';

const promptsCategory = atom<string>('');
promptsCategory.debugLabel = 'promptsCategory';

const promptsPageNumber = atom<number>(1);
promptsPageNumber.debugLabel = 'promptsPageNumber';

const promptsPageSize = atom<number>(10);
promptsPageSize.debugLabel = 'promptsPageSize';

const autoSendPrompts = createStorageAtom('autoSendPrompts', true);
autoSendPrompts.debugLabel = 'autoSendPrompts';

const alwaysMakeProd = createStorageAtom('alwaysMakeProd', true);
alwaysMakeProd.debugLabel = 'alwaysMakeProd';

const promptsEditorMode = createStorageAtom<PromptsEditorMode>(
  'promptsEditorMode',
  PromptsEditorMode.SIMPLE,
);
promptsEditorMode.debugLabel = 'promptsEditorMode';

export default {
  promptsName,
  promptsCategory,
  promptsPageNumber,
  promptsPageSize,
  autoSendPrompts,
  alwaysMakeProd,
  promptsEditorMode,
};
