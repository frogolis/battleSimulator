/**
 * 새로운 파티클 시스템 (5가지 이펙트 타입)
 * - projectile: 투사체 발사
 * - trail: 궤적 이펙트
 * - lightning: 번개 연결
 * - ring: 링/동심원
 * - glow: 글로우 + 상승 파티클
 */

import { SkillParticle, Position, LightningSegment, MonsterState, TrailEffect } from './types';
import { EffectPreset } from '../skillSystem';

let particleIdCounter = 0;

/**
 * 파티클 생성 옵션
 */
export interface CreateEffectOptions {
  preset: EffectPreset;
  position: Position;
  targetPosition?: Position;
  targetId?: number;
  owner?: 'player' | 'monster';
  monsterId?: number;
  damage?: number;
  skillName?: string; // 스킬 이름 (데미지 텍스트 표시용)
  skillArea?: number; // 스킬 범위/각도 (궤적 이펙트용, 도 단위)
  skillRange?: number; // 스킬 사거리 (궤적 이펙트 반지름용)
}

/**
 * ===== 투사체 이펙트 생성 =====
 */
export function createProjectileEffect(options: CreateEffectOptions): SkillParticle[] {
  const { preset, position, targetPosition, owner, monsterId, damage, skillName } = options;
  const particles: SkillParticle[] = [];
  
  if (!preset.projectilePattern || !preset.projectileCount) return particles;
  
  const count = preset.projectileCount;
  const speed = preset.projectileSpeed || 400;
  const size = preset.projectileSize || 8;
  const lifetime = preset.projectileLifetime || 1000;
  
  // 발사 각도 계산
  let baseAngle = 0;
  if (targetPosition) {
    const dx = targetPosition.x - position.x;
    const dy = targetPosition.y - position.y;
    baseAngle = Math.atan2(dy, dx);
  }
  
  for (let i = 0; i < count; i++) {
    let angle = baseAngle;
    
    // 패턴별 각도 조정
    switch (preset.projectilePattern) {
      case 'directional':
        // 방향성 발사 (약간의 스프레드)
        if (count > 1 && preset.spreadAngle) {
          const offset = (i - (count - 1) / 2) * (preset.spreadAngle / (count - 1));
          angle += offset;
        }
        break;
        
      case 'radial':
        // 방사형 발사 (360도 균등 분포)
        angle = (i / count) * Math.PI * 2;
        break;
        
      case 'cone':
        // 부채꼴 발사
        const spreadAngle = preset.spreadAngle || Math.PI / 4;
        if (count > 1) {
          const offset = (i - (count - 1) / 2) * (spreadAngle / (count - 1));
          angle += offset;
        }
        break;
    }
    
    // 속도 벡터 계산
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    
    particles.push({
      id: particleIdCounter++,
      x: position.x,
      y: position.y,
      vx,
      vy,
      life: lifetime,
      maxLife: lifetime,
      size,
      color: preset.color,
      secondaryColor: preset.secondaryColor,
      effectType: 'projectile',
      texture: preset.particleTexture,
      glowIntensity: preset.glowIntensity,
      
      // 투사체 데이터
      damage,
      owner,
      monsterId,
      hasHit: false,
      startPosition: { x: position.x, y: position.y },
      travelDistance: 0,
      isHoming: preset.isHoming,
      targetId: preset.isHoming ? options.targetId : undefined,
      skillName,
      
      // 궤적 설정 (투사체는 항상 궤적을 남김)
      trailEnabled: true,
      trailHistory: [],
      trailLength: 20,
      trailWidth: size * 0.5,
    });
  }
  
  return particles;
}

/**
 * ===== 궤적 이펙트 생성 (TrailEffect 타입 사용) =====
 */
let trailIdCounter = 0;

export function createTrailEffectDirect(options: CreateEffectOptions): TrailEffect | null {
  const { preset, position, targetPosition, skillArea } = options;
  
  if (!preset.trailLength) return null;
  
  // 공격 방향 계산
  let angle = 0;
  if (targetPosition) {
    const dx = targetPosition.x - position.x;
    const dy = targetPosition.y - position.y;
    angle = Math.atan2(dy, dx);
  }
  
  // 스킬 범위(각도)에 따라 길이 조절
  // skillArea는 도 단위, 넓을수록 길어짐
  // 기본 범위(90도)를 기준으로 스케일 조정
  const areaMultiplier = skillArea ? (skillArea / 90) : 1.0;
  const length = preset.trailLength * areaMultiplier;
  const width = preset.trailWidth || 5;
  const pointCount = preset.trailParticleCount || 20;
  const lifetime = 400; // 400ms 동안 표시
  
  // 궤적 타입별 점 생성
  const points: Position[] = [];
  
  if (preset.trailType === 'slash') {
    // 베기 - 호 모양
    // skillArea 값이 있으면 그 값을 호 각도로 사용, 없으면 기본 60도
    const arcAngle = skillArea ? (skillArea * Math.PI / 180) : (Math.PI / 3);
    const startAngle = angle - arcAngle / 2;
    
    for (let i = 0; i <= pointCount; i++) {
      const progress = i / pointCount;
      const currentAngle = startAngle + arcAngle * progress;
      const x = position.x + Math.cos(currentAngle) * length;
      const y = position.y + Math.sin(currentAngle) * length;
      points.push({ x, y });
    }
  } else if (preset.trailType === 'thrust') {
    // 찌르기 - 직선
    for (let i = 0; i <= pointCount; i++) {
      const progress = i / pointCount;
      const x = position.x + Math.cos(angle) * length * progress;
      const y = position.y + Math.sin(angle) * length * progress;
      points.push({ x, y });
    }
  } else if (preset.trailType === 'spin') {
    // 회전 - 원
    for (let i = 0; i <= pointCount; i++) {
      const currentAngle = (i / pointCount) * Math.PI * 2;
      const x = position.x + Math.cos(currentAngle) * length;
      const y = position.y + Math.sin(currentAngle) * length;
      points.push({ x, y });
    }
  }
  
  return {
    id: trailIdCounter++,
    points,
    color: preset.color,
    secondaryColor: preset.secondaryColor,
    width,
    life: lifetime,
    maxLife: lifetime,
    glowIntensity: preset.glowIntensity || 0.7,
  };
}

/**
 * ===== 궤적 이펙트 생성 (레거시 - 파티클 방식) =====
 */
export function createTrailEffect(options: CreateEffectOptions): SkillParticle[] {
  const { preset, position, targetPosition, skillArea, skillRange } = options;
  const particles: SkillParticle[] = [];
  
  // 🔍 디버깅: 전달받은 모든 값 확인
  console.log('🔴 [createTrailEffect] 호출됨', {
    presetId: preset.id,
    skillRange,
    skillArea,
    hasTargetPosition: !!targetPosition
  });
  
  // CRITICAL: skillRange가 없으면 궤적 이펙트를 생성하지 않음
  // 궤적 이펙트는 반드시 스킬의 실제 범위를 따라야 하므로
  if (!skillRange) {
    console.warn('⚠️ [Trail Effect] skillRange가 없어서 궤적 이펙트를 생성하지 않습니다');
    return particles;
  }
  
  if (!preset.trailParticleCount) return particles;
  
  // 공격 방향 계산
  let angle = 0;
  if (targetPosition) {
    const dx = targetPosition.x - position.x;
    const dy = targetPosition.y - position.y;
    angle = Math.atan2(dy, dx);
  }
  
  // 스킬 사거리 사용 (위에서 이미 null 체크 완료)
  const radius = skillRange;
  const count = preset.trailParticleCount;
  const width = preset.trailWidth || 5;
  const fadeSpeed = preset.trailFadeSpeed || 1.0;
  const trailType = preset.trailType || 'thrust';
  
  // 디버깅: 실제 사용되는 값 출력
  if (preset.id === 'trail_slash' && Math.random() < 0.1) {
    console.log('🔴 [Trail Effect] 궤적 생성', {
      radius: radius + 'px',
      skillArea: skillArea + '°',
      skillRange: skillRange + 'px'
    });
  }
  
  // 이 궤적 그룹의 고유 ID (같은 휘두르기의 파티클들을 묶기 위해)
  const groupId = particleIdCounter;
  
  // 궤적 타입별 파티클 생성
  for (let i = 0; i < count; i++) {
    const progress = i / count;
    let x = position.x;
    let y = position.y;
    
    switch (trailType) {
      case 'slash': {
        // 호 형태 베기
        // CRITICAL: skillArea를 절대 우선 사용 (범위 UI와 일치하도록)
        const arcAngle = skillArea !== undefined
          ? (skillArea * Math.PI / 180) 
          : (preset.trailArcAngle || Math.PI / 2.5);
        
        const startAngle = angle - arcAngle / 2;
        const currentAngle = startAngle + arcAngle * progress;
        // 반지름은 skillRange 사용 (위에서 null 체크 완료)
        x = position.x + Math.cos(currentAngle) * radius;
        y = position.y + Math.sin(currentAngle) * radius;
        break;
      }
      case 'thrust': {
        // 직선 찌르기
        const distance = progress * radius;
        x = position.x + Math.cos(angle) * distance;
        y = position.y + Math.sin(angle) * distance;
        break;
      }
      case 'spin': {
        // 회전 궤적
        const currentAngle = progress * Math.PI * 2;
        x = position.x + Math.cos(currentAngle) * radius;
        y = position.y + Math.sin(currentAngle) * radius;
        break;
      }
    }
    
    // 약간의 랜덤 오프셋 (궤적에 두께감 추가)
    const offsetAngle = Math.atan2(y - position.y, x - position.x) + Math.PI / 2;
    const offsetDist = (Math.random() - 0.5) * width;
    const finalX = x + Math.cos(offsetAngle) * offsetDist;
    const finalY = y + Math.sin(offsetAngle) * offsetDist;
    
    particles.push({
      id: particleIdCounter++,
      x: finalX,
      y: finalY,
      vx: 0,
      vy: 0,
      life: 500 / fadeSpeed,
      maxLife: 500 / fadeSpeed,
      size: 5 + Math.random() * 3,
      color: preset.color,
      secondaryColor: preset.secondaryColor,
      effectType: 'trail',
      texture: preset.particleTexture,
      glowIntensity: preset.glowIntensity,
      skillType: `trail_${groupId}`, // 같은 그룹의 파티클들을 식별
    });
  }
  
  return particles;
}

/**
 * ===== 번개 이펙트 생성 =====
 */
export function createLightningEffect(options: CreateEffectOptions): SkillParticle[] {
  const { preset, position, targetPosition } = options;
  const particles: SkillParticle[] = [];
  
  if (!targetPosition || !preset.lightningSegments) return particles;
  
  const segments = preset.lightningSegments;
  const jitter = preset.lightningJitter || 10;
  const forkChance = preset.lightningForkChance || 0.2;
  
  // 번개 세그먼트 생성
  const lightningSegments: LightningSegment[] = [];
  
  // 메인 번개 경로
  let currentPos = { ...position };
  const dx = (targetPosition.x - position.x) / segments;
  const dy = (targetPosition.y - position.y) / segments;
  
  for (let i = 0; i < segments; i++) {
    const nextX = position.x + dx * (i + 1) + (Math.random() - 0.5) * jitter;
    const nextY = position.y + dy * (i + 1) + (Math.random() - 0.5) * jitter;
    
    lightningSegments.push({
      start: { ...currentPos },
      end: { x: nextX, y: nextY },
      brightness: 0.8 + Math.random() * 0.2,
    });
    
    // 번개 갈라짐
    if (Math.random() < forkChance && i < segments - 2) {
      const forkAngle = (Math.random() - 0.5) * Math.PI / 2;
      const forkDist = (segments - i) * Math.sqrt(dx * dx + dy * dy) * 0.5;
      const forkX = nextX + Math.cos(forkAngle) * forkDist;
      const forkY = nextY + Math.sin(forkAngle) * forkDist;
      
      lightningSegments.push({
        start: { x: nextX, y: nextY },
        end: { x: forkX, y: forkY },
        brightness: 0.5 + Math.random() * 0.3,
      });
    }
    
    currentPos = { x: nextX, y: nextY };
  }
  
  // 번개를 하나의 파티클로 표현 (세그먼트 정보 포함)
  particles.push({
    id: particleIdCounter++,
    x: position.x,
    y: position.y,
    vx: 0,
    vy: 0,
    life: 200,
    maxLife: 200,
    size: 2,
    color: preset.color,
    secondaryColor: preset.secondaryColor,
    effectType: 'lightning',
    texture: 'spark',
    glowIntensity: preset.glowIntensity,
    lightningSegments,
    lightningTarget: targetPosition,
  });
  
  return particles;
}

/**
 * ===== 링 이펙트 생성 =====
 */
export function createRingEffect(options: CreateEffectOptions): SkillParticle[] {
  const { preset, position } = options;
  const particles: SkillParticle[] = [];
  
  if (!preset.ringRadius || !preset.ringExpansionSpeed) return particles;
  
  const ringCount = preset.ringCount || 1;
  const interval = preset.ringInterval || 0;
  
  for (let i = 0; i < ringCount; i++) {
    const delay = i * interval;
    const startRadius = 10;
    const maxRadius = preset.ringRadius;
    const expansionSpeed = preset.ringExpansionSpeed;
    
    // 링을 구성하는 파티클 개수 (원주에 따라)
    const particleCount = Math.floor(maxRadius / 3);
    
    for (let j = 0; j < particleCount; j++) {
      const angle = (j / particleCount) * Math.PI * 2;
      
      particles.push({
        id: particleIdCounter++,
        x: position.x + Math.cos(angle) * startRadius,
        y: position.y + Math.sin(angle) * startRadius,
        vx: Math.cos(angle) * expansionSpeed,
        vy: Math.sin(angle) * expansionSpeed,
        life: ((maxRadius - startRadius) / expansionSpeed) * 1000 + delay,
        maxLife: ((maxRadius - startRadius) / expansionSpeed) * 1000 + delay,
        size: 4,
        color: preset.color,
        secondaryColor: preset.secondaryColor,
        effectType: 'ring',
        texture: preset.particleTexture,
        glowIntensity: preset.glowIntensity,
        ringRadius: startRadius,
        ringStartRadius: startRadius,
        ringExpansionSpeed: expansionSpeed,
      });
    }
  }
  
  return particles;
}

/**
 * ===== 글로우 이펙트 생성 =====
 */
export function createGlowEffect(options: CreateEffectOptions): SkillParticle[] {
  const { preset, position } = options;
  const particles: SkillParticle[] = [];
  
  if (!preset.glowRadius || !preset.glowParticleCount) return particles;
  
  const radius = preset.glowRadius;
  const count = preset.glowParticleCount;
  const riseSpeed = preset.glowRiseSpeed || 60;
  const fadeSpeed = preset.glowFadeSpeed || 0.8;
  
  // 중앙 글로우 파티클
  particles.push({
    id: particleIdCounter++,
    x: position.x,
    y: position.y,
    vx: 0,
    vy: 0,
    life: 1000 / fadeSpeed,
    maxLife: 1000 / fadeSpeed,
    size: radius,
    color: preset.color,
    secondaryColor: preset.secondaryColor,
    effectType: 'glow',
    texture: 'circle',
    glowIntensity: preset.glowIntensity,
  });
  
  // 상승하는 파티클들
  for (let i = 0; i < count; i++) {
    // 원형 영역 내 랜덤 위치
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius * 0.8;
    const x = position.x + Math.cos(angle) * dist;
    const y = position.y + Math.sin(angle) * dist;
    
    // 약간의 수평 이동 + 상승
    const vx = (Math.random() - 0.5) * 20;
    const vy = -riseSpeed;
    
    particles.push({
      id: particleIdCounter++,
      x,
      y,
      vx,
      vy,
      life: 1500 / fadeSpeed,
      maxLife: 1500 / fadeSpeed,
      size: 3 + Math.random() * 2,
      color: preset.color,
      secondaryColor: preset.secondaryColor,
      effectType: 'glow',
      texture: preset.particleTexture,
      glowIntensity: preset.glowIntensity * 0.7,
      riseSpeed,
    });
  }
  
  return particles;
}

/**
 * ===== 통합 이펙트 생성 함수 =====
 */
export function createEffect(options: CreateEffectOptions): SkillParticle[] {
  const { preset, skillRange, skillArea } = options;
  
  // 🔍 디버깅: 진입점 확인
  console.log('🟢 [createEffect] 호출됨', {
    presetId: preset.id,
    effectType: preset.effectType,
    skillRange,
    skillArea
  });
  
  switch (preset.effectType) {
    case 'projectile':
      return createProjectileEffect(options);
    case 'trail':
      return createTrailEffect(options);
    case 'lightning':
      return createLightningEffect(options);
    case 'ring':
      return createRingEffect(options);
    case 'glow':
      return createGlowEffect(options);
    default:
      return [];
  }
}

/**
 * ===== 파티클 업데이트 =====
 */
export function updateNewParticle(
  particle: SkillParticle,
  deltaTime: number,
  monsters?: MonsterState[]
): SkillParticle {
  const updated = { ...particle };
  
  // 수명 감소
  updated.life = particle.life - deltaTime * 1000;
  
  switch (particle.effectType) {
    case 'projectile':
      // 유도 처리
      if (particle.isHoming && particle.targetId !== undefined && monsters) {
        const target = monsters.find(m => m.id === particle.targetId && !m.isDead);
        if (target) {
          const dx = target.position.x - particle.x;
          const dy = target.position.y - particle.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 0) {
            // 유도 강도
            const homingStrength = 300; // px/s²
            const ax = (dx / dist) * homingStrength * deltaTime;
            const ay = (dy / dist) * homingStrength * deltaTime;
            
            updated.vx = particle.vx + ax;
            updated.vy = particle.vy + ay;
            
            // 속도 제한
            const speed = Math.sqrt(updated.vx * updated.vx + updated.vy * updated.vy);
            const maxSpeed = 600;
            if (speed > maxSpeed) {
              updated.vx = (updated.vx / speed) * maxSpeed;
              updated.vy = (updated.vy / speed) * maxSpeed;
            }
          }
        }
      }
      
      // 위치 업데이트
      updated.x = particle.x + particle.vx * deltaTime;
      updated.y = particle.y + particle.vy * deltaTime;
      
      // 이동 거리 계산
      if (particle.startPosition) {
        const dx = updated.x - particle.startPosition.x;
        const dy = updated.y - particle.startPosition.y;
        updated.travelDistance = Math.sqrt(dx * dx + dy * dy);
      }
      
      // 궤적 업데이트
      if (particle.trailEnabled && particle.trailLength) {
        const now = Date.now();
        let newHistory = particle.trailHistory || [];
        newHistory = [...newHistory, { x: particle.x, y: particle.y, timestamp: now }];
        if (newHistory.length > particle.trailLength) {
          newHistory = newHistory.slice(-particle.trailLength);
        }
        updated.trailHistory = newHistory;
      }
      break;
      
    case 'trail':
      // 궤적은 정적 (위치 고정, 페이드만)
      break;
      
    case 'lightning':
      // 번개는 정적 (깜빡임 효과만)
      break;
      
    case 'ring':
      // 링 확장
      updated.x = particle.x + particle.vx * deltaTime;
      updated.y = particle.y + particle.vy * deltaTime;
      
      if (particle.ringRadius && particle.ringExpansionSpeed) {
        updated.ringRadius = particle.ringRadius + particle.ringExpansionSpeed * deltaTime;
      }
      break;
      
    case 'glow':
      // 글로우 파티클 상승
      if (particle.riseSpeed) {
        updated.x = particle.x + particle.vx * deltaTime;
        updated.y = particle.y + particle.vy * deltaTime;
      }
      break;
  }
  
  return updated;
}

/**
 * ===== 파티클 배열 업데이트 =====
 */
export function updateNewParticles(
  particles: SkillParticle[],
  deltaTime: number,
  monsters?: MonsterState[]
): SkillParticle[] {
  return particles
    .map(p => updateNewParticle(p, deltaTime, monsters))
    .filter(p => p.life > 0 && isFinite(p.x) && isFinite(p.y));
}

/**
 * ===== 파티클 렌더링 =====
 */
export function renderNewParticle(
  ctx: CanvasRenderingContext2D,
  particle: SkillParticle
): void {
  const alpha = Math.max(0, Math.min(1, particle.life / particle.maxLife));
  
  switch (particle.effectType) {
    case 'projectile':
      // 궤적 렌더링
      if (particle.trailEnabled && particle.trailHistory && particle.trailHistory.length > 1) {
        renderTrail(ctx, particle, alpha);
      }
      
      // 파티클 본체
      renderParticleBody(ctx, particle, alpha);
      break;
      
    case 'trail':
      renderParticleBody(ctx, particle, alpha);
      break;
      
    case 'lightning':
      renderLightning(ctx, particle, alpha);
      break;
      
    case 'ring':
      renderRingParticle(ctx, particle, alpha);
      break;
      
    case 'glow':
      renderGlowParticle(ctx, particle, alpha);
      break;
      
    default:
      renderParticleBody(ctx, particle, alpha);
  }
}

/**
 * 궤적 렌더링
 */
function renderTrail(
  ctx: CanvasRenderingContext2D,
  particle: SkillParticle,
  alpha: number
): void {
  if (!particle.trailHistory || particle.trailHistory.length < 2) return;
  
  const now = Date.now();
  const maxAge = 1000;
  
  ctx.save();
  ctx.strokeStyle = particle.color;
  ctx.lineWidth = particle.trailWidth || 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  for (let i = 1; i < particle.trailHistory.length; i++) {
    const prev = particle.trailHistory[i - 1];
    const curr = particle.trailHistory[i];
    const age = now - curr.timestamp;
    const pointAlpha = Math.max(0, 1 - age / maxAge);
    const trailAlpha = pointAlpha * alpha * 0.7;
    
    const hexAlpha = Math.floor(trailAlpha * 255).toString(16).padStart(2, '0');
    ctx.strokeStyle = particle.color + hexAlpha;
    
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.stroke();
  }
  
  ctx.restore();
}

/**
 * 파티클 본체 렌더링
 */
function renderParticleBody(
  ctx: CanvasRenderingContext2D,
  particle: SkillParticle,
  alpha: number
): void {
  const glowRadius = particle.size * 2 * (particle.glowIntensity || 0.5);
  
  // 글로우 효과
  if (particle.glowIntensity && particle.glowIntensity > 0) {
    const gradient = ctx.createRadialGradient(
      particle.x, particle.y, 0,
      particle.x, particle.y, glowRadius
    );
    const glowAlpha = Math.floor(alpha * particle.glowIntensity * 255).toString(16).padStart(2, '0');
    gradient.addColorStop(0, particle.color + glowAlpha);
    gradient.addColorStop(1, particle.color + '00');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // 텍스쳐별 렌더링
  const hexAlpha = Math.floor(alpha * 255).toString(16).padStart(2, '0');
  ctx.fillStyle = particle.color + hexAlpha;
  
  switch (particle.texture) {
    case 'circle':
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      break;
      
    case 'star':
      renderStar(ctx, particle.x, particle.y, particle.size, 5);
      break;
      
    case 'square':
      ctx.fillRect(
        particle.x - particle.size,
        particle.y - particle.size,
        particle.size * 2,
        particle.size * 2
      );
      break;
      
    case 'diamond':
      renderDiamond(ctx, particle.x, particle.y, particle.size);
      break;
      
    case 'spark':
      renderSpark(ctx, particle.x, particle.y, particle.size);
      break;
      
    default:
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
  }
}

/**
 * 번개 렌더링
 */
function renderLightning(
  ctx: CanvasRenderingContext2D,
  particle: SkillParticle,
  alpha: number
): void {
  if (!particle.lightningSegments) return;
  
  ctx.save();
  ctx.strokeStyle = particle.color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  
  // 글로우 레이어
  ctx.shadowBlur = 10;
  ctx.shadowColor = particle.color;
  
  for (const segment of particle.lightningSegments) {
    const segmentAlpha = alpha * segment.brightness;
    const hexAlpha = Math.floor(segmentAlpha * 255).toString(16).padStart(2, '0');
    ctx.strokeStyle = particle.color + hexAlpha;
    
    ctx.beginPath();
    ctx.moveTo(segment.start.x, segment.start.y);
    ctx.lineTo(segment.end.x, segment.end.y);
    ctx.stroke();
  }
  
  ctx.restore();
}

/**
 * 링 파티클 렌더링
 */
function renderRingParticle(
  ctx: CanvasRenderingContext2D,
  particle: SkillParticle,
  alpha: number
): void {
  renderParticleBody(ctx, particle, alpha);
}

/**
 * 글로우 파티클 렌더링
 */
function renderGlowParticle(
  ctx: CanvasRenderingContext2D,
  particle: SkillParticle,
  alpha: number
): void {
  // 큰 글로우 파티클 (중앙)
  if (particle.size > 20) {
    const gradient = ctx.createRadialGradient(
      particle.x, particle.y, 0,
      particle.x, particle.y, particle.size
    );
    const centerAlpha = Math.floor(alpha * 0.3 * 255).toString(16).padStart(2, '0');
    const edgeAlpha = Math.floor(alpha * 0.05 * 255).toString(16).padStart(2, '0');
    gradient.addColorStop(0, particle.color + centerAlpha);
    gradient.addColorStop(0.5, particle.secondaryColor + edgeAlpha);
    gradient.addColorStop(1, particle.color + '00');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 상승 파티클
    renderParticleBody(ctx, particle, alpha);
  }
}

/**
 * 별 모양 렌더링
 */
function renderStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, points: number): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points;
    const radius = i % 2 === 0 ? size : size * 0.5;
    const px = x + Math.cos(angle - Math.PI / 2) * radius;
    const py = y + Math.sin(angle - Math.PI / 2) * radius;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * 다이아몬드 모양 렌더링
 */
function renderDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
  ctx.fill();
}

/**
 * 스파크 모양 렌더링
 */
function renderSpark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.stroke();
}

/**
 * 파티클 배열 렌더링
 */
export function renderNewParticles(
  ctx: CanvasRenderingContext2D,
  particles: SkillParticle[],
  zoom?: number,
  testMode?: boolean
): void {
  // trail 파티클 그룹화 (skillType으로)
  const trailGroups = new Map<string, SkillParticle[]>();
  const otherParticles: SkillParticle[] = [];
  
  particles.forEach(particle => {
    if (particle.effectType === 'trail' && particle.skillType) {
      // skillType이 trail_xxx 형태로 그룹 ID가 포함되어 있음
      const key = particle.skillType;
      if (!trailGroups.has(key)) {
        trailGroups.set(key, []);
      }
      trailGroups.get(key)!.push(particle);
    } else {
      otherParticles.push(particle);
    }
  });
  
  // trail 그룹을 선으로 연결하여 렌더링
  trailGroups.forEach(group => {
    if (group.length > 1) {
      renderTrailGroup(ctx, group);
    }
  });
  
  // 나머지 파티클 렌더링
  otherParticles.forEach(particle => {
    if (particle.effectType) {
      renderNewParticle(ctx, particle);
    }
  });
}

/**
 * trail 파티클 그룹을 연결된 선으로 렌더링
 */
function renderTrailGroup(
  ctx: CanvasRenderingContext2D,
  particles: SkillParticle[]
): void {
  if (particles.length === 0) return;
  
  // 생명력이 가장 높은 파티클의 알파값 사용
  const maxLife = Math.max(...particles.map(p => p.life));
  const maxMaxLife = Math.max(...particles.map(p => p.maxLife));
  const alpha = Math.max(0, Math.min(1, maxLife / maxMaxLife));
  
  const firstParticle = particles[0];
  const lineWidth = particles[0].size || 4;
  
  // 글로우 효과
  if (firstParticle.glowIntensity && firstParticle.glowIntensity > 0) {
    ctx.save();
    ctx.strokeStyle = firstParticle.color;
    ctx.lineWidth = lineWidth * 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = alpha * firstParticle.glowIntensity * 0.3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = firstParticle.color;
    
    ctx.beginPath();
    particles.forEach((p, i) => {
      if (i === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
    });
    ctx.stroke();
    ctx.restore();
  }
  
  // 메인 선
  ctx.save();
  const hexAlpha = Math.floor(alpha * 255).toString(16).padStart(2, '0');
  ctx.strokeStyle = firstParticle.color + hexAlpha;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // 그라데이션 효과 (시작부터 끝까지)
  ctx.beginPath();
  particles.forEach((p, i) => {
    if (i === 0) {
      ctx.moveTo(p.x, p.y);
    } else {
      ctx.lineTo(p.x, p.y);
    }
  });
  ctx.stroke();
  
  // 보조 색상으로 더 얇은 선 (중앙)
  if (firstParticle.secondaryColor) {
    ctx.strokeStyle = firstParticle.secondaryColor + hexAlpha;
    ctx.lineWidth = lineWidth * 0.5;
    
    ctx.beginPath();
    particles.forEach((p, i) => {
      if (i === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
    });
    ctx.stroke();
  }
  
  ctx.restore();
}
