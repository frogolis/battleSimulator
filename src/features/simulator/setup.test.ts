import { describe, expect, it } from 'vitest';
import { createInitialDatasets } from './setup';

describe('initial simulator datasets', () => {
  it('assigns stable, unique monster definition IDs to seed rows', () => {
    const firstIds = createInitialDatasets().monsterDataset.map(row => row.monster_definition_id);
    const secondIds = createInitialDatasets().monsterDataset.map(row => row.monster_definition_id);

    expect(firstIds.length).toBeGreaterThan(0);
    expect(firstIds.every(id => typeof id === 'string' && id.length > 0)).toBe(true);
    expect(new Set(firstIds).size).toBe(firstIds.length);
    expect(secondIds).toEqual(firstIds);
  });
});
