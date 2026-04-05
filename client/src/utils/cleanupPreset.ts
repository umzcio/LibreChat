import { parseConvo } from 'librechat-data-provider';
import type { TPreset } from 'librechat-data-provider';
import logger from './logger';

type UIPreset = Partial<TPreset> & { presetOverride?: Partial<TPreset> };
type TCleanupPreset = {
  preset?: UIPreset;
  defaultParamsEndpoint?: string | null;
};

const cleanupPreset = ({ preset: _preset, defaultParamsEndpoint }: TCleanupPreset): TPreset => {
  const { endpoint, endpointType } = _preset ?? ({} as UIPreset);
  if (endpoint == null || endpoint === '') {
    logger.error('Preset', `Unknown endpoint ${endpoint}`, _preset);
    return {
      endpoint: null,
      presetId: _preset?.presetId ?? null,
      title: _preset?.title ?? 'New Preset',
    };
  }

  const { presetOverride = {}, ...rest } = _preset ?? {};
  const preset = { ...rest, ...presetOverride };

  // Handle deprecated chatGptLabel field
  // If both chatGptLabel and modelLabel exist, prioritize modelLabel and remove chatGptLabel
  // If only chatGptLabel exists, migrate it to modelLabel
  if (preset.chatGptLabel && preset.modelLabel) {
    // Both exist: prioritize modelLabel, remove chatGptLabel
    delete preset.chatGptLabel;
  } else if (preset.chatGptLabel && !preset.modelLabel) {
    // Only chatGptLabel exists: migrate to modelLabel
    preset.modelLabel = preset.chatGptLabel;
    delete preset.chatGptLabel;
  } else if ('chatGptLabel' in preset) {
    // chatGptLabel exists but is empty/falsy: remove it
    delete preset.chatGptLabel;
  }

  const parsedPreset = parseConvo({
    // @ts-expect-error - endpoint can be a custom defined name outside EModelEndpoint enum
    endpoint,
    endpointType,
    conversation: preset,
    defaultParamsEndpoint,
  });

  return {
    presetId: _preset?.presetId ?? null,
    ...parsedPreset,
    endpoint,
    endpointType,
    title: _preset?.title ?? 'New Preset',
  } as TPreset;
};

export default cleanupPreset;
