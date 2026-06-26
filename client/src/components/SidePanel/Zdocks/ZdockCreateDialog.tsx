import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  FolderClosed,
  Globe,
  Lightbulb,
  Star,
  BookOpen,
  Code,
  Music,
  Heart,
  GraduationCap,
  Briefcase,
  Rocket,
  Palette,
  Camera,
  Gift,
  Compass,
  Flame,
  Zap,
  Shield,
  Trophy,
  Target,
  Feather,
  Anchor,
  Gem,
  Crown,
  Coffee,
  Leaf,
  Sun,
  Moon,
  Cloud,
  Mountain,
  Waypoints,
  PenTool,
  Microscope,
  FlaskConical,
  Wrench,
  Puzzle,
  Dumbbell,
  Utensils,
  Plane,
  Home,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Button,
  Input,
  OGDialog,
  OGDialogContent,
  useToastContext,
} from '@librechat/client';
import { useCreateZdockMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

export const PROJECT_COLORS = [
  '#6b7280',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
];

export const PROJECT_ICONS: { name: string; component: LucideIcon }[] = [
  { name: 'FolderClosed', component: FolderClosed },
  { name: 'Globe', component: Globe },
  { name: 'Lightbulb', component: Lightbulb },
  { name: 'Star', component: Star },
  { name: 'BookOpen', component: BookOpen },
  { name: 'Code', component: Code },
  { name: 'Music', component: Music },
  { name: 'Heart', component: Heart },
  { name: 'GraduationCap', component: GraduationCap },
  { name: 'Briefcase', component: Briefcase },
  { name: 'Rocket', component: Rocket },
  { name: 'Palette', component: Palette },
  { name: 'Camera', component: Camera },
  { name: 'Gift', component: Gift },
  { name: 'Compass', component: Compass },
  { name: 'Flame', component: Flame },
  { name: 'Zap', component: Zap },
  { name: 'Shield', component: Shield },
  { name: 'Trophy', component: Trophy },
  { name: 'Target', component: Target },
  { name: 'Feather', component: Feather },
  { name: 'Anchor', component: Anchor },
  { name: 'Gem', component: Gem },
  { name: 'Crown', component: Crown },
  { name: 'Coffee', component: Coffee },
  { name: 'Leaf', component: Leaf },
  { name: 'Sun', component: Sun },
  { name: 'Moon', component: Moon },
  { name: 'Cloud', component: Cloud },
  { name: 'Mountain', component: Mountain },
  { name: 'Waypoints', component: Waypoints },
  { name: 'PenTool', component: PenTool },
  { name: 'Microscope', component: Microscope },
  { name: 'FlaskConical', component: FlaskConical },
  { name: 'Wrench', component: Wrench },
  { name: 'Puzzle', component: Puzzle },
  { name: 'Dumbbell', component: Dumbbell },
  { name: 'Utensils', component: Utensils },
  { name: 'Plane', component: Plane },
  { name: 'Home', component: Home },
];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  PROJECT_ICONS.map((i) => [i.name, i.component]),
);

export function getProjectIcon(iconName?: string): LucideIcon {
  return (iconName && ICON_MAP[iconName]) || FolderClosed;
}

/** Reusable icon + color picker used in both Create and Edit views */
export function IconColorPicker({
  icon,
  color,
  onIconChange,
  onColorChange,
}: {
  icon: string;
  color: string;
  onIconChange: (name: string) => void;
  onColorChange: (color: string) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Colors */}
      <div className="flex flex-wrap gap-2">
        {PROJECT_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={cn(
              'size-7 rounded-full border-2 transition-all',
              color === c
                ? 'scale-110 border-text-primary'
                : 'border-transparent hover:scale-105',
            )}
            style={{ backgroundColor: c }}
            onClick={() => onColorChange(c)}
            aria-label={c}
          />
        ))}
      </div>
      {/* Icons grid */}
      <div className="grid grid-cols-8 gap-1.5">
        {PROJECT_ICONS.map(({ name: iconName, component: IconComp }) => (
          <button
            key={iconName}
            type="button"
            className={cn(
              'flex size-9 items-center justify-center rounded-lg transition-colors',
              icon === iconName
                ? 'bg-surface-active-alt'
                : 'hover:bg-surface-hover',
            )}
            onClick={() => onIconChange(iconName)}
            aria-label={iconName}
          >
            <IconComp
              className={cn('size-5', icon !== iconName && 'text-text-secondary')}
              style={icon === iconName ? { color } : undefined}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ZdockCreateDialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactNode;
}) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [name, setName] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[6]);
  const [icon, setIcon] = useState('FolderClosed');
  const [showIconPicker, setShowIconPicker] = useState(false);

  const createMutation = useCreateZdockMutation({
    onSuccess: () => {
      showToast({ message: localize('com_ui_zdock_created'), status: 'success' });
      onOpenChange(false);
      setName('');
      setColor(PROJECT_COLORS[6]);
      setIcon('FolderClosed');
      setShowIconPicker(false);
    },
    onError: () => {
      showToast({ message: localize('com_ui_error_create_zdock'), status: 'error' });
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      color,
      icon,
    });
  };

  const SelectedIcon = getProjectIcon(icon);

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      {children}
      <OGDialogContent className="max-w-sm gap-0 p-0">
        {/* Header */}
        <div className="px-5 pb-4 pt-5">
          <h2 className="text-lg font-semibold text-text-primary">
            {localize('com_ui_create_zdock')}
          </h2>
        </div>

        {/* Name input with icon button */}
        <div className="px-5 pb-4">
          <p className="mb-2 text-xs text-text-secondary">
            {localize('com_ui_zdock_name')}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-medium transition-colors hover:bg-surface-hover"
              onClick={() => setShowIconPicker(!showIconPicker)}
              aria-label="Choose icon"
            >
              <SelectedIcon className="size-5" style={{ color }} aria-hidden="true" />
            </button>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={localize('com_ui_zdock_name_placeholder')}
              className="text-text-primary"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  handleSubmit();
                }
              }}
            />
          </div>
        </div>

        {/* Icon & Color picker (collapsed by default) */}
        {showIconPicker && (
          <div className="border-t border-border-light px-5 py-4">
            <IconColorPicker
              icon={icon}
              color={color}
              onIconChange={setIcon}
              onColorChange={setColor}
            />
          </div>
        )}

        {/* Info text */}
        <div className="border-t border-border-light px-5 py-4">
          <p className="text-xs leading-relaxed text-text-tertiary">
            {localize('com_ui_zdock_info')}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-border-light px-5 py-3">
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || createMutation.isLoading}
            size="sm"
          >
            {localize('com_ui_create_zdock')}
          </Button>
        </div>
      </OGDialogContent>
    </OGDialog>
  );
}
