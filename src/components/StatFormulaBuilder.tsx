import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Play } from 'lucide-react';
import { 
  FormulaBlock, 
  blockToExpression, 
  generateBlockId,
} from '../lib/formulaTypes';

interface StatFormulaBuilderProps {
  statName: string;
  statColor: string;
  baseValue: number;
  currentBlocks: FormulaBlock[];
  onBlocksChange: (blocks: FormulaBlock[]) => void;
}

export function StatFormulaBuilder({
  statName,
  statColor,
  baseValue,
  currentBlocks,
  onBlocksChange,
}: StatFormulaBuilderProps) {
  const [perLevel, setPerLevel] = useState('5');
  const [multiplier, setMultiplier] = useState('1');

  const calculatePreview = (level: number, perLvl: number, mult: number) => {
    return Math.floor(baseValue + (level * perLvl * mult));
  };

  const applySimpleFormula = () => {
    const perLvl = Number(perLevel) || 0;
    const mult = Number(multiplier) || 1;

    // LEVEL * perLevel * multiplier 공식 생성
    const formulaBlock: FormulaBlock = {
      id: generateBlockId(),
      type: 'operator',
      operator: '*',
      children: [
        {
          id: generateBlockId(),
          type: 'operator',
          operator: '*',
          children: [
            {
              id: generateBlockId(),
              type: 'variable',
              value: 'LEVEL',
            },
            {
              id: generateBlockId(),
              type: 'constant',
              value: perLvl,
            },
          ],
        },
        {
          id: generateBlockId(),
          type: 'constant',
          value: mult,
        },
      ],
    };

    onBlocksChange([formulaBlock]);
  };

  const perLvl = Number(perLevel) || 0;
  const mult = Number(multiplier) || 1;

  return (
    <Card className="border-l-4" style={{ borderLeftColor: statColor }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          📊 {statName} 성장 공식
        </CardTitle>
        <CardDescription className="text-xs">
          간단한 레벨 성장 공식을 설정하세요
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 공식 입력 */}
        <div className="space-y-3">
          <div className="p-3 bg-slate-50 border-2 border-slate-200 rounded-lg">
            <div className="text-xs font-mono text-slate-700 mb-2">
              {statName} = BASE + (LEVEL × 레벨당 증가량 × 배율)
            </div>
            <div className="text-xs font-mono text-slate-500">
              {statName} = {baseValue} + (LEVEL × {perLevel} × {multiplier})
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">레벨당 증가량</Label>
              <Input
                type="text"
                value={perLevel}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^-?\d*\.?\d*$/.test(val)) {
                    setPerLevel(val);
                  }
                }}
                placeholder="5"
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">배율</Label>
              <Input
                type="text"
                value={multiplier}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^-?\d*\.?\d*$/.test(val)) {
                    setMultiplier(val);
                  }
                }}
                placeholder="1"
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        <Button
          className="w-full"
          style={{ backgroundColor: statColor }}
          onClick={applySimpleFormula}
        >
          <Play className="w-4 h-4 mr-2" />
          공식 적용하기
        </Button>

        <Separator />

        {/* 미리보기 */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <span className="text-base">👀</span>
            미리보기 (레벨 1-10)
          </Label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => {
              const value = calculatePreview(level, perLvl, mult);
              const prevValue = level > 1 ? calculatePreview(level - 1, perLvl, mult) : baseValue;
              const growth = value - prevValue;
              
              return (
                <div 
                  key={level}
                  className="text-center p-2.5 bg-white border-2 border-slate-200 rounded-lg hover:border-purple-300 transition-colors"
                >
                  <div className="text-[10px] text-slate-500 font-medium mb-0.5">Lv.{level}</div>
                  <div className="text-base font-bold" style={{ color: statColor }}>
                    {value}
                  </div>
                  {growth > 0 && (
                    <div className="text-[10px] text-green-600 font-medium mt-0.5">
                      +{growth}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 사용 가이드 */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-xs text-blue-800">
            <div className="font-medium mb-1">💡 사용 예시:</div>
            <ul className="space-y-0.5 text-[11px] ml-4 list-disc">
              <li>레벨당 5씩 증가: 레벨당 증가량 = 5, 배율 = 1</li>
              <li>레벨당 10씩 증가: 레벨당 증가량 = 10, 배율 = 1</li>
              <li>레벨당 3씩 증가 (2배): 레벨당 증가량 = 3, 배율 = 2</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
