export const APP_VIEW = {
  SIMULATOR: 'simulator',
  SETTINGS_KEYS: 'settings-keys',
  SETTINGS_PLAYER: 'settings-player',
  SETTINGS_MONSTER: 'settings-monster',
  SETTINGS_LEVEL: 'settings-level',
  SETTINGS_SKILLS: 'settings-skills',
  SETTINGS_ITEMS: 'settings-items',
  SETTINGS_GRAPHICS: 'settings-graphics',
  SETTINGS_EFFECTS: 'settings-effects',
  EXPORT: 'export',
  MAKE: 'make',
} as const;

export type AppView = (typeof APP_VIEW)[keyof typeof APP_VIEW];

export const SETTINGS_VIEW_PREFIX = 'settings-';
