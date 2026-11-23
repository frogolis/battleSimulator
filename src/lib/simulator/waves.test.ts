import { describe, expect, it } from 'vitest';
import type { DataRow } from '../mockData';
import {
  advanceStageProgress,
  moveWaveInStage,
  validateStageDefinitions,
  type StageDefinition,
} from './waves';

const monsterDataset: DataRow[] = [
  { t: 0, x: 0, y: 0, speed: 0, dir: 0, is_attack: 0, is_miss: 0, is_crit: 0,
    monster_definition_id: 'monster_guardian' },
  { t: 1, x: 0, y: 0, speed: 0, dir: 0, is_attack: 0, is_miss: 0, is_crit: 0,
    monster_definition_id: 'monster_archer' },
];

const stage: StageDefinition = {
  id: 'stage_forest',
  name: '숲',
  waves: [{
    id: 'wave_1',
    durationMs: 30000,
    monsterSpawns: [
      { monsterDefinitionId: 'monster_guardian', count: 2 },
      { monsterDefinitionId: 'monster_archer', count: 1 },
    ],
    respawn: { enabled: true, delayMs: 2000 },
  }],
};

describe('stage and wave configuration', () => {
  it('advances one wave at a time and completes after the final duration', () => {
    const secondWave = { ...stage.waves[0], id: 'wave_2', durationMs: 1000 };
    const twoWaveStage = { ...stage, waves: [{ ...stage.waves[0], durationMs: 1000 }, secondWave] };
    const initialProgress = { waveIndex: 0, elapsedMs: 0, complete: false };

    expect(advanceStageProgress(twoWaveStage, initialProgress, 400)).toMatchObject({
      progress: { waveIndex: 0, elapsedMs: 400, complete: false },
      waveChanged: false,
      completed: false,
    });
    expect(advanceStageProgress(twoWaveStage, initialProgress, 1000)).toMatchObject({
      progress: { waveIndex: 1, elapsedMs: 0, complete: false },
      waveChanged: true,
      completed: false,
    });
    expect(advanceStageProgress(
      twoWaveStage,
      { waveIndex: 1, elapsedMs: 900, complete: false },
      100
    )).toMatchObject({
      progress: { waveIndex: 1, elapsedMs: 1000, complete: true },
      waveChanged: false,
      completed: true,
    });
  });

  it('rejects invalid elapsed time or stage progress', () => {
    expect(() => advanceStageProgress(stage, { waveIndex: 0, elapsedMs: 0, complete: false }, -1))
      .toThrow(/non-negative finite/);
    expect(() => advanceStageProgress(stage, { waveIndex: 1, elapsedMs: 0, complete: false }, 1))
      .toThrow(/progress is invalid/);
  });

  it('moves waves without changing their IDs or mutating the source stage', () => {
    const secondWave = { ...stage.waves[0], id: 'wave_2' };
    const stageWithTwoWaves = { ...stage, waves: [stage.waves[0], secondWave] };

    const reordered = moveWaveInStage(stageWithTwoWaves, 'wave_2', -1);

    expect(reordered.waves.map(wave => wave.id)).toEqual(['wave_2', 'wave_1']);
    expect(stageWithTwoWaves.waves.map(wave => wave.id)).toEqual(['wave_1', 'wave_2']);
  });

  it('accepts ID-based mappings within the global monster limit', () => {
    expect(validateStageDefinitions([stage], monsterDataset, 3)).toBeUndefined();
  });

  it('rejects missing monster references, duplicate mappings, and over-limit counts', () => {
    expect(validateStageDefinitions([{
      ...stage,
      waves: [{
        ...stage.waves[0],
        monsterSpawns: [{ monsterDefinitionId: 'missing', count: 1 }],
      }],
    }], monsterDataset, 3)).toMatch(/몬스터 ID "missing".*찾을 수 없습니다/);
    expect(validateStageDefinitions([{
      ...stage,
      waves: [{
        ...stage.waves[0],
        monsterSpawns: [
          { monsterDefinitionId: 'monster_guardian', count: 1 },
          { monsterDefinitionId: 'monster_guardian', count: 1 },
        ],
      }],
    }], monsterDataset, 3)).toMatch(/매핑이 중복/);
    expect(validateStageDefinitions([stage], monsterDataset, 2)).toMatch(/최대 몬스터 수/);
  });

  it('rejects invalid durations, counts, and respawn delays', () => {
    const invalidWaves = [
      { ...stage.waves[0], durationMs: 0 },
      {
        ...stage.waves[0],
        monsterSpawns: [{ monsterDefinitionId: 'monster_guardian', count: 0 }],
      },
      { ...stage.waves[0], respawn: { enabled: true, delayMs: -1 } },
    ];

    expect(validateStageDefinitions([{
      ...stage,
      waves: [invalidWaves[0]],
    }], monsterDataset, 3)).toMatch(/지속 시간/);
    expect(validateStageDefinitions([{
      ...stage,
      waves: [invalidWaves[1]],
    }], monsterDataset, 3)).toMatch(/생성 수는/);
    expect(validateStageDefinitions([{
      ...stage,
      waves: [invalidWaves[2]],
    }], monsterDataset, 3)).toMatch(/리스폰 간격/);
  });

  it('rejects duplicated definition IDs in the referenced monster dataset', () => {
    expect(validateStageDefinitions(
      [stage],
      [monsterDataset[0], { ...monsterDataset[1], monster_definition_id: 'monster_guardian' }],
      3
    )).toMatch(/정의 ID "monster_guardian"가 중복/);
  });
});
