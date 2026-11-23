import { describe, expect, it, vi } from 'vitest';
import { createSerializedWriter } from './serializedWriter';

describe('workspace save ordering', () => {
  it('starts the next save only after the previous request completes', async () => {
    let finishFirst: () => void = () => {
      throw new Error('First save did not start');
    };
    const first = new Promise<void>(resolve => {
      finishFirst = resolve;
    });
    const write = vi.fn((value: number) => (value === 1 ? first : Promise.resolve()));
    const save = createSerializedWriter(write);
    const firstSave = save(1);
    const secondSave = save(2);
    await Promise.resolve();
    expect(write.mock.calls).toEqual([[1]]);
    finishFirst();
    await firstSave;
    await secondSave;
    expect(write.mock.calls).toEqual([[1], [2]]);
  });

  it('reports a failed save while allowing the next save to proceed', async () => {
    const error = new Error('network error');
    const write = vi.fn((value: number) =>
      value === 1 ? Promise.reject(error) : Promise.resolve()
    );
    const save = createSerializedWriter(write);
    const firstSave = save(1);
    const secondSave = save(2);
    await expect(firstSave).rejects.toBe(error);
    await expect(secondSave).resolves.toBeUndefined();
    expect(write.mock.calls).toEqual([[1], [2]]);
  });
});
