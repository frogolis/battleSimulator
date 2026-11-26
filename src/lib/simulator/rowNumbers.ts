import type { DataRow } from '../mockData';

export function attackNumericFields(prefix: string): string[] {
  return ['range', 'width', 'damage', 'cooldown', 'sp_cost', 'cast_time'].map(
    suffix => `${prefix}_${suffix}`
  );
}

export function parseOptionalRowNumber(
  value: unknown
): { status: 'missing' } | { status: 'invalid' } | { status: 'valid'; value: number } {
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
    return { status: 'missing' };
  }
  const number =
    typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(number) ? { status: 'valid', value: number } : { status: 'invalid' };
}

export function normalizeOptionalRowNumbers(
  row: DataRow,
  fields: readonly string[]
): { ok: true; row: DataRow } | { ok: false; field: string } {
  const normalized = { ...row };
  for (const field of fields) {
    const result = parseOptionalRowNumber(Reflect.get(row, field));
    if (result.status === 'missing') {
      Reflect.deleteProperty(normalized, field);
      continue;
    }
    if (result.status === 'invalid') return { ok: false, field };
    Reflect.set(normalized, field, result.value);
  }
  return { ok: true, row: normalized };
}
