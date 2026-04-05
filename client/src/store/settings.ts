import { atom } from 'jotai';
import { SettingsViews, LocalStorageKeys } from 'librechat-data-provider';
import { createStorageAtom } from '~/store/jotai-utils';
import type { TOptionSettings } from '~/common';

// Static atoms (Jotai) -- migrated in Phase 1
const abortScroll = atom<boolean>(false);
abortScroll.debugLabel = 'abortScroll';

const optionSettings = atom<TOptionSettings>({});
optionSettings.debugLabel = 'optionSettings';

const currentSettingsView = atom<SettingsViews>(SettingsViews.default);
currentSettingsView.debugLabel = 'currentSettingsView';

const showPopover = atom<boolean>(false);
showPopover.debugLabel = 'showPopover';

// General settings (Jotai) -- migrated in Phase 2, Unit 11
const autoScroll = createStorageAtom('autoScroll', false);
autoScroll.debugLabel = 'autoScroll';

const sidebarExpanded = createStorageAtom(
  'unifiedSidebarExpanded',
  typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches ? false : true,
);
sidebarExpanded.debugLabel = 'sidebarExpanded';

const enableUserMsgMarkdown = createStorageAtom<boolean>(
  LocalStorageKeys.ENABLE_USER_MSG_MARKDOWN,
  true,
);
enableUserMsgMarkdown.debugLabel = 'enableUserMsgMarkdown';

const keepScreenAwake = createStorageAtom('keepScreenAwake', true);
keepScreenAwake.debugLabel = 'keepScreenAwake';

const enterToSend = createStorageAtom('enterToSend', true);
enterToSend.debugLabel = 'enterToSend';

const maximizeChatSpace = createStorageAtom('maximizeChatSpace', false);
maximizeChatSpace.debugLabel = 'maximizeChatSpace';

const chatDirection = createStorageAtom('chatDirection', 'LTR');
chatDirection.debugLabel = 'chatDirection';

const autoExpandTools = createStorageAtom(LocalStorageKeys.AUTO_EXPAND_TOOLS, false);
autoExpandTools.debugLabel = 'autoExpandTools';

const saveDrafts = createStorageAtom('saveDrafts', true);
saveDrafts.debugLabel = 'saveDrafts';

const showScrollButton = createStorageAtom('showScrollButton', true);
showScrollButton.debugLabel = 'showScrollButton';

const UsernameDisplay = createStorageAtom('UsernameDisplay', true);
UsernameDisplay.debugLabel = 'UsernameDisplay';

// Chat feature settings (Jotai) -- migrated in Phase 2, Unit 12
const forkSetting = createStorageAtom('forkSetting', '');
forkSetting.debugLabel = 'forkSetting';

const splitAtTarget = createStorageAtom('splitAtTarget', false);
splitAtTarget.debugLabel = 'splitAtTarget';

const rememberDefaultFork = createStorageAtom(LocalStorageKeys.REMEMBER_FORK_OPTION, false);
rememberDefaultFork.debugLabel = 'rememberDefaultFork';

const saveBadgesState = createStorageAtom('saveBadgesState', false);
saveBadgesState.debugLabel = 'saveBadgesState';

const modularChat = createStorageAtom('modularChat', true);
modularChat.debugLabel = 'modularChat';

const LaTeXParsing = createStorageAtom('LaTeXParsing', true);
LaTeXParsing.debugLabel = 'LaTeXParsing';

const centerFormOnLanding = createStorageAtom('centerFormOnLanding', true);
centerFormOnLanding.debugLabel = 'centerFormOnLanding';

const showFooter = createStorageAtom('showFooter', true);
showFooter.debugLabel = 'showFooter';

const atCommand = createStorageAtom('atCommand', true);
atCommand.debugLabel = 'atCommand';

const plusCommand = createStorageAtom('plusCommand', true);
plusCommand.debugLabel = 'plusCommand';

const slashCommand = createStorageAtom('slashCommand', true);
slashCommand.debugLabel = 'slashCommand';

const staticAtoms = {
  abortScroll,
  optionSettings,
  currentSettingsView,
  showPopover,
};

const generalAtoms = {
  autoScroll,
  sidebarExpanded,
  enableUserMsgMarkdown,
  keepScreenAwake,
  enterToSend,
  maximizeChatSpace,
  chatDirection,
  autoExpandTools,
  saveDrafts,
  showScrollButton,
  UsernameDisplay,
};

const chatFeatureAtoms = {
  forkSetting,
  splitAtTarget,
  rememberDefaultFork,
  saveBadgesState,
  modularChat,
  LaTeXParsing,
  centerFormOnLanding,
  showFooter,
  atCommand,
  plusCommand,
  slashCommand,
};

// Speech settings (Jotai) -- migrated in Phase 3, Unit 14
const conversationMode = createStorageAtom('conversationMode', false);
conversationMode.debugLabel = 'conversationMode';

const advancedMode = createStorageAtom('advancedMode', false);
advancedMode.debugLabel = 'advancedMode';

const speechToText = createStorageAtom('speechToText', true);
speechToText.debugLabel = 'speechToText';

const engineSTT = createStorageAtom('engineSTT', 'browser');
engineSTT.debugLabel = 'engineSTT';

const languageSTT = createStorageAtom('languageSTT', '');
languageSTT.debugLabel = 'languageSTT';

const autoTranscribeAudio = createStorageAtom('autoTranscribeAudio', false);
autoTranscribeAudio.debugLabel = 'autoTranscribeAudio';

const decibelValue = createStorageAtom('decibelValue', -45);
decibelValue.debugLabel = 'decibelValue';

const autoSendText = createStorageAtom('autoSendText', -1);
autoSendText.debugLabel = 'autoSendText';

const textToSpeech = createStorageAtom('textToSpeech', true);
textToSpeech.debugLabel = 'textToSpeech';

const engineTTS = createStorageAtom('engineTTS', 'browser');
engineTTS.debugLabel = 'engineTTS';

const voice = createStorageAtom<string | undefined>('voice', undefined);
voice.debugLabel = 'voice';

const cloudBrowserVoices = createStorageAtom('cloudBrowserVoices', false);
cloudBrowserVoices.debugLabel = 'cloudBrowserVoices';

const languageTTS = createStorageAtom('languageTTS', '');
languageTTS.debugLabel = 'languageTTS';

const automaticPlayback = createStorageAtom('automaticPlayback', false);
automaticPlayback.debugLabel = 'automaticPlayback';

const playbackRate = createStorageAtom<number | null>('playbackRate', null);
playbackRate.debugLabel = 'playbackRate';

const cacheTTS = createStorageAtom('cacheTTS', true);
cacheTTS.debugLabel = 'cacheTTS';

const speechAtoms = {
  conversationMode,
  advancedMode,
  speechToText,
  engineSTT,
  languageSTT,
  autoTranscribeAudio,
  decibelValue,
  autoSendText,
  textToSpeech,
  engineTTS,
  voice,
  cloudBrowserVoices,
  languageTTS,
  automaticPlayback,
  playbackRate,
  cacheTTS,
};

export default { ...staticAtoms, ...generalAtoms, ...chatFeatureAtoms, ...speechAtoms };
