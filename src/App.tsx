import { ChevronRight } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { defaultBindings, KeyBindings, KeyBindingSettings } from './components/KeyBindingSettings';
import { MonsterTypeStats } from './components/MonsterTypeDefinition';
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
  applyMonsterRowFromData,
  applyPlayerRowFromData,
} from './features/simulator/rowApplyManager';
import { createInitialDatasets, createInitialMonsterTypeStats } from './features/simulator/setup';
import { APP_MENU_ITEMS } from './features/ui/navigation/menuConfig';
import { CharacterTypeInfo, DEFAULT_CHARACTER_TYPES } from './lib/characterTypes';
import { CharacterConfig } from './lib/gameTypes';
import { getDefaultItemSlots, ItemSlot } from './lib/itemSystem';
import { updateDataRowWithLevel } from './lib/levelBasedStats';
import {
  defaultMonsterLevelConfig,
  defaultPlayerLevelConfig,
  LevelConfig,
} from './lib/levelSystem';
import { DataRow, mockDataset } from './lib/mockData';
import { DEFAULT_MAX_MONSTER_COUNT, DEFAULT_RESPAWN_DELAY } from './lib/simulator/constants';
import {
  BasicAttackSlot,
  defaultSkills,
  getDefaultBasicAttackSlot,
  getDefaultSkillSlots,
  Skill,
  SkillSlot,
} from './lib/skillSystem';
import { APP_VIEW, AppView, SETTINGS_VIEW_PREFIX } from './shared/constants/appViews';

const logApp = (..._args: unknown[]): void => {};
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
const MakeConfigGuide = lazy(() =>
  import('./components/MakeConfigGuide').then(m => ({ default: m.MakeConfigGuide }))
);

const ViewLoader = () => (
  <div className='flex items-center justify-center h-64'>
    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600' />
  </div>
);

export default function App() {
  const initialDatasets = createInitialDatasets();
  const [currentView, setCurrentView] = useState<AppView>(APP_VIEW.SIMULATOR);
  const [currentTick, setCurrentTick] = useState(0);
  const [currentDataRow, setCurrentDataRow] = useState<DataRow | null>(mockDataset[0] || null);
  const [keyBindings, setKeyBindings] = useState<KeyBindings>(defaultBindings);

  // Character types state
  const [characterTypes, setCharacterTypes] =
    useState<CharacterTypeInfo[]>(DEFAULT_CHARACTER_TYPES);

  // Level system state
  const [playerLevelConfig, setPlayerLevelConfig] = useState<LevelConfig>(defaultPlayerLevelConfig);
  const [monsterLevelConfig, setMonsterLevelConfig] =
    useState<LevelConfig>(defaultMonsterLevelConfig);

  // Skill system state
  const [playerBasicAttack, setPlayerBasicAttack] = useState<BasicAttackSlot>(
    getDefaultBasicAttackSlot('melee', DEFAULT_CHARACTER_TYPES[0]?.defaultBasicAttackId)
  );
  const [monsterBasicAttack, setMonsterBasicAttack] = useState<BasicAttackSlot>(
    getDefaultBasicAttackSlot('melee', DEFAULT_CHARACTER_TYPES[0]?.defaultBasicAttackId)
  );
  const [skillSlots, setSkillSlots] = useState<SkillSlot[]>(getDefaultSkillSlots());
  const [skillConfigs, setSkillConfigs] = useState<Record<string, Skill>>(defaultSkills);

  // Item system state
  const [itemSlots, setItemSlots] = useState<ItemSlot[]>(getDefaultItemSlots());

  // Projectile settings
  const [homingProjectiles, _setHomingProjectiles] = useState<boolean>(false);

  // Monster spawn settings
  const [maxMonsterCount, setMaxMonsterCount] = useState<number>(DEFAULT_MAX_MONSTER_COUNT);
  const [respawnDelay, setRespawnDelay] = useState<number>(DEFAULT_RESPAWN_DELAY);

  // Monster type definitions (프리셋 기반)
  const [monsterTypeStats, setMonsterTypeStats] = useState<Record<string, MonsterTypeStats>>(
    createInitialMonsterTypeStats()
  );

  // Separate datasets for player and monster
  const [playerDataset, setPlayerDataset] = useState<DataRow[]>(initialDatasets.playerDataset);
  const [monsterDataset, setMonsterDataset] = useState<DataRow[]>(initialDatasets.monsterDataset);

  // Monster row selection for multi-spawn (1:다 시뮬레이터)
  const [selectedMonsterRows, setSelectedMonsterRows] = useState<Set<number>>(new Set());

  const [playerConfig, setPlayerConfig] = useState<CharacterConfig>({
    size: { min: 18, max: 22 },
    speed: { min: 140, max: 160 },
    attack: { min: 45, max: 55 },
    defense: { min: 18, max: 22 },
    attackSpeed: { min: 1.4, max: 1.6 },
    accuracy: { min: 80, max: 90 },
    criticalRate: { min: 20, max: 30 },
    attackRange: { min: 75, max: 85 },
    attackWidth: { min: 85, max: 95 },
    typeId: DEFAULT_CHARACTER_TYPES[0]?.id || 'warrior', // 타입 프리셋 ID (첫 번째 타입)
    attackType: DEFAULT_CHARACTER_TYPES[0]?.id || 'warrior', // 첫 번째 타입
    monsterRespawnDelay: DEFAULT_RESPAWN_DELAY,
    monsterMaxCount: 3,
  });

  const [monsterConfig, setMonsterConfig] = useState<CharacterConfig>({
    size: { min: 22, max: 26 },
    speed: { min: 55, max: 65 },
    attack: { min: 35, max: 45 },
    defense: { min: 13, max: 17 },
    attackSpeed: { min: 0.9, max: 1.1 },
    accuracy: { min: 70, max: 80 },
    criticalRate: { min: 12, max: 18 },
    attackRange: { min: 55, max: 65 },
    attackWidth: { min: 115, max: 125 },
    typeId: DEFAULT_CHARACTER_TYPES[0]?.id || 'warrior', // 타입 프리셋 ID (첫 번째 타입)
    attackType: DEFAULT_CHARACTER_TYPES[0]?.id || 'warrior', // 첫 번째 타입
    monsterRespawnDelay: DEFAULT_RESPAWN_DELAY,
    monsterMaxCount: 3,
  });

  // Update current data row when tick changes (NOT when dataset changes)
  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTick]); // playerDataset, monsterDataset 제거하여 데이터셋 변경 시 재실행 방지

  // 플레이어 레벨 설정(초기값/증가공식) 변경 시 모든 플레이어 데이터 재계산
  useEffect(() => {
    if (playerDataset.length === 0) return;

    const recalculatedDataset = playerDataset.map(row => {
      if (row.player_level === undefined) return row;
      const level = row.player_level || 1;
      const size = row.player_size || 20;
      const typeId = row.player_attack_type;
      const typeInfo = characterTypes.find(t => t.id === typeId);
      return updateDataRowWithLevel(row, true, playerLevelConfig, level, size, typeInfo);
    });

    setPlayerDataset(recalculatedDataset);
    toast.info(`🔄 플레이어 레벨 설정 변경 → ${playerDataset.length}개 행 재계산 완료`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  ]);

  // 몬스터 레벨 설정(초기값/증가공식) 변경 시 모든 몬스터 데이터 재계산
  useEffect(() => {
    if (monsterDataset.length === 0) return;

    const recalculatedDataset = monsterDataset.map(row => {
      if (row.monster_level === undefined) return row;
      const level = row.monster_level || 1;
      const size = row.monster_size || 24;
      const typeId = row.monster_attack_type;
      const typeInfo = characterTypes.find(t => t.id === typeId);
      return updateDataRowWithLevel(row, false, monsterLevelConfig, level, size, typeInfo);
    });

    setMonsterDataset(recalculatedDataset);
    toast.info(`🔄 몬스터 레벨 설정 변경 → ${monsterDataset.length}개 행 재계산 완료`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  ]);

  const handleApplyPlayerRow = useCallback(
    (row: DataRow) => {
      applyPlayerRowFromData({
        row,
        skillConfigs,
        baseSkills: defaultSkills,
        setPlayerLevelConfig,
        setPlayerConfig,
        setPlayerBasicAttack,
        setSkillSlots,
      });
    },
    [skillConfigs]
  );

  const handleApplyMonsterRow = useCallback(
    (row: DataRow) => {
      applyMonsterRowFromData({
        row,
        skillConfigs,
        setMonsterLevelConfig,
        setMonsterConfig,
        setMonsterBasicAttack,
      });
    },
    [skillConfigs]
  );

  // Apply current data row to configs and skills (only when tick changes, NOT when dataset changes)
  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTick]); // playerDataset, monsterDataset 의도적으로 제외하여 데이터셋 변경 시 재실행 방지

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
              <p className='text-xs text-slate-500'>데이터셋 + 시각화 + 동기화</p>
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
                      playerBasicAttack={playerBasicAttack}
                      monsterBasicAttack={monsterBasicAttack}
                      onPlayerBasicAttackChange={setPlayerBasicAttack}
                      onMonsterBasicAttackChange={setMonsterBasicAttack}
                    />
                  </div>
                )}

                {/* Graphics Effect Editor View */}
                {currentView === APP_VIEW.SETTINGS_GRAPHICS && (
                  <div className='max-w-5xl mx-auto'>
                    <GraphicsEffectEditorNew
                      showPreview={true}
                      onPresetSelect={preset => {
                        logApp('프리셋 선택됨:', preset);
                        toast.success(`✨ "${preset.name}" 프리셋이 선택되었습니다!`);
                        // 여기에서 선택된 프리셋을 스킬 설정에 적용할 수 있습니다
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
                    playerConfig={playerConfig}
                    onPlayerConfigChange={setPlayerConfig}
                    monsterConfig={monsterConfig}
                    onMonsterConfigChange={setMonsterConfig}
                    playerLevelConfig={playerLevelConfig}
                    onPlayerLevelConfigChange={setPlayerLevelConfig}
                    monsterLevelConfig={monsterLevelConfig}
                    onMonsterLevelConfigChange={setMonsterLevelConfig}
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
                  />
                )}

                {/* Make View */}
                {currentView === APP_VIEW.MAKE && (
                  <div className='max-w-7xl mx-auto'>
                    <MakeConfigGuide />
                  </div>
                )}
              </Suspense>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </>
  );
}
