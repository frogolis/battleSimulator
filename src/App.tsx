import { useState, useEffect, useCallback } from 'react';
import { MultiMonsterSimulator } from './components/MultiMonsterSimulator';
import { MakeConfigGuide } from './components/MakeConfigGuide';
import { KeyBindingSettings, defaultBindings, KeyBindings } from './components/KeyBindingSettings';
import { MonsterTypeDefinition, MonsterTypeStats } from './components/MonsterTypeDefinition';
import { CharacterConfig } from './lib/gameTypes';
import { SimulatorSettings } from './components/SimulatorSettings';
import { SkillAndItemSettings } from './components/SkillAndItemSettings';
import { SkillWorkspace } from './components/SkillWorkspace';
import { DataExportImport } from './components/DataExportImport';
import { PlayerDatasetViewer } from './components/PlayerDatasetViewer';
import { MonsterDatasetViewer } from './components/MonsterDatasetViewer';
import { CharacterTypeManager } from './components/CharacterTypeManager';
import { Toaster } from './components/ui/sonner';
import { DataRow, mockDataset } from './lib/mockData';
import { toast } from 'sonner';
import { defaultPlayerLevelConfig, defaultMonsterLevelConfig, LevelConfig } from './lib/levelSystem';
import { getDefaultSkillSlots, SkillSlot, defaultSkills, Skill, getDefaultBasicAttackSlot, BasicAttackSlot } from './lib/skillSystem';
import { getDefaultItemSlots, ItemSlot } from './lib/itemSystem';
import { CharacterType } from './lib/gameTypes';
import { DEFAULT_CHARACTER_TYPES, CharacterTypeInfo } from './lib/characterTypes';
import { updateDataRowWithLevel } from './lib/levelBasedStats';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from './components/ui/sidebar';
import { Gamepad2, Settings, Database, FileDown, Workflow, Users, Keyboard, UserCircle, TrendingUp, Zap, Package, ChevronRight, User, Skull, Sparkles } from 'lucide-react';
import { defaultAIPatternConfig } from './lib/monsterAI';
import { GraphicsEffectEditor } from './components/GraphicsEffectEditor';
import { GraphicsEffectEditorNew } from './components/GraphicsEffectEditorNew';

type View = 'simulator' | 'settings-keys' | 'settings-player' | 'settings-monster' | 'settings-level' | 'settings-skills' | 'settings-items' | 'settings-graphics' | 'settings-effects' | 'export' | 'make';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('simulator');
  const [currentTick, setCurrentTick] = useState(0);
  const [currentDataRow, setCurrentDataRow] = useState<DataRow | null>(mockDataset[0] || null);
  const [keyBindings, setKeyBindings] = useState<KeyBindings>(defaultBindings);
  
  // Character types state
  const [characterTypes, setCharacterTypes] = useState<CharacterTypeInfo[]>(DEFAULT_CHARACTER_TYPES);
  
  // Level system state
  const [playerLevelConfig, setPlayerLevelConfig] = useState<LevelConfig>(defaultPlayerLevelConfig);
  const [monsterLevelConfig, setMonsterLevelConfig] = useState<LevelConfig>(defaultMonsterLevelConfig);
  
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
  const [homingProjectiles, setHomingProjectiles] = useState<boolean>(false);
  
  // Monster spawn settings
  const [maxMonsterCount, setMaxMonsterCount] = useState<number>(5);
  const [respawnDelay, setRespawnDelay] = useState<number>(2000);
  
  // Monster type definitions (프리셋 기반)
  const [monsterTypeStats, setMonsterTypeStats] = useState<Record<string, MonsterTypeStats>>({
    warrior: {
      characterType: 'warrior',
      baseLevel: 1,
      size: 24,
      aiPattern: 'aggressive',
      skills: ['powerSlash', 'whirlwind'],
      aiPatternConfig: { ...defaultAIPatternConfig },
    },
    archer: {
      characterType: 'archer',
      baseLevel: 1,
      size: 20,
      aiPattern: 'ranged',
      skills: ['powerSlash', 'heal'],
      aiPatternConfig: { ...defaultAIPatternConfig },
    },
  });
  
  // Separate datasets for player and monster
  const [playerDataset, setPlayerDataset] = useState<DataRow[]>(
    mockDataset.filter(row => row.player_size !== undefined)
  );
  const [monsterDataset, setMonsterDataset] = useState<DataRow[]>(
    mockDataset.filter(row => row.monster_size !== undefined).map(row => {
      // 기존 데이터에 AI 패턴이 없으면 기본 패턴 추가
      if (!row.monster_ai_patterns) {
        return {
          ...row,
          monster_ai_patterns: JSON.stringify(defaultAIPatternConfig),
        };
      }
      return row;
    })
  );
  
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
    monsterRespawnDelay: 2000,
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
    monsterRespawnDelay: 2000,
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

  const handleApplyPlayerRow = useCallback((row: DataRow) => {
    if (row.player_size !== undefined) {
      // Update player level config if level is present in the row
      if (row.player_level !== undefined) {
        setPlayerLevelConfig(prev => ({
          ...prev,
          currentLevel: row.player_level as number,
        }));
      }
      
      setPlayerConfig(prev => ({
        ...prev,
        size: row.player_size !== undefined ? { min: row.player_size, max: row.player_size } : prev.size,
        speed: row.player_speed !== undefined ? { min: row.player_speed, max: row.player_speed } : prev.speed,
        attack: row.player_attack !== undefined ? { min: row.player_attack, max: row.player_attack } : prev.attack,
        defense: row.player_defense !== undefined ? { min: row.player_defense, max: row.player_defense } : prev.defense,
        attackSpeed: row.player_attack_speed !== undefined ? { min: row.player_attack_speed, max: row.player_attack_speed } : prev.attackSpeed,
        accuracy: row.player_accuracy !== undefined ? { min: row.player_accuracy, max: row.player_accuracy } : prev.accuracy,
        criticalRate: row.player_critical_rate !== undefined ? { min: row.player_critical_rate, max: row.player_critical_rate } : prev.criticalRate,
        attackRange: row.player_attack_range !== undefined ? { min: row.player_attack_range, max: row.player_attack_range } : prev.attackRange,
        attackWidth: row.player_attack_width !== undefined ? { min: row.player_attack_width, max: row.player_attack_width } : prev.attackWidth,
        attackType: (row.player_attack_type as CharacterType) || prev.attackType,
      }));
      
      // 기본 공격 적용 (데이터셋의 range/width 파라미터 사용)
      if (row.player_basic_attack_id) {
        const basicAttackId = row.player_basic_attack_id as string;
        const basicAttackSkill = skillConfigs[basicAttackId];
        if (basicAttackSkill && basicAttackSkill.category === 'basicAttack') {
          const range = row.player_basic_attack_range as number;
          const width = row.player_basic_attack_width as number;
          const damage = row.player_basic_attack_damage as number;
          const cooldown = row.player_basic_attack_cooldown as number;
          const spCost = row.player_basic_attack_sp_cost as number;
          const castTime = row.player_basic_attack_cast_time as number;
          
          setPlayerBasicAttack({
            skill: basicAttackSkill,
            keyBinding: 'click',
            range: range !== undefined ? range : basicAttackSkill.range,
            width: width !== undefined ? width : basicAttackSkill.area,
            damage: damage !== undefined ? damage : basicAttackSkill.damageMultiplier,
            cooldown: cooldown !== undefined ? cooldown : basicAttackSkill.cooldown,
            spCost: spCost !== undefined ? spCost : basicAttackSkill.spCost,
            castTime: castTime !== undefined ? castTime : basicAttackSkill.castTime,
          });
        }
      }
      
      // 스킬 슬롯 파라미터 적용
      const newSkillSlots: SkillSlot[] = [];
      for (let i = 1; i <= 4; i++) {
        const skillId = row[`player_skill_${i}_id` as keyof DataRow] as string;
        if (skillId && defaultSkills[skillId]) {
          const baseSkill = defaultSkills[skillId];
          const range = row[`player_skill_${i}_range` as keyof DataRow] as number;
          const width = row[`player_skill_${i}_width` as keyof DataRow] as number;
          const damage = row[`player_skill_${i}_damage` as keyof DataRow] as number;
          const cooldown = row[`player_skill_${i}_cooldown` as keyof DataRow] as number;
          const spCost = row[`player_skill_${i}_sp_cost` as keyof DataRow] as number;
          const castTime = row[`player_skill_${i}_cast_time` as keyof DataRow] as number;
          
          const customSkill: Skill = {
            ...baseSkill,
            range: range !== undefined ? range : baseSkill.range,
            area: width !== undefined ? width : baseSkill.area,
            damageMultiplier: damage !== undefined ? damage : baseSkill.damageMultiplier,
            cooldown: cooldown !== undefined ? cooldown : baseSkill.cooldown,
            spCost: spCost !== undefined ? spCost : baseSkill.spCost,
            castTime: castTime !== undefined ? castTime : baseSkill.castTime,
            currentCooldown: 0,
            isOnCooldown: false,
          };
          
          newSkillSlots.push({
            slotNumber: i as 1 | 2 | 3 | 4,
            skill: customSkill,
            keyBinding: i.toString(),
          });
        }
      }
      
      if (newSkillSlots.length > 0) {
        setSkillSlots(newSkillSlots);
      }
    }
  }, [skillConfigs]);
  
  const handleApplyMonsterRow = useCallback((row: DataRow) => {
    if (row.monster_size !== undefined) {
      // Update monster level config if level is present in the row
      if (row.monster_level !== undefined) {
        setMonsterLevelConfig(prev => ({
          ...prev,
          currentLevel: row.monster_level as number,
        }));
      }
      
      setMonsterConfig(prev => ({
        ...prev,
        size: row.monster_size !== undefined ? { min: row.monster_size, max: row.monster_size } : prev.size,
        speed: row.monster_speed !== undefined ? { min: row.monster_speed, max: row.monster_speed } : prev.speed,
        attack: row.monster_attack !== undefined ? { min: row.monster_attack, max: row.monster_attack } : prev.attack,
        defense: row.monster_defense !== undefined ? { min: row.monster_defense, max: row.monster_defense } : prev.defense,
        attackSpeed: row.monster_attack_speed !== undefined ? { min: row.monster_attack_speed, max: row.monster_speed } : prev.attackSpeed,
        accuracy: row.monster_accuracy !== undefined ? { min: row.monster_accuracy, max: row.monster_accuracy } : prev.accuracy,
        criticalRate: row.monster_critical_rate !== undefined ? { min: row.monster_critical_rate, max: row.monster_critical_rate } : prev.criticalRate,
        attackRange: row.monster_attack_range !== undefined ? { min: row.monster_attack_range, max: row.monster_attack_range } : prev.attackRange,
        attackWidth: row.monster_attack_width !== undefined ? { min: row.monster_attack_width, max: row.monster_attack_width } : prev.attackWidth,
        attackType: (row.monster_attack_type as CharacterType) || prev.attackType,
      }));
      
      // 기본 공격 적용 (데이터셋의 range/width 파라미터 사용)
      if (row.monster_basic_attack_id) {
        const basicAttackId = row.monster_basic_attack_id as string;
        const basicAttackSkill = skillConfigs[basicAttackId];
        if (basicAttackSkill && basicAttackSkill.category === 'basicAttack') {
          const range = row.monster_basic_attack_range as number;
          const width = row.monster_basic_attack_width as number;
          const damage = row.monster_basic_attack_damage as number;
          const cooldown = row.monster_basic_attack_cooldown as number;
          const spCost = row.monster_basic_attack_sp_cost as number;
          const castTime = row.monster_basic_attack_cast_time as number;
          
          setMonsterBasicAttack({
            skill: basicAttackSkill,
            keyBinding: 'auto',
            range: range !== undefined ? range : basicAttackSkill.range,
            width: width !== undefined ? width : basicAttackSkill.area,
            damage: damage !== undefined ? damage : basicAttackSkill.damageMultiplier,
            cooldown: cooldown !== undefined ? cooldown : basicAttackSkill.cooldown,
            spCost: spCost !== undefined ? spCost : basicAttackSkill.spCost,
            castTime: castTime !== undefined ? castTime : basicAttackSkill.castTime,
          });
        }
      }
    }
  }, [skillConfigs]);

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

  const menuItems = [
    { id: 'simulator' as View, label: '시뮬레이터', icon: Gamepad2 },
    { 
      id: null, 
      label: '시뮬레이터 설정', 
      icon: Settings,
      hasSubmenu: true,
      submenu: [
        { id: 'settings-level' as View, label: '레벨링 시스템 설정', icon: TrendingUp },
        { id: 'settings-skills' as View, label: '기본공격&스킬 설정', icon: Zap },
        { id: 'settings-graphics' as View, label: '그래픽 연출 효과', icon: Sparkles },
        { id: 'settings-player' as View, label: '캐릭터 설정', icon: User },
        { id: 'settings-monster' as View, label: '몬스터 설정', icon: Skull },
        { id: 'settings-items' as View, label: '아이템 설정', icon: Package },
        { id: 'settings-keys' as View, label: '키 설정', icon: Keyboard },
      ]
    },
    { id: 'export' as View, label: '데이터 내보내기', icon: FileDown },
    { id: 'make' as View, label: 'Make 설정', icon: Workflow },
  ];

  return (
    <>
      <Toaster position="top-right" />
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100">
          {/* Left Sidebar */}
          <Sidebar>
            <SidebarHeader className="border-b border-sidebar-border p-4">
              <div className="space-y-1">
                <h2 className="text-slate-900">게임 시뮬레이터</h2>
                <p className="text-sm text-slate-600">
                  스프레드시트 워크플로우
                </p>
              </div>
            </SidebarHeader>
            
            <SidebarContent className="overflow-visible">
              <SidebarGroup>
                <SidebarGroupLabel>메뉴</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {menuItems.map((item, index) => (
                      <SidebarMenuItem key={item.id || `menu-${index}`}>
                        {item.hasSubmenu ? (
                          // Menu with submenu - hover dropdown
                          <div className="group relative">
                            <SidebarMenuButton
                              isActive={currentView.startsWith('settings-')}
                              tooltip={item.label}
                              className="cursor-default"
                            >
                              <item.icon className="h-4 w-4" />
                              <span>{item.label}</span>
                              <ChevronRight className="ml-auto h-3 w-3 transition-transform group-hover:rotate-90" />
                            </SidebarMenuButton>
                            
                            {/* Submenu - shows on hover */}
                            <div className="absolute left-full top-0 ml-2 hidden w-60 rounded-lg border border-slate-200 bg-white shadow-xl group-hover:block z-[100]">
                              <div className="p-1.5">
                                {item.submenu?.map((subItem) => (
                                  <button
                                    key={subItem.id}
                                    onClick={() => setCurrentView(subItem.id)}
                                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all hover:bg-slate-100 ${
                                      currentView === subItem.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                                    }`}
                                  >
                                    <span className="flex-1">{subItem.label}</span>
                                    <subItem.icon className="h-4 w-4 flex-shrink-0" />
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
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        )}
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border p-4">
              <p className="text-xs text-slate-500">
                데이터셋 + 시각화 + 동기화
              </p>
            </SidebarFooter>
          </Sidebar>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="container max-w-screen-2xl mx-auto p-6 lg:p-8">
              {/* Simulator View (통합: 1:1 / 1:다) */}
              {currentView === 'simulator' && (
                <div className="space-y-8">
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
                    title="시뮬레이터"
                    selectedMonsterRows={selectedMonsterRows}
                    monsterDataset={monsterDataset}
                  />

                  {/* Datasets (Vertical) */}
                  <div className="space-y-6">
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
              {currentView === 'settings-keys' && (
                <div className="max-w-4xl mx-auto">
                  <KeyBindingSettings
                    bindings={keyBindings}
                    onBindingsChange={setKeyBindings}
                  />
                </div>
              )}

              {/* Character Settings View */}
              {currentView === 'settings-player' && (
                <div className="max-w-5xl mx-auto">
                  <CharacterTypeManager
                    characterTypes={characterTypes}
                    onCharacterTypesChange={setCharacterTypes}
                  />
                </div>
              )}

              {/* Monster Type Definition View */}
              {currentView === 'settings-monster' && (
                <div className="max-w-4xl mx-auto">
                  <MonsterTypeDefinition
                    monsterTypeStats={monsterTypeStats}
                    onMonsterTypeStatsChange={setMonsterTypeStats}
                    characterTypes={characterTypes}
                  />
                </div>
              )}

              {/* Level/Experience System View */}
              {currentView === 'settings-level' && (
                <div className="max-w-6xl mx-auto">
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
              {currentView === 'settings-skills' && (
                <div className="h-[calc(100vh-8rem)] px-6">
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
              {currentView === 'settings-graphics' && (
                <div className="max-w-5xl mx-auto">
                  <GraphicsEffectEditorNew
                    showPreview={true}
                    onPresetSelect={(preset) => {
                      console.log('프리셋 선택됨:', preset);
                      toast.success(`✨ "${preset.name}" 프리셋이 선택되었습니다!`);
                      // 여기에서 선택된 프리셋을 스킬 설정에 적용할 수 있습니다
                    }}
                  />
                </div>
              )}

              {/* Items System View */}
              {currentView === 'settings-items' && (
                <div className="max-w-4xl mx-auto">
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
              {currentView === 'export' && (
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
              {currentView === 'make' && (
                <div className="max-w-7xl mx-auto">
                  <MakeConfigGuide />
                </div>
              )}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </>
  );
}