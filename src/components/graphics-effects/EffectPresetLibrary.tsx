import { Circle as CircleIcon, Sparkles, Sword, Target, Zap } from 'lucide-react';
import { EFFECT_PRESETS } from '../../lib/skillSystem';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

interface EffectPresetLibraryProps {
  selectedPreset: string;
  onPresetSelect: (presetKey: string) => void;
  compact?: boolean;
}

const effectTypeInfo = {
  projectile: {
    label: '투사체 발사',
    icon: Target,
  },
  trail: {
    label: '궤적 이펙트',
    icon: Sword,
  },
  lightning: {
    label: '번개 이펙트',
    icon: Zap,
  },
  ring: {
    label: '링 이펙트',
    icon: CircleIcon,
  },
  glow: {
    label: '글로우 이펙트',
    icon: Sparkles,
  },
};

export function EffectPresetLibrary({
  selectedPreset,
  onPresetSelect,
  compact = false,
}: EffectPresetLibraryProps) {
  const presets = Object.values(EFFECT_PRESETS);

  return (
    <ScrollArea className={`${compact ? 'h-[330px]' : 'h-[500px]'} pr-2`}>
      <div className='space-y-1'>
        {presets.map(preset => {
          const typeInfo = effectTypeInfo[preset.effectType];
          const TypeIcon = typeInfo.icon;
          const isSelected = selectedPreset === preset.id;

          return (
            <button
              key={preset.id}
              type='button'
              onClick={() => onPresetSelect(preset.id)}
              className={`flex w-full items-center gap-2 rounded border px-2 py-1.5 text-left transition ${
                isSelected ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <TypeIcon className='h-3.5 w-3.5 shrink-0 text-slate-500' />
              <span className='min-w-0 flex-1'>
                <span className='block truncate text-xs font-medium text-slate-700'>{preset.name}</span>
                <span className='block truncate text-[10px] text-slate-400'>{preset.description}</span>
              </span>
              <Badge variant='outline' className='shrink-0 text-[10px]'>
                {typeInfo.label}
              </Badge>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
