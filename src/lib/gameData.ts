export interface CharacterStats {
  level: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  exp: number;
  maxExp: number;
  // Extended stats for skill system
  attack: number;
  defense: number;
  speed: number;
  magic: number;
  criticalRate: number;
}

export interface MonsterStats {
  id?: string;
  name?: string;
  hp: number;
  maxHp: number;
  atk?: number;  // 레거시
  def?: number;  // 레거시
  attack: number;
  defense: number;
  speed: number;
  attackRange: number;
  attackWidth: number;
  critRate?: number;
  critDamage?: number;
  accuracy?: number;
  evasion?: number;
  expReward?: number;
}

export interface LevelData {
  level: number;
  expRequired: number;
}

// Default stats
export const defaultPlayerStats: CharacterStats = {
  level: 1,
  hp: 100,
  maxHp: 100,
  atk: 10,
  def: 5,
  exp: 0,
  maxExp: 100,
  attack: 10,
  defense: 5,
  speed: 100,
  magic: 0,
  criticalRate: 0,
};

export const defaultMonsterStats: MonsterStats = {
  id: 'goblin',
  name: '고블린',
  hp: 50,
  maxHp: 50,
  atk: 8,  // 레거시
  def: 3,  // 레거시
  attack: 8,
  defense: 3,
  speed: 60,
  attackRange: 40,
  attackWidth: 90,
  critRate: 0.05,
  critDamage: 1.3,
  accuracy: 0.85,
  evasion: 0.03,
  expReward: 20,
};

export function calculateDamage(attacker: { atk: number }, defender: { def: number }): number {
  const baseDamage = attacker.atk - defender.def;
  const damage = Math.max(1, baseDamage); // Minimum 1 damage
  return Math.floor(damage);
}

export function checkCollision(
  pos1: { x: number; y: number },
  size1: number,
  pos2: { x: number; y: number },
  size2: number
): boolean {
  const distance = Math.sqrt(
    Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)
  );
  return distance < (size1 + size2) / 2;
}

export function isInAttackRange(
  attacker: { x: number; y: number },
  target: { x: number; y: number },
  range: number
): boolean {
  const distance = Math.sqrt(
    Math.pow(attacker.x - target.x, 2) + Math.pow(attacker.y - target.y, 2)
  );
  return distance <= range;
}
