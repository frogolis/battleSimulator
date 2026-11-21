export const DATA_EXPORT_FILENAME_PREFIX = 'game-data';

export const DATA_WORKBOOK_SHEETS = {
  CHARACTER_TYPES: 'Character Types',
  MONSTER_TYPES: 'Monster Types',
  SKILLS: 'Skills',
  ITEMS: 'Items',
  PLAYER_DATASET: 'Player Dataset',
  MONSTER_DATASET: 'Monster Dataset',
  PLAYER_LEVEL_CONFIG: 'Player Level Config',
  MONSTER_LEVEL_CONFIG: 'Monster Level Config',
  PLAYER_BASIC_ATTACK: 'Player Basic Attack',
  MONSTER_BASIC_ATTACK: 'Monster Basic Attack',
  PLAYER_CONFIG: 'Player Config',
  MONSTER_CONFIG: 'Monster Config',
} as const;

export const DATA_WORKBOOK_SHEET_LABELS = [
  'Character Types (캐릭터 타입)',
  'Monster Types (몬스터 타입 - AI 패턴 포함)',
  'Skills (스킬 시스템 설정)',
  'Items (아이템 시스템 설정)',
  'Player Dataset (플레이어 데이터셋)',
  'Monster Dataset (몬스터 데이터셋)',
  'Player Level Config (플레이어 레벨 설정)',
  'Monster Level Config (몬스터 레벨 설정)',
  'Player Basic Attack (플레이어 기본 공격)',
  'Monster Basic Attack (몬스터 기본 공격)',
  'Player Config (플레이어 스탯 포뮬러)',
  'Monster Config (몬스터 스탯 포뮬러)',
] as const;
