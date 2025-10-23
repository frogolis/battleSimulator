export interface DataRow {
  t: number;
  x: number;
  y: number;
  speed: number;
  dir: number;
  is_attack: number;
  is_miss: number;
  is_crit: number;
  
  // Player config fields
  // 독립 변수 (사용자가 직접 설정)
  player_level?: number;
  player_size?: number;
  
  // 종속 변수 (레벨에 의해 자동 계산)
  player_hp?: number;
  player_sp?: number;
  player_speed?: number;
  player_attack?: number;
  player_defense?: number;
  player_attack_speed?: number;
  player_accuracy?: number;
  player_critical_rate?: number;
  player_attack_range?: number;
  player_attack_width?: number;
  player_attack_type?: string;
  
  // 기본 공격 (마우스 클릭 공격)
  player_basic_attack_id?: string;
  player_basic_attack_range?: number;
  player_basic_attack_width?: number;
  player_basic_attack_damage?: number;
  player_basic_attack_cooldown?: number;
  player_basic_attack_sp_cost?: number;
  player_basic_attack_cast_time?: number;
  
  // 스킬 슬롯 정보 (4개의 스킬 슬롯)
  // 스킬 슬롯 1
  player_skill_1_id?: string;
  player_skill_1_range?: number;
  player_skill_1_width?: number;
  player_skill_1_damage?: number;
  player_skill_1_cooldown?: number;
  player_skill_1_sp_cost?: number;
  player_skill_1_cast_time?: number;
  
  // 스킬 슬롯 2
  player_skill_2_id?: string;
  player_skill_2_range?: number;
  player_skill_2_width?: number;
  player_skill_2_damage?: number;
  player_skill_2_cooldown?: number;
  player_skill_2_sp_cost?: number;
  player_skill_2_cast_time?: number;
  
  // 스킬 슬롯 3
  player_skill_3_id?: string;
  player_skill_3_range?: number;
  player_skill_3_width?: number;
  player_skill_3_damage?: number;
  player_skill_3_cooldown?: number;
  player_skill_3_sp_cost?: number;
  player_skill_3_cast_time?: number;
  
  // 스킬 슬롯 4
  player_skill_4_id?: string;
  player_skill_4_range?: number;
  player_skill_4_width?: number;
  player_skill_4_damage?: number;
  player_skill_4_cooldown?: number;
  player_skill_4_sp_cost?: number;
  player_skill_4_cast_time?: number;
  
  // Monster config fields
  // 독립 변수
  monster_level?: number;
  monster_size?: number;
  
  // 종속 변수
  monster_hp?: number;
  monster_sp?: number;
  monster_speed?: number;
  monster_attack?: number;
  monster_defense?: number;
  monster_attack_speed?: number;
  monster_accuracy?: number;
  monster_critical_rate?: number;
  monster_attack_range?: number;
  monster_attack_width?: number;
  monster_attack_type?: string;
  
  // 몬스터 외형/이름 정보
  monster_name?: string;
  monster_color?: string;
  monster_spawn_weight?: number; // 리스폰 가중치 (1:다 시뮬레이터용)
  
  // 몬스터 AI 설정 (레거시)
  monster_ai_type?: string; // 'aggressive' | 'defensive' | 'balanced' | 'passive' (deprecated)
  monster_ai_aggro_range?: number; // 어그로 범위 (deprecated)
  monster_ai_skill_priority?: string; // 'damage' | 'control' | 'survival' | 'balanced' (deprecated)
  
  // 몬스터 AI 패턴 (새 시스템)
  monster_ai_patterns?: string; // JSON 문자열 형태의 AIPatternConfig
  
  // 기본 공격 (마우스 클릭 공격 / AI 기본 공격)
  monster_basic_attack_id?: string;
  monster_basic_attack_range?: number;
  monster_basic_attack_width?: number;
  monster_basic_attack_damage?: number;
  monster_basic_attack_cooldown?: number;
  monster_basic_attack_sp_cost?: number;
  monster_basic_attack_cast_time?: number;
  
  // 스킬 슬롯 정보 (4개의 스킬 슬롯)
  // 스킬 슬롯 1
  monster_skill_1_id?: string;
  monster_skill_1_range?: number;
  monster_skill_1_width?: number;
  monster_skill_1_damage?: number;
  monster_skill_1_cooldown?: number;
  monster_skill_1_sp_cost?: number;
  monster_skill_1_cast_time?: number;
  
  // 스킬 슬롯 2
  monster_skill_2_id?: string;
  monster_skill_2_range?: number;
  monster_skill_2_width?: number;
  monster_skill_2_damage?: number;
  monster_skill_2_cooldown?: number;
  monster_skill_2_sp_cost?: number;
  monster_skill_2_cast_time?: number;
  
  // 스킬 슬롯 3
  monster_skill_3_id?: string;
  monster_skill_3_range?: number;
  monster_skill_3_width?: number;
  monster_skill_3_damage?: number;
  monster_skill_3_cooldown?: number;
  monster_skill_3_sp_cost?: number;
  monster_skill_3_cast_time?: number;
  
  // 스킬 슬롯 4
  monster_skill_4_id?: string;
  monster_skill_4_range?: number;
  monster_skill_4_width?: number;
  monster_skill_4_damage?: number;
  monster_skill_4_cooldown?: number;
  monster_skill_4_sp_cost?: number;
  monster_skill_4_cast_time?: number;
}

import { calculatePlayerStats, calculateMonsterStats, calculateStatsWithFormula } from './levelBasedStats';
import { defaultPlayerLevelConfig, defaultMonsterLevelConfig } from './levelSystem';
import { defaultAIPatternConfig } from './monsterAI';
import { DEFAULT_CHARACTER_TYPES } from './characterTypes';

// 첫 번째 타입 가져오기
const firstType = DEFAULT_CHARACTER_TYPES[0];

// 레벨 1 플레이어 스탯 계산 (첫 번째 타입의 기본값 사용)
const playerStats = calculateStatsWithFormula(
  firstType?.defaultLevel || 1, 
  firstType?.defaultSize || 20, 
  defaultPlayerLevelConfig,
  firstType,
  true
);

// 레벨 1 몬스터 스탯 계산 (첫 번째 타입의 기본값 사용)
const monsterStats = calculateStatsWithFormula(
  firstType?.defaultLevel || 1,
  firstType?.defaultSize || 24,
  defaultMonsterLevelConfig,
  firstType,
  false
);

// Initial empty dataset with one example row
export const mockDataset: DataRow[] = [
  {
    t: 0,
    x: 300,
    y: 200,
    speed: playerStats.speed,
    dir: 0,
    is_attack: 0,
    is_miss: 0,
    is_crit: 0,
    // 플레이어 - 독립 변수
    player_level: playerStats.level,
    player_size: playerStats.size,
    // 플레이어 - 종속 변수 (레벨로부터 자동 계산됨)
    player_hp: playerStats.hp,
    player_sp: playerStats.sp,
    player_speed: playerStats.speed,
    player_attack: playerStats.attack,
    player_defense: playerStats.defense,
    player_attack_speed: playerStats.attackSpeed,
    player_accuracy: playerStats.accuracy,
    player_critical_rate: playerStats.criticalRate,
    player_attack_range: 75,
    player_attack_width: 90,
    player_attack_type: firstType?.id || 'warrior',
    // 기본 공격
    player_basic_attack_id: firstType?.defaultBasicAttackId || 'meleeBasic',
    player_basic_attack_range: 75,
    player_basic_attack_width: 90,
    player_basic_attack_damage: 1.0,
    player_basic_attack_cooldown: 1000,
    player_basic_attack_sp_cost: 0,
    player_basic_attack_cast_time: 300,
    // 스킬 슬롯 1 (강타)
    player_skill_1_id: 'powerSlash',
    player_skill_1_range: 100,
    player_skill_1_width: 120,
    player_skill_1_damage: 1.5,
    player_skill_1_cooldown: 3000,
    player_skill_1_sp_cost: 20,
    player_skill_1_cast_time: 500,
    // 스킬 슬롯 2 (회오리 베기)
    player_skill_2_id: 'whirlwind',
    player_skill_2_range: 150,
    player_skill_2_width: 360,
    player_skill_2_damage: 0.8,
    player_skill_2_cooldown: 5000,
    player_skill_2_sp_cost: 30,
    player_skill_2_cast_time: 800,
    // 스킬 슬롯 3 (치유)
    player_skill_3_id: 'heal',
    player_skill_3_range: 0,
    player_skill_3_width: 0,
    player_skill_3_damage: 0,
    player_skill_3_cooldown: 10000,
    player_skill_3_sp_cost: 40,
    player_skill_3_cast_time: 1000,
    // 스킬 슬롯 4 (전투 강화)
    player_skill_4_id: 'powerBuff',
    player_skill_4_range: 0,
    player_skill_4_width: 0,
    player_skill_4_damage: 0,
    player_skill_4_cooldown: 15000,
    player_skill_4_sp_cost: 50,
    player_skill_4_cast_time: 500,
    // 몬스터 - 독립 변수
    monster_level: monsterStats.level,
    monster_size: monsterStats.size,
    // 몬스터 - 종속 변수 (레벨로부터 자동 계산됨)
    monster_hp: monsterStats.hp,
    monster_sp: monsterStats.sp,
    monster_speed: monsterStats.speed,
    monster_attack: monsterStats.attack,
    monster_defense: monsterStats.defense,
    monster_attack_speed: monsterStats.attackSpeed,
    monster_accuracy: monsterStats.accuracy,
    monster_critical_rate: monsterStats.criticalRate,
    monster_attack_range: 75,
    monster_attack_width: 90,
    monster_attack_type: firstType?.id || 'warrior',
    // 기본 공격
    monster_basic_attack_id: firstType?.defaultBasicAttackId || 'meleeBasic',
    monster_basic_attack_range: 75,
    monster_basic_attack_width: 90,
    monster_basic_attack_damage: 1.0,
    monster_basic_attack_cooldown: 1000,
    monster_basic_attack_sp_cost: 0,
    monster_basic_attack_cast_time: 300,
    // 몬스터 AI 설정
    monster_ai_type: 'aggressive',
    monster_ai_aggro_range: 300,
    monster_ai_skill_priority: 'damage',
    monster_ai_patterns: JSON.stringify(defaultAIPatternConfig),
    // 스킬 슬롯 1 (강타)
    monster_skill_1_id: 'powerSlash',
    monster_skill_1_range: 100,
    monster_skill_1_width: 120,
    monster_skill_1_damage: 1.5,
    monster_skill_1_cooldown: 3000,
    monster_skill_1_sp_cost: 20,
    monster_skill_1_cast_time: 500,
    // 스킬 슬롯 2 (회오리 베기)
    monster_skill_2_id: 'whirlwind',
    monster_skill_2_range: 150,
    monster_skill_2_width: 360,
    monster_skill_2_damage: 0.8,
    monster_skill_2_cooldown: 5000,
    monster_skill_2_sp_cost: 30,
    monster_skill_2_cast_time: 800,
    // 스킬 슬롯 3 (치유)
    monster_skill_3_id: 'heal',
    monster_skill_3_range: 0,
    monster_skill_3_width: 0,
    monster_skill_3_damage: 0,
    monster_skill_3_cooldown: 10000,
    monster_skill_3_sp_cost: 40,
    monster_skill_3_cast_time: 1000,
    // 스킬 슬롯 4 (전투 강화)
    monster_skill_4_id: 'powerBuff',
    monster_skill_4_range: 0,
    monster_skill_4_width: 0,
    monster_skill_4_damage: 0,
    monster_skill_4_cooldown: 15000,
    monster_skill_4_sp_cost: 50,
    monster_skill_4_cast_time: 500,
  }
];

export { mockDataset as default };
