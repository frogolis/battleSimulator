import { ArrowDown, ArrowUp, Layers, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { DataRow } from '../lib/mockData';
import {
  createSimulatorDefinitionId,
  type SimulatorDefinitionKind,
} from '../lib/simulator/monsterDefinitionIds';
import {
  moveWaveInStage,
  validateStageDefinitions,
  type StageDefinition,
  type WaveDefinition,
} from '../lib/simulator/waves';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface StageWaveManagerProps {
  stageDefinitions: StageDefinition[];
  onStageDefinitionsChange: (stages: StageDefinition[]) => void;
  activeStageId: string | null;
  onActiveStageIdChange: (stageId: string | null) => void;
  monsterDataset: DataRow[];
  maxMonsterCount: number;
  defaultRespawnDelay: number;
}

export function StageWaveManager({
  stageDefinitions,
  onStageDefinitionsChange,
  activeStageId,
  onActiveStageIdChange,
  monsterDataset,
  maxMonsterCount,
  defaultRespawnDelay,
}: StageWaveManagerProps) {
  const validationError = validateStageDefinitions(
    stageDefinitions,
    monsterDataset,
    maxMonsterCount
  );

  const createId = (kind: SimulatorDefinitionKind): string | undefined => {
    try {
      return createSimulatorDefinitionId(kind);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '정의 ID를 생성하지 못했습니다.');
      return undefined;
    }
  };

  const createDefaultWave = (monsterId: string): WaveDefinition => ({
    id: createId('wave') ?? '',
    durationMs: 30000,
    monsterSpawns: [{ monsterDefinitionId: monsterId, count: 1 }],
    respawn: { enabled: false, delayMs: defaultRespawnDelay },
  });

  const updateStage = (stageId: string, update: (stage: StageDefinition) => StageDefinition) => {
    onStageDefinitionsChange(
      stageDefinitions.map(stage => (stage.id === stageId ? update(stage) : stage))
    );
  };

  const updateWave = (
    stageId: string,
    waveId: string,
    update: (wave: WaveDefinition) => WaveDefinition
  ) => {
    updateStage(stageId, stage => ({
      ...stage,
      waves: stage.waves.map(wave => (wave.id === waveId ? update(wave) : wave)),
    }));
  };

  const moveWave = (stageId: string, waveId: string, offset: -1 | 1) => {
    updateStage(stageId, stage => moveWaveInStage(stage, waveId, offset));
  };

  const handleAddStage = () => {
    const firstMonster = monsterDataset.find(row => row.monster_definition_id);
    if (!firstMonster?.monster_definition_id || maxMonsterCount < 1) {
      toast.error('스테이지를 만들려면 ID가 있는 몬스터와 최대 몬스터 수가 필요합니다.');
      return;
    }

    const id = createId('stage');
    const wave = createDefaultWave(firstMonster.monster_definition_id);
    if (!id || !wave.id) return;

    onStageDefinitionsChange([
      ...stageDefinitions,
      {
        id,
        name: `스테이지 ${stageDefinitions.length + 1}`,
        waves: [wave],
      },
    ]);
  };

  const handleAddWave = (stageId: string) => {
    const firstMonster = monsterDataset.find(row => row.monster_definition_id);
    if (!firstMonster?.monster_definition_id || maxMonsterCount < 1) {
      toast.error('웨이브를 만들려면 ID가 있는 몬스터와 최대 몬스터 수가 필요합니다.');
      return;
    }

    const wave = createDefaultWave(firstMonster.monster_definition_id);
    if (!wave.id) return;
    updateStage(stageId, stage => ({ ...stage, waves: [...stage.waves, wave] }));
  };

  const handleAddMonsterMapping = (stageId: string, wave: WaveDefinition, monsterId: string) => {
    if (wave.monsterSpawns.some(mapping => mapping.monsterDefinitionId === monsterId)) {
      toast.error('같은 몬스터는 웨이브에 한 번만 매핑할 수 있습니다.');
      return;
    }
    const currentCount = wave.monsterSpawns.reduce((sum, mapping) => sum + mapping.count, 0);
    if (currentCount >= maxMonsterCount) {
      toast.error(`최대 몬스터 수 ${maxMonsterCount}에 도달했습니다.`);
      return;
    }
    updateWave(stageId, wave.id, current => ({
      ...current,
      monsterSpawns: [...current.monsterSpawns, { monsterDefinitionId: monsterId, count: 1 }],
    }));
  };

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <Layers className='h-5 w-5' />
                스테이지·웨이브 관리
              </CardTitle>
              <CardDescription>
                웨이브는 설정한 시간 동안 진행되며, 몬스터 생성 수량은 시작 시 일괄 적용됩니다.
              </CardDescription>
            </div>
            <Button onClick={handleAddStage}>
              <Plus className='mr-2 h-4 w-4' />
              스테이지 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          {validationError && stageDefinitions.length > 0 && (
            <Alert variant='destructive'>
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}
          {stageDefinitions.length === 0 ? (
            <p className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
              등록된 스테이지가 없습니다. 스테이지를 추가하면 기본 웨이브가 함께 만들어집니다.
            </p>
          ) : (
            stageDefinitions.map((stage, stageIndex) => {
              const stageValidationError = validateStageDefinitions(
                [stage],
                monsterDataset,
                maxMonsterCount
              );
              return (
                <section key={stage.id} className='space-y-4 rounded-lg border p-4'>
                  <div className='flex flex-wrap items-end gap-3'>
                    <div className='min-w-52 flex-1 space-y-2'>
                      <Label htmlFor={`stage-name-${stage.id}`}>스테이지 이름</Label>
                      <Input
                        id={`stage-name-${stage.id}`}
                        value={stage.name}
                        onChange={event =>
                          updateStage(stage.id, current => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <code className='pb-2 text-xs text-muted-foreground'>{stage.id}</code>
                    <Button
                      variant={activeStageId === stage.id ? 'secondary' : 'outline'}
                      size='sm'
                      disabled={activeStageId !== stage.id && Boolean(stageValidationError)}
                      onClick={() =>
                        onActiveStageIdChange(activeStageId === stage.id ? null : stage.id)
                      }
                    >
                      {activeStageId === stage.id
                        ? '시뮬레이터 적용 해제'
                        : '시뮬레이터에 적용'}
                    </Button>
                    <Button
                      variant='destructive'
                      size='sm'
                      onClick={() => {
                        onStageDefinitionsChange(
                          stageDefinitions.filter(candidate => candidate.id !== stage.id)
                        );
                        if (activeStageId === stage.id) onActiveStageIdChange(null);
                      }}
                    >
                      <Trash2 className='mr-2 h-4 w-4' />
                      스테이지 삭제
                    </Button>
                  </div>

                <div className='space-y-3'>
                  {stage.waves.map((wave, waveIndex) => {
                    const mappedIds = new Set(
                      wave.monsterSpawns.map(mapping => mapping.monsterDefinitionId)
                    );
                    const availableMonsters = monsterDataset.filter(
                      (
                        row
                      ): row is DataRow & { monster_definition_id: string } =>
                        typeof row.monster_definition_id === 'string' &&
                        row.monster_definition_id.trim().length > 0 &&
                        !mappedIds.has(row.monster_definition_id)
                    );
                    const totalCount = wave.monsterSpawns.reduce(
                      (sum, mapping) => sum + mapping.count,
                      0
                    );

                    return (
                      <div key={wave.id} className='space-y-4 rounded-md bg-muted/40 p-4'>
                        <div className='flex flex-wrap items-end justify-between gap-3'>
                          <div className='flex flex-wrap items-end gap-3'>
                            <div className='space-y-2'>
                              <Label htmlFor={`wave-duration-${wave.id}`}>진행 시간 (ms)</Label>
                              <Input
                                id={`wave-duration-${wave.id}`}
                                type='number'
                                min={1}
                                step={1000}
                                className='w-36'
                                value={wave.durationMs}
                                onChange={event => {
                                  const durationMs = Number(event.target.value);
                                  if (!Number.isFinite(durationMs) || durationMs <= 0) return;
                                  updateWave(stage.id, wave.id, current => ({
                                    ...current,
                                    durationMs,
                                  }));
                                }}
                              />
                            </div>
                            <label className='flex h-9 items-center gap-2 text-sm'>
                              <input
                                type='checkbox'
                                checked={wave.respawn.enabled}
                                onChange={event =>
                                  updateWave(stage.id, wave.id, current => ({
                                    ...current,
                                    respawn: {
                                      ...current.respawn,
                                      enabled: event.target.checked,
                                    },
                                  }))
                                }
                              />
                              웨이브별 리스폰 사용
                            </label>
                            <div className='space-y-2'>
                              <Label htmlFor={`wave-respawn-${wave.id}`}>리스폰 간격 (ms)</Label>
                              <Input
                                id={`wave-respawn-${wave.id}`}
                                type='number'
                                min={0}
                                step={100}
                                className='w-36'
                                value={wave.respawn.delayMs}
                                disabled={!wave.respawn.enabled}
                                onChange={event => {
                                  const delayMs = Number(event.target.value);
                                  if (!Number.isFinite(delayMs) || delayMs < 0) return;
                                  updateWave(stage.id, wave.id, current => ({
                                    ...current,
                                    respawn: { ...current.respawn, delayMs },
                                  }));
                                }}
                              />
                            </div>
                          </div>
                          <div className='flex items-center gap-1'>
                            <Button
                              variant='ghost'
                              size='icon'
                              aria-label='웨이브 위로'
                              disabled={waveIndex === 0}
                              onClick={() => moveWave(stage.id, wave.id, -1)}
                            >
                              <ArrowUp className='h-4 w-4' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='icon'
                              aria-label='웨이브 아래로'
                              disabled={waveIndex === stage.waves.length - 1}
                              onClick={() => moveWave(stage.id, wave.id, 1)}
                            >
                              <ArrowDown className='h-4 w-4' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              disabled={stage.waves.length <= 1}
                              onClick={() => {
                                if (stage.waves.length <= 1) {
                                  toast.error('스테이지에는 최소 한 개의 웨이브가 필요합니다.');
                                  return;
                                }
                                updateStage(stage.id, current => ({
                                  ...current,
                                  waves: current.waves.filter(candidate => candidate.id !== wave.id),
                                }));
                              }}
                            >
                              <Trash2 className='mr-2 h-4 w-4' />
                              웨이브 삭제
                            </Button>
                          </div>
                        </div>
                        <div className='space-y-2'>
                          <div className='flex flex-wrap items-center justify-between gap-2'>
                            <Label>몬스터 생성 매핑 · {totalCount}/{maxMonsterCount}</Label>
                            {availableMonsters.length > 0 && (
                              <Select
                                key={`${wave.id}-${wave.monsterSpawns.length}`}
                                onValueChange={monsterId =>
                                  handleAddMonsterMapping(stage.id, wave, monsterId)
                                }
                              >
                                <SelectTrigger className='w-64'>
                                  <SelectValue placeholder='추가할 몬스터 선택' />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableMonsters.map((row, index) => (
                                    <SelectItem
                                      key={row.monster_definition_id}
                                      value={row.monster_definition_id}
                                    >
                                      {row.monster_name || `몬스터 ${index + 1}`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                          {wave.monsterSpawns.map(mapping => {
                            const row = monsterDataset.find(
                              monster =>
                                monster.monster_definition_id === mapping.monsterDefinitionId
                            );
                            return (
                              <div
                                key={mapping.monsterDefinitionId}
                                className='flex flex-wrap items-center gap-3 rounded border bg-background p-2'
                              >
                                <span className='min-w-40 flex-1 text-sm'>
                                  {row?.monster_name || mapping.monsterDefinitionId}
                                </span>
                                <code className='text-xs text-muted-foreground'>
                                  {mapping.monsterDefinitionId}
                                </code>
                                <Label htmlFor={`mapping-count-${wave.id}-${mapping.monsterDefinitionId}`}>
                                  수량
                                </Label>
                                <Input
                                  id={`mapping-count-${wave.id}-${mapping.monsterDefinitionId}`}
                                  type='number'
                                  min={1}
                                  max={maxMonsterCount}
                                  step={1}
                                  className='w-24'
                                  value={mapping.count}
                                  onChange={event => {
                                    const count = Number(event.target.value);
                                    if (!Number.isSafeInteger(count) || count < 1) return;
                                    const otherCount = wave.monsterSpawns.reduce(
                                      (sum, entry) =>
                                        sum +
                                        (entry.monsterDefinitionId === mapping.monsterDefinitionId
                                          ? 0
                                          : entry.count),
                                      0
                                    );
                                    if (otherCount + count > maxMonsterCount) {
                                      toast.error(
                                        `웨이브 생성 수는 최대 몬스터 수 ${maxMonsterCount}를 넘을 수 없습니다.`
                                      );
                                      return;
                                    }
                                    updateWave(stage.id, wave.id, current => ({
                                      ...current,
                                      monsterSpawns: current.monsterSpawns.map(entry =>
                                        entry.monsterDefinitionId === mapping.monsterDefinitionId
                                          ? { ...entry, count }
                                          : entry
                                      ),
                                    }));
                                  }}
                                />
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  aria-label='몬스터 매핑 삭제'
                                  disabled={wave.monsterSpawns.length <= 1}
                                  onClick={() => {
                                    if (wave.monsterSpawns.length <= 1) {
                                      toast.error('웨이브에는 최소 한 개의 몬스터 매핑이 필요합니다.');
                                      return;
                                    }
                                    updateWave(stage.id, wave.id, current => ({
                                      ...current,
                                      monsterSpawns: current.monsterSpawns.filter(
                                        entry =>
                                          entry.monsterDefinitionId !== mapping.monsterDefinitionId
                                      ),
                                    }));
                                  }}
                                >
                                  <Trash2 className='h-4 w-4' />
                                </Button>
                              </div>
                            );
                          })}
                          {availableMonsters.length === 0 && (
                            <p className='text-xs text-muted-foreground'>
                              추가할 수 있는 몬스터가 없습니다.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className='flex items-center justify-between'>
                  <p className='text-xs text-muted-foreground'>
                    스테이지 {stageIndex + 1} · 웨이브 순서는 목록 순서입니다.
                  </p>
                  <Button variant='outline' size='sm' onClick={() => handleAddWave(stage.id)}>
                    <Plus className='mr-2 h-4 w-4' />
                    웨이브 추가
                  </Button>
                </div>
                </section>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
