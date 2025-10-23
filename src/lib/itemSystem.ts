/**
 * 아이템 시스템
 * - 아이템 정의 및 관리
 * - 아이템 효과
 * - 인벤토리 관리
 */

export type ItemType = 'potion' | 'scroll' | 'bomb' | 'buff';

export interface Item {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  iconName: string; // lucide-react 아이콘 이름 (예: 'Flask', 'Sparkles', 'Bomb')
  
  // 아이템 효과
  healAmount: number;       // 즉시 회복량
  spRestore: number;        // SP 회복량
  damageAmount: number;     // 즉시 데미지
  damageRange: number;      // 데미지 범위
  
  buffDuration: number;     // 버프 지속시간 (ms)
  buffEffect: {
    attack?: number;        // 공격력 증가 (%)
    defense?: number;       // 방어력 증가 (%)
    speed?: number;         // 속도 증가 (%)
    criticalRate?: number;  // 치명타율 증가 (%)
  };
  
  // 사용 제한
  cooldown: number;         // 쿨타임 (ms)
  currentCooldown: number;  // 현재 쿨타임
  isOnCooldown: boolean;
  
  // 수량
  quantity: number;
  maxStack: number;
  
  // 시각 효과
  color: string;
  particleCount: number;
}

export interface ItemSlot {
  slotNumber: 1 | 2 | 3 | 4;
  item: Item | null;
  keyBinding: string; // 'F1', 'F2', 'F3', 'F4'
}

/**
 * 기본 아이템 정의
 */
export const defaultItems: Record<string, Item> = {
  healthPotion: {
    id: 'healthPotion',
    name: '체력 물약',
    description: 'HP를 100 즉시 회복합니다',
    type: 'potion',
    iconName: 'Flask',
    healAmount: 100,
    spRestore: 0,
    damageAmount: 0,
    damageRange: 0,
    buffDuration: 0,
    buffEffect: {},
    cooldown: 1000,
    currentCooldown: 0,
    isOnCooldown: false,
    quantity: 3,
    maxStack: 5,
    color: '#ff4444',
    particleCount: 10,
  },
  
  manaPotion: {
    id: 'manaPotion',
    name: '마나 물약',
    description: 'SP를 50 즉시 회복합니다',
    type: 'potion',
    iconName: 'Flask',
    healAmount: 0,
    spRestore: 50,
    damageAmount: 0,
    damageRange: 0,
    buffDuration: 0,
    buffEffect: {},
    cooldown: 1000,
    currentCooldown: 0,
    isOnCooldown: false,
    quantity: 3,
    maxStack: 5,
    color: '#4444ff',
    particleCount: 10,
  },
  
  explosiveBomb: {
    id: 'explosiveBomb',
    name: '폭발 폭탄',
    description: '범위 내 모든 적에게 150 데미지',
    type: 'bomb',
    iconName: 'Bomb',
    healAmount: 0,
    spRestore: 0,
    damageAmount: 150,
    damageRange: 200,
    buffDuration: 0,
    buffEffect: {},
    cooldown: 2000,
    currentCooldown: 0,
    isOnCooldown: false,
    quantity: 2,
    maxStack: 3,
    color: '#ff8800',
    particleCount: 30,
  },
  
  strengthScroll: {
    id: 'strengthScroll',
    name: '힘의 두루마리',
    description: '15초간 공격력 +50%, 치명타율 +20%',
    type: 'buff',
    iconName: 'Sparkles',
    healAmount: 0,
    spRestore: 0,
    damageAmount: 0,
    damageRange: 0,
    buffDuration: 15000,
    buffEffect: {
      attack: 50,
      criticalRate: 20,
    },
    cooldown: 1500,
    currentCooldown: 0,
    isOnCooldown: false,
    quantity: 2,
    maxStack: 3,
    color: '#ffaa00',
    particleCount: 20,
  },
};

/**
 * 아이템 쿨타임 업데이트
 */
export function updateItemCooldown(item: Item, deltaTime: number): Item {
  if (!item.isOnCooldown) return item;
  
  const newCooldown = Math.max(0, item.currentCooldown - deltaTime * 1000);
  
  return {
    ...item,
    currentCooldown: newCooldown,
    isOnCooldown: newCooldown > 0,
  };
}

/**
 * 아이템 사용 가능 여부 체크
 */
export function canUseItem(item: Item): { canUse: boolean; reason?: string } {
  if (item.quantity <= 0) {
    return { canUse: false, reason: '아이템이 부족합니다' };
  }
  
  if (item.isOnCooldown) {
    return { canUse: false, reason: '쿨타임 중입니다' };
  }
  
  return { canUse: true };
}

/**
 * 아이템 사용
 */
export function useItem(item: Item): Item {
  return {
    ...item,
    quantity: Math.max(0, item.quantity - 1),
    currentCooldown: item.cooldown,
    isOnCooldown: true,
  };
}

/**
 * 아이템 추가
 */
export function addItem(item: Item, amount: number = 1): Item {
  return {
    ...item,
    quantity: Math.min(item.maxStack, item.quantity + amount),
  };
}

/**
 * 기본 아이템 슬롯 설정
 */
export function getDefaultItemSlots(): ItemSlot[] {
  return [
    { slotNumber: 1, item: { ...defaultItems.healthPotion }, keyBinding: 'F1' },
    { slotNumber: 2, item: { ...defaultItems.manaPotion }, keyBinding: 'F2' },
    { slotNumber: 3, item: { ...defaultItems.explosiveBomb }, keyBinding: 'F3' },
    { slotNumber: 4, item: { ...defaultItems.strengthScroll }, keyBinding: 'F4' },
  ];
}

/**
 * 버프 효과 관리
 */
export interface ActiveBuff {
  id: string;
  name: string;
  remainingTime: number; // ms
  effect: {
    attack?: number;
    defense?: number;
    speed?: number;
    criticalRate?: number;
  };
}

/**
 * 버프 업데이트
 */
export function updateBuffs(buffs: ActiveBuff[], deltaTime: number): ActiveBuff[] {
  return buffs
    .map(buff => ({
      ...buff,
      remainingTime: buff.remainingTime - deltaTime * 1000,
    }))
    .filter(buff => buff.remainingTime > 0);
}

/**
 * 버프 효과 적용된 스탯 계산
 */
export function applyBuffsToStats(
  baseStats: { attack: number; defense: number; speed: number; criticalRate: number },
  buffs: ActiveBuff[]
): { attack: number; defense: number; speed: number; criticalRate: number } {
  let totalAttackBonus = 0;
  let totalDefenseBonus = 0;
  let totalSpeedBonus = 0;
  let totalCritBonus = 0;
  
  buffs.forEach(buff => {
    if (buff.effect.attack) totalAttackBonus += buff.effect.attack;
    if (buff.effect.defense) totalDefenseBonus += buff.effect.defense;
    if (buff.effect.speed) totalSpeedBonus += buff.effect.speed;
    if (buff.effect.criticalRate) totalCritBonus += buff.effect.criticalRate;
  });
  
  return {
    attack: baseStats.attack * (1 + totalAttackBonus / 100),
    defense: baseStats.defense * (1 + totalDefenseBonus / 100),
    speed: baseStats.speed * (1 + totalSpeedBonus / 100),
    criticalRate: baseStats.criticalRate + totalCritBonus,
  };
}