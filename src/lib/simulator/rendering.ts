/**
 * 시뮬레이터 렌더링 헬퍼
 * 캔버스 렌더링 관련 유틸리티 함수들
 */

import { CharacterState, MonsterState, Projectile, SkillParticle, Position } from './types';
import { CameraConfig, worldToScreen } from './camera';
import { PROJECTILE_FADE_START } from './constants';
import { safeNumber } from './gameLoop';

/**
 * 플레이어 렌더링
 */
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: CharacterState,
  cameraPos: Position,
  cameraConfig: CameraConfig,
  testMode: boolean
): void {
  let screenPos: Position;
  let scale = 1;

  if (testMode) {
    screenPos = worldToScreen(player.position, cameraPos, cameraConfig);
    scale = cameraConfig.zoom;
  } else {
    screenPos = player.position;
  }

  // 안전성 검사
  if (!isFinite(screenPos.x) || !isFinite(screenPos.y)) {
    return;
  }

  const size = safeNumber(player.stats.size, 20) * scale;
  const adjustedScale = safeNumber(player.playerScale, 1);

  ctx.save();
  ctx.translate(screenPos.x, screenPos.y);
  ctx.scale(adjustedScale, adjustedScale);

  // 플레이어 원 그리기
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fillStyle = player.isAttacking ? '#fbbf24' : '#3b82f6';
  ctx.fill();
  ctx.strokeStyle = '#1e40af';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

/**
 * 몬스터 렌더링
 */
export function drawMonster(
  ctx: CanvasRenderingContext2D,
  monster: MonsterState,
  cameraPos: Position,
  cameraConfig: CameraConfig,
  testMode: boolean
): void {
  if (monster.isDead) return;

  let screenPos: Position;
  let scale = 1;

  if (testMode) {
    screenPos = worldToScreen(monster.position, cameraPos, cameraConfig);
    scale = cameraConfig.zoom;
  } else {
    screenPos = monster.position;
  }

  // 안전성 검사
  if (!isFinite(screenPos.x) || !isFinite(screenPos.y)) {
    return;
  }

  const size = safeNumber(monster.stats.size, 24) * scale;

  ctx.save();

  // 몬스터 원 그리기
  ctx.beginPath();
  ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2);
  ctx.fillStyle = monster.isAttacking ? '#dc2626' : (monster.color || '#ef4444');
  ctx.fill();
  ctx.strokeStyle = '#991b1b';
  ctx.lineWidth = 2;
  ctx.stroke();

  // HP 바 그리기
  const hpBarWidth = size * 2;
  const hpBarHeight = 4 * scale;
  const hpPercent = monster.stats.hp / monster.stats.maxHp;

  ctx.fillStyle = '#1f2937';
  ctx.fillRect(
    screenPos.x - hpBarWidth / 2,
    screenPos.y - size - 8 * scale,
    hpBarWidth,
    hpBarHeight
  );

  ctx.fillStyle = hpPercent > 0.5 ? '#10b981' : hpPercent > 0.2 ? '#f59e0b' : '#ef4444';
  ctx.fillRect(
    screenPos.x - hpBarWidth / 2,
    screenPos.y - size - 8 * scale,
    hpBarWidth * hpPercent,
    hpBarHeight
  );

  ctx.restore();
}

/**
 * 투사체 렌더링 (파티클 이펙트)
 */
export function drawProjectile(
  ctx: CanvasRenderingContext2D,
  projectile: Projectile,
  cameraPos: Position,
  cameraConfig: CameraConfig,
  testMode: boolean
): void {
  let screenPos: Position;
  let scale = 1;

  if (testMode) {
    screenPos = worldToScreen(projectile.position, cameraPos, cameraConfig);
    scale = cameraConfig.zoom;
  } else {
    screenPos = projectile.position;
  }

  // 안전성 검사
  if (!isFinite(screenPos.x) || !isFinite(screenPos.y)) {
    return;
  }

  const size = safeNumber(projectile.size, 8) * scale;
  const baseColor = projectile.owner === 'player' ? '#60a5fa' : '#f87171';
  const glowColor = projectile.owner === 'player' ? '#3b82f6' : '#ef4444';

  // 페이드 아웃 효과
  let opacity = 1;
  if (projectile.travelDistance > PROJECTILE_FADE_START) {
    opacity = 1 - (projectile.travelDistance - PROJECTILE_FADE_START) / 100;
    opacity = Math.max(0, Math.min(1, opacity));
  }

  ctx.save();
  ctx.globalAlpha = opacity;

  // 파티클 개수와 크기
  const particleCount = 12;
  const coreSize = size * 0.8;
  const particleSize = size * 0.3;

  // 방향 계산 (속도 벡터)
  const vx = projectile.velocity.vx;
  const vy = projectile.velocity.vy;
  const angle = Math.atan2(vy, vx);

  // 중심 코어 그리기
  const coreGradient = ctx.createRadialGradient(
    screenPos.x,
    screenPos.y,
    0,
    screenPos.x,
    screenPos.y,
    coreSize
  );
  coreGradient.addColorStop(0, baseColor);
  coreGradient.addColorStop(0.5, baseColor + 'cc');
  coreGradient.addColorStop(1, baseColor + '00');
  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.arc(screenPos.x, screenPos.y, coreSize, 0, Math.PI * 2);
  ctx.fill();

  // 파티클들 그리기 (진행 방향으로 흩어짐)
  for (let i = 0; i < particleCount; i++) {
    const t = i / particleCount;
    const spread = Math.PI / 3; // 60도 확산
    const particleAngle = angle + (Math.random() - 0.5) * spread;
    const distance = size * (0.5 + Math.random() * 1.5);
    
    const px = screenPos.x + Math.cos(particleAngle) * distance;
    const py = screenPos.y + Math.sin(particleAngle) * distance;
    
    const particleAlpha = 0.3 + Math.random() * 0.4;
    
    const particleGradient = ctx.createRadialGradient(px, py, 0, px, py, particleSize);
    particleGradient.addColorStop(0, baseColor + Math.floor(particleAlpha * 255).toString(16).padStart(2, '0'));
    particleGradient.addColorStop(1, baseColor + '00');
    
    ctx.fillStyle = particleGradient;
    ctx.beginPath();
    ctx.arc(px, py, particleSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // 외곽 발광 효과
  const outerGlow = ctx.createRadialGradient(
    screenPos.x,
    screenPos.y,
    coreSize,
    screenPos.x,
    screenPos.y,
    size * 2.5
  );
  outerGlow.addColorStop(0, glowColor + '40');
  outerGlow.addColorStop(0.5, glowColor + '20');
  outerGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(screenPos.x, screenPos.y, size * 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * 파티클 렌더링
 */
export function drawParticle(
  ctx: CanvasRenderingContext2D,
  particle: SkillParticle,
  cameraPos: Position,
  cameraConfig: CameraConfig,
  testMode: boolean
): void {
  let screenPos: Position;
  let scale = 1;

  if (testMode) {
    screenPos = worldToScreen({ x: particle.x, y: particle.y }, cameraPos, cameraConfig);
    scale = cameraConfig.zoom;
  } else {
    screenPos = { x: particle.x, y: particle.y };
  }

  // 안전성 검사
  if (!isFinite(screenPos.x) || !isFinite(screenPos.y)) {
    return;
  }

  const size = safeNumber(particle.size, 4) * scale;
  const lifePercent = particle.life / particle.maxLife;
  const opacity = Math.max(0, Math.min(1, lifePercent));

  ctx.save();
  ctx.globalAlpha = opacity;

  ctx.beginPath();
  ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2);
  ctx.fillStyle = particle.color || '#ffffff';
  ctx.fill();

  // 발광 효과 (일부 스킬만)
  if (particle.skillType && particle.skillType.includes('slash')) {
    const gradient = ctx.createRadialGradient(
      screenPos.x,
      screenPos.y,
      0,
      screenPos.x,
      screenPos.y,
      size * 2
    );
    gradient.addColorStop(0, `${particle.color}80`);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, size * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * 부채꼴 공격 범위 렌더링 (스킬 페이즈별 색상)
 */
export function drawAttackRangeWithPhase(
  ctx: CanvasRenderingContext2D,
  centerPos: Position,
  targetPos: Position,
  range: number,
  arc: number,
  phase: 'idle' | 'windup' | 'execution' | 'recovery',
  cameraPos: Position,
  cameraConfig: CameraConfig,
  testMode: boolean
): void {
  let screenCenter: Position;
  let scale = 1;

  if (testMode) {
    screenCenter = worldToScreen(centerPos, cameraPos, cameraConfig);
    scale = cameraConfig.zoom;
  } else {
    screenCenter = centerPos;
  }

  // 안전성 검사
  if (!isFinite(screenCenter.x) || !isFinite(screenCenter.y)) {
    return;
  }

  const scaledRange = safeNumber(range, 100) * scale;

  // 페이즈별 색상
  let color: string;
  switch (phase) {
    case 'windup':
      color = '#fbbf2440'; // 노란색 (준비)
      break;
    case 'execution':
      color = '#ef444440'; // 빨간색 (공격)
      break;
    case 'recovery':
      color = '#3b82f640'; // 파란색 (후딜)
      break;
    default:
      color = '#94a3b820'; // 회색 (대기)
      break;
  }

  const dx = targetPos.x - centerPos.x;
  const dy = targetPos.y - centerPos.y;
  const angle = Math.atan2(dy, dx);

  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(screenCenter.x, screenCenter.y);
  ctx.arc(
    screenCenter.x,
    screenCenter.y,
    scaledRange,
    angle - arc / 2,
    angle + arc / 2
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * 화면 클리어
 */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  backgroundColor: string = '#0f172a'
): void {
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
}

/**
 * 그리드 렌더링 (테스트 모드용)
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  cameraPos: Position,
  cameraConfig: CameraConfig,
  gridSize: number = 100
): void {
  const { canvasWidth, canvasHeight, zoom } = cameraConfig;
  const scaledGridSize = gridSize * zoom;

  // 그리드 시작 오프셋 계산
  const offsetX = (cameraPos.x * zoom) % scaledGridSize;
  const offsetY = (cameraPos.y * zoom) % scaledGridSize;

  ctx.save();
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;

  // 세로선
  for (let x = -offsetX; x < canvasWidth; x += scaledGridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
  }

  // 가로선
  for (let y = -offsetY; y < canvasHeight; y += scaledGridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();
  }

  ctx.restore();
}
