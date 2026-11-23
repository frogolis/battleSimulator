/**
 * 코드 기반 이펙트: 프리셋에 저장된 코드(함수 본문)를 실행해 파티클을 만든다.
 *
 * 코드는 `ctx`(발생 정보)와 `api`(헬퍼)를 받아 파티클 배열을 반환해야 한다.
 * 생성된 파티클의 이동/수명/렌더링은 기존 파티클 시스템이 그대로 처리한다.
 */

import type { Position, SkillParticle } from '../simulator/types';
import type { EffectPreset, EffectType } from './presets';

export interface EffectCodeContext {
  preset: EffectPreset;
  position: Position;
  targetPosition?: Position;
  targetId?: number;
  /** position → targetPosition 방향 (라디안, 타겟이 없으면 0) */
  angle: number;
  /** position ↔ targetPosition 거리 (타겟이 없으면 0) */
  distance: number;
  owner?: 'player' | 'monster';
  monsterId?: number;
  damage?: number;
  skillName?: string;
  /** 스킬 범위/각도 (도) */
  skillArea?: number;
  /** 스킬 사거리 (px) */
  skillRange?: number;
}

export interface EffectCodeApi {
  /** 프리셋 기본값이 채워진 파티클을 만든다. 넘긴 속성이 기본값을 덮어쓴다. */
  particle: (overrides?: Partial<SkillParticle>) => SkillParticle;
  /** min 이상 max 미만의 난수 */
  rand: (min?: number, max?: number) => number;
  /** a에서 b를 향하는 각도 (라디안) */
  angleTo: (from: Position, to: Position) => number;
  /** 같은 휘두르기 파티클을 하나의 선으로 묶기 위한 그룹 ID (trail 타입 skillType 용) */
  groupId: () => number;
}

type EffectCodeFunction = (ctx: EffectCodeContext, api: EffectCodeApi) => unknown;

export interface EffectCodeResult {
  ok: boolean;
  error?: string;
  particleCount: number;
}

const MAX_PARTICLES = 2000;
const compiledCache = new Map<string, EffectCodeFunction | Error>();
const reportedErrors = new Set<string>();

const toMessage = (error: unknown): string =>
  error instanceof Error ? `${error.name}: ${error.message}` : String(error);

function compile(code: string): EffectCodeFunction {
  const cached = compiledCache.get(code);
  if (cached instanceof Error) throw cached;
  if (cached) return cached;

  try {
    const fn = new Function('ctx', 'api', `"use strict";\n${code}`) as EffectCodeFunction;
    if (compiledCache.size > 100) compiledCache.clear();
    compiledCache.set(code, fn);
    return fn;
  } catch (error) {
    const wrapped = error instanceof Error ? error : new Error(String(error));
    compiledCache.set(code, wrapped);
    throw wrapped;
  }
}

function buildContext(options: {
  preset: EffectPreset;
  position: Position;
  targetPosition?: Position;
  targetId?: number;
  owner?: 'player' | 'monster';
  monsterId?: number;
  damage?: number;
  skillName?: string;
  skillArea?: number;
  skillRange?: number;
}): EffectCodeContext {
  const { position, targetPosition } = options;
  const dx = targetPosition ? targetPosition.x - position.x : 0;
  const dy = targetPosition ? targetPosition.y - position.y : 0;
  return {
    ...options,
    angle: targetPosition ? Math.atan2(dy, dx) : 0,
    distance: Math.hypot(dx, dy),
  };
}

function buildApi(
  ctx: EffectCodeContext,
  nextId: () => number,
  peekId: () => number
): EffectCodeApi {
  const { preset, position } = ctx;
  return {
    particle: (overrides = {}) => {
      const life = overrides.life ?? 1000;
      const effectType: EffectType = overrides.effectType ?? preset.effectType;
      const base: SkillParticle = {
        id: nextId(),
        x: position.x,
        y: position.y,
        vx: 0,
        vy: 0,
        life,
        maxLife: overrides.maxLife ?? life,
        size: 4,
        color: preset.color,
        secondaryColor: preset.secondaryColor,
        effectType,
        texture: preset.particleTexture,
        glowIntensity: preset.glowIntensity,
        shapeScaleX: preset.shapeScaleX,
        shapeScaleY: preset.shapeScaleY,
        shapeRotation: preset.shapeRotation,
        shapeOutlineWidth: preset.shapeOutlineWidth,
        shapeCornerRadius: preset.shapeCornerRadius,
        starPoints: preset.starPoints,
        starInnerRatio: preset.starInnerRatio,
        damage: ctx.damage,
        owner: ctx.owner,
        monsterId: ctx.monsterId,
        skillName: ctx.skillName,
      };

      if (effectType === 'projectile') {
        base.hasHit = false;
        base.startPosition = { x: position.x, y: position.y };
        base.travelDistance = 0;
        base.isHoming = preset.isHoming;
        base.targetId = preset.isHoming ? ctx.targetId : undefined;
      }

      return { ...base, ...overrides, id: base.id };
    },
    rand: (min = 0, max = 1) => min + Math.random() * (max - min),
    angleTo: (from, to) => Math.atan2(to.y - from.y, to.x - from.x),
    groupId: peekId,
  };
}

function normalize(result: unknown): SkillParticle[] {
  if (!Array.isArray(result)) {
    throw new TypeError(
      '코드는 파티클 배열을 return 해야 합니다. (예: return [api.particle({ ... })])'
    );
  }
  if (result.length > MAX_PARTICLES) {
    throw new RangeError(`파티클은 최대 ${MAX_PARTICLES}개까지 생성할 수 있습니다.`);
  }
  return result.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new TypeError(
        `${index + 1}번째 파티클이 올바르지 않습니다. api.particle을 사용하세요.`
      );
    }
    const particle: Record<string, unknown> = item;
    const numericFields = ['id', 'x', 'y', 'vx', 'vy', 'life', 'maxLife', 'size'];
    if (
      numericFields.some(
        key => typeof particle[key] !== 'number' || !Number.isFinite(particle[key])
      ) ||
      typeof particle.life !== 'number' ||
      particle.life <= 0 ||
      typeof particle.maxLife !== 'number' ||
      particle.maxLife <= 0 ||
      typeof particle.size !== 'number' ||
      particle.size < 0 ||
      typeof particle.color !== 'string' ||
      !['projectile', 'trail', 'lightning', 'ring', 'glow'].includes(String(particle.effectType))
    ) {
      throw new TypeError(
        `${index + 1}번째 파티클의 속성이 올바르지 않습니다. api.particle을 사용하세요.`
      );
    }
    return item as SkillParticle;
  });
}

/** 코드를 실행해 파티클을 만든다. 오류는 던진다. */
export function runEffectCode(
  code: string,
  options: Parameters<typeof buildContext>[0],
  nextId: () => number,
  peekId: () => number
): SkillParticle[] {
  const fn = compile(code);
  const ctx = buildContext(options);
  return normalize(fn(ctx, buildApi(ctx, nextId, peekId)));
}

/** 시뮬레이터용: 오류가 나도 게임 루프를 멈추지 않고 빈 배열을 반환한다. */
export function runEffectCodeSafely(
  code: string,
  options: Parameters<typeof buildContext>[0],
  nextId: () => number,
  peekId: () => number
): SkillParticle[] {
  try {
    return runEffectCode(code, options, nextId, peekId);
  } catch (error) {
    const message = toMessage(error);
    if (!reportedErrors.has(message)) {
      reportedErrors.add(message);
      // eslint-disable-next-line no-console
      console.warn(`[effect code] ${message}`);
    }
    return [];
  }
}

/** 에디터용: 샘플 컨텍스트로 코드를 한 번 실행해 오류와 파티클 수를 알려준다. */
export function validateEffectCode(code: string, preset: EffectPreset): EffectCodeResult {
  let counter = 0;
  try {
    const particles = runEffectCode(
      code,
      {
        preset,
        position: { x: 0, y: 0 },
        targetPosition: { x: 200, y: 0 },
        owner: 'player',
        skillRange: 180,
        skillArea: 120,
      },
      () => counter++,
      () => counter
    );
    return { ok: true, particleCount: particles.length };
  } catch (error) {
    return { ok: false, error: toMessage(error), particleCount: 0 };
  }
}

const COMMON_HEADER = `// ctx: 발생 정보 (preset, position, targetPosition, angle, distance, skillRange, skillArea, damage, owner ...)
// api: 헬퍼 (api.particle, api.rand, api.angleTo, api.groupId)
// 파티클 배열을 return 하면 그대로 화면에 표시됩니다.
`;

const TEMPLATES: Record<EffectType, string> = {
  projectile: `${COMMON_HEADER}
// 투사체: 패턴(directional | radial | cone)에 따라 발사 각도를 계산합니다.
const { preset, angle } = ctx;
if (!preset.projectilePattern || !preset.projectileCount) return [];
const count = preset.projectileCount;
const speed = preset.projectileSpeed || 400;
const size = preset.projectileSize || 8;
const lifetime = preset.projectileLifetime || 1000;
const spread =
  preset.projectilePattern === 'cone'
    ? preset.spreadAngle || Math.PI / 4
    : preset.spreadAngle ?? 0;

const particles = [];
for (let i = 0; i < count; i++) {
  let a = angle;
  if (preset.projectilePattern === 'radial') {
    a = (i / count) * Math.PI * 2;
  } else if (count > 1 && spread) {
    a += (i - (count - 1) / 2) * (spread / (count - 1));
  }

  particles.push(
    api.particle({
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: lifetime,
      size,
      trailEnabled: true,
      trailHistory: [],
      trailLength: 20,
      trailWidth: size * 0.5,
    })
  );
}
return particles;
`,

  trail: `${COMMON_HEADER}
// 궤적: 베기(slash) / 찌르기(thrust) / 회전(spin) 경로를 따라 점을 찍습니다.
const { preset, position, angle } = ctx;
if (!ctx.skillRange || !preset.trailParticleCount) return [];
const radius = ctx.skillRange;
const count = preset.trailParticleCount;
const width = preset.trailWidth || 5;
const fade = preset.trailFadeSpeed || 1;
const type = preset.trailType || 'thrust';
const group = api.groupId();

const particles = [];
for (let i = 0; i < count; i++) {
  const t = i / count;
  let x = position.x;
  let y = position.y;

  if (type === 'slash') {
    const arc =
      ctx.skillArea !== undefined
        ? (ctx.skillArea * Math.PI) / 180
        : preset.trailArcAngle || Math.PI / 2.5;
    const a = angle - arc / 2 + arc * t;
    x += Math.cos(a) * radius;
    y += Math.sin(a) * radius;
  } else if (type === 'spin') {
    const a = t * Math.PI * 2;
    x += Math.cos(a) * radius;
    y += Math.sin(a) * radius;
  } else {
    const distance = t * radius;
    x += Math.cos(angle) * distance;
    y += Math.sin(angle) * distance;
  }

  // 두께감을 위한 수직 방향 흔들림
  const normal = Math.atan2(y - position.y, x - position.x) + Math.PI / 2;
  const offset = api.rand(-0.5, 0.5) * width;

  particles.push(
    api.particle({
      x: x + Math.cos(normal) * offset,
      y: y + Math.sin(normal) * offset,
      life: 500 / fade,
      size: api.rand(5, 8),
      skillType: 'trail_' + group,
    })
  );
}
return particles;
`,

  lightning: `${COMMON_HEADER}
// 번개: 타겟까지 지그재그 선분을 만들고, 일정 확률로 가지를 칩니다.
const { preset, position, targetPosition } = ctx;
if (!targetPosition || !preset.lightningSegments) return [];

const segmentCount = preset.lightningSegments;
const jitter = preset.lightningJitter || 10;
const forkChance = preset.lightningForkChance || 0.2;
const dx = (targetPosition.x - position.x) / segmentCount;
const dy = (targetPosition.y - position.y) / segmentCount;

const segments = [];
let current = { x: position.x, y: position.y };
for (let i = 0; i < segmentCount; i++) {
  const next = {
    x: position.x + dx * (i + 1) + api.rand(-0.5, 0.5) * jitter,
    y: position.y + dy * (i + 1) + api.rand(-0.5, 0.5) * jitter,
  };
  segments.push({ start: current, end: next, brightness: 0.8 + Math.random() * 0.2 });

  if (Math.random() < forkChance && i < segmentCount - 2) {
    const forkAngle = api.rand(-0.5, 0.5) * (Math.PI / 2);
    const forkLength = (segmentCount - i) * Math.sqrt(dx * dx + dy * dy) * 0.5;
    segments.push({
      start: next,
      end: {
        x: next.x + Math.cos(forkAngle) * forkLength,
        y: next.y + Math.sin(forkAngle) * forkLength,
      },
      brightness: 0.5 + Math.random() * 0.3,
    });
  }
  current = next;
}

return [
  api.particle({
    life: 200,
    size: 2,
    texture: 'spark',
    lightningSegments: segments,
    lightningTarget: targetPosition,
  }),
];
`,

  ring: `${COMMON_HEADER}
// 링: 원주 위 파티클이 바깥으로 퍼져나갑니다. (ringCount 만큼 동심원)
const { preset, position } = ctx;
if (!preset.ringRadius || !preset.ringExpansionSpeed) return [];
const maxRadius = preset.ringRadius;
const speed = preset.ringExpansionSpeed;
const ringCount = preset.ringCount || 1;
const interval = preset.ringInterval || 0;
const startRadius = 10;
const pointCount = Math.floor(maxRadius / 3);

const particles = [];
for (let ring = 0; ring < ringCount; ring++) {
  const life = ((maxRadius - startRadius) / speed) * 1000 + ring * interval;
  if (life <= 0) continue;
  for (let j = 0; j < pointCount; j++) {
    const a = (j / pointCount) * Math.PI * 2;
    particles.push(
      api.particle({
        x: position.x + Math.cos(a) * startRadius,
        y: position.y + Math.sin(a) * startRadius,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life,
        size: 4,
        ringRadius: startRadius,
        ringStartRadius: startRadius,
        ringExpansionSpeed: speed,
      })
    );
  }
}
return particles;
`,

  glow: `${COMMON_HEADER}
// 글로우: 중앙의 큰 빛 + 위로 떠오르는 작은 파티클.
const { preset, position } = ctx;
if (!preset.glowRadius || !preset.glowParticleCount) return [];
const radius = preset.glowRadius;
const count = preset.glowParticleCount;
const rise = preset.glowRiseSpeed || 60;
const fade = preset.glowFadeSpeed || 0.8;

const particles = [
  api.particle({
    life: 1000 / fade,
    size: radius,
    texture: 'circle',
  }),
];

for (let i = 0; i < count; i++) {
  const a = Math.random() * Math.PI * 2;
  const dist = Math.random() * radius * 0.8;
  particles.push(
    api.particle({
      x: position.x + Math.cos(a) * dist,
      y: position.y + Math.sin(a) * dist,
      vx: (Math.random() - 0.5) * 20,
      vy: -rise,
      life: 1500 / fade,
      size: api.rand(3, 5),
      glowIntensity: preset.glowIntensity * 0.7,
      riseSpeed: rise,
    })
  );
}
return particles;
`,
};

/** 현재 프리셋의 타입에 맞는 기본 생성 코드를 반환한다. 프리셋 수치를 읽도록 작성되어 있다. */
export function generateEffectCode(preset: Pick<EffectPreset, 'effectType'>): string {
  return TEMPLATES[preset.effectType];
}

export const EFFECT_CODE_API_REFERENCE = `ctx.preset            현재 이펙트 프리셋 (color, projectileSpeed 등 GUI 설정값)
ctx.position          발생 위치 {x, y}
ctx.targetPosition    타겟 위치 (없을 수 있음)
ctx.angle / distance  발생 위치 → 타겟의 각도(라디안) / 거리
ctx.skillRange / skillArea  스킬 사거리(px) / 범위 각도(도)
ctx.damage, owner, monsterId, skillName, targetId

api.particle({...})   프리셋 색상·텍스처·형태가 채워진 파티클 생성
                      주요 속성: x, y, vx, vy, life(ms), size, color, texture,
                      effectType, gravity(px/s²), drag(0~1), glowIntensity
api.rand(min, max)    난수
api.angleTo(a, b)     a → b 각도
api.groupId()         trail 파티클을 한 선으로 묶을 때 skillType: 'trail_' + groupId

반드시 파티클 배열을 return 하세요. (최대 ${MAX_PARTICLES}개)`;
