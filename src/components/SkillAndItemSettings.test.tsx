import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSkills } from '../lib/skillSystem';
import { SkillAndItemSettings } from './SkillAndItemSettings';

const effects = vi.hoisted(() => [] as Array<() => void>);

vi.mock('react', async importOriginal => {
  const react = await importOriginal<typeof import('react')>();
  return {
    ...react,
    useEffect: (effect: () => void) => {
      effects.push(effect);
    },
  };
});

describe('SkillAndItemSettings', () => {
  beforeEach(() => {
    effects.length = 0;
  });

  it.each([true, false])(
    'does not replace existing skills when mounted (items only: %s)',
    showOnlyItems => {
      const skills = {
        customSkill: { ...defaultSkills.powerSlash, id: 'customSkill', name: 'Custom skill' },
      };
      const onSkillsChange = vi.fn();

      renderToStaticMarkup(
        <SkillAndItemSettings
          skills={skills}
          onSkillsChange={onSkillsChange}
          showOnlyItems={showOnlyItems}
        />
      );
      expect(effects.length).toBeGreaterThan(0);
      effects.forEach(effect => effect());
      expect(onSkillsChange).not.toHaveBeenCalled();
      expect(Object.keys(skills)).toEqual(['customSkill']);
    }
  );
});
