import { Sparkles, Swords, Target, Wand2, Zap } from 'lucide-react';
import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ICON_MAP } from '../lib/iconMap';
import {
  EffectShape,
  ProjectileType,
  SKILL_TEMPLATES,
  Skill,
  SkillType,
  createSkill,
  defaultBasicAttacks,
  validateSkill,
} from '../lib/skillSystem';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';

// 사용 가능한 아이콘 목록
const AVAILABLE_ICONS = [
  'Swords',
  'Shield',
  'Zap',
  'Heart',
  'Wind',
  'Flame',
  'Sparkles',
  'Star',
  'Target',
  'Crosshair',
  'Bolt',
  'Skull',
  'CircleDot',
  'Orbit',
  'Sword',
  'Wand2',
  'Bomb',
  'Scroll',
  'Package',
  'Gift',
  'Flask',
  'Crown',
] as const;

interface SkillBuilderProps {
  onSkillCreate: (skill: Skill) => void;
  existingSkill?: Skill; // 수정 모드
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SkillBuilder({
  onSkillCreate,
  existingSkill,
  trigger,
  open,
  onOpenChange,
}: SkillBuilderProps) {
  const getLucideIcon = (
    iconName: string | undefined,
    fallback: typeof Wand2
  ): ComponentType<{ className?: string }> => {
    if (!iconName) return fallback;
    const icon = ICON_MAP[iconName ?? ''];
    if (typeof icon === 'function') {
      return icon as ComponentType<{ className?: string }>;
    }
    return fallback;
  };

  const isEditMode = !!existingSkill;
  const [quickMode, setQuickMode] = useState(true); // 항상 퀵 모드로 시작

  // 수정 모드일 때는 퀵 모드 비활성화
  useEffect(() => {
    if (isEditMode) {
      setQuickMode(false);
    } else if (open) {
      // 다이얼로그가 열릴 때마다 퀵 모드로 리셋
      setQuickMode(true);
    }
  }, [isEditMode, open]);

  // 기본값 설정
  const [skillData, setSkillData] = useState<Partial<Skill>>(
    existingSkill || {
      name: '',
      description: '',
      type: 'damage',
      category: 'skill',
      iconName: 'Swords',
      ...SKILL_TEMPLATES.damage,
    }
  );

  const updateSkillData = (updates: Partial<Skill>) => {
    setSkillData(prev => ({ ...prev, ...updates }));
  };

  const getTemplateSkill = (type: SkillType | undefined) => SKILL_TEMPLATES[type ?? 'damage'];

  const getVisualConfig = (): Skill['visual'] => ({
    ...(getTemplateSkill(skillData.type).visual as Skill['visual']),
    ...(skillData.visual ?? {}),
  });

  const getProjectileConfig = (): Skill['projectile'] => ({
    ...(getTemplateSkill(skillData.type).projectile as Skill['projectile']),
    ...(skillData.projectile ?? {}),
  });

  const getAnimationConfig = (): Skill['animation'] => ({
    ...(getTemplateSkill(skillData.type).animation as Skill['animation']),
    ...(skillData.animation ?? {}),
  });

  const handleTemplateChange = (type: SkillType) => {
    setSkillData({
      ...skillData,
      type,
      ...SKILL_TEMPLATES[type],
    });
  };

  const handleQuickCreate = (category: 'basicAttack' | 'skill', subType?: 'melee' | 'ranged') => {
    // 기본 템플릿을 복제하여 새 스킬 생성
    let templateSkill: Skill;

    if (category === 'basicAttack') {
      // 기본 공격: melee 또는 ranged 선택
      const baseSkill =
        subType === 'ranged' ? defaultBasicAttacks.rangedBasic : defaultBasicAttacks.meleeBasic;

      const id = `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      templateSkill = {
        ...baseSkill,
        id,
        name: baseSkill.name,
        currentCooldown: 0,
        isOnCooldown: false,
      };
    } else {
      // 일반 스킬: 기본 damage 스킬 템플릿 사용
      const id = `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      templateSkill = {
        id,
        name: '새 스킬',
        description: '스킬 설명을 입력하세요',
        category: 'skill',
        tags: ['skill', 'damage'],
        ...SKILL_TEMPLATES.damage,
      } as Skill;
    }

    onSkillCreate(templateSkill);

    if (onOpenChange) {
      onOpenChange(false);
    }

    toast.success(`✨ "${templateSkill.name}"이(가) 추가되었습니다!`);
  };

  const handleCreate = () => {
    const validation = validateSkill(skillData);

    if (!validation.valid) {
      toast.error(validation.errors.join('\n'));
      return;
    }

    const newSkill = isEditMode
      ? ({ ...existingSkill, ...skillData } as Skill)
      : createSkill(
          skillData.name ?? '',
          skillData.description ?? '',
          skillData.type ?? 'damage',
          skillData
        );

    onSkillCreate(newSkill);

    if (onOpenChange) {
      onOpenChange(false);
    }

    toast.success(isEditMode ? '✨ 스킬이 수정되었습니다!' : '✨ 새로운 스킬이 생성되었습니다!');

    // 초기화
    if (!isEditMode) {
      setSkillData({
        name: '',
        description: '',
        type: 'damage',
        category: 'skill',
        iconName: 'Swords',
        ...SKILL_TEMPLATES.damage,
      });
      // 퀵 모드로 리셋 (다음 스킬 추가를 위해)
      setQuickMode(true);
    }
  };

  const IconComponent = getLucideIcon(skillData.iconName, Wand2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Wand2 className='w-5 h-5 text-purple-600' />
            {isEditMode ? '스킬 수정' : quickMode ? '스킬 빠르게 추가' : '새로운 스킬 생성'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? '스킬의 속성을 수정합니다. 템플릿을 변경하면 기본값이 적용됩니다.'
              : quickMode
                ? '태그를 선택하면 기본 템플릿이 자동으로 복제됩니다. 상세 설정은 나중에 편집할 수 있습니다.'
                : '스킬 템플릿을 선택하고 커스터마이징하여 새로운 스킬을 만듭니다.'}
          </DialogDescription>
        </DialogHeader>

        {/* 퀵 모드: 태그만 선택 */}
        {quickMode && !isEditMode ? (
          <div className='space-y-6 p-6'>
            <div className='text-center mb-6'>
              <Sparkles className='w-12 h-12 mx-auto mb-3 text-purple-500' />
              <h3 className='font-semibold mb-2'>어떤 종류의 스킬을 추가하시겠습니까?</h3>
              <p className='text-sm text-slate-500'>기본 템플릿이 자동으로 복제됩니다</p>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              {/* 기본 공격 */}
              <div className='border-2 border-slate-200 rounded-lg p-4 space-y-3'>
                <div className='flex items-center gap-2 mb-3'>
                  <div className='w-8 h-8 rounded-full bg-red-100 flex items-center justify-center'>
                    <span className='text-lg'>🎯</span>
                  </div>
                  <h4 className='font-semibold'>기본 공격</h4>
                </div>
                <p className='text-sm text-slate-600 mb-4'>
                  마우스 클릭으로 실행되는 기본 공격 스킬입니다.
                </p>
                <div className='space-y-2'>
                  <Button
                    onClick={() => handleQuickCreate('basicAttack', 'melee')}
                    className='w-full'
                    variant='outline'
                  >
                    <Swords className='w-4 h-4 mr-2' />
                    근접 기본 공격
                  </Button>
                  <Button
                    onClick={() => handleQuickCreate('basicAttack', 'ranged')}
                    className='w-full'
                    variant='outline'
                  >
                    <Target className='w-4 h-4 mr-2' />
                    원거리 기본 공격
                  </Button>
                </div>
              </div>

              {/* 일반 스킬 */}
              <div className='border-2 border-slate-200 rounded-lg p-4 space-y-3'>
                <div className='flex items-center gap-2 mb-3'>
                  <div className='w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center'>
                    <span className='text-lg'>⚡</span>
                  </div>
                  <h4 className='font-semibold'>일반 스킬</h4>
                </div>
                <p className='text-sm text-slate-600 mb-4'>키보드로 실행되는 특수 스킬입니다.</p>
                <Button
                  onClick={() => handleQuickCreate('skill')}
                  className='w-full bg-purple-600 hover:bg-purple-700'
                >
                  <Zap className='w-4 h-4 mr-2' />
                  일반 스킬 추가
                </Button>
              </div>
            </div>

            <div className='text-center pt-4 border-t'>
              <Button onClick={() => setQuickMode(false)} variant='ghost' size='sm'>
                고급 설정으로 생성하기
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* 기존 상세 모드 */}
            <Tabs defaultValue='basic' className='w-full'>
              <TabsList className='grid w-full grid-cols-5'>
                <TabsTrigger value='basic'>기본 정보</TabsTrigger>
                <TabsTrigger value='stats'>스탯</TabsTrigger>
                <TabsTrigger value='visual'>시각 효과</TabsTrigger>
                <TabsTrigger value='projectile'>투사체</TabsTrigger>
                <TabsTrigger value='animation'>애니메이션</TabsTrigger>
              </TabsList>

              {/* 기본 정보 */}
              <TabsContent value='basic' className='space-y-4'>
                <div className='space-y-4 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg'>
                  <div className='space-y-2'>
                    <Label>스킬 이름 *</Label>
                    <Input
                      value={skillData.name || ''}
                      onChange={e => updateSkillData({ name: e.target.value })}
                      placeholder='예: 화염구'
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label>설명 *</Label>
                    <Textarea
                      value={skillData.description || ''}
                      onChange={e => updateSkillData({ description: e.target.value })}
                      placeholder='예: 강력한 화염구를 발사합니다'
                      rows={2}
                    />
                  </div>

                  <div className='grid grid-cols-3 gap-4'>
                    <div className='space-y-2'>
                      <Label>스킬 카테고리 *</Label>
                      <Select
                        value={skillData.category || 'skill'}
                        onValueChange={(value: 'basicAttack' | 'skill') =>
                          updateSkillData({ category: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='basicAttack'>🎯 기본 공격</SelectItem>
                          <SelectItem value='skill'>⚡ 스킬</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='space-y-2'>
                      <Label>스킬 타입 *</Label>
                      <Select
                        value={skillData.type}
                        onValueChange={(value: SkillType) => handleTemplateChange(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='melee'>⚔️ 근접 (Melee)</SelectItem>
                          <SelectItem value='ranged'>🏹 원거리 (Ranged)</SelectItem>
                          <SelectItem value='damage'>💥 데미지 (Damage)</SelectItem>
                          <SelectItem value='area'>🌀 영역 (Area)</SelectItem>
                          <SelectItem value='heal'>❤️ 힐 (Heal)</SelectItem>
                          <SelectItem value='buff'>⚡ 버프 (Buff)</SelectItem>
                          <SelectItem value='debuff'>💀 디버프 (Debuff)</SelectItem>
                          <SelectItem value='defense'>🛡️ 방어 (Defense)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='space-y-2'>
                      <Label>아이콘</Label>
                      <Select
                        value={skillData.iconName}
                        onValueChange={value => updateSkillData({ iconName: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_ICONS.map(iconName => {
                            const Icon = getLucideIcon(iconName, Wand2);
                            return (
                              <SelectItem key={iconName} value={iconName}>
                                <div className='flex items-center gap-2'>
                                  <Icon className='h-4 w-4' />
                                  <span>{iconName}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className='p-4 bg-white rounded-lg border-2 border-purple-200'>
                    <div className='flex items-center gap-3'>
                      <div
                        className='w-12 h-12 rounded-lg flex items-center justify-center'
                        style={{
                          backgroundColor: skillData.visual?.color || '#888888',
                          boxShadow: `0 0 20px ${skillData.visual?.color || '#888888'}40`,
                        }}
                      >
                        <IconComponent className='w-6 h-6 text-white' />
                      </div>
                      <div>
                        <h3 className='font-semibold'>{skillData.name || '스킬 이름'}</h3>
                        <p className='text-sm text-slate-600'>
                          {skillData.description || '스킬 설명'}
                        </p>
                        <Badge className='mt-1'>{skillData.type}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* 스탯 설정 */}
              <TabsContent value='stats' className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label>SP 소모량: {skillData.spCost}</Label>
                    <Slider
                      value={[skillData.spCost || 0]}
                      onValueChange={([value]) => updateSkillData({ spCost: value })}
                      min={0}
                      max={100}
                      step={5}
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label>쿨타임: {((skillData.cooldown || 0) / 1000).toFixed(1)}초</Label>
                    <Slider
                      value={[skillData.cooldown || 0]}
                      onValueChange={([value]) => updateSkillData({ cooldown: value })}
                      min={0}
                      max={30000}
                      step={500}
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label>시전 시간: {skillData.castTime}ms</Label>
                    <Slider
                      value={[skillData.castTime || 0]}
                      onValueChange={([value]) => updateSkillData({ castTime: value })}
                      min={0}
                      max={3000}
                      step={100}
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label>사거리: {skillData.range}px</Label>
                    <Slider
                      value={[skillData.range || 0]}
                      onValueChange={([value]) => updateSkillData({ range: value })}
                      min={0}
                      max={500}
                      step={10}
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label>범위: {skillData.area}°</Label>
                    <Slider
                      value={[skillData.area || 0]}
                      onValueChange={([value]) => updateSkillData({ area: value })}
                      min={0}
                      max={360}
                      step={10}
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label>
                      데미지 배율: {((skillData.damageMultiplier || 0) * 100).toFixed(0)}%
                    </Label>
                    <Slider
                      value={[(skillData.damageMultiplier || 0) * 100]}
                      onValueChange={([value]) =>
                        updateSkillData({ damageMultiplier: value / 100 })
                      }
                      min={0}
                      max={300}
                      step={10}
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label>회복량: {skillData.healAmount}</Label>
                    <Slider
                      value={[skillData.healAmount || 0]}
                      onValueChange={([value]) => updateSkillData({ healAmount: value })}
                      min={0}
                      max={200}
                      step={10}
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label>
                      버프 지속시간: {((skillData.buffDuration || 0) / 1000).toFixed(1)}초
                    </Label>
                    <Slider
                      value={[skillData.buffDuration || 0]}
                      onValueChange={([value]) => updateSkillData({ buffDuration: value })}
                      min={0}
                      max={30000}
                      step={1000}
                    />
                  </div>
                </div>

                {/* 버프 효과 */}
                {(skillData.type === 'buff' || skillData.type === 'debuff') && (
                  <div className='space-y-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border'>
                    <Label className='text-sm font-semibold'>버프/디버프 효과</Label>
                    <div className='grid grid-cols-3 gap-3'>
                      <div className='space-y-1'>
                        <Label className='text-xs'>
                          공격력: {skillData.buffEffect?.attack || 0}%
                        </Label>
                        <Slider
                          value={[skillData.buffEffect?.attack || 0]}
                          onValueChange={([value]) =>
                            updateSkillData({
                              buffEffect: { ...skillData.buffEffect, attack: value },
                            })
                          }
                          min={-50}
                          max={100}
                          step={5}
                        />
                      </div>
                      <div className='space-y-1'>
                        <Label className='text-xs'>
                          방어력: {skillData.buffEffect?.defense || 0}%
                        </Label>
                        <Slider
                          value={[skillData.buffEffect?.defense || 0]}
                          onValueChange={([value]) =>
                            updateSkillData({
                              buffEffect: { ...skillData.buffEffect, defense: value },
                            })
                          }
                          min={-50}
                          max={100}
                          step={5}
                        />
                      </div>
                      <div className='space-y-1'>
                        <Label className='text-xs'>속도: {skillData.buffEffect?.speed || 0}%</Label>
                        <Slider
                          value={[skillData.buffEffect?.speed || 0]}
                          onValueChange={([value]) =>
                            updateSkillData({
                              buffEffect: { ...skillData.buffEffect, speed: value },
                            })
                          }
                          min={-50}
                          max={100}
                          step={5}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* 시각 효과 */}
              <TabsContent value='visual' className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label>주 색상</Label>
                    <div className='flex gap-2'>
                      <Input
                        type='color'
                        value={skillData.visual?.color || '#888888'}
                        onChange={e =>
                          updateSkillData({
                            visual: { ...getVisualConfig(), color: e.target.value },
                          })
                        }
                        className='w-16 h-10 p-1'
                      />
                      <Input
                        type='text'
                        value={skillData.visual?.color || '#888888'}
                        onChange={e =>
                          updateSkillData({
                            visual: { ...getVisualConfig(), color: e.target.value },
                          })
                        }
                        className='flex-1'
                      />
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <Label>보조 색상</Label>
                    <div className='flex gap-2'>
                      <Input
                        type='color'
                        value={skillData.visual?.secondaryColor || '#aaaaaa'}
                        onChange={e =>
                          updateSkillData({
                            visual: { ...getVisualConfig(), secondaryColor: e.target.value },
                          })
                        }
                        className='w-16 h-10 p-1'
                      />
                      <Input
                        type='text'
                        value={skillData.visual?.secondaryColor || '#aaaaaa'}
                        onChange={e =>
                          updateSkillData({
                            visual: { ...getVisualConfig(), secondaryColor: e.target.value },
                          })
                        }
                        className='flex-1'
                      />
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <Label>파티클 수: {skillData.visual?.particleCount}</Label>
                    <Slider
                      value={[skillData.visual?.particleCount || 10]}
                      onValueChange={([value]) =>
                        updateSkillData({
                          visual: { ...getVisualConfig(), particleCount: value },
                        })
                      }
                      min={0}
                      max={50}
                      step={5}
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label>파티클 크기: {skillData.visual?.particleSize}px</Label>
                    <Slider
                      value={[skillData.visual?.particleSize || 5]}
                      onValueChange={([value]) =>
                        updateSkillData({
                          visual: { ...getVisualConfig(), particleSize: value },
                        })
                      }
                      min={1}
                      max={20}
                      step={1}
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label>발광 강도: {(skillData.visual?.glowIntensity || 0.5).toFixed(1)}</Label>
                    <Slider
                      value={[(skillData.visual?.glowIntensity || 0.5) * 100]}
                      onValueChange={([value]) =>
                        updateSkillData({
                          visual: { ...getVisualConfig(), glowIntensity: value / 100 },
                        })
                      }
                      min={0}
                      max={100}
                      step={10}
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label>이펙트 모양</Label>
                    <Select
                      value={skillData.visual?.effectShape}
                      onValueChange={(value: EffectShape) =>
                        updateSkillData({
                          visual: { ...getVisualConfig(), effectShape: value },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='circle'>원형</SelectItem>
                        <SelectItem value='cone'>원뿔형</SelectItem>
                        <SelectItem value='line'>선형</SelectItem>
                        <SelectItem value='ring'>고리형</SelectItem>
                        <SelectItem value='star'>별형</SelectItem>
                        <SelectItem value='shield'>방패형</SelectItem>
                        <SelectItem value='dome'>돔형</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* 투사체 설정 */}
              <TabsContent value='projectile' className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label>투사체 타입</Label>
                    <Select
                      value={skillData.projectile?.type}
                      onValueChange={(value: ProjectileType) =>
                        updateSkillData({
                          projectile: { ...getProjectileConfig(), type: value },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='none'>없음</SelectItem>
                        <SelectItem value='arrow'>화살</SelectItem>
                        <SelectItem value='fireball'>화염구</SelectItem>
                        <SelectItem value='lightning'>번개</SelectItem>
                        <SelectItem value='wave'>파동</SelectItem>
                        <SelectItem value='energy'>에너지</SelectItem>
                        <SelectItem value='ice'>얼음</SelectItem>
                        <SelectItem value='wind'>바람</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-2'>
                    <Label>투사체 속도: {skillData.projectile?.speed}px/s</Label>
                    <Slider
                      value={[skillData.projectile?.speed || 0]}
                      onValueChange={([value]) =>
                        updateSkillData({
                          projectile: { ...getProjectileConfig(), speed: value },
                        })
                      }
                      min={0}
                      max={1000}
                      step={50}
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label>투사체 크기: {skillData.projectile?.size}px</Label>
                    <Slider
                      value={[skillData.projectile?.size || 0]}
                      onValueChange={([value]) =>
                        updateSkillData({
                          projectile: { ...getProjectileConfig(), size: value },
                        })
                      }
                      min={0}
                      max={50}
                      step={2}
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label>궤적 길이: {skillData.projectile?.trailLength}px</Label>
                    <Slider
                      value={[skillData.projectile?.trailLength || 0]}
                      onValueChange={([value]) =>
                        updateSkillData({
                          projectile: { ...getProjectileConfig(), trailLength: value },
                        })
                      }
                      min={0}
                      max={100}
                      step={10}
                    />
                  </div>
                </div>

                <div className='grid grid-cols-3 gap-3'>
                  <Label className='flex items-center gap-2 cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={skillData.projectile?.piercing || false}
                      onChange={e =>
                        updateSkillData({
                          projectile: { ...getProjectileConfig(), piercing: e.target.checked },
                        })
                      }
                      className='w-4 h-4'
                    />
                    관통 (Piercing)
                  </Label>

                  <Label className='flex items-center gap-2 cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={skillData.projectile?.homing || false}
                      onChange={e =>
                        updateSkillData({
                          projectile: { ...getProjectileConfig(), homing: e.target.checked },
                        })
                      }
                      className='w-4 h-4'
                    />
                    유도 (Homing)
                  </Label>

                  <Label className='flex items-center gap-2 cursor-pointer'>
                    <input
                      type='checkbox'
                      checked={skillData.projectile?.trail || false}
                      onChange={e =>
                        updateSkillData({
                          projectile: { ...getProjectileConfig(), trail: e.target.checked },
                        })
                      }
                      className='w-4 h-4'
                    />
                    궤적 표시 (Trail)
                  </Label>
                </div>
              </TabsContent>

              {/* 애니메이션 설정 */}
              <TabsContent value='animation' className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label>시전 애니메이션</Label>
                    <Select
                      value={skillData.animation?.castAnimation}
                      onValueChange={value =>
                        updateSkillData({
                          animation: { ...getAnimationConfig(), castAnimation: value },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='charge'>충전</SelectItem>
                        <SelectItem value='spin'>회전</SelectItem>
                        <SelectItem value='glow'>발광</SelectItem>
                        <SelectItem value='pulse'>맥동</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-2'>
                    <Label>적중 애니메이션</Label>
                    <Select
                      value={skillData.animation?.impactAnimation}
                      onValueChange={value =>
                        updateSkillData({
                          animation: { ...getAnimationConfig(), impactAnimation: value },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='explosion'>폭발</SelectItem>
                        <SelectItem value='ripple'>파동</SelectItem>
                        <SelectItem value='flash'>섬광</SelectItem>
                        <SelectItem value='scatter'>분산</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-2'>
                    <Label>
                      시전 크기 배율: {(skillData.animation?.castScale || 1).toFixed(1)}x
                    </Label>
                    <Slider
                      value={[(skillData.animation?.castScale || 1) * 100]}
                      onValueChange={([value]) =>
                        updateSkillData({
                          animation: { ...getAnimationConfig(), castScale: value / 100 },
                        })
                      }
                      min={80}
                      max={200}
                      step={10}
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label>적중 지속시간: {skillData.animation?.impactDuration}ms</Label>
                    <Slider
                      value={[skillData.animation?.impactDuration || 200]}
                      onValueChange={([value]) =>
                        updateSkillData({
                          animation: { ...getAnimationConfig(), impactDuration: value },
                        })
                      }
                      min={100}
                      max={2000}
                      step={100}
                    />
                  </div>

                  <div className='space-y-2 col-span-2'>
                    <Label>화면 흔들림: {skillData.animation?.cameraShake}</Label>
                    <Slider
                      value={[skillData.animation?.cameraShake || 0]}
                      onValueChange={([value]) =>
                        updateSkillData({
                          animation: { ...getAnimationConfig(), cameraShake: value },
                        })
                      }
                      min={0}
                      max={10}
                      step={1}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className='flex items-center justify-between pt-4 border-t'>
              <p className='text-xs text-slate-600'>* 필수 항목을 모두 입력해주세요</p>
              <div className='flex gap-2'>
                <Button variant='outline' onClick={() => onOpenChange?.(false)}>
                  취소
                </Button>
                <Button onClick={handleCreate} className='gap-2'>
                  <Sparkles className='w-4 h-4' />
                  {isEditMode ? '수정 완료' : '스킬 생성'}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
