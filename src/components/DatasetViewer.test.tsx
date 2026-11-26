import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHARACTER_TYPES } from '../lib/characterTypes';
import { defaultMonsterLevelConfig, defaultPlayerLevelConfig } from '../lib/levelSystem';
import { mockDataset, type DataRow } from '../lib/mockData';
import type { StageDefinition } from '../lib/simulator/waves';
import { MonsterDatasetViewer } from './MonsterDatasetViewer';
import { PlayerDatasetViewer } from './PlayerDatasetViewer';

const mocks = vi.hoisted(() => ({
  deleteHandlers: [] as Array<() => void>,
  error: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  applyHandlers: {} as Record<string, () => void>,
  fixHandlers: {} as Record<string, () => void>,
  sliderHandlers: {} as Record<string, (value: number[]) => void>,
}));

vi.mock('sonner', () => ({
  toast: { error: mocks.error, info: mocks.info, success: mocks.success, warning: mocks.warning },
}));
vi.mock('./ui/button', () => ({
  Button: ({
    children,
    onClick,
    'aria-label': label,
  }: {
    children: ReactNode;
    onClick?: () => void;
    'aria-label'?: string;
  }) => {
    if (label === '몬스터 행 삭제' && onClick) mocks.deleteHandlers.push(onClick);
    if (label?.endsWith('행 불러오기') && onClick) mocks.applyHandlers[label] = onClick;
    if (label?.endsWith('0으로 수정') && onClick) mocks.fixHandlers[label] = onClick;
    return <button aria-label={label}>{children}</button>;
  },
}));

vi.mock('./ui/popover', () => ({
  Popover: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: ReactNode }) => (
    <section data-test-popover>{children}</section>
  ),
}));

vi.mock('./ui/slider', () => ({
  Slider: ({
    value,
    min = 0,
    onValueChange,
    'aria-label': label,
  }: {
    value: number[];
    min?: number;
    onValueChange?: (value: number[]) => void;
    'aria-label'?: string;
  }) => {
    if (label && onValueChange) mocks.sliderHandlers[label] = onValueChange;
    return <span data-slider-value={value[0]} data-slider-min={min} />;
  },
}));

const config = {
  size: { min: 20, max: 20 },
  speed: { min: 1, max: 1 },
  attack: { min: 1, max: 1 },
  defense: { min: 1, max: 1 },
  attackSpeed: { min: 1, max: 1 },
  accuracy: { min: 1, max: 1 },
  criticalRate: { min: 1, max: 1 },
  attackRange: { min: 1, max: 1 },
  attackWidth: { min: 1, max: 1 },
  typeId: 'warrior',
};

function slidersInPopover(html: string, title: string) {
  const popovers = html.match(/<section data-test-popover="true">[\s\S]*?<\/section>/g) ?? [];
  const popover = popovers.find(content => content.includes(title));
  if (!popover) throw new Error(`Popover not found: ${title}`);
  return [...popover.matchAll(/data-slider-value="([^"]*)" data-slider-min="([^"]*)"/g)].map(
    match => ({ value: Number(match[1]), min: Number(match[2]) })
  );
}

function renderEditor(owner: 'player' | 'monster', row: DataRow) {
  const common = {
    dataset: [row],
    setDataset: vi.fn(),
    currentTick: 0,
    setCurrentTick: vi.fn(),
    characterTypes: DEFAULT_CHARACTER_TYPES,
  };
  return renderToStaticMarkup(
    owner === 'player' ? (
      <PlayerDatasetViewer
        {...common}
        playerConfig={config}
        playerLevelConfig={defaultPlayerLevelConfig}
      />
    ) : (
      <MonsterDatasetViewer {...common} monsterConfig={config} stageDefinitions={[]} />
    )
  );
}

describe('dataset skill editors', () => {
  it.each(['player', 'monster'] as const)(
    'shows invalid %s attack values without mutating them and permits an explicit repair',
    owner => {
      const row = { ...mockDataset[0] };
      Object.assign(row, {
        [`${owner}_basic_attack_damage`]: 'broken',
        [`${owner}_basic_attack_range`]: '12.5',
        [`${owner}_skill_1_width`]: 'Infinity',
        [`${owner}_skill_1_sp_cost`]: true,
      });
      const setDataset = vi.fn();
      const common = {
        dataset: [row],
        setDataset,
        currentTick: 0,
        setCurrentTick: vi.fn(),
        characterTypes: DEFAULT_CHARACTER_TYPES,
      };
      const html = renderToStaticMarkup(
        owner === 'player' ? (
          <PlayerDatasetViewer
            {...common}
            playerConfig={config}
            playerLevelConfig={defaultPlayerLevelConfig}
          />
        ) : (
          <MonsterDatasetViewer {...common} monsterConfig={config} stageDefinitions={[]} />
        )
      );
      expect(html).toContain(`${owner}_basic_attack_damage`);
      expect(html).toContain(`${owner}_skill_1_width`);
      expect(html).toContain(`${owner}_skill_1_sp_cost`);
      expect(html).toContain('잘못된 숫자는 임시로 0에 표시됩니다');
      expect(slidersInPopover(html, '기본 공격</span>')[0].value).toBe(12.5);
      expect(slidersInPopover(html, '기본 공격</span>')[2].value).toBe(0);
      const skillTitle = owner === 'player' ? '스킬 슬롯 1</span>' : '스킬 1 설정</span>';
      expect(slidersInPopover(html, skillTitle)[1].value).toBe(0);
      expect(setDataset).not.toHaveBeenCalled();
      expect(Reflect.get(row, `${owner}_basic_attack_damage`)).toBe('broken');

      const handler = mocks.fixHandlers[`${owner}_basic_attack_damage 0으로 수정`];
      expect(handler).toBeTypeOf('function');
      handler();
      expect(setDataset).toHaveBeenCalledWith([{ ...row, [`${owner}_basic_attack_damage`]: 0 }]);
      expect(Reflect.get(row, `${owner}_basic_attack_damage`)).toBe('broken');
      expect(Reflect.get(row, `${owner}_skill_1_width`)).toBe('Infinity');
    }
  );

  it.each(['player', 'monster'] as const)(
    'shows zero and allows selecting zero in %s basic attack and skill sliders',
    owner => {
      const row = { ...mockDataset[0] };
      for (const prefix of [`${owner}_basic_attack`, `${owner}_skill_1`]) {
        Object.assign(
          row,
          Object.fromEntries(
            ['range', 'width', 'damage', 'cooldown', 'sp_cost', 'cast_time'].map(field => [
              `${prefix}_${field}`,
              0,
            ])
          )
        );
      }

      const html = renderEditor(owner, row);
      const skillTitle = owner === 'player' ? '스킬 슬롯 1</span>' : '스킬 1 설정</span>';
      for (const title of ['기본 공격</span>', skillTitle]) {
        expect(slidersInPopover(html, title)).toEqual(
          Array.from({ length: 6 }, () => ({ value: 0, min: 0 }))
        );
      }
    }
  );

  it.each(['player', 'monster'] as const)(
    'keeps existing defaults for missing %s basic attack values',
    owner => {
      const row = { ...mockDataset[0] };
      for (const field of ['range', 'width', 'damage', 'cooldown', 'sp_cost', 'cast_time']) {
        Object.assign(row, { [`${owner}_basic_attack_${field}`]: undefined });
      }

      expect(slidersInPopover(renderEditor(owner, row), '기본 공격</span>')).toEqual(
        [100, 120, 10, 10, 0, 30].map(value => ({ value, min: 0 }))
      );
    }
  );
});

describe('monster spawn weight editor', () => {
  it('displays zero and default weights with their selection probabilities', () => {
    const zero = { ...mockDataset[0], monster_definition_id: 'zero', monster_name: 'zero', monster_spawn_weight: 0 };
    const blank = { ...mockDataset[0], monster_definition_id: 'blank', monster_name: 'blank' };
    Object.assign(blank, { monster_spawn_weight: ' ' });
    const html = renderToStaticMarkup(
      <MonsterDatasetViewer
        dataset={[zero, blank]} setDataset={vi.fn()} currentTick={0} setCurrentTick={vi.fn()}
        monsterConfig={config} characterTypes={DEFAULT_CHARACTER_TYPES} stageDefinitions={[]}
        selectedRows={new Set(['zero', 'blank'])}
      />
    );
    expect(html).toContain('0.0%');
    expect(html).toContain('100.0%');
    expect(html).toContain('data-slider-value="0" data-slider-min="0"');
    expect(html).toContain('data-slider-value="1" data-slider-min="0"');
  });

  it('warns for invalid weights and permits explicit repair without changing the original', () => {
    const row = { ...mockDataset[0], monster_definition_id: 'bad' };
    Object.assign(row, { monster_spawn_weight: -1 });
    const setDataset = vi.fn();
    const html = renderToStaticMarkup(
      <MonsterDatasetViewer
        dataset={[row]} setDataset={setDataset} currentTick={0} setCurrentTick={vi.fn()}
        monsterConfig={config} characterTypes={DEFAULT_CHARACTER_TYPES} stageDefinitions={[]}
        selectedRows={new Set(['bad'])}
      />
    );
    expect(html).toContain('가중치는 0 이상의 유한한 숫자');
    expect(setDataset).not.toHaveBeenCalled();
    mocks.fixHandlers['몬스터 행 0 가중치 0으로 수정']();
    expect(setDataset).toHaveBeenCalledWith([{ ...row, monster_spawn_weight: 0 }]);
    expect(row.monster_spawn_weight).toBe(-1);
  });

  it('reports that an all-zero selection cannot be spawned', () => {
    const row = { ...mockDataset[0], monster_definition_id: 'zero', monster_spawn_weight: 0 };
    const html = renderToStaticMarkup(
      <MonsterDatasetViewer
        dataset={[row]} setDataset={vi.fn()} currentTick={0} setCurrentTick={vi.fn()}
        monsterConfig={config} characterTypes={DEFAULT_CHARACTER_TYPES} stageDefinitions={[]}
        selectedRows={new Set(['zero'])}
      />
    );
    expect(html).toContain('가중치가 0보다 큰 행이 없습니다');
  });
});

describe('dataset row application', () => {
  it.each(['player', 'monster'] as const)(
    'reports success only when the %s row was applied',
    owner => {
      mocks.success.mockClear();
      const onApplyRow = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
      const props = {
        dataset: [mockDataset[0]],
        setDataset: vi.fn(),
        currentTick: 0,
        setCurrentTick: vi.fn(),
        characterTypes: DEFAULT_CHARACTER_TYPES,
        onApplyRow,
      };
      renderToStaticMarkup(
        owner === 'player' ? (
          <PlayerDatasetViewer
            {...props}
            playerConfig={config}
            playerLevelConfig={defaultPlayerLevelConfig}
          />
        ) : (
          <MonsterDatasetViewer {...props} monsterConfig={config} stageDefinitions={[]} />
        )
      );
      const handler =
        mocks.applyHandlers[`${owner === 'player' ? '플레이어' : '몬스터'} 행 불러오기`];
      expect(handler).toBeTypeOf('function');
      handler();
      expect(mocks.success).not.toHaveBeenCalled();
      handler();
      expect(mocks.success).toHaveBeenCalledOnce();
    }
  );
});

describe('dataset level recalculation', () => {
  it.each(['player', 'monster'] as const)(
    'preserves %s stats until both level and size are valid',
    owner => {
      mocks.warning.mockClear();
      const source = { ...mockDataset[0], player_character_id: undefined };
      Object.assign(source, {
        [`${owner}_level`]: 'bad-level',
        [`${owner}_size`]: 'bad-size',
        [`${owner}_hp`]: 9876,
      });
      const setDataset = vi.fn();
      const render = (row: DataRow) => {
        const common = {
          dataset: [row],
          setDataset,
          currentTick: 0,
          setCurrentTick: vi.fn(),
          characterTypes: DEFAULT_CHARACTER_TYPES,
        };
        renderToStaticMarkup(
          owner === 'player' ? (
            <PlayerDatasetViewer
              {...common}
              playerConfig={config}
              playerLevelConfig={defaultPlayerLevelConfig}
            />
          ) : (
            <MonsterDatasetViewer
              {...common}
              monsterConfig={config}
              monsterLevelConfig={defaultMonsterLevelConfig}
              stageDefinitions={[]}
            />
          )
        );
      };
      render(source);
      const label = owner === 'player' ? '플레이어' : '몬스터';
      mocks.sliderHandlers[`${label} 행 0 ${owner}_level`]([2]);
      const partiallyFixed = setDataset.mock.lastCall?.[0][0];
      expect(partiallyFixed).toMatchObject({
        [`${owner}_level`]: 2,
        [`${owner}_size`]: 'bad-size',
        [`${owner}_hp`]: 9876,
      });
      expect(mocks.warning).toHaveBeenCalledWith(expect.stringContaining(`${owner}_size`));
      expect(Reflect.get(source, `${owner}_level`)).toBe('bad-level');
      render(partiallyFixed);
      mocks.sliderHandlers[`${label} 행 0 ${owner}_size`]([24]);
      const fixed = setDataset.mock.lastCall?.[0][0];
      expect(fixed).toMatchObject({ [`${owner}_level`]: 2, [`${owner}_size`]: 24 });
      expect(Reflect.get(fixed, `${owner}_hp`)).not.toBe(9876);
    }
  );
});

describe('monster dataset deletion', () => {
  const rows = [
    { ...mockDataset[0], monster_definition_id: 'guard' },
    { ...mockDataset[0], monster_definition_id: 'archer' },
  ];
  const stages: StageDefinition[] = [
    {
      id: 'stage-1',
      name: '초원',
      waves: [
        {
          id: 'wave-1',
          durationMs: 0,
          respawn: { enabled: false, delayMs: 0 },
          monsterSpawns: [],
        },
      ],
    },
    {
      id: 'stage-2',
      name: '숲',
      waves: [
        {
          id: 'wave-2',
          durationMs: 0,
          respawn: { enabled: false, delayMs: 0 },
          monsterSpawns: [],
        },
        {
          id: 'wave-3',
          durationMs: 0,
          respawn: { enabled: false, delayMs: 0 },
          monsterSpawns: [{ monsterDefinitionId: 'guard', count: 0 }],
        },
      ],
    },
  ];

  function renderMonsterRows() {
    mocks.deleteHandlers.length = 0;
    mocks.error.mockClear();
    mocks.info.mockClear();
    const setDataset = vi.fn();
    const setCurrentTick = vi.fn();
    const onSelectedRowsChange = vi.fn();
    renderToStaticMarkup(
      <MonsterDatasetViewer
        dataset={rows}
        setDataset={setDataset}
        currentTick={1}
        setCurrentTick={setCurrentTick}
        monsterConfig={config}
        characterTypes={DEFAULT_CHARACTER_TYPES}
        stageDefinitions={stages}
        selectedRows={new Set(['guard', 'archer'])}
        onSelectedRowsChange={onSelectedRowsChange}
      />
    );
    expect(mocks.deleteHandlers).toHaveLength(2);
    return { setDataset, setCurrentTick, onSelectedRowsChange };
  }

  it('blocks deletion of a monster referenced by a draft wave and identifies its location', () => {
    const callbacks = renderMonsterRows();
    mocks.deleteHandlers[0]();

    expect(callbacks.setDataset).not.toHaveBeenCalled();
    expect(callbacks.setCurrentTick).not.toHaveBeenCalled();
    expect(callbacks.onSelectedRowsChange).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith(
      expect.stringMatching(/스테이지 2.*숲.*웨이브 2.*매핑/)
    );
  });

  it('deletes an unreferenced monster and updates selection as before', () => {
    const callbacks = renderMonsterRows();
    mocks.deleteHandlers[1]();

    expect(callbacks.setDataset).toHaveBeenCalledWith([rows[0]]);
    expect(callbacks.setCurrentTick).toHaveBeenCalledWith(0);
    expect(callbacks.onSelectedRowsChange).toHaveBeenCalledWith(new Set(['guard']));
    expect(mocks.info).toHaveBeenCalledOnce();
    expect(mocks.error).not.toHaveBeenCalled();
  });
});
