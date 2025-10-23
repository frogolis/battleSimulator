import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Label } from './ui/label';
import { Wand2, Package, Plus, Trash2, ChevronDown, ChevronRight, Sparkles, Zap, Eye, Volume2, MousePointerClick, Target, Sword, Palette, Play, Edit2, Copy } from 'lucide-react';
import { defaultSkills, Skill, ProjectileType, EffectShape, BasicAttackSlot, defaultBasicAttacks, EffectCategory, cloneSkill } from '../lib/skillSystem';
import { Item, ItemSlot } from '../lib/itemSystem';
import { toast } from 'sonner';
import * as LucideIcons from 'lucide-react';
import { SkillTestLab } from './SkillTestLab';
import { SkillBuilder } from './SkillBuilder';

// 사용 가능한 아이콘 목록
const AVAILABLE_ICONS = [
  'Swords', 'Shield', 'Zap', 'Heart', 'Wind', 'Flame', 'Sparkles', 'Star',
  'Target', 'Crosshair', 'Bolt', 'Skull', 'CircleDot', 'Orbit',
  'Flask', 'Bomb', 'Scroll', 'Package', 'Gift', 'Potion',
] as const;

interface SkillAndItemSettingsProps {
  skills: Record<string, Skill>;
  onSkillsChange: (skills: Record<string, Skill>) => void;
  playerBasicAttack?: BasicAttackSlot;
  monsterBasicAttack?: BasicAttackSlot;
  onPlayerBasicAttackChange?: (slot: BasicAttackSlot) => void;
  onMonsterBasicAttackChange?: (slot: BasicAttackSlot) => void;
  itemSlots?: ItemSlot[];
  onItemSlotsChange?: (slots: ItemSlot[]) => void;
  showOnlySkills?: boolean;
  showOnlyItems?: boolean;
}

// 스킬 세트 타입 정의
interface SkillSet {
  id: string;
  name: string;
  skills: Record<string, Skill>;
}

export function SkillAndItemSettings({ 
  skills,
  onSkillsChange,
  playerBasicAttack,
  monsterBasicAttack,
  onPlayerBasicAttackChange,
  onMonsterBasicAttackChange,
  itemSlots = [],
  onItemSlotsChange,
  showOnlySkills = false,
  showOnlyItems = false
}: SkillAndItemSettingsProps) {
  // 스킬 세트 관리
  const [skillSets, setSkillSets] = useState<SkillSet[]>([
    {
      id: 'default',
      name: '기본 스킬 세트',
      skills: defaultSkills,
    }
  ]);
  const [currentSetId, setCurrentSetId] = useState<string>('default');
  const [isAddingSet, setIsAddingSet] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [isSkillBuilderOpen, setIsSkillBuilderOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | undefined>(undefined);
  
  const currentSet = skillSets.find(set => set.id === currentSetId);
  
  // 현재 세트의 스킬로 초기화
  useEffect(() => {
    if (currentSet && JSON.stringify(currentSet.skills) !== JSON.stringify(skills)) {
      onSkillsChange(currentSet.skills);
    }
  }, [currentSetId]);
  
  const [expandedSkills, setExpandedSkills] = useState<Record<string, boolean>>({
    meleeAttack: false,
    rangedAttack: false,
    powerSlash: false,
    whirlwind: false,
    heal: false,
    powerBuff: false,
  });

  const updateSkill = (skillId: string, updates: Partial<Skill>) => {
    const newSkills = {
      ...skills,
      [skillId]: {
        ...skills[skillId],
        ...updates,
      },
    };
    
    // 현재 스킬 세트 업데이트
    const updatedSets = skillSets.map(set => 
      set.id === currentSetId 
        ? { ...set, skills: newSkills }
        : set
    );
    setSkillSets(updatedSets);
    
    onSkillsChange(newSkills);
    toast.success(`✨ ${skills[skillId].name} 스킬이 업데이트되었습니다!`);
  };
  
  // 스킬 세트 추가
  const addSkillSet = () => {
    if (!newSetName.trim()) {
      toast.error('스킬 세트 이름을 입력하세요!');
      return;
    }
    
    const newSet: SkillSet = {
      id: `set-${Date.now()}`,
      name: newSetName,
      skills: { ...defaultSkills }, // 기본 스킬로 시작
    };
    
    setSkillSets([...skillSets, newSet]);
    setCurrentSetId(newSet.id);
    setNewSetName('');
    setIsAddingSet(false);
    toast.success(`✨ "${newSetName}" 스킬 세트가 추가되었습니다!`);
  };
  
  // 스킬 세트 삭제
  const deleteSkillSet = (setId: string) => {
    if (skillSets.length === 1) {
      toast.error('최소 1개의 스킬 세트가 필요합니다!');
      return;
    }
    
    const setToDelete = skillSets.find(s => s.id === setId);
    const updatedSets = skillSets.filter(set => set.id !== setId);
    setSkillSets(updatedSets);
    
    // 현재 선택된 세트가 삭제되면 첫 번째 세트로 변경
    if (currentSetId === setId) {
      setCurrentSetId(updatedSets[0].id);
    }
    
    toast.success(`🗑️ "${setToDelete?.name}" 스킬 세트가 삭제되었습니다!`);
  };
  
  // 스킬 세트 이름 변경
  const renameSkillSet = (setId: string, newName: string) => {
    if (!newName.trim()) return;
    
    const updatedSets = skillSets.map(set =>
      set.id === setId ? { ...set, name: newName } : set
    );
    setSkillSets(updatedSets);
    toast.success(`✏️ 스킬 세트 이름이 변경되었습니다!`);
  };
  
  // 스킬 추가 (빌더에서 생성된 스킬)
  const handleSkillCreate = (skill: Skill) => {
    const newSkills = {
      ...skills,
      [skill.id]: skill,
    };
    
    // 현재 스킬 세트 업데이트
    const updatedSets = skillSets.map(set => 
      set.id === currentSetId 
        ? { ...set, skills: newSkills }
        : set
    );
    setSkillSets(updatedSets);
    
    onSkillsChange(newSkills);
    setIsSkillBuilderOpen(false);
    setEditingSkill(undefined);
  };
  
  // 스킬 삭제
  const deleteSkill = (skillId: string) => {
    const { [skillId]: removed, ...remainingSkills } = skills;
    
    // 현재 스킬 세트 업데이트
    const updatedSets = skillSets.map(set => 
      set.id === currentSetId 
        ? { ...set, skills: remainingSkills }
        : set
    );
    setSkillSets(updatedSets);
    
    onSkillsChange(remainingSkills);
    toast.success(`🗑️ "${removed.name}" 스킬이 삭제되었습니다!`);
  };
  
  // 스킬 복제
  const duplicateSkill = (skill: Skill) => {
    const clonedSkill = cloneSkill(skill);
    const newSkills = {
      ...skills,
      [clonedSkill.id]: clonedSkill,
    };
    
    // 현재 스킬 세트 업데이트
    const updatedSets = skillSets.map(set => 
      set.id === currentSetId 
        ? { ...set, skills: newSkills }
        : set
    );
    setSkillSets(updatedSets);
    
    onSkillsChange(newSkills);
    toast.success(`📋 "${skill.name}" 스킬이 복제되었습니다!`);
  };
  
  // 스킬 수정 모드 열기
  const openEditSkill = (skill: Skill) => {
    setEditingSkill(skill);
    setIsSkillBuilderOpen(true);
  };

  const toggleSkillExpanded = (skillId: string) => {
    setExpandedSkills(prev => ({
      ...prev,
      [skillId]: !prev[skillId],
    }));
  };

  const resetSkill = (skillId: string) => {
    const newSkills = {
      ...skills,
      [skillId]: { ...defaultSkills[skillId] },
    };
    onSkillsChange(newSkills);
    toast.success(`🔄 ${skills[skillId].name} 스킬이 초기화되었습니다!`);
  };

  // 기본 공격 업데이트 함수
  const updatePlayerBasicAttack = (updates: Partial<Skill>) => {
    if (playerBasicAttack && onPlayerBasicAttackChange) {
      onPlayerBasicAttackChange({
        ...playerBasicAttack,
        skill: {
          ...playerBasicAttack.skill,
          ...updates,
        },
      });
      toast.success('✨ 플레이어 기본 공격이 업데이트되었습니다!');
    }
  };

  const updateMonsterBasicAttack = (updates: Partial<Skill>) => {
    if (monsterBasicAttack && onMonsterBasicAttackChange) {
      onMonsterBasicAttackChange({
        ...monsterBasicAttack,
        skill: {
          ...monsterBasicAttack.skill,
          ...updates,
        },
      });
      toast.success('✨ 몬스터 기본 공격이 업데이트되었습니다!');
    }
  };

  const resetPlayerBasicAttack = () => {
    if (playerBasicAttack && onPlayerBasicAttackChange) {
      const attackType = playerBasicAttack.skill.projectile.type === 'none' ? 'melee' : 'ranged';
      const defaultSkill = attackType === 'melee' 
        ? { ...defaultBasicAttacks.meleeBasic }
        : { ...defaultBasicAttacks.rangedBasic };
      
      onPlayerBasicAttackChange({
        skill: defaultSkill,
        keyBinding: 'click',
      });
      toast.success('🔄 플레이어 기본 공격이 초기화되었습니다!');
    }
  };

  const resetMonsterBasicAttack = () => {
    if (monsterBasicAttack && onMonsterBasicAttackChange) {
      const attackType = monsterBasicAttack.skill.projectile.type === 'none' ? 'melee' : 'ranged';
      const defaultSkill = attackType === 'melee' 
        ? { ...defaultBasicAttacks.meleeBasic }
        : { ...defaultBasicAttacks.rangedBasic };
      
      onMonsterBasicAttackChange({
        skill: defaultSkill,
        keyBinding: 'click',
      });
      toast.success('🔄 몬스터 기본 공격이 초기화되었습니다!');
    }
  };

  // 기본 공격을 스킬처럼 렌더링하는 함수
  const renderBasicAttackAsSkill = (
    skill: Skill,
    updateSkill: (updates: Partial<Skill>) => void,
    resetAttack: () => void,
    characterType: 'player' | 'monster'
  ) => {
    const displayName = characterType === 'player' ? '플레이어 기본 공격' : '몬스터 기본 공격';
    const icon = characterType === 'player' ? <Target className="w-4 h-4" /> : <Sword className="w-4 h-4" />;
    const colorClass = characterType === 'player' ? 'text-blue-600' : 'text-red-600';
    
    return (
      <Collapsible
        key={skill.id}
        open={expandedSkills[skill.id]}
        onOpenChange={() => toggleSkillExpanded(skill.id)}
      >
        <div className="border rounded-lg overflow-hidden">
          {/* 기본 공격 헤더 */}
          <CollapsibleTrigger asChild>
            <div className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 cursor-pointer transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {expandedSkills[skill.id] ? (
                    <ChevronDown className={`w-5 h-5 ${colorClass}`} />
                  ) : (
                    <ChevronRight className={`w-5 h-5 ${colorClass}`} />
                  )}
                  <div className="flex items-center gap-2">
                    <div className={colorClass}>
                      {icon}
                    </div>
                    <h3 className="text-slate-900">{displayName}</h3>
                    <Badge variant="outline">
                      <MousePointerClick className="w-3 h-3 mr-1" />
                      클릭
                    </Badge>
                    <Badge variant={skill.projectile.type === 'none' ? 'default' : 'secondary'}>
                      {skill.projectile.type === 'none' ? '⚔️ 근접' : '🏹 원거리'}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">{skill.description}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      resetAttack();
                    }}
                  >
                    <span className="text-xs">초기화</span>
                  </Button>
                </div>
              </div>
            </div>
          </CollapsibleTrigger>

          {/* 기본 공격 상세 설정 - 스킬과 동일한 탭 구조 사용 */}
          <CollapsibleContent>
            <div className="p-6 bg-white">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic" className="flex items-center gap-1">
                    <Sword className="w-3 h-3" />
                    기본 설정
                  </TabsTrigger>
                  <TabsTrigger value="visual" className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    시각 효과
                  </TabsTrigger>
                  <TabsTrigger value="effect" className="flex items-center gap-1">
                    <Palette className="w-3 h-3" />
                    이펙트
                  </TabsTrigger>
                  <TabsTrigger value="animation" className="flex items-center gap-1">
                    <Play className="w-3 h-3" />
                    애니메이션
                  </TabsTrigger>
                </TabsList>

                {/* 기본 설정 탭 */}
                <TabsContent value="basic" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">사거리: {skill.range}px</Label>
                      <Slider
                        value={[skill.range]}
                        onValueChange={([value]) => updateSkill({ range: value })}
                        min={30}
                        max={200}
                        step={5}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">범위: {skill.area}{skill.projectile.type === 'none' ? '°' : 'px'}</Label>
                      <Slider
                        value={[skill.area]}
                        onValueChange={([value]) => updateSkill({ area: value })}
                        min={30}
                        max={360}
                        step={10}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">데미지 배율: {skill.damageMultiplier.toFixed(1)}x</Label>
                      <Slider
                        value={[skill.damageMultiplier * 100]}
                        onValueChange={([value]) => updateSkill({ damageMultiplier: value / 100 })}
                        min={50}
                        max={200}
                        step={10}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">시전 시간: {skill.castTime}ms</Label>
                      <Slider
                        value={[skill.castTime]}
                        onValueChange={([value]) => updateSkill({ castTime: value })}
                        min={0}
                        max={1000}
                        step={50}
                        className="w-full"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* 여기에 스킬과 동일한 visual, projectile, animation 탭을 그대로 재사용 */}
                {/* 나머지 탭들은 기존 스킬 렌더링 코드를 재사용하기 위해 동일한 구조 유지 */}
                <TabsContent value="visual" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">주 색상</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={skill.visual.color}
                          onChange={(e) =>
                            updateSkill({
                              visual: { ...skill.visual, color: e.target.value },
                            })
                          }
                          className="w-16 h-8 p-1"
                        />
                        <Input
                          type="text"
                          value={skill.visual.color}
                          onChange={(e) =>
                            updateSkill({
                              visual: { ...skill.visual, color: e.target.value },
                            })
                          }
                          className="h-8 flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">파티클 수: {skill.visual.particleCount}</Label>
                      <Slider
                        value={[skill.visual.particleCount]}
                        onValueChange={([value]) =>
                          updateSkill({
                            visual: { ...skill.visual, particleCount: value },
                          })
                        }
                        min={0}
                        max={50}
                        step={5}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">이펙트 모양</Label>
                      <Select
                        value={skill.visual.effectShape}
                        onValueChange={(value: EffectShape) =>
                          updateSkill({
                            visual: { ...skill.visual, effectShape: value },
                          })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="circle">원형 (Circle)</SelectItem>
                          <SelectItem value="cone">원뿔형 (Cone)</SelectItem>
                          <SelectItem value="line">선형 (Line)</SelectItem>
                          <SelectItem value="ring">고리형 (Ring)</SelectItem>
                          <SelectItem value="star">별형 (Star)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="projectile" className="space-y-4 mt-4">
                  {/* 공격 방식 선택 */}
                  <div className="space-y-2">
                    <Label className="text-xs">공격 방식</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={skill.projectile.type === 'none' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() =>
                          updateSkill({
                            projectile: {
                              ...skill.projectile,
                              type: 'none',
                              speed: 0,
                              size: 0,
                              piercing: false,
                              homing: false,
                              trail: false,
                              trailLength: 0,
                            },
                          })
                        }
                      >
                        ⚔️ 근접
                      </Button>
                      <Button
                        type="button"
                        variant={skill.projectile.type !== 'none' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() =>
                          updateSkill({
                            projectile: {
                              ...skill.projectile,
                              type: skill.projectile.type === 'none' ? 'arrow' : skill.projectile.type,
                              speed: skill.projectile.speed || 300,
                              size: skill.projectile.size || 10,
                            },
                          })
                        }
                      >
                        🏹 투사체
                      </Button>
                    </div>
                  </div>

                  {/* 근접 공격 안내 */}
                  {skill.projectile.type === 'none' && (
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2 text-slate-700">
                        <span className="text-2xl">⚔️</span>
                        <div>
                          <p className="font-medium">근접 공격</p>
                          <p className="text-xs text-slate-600 mt-1">
                            이 공격은 직접 타격 방식으로 작동합니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 투사체 설정 */}
                  {skill.projectile.type !== 'none' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <Label className="text-xs">투사체 타입</Label>
                        <Select
                          value={skill.projectile.type}
                          onValueChange={(value: ProjectileType) =>
                            updateSkill({ projectile: { ...skill.projectile, type: value } })
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="arrow">화살 (Arrow)</SelectItem>
                            <SelectItem value="fireball">파이어볼 (Fireball)</SelectItem>
                            <SelectItem value="lightning">번개 (Lightning)</SelectItem>
                            <SelectItem value="wave">파동 (Wave)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">투사체 속도: {skill.projectile.speed}px/s</Label>
                        <Slider
                          value={[skill.projectile.speed]}
                          onValueChange={([value]) =>
                            updateSkill({ projectile: { ...skill.projectile, speed: value } })
                          }
                          min={0}
                          max={1000}
                          step={50}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">투사체 크기: {skill.projectile.size}px</Label>
                        <Slider
                          value={[skill.projectile.size]}
                          onValueChange={([value]) =>
                            updateSkill({ projectile: { ...skill.projectile, size: value } })
                          }
                          min={0}
                          max={50}
                          step={5}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="animation" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">시전 애니메이션</Label>
                      <Select
                        value={skill.animation.castAnimation}
                        onValueChange={(value) =>
                          updateSkill({ animation: { ...skill.animation, castAnimation: value } })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="charge">충전 (Charge)</SelectItem>
                          <SelectItem value="spin">회전 (Spin)</SelectItem>
                          <SelectItem value="glow">발광 (Glow)</SelectItem>
                          <SelectItem value="pulse">맥동 (Pulse)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">화면 흔들림: {skill.animation.cameraShake}</Label>
                      <Slider
                        value={[skill.animation.cameraShake]}
                        onValueChange={([value]) =>
                          updateSkill({ animation: { ...skill.animation, cameraShake: value } })
                        }
                        min={0}
                        max={10}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-6">
      {/* 스킬 테스트 랩 */}
      {!showOnlyItems && playerBasicAttack && monsterBasicAttack && (
        <SkillTestLab
          skills={skills}
          playerBasicAttack={playerBasicAttack}
          monsterBasicAttack={monsterBasicAttack}
        />
      )}

      {/* 스킬 시스템 설정 (기본 공격 포함) */}
      {!showOnlyItems && (
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-600" />
              스킬 시스템 설정
            </CardTitle>
            <CardDescription>
              기본 공격 및 스킬의 이펙트, 투사체, 애니메이션, 사운드 설정을 관리합니다.
              <br />
              <span className="text-xs text-blue-600">💡 기본 공격도 스킬 시스템을 사용하며, 데이터셋에서는 파라미터(데미지, 쿨타임 등)만 조정할 수 있습니다.</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
            {/* 기본 공격 먼저 표시 */}
            {playerBasicAttack && (
              renderBasicAttackAsSkill(
                playerBasicAttack.skill,
                updatePlayerBasicAttack,
                resetPlayerBasicAttack,
                'player'
              )
            )}
            {monsterBasicAttack && (
              renderBasicAttackAsSkill(
                monsterBasicAttack.skill,
                updateMonsterBasicAttack,
                resetMonsterBasicAttack,
                'monster'
              )
            )}
            
            {/* 구분선 */}
            {playerBasicAttack && monsterBasicAttack && (
              <Separator className="my-4" />
            )}
            
            {/* 스킬 목록 - 순서 지정 */}
            {/* 새 스킬 추가 버튼 */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 mb-4">
              <p className="text-sm flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-green-600" />
                <span>커스텀 스킬을 추가하여 스킬 세트를 확장하세요</span>
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setEditingSkill(undefined);
                  setIsSkillBuilderOpen(true);
                }}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                새 스킬 추가
              </Button>
            </div>
            
            {/* 모든 스킬 표시 (기본 + 커스텀) */}
            {Object.values(skills).map((skill) => (
              <Collapsible
                key={skill.id}
                open={expandedSkills[skill.id]}
                onOpenChange={() => toggleSkillExpanded(skill.id)}
              >
                <div id={`skill-${skill.id}`} className="border rounded-lg overflow-hidden scroll-mt-6">
                  {/* 스킬 헤더 */}
                  <CollapsibleTrigger asChild>
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 cursor-pointer transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {expandedSkills[skill.id] ? (
                            <ChevronDown className="w-5 h-5 text-purple-600" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-purple-600" />
                          )}
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full border-2 border-white shadow-md"
                              style={{ backgroundColor: skill.visual.color }}
                            />
                            <h3 className="text-purple-900">{skill.name}</h3>
                            <Badge variant="outline">{skill.type}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-600 mr-2">{skill.description}</span>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditSkill(skill);
                              }}
                              className="h-7 px-2"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateSkill(skill);
                              }}
                              className="h-7 px-2"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`"${skill.name}" 스킬을 삭제하시겠습니까?`)) {
                                  deleteSkill(skill.id);
                                }
                              }}
                              className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  {/* 스킬 상세 설정 */}
                  <CollapsibleContent>
                    <div className="p-6 bg-white">
                      <Tabs defaultValue="basic" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="basic" className="flex items-center gap-1">
                            <Sword className="w-3 h-3" />
                            기본 설정
                          </TabsTrigger>
                          <TabsTrigger value="visual" className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            시각 효과
                          </TabsTrigger>
                          <TabsTrigger value="effect" className="flex items-center gap-1">
                            <Palette className="w-3 h-3" />
                            이펙트
                          </TabsTrigger>
                          <TabsTrigger value="animation" className="flex items-center gap-1">
                            <Play className="w-3 h-3" />
                            애니메이션
                          </TabsTrigger>
                        </TabsList>

                        {/* 기본 설정 탭 */}
                        <TabsContent value="basic" className="space-y-4 mt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs">SP 소모량</Label>
                              <Input
                                type="number"
                                value={skill.spCost}
                                onChange={(e) => updateSkill(skill.id, { spCost: parseInt(e.target.value) || 0 })}
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">쿨타임 (ms)</Label>
                              <Input
                                type="number"
                                value={skill.cooldown}
                                onChange={(e) => updateSkill(skill.id, { cooldown: parseInt(e.target.value) || 0 })}
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">시전 시간 (ms)</Label>
                              <Input
                                type="number"
                                value={skill.castTime}
                                onChange={(e) => updateSkill(skill.id, { castTime: parseInt(e.target.value) || 0 })}
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">사거리 (px)</Label>
                              <Input
                                type="number"
                                value={skill.range}
                                onChange={(e) => updateSkill(skill.id, { range: parseInt(e.target.value) || 0 })}
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">범위/각도</Label>
                              <Input
                                type="number"
                                value={skill.area}
                                onChange={(e) => updateSkill(skill.id, { area: parseInt(e.target.value) || 0 })}
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">데미지 배율</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={skill.damageMultiplier}
                                onChange={(e) => updateSkill(skill.id, { damageMultiplier: parseFloat(e.target.value) || 0 })}
                                className="h-8"
                              />
                            </div>
                            {skill.type === 'heal' && (
                              <div className="space-y-2">
                                <Label className="text-xs">회복량</Label>
                                <Input
                                  type="number"
                                  value={skill.healAmount}
                                  onChange={(e) => updateSkill(skill.id, { healAmount: parseInt(e.target.value) || 0 })}
                                  className="h-8"
                                />
                              </div>
                            )}
                            {(skill.type === 'buff' || skill.type === 'debuff') && (
                              <div className="space-y-2">
                                <Label className="text-xs">버프 지속시간 (ms)</Label>
                                <Input
                                  type="number"
                                  value={skill.buffDuration}
                                  onChange={(e) => updateSkill(skill.id, { buffDuration: parseInt(e.target.value) || 0 })}
                                  className="h-8"
                                />
                              </div>
                            )}
                          </div>
                        </TabsContent>

                        {/* 시각 효과 설정 */}
                        <TabsContent value="visual" className="space-y-4 mt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs">주 색상</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="color"
                                  value={skill.visual.color}
                                  onChange={(e) =>
                                    updateSkill(skill.id, {
                                      visual: { ...skill.visual, color: e.target.value },
                                    })
                                  }
                                  className="w-16 h-8 p-1"
                                />
                                <Input
                                  type="text"
                                  value={skill.visual.color}
                                  onChange={(e) =>
                                    updateSkill(skill.id, {
                                      visual: { ...skill.visual, color: e.target.value },
                                    })
                                  }
                                  className="h-8 flex-1"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">보조 색상</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="color"
                                  value={skill.visual.secondaryColor}
                                  onChange={(e) =>
                                    updateSkill(skill.id, {
                                      visual: { ...skill.visual, secondaryColor: e.target.value },
                                    })
                                  }
                                  className="w-16 h-8 p-1"
                                />
                                <Input
                                  type="text"
                                  value={skill.visual.secondaryColor}
                                  onChange={(e) =>
                                    updateSkill(skill.id, {
                                      visual: { ...skill.visual, secondaryColor: e.target.value },
                                    })
                                  }
                                  className="h-8 flex-1"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">파티클 수: {skill.visual.particleCount}</Label>
                              <Slider
                                value={[skill.visual.particleCount]}
                                onValueChange={([value]) =>
                                  updateSkill(skill.id, {
                                    visual: { ...skill.visual, particleCount: value },
                                  })
                                }
                                min={5}
                                max={100}
                                step={5}
                                className="w-full"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">파티클 크기: {skill.visual.particleSize}px</Label>
                              <Slider
                                value={[skill.visual.particleSize]}
                                onValueChange={([value]) =>
                                  updateSkill(skill.id, {
                                    visual: { ...skill.visual, particleSize: value },
                                  })
                                }
                                min={2}
                                max={20}
                                step={1}
                                className="w-full"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">파티클 수명: {skill.visual.particleLifetime}ms</Label>
                              <Slider
                                value={[skill.visual.particleLifetime]}
                                onValueChange={([value]) =>
                                  updateSkill(skill.id, {
                                    visual: { ...skill.visual, particleLifetime: value },
                                  })
                                }
                                min={200}
                                max={2000}
                                step={100}
                                className="w-full"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">발광 강도: {skill.visual.glowIntensity.toFixed(1)}</Label>
                              <Slider
                                value={[skill.visual.glowIntensity * 100]}
                                onValueChange={([value]) =>
                                  updateSkill(skill.id, {
                                    visual: { ...skill.visual, glowIntensity: value / 100 },
                                  })
                                }
                                min={0}
                                max={100}
                                step={10}
                                className="w-full"
                              />
                            </div>

                            <div className="space-y-2 col-span-2">
                              <Label className="text-xs">이펙트 모양</Label>
                              <Select
                                value={skill.visual.effectShape}
                                onValueChange={(value: EffectShape) =>
                                  updateSkill(skill.id, {
                                    visual: { ...skill.visual, effectShape: value },
                                  })
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="circle">원형 (Circle)</SelectItem>
                                  <SelectItem value="cone">원뿔형 (Cone)</SelectItem>
                                  <SelectItem value="line">선형 (Line)</SelectItem>
                                  <SelectItem value="ring">고리형 (Ring)</SelectItem>
                                  <SelectItem value="star">별형 (Star)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </TabsContent>

                        {/* 이펙트 설정 */}
                        <TabsContent value="effect" className="space-y-4 mt-4">
                          {/* 이펙트 카테고리 선택 */}
                          <div className="space-y-3 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border">
                            <Label className="text-sm">이펙트 카테고리</Label>
                            <Select
                              value={(() => {
                                if (skill.type === 'melee') return 'melee';
                                if (skill.type === 'ranged') return 'projectile';
                                if (skill.type === 'defense') return 'defense';
                                if (skill.type === 'buff') return 'buff';
                                if (skill.type === 'heal') return 'heal';
                                if (skill.type === 'area' || skill.type === 'damage') return 'area';
                                return 'melee';
                              })()}
                              onValueChange={(value: EffectCategory) => {
                                const preset = EFFECT_PRESETS[value];
                                // 카테고리에 맞는 기본값 설정
                                updateSkill(skill.id, {
                                  visual: {
                                    ...skill.visual,
                                    effectShape: preset.shapes[0],
                                  },
                                  projectile: {
                                    ...skill.projectile,
                                    type: preset.projectiles[0],
                                  },
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(EFFECT_PRESETS).map(([key, preset]) => (
                                  <SelectItem key={key} value={key}>
                                    {preset.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-slate-600">
                              스킬 타입에 맞는 이펙트 프리셋을 선택하세요
                            </p>
                          </div>

                          {/* 이펙트 모양 */}
                          <div className="space-y-2">
                            <Label className="text-xs">이펙트 모양</Label>
                            <Select
                              value={skill.visual.effectShape}
                              onValueChange={(value: EffectShape) =>
                                updateSkill(skill.id, {
                                  visual: { ...skill.visual, effectShape: value },
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="circle">⭕ 원형 (Circle)</SelectItem>
                                <SelectItem value="cone">🔺 원뿔형 (Cone)</SelectItem>
                                <SelectItem value="line">➖ 선형 (Line)</SelectItem>
                                <SelectItem value="ring">⭕ 고리형 (Ring)</SelectItem>
                                <SelectItem value="star">⭐ 별형 (Star)</SelectItem>
                                <SelectItem value="shield">🛡️ 방패형 (Shield)</SelectItem>
                                <SelectItem value="dome">🔮 돔형 (Dome)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* 투사체 타입 */}
                          <div className="space-y-2">
                            <Label className="text-xs">투사체 타입</Label>
                            <Select
                              value={skill.projectile.type}
                              onValueChange={(value: ProjectileType) =>
                                updateSkill(skill.id, {
                                  projectile: { ...skill.projectile, type: value },
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">⚔️ 없음 (근접)</SelectItem>
                                <SelectItem value="arrow">🏹 화살 (Arrow)</SelectItem>
                                <SelectItem value="fireball">🔥 파이어볼 (Fireball)</SelectItem>
                                <SelectItem value="lightning">⚡ 번개 (Lightning)</SelectItem>
                                <SelectItem value="wave">🌊 파동 (Wave)</SelectItem>
                                <SelectItem value="energy">✨ 에너지 (Energy)</SelectItem>
                                <SelectItem value="ice">❄️ 얼음 (Ice)</SelectItem>
                                <SelectItem value="wind">💨 바람 (Wind)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* 투사체 속성 (투사체 타입이 none이 아닐 때만 표시) */}
                          {skill.projectile.type !== 'none' && (
                            <>
                              <Separator />
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-xs">투사체 속도 (px/s)</Label>
                                  <Input
                                    type="number"
                                    value={skill.projectile.speed}
                                    onChange={(e) =>
                                      updateSkill(skill.id, {
                                        projectile: { ...skill.projectile, speed: parseInt(e.target.value) || 0 },
                                      })
                                    }
                                    className="h-8"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs">투사체 크기 (px)</Label>
                                  <Input
                                    type="number"
                                    value={skill.projectile.size}
                                    onChange={(e) =>
                                      updateSkill(skill.id, {
                                        projectile: { ...skill.projectile, size: parseInt(e.target.value) || 0 },
                                      })
                                    }
                                    className="h-8"
                                  />
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs">관통</Label>
                                  <input
                                    type="checkbox"
                                    checked={skill.projectile.piercing}
                                    onChange={(e) =>
                                      updateSkill(skill.id, {
                                        projectile: { ...skill.projectile, piercing: e.target.checked },
                                      })
                                    }
                                    className="w-4 h-4"
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs">유도</Label>
                                  <input
                                    type="checkbox"
                                    checked={skill.projectile.homing}
                                    onChange={(e) =>
                                      updateSkill(skill.id, {
                                        projectile: { ...skill.projectile, homing: e.target.checked },
                                      })
                                    }
                                    className="w-4 h-4"
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs">궤적 표시</Label>
                                  <input
                                    type="checkbox"
                                    checked={skill.projectile.trail}
                                    onChange={(e) =>
                                      updateSkill(skill.id, {
                                        projectile: { ...skill.projectile, trail: e.target.checked },
                                      })
                                    }
                                    className="w-4 h-4"
                                  />
                                </div>
                                {skill.projectile.trail && (
                                  <div className="space-y-2">
                                    <Label className="text-xs">궤적 길이 (px)</Label>
                                    <Input
                                      type="number"
                                      value={skill.projectile.trailLength}
                                      onChange={(e) =>
                                        updateSkill(skill.id, {
                                          projectile: { ...skill.projectile, trailLength: parseInt(e.target.value) || 0 },
                                        })
                                      }
                                      className="h-8"
                                    />
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          {/* 색상 프리셋 */}
                          <Separator />
                          <div className="space-y-2">
                            <Label className="text-xs">색상 프리셋</Label>
                            <div className="grid grid-cols-5 gap-2">
                              {EFFECT_PRESETS[(() => {
                                if (skill.type === 'melee') return 'melee';
                                if (skill.type === 'ranged') return 'projectile';
                                if (skill.type === 'defense') return 'defense';
                                if (skill.type === 'buff') return 'buff';
                                if (skill.type === 'heal') return 'heal';
                                return 'area';
                              })()].colors.map((color) => (
                                <button
                                  key={color}
                                  type="button"
                                  className="w-full h-10 rounded border-2 border-slate-300 hover:border-slate-500 transition-colors"
                                  style={{ backgroundColor: color }}
                                  onClick={() =>
                                    updateSkill(skill.id, {
                                      visual: { ...skill.visual, color },
                                    })
                                  }
                                  title={color}
                                />
                              ))}
                            </div>
                          </div>
                        </TabsContent>

                        {/* 투사체 설정 - DEPRECATED (이펙트 탭으로 통합됨) */}
                        <TabsContent value="projectile" className="space-y-4 mt-4">
                          {/* 공격 방식 선택 */}
                          <div className="space-y-2">
                            <Label className="text-xs">공격 방식</Label>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant={skill.projectile.type === 'none' ? 'default' : 'outline'}
                                className="flex-1"
                                onClick={() =>
                                  updateSkill(skill.id, {
                                    projectile: { 
                                      ...skill.projectile, 
                                      type: 'none',
                                      speed: 0,
                                      size: 0,
                                      piercing: false,
                                      homing: false,
                                      trail: false,
                                      trailLength: 0,
                                    },
                                  })
                                }
                              >
                                ⚔️ 근접
                              </Button>
                              <Button
                                type="button"
                                variant={skill.projectile.type !== 'none' ? 'default' : 'outline'}
                                className="flex-1"
                                onClick={() =>
                                  updateSkill(skill.id, {
                                    projectile: { 
                                      ...skill.projectile, 
                                      type: skill.projectile.type === 'none' ? 'arrow' : skill.projectile.type,
                                      speed: skill.projectile.speed || 300,
                                      size: skill.projectile.size || 10,
                                    },
                                  })
                                }
                              >
                                🏹 투사체
                              </Button>
                            </div>
                          </div>

                          {/* 근접 공격 안내 */}
                          {skill.projectile.type === 'none' && (
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                              <div className="flex items-center gap-2 text-slate-700">
                                <span className="text-2xl">⚔️</span>
                                <div>
                                  <p className="font-medium">근접 공격</p>
                                  <p className="text-xs text-slate-600 mt-1">
                                    이 스킬은 직접 타격 방식으로 작동합니다. 범위와 각도는 "시각 효과" 탭에서 설정할 수 있습니다.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 투사체 설정 */}
                          {skill.projectile.type !== 'none' && (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2 col-span-2">
                                <Label className="text-xs">투사체 타입</Label>
                                <Select
                                  value={skill.projectile.type}
                                  onValueChange={(value: ProjectileType) =>
                                    updateSkill(skill.id, {
                                      projectile: { ...skill.projectile, type: value },
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="arrow">화살 (Arrow)</SelectItem>
                                    <SelectItem value="fireball">파이어볼 (Fireball)</SelectItem>
                                    <SelectItem value="lightning">번개 (Lightning)</SelectItem>
                                    <SelectItem value="wave">파동 (Wave)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs">투사체 속도: {skill.projectile.speed}px/s</Label>
                                <Slider
                                  value={[skill.projectile.speed]}
                                  onValueChange={([value]) =>
                                    updateSkill(skill.id, {
                                      projectile: { ...skill.projectile, speed: value },
                                    })
                                  }
                                  min={0}
                                  max={1000}
                                  step={50}
                                  className="w-full"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs">투사체 크기: {skill.projectile.size}px</Label>
                                <Slider
                                  value={[skill.projectile.size]}
                                  onValueChange={([value]) =>
                                    updateSkill(skill.id, {
                                      projectile: { ...skill.projectile, size: value },
                                    })
                                  }
                                  min={0}
                                  max={50}
                                  step={5}
                                  className="w-full"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={skill.projectile.piercing}
                                    onChange={(e) =>
                                      updateSkill(skill.id, {
                                        projectile: { ...skill.projectile, piercing: e.target.checked },
                                      })
                                    }
                                    className="w-4 h-4"
                                  />
                                  관통 (Piercing)
                                </Label>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={skill.projectile.homing}
                                    onChange={(e) =>
                                      updateSkill(skill.id, {
                                        projectile: { ...skill.projectile, homing: e.target.checked },
                                      })
                                    }
                                    className="w-4 h-4"
                                  />
                                  유도 (Homing)
                                </Label>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={skill.projectile.trail}
                                    onChange={(e) =>
                                      updateSkill(skill.id, {
                                        projectile: { ...skill.projectile, trail: e.target.checked },
                                      })
                                    }
                                    className="w-4 h-4"
                                  />
                                  궤적 표시 (Trail)
                                </Label>
                              </div>

                              <div className="space-y-2">
                                <Label className="text-xs">궤적 길이: {skill.projectile.trailLength}px</Label>
                                <Slider
                                  value={[skill.projectile.trailLength]}
                                  onValueChange={([value]) =>
                                    updateSkill(skill.id, {
                                      projectile: { ...skill.projectile, trailLength: value },
                                    })
                                  }
                                  min={0}
                                  max={100}
                                  step={10}
                                  className="w-full"
                                />
                              </div>
                            </div>
                          )}
                        </TabsContent>

                        {/* 애니메이션 설정 */}
                        <TabsContent value="animation" className="space-y-4 mt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs">시전 애니메이션</Label>
                              <Select
                                value={skill.animation.castAnimation}
                                onValueChange={(value) =>
                                  updateSkill(skill.id, {
                                    animation: { ...skill.animation, castAnimation: value },
                                  })
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="charge">충전 (Charge)</SelectItem>
                                  <SelectItem value="spin">회전 (Spin)</SelectItem>
                                  <SelectItem value="glow">발광 (Glow)</SelectItem>
                                  <SelectItem value="pulse">맥동 (Pulse)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">시전 시 크기: {skill.animation.castScale.toFixed(1)}x</Label>
                              <Slider
                                value={[skill.animation.castScale * 100]}
                                onValueChange={([value]) =>
                                  updateSkill(skill.id, {
                                    animation: { ...skill.animation, castScale: value / 100 },
                                  })
                                }
                                min={80}
                                max={200}
                                step={10}
                                className="w-full"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">적중 애니메이션</Label>
                              <Select
                                value={skill.animation.impactAnimation}
                                onValueChange={(value) =>
                                  updateSkill(skill.id, {
                                    animation: { ...skill.animation, impactAnimation: value },
                                  })
                                }
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="explosion">폭발 (Explosion)</SelectItem>
                                  <SelectItem value="ripple">파문 (Ripple)</SelectItem>
                                  <SelectItem value="flash">섬광 (Flash)</SelectItem>
                                  <SelectItem value="scatter">산개 (Scatter)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">적중 이펙트 지속: {skill.animation.impactDuration}ms</Label>
                              <Slider
                                value={[skill.animation.impactDuration]}
                                onValueChange={([value]) =>
                                  updateSkill(skill.id, {
                                    animation: { ...skill.animation, impactDuration: value },
                                  })
                                }
                                min={100}
                                max={1000}
                                step={100}
                                className="w-full"
                              />
                            </div>

                            <div className="space-y-2 col-span-2">
                              <Label className="text-xs">화면 흔들림 강도: {skill.animation.cameraShake}</Label>
                              <Slider
                                value={[skill.animation.cameraShake]}
                                onValueChange={([value]) =>
                                  updateSkill(skill.id, {
                                    animation: { ...skill.animation, cameraShake: value },
                                  })
                                }
                                min={0}
                                max={10}
                                step={1}
                                className="w-full"
                              />
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>

          <Separator className="my-6" />

          {/* 전체 초기화 버튼 */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600">
              💡 스킬 시스템 설정은 모든 스킬의 시각적/동작적 요소를 정의합니다.<br />
              데이터셋에서는 각 행마다 어떤 스킬을 사용할지, 파라미터를 얼마로 할지만 조정합니다.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSkills(defaultSkills);
                if (onSkillsChange) {
                  onSkillsChange(defaultSkills);
                }
                toast.success('🔄 모든 스킬이 초기화되었습니다!');
              }}
            >
              전체 초기화
            </Button>
          </div>
          </CardContent>
        </Card>
      )}

      {/* 아이템 시스템 */}
      {!showOnlySkills && itemSlots.length > 0 && onItemSlotsChange && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-600" />
              아이템 시스템 설정
            </CardTitle>
            <CardDescription>
              키 F1, F2, F3, F4로 아이템을 사용합니다. 각 아이템의 아이콘과 속성을 확인할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {itemSlots.map((slot, index) => {
                const IconComponent = slot.item && (LucideIcons as any)[slot.item.iconName] 
                  ? (LucideIcons as any)[slot.item.iconName] 
                  : Package;
                
                return (
                  <Card key={slot.slotNumber} className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant="secondary" className="text-lg">
                        {slot.keyBinding}
                      </Badge>
                      {slot.item && (
                        <div className="w-8 h-8 rounded-md bg-yellow-100 flex items-center justify-center">
                          <IconComponent className="h-5 w-5 text-yellow-600" />
                        </div>
                      )}
                      <h3 className="flex-1">{slot.item?.name || '비어있음'}</h3>
                      {slot.item && (
                        <Badge>{slot.item.quantity}개</Badge>
                      )}
                    </div>
                    
                    {slot.item && (
                      <div className="space-y-3 text-sm">
                        {/* 아이콘 선택 */}
                        <div className="space-y-1">
                          <Label className="text-xs">아이콘</Label>
                          <Select
                            value={slot.item.iconName}
                            onValueChange={(value) => {
                              const newSlots = [...itemSlots];
                              if (newSlots[index].item) {
                                newSlots[index].item!.iconName = value;
                                onItemSlotsChange(newSlots);
                              }
                            }}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {AVAILABLE_ICONS.map((iconName) => {
                                const Icon = (LucideIcons as any)[iconName] || Package;
                                return (
                                  <SelectItem key={iconName} value={iconName}>
                                    <div className="flex items-center gap-2">
                                      <Icon className="h-4 w-4" />
                                      <span>{iconName}</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <p className="text-slate-600">{slot.item.description}</p>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {slot.item.healAmount > 0 && (
                            <div>
                              <span className="text-slate-500">HP 회복:</span>{' '}
                              <span className="text-red-600">+{slot.item.healAmount}</span>
                            </div>
                          )}
                          {slot.item.spRestore > 0 && (
                            <div>
                              <span className="text-slate-500">SP 회복:</span>{' '}
                              <span className="text-blue-600">+{slot.item.spRestore}</span>
                            </div>
                          )}
                          {slot.item.damageAmount > 0 && (
                            <div>
                              <span className="text-slate-500">데미지:</span>{' '}
                              <span className="text-orange-600">{slot.item.damageAmount}</span>
                            </div>
                          )}
                          {slot.item.buffDuration > 0 && (
                            <div>
                              <span className="text-slate-500">지속시간:</span>{' '}
                              <span className="text-purple-600">{slot.item.buffDuration / 1000}초</span>
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-slate-500">
                          최대 보유: {slot.item.maxStack}개
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 아이템 전용 뷰 */}
      {showOnlyItems && itemSlots.length > 0 && onItemSlotsChange && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-600" />
              아이템 시스템 설정
            </CardTitle>
            <CardDescription>
              키 F1, F2, F3, F4로 아이템을 사용합니다. 각 아이템의 아이콘과 속성을 확인할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {itemSlots.map((slot, index) => {
                const IconComponent = slot.item && (LucideIcons as any)[slot.item.iconName] 
                  ? (LucideIcons as any)[slot.item.iconName] 
                  : Package;
                
                return (
                  <Card key={slot.slotNumber} className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant="secondary" className="text-lg">
                        {slot.keyBinding}
                      </Badge>
                      {slot.item && (
                        <div className="w-8 h-8 rounded-md bg-yellow-100 flex items-center justify-center">
                          <IconComponent className="h-5 w-5 text-yellow-600" />
                        </div>
                      )}
                      <h3 className="flex-1">{slot.item?.name || '비어있음'}</h3>
                      {slot.item && (
                        <Badge>{slot.item.quantity}개</Badge>
                      )}
                    </div>
                    
                    {slot.item && (
                      <div className="space-y-3 text-sm">
                        {/* 아이콘 선택 */}
                        <div className="space-y-1">
                          <Label className="text-xs">아이콘</Label>
                          <Select
                            value={slot.item.iconName}
                            onValueChange={(value) => {
                              const newSlots = [...itemSlots];
                              if (newSlots[index].item) {
                                newSlots[index].item!.iconName = value;
                                onItemSlotsChange(newSlots);
                              }
                            }}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {AVAILABLE_ICONS.map((iconName) => {
                                const Icon = (LucideIcons as any)[iconName] || Package;
                                return (
                                  <SelectItem key={iconName} value={iconName}>
                                    <div className="flex items-center gap-2">
                                      <Icon className="h-4 w-4" />
                                      <span>{iconName}</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <p className="text-slate-600">{slot.item.description}</p>
                        
                        <div className="grid grid-cols-2 gap-2">
                          {slot.item.healAmount > 0 && (
                            <div>
                              <span className="text-slate-500">HP 회복:</span>{' '}
                              <span className="text-red-600">+{slot.item.healAmount}</span>
                            </div>
                          )}
                          {slot.item.spRestore > 0 && (
                            <div>
                              <span className="text-slate-500">SP 회복:</span>{' '}
                              <span className="text-blue-600">+{slot.item.spRestore}</span>
                            </div>
                          )}
                          {slot.item.damageAmount > 0 && (
                            <div>
                              <span className="text-slate-500">데미지:</span>{' '}
                              <span className="text-orange-600">{slot.item.damageAmount}</span>
                            </div>
                          )}
                          {slot.item.buffDuration > 0 && (
                            <div>
                              <span className="text-slate-500">지속시간:</span>{' '}
                              <span className="text-purple-600">{slot.item.buffDuration / 1000}초</span>
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-slate-500">
                          최대 보유: {slot.item.maxStack}개
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* 스킬 빌더 다이얼로그 */}
      <SkillBuilder
        open={isSkillBuilderOpen}
        onOpenChange={setIsSkillBuilderOpen}
        onSkillCreate={handleSkillCreate}
        existingSkill={editingSkill}
      />
    </div>
  );
}
