import { useState } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Copy, Trash2 } from 'lucide-react';
import { Skill, ProjectileType, EffectShape, EFFECT_PRESETS } from '../lib/skillSystem';
import * as LucideIcons from 'lucide-react';

interface SkillDetailPanelProps {
  skill: Skill;
  onUpdate: (skillId: string, updates: Partial<Skill>) => void;
  onEdit: (skill: Skill) => void;
  onDuplicate: (skill: Skill) => void;
  onDelete: (skillId: string) => void;
}

export function SkillDetailPanel({
  skill,
  onUpdate,
  onEdit,
  onDuplicate,
  onDelete,
}: SkillDetailPanelProps) {
  // 아이콘 렌더링
  const getIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className="w-4 h-4" /> : null;
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
              style={{ 
                backgroundColor: skill.visual.color,
                boxShadow: `0 0 15px ${skill.visual.color}50`
              }}
            >
              <div className="text-white">
                {getIcon(skill.iconName)}
              </div>
            </div>
            <div>
              <CardTitle className="text-lg">{skill.name}</CardTitle>
              <CardDescription className="text-sm">
                {skill.description}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDuplicate(skill)}
              className="h-9"
            >
              <Copy className="w-4 h-4 mr-2" />
              복제
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (window.confirm(`"${skill.name}" 스킬을 삭제하시겠습니까?`)) {
                  onDelete(skill.id);
                }
              }}
              className="h-9 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              삭제
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden min-h-0 p-3">
        <div className="grid grid-cols-2 gap-4 h-full">
          {/* 왼쪽: 스킬효과 */}
          <div className="flex flex-col pr-2 overflow-hidden min-h-0">
            <h2 className="text-base font-semibold text-slate-800 pb-1.5 border-b mb-2 flex-shrink-0">스킬효과</h2>
            
            <div className="flex-1 overflow-auto min-h-0 space-y-2.5">
              <div>
                <h3 className="text-sm font-semibold mb-2 text-slate-700">기본 성능</h3>
                <div className="space-y-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">SP 소모량: {skill.spCost}</Label>
                    <Slider
                      value={[skill.spCost]}
                      onValueChange={([value]) => onUpdate(skill.id, { spCost: value })}
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">쿨타임: {(skill.cooldown / 1000).toFixed(1)}초</Label>
                    <Slider
                      value={[skill.cooldown]}
                      onValueChange={([value]) => onUpdate(skill.id, { cooldown: value })}
                      min={0}
                      max={30000}
                      step={500}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">사거리: {skill.range}px</Label>
                    <Slider
                      value={[skill.range]}
                      onValueChange={([value]) => onUpdate(skill.id, { range: value })}
                      min={0}
                      max={500}
                      step={10}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">넓이: {skill.area}°</Label>
                    <Slider
                      value={[skill.area]}
                      onValueChange={([value]) => onUpdate(skill.id, { area: value })}
                      min={0}
                      max={360}
                      step={15}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2 text-slate-700">효과 설정</h3>
                <div className="space-y-2">
                  <div className="text-xs text-slate-600 mb-1">유효 영역에 도달한 캐릭터에게 적용할 효과</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-700">능력치</Label>
                      <Select
                        value={skill.damageFormula?.stat || 'attack'}
                        onValueChange={(value: 'attack' | 'defense' | 'magic' | 'speed') =>
                          onUpdate(skill.id, {
                            damageFormula: {
                              stat: value,
                              operator: skill.damageFormula?.operator || '*',
                              value: skill.damageFormula?.value || 0.5,
                            },
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="attack">공격력</SelectItem>
                          <SelectItem value="magic">마력</SelectItem>
                          <SelectItem value="defense">방어력</SelectItem>
                          <SelectItem value="speed">속도</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-700">연산자</Label>
                      <Select
                        value={skill.damageFormula?.operator || '*'}
                        onValueChange={(value: '+' | '*') =>
                          onUpdate(skill.id, {
                            damageFormula: {
                              stat: skill.damageFormula?.stat || 'attack',
                              operator: value,
                              value: skill.damageFormula?.value || (value === '*' ? 0.5 : 10),
                            },
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="*">×</SelectItem>
                          <SelectItem value="+">+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-700">수치</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={skill.damageFormula?.value || 0}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          onUpdate(skill.id, {
                            damageFormula: {
                              stat: skill.damageFormula?.stat || 'attack',
                              operator: skill.damageFormula?.operator || '*',
                              value: value,
                            },
                          });
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  {skill.damageFormula && (
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                      <span className="font-semibold text-blue-900">데미지 공식: </span>
                      <span className="text-blue-700">
                        {skill.damageFormula.stat === 'attack' && '공격력'}
                        {skill.damageFormula.stat === 'magic' && '마력'}
                        {skill.damageFormula.stat === 'defense' && '방어력'}
                        {skill.damageFormula.stat === 'speed' && '속도'}
                        {' '}{skill.damageFormula.operator === '*' ? '×' : '+'}{' '}
                        {skill.damageFormula.value}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2 text-slate-700">타이밍 구조</h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <div className="text-yellow-700 font-medium mb-1">선딜</div>
                      <div className="text-yellow-900">{skill.timing.windup}ms</div>
                    </div>
                    <div className="p-2 bg-red-50 border border-red-200 rounded">
                      <div className="text-red-700 font-medium mb-1">공격</div>
                      <div className="text-red-900">{skill.timing.execution}ms</div>
                    </div>
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                      <div className="text-blue-700 font-medium mb-1">후딜</div>
                      <div className="text-blue-900">{skill.timing.recovery}ms</div>
                    </div>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600">총 시전시간:</span>
                      <span className="font-semibold text-slate-800">
                        {skill.timing.windup + skill.timing.execution + skill.timing.recovery}ms
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 오른쪽: 그래픽 (탭으로 구성) */}
          <div className="overflow-hidden pl-2 border-l border-slate-200 flex flex-col min-h-0">
            <h2 className="text-base font-semibold text-slate-800 pb-1.5 border-b mb-2">그래픽</h2>
            
            <Tabs defaultValue="visual" className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="visual">시각 효과</TabsTrigger>
                <TabsTrigger value="projectile">투사체</TabsTrigger>
                <TabsTrigger value="animation">애니메이션</TabsTrigger>
              </TabsList>
              
              <div className="flex-1 overflow-auto min-h-0 mt-2">
                <TabsContent value="visual" className="m-0 space-y-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">이펙트 프리셋</Label>
                    <Select
                      value=""
                      onValueChange={(presetKey: string) => {
                        const preset = EFFECT_PRESETS[presetKey];
                        if (preset) {
                          onUpdate(skill.id, {
                            visual: {
                              ...skill.visual,
                              color: preset.color,
                              secondaryColor: preset.secondaryColor,
                              glowIntensity: preset.glowIntensity,
                            },
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="프리셋 선택..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {Object.entries(EFFECT_PRESETS).map(([key, preset]) => (
                          <SelectItem key={key} value={key}>
                            {preset.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">이펙트 모양</Label>
                    <Select
                      value={skill.visual.effectShape}
                      onValueChange={(value: EffectShape) =>
                        onUpdate(skill.id, {
                          visual: { ...skill.visual, effectShape: value },
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="circle">원형</SelectItem>
                        <SelectItem value="cone">부채꼴</SelectItem>
                        <SelectItem value="line">직선</SelectItem>
                        <SelectItem value="ring">링</SelectItem>
                        <SelectItem value="star">별</SelectItem>
                        <SelectItem value="shield">방패</SelectItem>
                        <SelectItem value="dome">돔</SelectItem>
                        <SelectItem value="spiral">나선</SelectItem>
                        <SelectItem value="cross">십자</SelectItem>
                        <SelectItem value="wave">파동</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">주 색상</Label>
                      <Input
                        type="color"
                        value={skill.visual.color}
                        onChange={(e) =>
                          onUpdate(skill.id, {
                            visual: { ...skill.visual, color: e.target.value },
                          })
                        }
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">보조 색상</Label>
                      <Input
                        type="color"
                        value={skill.visual.secondaryColor}
                        onChange={(e) =>
                          onUpdate(skill.id, {
                            visual: { ...skill.visual, secondaryColor: e.target.value },
                          })
                        }
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">파티클 수: {skill.visual.particleCount}</Label>
                    <Slider
                      value={[skill.visual.particleCount]}
                      onValueChange={([value]) =>
                        onUpdate(skill.id, {
                          visual: { ...skill.visual, particleCount: value },
                        })
                      }
                      min={0}
                      max={50}
                      step={5}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">발광 강도: {skill.visual.glowIntensity.toFixed(1)}</Label>
                    <Slider
                      value={[skill.visual.glowIntensity * 100]}
                      onValueChange={([value]) =>
                        onUpdate(skill.id, {
                          visual: { ...skill.visual, glowIntensity: value / 100 },
                        })
                      }
                      min={0}
                      max={100}
                      step={10}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="projectile" className="m-0 space-y-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">투사체 타입</Label>
                    <Select
                      value={skill.projectile.type}
                      onValueChange={(value: ProjectileType) =>
                        onUpdate(skill.id, {
                          projectile: { ...skill.projectile, type: value },
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">없음 (근접)</SelectItem>
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
                  {skill.projectile.type !== 'none' && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs">속도: {skill.projectile.speed}px/s</Label>
                        <Slider
                          value={[skill.projectile.speed]}
                          onValueChange={([value]) =>
                            onUpdate(skill.id, {
                              projectile: { ...skill.projectile, speed: value },
                            })
                          }
                          min={0}
                          max={1000}
                          step={50}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">크기: {skill.projectile.size}px</Label>
                        <Slider
                          value={[skill.projectile.size]}
                          onValueChange={([value]) =>
                            onUpdate(skill.id, {
                              projectile: { ...skill.projectile, size: value },
                            })
                          }
                          min={5}
                          max={50}
                          step={5}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">지속시간: {((skill.projectile as any).duration / 1000).toFixed(1)}초</Label>
                        <Slider
                          value={[(skill.projectile as any).duration || 2000]}
                          onValueChange={([value]) =>
                            onUpdate(skill.id, {
                              projectile: { ...skill.projectile, duration: value } as any,
                            })
                          }
                          min={100}
                          max={5000}
                          step={100}
                        />
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="animation" className="m-0 space-y-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">시전 애니메이션</Label>
                    <Select
                      value={skill.animation.castAnimation}
                      onValueChange={(value) =>
                        onUpdate(skill.id, {
                          animation: { ...skill.animation, castAnimation: value },
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="charge">충전</SelectItem>
                        <SelectItem value="spin">회전</SelectItem>
                        <SelectItem value="glow">발광</SelectItem>
                        <SelectItem value="pulse">맥동</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">적중 애니메이션</Label>
                    <Select
                      value={skill.animation.impactAnimation}
                      onValueChange={(value) =>
                        onUpdate(skill.id, {
                          animation: { ...skill.animation, impactAnimation: value },
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="explosion">폭발</SelectItem>
                        <SelectItem value="ripple">파문</SelectItem>
                        <SelectItem value="flash">섬광</SelectItem>
                        <SelectItem value="scatter">산란</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">화면 흔들림: {skill.animation.cameraShake}</Label>
                    <Slider
                      value={[skill.animation.cameraShake]}
                      onValueChange={([value]) =>
                        onUpdate(skill.id, {
                          animation: { ...skill.animation, cameraShake: value },
                        })
                      }
                      min={0}
                      max={10}
                      step={1}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">시전 크기: {skill.animation.castScale.toFixed(1)}x</Label>
                    <Slider
                      value={[skill.animation.castScale * 100]}
                      onValueChange={([value]) =>
                        onUpdate(skill.id, {
                          animation: { ...skill.animation, castScale: value / 100 },
                        })
                      }
                      min={50}
                      max={200}
                      step={10}
                    />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
