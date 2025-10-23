import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COLORS,
  AI_STATE_LABELS,
  AI_STATE_COLORS,
  PROJECTILE_FADE_START,
  PROJECTILE_MAX_DISTANCE,
} from './gameConstants';
import type { Character, Monster, Projectile, CharacterConfig, Position } from './gameTypes';

/**
 * Draw the player character
 */
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Character,
  config: CharacterConfig
) {
  ctx.fillStyle = player.isAttacking
    ? COLORS.PLAYER_ATTACKING
    : player.isSkilling
    ? COLORS.PLAYER_SKILLING
    : COLORS.PLAYER_DEFAULT;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(player.position.x, player.position.y, config.size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/**
 * Draw player HP bar
 */
export function drawPlayerHPBar(
  ctx: CanvasRenderingContext2D,
  player: Character,
  config: CharacterConfig
) {
  const barWidth = config.size;
  const barHeight = 4;
  const barX = player.position.x - barWidth / 2;
  const barY = player.position.y - config.size / 2 - 10;

  ctx.fillStyle = COLORS.HP_BACKGROUND;
  ctx.fillRect(barX, barY, barWidth, barHeight);

  const hpPercent = player.stats.hp / player.stats.maxHp;
  ctx.fillStyle = COLORS.PLAYER_HP;
  ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
}

/**
 * Draw a monster character
 */
export function drawMonster(
  ctx: CanvasRenderingContext2D,
  monster: Monster,
  config: CharacterConfig
) {
  if (monster.isDead) return;

  const aiStateColor = AI_STATE_COLORS[monster.aiState];
  ctx.fillStyle = monster.isAttacking ? COLORS.MONSTER_ATTACKING : aiStateColor;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(monster.position.x, monster.position.y, config.size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/**
 * Draw monster HP bar
 */
export function drawMonsterHPBar(
  ctx: CanvasRenderingContext2D,
  monster: Monster,
  config: CharacterConfig
) {
  if (monster.isDead) return;

  const barWidth = config.size;
  const barHeight = 4;
  const barX = monster.position.x - barWidth / 2;
  const barY = monster.position.y - config.size / 2 - 10;

  ctx.fillStyle = COLORS.HP_BACKGROUND;
  ctx.fillRect(barX, barY, barWidth, barHeight);

  const hpPercent = monster.stats.hp / monster.stats.maxHp;
  ctx.fillStyle = COLORS.MONSTER_HP;
  ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
}

/**
 * Draw monster AI state indicator
 */
export function drawMonsterAIState(
  ctx: CanvasRenderingContext2D,
  monster: Monster,
  config: CharacterConfig
) {
  if (monster.isDead) return;

  ctx.fillStyle = AI_STATE_COLORS[monster.aiState];
  ctx.font = '10px monospace';
  const aiText = `AI: ${AI_STATE_LABELS[monster.aiState]}`;
  const textWidth = ctx.measureText(aiText).width;
  ctx.fillText(
    aiText,
    monster.position.x - textWidth / 2,
    monster.position.y + config.size / 2 + 20
  );
}

/**
 * Draw all projectiles with fade effect
 */
export function drawProjectiles(
  ctx: CanvasRenderingContext2D,
  projectiles: Projectile[]
) {
  projectiles.forEach((projectile) => {
    const fadeProgress = Math.min(
      1,
      (projectile.travelDistance - PROJECTILE_FADE_START) /
        (PROJECTILE_MAX_DISTANCE - PROJECTILE_FADE_START)
    );
    const opacity = Math.max(0, 1 - fadeProgress);

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle =
      projectile.owner === 'player'
        ? COLORS.PROJECTILE_PLAYER
        : COLORS.PROJECTILE_MONSTER;
    ctx.beginPath();
    ctx.arc(projectile.position.x, projectile.position.y, projectile.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

/**
 * Draw melee swing animation
 */
export function drawMeleeSwing(
  ctx: CanvasRenderingContext2D,
  player: Character,
  config: CharacterConfig,
  mousePosition: Position,
  swingDuration: number
) {
  if (player.meleeSwingStart === null) return;

  const mouseX = mousePosition.x;
  const mouseY = mousePosition.y;
  const playerX = player.position.x;
  const playerY = player.position.y;
  const dx = mouseX - playerX;
  const dy = mouseY - playerY;
  const targetAngle = Math.atan2(dy, dx);
  const meleeSwingArc = (config.attackWidth * Math.PI) / 180;
  const startAngle = targetAngle - meleeSwingArc / 2;
  const swingProgress = (Date.now() - player.meleeSwingStart) / swingDuration;
  const currentSwingOffset = meleeSwingArc * swingProgress;
  const currentAngle = startAngle + currentSwingOffset;
  const meleeRange = config.attackRange;

  ctx.save();
  ctx.shadowColor = COLORS.MELEE_SHADOW;
  ctx.shadowBlur = 20;

  const handleLength = meleeRange * 0.2;

  // Draw handle
  ctx.strokeStyle = COLORS.MELEE_HANDLE;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(playerX, playerY);
  ctx.lineTo(
    playerX + Math.cos(currentAngle) * handleLength,
    playerY + Math.sin(currentAngle) * handleLength
  );
  ctx.stroke();

  // Draw blade
  const bladeStartX = playerX + Math.cos(currentAngle) * handleLength;
  const bladeStartY = playerY + Math.sin(currentAngle) * handleLength;
  const bladeEndX = playerX + Math.cos(currentAngle) * meleeRange;
  const bladeEndY = playerY + Math.sin(currentAngle) * meleeRange;

  const gradient = ctx.createLinearGradient(bladeStartX, bladeStartY, bladeEndX, bladeEndY);
  gradient.addColorStop(0, COLORS.MELEE_BLADE);
  gradient.addColorStop(0.5, COLORS.MELEE_ARC_STROKE);
  gradient.addColorStop(1, COLORS.MELEE_BLADE);

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bladeStartX, bladeStartY);
  ctx.lineTo(bladeEndX, bladeEndY);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw ranged attack aiming indicator (fan/cone + crosshair)
 */
export function drawRangedAimIndicator(
  ctx: CanvasRenderingContext2D,
  playerPosition: Position,
  mousePosition: Position,
  config: CharacterConfig
) {
  const dx = mousePosition.x - playerPosition.x;
  const dy = mousePosition.y - playerPosition.y;
  const angle = Math.atan2(dy, dx);
  const range = config.attackRange;
  const spreadAngle = (config.attackWidth * Math.PI) / 180 / 2;

  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = COLORS.RANGED_AIM;
  ctx.beginPath();
  ctx.moveTo(playerPosition.x, playerPosition.y);
  ctx.arc(playerPosition.x, playerPosition.y, range, angle - spreadAngle, angle + spreadAngle);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Draw cone edges
  ctx.strokeStyle = COLORS.RANGED_AIM;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(playerPosition.x, playerPosition.y);
  ctx.lineTo(
    playerPosition.x + Math.cos(angle - spreadAngle) * range,
    playerPosition.y + Math.sin(angle - spreadAngle) * range
  );
  ctx.moveTo(playerPosition.x, playerPosition.y);
  ctx.lineTo(
    playerPosition.x + Math.cos(angle + spreadAngle) * range,
    playerPosition.y + Math.sin(angle + spreadAngle) * range
  );
  ctx.stroke();
  ctx.restore();

  // Draw crosshair at mouse
  ctx.strokeStyle = COLORS.RANGED_CROSSHAIR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(mousePosition.x, mousePosition.y, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(mousePosition.x - 12, mousePosition.y);
  ctx.lineTo(mousePosition.x - 4, mousePosition.y);
  ctx.moveTo(mousePosition.x + 4, mousePosition.y);
  ctx.lineTo(mousePosition.x + 12, mousePosition.y);
  ctx.moveTo(mousePosition.x, mousePosition.y - 12);
  ctx.lineTo(mousePosition.x, mousePosition.y - 4);
  ctx.moveTo(mousePosition.x, mousePosition.y + 4);
  ctx.lineTo(mousePosition.x, mousePosition.y + 12);
  ctx.stroke();
}

/**
 * 범위 데이터 인터페이스
 * 캐릭터(플레이어/몬스터)가 생성하는 공격 범위 정보
 */
export interface AttackRangeData {
  position: Position;      // 범위의 중심 위치
  angle: number;           // 방향 (라디안)
  range: number;           // 범위 (반지름)
  width: number;           // 넓이 (각도, degree)
  color: string;           // 범위 색상
  showCircle?: boolean;    // 원형 범위 표시 여부
  showCone?: boolean;      // 부채꼴 표시 여부
  skillPhase?: 'idle' | 'windup' | 'execution' | 'recovery'; // 스킬 실행 단계
}

/**
 * 공통 범위 렌더링 함수
 * 스킬 데이터에서 값을 추출하여 범위를 시각화
 */
export function drawAttackRangeIndicator(
  ctx: CanvasRenderingContext2D,
  rangeData: AttackRangeData
) {
  const { position, angle, range, width, color, showCircle = true, showCone = true, skillPhase = 'idle' } = rangeData;
  const spreadAngle = (width * Math.PI) / 180 / 2; // 넓이를 라디안으로 변환

  // 스킬 페이즈에 따른 색상 및 투명도 조정
  let phaseColor = color;
  let phaseAlpha = 0.15;
  let phaseLineAlpha = 1.0;
  
  if (skillPhase === 'windup') {
    // 선딜: 노란색, 약간 밝게
    phaseColor = '#fbbf24'; // amber-400
    phaseAlpha = 0.25;
  } else if (skillPhase === 'execution') {
    // 공격: 빨간색, 강렬하게
    phaseColor = '#ef4444'; // red-500
    phaseAlpha = 0.4;
    phaseLineAlpha = 1.0;
  } else if (skillPhase === 'recovery') {
    // 후딜: 파란색, 약하게
    phaseColor = '#60a5fa'; // blue-400
    phaseAlpha = 0.15;
  }

  // 1. 원형 범위 표시 (선택적)
  if (showCircle) {
    ctx.strokeStyle = `${phaseColor}4D`; // 30% opacity
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(position.x, position.y, range, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 2. 부채꼴 표시 (항상 표시 가능)
  if (showCone) {
    // 부채꼴 영역 (반투명 채우기)
    ctx.save();
    ctx.globalAlpha = phaseAlpha;
    ctx.fillStyle = phaseColor;
    ctx.beginPath();
    ctx.moveTo(position.x, position.y);
    ctx.arc(
      position.x,
      position.y,
      range,
      angle - spreadAngle,
      angle + spreadAngle
    );
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = phaseLineAlpha;

    // 부채꼴 가장자리 선
    ctx.strokeStyle = phaseColor;
    ctx.lineWidth = skillPhase === 'execution' ? 2.5 : 1.5;
    ctx.setLineDash(skillPhase === 'execution' ? [] : [4, 4]);
    ctx.beginPath();
    ctx.moveTo(position.x, position.y);
    ctx.lineTo(
      position.x + Math.cos(angle - spreadAngle) * range,
      position.y + Math.sin(angle - spreadAngle) * range
    );
    ctx.moveTo(position.x, position.y);
    ctx.lineTo(
      position.x + Math.cos(angle + spreadAngle) * range,
      position.y + Math.sin(angle + spreadAngle) * range
    );
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

/**
 * 플레이어 공격 범위 표시 (마우스 방향 추적)
 */
export function drawPlayerAttackRange(
  ctx: CanvasRenderingContext2D,
  playerPosition: Position,
  mousePosition: Position,
  range: number,
  width: number,
  showCircle: boolean = true
) {
  const dx = mousePosition.x - playerPosition.x;
  const dy = mousePosition.y - playerPosition.y;
  const angle = Math.atan2(dy, dx);

  drawAttackRangeIndicator(ctx, {
    position: playerPosition,
    angle,
    range,
    width,
    color: 'rgba(59, 130, 246, 0.8)', // 파란색
    showCircle,
    showCone: true,
  });
}

/**
 * 몬스터 공격 범위 표시 (플레이어 방향 추적)
 */
export function drawMonsterAttackRange(
  ctx: CanvasRenderingContext2D,
  monsterPosition: Position,
  targetPosition: Position,
  range: number,
  width: number,
  showCircle: boolean = true
) {
  const dx = targetPosition.x - monsterPosition.x;
  const dy = targetPosition.y - monsterPosition.y;
  const angle = Math.atan2(dy, dx);

  drawAttackRangeIndicator(ctx, {
    position: monsterPosition,
    angle,
    range,
    width,
    color: 'rgba(239, 68, 68, 0.8)', // 빨간색
    showCircle,
    showCone: true,
  });
}

/**
 * @deprecated 이전 함수 - drawPlayerAttackRange로 대체됨
 */
export function drawMonsterAttackDirections(
  ctx: CanvasRenderingContext2D,
  monsters: Monster[],
  playerPosition: Position,
  monsterConfig: CharacterConfig
) {
  monsters.forEach((monster) => {
    if (monster.isDead) return;

    const dx = playerPosition.x - monster.position.x;
    const dy = playerPosition.y - monster.position.y;
    const angle = Math.atan2(dy, dx);
    const range = monsterConfig.attackRange;
    const spreadAngle = (monsterConfig.attackWidth * Math.PI) / 180 / 2;

    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = COLORS.RANGE_MONSTER;
    ctx.beginPath();
    ctx.moveTo(monster.position.x, monster.position.y);
    ctx.arc(
      monster.position.x,
      monster.position.y,
      range,
      angle - spreadAngle,
      angle + spreadAngle
    );
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = COLORS.RANGE_MONSTER;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(monster.position.x, monster.position.y);
    ctx.lineTo(
      monster.position.x + Math.cos(angle - spreadAngle) * range,
      monster.position.y + Math.sin(angle - spreadAngle) * range
    );
    ctx.moveTo(monster.position.x, monster.position.y);
    ctx.lineTo(
      monster.position.x + Math.cos(angle + spreadAngle) * range,
      monster.position.y + Math.sin(angle + spreadAngle) * range
    );
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  });
}

/**
 * Draw melee attack preview (when not attacking)
 */
export function drawMeleePreview(
  ctx: CanvasRenderingContext2D,
  playerPosition: Position,
  mousePosition: Position,
  config: CharacterConfig
) {
  const dx = mousePosition.x - playerPosition.x;
  const dy = mousePosition.y - playerPosition.y;
  const targetAngle = Math.atan2(dy, dx);
  const meleeRange = config.attackRange;
  const meleeSwingArc = (config.attackWidth * Math.PI) / 180;

  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = COLORS.MELEE_ARC_FILL;
  ctx.beginPath();
  ctx.moveTo(playerPosition.x, playerPosition.y);
  ctx.arc(
    playerPosition.x,
    playerPosition.y,
    meleeRange,
    targetAngle - meleeSwingArc / 2,
    targetAngle + meleeSwingArc / 2
  );
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // Draw preview sword
  const handleLength = meleeRange * 0.2;
  ctx.strokeStyle = COLORS.MELEE_HANDLE;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(playerPosition.x, playerPosition.y);
  ctx.lineTo(
    playerPosition.x + Math.cos(targetAngle) * handleLength,
    playerPosition.y + Math.sin(targetAngle) * handleLength
  );
  ctx.stroke();

  ctx.strokeStyle = COLORS.MELEE_BLADE;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(
    playerPosition.x + Math.cos(targetAngle) * handleLength,
    playerPosition.y + Math.sin(targetAngle) * handleLength
  );
  ctx.lineTo(
    playerPosition.x + Math.cos(targetAngle) * meleeRange,
    playerPosition.y + Math.sin(targetAngle) * meleeRange
  );
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw attack range circles
 */
export function drawAttackRanges(
  ctx: CanvasRenderingContext2D,
  playerPosition: Position,
  playerRange: number,
  monsters: Monster[],
  monsterRange: number
) {
  // Player attack range
  ctx.strokeStyle = COLORS.RANGE_PLAYER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(playerPosition.x, playerPosition.y, playerRange, 0, Math.PI * 2);
  ctx.stroke();

  // Monster attack ranges
  monsters.forEach((monster) => {
    if (monster.isDead) return;
    ctx.strokeStyle = COLORS.RANGE_MONSTER;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(monster.position.x, monster.position.y, monsterRange, 0, Math.PI * 2);
    ctx.stroke();
  });
}

/**
 * Draw detection ranges
 */
export function drawDetectionRanges(
  ctx: CanvasRenderingContext2D,
  monsters: Monster[]
) {
  monsters.forEach((monster) => {
    if (monster.isDead) return;
    ctx.strokeStyle = COLORS.RANGE_DETECTION;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(monster.position.x, monster.position.y, monster.detectionRange, 0, Math.PI * 2);
    ctx.stroke();
  });
}

/**
 * Draw FPS counter
 */
export function drawFPS(ctx: CanvasRenderingContext2D, fps: number) {
  const fpsColor =
    fps >= 55 ? COLORS.FPS_GOOD : fps >= 30 ? COLORS.FPS_MEDIUM : COLORS.FPS_BAD;
  ctx.fillStyle = COLORS.CONTROL_GUIDE_BG;
  ctx.fillRect(10, CANVAS_HEIGHT - 35, 80, 25);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px monospace';
  ctx.fillText('FPS:', 15, CANVAS_HEIGHT - 18);
  ctx.fillStyle = fpsColor;
  ctx.fillText(String(fps), 50, CANVAS_HEIGHT - 18);
}

/**
 * Draw control guide at bottom
 */
export function drawControlGuide(
  ctx: CanvasRenderingContext2D,
  playerAttackType: CharacterType,
  monsterAttackType: CharacterType
) {
  ctx.save();
  ctx.fillStyle = COLORS.CONTROL_GUIDE_BG;
  ctx.fillRect(10, CANVAS_HEIGHT - 70, 380, 60);
  ctx.fillStyle = COLORS.CONTROL_GUIDE_TEXT;
  ctx.font = '12px sans-serif';
  const playerAttackText = playerAttackType === 'melee' ? '⚔️ 근접 공격' : '🏹 원거리 공격';
  ctx.fillText(
    `WASD: 이동 | 스페이스/좌클릭: ${playerAttackText}`,
    20,
    CANVAS_HEIGHT - 48
  );
  ctx.fillText(
    '범위 시각화: 플레이어(파란색) / 몬스터(빨간색) / 감지(주황색)',
    20,
    CANVAS_HEIGHT - 28
  );
  const monsterAttackText = monsterAttackType === 'melee' ? '⚔️ 근접' : '🏹 원거리';
  ctx.fillText(
    `플레이어: ${playerAttackText} | 몬스터: ${monsterAttackText}`,
    20,
    CANVAS_HEIGHT - 10
  );
  ctx.restore();
}

/**
 * Draw game over overlay
 */
export function drawGameOverOverlay(ctx: CanvasRenderingContext2D, survivalTime: number) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = COLORS.MONSTER_DEFAULT;
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('💀 게임 오버', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

  ctx.fillStyle = '#ffffff';
  ctx.font = '16px sans-serif';
  ctx.fillText('플레이어가 사망했습니다', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px sans-serif';
  ctx.fillText(`생존 시간: ${survivalTime.toFixed(1)}초`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 35);

  ctx.textAlign = 'left';
}

/**
 * Clear canvas
 */
export function clearCanvas(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = COLORS.CANVAS_BACKGROUND;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

/**
 * Draw grid background
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  gridSize: number = 50,
  gridColor: string = 'rgba(255, 255, 255, 0.1)',
  axisColor: string = 'rgba(255, 255, 255, 0.2)'
) {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;

  // Draw vertical lines
  for (let x = 0; x <= canvasWidth; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
  }

  // Draw horizontal lines
  for (let y = 0; y <= canvasHeight; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();
  }

  // Draw center axis lines (optional, more visible)
  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 2;
  
  // Vertical center line
  ctx.beginPath();
  ctx.moveTo(canvasWidth / 2, 0);
  ctx.lineTo(canvasWidth / 2, canvasHeight);
  ctx.stroke();
  
  // Horizontal center line
  ctx.beginPath();
  ctx.moveTo(0, canvasHeight / 2);
  ctx.lineTo(canvasWidth, canvasHeight / 2);
  ctx.stroke();
}
