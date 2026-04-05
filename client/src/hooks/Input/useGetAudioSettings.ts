import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import store from '~/store';

const useGetAudioSettings = () => {
  const engineSTT = useAtomValue(store.engineSTT);
  const engineTTS = useAtomValue(store.engineTTS);

  const speechToTextEndpoint = engineSTT;
  const textToSpeechEndpoint = engineTTS;

  return useMemo(
    () => ({ speechToTextEndpoint, textToSpeechEndpoint }),
    [speechToTextEndpoint, textToSpeechEndpoint],
  );
};

export default useGetAudioSettings;
