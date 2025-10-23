import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Skull, Plus, Trash2, AlertCircle } from 'lucide-react';
import { CharacterTypeInfo } from '../lib/characterTypes';
import { toast } from 'sonner';
import { AIPatternConfig, defaultAIPatternConfig } from '../lib/monsterAI';
import { MonsterAIPatternEditor } from './MonsterAIPatternEditor';
import { defaultSkills } from '../lib/skillSystem';

/**
 * 몬스터 타입 통계 (프리셋 기반)
 * - 레벨, 크기, AI 패턴, 스킬 세트를 포함하는 프리셋
 */
export interface MonsterTypeStats {
  characterType: string;      // 캐릭터 타입 ID
  baseLevel: number;           // 기본 레벨
  size: number;                // 크기
  aiPattern: string;           // AI 패턴 이름 (aggressive, defensive 등)
  skills: string[];            // 스킬 ID 목록
  aiPatternConfig?: AIPatternConfig; // AI 패턴 설정
}

interface MonsterTypeDefinitionProps {
  monsterTypeStats: Record<string, MonsterTypeStats>;
  onMonsterTypeStatsChange: (stats: Record<string, MonsterTypeStats>) => void;
  characterTypes: CharacterTypeInfo[];
}

export function MonsterTypeDefinition({
  monsterTypeStats,
  onMonsterTypeStatsChange,
  characterTypes,
}: MonsterTypeDefinitionProps) {
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(
    Object.keys(monsterTypeStats)[0] || null
  );

  const addMonsterType = () => {
    // 아직 정의되지 않은 타입 찾기
    const definedTypeIds = new Set(Object.keys(monsterTypeStats));
    const availableType = characterTypes.find(t => !definedTypeIds.has(t.id));
    
    if (!availableType) {
      toast.error('모든 캐릭터 타입이 이미 정의되었습니다.');
      return;
    }

    const newStats: MonsterTypeStats = {
      characterType: availableType.id,
      baseLevel: 1,
      size: 24,
      aiPattern: 'aggressive',
      skills: [],
      aiPatternConfig: { ...defaultAIPatternConfig },
    };

    onMonsterTypeStatsChange({
      ...monsterTypeStats,
      [availableType.id]: newStats,
    });
    
    setSelectedTypeId(availableType.id);
    toast.success(`${availableType.name} 타입이 추가되었습니다!`);
  };

  const removeMonsterType = (typeId: string) => {
    const typeName = characterTypes.find(t => t.id === typeId)?.name || '타입';
    const newStats = { ...monsterTypeStats };
    delete newStats[typeId];
    onMonsterTypeStatsChange(newStats);
    
    // 선택된 타입이 삭제되면 다른 타입 선택
    if (selectedTypeId === typeId) {
      const remainingIds = Object.keys(newStats);
      setSelectedTypeId(remainingIds[0] || null);
    }
    
    toast.success(`${typeName}이 삭제되었습니다.`);
  };

  const updateMonsterType = (typeId: string, updates: Partial<MonsterTypeStats>) => {
    onMonsterTypeStatsChange({
      ...monsterTypeStats,
      [typeId]: {
        ...monsterTypeStats[typeId],
        ...updates,
      },
    });
  };

  const selectedStats = selectedTypeId ? monsterTypeStats[selectedTypeId] : null;
  const selectedType = selectedTypeId ? characterTypes.find(t => t.id === selectedTypeId) : null;

  // 사용 가능한 스킬 목록
  const availableSkills = Object.entries(defaultSkills).map(([id, skill]) => ({
    id,
    name: skill.name,
    description: skill.description || '',
  }));

  const handleSkillToggle = (skillId: string) => {
    if (!selectedTypeId || !selectedStats) return;

    const currentSkills = selectedStats.skills || [];
    const newSkills = currentSkills.includes(skillId)
      ? currentSkills.filter(id => id !== skillId)
      : [...currentSkills, skillId];

    updateMonsterType(selectedTypeId, { skills: newSkills });
  };

  return (
    <div className="space-y-6">
      {/* 헤더 및 타입 선택 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Skull className="w-5 h-5 text-red-600" />
                몬스터 타입 정의
              </CardTitle>
              <CardDescription>
                각 몬스터 타입의 기본 설정을 정의합니다
              </CardDescription>
            </div>
            <Button onClick={addMonsterType} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              타입 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 타입 선택 버튼들 */}
          <div className="flex flex-wrap gap-2">
            {Object.keys(monsterTypeStats).length === 0 ? (
              <div className="w-full text-center py-8 text-slate-400">
                <Skull className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">정의된 몬스터 타입이 없습니다</p>
                <p className="text-xs mt-1">타입 추가 버튼을 눌러 몬스터 타입을 정의하세요</p>
              </div>
            ) : (
              Object.keys(monsterTypeStats).map(typeId => {
                const type = characterTypes.find(t => t.id === typeId);
                if (!type) return null;
                
                return (
                  <div
                    key={typeId}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all cursor-pointer hover:shadow-sm ${
                      selectedTypeId === typeId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setSelectedTypeId(typeId)}
                  >
                    <div className={`w-8 h-8 rounded-full ${type.color} flex items-center justify-center`}>
                      <Skull className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-sm">{type.name}</div>
                      <div className="text-xs text-slate-500">{type.description}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeMonsterType(typeId);
                      }}
                      className="ml-2"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* 선택된 타입의 기본 설정 */}
      {selectedStats && selectedType && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${selectedType.color} flex items-center justify-center`}>
                <Skull className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>{selectedType.name} 기본 설정</CardTitle>
                <CardDescription>{selectedType.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 기본 설정 */}
            <div className="space-y-4">
              <h4 className="text-sm">기본 속성</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="baseLevel">기본 레벨</Label>
                  <Input
                    id="baseLevel"
                    type="number"
                    value={selectedStats.baseLevel}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value >= 1) {
                        updateMonsterType(selectedTypeId!, { baseLevel: value });
                      }
                    }}
                    min={1}
                    max={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="size">크기 (px)</Label>
                  <Input
                    id="size"
                    type="number"
                    value={selectedStats.size}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!isNaN(value) && value >= 8 && value <= 64) {
                        updateMonsterType(selectedTypeId!, { size: value });
                      }
                    }}
                    min={8}
                    max={64}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* 스킬 설정 */}
            <div className="space-y-4">
              <h4 className="text-sm">스킬 설정</h4>
              <div className="space-y-2">
                <Label>보유 스킬 선택</Label>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-2 border rounded-md">
                  {availableSkills.map(skill => (
                    <div
                      key={skill.id}
                      className={`p-2 border rounded cursor-pointer transition-colors ${
                        selectedStats.skills?.includes(skill.id)
                          ? 'bg-blue-50 border-blue-500'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleSkillToggle(skill.id)}
                    >
                      <div className="text-sm">{skill.name}</div>
                      {skill.description && (
                        <div className="text-xs text-gray-500 mt-1">{skill.description}</div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  선택된 스킬: {selectedStats.skills?.length || 0}개
                </p>
              </div>
            </div>

            {/* 안내 메시지 */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800">
                <p className="mb-1">💡 타입 프리셋 안내</p>
                <p className="text-blue-700">
                  각 몬스터 타입은 기본 레벨, 크기, AI 패턴, 스킬 세트를 가집니다.
                  <br />
                  실제 스탯은 레벨에 따라 계산되며, 포뮬러는 "스탯 포뮬러 관리" 메뉴에서 설정합니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI 패턴 설정 */}
      {selectedStats && selectedType && (
        <MonsterAIPatternEditor
          config={selectedStats.aiPatternConfig || defaultAIPatternConfig}
          onConfigChange={(newConfig) => {
            updateMonsterType(selectedTypeId!, {
              aiPatternConfig: newConfig,
            });
          }}
          monsterTypeName={selectedType.name}
          skillConfigs={defaultSkills}
          monsterTypeSkills={selectedStats.skills || []}
        />
      )}
    </div>
  );
}
