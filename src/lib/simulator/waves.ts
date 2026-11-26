import type { DataRow } from '../mockData';

export interface MonsterSpawnMapping {
  monsterDefinitionId: string;
  count: number;
}

export interface WaveRespawnPolicy {
  enabled: boolean;
  delayMs: number;
}

export interface WaveDefinition {
  id: string;
  durationMs: number;
  monsterSpawns: MonsterSpawnMapping[];
  respawn: WaveRespawnPolicy;
}

export interface StageDefinition {
  id: string;
  name: string;
  waves: WaveDefinition[];
}

export interface StageProgress {
  waveIndex: number;
  elapsedMs: number;
  complete: boolean;
}

export interface StageProgressUpdate {
  progress: StageProgress;
  waveChanged: boolean;
  completed: boolean;
}

export function advanceStageProgress(
  stage: StageDefinition,
  progress: StageProgress,
  deltaMs: number
): StageProgressUpdate {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new RangeError('Stage elapsed time must be a non-negative finite number.');
  }
  if (!Number.isSafeInteger(progress.waveIndex) ||
    progress.waveIndex < 0 ||
    progress.waveIndex >= stage.waves.length ||
    !Number.isFinite(progress.elapsedMs) ||
    progress.elapsedMs < 0) {
    throw new RangeError('Stage progress is invalid.');
  }
  if (progress.complete) {
    return { progress, waveChanged: false, completed: false };
  }

  const durationMs = stage.waves[progress.waveIndex].durationMs;
  const elapsedMs = progress.elapsedMs + deltaMs;
  if (elapsedMs < durationMs) {
    return {
      progress: { ...progress, elapsedMs },
      waveChanged: false,
      completed: false,
    };
  }

  const nextWaveIndex = progress.waveIndex + 1;
  if (nextWaveIndex < stage.waves.length) {
    return {
      progress: { waveIndex: nextWaveIndex, elapsedMs: 0, complete: false },
      waveChanged: true,
      completed: false,
    };
  }

  return {
    progress: { ...progress, elapsedMs: durationMs, complete: true },
    waveChanged: false,
    completed: true,
  };
}

export function moveWaveInStage(
  stage: StageDefinition,
  waveId: string,
  offset: -1 | 1
): StageDefinition {
  const currentIndex = stage.waves.findIndex(wave => wave.id === waveId);
  const targetIndex = currentIndex + offset;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= stage.waves.length) return stage;

  const waves = [...stage.waves];
  [waves[currentIndex], waves[targetIndex]] = [waves[targetIndex], waves[currentIndex]];
  return { ...stage, waves };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function validateStageDefinitions(
  input: unknown,
  monsterDataset: readonly DataRow[],
  maxMonsterCount: number,
  options: { allowIncomplete?: boolean } = {}
): string | undefined {
  if (!Array.isArray(input)) return '스테이지 설정은 배열이어야 합니다.';
  if (!Number.isSafeInteger(maxMonsterCount) || maxMonsterCount < 1) {
    return '최대 몬스터 수는 1 이상의 정수여야 합니다.';
  }

  const monsterIds = new Set<string>();
  for (const [index, row] of monsterDataset.entries()) {
    const id = row.monster_definition_id?.trim();
    if (!id) return `몬스터 행 ${index}에 정의 ID가 없습니다.`;
    if (monsterIds.has(id)) return `몬스터 정의 ID "${id}"가 중복되었습니다.`;
    monsterIds.add(id);
  }

  const stageIds = new Set<string>();
  for (const [stageIndex, stage] of input.entries()) {
    if (!isRecord(stage)) return `스테이지 ${stageIndex} 설정이 올바르지 않습니다.`;
    if (typeof stage.id !== 'string' || !stage.id.trim()) {
      return `스테이지 ${stageIndex}에 ID가 없습니다.`;
    }
    if (stageIds.has(stage.id)) return `스테이지 ID "${stage.id}"가 중복되었습니다.`;
    stageIds.add(stage.id);
    if (typeof stage.name !== 'string' || (!options.allowIncomplete && !stage.name.trim())) {
      return `스테이지 "${stage.id}"의 이름이 비어 있습니다.`;
    }
    if (!Array.isArray(stage.waves) || (!options.allowIncomplete && stage.waves.length === 0)) {
      return `스테이지 "${stage.id}"에 웨이브가 없습니다.`;
    }

    const waveIds = new Set<string>();
    for (const [waveIndex, wave] of stage.waves.entries()) {
      if (!isRecord(wave)) {
        return `스테이지 "${stage.id}"의 웨이브 ${waveIndex} 설정이 올바르지 않습니다.`;
      }
      if (typeof wave.id !== 'string' || !wave.id.trim()) {
        return `스테이지 "${stage.id}"의 웨이브 ${waveIndex}에 ID가 없습니다.`;
      }
      if (waveIds.has(wave.id)) {
        return `스테이지 "${stage.id}"의 웨이브 ID "${wave.id}"가 중복되었습니다.`;
      }
      waveIds.add(wave.id);
      if (typeof wave.durationMs !== 'number' || !Number.isFinite(wave.durationMs) ||
        (options.allowIncomplete ? wave.durationMs < 0 : wave.durationMs <= 0)) {
        return options.allowIncomplete
          ? `웨이브 "${wave.id}"의 지속 시간은 0 이상의 유한한 숫자여야 합니다.`
          : `웨이브 "${wave.id}"의 지속 시간은 0보다 큰 유한한 숫자여야 합니다.`;
      }
      if (!isRecord(wave.respawn) || typeof wave.respawn.enabled !== 'boolean') {
        return `웨이브 "${wave.id}"의 리스폰 설정이 올바르지 않습니다.`;
      }
      if (typeof wave.respawn.delayMs !== 'number' || !Number.isFinite(wave.respawn.delayMs) ||
        wave.respawn.delayMs < 0) {
        return `웨이브 "${wave.id}"의 리스폰 간격은 0 이상의 유한한 숫자여야 합니다.`;
      }
      if (!Array.isArray(wave.monsterSpawns) ||
        (!options.allowIncomplete && wave.monsterSpawns.length === 0)) {
        return `웨이브 "${wave.id}"에 몬스터 생성 매핑이 없습니다.`;
      }

      const mappedMonsterIds = new Set<string>();
      let totalSpawnCount = 0;
      for (const [mappingIndex, mapping] of wave.monsterSpawns.entries()) {
        if (!isRecord(mapping) || typeof mapping.monsterDefinitionId !== 'string' ||
          !mapping.monsterDefinitionId.trim()) {
          return `웨이브 "${wave.id}"의 몬스터 매핑 ${mappingIndex}에 정의 ID가 없습니다.`;
        }
        const monsterId = mapping.monsterDefinitionId;
        if (mappedMonsterIds.has(monsterId)) {
          return `웨이브 "${wave.id}"의 몬스터 ID "${monsterId}" 매핑이 중복되었습니다.`;
        }
        mappedMonsterIds.add(monsterId);
        if (!monsterIds.has(monsterId)) {
          return `웨이브 "${wave.id}"에서 몬스터 ID "${monsterId}"를 찾을 수 없습니다.`;
        }
        if (typeof mapping.count !== 'number' ||
          !Number.isSafeInteger(mapping.count) ||
          mapping.count < (options.allowIncomplete ? 0 : 1)) {
          return options.allowIncomplete
            ? `웨이브 "${wave.id}"의 몬스터 "${monsterId}" 생성 수는 0 이상의 정수여야 합니다.`
            : `웨이브 "${wave.id}"의 몬스터 "${monsterId}" 생성 수는 1 이상의 정수여야 합니다.`;
        }
        totalSpawnCount += mapping.count;
        if (!Number.isSafeInteger(totalSpawnCount) || totalSpawnCount > maxMonsterCount) {
          return `웨이브 "${wave.id}"의 생성 수가 최대 몬스터 수 ${maxMonsterCount}를 초과합니다.`;
        }
      }
    }
  }

  return undefined;
}
