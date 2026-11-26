import type { DataRow } from '../mockData';
import type { CharacterTypeInfo } from '../characterTypes';
import type { LevelConfig } from '../levelSystem';
import { getLevelRecalculationInputs, updateDataRowWithLevel } from '../levelBasedStats';
import { attackNumericFields, normalizeOptionalRowNumbers } from './rowNumbers';
import { buildMonsterWeightPool } from './monsterWeights';

export const MONSTER_STAT_FIELDS = [
  'monster_hp',
  'monster_sp',
  'monster_attack',
  'monster_defense',
  'monster_speed',
  'monster_attack_speed',
  'monster_accuracy',
  'monster_critical_rate',
] as const;

export type MonsterStatField = (typeof MONSTER_STAT_FIELDS)[number];
export type MonsterStatsRow = DataRow & Required<Pick<DataRow, MonsterStatField>>;

export function recalculateMonsterRows(
  rows: DataRow[],
  levelConfig: LevelConfig,
  characterTypes: CharacterTypeInfo[]
): { rows: DataRow[]; count: number; skipped: Array<{ index: number; field: string }> } {
  let count = 0;
  const skipped: Array<{ index: number; field: string }> = [];
  const updatedRows = rows.map((row, index) => {
    if (row.monster_level === undefined) return row;
    const inputs = getLevelRecalculationInputs(row, 'monster');
    if (!inputs.ok) {
      skipped.push({ index, field: inputs.field });
      return row;
    }
    count++;
    const typeInfo = characterTypes.find(type => type.id === row.monster_attack_type);
    return updateDataRowWithLevel(
      row, false, levelConfig, inputs.level || 1, inputs.size || 24, typeInfo
    );
  });
  return { rows: updatedRows, count, skipped };
}

export function parseMonsterStatInput(input: string): number | undefined {
  if (!input.trim()) return undefined;
  const value = Number(input);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function validStat(row: DataRow, field: MonsterStatField): boolean {
  const value = row[field];
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function hasValidStats(row: DataRow): row is MonsterStatsRow {
  return MONSTER_STAT_FIELDS.every(field => validStat(row, field));
}

export function validateMonsterStats(row: DataRow | undefined):
  | { ok: true; row: MonsterStatsRow }
  | { ok: false; reason: string } {
  if (!row) return { ok: false, reason: '몬스터 데이터 행이 없습니다.' };
  if (hasValidStats(row)) return { ok: true, row };
  const invalid = MONSTER_STAT_FIELDS.find(field => !validStat(row, field));
  return { ok: false, reason: `"${invalid}" 값은 0보다 큰 유한한 숫자여야 합니다.` };
}

export function prepareMonsterCombatRow(
  row: DataRow
): { ok: true; row: DataRow } | { ok: false; reason: string } {
  const prefixes = ['monster_basic_attack'];
  for (const slot of [1, 2, 3, 4] as const) {
    if (row[`monster_skill_${slot}_id`]) prefixes.push(`monster_skill_${slot}`);
  }
  const result = normalizeOptionalRowNumbers(row, prefixes.flatMap(attackNumericFields));
  if (!result.ok) {
    return { ok: false, reason: `"${result.field}" 값은 유한한 숫자여야 합니다.` };
  }
  return result;
}

export function validateMonsterSpawnRows(
  dataset: DataRow[],
  selectedRows: ReadonlySet<string>,
  currentTick: number,
  weightedSelection = false
): string | undefined {
  if (selectedRows.size) {
    const indexById = new Map<string, number>();
    const duplicateIds = new Set<string>();
    dataset.forEach((row, index) => {
      const id = row.monster_definition_id;
      if (!id) return;
      if (indexById.has(id)) duplicateIds.add(id);
      else indexById.set(id, index);
    });

    const indices: number[] = [];
    for (const id of selectedRows) {
      if (duplicateIds.has(id)) return `몬스터 ID "${id}"가 중복되었습니다.`;
      const index = indexById.get(id);
      if (index === undefined) return `몬스터 ID "${id}"를 찾을 수 없습니다.`;
      indices.push(index);
    }
    const pool = weightedSelection
      ? buildMonsterWeightPool(indices.map(index => dataset[index]))
      : undefined;
    if (pool && !pool.ok) return pool.reason;
    for (const [position, index] of indices.entries()) {
      if (pool?.ok && pool.weights[position] === 0) continue;
      const result = validateMonsterStats(dataset[index]);
      if (!result.ok) return `몬스터 행 ${index}: ${result.reason}`;
      const combat = prepareMonsterCombatRow(result.row);
      if (!combat.ok) return `몬스터 행 ${index}: ${combat.reason}`;
    }
    return undefined;
  }

  const indices = [currentTick];
  for (const index of indices) {
    const result = validateMonsterStats(dataset[index]);
    if (!result.ok) return `몬스터 행 ${index}: ${result.reason}`;
    const combat = prepareMonsterCombatRow(result.row);
    if (!combat.ok) return `몬스터 행 ${index}: ${combat.reason}`;
  }
  return undefined;
}
