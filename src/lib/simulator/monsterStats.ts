import type { DataRow } from '../mockData';

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

export function validateMonsterSpawnRows(
  dataset: DataRow[],
  selectedRows: ReadonlySet<string>,
  currentTick: number
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

    for (const id of selectedRows) {
      if (duplicateIds.has(id)) return `몬스터 ID "${id}"가 중복되었습니다.`;
      const index = indexById.get(id);
      if (index === undefined) return `몬스터 ID "${id}"를 찾을 수 없습니다.`;
      const result = validateMonsterStats(dataset[index]);
      if (!result.ok) return `몬스터 행 ${index}: ${result.reason}`;
    }
    return undefined;
  }

  const indices = [currentTick];
  for (const index of indices) {
    const result = validateMonsterStats(dataset[index]);
    if (!result.ok) return `몬스터 행 ${index}: ${result.reason}`;
  }
  return undefined;
}
