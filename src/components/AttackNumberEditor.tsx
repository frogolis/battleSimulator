import type { DataRow } from '../lib/mockData';
import { parseOptionalRowNumber } from '../lib/simulator/rowNumbers';
import { Button } from './ui/button';

type AttackNumbers = {
  range: number;
  width: number;
  damage: number;
  cooldown: number;
  spCost: number;
  castTime: number;
};

const suffixes = [
  ['range', 'range'],
  ['width', 'width'],
  ['damage', 'damage'],
  ['cooldown', 'cooldown'],
  ['spCost', 'sp_cost'],
  ['castTime', 'cast_time'],
] as const;

export function getAttackEditorNumbers(row: DataRow, prefix: string, defaults: AttackNumbers) {
  const numbers = { ...defaults };
  const invalidFields: string[] = [];
  for (const [key, suffix] of suffixes) {
    const field = `${prefix}_${suffix}`;
    const result = parseOptionalRowNumber(Reflect.get(row, field));
    if (result.status === 'invalid') {
      invalidFields.push(field);
      numbers[key] = 0;
    } else if (result.status === 'valid') {
      numbers[key] = result.value;
    }
  }
  return { numbers, invalidFields };
}

export function AttackNumberWarning({
  fields,
  onFix,
}: {
  fields: string[];
  onFix: (field: string) => void;
}) {
  if (!fields.length) return null;
  return (
    <div role='alert' className='space-y-1 text-xs text-destructive'>
      <p>잘못된 숫자는 임시로 0에 표시됩니다. 수정하기 전까지 원본 값은 유지됩니다.</p>
      {fields.map(field => (
        <div key={field} className='flex items-center justify-between gap-2'>
          <span>{field}</span>
          <Button
            type='button'
            size='sm'
            variant='outline'
            aria-label={`${field} 0으로 수정`}
            onClick={() => onFix(field)}
          >
            0으로 수정
          </Button>
        </div>
      ))}
    </div>
  );
}
