import { addExperience, type LevelConfig, type LevelStats } from '../../lib/levelSystem';
import type { CharacterTypeInfo } from '../../lib/characterTypes';
import { updateDataRowWithLevel } from '../../lib/levelBasedStats';
import { PLAYER_LEVEL_STAT_FIELDS, type DataRow, type PlayerLevelStatField } from '../../lib/mockData';

export type PlayerLevelRow = DataRow & Required<Pick<DataRow, PlayerLevelStatField>>;

type LevelRowResult =
  | { ok: true; row: PlayerLevelRow }
  | { ok: false; reason: string };

export function recalculateLegacyPlayerRows(
  rows: DataRow[],
  levelConfig: LevelConfig,
  characterTypes: CharacterTypeInfo[]
): { rows: DataRow[]; count: number } {
  let count = 0;
  const updatedRows = rows.map(row => {
    if (row.player_character_id?.trim() || row.player_level === undefined) return row;
    count++;
    const typeInfo = characterTypes.find(type => type.id === row.player_attack_type);
    return updateDataRowWithLevel(
      row, true, levelConfig, row.player_level || 1, row.player_size || 20, typeInfo
    );
  });
  return { rows: updatedRows, count };
}

function validStat(row: DataRow, field: PlayerLevelStatField): boolean {
  const value = row[field];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 &&
    (field !== 'player_hp' || value > 0);
}

function hasValidStats(row: DataRow): row is PlayerLevelRow {
  return PLAYER_LEVEL_STAT_FIELDS.every(field => validStat(row, field));
}

export function applyPlayerLevelRow(stats: LevelStats, row: PlayerLevelRow | null): LevelStats {
  if (!row) return stats;
  return {
    ...stats,
    hp: row.player_hp,
    sp: row.player_sp,
    attack: row.player_attack,
    defense: row.player_defense,
    speed: row.player_speed,
  };
}

export function findPlayerLevelRow(
  rows: DataRow[],
  characterId: string | undefined,
  level: number
): LevelRowResult {
  const id = characterId?.trim();
  if (!id) return { ok: false, reason: '캐릭터 ID가 없습니다.' };
  const matches = rows.filter(row => row.player_character_id?.trim() === id && row.player_level === level);
  if (matches.length === 0) return { ok: false, reason: `캐릭터 "${id}"의 레벨 ${level} 행이 없습니다.` };
  if (matches.length > 1) return { ok: false, reason: `캐릭터 "${id}"의 레벨 ${level} 행이 중복되었습니다.` };

  const row = matches[0];
  if (!hasValidStats(row)) {
    const field = PLAYER_LEVEL_STAT_FIELDS.find(key => !validStat(row, key));
    return { ok: false, reason: `캐릭터 "${id}"의 레벨 ${level} 행: "${field}" 값이 없거나 유효하지 않습니다.` };
  }
  return { ok: true, row };
}

export function addPlayerTableExperience(
  config: LevelConfig,
  expGained: number,
  rows: DataRow[],
  characterId: string | undefined
): {
  newConfig: LevelConfig;
  levelsGained: number;
  levelRow?: PlayerLevelRow;
  blockedReason?: string;
} {
  let levelRow: PlayerLevelRow | undefined;
  let blockedReason: string | undefined;
  const result = addExperience(config, expGained, nextLevel => {
    const match = findPlayerLevelRow(rows, characterId, nextLevel);
    if (!match.ok) {
      blockedReason = match.reason;
      return false;
    }
    levelRow = match.row;
    return true;
  });
  return { newConfig: result.newConfig, levelsGained: result.levelsGained, levelRow, blockedReason };
}
