/**
 * 동적 아이콘 조회를 위한 정적 아이콘 맵.
 * import * as LucideIcons 대신 이 맵을 사용하여 tree-shaking을 활성화합니다.
 */
import type { LucideIcon } from 'lucide-react';
import {
  Bolt,
  Bomb,
  CircleDot,
  Crosshair,
  Crown,
  Flame,
  Gift,
  Heart,
  Orbit,
  Package,
  Scroll,
  Shield,
  Skull,
  Sparkles,
  Star,
  Sword,
  Swords,
  Target,
  Wand2,
  Wind,
  Zap,
} from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon | undefined> = {
  Bomb,
  Bolt,
  CircleDot,
  Crosshair,
  Crown,
  Flame,
  Gift,
  Heart,
  Orbit,
  Package,
  Scroll,
  Shield,
  Skull,
  Sparkles,
  Star,
  Sword,
  Swords,
  Target,
  Wand2,
  Wind,
  Zap,
  // lucide-react에 존재하지 않는 아이콘 (폴백 처리됨)
  Flask: undefined,
  Potion: undefined,
};
