import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { LevelConfig } from '../lib/levelSystem';
import { Heart, Shield, Sparkles, Swords, TrendingUp, Spline, Check, Users, Zap } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { ExpCurveEditor } from './ExpCurveEditor';
import { CharacterTypeInfo } from '../lib/characterTypes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface SimulatorSettingsProps {
  playerLevelConfig: LevelConfig;
  onPlayerLevelConfigChange: (config: LevelConfig) => void;
  
  monsterLevelConfig: LevelConfig;
  onMonsterLevelConfigChange: (config: LevelConfig) => void;
  
  characterTypes: CharacterTypeInfo[];
  onCharacterTypesChange: (types: CharacterTypeInfo[]) => void;
}

export function SimulatorSettings({
  playerLevelConfig,
  onPlayerLevelConfigChange,
  monsterLevelConfig,
  onMonsterLevelConfigChange,
  characterTypes,
  onCharacterTypesChange,
}: SimulatorSettingsProps) {
  // 선택된 캐릭터 타입
  const [selectedTypeId, setSelectedTypeId] = useState<string>(characterTypes[0]?.id || 'warrior');
  const selectedType = characterTypes.find(t => t.id === selectedTypeId);
  
  // 렌더링할 레벨 범위
  const tableStartLevel = 1;
  const tableEndLevel = 20;

  // 플레이어 최대 레벨 상태
  const [playerTempMaxLevel, setPlayerTempMaxLevel] = useState(playerLevelConfig.maxLevel || 100);
  const [playerAppliedMaxLevel, setPlayerAppliedMaxLevel] = useState(playerLevelConfig.maxLevel || 100);
  
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
  
  // 타입별 능력치 테이블 생성
  const generateTypeStatsTable = (type: CharacterTypeInfo, startLevel: number, endLevel: number) => {
    const result = [];
    for (let level = startLevel; level <= endLevel; level++) {
      result.push({
        level,
        hp: evaluateFormulaPreview(type.statFormulas?.hpFormula, level),
        sp: evaluateFormulaPreview(type.statFormulas?.spFormula, level),
        attack: evaluateFormulaPreview(type.statFormulas?.attackFormula, level),
        defense: evaluateFormulaPreview(type.statFormulas?.defenseFormula, level),
        moveSpeed: evaluateFormulaPreview(type.statFormulas?.moveSpeedFormula, level),
        attackSpeed: evaluateFormulaPreview(type.statFormulas?.attackSpeedFormula, level),
        accuracy: evaluateFormulaPreview(type.statFormulas?.accuracyFormula, level),
        criticalRate: evaluateFormulaPreview(type.statFormulas?.criticalRateFormula, level),
      });
    }
    return result;
  };
  
  // 선택된 타입의 능력치 업데이트
  const handleUpdateTypeFormula = (formulaKey: string, value: string) => {
    if (!selectedType) return;

    onCharacterTypesChange(
      characterTypes.map(t =>
        t.id === selectedTypeId
          ? {
              ...t,
              statFormulas: {
                ...t.statFormulas,
                [formulaKey]: value,
              },
            }
          : t
      )
    );
  };

  // 선택된 타입의 능력치 테이블
  const typeStatsTable = selectedType ? generateTypeStatsTable(selectedType, tableStartLevel, tableEndLevel) : [];

  return (
    <div className="space-y-6">
      {/* 플레이어 경험치 곡선 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-white text-sm">P</span>
            </div>
            플레이어 경험치 곡선 설정
          </CardTitle>
          <CardDescription>
            베지어 곡선 기반으로 레벨별 경험치 구간을 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 최대 레벨 설정 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm">최대 레벨 설정</h3>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                value={playerTempMaxLevel}
                onChange={(e) => {
                  const maxLevel = Math.max(1, Math.min(999, parseInt(e.target.value) || 100));
                  setPlayerTempMaxLevel(maxLevel);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPlayerAppliedMaxLevel(playerTempMaxLevel);
                    onPlayerLevelConfigChange({ ...playerLevelConfig, maxLevel: playerTempMaxLevel });
                  }
                }}
                min={1}
                max={999}
                className="w-32 h-9"
              />
              <Button
                size="sm"
                onClick={() => {
                  setPlayerAppliedMaxLevel(playerTempMaxLevel);
                  onPlayerLevelConfigChange({ ...playerLevelConfig, maxLevel: playerTempMaxLevel });
                }}
                className="h-9 px-4"
              >
                <Check className="w-4 h-4 mr-1" />
                적용
              </Button>
              <span className="text-xs text-slate-500">
                (1~999, 확인 버튼 또는 Enter로 그래프 갱신)
              </span>
            </div>
          </div>

          <Separator />

          {/* 경험치 곡선 설정 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Spline className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm">경험치 곡선 (베지어)</h3>
            </div>

            <ExpCurveEditor
              config={playerLevelConfig.expGrowthConfig || { segments: [], bezierSegments: [], useBezier: true }}
              maxLevel={playerAppliedMaxLevel}
              onChange={(expConfig) => {
                onPlayerLevelConfigChange({
                  ...playerLevelConfig,
                  expGrowthConfig: { ...expConfig, useBezier: true }
                });
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 캐릭터 타입별 능력치 설정 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                캐릭터 타입별 능력치 설정
              </CardTitle>
              <CardDescription>
                각 캐릭터 타입의 레벨별 능력치 계산 포뮬러를 관리합니다
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 타입 선택 */}
          <div className="space-y-2">
            <Label>캐릭터 타입 선택</Label>
            <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {characterTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={type.color}>
                        {type.name}
                      </Badge>
                      <span className="text-xs text-slate-500">- {type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* 선택된 타입 정보 */}
          {selectedType && (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border-2 border-purple-200">
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="outline" className={`${selectedType.color} text-lg px-3 py-1`}>
                  {selectedType.name}
                </Badge>
                <div>
                  <p className="text-sm text-slate-700">{selectedType.description}</p>
                  <code className="text-xs text-slate-500">{selectedType.id}</code>
                </div>
              </div>
            </div>
          )}

          {/* 능력치 포뮬러 설정 */}
          {selectedType && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  💡 <strong>사용 가능한 변수:</strong> level (캐릭터 레벨), size (크기)
                  <br />
                  💡 <strong>사용 가능한 함수:</strong> MAX, MIN, ROUND, FLOOR, CEIL, SQRT
                  <br />
                  예: <code>100 + level * 10</code> → 레벨 1: 110, 레벨 5: 150
                </p>
              </div>

              {/* 좌우 레이아웃: 왼쪽 포뮬러, 오른쪽 테이블 */}
              <div className="grid grid-cols-2 gap-4">
                {/* 왼쪽: 포뮬러 입력 */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-red-500" />
                        HP 포뮬러
                      </Label>
                      {selectedType.statFormulas?.hpFormula && (
                        <span className="text-xs text-muted-foreground">
                          Lv1: {evaluateFormulaPreview(selectedType.statFormulas.hpFormula, 1)} | 
                          Lv10: {evaluateFormulaPreview(selectedType.statFormulas.hpFormula, 10)}
                        </span>
                      )}
                    </div>
                    <Input
                      value={selectedType.statFormulas?.hpFormula || ''}
                      onChange={(e) => handleUpdateTypeFormula('hpFormula', e.target.value)}
                      placeholder="예: 100 + level * 20"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-cyan-500" />
                        SP 포뮬러
                      </Label>
                      {selectedType.statFormulas?.spFormula && (
                        <span className="text-xs text-muted-foreground">
                          Lv1: {evaluateFormulaPreview(selectedType.statFormulas.spFormula, 1)} | 
                          Lv10: {evaluateFormulaPreview(selectedType.statFormulas.spFormula, 10)}
                        </span>
                      )}
                    </div>
                    <Input
                      value={selectedType.statFormulas?.spFormula || ''}
                      onChange={(e) => handleUpdateTypeFormula('spFormula', e.target.value)}
                      placeholder="예: 50 + level * 10"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Swords className="h-4 w-4 text-orange-500" />
                        공격력 포뮬러
                      </Label>
                      {selectedType.statFormulas?.attackFormula && (
                        <span className="text-xs text-muted-foreground">
                          Lv1: {evaluateFormulaPreview(selectedType.statFormulas.attackFormula, 1)} | 
                          Lv10: {evaluateFormulaPreview(selectedType.statFormulas.attackFormula, 10)}
                        </span>
                      )}
                    </div>
                    <Input
                      value={selectedType.statFormulas?.attackFormula || ''}
                      onChange={(e) => handleUpdateTypeFormula('attackFormula', e.target.value)}
                      placeholder="예: 10 + level * 3"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-500" />
                        방어력 포뮬러
                      </Label>
                      {selectedType.statFormulas?.defenseFormula && (
                        <span className="text-xs text-muted-foreground">
                          Lv1: {evaluateFormulaPreview(selectedType.statFormulas.defenseFormula, 1)} | 
                          Lv10: {evaluateFormulaPreview(selectedType.statFormulas.defenseFormula, 10)}
                        </span>
                      )}
                    </div>
                    <Input
                      value={selectedType.statFormulas?.defenseFormula || ''}
                      onChange={(e) => handleUpdateTypeFormula('defenseFormula', e.target.value)}
                      placeholder="예: 5 + level * 2"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        이동속도 포뮬러
                      </Label>
                      {selectedType.statFormulas?.moveSpeedFormula && (
                        <span className="text-xs text-muted-foreground">
                          Lv1: {evaluateFormulaPreview(selectedType.statFormulas.moveSpeedFormula, 1)} | 
                          Lv10: {evaluateFormulaPreview(selectedType.statFormulas.moveSpeedFormula, 10)}
                        </span>
                      )}
                    </div>
                    <Input
                      value={selectedType.statFormulas?.moveSpeedFormula || ''}
                      onChange={(e) => handleUpdateTypeFormula('moveSpeedFormula', e.target.value)}
                      placeholder="예: 100 (고정) 또는 80 + level"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        공격속도 포뮬러
                      </Label>
                      {selectedType.statFormulas?.attackSpeedFormula && (
                        <span className="text-xs text-muted-foreground">
                          Lv1: {evaluateFormulaPreview(selectedType.statFormulas.attackSpeedFormula, 1)} | 
                          Lv10: {evaluateFormulaPreview(selectedType.statFormulas.attackSpeedFormula, 10)}
                        </span>
                      )}
                    </div>
                    <Input
                      value={selectedType.statFormulas?.attackSpeedFormula || ''}
                      onChange={(e) => handleUpdateTypeFormula('attackSpeedFormula', e.target.value)}
                      placeholder="예: 1.0 (고정) 또는 1.0 + level * 0.05"
                      className="h-9"
                    />
                  </div>
                </div>

                {/* 오른쪽: 능력치 테이블 */}
                <div className="border rounded-lg overflow-hidden bg-slate-50">
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader className="bg-slate-100 sticky top-0">
                        <TableRow>
                          <TableHead className="text-center text-xs">Lv</TableHead>
                          <TableHead className="text-center text-xs">HP</TableHead>
                          <TableHead className="text-center text-xs">SP</TableHead>
                          <TableHead className="text-center text-xs">ATK</TableHead>
                          <TableHead className="text-center text-xs">DEF</TableHead>
                          <TableHead className="text-center text-xs">이동속도</TableHead>
                          <TableHead className="text-center text-xs">공격속도</TableHead>
                          <TableHead className="text-center text-xs">명중</TableHead>
                          <TableHead className="text-center text-xs">크리티컬</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {typeStatsTable.map((row) => (
                          <TableRow key={row.level}>
                            <TableCell className="text-center text-xs">{row.level}</TableCell>
                            <TableCell className="text-center text-xs text-red-600">{row.hp}</TableCell>
                            <TableCell className="text-center text-xs text-cyan-600">{row.sp}</TableCell>
                            <TableCell className="text-center text-xs text-orange-600">{row.attack}</TableCell>
                            <TableCell className="text-center text-xs text-blue-600">{row.defense}</TableCell>
                            <TableCell className="text-center text-xs text-yellow-600">{row.moveSpeed}</TableCell>
                            <TableCell className="text-center text-xs text-green-600">{row.attackSpeed}</TableCell>
                            <TableCell className="text-center text-xs text-purple-600">{row.accuracy}</TableCell>
                            <TableCell className="text-center text-xs text-pink-600">{row.criticalRate}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
