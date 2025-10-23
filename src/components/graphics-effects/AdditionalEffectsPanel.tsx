import React from "react";
import { Card, CardContent } from "../ui/card";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Slider } from "../ui/slider";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Trash2, Camera, Circle, Zap, Star, Wind, Droplet, TrendingUp } from "lucide-react";

interface AdditionalEffect {
  id: string;
  name: string;
  type: 'cameraShake' | 'rings' | 'screenFlash' | 'glow' | 'rotation' | 'pulse' | 'trail';
  enabled: boolean;
  icon: React.ReactNode;
  description: string;
}

interface GraphicsEffectConfig {
  cameraShake: number;
  cameraShakeDuration: number;
  enableRings: boolean;
  ringCount: number;
  ringSpeed: number;
  ringThickness: number;
  enableScreenFlash: boolean;
  flashIntensity: number;
  flashColor: string;
  glowIntensity: number;
  rotationSpeed: number;
  pulseSpeed: number;
  trailEnabled: boolean;
  trailLength: number;
  trailWidth: number;
}

interface AdditionalEffectsPanelProps {
  effects: AdditionalEffect[];
  config: GraphicsEffectConfig;
  onToggleEffect: (effectId: string) => void;
  onRemoveEffect: (effectId: string) => void;
  onConfigUpdate: (updates: Partial<GraphicsEffectConfig>) => void;
}

export function AdditionalEffectsPanel({
  effects,
  config,
  onToggleEffect,
  onRemoveEffect,
  onConfigUpdate,
}: AdditionalEffectsPanelProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400 mb-3">
        기본 효과에 추가할 수 있는 선택적 효과들입니다. 각 효과는 독립적으로 활성화/비활성화할 수 있습니다.
      </p>
      
      {effects.map((effect) => (
        <Card key={effect.id} className={effect.enabled ? 'bg-purple-500/5 border-purple-500/30' : ''}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {effect.icon}
                <span className="font-semibold text-sm">{effect.name}</span>
                <Switch
                  checked={effect.enabled}
                  onCheckedChange={() => onToggleEffect(effect.id)}
                />
              </div>
              {effect.enabled && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemoveEffect(effect.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            <p className="text-xs text-slate-400">{effect.description}</p>
            
            {effect.enabled && (
              <div className="mt-3 space-y-2">
                {effect.type === 'cameraShake' && (
                  <>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <Label className="text-xs">흔들림 강도</Label>
                        <Badge variant="outline" className="text-xs">{config.cameraShake}</Badge>
                      </div>
                      <Slider
                        value={[config.cameraShake]}
                        onValueChange={([value]) => onConfigUpdate({ cameraShake: value })}
                        min={0}
                        max={10}
                        step={1}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <Label className="text-xs">지속 시간</Label>
                        <Badge variant="outline" className="text-xs">{config.cameraShakeDuration}ms</Badge>
                      </div>
                      <Slider
                        value={[config.cameraShakeDuration]}
                        onValueChange={([value]) => onConfigUpdate({ cameraShakeDuration: value })}
                        min={100}
                        max={1000}
                        step={50}
                      />
                    </div>
                  </>
                )}
                
                {effect.type === 'rings' && (
                  <>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <Label className="text-xs">링 개수</Label>
                        <Badge variant="outline" className="text-xs">{config.ringCount}</Badge>
                      </div>
                      <Slider
                        value={[config.ringCount]}
                        onValueChange={([value]) => onConfigUpdate({ ringCount: value })}
                        min={1}
                        max={8}
                        step={1}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <Label className="text-xs">확장 속도</Label>
                        <Badge variant="outline" className="text-xs">{config.ringSpeed}</Badge>
                      </div>
                      <Slider
                        value={[config.ringSpeed]}
                        onValueChange={([value]) => onConfigUpdate({ ringSpeed: value })}
                        min={50}
                        max={500}
                        step={10}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <Label className="text-xs">링 두께</Label>
                        <Badge variant="outline" className="text-xs">{config.ringThickness}px</Badge>
                      </div>
                      <Slider
                        value={[config.ringThickness]}
                        onValueChange={([value]) => onConfigUpdate({ ringThickness: value })}
                        min={1}
                        max={10}
                        step={1}
                      />
                    </div>
                  </>
                )}
                
                {effect.type === 'screenFlash' && (
                  <>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <Label className="text-xs">플래시 강도</Label>
                        <Badge variant="outline" className="text-xs">{config.flashIntensity.toFixed(1)}</Badge>
                      </div>
                      <Slider
                        value={[config.flashIntensity]}
                        onValueChange={([value]) => onConfigUpdate({ flashIntensity: value })}
                        min={0}
                        max={1}
                        step={0.1}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">플래시 색상</Label>
                      <Input
                        type="color"
                        value={config.flashColor}
                        onChange={(e) => onConfigUpdate({ flashColor: e.target.value })}
                        className="h-8"
                      />
                    </div>
                  </>
                )}
                
                {effect.type === 'glow' && (
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Label className="text-xs">글로우 강도</Label>
                      <Badge variant="outline" className="text-xs">{config.glowIntensity.toFixed(1)}</Badge>
                    </div>
                    <Slider
                      value={[config.glowIntensity]}
                      onValueChange={([value]) => onConfigUpdate({ glowIntensity: value })}
                      min={0}
                      max={2}
                      step={0.1}
                    />
                  </div>
                )}
                
                {effect.type === 'rotation' && (
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Label className="text-xs">회전 속도</Label>
                      <Badge variant="outline" className="text-xs">{config.rotationSpeed}°/s</Badge>
                    </div>
                    <Slider
                      value={[config.rotationSpeed]}
                      onValueChange={([value]) => onConfigUpdate({ rotationSpeed: value })}
                      min={0}
                      max={360}
                      step={10}
                    />
                  </div>
                )}
                
                {effect.type === 'pulse' && (
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Label className="text-xs">펄스 속도</Label>
                      <Badge variant="outline" className="text-xs">{config.pulseSpeed}</Badge>
                    </div>
                    <Slider
                      value={[config.pulseSpeed]}
                      onValueChange={([value]) => onConfigUpdate({ pulseSpeed: value })}
                      min={0}
                      max={10}
                      step={1}
                    />
                  </div>
                )}
                
                {effect.type === 'trail' && (
                  <>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <Label className="text-xs">궤적 길이</Label>
                        <Badge variant="outline" className="text-xs">{config.trailLength}점</Badge>
                      </div>
                      <Slider
                        value={[config.trailLength]}
                        onValueChange={([value]) => onConfigUpdate({ trailLength: value })}
                        min={5}
                        max={50}
                        step={1}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <Label className="text-xs">궤적 두께</Label>
                        <Badge variant="outline" className="text-xs">{config.trailWidth}px</Badge>
                      </div>
                      <Slider
                        value={[config.trailWidth]}
                        onValueChange={([value]) => onConfigUpdate({ trailWidth: value })}
                        min={1}
                        max={10}
                        step={0.5}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function createInitialEffects(config: GraphicsEffectConfig): AdditionalEffect[] {
  return [
    { 
      id: 'trail', 
      name: '모션 트레일', 
      type: 'trail', 
      enabled: config.trailEnabled, 
      icon: <TrendingUp className="h-4 w-4" />,
      description: '이동 궤적을 시각화 (파티클이 남긴 자취)'
    },
    { 
      id: 'cameraShake', 
      name: '카메라 흔들림', 
      type: 'cameraShake', 
      enabled: config.cameraShake > 0, 
      icon: <Camera className="h-4 w-4" />,
      description: '충격 시 화면 흔들림 효과'
    },
    { 
      id: 'rings', 
      name: '동심원 효과', 
      type: 'rings', 
      enabled: config.enableRings, 
      icon: <Circle className="h-4 w-4" />,
      description: '확장되는 원형 파동'
    },
    { 
      id: 'screenFlash', 
      name: '화면 플래시', 
      type: 'screenFlash', 
      enabled: config.enableScreenFlash, 
      icon: <Zap className="h-4 w-4" />,
      description: '순간적인 화면 섬광'
    },
    { 
      id: 'glow', 
      name: '글로우 효과', 
      type: 'glow', 
      enabled: config.glowIntensity > 0, 
      icon: <Star className="h-4 w-4" />,
      description: '빛나는 후광 효과'
    },
    { 
      id: 'rotation', 
      name: '회전 효과', 
      type: 'rotation', 
      enabled: config.rotationSpeed > 0, 
      icon: <Wind className="h-4 w-4" />,
      description: '파티클이 회전하며 이동'
    },
    { 
      id: 'pulse', 
      name: '펄스 효과', 
      type: 'pulse', 
      enabled: config.pulseSpeed > 0, 
      icon: <Droplet className="h-4 w-4" />,
      description: '크기가 맥동하는 효과'
    },
  ];
}
