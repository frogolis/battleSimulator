/**
 * 파티클 시스템
 * 스킬 이펙트 파티클 생성, 업데이트, 렌더링
 */

import { SkillParticle, Position, MonsterState } from './types';
import { Skill, EFFECT_PRESETS } from '../skillSystem';
import {
  createEffect,
  createProjectileEffect,
  createTrailEffect,
  createLightningEffect,
  createRingEffect,
  createGlowEffect,
  updateNewParticle,
  updateNewParticles,
  renderNewParticle,
  renderNewParticles,
  type CreateEffectOptions,
} from './particles-new';

// 새로운 5가지 이펙트 시스템 re-export
export {
  createEffect,
  createProjectileEffect,
  createTrailEffect,
  createLightningEffect,
  createRingEffect,
  createGlowEffect,
  updateNewParticle,
  updateNewParticles,
  renderNewParticle,
  renderNewParticles,
  type CreateEffectOptions,
};

/**
 * 파티클 타입별 업데이트 전략
 */
export type ParticleUpdateStrategy = 'projectile' | 'aoe_burst' | 'static';

export interface ParticleCreateOptions {
  position: Position;
  targetPosition?: Position;
  skill: Skill;
  count?: number;
  strategy: ParticleUpdateStrategy;
  // 투사체 정보 (파티클이 투사체 역할을 할 때)
  damage?: number;
  owner?: 'player' | 'monster';
  monsterId?: number;
}

/**
 * 원거리 공격 파티클 생성 (발사 방향으로 집중)
 */
export function createProjectileParticles(
  options: ParticleCreateOptions,
  particleIdCounter: { current: number }
): SkillParticle[] {
  const { position, targetPosition, skill, count } = options;
  const particles: SkillParticle[] = [];
  
  if (!targetPosition) return particles;
  
  const dx = targetPosition.x - position.x;
  const dy = targetPosition.y - position.y;
  const attackAngle = Math.atan2(dy, dx);
  
  // 투사체 속도 (픽셀/초)
  const baseSpeed = skill.projectile?.speed || 300;
  
  for (let i = 0; i < (count || skill.visual.particleCount); i++) {
    const spreadAngle = 0.3; // 좁은 스프레드
    const angle = attackAngle + (Math.random() - 0.5) * spreadAngle;
    const speed = baseSpeed * (0.8 + Math.random() * 0.4);
    const color = Math.random() > 0.5 
      ? skill.visual.color 
      : skill.visual.secondaryColor;
    
    particles.push({
      id: particleIdCounter.current++,
      x: position.x,
      y: position.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: skill.visual.particleLifetime,
      maxLife: skill.visual.particleLifetime,
      size: skill.visual.particleSize,
      color: color,
      skillType: skill.id,
      strategy: 'projectile',
    });
  }
  
  return particles;
}



/**
 * AOE 폭발 파티클 생성 (중심에서 사방으로 퍼짐)
 */
export function createAoeBurstParticles(
  options: ParticleCreateOptions,
  particleIdCounter: { current: number }
): SkillParticle[] {
  const { position, skill, count } = options;
  const particles: SkillParticle[] = [];
  
  for (let i = 0; i < (count || skill.visual.particleCount * 2); i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 150; // 픽셀/초
    const color = Math.random() > 0.5 
      ? skill.visual.color 
      : skill.visual.secondaryColor;
    
    particles.push({
      id: particleIdCounter.current++,
      x: position.x,
      y: position.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: skill.visual.particleLifetime * 1.5,
      maxLife: skill.visual.particleLifetime * 1.5,
      size: skill.visual.particleSize * 1.2,
      color: color,
      skillType: skill.id,
      strategy: 'aoe_burst',
    });
  }
  
  return particles;
}

/**
 * 스킬 effectShape에 따른 파티클 생성 (스킬 전용)
 * 이펙트 자체가 투사체 역할을 함
 */
export function createSkillEffectParticles(
  options: ParticleCreateOptions,
  particleIdCounter: { current: number }
): SkillParticle[] {
  const { position, targetPosition, skill, count, damage, owner, monsterId } = options;
  const particles: SkillParticle[] = [];
  
  if (!targetPosition) return particles;
  
  const dx = targetPosition.x - position.x;
  const dy = targetPosition.y - position.y;
  const baseAngle = Math.atan2(dy, dx);
  const effectShape = skill.visual?.effectShape || 'circle';
  const particleCount = count || skill.visual.particleCount;
  
  // 투사체 속도 (원거리 스킬용)
  const isProjectile = skill.projectile?.type !== 'none';
  const projectileSpeed = isProjectile ? (skill.projectile?.speed || 400) : 0;
  
  for (let i = 0; i < particleCount; i++) {
    let angle = 0;
    let distance = 0;
    let speed = 0;
    
    switch (effectShape) {
      case 'circle':
        if (isProjectile) {
          // 투사체 모드: 타겟 방향으로 원형 집단 이동
          angle = baseAngle + (Math.random() - 0.5) * 0.4;
          distance = Math.random() * 15;
          speed = projectileSpeed * (0.9 + Math.random() * 0.2);
        } else {
          // 영역 모드: 중심에서 사방으로 확산
          angle = Math.random() * Math.PI * 2;
          distance = Math.random() * skill.range * 0.3;
          speed = 3 + Math.random() * 3;
        }
        break;
        
      case 'cone':
        // 부채꼴 형태
        const coneSpread = (skill.area * Math.PI / 180) / 2;
        angle = baseAngle + (Math.random() - 0.5) * coneSpread * 2;
        distance = Math.random() * skill.range * 0.3;
        speed = isProjectile ? projectileSpeed * (0.8 + Math.random() * 0.4) : 3 + Math.random() * 4;
        break;
        
      case 'line':
        // 직선 형태 (좁은 스프레드)
        angle = baseAngle + (Math.random() - 0.5) * 0.15;
        distance = Math.random() * 20;
        speed = isProjectile ? projectileSpeed * (0.9 + Math.random() * 0.2) : 4 + Math.random() * 3;
        break;
        
      case 'ring':
        // 링 형태 (테두리)
        angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.3;
        distance = skill.range * 0.7 + Math.random() * skill.range * 0.2;
        speed = 2 + Math.random() * 2;
        break;
        
      case 'star':
        // 별 모양 (5개 꼭지점)
        const starPoint = Math.floor(i / (particleCount / 5));
        const pointAngle = (starPoint * Math.PI * 2) / 5;
        angle = baseAngle + pointAngle + (Math.random() - 0.5) * 0.4;
        distance = Math.random() * skill.range * 0.5;
        speed = isProjectile ? projectileSpeed * (0.8 + Math.random() * 0.4) : 3 + Math.random() * 3;
        break;
        
      case 'shield':
        // 방패 형태 (반원)
        angle = baseAngle + (Math.random() - 0.5) * Math.PI;
        distance = skill.range * 0.6 + Math.random() * 20;
        speed = 1 + Math.random();
        break;
        
      case 'dome':
        // 돔 형태 (위쪽 반구)
        angle = Math.random() * Math.PI * 2;
        distance = Math.random() * skill.range * 0.8;
        speed = 1.5 + Math.random() * 1.5;
        break;
        
      case 'spiral':
        // 나선 형태
        const spiralRot = (i / particleCount) * Math.PI * 4;
        angle = baseAngle + spiralRot;
        distance = (i / particleCount) * skill.range * 0.5;
        speed = isProjectile ? projectileSpeed * 0.8 : 2 + Math.random() * 2;
        break;
        
      case 'cross':
        // 십자 형태
        const crossArm = Math.floor((i / particleCount) * 4);
        angle = baseAngle + (crossArm * Math.PI / 2) + (Math.random() - 0.5) * 0.2;
        distance = Math.random() * skill.range * 0.4;
        speed = isProjectile ? projectileSpeed * (0.8 + Math.random() * 0.4) : 3 + Math.random() * 3;
        break;
        
      case 'wave':
        // 파동 형태 (sine wave)
        const waveOffset = (i / particleCount - 0.5) * skill.range * 0.8;
        const perpAngle = baseAngle + Math.PI / 2;
        angle = baseAngle + (Math.random() - 0.5) * 0.1;
        distance = Math.abs(waveOffset) * 0.3;
        speed = isProjectile ? projectileSpeed * (0.9 + Math.random() * 0.2) : 3 + Math.random() * 3;
        
        // 파동 오프셋 적용
        const startX = position.x + Math.cos(perpAngle) * waveOffset;
        const startY = position.y + Math.sin(perpAngle) * waveOffset;
        
        const color = Math.random() > 0.5 
          ? skill.visual.color 
          : skill.visual.secondaryColor;
        
        particles.push({
          id: particleIdCounter.current++,
          x: startX,
          y: startY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: skill.visual.particleLifetime,
          maxLife: skill.visual.particleLifetime,
          size: skill.visual.particleSize,
          color: color,
          skillType: skill.id,
          strategy: isProjectile ? 'projectile' : 'aoe_burst',
          // 투사체 정보
          damage: isProjectile ? damage : undefined,
          owner: isProjectile ? owner : undefined,
          monsterId: isProjectile ? monsterId : undefined,
          hasHit: false,
          startPosition: isProjectile ? { x: startX, y: startY } : undefined,
          travelDistance: 0,
        });
        continue;
        
      default:
        angle = Math.random() * Math.PI * 2;
        distance = Math.random() * skill.range;
        speed = 3 + Math.random() * 3;
    }
    
    const color = Math.random() > 0.5 
      ? skill.visual.color 
      : skill.visual.secondaryColor;
    
    const startX = position.x + Math.cos(angle) * distance;
    const startY = position.y + Math.sin(angle) * distance;
    
    particles.push({
      id: particleIdCounter.current++,
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: skill.visual.particleLifetime,
      maxLife: skill.visual.particleLifetime,
      size: skill.visual.particleSize,
      color: color,
      skillType: skill.id,
      strategy: isProjectile ? 'projectile' : 'aoe_burst',
      // 투사체 정보
      damage: isProjectile ? damage : undefined,
      owner: isProjectile ? owner : undefined,
      monsterId: isProjectile ? monsterId : undefined,
      hasHit: false,
      startPosition: isProjectile ? { x: startX, y: startY } : undefined,
      travelDistance: 0,
    });
  }
  
  return particles;
}

/**
 * 스킬 타입에 따라 적절한 파티클 생성
 */
export function createSkillParticles(
  options: ParticleCreateOptions,
  particleIdCounter: { current: number }
): SkillParticle[] {
  const { skill, strategy, position, targetPosition, damage, owner, monsterId } = options;
  
  // 새로운 이펙트 시스템 사용 (effectPresetId가 있으면)
  if (skill.visual.effectPresetId) {
    const preset = EFFECT_PRESETS[skill.visual.effectPresetId];
    if (preset) {
      // 🔍 디버깅: createEffect 호출 전 값 확인
      console.log('🔵 [createSkillParticles] createEffect 호출 직전', {
        skillId: skill.id,
        skillName: skill.name,
        presetId: skill.visual.effectPresetId,
        skillRange: skill.range,
        skillArea: skill.area
      });
      
      return createEffect({
        preset,
        position,
        targetPosition,
        owner,
        monsterId,
        damage,
        skillName: skill.name,
        skillArea: skill.area, // 스킬 범위/각도 전달 (궤적 이펙트용)
        skillRange: skill.range, // 스킬 사거리 전달 (궤적 이펙트 반지름용)
      });
    }
  }
  
  // 기존 시스템 (하위 호환성)
  switch (strategy) {
    case 'projectile':
      return createProjectileParticles(options, particleIdCounter);
    
    case 'aoe_burst':
      return createAoeBurstParticles(options, particleIdCounter);
    
    case 'static':
      // 정적 이펙트 (위치 고정, 서서히 사라짐)
      return [];
    
    default:
      // 기본값: 스킬의 projectile 타입에 따라 자동 결정
      if (skill.projectile?.type !== 'none') {
        return createProjectileParticles(options, particleIdCounter);
      } else {
        // 스킬은 effectShape 기반 파티클 사용
        return createSkillEffectParticles(options, particleIdCounter);
      }
  }
}

/**
 * 파티클 업데이트 (전략 패턴)
 */
export function updateParticle(
  particle: SkillParticle,
  deltaTime: number
): SkillParticle {
  const strategy = particle.strategy || 'projectile';
  const now = Date.now();
  
  switch (strategy) {
    case 'projectile':
    case 'aoe_burst':
      // deltaTime 기반 업데이트 (픽셀/초)
      const newX = particle.x + particle.vx * deltaTime;
      const newY = particle.y + particle.vy * deltaTime;
      
      // 투사체 이동 거리 계산
      let newTravelDistance = particle.travelDistance || 0;
      if (particle.startPosition) {
        const dx = newX - particle.startPosition.x;
        const dy = newY - particle.startPosition.y;
        newTravelDistance = Math.sqrt(dx * dx + dy * dy);
      }
      
      // 궤적 히스토리 업데이트
      let newTrailHistory = particle.trailHistory || [];
      if (particle.trailEnabled && particle.trailLength && particle.trailLength > 0) {
        // 현재 위치를 히스토리에 추가
        newTrailHistory = [
          ...newTrailHistory,
          { x: particle.x, y: particle.y, timestamp: now }
        ];
        
        // 오래된 포인트 제거 (최대 길이 유지)
        if (newTrailHistory.length > particle.trailLength) {
          newTrailHistory = newTrailHistory.slice(-particle.trailLength);
        }
      }
      
      return {
        ...particle,
        x: newX,
        y: newY,
        life: particle.life - deltaTime * 1000,
        travelDistance: newTravelDistance,
        trailHistory: newTrailHistory,
      };
    
    case 'static':
      // 위치 고정, 수명만 감소
      return {
        ...particle,
        life: particle.life - deltaTime * 1000,
      };
    
    default:
      return {
        ...particle,
        x: particle.x + particle.vx * deltaTime,
        y: particle.y + particle.vy * deltaTime,
        life: particle.life - deltaTime * 1000,
      };
  }
}

/**
 * 파티클 배열 업데이트 및 필터링
 */
export function updateParticles(
  particles: SkillParticle[],
  deltaTime: number
): SkillParticle[] {
  return particles
    .filter((p): p is SkillParticle => {
      // undefined 파티클 제거 및 유효성 검사
      return !!(
        p &&
        typeof p.x === 'number' &&
        isFinite(p.x) &&
        isFinite(p.y) &&
        isFinite(p.vx) &&
        isFinite(p.vy) &&
        isFinite(p.size) &&
        isFinite(p.life) &&
        isFinite(p.maxLife) &&
        p.size > 0
      );
    })
    .map((p) => updateParticle(p, deltaTime))
    .filter((p): p is SkillParticle => {
      // 수명이 다한 파티클 제거
      return (
        isFinite(p.x) &&
        isFinite(p.y) &&
        isFinite(p.size) &&
        p.size > 0 &&
        p.life > 0
      );
    });
}

/**
 * 파티클 렌더링
 */
export function renderParticle(
  ctx: CanvasRenderingContext2D,
  particle: SkillParticle,
  skillConfigs?: Record<string, Skill>
): void {
  // 안전성 체크
  if (
    !isFinite(particle.x) ||
    !isFinite(particle.y) ||
    !isFinite(particle.size) ||
    !isFinite(particle.life) ||
    !isFinite(particle.maxLife) ||
    particle.size <= 0
  ) {
    return;
  }

  const alpha = particle.life / particle.maxLife;

  // 궤적 렌더링 (파티클 본체 전에)
  if (particle.trailEnabled && particle.trailHistory && particle.trailHistory.length > 1) {
    const trailWidth = particle.trailWidth || 2;
    const now = Date.now();
    
    ctx.save();
    
    // 선 스타일로 궤적 그리기
    ctx.strokeStyle = particle.color;
    ctx.lineWidth = trailWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // 히스토리 포인트를 선으로 연결
    ctx.beginPath();
    for (let i = 0; i < particle.trailHistory.length; i++) {
      const point = particle.trailHistory[i];
      const age = now - point.timestamp;
      const maxAge = 1000; // 1초
      const pointAlpha = Math.max(0, 1 - (age / maxAge));
      
      // 오래된 포인트일수록 투명하게
      const trailOpacity = pointAlpha * alpha * 0.7;
      const hexAlpha = Math.floor(trailOpacity * 255).toString(16).padStart(2, '0');
      
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        // 그라디언트 효과를 위해 세그먼트별로 그리기
        const prevPoint = particle.trailHistory[i - 1];
        ctx.strokeStyle = particle.color + hexAlpha;
        ctx.beginPath();
        ctx.moveTo(prevPoint.x, prevPoint.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
    }
    
    // 현재 위치까지 연결
    if (particle.trailHistory.length > 0) {
      const lastPoint = particle.trailHistory[particle.trailHistory.length - 1];
      const hexAlpha = Math.floor(alpha * 0.9 * 255).toString(16).padStart(2, '0');
      ctx.strokeStyle = particle.color + hexAlpha;
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(particle.x, particle.y);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  // Glow effect
  if (particle.skillType && skillConfigs) {
    const skill = skillConfigs[particle.skillType];
    if (skill && skill.visual.glowIntensity > 0) {
      const glowRadius = particle.size * 2;
      
      if (!isFinite(glowRadius) || glowRadius <= 0) return;
      
      const gradient = ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        glowRadius,
      );
      gradient.addColorStop(
        0,
        particle.color +
          Math.floor(alpha * skill.visual.glowIntensity * 255)
            .toString(16)
            .padStart(2, '0'),
      );
      gradient.addColorStop(1, particle.color + '00');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Main particle
  ctx.fillStyle =
    particle.color +
    Math.floor(alpha * 255)
      .toString(16)
      .padStart(2, '0');
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * 파티클 배열 렌더링
 */
export function renderParticles(
  ctx: CanvasRenderingContext2D,
  particles: SkillParticle[],
  skillConfigs?: Record<string, Skill>
): void {
  particles.forEach((particle) => {
    if (!particle || typeof particle.x !== 'number') return;
    renderParticle(ctx, particle, skillConfigs);
  });
}
