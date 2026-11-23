import { afterEach, describe, expect, it, vi } from 'vitest';
import { EFFECT_PRESETS } from '../skillSystem';
import { createEffect, updateNewParticle } from '../simulator/particles-new';
import { generateEffectCode, validateEffectCode } from './customCode';
import type { EffectPreset } from './presets';

const withCode = (preset: EffectPreset, customCode: string): EffectPreset => ({
  ...preset,
  customCode,
  useCustomCode: true,
});

describe('effect code', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(['projectile', 'trail', 'lightning', 'ring', 'glow'] as const)(
    'generated %s code runs and creates particles',
    effectType => {
      const preset = Object.values(EFFECT_PRESETS).find(p => p.effectType === effectType);
      expect(preset).toBeDefined();
      const result = validateEffectCode(generateEffectCode({ effectType }), preset as EffectPreset);
      expect(result).toMatchObject({ ok: true });
      expect(result.particleCount).toBeGreaterThan(0);
    }
  );

  it('generated projectile code matches the built-in generator', () => {
    const preset = EFFECT_PRESETS.projectile_radial_burst;
    const options = { preset, position: { x: 0, y: 0 }, targetPosition: { x: 100, y: 0 } };
    const builtIn = createEffect(options);
    const fromCode = createEffect({
      ...options,
      preset: withCode(preset, generateEffectCode(preset)),
    });
    expect(fromCode.map(p => [p.vx, p.vy, p.life, p.size])).toEqual(
      builtIn.map(p => [p.vx, p.vy, p.life, p.size])
    );
  });

  it.each(
    Object.values(EFFECT_PRESETS).flatMap(preset =>
      [0.1, 0.5, 0.8].map(random => ({ preset, random }))
    )
  )('$preset.id exposes the same particle generation with random=$random', ({ preset, random }) => {
    vi.spyOn(Math, 'random').mockReturnValue(random);
    const options = {
      preset,
      position: { x: 10, y: 20 },
      targetPosition: { x: 180, y: 70 },
      skillRange: 150,
      skillArea: 90,
    };
    const builtIn = createEffect(options);
    const fromCode = createEffect({
      ...options,
      preset: withCode(preset, generateEffectCode(preset)),
    });
    const visibleFields = (particles: typeof builtIn) =>
      particles.map(particle => ({
        x: particle.x,
        y: particle.y,
        vx: particle.vx,
        vy: particle.vy,
        life: particle.life,
        maxLife: particle.maxLife,
        size: particle.size,
        color: particle.color,
        secondaryColor: particle.secondaryColor,
        effectType: particle.effectType,
        texture: particle.texture,
        glowIntensity: particle.glowIntensity,
        lightningSegments: particle.lightningSegments,
        ringRadius: particle.ringRadius,
        ringExpansionSpeed: particle.ringExpansionSpeed,
        trailEnabled: particle.trailEnabled,
        trailWidth: particle.trailWidth,
        isTrailGroup: particle.skillType?.startsWith('trail_'),
      }));
    expect(visibleFields(fromCode)).toEqual(visibleFields(builtIn));
  });

  it('uses the same required parameters and small-ring behavior as built-in generation', () => {
    const presets = [
      { ...EFFECT_PRESETS.trail_slash },
      { ...EFFECT_PRESETS.projectile_fireball, projectilePattern: undefined },
      { ...EFFECT_PRESETS.lightning_chain, lightningSegments: 0 },
      { ...EFFECT_PRESETS.ring_single, ringRadius: 9 },
      { ...EFFECT_PRESETS.glow_heal, glowParticleCount: 0 },
    ];
    for (const preset of presets) {
      const options = { preset, position: { x: 0, y: 0 }, targetPosition: { x: 100, y: 0 } };
      const builtIn = createEffect(options);
      const fromCode = createEffect({
        ...options,
        preset: withCode(preset, generateEffectCode(preset)),
      });
      expect(fromCode.filter(particle => particle.life > 0)).toHaveLength(
        builtIn.filter(particle => particle.life > 0).length
      );
    }
  });
  it('runs user-edited code in createEffect', () => {
    const preset = withCode(
      EFFECT_PRESETS.glow_heal,
      'return [api.particle({ x: ctx.position.x + 5, life: 300, size: 9, gravity: 100 })];'
    );
    const [particle] = createEffect({ preset, position: { x: 10, y: 20 } });
    expect(particle).toMatchObject({ x: 15, y: 20, life: 300, maxLife: 300, size: 9 });
    expect(updateNewParticle(particle, 1).vy).toBe(100);
  });

  it('reports syntax, runtime and return-type errors without throwing from createEffect', () => {
    const preset = EFFECT_PRESETS.glow_heal;
    expect(validateEffectCode('return [', preset).ok).toBe(false);
    expect(validateEffectCode('return ctx.nope.x;', preset).ok).toBe(false);
    expect(validateEffectCode('return 1;', preset).ok).toBe(false);
    expect(validateEffectCode('return [{ x: 1, y: 2 }];', preset).ok).toBe(false);
    expect(validateEffectCode('return [api.particle({ life: -1 })];', preset).ok).toBe(false);
    expect(
      validateEffectCode('return Array.from({ length: 2001 }, () => api.particle());', preset).ok
    ).toBe(false);
    expect(
      createEffect({ preset: withCode(preset, 'throw new Error("x")'), position: { x: 0, y: 0 } })
    ).toEqual([]);
  });
});
