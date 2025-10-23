import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Plus, Trash2, Users, Calculator, Zap } from 'lucide-react';
import { CharacterTypeInfo } from '../lib/characterTypes';
import { toast } from 'sonner';
import { defaultSkills } from '../lib/skillSystem';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface CharacterTypeManagerProps {
  characterTypes: CharacterTypeInfo[];
  onCharacterTypesChange: (types: CharacterTypeInfo[]) => void;
}

const AVAILABLE_COLORS = [
  { id: 'text-red-600', name: '빨강' },
  { id: 'text-blue-600', name: '파랑' },
  { id: 'text-green-600', name: '초록' },
  { id: 'text-yellow-600', name: '노랑' },
  { id: 'text-purple-600', name: '보라' },
  { id: 'text-pink-600', name: '분홍' },
  { id: 'text-orange-600', name: '주황' },
  { id: 'text-teal-600', name: '청록' },
  { id: 'text-indigo-600', name: '남색' },
  { id: 'text-gray-600', name: '회색' },
  { id: 'text-slate-600', name: '슬레이트' },
  { id: 'text-rose-600', name: '장미' },
];

export function CharacterTypeManager({
  characterTypes,
  onCharacterTypesChange,
}: CharacterTypeManagerProps) {
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(
    characterTypes[0]?.id || null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newType, setNewType] = useState<Partial<CharacterTypeInfo>>({
    id: '',
    name: '',
    description: '',
    color: 'text-gray-600',
  });

  const selectedType = characterTypes.find(t => t.id === selectedTypeId);

  // 포뮬러 미리보기 함수
  const evaluateFormulaPreview = (formula: string | undefined, level: number): string => {
    if (!formula || formula.trim() === '') {
      return '-';
    }

    try {
      let expression = formula
        .replace(/level/gi, String(level))
        .replace(/size/gi, String(20))
        .replace(/LEVEL/g, String(level))
        .replace(/SIZE/g, String(20));

      expression = expression
        .replace(/MAX\((.*?),(.*?)\)/gi, (_, a, b) => `Math.max(${a},${b})`)
        .replace(/MIN\((.*?),(.*?)\)/gi, (_, a, b) => `Math.min(${a},${b})`)
        .replace(/ROUND\((.*?)\)/gi, (_, a) => `Math.round(${a})`)
        .replace(/FLOOR\((.*?)\)/gi, (_, a) => `Math.floor(${a})`)
        .replace(/CEIL\((.*?)\)/gi, (_, a) => `Math.ceil(${a})`)
        .replace(/SQRT\((.*?)\)/gi, (_, a) => `Math.sqrt(${a})`)
        .replace(/\^/g, '**');

      const result = Function(`"use strict"; return (${expression})`)();
      return typeof result === 'number' && !isNaN(result) ? String(Math.round(result * 10) / 10) : '오류';
    } catch (error) {
      return '오류';
    }
  };

  const handleAddType = () => {
    if (!newType.id || !newType.name) {
      toast.error('ID와 이름을 입력해주세요.');
      return;
    }

    // ID 중복 체크
    if (characterTypes.some(t => t.id === newType.id)) {
      toast.error('이미 존재하는 ID입니다.');
      return;
    }

    // ID 유효성 체크 (영문, 숫자, 언더스코어만 허용)
    if (!/^[a-z0-9_]+$/.test(newType.id)) {
      toast.error('ID는 영문 소문자, 숫자, 언더스코어(_)만 사용 가능합니다.');
      return;
    }

    const newCharacterType: CharacterTypeInfo = {
      id: newType.id!,
      name: newType.name!,
      description: newType.description || '',
      color: newType.color || 'text-gray-600',
      defaultLevel: 1,
      defaultSize: 20,
      defaultSkillIds: [],
      statFormulas: {
        hpFormula: '100 + (level - 1) * 20',
        spFormula: '50 + (level - 1) * 10',
        attackFormula: '10 + (level - 1) * 3',
        defenseFormula: '5 + (level - 1) * 2',
        moveSpeedFormula: '100',
        attackSpeedFormula: '1.0',
      },
    };

    onCharacterTypesChange([...characterTypes, newCharacterType]);

    setNewType({
      id: '',
      name: '',
      description: '',
      color: 'text-gray-600',
    });
    setIsDialogOpen(false);
    setSelectedTypeId(newCharacterType.id);
    toast.success('새 캐릭터 타입이 추가되었습니다.');
  };

  const handleDeleteType = (id: string) => {
    // 기본 타입(warrior, archer, mage)은 삭제 불가
    if (id === 'warrior' || id === 'archer' || id === 'mage') {
      toast.error('기본 타입은 삭제할 수 없습니다.');
      return;
    }

    onCharacterTypesChange(characterTypes.filter(t => t.id !== id));
    
    // 선택된 타입이 삭제되면 첫 번째 타입 선택
    if (selectedTypeId === id) {
      const remainingTypes = characterTypes.filter(t => t.id !== id);
      setSelectedTypeId(remainingTypes[0]?.id || null);
    }
    
    toast.success('캐릭터 타입이 삭제되었습니다.');
  };

  const handleUpdateType = (updates: Partial<CharacterTypeInfo>) => {
    if (!selectedTypeId) return;

    onCharacterTypesChange(
      characterTypes.map(t =>
        t.id === selectedTypeId ? { ...t, ...updates } : t
      )
    );
  };

  const handleFormulaChange = (formulaKey: string, value: string) => {
    if (!selectedType) return;

    handleUpdateType({
      statFormulas: {
        ...selectedType.statFormulas,
        [formulaKey]: value,
      },
    });
  };

  const handleSkillToggle = (skillId: string) => {
    if (!selectedType) return;

    const currentSkills = selectedType.defaultSkillIds || [];
    const newSkills = currentSkills.includes(skillId)
      ? currentSkills.filter(id => id !== skillId)
      : [...currentSkills, skillId];

    handleUpdateType({ defaultSkillIds: newSkills });
  };

  const availableSkills = Object.entries(defaultSkills).map(([id, skill]) => ({
    id,
    name: skill.name,
    description: skill.description || '',
  }));

  return (
    <div className="space-y-6">
      {/* 타입 목록 카드 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                캐릭터 타입 관리
              </CardTitle>
              <CardDescription>
                각 캐릭터 타입별로 능력치 계산식과 스킬 세트를 관리합니다
              </CardDescription>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              새 타입 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {characterTypes.map((type) => (
              <div
                key={type.id}
                className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedTypeId === type.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedTypeId(type.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className={type.color}>
                    {type.name}
                  </Badge>
                  {type.id !== 'warrior' && type.id !== 'archer' && type.id !== 'mage' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteType(type.id);
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  )}
                </div>
                <code className="text-xs text-gray-500">{type.id}</code>
                {type.description && (
                  <p className="text-xs text-gray-600 mt-1">{type.description}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 타입 상세 설정 */}
      {selectedType && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={`${selectedType.color} text-lg px-3 py-1`}>
                {selectedType.name}
              </Badge>
              <div>
                <CardTitle className="text-lg">{selectedType.description}</CardTitle>
                <CardDescription>
                  <code className="text-xs">{selectedType.id}</code>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  능력치 & 스킬 초기값
                </TabsTrigger>
                <TabsTrigger value="formulas" className="flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  능력치 포뮬러 (고급)
                </TabsTrigger>
                <TabsTrigger value="skills" className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  스킬 세트 선택
                </TabsTrigger>
              </TabsList>

              {/* 능력치 포뮬러 탭 (고급) */}
              <TabsContent value="formulas" className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    💡 <strong>고급 사용자 전용</strong> - 능력치 계산 포뮬러를 직접 수정합니다.
                    <br />
                    • <strong>사용 가능한 변수:</strong> level (캐릭터 레벨), size (크기)
                    <br />
                    • <strong>사용 가능한 함수:</strong> MAX, MIN, ROUND, FLOOR, CEIL, SQRT
                    <br />
                    예: <code>100 + level * 10</code> → 레벨 1: 110, 레벨 5: 150
                    <br />
                    예: <code>MAX(50, level * 2)</code> → 최소 50 보장
                    <br />
                    <strong>⚠️ "레벨링 시스템 설정" 메뉴에서 더 직관적으로 수정 가능합니다.</strong>
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="hpFormula">HP 포뮬러</Label>
                      {selectedType.statFormulas?.hpFormula && (
                        <span className="text-xs text-muted-foreground">
                          레벨 1: {evaluateFormulaPreview(selectedType.statFormulas.hpFormula, 1)} | 
                          레벨 10: {evaluateFormulaPreview(selectedType.statFormulas.hpFormula, 10)}
                        </span>
                      )}
                    </div>
                    <Input
                      id="hpFormula"
                      value={selectedType.statFormulas?.hpFormula || ''}
                      onChange={(e) => handleFormulaChange('hpFormula', e.target.value)}
                      placeholder="예: 100 + level * 20"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="spFormula">SP 포뮬러</Label>
                      {selectedType.statFormulas?.spFormula && (
                        <span className="text-xs text-muted-foreground">
                          레벨 1: {evaluateFormulaPreview(selectedType.statFormulas.spFormula, 1)} | 
                          레벨 10: {evaluateFormulaPreview(selectedType.statFormulas.spFormula, 10)}
                        </span>
                      )}
                    </div>
                    <Input
                      id="spFormula"
                      value={selectedType.statFormulas?.spFormula || ''}
                      onChange={(e) => handleFormulaChange('spFormula', e.target.value)}
                      placeholder="예: 50 + level * 10"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="attackFormula">공격력 포뮬러</Label>
                      {selectedType.statFormulas?.attackFormula && (
                        <span className="text-xs text-muted-foreground">
                          레벨 1: {evaluateFormulaPreview(selectedType.statFormulas.attackFormula, 1)} | 
                          레벨 10: {evaluateFormulaPreview(selectedType.statFormulas.attackFormula, 10)}
                        </span>
                      )}
                    </div>
                    <Input
                      id="attackFormula"
                      value={selectedType.statFormulas?.attackFormula || ''}
                      onChange={(e) => handleFormulaChange('attackFormula', e.target.value)}
                      placeholder="예: 10 + level * 3"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="defenseFormula">방어력 포뮬러</Label>
                      {selectedType.statFormulas?.defenseFormula && (
                        <span className="text-xs text-muted-foreground">
                          레벨 1: {evaluateFormulaPreview(selectedType.statFormulas.defenseFormula, 1)} | 
                          레벨 10: {evaluateFormulaPreview(selectedType.statFormulas.defenseFormula, 10)}
                        </span>
                      )}
                    </div>
                    <Input
                      id="defenseFormula"
                      value={selectedType.statFormulas?.defenseFormula || ''}
                      onChange={(e) => handleFormulaChange('defenseFormula', e.target.value)}
                      placeholder="예: 5 + level * 2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="moveSpeedFormula">이동속도 포뮬러</Label>
                      {selectedType.statFormulas?.moveSpeedFormula && (
                        <span className="text-xs text-muted-foreground">
                          레벨 1: {evaluateFormulaPreview(selectedType.statFormulas.moveSpeedFormula, 1)} | 
                          레벨 10: {evaluateFormulaPreview(selectedType.statFormulas.moveSpeedFormula, 10)}
                        </span>
                      )}
                    </div>
                    <Input
                      id="moveSpeedFormula"
                      value={selectedType.statFormulas?.moveSpeedFormula || ''}
                      onChange={(e) => handleFormulaChange('moveSpeedFormula', e.target.value)}
                      placeholder="예: 80 (고정값) 또는 80 + level"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="attackSpeedFormula">공격속도 포뮬러</Label>
                      {selectedType.statFormulas?.attackSpeedFormula && (
                        <span className="text-xs text-muted-foreground">
                          레벨 1: {evaluateFormulaPreview(selectedType.statFormulas.attackSpeedFormula, 1)} | 
                          레벨 10: {evaluateFormulaPreview(selectedType.statFormulas.attackSpeedFormula, 10)}
                        </span>
                      )}
                    </div>
                    <Input
                      id="attackSpeedFormula"
                      value={selectedType.statFormulas?.attackSpeedFormula || ''}
                      onChange={(e) => handleFormulaChange('attackSpeedFormula', e.target.value)}
                      placeholder="예: 1.0 (고정값) 또는 1.0 + level * 0.05"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="accuracyFormula">명중률 포뮬러 (%)</Label>
                      {selectedType.statFormulas?.accuracyFormula && (
                        <span className="text-xs text-muted-foreground">
                          레벨 1: {evaluateFormulaPreview(selectedType.statFormulas.accuracyFormula, 1)} | 
                          레벨 10: {evaluateFormulaPreview(selectedType.statFormulas.accuracyFormula, 10)}
                        </span>
                      )}
                    </div>
                    <Input
                      id="accuracyFormula"
                      value={selectedType.statFormulas?.accuracyFormula || ''}
                      onChange={(e) => handleFormulaChange('accuracyFormula', e.target.value)}
                      placeholder="예: 85 (고정값) 또는 80 + level * 0.5"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="criticalRateFormula">크리티컬 확률 포뮬러 (%)</Label>
                      {selectedType.statFormulas?.criticalRateFormula && (
                        <span className="text-xs text-muted-foreground">
                          레벨 1: {evaluateFormulaPreview(selectedType.statFormulas.criticalRateFormula, 1)} | 
                          레벨 10: {evaluateFormulaPreview(selectedType.statFormulas.criticalRateFormula, 10)}
                        </span>
                      )}
                    </div>
                    <Input
                      id="criticalRateFormula"
                      value={selectedType.statFormulas?.criticalRateFormula || ''}
                      onChange={(e) => handleFormulaChange('criticalRateFormula', e.target.value)}
                      placeholder="예: 15 (고정값) 또는 10 + level * 0.5"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* 스킬 세트 선택 탭 */}
              <TabsContent value="skills" className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-orange-800">
                    💡 이 캐릭터 타입이 기본적으로 보유할 <strong>기본 공격</strong>과 <strong>스킬 세트</strong>를 설정합니다.
                    <br />
                    • 기본 공격: 플레이어는 마우스 클릭, 몬스터는 AI로 사용합니다.
                    <br />
                    • 스킬 세트: 최대 4개까지 설정 가능하며, 순서대로 슬롯 1~4에 배치됩니다.
                  </p>
                </div>

                {/* 기본 공격 슬롯 */}
                <div className="space-y-2">
                  <Label>기본 공격 (마우스 클릭)</Label>
                  <Select
                    value={selectedType.defaultBasicAttackId || 'meleeBasic'}
                    onValueChange={(value) => handleUpdateType({ defaultBasicAttackId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {availableSkills
                        .filter(skill => {
                          const skillData = defaultSkills[skill.id];
                          return skillData?.category === 'basicAttack';
                        })
                        .map(skill => (
                          <SelectItem key={skill.id} value={skill.id}>
                            {skill.name} - {skill.description}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* 선택된 스킬 목록 */}
                {selectedType.defaultSkillIds && selectedType.defaultSkillIds.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-green-800 mb-2">
                      ✅ 선택된 스킬 ({selectedType.defaultSkillIds.length}개)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedType.defaultSkillIds.map((skillId, index) => {
                        const skill = availableSkills.find(s => s.id === skillId);
                        return (
                          <Badge key={skillId} variant="outline" className="bg-white">
                            슬롯 {index + 1}: {skill?.name || skillId}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>스킬 세트 (슬롯 1~4)</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    스킬을 클릭하여 선택/해제하세요. 선택한 순서대로 슬롯 1~4에 배치됩니다.
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto p-2 border rounded-md">
                    {availableSkills
                      .filter(skill => {
                        const skillData = defaultSkills[skill.id];
                        return skillData?.category === 'skill';
                      })
                      .map(skill => (
                        <div
                          key={skill.id}
                          className={`p-3 border rounded cursor-pointer transition-colors ${
                            selectedType.defaultSkillIds?.includes(skill.id)
                              ? 'bg-blue-50 border-blue-500 shadow-sm'
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleSkillToggle(skill.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-sm">{skill.name}</div>
                            {selectedType.defaultSkillIds?.includes(skill.id) && (
                              <Badge variant="default" className="text-xs h-5">
                                {selectedType.defaultSkillIds.indexOf(skill.id) + 1}
                              </Badge>
                            )}
                          </div>
                          {skill.description && (
                            <div className="text-xs text-gray-500 mt-1">{skill.description}</div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </TabsContent>

              {/* 기본 설정 탭 - 능력치 & 스킬 초기값 */}
              <TabsContent value="basic" className="space-y-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-purple-800">
                    💡 이 탭에서는 캐릭터 타입의 <strong>초기값</strong>을 설정합니다.
                    <br />
                    • 능력치 초기값을 설정하면 자동으로 기본 성장 포뮬러가 생성됩니다.
                    <br />
                    • 스킬 세트는 "스킬 세트 선택" 탭에서 설정할 수 있습니다.
                    <br />
                    • 능력치 포뮬러는 "능력치 포뮬러 (고급)" 탭이나 "레벨링 시스템 설정" 메뉴에서 조정할 수 있습니다.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultLevel">기본 레벨</Label>
                    <Input
                      id="defaultLevel"
                      type="number"
                      value={selectedType.defaultLevel || 1}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 1) {
                          handleUpdateType({ defaultLevel: value });
                        }
                      }}
                      min={1}
                      max={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultSize">기본 크기 (px)</Label>
                    <Input
                      id="defaultSize"
                      type="number"
                      value={selectedType.defaultSize || 20}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value >= 8 && value <= 64) {
                          handleUpdateType({ defaultSize: value });
                        }
                      }}
                      min={8}
                      max={64}
                    />
                  </div>
                </div>

                <Separator />

                {/* 능력치 초기값 설정 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-800 mb-3">
                    ⚔️ 능력치 초기값 (레벨 {selectedType.defaultLevel || 1} 기준)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="stat-hp" className="text-xs">HP</Label>
                      <Input
                        id="stat-hp"
                        type="number"
                        value={evaluateFormulaPreview(selectedType.statFormulas?.hpFormula, selectedType.defaultLevel || 1)}
                        onChange={(e) => {
                          const baseValue = parseInt(e.target.value);
                          if (!isNaN(baseValue)) {
                            const growthRate = 20;
                            handleFormulaChange('hpFormula', `${baseValue} + (level - 1) * ${growthRate}`);
                          }
                        }}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="stat-sp" className="text-xs">SP</Label>
                      <Input
                        id="stat-sp"
                        type="number"
                        value={evaluateFormulaPreview(selectedType.statFormulas?.spFormula, selectedType.defaultLevel || 1)}
                        onChange={(e) => {
                          const baseValue = parseInt(e.target.value);
                          if (!isNaN(baseValue)) {
                            const growthRate = 10;
                            handleFormulaChange('spFormula', `${baseValue} + (level - 1) * ${growthRate}`);
                          }
                        }}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="stat-attack" className="text-xs">공격력</Label>
                      <Input
                        id="stat-attack"
                        type="number"
                        value={evaluateFormulaPreview(selectedType.statFormulas?.attackFormula, selectedType.defaultLevel || 1)}
                        onChange={(e) => {
                          const baseValue = parseInt(e.target.value);
                          if (!isNaN(baseValue)) {
                            const growthRate = 3;
                            handleFormulaChange('attackFormula', `${baseValue} + (level - 1) * ${growthRate}`);
                          }
                        }}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="stat-defense" className="text-xs">방어력</Label>
                      <Input
                        id="stat-defense"
                        type="number"
                        value={evaluateFormulaPreview(selectedType.statFormulas?.defenseFormula, selectedType.defaultLevel || 1)}
                        onChange={(e) => {
                          const baseValue = parseInt(e.target.value);
                          if (!isNaN(baseValue)) {
                            const growthRate = 2;
                            handleFormulaChange('defenseFormula', `${baseValue} + (level - 1) * ${growthRate}`);
                          }
                        }}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="stat-speed" className="text-xs">이동속도</Label>
                      <Input
                        id="stat-speed"
                        type="number"
                        value={evaluateFormulaPreview(selectedType.statFormulas?.moveSpeedFormula, selectedType.defaultLevel || 1)}
                        onChange={(e) => {
                          const baseValue = parseInt(e.target.value);
                          if (!isNaN(baseValue)) {
                            handleFormulaChange('moveSpeedFormula', `${baseValue}`);
                          }
                        }}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="stat-attackspeed" className="text-xs">공격속도</Label>
                      <Input
                        id="stat-attackspeed"
                        type="number"
                        step="0.1"
                        value={evaluateFormulaPreview(selectedType.statFormulas?.attackSpeedFormula, selectedType.defaultLevel || 1)}
                        onChange={(e) => {
                          const baseValue = parseFloat(e.target.value);
                          if (!isNaN(baseValue)) {
                            handleFormulaChange('attackSpeedFormula', `${baseValue}`);
                          }
                        }}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="stat-accuracy" className="text-xs">명중률 (%)</Label>
                      <Input
                        id="stat-accuracy"
                        type="number"
                        value={evaluateFormulaPreview(selectedType.statFormulas?.accuracyFormula, selectedType.defaultLevel || 1)}
                        onChange={(e) => {
                          const baseValue = parseFloat(e.target.value);
                          if (!isNaN(baseValue)) {
                            handleFormulaChange('accuracyFormula', `${baseValue}`);
                          }
                        }}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="stat-critical" className="text-xs">크리티컬 (%)</Label>
                      <Input
                        id="stat-critical"
                        type="number"
                        value={evaluateFormulaPreview(selectedType.statFormulas?.criticalRateFormula, selectedType.defaultLevel || 1)}
                        onChange={(e) => {
                          const baseValue = parseFloat(e.target.value);
                          if (!isNaN(baseValue)) {
                            handleFormulaChange('criticalRateFormula', `${baseValue}`);
                          }
                        }}
                        className="h-8"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    💡 초기값을 입력하면 자동으로 성장 포뮬러가 생성됩니다.
                  </p>
                </div>

                <Separator />

                {/* 스킬 세트 요약 */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-green-800 mb-3">
                    ✨ 스킬 세트 초기값
                  </p>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-green-700">기본 공격</Label>
                      <p className="text-sm text-slate-700">
                        {selectedType.defaultBasicAttackId 
                          ? availableSkills.find(s => s.id === selectedType.defaultBasicAttackId)?.name || selectedType.defaultBasicAttackId
                          : '설정 안 됨'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-green-700">스킬 ({selectedType.defaultSkillIds?.length || 0}개)</Label>
                      {selectedType.defaultSkillIds && selectedType.defaultSkillIds.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedType.defaultSkillIds.map((skillId, index) => {
                            const skill = availableSkills.find(s => s.id === skillId);
                            return (
                              <Badge key={skillId} variant="outline" className="text-xs bg-white">
                                {index + 1}. {skill?.name || skillId}
                              </Badge>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 italic">설정된 스킬 없음</p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-green-700 mt-2">
                    💡 스킬 세트는 "스킬 세트 선택" 탭에서 변경할 수 있습니다.
                  </p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="typeDescription">타입 설명</Label>
                  <Input
                    id="typeDescription"
                    value={selectedType.description || ''}
                    onChange={(e) => handleUpdateType({ description: e.target.value })}
                    placeholder="이 타입에 대한 설명을 입력하세요"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="typeColor">타입 색상</Label>
                  <Select
                    value={selectedType.color}
                    onValueChange={(value) => handleUpdateType({ color: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_COLORS.map((color) => (
                        <SelectItem key={color.id} value={color.id}>
                          <span className={color.id}>{color.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* 새 타입 추가 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 캐릭터 타입 추가</DialogTitle>
            <DialogDescription>
              새로운 캐릭터 타입의 정보를 입력해주세요
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="type-id">ID (영문 소문자, 숫자, _만 가능)</Label>
              <Input
                id="type-id"
                placeholder="예: tank, healer, assassin"
                value={newType.id}
                onChange={(e) =>
                  setNewType({ ...newType, id: e.target.value.toLowerCase() })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-name">이름</Label>
              <Input
                id="type-name"
                placeholder="예: 탱커"
                value={newType.name}
                onChange={(e) => setNewType({ ...newType, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-description">설명 (선택)</Label>
              <Input
                id="type-description"
                placeholder="예: 높은 방어력과 체력"
                value={newType.description}
                onChange={(e) =>
                  setNewType({ ...newType, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-color">색상</Label>
              <Select
                value={newType.color}
                onValueChange={(value) => setNewType({ ...newType, color: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_COLORS.map((color) => (
                    <SelectItem key={color.id} value={color.id}>
                      <span className={color.id}>{color.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAddType}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
