import { useAtom } from 'jotai';
import { Switch, InfoHoverCard, ESide } from '@librechat/client';
import type { WritableAtom } from 'jotai';
import { useLocalize } from '~/hooks';

type LocalizeFn = ReturnType<typeof useLocalize>;
type LocalizeKey = Parameters<LocalizeFn>[0];

interface ToggleSwitchProps {
  stateAtom: WritableAtom<boolean, [boolean], void>;
  localizationKey: LocalizeKey;
  hoverCardText?: LocalizeKey;
  switchId: string;
  onCheckedChange?: (value: boolean) => void;
  showSwitch?: boolean;
  disabled?: boolean;
  strongLabel?: boolean;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  stateAtom,
  localizationKey,
  hoverCardText,
  switchId,
  onCheckedChange,
  showSwitch = true,
  disabled = false,
  strongLabel = false,
}) => {
  const [switchState, setSwitchState] = useAtom(stateAtom);
  const localize = useLocalize();

  if (!showSwitch) {
    return null;
  }

  const handleCheckedChange = (value: boolean) => {
    setSwitchState(value);
    onCheckedChange?.(value);
  };

  const labelId = `${switchId}-label`;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div id={labelId}>
          {strongLabel ? <strong>{localize(localizationKey)}</strong> : localize(localizationKey)}
        </div>
        {hoverCardText && <InfoHoverCard side={ESide.Bottom} text={localize(hoverCardText)} />}
      </div>
      <Switch
        id={switchId}
        checked={switchState}
        onCheckedChange={handleCheckedChange}
        disabled={disabled}
        className="ml-4"
        data-testid={switchId}
        aria-labelledby={labelId}
      />
    </div>
  );
};

export default ToggleSwitch;
