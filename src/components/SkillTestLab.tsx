import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Skill, BasicAttackSlot, SkillSlot } from '../lib/skillSystem';
import { FlaskConical, Sparkles, RotateCcw, Info, Sword, Target, Plus, Edit2, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import * as LucideIcons from 'lucide-react';
import { MultiMonsterSimulator } from './MultiMonsterSimulator';
import { CharacterConfig } from './CharacterSettings';
import { KeyBindings, defaultBindings } from './KeyBindingSettings';
import { LevelConfig, defaultPlayerLevelConfig, defaultMonsterLevelConfig } from '../lib/levelSystem';
import { ItemSlot } from '../lib/itemSystem';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';

interface SkillTestLabProps {
  skills: Record<string, Skill>;
  playerBasicAttack?: BasicAttackSlot;
  monsterBasicAttack?: BasicAttackSlot;
  selectedSkillId?: string | null;
  selectedBasicAttackId?: string;
  selectedType?: 'basic' | 'skill';
  onSkillSelect?: (skillId: string) => void;
  onBasicAttackSelect?: (basicAttackId: string) => void;
  onTypeChange?: (type: 'basic' | 'skill') => void;
  onAddSkill?: () => void;
  onEditSkill?: (skill: Skill) => void;
  onDeleteSkill?: (skillId: string) => void;
  onDuplicateSkill?: (skill: Skill) => void;
}

interface TestSlot {
  id: string;
  skill: Skill | null;
  keyBinding: string;
  type: 'skill';
}

// 테스트용 기본 플레이어 설정
const DEFAULT_TEST_PLAYER_CONFIG: CharacterConfig = {
  size: { min: 20, max: 20 },
  speed: { min: 150, max: 150 },
  attack: { min: 50, max: 50 },
  defense: { min: 20, max: 20 },
  attackSpeed: { min: 1.0, max: 1.0 },
  accuracy: { min: 80, max: 80 },
  criticalRate: { min: 10, max: 10 },
  attackRange: { min: 300, max: 300 },
  attackWidth: { min: 90, max: 90 },
  attackType: 'ranged',
};

// 테스트용 기본 몬스터 설정
const DEFAULT_TEST_MONSTER_CONFIG: CharacterConfig = {
  size: { min: 24, max: 24 },
  speed: { min: 60, max: 60 },
  attack: { min: 40, max: 40 },
  defense: { min: 15, max: 15 },
  attackSpeed: { min: 1.0, max: 1.0 },
  accuracy: { min: 70, max: 70 },
  criticalRate: { min: 10, max: 10 },
  attackRange: { min: 60, max: 60 },
  attackWidth: { min: 80, max: 80 },
  attackType: 'melee',
};

// 시뮬레이터 크기 상수
const SIMULATOR_WIDTH = 800;
const SIMULATOR_HEIGHT = 640;

export function SkillTestLab({ 
  skills, 
  playerBasicAttack, 
  monsterBasicAttack, 
  selectedSkillId,
  selectedBasicAttackId = 'meleeBasic',
  selectedType = 'basic',
  onSkillSelect,
  onBasicAttackSelect,
  onTypeChange,
  onAddSkill,
  onEditSkill,
  onDeleteSkill,
  onDuplicateSkill,
}: SkillTestLabProps) {

  // Zoom state for skill simulator
  const [zoom, setZoom] = useState(3.0);

  // 모든 스킬 목록 (skills props에서 가져옴)
  const allSkillsList = Object.values(skills);
  
  // 태그 기반으로 스킬 분류 (기본 공격 / 스킬)
  const basicAttacksList = allSkillsList.filter(s => s.tags?.includes('basicAttack'));
  const regularSkillsList = allSkillsList.filter(s => s.tags?.includes('skill'));

  // 선택된 기본 공격 가져오기
  const selectedBasicAttack = skills[selectedBasicAttackId];

  // 선택된 스킬 가져오기 (일반 스킬만)
  const selectedSkill = selectedSkillId ? skills[selectedSkillId] : null;

  // 공격 타입에 따른 플레이어 설정
  const getPlayerConfig = (): CharacterConfig => {
    // 선택된 기본 공격의 타입에 따라 설정
    const isMelee = selectedBasicAttack?.id === 'meleeBasic';
    
    if (isMelee) {
      return {
        ...DEFAULT_TEST_PLAYER_CONFIG,
        attackType: 'melee',
        attackRange: { min: 75, max: 75 },
        attackWidth: { min: 90, max: 90 },
      };
    }
    return {
      ...DEFAULT_TEST_PLAYER_CONFIG,
      attackType: 'ranged',
      attackRange: { min: 150, max: 150 },
    };
  };

  // 기본 공격 슬롯 생성
  const getBasicAttackSlot = (): BasicAttackSlot => {
    return {
      skill: selectedBasicAttack,
      keyBinding: 'click',
    };
  };

  // 선택된 스킬을 Space 키로 발동하기 위해 슬롯 1번에 배치
  const convertToSkillSlots = (): SkillSlot[] => {
    if (selectedSkill) {
      // 선택된 스킬을 Space 키 바인딩으로 배치
      return [{
        slotNumber: 1,
        skill: selectedSkill,
        keyBinding: ' ', // Space 키
      }];
    }
    
    return [];
  };

  // Space 키 이벤트 리스너
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && selectedSkill) {
        // Space 키가 눌렸을 때 시각적 피드백
        e.preventDefault();
        toast.info(`⚡ ${selectedSkill.name} 발동!`, {
          duration: 1000,
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSkill]);

  // 아이콘 렌더링
  const getIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />;
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-2 pt-1 px-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <FlaskConical className="w-3.5 h-3.5 text-purple-600" />
            스킬 테스트 랩
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onBasicAttackSelect?.('meleeBasic');
              onSkillSelect?.(regularSkillsList[0]?.id || '');
              toast.success('테스트 랩이 초기화되었습니다!');
            }}
            className="h-7 text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            초기화
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-3 min-h-0 flex gap-3">
        {/* 왼쪽: MultiMonsterSimulator */}
        <div className="flex-shrink-0 flex flex-col" style={{ width: SIMULATOR_WIDTH, height: SIMULATOR_HEIGHT + 90 }}>
          <div className="flex flex-col gap-2.5 h-full">
            <div className="border-2 border-slate-700 rounded-lg overflow-hidden bg-slate-900">
              <MultiMonsterSimulator
                keyBindings={defaultBindings}
                playerConfig={getPlayerConfig()}
                monsterConfig={DEFAULT_TEST_MONSTER_CONFIG}
                currentTick={0}
                currentDataRow={0}
                playerLevelConfig={defaultPlayerLevelConfig}
                monsterLevelConfig={defaultMonsterLevelConfig}
                skillSlots={convertToSkillSlots()}
                skillConfigs={skills}
                itemSlots={[]}
                playerBasicAttack={getBasicAttackSlot()}
                homingProjectiles={false}
                canvasWidth={SIMULATOR_WIDTH}
                canvasHeight={SIMULATOR_HEIGHT}
                testMode={true}
                enableRespawn={false}
                initialMonsterCount={0}
                maxMonsterCount={0}
                showRespawnControls={false}
                title=""
                initialZoom={zoom}
                onZoomChange={setZoom}
              />
            </div>

            {/* 조작 방법 설명 */}
            <div className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-md flex-shrink-0">
              <p className="text-[10px] text-slate-700 text-center">
                <span className="font-semibold text-slate-800">근접 공격 테스트:</span> 마우스 클릭 
                <span className="mx-2 text-slate-400">|</span>
                <span className="font-semibold text-slate-800">스킬 테스트:</span> Space 키
              </p>
            </div>

            {/* 안내 메시지 */}
            <div className="flex items-center justify-between gap-2 p-2 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg flex-shrink-0">
              <div className="flex items-center gap-1.5 text-[10px] text-purple-700">
                <Info className="w-3 h-3 flex-shrink-0" />
                <p>
                  {selectedBasicAttack.name} ~ 마우스클릭 ~ WASD 이동
                </p>
              </div>
              {selectedSkill ? (
                <div className="flex items-center gap-2 px-2 py-1 bg-white border border-purple-300 rounded-md">
                  <kbd className="px-2 py-0.5 bg-purple-600 text-white rounded text-[10px] font-bold shadow-sm">
                    SPACE
                  </kbd>
                  <span className="text-[10px] text-purple-800 font-medium">
                    {selectedSkill.name}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-slate-400 italic">스킬을 선택하세요</span>
              )}
            </div>
          </div>
        </div>

        {/* 오른쪽: 스킬 라이브러리 */}
        <div className="flex-1 flex flex-col min-w-[300px] border-2 border-purple-200 rounded-lg bg-white overflow-hidden" style={{ height: SIMULATOR_HEIGHT + 90 }}>
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center gap-2 px-2 pt-2 pb-2 bg-gradient-to-r from-purple-50 to-blue-50 border-b-2 border-purple-100">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-semibold text-purple-700">스킬 라이브러리</h3>
              <div className="flex-1"></div>
              <Button
                size="sm"
                variant="outline"
                onClick={onAddSkill}
                className="h-7 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                스킬 추가
              </Button>
            </div>

            {/* 탭으로 구분된 스킬 라이브러리 */}
            <Tabs defaultValue="basic" className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <TabsList className="mx-2 mt-2 grid w-auto grid-cols-2">
                <TabsTrigger value="basic" className="text-xs">
                  <Sword className="w-3 h-3 mr-1" />
                  기본 공격
                </TabsTrigger>
                <TabsTrigger value="skill" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  스킬
                </TabsTrigger>
              </TabsList>

              {/* 기본 공격 탭 (근접 + 원거리) */}
              <TabsContent value="basic" className="flex-1 p-2 m-0 overflow-hidden min-h-0 mt-2">
                <ScrollArea className="h-full w-full">
                  <div className="space-y-2 pr-2">
                    {basicAttacksList.map((skill) => (
                      <div
                        key={skill.id}
                        className={`
                          p-2.5 rounded-lg border transition-all cursor-pointer
                          ${selectedBasicAttackId === skill.id
                            ? 'border-orange-400 bg-orange-50 shadow-md'
                            : 'border-slate-200 bg-white hover:border-orange-200 hover:shadow-sm'
                          }
                          hover:scale-[1.02] active:scale-[0.98]
                        `}
                        onClick={() => {
                          onBasicAttackSelect?.(skill.id);
                          const emoji = skill.tags?.includes('melee') ? '⚔️' : '🎯';
                          toast.success(`${emoji} \"${skill.name}\" 선택됨 (마우스 클릭으로 발동)`);
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          {/* 아이콘 */}
                          <div 
                            className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0"
                            style={{ 
                              backgroundColor: skill.visual.color,
                              boxShadow: `0 0 10px ${skill.visual.color}50`
                            }}
                          >
                            <div className="text-white">
                              {getIcon(skill.iconName)}
                            </div>
                          </div>

                          {/* 정보 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <h4 className="text-xs font-medium text-slate-900">
                                {skill.name}
                              </h4>
                              {/* 타입별 배지 */}
                              {skill.tags?.includes('melee') && (
                                <Badge variant="outline" className="text-[8px] px-1 py-0 bg-orange-50 border-orange-300 text-orange-700">
                                  근접
                                </Badge>
                              )}
                              {skill.tags?.includes('ranged') && (
                                <Badge variant="outline" className="text-[8px] px-1 py-0 bg-blue-50 border-blue-300 text-blue-700">
                                  원거리
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-600 mb-1.5">
                              {skill.description}
                            </p>
                            <div className="flex items-center gap-2 text-[9px]">
                              <span className="text-slate-500">사거리: {skill.range}</span>
                              <span className="text-slate-500">범위: {skill.area}°</span>
                              <span className="text-blue-600">{skill.spCost} SP</span>
                              <span className="text-slate-500">
                                {skill.timing 
                                  ? (skill.timing.windup + skill.timing.execution + skill.timing.recovery)
                                  : skill.castTime || 0}ms
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {basicAttacksList.length === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        <Sword className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">기본 공격이 없습니다</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* 스킬 탭 */}
              <TabsContent value="skill" className="flex-1 p-2 m-0 overflow-hidden min-h-0 mt-2">
                <ScrollArea className="h-full w-full">
                  <div className="space-y-2 pr-2">
                    {regularSkillsList.map((skill) => (
                      <div
                        key={skill.id}
                        className={`
                          p-2.5 rounded-lg border transition-all cursor-pointer
                          ${selectedSkillId === skill.id
                            ? 'border-purple-400 bg-purple-50 shadow-md'
                            : 'border-slate-200 bg-white hover:border-purple-200 hover:shadow-sm'
                          }
                          hover:scale-[1.02] active:scale-[0.98]
                        `}
                        onClick={() => {
                          onSkillSelect?.(skill.id);
                          toast.success(`✨ \"${skill.name}\" 선택됨 (Space로 발동)`);
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          {/* 아이콘 */}
                          <div 
                            className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0"
                            style={{ 
                              backgroundColor: skill.visual.color,
                              boxShadow: `0 0 10px ${skill.visual.color}50`
                            }}
                          >
                            <div className="text-white">
                              {getIcon(skill.iconName)}
                            </div>
                          </div>

                          {/* 정보 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <h4 className="text-xs font-medium text-slate-900">
                                {skill.name}
                              </h4>
                              <Badge variant="outline" className="text-[8px] px-1 py-0 bg-purple-50 border-purple-300 text-purple-700">
                                스킬
                              </Badge>
                            </div>
                            <p className="text-[10px] text-slate-600 mb-1.5">
                              {skill.description}
                            </p>
                            <div className="flex items-center gap-2 text-[9px]">
                              <span className="text-slate-500">사거리: {skill.range}</span>
                              <span className="text-slate-500">범위: {skill.area}°</span>
                              <span className="text-blue-600">{skill.spCost} SP</span>
                              <span className="text-slate-500">{(skill.cooldown / 1000).toFixed(1)}s</span>
                            </div>
                          </div>
                          
                          {/* 액션 버튼들 */}
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditSkill?.(skill);
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Edit2 className="w-3 h-3 text-blue-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDuplicateSkill?.(skill);
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="w-3 h-3 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSkill?.(skill.id);
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="w-3 h-3 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {regularSkillsList.length === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">스킬이 없습니다</p>
                        <p className="text-[10px] mt-1">스킬을 추가하세요</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
