import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PROJECTILE_SPEED,
  PROJECTILE_MAX_DISTANCE,
  MONSTER_DETECTION_RANGE,
  MONSTER_RETREAT_HP_PERCENT,
  MONSTER_WANDER_SPEED,
} from './gameConstants';
import type { Character, Monster, Projectile, CharacterConfig, Position } from './gameTypes';

/**
 * Calculate distance between two positions
 */
export function getDistance(pos1: Position, pos2: Position): number {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check collision between two circles
 */
export function checkCollision(
  pos1: Position,
  size1: number,
  pos2: Position,
  size2: number
): boolean {
  const distance = getDistance(pos1, pos2);
  return distance < (size1 + size2) / 2;
}

/**
 * Calculate damage with accuracy and critical hit
 */
export function calculateDamage(
  attacker: Character,
  defender: Character,
  damageMultiplier: number = 1.0,
  damageFormula?: {
    stat: 'attack' | 'defense' | 'magic' | 'speed';
    operator: '+' | '*';
    value: number;
  }
): { damage: number; isCritical: boolean } {
  // Accuracy check
  const hitRoll = Math.random() * 100;
  if (hitRoll > attacker.stats.accuracy) {
    return { damage: 0, isCritical: false };
  }

  // Critical hit check
  const critRoll = Math.random() * 100;
  const isCritical = critRoll < attacker.stats.criticalRate;

  // Calculate base damage
  let damage = attacker.stats.attack - defender.stats.defense;
  
  // Apply damage multiplier
  damage *= damageMultiplier;
  
  // Apply damage formula if provided
  if (damageFormula) {
    let statValue = 0;
    switch (damageFormula.stat) {
      case 'attack':
        statValue = attacker.stats.attack;
        break;
      case 'defense':
        statValue = attacker.stats.defense;
        break;
      case 'magic':
        // 마력은 아직 구현되지 않았으므로 attack 값을 사용
        statValue = attacker.stats.attack;
        break;
      case 'speed':
        statValue = attacker.stats.attackSpeed;
        break;
    }
    
    if (damageFormula.operator === '+') {
      damage += statValue * damageFormula.value;
    } else if (damageFormula.operator === '*') {
      damage += statValue * damageFormula.value;
    }
  }
  
  if (isCritical) {
    damage *= 2;
  }
  damage = Math.max(1, damage); // Minimum 1 damage

  return { damage, isCritical };
}

/**
 * Update projectiles (movement and cleanup)
 */
export function updateProjectiles(
  projectiles: Projectile[],
  deltaTime: number
): Projectile[] {
  return projectiles
    .map((proj) => {
      const distance = PROJECTILE_SPEED * deltaTime;
      return {
        ...proj,
        position: {
          x: proj.position.x + proj.velocity.x * distance,
          y: proj.position.y + proj.velocity.y * distance,
        },
        travelDistance: proj.travelDistance + distance,
      };
    })
    .filter((proj) => {
      // Remove projectiles that are out of bounds or traveled too far
      return (
        proj.position.x >= 0 &&
        proj.position.x <= CANVAS_WIDTH &&
        proj.position.y >= 0 &&
        proj.position.y <= CANVAS_HEIGHT &&
        proj.travelDistance < PROJECTILE_MAX_DISTANCE
      );
    });
}

/**
 * Check if projectile hits a character
 */
export function checkProjectileHit(
  projectile: Projectile,
  character: Character,
  characterSize: number
): boolean {
  if (character.isDead) return false;
  return checkCollision(projectile.position, projectile.size * 2, character.position, characterSize);
}

/**
 * Check if character is within attack range
 */
export function isInAttackRange(
  attacker: Position,
  target: Position,
  range: number
): boolean {
  return getDistance(attacker, target) <= range;
}

/**
 * Check if target is within attack cone (for directional attacks)
 */
export function isInAttackCone(
  attackerPos: Position,
  targetPos: Position,
  aimAngle: number,
  coneWidth: number,
  range: number
): boolean {
  const distance = getDistance(attackerPos, targetPos);
  if (distance > range) return false;

  const dx = targetPos.x - attackerPos.x;
  const dy = targetPos.y - attackerPos.y;
  const targetAngle = Math.atan2(dy, dx);

  let angleDiff = Math.abs(targetAngle - aimAngle);
  // Normalize angle difference to [0, PI]
  if (angleDiff > Math.PI) {
    angleDiff = 2 * Math.PI - angleDiff;
  }

  const coneHalfAngle = (coneWidth * Math.PI) / 180 / 2;
  return angleDiff <= coneHalfAngle;
}

/**
 * Keep position within canvas bounds
 */
export function clampToCanvas(position: Position, characterSize: number): Position {
  const halfSize = characterSize / 2;
  return {
    x: Math.max(halfSize, Math.min(CANVAS_WIDTH - halfSize, position.x)),
    y: Math.max(halfSize, Math.min(CANVAS_HEIGHT - halfSize, position.y)),
  };
}

/**
 * Update monster AI state
 */
export function updateMonsterAI(
  monster: Monster,
  playerPosition: Position,
  currentTime: number
): Monster {
  if (monster.isDead) return monster;

  const distanceToPlayer = getDistance(monster.position, playerPosition);
  const hpPercent = monster.stats.hp / monster.stats.maxHp;

  // 레거시 AI 로직 - AI 패턴 시스템 사용 시 이 함수는 사용되지 않음
  // AI 패턴이 없는 경우를 위한 폴백 로직만 유지
  if (hpPercent <= MONSTER_RETREAT_HP_PERCENT) {
    // Low HP - flee
    if (monster.aiState !== 'FLEE') {
      return { ...monster, aiState: 'FLEE', lastStateChange: currentTime };
    }
  } else if (distanceToPlayer <= monster.detectionRange) {
    // Player in detection range
    if (distanceToPlayer <= monster.detectionRange * 0.5) {
      // Close enough to attack
      if (monster.aiState !== 'ATTACK') {
        return { ...monster, aiState: 'ATTACK', lastStateChange: currentTime };
      }
    } else {
      // Chase player
      if (monster.aiState !== 'CHASE') {
        return { ...monster, aiState: 'CHASE', lastStateChange: currentTime };
      }
    }
  } else {
    // Wander
    if (monster.aiState !== 'IDLE') {
      return {
        ...monster,
        aiState: 'IDLE',
        lastStateChange: currentTime,
        wanderAngle: Math.random() * Math.PI * 2,
        wanderChangeTime: currentTime,
      };
    }
  }

  return monster;
}

/**
 * Move monster based on AI state
 */
export function moveMonster(
  monster: Monster,
  playerPosition: Position,
  speed: number,
  deltaTime: number,
  currentTime: number
): Position {
  if (monster.isDead) return monster.position;

  let newPosition = { ...monster.position };

  switch (monster.aiState) {
    case 'IDLE': {
      // Wander around
      if (currentTime - monster.wanderChangeTime > 2000) {
        monster.wanderAngle = Math.random() * Math.PI * 2;
        monster.wanderChangeTime = currentTime;
      }
      const wanderSpeed = speed * MONSTER_WANDER_SPEED;
      newPosition.x += Math.cos(monster.wanderAngle) * wanderSpeed * deltaTime;
      newPosition.y += Math.sin(monster.wanderAngle) * wanderSpeed * deltaTime;
      break;
    }
    case 'CHASE': {
      // Move towards player
      const dx = playerPosition.x - monster.position.x;
      const dy = playerPosition.y - monster.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 0) {
        newPosition.x += (dx / distance) * speed * deltaTime;
        newPosition.y += (dy / distance) * speed * deltaTime;
      }
      break;
    }
    case 'ATTACK': {
      // Stop moving, prepare to attack
      break;
    }
    case 'FLEE': {
      // Move away from player
      const dx = monster.position.x - playerPosition.x;
      const dy = monster.position.y - playerPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 0) {
        newPosition.x += (dx / distance) * speed * deltaTime;
        newPosition.y += (dy / distance) * speed * deltaTime;
      }
      break;
    }
    case 'DEFEND': {
      // Stop moving, defend position
      break;
    }
  }

  return newPosition;
}

/**
 * Create a projectile
 */
export function createProjectile(
  from: Position,
  to: Position,
  owner: 'player' | 'monster',
  size: number
): Projectile {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return {
    position: { ...from },
    velocity: {
      x: dx / distance,
      y: dy / distance,
    },
    owner,
    size,
    travelDistance: 0,
  };
}

/**
 * Initialize character with default stats
 */
export function initializeCharacter(
  position: Position,
  config: CharacterConfig
): Character {
  return {
    position,
    velocity: { x: 0, y: 0 },
    stats: {
      hp: 100,
      maxHp: 100,
      attack: config.attack,
      defense: config.defense,
      attackSpeed: config.attackSpeed,
      accuracy: config.accuracy,
      criticalRate: config.criticalRate,
    },
    isAttacking: false,
    isSkilling: false,
    isDead: false,
    lastAttackTime: 0,
    meleeSwingStart: null,
    meleeSwingAngle: 0,
  };
}

/**
 * Initialize monster with AI state
 */
export function initializeMonster(
  position: Position,
  config: CharacterConfig
): Monster {
  return {
    ...initializeCharacter(position, config),
    aiState: 'IDLE',
    detectionRange: MONSTER_DETECTION_RANGE,
    wanderAngle: Math.random() * Math.PI * 2,
    wanderChangeTime: Date.now(),
    lastStateChange: Date.now(),
  };
}
