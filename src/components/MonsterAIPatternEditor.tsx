import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Brain, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import {
  AIPatternConfig,
  AIPattern,
  PatternAction,
  PatternCondition,
  ConditionType,
  ConditionOperator,
  getActionName,
  getConditionTypeName,
  createEmptyPattern,
} from '../lib/monsterAI';
import { Skill, defaultBasicAttacks } from '../lib/skillSystem';

interface MonsterAIPatternEditorProps {
  config: AIPatternConfig;
  onConfigChange: (config: AIPatternConfig) => void;
  monsterTypeName: string;
  skillConfigs?: Record<string, Skill>; // 전체 스킬 목록
  basicAttackId?: string; // 기본 공격 ID
  monsterTypeSkills?: string[]; // 몬스터 타입에 등록된 스킬 ID 목록
}

const allActions: PatternAction[] = ['attack', 'skill', 'chase', 'flee', 'defend', 'move'];
const conditionTypes: ConditionType[] = ['distance', 'hp'];
const operators: ConditionOperator[] = ['<', '>', '<=', '>='];

export function MonsterAIPatternEditor({
  config,
  onConfigChange,
  monsterTypeName,
  skillConfigs = {},
  basicAttackId = 'meleeBasic',
  monsterTypeSkills = [],
}: MonsterAIPatternEditorProps) {
  // Guard against undefined config
  if (!config || !config.patterns) {
    return (
      <div className='p-4 text-center text-muted-foreground'>
        AI 패턴 설정을 불러올 수 없습니다.
      </div>
    );
  }

  // 기본 공격과 스킬을 모두 포함한 전체 스킬 목록 생성
  const allAvailableSkills: Record<string, Skill> = {
    ...defaultBasicAttacks,
    ...skillConfigs,
  };

  const addPattern = () => {
    if (config.patterns.length >= 10) return;

    const newPattern = createEmptyPattern();
    onConfigChange({
      ...config,
      patterns: [...config.patterns, newPattern],
    });
  };

  const removePattern = (index: number) => {
    const newPatterns = config.patterns.filter((_, i) => i !== index);
    onConfigChange({
      ...config,
      patterns: newPatterns,
    });
  };

  const updatePattern = (index: number, pattern: AIPattern) => {
    const newPatterns = [...config.patterns];
    newPatterns[index] = pattern;
    onConfigChange({
      ...config,
      patterns: newPatterns,
    });
  };

  const addCondition = (patternIndex: number) => {
    const pattern = config.patterns[patternIndex];
    const newCondition: PatternCondition = {
      type: 'distance',
      operator: '<',
      value: 100,
    };

    updatePattern(patternIndex, {
      ...pattern,
      conditions: [...pattern.conditions, newCondition],
    });
  };

  const removeCondition = (patternIndex: number, conditionIndex: number) => {
    const pattern = config.patterns[patternIndex];
    const newConditions = pattern.conditions.filter((_, i) => i !== conditionIndex);

    updatePattern(patternIndex, {
      ...pattern,
      conditions: newConditions,
    });
  };

  const updateCondition = (
    patternIndex: number,
    conditionIndex: number,
    condition: PatternCondition
  ) => {
    const pattern = config.patterns[patternIndex];
    const newConditions = [...pattern.conditions];
    newConditions[conditionIndex] = condition;

    updatePattern(patternIndex, {
      ...pattern,
      conditions: newConditions,
    });
  };

  const movePattern = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === config.patterns.length - 1)
    ) {
      return;
    }

    const newPatterns = [...config.patterns];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newPatterns[index], newPatterns[targetIndex]] = [newPatterns[targetIndex], newPatterns[index]];

    onConfigChange({
      ...config,
      patterns: newPatterns,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center'>
            <Brain className='w-5 h-5 text-white' />
          </div>
          <div className='flex-1'>
            <CardTitle>AI 패턴 규칙</CardTitle>
            <CardDescription>
              {monsterTypeName}의 행동 패턴을 우선순위대로 설정합니다 (위에서 아래로)
              <br />
              💡 거리 조건은 스킬의 사거리(range)를 참조하여 설정하세요
            </CardDescription>
          </div>
          <Badge variant='outline'>{config.patterns.filter(p => p.enabled).length} / 10</Badge>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* 스킬 사거리 정보 */}
        {monsterTypeSkills && monsterTypeSkills.length > 0 && (
          <div className='p-3 bg-blue-50 rounded-lg border border-blue-200'>
            <Label className='text-sm mb-2 block'>📏 등록된 스킬 사거리</Label>
            <div className='flex flex-wrap gap-2'>
              {monsterTypeSkills.map(skillId => {
                const skill = allAvailableSkills[skillId];
                if (!skill) return null;
                return (
                  <Badge key={skillId} variant='secondary' className='text-xs'>
                    {skill.name}: {skill.range}px
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* 패턴 목록 */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <Label className='text-sm'>행동 패턴 (우선순위 순)</Label>
            <Button
              onClick={addPattern}
              disabled={config.patterns.length >= 10}
              size='sm'
              variant='outline'
            >
              <Plus className='w-4 h-4 mr-1' />
              패턴 추가
            </Button>
          </div>

          {config.patterns.length === 0 ? (
            <div className='text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg'>
              패턴을 추가하여 AI 행동을 설정하세요
            </div>
          ) : (
            <div className='space-y-4'>
              {config.patterns.map((pattern, patternIndex) => (
                <div key={patternIndex} className='space-y-2'>
                  {/* 우선순위 칩 (카드 위) */}
                  <Badge
                    variant={pattern.enabled ? 'default' : 'outline'}
                    className={`text-xs px-3 py-1 ${pattern.enabled ? 'bg-purple-600' : ''}`}
                  >
                    우선순위 {patternIndex + 1}
                  </Badge>

                  {/* 패턴 카드 */}
                  <Card
                    className={`${pattern.enabled ? 'border-purple-300' : 'border-slate-200 opacity-60'}`}
                  >
                    <CardContent className='p-4 space-y-3'>
                      {/* 패턴 헤더 */}
                      <div className='flex items-center gap-2'>
                        {/* 좌측 화살표 */}
                        <div className='flex flex-col gap-0.5'>
                          <Button
                            onClick={() => movePattern(patternIndex, 'up')}
                            disabled={patternIndex === 0}
                            size='sm'
                            variant='ghost'
                            className='h-6 w-6 p-0 hover:bg-slate-100 rounded'
                          >
                            <ChevronUp
                              className={`w-4 h-4 ${patternIndex === 0 ? 'text-slate-300' : 'text-slate-600'}`}
                            />
                          </Button>
                          <Button
                            onClick={() => movePattern(patternIndex, 'down')}
                            disabled={patternIndex === config.patterns.length - 1}
                            size='sm'
                            variant='ghost'
                            className='h-6 w-6 p-0 hover:bg-slate-100 rounded'
                          >
                            <ChevronDown
                              className={`w-4 h-4 ${patternIndex === config.patterns.length - 1 ? 'text-slate-300' : 'text-slate-600'}`}
                            />
                          </Button>
                        </div>
                        <div className='flex-1 flex items-center gap-2'>
                          <Select
                            value={pattern.action}
                            onValueChange={value => {
                              updatePattern(patternIndex, {
                                ...pattern,
                                action: value as PatternAction,
                                enabled: true,
                              });
                            }}
                          >
                            <SelectTrigger className='h-8'>
                              <SelectValue placeholder='행동 선택' />
                            </SelectTrigger>
                            <SelectContent>
                              {allActions.map(action => (
                                <SelectItem key={action} value={action}>
                                  {getActionName(action)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* 공격 액션일 경우 기본 공격 선택 드롭다운 표시 */}
                          {pattern.action === 'attack' && (
                            <Select
                              value={pattern.skillId || basicAttackId}
                              onValueChange={value => {
                                updatePattern(patternIndex, {
                                  ...pattern,
                                  skillId: value,
                                });
                              }}
                            >
                              <SelectTrigger className='h-8 flex-1'>
                                <SelectValue placeholder='근접 공격' />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(defaultBasicAttacks).map(([id, skill]) => (
                                  <SelectItem key={id} value={id}>
                                    <div className='flex items-center gap-2'>
                                      <span className='text-orange-600'>⚔️</span>
                                      <span>{skill.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          {/* 스킬 액션일 경우 등록된 스킬 선택 드롭다운 표시 */}
                          {pattern.action === 'skill' && (
                            <Select
                              value={pattern.skillId || ''}
                              onValueChange={value => {
                                updatePattern(patternIndex, {
                                  ...pattern,
                                  skillId: value,
                                });
                              }}
                            >
                              <SelectTrigger className='h-8 flex-1'>
                                <SelectValue placeholder='스킬 선택' />
                              </SelectTrigger>
                              <SelectContent>
                                {monsterTypeSkills.length === 0 ? (
                                  <div className='px-2 py-1.5 text-xs text-slate-500'>
                                    등록된 스킬이 없습니다
                                  </div>
                                ) : (
                                  monsterTypeSkills
                                    .filter(skillId => skillConfigs[skillId])
                                    .map(skillId => {
                                      const skill = skillConfigs[skillId];
                                      return (
                                        <SelectItem key={skillId} value={skillId}>
                                          <div className='flex items-center gap-2'>
                                            <span className='text-purple-600'>✨</span>
                                            <span>{skill.name}</span>
                                          </div>
                                        </SelectItem>
                                      );
                                    })
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        </div>

                        <Button
                          onClick={() => {
                            updatePattern(patternIndex, {
                              ...pattern,
                              enabled: !pattern.enabled,
                            });
                          }}
                          size='sm'
                          variant={pattern.enabled ? 'default' : 'outline'}
                          className='h-8'
                        >
                          {pattern.enabled ? '활성중' : '비활성'}
                        </Button>

                        <Button
                          onClick={() => removePattern(patternIndex)}
                          size='sm'
                          variant='ghost'
                          className='h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50'
                        >
                          <Trash2 className='w-4 h-4' />
                        </Button>
                      </div>

                      {/* 조건 목록 */}
                      <div className='space-y-2'>
                        <div className='flex items-center justify-between'>
                          <Label className='text-xs text-muted-foreground'>조건</Label>
                          <Button
                            onClick={() => addCondition(patternIndex)}
                            size='sm'
                            variant='ghost'
                            className='h-6 text-xs'
                          >
                            <Plus className='w-3 h-3 mr-1' />
                            조건 추가
                          </Button>
                        </div>

                        {pattern.conditions.length === 0 ? (
                          <div className='text-xs text-muted-foreground bg-slate-50 p-2 rounded'>
                            조건 없음 (항상 실행)
                          </div>
                        ) : (
                          <div className='space-y-2'>
                            {pattern.conditions.map((condition, conditionIndex) => (
                              <div
                                key={conditionIndex}
                                className='flex items-center gap-2 bg-slate-50 p-2 rounded'
                              >
                                <Select
                                  value={condition.type}
                                  onValueChange={value => {
                                    updateCondition(patternIndex, conditionIndex, {
                                      ...condition,
                                      type: value as ConditionType,
                                    });
                                  }}
                                >
                                  <SelectTrigger className='h-7 w-20 text-xs'>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {conditionTypes.map(type => (
                                      <SelectItem key={type} value={type} className='text-xs'>
                                        {getConditionTypeName(type)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <Select
                                  value={condition.operator}
                                  onValueChange={value => {
                                    updateCondition(patternIndex, conditionIndex, {
                                      ...condition,
                                      operator: value as ConditionOperator,
                                    });
                                  }}
                                >
                                  <SelectTrigger className='h-7 w-16 text-xs'>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {operators.map(op => (
                                      <SelectItem key={op} value={op} className='text-xs'>
                                        {op}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                <input
                                  type='number'
                                  value={condition.value}
                                  onChange={e => {
                                    const value = parseInt(e.target.value);
                                    if (!isNaN(value)) {
                                      updateCondition(patternIndex, conditionIndex, {
                                        ...condition,
                                        value,
                                      });
                                    }
                                  }}
                                  className='h-7 w-20 px-2 rounded-md border border-input bg-white text-xs'
                                />

                                <span className='text-xs text-muted-foreground'>
                                  {condition.type === 'hp' ? '%' : 'px'}
                                </span>

                                <Button
                                  onClick={() => removeCondition(patternIndex, conditionIndex)}
                                  size='sm'
                                  variant='ghost'
                                  className='h-7 w-7 p-0 ml-auto text-red-600 hover:text-red-700'
                                >
                                  <Trash2 className='w-3 h-3' />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 안내 메시지 */}
        <div className='flex items-start gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg'>
          <Brain className='w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0' />
          <div className='text-xs text-purple-900'>
            <p className='font-medium mb-1'>💡 패턴 작동 방식</p>
            <ul className='space-y-0.5 list-disc list-inside'>
              <li>위에서 아래로 순서대로 조건을 확인합니다</li>
              <li>모든 조건을 만족하는 첫 번째 패턴을 실행합니다</li>
              <li>조건이 없는 패턴은 항상 실행됩니다</li>
              <li>비활성화된 패턴은 무시됩니다</li>
              <li>
                <strong>추적 최소 거리:</strong> 0이면 공격 범위의 80%까지 자동으로 다가갑니다
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
