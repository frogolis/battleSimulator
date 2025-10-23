/**
 * 레벨 시스템
 * - 경험치 관리
 * - 레벨업 계산
 * - 레벨별 능력치 상승 (ax + b 형태)
 */

export interface StatGrowthFormula {
  a: number; // 계수 (기울기)
  b: number; // 상수 (y절편)
}

export interface ExpGrowthFormula {
  type: 'linear' | 'exponential';
  // 선형: ax + b
  // 지수: a * (b ^ x)
  a: number; // 선형: 계수, 지수: 기본값
  b: number; // 선형: 상수, 지수: 지수 비율
}

// 구간별 경험치 공식
export interface ExpSegment {
  id: string;
  startLevel: number;
  endLevel: number;
  formula: string; // 사용자 정의 수식 (예: "100 * 1.5^(x-1)", "50*x + 100")
}

// 베지어 곡선 기반 구간
export interface BezierPoint {
  x: number; // 레벨 (0-1 정규화)
  y: number; // 경험치 (0-1 정규화)
}

export interface BezierSegment {
  id: string;
  startLevel: number;
  endLevel: number;
  startExp: number; // 시작 경험치 값
  endExp: number;   // 종료 경험치 값
  controlPoint1: BezierPoint; // 첫 번째 컨트롤 포인트
  controlPoint2: BezierPoint; // 두 번째 컨트롤 포인트
}

export interface ExpGrowthConfig {
  segments: ExpSegment[];
  bezierSegments?: BezierSegment[];
  useBezier?: boolean; // true면 베지어 곡선 사용, false면 수식 사용
  yAxisMax?: number; // Y축 최대값 (고정, 리셋으로만 재계산)
}

export interface LevelConfig {
  currentLevel: number;
  currentExp: number;
  expToNextLevel: number;
  
  // 최대 레벨 설정
  maxLevel?: number;
  
  // 레벨당 능력치 증가량 (하위 호환성을 위해 유지)
  hpPerLevel: number;
  spPerLevel: number;
  attackPerLevel: number;
  defensePerLevel: number;
  speedPerLevel: number;
  
  // ax + b 형태의 능력치 증가 공식
  hpGrowth: StatGrowthFormula;
  spGrowth: StatGrowthFormula;
  attackGrowth: StatGrowthFormula;
  defenseGrowth: StatGrowthFormula;
  speedGrowth: StatGrowthFormula;
  
  // 비주얼 포뮬라 빌더 블록 (고급 모드)
  hpFormulaBlocks?: any[];
  spFormulaBlocks?: any[];
  attackFormulaBlocks?: any[];
  defenseFormulaBlocks?: any[];
  speedFormulaBlocks?: any[];
  
  // 포뮬라 모드 ('simple' | 'advanced')
  formulaMode?: 'simple' | 'advanced';
  
  // 경험치 증가 공식 (레거시)
  expGrowth: ExpGrowthFormula;
  
  // 새로운 구간별 경험치 시스템
  expGrowthConfig?: ExpGrowthConfig;
  
  // 기본 스탯
  baseHp: number;
  baseSp: number;
  baseAttack: number;
  baseDefense: number;
  baseSpeed: number;
}

export interface LevelStats {
  level: number;
  hp: number;
  sp: number;
  attack: number;
  defense: number;
  speed: number;
  totalExp: number;
  expToNext: number;
}

/**
 * 수식 문자열을 평가하여 값을 계산
 * 지원 연산: +, -, *, /, ^, ( )
 * 변수: x (레벨)
 */
export function evaluateFormula(formula: string, x: number): number {
  try {
    // 수식을 안전하게 평가하기 위해 변환
    let sanitized = formula
      .replace(/x/gi, String(x))
      .replace(/\^/g, '**'); // ^ -> **로 변환 (거듭제곱)
    
    // eval 대신 Function을 사용하여 안전하게 계산
    const result = new Function(`return ${sanitized}`)();
    
    return Math.floor(Number(result) || 0);
  } catch (error) {
    console.error('수식 평가 오류:', error);
    return 0;
  }
}

/**
 * 3차 베지어 곡선 계산
 * t: 0-1 사이의 값
 * p0, p1, p2, p3: 컨트롤 포인트
 */
export function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 
         3 * u * u * t * p1 + 
         3 * u * t * t * p2 + 
         t * t * t * p3;
}

/**
 * 베지어 곡선을 사용하여 레벨별 경험치 계산
 */
export function calculateExpWithBezier(level: number, segment: BezierSegment): number {
  // 레벨을 구간 내에서 0-1로 정규화
  const t = (level - segment.startLevel) / (segment.endLevel - segment.startLevel);
  
  // 베지어 곡선의 시작점과 끝점
  const p0 = segment.startExp;
  const p3 = segment.endExp;
  
  // 컨트롤 포인트를 실제 값으로 변환
  const expRange = segment.endExp - segment.startExp;
  const p1 = segment.startExp + segment.controlPoint1.y * expRange;
  const p2 = segment.startExp + segment.controlPoint2.y * expRange;
  
  // 베지어 곡선 계산
  const exp = cubicBezier(t, p0, p1, p2, p3);
  
  return Math.floor(Math.max(0, exp));
}

/**
 * 구간별 경험치 공식을 사용하여 레벨별 필요 경험치 계산
 */
export function calculateExpForLevelWithSegments(level: number, config?: ExpGrowthConfig): number {
  if (!config) {
    // 기본값: 100 * (1.5 ^ (level - 1))
    return Math.floor(100 * Math.pow(1.5, level - 1));
  }
  
  // 베지어 곡선 모드인지 확인
  if (config.useBezier && config.bezierSegments && config.bezierSegments.length > 0) {
    // 해당 레벨이 속한 베지어 구간 찾기
    const segment = config.bezierSegments.find(
      s => level >= s.startLevel && level <= s.endLevel
    );
    
    if (segment) {
      return calculateExpWithBezier(level, segment);
    }
  }
  
  // 수식 모드
  if (config.segments && config.segments.length > 0) {
    // 해당 레벨이 속한 구간 찾기
    const segment = config.segments.find(
      s => level >= s.startLevel && level <= s.endLevel
    );
    
    if (segment) {
      // 수식 평가
      return evaluateFormula(segment.formula, level);
    }
  }
  
  // 기본값
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

/**
 * 레벨별 필요 경험치 계산 (레거시 공식 기반)
 */
export function calculateExpForLevel(level: number, formula?: ExpGrowthFormula): number {
  // 기본값: 100 * (1.5 ^ (level - 1))
  if (!formula) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
  }
  
  if (formula.type === 'linear') {
    // 선형: a * level + b
    return Math.floor(formula.a * level + formula.b);
  } else {
    // 지수: a * (b ^ level)
    return Math.floor(formula.a * Math.pow(formula.b, level - 1));
  }
}

/**
 * 경험치를 얻었을 때 레벨업 계산
 */
export function addExperience(
  config: LevelConfig,
  expGained: number
): { newConfig: LevelConfig; leveledUp: boolean; levelsGained: number } {
  let currentLevel = config.currentLevel;
  let currentExp = config.currentExp + expGained;
  let expToNext = config.expToNextLevel;
  let levelsGained = 0;
  
  // 최대 레벨 (기본값 100 또는 사용자 설정값)
  const maxLevel = config.maxLevel || 100;
  
  // 레벨업 체크 (여러 레벨 동시 상승 가능)
  while (currentExp >= expToNext && currentLevel < maxLevel) {
    currentExp -= expToNext;
    currentLevel++;
    levelsGained++;
    
    // 최대 레벨에 도달하면 추가 경험치는 무시
    if (currentLevel >= maxLevel) {
      currentExp = 0;
      break;
    }
    
    // 새로운 구간별 시스템 사용 또는 레거시 시스템 사용
    if (config.expGrowthConfig && config.expGrowthConfig.segments.length > 0) {
      expToNext = calculateExpForLevelWithSegments(currentLevel, config.expGrowthConfig);
    } else {
      expToNext = calculateExpForLevel(currentLevel, config.expGrowth);
    }
  }
  
  return {
    newConfig: {
      ...config,
      currentLevel,
      currentExp,
      expToNextLevel: expToNext,
    },
    leveledUp: levelsGained > 0,
    levelsGained,
  };
}

/**
 * ax + b 공식을 사용하여 특정 레벨의 능력치 증가량 계산
 */
export function calculateStatGrowth(level: number, formula: StatGrowthFormula): number {
  // level 1일 때 증가량 0
  // level 2일 때 a * 1 + b
  // level 3일 때 a * 2 + b
  // 공식: a * (level - 1) + b
  return Math.floor(formula.a * (level - 1) + formula.b);
}

/**
 * 레벨에 따른 현재 능력치 계산 (ax + b 공식 사용)
 */
export function calculateLevelStats(config: LevelConfig): LevelStats {
  const level = config.currentLevel;
  
  // ax + b 공식으로 레벨 1부터 현재 레벨까지의 총 증가량 계산
  let totalHpGrowth = 0;
  let totalSpGrowth = 0;
  let totalAttackGrowth = 0;
  let totalDefenseGrowth = 0;
  let totalSpeedGrowth = 0;
  
  for (let i = 2; i <= level; i++) {
    totalHpGrowth += calculateStatGrowth(i, config.hpGrowth);
    totalSpGrowth += calculateStatGrowth(i, config.spGrowth);
    totalAttackGrowth += calculateStatGrowth(i, config.attackGrowth);
    totalDefenseGrowth += calculateStatGrowth(i, config.defenseGrowth);
    totalSpeedGrowth += calculateStatGrowth(i, config.speedGrowth);
  }
  
  return {
    level,
    hp: config.baseHp + totalHpGrowth,
    sp: config.baseSp + totalSpGrowth,
    attack: config.baseAttack + totalAttackGrowth,
    defense: config.baseDefense + totalDefenseGrowth,
    speed: config.baseSpeed + totalSpeedGrowth,
    totalExp: config.currentExp,
    expToNext: config.expToNextLevel,
  };
}

/**
 * 기본 레벨 설정 (플레이어)
 */
export const defaultPlayerLevelConfig: LevelConfig = {
  currentLevel: 1,
  currentExp: 0,
  expToNextLevel: 100,
  maxLevel: 100, // 기본 최대 레벨
  
  // 하위 호환성을 위한 기존 방식 (사용 안 함)
  hpPerLevel: 20,
  spPerLevel: 5,
  attackPerLevel: 5,
  defensePerLevel: 3,
  speedPerLevel: 2,
  
  // ax + b 공식 (a = 기울기, b = 기본 증가량)
  hpGrowth: { a: 0, b: 20 },      // 레벨당 20씩 고정 증가
  spGrowth: { a: 0, b: 5 },       // 레벨당 5씩 고정 증가
  attackGrowth: { a: 0, b: 5 },   // 레벨당 5씩 고정 증가
  defenseGrowth: { a: 0, b: 3 },  // 레벨당 3씩 고정 증가
  speedGrowth: { a: 0, b: 2 },    // 레벨당 2씩 고정 증가
  
  // 경험치 공식 (지수형: 100 * 1.5^(level-1))
  expGrowth: { type: 'exponential', a: 100, b: 1.5 },
  
  // 새로운 구간별 경험치 시스템
  expGrowthConfig: {
    useBezier: false,
    segments: [
      { id: '1', startLevel: 1, endLevel: 10, formula: '100 * 1.5^(x-1)' },
      { id: '2', startLevel: 10, endLevel: 20, formula: '100 * 1.5^(x-1)' },
    ],
    bezierSegments: [
      {
        id: '1',
        startLevel: 1,
        endLevel: 10,
        startExp: 100,
        endExp: 1500,
        controlPoint1: { x: 0.33, y: 0.1 },
        controlPoint2: { x: 0.67, y: 0.9 },
      },
      {
        id: '2',
        startLevel: 10,
        endLevel: 20,
        startExp: 1500,
        endExp: 10000,
        controlPoint1: { x: 0.33, y: 0.1 },
        controlPoint2: { x: 0.67, y: 0.9 },
      },
    ]
  },
  
  baseHp: 100,
  baseSp: 50,
  baseAttack: 50,
  baseDefense: 20,
  baseSpeed: 150,
};

/**
 * 기본 레벨 설정 (몬스터)
 */
export const defaultMonsterLevelConfig: LevelConfig = {
  currentLevel: 1,
  currentExp: 0,
  expToNextLevel: 100,
  maxLevel: 100, // 기본 최대 레벨
  
  // 하위 호환성을 위한 기존 방식 (사용 안 함)
  hpPerLevel: 15,
  spPerLevel: 3,
  attackPerLevel: 4,
  defensePerLevel: 2,
  speedPerLevel: 1,
  
  // ax + b 공식
  hpGrowth: { a: 0, b: 15 },      // 레벨당 15씩 고정 증가
  spGrowth: { a: 0, b: 3 },       // 레벨당 3씩 고정 증가
  attackGrowth: { a: 0, b: 4 },   // 레벨당 4씩 고정 증가
  defenseGrowth: { a: 0, b: 2 },  // 레벨당 2씩 고정 증가
  speedGrowth: { a: 0, b: 1 },    // 레벨당 1씩 고정 증가
  
  // 경험치 공식 (지수형: 100 * 1.5^(level-1))
  expGrowth: { type: 'exponential', a: 100, b: 1.5 },
  
  // 새로운 구간별 경험치 시스템
  expGrowthConfig: {
    useBezier: false,
    segments: [
      { id: '1', startLevel: 1, endLevel: 10, formula: '100 * 1.5^(x-1)' },
      { id: '2', startLevel: 10, endLevel: 20, formula: '100 * 1.5^(x-1)' },
    ],
    bezierSegments: [
      {
        id: '1',
        startLevel: 1,
        endLevel: 10,
        startExp: 100,
        endExp: 1500,
        controlPoint1: { x: 0.33, y: 0.1 },
        controlPoint2: { x: 0.67, y: 0.9 },
      },
      {
        id: '2',
        startLevel: 10,
        endLevel: 20,
        startExp: 1500,
        endExp: 10000,
        controlPoint1: { x: 0.33, y: 0.1 },
        controlPoint2: { x: 0.67, y: 0.9 },
      },
    ]
  },
  
  baseHp: 80,
  baseSp: 30,
  baseAttack: 40,
  baseDefense: 15,
  baseSpeed: 60,
};

/**
 * 몬스터 처치 시 획득 경험치 계산
 */
export function calculateExpReward(monsterLevel: number): number {
  // 몬스터 레벨에 따라 경험치 증가
  // 레벨 1: 20 exp
  // 레벨 2: 30 exp
  // 레벨 5: 75 exp
  return Math.floor(20 * (1 + (monsterLevel - 1) * 0.5));
}

/**
 * 레벨 진행도 퍼센트
 */
export function getLevelProgress(config: LevelConfig): number {
  return (config.currentExp / config.expToNextLevel) * 100;
}

/**
 * 레벨별 능력치 테이블 생성
 */
export interface LevelStatsTableRow {
  level: number;
  hp: number;
  hpGrowth: number;
  sp: number;
  spGrowth: number;
  attack: number;
  attackGrowth: number;
  defense: number;
  defenseGrowth: number;
  speed: number;
  speedGrowth: number;
}

export function generateLevelStatsTable(
  config: LevelConfig,
  startLevel: number = 1,
  endLevel: number = 20
): LevelStatsTableRow[] {
  const table: LevelStatsTableRow[] = [];
  
  for (let level = startLevel; level <= endLevel; level++) {
    // 이전 레벨까지의 총 증가량 계산
    let totalHpGrowth = 0;
    let totalSpGrowth = 0;
    let totalAttackGrowth = 0;
    let totalDefenseGrowth = 0;
    let totalSpeedGrowth = 0;
    
    for (let i = 2; i <= level; i++) {
      totalHpGrowth += calculateStatGrowth(i, config.hpGrowth);
      totalSpGrowth += calculateStatGrowth(i, config.spGrowth);
      totalAttackGrowth += calculateStatGrowth(i, config.attackGrowth);
      totalDefenseGrowth += calculateStatGrowth(i, config.defenseGrowth);
      totalSpeedGrowth += calculateStatGrowth(i, config.speedGrowth);
    }
    
    // 현재 레벨의 증가량 (레벨 1은 증가량 없음)
    const currentHpGrowth = level > 1 ? calculateStatGrowth(level, config.hpGrowth) : 0;
    const currentSpGrowth = level > 1 ? calculateStatGrowth(level, config.spGrowth) : 0;
    const currentAttackGrowth = level > 1 ? calculateStatGrowth(level, config.attackGrowth) : 0;
    const currentDefenseGrowth = level > 1 ? calculateStatGrowth(level, config.defenseGrowth) : 0;
    const currentSpeedGrowth = level > 1 ? calculateStatGrowth(level, config.speedGrowth) : 0;
    
    table.push({
      level,
      hp: config.baseHp + totalHpGrowth,
      hpGrowth: currentHpGrowth,
      sp: config.baseSp + totalSpGrowth,
      spGrowth: currentSpGrowth,
      attack: config.baseAttack + totalAttackGrowth,
      attackGrowth: currentAttackGrowth,
      defense: config.baseDefense + totalDefenseGrowth,
      defenseGrowth: currentDefenseGrowth,
      speed: config.baseSpeed + totalSpeedGrowth,
      speedGrowth: currentSpeedGrowth,
    });
  }
  
  return table;
}

/**
 * 레벨별 경험치 그래프 데이터 생성 (레거시)
 */
export interface ExpChartData {
  level: number;
  exp: number;
  cumulativeExp: number;
}

export function generateExpChartData(
  expFormula: ExpGrowthFormula,
  startLevel: number = 1,
  endLevel: number = 20
): ExpChartData[] {
  const data: ExpChartData[] = [];
  let cumulative = 0;
  
  for (let level = startLevel; level <= endLevel; level++) {
    const exp = calculateExpForLevel(level, expFormula);
    cumulative += exp;
    
    data.push({
      level,
      exp,
      cumulativeExp: cumulative,
    });
  }
  
  return data;
}

/**
 * 구간별 경험치 그래프 데이터 생성
 */
export function generateExpChartDataWithSegments(
  config?: ExpGrowthConfig,
  startLevel: number = 1,
  endLevel: number = 20
): ExpChartData[] {
  const data: ExpChartData[] = [];
  let cumulative = 0;
  
  for (let level = startLevel; level <= endLevel; level++) {
    const exp = calculateExpForLevelWithSegments(level, config);
    cumulative += exp;
    
    data.push({
      level,
      exp,
      cumulativeExp: cumulative,
    });
  }
  
  return data;
}
