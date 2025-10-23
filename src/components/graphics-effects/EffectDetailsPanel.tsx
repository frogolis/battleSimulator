import React from "react";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import { Zap } from "lucide-react";

interface GraphicsEffectConfig {
  windupDuration: number;
  executionDuration: number;
  recoveryDuration: number;
  fadeInDuration: number;
  fadeOutDuration: number;
  particleCount: number;
  particleSize: number;
  particleLifetime: number;
  projectileType: string;
  projectileSpeed: number;
  effectShape: string;
  effectPlaybackSpeed: number;
  particlePlaybackSpeed: number;
}

interface AdditionalEffect {
  enabled: boolean;
}

interface EffectDetailsPanelProps {
  config: GraphicsEffectConfig;
  additionalEffects: AdditionalEffect[];
  onConfigUpdate: (updates: Partial<GraphicsEffectConfig>) => void;
}

export function EffectDetailsPanel({
  config,
  additionalEffects,
  onConfigUpdate,
}: EffectDetailsPanelProps) {
  return (
    <ScrollArea className="h-[500px] pr-4">
      <div className="space-y-4">
        {/* 재생 속도 컨트롤 */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4" />
            재생 속도 컨트롤
          </h3>

          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-slate-400 mb-3">
              이펙트 전체와 개별 파티클의 재생 속도를 독립적으로 조절할 수 있습니다.
            </p>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>이펙트 재생 속도</Label>
                  <Badge variant="outline">{config.effectPlaybackSpeed.toFixed(1)}x</Badge>
                </div>
                <Slider
                  value={[config.effectPlaybackSpeed]}
                  onValueChange={([value]) => onConfigUpdate({ effectPlaybackSpeed: value })}
                  min={0.1}
                  max={3.0}
                  step={0.1}
                />
                <p className="text-xs text-slate-400">
                  전체 이펙트의 생성/소멸 속도를 조절합니다
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>파티클 애니메이션 속도</Label>
                  <Badge variant="outline">{config.particlePlaybackSpeed.toFixed(1)}x</Badge>
                </div>
                <Slider
                  value={[config.particlePlaybackSpeed]}
                  onValueChange={([value]) => onConfigUpdate({ particlePlaybackSpeed: value })}
                  min={0.1}
                  max={3.0}
                  step={0.1}
                />
                <p className="text-xs text-slate-400">
                  개별 파티클의 움직임/회전 속도를 조절합니다
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4" />
            애니메이션 타이밍
          </h3>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>준비 시간 (Windup)</Label>
              <Badge variant="outline">{config.windupDuration}ms</Badge>
            </div>
            <Slider
              value={[config.windupDuration]}
              onValueChange={([value]) => onConfigUpdate({ windupDuration: value })}
              min={0}
              max={1000}
              step={50}
            />
            <p className="text-xs text-slate-400">스킬 시전 전 준비 동작 시간</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>실행 시간 (Execution)</Label>
              <Badge variant="outline">{config.executionDuration}ms</Badge>
            </div>
            <Slider
              value={[config.executionDuration]}
              onValueChange={([value]) => onConfigUpdate({ executionDuration: value })}
              min={100}
              max={2000}
              step={100}
            />
            <p className="text-xs text-slate-400">스킬이 실제로 발동되는 시간</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>회복 시간 (Recovery)</Label>
              <Badge variant="outline">{config.recoveryDuration}ms</Badge>
            </div>
            <Slider
              value={[config.recoveryDuration]}
              onValueChange={([value]) => onConfigUpdate({ recoveryDuration: value })}
              min={0}
              max={1000}
              step={50}
            />
            <p className="text-xs text-slate-400">스킬 사용 후 동작 복귀 시간</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>페이드 인</Label>
              <Badge variant="outline">{config.fadeInDuration}ms</Badge>
            </div>
            <Slider
              value={[config.fadeInDuration]}
              onValueChange={([value]) => onConfigUpdate({ fadeInDuration: value })}
              min={0}
              max={500}
              step={50}
            />
            <p className="text-xs text-slate-400">파티클이 나타나는 시간</p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>페이드 아웃</Label>
              <Badge variant="outline">{config.fadeOutDuration}ms</Badge>
            </div>
            <Slider
              value={[config.fadeOutDuration]}
              onValueChange={([value]) => onConfigUpdate({ fadeOutDuration: value })}
              min={0}
              max={500}
              step={50}
            />
            <p className="text-xs text-slate-400">파티클이 사라지는 시간</p>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="font-semibold">현재 설정 요약</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-slate-800 rounded">
              <div className="text-slate-400">파티클</div>
              <div>{config.particleCount}개 × {config.particleSize}px</div>
            </div>
            <div className="p-2 bg-slate-800 rounded">
              <div className="text-slate-400">생존시간</div>
              <div>{config.particleLifetime}ms</div>
            </div>
            <div className="p-2 bg-slate-800 rounded">
              <div className="text-slate-400">투사체</div>
              <div>{config.projectileType}</div>
            </div>
            <div className="p-2 bg-slate-800 rounded">
              <div className="text-slate-400">속도</div>
              <div>{config.projectileSpeed} px/s</div>
            </div>
            <div className="p-2 bg-slate-800 rounded">
              <div className="text-slate-400">활성 효과</div>
              <div>{additionalEffects.filter(e => e.enabled).length}개</div>
            </div>
            <div className="p-2 bg-slate-800 rounded">
              <div className="text-slate-400">형태</div>
              <div>{config.effectShape}</div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="font-semibold">타이밍 전체 구조</h3>
          <div className="p-3 bg-slate-800 rounded text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">총 소요 시간:</span>
              <span className="font-semibold">
                {config.windupDuration + config.executionDuration + config.recoveryDuration}ms
              </span>
            </div>
            <div className="w-full h-6 bg-slate-700 rounded overflow-hidden flex">
              <div 
                className="bg-blue-500 flex items-center justify-center text-white"
                style={{ width: `${(config.windupDuration / (config.windupDuration + config.executionDuration + config.recoveryDuration)) * 100}%` }}
              >
                {config.windupDuration > 0 && <span className="text-[10px]">준비</span>}
              </div>
              <div 
                className="bg-green-500 flex items-center justify-center text-white"
                style={{ width: `${(config.executionDuration / (config.windupDuration + config.executionDuration + config.recoveryDuration)) * 100}%` }}
              >
                <span className="text-[10px]">실행</span>
              </div>
              <div 
                className="bg-yellow-500 flex items-center justify-center text-white"
                style={{ width: `${(config.recoveryDuration / (config.windupDuration + config.executionDuration + config.recoveryDuration)) * 100}%` }}
              >
                {config.recoveryDuration > 0 && <span className="text-[10px]">회복</span>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-400">
              <div>Windup: {config.windupDuration}ms</div>
              <div>Execute: {config.executionDuration}ms</div>
              <div>Recovery: {config.recoveryDuration}ms</div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
