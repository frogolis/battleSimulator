import { ChevronDown, ChevronRight, Download, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CharacterTypeInfo } from '../lib/characterTypes';
import { CharacterConfig, CharacterType } from '../lib/gameTypes';
import { updateDataRowWithLevel } from '../lib/levelBasedStats';
import { LevelConfig } from '../lib/levelSystem';
import { DataRow } from '../lib/mockData';
import { defaultSkills, Skill } from '../lib/skillSystem';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';

interface PlayerDatasetViewerProps {
  dataset: DataRow[];
  setDataset: (dataset: DataRow[]) => void;
  currentTick: number;
  setCurrentTick: (tick: number) => void;
  playerConfig: CharacterConfig;
  playerLevelConfig: LevelConfig;
  onApplyRow?: (row: DataRow) => void;
  characterTypes: CharacterTypeInfo[];
  skillConfigs?: Record<string, Skill>;
}

interface ColumnWidths {
  [key: string]: number;
}

type EditableCellValue = string | number | undefined;

const toOptionalNumber = (value: EditableCellValue): number | undefined =>
  typeof value === 'number' ? value : undefined;

const formatDisplayValue = (value: EditableCellValue, field: string): string | number => {
  if (typeof value === 'number') {
    return field.includes('attack_speed') ? value.toFixed(1) : value;
  }

  return value || '-';
};

export function PlayerDatasetViewer({
  dataset,
  setDataset,
  currentTick,
  setCurrentTick,
  playerConfig,
  playerLevelConfig,
  onApplyRow,
  characterTypes,
  skillConfigs = defaultSkills,
}: PlayerDatasetViewerProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({
    index: 60,
    player_attack_type: 100,
    player_level: 60,
    player_size: 80,
    player_hp: 70,
    player_sp: 70,
    player_speed: 80,
    player_attack: 90,
    player_defense: 90,
    player_attack_speed: 80,
    player_accuracy: 80,
    player_critical_rate: 80,
    player_basic_attack: 100,
    player_skill_1: 100,
    player_skill_2: 100,
    player_skill_3: 100,
    player_skill_4: 100,
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
      x: 300,
      y: 200,
      speed: 150,
      dir: 0,
      is_attack: 0,
      is_miss: 0,
      is_crit: 0,
      player_attack_type: firstType?.id || playerConfig.attackType,
      // 기본 공격
      player_basic_attack_id: firstType?.defaultBasicAttackId || 'meleeBasic',
      player_basic_attack_range: 75,
      player_basic_attack_width: 90,
      player_basic_attack_damage: 1.0,
      player_basic_attack_cooldown: 1000,
      player_basic_attack_sp_cost: 0,
      player_basic_attack_cast_time: 300,
      // 스킬 슬롯 1
      player_skill_1_id: defaultSkillIds[0] || 'powerSlash',
      player_skill_1_range: 100,
      player_skill_1_width: 120,
      player_skill_1_damage: 1.5,
      player_skill_1_cooldown: 3000,
      player_skill_1_sp_cost: 20,
      player_skill_1_cast_time: 500,
      // 스킬 슬롯 2
      player_skill_2_id: defaultSkillIds[1] || 'whirlwind',
      player_skill_2_range: 150,
      player_skill_2_width: 360,
      player_skill_2_damage: 0.8,
      player_skill_2_cooldown: 5000,
      player_skill_2_sp_cost: 30,
      player_skill_2_cast_time: 800,
      // 스킬 슬롯 3
      player_skill_3_id: defaultSkillIds[2] || '',
      player_skill_3_range: 0,
      player_skill_3_width: 0,
      player_skill_3_damage: 0,
      player_skill_3_cooldown: 10000,
      player_skill_3_sp_cost: 40,
      player_skill_3_cast_time: 1000,
      // 스킬 슬롯 4
      player_skill_4_id: defaultSkillIds[3] || '',
      player_skill_4_range: 0,
      player_skill_4_width: 0,
      player_skill_4_damage: 0,
      player_skill_4_cooldown: 15000,
      player_skill_4_sp_cost: 50,
      player_skill_4_cast_time: 500,
    };

    // 첫 번째 타입의 기본 레벨과 크기로 능력치 자동 계산
    const defaultLevel = firstType?.defaultLevel || 1;
    const defaultSize = firstType?.defaultSize || 20;
    const newRow = updateDataRowWithLevel(
      baseRow,
      true,
      playerLevelConfig,
      defaultLevel,
      defaultSize,
      firstType
    );

    const newDataset = [...dataset, newRow];
    setDataset(newDataset);
    setCurrentTick(newDataset.length - 1);

    toast.success(`✅ 플레이어 설정이 추가되었습니다! (행 ${newDataset.length - 1})`);
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
      toast.success(`✅ 행 ${currentTick}의 플레이어 설정을 불러왔습니다!`);
    }
  };

  const handleRowClick = (index: number) => {
    setCurrentTick(index);
  };

  const handleCellUpdate = (rowIndex: number, field: string, value: string | number) => {
    const newDataset: DataRow[] = [...dataset];
    const row = newDataset[rowIndex];

    // 레벨, 크기, 타입 변경 시 능력치 재계산
    if (field === 'player_level' || field === 'player_size' || field === 'player_attack_type') {
      const level = field === 'player_level' ? value : row.player_level;
      const size = field === 'player_size' ? value : row.player_size;
      const typeId = field === 'player_attack_type' ? value : row.player_attack_type;

      // 타입 정보 찾기
      const typeInfo = characterTypes.find(t => t.id === typeId);

      // 능력치 재계산
      const updatedRow = updateDataRowWithLevel(
        row,
        true,
        playerLevelConfig,
        toOptionalNumber(level),
        toOptionalNumber(size),
        typeInfo
      );

      // 타입 변경 시 기본 레벨, 크기, 기본 공격, 스킬도 변경
      if (field === 'player_attack_type' && typeInfo) {
        const defaultSkillIds = typeInfo.defaultSkillIds || [];
        // 현재 행의 레벨과 크기 유지 (사용자가 수정한 값 보존)
        const currentLevel = row.player_level || typeInfo.defaultLevel || 1;
        const currentSize = row.player_size || typeInfo.defaultSize || 20;
        // 현재 레벨과 크기로 능력치만 재계산
        const typeBasedRow = updateDataRowWithLevel(
          row,
          true,
          playerLevelConfig,
          toOptionalNumber(currentLevel),
          toOptionalNumber(currentSize),
          typeInfo
        );
        const rowWithDynamicField: Record<string, EditableCellValue> = {
          ...typeBasedRow,
          // 레벨과 크기는 유지 (이미 typeBasedRow에 포함되어 있음)
          player_level: currentLevel,
          player_size: currentSize,
          // 기본 공격 변경
          player_basic_attack_id: typeInfo.defaultBasicAttackId || 'meleeBasic',
          // 스킬 슬롯 변경
          player_skill_1_id: defaultSkillIds[0] || '',
          player_skill_2_id: defaultSkillIds[1] || '',
          player_skill_3_id: defaultSkillIds[2] || '',
          player_skill_4_id: defaultSkillIds[3] || '',
        };
        rowWithDynamicField[field] = value;
        newDataset[rowIndex] = rowWithDynamicField as unknown as DataRow;
        toast.info(
          `🎯 타입 "${typeInfo.name}"으로 변경! 레벨 ${typeInfo.defaultLevel}, 크기 ${typeInfo.defaultSize}로 초기화되었습니다.`
        );
      } else {
        const rowWithDynamicField: Record<string, EditableCellValue> = { ...updatedRow };
        rowWithDynamicField[field] = value;
        newDataset[rowIndex] = rowWithDynamicField as unknown as DataRow;
        toast.info(`🔄 레벨 기반으로 능력치가 재계산되었습니다!`);
      }
    } else {
      // attack_type 같은 다른 필드는 그대로 업데이트
      const rowWithDynamicField: Record<string, EditableCellValue> = { ...row };
      rowWithDynamicField[field] = value;
      newDataset[rowIndex] = rowWithDynamicField as unknown as DataRow;
    }

    setDataset(newDataset);
  };

  const getFieldConfig = (field: string) => {
    const configs: Record<string, { min: number; max: number; step: number }> = {
      player_level: { min: 1, max: 100, step: 1 },
      player_size: { min: 8, max: 32, step: 2 },
      player_skill_range: { min: 30, max: 200, step: 10 },
      player_skill_width: { min: 30, max: 360, step: 15 },
      player_skill_damage: { min: 0.5, max: 5.0, step: 0.1 },
      player_skill_cooldown: { min: 1000, max: 30000, step: 500 },
      player_skill_sp_cost: { min: 10, max: 100, step: 5 },
      player_skill_cast_time: { min: 0, max: 3000, step: 100 },
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

  const renderEditableCell = (
    rowIndex: number,
    field: string,
    value: EditableCellValue,
    suffix = '',
    isReadOnly = false
  ) => {
    const isEditing = editingCell?.row === rowIndex && editingCell?.field === field;

    // 읽기 전용 필드 (레벨에 의해 자동 계산됨)
    if (isReadOnly) {
      const displayValue = formatDisplayValue(value, field);
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

    if (field === 'player_attack_type') {
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
              className='cursor-pointer hover:bg-blue-100 rounded px-2 py-1 text-center truncate'
              onClick={e => {
                e.stopPropagation();
              }}
              title={typeInfo?.name || currentType}
            >
              <span className={typeInfo?.color}>{typeInfo?.name || currentType}</span>
            </div>
          </PopoverTrigger>
          <PopoverContent
            className='w-64 p-3 z-50'
            align='start'
            side='bottom'
            sideOffset={5}
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
                  const selectedType = characterTypes.find(t => t.id === newValue);
                  const newDataset = [...dataset];
                  newDataset[rowIndex] = {
                    ...newDataset[rowIndex],
                    player_attack_type: newValue as CharacterType,
                    // 타입 변경 시 해당 타입의 기본 공격 자동 설정
                    player_basic_attack_id: selectedType?.defaultBasicAttackId || 'meleeBasic',
                  };
                  setDataset(newDataset);
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

    // 기본 공격 스킬 선택 (player_basic_attack_id)
    if (field === 'player_basic_attack_id') {
      const row = dataset[rowIndex];
      const currentSkillId = (value as string) || 'meleeBasic';
      const currentSkill = skillConfigs[currentSkillId];

      // 기본 공격용 스킬만 필터링 (skillConfigs에서 category === 'basicAttack'인 것들)
      const basicAttackSkills = Object.values(skillConfigs).filter(
        skill => skill.category === 'basicAttack'
      );

      // 현재 기본 공격의 파라미터 값 가져오기
      const range = (row.player_basic_attack_range as number) || 100;
      const width = (row.player_basic_attack_width as number) || 120;
      const damage = (row.player_basic_attack_damage as number) || 1.0;
      const cooldown = (row.player_basic_attack_cooldown as number) || 1000;
      const spCost = (row.player_basic_attack_sp_cost as number) || 0;
      const castTime = (row.player_basic_attack_cast_time as number) || 300;

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
                    const skill = skillConfigs[newSkillId];
                    if (skill) {
                      const newDataset = [...dataset];
                      newDataset[rowIndex] = {
                        ...newDataset[rowIndex],
                        player_basic_attack_id: newSkillId,
                        player_basic_attack_range: skill.range,
                        player_basic_attack_width: skill.area,
                        player_basic_attack_damage: skill.damageMultiplier,
                        player_basic_attack_cooldown: skill.cooldown,
                        player_basic_attack_sp_cost: skill.spCost,
                        player_basic_attack_cast_time: skill.castTime,
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
                        player_basic_attack_range: v[0],
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
                        player_basic_attack_width: v[0],
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
                        player_basic_attack_damage: v[0] / 10,
                      };
                      setDataset(newDataset);
                      // 현재 틱이 변경된 행이면 즉시 반영
                      if (rowIndex === currentTick && onApplyRow) {
                        onApplyRow(newDataset[rowIndex]);
                      }
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
                        player_basic_attack_cooldown: v[0] * 100,
                      };
                      setDataset(newDataset);
                      // 현재 틱이 변경된 행이면 즉시 반영
                      if (rowIndex === currentTick && onApplyRow) {
                        onApplyRow(newDataset[rowIndex]);
                      }
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
                        player_basic_attack_sp_cost: v[0],
                      };
                      setDataset(newDataset);
                      // 현재 틱이 변경된 행이면 즉시 반영
                      if (rowIndex === currentTick && onApplyRow) {
                        onApplyRow(newDataset[rowIndex]);
                      }
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
                        player_basic_attack_cast_time: v[0] * 10,
                      };
                      setDataset(newDataset);
                      // 현재 틱이 변경된 행이면 즉시 반영
                      if (rowIndex === currentTick && onApplyRow) {
                        onApplyRow(newDataset[rowIndex]);
                      }
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

    // 스킬 슬롯별 스킬 선택 (player_skill_1_id, player_skill_2_id, etc)
    if (field.match(/player_skill_[1-4]_id$/)) {
      const slotNum = field.split('_')[2];
      const row = dataset[rowIndex];

      const currentSkillId = (value as string) || 'powerSlash';
      const currentSkill = skillConfigs[currentSkillId];

      // 일반 스킬만 필터링
      const normalSkills = Object.values(skillConfigs).filter(skill => skill.category === 'skill');

      // 현재 슬롯의 파라미터 값 가져오기
      const range = (row[`player_skill_${slotNum}_range` as keyof DataRow] as number) || 100;
      const width = (row[`player_skill_${slotNum}_width` as keyof DataRow] as number) || 120;
      const damage = (row[`player_skill_${slotNum}_damage` as keyof DataRow] as number) || 1.5;
      const cooldown = (row[`player_skill_${slotNum}_cooldown` as keyof DataRow] as number) || 3000;
      const spCost = (row[`player_skill_${slotNum}_sp_cost` as keyof DataRow] as number) || 20;
      const castTime = (row[`player_skill_${slotNum}_cast_time` as keyof DataRow] as number) || 500;

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
                <span className='text-sm font-medium'>스킬 슬롯 {slotNum}</span>
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
                  value={currentSkillId}
                  onValueChange={newSkillId => {
                    const skill = skillConfigs[newSkillId];
                    if (skill) {
                      const newDataset = [...dataset];
                      newDataset[rowIndex] = {
                        ...newDataset[rowIndex],
                        [`player_skill_${slotNum}_id`]: newSkillId,
                        [`player_skill_${slotNum}_range`]: skill.range,
                        [`player_skill_${slotNum}_width`]: skill.area,
                        [`player_skill_${slotNum}_damage`]: skill.damageMultiplier,
                        [`player_skill_${slotNum}_cooldown`]: skill.cooldown,
                        [`player_skill_${slotNum}_sp_cost`]: skill.spCost,
                        [`player_skill_${slotNum}_cast_time`]: skill.castTime,
                      };
                      setDataset(newDataset);
                      toast.success(`✨ 스킬 슬롯 ${slotNum}에 ${skill.name}을 설정했습니다!`);
                    }
                  }}
                >
                  <SelectTrigger className='h-8 w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className='max-h-64'>
                    {normalSkills.map(skill => (
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
                        [`player_skill_${slotNum}_range`]: v[0],
                      };
                      setDataset(newDataset);
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
                        [`player_skill_${slotNum}_width`]: v[0],
                      };
                      setDataset(newDataset);
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
                        [`player_skill_${slotNum}_damage`]: v[0],
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
                        [`player_skill_${slotNum}_cooldown`]: v[0],
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
                        [`player_skill_${slotNum}_sp_cost`]: v[0],
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
                        [`player_skill_${slotNum}_cast_time`]: v[0],
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
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    const displayValue = formatDisplayValue(value, field);

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
            className='cursor-pointer hover:bg-blue-100 rounded px-2 py-1 text-center truncate'
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
          className='w-56 p-4 bg-blue-50 border-blue-400 z-50'
          align='start'
          side='bottom'
          sideOffset={5}
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
              value={[typeof value === 'number' ? value : getFieldConfig(field).min]}
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
      className='absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 active:bg-blue-600'
      onMouseDown={e => handleResizeStart(column, e)}
      onClick={e => e.stopPropagation()}
    />
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className='overflow-visible'>
        <CardHeader className={!isOpen ? 'pb-6' : ''}>
          <CollapsibleTrigger asChild>
            <div className='flex items-center justify-between cursor-pointer'>
              <CardTitle className='flex items-center gap-2'>
                {isOpen ? (
                  <ChevronDown className='w-5 h-5' />
                ) : (
                  <ChevronRight className='w-5 h-5' />
                )}
                플레이어 데이터셋
              </CardTitle>
              <div className='flex items-center gap-2'>
                <Badge variant='outline'>{dataset.length}개 행</Badge>
                {currentTick < dataset.length && (
                  <Badge variant='default' className='bg-blue-600'>
                    행 {currentTick} 선택됨
                  </Badge>
                )}
              </div>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent>
            <div className='border rounded-lg overflow-visible'>
              <div className='overflow-x-auto max-h-96 overflow-y-auto'>
                <table className='w-full border-collapse'>
                  <thead>
                    {/* 첫 번째 행: 카테고리 */}
                    <tr className='border-b bg-muted/70'>
                      <th
                        className='text-center border-r p-1 text-xs'
                        rowSpan={2}
                        style={{ width: columnWidths.index }}
                      >
                        <div className='truncate'>#</div>
                      </th>
                      <th className='text-center border-r p-1 text-xs bg-blue-50' colSpan={3}>
                        <div className='truncate'>설정 정보</div>
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
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.player_attack_type }}
                      >
                        <div className='truncate'>타입</div>
                        <ResizeHandle column='player_attack_type' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.player_level }}
                      >
                        <div className='truncate'>LV</div>
                        <ResizeHandle column='player_level' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.player_size }}
                      >
                        <div className='truncate'>크기</div>
                        <ResizeHandle column='player_size' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.player_hp }}
                      >
                        <div className='truncate'>HP</div>
                        <ResizeHandle column='player_hp' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.player_sp }}
                      >
                        <div className='truncate'>SP</div>
                        <ResizeHandle column='player_sp' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.player_speed }}
                      >
                        <div className='truncate'>속도</div>
                        <ResizeHandle column='player_speed' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.player_attack }}
                      >
                        <div className='truncate'>공격력</div>
                        <ResizeHandle column='player_attack' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.player_defense }}
                      >
                        <div className='truncate'>방어력</div>
                        <ResizeHandle column='player_defense' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.player_attack_speed }}
                      >
                        <div className='truncate'>공속</div>
                        <ResizeHandle column='player_attack_speed' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.player_accuracy }}
                      >
                        <div className='truncate'>명중</div>
                        <ResizeHandle column='player_accuracy' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.player_critical_rate }}
                      >
                        <div className='truncate'>크리</div>
                        <ResizeHandle column='player_critical_rate' />
                      </th>
                      <th
                        className='relative text-center border-r p-2 bg-purple-100'
                        style={{ width: columnWidths.player_basic_attack }}
                      >
                        <div className='truncate'>기본 공격</div>
                        <ResizeHandle column='player_basic_attack' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.player_skill_1 }}
                      >
                        <div className='truncate'>스킬 1</div>
                        <ResizeHandle column='player_skill_1' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.player_skill_2 }}
                      >
                        <div className='truncate'>스킬 2</div>
                        <ResizeHandle column='player_skill_2' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.player_skill_3 }}
                      >
                        <div className='truncate'>스킬 3</div>
                        <ResizeHandle column='player_skill_3' />
                      </th>
                      <th
                        className='relative text-center border-r p-2'
                        style={{ width: columnWidths.player_skill_4 }}
                      >
                        <div className='truncate'>스킬 4</div>
                        <ResizeHandle column='player_skill_4' />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataset.map((row, index) => (
                      <tr
                        key={index}
                        className={`border-b cursor-pointer transition-colors ${
                          index === currentTick
                            ? 'bg-blue-200 hover:bg-blue-250 border-blue-400 border-l-4'
                            : 'hover:bg-slate-50 border-l-4 border-transparent'
                        }`}
                        onClick={() => handleRowClick(index)}
                      >
                        <td
                          className='text-center border-r p-2'
                          style={{ width: columnWidths.index }}
                        >
                          <div className='truncate'>{index}</div>
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.player_attack_type }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(index, 'player_attack_type', row.player_attack_type)}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.player_level }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(index, 'player_level', row.player_level)}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.player_size }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(index, 'player_size', row.player_size)}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.player_hp }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(index, 'player_hp', row.player_hp)}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.player_sp }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(index, 'player_sp', row.player_sp)}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.player_speed }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(index, 'player_speed', row.player_speed)}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.player_attack }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(index, 'player_attack', row.player_attack)}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.player_defense }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(index, 'player_defense', row.player_defense)}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.player_attack_speed }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(
                            index,
                            'player_attack_speed',
                            row.player_attack_speed
                          )}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.player_accuracy }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(index, 'player_accuracy', row.player_accuracy, '%')}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.player_critical_rate }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(
                            index,
                            'player_critical_rate',
                            row.player_critical_rate,
                            '%'
                          )}
                        </td>
                        <td
                          className='border-r p-1 bg-purple-50'
                          style={{ width: columnWidths.player_basic_attack }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(
                            index,
                            'player_basic_attack_id',
                            row.player_basic_attack_id || 'meleeBasic'
                          )}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.player_skill_1 }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(
                            index,
                            'player_skill_1_id',
                            row.player_skill_1_id || 'powerSlash'
                          )}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.player_skill_2 }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(
                            index,
                            'player_skill_2_id',
                            row.player_skill_2_id || 'whirlwind'
                          )}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.player_skill_3 }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(
                            index,
                            'player_skill_3_id',
                            row.player_skill_3_id || 'heal'
                          )}
                        </td>
                        <td
                          className='border-r p-1'
                          style={{ width: columnWidths.player_skill_4 }}
                          onClick={e => e.stopPropagation()}
                        >
                          {renderEditableCell(
                            index,
                            'player_skill_4_id',
                            row.player_skill_4_id || 'powerBuff'
                          )}
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
                disabled={currentTick >= dataset.length || !dataset[currentTick]?.player_size}
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
    </Collapsible>
  );
}
