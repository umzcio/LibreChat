import { useMemo } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { RESET } from 'jotai/utils';
import { Box } from 'lucide-react';
import type { WritableAtom, SetStateAction } from 'jotai';
import type { BadgeItem } from '~/common';
import { useLocalize, TranslationKeys } from '~/hooks';
import store from '~/store';

interface ChatBadgeConfig {
  id: string;
  icon: typeof Box;
  label: string;
  atom?: WritableAtom<boolean, [SetStateAction<boolean>], void>;
}

const badgeConfig: ReadonlyArray<ChatBadgeConfig> = [
  // {
  //   id: '1',
  //   icon: Box,
  //   label: 'com_ui_artifacts',
  //   atom: store.codeArtifacts,
  // },
  // TODO: add more badges here (missing store atoms)
];

export default function useChatBadges(): BadgeItem[] {
  const localize = useLocalize();
  const activeBadges = useAtomValue(store.chatBadges) as Array<{ id: string }>;
  const activeBadgeIds = useMemo(
    () => new Set(activeBadges.map((badge) => badge.id)),
    [activeBadges],
  );
  const allBadges = useMemo(() => {
    return (
      badgeConfig
        .filter(
          (cfg): cfg is ChatBadgeConfig & {
            atom: WritableAtom<boolean, [SetStateAction<boolean>], void>;
          } => cfg.atom != null,
        )
        .map((cfg) => ({
          id: cfg.id,
          label: localize(cfg.label as TranslationKeys),
          icon: cfg.icon,
          atom: cfg.atom,
          isAvailable: activeBadgeIds.has(cfg.id),
        })) || []
    );
  }, [activeBadgeIds, localize]);
  return allBadges;
}

export function useResetChatBadges() {
  const setChatBadges = useSetAtom(store.chatBadges);

  return () => {
    setChatBadges(RESET);
  };
}
