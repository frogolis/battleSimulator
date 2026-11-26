import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSkills } from '../lib/skillSystem';
import { SkillWorkspace } from './SkillWorkspace';

const mocks = vi.hoisted(() => ({
  deleteSkill: undefined as ((id: string) => void) | undefined,
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock('./SkillTestLab', () => ({
  SkillTestLab: ({ onDeleteSkill }: { onDeleteSkill: (id: string) => void }) => {
    mocks.deleteSkill = onDeleteSkill;
    return null;
  },
}));
vi.mock('./SkillBuilder', () => ({ SkillBuilder: () => null }));

describe('SkillWorkspace deletion', () => {
  beforeEach(() => {
    mocks.deleteSkill = undefined;
    mocks.error.mockClear();
    mocks.success.mockClear();
  });

  it('blocks referenced skills, then deletes after references are removed', () => {
    const onSkillsChange = vi.fn();
    const findSkillReferences = vi.fn().mockReturnValueOnce(['플레이어 데이터 행 0']).mockReturnValue([]);
    renderToStaticMarkup(
      <SkillWorkspace skills={defaultSkills} onSkillsChange={onSkillsChange}
        findSkillReferences={findSkillReferences} />
    );
    if (!mocks.deleteSkill) throw new Error('Missing delete handler');
    mocks.deleteSkill('powerSlash');
    expect(onSkillsChange).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining('플레이어 데이터 행 0'));
    mocks.deleteSkill('powerSlash');
    expect(onSkillsChange).toHaveBeenCalledOnce();
    expect(onSkillsChange.mock.calls[0][0]).not.toHaveProperty('powerSlash');
    expect(mocks.success).toHaveBeenCalledOnce();
  });

  it('reports an unreadable reference and leaves skills unchanged', () => {
    const onSkillsChange = vi.fn();
    renderToStaticMarkup(
      <SkillWorkspace skills={defaultSkills} onSkillsChange={onSkillsChange}
        findSkillReferences={() => { throw new Error('AI 패턴을 확인할 수 없습니다.'); }} />
    );
    if (!mocks.deleteSkill) throw new Error('Missing delete handler');
    mocks.deleteSkill('powerSlash');
    expect(onSkillsChange).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledWith('AI 패턴을 확인할 수 없습니다.');
  });
});
