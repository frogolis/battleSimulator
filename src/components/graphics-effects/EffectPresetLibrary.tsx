import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { Sword, Target, Circle as CircleIcon, Sparkles, Zap } from "lucide-react";
import { EFFECT_PRESETS } from "../../lib/skillSystem";

interface EffectPresetLibraryProps {
  selectedPreset: string;
  onPresetSelect: (presetKey: string) => void;
}

// 새로운 5가지 이펙트 타입별 프리셋 분류
const presetsByType = {
  projectile: [
    'projectile_arrow_single',
    'projectile_arrow_multi', 
    'projectile_fireball',
    'projectile_fireball_homing',
    'projectile_radial_burst',
    'projectile_cone_spread',
  ],
  trail: [
    'trail_slash',
    'trail_thrust',
    'trail_spin',
  ],
  lightning: [
    'lightning_chain',
    'lightning_strike',
  ],
  ring: [
    'ring_single',
    'ring_concentric',
    'ring_explosion',
  ],
  glow: [
    'glow_heal',
    'glow_buff',
    'glow_power',
  ],
};

const effectTypeInfo: Record<string, { label: string; description: string; icon: React.ReactNode }> = {
  projectile: {
    label: '투사체 발사',
    description: '방향성/방사형으로 투사체를 발사하는 이펙트',
    icon: <Target className="h-4 w-4" />,
  },
  trail: {
    label: '궤적 이펙트',
    description: '공격 방향을 기준으로 출력되는 궤적',
    icon: <Sword className="h-4 w-4" />,
  },
  lightning: {
    label: '번개 이펙트',
    description: '특정 대상과 연결되어 이동하는 번개',
    icon: <Zap className="h-4 w-4" />,
  },
  ring: {
    label: '링 이펙트',
    description: '캐릭터 중심으로 확장되는 링/동심원',
    icon: <CircleIcon className="h-4 w-4" />,
  },
  glow: {
    label: '글로우 이펙트',
    description: '글로우 효과와 상승 파티클',
    icon: <Sparkles className="h-4 w-4" />,
  },
};

export function EffectPresetLibrary({
  selectedPreset,
  onPresetSelect,
}: EffectPresetLibraryProps) {
  return (
    <ScrollArea className="h-[500px] pr-4">
      <div className="space-y-6">
        {Object.entries(presetsByType).map(([effectType, presetKeys]) => {
          const typeInfo = effectTypeInfo[effectType];
          
          return (
            <div key={effectType} className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-1">{typeInfo.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{typeInfo.label}</h3>
                    <Badge variant="outline">{presetKeys.length}</Badge>
                  </div>
                  <p className="text-xs text-slate-400">{typeInfo.description}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {presetKeys.map((presetKey) => {
                  const preset = EFFECT_PRESETS[presetKey];
                  if (!preset) return null;

                  const isSelected = selectedPreset === presetKey;

                  return (
                    <Card
                      key={presetKey}
                      className={`cursor-pointer transition-all hover:shadow-lg hover:border-blue-500/50 ${
                        isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''
                      }`}
                      onClick={() => onPresetSelect(presetKey)}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm truncate">{preset.name}</CardTitle>
                            <CardDescription className="text-xs mt-1 line-clamp-2">
                              {preset.description}
                            </CardDescription>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <div
                              className="w-6 h-6 rounded border border-slate-600"
                              style={{ backgroundColor: preset.color }}
                              title="주 색상"
                            />
                            <div
                              className="w-6 h-6 rounded border border-slate-600"
                              style={{ backgroundColor: preset.secondaryColor }}
                              title="보조 색상"
                            />
                          </div>
                        </div>
                        <div className="flex gap-1 mt-3 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {preset.particleTexture}
                          </Badge>
                          {preset.isHoming && (
                            <Badge variant="secondary" className="text-xs bg-purple-500/20">
                              유도
                            </Badge>
                          )}
                          {preset.projectileCount && (
                            <Badge variant="outline" className="text-xs">
                              {preset.projectileCount}발
                            </Badge>
                          )}
                          {preset.repeatCount && preset.repeatCount > 1 && (
                            <Badge variant="outline" className="text-xs">
                              {preset.repeatCount}회
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2 mt-2 text-xs text-slate-400">
                          <span title="글로우 강도">
                            ✨ {Math.round(preset.glowIntensity * 100)}%
                          </span>
                          {preset.projectileSpeed && (
                            <span title="투사체 속도">
                              🚀 {preset.projectileSpeed}
                            </span>
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
