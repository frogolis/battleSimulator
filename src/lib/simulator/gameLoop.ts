/**
 * 게임 루프 헬퍼 함수
 * 프레임 업데이트, 쿨다운 관리, 충돌 감지 등
 */

import { CharacterState, MonsterState, Projectile, SkillParticle, Position } from './types';
import { checkCollision } from '../gameData';
import { PROJECTILE_MAX_DISTANCE } from './constants';

/**
 * 공격 쿨다운 업데이트
 * @param character 캐릭터 또는 몬스터
 * @param deltaTime 경과 시간 (밀리초)
 */
export function updateAttackCooldown(
  character: CharacterState | MonsterState,
  deltaTime: number
): void {
  if (character.attackCooldown > 0) {
    character.attackCooldown = Math.max(0, character.attackCooldown - deltaTime);
  }
}

/**
 * 넉백 업데이트
 * @param monster 몬스터
 * @param deltaTime 경과 시간 (초)
 * @param decayRate 감쇠율
 */
export function updateKnockback(
  monster: MonsterState,
  deltaTime: number,
  decayRate: number = 0.9
): void {
  const knockbackDuration = 300; // 300ms
  const timeSinceKnockback = Date.now() - monster.knockbackTime;

  if (timeSinceKnockback < knockbackDuration) {
    // 넉백 적용
    monster.position.x += monster.velocity.x * deltaTime;
    monster.position.y += monster.velocity.y * deltaTime;

    // 속도 감쇠
    monster.velocity.x *= decayRate;
    monster.velocity.y *= decayRate;
  } else {
    // 넉백 종료
    monster.velocity = { x: 0, y: 0 };
  }
}

/**
 * 투사체 위치 업데이트
 * @param projectile 투사체
 * @param deltaTime 경과 시간 (초)
 */
export function updateProjectilePosition(
  projectile: Projectile,
  deltaTime: number
): void {
  projectile.position.x += projectile.velocity.x * deltaTime;
  projectile.position.y += projectile.velocity.y * deltaTime;

  // 이동 거리 계산
  const dx = projectile.position.x - projectile.startPosition.x;
  const dy = projectile.position.y - projectile.startPosition.y;
  projectile.travelDistance = Math.sqrt(dx * dx + dy * dy);
}

/**
 * 유도 미사일 업데이트
 * @param projectile 투사체
 * @param target 타겟 (몬스터 또는 플레이어)
 * @param homingStrength 유도 강도 (0-1)
 * @param deltaTime 경과 시간 (초)
 */
export function updateHomingProjectile(
  projectile: Projectile,
  target: Position,
  homingStrength: number = 0.1,
  deltaTime: number
): void {
  if (!projectile.isHoming) return;

  const dx = target.x - projectile.position.x;
  const dy = target.y - projectile.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > 0) {
    const currentSpeed = Math.sqrt(
      projectile.velocity.x * projectile.velocity.x +
      projectile.velocity.y * projectile.velocity.y
    );

    // 타겟 방향으로 속도 조정
    const targetVx = (dx / distance) * currentSpeed;
    const targetVy = (dy / distance) * currentSpeed;

    projectile.velocity.x += (targetVx - projectile.velocity.x) * homingStrength;
    projectile.velocity.y += (targetVy - projectile.velocity.y) * homingStrength;
  }
}

/**
 * 투사체가 유효한지 체크
 * @param projectile 투사체
 * @param canvasWidth 캔버스 너비
 * @param canvasHeight 캔버스 높이
 * @returns 유효 여부
 */
export function isProjectileValid(
  projectile: Projectile,
  canvasWidth: number,
  canvasHeight: number
): boolean {
  // 화면 밖으로 나갔는지 체크
  if (
    projectile.position.x < -50 ||
    projectile.position.x > canvasWidth + 50 ||
    projectile.position.y < -50 ||
    projectile.position.y > canvasHeight + 50
  ) {
    return false;
  }

  // 최대 이동 거리 체크
  if (projectile.travelDistance > PROJECTILE_MAX_DISTANCE) {
    return false;
  }

  return true;
}

/**
 * 파티클 업데이트
 * @param particle 파티클
 * @param deltaTime 경과 시간 (밀리초)
 */
export function updateParticle(
  particle: SkillParticle,
  deltaTime: number
): void {
  particle.x += particle.vx;
  particle.y += particle.vy;
  particle.life -= deltaTime;
}

/**
 * 파티클이 유효한지 체크
 * @param particle 파티클
 * @returns 유효 여부
 */
export function isParticleValid(particle: SkillParticle): boolean {
  return particle.life > 0;
}

/**
 * 플레이어-투사체 충돌 감지
 * @param player 플레이어
 * @param projectile 투사체
 * @returns 충돌 여부
 */
export function checkPlayerProjectileCollision(
  player: CharacterState,
  projectile: Projectile
): boolean {
  return checkCollision(
    player.position,
    { size: player.stats.size },
    projectile.position,
    { size: projectile.size }
  );
}

/**
 * 몬스터-투사체 충돌 감지
 * @param monster 몬스터
 * @param projectile 투사체
 * @returns 충돌 여부
 */
export function checkMonsterProjectileCollision(
  monster: MonsterState,
  projectile: Projectile
): boolean {
  if (monster.isDead) return false;

  return checkCollision(
    monster.position,
    { size: monster.stats.size },
    projectile.position,
    { size: projectile.size }
  );
}

/**
 * 몬스터-파티클 충돌 감지 (새 이펙트 시스템용)
 * @param monster 몬스터
 * @param particle 파티클
 * @returns 충돌 여부
 */
export function checkMonsterParticleCollision(
  monster: MonsterState,
  particle: SkillParticle
): boolean {
  if (monster.isDead || particle.hasHit) return false;

  // 파티클이 투사체가 아니면 충돌하지 않음
  if (!particle.damage || !particle.owner) return false;

  return checkCollision(
    monster.position,
    { size: monster.stats.size },
    { x: particle.x, y: particle.y },
    { size: particle.size }
  );
}

/**
 * 플레이어-파티클 충돌 감지 (새 이펙트 시스템용)
 * @param player 플레이어
 * @param particle 파티클
 * @returns 충돌 여부
 */
export function checkPlayerParticleCollision(
  player: CharacterState,
  particle: SkillParticle
): boolean {
  if (particle.hasHit) return false;

  // 파티클이 투사체가 아니면 충돌하지 않음
  if (!particle.damage || !particle.owner) return false;

  return checkCollision(
    player.position,
    { size: player.stats.size },
    { x: particle.x, y: particle.y },
    { size: particle.size }
  );
}

/**
 * 플레이어-몬스터 근접 공격 충돌 감지 (부채꼴)
 * @param playerPos 플레이어 위치
 * @param playerAngle 플레이어가 바라보는 각도 (라디안)
 * @param monsterPos 몬스터 위치
 * @param attackRange 공격 범위
 * @param attackArc 공격 각도 (라디안)
 * @returns 충돌 여부
 */
export function checkMeleeAttackHit(
  playerPos: Position,
  playerAngle: number,
  monsterPos: Position,
  attackRange: number,
  attackArc: number
): boolean {
  const dx = monsterPos.x - playerPos.x;
  const dy = monsterPos.y - playerPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // 범위 체크
  if (distance > attackRange) return false;

  // 각도 체크
  const angleToMonster = Math.atan2(dy, dx);
  let angleDiff = angleToMonster - playerAngle;

  // 각도 정규화 (-π ~ π)
  while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

  return Math.abs(angleDiff) <= attackArc / 2;
}

/**
 * FPS 계산
 * @param lastFrameTime 마지막 프레임 시간
 * @param currentTime 현재 시간
 * @returns [새 FPS 값, deltaTime (초)]
 */
export function calculateFPS(
  lastFrameTime: number,
  currentTime: number
): [number, number] {
  const deltaTime = (currentTime - lastFrameTime) / 1000; // 초 단위
  const fps = deltaTime > 0 ? Math.round(1 / deltaTime) : 60;
  
  return [fps, deltaTime];
}

/**
 * 안전한 숫자 값 체크 (NaN, Infinity 방지)
 * @param value 검사할 값
 * @param defaultValue 기본값
 * @returns 안전한 값
 */
export function safeNumber(value: number, defaultValue: number = 0): number {
  if (!isFinite(value) || isNaN(value)) {
    return defaultValue;
  }
  return value;
}

/**
 * 안전한 위치 값 체크
 * @param position 위치
 * @param defaultPosition 기본 위치
 * @returns 안전한 위치
 */
export function safePosition(
  position: Position,
  defaultPosition: Position = { x: 0, y: 0 }
): Position {
  return {
    x: safeNumber(position.x, defaultPosition.x),
    y: safeNumber(position.y, defaultPosition.y),
  };
}
