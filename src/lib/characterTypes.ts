import { AIPatternConfig, defaultAIPatternConfig } from './monsterAI';

/**
 * 캐릭터 타입 프리셋 정보
 * - 레벨, 크기, AI 패턴, 스킬 세트를 포함하는 프리셋
 */
export interface CharacterTypeInfo {
  id: string;
  name: string;
  description: string;
  color: string;
  
  // 프리셋 기본값
  defaultLevel?: number;        // 기본 레벨
  defaultSize?: number;          // 기본 크기
  defaultSkillIds?: string[];    // 기본 스킬 ID 목록 (최대 4개)
  defaultBasicAttackId?: string; // 기본 공격 스킬 ID
  defaultAIPattern?: AIPatternConfig; // 기본 AI 패턴 (몬스터용)
  
  // 스탯 포뮬러 (레벨별 능력치 계산)
  statFormulas?: {
    hpFormula?: string;           // HP 계산 포뮬러
    spFormula?: string;           // SP 계산 포뮬러
    attackFormula?: string;       // 공격력 계산 포뮬러
    defenseFormula?: string;      // 방어력 계산 포뮬러
    moveSpeedFormula?: string;    // 이동속도 계산 포뮬러
    attackSpeedFormula?: string;  // 공격속도 계산 포뮬러
    accuracyFormula?: string;     // 명중률 계산 포뮬러 (%)
    criticalRateFormula?: string; // 크리티컬 확률 계산 포뮬러 (%)
  };
}

// 기본 타입 정의 (프리셋)
export const DEFAULT_CHARACTER_TYPES: CharacterTypeInfo[] = [
  {
    id: 'warrior',
    name: '전사',
    description: '근접 전투에 특화된 강력한 전사',
    color: 'text-red-600',
    defaultLevel: 1,
    defaultSize: 24,
    defaultBasicAttackId: 'meleeBasic',
    defaultSkillIds: ['powerSlash', 'whirlwind'],
    statFormulas: {
      hpFormula: '100 + level * 20',
      spFormula: '50 + level * 10',
      attackFormula: '10 + level * 3',
      defenseFormula: '5 + level * 2',
      moveSpeedFormula: '80',
      attackSpeedFormula: '1.0',
      accuracyFormula: '85',
      criticalRateFormula: '15',
    },
    defaultAIPattern: {
      patterns: [
        {
          action: 'attack',
          conditions: [{ type: 'distance', operator: '<', value: 100 }],
          enabled: true,
          skillId: 'powerSlash'
        },
        {
          action: 'chase',
          conditions: [],
          enabled: true
        }
      ],
      aggroRange: 300,
      chaseMinDistance: 0,
    },
  },
  {
    id: 'archer',
    name: '궁수',
    description: '원거리 공격으로 안전하게 전투',
    color: 'text-blue-600',
    defaultLevel: 1,
    defaultSize: 20,
    defaultBasicAttackId: 'rangedBasic',
    defaultSkillIds: ['powerSlash', 'heal'],
    statFormulas: {
      hpFormula: '80 + level * 15',
      spFormula: '60 + level * 12',
      attackFormula: '8 + level * 2.5',
      defenseFormula: '3 + level * 1.5',
      moveSpeedFormula: '100',
      attackSpeedFormula: '1.2',
      accuracyFormula: '90',
      criticalRateFormula: '20',
    },
    defaultAIPattern: {
      patterns: [
        {
          action: 'attack',
          conditions: [{ type: 'distance', operator: '>', value: 100 }],
          enabled: true,
          skillId: 'powerSlash'
        },
        {
          action: 'flee',
          conditions: [{ type: 'distance', operator: '<', value: 80 }],
          enabled: true
        },
        {
          action: 'chase',
          conditions: [],
          enabled: true
        }
      ],
      aggroRange: 400,
      chaseMinDistance: 100,
    },
  },
  {
    id: 'mage',
    name: '마법사',
    description: '마법으로 적을 제압하는 술사',
    color: 'text-purple-600',
    defaultLevel: 1,
    defaultSize: 18,
    defaultBasicAttackId: 'rangedBasic',
    defaultSkillIds: ['whirlwind', 'heal'],
    statFormulas: {
      hpFormula: '70 + level * 12',
      spFormula: '80 + level * 15',
      attackFormula: '12 + level * 4',
      defenseFormula: '2 + level * 1',
      moveSpeedFormula: '90',
      attackSpeedFormula: '0.8',
      accuracyFormula: '80',
      criticalRateFormula: '25',
    },
    defaultAIPattern: {
      patterns: [
        {
          action: 'attack',
          conditions: [{ type: 'hp', operator: '>', value: 30 }],
          enabled: true,
          skillId: 'whirlwind'
        },
        {
          action: 'flee',
          conditions: [{ type: 'hp', operator: '<', value: 30 }],
          enabled: true
        },
        {
          action: 'chase',
          conditions: [],
          enabled: true
        }
      ],
      aggroRange: 350,
      chaseMinDistance: 120,
    },
  },
];

export function getCharacterTypeName(type: string, types: CharacterTypeInfo[]): string {
  const typeInfo = types.find(t => t.id === type);
  return typeInfo?.name || type;
}

export function getCharacterTypeInfo(type: string, types: CharacterTypeInfo[]): CharacterTypeInfo | undefined {
  return types.find(t => t.id === type);
}
