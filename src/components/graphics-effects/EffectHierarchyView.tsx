import React from "react";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { ChevronDown, ChevronRight, Layers, Plus } from "lucide-react";
import { EffectShape, ProjectileType, ParticleUpdateStrategy } from "../../lib/simulator/particles";
import { AdditionalEffectsPanel, createInitialEffects } from "./AdditionalEffectsPanel";
import { toast } from "sonner";

interface GraphicsEffectConfig {
  particleCount: number;
  particleSize: number;
  particleLifetime: number;
  primaryColor: string;
  secondaryColor: string;
  glowIntensity: number;
  effectShape: EffectShape;
  projectileType: ProjectileType;
  projectileSpeed: number;
  projectileSize: number;
  homingEnabled: boolean;
  pierceCount: number;
  windupDuration: number;
  executionDuration: number;
  recoveryDuration: number;
  particleStrategy: ParticleUpdateStrategy;
  spawnDelay: number;
  fadeInDuration: number;
  fadeOutDuration: number;
  cameraShake: number;
  cameraShakeDuration: number;
  enableRings: boolean;
  ringCount: number;
  ringSpeed: number;
  ringThickness: number;
  enableScreenFlash: boolean;
  flashIntensity: number;
  flashColor: string;
  rotationSpeed: number;
  pulseSpeed: number;
}

interface AdditionalEffect {
  id: string;
  name: string;
  type: 'cameraShake' | 'rings' | 'screenFlash' | 'glow' | 'rotation' | 'pulse';
  enabled: boolean;
  icon: React.ReactNode;
  description: string;
}

interface EffectHierarchyViewProps {
  config: GraphicsEffectConfig;
  additionalEffects: AdditionalEffect[];
  openSections: {
    core: boolean;
    particle: boolean;
    projectile: boolean;
    animation: boolean;
    additional: boolean;
  };
  onConfigUpdate: (updates: Partial<GraphicsEffectConfig>) => void;
  onToggleSection: (section: string) => void;
  onToggleEffect: (effectId: string) => void;
  onRemoveEffect: (effectId: string) => void;
  setAdditionalEffects: (effects: AdditionalEffect[]) => void;
}

export function EffectHierarchyView({
  config,
  additionalEffects,
  openSections,
  onConfigUpdate,
  onToggleSection,
  onToggleEffect,
  onRemoveEffect,
  setAdditionalEffects,
}: EffectHierarchyViewProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-semibold">효과 계층 구조</span>
        </div>
        <p className="text-xs text-slate-400 mb-2">
          상위 요소가 하위 요소의 기반이 됩니다. 각 레벨을 확장하여 세부 설정을 조정하세요.
        </p>
        <div className="space-y-1 text-xs">
          <div><span className="text-blue-400">레벨 1:</span> 이펙트 카테고리 (궤적/발사체/영역/대상)</div>
          <div><span className="text-green-400">레벨 2:</span> 애니메이션 패턴 (직선/유도/곡선/상승 등)</div>
          <div><span className="text-purple-400">레벨 3:</span> 파티클 세부 설정 (형태/색상/크기)</div>
        </div>
      </div>

      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-2">
          {/* 레벨 1: 핵심 설정 */}
          <Collapsible open={openSections.core} onOpenChange={() => onToggleSection('core')}>
            <div className="border border-blue-500 rounded-lg bg-blue-500/5">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-blue-500/10 transition-colors">
                <div className="flex items-center gap-2">
                  {openSections.core ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <Badge className="bg-blue-600">레벨 1</Badge>
                  <span className="font-semibold">이펙트 카테고리</span>
                  <span className="text-xs text-slate-400">(궤적/발사체/영역/대상 선택)</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="p-4 pt-0 space-y-3">
                <div className="space-y-2">
                  <Label>효과 형태</Label>
                  <Select
                    value={config.effectShape}
                    onValueChange={(value: EffectShape) => onConfigUpdate({ effectShape: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="circle">원형 (Circle)</SelectItem>
                      <SelectItem value="cone">부채꼴 (Cone)</SelectItem>
                      <SelectItem value="line">직선 (Line)</SelectItem>
                      <SelectItem value="ring">링 (Ring)</SelectItem>
                      <SelectItem value="star">별 (Star)</SelectItem>
                      <SelectItem value="shield">방패 (Shield)</SelectItem>
                      <SelectItem value="dome">돔 (Dome)</SelectItem>
                      <SelectItem value="spiral">나선 (Spiral)</SelectItem>
                      <SelectItem value="cross">십자 (Cross)</SelectItem>
                      <SelectItem value="wave">파동 (Wave)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>주 색상</Label>
                    <Input
                      type="color"
                      value={config.primaryColor}
                      onChange={(e) => onConfigUpdate({ primaryColor: e.target.value })}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>보조 색상</Label>
                    <Input
                      type="color"
                      value={config.secondaryColor}
                      onChange={(e) => onConfigUpdate({ secondaryColor: e.target.value })}
                      className="h-10"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* 레벨 2: 파티클 시스템 */}
          <Collapsible open={openSections.particle} onOpenChange={() => onToggleSection('particle')}>
            <div className="border border-green-500 rounded-lg bg-green-500/5 ml-6">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-green-500/10 transition-colors">
                <div className="flex items-center gap-2">
                  {openSections.particle ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <Badge className="bg-green-600">레벨 2</Badge>
                  <span className="font-semibold">애니메이션 패턴</span>
                  <span className="text-xs text-slate-400">(직선/유도/곡선/상승 등)</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="p-4 pt-0 space-y-3">
                <div className="space-y-2">
                  <Label>움직임 패턴</Label>
                  <Select
                    value={config.particleStrategy}
                    onValueChange={(value: ParticleUpdateStrategy) => onConfigUpdate({ particleStrategy: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="projectile">투사체 (직선 비행)</SelectItem>
                      <SelectItem value="melee_splash">근접 확산 (부채꼴)</SelectItem>
                      <SelectItem value="aoe_burst">영역 폭발 (사방 확산)</SelectItem>
                      <SelectItem value="static">정적 효과 (고정)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>파티클 개수</Label>
                    <Badge variant="outline">{config.particleCount}</Badge>
                  </div>
                  <Slider
                    value={[config.particleCount]}
                    onValueChange={([value]) => onConfigUpdate({ particleCount: value })}
                    min={5}
                    max={100}
                    step={5}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>파티클 크기</Label>
                    <Badge variant="outline">{config.particleSize}px</Badge>
                  </div>
                  <Slider
                    value={[config.particleSize]}
                    onValueChange={([value]) => onConfigUpdate({ particleSize: value })}
                    min={2}
                    max={20}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>생존 시간</Label>
                    <Badge variant="outline">{config.particleLifetime}ms</Badge>
                  </div>
                  <Slider
                    value={[config.particleLifetime]}
                    onValueChange={([value]) => onConfigUpdate({ particleLifetime: value })}
                    min={200}
                    max={2000}
                    step={100}
                  />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* 레벨 2: 투사체 설정 */}
          <Collapsible open={openSections.projectile} onOpenChange={() => onToggleSection('projectile')}>
            <div className="border border-yellow-500 rounded-lg bg-yellow-500/5 ml-6">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-yellow-500/10 transition-colors">
                <div className="flex items-center gap-2">
                  {openSections.projectile ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <Badge className="bg-yellow-600">레벨 3</Badge>
                  <span className="font-semibold">파티클 세부 설정</span>
                  <span className="text-xs text-slate-400">(형태/색상/크기)</span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="p-4 pt-0 space-y-3">
                <div className="space-y-2">
                  <Label>투사체 타입</Label>
                  <Select
                    value={config.projectileType}
                    onValueChange={(value: ProjectileType) => onConfigUpdate({ projectileType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">없음</SelectItem>
                      <SelectItem value="arrow">화살</SelectItem>
                      <SelectItem value="fireball">화염구</SelectItem>
                      <SelectItem value="lightning">번개</SelectItem>
                      <SelectItem value="wave">파동</SelectItem>
                      <SelectItem value="energy">에너지</SelectItem>
                      <SelectItem value="ice">얼음</SelectItem>
                      <SelectItem value="wind">바람</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {config.projectileType !== 'none' && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>투사체 속도</Label>
                        <Badge variant="outline">{config.projectileSpeed} px/s</Badge>
                      </div>
                      <Slider
                        value={[config.projectileSpeed]}
                        onValueChange={([value]) => onConfigUpdate({ projectileSpeed: value })}
                        min={100}
                        max={1000}
                        step={50}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>투사체 크기</Label>
                        <Badge variant="outline">{config.projectileSize}px</Badge>
                      </div>
                      <Slider
                        value={[config.projectileSize]}
                        onValueChange={([value]) => onConfigUpdate({ projectileSize: value })}
                        min={5}
                        max={30}
                        step={1}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>호밍 활성화</Label>
                      <Switch
                        checked={config.homingEnabled}
                        onCheckedChange={(checked) => onConfigUpdate({ homingEnabled: checked })}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>관통 횟수</Label>
                        <Badge variant="outline">{config.pierceCount}</Badge>
                      </div>
                      <Slider
                        value={[config.pierceCount]}
                        onValueChange={([value]) => onConfigUpdate({ pierceCount: value })}
                        min={0}
                        max={5}
                        step={1}
                      />
                    </div>
                  </>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* 레벨 3: 추가 효과 */}
          <Collapsible open={openSections.additional} onOpenChange={() => onToggleSection('additional')}>
            <div className="border border-purple-500 rounded-lg bg-purple-500/5 ml-12">
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-purple-500/10 transition-colors">
                <div className="flex items-center gap-2">
                  {openSections.additional ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <Badge className="bg-purple-600">레벨 4</Badge>
                  <span className="font-semibold">추가 효과</span>
                  <span className="text-xs text-slate-400">(선택적 결합 - 카메라/글로우/플래시 등)</span>
                </div>
                <Button size="sm" variant="ghost" onClick={(e) => {
                  e.stopPropagation();
                  toast.info('효과 목록에서 선택하여 추가하세요');
                }}>
                  <Plus className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="p-4 pt-0">
                <AdditionalEffectsPanel
                  effects={additionalEffects}
                  config={config}
                  onToggleEffect={onToggleEffect}
                  onRemoveEffect={onRemoveEffect}
                  onConfigUpdate={onConfigUpdate}
                />
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}
