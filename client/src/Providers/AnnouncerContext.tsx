// AnnouncerContext.tsx
import React from 'react';
import type { AnnounceOptions } from '~/common';
import { logger } from '~/utils';

interface AnnouncerContextType {
  announceAssertive: (options: AnnounceOptions) => void;
  announcePolite: (options: AnnounceOptions) => void;
}

const defaultContext: AnnouncerContextType = {
  announceAssertive: () => logger.warn('Announcer', 'Announcement failed, LiveAnnouncer context is missing'),
  announcePolite: () => logger.warn('Announcer', 'Announcement failed, LiveAnnouncer context is missing'),
};

const AnnouncerContext = React.createContext<AnnouncerContextType>(defaultContext);

export const useLiveAnnouncer = () => {
  const context = React.useContext(AnnouncerContext);
  return context;
};

export default AnnouncerContext;
