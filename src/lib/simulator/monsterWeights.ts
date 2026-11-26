import type { DataRow } from '../mockData';
import { parseOptionalRowNumber } from './rowNumbers';

export function readMonsterWeight(
  value: unknown
): { ok: true; weight: number } | { ok: false; reason: string } {
  const parsed = parseOptionalRowNumber(value);
  if (parsed.status === 'missing') return { ok: true, weight: 1 };
  if (parsed.status === 'invalid' || parsed.value < 0) {
    return { ok: false, reason: '가중치는 0 이상의 유한한 숫자여야 합니다.' };
  }
  return { ok: true, weight: parsed.value };
}

export function buildMonsterWeightPool(
  rows: readonly DataRow[]
):
  | { ok: true; weights: number[]; scaledWeights: number[]; scaledTotal: number; total: number }
  | { ok: false; reason: string } {
  const weights: number[] = [];
  for (const [index, row] of rows.entries()) {
    const result = readMonsterWeight(row.monster_spawn_weight);
    if (!result.ok) {
      return {
        ok: false,
        reason: `몬스터 "${row.monster_name || row.monster_definition_id || index}": ${result.reason}`,
      };
    }
    weights.push(result.weight);
  }
  const max = weights.reduce((largest, weight) => Math.max(largest, weight), 0);
  if (max === 0) {
    return { ok: false, reason: '선택된 몬스터 중 가중치가 0보다 큰 행이 없습니다.' };
  }
  const scaledWeights = weights.map(weight => weight / max);
  const scaledTotal = scaledWeights.reduce((sum, weight) => sum + weight, 0);
  return {
    ok: true,
    weights,
    scaledWeights,
    scaledTotal,
    total: weights.reduce((sum, weight) => sum + weight, 0),
  };
}

export function selectWeightedMonster(
  rows: readonly DataRow[],
  pool: Extract<ReturnType<typeof buildMonsterWeightPool>, { ok: true }>,
  random: number
): DataRow {
  if (
    !Number.isFinite(random) ||
    random < 0 ||
    random >= 1 ||
    rows.length !== pool.weights.length
  ) {
    throw new RangeError('Weighted selection requires a random value in [0, 1) and matching rows.');
  }
  let target = random * pool.scaledTotal;
  for (const [index, weight] of pool.scaledWeights.entries()) {
    if (weight === 0) continue;
    if (target < weight) return rows[index];
    target -= weight;
  }
  for (let index = pool.weights.length - 1; index >= 0; index--) {
    if (pool.weights[index] > 0) return rows[index];
  }
  throw new Error('Weighted selection requires a positive weight.');
}
