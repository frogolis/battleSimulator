import { ChevronRight } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AccountManagementDialog,
  AuthenticationScreen,
  WorkspaceRecoveryScreen,
} from './components/Authentication';
import { defaultBindings, KeyBindings, KeyBindingSettings } from './components/KeyBindingSettings';
import { Button } from './components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from './components/ui/sidebar';
import { Toaster } from './components/ui/sonner';
import {
  ApiError,
  getAuthStatus,
  getWorkspace,
  login,
  logout,
  saveWorkspace,
  setupAdmin,
  type AuthUser,
} from './features/auth/client';
import {
  applyMonsterRowFromData,
  applyPlayerRowFromData,
  selectImportedRows,
} from './features/simulator/rowApplyManager';
import { findCharacterTypeReferences } from './features/simulator/characterTypeReferences';
import { findSkillReferences } from './features/simulator/skillReferences';
import { recalculateLegacyPlayerRows } from './features/simulator/playerLevelTable';
import { createInitialDatasets, createInitialMonsterTypeStats } from './features/simulator/setup';
import { APP_MENU_ITEMS } from './features/ui/navigation/menuConfig';
import { CharacterTypeInfo, DEFAULT_CHARACTER_TYPES } from './lib/characterTypes';
import { CharacterConfig } from './lib/gameTypes';
import { getDefaultItemSlots, ItemSlot } from './lib/itemSystem';
import {
  defaultMonsterLevelConfig,
  defaultPlayerLevelConfig,
  LevelConfig,
} from './lib/levelSystem';
import { DataRow, mockDataset } from './lib/mockData';
import type { MonsterTypeStats } from './lib/monsterTypes';
import { DEFAULT_MAX_MONSTER_COUNT, DEFAULT_RESPAWN_DELAY } from './lib/simulator/constants';
import { recalculateMonsterRows } from './lib/simulator/monsterStats';
import type { StageDefinition } from './lib/simulator/waves';
import { assertWorkspaceSnapshot, type WorkspaceSnapshot } from './features/workspace/model';
import { createSerializedWriter } from './features/workspace/serializedWriter';
import {
  BasicAttackSlot,
  defaultSkills,
  EFFECT_PRESETS,
  EffectPreset,
  getDefaultBasicAttackSlot,
  getDefaultSkillSlots,
  Skill,
  SkillSlot,
} from './lib/skillSystem';
import { APP_VIEW, AppView, SETTINGS_VIEW_PREFIX } from './shared/constants/appViews';

// 지연 로딩: 뷰별 컴포넌트는 필요 시 로드
const MultiMonsterSimulator = lazy(() =>
  import('./components/MultiMonsterSimulator').then(m => ({ default: m.MultiMonsterSimulator }))
);
const PlayerDatasetViewer = lazy(() =>
  import('./components/PlayerDatasetViewer').then(m => ({ default: m.PlayerDatasetViewer }))
);
const MonsterDatasetViewer = lazy(() =>
  import('./components/MonsterDatasetViewer').then(m => ({ default: m.MonsterDatasetViewer }))
);
const CharacterTypeManager = lazy(() =>
  import('./components/CharacterTypeManager').then(m => ({ default: m.CharacterTypeManager }))
);
const MonsterTypeDefinition = lazy(() =>
  import('./components/MonsterTypeDefinition').then(m => ({ default: m.MonsterTypeDefinition }))
);
const StageWaveManager = lazy(() =>
  import('./components/StageWaveManager').then(m => ({ default: m.StageWaveManager }))
);
const SimulatorSettings = lazy(() =>
  import('./components/SimulatorSettings').then(m => ({ default: m.SimulatorSettings }))
);
const SkillWorkspace = lazy(() =>
  import('./components/SkillWorkspace').then(m => ({ default: m.SkillWorkspace }))
);
const GraphicsEffectEditorNew = lazy(() =>
  import('./components/GraphicsEffectEditorNew').then(m => ({
    default: m.GraphicsEffectEditorNew,
  }))
);
const SkillAndItemSettings = lazy(() =>
  import('./components/SkillAndItemSettings').then(m => ({ default: m.SkillAndItemSettings }))
);
const DataExportImport = lazy(() =>
  import('./components/DataExportImport').then(m => ({ default: m.DataExportImport }))
);

const ViewLoader = () => (
  <div className='flex items-center justify-center h-64'>
    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600' />
  </div>
);

interface WorkspaceRecovery {
  user: AuthUser;
  workspace: unknown;
  revision: number;
  error: string;
}

const createDefaultWorkspace = (): WorkspaceSnapshot => {
  const datasets = createInitialDatasets();
  const defaultCharacterType = DEFAULT_CHARACTER_TYPES[0];
  return {
    version: 1,
    currentTick: 0,
    keyBindings: defaultBindings,
    characterTypes: DEFAULT_CHARACTER_TYPES,
    playerLevelConfig: defaultPlayerLevelConfig,
    monsterLevelConfig: defaultMonsterLevelConfig,
    playerBasicAttack: getDefaultBasicAttackSlot(
      'melee',
      defaultCharacterType?.defaultBasicAttackId
    ),
    monsterBasicAttack: getDefaultBasicAttackSlot(
      'melee',
      defaultCharacterType?.defaultBasicAttackId
    ),
    skillSlots: getDefaultSkillSlots(),
    skillConfigs: defaultSkills,
    customEffectPresets: [],
    itemSlots: getDefaultItemSlots(),
    homingProjectiles: false,
    maxMonsterCount: DEFAULT_MAX_MONSTER_COUNT,
    respawnDelay: DEFAULT_RESPAWN_DELAY,
    monsterTypeStats: createInitialMonsterTypeStats(),
    playerDataset: datasets.playerDataset,
    monsterDataset: datasets.monsterDataset,
    stageDefinitions: [],
    activeStageId: null,
    selectedMonsterIds: [],
    playerConfig: {
      size: { min: 18, max: 22 },
      speed: { min: 140, max: 160 },
      attack: { min: 45, max: 55 },
      defense: { min: 18, max: 22 },
      attackSpeed: { min: 1.4, max: 1.6 },
      accuracy: { min: 80, max: 90 },
      criticalRate: { min: 20, max: 30 },
      attackRange: { min: 75, max: 85 },
      attackWidth: { min: 85, max: 95 },
      typeId: defaultCharacterType?.id || 'warrior',
      attackType: defaultCharacterType?.id || 'warrior',
      monsterRespawnDelay: DEFAULT_RESPAWN_DELAY,
      monsterMaxCount: 3,
    },
    monsterConfig: {
      size: { min: 22, max: 26 },
      speed: { min: 55, max: 65 },
      attack: { min: 35, max: 45 },
      defense: { min: 13, max: 17 },
      attackSpeed: { min: 0.9, max: 1.1 },
      accuracy: { min: 70, max: 80 },
      criticalRate: { min: 12, max: 18 },
      attackRange: { min: 55, max: 65 },
      attackWidth: { min: 115, max: 125 },
      typeId: defaultCharacterType?.id || 'warrior',
      attackType: defaultCharacterType?.id || 'warrior',
      monsterRespawnDelay: DEFAULT_RESPAWN_DELAY,
      monsterMaxCount: 3,
    },
  };
};

const cloneWorkspace = (workspace: WorkspaceSnapshot): WorkspaceSnapshot =>
  globalThis.structuredClone(workspace);

const isLegacyEffectPreset = (value: unknown): value is EffectPreset => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const preset = value as Partial<EffectPreset>;
  return (
    typeof preset.id === 'string' &&
    typeof preset.name === 'string' &&
    typeof preset.description === 'string' &&
    typeof preset.color === 'string' &&
    typeof preset.secondaryColor === 'string' &&
    typeof preset.glowIntensity === 'number' &&
    Number.isFinite(preset.glowIntensity) &&
    ['projectile', 'trail', 'lightning', 'ring', 'glow'].includes(preset.effectType ?? '') &&
    ['circle', 'star', 'square', 'diamond', 'spark'].includes(preset.particleTexture ?? '')
  );
};

const readLegacyEffectPresets = (): EffectPreset[] => {
  const saved = localStorage.getItem('battle-simulator-custom-effect-presets');
  if (!saved) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch {
    throw new Error('이전 사용자 지정 이펙트 데이터를 읽지 못했습니다.');
  }
  if (!Array.isArray(parsed) || !parsed.every(isLegacyEffectPreset)) {
    throw new Error('이전 사용자 지정 이펙트 데이터 형식이 올바르지 않습니다.');
  }
  return parsed;
};

export default function App() {
  const [defaultWorkspace] = useState(createDefaultWorkspace);
  const initialDatasets = {
    playerDataset: defaultWorkspace.playerDataset,
    monsterDataset: defaultWorkspace.monsterDataset,
  };
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authNeedsSetup, setAuthNeedsSetup] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string>();
  const [workspaceRecovery, setWorkspaceRecovery] = useState<WorkspaceRecovery>();
  const [workspaceRecoveryExported, setWorkspaceRecoveryExported] = useState(false);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [workspaceSaveState, setWorkspaceSaveState] = useState<
    'pending' | 'saving' | 'saved' | 'error'
  >('saved');
  const [workspaceSaveRetry, setWorkspaceSaveRetry] = useState(0);
  const [workspaceError, setWorkspaceError] = useState<string>();
  const [workspaceConflict, setWorkspaceConflict] = useState(false);
  const workspaceServerRevision = useRef(0);
  const workspaceWriteGeneration = useRef(0);
  const skipNextWorkspaceSave = useRef(false);
  const [writeWorkspace] = useState(() =>
    createSerializedWriter(
      async ({ workspace, generation }: { workspace: WorkspaceSnapshot; generation: number }) => {
        if (generation !== workspaceWriteGeneration.current) return;
        const saved = await saveWorkspace(workspace, workspaceServerRevision.current);
        workspaceServerRevision.current = saved.revision;
      }
    )
  );
  const workspaceSaveRevision = useRef(0);
  const workspaceSaveTimeout = useRef<number | undefined>();
  const [accountManagerOpen, setAccountManagerOpen] = useState(false);
  const [removeLegacyPresetsAfterSave, setRemoveLegacyPresetsAfterSave] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>(APP_VIEW.SIMULATOR);
  const [currentTick, setCurrentTick] = useState(defaultWorkspace.currentTick);
  const [currentDataRow, setCurrentDataRow] = useState<DataRow | null>(mockDataset[0] || null);
  const [keyBindings, setKeyBindings] = useState<KeyBindings>(() =>
    globalThis.structuredClone(defaultWorkspace.keyBindings)
  );

  // Character types state
  const [characterTypes, setCharacterTypes] = useState<CharacterTypeInfo[]>(() =>
    globalThis.structuredClone(defaultWorkspace.characterTypes)
  );

  // Level system state
  const [playerLevelConfig, setPlayerLevelConfig] = useState<LevelConfig>(() =>
    globalThis.structuredClone(defaultWorkspace.playerLevelConfig)
  );
  const [monsterLevelConfig, setMonsterLevelConfig] = useState<LevelConfig>(() =>
    globalThis.structuredClone(defaultWorkspace.monsterLevelConfig)
  );
  const importedPlayerLevelConfig = useRef(false);
  const importedMonsterLevelConfig = useRef(false);
  const skipCurrentRowApplyRef = useRef(false);
  const [levelImportRevision, setLevelImportRevision] = useState(0);

  // Skill system state
  const [playerBasicAttack, setPlayerBasicAttack] = useState<BasicAttackSlot>(() =>
    globalThis.structuredClone(defaultWorkspace.playerBasicAttack)
  );
  const [monsterBasicAttack, setMonsterBasicAttack] = useState<BasicAttackSlot>(() =>
    globalThis.structuredClone(defaultWorkspace.monsterBasicAttack)
  );
  const [skillSlots, setSkillSlots] = useState<SkillSlot[]>(() =>
    globalThis.structuredClone(defaultWorkspace.skillSlots)
  );
  const [skillConfigs, setSkillConfigs] = useState<Record<string, Skill>>(() =>
    globalThis.structuredClone(defaultWorkspace.skillConfigs)
  );
  const [effectDraftPreset, setEffectDraftPreset] = useState<EffectPreset>(
    EFFECT_PRESETS.projectile_fireball
  );
  const [customEffectPresets, setCustomEffectPresets] = useState<EffectPreset[]>(() =>
    globalThis.structuredClone(defaultWorkspace.customEffectPresets)
  );

  // Item system state
  const [itemSlots, setItemSlots] = useState<ItemSlot[]>(() =>
    globalThis.structuredClone(defaultWorkspace.itemSlots)
  );

  // Projectile settings
  const [homingProjectiles, _setHomingProjectiles] = useState<boolean>(
    defaultWorkspace.homingProjectiles
  );

  // Monster spawn settings
  const [maxMonsterCount, setMaxMonsterCount] = useState<number>(defaultWorkspace.maxMonsterCount);
  const [respawnDelay, setRespawnDelay] = useState<number>(defaultWorkspace.respawnDelay);

  // Monster type definitions (프리셋 기반)
  const [monsterTypeStats, setMonsterTypeStats] = useState<Record<string, MonsterTypeStats>>(() =>
    globalThis.structuredClone(defaultWorkspace.monsterTypeStats)
  );

  // Separate datasets for player and monster
  const [playerDataset, setPlayerDataset] = useState<DataRow[]>(() =>
    globalThis.structuredClone(initialDatasets.playerDataset)
  );
  const [monsterDataset, setMonsterDataset] = useState<DataRow[]>(() =>
    globalThis.structuredClone(initialDatasets.monsterDataset)
  );
  const [stageDefinitions, setStageDefinitions] = useState<StageDefinition[]>(() =>
    globalThis.structuredClone(defaultWorkspace.stageDefinitions)
  );
  const [activeStageId, setActiveStageId] = useState<string | null>(defaultWorkspace.activeStageId);
  const activeStageDefinition = stageDefinitions.find(stage => stage.id === activeStageId);

  // Monster row selection for multi-spawn (1:다 시뮬레이터)
  const [selectedMonsterRows, setSelectedMonsterRows] = useState<Set<string>>(
    () => new Set(defaultWorkspace.selectedMonsterIds)
  );

  const [playerConfig, setPlayerConfig] = useState<CharacterConfig>(() =>
    globalThis.structuredClone(defaultWorkspace.playerConfig)
  );

  const [monsterConfig, setMonsterConfig] = useState<CharacterConfig>(() =>
    globalThis.structuredClone(defaultWorkspace.monsterConfig)
  );

  const applyWorkspace = useCallback(
    (input: unknown | null) => {
      let workspace: WorkspaceSnapshot;
      if (input === null) {
        workspace = cloneWorkspace(defaultWorkspace);
      } else {
        assertWorkspaceSnapshot(input);
        workspace = cloneWorkspace(input);
      }

      importedPlayerLevelConfig.current = true;
      importedMonsterLevelConfig.current = true;
      skipCurrentRowApplyRef.current = true;
      setCurrentView(APP_VIEW.SIMULATOR);
      setCurrentTick(workspace.currentTick);
      setKeyBindings(workspace.keyBindings);
      setCharacterTypes(workspace.characterTypes);
      setPlayerLevelConfig(workspace.playerLevelConfig);
      setMonsterLevelConfig(workspace.monsterLevelConfig);
      setPlayerBasicAttack(workspace.playerBasicAttack);
      setMonsterBasicAttack(workspace.monsterBasicAttack);
      setSkillSlots(workspace.skillSlots);
      setSkillConfigs(workspace.skillConfigs);
      setCustomEffectPresets(workspace.customEffectPresets);
      setItemSlots(workspace.itemSlots);
      _setHomingProjectiles(workspace.homingProjectiles);
      setMaxMonsterCount(workspace.maxMonsterCount);
      setRespawnDelay(workspace.respawnDelay);
      setMonsterTypeStats(workspace.monsterTypeStats);
      setPlayerDataset(workspace.playerDataset);
      setMonsterDataset(workspace.monsterDataset);
      setStageDefinitions(workspace.stageDefinitions);
      setActiveStageId(workspace.activeStageId);
      setSelectedMonsterRows(new Set(workspace.selectedMonsterIds));
      setPlayerConfig(workspace.playerConfig);
      setMonsterConfig(workspace.monsterConfig);
      setCurrentDataRow(
        workspace.playerDataset[workspace.currentTick] ||
          workspace.monsterDataset[workspace.currentTick]
          ? {
              ...(workspace.playerDataset[workspace.currentTick] || {}),
              ...(workspace.monsterDataset[workspace.currentTick] || {}),
            }
          : mockDataset[0] || null
      );
      setLevelImportRevision(previous => previous + 1);
      setWorkspaceError(undefined);
    },
    [defaultWorkspace]
  );

  const getCurrentWorkspace = useCallback(
    (): WorkspaceSnapshot => ({
      version: 1,
      currentTick,
      keyBindings,
      characterTypes,
      playerLevelConfig,
      monsterLevelConfig,
      playerBasicAttack,
      monsterBasicAttack,
      skillSlots,
      skillConfigs,
      customEffectPresets,
      itemSlots,
      homingProjectiles,
      maxMonsterCount,
      respawnDelay,
      monsterTypeStats,
      playerDataset,
      monsterDataset,
      stageDefinitions,
      activeStageId,
      selectedMonsterIds: Array.from(selectedMonsterRows),
      playerConfig,
      monsterConfig,
    }),
    [
      currentTick,
      keyBindings,
      characterTypes,
      playerLevelConfig,
      monsterLevelConfig,
      playerBasicAttack,
      monsterBasicAttack,
      skillSlots,
      skillConfigs,
      customEffectPresets,
      itemSlots,
      homingProjectiles,
      maxMonsterCount,
      respawnDelay,
      monsterTypeStats,
      playerDataset,
      monsterDataset,
      stageDefinitions,
      activeStageId,
      selectedMonsterRows,
      playerConfig,
      monsterConfig,
    ]
  );

  const finishAuthentication = useCallback(
    (user: AuthUser, workspace: unknown | null, revision: number) => {
      workspaceServerRevision.current = revision;
      workspaceWriteGeneration.current++;
      setWorkspaceConflict(false);
      setWorkspaceRecovery(undefined);
      setWorkspaceRecoveryExported(false);
      applyWorkspace(workspace);
      setAuthUser(user);
      setAuthNeedsSetup(false);
      setWorkspaceLoaded(true);
    },
    [applyWorkspace]
  );

  const enterWorkspaceRecovery = useCallback(
    (user: AuthUser, workspace: unknown, revision: number, error: unknown) => {
      workspaceServerRevision.current = revision;
      setAuthUser(user);
      setAuthError(undefined);
      setWorkspaceLoaded(false);
      setWorkspaceRecovery({
        user,
        workspace,
        revision,
        error: error instanceof Error ? error.message : '저장된 작업공간 데이터를 읽지 못했습니다.',
      });
      setWorkspaceRecoveryExported(false);
    },
    []
  );

  const reportWorkspaceSaveError = useCallback((error: unknown, fallback: string) => {
    setWorkspaceSaveState('error');
    setWorkspaceError(error instanceof Error ? error.message : fallback);
    if (error instanceof ApiError && error.status === 409) {
      workspaceWriteGeneration.current++;
      setWorkspaceConflict(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const restoreAuthentication = async () => {
      setAuthLoading(true);
      setAuthError(undefined);
      setAuthUser(null);
      setWorkspaceRecovery(undefined);
      setWorkspaceRecoveryExported(false);
      setWorkspaceLoaded(false);
      try {
        const status = await getAuthStatus();
        if (!active) return;
        setAuthNeedsSetup(status.needsSetup);
        if (status.user) {
          const result = await getWorkspace();
          if (!active) return;
          try {
            finishAuthentication(status.user, result.workspace, result.revision);
          } catch (error) {
            enterWorkspaceRecovery(status.user, result.workspace, result.revision, error);
          }
        }
      } catch (error) {
        if (active) {
          setAuthError(
            error instanceof Error ? error.message : '로그인 상태를 확인하지 못했습니다.'
          );
        }
      } finally {
        if (active) setAuthLoading(false);
      }
    };
    void restoreAuthentication();
    return () => {
      active = false;
    };
  }, [enterWorkspaceRecovery, finishAuthentication]);

  const handleAuthentication = useCallback(
    async (username: string, password: string) => {
      setAuthLoading(true);
      setAuthError(undefined);
      const creatingInitialAdmin = authNeedsSetup;
      try {
        const result = creatingInitialAdmin
          ? await setupAdmin(username, password)
          : await login(username, password);
        if (creatingInitialAdmin) setAuthNeedsSetup(false);
        const saved = await getWorkspace();
        let workspace = saved.workspace;
        if (creatingInitialAdmin && workspace === null) {
          try {
            const legacyPresets = readLegacyEffectPresets();
            if (legacyPresets.length > 0) {
              workspace = {
                ...cloneWorkspace(defaultWorkspace),
                customEffectPresets: legacyPresets,
              };
              setRemoveLegacyPresetsAfterSave(true);
            }
          } catch (error) {
            setWorkspaceError(
              error instanceof Error ? error.message : '이전 이펙트 데이터를 이전하지 못했습니다.'
            );
          }
        }
        try {
          finishAuthentication(result.user, workspace, saved.revision);
        } catch (error) {
          enterWorkspaceRecovery(result.user, workspace, saved.revision, error);
        }
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : '로그인할 수 없습니다.');
      } finally {
        setAuthLoading(false);
      }
    },
    [authNeedsSetup, defaultWorkspace, enterWorkspaceRecovery, finishAuthentication]
  );

  const handleLogout = useCallback(async () => {
    workspaceSaveRevision.current++;
    window.clearTimeout(workspaceSaveTimeout.current);
    workspaceSaveTimeout.current = undefined;
    setWorkspaceLoaded(false);
    try {
      await writeWorkspace({
        workspace: getCurrentWorkspace(),
        generation: workspaceWriteGeneration.current,
      });
      await logout();
      setAuthUser(null);
      setAuthNeedsSetup(false);
      setRemoveLegacyPresetsAfterSave(false);
      setWorkspaceSaveState('saved');
    } catch (error) {
      setWorkspaceLoaded(true);
      reportWorkspaceSaveError(error, '로그아웃을 완료하지 못했습니다.');
    }
  }, [getCurrentWorkspace, reportWorkspaceSaveError, writeWorkspace]);

  const handleReloadWorkspace = useCallback(async () => {
    setWorkspaceLoaded(false);
    try {
      const latest = await getWorkspace();
      workspaceServerRevision.current = latest.revision;
      workspaceWriteGeneration.current++;
      applyWorkspace(latest.workspace);
      skipNextWorkspaceSave.current = true;
      setWorkspaceConflict(false);
      setWorkspaceSaveState('saved');
      setWorkspaceLoaded(true);
    } catch (error) {
      setWorkspaceLoaded(true);
      reportWorkspaceSaveError(error, '최신 작업공간을 불러오지 못했습니다.');
    }
  }, [applyWorkspace, reportWorkspaceSaveError]);

  const handleOverwriteWorkspace = useCallback(async () => {
    setWorkspaceSaveState('saving');
    setWorkspaceError(undefined);
    try {
      const latest = await getWorkspace();
      workspaceServerRevision.current = latest.revision;
      await writeWorkspace({
        workspace: getCurrentWorkspace(),
        generation: workspaceWriteGeneration.current,
      });
      skipNextWorkspaceSave.current = true;
      setWorkspaceConflict(false);
      setWorkspaceSaveState('saved');
    } catch (error) {
      reportWorkspaceSaveError(error, '내 작업공간 변경 사항을 저장하지 못했습니다.');
    }
  }, [getCurrentWorkspace, reportWorkspaceSaveError, writeWorkspace]);

  const handleExportWorkspaceRecovery = useCallback(() => {
    if (!workspaceRecovery) return;
    try {
      const contents = JSON.stringify(workspaceRecovery.workspace, null, 2);
      if (contents === undefined) throw new Error('작업공간을 JSON 파일로 변환하지 못했습니다.');
      const url = URL.createObjectURL(
        new globalThis.Blob([contents], { type: 'application/json' })
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `battle-simulator-workspace-recovery-${Date.now()}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (error) {
      setWorkspaceRecovery(previous =>
        previous
          ? {
              ...previous,
              error:
                error instanceof Error ? error.message : '손상된 작업공간을 내보내지 못했습니다.',
            }
          : previous
      );
    }
  }, [workspaceRecovery]);

  const handleReloadWorkspaceRecovery = useCallback(async () => {
    if (!workspaceRecovery) return;
    setAuthLoading(true);
    try {
      const latest = await getWorkspace();
      try {
        finishAuthentication(workspaceRecovery.user, latest.workspace, latest.revision);
        skipNextWorkspaceSave.current = true;
      } catch (error) {
        enterWorkspaceRecovery(workspaceRecovery.user, latest.workspace, latest.revision, error);
      }
    } catch (error) {
      setWorkspaceRecovery(previous =>
        previous
          ? {
              ...previous,
              error:
                error instanceof Error ? error.message : '최신 작업공간을 불러오지 못했습니다.',
            }
          : previous
      );
    } finally {
      setAuthLoading(false);
    }
  }, [enterWorkspaceRecovery, finishAuthentication, workspaceRecovery]);

  const handleResetWorkspaceRecovery = useCallback(async () => {
    if (!workspaceRecovery || !workspaceRecoveryExported) return;
    if (
      !window.confirm(
        '내보낸 파일을 보관했는지 확인해 주세요. 계속하면 이 계정의 저장 작업공간을 기본값으로 교체합니다.'
      )
    ) {
      return;
    }
    setAuthLoading(true);
    try {
      const saved = await saveWorkspace(defaultWorkspace, workspaceRecovery.revision);
      finishAuthentication(workspaceRecovery.user, defaultWorkspace, saved.revision);
      skipNextWorkspaceSave.current = true;
    } catch (error) {
      setWorkspaceRecovery(previous =>
        previous
          ? {
              ...previous,
              error:
                error instanceof Error ? error.message : '기본 작업공간으로 복구하지 못했습니다.',
            }
          : previous
      );
    } finally {
      setAuthLoading(false);
    }
  }, [defaultWorkspace, finishAuthentication, workspaceRecovery, workspaceRecoveryExported]);

  const handleRecoveryLogout = useCallback(async () => {
    setAuthLoading(true);
    try {
      await logout();
      setAuthUser(null);
      setWorkspaceRecovery(undefined);
      setWorkspaceRecoveryExported(false);
      setWorkspaceLoaded(false);
    } catch (error) {
      setWorkspaceRecovery(previous =>
        previous
          ? {
              ...previous,
              error: error instanceof Error ? error.message : '로그아웃하지 못했습니다.',
            }
          : previous
      );
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authUser || !workspaceLoaded || workspaceConflict) return;
    if (skipNextWorkspaceSave.current) {
      skipNextWorkspaceSave.current = false;
      return;
    }
    const workspace = getCurrentWorkspace();
    const revision = ++workspaceSaveRevision.current;
    const generation = workspaceWriteGeneration.current;
    setWorkspaceSaveState('pending');
    const timeout = window.setTimeout(async () => {
      workspaceSaveTimeout.current = undefined;
      setWorkspaceSaveState('saving');
      try {
        await writeWorkspace({ workspace, generation });
        if (
          revision !== workspaceSaveRevision.current ||
          generation !== workspaceWriteGeneration.current
        ) {
          return;
        }
        setWorkspaceSaveState('saved');
        setWorkspaceError(undefined);
        if (removeLegacyPresetsAfterSave) {
          try {
            localStorage.removeItem('battle-simulator-custom-effect-presets');
            setRemoveLegacyPresetsAfterSave(false);
          } catch {
            setWorkspaceError(
              '저장된 이펙트는 이전했지만 이전 브라우저 데이터를 정리하지 못했습니다.'
            );
          }
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          reportWorkspaceSaveError(error, '작업공간을 저장하지 못했습니다.');
          return;
        }
        if (revision !== workspaceSaveRevision.current) return;
        reportWorkspaceSaveError(error, '작업공간을 저장하지 못했습니다.');
      }
    }, 500);
    workspaceSaveTimeout.current = timeout;
    return () => {
      window.clearTimeout(timeout);
      if (workspaceSaveTimeout.current === timeout) workspaceSaveTimeout.current = undefined;
    };
  }, [
    authUser,
    workspaceLoaded,
    workspaceConflict,
    getCurrentWorkspace,
    removeLegacyPresetsAfterSave,
    reportWorkspaceSaveError,
    workspaceSaveRetry,
    writeWorkspace,
  ]);

  // Update current data row when tick changes (NOT when dataset changes)
  useEffect(() => {
    if (!workspaceLoaded) return;
    const playerRow = playerDataset[currentTick];
    const monsterRow = monsterDataset[currentTick];

    // Merge player and monster data for the current tick
    if (playerRow || monsterRow) {
      const mergedRow = {
        ...(playerRow || {}),
        ...(monsterRow || {}),
      } as DataRow;
      setCurrentDataRow(mergedRow);
    }
  }, [currentTick, workspaceLoaded]); // playerDataset, monsterDataset 의도적으로 제외

  // 플레이어 레벨 설정 변경 시 레거시 데이터만 재계산
  useEffect(() => {
    if (!workspaceLoaded) return;
    // Imported rows are already part of the workbook and must not be recalculated on import.
    if (importedPlayerLevelConfig.current) return;
    if (playerDataset.length === 0) return;

    const result = recalculateLegacyPlayerRows(playerDataset, playerLevelConfig, characterTypes);
    if (result.skipped.length) {
      const first = result.skipped[0];
      toast.warning(
        `플레이어 ${result.skipped.length}개 행은 레벨·크기 오류로 재계산하지 않았습니다. 행 ${first.index}: ${first.field}`
      );
    }
    if (result.count === 0) return;
    setPlayerDataset(result.rows);
    toast.info(`🔄 플레이어 레벨 설정 변경 → ${result.count}개 행 재계산 완료`);
  }, [
    playerLevelConfig.baseHp,
    playerLevelConfig.baseSp,
    playerLevelConfig.baseAttack,
    playerLevelConfig.baseDefense,
    playerLevelConfig.baseSpeed,
    playerLevelConfig.hpGrowth.a,
    playerLevelConfig.hpGrowth.b,
    playerLevelConfig.spGrowth.a,
    playerLevelConfig.spGrowth.b,
    playerLevelConfig.attackGrowth.a,
    playerLevelConfig.attackGrowth.b,
    playerLevelConfig.defenseGrowth.a,
    playerLevelConfig.defenseGrowth.b,
    playerLevelConfig.speedGrowth.a,
    playerLevelConfig.speedGrowth.b,
    workspaceLoaded,
  ]);

  // 몬스터 레벨 설정(초기값/증가공식) 변경 시 모든 몬스터 데이터 재계산
  useEffect(() => {
    if (!workspaceLoaded) return;
    if (importedMonsterLevelConfig.current) return;
    if (monsterDataset.length === 0) return;

    const result = recalculateMonsterRows(monsterDataset, monsterLevelConfig, characterTypes);
    if (result.skipped.length) {
      const first = result.skipped[0];
      toast.warning(
        `몬스터 ${result.skipped.length}개 행은 레벨·크기 오류로 재계산하지 않았습니다. 행 ${first.index}: ${first.field}`
      );
    }
    if (result.count === 0) return;
    setMonsterDataset(result.rows);
    toast.info(`🔄 몬스터 레벨 설정 변경 → ${result.count}개 행 재계산 완료`);
  }, [
    monsterLevelConfig.baseHp,
    monsterLevelConfig.baseSp,
    monsterLevelConfig.baseAttack,
    monsterLevelConfig.baseDefense,
    monsterLevelConfig.baseSpeed,
    monsterLevelConfig.hpGrowth.a,
    monsterLevelConfig.hpGrowth.b,
    monsterLevelConfig.spGrowth.a,
    monsterLevelConfig.spGrowth.b,
    monsterLevelConfig.attackGrowth.a,
    monsterLevelConfig.attackGrowth.b,
    monsterLevelConfig.defenseGrowth.a,
    monsterLevelConfig.defenseGrowth.b,
    monsterLevelConfig.speedGrowth.a,
    monsterLevelConfig.speedGrowth.b,
    workspaceLoaded,
  ]);

  useEffect(() => {
    importedPlayerLevelConfig.current = false;
    importedMonsterLevelConfig.current = false;
  }, [levelImportRevision]);

  const handleApplyPlayerRow = useCallback(
    (row: DataRow) => {
      const result = applyPlayerRowFromData({
        row,
        skillConfigs,
        setPlayerLevelConfig,
        setPlayerConfig,
        setPlayerBasicAttack,
        setSkillSlots,
      });
      if (result.status === 'missing') {
        toast.error('플레이어 행의 크기가 없어 설정을 적용하지 않았습니다.');
      } else if (result.status === 'invalid') {
        toast.error(`플레이어 행의 "${result.field}" 값은 유한한 숫자여야 합니다.`);
      }
      return result.status === 'applied';
    },
    [skillConfigs]
  );

  const handleApplyMonsterRow = useCallback(
    (row: DataRow) => {
      const result = applyMonsterRowFromData({
        row,
        skillConfigs,
        setMonsterLevelConfig,
        setMonsterConfig,
        setMonsterBasicAttack,
      });
      if (result.status === 'missing') {
        toast.error('몬스터 행의 크기가 없어 설정을 적용하지 않았습니다.');
      } else if (result.status === 'invalid') {
        toast.error(`몬스터 행의 "${result.field}" 값은 유한한 숫자여야 합니다.`);
      }
      return result.status === 'applied';
    },
    [skillConfigs]
  );

  // Apply current data row to configs and skills (only when tick changes, NOT when dataset changes)
  useEffect(() => {
    if (!workspaceLoaded) return;
    if (skipCurrentRowApplyRef.current) {
      skipCurrentRowApplyRef.current = false;
      return;
    }
    // currentTick이 변경될 때만 실행
    // 데이터셋 내 값 변경 시에는 PlayerDatasetViewer/MonsterDatasetViewer의 onApplyRow로 처리
    const playerRow = playerDataset[currentTick];
    const monsterRow = monsterDataset[currentTick];

    if (playerRow && playerRow.player_size !== undefined) {
      handleApplyPlayerRow(playerRow);
    }
    if (monsterRow && monsterRow.monster_size !== undefined) {
      handleApplyMonsterRow(monsterRow);
    }
  }, [currentTick, workspaceLoaded]); // playerDataset, monsterDataset 의도적으로 제외

  if (authLoading) {
    return (
      <>
        <Toaster position='top-right' />
        <div className='flex min-h-screen items-center justify-center'>
          <ViewLoader />
        </div>
      </>
    );
  }

  if (workspaceRecovery) {
    return (
      <>
        <Toaster position='top-right' />
        <WorkspaceRecoveryScreen
          username={workspaceRecovery.user.username}
          error={workspaceRecovery.error}
          busy={authLoading}
          exported={workspaceRecoveryExported}
          onExport={handleExportWorkspaceRecovery}
          onConfirmExport={setWorkspaceRecoveryExported}
          onReload={() => void handleReloadWorkspaceRecovery()}
          onReset={() => void handleResetWorkspaceRecovery()}
          onLogout={() => void handleRecoveryLogout()}
        />
      </>
    );
  }

  if (!authUser) {
    return (
      <>
        <Toaster position='top-right' />
        <AuthenticationScreen
          needsSetup={authNeedsSetup}
          busy={authLoading}
          error={authError}
          onSubmit={handleAuthentication}
        />
      </>
    );
  }

  if (!workspaceLoaded) {
    return (
      <>
        <Toaster position='top-right' />
        <div className='flex min-h-screen items-center justify-center'>
          <ViewLoader />
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster position='top-right' />
      <SidebarProvider defaultOpen={true}>
        <div className='flex min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100'>
          {/* Left Sidebar */}
          <Sidebar>
            <SidebarHeader className='border-b border-sidebar-border p-4'>
              <div className='space-y-1'>
                <h2 className='text-slate-900'>게임 시뮬레이터</h2>
                <p className='text-sm text-slate-600'>스프레드시트 워크플로우</p>
              </div>
            </SidebarHeader>

            <SidebarContent className='overflow-visible'>
              <SidebarGroup>
                <SidebarGroupLabel>메뉴</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {APP_MENU_ITEMS.map((item, index) => (
                      <SidebarMenuItem key={item.id || `menu-${index}`}>
                        {item.hasSubmenu ? (
                          // Menu with submenu - hover dropdown
                          <div className='group relative'>
                            <SidebarMenuButton
                              isActive={currentView.startsWith(SETTINGS_VIEW_PREFIX)}
                              tooltip={item.label}
                              className='cursor-default'
                            >
                              <item.icon className='h-4 w-4' />
                              <span>{item.label}</span>
                              <ChevronRight className='ml-auto h-3 w-3 transition-transform group-hover:rotate-90' />
                            </SidebarMenuButton>

                            {/* Submenu - shows on hover */}
                            <div className='absolute left-full top-0 ml-2 hidden w-60 rounded-lg border border-slate-200 bg-white shadow-xl group-hover:block z-[100]'>
                              <div className='p-1.5'>
                                {item.submenu?.map(subItem => (
                                  <button
                                    key={subItem.id}
                                    onClick={() => setCurrentView(subItem.id)}
                                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all hover:bg-slate-100 ${
                                      currentView === subItem.id
                                        ? 'bg-blue-50 text-blue-700 font-medium'
                                        : 'text-slate-700'
                                    }`}
                                  >
                                    <span className='flex-1'>{subItem.label}</span>
                                    <subItem.icon className='h-4 w-4 flex-shrink-0' />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Regular menu item
                          <SidebarMenuButton
                            onClick={() => item.id && setCurrentView(item.id)}
                            isActive={currentView === item.id}
                            tooltip={item.label}
                          >
                            <item.icon className='h-4 w-4' />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        )}
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className='border-t border-sidebar-border p-4'>
              <div className='space-y-2'>
                <p className='text-sm font-medium'>{authUser.username}</p>
                <p className='text-xs text-slate-500'>
                  {workspaceSaveState === 'saving'
                    ? '작업공간 저장 중...'
                    : workspaceSaveState === 'pending'
                      ? '변경 사항 저장 대기'
                      : workspaceSaveState === 'error'
                        ? '작업공간 저장 오류'
                        : '작업공간 저장됨'}
                </p>
                {workspaceError && (
                  <p role='alert' className='text-xs text-red-600'>
                    {workspaceError}
                  </p>
                )}
                {workspaceConflict ? (
                  <>
                    <Button
                      variant='outline'
                      size='sm'
                      className='w-full'
                      onClick={() => void handleReloadWorkspace()}
                      disabled={workspaceSaveState === 'saving'}
                    >
                      서버의 최신 작업공간 불러오기
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      className='w-full'
                      onClick={() => void handleOverwriteWorkspace()}
                      disabled={workspaceSaveState === 'saving'}
                    >
                      내 변경 사항으로 덮어쓰기
                    </Button>
                  </>
                ) : workspaceSaveState === 'error' ? (
                  <Button
                    variant='outline'
                    size='sm'
                    className='w-full'
                    onClick={() => setWorkspaceSaveRetry(previous => previous + 1)}
                  >
                    다시 저장
                  </Button>
                ) : null}
                {authUser.role === 'admin' && (
                  <Button
                    variant='outline'
                    size='sm'
                    className='w-full'
                    onClick={() => setAccountManagerOpen(true)}
                  >
                    사용자 계정 관리
                  </Button>
                )}
                <Button
                  variant='ghost'
                  size='sm'
                  className='w-full'
                  onClick={() => void handleLogout()}
                  disabled={workspaceSaveState === 'saving'}
                >
                  로그아웃
                </Button>
              </div>
            </SidebarFooter>
          </Sidebar>

          {/* Main Content */}
          <main className='flex-1 overflow-auto'>
            <div className='container max-w-screen-2xl mx-auto p-6 lg:p-8'>
              <Suspense fallback={<ViewLoader />}>
                {/* Simulator View (통합: 1:1 / 1:다) */}
                {currentView === APP_VIEW.SIMULATOR && (
                  <div className='space-y-8'>
                    {/* 통합 시뮬레이터 - 모드 전환 가능 */}
                    <MultiMonsterSimulator
                      keyBindings={keyBindings}
                      playerConfig={playerConfig}
                      monsterConfig={monsterConfig}
                      currentTick={currentTick}
                      currentDataRow={currentDataRow}
                      playerDataset={playerDataset}
                      playerLevelConfig={playerLevelConfig}
                      monsterLevelConfig={monsterLevelConfig}
                      skillSlots={skillSlots}
                      skillConfigs={skillConfigs}
                      itemSlots={itemSlots}
                      homingProjectiles={homingProjectiles}
                      maxMonsterCount={maxMonsterCount}
                      respawnDelay={respawnDelay}
                      playerBasicAttack={playerBasicAttack}
                      monsterBasicAttack={monsterBasicAttack}
                      title='시뮬레이터'
                      selectedMonsterRows={selectedMonsterRows}
                      monsterDataset={monsterDataset}
                      stageDefinition={activeStageDefinition}
                    />

                    {/* Datasets (Vertical) */}
                    <div className='space-y-6'>
                      <PlayerDatasetViewer
                        dataset={playerDataset}
                        setDataset={setPlayerDataset}
                        currentTick={currentTick}
                        setCurrentTick={setCurrentTick}
                        playerConfig={playerConfig}
                        playerLevelConfig={playerLevelConfig}
                        onApplyRow={handleApplyPlayerRow}
                        characterTypes={characterTypes}
                        skillConfigs={skillConfigs}
                      />
                      <MonsterDatasetViewer
                        dataset={monsterDataset}
                        setDataset={setMonsterDataset}
                        currentTick={currentTick}
                        setCurrentTick={setCurrentTick}
                        monsterConfig={monsterConfig}
                        monsterLevelConfig={monsterLevelConfig}
                        onApplyRow={handleApplyMonsterRow}
                        characterTypes={characterTypes}
                        stageDefinitions={stageDefinitions}
                        skillConfigs={skillConfigs}
                        selectedRows={selectedMonsterRows}
                        onSelectedRowsChange={setSelectedMonsterRows}
                        maxMonsterCount={maxMonsterCount}
                        onMaxMonsterCountChange={setMaxMonsterCount}
                        respawnDelay={respawnDelay}
                        onRespawnDelayChange={setRespawnDelay}
                      />
                    </div>
                  </div>
                )}

                {/* Key Settings View */}
                {currentView === APP_VIEW.SETTINGS_KEYS && (
                  <div className='max-w-4xl mx-auto'>
                    <KeyBindingSettings bindings={keyBindings} onBindingsChange={setKeyBindings} />
                  </div>
                )}

                {/* Character Settings View */}
                {currentView === APP_VIEW.SETTINGS_PLAYER && (
                  <div className='max-w-5xl mx-auto'>
                    <CharacterTypeManager
                      characterTypes={characterTypes}
                      onCharacterTypesChange={setCharacterTypes}
                      findTypeReferences={id =>
                        findCharacterTypeReferences(id, {
                          playerConfig,
                          monsterConfig,
                          monsterTypeStats,
                          playerDataset,
                          monsterDataset,
                        })
                      }
                    />
                  </div>
                )}

                {/* Monster Type Definition View */}
                {currentView === APP_VIEW.SETTINGS_MONSTER && (
                  <div className='max-w-4xl mx-auto'>
                    <MonsterTypeDefinition
                      monsterTypeStats={monsterTypeStats}
                      onMonsterTypeStatsChange={setMonsterTypeStats}
                      characterTypes={characterTypes}
                    />
                  </div>
                )}

                {currentView === APP_VIEW.SETTINGS_WAVES && (
                  <div className='max-w-6xl mx-auto'>
                    <StageWaveManager
                      stageDefinitions={stageDefinitions}
                      onStageDefinitionsChange={setStageDefinitions}
                      activeStageId={activeStageId}
                      onActiveStageIdChange={setActiveStageId}
                      monsterDataset={monsterDataset}
                      maxMonsterCount={maxMonsterCount}
                      defaultRespawnDelay={respawnDelay}
                    />
                  </div>
                )}

                {/* Level/Experience System View */}
                {currentView === APP_VIEW.SETTINGS_LEVEL && (
                  <div className='max-w-6xl mx-auto'>
                    <SimulatorSettings
                      playerLevelConfig={playerLevelConfig}
                      onPlayerLevelConfigChange={setPlayerLevelConfig}
                      monsterLevelConfig={monsterLevelConfig}
                      onMonsterLevelConfigChange={setMonsterLevelConfig}
                      characterTypes={characterTypes}
                      onCharacterTypesChange={setCharacterTypes}
                    />
                  </div>
                )}

                {/* Skills & Basic Attack System View */}
                {currentView === APP_VIEW.SETTINGS_SKILLS && (
                  <div className='h-[calc(100vh-8rem)] px-6'>
                    <SkillWorkspace
                      skills={skillConfigs}
                      onSkillsChange={setSkillConfigs}
                      findSkillReferences={id =>
                        findSkillReferences(id, {
                          characterTypes,
                          monsterTypeStats,
                          playerDataset,
                          monsterDataset,
                        })
                      }
                      playerBasicAttack={playerBasicAttack}
                      monsterBasicAttack={monsterBasicAttack}
                      onPlayerBasicAttackChange={setPlayerBasicAttack}
                      onMonsterBasicAttackChange={setMonsterBasicAttack}
                    />
                  </div>
                )}

                {/* Graphics Effect Editor View */}
                {currentView === APP_VIEW.SETTINGS_GRAPHICS && (
                  <div className='max-w-5xl mx-auto space-y-4'>
                    <GraphicsEffectEditorNew
                      showPreview={true}
                      selectedPresetKey={effectDraftPreset.id}
                      customPresets={customEffectPresets}
                      onCustomPresetsChange={setCustomEffectPresets}
                      onPresetSelect={preset => {
                        setEffectDraftPreset(preset);
                        toast.success(`🎨 "${preset.name}" 이펙트 초안을 선택했습니다.`);
                      }}
                      onPresetCustomize={customizedPreset => {
                        setEffectDraftPreset(customizedPreset);
                      }}
                    />
                  </div>
                )}

                {/* Items System View */}
                {currentView === APP_VIEW.SETTINGS_ITEMS && (
                  <div className='max-w-4xl mx-auto'>
                    <SkillAndItemSettings
                      skills={skillConfigs}
                      onSkillsChange={setSkillConfigs}
                      itemSlots={itemSlots}
                      onItemSlotsChange={setItemSlots}
                      showOnlyItems={true}
                    />
                  </div>
                )}

                {/* Data Export/Import View */}
                {currentView === APP_VIEW.EXPORT && (
                  <DataExportImport
                    currentTick={currentTick}
                    playerConfig={playerConfig}
                    onPlayerConfigChange={setPlayerConfig}
                    monsterConfig={monsterConfig}
                    onMonsterConfigChange={setMonsterConfig}
                    playerLevelConfig={playerLevelConfig}
                    onPlayerLevelConfigChange={config => {
                      importedPlayerLevelConfig.current = true;
                      setPlayerLevelConfig(config);
                      setLevelImportRevision(revision => revision + 1);
                    }}
                    monsterLevelConfig={monsterLevelConfig}
                    onMonsterLevelConfigChange={config => {
                      importedMonsterLevelConfig.current = true;
                      setMonsterLevelConfig(config);
                      setLevelImportRevision(revision => revision + 1);
                    }}
                    skillConfigs={skillConfigs}
                    onSkillConfigsChange={setSkillConfigs}
                    playerBasicAttack={playerBasicAttack}
                    onPlayerBasicAttackChange={setPlayerBasicAttack}
                    monsterBasicAttack={monsterBasicAttack}
                    onMonsterBasicAttackChange={setMonsterBasicAttack}
                    itemSlots={itemSlots}
                    onItemSlotsChange={setItemSlots}
                    characterTypes={characterTypes}
                    onCharacterTypesChange={setCharacterTypes}
                    monsterTypeStats={monsterTypeStats}
                    onMonsterTypeStatsChange={setMonsterTypeStats}
                    playerDataset={playerDataset}
                    onPlayerDatasetChange={setPlayerDataset}
                    monsterDataset={monsterDataset}
                    onMonsterDatasetChange={setMonsterDataset}
                    stageDefinitions={stageDefinitions}
                    onStageDefinitionsChange={setStageDefinitions}
                    onImportSuccess={data => {
                      setActiveStageId(previous =>
                        data.stageDefinitions?.some(stage => stage.id === previous)
                          ? previous
                          : null
                      );
                      const { tick, playerRow, monsterRow, currentRow } = selectImportedRows(
                        data.playerDataset,
                        data.monsterDataset,
                        currentTick
                      );
                      setCurrentTick(tick);
                      setCurrentDataRow(currentRow);
                      setSelectedMonsterRows(new Set());
                      if (selectedMonsterRows.size > 0) {
                        toast.info(
                          '이전 몬스터 행 선택을 해제했습니다. 새 데이터에서 다시 선택하세요.'
                        );
                      }
                      if (playerRow?.player_size !== undefined) {
                        applyPlayerRowFromData({
                          row: playerRow,
                          skillConfigs: data.skillConfigs,
                          setPlayerLevelConfig,
                          setPlayerConfig,
                          setPlayerBasicAttack,
                          setSkillSlots,
                        });
                      } else {
                        setSkillSlots([]);
                        toast.warning(
                          '선택된 플레이어 행이 없거나 크기가 없어 행 설정을 적용하지 않았습니다.'
                        );
                      }
                      if (monsterRow?.monster_size !== undefined) {
                        applyMonsterRowFromData({
                          row: monsterRow,
                          skillConfigs: data.skillConfigs,
                          setMonsterLevelConfig,
                          setMonsterConfig,
                          setMonsterBasicAttack,
                        });
                      } else {
                        toast.warning(
                          '선택된 몬스터 행이 없거나 크기가 없어 행 설정을 적용하지 않았습니다.'
                        );
                      }
                    }}
                  />
                )}

              </Suspense>
            </div>
          </main>
        </div>
      </SidebarProvider>
      <AccountManagementDialog open={accountManagerOpen} onOpenChange={setAccountManagerOpen} />
    </>
  );
}
