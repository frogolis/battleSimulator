import {
  Brain,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Percent,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CharacterTypeInfo } from '../lib/characterTypes';
import { CharacterConfig, CharacterType } from '../lib/gameTypes';
import { updateDataRowWithLevel } from '../lib/levelBasedStats';
import { LevelConfig } from '../lib/levelSystem';
import { DataRow } from '../lib/mockData';
import {
  AIPatternConfig,
  AIType,
  aiTypes,
  defaultAIPatternConfig,
  skillPriorities,
  SkillPriority,
} from '../lib/monsterAI';
import { defaultSkills, Skill } from '../lib/skillSystem';
import { MonsterAIPatternEditor } from './MonsterAIPatternEditor';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';

const logMonsterDataset = (..._args: unknown[]): void => {};

const isPatternAction = (
  value: unknown
): value is AIPatternConfig['patterns'][number]['action'] => {
  return (
    value === 'move' ||
    value === 'defend' ||
    value === 'chase' ||
    value === 'flee' ||
    value === 'attack' ||
    value === 'skill'
  );
};

// defaultSkills를 배열로 변환
const defaultSkillsArray = Object.values(defaultSkills);

interface MonsterDatasetViewerProps {
  dataset: DataRow[];
  setDataset: (dataset: DataRow[]) => void;
  currentTick: number;
  setCurrentTick: (tick: number) => void;
  monsterConfig: CharacterConfig;
  monsterLevelConfig?: LevelConfig;
  onApplyRow?: (row: DataRow) => void;
  characterTypes: CharacterTypeInfo[];
  selectedRows?: Set<number>;
  onSelectedRowsChange?: (rows: Set<number>) => void;
  maxMonsterCount?: number;
  onMaxMonsterCountChange?: (count: number) => void;
  respawnDelay?: number;
  onRespawnDelayChange?: (delay: number) => void;
  skillConfigs?: Record<string, Skill>;
}

interface ColumnWidths {
  [key: string]: number;
}

export function MonsterDatasetViewer({
  dataset,
  setDataset,
  currentTick,
  setCurrentTick,
  monsterConfig,
  monsterLevelConfig,
  onApplyRow,
  characterTypes,
  selectedRows = new Set<number>(),
  onSelectedRowsChange,
  maxMonsterCount = 5,
  onMaxMonsterCountChange,
  respawnDelay = 3000,
  onRespawnDelayChange,
  skillConfigs = defaultSkills,
}: MonsterDatasetViewerProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const [editingAIPattern, setEditingAIPattern] = useState<{
    rowIndex: number;
    config: AIPatternConfig;
  } | null>(null);
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({
    select: 50,
    index: 60,
    weight: 70,
    monster_name: 100,
    monster_color: 80,
    monster_attack_type: 100,
    monster_level: 60,
    monster_size: 80,
    monster_ai_patterns: 120,
    monster_hp: 70,
    monster_sp: 70,
    monster_speed: 80,
    monster_attack: 90,
    monster_defense: 90,
    monster_attack_speed: 80,
    monster_accuracy: 80,
    monster_critical_rate: 80,
    monster_basic_attack: 100,
    monster_skill_1: 100,
    monster_skill_2: 100,
    monster_skill_3: 100,
    monster_skill_4: 100,
    delete: 80,
  });

  const [resizing, setResizing] = useState<{
    column: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const handleAddRow = () => {
    // 레벨 1로 새 행 생성, 능력치는 자동 계산
    const firstType = characterTypes[0];

    // 타입의 기본 스킬 목록
    const defaultSkillIds = firstType?.defaultSkillIds || ['powerSlash', 'whirlwind'];

    const baseRow: DataRow = {
      t: dataset.length * 0.1,
      x: 600,
      y: 350,
      speed: 60,
      dir: 0,
      is_attack: 0,
      is_miss: 0,
      is_crit: 0,
      monster_attack_type: firstType?.id || monsterConfig.attackType,
      monster_name: `몬스터 ${dataset.length + 1}`,
      monster_color: '#ff6b6b',
      monster_spawn_weight: 1,
      monster_level: firstType?.defaultLevel || 1,
      monster_size: firstType?.defaultSize || 24,
      // AI 설정
      monster_ai_patterns: JSON.stringify(firstType?.defaultAIPattern || defaultAIPatternConfig),
      // 기본 공격
      monster_basic_attack_id: firstType?.defaultBasicAttackId || 'meleeBasic',
      monster_basic_attack_range: 75,
      monster_basic_attack_width: 90,
      monster_basic_attack_damage: 1.0,
      monster_basic_attack_cooldown: 1000,
      monster_basic_attack_sp_cost: 0,
      monster_basic_attack_cast_time: 300,
      // 스킬 슬롯 1
      monster_skill_1_id: defaultSkillIds[0] || 'powerSlash',
      monster_skill_1_range: 100,
      monster_skill_1_width: 120,
      monster_skill_1_damage: 1.5,
      monster_skill_1_cooldown: 3000,
      monster_skill_1_sp_cost: 20,
      monster_skill_1_cast_time: 500,
      // 스킬 슬롯 2
      monster_skill_2_id: defaultSkillIds[1] || 'whirlwind',
      monster_skill_2_range: 150,
      monster_skill_2_width: 360,
      monster_skill_2_damage: 0.8,
      monster_skill_2_cooldown: 5000,
      monster_skill_2_sp_cost: 30,
      monster_skill_2_cast_time: 800,
      // 스킬 슬롯 3
      monster_skill_3_id: defaultSkillIds[2] || '',
      monster_skill_3_range: 0,
      monster_skill_3_width: 0,
      monster_skill_3_damage: 0,
      monster_skill_3_cooldown: 10000,
      monster_skill_3_sp_cost: 40,
      monster_skill_3_cast_time: 1000,
      // 스킬 슬롯 4
      monster_skill_4_id: defaultSkillIds[3] || '',
      monster_skill_4_range: 0,
      monster_skill_4_width: 0,
      monster_skill_4_damage: 0,
      monster_skill_4_cooldown: 15000,
      monster_skill_4_sp_cost: 50,
      monster_skill_4_cast_time: 500,
    };

    // 첫 번째 타입의 기본 레벨과 크기로 능력치 자동 계산
    const defaultLevel = firstType?.defaultLevel || 1;
    const defaultSize = firstType?.defaultSize || 24;
    const newRow = monsterLevelConfig
      ? updateDataRowWithLevel(
          baseRow,
          false,
          monsterLevelConfig,
          defaultLevel,
          defaultSize,
          firstType
        )
      : {
          ...baseRow,
          monster_hp: 100,
          monster_sp: 50,
          monster_speed: 60,
          monster_attack: 20,
          monster_defense: 10,
          monster_attack_speed: 1.0,
          monster_accuracy: 75,
          monster_critical_rate: 15,
        };

    const newDataset = [...dataset, newRow];
    setDataset(newDataset);
    setCurrentTick(newDataset.length - 1);

    toast.success(`✅ 몬스터 설정이 추가되었습니다! (행 ${newDataset.length - 1})`);
  };

  const handleDeleteRow = (index: number) => {
    const newDataset = dataset.filter((_, i) => i !== index);
    setDataset(newDataset);
    if (currentTick >= newDataset.length) {
      setCurrentTick(Math.max(0, newDataset.length - 1));
    }
    toast.info('🗑️ 행이 삭제되었습니다');
  };

  const handleApplyRow = () => {
    const row = dataset[currentTick];
    if (row && onApplyRow) {
      onApplyRow(row);
      toast.success(`✅ 행 ${currentTick}의 몬스터 설정을 불러왔습니다!`);
    }
  };

  const handleRowClick = (index: number) => {
    setCurrentTick(index);
  };

  const handleRowSelect = (index: number) => {
    if (!onSelectedRowsChange) return;

    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
      toast.info(`🔲 행 ${index} 선택 해제`);
    } else {
      newSelected.add(index);
      toast.success(`✅ 행 ${index} 선택됨`);
    }
    onSelectedRowsChange(newSelected);
  };

  const handleCellUpdate = (rowIndex: number, field: string, value: unknown) => {
    const newDataset = [...dataset];
    const row = newDataset[rowIndex];

    // 레벨, 크기, 타입 변경 시 능력치 재계산
    if (
      (field === 'monster_level' || field === 'monster_size' || field === 'monster_attack_type') &&
      monsterLevelConfig
    ) {
      const newLevel = Number(field === 'monster_level' ? value : row.monster_level) || 1;
      const currentSize = Number(field === 'monster_size' ? value : row.monster_size) || 24;
      const typeId =
        field === 'monster_attack_type' ? String(value) : (row.monster_attack_type ?? undefined);

      // 타입 정�� 찾기
      const typeInfo = characterTypes.find(t => t.id === typeId);

      // 능력치 재계산
      const updatedRow = updateDataRowWithLevel(
        row,
        false,
        monsterLevelConfig,
        newLevel,
        currentSize,
        typeInfo
      );

      // 타입 변경 시 기본 레벨, 크기, 기본 공격, 스킬, AI 패턴도 변경
      if (field === 'monster_attack_type' && typeInfo) {
        const defaultSkillIds = typeInfo.defaultSkillIds || [];
        // 현재 행의 레벨과 크기 유지 (사용자가 수정한 값 보존)
        const currentLevel = row.monster_level || typeInfo.defaultLevel || 1;
        const currentSize = row.monster_size || typeInfo.defaultSize || 24;
        // 현재 레벨과 크기로 능력치만 재계산
        const typeBasedRow = updateDataRowWithLevel(
          row,
          false,
          monsterLevelConfig,
          currentLevel,
          currentSize,
          typeInfo
        );
        newDataset[rowIndex] = {
          ...typeBasedRow,
          [field]: String(value),
          // 레벨과 크기는 유지 (이미 typeBasedRow에 포함되어 있음)
          monster_level: currentLevel,
          monster_size: currentSize,
          // 기본 공격 변경
          monster_basic_attack_id: typeInfo.defaultBasicAttackId || 'meleeBasic',
          // 스킬 슬롯 변경
          monster_skill_1_id: defaultSkillIds[0] || '',
          monster_skill_2_id: defaultSkillIds[1] || '',
          monster_skill_3_id: defaultSkillIds[2] || '',
          monster_skill_4_id: defaultSkillIds[3] || '',
          // AI 패턴 변경
          monster_ai_patterns: typeInfo.defaultAIPattern
            ? JSON.stringify(typeInfo.defaultAIPattern)
            : row.monster_ai_patterns,
        };
        toast.info(
          `🎯 타입 "${typeInfo.name}"으로 변경! 레벨 ${typeInfo.defaultLevel}, 크기 ${typeInfo.defaultSize}로 초기화되었습니다.`
        );
      } else {
        newDataset[rowIndex] = {
          ...updatedRow,
          [field]: value,
        };
        toast.info(`🔄 레벨 ${newLevel} 기반으로 능력치가 재계산되었습니다!`);
      }
    } else {
      // 다른 필드는 그대로 업데이트
      newDataset[rowIndex] = {
        ...row,
        [field]: value,
      };
    }

    setDataset(newDataset);
  };

  const handleEditAIPattern = (rowIndex: number) => {
    const row = dataset[rowIndex];
    let config: AIPatternConfig;

    try {
      if (row.monster_ai_patterns) {
        const parsed =
          typeof row.monster_ai_patterns === 'string'
            ? JSON.parse(row.monster_ai_patterns)
            : row.monster_ai_patterns;

        // Validate that parsed config has required structure
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.patterns)) {
          config = {
            patterns: parsed.patterns.map((p: unknown) => {
              const pattern =
                p && typeof p === 'object' ? (p as Record<string, unknown>) : undefined;

              const action = pattern?.action;
              return {
                action: isPatternAction(action) ? action : 'chase',
                conditions: Array.isArray(pattern?.conditions) ? pattern.conditions : [],
                enabled: pattern?.enabled !== false,
                skillId: typeof pattern?.skillId === 'number' ? pattern.skillId : undefined,
              };
            }),
            aggroRange:
              typeof parsed.aggroRange === 'number'
                ? parsed.aggroRange
                : defaultAIPatternConfig.aggroRange,
            chaseMinDistance:
              typeof parsed.chaseMinDistance === 'number'
                ? parsed.chaseMinDistance
                : defaultAIPatternConfig.chaseMinDistance,
          };
        } else {
          logMonsterDataset('⚠️ AI 패턴 구조가 잘못되었습니다. 기본값 사용:', parsed);
          config = { ...defaultAIPatternConfig };
        }
      } else {
        logMonsterDataset('ℹ️ AI 패턴이 없습니다. 기본값 사용');
        config = { ...defaultAIPatternConfig };
      }
    } catch (error) {
      logMonsterDataset('❌ AI 패턴 파싱 오류:', error, row.monster_name || 'Unknown Monster');
      config = { ...defaultAIPatternConfig };
    }

    logMonsterDataset('✅ AI 패턴 편집기 열기:', config);

    // Ensure config is valid before setting state
    if (!config || !config.patterns || !Array.isArray(config.patterns)) {
      logMonsterDataset('❌ Config가 유효하지 않습니다:', config);
      toast.error('AI 패턴 설정을 불러올 수 없습니다.');
      return;
    }

    setEditingAIPattern({ rowIndex, config });
  };

  const handleSaveAIPattern = (config: AIPatternConfig) => {
    if (!editingAIPattern) return;

    const newDataset = [...dataset];
    newDataset[editingAIPattern.rowIndex] = {
      ...newDataset[editingAIPattern.rowIndex],
      monster_ai_patterns: JSON.stringify(config),
    };

    setDataset(newDataset);
    setEditingAIPattern(null);
    toast.success('AI 패턴이 저장되었습니다!');
  };

  const getFieldConfig = (field: string) => {
    const configs: Record<string, { min: number; max: number; step: number }> = {
      monster_level: { min: 1, max: 100, step: 1 },
      monster_hp: { min: 40, max: 400, step: 10 },
      monster_sp: { min: 10, max: 150, step: 10 },
      monster_size: { min: 8, max: 32, step: 2 },
      monster_speed: { min: 30, max: 200, step: 10 },
      monster_attack: { min: 10, max: 100, step: 5 },
      monster_defense: { min: 0, max: 50, step: 5 },
      monster_attack_speed: { min: 0.5, max: 3.0, step: 0.1 },
      monster_accuracy: { min: 50, max: 100, step: 5 },
      monster_critical_rate: { min: 0, max: 50, step: 5 },
      monster_attack_range: { min: 30, max: 150, step: 10 },
      monster_attack_width: { min: 30, max: 360, step: 15 },
      monster_spawn_weight: { min: 1, max: 100, step: 1 },
      monster_ai_aggro_range: { min: 100, max: 600, step: 50 },
    };
    return configs[field] || { min: 0, max: 100, step: 1 };
  };

  const handleResizeStart = (column: string, e: React.MouseEvent) => {
    e.preventDefault();
    setResizing({
      column,
      startX: e.clientX,
      startWidth: columnWidths[column] || 80,
    });
  };

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizing) return;
      const diff = e.clientX - resizing.startX;
      const newWidth = Math.max(50, resizing.startWidth + diff);
      setColumnWidths(prev => ({
        ...prev,
        [resizing.column]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  const renderNameCell = (rowIndex: number, value: string) => {
    const isEditing = editingCell?.row === rowIndex && editingCell?.field === 'monster_name';

    return (
      <Popover
        open={isEditing}
        onOpenChange={open => {
          if (open) {
            setEditingCell({ row: rowIndex, field: 'monster_name' });
          } else {
            setEditingCell(null);
          }
        }}
      >
        <PopoverTrigger asChild>
          <div
            className='cursor-pointer hover:bg-green-100 rounded px-2 py-1 text-center truncate'
            onClick={e => e.stopPropagation()}
            title={value}
          >
            {value}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className='w-56 p-3'
          align='start'
          side='bottom'
          onClick={e => e.stopPropagation()}
        >
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <span className='text-xs'>몬스터 이름</span>
              <Button
                size='sm'
                variant='ghost'
                className='h-5 w-5 p-0'
                onClick={e => {
                  e.stopPropagation();
                  setEditingCell(null);
                }}
              >
                <X className='h-3 w-3' />
              </Button>
            </div>
            <input
              type='text'
              value={value}
              onChange={e => handleCellUpdate(rowIndex, 'monster_name', e.target.value)}
              className='w-full px-2 py-1 border rounded text-sm'
              placeholder='몬스터 이름'
              autoFocus
            />
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const renderColorCell = (rowIndex: number, value: string) => {
    const isEditing = editingCell?.row === rowIndex && editingCell?.field === 'monster_color';

    return (
      <Popover
        open={isEditing}
        onOpenChange={open => {
          if (open) {
            setEditingCell({ row: rowIndex, field: 'monster_color' });
          } else {
            setEditingCell(null);
          }
        }}
      >
        <PopoverTrigger asChild>
          <div
            className='cursor-pointer hover:bg-pink-100 rounded px-2 py-1 flex items-center justify-center gap-2'
            onClick={e => e.stopPropagation()}
          >
            <div
              className='w-5 h-5 rounded border-2 border-white shadow'
              style={{ backgroundColor: value }}
            />
            <span className='text-xs truncate'>{value}</span>
          </div>
        </PopoverTrigger>
        <PopoverContent
          className='w-56 p-3'
          align='start'
          side='bottom'
          onClick={e => e.stopPropagation()}
        >
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <span className='text-xs'>몬스터 색상</span>
              <Button
                size='sm'
                variant='ghost'
                className='h-5 w-5 p-0'
                onClick={e => {
                  e.stopPropagation();
                  setEditingCell(null);
                }}
              >
                <X className='h-3 w-3' />
              </Button>
            </div>
            <div className='flex items-center gap-2'>
              <input
                type='color'
                value={value}
                onChange={e => handleCellUpdate(rowIndex, 'monster_color', e.target.value)}
                className='w-12 h-8 cursor-pointer'
              />
              <input
                type='text'
                value={value}
                onChange={e => handleCellUpdate(rowIndex, 'monster_color', e.target.value)}
                className='flex-1 px-2 py-1 border rounded text-sm'
                placeholder='#ff6b6b'
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const renderEditableCell = (
    rowIndex: number,
    field: string,
    value: string | number | undefined,
    suffix = '',
    isReadOnly = false
  ) => {
    const isEditing = editingCell?.row === rowIndex && editingCell?.field === field;

    // 읽기 전용 필드 (레벨에 의해 자동 계산됨)
    if (isReadOnly) {
      const displayValue =
        typeof value === 'number'
          ? field.includes('attack_speed')
            ? value.toFixed(1)
            : value
          : value || '-';
      return (
        <div
          className='px-2 py-1 text-center truncate bg-slate-100 text-slate-600'
          title={`${displayValue}${displayValue !== '-' ? suffix : ''} (레벨에 의해 자동 계산)`}
        >
          {displayValue}
          {displayValue !== '-' ? suffix : ''}
        </div>
      );
    }

    if (field === 'monster_attack_type') {
      const currentType = (value as CharacterType) || 'melee';
      const typeInfo = characterTypes.find(t => t.id === currentType);

      return (
        <Popover
          open={isEditing}
          onOpenChange={open => {
            if (open) {
              setEditingCell({ row: rowIndex, field });
            } else {
              setEditingCell(null);
            }
          }}
        >
          <PopoverTrigger asChild>
            <div
              className='cursor-pointer hover:bg-red-100 rounded px-2 py-1 text-center truncate'
              onClick={e => {
                e.stopPropagation();
              }}
              title={typeInfo?.name || currentType}
            >
              <span className={typeInfo?.color}>{typeInfo?.name || currentType}</span>
            </div>
          </PopoverTrigger>
          <PopoverContent
            className='w-64 p-3'
            align='start'
            side='bottom'
            onClick={e => e.stopPropagation()}
          >
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='text-xs'>캐릭터 타입</span>
                <Button
                  size='sm'
                  variant='ghost'
                  className='h-5 w-5 p-0'
                  onClick={e => {
                    e.stopPropagation();
                    setEditingCell(null);
                  }}
                >
                  <X className='h-3 w-3' />
                </Button>
              </div>
              <Select
                value={currentType}
                onValueChange={newValue => {
                  handleCellUpdate(rowIndex, field, newValue as CharacterType);
                  setEditingCell(null);
                }}
              >
                <SelectTrigger className='h-8 w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='max-h-64'>
                  {characterTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className='flex items-center gap-2'>
                        <span className={type.color}>{type.name}</span>
                        <span className='text-xs text-muted-foreground'>- {type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    // AI 타입 선택
    if (field === 'monster_ai_type') {
      const currentAIType = (value as AIType) || 'aggressive';
      const aiInfo = aiTypes[currentAIType];

      return (
        <Popover
          open={isEditing}
          onOpenChange={open => {
            if (open) {
              setEditingCell({ row: rowIndex, field });
            } else {
              setEditingCell(null);
            }
          }}
        >
          <PopoverTrigger asChild>
            <div
              className='cursor-pointer hover:bg-cyan-100 rounded px-2 py-1 text-center truncate'
              onClick={e => {
                e.stopPropagation();
              }}
              title={aiInfo?.name || currentAIType}
            >
              <span>
                {aiInfo?.icon} {aiInfo?.name || currentAIType}
              </span>
            </div>
          </PopoverTrigger>
          <PopoverContent
            className='w-64 p-3'
            align='start'
            side='bottom'
            onClick={e => e.stopPropagation()}
          >
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='text-xs'>AI 타입</span>
                <Button
                  size='sm'
                  variant='ghost'
                  className='h-5 w-5 p-0'
                  onClick={e => {
                    e.stopPropagation();
                    setEditingCell(null);
                  }}
                >
                  <X className='h-3 w-3' />
                </Button>
              </div>
              <Select
                value={currentAIType}
                onValueChange={newValue => {
                  handleCellUpdate(rowIndex, field, newValue as AIType);
                  setEditingCell(null);
                }}
              >
                <SelectTrigger className='h-8 w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='max-h-64'>
                  {Object.entries(aiTypes).map(([key, type]) => (
                    <SelectItem key={key} value={key}>
                      <div className='flex items-center gap-2'>
                        <span>
                          {type.icon} {type.name}
                        </span>
                        <span className='text-xs text-muted-foreground'>- {type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    // 스킬 우선순위 선택
    if (field === 'monster_ai_skill_priority') {
      const currentPriority = (value as SkillPriority) || 'damage';
      const priorityInfo = skillPriorities[currentPriority];

      return (
        <Popover
          open={isEditing}
          onOpenChange={open => {
            if (open) {
              setEditingCell({ row: rowIndex, field });
            } else {
              setEditingCell(null);
            }
          }}
        >
          <PopoverTrigger asChild>
            <div
              className='cursor-pointer hover:bg-cyan-100 rounded px-2 py-1 text-center truncate'
              onClick={e => {
                e.stopPropagation();
              }}
              title={priorityInfo?.name || currentPriority}
            >
              <span>
                {priorityInfo?.icon} {priorityInfo?.name || currentPriority}
              </span>
            </div>
          </PopoverTrigger>
          <PopoverContent
            className='w-64 p-3'
            align='start'
            side='bottom'
            onClick={e => e.stopPropagation()}
          >
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='text-xs'>스킬 우선순위</span>
                <Button
                  size='sm'
                  variant='ghost'
                  className='h-5 w-5 p-0'
                  onClick={e => {
                    e.stopPropagation();
                    setEditingCell(null);
                  }}
                >
                  <X className='h-3 w-3' />
                </Button>
              </div>
              <Select
                value={currentPriority}
                onValueChange={newValue => {
                  handleCellUpdate(rowIndex, field, newValue as SkillPriority);
                  setEditingCell(null);
                }}
              >
                <SelectTrigger className='h-8 w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='max-h-64'>
                  {Object.entries(skillPriorities).map(([key, priority]) => (
                    <SelectItem key={key} value={key}>
                      <div className='flex items-center gap-2'>
                        <span>
                          {priority.icon} {priority.name}
                        </span>
                        <span className='text-xs text-muted-foreground'>
                          - {priority.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    // 기본 공격 스킬 선택 (monster_basic_attack_id)
    if (field === 'monster_basic_attack') {
      const row = dataset[rowIndex];
      const currentSkillId = (row.monster_basic_attack_id as string) || 'meleeBasic';
      const currentSkill = skillConfigs?.[currentSkillId];

      // 기본 공격용 스킬만 필터링 (skillConfigs에서 category === 'basicAttack'인 것들)
      const basicAttackSkills = skillConfigs
        ? Object.values(skillConfigs).filter(skill => skill.category === 'basicAttack')
        : defaultSkillsArray.filter(skill => skill.category === 'basicAttack');

      // 현재 기본 공격의 파라미터 값 가져오기
      const range = (row.monster_basic_attack_range as number) || 100;
      const width = (row.monster_basic_attack_width as number) || 120;
      const damage = (row.monster_basic_attack_damage as number) || 1.0;
      const cooldown = (row.monster_basic_attack_cooldown as number) || 1000;
      const spCost = (row.monster_basic_attack_sp_cost as number) || 0;
      const castTime = (row.monster_basic_attack_cast_time as number) || 300;

      return (
        <Popover
          open={isEditing}
          onOpenChange={open => {
            if (open) {
              setEditingCell({ row: rowIndex, field });
            } else {
              setEditingCell(null);
            }
          }}
        >
          <PopoverTrigger asChild>
            <div
              className='cursor-pointer hover:bg-purple-100 rounded px-2 py-1 text-center truncate'
              onClick={e => {
                e.stopPropagation();
              }}
              title={currentSkill?.name || currentSkillId}
            >
              <span className='text-purple-700'>{currentSkill?.name || currentSkillId}</span>
            </div>
          </PopoverTrigger>
          <PopoverContent
            className='w-80 p-4 z-50'
            align='start'
            side='bottom'
            sideOffset={5}
            onClick={e => e.stopPropagation()}
          >
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium'>기본 공격</span>
                <Button
                  size='sm'
                  variant='ghost'
                  className='h-5 w-5 p-0'
                  onClick={e => {
                    e.stopPropagation();
                    setEditingCell(null);
                  }}
                >
                  <X className='h-3 w-3' />
                </Button>
              </div>

              {/* 스킬 선택 */}
              <div className='space-y-1'>
                <Label className='text-xs'>공격 타입</Label>
                <Select
                  value={currentSkillId}
                  onValueChange={newSkillId => {
                    const skill =
                      skillConfigs?.[newSkillId] ||
                      defaultSkillsArray.find(s => s.id === newSkillId);
                    if (skill) {
                      const newDataset = [...dataset];
                      newDataset[rowIndex] = {
                        ...newDataset[rowIndex],
                        monster_basic_attack_id: newSkillId,
                        monster_basic_attack_range: skill.range,
                        monster_basic_attack_width: skill.area,
                        monster_basic_attack_damage: skill.damageMultiplier,
                        monster_basic_attack_cooldown: skill.cooldown,
                        monster_basic_attack_sp_cost: skill.spCost,
                        monster_basic_attack_cast_time: skill.castTime,
                      };
                      setDataset(newDataset);
                      toast.success(`✨ 기본 공격을 ${skill.name}로 설정했습니다!`);
                    }
                  }}
                >
                  <SelectTrigger className='h-8 w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className='max-h-64'>
                    {basicAttackSkills.map(skill => (
                      <SelectItem key={skill.id} value={skill.id}>
                        {skill.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 파라미터 편집 */}
              <div className='space-y-2 border-t pt-3'>
                {/* 범위 */}
                <div className='space-y-1'>
                  <div className='flex justify-between text-xs'>
                    <Label>범위</Label>
                    <Badge variant='secondary' className='h-5'>
                      {range}px
                    </Badge>
                  </div>
                  <Slider
                    value={[range]}
                    onValueChange={v => {
                      const newDataset = [...dataset];
                      newDataset[rowIndex] = {
                        ...newDataset[rowIndex],
                        monster_basic_attack_range: v[0],
                      };
                      setDataset(newDataset);
                      // 현재 틱이 변경된 행이면 즉시 반영
                      if (rowIndex === currentTick && onApplyRow) {
                        onApplyRow(newDataset[rowIndex]);
                      }
                    }}
                    min={30}
                    max={200}
                    step={10}
                    className='w-full'
                  />
                </div>

                {/* 넓이 */}
                <div className='space-y-1'>
                  <div className='flex justify-between text-xs'>
                    <Label>넓이</Label>
                    <Badge variant='secondary' className='h-5'>
                      {width}°
                    </Badge>
                  </div>
                  <Slider
                    value={[width]}
                    onValueChange={v => {
                      const newDataset = [...dataset];
                      newDataset[rowIndex] = {
                        ...newDataset[rowIndex],
                        monster_basic_attack_width: v[0],
                      };
                      setDataset(newDataset);
                      // 현재 틱이 변경된 행이면 즉시 반영
                      if (rowIndex === currentTick && onApplyRow) {
                        onApplyRow(newDataset[rowIndex]);
                      }
                    }}
                    min={30}
                    max={360}
                    step={15}
                    className='w-full'
                  />
                </div>

                {/* 데미지 */}
                <div className='space-y-1'>
                  <div className='flex justify-between text-xs'>
                    <Label>데미지 배율</Label>
                    <Badge variant='secondary' className='h-5'>
                      {damage.toFixed(1)}x
                    </Badge>
                  </div>
                  <Slider
                    value={[damage * 10]}
                    onValueChange={v => {
                      const newDataset = [...dataset];
                      newDataset[rowIndex] = {
                        ...newDataset[rowIndex],
                        monster_basic_attack_damage: v[0] / 10,
                      };
                      setDataset(newDataset);
                    }}
                    min={5}
                    max={50}
                    step={1}
                    className='w-full'
                  />
                </div>

                {/* 쿨타임 */}
                <div className='space-y-1'>
                  <div className='flex justify-between text-xs'>
                    <Label>쿨타임</Label>
                    <Badge variant='secondary' className='h-5'>
                      {(cooldown / 1000).toFixed(1)}초
                    </Badge>
                  </div>
                  <Slider
                    value={[cooldown / 100]}
                    onValueChange={v => {
                      const newDataset = [...dataset];
                      newDataset[rowIndex] = {
                        ...newDataset[rowIndex],
                        monster_basic_attack_cooldown: v[0] * 100,
                      };
                      setDataset(newDataset);
                    }}
                    min={5}
                    max={100}
                    step={1}
                    className='w-full'
                  />
                </div>

                {/* SP 소모 */}
                <div className='space-y-1'>
                  <div className='flex justify-between text-xs'>
                    <Label>SP 소모</Label>
                    <Badge variant='secondary' className='h-5'>
                      {spCost}
                    </Badge>
                  </div>
                  <Slider
                    value={[spCost]}
                    onValueChange={v => {
                      const newDataset = [...dataset];
                      newDataset[rowIndex] = {
                        ...newDataset[rowIndex],
                        monster_basic_attack_sp_cost: v[0],
                      };
                      setDataset(newDataset);
                    }}
                    min={0}
                    max={100}
                    step={5}
                    className='w-full'
                  />
                </div>

                {/* 시전 시간 */}
                <div className='space-y-1'>
                  <div className='flex justify-between text-xs'>
                    <Label>시전 시간</Label>
                    <Badge variant='secondary' className='h-5'>
                      {castTime}ms
                    </Badge>
                  </div>
                  <Slider
                    value={[castTime / 10]}
                    onValueChange={v => {
                      const newDataset = [...dataset];
                      newDataset[rowIndex] = {
                        ...newDataset[rowIndex],
                        monster_basic_attack_cast_time: v[0] * 10,
                      };
                      setDataset(newDataset);
                    }}
                    min={10}
                    max={200}
                    step={5}
                    className='w-full'
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    // 스킬 슬롯 렌더링
    if (field.startsWith('monster_skill_')) {
      const slotMatch = field.match(/monster_skill_(\d+)/);
      if (slotMatch) {
        const slotNum = parseInt(slotMatch[1]);
        const rowData = dataset[rowIndex] as unknown as Record<string, unknown>;
        const skillId = rowData[`monster_skill_${slotNum}_id`];
        const skill = defaultSkillsArray.find(s => s.id === skillId);
        const range = Number(rowData[`monster_skill_${slotNum}_range`] ?? 0);
        const width = Number(rowData[`monster_skill_${slotNum}_width`] ?? 0);
        const damage = Number(rowData[`monster_skill_${slotNum}_damage`] ?? 0);
        const cooldown = Number(rowData[`monster_skill_${slotNum}_cooldown`] ?? 0);
        const spCost = Number(rowData[`monster_skill_${slotNum}_sp_cost`] ?? 0);
        const castTime = Number(rowData[`monster_skill_${slotNum}_cast_time`] ?? 0);

        return (
          <Popover
            open={isEditing}
            onOpenChange={open => {
              if (open) {
                setEditingCell({ row: rowIndex, field });
              } else {
                setEditingCell(null);
              }
            }}
          >
            <PopoverTrigger asChild>
              <div
                className='cursor-pointer hover:bg-purple-100 rounded px-2 py-1 text-center truncate'
                onClick={e => {
                  e.stopPropagation();
                }}
                title={skill?.name || '스킬 없음'}
              >
                <span className={skill ? 'text-purple-700' : 'text-gray-500'}>
                  {skill?.name || '없음'}
                </span>
              </div>
            </PopoverTrigger>
            <PopoverContent
              className='w-80 p-4'
              align='start'
              side='bottom'
              onClick={e => e.stopPropagation()}
            >
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs'>스킬 {slotNum} 설정</span>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-5 w-5 p-0'
                    onClick={e => {
                      e.stopPropagation();
                      setEditingCell(null);
                    }}
                  >
                    <X className='h-3 w-3' />
                  </Button>
                </div>

                {/* 스킬 선택 */}
                <div className='space-y-1'>
                  <Label className='text-xs'>스킬</Label>
                  <Select
                    value={(typeof skillId === 'string' && skillId) || 'none'}
                    onValueChange={newValue => {
                      if (newValue === 'none') {
                        // '없음' 선택 시 스킬 ID를 빈 문자열로 설정
                        const newDataset = [...dataset];
                        newDataset[rowIndex] = {
                          ...newDataset[rowIndex],
                          [`monster_skill_${slotNum}_id`]: '',
                        };
                        setDataset(newDataset);
                      } else {
                        const newSkill = defaultSkillsArray.find(s => s.id === newValue);
                        if (newSkill) {
                          const newDataset = [...dataset];
                          newDataset[rowIndex] = {
                            ...newDataset[rowIndex],
                            [`monster_skill_${slotNum}_id`]: newSkill.id,
                            [`monster_skill_${slotNum}_range`]: newSkill.range,
                            [`monster_skill_${slotNum}_width`]: newSkill.area,
                            [`monster_skill_${slotNum}_damage`]: newSkill.damageMultiplier,
                            [`monster_skill_${slotNum}_cooldown`]: newSkill.cooldown,
                            [`monster_skill_${slotNum}_sp_cost`]: newSkill.spCost,
                            [`monster_skill_${slotNum}_cast_time`]: newSkill.castTime,
                          };
                          setDataset(newDataset);
                        }
                      }
                    }}
                  >
                    <SelectTrigger className='h-8 w-full'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className='max-h-64'>
                      <SelectItem value='none'>
                        <span className='text-gray-500 italic'>없음</span>
                      </SelectItem>
                      {defaultSkillsArray.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className='flex items-center gap-2'>
                            <span className='text-red-600'>{s.name}</span>
                            <span className='text-xs text-muted-foreground'>- {s.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 범위 */}
                <div className='space-y-1'>
                  <div className='flex justify-between text-xs'>
                    <Label>범위</Label>
                    <Badge variant='secondary' className='h-5'>
                      {range}px
                    </Badge>
                  </div>
                  <Slider
                    value={[range]}
                    onValueChange={v => {
                      const newDataset = [...dataset];
                      newDataset[rowIndex] = {
                        ...newDataset[rowIndex],
                        [`monster_skill_${slotNum}_range`]: v[0],
                      };
                      setDataset(newDataset);
                    }}
                    min={0}
                    max={300}
                    step={10}
                    className='w-full'
                  />
                </div>

                {/* 넓이 */}
                <div className='space-y-1'>
                  <div className='flex justify-between text-xs'>
                    <Label>넓이</Label>
                    <Badge variant='secondary' className='h-5'>
                      {width}°
                    </Badge>
                  </div>
                  <Slider
                    value={[width]}
                    onValueChange={v => {
                      const newDataset = [...dataset];
                      newDataset[rowIndex] = {
                        ...newDataset[rowIndex],
                        [`monster_skill_${slotNum}_width`]: v[0],
                      };
                      setDataset(newDataset);
                    }}
                    min={0}
                    max={360}
                    step={10}
                    className='w-full'
                  />
                </div>

                {/* 데미지 */}
                <div className='space-y-1'>
                  <div className='flex justify-between text-xs'>
                    <Label>데미지</Label>
                    <Badge variant='secondary' className='h-5'>
                      {damage}x
                    </Badge>
                  </div>
                  <Slider
                    value={[damage]}
                    onValueChange={v => {
                      const newDataset = [...dataset];
                      newDataset[rowIndex] = {
                        ...newDataset[rowIndex],
                        [`monster_skill_${slotNum}_damage`]: v[0],
                      };
                      setDataset(newDataset);
                    }}
                    min={0.5}
                    max={5.0}
                    step={0.1}
                    className='w-full'
                  />
                </div>

                {/* 쿨타임 */}
                <div className='space-y-1'>
                  <div className='flex justify-between text-xs'>
                    <Label>쿨타임</Label>
                    <Badge variant='secondary' className='h-5'>
                      {cooldown}ms
                    </Badge>
                  </div>
                  <Slider
                    value={[cooldown]}
                    onValueChange={v => {
                      const newDataset = [...dataset];
                      newDataset[rowIndex] = {
                        ...newDataset[rowIndex],
                        [`monster_skill_${slotNum}_cooldown`]: v[0],
                      };
                      setDataset(newDataset);
                    }}
                    min={1000}
                    max={30000}
                    step={500}
                    className='w-full'
                  />
                </div>

                {/* SP 소모 */}
                <div className='space-y-1'>
                  <div className='flex justify-between text-xs'>
                    <Label>SP 소모</Label>
                    <Badge variant='secondary' className='h-5'>
                      {spCost}SP
                    </Badge>
                  </div>
                  <Slider
                    value={[spCost]}
                    onValueChange={v => {
                      const newDataset = [...dataset];
                      newDataset[rowIndex] = {
                        ...newDataset[rowIndex],
                        [`monster_skill_${slotNum}_sp_cost`]: v[0],
                      };
                      setDataset(newDataset);
                    }}
                    min={10}
                    max={100}
                    step={5}
                    className='w-full'
                  />
                </div>

                {/* 시전시간 */}
                <div className='space-y-1'>
                  <div className='flex justify-between text-xs'>
                    <Label>시전시간</Label>
                    <Badge variant='secondary' className='h-5'>
                      {castTime}ms
                    </Badge>
                  </div>
                  <Slider
                    value={[castTime]}
                    onValueChange={v => {
                      const newDataset = [...dataset];
                      newDataset[rowIndex] = {
                        ...newDataset[rowIndex],
                        [`monster_skill_${slotNum}_cast_time`]: v[0],
                      };
                      setDataset(newDataset);
                    }}
                    min={0}
                    max={3000}
                    step={100}
                    className='w-full'
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        );
      }
    }

    const numericValue = typeof value === 'number' ? value : Number(value);
    const hasNumericValue = Number.isFinite(numericValue);
    const displayValue = hasNumericValue
      ? field.includes('attack_speed')
        ? numericValue.toFixed(1)
        : numericValue
      : value || '-';

    return (
      <Popover
        open={isEditing}
        onOpenChange={open => {
          if (open) {
            setEditingCell({ row: rowIndex, field });
          } else {
            setEditingCell(null);
          }
        }}
      >
        <PopoverTrigger asChild>
          <div
            className='cursor-pointer hover:bg-red-100 rounded px-2 py-1 text-center truncate'
            onClick={e => {
              e.stopPropagation();
            }}
            title={`${displayValue}${displayValue !== '-' ? suffix : ''}`}
          >
            {displayValue}
            {displayValue !== '-' ? suffix : ''}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className='w-56 p-4 bg-red-50 border-red-400'
          align='start'
          side='bottom'
          onClick={e => e.stopPropagation()}
        >
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <Badge variant='secondary'>
                {displayValue}
                {suffix}
              </Badge>
              <Button
                size='sm'
                variant='ghost'
                className='h-5 w-5 p-0'
                onClick={e => {
                  e.stopPropagation();
                  setEditingCell(null);
                }}
              >
                <X className='h-3 w-3' />
              </Button>
            </div>
            <Slider
              value={[hasNumericValue ? numericValue : getFieldConfig(field).min]}
              onValueChange={v => handleCellUpdate(rowIndex, field, v[0])}
              min={getFieldConfig(field).min}
              max={getFieldConfig(field).max}
              step={getFieldConfig(field).step}
              className='w-full'
            />
            <div className='flex justify-between text-xs text-slate-600'>
              <span>{getFieldConfig(field).min}</span>
              <span>{getFieldConfig(field).max}</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const ResizeHandle = ({ column }: { column: string }) => (
    <div
      className='absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-red-400 active:bg-red-600'
      onMouseDown={e => handleResizeStart(column, e)}
      onClick={e => e.stopPropagation()}
    />
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader className={!isOpen ? 'pb-6' : ''}>
          <CollapsibleTrigger asChild>
            <div className='flex items-center justify-between cursor-pointer'>
              <CardTitle className='flex items-center gap-2'>
                {isOpen ? (
                  <ChevronDown className='w-5 h-5' />
                ) : (
                  <ChevronRight className='w-5 h-5' />
                )}
                몬스터 데이터셋
              </CardTitle>
              <div className='flex items-center gap-2'>
                <Badge variant='outline'>{dataset.length}개 행</Badge>
                {selectedRows.size > 0 && (
                  <Badge variant='default' className='bg-purple-600'>
                    {selectedRows.size}개 행 선택됨 (1:다 리스폰)
                  </Badge>
                )}
                {currentTick < dataset.length && selectedRows.size === 0 && (
                  <Badge variant='default' className='bg-red-600'>
                    행 {currentTick} 선택됨
                  </Badge>
                )}
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className='space-y-4'>
            {/* 스폰 설정 영역 */}
            <div className='border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-pink-50 space-y-4'>
              <div className='flex items-center justify-between'>
                <h3 className='font-semibold flex items-center gap-2'>
                  <Target className='w-4 h-4 text-purple-600' />
                  1:다 몬스터 스폰 설정
                </h3>
              </div>

              <div className='flex items-center gap-6 flex-wrap'>
                {/* 최대 몬스터 수 */}
                {onMaxMonsterCountChange && (
                  <div className='flex items-center gap-2'>
                    <Label className='flex items-center gap-2 text-sm whitespace-nowrap'>
                      <TrendingUp className='w-4 h-4 text-purple-600' />
                      최대 몬스터 수
                    </Label>
                    <Input
                      type='number'
                      value={maxMonsterCount}
                      onChange={e =>
                        onMaxMonsterCountChange(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      min={1}
                      max={50}
                      className='h-8 w-20'
                    />
                    <span className='text-sm text-muted-foreground'>마리</span>
                  </div>
                )}

                {/* 리스폰 딜레이 */}
                {onRespawnDelayChange && (
                  <div className='flex items-center gap-2'>
                    <Label className='flex items-center gap-2 text-sm whitespace-nowrap'>
                      <Clock className='w-4 h-4 text-purple-600' />
                      리스폰 딜레이
                    </Label>
                    <Input
                      type='number'
                      value={respawnDelay}
                      onChange={e =>
                        onRespawnDelayChange(Math.max(0, parseInt(e.target.value) || 0))
                      }
                      min={0}
                      max={10000}
                      step={100}
                      className='h-8 w-24'
                    />
                    <span className='text-sm text-muted-foreground'>ms</span>
                  </div>
                )}

                {/* 가중치 통계 */}
                <div className='flex items-center gap-4'>
                  <Label className='flex items-center gap-2 text-sm whitespace-nowrap'>
                    <Percent className='w-4 h-4 text-purple-600' />
                    가중치 통계
                  </Label>
                  <div className='flex items-center gap-3 text-sm'>
                    <div className='flex items-center gap-2'>
                      <span className='text-muted-foreground whitespace-nowrap'>선택된 행:</span>
                      <Badge variant='outline' className='bg-purple-100'>
                        {selectedRows.size}개
                      </Badge>
                    </div>
                    <div className='flex items-center gap-2'>
                      <span className='text-muted-foreground whitespace-nowrap'>총 가중치:</span>
                      <Badge variant='outline' className='bg-amber-100'>
                        {dataset
                          .filter((_, idx) => selectedRows.has(idx))
                          .reduce((sum, row) => sum + (row.monster_spawn_weight || 1), 0)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* 선택된 행별 스폰 확률 표시 */}
              {selectedRows.size > 0 && (
                <div className='border-t pt-3 space-y-2'>
                  <Label className='text-xs text-muted-foreground'>선택된 몬스터 스폰 확률</Label>
                  <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
                    {Array.from(selectedRows)
                      .sort((a, b) => a - b)
                      .map(idx => {
                        const row = dataset[idx];
                        const totalWeight = dataset
                          .filter((_, i) => selectedRows.has(i))
                          .reduce((sum, r) => sum + (r.monster_spawn_weight || 1), 0);
                        const probability =
                          totalWeight > 0
                            ? (((row.monster_spawn_weight || 1) / totalWeight) * 100).toFixed(1)
                            : 0;

                        return (
                          <div
                            key={idx}
                            className='flex items-center gap-2 text-xs bg-white rounded px-2 py-1 border'
                          >
                            <div
                              className='w-3 h-3 rounded border'
                              style={{ backgroundColor: row.monster_color || '#ff6b6b' }}
                            />
                            <span className='truncate flex-1'>
                              {row.monster_name || `몬스터 ${idx}`}
                            </span>
                            <Badge variant='secondary' className='text-xs'>
                              {probability}%
                            </Badge>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* 데이터셋 테이블 */}
            <div className='border rounded-lg overflow-hidden'>
              <div className='overflow-x-auto max-h-96'>
                <table className='w-full border-collapse'>
                  <thead>
                    {/* 첫 번째 행: 그룹 헤더 */}
                    <tr className='border-b bg-muted/50'>
                      <th
                        className='text-center border-r p-1 text-xs bg-purple-50'
                        rowSpan={2}
                        style={{ width: columnWidths.select }}
                      >
                        <div className='truncate'>선택</div>
                      </th>
                      <th
                        className='text-center border-r p-1 text-xs'
                        rowSpan={2}
                        style={{ width: columnWidths.index }}
                      >
                        <div className='truncate'>#</div>
                      </th>
                      <th className='text-center border-r p-1 text-xs bg-blue-50' colSpan={6}>
                        <div className='truncate'>설정 정보</div>
                      </th>
                      <th className='text-center border-r p-1 text-xs bg-orange-50' colSpan={1}>
                        <div className='truncate'>AI 설정</div>
                      </th>
                      <th className='text-center border-r p-1 text-xs bg-slate-50' colSpan={8}>
                        <div className='truncate'>종속 정보(레벨에 따른 변경)</div>
                      </th>
                      <th className='text-center border-r p-1 text-xs bg-purple-50' colSpan={5}>
                        <div className='truncate'>스킬 정보</div>
                      </th>
                      <th
                        className='text-center p-1 text-xs'
                        rowSpan={2}
                        style={{ width: columnWidths.delete }}
                      >
                        <div className='truncate'>삭제</div>
                      </th>
                    </tr>
                    {/* 두 번째 행: 개별 컬럼 */}
                    <tr className='border-b bg-muted/50'>
                      <th
                        className='relative text-center border-r p-2 bg-amber-50'
                        style={{ width: columnWidths.weight }}
                      >
                        <div className='truncate text-xs'>가중치</div>
                        <ResizeHandle column='weight' />
                      </th>
                      <th
                        className='relative text-center border-r p-2 bg-green-50'
                        style={{ width: columnWidths.monster_name }}
                      >
                        <div className='truncate text-xs'>이름</div>
                        <ResizeHandle column='monster_name' />
                      </th>
                      <th
                        className='relative text-center border-r p-2 bg-pink-50'
                        style={{ width: columnWidths.monster_color }}
                      >
                        <div className='truncate text-xs'>색상</div>
                        <ResizeHandle column='monster_color' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.monster_attack_type }}
                      >
                        <div className='truncate'>타입</div>
                        <ResizeHandle column='monster_attack_type' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.monster_level }}
                      >
                        <div className='truncate'>LV</div>
                        <ResizeHandle column='monster_level' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.monster_size }}
                      >
                        <div className='truncate'>크기</div>
                        <ResizeHandle column='monster_size' />
                      </th>
                      <th
                        className='relative text-center border-r p-2 bg-orange-50'
                        style={{ width: columnWidths.monster_ai_patterns }}
                      >
                        <div className='truncate text-xs'>AI 패턴</div>
                        <ResizeHandle column='monster_ai_patterns' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.monster_hp }}
                      >
                        <div className='truncate'>HP</div>
                        <ResizeHandle column='monster_hp' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.monster_sp }}
                      >
                        <div className='truncate'>SP</div>
                        <ResizeHandle column='monster_sp' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.monster_speed }}
                      >
                        <div className='truncate'>속도</div>
                        <ResizeHandle column='monster_speed' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.monster_attack }}
                      >
                        <div className='truncate'>공격력</div>
                        <ResizeHandle column='monster_attack' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.monster_defense }}
                      >
                        <div className='truncate'>방어력</div>
                        <ResizeHandle column='monster_defense' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.monster_attack_speed }}
                      >
                        <div className='truncate'>공속</div>
                        <ResizeHandle column='monster_attack_speed' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.monster_accuracy }}
                      >
                        <div className='truncate'>명중</div>
                        <ResizeHandle column='monster_accuracy' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.monster_critical_rate }}
                      >
                        <div className='truncate'>크리</div>
                        <ResizeHandle column='monster_critical_rate' />
                      </th>
                      <th
                        className='relative text-center border-r p-2 bg-purple-100'
                        style={{ width: columnWidths.monster_basic_attack }}
                      >
                        <div className='truncate text-xs'>기본 공격</div>
                        <ResizeHandle column='monster_basic_attack' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.monster_skill_1 }}
                      >
                        <div className='truncate text-xs'>스킬 1</div>
                        <ResizeHandle column='monster_skill_1' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.monster_skill_2 }}
                      >
                        <div className='truncate text-xs'>스킬 2</div>
                        <ResizeHandle column='monster_skill_2' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.monster_skill_3 }}
                      >
                        <div className='truncate text-xs'>스킬 3</div>
                        <ResizeHandle column='monster_skill_3' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.monster_skill_4 }}
                      >
                        <div className='truncate text-xs'>스킬 4</div>
                        <ResizeHandle column='monster_skill_4' />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataset.map((row, index) => (
                      <tr
                        key={index}
                        className={`border-b cursor-pointer transition-colors ${
                          selectedRows.has(index)
                            ? 'bg-purple-100 hover:bg-purple-150 border-purple-400 border-l-4'
                            : index === currentTick
                              ? 'bg-red-200 hover:bg-red-250 border-red-400 border-l-4'
                              : 'hover:bg-slate-50 border-l-4 border-transparent'
                        }`}
                        onClick={() => handleRowClick(index)}
                      >
                        <td
                          className='text-center border-r p-2'
                          style={{ width: columnWidths.select }}
                          onClick={e => e.stopPropagation()}
                        >
                          <input
                            type='checkbox'
                            checked={selectedRows.has(index)}
                            onChange={() => handleRowSelect(index)}
                            className='w-4 h-4 cursor-pointer'
                          />
                        </td>
                        <td
                          className='text-center border-r p-2'
                          style={{ width: columnWidths.index }}
                        >
                          <div className='truncate'>{index}</div>
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.weight }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(
                            index,
                            'monster_spawn_weight',
                            row.monster_spawn_weight || 1
                          )}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.monster_name }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderNameCell(index, row.monster_name || `몬스터 ${index}`)}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.monster_color }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderColorCell(index, row.monster_color || '#ff6b6b')}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.monster_attack_type }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(
                            index,
                            'monster_attack_type',
                            row.monster_attack_type
                          )}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.monster_level }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(index, 'monster_level', row.monster_level)}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.monster_size }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(index, 'monster_size', row.monster_size)}
                        </td>
                        <td
                          className='border-r p-1 text-center'
                          style={{ width: columnWidths.monster_ai_patterns }}
                          onClick={e => e.stopPropagation()}
                        >
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={e => {
                              e.stopPropagation();
                              handleEditAIPattern(index);
                            }}
                            className='h-7 px-2'
                          >
                            <Brain className='w-3 h-3 mr-1' />
                            <span className='text-xs'>설정</span>
                          </Button>
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.monster_hp }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(index, 'monster_hp', row.monster_hp)}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.monster_sp }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(index, 'monster_sp', row.monster_sp)}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.monster_speed }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(index, 'monster_speed', row.monster_speed)}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.monster_attack }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(index, 'monster_attack', row.monster_attack)}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.monster_defense }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(index, 'monster_defense', row.monster_defense)}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.monster_attack_speed }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(
                            index,
                            'monster_attack_speed',
                            row.monster_attack_speed
                          )}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.monster_accuracy }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(index, 'monster_accuracy', row.monster_accuracy, '%')}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.monster_critical_rate }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(
                            index,
                            'monster_critical_rate',
                            row.monster_critical_rate,
                            '%'
                          )}
                        </td>
                        <td
                          className='border-r p-1 bg-purple-50'
                          style={{ width: columnWidths.monster_basic_attack }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(
                            index,
                            'monster_basic_attack',
                            row.monster_basic_attack_id
                          )}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.monster_skill_1 }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(index, 'monster_skill_1', row.monster_skill_1_id)}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.monster_skill_2 }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(index, 'monster_skill_2', row.monster_skill_2_id)}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.monster_skill_3 }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(index, 'monster_skill_3', row.monster_skill_3_id)}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.monster_skill_4 }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(index, 'monster_skill_4', row.monster_skill_4_id)}
                        </td>
                        <td
                          className='text-center p-1'
                          style={{ width: columnWidths.delete }}
                          onClick={e => e.stopPropagation()}
                        >
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => handleDeleteRow(index)}
                            className='mx-auto'
                          >
                            <Trash2 className='w-3 h-3 text-destructive' />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action buttons at bottom */}
            <div className='flex gap-2 mt-4'>
              <Button
                onClick={handleApplyRow}
                disabled={currentTick >= dataset.length || !dataset[currentTick]?.monster_size}
                className='flex-1'
              >
                <Download className='w-4 h-4 mr-2' />
                선택한 행 불러오기 (행 {currentTick})
              </Button>
              <Button variant='outline' onClick={handleAddRow} className='flex-1'>
                <Plus className='w-4 h-4 mr-2' />
                현재 설정 추가
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>

      {/* AI 패턴 편집 다이얼로그 */}
      <Dialog
        open={editingAIPattern !== null}
        onOpenChange={open => !open && setEditingAIPattern(null)}
      >
        <DialogContent className='max-w-3xl max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>AI 패턴 설정</DialogTitle>
            <DialogDescription>
              {editingAIPattern && dataset[editingAIPattern.rowIndex] && (
                <>
                  몬스터:{' '}
                  {dataset[editingAIPattern.rowIndex].monster_name ||
                    `몬스터 ${editingAIPattern.rowIndex}`}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {editingAIPattern && editingAIPattern.config && (
            <MonsterAIPatternEditor
              config={editingAIPattern.config}
              onConfigChange={newConfig => {
                setEditingAIPattern({
                  ...editingAIPattern,
                  config: newConfig,
                });
              }}
              monsterTypeName={
                dataset[editingAIPattern.rowIndex]?.monster_name ||
                `몬스터 ${editingAIPattern.rowIndex}`
              }
              skillConfigs={skillConfigs}
              basicAttackId={
                dataset[editingAIPattern.rowIndex]?.monster_basic_attack_id || 'meleeBasic'
              }
            />
          )}
          <div className='flex justify-end gap-2 mt-4'>
            <Button variant='outline' onClick={() => setEditingAIPattern(null)}>
              취소
            </Button>
            <Button
              onClick={() => {
                if (editingAIPattern && editingAIPattern.config) {
                  handleSaveAIPattern(editingAIPattern.config);
                }
              }}
              disabled={!editingAIPattern || !editingAIPattern.config}
            >
              저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Collapsible>
  );
}
