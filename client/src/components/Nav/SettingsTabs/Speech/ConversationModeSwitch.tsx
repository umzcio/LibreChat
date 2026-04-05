import { useAtomValue, useSetAtom } from 'jotai';
import ToggleSwitch from '../ToggleSwitch';
import store from '~/store';

export default function ConversationModeSwitch({
  onCheckedChange,
}: {
  onCheckedChange?: (value: boolean) => void;
}) {
  const speechToText = useAtomValue(store.speechToText);
  const textToSpeech = useAtomValue(store.textToSpeech);
  const setAutoSendText = useSetAtom(store.autoSendText);
  const setDecibelValue = useSetAtom(store.decibelValue);
  const setAutoTranscribeAudio = useSetAtom(store.autoTranscribeAudio);

  const handleCheckedChange = (value: boolean) => {
    setAutoTranscribeAudio(value);
    setAutoSendText(3);
    setDecibelValue(-45);
    if (onCheckedChange) {
      onCheckedChange(value);
    }
  };

  return (
    <ToggleSwitch
      stateAtom={store.conversationMode}
      localizationKey={'com_nav_conversation_mode' as const}
      switchId="ConversationMode"
      onCheckedChange={handleCheckedChange}
      disabled={!textToSpeech || !speechToText}
      strongLabel={true}
    />
  );
}
