export type SimulatorDefinitionKind = 'monster' | 'stage' | 'wave';

export function createSimulatorDefinitionId(kind: SimulatorDefinitionKind): string {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi || typeof cryptoApi.randomUUID !== 'function') {
    throw new Error('이 브라우저는 정의 ID 생성에 필요한 암호화 기능을 지원하지 않습니다.');
  }
  return `${kind}_${cryptoApi.randomUUID()}`;
}

export function createMonsterDefinitionId(): string {
  return createSimulatorDefinitionId('monster');
}
