// Game canvas dimensions
export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 700;

// Combat constants
export const ATTACK_COOLDOWN = 1000;
export const PROJECTILE_SPEED = 300;
export const PROJECTILE_SIZE = 8;
export const PROJECTILE_MAX_DISTANCE = 400;
export const PROJECTILE_FADE_START = 300;
export const MELEE_SWING_DURATION = 250; // milliseconds

// AI constants
export const MONSTER_DETECTION_RANGE = 200;
export const MONSTER_RETREAT_HP_PERCENT = 0.3; // HP 30% 이하일 때 후퇴
export const MONSTER_WANDER_SPEED = 0.3; // 배회 속도 (일반 속도의 30%)

// Colors
export const COLORS = {
  // Player colors
  PLAYER_DEFAULT: '#3b82f6',
  PLAYER_ATTACKING: '#60a5fa',
  PLAYER_SKILLING: '#a78bfa',
  PLAYER_HP: '#3b82f6',
  
  // Monster colors
  MONSTER_DEFAULT: '#ef4444',
  MONSTER_ATTACKING: '#fca5a5',
  MONSTER_HP: '#ef4444',
  
  // Projectile colors
  PROJECTILE_PLAYER: '#3b82f6',
  PROJECTILE_MONSTER: '#ef4444',
  
  // Range visualization
  RANGE_PLAYER: 'rgba(59, 130, 246, 0.3)',
  RANGE_MONSTER: 'rgba(239, 68, 68, 0.3)',
  RANGE_DETECTION: 'rgba(245, 158, 11, 0.3)',
  
  // Melee attack
  MELEE_ARC_FILL: '#fee2e2',
  MELEE_ARC_STROKE: '#fca5a5',
  MELEE_HANDLE: '#92400e',
  MELEE_BLADE: '#dc2626',
  MELEE_BLADE_HIGHLIGHT: '#fee2e2',
  MELEE_SHADOW: '#dc2626',
  
  // Ranged attack
  RANGED_AIM: '#3b82f6',
  RANGED_CROSSHAIR: '#3b82f6',
  
  // UI
  HP_BACKGROUND: '#374151',
  CANVAS_BACKGROUND: '#1e293b',
  CONTROL_GUIDE_BG: 'rgba(0, 0, 0, 0.7)',
  CONTROL_GUIDE_TEXT: 'white',
  
  // AI states
  AI_IDLE: '#94a3b8',
  AI_CHASE: '#f59e0b',
  AI_ATTACK: '#ef4444',
  AI_RETREAT: '#3b82f6',
  
  // FPS counter
  FPS_GOOD: '#4ade80',
  FPS_MEDIUM: '#facc15',
  FPS_BAD: '#f87171',
};

// AI State labels
export const AI_STATE_LABELS = {
  'IDLE': '배회',
  'CHASE': '추적',
  'ATTACK': '공격',
  'RETREAT': '후퇴',
} as const;

export const AI_STATE_COLORS = {
  'IDLE': COLORS.AI_IDLE,
  'CHASE': COLORS.AI_CHASE,
  'ATTACK': COLORS.AI_ATTACK,
  'RETREAT': COLORS.AI_RETREAT,
} as const;
