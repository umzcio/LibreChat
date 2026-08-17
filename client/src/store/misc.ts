import { atom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import type { TAttachment } from 'librechat-data-provider';
import { createStorageAtom } from './jotai-utils';
import type { BadgeItem } from '~/common';

const hideBannerHint = createStorageAtom<string[]>('hideBannerHint', []);
hideBannerHint.debugLabel = 'hideBannerHint';

const messageAttachmentsMap = atom<Record<string, TAttachment[] | undefined>>({});
messageAttachmentsMap.debugLabel = 'messageAttachmentsMap';

/**
 * Derived atom family to get attachments for a specific conversation.
 */
const conversationAttachmentsSelector = atomFamily(
  (conversationId: string | undefined) => {
    const derived = atom<Record<string, TAttachment[]>>((get) => {
      if (!conversationId) {
        return {};
      }

      const attachmentsMap = get(messageAttachmentsMap);
      const result: Record<string, TAttachment[]> = {};

      for (const [messageId, attachments] of Object.entries(attachmentsMap)) {
        if (!attachments || attachments.length === 0) {
          continue;
        }

        const relevantAttachments = attachments.filter(
          (attachment) => attachment.conversationId === conversationId,
        );

        if (relevantAttachments.length > 0) {
          result[messageId] = relevantAttachments;
        }
      }

      return result;
    });
    derived.debugLabel = `conversationAttachments(${conversationId})`;
    return derived;
  },
);

const queriesEnabled = atom<boolean>(true);
queriesEnabled.debugLabel = 'queriesEnabled';

const isEditingBadges = atom<boolean>(false);
isEditingBadges.debugLabel = 'isEditingBadges';

const showShortcutsDialog = atom<boolean>(false);
showShortcutsDialog.debugLabel = 'showShortcutsDialog';

export type KeyboardDeleteTarget = {
  conversationId: string;
  title: string;
};

const keyboardDeleteTarget = atom<KeyboardDeleteTarget | null>(null);
keyboardDeleteTarget.debugLabel = 'keyboardDeleteTarget';

export type ShortcutOverride = {
  mac: string | null;
  other: string | null;
};

const customShortcuts = createStorageAtom<Record<string, ShortcutOverride>>(
  'customKeyboardShortcuts',
  {},
);

/** When false, no keyboard shortcut fires and the UI stops advertising them. */
const shortcutsEnabled = createStorageAtom<boolean>('keyboardShortcutsEnabled', true);

const chatBadges = createStorageAtom<Pick<BadgeItem, 'id'>[]>('chatBadges', [
  // When adding new badges, make sure to add them to useChatBadges.ts as well and add them as last item
  // DO NOT CHANGE THE ORDER OF THE BADGES ALREADY IN THE ARRAY
  { id: '1' },
  // { id: '2' },
]);
chatBadges.debugLabel = 'chatBadges';

export default {
  hideBannerHint,
  messageAttachmentsMap,
  conversationAttachmentsSelector,
  queriesEnabled,
  isEditingBadges,
  showShortcutsDialog,
  keyboardDeleteTarget,
  customShortcuts,
  shortcutsEnabled,
  chatBadges,
};
