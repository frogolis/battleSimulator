import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHARACTER_TYPES } from '../lib/characterTypes';
import { defaultPlayerLevelConfig } from '../lib/levelSystem';
import { mockDataset, type DataRow } from '../lib/mockData';
import type { StageDefinition } from '../lib/simulator/waves';
import { MonsterDatasetViewer } from './MonsterDatasetViewer';
import { PlayerDatasetViewer } from './PlayerDatasetViewer';

const mocks = vi.hoisted(() => ({
  deleteHandlers: [] as Array<() => void>,
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { error: mocks.error, info: mocks.info, success: vi.fn() } }));
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
  Slider: ({ value, min = 0 }: { value: number[]; min?: number }) => (
    <span data-slider-value={value[0]} data-slider-min={min} />
  ),
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
