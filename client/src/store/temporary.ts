import { createStorageAtom } from '~/store/jotai-utils';

const isTemporary = createStorageAtom('isTemporary', false);
isTemporary.debugLabel = 'isTemporary';

const defaultTemporaryChat = createStorageAtom('defaultTemporaryChat', false);
defaultTemporaryChat.debugLabel = 'defaultTemporaryChat';

export default {
  isTemporary,
  defaultTemporaryChat,
};
