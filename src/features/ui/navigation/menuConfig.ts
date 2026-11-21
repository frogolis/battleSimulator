import {
  FileDown,
  Gamepad2,
  Keyboard,
  LucideIcon,
  Package,
  Settings,
  Skull,
  Sparkles,
  TrendingUp,
  User,
  Workflow,
  Zap,
} from 'lucide-react';
import { APP_VIEW, AppView } from '../../../shared/constants/appViews';

export interface AppMenuItem {
  id: AppView | null;
  label: string;
  icon: LucideIcon;
  hasSubmenu?: boolean;
  submenu?: Array<{ id: AppView; label: string; icon: LucideIcon }>;
}

export const APP_MENU_ITEMS: AppMenuItem[] = [
  { id: APP_VIEW.SIMULATOR, label: '시뮬레이터', icon: Gamepad2 },
  {
    id: null,
    label: '시뮬레이터 설정',
    icon: Settings,
    hasSubmenu: true,
    submenu: [
      { id: APP_VIEW.SETTINGS_LEVEL, label: '레벨링 시스템 설정', icon: TrendingUp },
      { id: APP_VIEW.SETTINGS_SKILLS, label: '기본공격&스킬 설정', icon: Zap },
      { id: APP_VIEW.SETTINGS_GRAPHICS, label: '그래픽 연출 효과', icon: Sparkles },
      { id: APP_VIEW.SETTINGS_PLAYER, label: '캐릭터 설정', icon: User },
      { id: APP_VIEW.SETTINGS_MONSTER, label: '몬스터 설정', icon: Skull },
      { id: APP_VIEW.SETTINGS_ITEMS, label: '아이템 설정', icon: Package },
      { id: APP_VIEW.SETTINGS_KEYS, label: '키 설정', icon: Keyboard },
    ],
  },
  { id: APP_VIEW.EXPORT, label: '데이터 내보내기', icon: FileDown },
  { id: APP_VIEW.MAKE, label: 'Make 설정', icon: Workflow },
];
