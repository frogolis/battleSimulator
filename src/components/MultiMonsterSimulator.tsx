import {
  useRef,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  Maximize2,
  Minimize2,
  Swords,
  Package,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { toast } from "sonner";
import { KeyBindings } from "./KeyBindingSettings";
import { CharacterConfig } from "./CharacterSettings";
import {
  CharacterStats,
  MonsterStats,
  defaultPlayerStats,
  defaultMonsterStats,
  calculateDamage,
  checkCollision,
} from "../lib/gameData";
import {
  calculateCritical,
} from "../lib/combatSystem";
import {
  LevelConfig,
  addExperience,
  calculateLevelStats,
  calculateExpReward,
  getLevelProgress,
} from "../lib/levelSystem";
import {
  SkillSlot,
  SPConfig,
  defaultSPConfig,
  updateSkillCooldown,
  canUseSkill,
  useSkill,
  regenerateSP,
  consumeSP,
  Skill,
  calculateSkillDamage,
  BasicAttackSlot,
  getDefaultBasicAttackSlot,
} from "../lib/skillSystem";
import {
  ItemSlot,
  updateItemCooldown,
  canUseItem,
  useItem,
  ActiveBuff,
  updateBuffs,
  applyBuffsToStats,
} from "../lib/itemSystem";
import {
  resolveCharacterConfigMid,
  getMidInRange,
} from "../lib/configUtils";
import {
  loadPlayerSkills,
  loadMonsterSkills,
  loadMonsterAI,
  loadMonsterAIPattern,
  loadMonsterBasicAttack,
  updateSkillCooldowns,
  CharacterSkills,
} from "../lib/combatSystem";
import {
  AIConfig,
  AIPatternConfig,
  defaultAIPatternConfig,
} from "../lib/monsterAI";
import {
  drawPlayerAttackRange,
  drawMonsterAttackRange,
  drawAttackRangeIndicator,
} from "../lib/gameRenderer";
import {
  createSkillParticles,
  createSkillEffectParticles,
  updateParticles,
  renderParticles,
  ParticleUpdateStrategy,
  createEffect,
  updateNewParticles,
  renderNewParticles,
} from "../lib/simulator/particles";
import {
  checkMonsterParticleCollision,
  checkPlayerParticleCollision,
} from "../lib/simulator/gameLoop";
import { defaultSkills, EFFECT_PRESETS } from "../lib/skillSystem";

interface Position {
  x: number;
  y: number;
}

interface DamageText {
  id: number;
  x: number;
  y: number;
  damage: number;
  isCritical: boolean;
  skillName?: string;
  lifetime: number; // 현재 수명 (ms)
  maxLifetime: number; // 최대 수명 (ms)
}

interface CharacterState {
  position: Position;
  stats: CharacterStats;
  isAttacking: boolean;
  isSkilling: boolean;
  attackCooldown: number;
  meleeSwingStart: number | null;
  meleeSwingAngle: number;
  meleeSwingHit: Set<number>;
  skillSwingStart: number | null;
  skillSwingAngle: number;
  skillSwingHit: Set<number>;
  activeSkillType: "powerSlash" | "whirlwind" | null;
  activeSkillDamageMultiplier: number;
  playerScale: number;
  shakeOffset: Position;
  skills: CharacterSkills; // 플레이어 스킬 슬롯
  basicAttack: BasicAttackSlot | null; // 기본 공격
}

interface MonsterState {
  id: number;
  position: Position;
  stats: MonsterStats;
  isAttacking: boolean;
  attackCooldown: number;
  isDead: boolean;
  aiState: "CHASE" | "ATTACK" | "RETREAT"; // 단순화된 AI 상태
  wanderTarget: Position | null; // 레거시 호환용 (사용 안 함)
  wanderCooldown: number; // 레거시 호환용 (사용 안 함)
  detectionRange: number; // 레거시 호환용 (항상 9999)
  respawnTimer: number;
  velocity: Position; // For knockback effects
  knockbackTime: number; // Timestamp when knockback was applied
  name: string; // 몬스터 이름
  color: string; // 몬스터 색상
  skills: CharacterSkills; // 몬스터 스킬 슬롯
  basicAttack: BasicAttackSlot | null; // 기본 공격
  aiConfig: AIConfig; // AI 설정 (레거시 호환용)
  aiPatternConfig: AIPatternConfig; // AI 패턴 설정 (레거시 호환용)
  sp: number; // SP (스킬 포인트)
  maxSP: number; // 최대 SP
  currentSkill: number | null; // 현재 사용 중인 스킬 슬롯
}

interface Projectile {
  id: number;
  position: Position;
  velocity: Position;
  damage: number;
  owner: "player" | "monster";
  size: number;
  startPosition: Position;
  travelDistance: number;
  monsterId?: number;
  targetId?: number; // For homing projectiles
  isHoming?: boolean; // Whether this projectile should home in on target
}

interface SkillParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  skillType?: string; // 스킬 타입 저장 (glowIntensity 등을 위해)
}

interface MultiMonsterSimulatorProps {
  keyBindings: KeyBindings;
  playerConfig: CharacterConfig;
  monsterConfig: CharacterConfig;
  currentTick: number;
  currentDataRow: number;
  enableRespawn?: boolean; // 리스폰 기능 활성화 여부 (기본값: true)
  initialMonsterCount?: number; // 초기 몬스터 수 (기본값: 3)
  maxMonsterCount?: number; // 최대 몬스터 수 (리스폰 제한용, 기본값: initialMonsterCount와 동일)
  respawnDelay?: number; // 리스폰 딜레이 (ms, 기본값: 2000)
  showRespawnControls?: boolean; // 리스폰 컨트롤 UI 표시 여부 (기본값: true)
  title?: string; // 카드 제목 (기본값: '1:다 시뮬레이터')
  playerLevelConfig?: LevelConfig;
  monsterLevelConfig?: LevelConfig;
  skillSlots?: SkillSlot[];
  skillConfigs?: Record<string, Skill>; // 실제 스킬 설정
  itemSlots?: ItemSlot[];
  homingProjectiles?: boolean; // 유도 미사일 활성화 여부 (기본값: false)
  playerBasicAttack?: BasicAttackSlot; // 플레이어 기본 공격
  monsterBasicAttack?: BasicAttackSlot; // 몬스터 기본 공격
  canvasWidth?: number; // 캔버스 너비 (기본값: 1200)
  canvasHeight?: number; // 캔버스 높이 (기본값: 700)
  testMode?: boolean; // 테스트 모드 (HUD/컨트롤 UI 숨김, 기본값: false)
  initialZoom?: number; // 초기 확대/축소 비율 (testMode에서만 사용, 기본값: 3.0)
  onZoomChange?: (zoom: number) => void; // 확대/축소 변경 콜백
  selectedMonsterRows?: Set<number>; // 선택된 몬스터 행 (가중치 기반 스폰용)
  monsterDataset?: any[]; // 몬스터 데이터셋 (가중치 기반 스폰용)
}
const ATTACK_COOLDOWN = 1000;
const PROJECTILE_SPEED = 300;
const PROJECTILE_SIZE = 8;
const PROJECTILE_MAX_DISTANCE = 400;
const PROJECTILE_FADE_START = 300;
const MELEE_SWING_DURATION = 250;
// MELEE_SWING_ARC is now calculated from attackWidth dynamically
const MONSTER_DETECTION_RANGE = 200;
const MONSTER_RETREAT_HP_PERCENT = 0.3;
const MONSTER_WANDER_SPEED = 0.3;

export function MultiMonsterSimulator({
  keyBindings,
  playerConfig,
  monsterConfig,
  currentTick,
  currentDataRow,
  enableRespawn = true,
  initialMonsterCount = 3,
  maxMonsterCount,
  respawnDelay: propRespawnDelay = 2000,
  showRespawnControls = true,
  title = "1:다 시뮬레이터",
  playerLevelConfig,
  monsterLevelConfig,
  skillSlots = [],
  skillConfigs,
  itemSlots = [],
  homingProjectiles = false,
  playerBasicAttack,
  monsterBasicAttack,
  canvasWidth = 1200,
  canvasHeight = 700,
  testMode = false,
  initialZoom = 3.0,
  onZoomChange,
  selectedMonsterRows = new Set(),
  monsterDataset = [],
}: MultiMonsterSimulatorProps) {
  // maxMonsterCount가 지정되지 않으면 initialMonsterCount와 동일하게 설정
  const effectiveMaxMonsterCount =
    maxMonsterCount ?? initialMonsterCount;

  // 캔버스 크기
  const CANVAS_WIDTH = canvasWidth;
  const CANVAS_HEIGHT = canvasHeight;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showAttackRange, setShowAttackRange] = useState(true);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<number>(
    Date.now(),
  );
  const [survivalTime, setSurvivalTime] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fps, setFps] = useState<number>(60);
  const [playerHp, setPlayerHp] = useState<{
    current: number;
    max: number;
  }>({
    current: defaultPlayerStats.hp,
    max: defaultPlayerStats.maxHp,
  });
  const [monsterCount, setMonsterCount] = useState<number>(
    initialMonsterCount,
  );
  const [killCount, setKillCount] = useState<number>(0);

  // Zoom state (for testMode)
  const [zoom, setZoom] = useState<number>(initialZoom);

  // Sync zoom changes to parent
  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
    onZoomChange?.(newZoom);
  };

  // Simulator mode state (1:1 vs 1:다)
  const [simulatorMode, setSimulatorMode] = useState<
    "1v1" | "1vMany"
  >("1vMany");

  // 가중치 기반으로 몬스터를 선택하는 함수
  const selectMonsterByWeight = useCallback(() => {
    // 선택된 행이 없으면 null 반환
    if (selectedMonsterRows.size === 0 || monsterDataset.length === 0) {
      return null;
    }

    // 선택된 몬스터들만 필터링
    const selectedMonsters = Array.from(selectedMonsterRows)
      .map(idx => monsterDataset[idx])
      .filter(row => row !== undefined);

    if (selectedMonsters.length === 0) {
      return null;
    }

    // 총 가중치 계산
    const totalWeight = selectedMonsters.reduce(
      (sum, row) => sum + (row.monster_spawn_weight || 1),
      0
    );

    // 랜덤 값 생성
    let random = Math.random() * totalWeight;

    // 가중치에 따라 몬스터 선택
    for (const row of selectedMonsters) {
      const weight = row.monster_spawn_weight || 1;
      random -= weight;
      if (random <= 0) {
        return row;
      }
    }

    // 안전장치: 마지막 몬스터 반환
    return selectedMonsters[selectedMonsters.length - 1];
  }, [selectedMonsterRows, monsterDataset]);



  // testMode에서는 자동으로 몬스터 초기화 및 게임 시작
  // (단, 데이터 변경 시에는 재초기화하지 않음)

  // Level & RPG system state
  const [currentPlayerLevel, setCurrentPlayerLevel] =
    useState<LevelConfig>(
      playerLevelConfig || {
        currentLevel: 1,
        currentExp: 0,
        expToNextLevel: 100,
        hpPerLevel: 20,
        spPerLevel: 10,
        attackPerLevel: 5,
        defensePerLevel: 3,
        speedPerLevel: 2,
        baseHp: 100,
        baseSp: 100,
        baseAttack: 50,
        baseDefense: 20,
        baseSpeed: 150,
        hpGrowth: { a: 0, b: 20 },
        spGrowth: { a: 0, b: 10 },
        attackGrowth: { a: 0, b: 5 },
        defenseGrowth: { a: 0, b: 3 },
        speedGrowth: { a: 0, b: 2 },
        expGrowth: { type: 'exponential', a: 100, b: 1.5 },
      },
    );
  const [currentMonsterLevel, setCurrentMonsterLevel] =
    useState<LevelConfig>(
      monsterLevelConfig || {
        currentLevel: 1,
        currentExp: 0,
        expToNextLevel: 100,
        hpPerLevel: 15,
        spPerLevel: 8,
        attackPerLevel: 4,
        defensePerLevel: 2,
        speedPerLevel: 1,
        baseHp: 80,
        baseSp: 80,
        baseAttack: 40,
        baseDefense: 15,
        baseSpeed: 60,
        hpGrowth: { a: 0, b: 15 },
        spGrowth: { a: 0, b: 8 },
        attackGrowth: { a: 0, b: 4 },
        defenseGrowth: { a: 0, b: 2 },
        speedGrowth: { a: 0, b: 1 },
        expGrowth: { type: 'exponential', a: 100, b: 1.5 },
      },
    );
  const [spConfig, setSPConfig] =
    useState<SPConfig>(defaultSPConfig);
  const [activeSkills, setActiveSkills] =
    useState<SkillSlot[]>(skillSlots);
  const [activeItems, setActiveItems] =
    useState<ItemSlot[]>(itemSlots);
  const [activeBuffs, setActiveBuffs] = useState<ActiveBuff[]>(
    [],
  );
  const [healEffectTime, setHealEffectTime] =
    useState<number>(0);
  const [healEffectColor, setHealEffectColor] =
    useState<string>("#10b981");

  // Game state refs
  const playerRef = useRef<CharacterState>({
    position: testMode ? { x: 0, y: 0 } : { x: canvasWidth / 2, y: canvasHeight / 2 },
    stats: { ...defaultPlayerStats },
    isAttacking: false,
    isSkilling: false,
    attackCooldown: 0,
    meleeSwingStart: null,
    meleeSwingAngle: 0,
    meleeSwingHit: new Set(),
    skillSwingStart: null,
    skillSwingAngle: 0,
    skillSwingHit: new Set(),
    activeSkillType: null,
    activeSkillDamageMultiplier: 1.0,
    playerScale: 1,
    shakeOffset: { x: 0, y: 0 },
    skills: { slot1: null, slot2: null, slot3: null, slot4: null },
    basicAttack: playerBasicAttack ? { ...playerBasicAttack } : null,
    skillPhase: 'idle' as const,
    skillPhaseStartTime: 0,
    currentSkillTiming: undefined,
  });

  const monstersRef = useRef<MonsterState[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const projectileIdRef = useRef<number>(0);
  const monsterIdRef = useRef<number>(0);
  const skillParticlesRef = useRef<SkillParticle[]>([]);
  const particleIdRef = useRef<number>(0);
  const damageTextsRef = useRef<DamageText[]>([]);
  const damageTextIdRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const mousePositionRef = useRef<Position>({ x: 0, y: 0 });
  const isGameOverRef = useRef<boolean>(false);
  const gameStartTimeRef = useRef<number>(Date.now());
  const playerConfigRef = useRef<CharacterConfig>(playerConfig);
  const monsterConfigRef =
    useRef<CharacterConfig>(monsterConfig);
  const activeSkillsRef = useRef<SkillSlot[]>(skillSlots);
  const activeItemsRef = useRef<ItemSlot[]>(itemSlots);
  const playerBasicAttackRef = useRef<BasicAttackSlot | undefined>(playerBasicAttack);
  const monsterBasicAttackRef = useRef<BasicAttackSlot | undefined>(monsterBasicAttack);

  useEffect(() => {
    playerConfigRef.current = playerConfig;
  }, [playerConfig]);

  useEffect(() => {
    monsterConfigRef.current = monsterConfig;
  }, [monsterConfig]);

  // Update player level when playerLevelConfig changes
  useEffect(() => {
    if (playerLevelConfig) {
      setCurrentPlayerLevel(playerLevelConfig);
    }
  }, [playerLevelConfig]);

  // Update monster level when monsterLevelConfig changes
  useEffect(() => {
    if (monsterLevelConfig) {
      setCurrentMonsterLevel(monsterLevelConfig);
    }
  }, [monsterLevelConfig]);

  // Update player stats when level changes
  useEffect(() => {
    const levelStats = calculateLevelStats(currentPlayerLevel);
    
    if (isGameStarted && !isGameOver) {
      // 게임 진행 중: HP/SP 비율 유지하면서 스탯 업데이트
      const currentHpRatio = playerRef.current.stats.hp / playerRef.current.stats.maxHp;
      const currentSp = spConfig.current;
      const currentMaxSp = spConfig.max;
      const currentSpRatio = currentMaxSp > 0 ? currentSp / currentMaxSp : 1;
      
      playerRef.current.stats = {
        ...playerRef.current.stats,
        hp: Math.min(levelStats.hp, playerRef.current.stats.hp), // Don't heal, just cap at new max
        maxHp: levelStats.hp,
        attack: levelStats.attack,
        defense: levelStats.defense,
        speed: levelStats.speed,
      };
      
      // Update SP config
      setSPConfig(prev => ({
        ...prev,
        current: Math.min(levelStats.sp, prev.current + (levelStats.sp - prev.max)), // Add difference to current SP
        max: levelStats.sp,
      }));
      
      // Update displayed HP
      setPlayerHp({
        current: playerRef.current.stats.hp,
        max: playerRef.current.stats.maxHp,
      });
    } else if (!isGameStarted) {
      // 게임 시작 전: HP/SP를 max 값으로 설정
      playerRef.current.stats = {
        ...playerRef.current.stats,
        hp: levelStats.hp,
        maxHp: levelStats.hp,
        attack: levelStats.attack,
        defense: levelStats.defense,
        speed: levelStats.speed,
      };
      
      // Update displayed HP to max
      setPlayerHp({
        current: levelStats.hp,
        max: levelStats.hp,
      });
      
      // Update SP config to max
      setSPConfig({
        ...defaultSPConfig,
        current: levelStats.sp,
        max: levelStats.sp,
      });
    }
  }, [currentPlayerLevel, isGameStarted, isGameOver]);

  // Update monster stats when level changes
  useEffect(() => {
    if (isGameStarted && !isGameOver) {
      const monsterLevelStats = calculateLevelStats(currentMonsterLevel);
      
      // Update all monsters' stats while preserving current HP ratio
      monstersRef.current.forEach((monster) => {
        if (!monster.isDead) {
          const currentHpRatio = monster.stats.hp / monster.stats.maxHp;
          
          monster.stats = {
            ...monster.stats,
            hp: Math.min(monsterLevelStats.hp, monster.stats.hp), // Don't heal, just cap at new max
            maxHp: monsterLevelStats.hp,
            attack: monsterLevelStats.attack,
            defense: monsterLevelStats.defense,
            speed: monsterLevelStats.speed,
          };
          
          // Update monster SP
          monster.maxSP = monsterLevelStats.sp;
          monster.sp = Math.min(monsterLevelStats.sp, monster.sp);
        }
      });
    }
    // 게임 시작 전 데이터셋 변경 시에는 initializeMonsters가 호출될 때 자동으로 max 값으로 설정됨
  }, [currentMonsterLevel, isGameStarted, isGameOver]);

  useEffect(() => {
    playerBasicAttackRef.current = playerBasicAttack;
    
    // playerRef의 basicAttack 초기화 또는 업데이트
    if (playerBasicAttack) {
      // basicAttack을 완전히 교체 (스킬 정보 포함)
      playerRef.current.basicAttack = { ...playerBasicAttack };
    }
  }, [playerBasicAttack]);

  useEffect(() => {
    monsterBasicAttackRef.current = monsterBasicAttack;
    
    // 기존 몬스터들의 basicAttack 완전히 교체 (스킬 정보 포함)
    if (monsterBasicAttack) {
      monstersRef.current.forEach((monster) => {
        monster.basicAttack = { ...monsterBasicAttack };
      });
    }
  }, [monsterBasicAttack]);

  // Update active skills when skillSlots prop changes
  useEffect(() => {
    setActiveSkills(skillSlots);
    activeSkillsRef.current = skillSlots;
  }, [skillSlots]);

  // Update activeSkillsRef when activeSkills state changes
  useEffect(() => {
    activeSkillsRef.current = activeSkills;
  }, [activeSkills]);

  // Update activeItemsRef when activeItems state changes
  useEffect(() => {
    activeItemsRef.current = activeItems;
  }, [activeItems]);

  // Update active items when itemSlots prop changes
  useEffect(() => {
    setActiveItems(itemSlots);
  }, [itemSlots]);

  // Initialize monsters (게임 시작/재시작 시에만 호출)
  const initializeMonsters = useCallback(() => {
    const monsters: MonsterState[] = [];
    // 1:1 모드일 때는 무조건 1개, 1:다 모드일 때는 monsterCount 사용
    const actualMonsterCount = simulatorMode === "1v1" ? 1 : monsterCount;
    for (let i = 0; i < actualMonsterCount; i++) {
      // 선택된 몬스터가 있으면 가중치 기반으로 선택, 없으면 currentDataRow의 스냅샷 사용
      const selectedMonster = selectMonsterByWeight();
      const monsterData = selectedMonster || currentDataRow;

      // 몬스터 데이터에서 이름과 색상 가져오기
      const monsterName =
        monsterData?.monster_name || `몬스터 ${i + 1}`;
      const monsterColor =
        monsterData?.monster_color || "#ff6b6b";

      // AI 패턴 로드
      const aiPatternConfig = monsterData
        ? loadMonsterAIPattern(monsterData)
        : defaultAIPatternConfig;
      const aiConfig = monsterData
        ? loadMonsterAI(monsterData)
        : {
            type: "aggressive" as const,
            aggroRange: 300,
            skillPriority: "damage" as const,
          };

      // 스킬 로드
      const monsterSkills = monsterData
        ? loadMonsterSkills(monsterData)
        : {
            slot1: null,
            slot2: null,
            slot3: null,
            slot4: null,
          };

      // 기본 공격 로드
      const monsterBasicAttackData = monsterData
        ? loadMonsterBasicAttack(monsterData)
        : null;

      const monsterBasicAttackSlot = monsterBasicAttackData
        ? {
            skill: skillConfigs?.[monsterBasicAttackData.id] || {
              id: monsterBasicAttackData.id,
              name: '기본 공격',
              category: 'basicAttack' as const,
              range: monsterBasicAttackData.range,
              area: monsterBasicAttackData.width,
              damageMultiplier: monsterBasicAttackData.damage,
              cooldown: monsterBasicAttackData.cooldown,
              spCost: monsterBasicAttackData.spCost,
              castTime: monsterBasicAttackData.castTime,
              visual: {
                effectShape: 'cone' as const,
                color: '#ef4444',
                secondaryColor: '#f87171',
                particleCount: 0,
                particleSize: 4,
                particleLifetime: 300,
              },
              animation: {
                castAnimation: 'none' as const,
                castScale: 1,
                cameraShake: 0,
              },
            },
            range: monsterBasicAttackData.range,
            width: monsterBasicAttackData.width,
            damage: monsterBasicAttackData.damage,
            cooldown: monsterBasicAttackData.cooldown,
            spCost: monsterBasicAttackData.spCost,
            castTime: monsterBasicAttackData.castTime,
          }
        : null;

      // 몬스터 레벨에 따른 스탯 계산
      const monsterLevelStats = calculateLevelStats(currentMonsterLevel);
      const monsterStats: MonsterStats = {
        hp: monsterLevelStats.hp,
        maxHp: monsterLevelStats.hp,
        attack: monsterLevelStats.attack,
        defense: monsterLevelStats.defense,
        speed: monsterLevelStats.speed,
        attackRange: defaultMonsterStats.attackRange,
        attackWidth: defaultMonsterStats.attackWidth,
        critRate: defaultMonsterStats.critRate || 0.05,
        critDamage: defaultMonsterStats.critDamage || 1.3,
        accuracy: defaultMonsterStats.accuracy || 0.85,
        evasion: defaultMonsterStats.evasion || 0.03,
      };

      monsters.push({
        id: monsterIdRef.current++,
        position: {
          x: Math.random() * (CANVAS_WIDTH - 100) + 50,
          y: Math.random() * (CANVAS_HEIGHT - 100) + 50,
        },
        stats: monsterStats,
        isAttacking: false,
        attackCooldown: 0,
        isDead: false,
        aiState: "CHASE", // 초기 상태는 추적
        wanderTarget: null,
        wanderCooldown: 0,
        detectionRange: 9999, // 무제한 감지 범위
        respawnTimer: 0,
        velocity: { x: 0, y: 0 },
        knockbackTime: 0,
        name: monsterName,
        color: monsterColor,
        skills: monsterSkills,
        basicAttack: monsterBasicAttackSlot,
        aiConfig: aiConfig,
        aiPatternConfig: aiPatternConfig,
        sp: monsterData?.monster_sp || 100,
        maxSP: monsterData?.monster_sp || 100,
        currentSkill: null,
        skillPhase: 'idle' as const,
        skillPhaseStartTime: 0,
        currentSkillTiming: undefined,
      });
    }
    monstersRef.current = monsters;
  }, [monsterCount, selectMonsterByWeight, skillConfigs, simulatorMode]);

  // 게임 시작/재시작 시에만 몬스터 초기화 (값 변경 시에는 초기화하지 않음)
  // initializeMonsters는 startGame과 restartGame에서만 호출됨

  const startGame = useCallback(() => {
    // 레벨에 따른 플레이어 스탯 계산 및 적용
    const levelStats = calculateLevelStats(currentPlayerLevel);
    const playerStats: CharacterStats = {
      hp: levelStats.hp,
      maxHp: levelStats.hp,
      attack: levelStats.attack,
      defense: levelStats.defense,
      speed: levelStats.speed,
      attackRange: defaultPlayerStats.attackRange,
      attackWidth: defaultPlayerStats.attackWidth,
      critRate: defaultPlayerStats.critRate || 0.1,
      critDamage: defaultPlayerStats.critDamage || 1.5,
      accuracy: defaultPlayerStats.accuracy || 0.9,
      evasion: defaultPlayerStats.evasion || 0.05,
    };
    
    playerRef.current = {
      position: testMode ? { x: 0, y: 0 } : { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
      stats: playerStats,
      isAttacking: false,
      isSkilling: false,
      attackCooldown: 0,
      meleeSwingStart: null,
      meleeSwingAngle: 0,
      meleeSwingHit: new Set(),
      skillSwingStart: null,
      skillSwingAngle: 0,
      skillSwingHit: new Set(),
      activeSkillType: null,
      activeSkillDamageMultiplier: 1.0,
      playerScale: 1,
      shakeOffset: { x: 0, y: 0 },
      skills: { slot1: null, slot2: null, slot3: null, slot4: null },
      basicAttack: playerBasicAttackRef.current || null,
      skillPhase: 'idle' as const,
      skillPhaseStartTime: 0,
      currentSkillTiming: undefined,
    };
    
    // HP 업데이트
    setPlayerHp({
      current: levelStats.hp,
      max: levelStats.hp,
    });
    
    // SP 업데이트
    setSPConfig({
      ...defaultSPConfig,
      current: levelStats.sp,
      max: levelStats.sp,
    });
    
    initializeMonsters(); // 게임 시작 시 몬스터 초기화
    setIsGameStarted(true);
    gameStartTimeRef.current = Date.now();
    setGameStartTime(Date.now());
    if (!testMode) {
      toast.success("게임 시작!");
    }
  }, [testMode, initializeMonsters, currentPlayerLevel]);

  // Auto-start game in test mode
  useEffect(() => {
    if (testMode && !isGameStarted) {
      startGame();
    }
  }, [testMode, isGameStarted, startGame]);

  const restartGame = useCallback(() => {
    // 레벨에 따른 스탯 계산
    const levelStats = calculateLevelStats(currentPlayerLevel);
    const playerStats: CharacterStats = {
      hp: levelStats.hp,
      maxHp: levelStats.hp,
      attack: levelStats.attack,
      defense: levelStats.defense,
      speed: levelStats.speed,
      attackRange: defaultPlayerStats.attackRange,
      attackWidth: defaultPlayerStats.attackWidth,
      critRate: defaultPlayerStats.critRate || 0.1,
      critDamage: defaultPlayerStats.critDamage || 1.5,
      accuracy: defaultPlayerStats.accuracy || 0.9,
      evasion: defaultPlayerStats.evasion || 0.05,
    };
    
    playerRef.current = {
      position: testMode ? { x: 0, y: 0 } : { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
      stats: playerStats,
      isAttacking: false,
      isSkilling: false,
      attackCooldown: 0,
      meleeSwingStart: null,
      meleeSwingAngle: 0,
      meleeSwingHit: new Set(),
      skillSwingStart: null,
      skillSwingAngle: 0,
      skillSwingHit: new Set(),
      activeSkillType: null,
      activeSkillDamageMultiplier: 1.0,
      playerScale: 1,
      shakeOffset: { x: 0, y: 0 },
      skills: { slot1: null, slot2: null, slot3: null, slot4: null },
      basicAttack: playerBasicAttackRef.current || null, // 현재 basicAttack 값 사용
      skillPhase: 'idle' as const,
      skillPhaseStartTime: 0,
      currentSkillTiming: undefined,
    };
    initializeMonsters();
    projectilesRef.current = [];
    setIsGameOver(false);
    setIsGameStarted(true);
    isGameOverRef.current = false;
    gameStartTimeRef.current = Date.now();
    setGameStartTime(Date.now());
    setKillCount(0);
    setPlayerHp({
      current: levelStats.hp,
      max: levelStats.hp,
    });
    setSPConfig({
      ...defaultSPConfig,
      current: levelStats.sp,
      max: levelStats.sp,
    });
    setActiveBuffs([]);
    setActiveSkills(
      skillSlots.map((s) => ({
        ...s,
        skill: s.skill
          ? {
              ...s.skill,
              currentCooldown: 0,
              isOnCooldown: false,
            }
          : null,
      })),
    );
    setActiveItems(
      itemSlots.map((i) => ({
        ...i,
        item: i.item
          ? {
              ...i.item,
              currentCooldown: 0,
              isOnCooldown: false,
            }
          : null,
      })),
    );
    toast.success("게임 재시작!");
  }, [initializeMonsters, skillSlots, itemSlots, testMode, currentPlayerLevel]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // 레벨 변경을 감지하기 위한 ref
  const prevLevelRef = useRef(currentPlayerLevel.currentLevel);

  // 레벨업 시 플레이어 스탯 업데이트
  useEffect(() => {
    // 레벨이 실제로 변경되었는지 확인
    if (isGameStarted && !isGameOver && prevLevelRef.current !== currentPlayerLevel.currentLevel) {
      prevLevelRef.current = currentPlayerLevel.currentLevel;
      
      const levelStats = calculateLevelStats(currentPlayerLevel);
      
      // 현재 HP 비율 유지
      const currentHpRatio = playerRef.current.stats.hp / playerRef.current.stats.maxHp;
      const newCurrentHp = Math.floor(levelStats.hp * currentHpRatio);
      
      // 스탯 업데이트
      playerRef.current.stats = {
        ...playerRef.current.stats,
        maxHp: levelStats.hp,
        hp: Math.max(1, newCurrentHp), // 최소 1 HP 유지
        attack: levelStats.attack,
        defense: levelStats.defense,
        speed: levelStats.speed,
      };
      
      // UI 업데이트
      setPlayerHp({
        current: playerRef.current.stats.hp,
        max: levelStats.hp,
      });
      
      // SP 업데이트
      setSPConfig(prev => ({
        ...prev,
        maxSP: levelStats.sp,
        currentSP: Math.min(prev.currentSP, levelStats.sp),
      }));
    }
  }, [currentPlayerLevel.currentLevel, isGameStarted, isGameOver]);

  // Keyboard and mouse event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());

      // Skill keys (1-4)
      if (!isGameOverRef.current && isGameStarted) {
        const skillKey = e.key;
        const skillSlot = activeSkills.find(
          (s) => s.skill && s.keyBinding === skillKey,
        );

        if (skillSlot?.skill) {
          // Get the actual skill configuration from skillConfigs
          const skillType = skillSlot.skill.id; // e.g., 'powerSlash', 'whirlwind', etc.
          const actualSkill =
            skillConfigs?.[skillType] || skillSlot.skill;
          const canUse = canUseSkill(
            actualSkill,
            spConfig.current,
          );

          if (canUse.canUse) {
            e.preventDefault();
            // Apply skill effect based on type
            if (actualSkill.type === "heal") {
              // SkillTestCanvas와 동일한 로직 사용 (testMode에서는 SP 소모 안함)
              if (!testMode) {
                setSPConfig((prev) =>
                  consumeSP(prev, actualSkill.spCost),
                );
              }
              setPlayerHp((prev) => ({
                ...prev,
                current: Math.min(
                  prev.max,
                  prev.current + actualSkill.healAmount,
                ),
              }));
              playerRef.current.stats.hp = Math.min(
                playerRef.current.stats.maxHp,
                playerRef.current.stats.hp +
                  actualSkill.healAmount,
              );

              // 시전 애니메이션 (SkillTestCanvas와 동일)
              if (
                actualSkill.animation.castAnimation ===
                  "charge" ||
                actualSkill.animation.castAnimation === "pulse"
              ) {
                playerRef.current.playerScale =
                  actualSkill.animation.castScale;
                setTimeout(() => {
                  playerRef.current.playerScale = 1;
                }, actualSkill.castTime);
              }

              // 파티클 생성 (castTime 후에 실행 - SkillTestCanvas와 동일)
              setTimeout(() => {
                const playerX = playerRef.current.position.x;
                const playerY = playerRef.current.position.y;

                // 새로운 이펙트 시스템 사용
                if (actualSkill.visual.effectType) {
                  const newEffectParticles = createEffect({
                    preset: actualSkill.visual,
                    position: playerRef.current.position,
                    targetPosition: mousePositionRef.current,
                    owner: 'player',
                    damage: 0, // heal 스킬은 데미지 없음
                  });
                  skillParticlesRef.current.push(...newEffectParticles);
                } else {
                  // 레거시 시스템
                  const shape = actualSkill.visual.effectShape;

                  // SkillTestCanvas의 createParticles 로직 그대로 복사
                  for (
                    let i = 0;
                    i < actualSkill.visual.particleCount;
                    i++
                  ) {
                    let angle = 0;
                    let distance = 0;

                    switch (shape) {
                      case "circle":
                        angle = Math.random() * Math.PI * 2;
                        distance =
                          Math.random() * actualSkill.range;
                        break;
                      case "cone":
                        angle =
                          (Math.random() - 0.5) *
                          ((actualSkill.area * Math.PI) / 180);
                        distance =
                          Math.random() * actualSkill.range;
                        break;
                      case "line":
                        angle = 0;
                        distance =
                          Math.random() * actualSkill.range;
                        break;
                      case "ring":
                        angle = Math.random() * Math.PI * 2;
                        distance =
                          actualSkill.range * 0.8 +
                          Math.random() * actualSkill.range * 0.2;
                        break;
                      case "star":
                        const starPoint = Math.floor(
                          Math.random() * 5,
                        );
                        angle =
                          (starPoint * Math.PI * 2) / 5 +
                          (Math.random() - 0.5) * 0.3;
                        distance =
                          Math.random() * actualSkill.range;
                        break;
                    }

                    const speed = 2 + Math.random() * 3;
                    const color =
                      Math.random() > 0.5
                        ? actualSkill.visual.color
                        : actualSkill.visual.secondaryColor;

                    skillParticlesRef.current.push({
                      id: particleIdRef.current++,
                      x:
                        playerX +
                        Math.cos(angle) * distance * 0.3,
                      y:
                        playerY +
                        Math.sin(angle) * distance * 0.3,
                      vx: Math.cos(angle) * speed,
                      vy: Math.sin(angle) * speed,
                      life: actualSkill.visual.particleLifetime,
                      maxLife:
                        actualSkill.visual.particleLifetime,
                      size: actualSkill.visual.particleSize,
                      color: color,
                      skillType: actualSkill.id,
                    });
                  }
                }

                // 화면 흔들림 (SkillTestCanvas와 동일)
                if (actualSkill.animation.cameraShake > 0) {
                  const intensity =
                    actualSkill.animation.cameraShake;
                  let shakeTime = 0;
                  const shakeDuration =
                    actualSkill.animation.impactDuration;

                  const shakeInterval = setInterval(() => {
                    shakeTime += 16;
                    if (shakeTime >= shakeDuration) {
                      playerRef.current.shakeOffset = {
                        x: 0,
                        y: 0,
                      };
                      clearInterval(shakeInterval);
                    } else {
                      playerRef.current.shakeOffset = {
                        x: (Math.random() - 0.5) * intensity,
                        y: (Math.random() - 0.5) * intensity,
                      };
                    }
                  }, 16);
                }
              }, actualSkill.castTime);

              // Trigger heal wave effect
              setHealEffectTime(Date.now());
              setHealEffectColor(actualSkill.visual.color);

              toast.success(
                `${actualSkill.name} 사용! HP ${actualSkill.healAmount} 회복!`,
              );
              setActiveSkills((prev) =>
                prev.map((s) =>
                  s.slotNumber === skillSlot.slotNumber &&
                  s.skill
                    ? { ...s, skill: useSkill(s.skill) }
                    : s,
                ),
              );
            } else if (actualSkill.type === "buff") {
              // SkillTestCanvas와 동일한 로직 사용 (testMode에서는 SP 소모 안함)
              if (!testMode) {
                setSPConfig((prev) =>
                  consumeSP(prev, actualSkill.spCost),
                );
              }
              setActiveBuffs((prev) => [
                ...prev,
                {
                  id: actualSkill.id,
                  name: actualSkill.name,
                  remainingTime: actualSkill.buffDuration,
                  effect: actualSkill.buffEffect,
                },
              ]);

              // 시전 애니메이션 (SkillTestCanvas와 동일)
              if (
                actualSkill.animation.castAnimation ===
                  "charge" ||
                actualSkill.animation.castAnimation === "pulse"
              ) {
                playerRef.current.playerScale =
                  actualSkill.animation.castScale;
                setTimeout(() => {
                  playerRef.current.playerScale = 1;
                }, actualSkill.castTime);
              }

              // 파티클 생성 (castTime 후에 실행 - 버프는 원형이므로 방향 불필요)
              setTimeout(() => {
                const playerX = playerRef.current.position.x;
                const playerY = playerRef.current.position.y;

                // 새로운 이펙트 시스템 사용
                if (actualSkill.visual.effectType) {
                  const newEffectParticles = createEffect({
                    preset: actualSkill.visual,
                    position: playerRef.current.position,
                    targetPosition: mousePositionRef.current,
                    owner: 'player',
                    damage: 0, // buff 스킬은 데미지 없음
                  });
                  skillParticlesRef.current.push(...newEffectParticles);
                } else {
                  // 레거시 시스템
                  const shape = actualSkill.visual.effectShape;

                  // 마우스 방향 계산 (일부 이펙트용)
                  const dx = mousePositionRef.current.x - playerX;
                  const dy = mousePositionRef.current.y - playerY;
                  const baseAngle = Math.atan2(dy, dx);

                  // 방향 기반 파티클 생성
                  for (
                    let i = 0;
                    i < actualSkill.visual.particleCount;
                    i++
                  ) {
                    let angle = 0;
                    let distance = 0;

                    switch (shape) {
                      case "circle":
                        angle = Math.random() * Math.PI * 2;
                        distance =
                          Math.random() * actualSkill.range;
                        break;
                      case "cone":
                        // 마우스 방향을 기준으로 cone 생성
                        angle =
                          baseAngle +
                          (Math.random() - 0.5) *
                            ((actualSkill.area * Math.PI) / 180);
                        distance =
                          Math.random() * actualSkill.range;
                        break;
                      case "line":
                        // 마우스 방향으로 line 생성
                        angle = baseAngle;
                        distance =
                          Math.random() * actualSkill.range;
                        break;
                      case "ring":
                        angle = Math.random() * Math.PI * 2;
                        distance =
                          actualSkill.range * 0.8 +
                          Math.random() * actualSkill.range * 0.2;
                        break;
                      case "star":
                        const starPoint = Math.floor(
                          Math.random() * 5,
                        );
                        angle =
                          baseAngle +
                          (starPoint * Math.PI * 2) / 5 +
                          (Math.random() - 0.5) * 0.3;
                        distance =
                          Math.random() * actualSkill.range;
                        break;
                    }

                    const speed = 2 + Math.random() * 3;
                    const color =
                      Math.random() > 0.5
                        ? actualSkill.visual.color
                        : actualSkill.visual.secondaryColor;

                    skillParticlesRef.current.push({
                      id: particleIdRef.current++,
                      x:
                        playerX +
                        Math.cos(angle) * distance * 0.3,
                      y:
                        playerY +
                        Math.sin(angle) * distance * 0.3,
                      vx: Math.cos(angle) * speed,
                      vy: Math.sin(angle) * speed,
                      life: actualSkill.visual.particleLifetime,
                      maxLife:
                        actualSkill.visual.particleLifetime,
                      size: actualSkill.visual.particleSize,
                      color: color,
                      skillType: actualSkill.id,
                    });
                  }
                }

                // 화면 흔들림 (SkillTestCanvas와 동일)
                if (actualSkill.animation.cameraShake > 0) {
                  const intensity =
                    actualSkill.animation.cameraShake;
                  let shakeTime = 0;
                  const shakeDuration =
                    actualSkill.animation.impactDuration;

                  const shakeInterval = setInterval(() => {
                    shakeTime += 16;
                    if (shakeTime >= shakeDuration) {
                      playerRef.current.shakeOffset = {
                        x: 0,
                        y: 0,
                      };
                      clearInterval(shakeInterval);
                    } else {
                      playerRef.current.shakeOffset = {
                        x: (Math.random() - 0.5) * intensity,
                        y: (Math.random() - 0.5) * intensity,
                      };
                    }
                  }, 16);
                }
              }, actualSkill.castTime);

              toast.success(`${actualSkill.name} 버프 활성화!`);
              setActiveSkills((prev) =>
                prev.map((s) =>
                  s.slotNumber === skillSlot.slotNumber &&
                  s.skill
                    ? { ...s, skill: useSkill(s.skill) }
                    : s,
                ),
              );
            } else if (
              actualSkill.type === "damage" ||
              actualSkill.type === "area"
            ) {
              // 공격 스킬 - SkillTestCanvas와 동일한 로직 사용 (testMode에서는 SP 소모 안함)
              if (!testMode) {
                setSPConfig((prev) =>
                  consumeSP(prev, actualSkill.spCost),
                );
              }
              playerRef.current.isSkilling = true;
              playerRef.current.skillSwingStart = Date.now();
              playerRef.current.skillSwingHit = new Set();
              playerRef.current.activeSkillType =
                actualSkill.id as "powerSlash" | "whirlwind";
              playerRef.current.activeSkillDamageMultiplier =
                actualSkill.damageMultiplier;

              // 시전 애니메이션 (SkillTestCanvas와 동일)
              if (
                actualSkill.animation.castAnimation ===
                  "charge" ||
                actualSkill.animation.castAnimation === "pulse"
              ) {
                playerRef.current.playerScale =
                  actualSkill.animation.castScale;
                setTimeout(() => {
                  playerRef.current.playerScale = 1;
                }, actualSkill.castTime);
              }

              // 파티클 생성 (castTime 후에 실행 - 마우스 방향 반영)
              setTimeout(() => {
                // 새로운 이펙트 시스템 사용
                if (actualSkill.visual.effectType) {
                  const newEffectParticles = createEffect({
                    preset: actualSkill.visual,
                    position: playerRef.current.position,
                    targetPosition: mousePositionRef.current,
                    owner: 'player',
                    damage: calculateSkillDamage(actualSkill, playerRef.current.stats),
                    skillName: actualSkill.name,
                  });
                  skillParticlesRef.current.push(...newEffectParticles);
                } else {
                  // 레거시 시스템 (이펙트 타입이 없는 기존 스킬)
                  const newParticles = createSkillEffectParticles(
                    {
                      position: playerRef.current.position,
                      targetPosition: mousePositionRef.current,
                      skill: actualSkill,
                      strategy: 'projectile',
                    },
                    particleIdRef
                  );
                  skillParticlesRef.current.push(...newParticles);
                }

                // 화면 흔들림 (SkillTestCanvas와 동일)
                if (actualSkill.animation.cameraShake > 0) {
                  const intensity =
                    actualSkill.animation.cameraShake;
                  let shakeTime = 0;
                  const shakeDuration =
                    actualSkill.animation.impactDuration;

                  const shakeInterval = setInterval(() => {
                    shakeTime += 16;
                    if (shakeTime >= shakeDuration) {
                      playerRef.current.shakeOffset = {
                        x: 0,
                        y: 0,
                      };
                      clearInterval(shakeInterval);
                    } else {
                      playerRef.current.shakeOffset = {
                        x: (Math.random() - 0.5) * intensity,
                        y: (Math.random() - 0.5) * intensity,
                      };
                    }
                  }, 16);
                }
              }, actualSkill.castTime);

              toast.success(`${actualSkill.name} 사용!`);
              setActiveSkills((prev) =>
                prev.map((s) =>
                  s.slotNumber === skillSlot.slotNumber &&
                  s.skill
                    ? { ...s, skill: useSkill(s.skill) }
                    : s,
                ),
              );
            }
          } else {
            toast.error(
              canUse.reason || "스킬을 사용할 수 없습니다",
            );
          }
        }

        // Item keys (F1-F4)
        const itemKey = e.key.toUpperCase();
        const itemSlot = activeItems.find(
          (i) => i.item && i.keyBinding === itemKey,
        );

        if (itemSlot?.item) {
          const item = itemSlot.item;
          const canUse = canUseItem(item);

          if (canUse.canUse) {
            e.preventDefault();
            // Apply item effect
            if (item.healAmount > 0) {
              setPlayerHp((prev) => ({
                ...prev,
                current: Math.min(
                  prev.max,
                  prev.current + item.healAmount,
                ),
              }));
              playerRef.current.stats.hp = Math.min(
                playerRef.current.stats.maxHp,
                playerRef.current.stats.hp + item.healAmount,
              );

              // Create heal particles for potion (새 구조)
              const playerX = playerRef.current.position.x;
              const playerY = playerRef.current.position.y;
              for (let i = 0; i < 20; i++) {
                const angle = (Math.PI * 2 * i) / 20;
                const speed = 1 + Math.random() * 1.5;
                skillParticlesRef.current.push({
                  id: particleIdRef.current++,
                  x: playerX,
                  y: playerY,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed - 1,
                  life: 50,
                  maxLife: 50,
                  size: 2 + Math.random() * 3,
                  color: "#ef4444", // red for health potion
                });
              }
              setHealEffectTime(Date.now());
              setHealEffectColor("#ef4444"); // Red for health potion

              toast.success(
                `${item.name} 사용! HP ${item.healAmount} 회복! (남은 개수: ${item.quantity - 1})`,
              );
            }

            if (item.spRestore > 0) {
              setSPConfig((prev) => ({
                ...prev,
                current: Math.min(
                  prev.max,
                  prev.current + item.spRestore,
                ),
              }));

              // Create SP particles (blue) - 새 구조
              const playerX = playerRef.current.position.x;
              const playerY = playerRef.current.position.y;
              for (let i = 0; i < 20; i++) {
                const angle = (Math.PI * 2 * i) / 20;
                const speed = 0.5 + Math.random() * 1;
                skillParticlesRef.current.push({
                  id: particleIdRef.current++,
                  x: playerX,
                  y: playerY - 10,
                  vx: Math.cos(angle) * speed,
                  vy: -2 - Math.random(),
                  life: 45,
                  maxLife: 45,
                  size: 2 + Math.random() * 2,
                  color: "#3b82f6", // blue for mana potion
                });
              }

              toast.success(
                `${item.name} 사용! SP ${item.spRestore} 회복! (남은 개수: ${item.quantity - 1})`,
              );
            }

            if (item.damageAmount > 0) {
              let hitCount = 0;
              monstersRef.current.forEach((monster) => {
                if (!monster.isDead) {
                  const dx =
                    monster.position.x -
                    playerRef.current.position.x;
                  const dy =
                    monster.position.y -
                    playerRef.current.position.y;
                  const distance = Math.sqrt(dx * dx + dy * dy);

                  if (distance <= item.damageRange) {
                    monster.stats.hp -= item.damageAmount;
                    hitCount++;

                    if (monster.stats.hp <= 0) {
                      monster.isDead = true;
                      monster.respawnTimer = enableRespawn
                        ? propRespawnDelay
                        : 0;
                      setKillCount((prev) => prev + 1);

                      if (playerLevelConfig) {
                        const monsterStats =
                          calculateLevelStats(
                            currentMonsterLevel,
                          );
                        const expReward = calculateExpReward(
                          monsterStats.level,
                        );
                        const newLevel = addExperience(
                          currentPlayerLevel,
                          expReward,
                        );
                        if (
                          newLevel.currentLevel >
                          currentPlayerLevel.currentLevel
                        ) {
                          toast.success(
                            `레벨 업! LV.${newLevel.currentLevel}`,
                          );
                        }
                        setCurrentPlayerLevel(newLevel);
                      }
                    }
                  }
                }
              });
              toast.success(
                `${item.name} 사용! ${hitCount}명 명중! (남은 개수: ${item.quantity - 1})`,
              );
            }

            if (
              item.buffDuration > 0 &&
              !item.healAmount &&
              !item.spRestore &&
              !item.damageAmount
            ) {
              setActiveBuffs((prev) => [
                ...prev,
                {
                  id: item.id,
                  name: item.name,
                  remainingTime: item.buffDuration,
                  effect: item.buffEffect,
                },
              ]);
              toast.success(
                `${item.name} 버프 활성화! (남은 개수: ${item.quantity - 1})`,
              );
            }

            setActiveItems((prev) =>
              prev.map((i) =>
                i.slotNumber === itemSlot.slotNumber && i.item
                  ? { ...i, item: useItem(i.item) }
                  : i,
              ),
            );
          } else {
            toast.error(
              canUse.reason || "아이템을 사용할 수 없습니다",
            );
          }
        }
      }

      // Space 키는 testMode가 아닐 때만 기본 공격으로 사용
      if (e.code === "Space" && !testMode) {
        e.preventDefault();
        if (
          playerRef.current.attackCooldown <= 0 &&
          !isGameOverRef.current
        ) {
          playerRef.current.isAttacking = true;
          playerRef.current.attackCooldown = ATTACK_COOLDOWN;

          if (playerConfigRef.current.attackType === "melee") {
            playerRef.current.meleeSwingStart = Date.now();
            playerRef.current.meleeSwingHit = new Set();
          } else {
            const dx =
              mousePositionRef.current.x -
              playerRef.current.position.x;
            const dy =
              mousePositionRef.current.y -
              playerRef.current.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // 플레이어 기본 공격 - 파티클 기반 투사체 (원거리인 경우)
            const basicAttackSkill = playerBasicAttackRef.current;
            if (basicAttackSkill && basicAttackSkill.type === 'ranged' && distance > 0) {
              const damage = calculateSkillDamage(basicAttackSkill, playerRef.current.stats);
              
              // 파티클 기반 투사체 생성
              const newParticles = createSkillParticles(
                {
                  position: playerRef.current.position,
                  targetPosition: mousePositionRef.current,
                  skill: basicAttackSkill,
                  strategy: 'projectile',
                  damage: damage,
                  owner: 'player',
                },
                particleIdRef
              );
              skillParticlesRef.current.push(...newParticles);
            }
          }

          setTimeout(() => {
            playerRef.current.isAttacking = false;
          }, 200);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;

      // Canvas 좌표로 변환
      const canvasX = (e.clientX - rect.left) * scaleX;
      const canvasY = (e.clientY - rect.top) * scaleY;

      // testMode에서는 zoom과 카메라 변환을 고려
      if (testMode) {
        const centerX = CANVAS_WIDTH / 2;
        const centerY = CANVAS_HEIGHT / 2;
        const playerX = playerRef.current.position.x;
        const playerY = playerRef.current.position.y;

        // 역변환: 캔버스 좌표 -> 월드 좌표
        mousePositionRef.current = {
          x: (canvasX - centerX) / zoom + playerX,
          y: (canvasY - centerY) / zoom + playerY,
        };
      } else {
        mousePositionRef.current = {
          x: canvasX,
          y: canvasY,
        };
      }
    };

    const handleMouseClick = (e: MouseEvent) => {
      if (
        e.button === 0 &&
        playerRef.current.attackCooldown <= 0 &&
        !isGameOverRef.current
      ) {
        playerRef.current.isAttacking = true;
        
        // 기본 공격 스킬 정보 가져오기
        const basicAttack = playerBasicAttackRef.current?.skill;
        const attackCooldown = basicAttack?.cooldown ?? ATTACK_COOLDOWN;
        const isRanged = basicAttack?.projectile.type !== 'none';
        
        playerRef.current.attackCooldown = attackCooldown;

        if (!isRanged) {
          // 근접 공격
          playerRef.current.meleeSwingStart = Date.now();
          playerRef.current.meleeSwingHit = new Set();
          
          // 근접 공격 파티클 이펙트 생성
          if (basicAttack) {
            // 디버깅: 근접 공격 스킬 정보 확인
            console.log('⚔️ [Melee Attack] 공격 시작', {
              range: basicAttack.range + 'px',
              area: basicAttack.area + '°',
              effect: basicAttack.visual.effectPresetId
            });
            
            const newParticles = createSkillParticles(
              {
                position: playerRef.current.position,
                targetPosition: mousePositionRef.current,
                skill: basicAttack,
                strategy: 'projectile', // effectPresetId가 있으면 무시됨
              },
              particleIdRef
            );
            skillParticlesRef.current.push(...newParticles);
          }
        } else {
          // 원거리 공격 - 파티클 기반 투사체
          const dx =
            mousePositionRef.current.x -
            playerRef.current.position.x;
          const dy =
            mousePositionRef.current.y -
            playerRef.current.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 0 && basicAttack) {
            const damage = calculateSkillDamage(basicAttack, playerRef.current.stats);
            
            // 파티클 기반 투사체 생성 (이펙트 자체가 투사체)
            const newParticles = createSkillParticles(
              {
                position: playerRef.current.position,
                targetPosition: mousePositionRef.current,
                skill: basicAttack,
                strategy: 'projectile',
                damage: damage,
                owner: 'player',
              },
              particleIdRef
            );
            skillParticlesRef.current.push(...newParticles);
          }
        }

        setTimeout(() => {
          playerRef.current.isAttacking = false;
        }, 200);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("click", handleMouseClick);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (canvas) {
        canvas.removeEventListener(
          "mousemove",
          handleMouseMove,
        );
        canvas.removeEventListener("click", handleMouseClick);
      }
    };
  }, [
    isGameStarted,
    activeSkills,
    activeItems,
    spConfig,
    enableRespawn,
    propRespawnDelay,
    playerLevelConfig,
    currentPlayerLevel,
    currentMonsterLevel,
    zoom,
    testMode,
  ]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTime = 0;

    const gameLoop = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      frameCount++;
      fpsTime += deltaTime;
      if (fpsTime >= 1) {
        setFps(frameCount);
        frameCount = 0;
        fpsTime = 0;
      }

      // If game not started, skip update logic
      if (!isGameStarted && !testMode) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      if (isGameOverRef.current) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      // Update player position
      const plConfigRaw = playerConfigRef.current;
      const plConfig = resolveCharacterConfigMid(plConfigRaw);
      const plSpeed = plConfig.speed * deltaTime;

      if (keysRef.current.has("w"))
        playerRef.current.position.y -= plSpeed;
      if (keysRef.current.has("s"))
        playerRef.current.position.y += plSpeed;
      if (keysRef.current.has("a"))
        playerRef.current.position.x -= plSpeed;
      if (keysRef.current.has("d"))
        playerRef.current.position.x += plSpeed;

      // Clamp player position (only in normal mode, not testMode)
      if (!testMode) {
        playerRef.current.position.x = Math.max(
          plConfig.size / 2,
          Math.min(
            CANVAS_WIDTH - plConfig.size / 2,
            playerRef.current.position.x,
          ),
        );
        playerRef.current.position.y = Math.max(
          plConfig.size / 2,
          Math.min(
            CANVAS_HEIGHT - plConfig.size / 2,
            playerRef.current.position.y,
          ),
        );
      }

      // Update attack cooldown
      if (playerRef.current.attackCooldown > 0) {
        playerRef.current.attackCooldown -= deltaTime * 1000;
      }

      // Update SP regeneration
      setSPConfig((prev) => regenerateSP(prev, deltaTime));

      // Update active buffs
      setActiveBuffs((prev) => updateBuffs(prev, deltaTime));

      // Update skill cooldowns
      setActiveSkills((prev) =>
        prev.map((slot) => {
          if (slot.skill && slot.skill.isOnCooldown) {
            return {
              ...slot,
              skill: updateSkillCooldown(slot.skill, deltaTime),
            };
          }
          return slot;
        }),
      );

      // Update item cooldowns
      setActiveItems((prev) =>
        prev.map((slot) => {
          if (slot.item && slot.item.isOnCooldown) {
            return {
              ...slot,
              item: updateItemCooldown(slot.item, deltaTime),
            };
          }
          return slot;
        }),
      );

      // Apply player config stats and buffs
      const baseStats = {
        attack: plConfig.attack,
        defense: plConfig.defense,
        speed: plConfig.speed,
        criticalRate: plConfig.criticalRate,
      };
      
      const buffedStats = activeBuffs.length > 0 
        ? applyBuffsToStats(baseStats, activeBuffs)
        : baseStats;
      
      playerRef.current.stats.attack = buffedStats.attack;
      playerRef.current.stats.defense = buffedStats.defense;
      playerRef.current.stats.speed = buffedStats.speed;
      playerRef.current.stats.criticalRate = buffedStats.criticalRate;
      playerRef.current.stats.magic = 0; // No magic in this system

      // Skill particles are now updated in the render section (SkillTestCanvas style)

      // Update monsters
      const monConfigRaw = monsterConfigRef.current;
      const monConfig = resolveCharacterConfigMid(monConfigRaw);
      const monSpeed = monConfig.speed * deltaTime;

      monstersRef.current.forEach((monster) => {
        if (monster.isDead) {
          // 리스폰 활성화된 경우만 리스폰 타이머 처리
          if (enableRespawn) {
            monster.respawnTimer -= deltaTime * 1000;
            if (monster.respawnTimer <= 0) {
              // 현재 살아있는 몬스터 수 체크
              const aliveMonsterCount =
                monstersRef.current.filter(
                  (m) => !m.isDead,
                ).length;

              // 최대 몬스터 수 제한 체크 (1:1 모드일 때는 1개로 제한)
              const maxAllowedMonsters = simulatorMode === "1v1" ? 1 : effectiveMaxMonsterCount;
              if (
                aliveMonsterCount < maxAllowedMonsters
              ) {
                // 선택된 몬스터가 있으면 가중치 기반으로 선택
                const selectedMonster = selectMonsterByWeight();
                const monsterData = selectedMonster || currentDataRow;

                // Respawn monster with new data
                monster.position = {
                  x: Math.random() * (CANVAS_WIDTH - 100) + 50,
                  y: Math.random() * (CANVAS_HEIGHT - 100) + 50,
                };
                monster.stats = { ...defaultMonsterStats };
                monster.isDead = false;
                monster.aiState = "CHASE"; // 리스폰 시 즉시 추적
                monster.attackCooldown = 0;
                monster.respawnTimer = 0;
                monster.velocity = { x: 0, y: 0 };
                monster.knockbackTime = 0;
                
                // 새로운 몬스터 데이터로 속성 업데이트
                monster.name = monsterData?.monster_name || monster.name;
                monster.color = monsterData?.monster_color || monster.color;
                monster.sp = monsterData?.monster_sp || 100;
                monster.maxSP = monsterData?.monster_sp || 100;
                
                // AI 패턴과 스킬 재로드
                if (monsterData) {
                  monster.aiPatternConfig = loadMonsterAIPattern(monsterData);
                  monster.aiConfig = loadMonsterAI(monsterData);
                  monster.skills = loadMonsterSkills(monsterData);
                }
              }
            }
          }
          return;
        }

        if (monster.attackCooldown > 0) {
          monster.attackCooldown -= deltaTime * 1000;
        }

        const dx =
          playerRef.current.position.x - monster.position.x;
        const dy =
          playerRef.current.position.y - monster.position.y;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
        const hpPercent =
          (monster.stats.hp / monster.stats.maxHp) * 100;

        // Check if monster is in knockback state
        const isInKnockback =
          monster.knockbackTime > 0 &&
          Date.now() - monster.knockbackTime < 300; // 300ms knockback duration

        // AI 패턴 기반 결정 로직 (knockback 중이 아닐 때만)
        // 단, 공격 중이거나 공격 쿨다운 중일 때는 상태를 재평가하지 않음 (공격 완료 후에만 재평가)
        const isAttackingOrCooldown = monster.isAttacking || monster.attackCooldown > 0;
        
        if (!isInKnockback && !isAttackingOrCooldown) {
          // AI 패턴이 있으면 패턴 기반으로 행동 결정
          if (monster.aiPatternConfig?.patterns) {
            let actionDecided = false;
            
            for (const pattern of monster.aiPatternConfig.patterns) {
              if (!pattern.enabled) continue;
              
              // 조건 체크
              let conditionsMet = true;
              const conditions = pattern.conditions || [];
              for (const condition of conditions) {
                if (condition.type === 'hp') {
                  if (condition.operator === '<' && !(hpPercent < condition.value)) conditionsMet = false;
                  if (condition.operator === '>' && !(hpPercent > condition.value)) conditionsMet = false;
                  if (condition.operator === '<=' && !(hpPercent <= condition.value)) conditionsMet = false;
                  if (condition.operator === '>=' && !(hpPercent >= condition.value)) conditionsMet = false;
                } else if (condition.type === 'distance') {
                  // 거리 조건: condition.value가 -1이면 실제 공격 범위를 사용
                  const effectiveDistance = condition.value === -1 
                    ? (monster.basicAttack?.range || monConfig.attackRange)
                    : condition.value;
                  
                  if (condition.operator === '<' && !(distanceToPlayer < effectiveDistance)) conditionsMet = false;
                  if (condition.operator === '>' && !(distanceToPlayer > effectiveDistance)) conditionsMet = false;
                  if (condition.operator === '<=' && !(distanceToPlayer <= effectiveDistance)) conditionsMet = false;
                  if (condition.operator === '>=' && !(distanceToPlayer >= effectiveDistance)) conditionsMet = false;
                }
              }
              
              if (conditionsMet) {
                // 패턴에 따라 상태 변경
                if (pattern.action === 'attack' || pattern.action === 'skill') {
                  monster.aiState = "ATTACK";
                } else if (pattern.action === 'chase') {
                  monster.aiState = "CHASE";
                } else if (pattern.action === 'flee') {
                  monster.aiState = "FLEE";
                } else if (pattern.action === 'defend') {
                  monster.aiState = "DEFEND";
                } else if (pattern.action === 'move') {
                  monster.aiState = "IDLE";
                }
                actionDecided = true;
                break;
              }
            }
            
            // 매칭되는 패턴이 없으면 기본 행동 (공격 범위면 공격, 아니면 추적)
            if (!actionDecided) {
              const monsterAttackRange = monster.basicAttack?.range || monConfig.attackRange;
              
              // 히스테리시스 적용: ATTACK 상태에서는 범위를 20% 더 넓게, CHASE 상태에서는 원래 범위 사용
              const effectiveRange = monster.aiState === "ATTACK" 
                ? monsterAttackRange * 1.3  // ATTACK 상태 유지 범위 확장
                : monsterAttackRange;
              
              if (distanceToPlayer <= effectiveRange) {
                monster.aiState = "ATTACK";
              } else {
                monster.aiState = "CHASE";
              }
            }
          } else {
            // AI 패턴이 없으면 기본 행동 (공격 범위면 공격, 아니면 추적)
            const monsterAttackRange = monster.basicAttack?.range || monConfig.attackRange;
            
            // 히스테리시스 적용: ATTACK 상태에서는 범위를 20% 더 넓게, CHASE 상태에서는 원래 범위 사용
            const effectiveRange = monster.aiState === "ATTACK" 
              ? monsterAttackRange * 1.3  // ATTACK 상태 유지 범위 확장
              : monsterAttackRange;
            
            if (distanceToPlayer <= effectiveRange) {
              monster.aiState = "ATTACK";
            } else {
              monster.aiState = "CHASE";
            }
          }
        }

        // Execute AI behavior (only if not in knockback)
        if (!isInKnockback) {
          switch (monster.aiState) {
            case "CHASE":
              // 플레이어를 향해 무조건 이동 (거리 제한 없음)
              if (distanceToPlayer > 0) {
                const dirX = dx / distanceToPlayer;
                const dirY = dy / distanceToPlayer;
                monster.position.x += dirX * monSpeed;
                monster.position.y += dirY * monSpeed;
              }
              break;

            case "ATTACK":
              // ATTACK 상태에서는 공격 범위 내로 접근하면서 공격 수행
              // 공격 쿨다운이 끝나면 공격, 아니면 천천히 접근
              const monsterAttackRange = monster.basicAttack?.range || monConfig.attackRange;
              
              // 공격 범위를 약간 벗어났다면 천천히 접근 (공격 상태 유지)
              if (distanceToPlayer > monsterAttackRange * 1.2 && monster.attackCooldown > 0) {
                const dirX = dx / distanceToPlayer;
                const dirY = dy / distanceToPlayer;
                // 공격 쿨다운 중에는 느리게 이동 (원래 속도의 50%)
                monster.position.x += dirX * monSpeed * 0.5;
                monster.position.y += dirY * monSpeed * 0.5;
              }
              
              if (monster.attackCooldown <= 0) {
                // 스킬 기반 공격 시스템
                // AI 패턴에서 스킬 ID를 가져와서 사용
                let targetSkillId: string | null = null;
                
                // AI 패턴 확인하여 attack 또는 skill 액션의 skillId 가져오기
                if (monster.aiPatternConfig?.patterns) {
                  for (const pattern of monster.aiPatternConfig.patterns) {
                    if (!pattern.enabled) continue;
                    if (pattern.action === 'attack' || pattern.action === 'skill') {
                      // 조건 체크
                      let conditionsMet = true;
                      const conditions = pattern.conditions || [];
                      for (const condition of conditions) {
                        if (condition.type === 'hp') {
                          const hpPercent = (monster.stats.hp / monster.stats.maxHp) * 100;
                          if (condition.operator === '<' && !(hpPercent < condition.value)) conditionsMet = false;
                          if (condition.operator === '>' && !(hpPercent > condition.value)) conditionsMet = false;
                          if (condition.operator === '<=' && !(hpPercent <= condition.value)) conditionsMet = false;
                          if (condition.operator === '>=' && !(hpPercent >= condition.value)) conditionsMet = false;
                        } else if (condition.type === 'distance') {
                          // 거리 조건: condition.value가 -1이면 실제 공격 범위를 사용
                          const effectiveDistance = condition.value === -1 
                            ? (monster.basicAttack?.range || monConfig.attackRange)
                            : condition.value;
                          
                          if (condition.operator === '<' && !(distanceToPlayer < effectiveDistance)) conditionsMet = false;
                          if (condition.operator === '>' && !(distanceToPlayer > effectiveDistance)) conditionsMet = false;
                          if (condition.operator === '<=' && !(distanceToPlayer <= effectiveDistance)) conditionsMet = false;
                          if (condition.operator === '>=' && !(distanceToPlayer >= effectiveDistance)) conditionsMet = false;
                        }
                      }
                      
                      if (conditionsMet && pattern.skillId) {
                        targetSkillId = pattern.skillId;
                        break;
                      }
                    }
                  }
                }
                
                // 스킬 ID가 지정되어 있으면 해당 스킬 사용, 없으면 null (기본 공격 사용)
                let monsterSkillSlot = null;
                if (targetSkillId) {
                  // skillId로 스킬 슬롯 찾기
                  for (const slotKey of ['slot1', 'slot2', 'slot3', 'slot4'] as (keyof CharacterSkills)[]) {
                    const slot = monster.skills[slotKey];
                    if (slot && slot.id === targetSkillId) {
                      monsterSkillSlot = slot;
                      break;
                    }
                  }
                }
                // targetSkillId가 없으면 monsterSkillSlot은 null로 유지 -> 아래에서 기본 공격 사용
                
                // 스킬 설정이 있으면 스킬 사용, 없으면 기본 공격
                if (monsterSkillSlot) {
                  const skillId = monsterSkillSlot.id;
                  // basicAttack을 우선 사용하고, 없으면 스킬 슬롯 range 사용
                  const skillRange = monster.basicAttack?.range || monsterSkillSlot.range || monConfig.attackRange;
                  const skillDamage = monsterSkillSlot.damage;
                  const skillCooldown = monsterSkillSlot.cooldown || ATTACK_COOLDOWN;
                  
                  // 범위 체크 - 스킬 범위 내에 있을 때만 공격
                  if (distanceToPlayer <= skillRange) {
                    monster.isAttacking = true;
                    monster.attackCooldown = skillCooldown;
                    
                    // 스킬 정의 찾기 (skillConfigs에서)
                    const actualSkill = skillConfigs?.[skillId as string];
                    
                    if (actualSkill) {
                      // 스킬 시스템 사용
                      if (actualSkill.type === 'melee' || actualSkill.type === 'damage') {
                        // 근접 공격 - 부채꼴 범위 체크
                        const monsterX = monster.position.x;
                        const monsterY = monster.position.y;
                        const playerX = playerRef.current.position.x;
                        const playerY = playerRef.current.position.y;
                        
                        // 몬스터가 바라보는 방향 (플레이어 방향)
                        const targetAngle = Math.atan2(
                          playerY - monsterY,
                          playerX - monsterX
                        );
                        
                        // 플레이어의 각도 계산
                        const angleToPlayer = Math.atan2(
                          playerY - monsterY,
                          playerX - monsterX
                        );
                        
                        // 스킬의 부채꼴 넓이 (area 속성 사용)
                        const skillArc = ((actualSkill.area || monster.basicAttack?.width || monConfig.attackWidth) * Math.PI) / 180;
                        
                        // 각도 차이 계산
                        let angleDiff = angleToPlayer - targetAngle;
                        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                        
                        // 부채꼴 범위 내에 있는지 체크
                        if (Math.abs(angleDiff) <= skillArc / 2) {
                          // 근접 공격 실행
                          const monsterStats = {
                            attack: monConfig.attack,
                            defense: monConfig.defense,
                            speed: monConfig.speed,
                            magic: 0,
                          };
                          const damage = calculateSkillDamage(actualSkill, monsterStats);
                          
                          playerRef.current.stats.hp = Math.max(
                            0,
                            playerRef.current.stats.hp - damage,
                          );
                          setPlayerHp({
                            current: playerRef.current.stats.hp,
                            max: playerRef.current.stats.maxHp,
                          });

                          if (playerRef.current.stats.hp <= 0) {
                            setIsGameOver(true);
                            isGameOverRef.current = true;
                            setSurvivalTime(
                              (Date.now() - gameStartTimeRef.current) / 1000,
                            );
                            toast.error("플레이어 사망! 게임 오버");
                          }

                          toast.error(
                            `${monster.name} ${actualSkill.name}! ${damage} 데미지!`,
                          );
                        }
                      } else if (actualSkill.type === 'ranged' && distanceToPlayer > 0) {
                        // 원거리 공격 - 파티클이 투사체 역할을 함
                        const monsterStats = {
                          attack: monConfig.attack,
                          defense: monConfig.defense,
                          speed: monConfig.speed,
                          magic: 0,
                        };
                        const damage = calculateSkillDamage(actualSkill, monsterStats);

                        // 새로운 이펙트 시스템 사용
                        if (actualSkill.visual.effectType) {
                          const newEffectParticles = createEffect({
                            preset: actualSkill.visual,
                            position: monster.position,
                            targetPosition: playerRef.current.position,
                            owner: 'monster',
                            damage: damage,
                            skillName: actualSkill.name,
                          });
                          skillParticlesRef.current.push(...newEffectParticles);
                        } else {
                          // 레거시 시스템 (이펙트 타입이 없는 기존 스킬)
                          const newParticles = createSkillParticles(
                            {
                              position: monster.position,
                              targetPosition: playerRef.current.position,
                              skill: actualSkill,
                              strategy: 'projectile',
                              damage: damage,
                              owner: 'monster',
                              monsterId: monster.id,
                            },
                            particleIdRef
                          );
                          skillParticlesRef.current.push(...newParticles);
                        }
                        
                        toast.error(
                          `${monster.name} ${actualSkill.name} 발사!`,
                        );
                      }
                    }
                    // actualSkill이 없으면 공격하지 않음 (스킬 시스템 전용)
                    
                    // currentSkill 초기화
                    monster.currentSkill = null;

                    setTimeout(() => {
                      monster.isAttacking = false;
                    }, 200);
                  }
                } else {
                  // 스킬 슬롯이 없으면 기본 공격 사용 (monster.basicAttack.skill 활용)
                  const basicAttackSkill = monster.basicAttack?.skill;
                  const attackRange = monster.basicAttack?.range || monConfig.attackRange;
                  const attackCooldown = monster.basicAttack?.cooldown ?? ATTACK_COOLDOWN;
                  
                  // 범위 체크
                  if (distanceToPlayer <= attackRange) {
                    monster.isAttacking = true;
                    monster.attackCooldown = attackCooldown;

                    // 기본 공격 스킬이 정의되어 있으면 스킬 시스템 사용
                    if (basicAttackSkill) {
                      if (basicAttackSkill.type === 'melee' || basicAttackSkill.type === 'damage') {
                        // 근접 기본 공격
                        const monsterX = monster.position.x;
                        const monsterY = monster.position.y;
                        const playerX = playerRef.current.position.x;
                        const playerY = playerRef.current.position.y;
                        
                        const targetAngle = Math.atan2(playerY - monsterY, playerX - monsterX);
                        const angleToPlayer = Math.atan2(playerY - monsterY, playerX - monsterX);
                        const skillArc = ((basicAttackSkill.area || monster.basicAttack?.width || monConfig.attackWidth) * Math.PI) / 180;
                        
                        let angleDiff = angleToPlayer - targetAngle;
                        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                        
                        if (Math.abs(angleDiff) <= skillArc / 2) {
                          const monsterStats = {
                            attack: monConfig.attack,
                            defense: monConfig.defense,
                            speed: monConfig.speed,
                            magic: 0,
                          };
                          const damage = calculateSkillDamage(basicAttackSkill, monsterStats);
                          
                          playerRef.current.stats.hp = Math.max(0, playerRef.current.stats.hp - damage);
                          setPlayerHp({
                            current: playerRef.current.stats.hp,
                            max: playerRef.current.stats.maxHp,
                          });

                          if (playerRef.current.stats.hp <= 0) {
                            setIsGameOver(true);
                            isGameOverRef.current = true;
                            setSurvivalTime((Date.now() - gameStartTimeRef.current) / 1000);
                            toast.error("플레이어 사망! 게임 오버");
                          }

                          toast.error(`${monster.name} ${basicAttackSkill.name}! ${damage} 데미지!`);
                          
                          // 근접 공격 파티클 이펙트 생성
                          const attackAngle = Math.atan2(dy, dx);
                          for (let i = 0; i < basicAttackSkill.visual.particleCount; i++) {
                            const spreadAngle = (basicAttackSkill.area * Math.PI / 180) / 2;
                            const angle = attackAngle + (Math.random() - 0.5) * spreadAngle * 2;
                            const distance = Math.random() * basicAttackSkill.range * 0.7;
                            const speed = 2 + Math.random() * 4;
                            const color = Math.random() > 0.5 
                              ? basicAttackSkill.visual.color 
                              : basicAttackSkill.visual.secondaryColor;
                            
                            skillParticlesRef.current.push({
                              id: particleIdRef.current++,
                              x: monsterX + Math.cos(angle) * distance * 0.3,
                              y: monsterY + Math.sin(angle) * distance * 0.3,
                              vx: Math.cos(angle) * speed,
                              vy: Math.sin(angle) * speed,
                              life: basicAttackSkill.visual.particleLifetime,
                              maxLife: basicAttackSkill.visual.particleLifetime,
                              size: basicAttackSkill.visual.particleSize,
                              color: color,
                              skillType: basicAttackSkill.id,
                            });
                          }
                        }
                      } else if (basicAttackSkill.type === 'ranged' && distanceToPlayer > 0) {
                        // 원거리 기본 공격 - 파티클이 투사체 역할을 함
                        const monsterStats = {
                          attack: monConfig.attack,
                          defense: monConfig.defense,
                          speed: monConfig.speed,
                          magic: 0,
                        };
                        const damage = calculateSkillDamage(basicAttackSkill, monsterStats);

                        // 새로운 이펙트 시스템 사용
                        if (basicAttackSkill.visual.effectType) {
                          const newEffectParticles = createEffect({
                            preset: basicAttackSkill.visual,
                            position: monster.position,
                            targetPosition: playerRef.current.position,
                            owner: 'monster',
                            damage: damage,
                            skillName: basicAttackSkill.name,
                          });
                          skillParticlesRef.current.push(...newEffectParticles);
                        } else {
                          // 레거시 시스템 (이펙트 타입이 없는 기존 스킬)
                          const newParticles = createSkillParticles(
                            {
                              position: monster.position,
                              targetPosition: playerRef.current.position,
                              skill: basicAttackSkill,
                              strategy: 'projectile',
                              damage: damage,
                              owner: 'monster',
                              monsterId: monster.id,
                            },
                            particleIdRef
                          );
                          skillParticlesRef.current.push(...newParticles);
                        }
                        
                        toast.error(`${monster.name} ${basicAttackSkill.name} 발사!`);
                      }
                    }
                    // basicAttackSkill이 없으면 공격하지 않음 (스킬 시스템 전용)

                    setTimeout(() => {
                      monster.isAttacking = false;
                    }, 200);
                  }
                }
              }
              break;

            case "FLEE":
              // 플레이어로부터 도망
              if (distanceToPlayer > 0) {
                const dirX = -dx / distanceToPlayer;
                const dirY = -dy / distanceToPlayer;
                monster.position.x += dirX * monSpeed;
                monster.position.y += dirY * monSpeed;
              }
              break;

            case "DEFEND":
              // 방어 상태 - 움직이지 않음
              break;

            case "IDLE":
              // 대기 상태 - 움직이지 않음
              break;
          }
        }

        // Apply velocity (knockback) and friction
        monster.position.x += monster.velocity.x;
        monster.position.y += monster.velocity.y;

        // Apply friction to velocity (decelerate)
        const friction = 0.85;
        monster.velocity.x *= friction;
        monster.velocity.y *= friction;

        // Stop very small velocities
        if (Math.abs(monster.velocity.x) < 0.1)
          monster.velocity.x = 0;
        if (Math.abs(monster.velocity.y) < 0.1)
          monster.velocity.y = 0;

        // Clamp monster position (only in normal mode, not testMode)
        if (!testMode) {
          monster.position.x = Math.max(
            monConfig.size / 2,
            Math.min(
              CANVAS_WIDTH - monConfig.size / 2,
              monster.position.x,
            ),
          );
          monster.position.y = Math.max(
            monConfig.size / 2,
            Math.min(
              CANVAS_HEIGHT - monConfig.size / 2,
              monster.position.y,
            ),
          );
        }
      });

      // Update projectiles
      projectilesRef.current.forEach((projectile, index) => {
        // Homing logic for player projectiles
        if (
          projectile.isHoming &&
          projectile.owner === "player" &&
          projectile.targetId !== undefined
        ) {
          const targetMonster = monstersRef.current.find(
            (m) => m.id === projectile.targetId && !m.isDead,
          );

          if (targetMonster) {
            // Calculate direction to target
            const dx =
              targetMonster.position.x - projectile.position.x;
            const dy =
              targetMonster.position.y - projectile.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
              // Homing strength: how quickly the projectile turns (0.0 to 1.0)
              const homingStrength = 0.15; // Increased from 0.05 for more noticeable homing

              // Calculate desired velocity direction
              const desiredVx =
                (dx / distance) * PROJECTILE_SPEED;
              const desiredVy =
                (dy / distance) * PROJECTILE_SPEED;

              // Interpolate current velocity towards desired velocity
              projectile.velocity.x +=
                (desiredVx - projectile.velocity.x) *
                homingStrength;
              projectile.velocity.y +=
                (desiredVy - projectile.velocity.y) *
                homingStrength;

              // Normalize velocity to maintain constant speed
              const currentSpeed = Math.sqrt(
                projectile.velocity.x * projectile.velocity.x +
                  projectile.velocity.y * projectile.velocity.y,
              );
              if (currentSpeed > 0) {
                projectile.velocity.x =
                  (projectile.velocity.x / currentSpeed) *
                  PROJECTILE_SPEED;
                projectile.velocity.y =
                  (projectile.velocity.y / currentSpeed) *
                  PROJECTILE_SPEED;
              }
            }
          }
        }

        projectile.position.x +=
          projectile.velocity.x * deltaTime;
        projectile.position.y +=
          projectile.velocity.y * deltaTime;

        const dx =
          projectile.position.x - projectile.startPosition.x;
        const dy =
          projectile.position.y - projectile.startPosition.y;
        projectile.travelDistance = Math.sqrt(
          dx * dx + dy * dy,
        );

        // Check collision with player (monster projectiles)
        if (projectile.owner === "monster") {
          const pdx =
            projectile.position.x -
            playerRef.current.position.x;
          const pdy =
            projectile.position.y -
            playerRef.current.position.y;
          const distance = Math.sqrt(pdx * pdx + pdy * pdy);

          if (distance < plConfig.size / 2 + projectile.size) {
            const damage = projectile.damage;
            playerRef.current.stats.hp = Math.max(
              0,
              playerRef.current.stats.hp - damage,
            );
            setPlayerHp({
              current: playerRef.current.stats.hp,
              max: playerRef.current.stats.maxHp,
            });

            if (playerRef.current.stats.hp <= 0) {
              setIsGameOver(true);
              isGameOverRef.current = true;
              setSurvivalTime(
                (Date.now() - gameStartTimeRef.current) / 1000,
              );
              toast.error("플레이어 사망! 게임 오버");
            }

            projectilesRef.current.splice(index, 1);
            toast.error(
              `몬스터 투사체 명중! ${damage} 데미지!`,
            );
          }
        }

        // Check collision with monsters (player projectiles)
        if (projectile.owner === "player") {
          monstersRef.current.forEach((monster) => {
            if (monster.isDead) return;

            const mdx =
              projectile.position.x - monster.position.x;
            const mdy =
              projectile.position.y - monster.position.y;
            const distance = Math.sqrt(mdx * mdx + mdy * mdy);

            if (
              distance <
              monConfig.size / 2 + projectile.size
            ) {
              const baseDamage = calculateDamage(
                playerRef.current.stats,
                monster.stats,
              );
              
              // 크리티컬 판정
              const critResult = calculateCritical(0.15, 1.5);
              const finalDamage = Math.floor(baseDamage * critResult.damageMultiplier);
              
              monster.stats.hp = Math.max(
                0,
                monster.stats.hp - finalDamage,
              );
              
              // 데미지 텍스트 생성 (크리티컬만 표시)
              if (critResult.isCritical) {
                damageTextsRef.current.push({
                  id: damageTextIdRef.current++,
                  x: monster.position.x,
                  y: monster.position.y,
                  damage: finalDamage,
                  isCritical: true,
                  skillName: '치명타',
                  lifetime: 0,
                  maxLifetime: 1000,
                });
              }

              if (monster.stats.hp <= 0) {
                monster.isDead = true;
                monster.respawnTimer = enableRespawn
                  ? propRespawnDelay
                  : 0; // 리스폰 비활성화 시 타이머 0
                setKillCount((prev) => prev + 1);
                toast.success(`몬스터 처치! +1`);
              }

              projectilesRef.current.splice(index, 1);
            }
          });
        }

        // Remove projectiles that are out of bounds or traveled too far
        if (
          projectile.position.x < 0 ||
          projectile.position.x > CANVAS_WIDTH ||
          projectile.position.y < 0 ||
          projectile.position.y > CANVAS_HEIGHT ||
          projectile.travelDistance > PROJECTILE_MAX_DISTANCE
        ) {
          projectilesRef.current.splice(index, 1);
        }
      });

      // Update particles (위치, 수명 등) - 새로운 이펙트 시스템 통합
      skillParticlesRef.current = updateNewParticles(
        skillParticlesRef.current,
        deltaTime,
        monstersRef.current
      );

      // Handle particle-projectile collisions (파티클이 투사체 역할)
      skillParticlesRef.current = skillParticlesRef.current.filter((particle) => {
        // 투사체가 아닌 파티클은 그대로 유지 (시각 효과만)
        if (!particle.damage || !particle.owner || particle.hasHit) {
          return true;
        }
        
        // 몬스터의 투사체 파티클 → 플레이어 충돌 체크
        if (particle.owner === 'monster') {
          // 새로운 충돌 감지 함수 사용
          if (checkPlayerParticleCollision(playerRef.current as any, particle)) {
            // 충돌! 플레이어 데미지
            playerRef.current.stats.hp = Math.max(
              0,
              playerRef.current.stats.hp - particle.damage
            );
            
            // 데미지 텍스트 생성
            damageTextsRef.current.push({
              id: damageTextIdRef.current++,
              x: playerRef.current.position.x,
              y: playerRef.current.position.y,
              damage: particle.damage,
              isCritical: false,
              skillName: particle.skillName || '적 공격',
              lifetime: 0,
              maxLifetime: 1000,
            });
            
            if (playerRef.current.stats.hp <= 0) {
              setIsGameOver(true);
              isGameOverRef.current = true;
              setSurvivalTime(
                (Date.now() - gameStartTimeRef.current) / 1000
              );
              toast.error('플레이어 사망! 게임 오버');
            }
            
            // 파티클 제거
            particle.hasHit = true;
            return false;
          }
        }
        
        // 플레이어의 투사체 파티클 → 몬스터 충돌 체크
        if (particle.owner === 'player') {
          let hit = false;
          
          monstersRef.current.forEach((monster) => {
            if (monster.isDead || hit) return;
            
            // 새로운 충돌 감지 함수 사용
            if (checkMonsterParticleCollision(monster as any, particle)) {
              // 충돌! 몬스터 데미지
              const finalDamage = particle.damage || 0;
              monster.stats.hp = Math.max(
                0,
                monster.stats.hp - finalDamage
              );
              
              // 데미지 텍스트 생성
              damageTextsRef.current.push({
                id: damageTextIdRef.current++,
                x: monster.position.x,
                y: monster.position.y,
                damage: finalDamage,
                isCritical: false,
                skillName: particle.skillName || '투사체',
                lifetime: 0,
                maxLifetime: 1000,
              });
              
              if (monster.stats.hp <= 0) {
                monster.isDead = true;
                monster.respawnTimer = enableRespawn ? propRespawnDelay : 0;
                setKillCount((prev) => prev + 1);
                
                // 경험치 획득
                if (playerLevelConfig) {
                  const monsterStats = calculateLevelStats(currentMonsterLevel);
                  const expReward = calculateExpReward(monsterStats.level);
                  const levelResult = addExperience(currentPlayerLevel, expReward);
                  if (levelResult.leveledUp) {
                    toast.success(
                      `레벨 업! LV.${levelResult.newConfig.currentLevel}`
                    );
                  }
                  setCurrentPlayerLevel(levelResult.newConfig);
                }
                
                toast.success(`몬스터 처치! +1`);
              }
              
              hit = true;
              particle.hasHit = true;
            }
          });
          
          if (hit) return false;
        }
        
        // 충돌하지 않은 파티클은 유지
        return true;
      });

      // Handle melee attacks
      if (playerRef.current.meleeSwingStart !== null) {
        const swingProgress =
          (Date.now() - playerRef.current.meleeSwingStart) /
          MELEE_SWING_DURATION;

        if (swingProgress >= 1) {
          playerRef.current.meleeSwingStart = null;
          playerRef.current.meleeSwingHit.clear();
        } else {
          const mouseX = mousePositionRef.current.x;
          const mouseY = mousePositionRef.current.y;
          const playerX = playerRef.current.position.x;
          const playerY = playerRef.current.position.y;

          const dx = mouseX - playerX;
          const dy = mouseY - playerY;
          const targetAngle = Math.atan2(dy, dx);

          // 기본 공격 정보 사용
          const meleeRange = playerBasicAttackRef.current?.range || plConfig.attackRange;
          const meleeWidth = playerBasicAttackRef.current?.width || plConfig.attackWidth;
          
          const meleeSwingArc =
            (meleeWidth * Math.PI) / 180; // Convert attackWidth to radians
          const startAngle = targetAngle - meleeSwingArc / 2;
          const swingOffset = meleeSwingArc * swingProgress;
          const currentAngle = startAngle + swingOffset;

          playerRef.current.meleeSwingAngle = currentAngle;

          monstersRef.current.forEach((monster) => {
            if (
              monster.isDead ||
              playerRef.current.meleeSwingHit.has(monster.id)
            )
              return;

            const mdx = monster.position.x - playerX;
            const mdy = monster.position.y - playerY;
            const distance = Math.sqrt(mdx * mdx + mdy * mdy);
            const angleToMonster = Math.atan2(mdy, mdx);

            // 부채꼴 범위 체크: 타겟 방향(마우스 방향)을 중심으로 한 부채꼴 내에 있는지 확인
            let angleDiff = angleToMonster - targetAngle;
            while (angleDiff > Math.PI)
              angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI)
              angleDiff += 2 * Math.PI;

            if (
              distance <= meleeRange &&
              Math.abs(angleDiff) <= meleeSwingArc / 2
            ) {
              // 데미지 계산: attack - defense, 최소 1
              const baseDamage = Math.max(1, playerRef.current.stats.attack - monster.stats.defense);
              
              // 크리티컬 판정
              const critResult = calculateCritical(0.15, 1.5);
              const finalDamage = Math.floor(baseDamage * critResult.damageMultiplier);
              
              monster.stats.hp = Math.max(
                0,
                monster.stats.hp - finalDamage,
              );

              // 데미지 텍스트 생성 (크리티컬만 표시)
              if (critResult.isCritical) {
                damageTextsRef.current.push({
                  id: damageTextIdRef.current++,
                  x: monster.position.x,
                  y: monster.position.y,
                  damage: finalDamage,
                  isCritical: true,
                  skillName: '치명타',
                  lifetime: 0,
                  maxLifetime: 1000,
                });
              }

              playerRef.current.meleeSwingHit.add(monster.id);

              if (monster.stats.hp <= 0) {
                monster.isDead = true;
                monster.respawnTimer = enableRespawn
                  ? propRespawnDelay
                  : 0; // 리스폰 비활성화 시 타이머 0
                setKillCount((prev) => prev + 1);
                toast.success(`몬스터 처치! +1`);
              } else if (critResult.isCritical) {
                toast.success(
                  `💥 크리티컬! ${finalDamage} 데미지!`,
                );
              }
            }
          });
        }
      }

      // Handle skill attacks
      if (playerRef.current.skillSwingStart !== null) {
        const skillDuration =
          playerRef.current.activeSkillType === "whirlwind"
            ? 800
            : 500;
        const swingProgress =
          (Date.now() - playerRef.current.skillSwingStart) /
          skillDuration;

        if (swingProgress >= 1) {
          playerRef.current.skillSwingStart = null;
          playerRef.current.skillSwingHit.clear();
          playerRef.current.isSkilling = false;
          playerRef.current.activeSkillType = null;
          playerRef.current.activeSkillDamageMultiplier = 1.0;
        } else {
          const playerX = playerRef.current.position.x;
          const playerY = playerRef.current.position.y;

          if (
            playerRef.current.activeSkillType === "powerSlash"
          ) {
            // 강타 - 마우스 방향으로 근접 공격
            const mouseX = mousePositionRef.current.x;
            const mouseY = mousePositionRef.current.y;
            const dx = mouseX - playerX;
            const dy = mouseY - playerY;
            const targetAngle = Math.atan2(dy, dx);

            // Get skill parameters from activeSkillsRef (use ref for latest value in game loop)
            const powerSlashSlot = activeSkillsRef.current.find(
              (s) => s.skill?.id === "powerSlash",
            );
            const skillRange =
              powerSlashSlot?.skill?.range || 100; // powerSlash range
            const skillArc =
              ((powerSlashSlot?.skill?.area || 120) * Math.PI) /
              180; // powerSlash area
            const startAngle = targetAngle - skillArc / 2;
            const swingOffset = skillArc * swingProgress;
            const currentAngle = startAngle + swingOffset;

            playerRef.current.skillSwingAngle = currentAngle;

            monstersRef.current.forEach((monster) => {
              if (
                monster.isDead ||
                playerRef.current.skillSwingHit.has(monster.id)
              )
                return;

              const mdx = monster.position.x - playerX;
              const mdy = monster.position.y - playerY;
              const distance = Math.sqrt(mdx * mdx + mdy * mdy);
              const angleToMonster = Math.atan2(mdy, mdx);

              // 부채꼴 범위 체크: 타겟 방향(마우스 방향)을 중심으로 한 부채꼴 내에 있는지 확인
              let angleDiff = angleToMonster - targetAngle;
              while (angleDiff > Math.PI)
                angleDiff -= 2 * Math.PI;
              while (angleDiff < -Math.PI)
                angleDiff += 2 * Math.PI;

              if (
                distance <= skillRange &&
                Math.abs(angleDiff) <= skillArc / 2
              ) {
                // 능력치 기반 데미지 계산
                const baseSkillDamage = powerSlashSlot?.skill
                  ? calculateSkillDamage(powerSlashSlot.skill, playerRef.current.stats)
                  : 0;
                
                // 크리티컬 판정
                const critResult = calculateCritical(0.15, 1.5);
                const skillDamage = Math.floor(baseSkillDamage * critResult.damageMultiplier);
                
                monster.stats.hp = Math.max(
                  0,
                  monster.stats.hp - skillDamage,
                );
                
                // 데미지 텍스트 생성 (크리티컬만 표시)
                if (critResult.isCritical) {
                  damageTextsRef.current.push({
                    id: damageTextIdRef.current++,
                    x: monster.position.x,
                    y: monster.position.y,
                    damage: skillDamage,
                    isCritical: true,
                    skillName: '치명타',
                    lifetime: 0,
                    maxLifetime: 1000,
                  });
                }

                // Apply knockback effect for powerSlash
                const knockbackStrength = 15; // Knockback force
                const knockbackAngle = Math.atan2(mdy, mdx);
                monster.velocity.x =
                  Math.cos(knockbackAngle) * knockbackStrength;
                monster.velocity.y =
                  Math.sin(knockbackAngle) * knockbackStrength;
                monster.knockbackTime = Date.now();

                // Create impact particles (새 구조)
                for (let i = 0; i < 15; i++) {
                  const particleAngle =
                    knockbackAngle +
                    (Math.random() - 0.5) * Math.PI;
                  const speed = 2 + Math.random() * 4;
                  skillParticlesRef.current.push({
                    id: particleIdRef.current++,
                    x: monster.position.x,
                    y: monster.position.y,
                    vx: Math.cos(particleAngle) * speed,
                    vy: Math.sin(particleAngle) * speed,
                    life: 30,
                    maxLife: 30,
                    size: 2 + Math.random() * 3,
                    color: "#ffffff",
                  });
                }

                playerRef.current.skillSwingHit.add(monster.id);

                if (monster.stats.hp <= 0) {
                  monster.isDead = true;
                  monster.respawnTimer = enableRespawn
                    ? propRespawnDelay
                    : 0;
                  setKillCount((prev) => prev + 1);

                  if (playerLevelConfig) {
                    const monsterStats = calculateLevelStats(
                      currentMonsterLevel,
                    );
                    const expReward = calculateExpReward(
                      monsterStats.level,
                    );
                    const levelResult = addExperience(
                      currentPlayerLevel,
                      expReward,
                    );
                    if (levelResult.leveledUp) {
                      toast.success(
                        `레벨 업! LV.${levelResult.newConfig.currentLevel}`,
                      );
                    }
                    setCurrentPlayerLevel(
                      levelResult.newConfig,
                    );
                  }
                  toast.success(
                    `강타로 몬스터 처치! ${skillDamage} 데미지!`,
                  );
                } else {
                  toast.success(
                    `강타 명중! ${skillDamage} 데미지!`,
                  );
                }
              }
            });
          } else if (
            playerRef.current.activeSkillType === "whirlwind"
          ) {
            // 회오리 베기 - 360도 회전 공격
            // Get skill parameters from activeSkillsRef (use ref for latest value in game loop)
            const whirlwindSlot = activeSkillsRef.current.find(
              (s) => s.skill?.id === "whirlwind",
            );
            const skillRange =
              whirlwindSlot?.skill?.range || 150; // whirlwind range
            const fullCircle = Math.PI * 2;
            const currentAngle = fullCircle * swingProgress;

            playerRef.current.skillSwingAngle = currentAngle;

            monstersRef.current.forEach((monster) => {
              if (
                monster.isDead ||
                playerRef.current.skillSwingHit.has(monster.id)
              )
                return;

              const mdx = monster.position.x - playerX;
              const mdy = monster.position.y - playerY;
              const distance = Math.sqrt(mdx * mdx + mdy * mdy);
              const angleToMonster = Math.atan2(mdy, mdx);

              // Check if the swing has passed this monster's angle
              let normalizedMonsterAngle = angleToMonster;
              if (normalizedMonsterAngle < 0)
                normalizedMonsterAngle += fullCircle;

              // Check if we've swung past this angle
              if (
                distance <= skillRange &&
                currentAngle >= normalizedMonsterAngle
              ) {
                // 능력치 기반 데미지 계산
                const skillDamage = whirlwindSlot?.skill
                  ? calculateSkillDamage(whirlwindSlot.skill, playerRef.current.stats)
                  : 0;
                monster.stats.hp = Math.max(
                  0,
                  monster.stats.hp - skillDamage,
                );

                playerRef.current.skillSwingHit.add(monster.id);

                if (monster.stats.hp <= 0) {
                  monster.isDead = true;
                  monster.respawnTimer = enableRespawn
                    ? propRespawnDelay
                    : 0;
                  setKillCount((prev) => prev + 1);

                  if (playerLevelConfig) {
                    const monsterStats = calculateLevelStats(
                      currentMonsterLevel,
                    );
                    const expReward = calculateExpReward(
                      monsterStats.level,
                    );
                    const levelResult = addExperience(
                      currentPlayerLevel,
                      expReward,
                    );
                    if (levelResult.leveledUp) {
                      toast.success(
                        `레벨 업! LV.${levelResult.newConfig.currentLevel}`,
                      );
                    }
                    setCurrentPlayerLevel(
                      levelResult.newConfig,
                    );
                  }
                  toast.success(
                    `회오리 베기로 몬스터 처치! ${skillDamage} 데미지!`,
                  );
                } else {
                  toast.success(
                    `회오리 베기 명중! ${skillDamage} 데미지!`,
                  );
                }
              }
            });
          }
        }
      }

      // Handle monster respawn
      if (enableRespawn) {
        monstersRef.current.forEach((monster) => {
          if (monster.isDead && monster.respawnTimer > 0) {
            monster.respawnTimer -= deltaTime * 1000;
            
            if (monster.respawnTimer <= 0) {
              // 리스폰 처리
              const levelStats = calculateLevelStats(currentMonsterLevel);
              monster.stats = {
                hp: levelStats.hp,
                maxHp: levelStats.hp,
                attack: levelStats.attack,
                defense: levelStats.defense,
                speed: levelStats.speed,
                attackRange: monster.stats.attackRange,
                attackWidth: monster.stats.attackWidth,
                critRate: monster.stats.critRate || 0.05,
                critDamage: monster.stats.critDamage || 1.3,
                accuracy: monster.stats.accuracy || 0.85,
                evasion: monster.stats.evasion || 0.03,
              };
              monster.isDead = false;
              monster.respawnTimer = 0;
              monster.position = {
                x: Math.random() * (CANVAS_WIDTH - 100) + 50,
                y: Math.random() * (CANVAS_HEIGHT - 100) + 50,
              };
              monster.aiState = "CHASE";
              monster.sp = monster.maxSP;
            }
          }
        });
      }

      // Render
      // Clear entire canvas (before any transformations)
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset to identity matrix
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw background (fixed, not affected by shake)
      ctx.fillStyle = "#6b7280"; // 회색 배경
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.restore();

      // Apply zoom and camera transform (testMode only)
      ctx.save();
      if (testMode) {
        const playerX = playerRef.current.position.x;
        const playerY = playerRef.current.position.y;
        const centerX = CANVAS_WIDTH / 2;
        const centerY = CANVAS_HEIGHT / 2; // 시뮬레이터 정중앙

        ctx.translate(centerX, centerY);
        ctx.scale(zoom, zoom);
        ctx.translate(-playerX, -playerY);

        // Draw infinite grid in world space
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1 / zoom; // Keep line width constant in screen space
        const gridSize = 50;
        
        // 화면의 네 모서리를 world 좌표로 변환
        const worldLeft = playerX + (0 - centerX) / zoom;
        const worldRight = playerX + (CANVAS_WIDTH - centerX) / zoom;
        const worldTop = playerY + (0 - centerY) / zoom;
        const worldBottom = playerY + (CANVAS_HEIGHT - centerY) / zoom;
        
        const startX = Math.floor(worldLeft / gridSize) * gridSize;
        const endX = Math.ceil(worldRight / gridSize) * gridSize;
        for (let x = startX; x <= endX; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, worldTop);
          ctx.lineTo(x, worldBottom);
          ctx.stroke();
        }
        
        const startY = Math.floor(worldTop / gridSize) * gridSize;
        const endY = Math.ceil(worldBottom / gridSize) * gridSize;
        for (let y = startY; y <= endY; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(worldLeft, y);
          ctx.lineTo(worldRight, y);
          ctx.stroke();
        }
        
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 2 / zoom; // Keep line width constant in screen space
        ctx.beginPath();
        ctx.moveTo(0, worldTop);
        ctx.lineTo(0, worldBottom);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(worldLeft, 0);
        ctx.lineTo(worldRight, 0);
        ctx.stroke();
      } else {
        // Draw grid in screen space (fixed, not affected by shake)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1;
        const gridSizeRender = 50;
        for (let x = 0; x <= CANVAS_WIDTH; x += gridSizeRender) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, CANVAS_HEIGHT);
          ctx.stroke();
        }
        for (let y = 0; y <= CANVAS_HEIGHT; y += gridSizeRender) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(CANVAS_WIDTH, y);
          ctx.stroke();
        }
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(CANVAS_WIDTH / 2, 0);
        ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_HEIGHT / 2);
        ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT / 2);
        ctx.stroke();
      }

      // Apply camera shake to game objects only (on top of zoom transform)
      ctx.save();
      ctx.translate(
        playerRef.current.shakeOffset.x,
        playerRef.current.shakeOffset.y,
      );

      // 플레이어 공격 범위 표시 (항상 부채꼴 표시, 원형은 showAttackRange로 제어)
      const playerRange = playerBasicAttackRef.current?.range || plConfig.attackRange;
      const playerWidth = playerBasicAttackRef.current?.width || plConfig.attackWidth || 90;
      
      drawPlayerAttackRange(
        ctx,
        playerRef.current.position,
        mousePositionRef.current,
        playerRange,
        playerWidth,
        showAttackRange
      );

      // 몬스터 공격 범위 표시 (항상 부채꼴 표시, 원형은 showAttackRange로 제어)
      monstersRef.current.forEach((monster) => {
        if (monster.isDead) return;

        const monsterRange = monster.basicAttack?.range || monConfig.attackRange;
        const monsterWidth = monster.basicAttack?.width || monConfig.attackWidth || 90;

        drawMonsterAttackRange(
          ctx,
          monster.position,
          playerRef.current.position,
          monsterRange,
          monsterWidth,
          showAttackRange
        );
      });

      // Draw player (blue circle with white stroke and scale animation)
      const finalPlayerRadius =
        (plConfig.size / 2) * playerRef.current.playerScale;

      ctx.fillStyle = "#4a9eff";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        playerRef.current.position.x,
        playerRef.current.position.y,
        finalPlayerRadius,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.stroke();

      // Draw player HP bar
      const playerHpBarWidth = plConfig.size * 1.5;
      const playerHpBarHeight = 5;
      const playerHpPercent =
        playerRef.current.stats.hp /
        playerRef.current.stats.maxHp;

      // HP bar background
      ctx.fillStyle = "#374151";
      ctx.fillRect(
        playerRef.current.position.x - playerHpBarWidth / 2,
        playerRef.current.position.y - plConfig.size / 2 - 20,
        playerHpBarWidth,
        playerHpBarHeight,
      );
      // HP bar fill (red)
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(
        playerRef.current.position.x - playerHpBarWidth / 2,
        playerRef.current.position.y - plConfig.size / 2 - 20,
        playerHpBarWidth * playerHpPercent,
        playerHpBarHeight,
      );

      // Draw player SP bar (if level system enabled)
      if (playerLevelConfig) {
        const playerSpPercent = spConfig.current / spConfig.max;

        // SP bar background
        ctx.fillStyle = "#374151";
        ctx.fillRect(
          playerRef.current.position.x - playerHpBarWidth / 2,
          playerRef.current.position.y - plConfig.size / 2 - 13,
          playerHpBarWidth,
          playerHpBarHeight,
        );
        // SP bar fill (blue)
        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(
          playerRef.current.position.x - playerHpBarWidth / 2,
          playerRef.current.position.y - plConfig.size / 2 - 13,
          playerHpBarWidth * playerSpPercent,
          playerHpBarHeight,
        );
      }

      // Draw player level above character
      if (playerLevelConfig) {
        const playerStats = calculateLevelStats(
          currentPlayerLevel,
        );
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.textAlign = "center";
        ctx.font = "bold 14px sans-serif";
        const levelText = `LV.${playerStats.level}`;
        ctx.strokeText(
          levelText,
          playerRef.current.position.x,
          playerRef.current.position.y - plConfig.size / 2 - 28,
        );
        ctx.fillText(
          levelText,
          playerRef.current.position.x,
          playerRef.current.position.y - plConfig.size / 2 - 28,
        );
      }

      // Draw buff aura around player
      if (activeBuffs.length > 0) {
        const time = Date.now() / 1000;
        ctx.save();

        // Pulsating golden aura
        const pulseSize = 3 + Math.sin(time * 4) * 2;
        ctx.globalAlpha = 0.3 + Math.sin(time * 4) * 0.1;
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 4;
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(
          playerRef.current.position.x,
          playerRef.current.position.y,
          plConfig.size / 2 + pulseSize,
          0,
          Math.PI * 2,
        );
        ctx.stroke();

        // Second outer ring
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
          playerRef.current.position.x,
          playerRef.current.position.y,
          plConfig.size / 2 + pulseSize + 8,
          0,
          Math.PI * 2,
        );
        ctx.stroke();

        ctx.restore();
      }

      // Draw heal wave effect
      if (healEffectTime > 0) {
        const elapsed = Date.now() - healEffectTime;
        const duration = 800; // 0.8 seconds

        if (elapsed < duration) {
          const progress = elapsed / duration;
          const radius = plConfig.size / 2 + progress * 80; // Expand outward
          const alpha = 1 - progress; // Fade out

          ctx.save();
          ctx.globalAlpha = alpha * 0.5;
          ctx.strokeStyle = healEffectColor;
          ctx.lineWidth = 6;
          ctx.shadowColor = healEffectColor;
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(
            playerRef.current.position.x,
            playerRef.current.position.y,
            radius,
            0,
            Math.PI * 2,
          );
          ctx.stroke();

          // Second wave slightly behind (ensure radius is positive)
          const secondRadius = Math.max(5, radius - 15);
          ctx.globalAlpha = alpha * 0.3;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(
            playerRef.current.position.x,
            playerRef.current.position.y,
            secondRadius,
            0,
            Math.PI * 2,
          );
          ctx.stroke();

          ctx.restore();
        } else {
          setHealEffectTime(0); // Reset
        }
      }

      // Draw monsters (red circles)
      monstersRef.current.forEach((monster) => {
        if (monster.isDead) {
          // Draw respawn timer
          const timerText = `${(monster.respawnTimer / 1000).toFixed(1)}s`;
          ctx.fillStyle = "#94a3b8";
          ctx.font = "12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(
            timerText,
            monster.position.x,
            monster.position.y,
          );
          ctx.textAlign = "left";
          return;
        }

        const aiStateColors = {
          IDLE: "#94a3b8",
          CHASE: "#f59e0b",
          ATTACK: "#ef4444",
          RETREAT: "#3b82f6",
        };

        // Draw monster circle with knockback effect
        const timeSinceKnockback =
          Date.now() - monster.knockbackTime;
        const isKnockedBack = timeSinceKnockback < 300; // Show effect for 300ms

        ctx.save();

        if (isKnockedBack) {
          // Add white flash and shake effect
          const flashIntensity = 1 - timeSinceKnockback / 300;
          ctx.shadowColor = "#ffffff";
          ctx.shadowBlur = 15 * flashIntensity;

          // Use monster color but add white flash
          const baseColor = monster.color || "#ef4444";
          const rgb = baseColor
            .match(/\w\w/g)
            ?.map((x) => parseInt(x, 16)) || [239, 68, 68];
          const r = rgb[0];
          const g =
            rgb[1] +
            Math.floor((255 - rgb[1]) * flashIntensity * 0.5);
          const b =
            rgb[2] +
            Math.floor((255 - rgb[2]) * flashIntensity * 0.5);
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        } else {
          ctx.fillStyle = monster.color || "#ef4444";
        }

        ctx.beginPath();
        ctx.arc(
          monster.position.x,
          monster.position.y,
          monConfig.size / 2,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        ctx.restore();

        // Draw monster level above character
        if (monsterLevelConfig) {
          const monsterStats = calculateLevelStats(
            currentMonsterLevel,
          );
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 3;
          ctx.textAlign = "center";
          ctx.font = "bold 12px sans-serif";
          const levelText = `LV.${monsterStats.level}`;
          ctx.strokeText(
            levelText,
            monster.position.x,
            monster.position.y - monConfig.size / 2 - 15,
          );
          ctx.fillText(
            levelText,
            monster.position.x,
            monster.position.y - monConfig.size / 2 - 15,
          );
        }

        // Draw monster HP bar
        const monsterHpBarWidth = monConfig.size;
        const monsterHpBarHeight = 4;
        const monsterHpPercent =
          monster.stats.hp / monster.stats.maxHp;
        ctx.fillStyle = "#374151";
        ctx.fillRect(
          monster.position.x - monsterHpBarWidth / 2,
          monster.position.y - monConfig.size / 2 - 10,
          monsterHpBarWidth,
          monsterHpBarHeight,
        );
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(
          monster.position.x - monsterHpBarWidth / 2,
          monster.position.y - monConfig.size / 2 - 10,
          monsterHpBarWidth * monsterHpPercent,
          monsterHpBarHeight,
        );

        // Draw monster name
        if (monster.name) {
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 3;
          ctx.textAlign = "center";
          ctx.font = "bold 11px sans-serif";
          ctx.strokeText(
            monster.name,
            monster.position.x,
            monster.position.y + monConfig.size / 2 + 20,
          );
          ctx.fillText(
            monster.name,
            monster.position.x,
            monster.position.y + monConfig.size / 2 + 20,
          );
        }

        // Draw melee attack arc when monster is attacking (기본 공격 range 사용)
        if (monster.isAttacking && monConfig.attackType === "melee") {
          const dx = playerRef.current.position.x - monster.position.x;
          const dy = playerRef.current.position.y - monster.position.y;
          const angleToPlayer = Math.atan2(dy, dx);
          
          // 기본 공격의 range와 width 사용
          const attackRange = monster.basicAttack?.range || monConfig.attackRange;
          const attackWidth = monster.basicAttack?.width || monConfig.attackWidth || 90;
          const meleeSwingArc = (attackWidth * Math.PI) / 180;

          ctx.save();
          ctx.globalAlpha = 0.4;
          const monsterAttackColor = monster.color || "#ef4444";
          ctx.fillStyle = monsterAttackColor + "60"; // Add transparency
          ctx.beginPath();
          ctx.moveTo(monster.position.x, monster.position.y);
          ctx.arc(
            monster.position.x,
            monster.position.y,
            attackRange,
            angleToPlayer - meleeSwingArc / 2,
            angleToPlayer + meleeSwingArc / 2,
          );
          ctx.closePath();
          ctx.fill();

          // Outer stroke
          ctx.strokeStyle = monsterAttackColor;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.6;
          ctx.stroke();

          ctx.restore();
        }

        // Draw AI state (아래로 이동)
        const aiStateLabels = {
          IDLE: "배회",
          CHASE: "추적",
          ATTACK: "공격",
          RETREAT: "후퇴",
        };
        ctx.fillStyle = aiStateColors[monster.aiState];
        ctx.font = "9px monospace";
        const aiText = aiStateLabels[monster.aiState];
        const textWidth = ctx.measureText(aiText).width;
        ctx.fillText(
          aiText,
          monster.position.x - textWidth / 2,
          monster.position.y + monConfig.size / 2 + 32,
        );
      });

      // Draw projectiles
      projectilesRef.current.forEach((projectile) => {
        // 안전성 체크: 유효한 값인지 확인
        if (
          !projectile ||
          !isFinite(projectile.position.x) ||
          !isFinite(projectile.position.y) ||
          !isFinite(projectile.size) ||
          projectile.size <= 0
        ) {
          return;
        }
        
        const fadeProgress = Math.min(
          1,
          (projectile.travelDistance - PROJECTILE_FADE_START) /
            (PROJECTILE_MAX_DISTANCE - PROJECTILE_FADE_START),
        );
        const opacity = Math.max(0, 1 - fadeProgress);

        // Draw homing target line (for visual feedback)
        if (
          projectile.isHoming &&
          projectile.owner === "player" &&
          projectile.targetId !== undefined
        ) {
          const targetMonster = monstersRef.current.find(
            (m) => m.id === projectile.targetId && !m.isDead,
          );
          if (targetMonster) {
            ctx.save();
            ctx.globalAlpha = opacity * 0.3;
            ctx.strokeStyle = "#a855f7";
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(
              projectile.position.x,
              projectile.position.y,
            );
            ctx.lineTo(
              targetMonster.position.x,
              targetMonster.position.y,
            );
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
          }
        }

        ctx.save();
        ctx.globalAlpha = opacity;

        // Homing projectiles have a different appearance
        if (
          projectile.isHoming &&
          projectile.owner === "player"
        ) {
          // Glowing purple/pink for homing missiles
          ctx.shadowColor = "#a855f7";
          ctx.shadowBlur = 15;
          ctx.fillStyle = "#a855f7";

          // Draw core
          ctx.beginPath();
          ctx.arc(
            projectile.position.x,
            projectile.position.y,
            projectile.size,
            0,
            Math.PI * 2,
          );
          ctx.fill();

          // Draw outer ring
          ctx.strokeStyle = "#ec4899";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(
            projectile.position.x,
            projectile.position.y,
            projectile.size + 2,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
        } else {
          // Normal projectiles
          ctx.fillStyle =
            projectile.owner === "player"
              ? "#3b82f6"
              : "#ef4444";
          ctx.beginPath();
          ctx.arc(
            projectile.position.x,
            projectile.position.y,
            projectile.size,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }

        ctx.restore();
      });

      // Render particles (새로운 이펙트 시스템 통합)
      renderNewParticles(ctx, skillParticlesRef.current, zoom, testMode);

      // Update damage texts
      const deltaMs = deltaTime * 1000;
      damageTextsRef.current = damageTextsRef.current.filter(text => {
        text.lifetime += deltaMs;
        return text.lifetime < text.maxLifetime;
      });

      // Render damage texts
      damageTextsRef.current.forEach(text => {
        const progress = text.lifetime / text.maxLifetime;
        const yOffset = -50 * progress; // 위로 이동
        const opacity = 1 - progress; // 페이드아웃
        
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.textAlign = 'center';
        
        if (text.isCritical) {
          // 크리티컬 데미지 표시
          const skillNameFontSize = testMode ? 12 / zoom : 12;
          const damageFontSize = testMode ? 16 / zoom : 16;
          
          // 스킬 이름 (위쪽, 작고 노란색)
          if (text.skillName) {
            ctx.font = `bold ${skillNameFontSize}px sans-serif`;
            ctx.fillStyle = '#fbbf24'; // 노란색
            ctx.fillText(text.skillName, text.x, text.y + yOffset - 10);
          }
          
          // 데미지 (빨간색, 외곽선 없음)
          ctx.font = `bold ${damageFontSize}px sans-serif`;
          ctx.fillStyle = '#ef4444'; // 빨간색
          ctx.fillText(text.damage.toString(), text.x, text.y + yOffset);
        }
        
        ctx.restore();
      });

      // ===== 기본 공격 범위 정보 (범위 UI와 스윙 애니메이션이 공유) =====
      const basicAttack = playerBasicAttackRef.current?.skill;
      const isRanged = basicAttack?.projectile.type !== 'none';
      const sharedAttackRange = basicAttack?.range || plConfig.attackRange;
      const sharedAttackWidth = basicAttack?.area || plConfig.attackWidth;
      const sharedAttackArc = (sharedAttackWidth * Math.PI) / 180;
      
      // 디버깅: 범위 UI 값 출력
      if (!isRanged && Math.random() < 0.01) {
        console.log('🔵 [Range UI] 범위 표시', {
          range: sharedAttackRange + 'px',
          area: sharedAttackWidth + '°'
        });
      }

      // Draw melee swing visual effect (기본 공격 스킬 이펙트 사용)
      if (playerRef.current.meleeSwingStart !== null) {
        const swingDuration = MELEE_SWING_DURATION;
        const swingProgress =
          (Date.now() - playerRef.current.meleeSwingStart) /
          swingDuration;

        if (swingProgress < 1) {
          const playerX = playerRef.current.position.x;
          const playerY = playerRef.current.position.y;
          const mouseX = mousePositionRef.current.x;
          const mouseY = mousePositionRef.current.y;
          const dx = mouseX - playerX;
          const dy = mouseY - playerY;
          const targetAngle = Math.atan2(dy, dx);

          // 공유 변수 사용 - 범위 UI와 정확히 일치
          const meleeRange = sharedAttackRange;
          const meleeSwingArc = sharedAttackArc;
          const startAngle = targetAngle - meleeSwingArc / 2;
          const swingOffset = meleeSwingArc * swingProgress;
          const currentAngle = startAngle + swingOffset;

          // Draw swing arc with trail effect
          ctx.save();
          const trailAlpha = 0.4 * (1 - swingProgress);
          ctx.globalAlpha = trailAlpha;
          
          // 기본 공격 스킬의 색상 사용
          const swingColor = basicAttack?.visual.color || "#ff6b6b";
          const gradient = ctx.createRadialGradient(
            playerX,
            playerY,
            0,
            playerX,
            playerY,
            meleeRange
          );
          gradient.addColorStop(0, swingColor + "80");
          gradient.addColorStop(1, swingColor + "00");
          ctx.fillStyle = gradient;
          
          ctx.beginPath();
          ctx.moveTo(playerX, playerY);
          ctx.arc(
            playerX,
            playerY,
            meleeRange,
            startAngle,
            currentAngle
          );
          ctx.closePath();
          ctx.fill();

          // Draw swing edge
          ctx.globalAlpha = 0.8 * (1 - swingProgress);
          ctx.strokeStyle = swingColor;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(
            playerX,
            playerY,
            meleeRange,
            currentAngle - 0.1,
            currentAngle + 0.1
          );
          ctx.stroke();

          ctx.restore();
        }
      }

      // Draw skill attack range indicator (스킬 사용 중일 때)
      if (playerRef.current.isSkilling && playerRef.current.skillSwingStart !== null) {
        // 현재 사용 중인 스킬 찾기 (가장 최근에 쿨다운이 시작된 스킬)
        let activeSkill: Skill | null = null;
        let maxCooldownRatio = 0;
        
        for (const skillSlot of activeSkills) {
          if (skillSlot.skill) {
            const cooldownRatio = skillSlot.skill.cooldown / skillSlot.skill.maxCooldown;
            // 쿨다운이 99% 이상인 스킬 = 방금 사용된 스킬
            if (cooldownRatio > maxCooldownRatio && cooldownRatio >= 0.99) {
              maxCooldownRatio = cooldownRatio;
              activeSkill = skillSlot.skill;
            }
          }
        }
        
        if (activeSkill) {
          const dx = mousePositionRef.current.x - playerRef.current.position.x;
          const dy = mousePositionRef.current.y - playerRef.current.position.y;
          const angle = Math.atan2(dy, dx);
          
          // 스킬 페이즈 결정
          const now = Date.now();
          const elapsed = now - playerRef.current.skillSwingStart;
          let skillPhase: 'windup' | 'execution' | 'recovery' = 'windup';
          
          if (elapsed < activeSkill.castTime) {
            skillPhase = 'windup';
          } else if (elapsed < activeSkill.castTime + MELEE_SWING_DURATION) {
            skillPhase = 'execution';
          } else {
            skillPhase = 'recovery';
          }
          
          // 스킬 범위 표시
          drawAttackRangeIndicator(ctx, {
            position: playerRef.current.position,
            angle,
            range: activeSkill.range,
            width: activeSkill.area,
            color: activeSkill.visual.color,
            showCircle: true,
            showCone: true,
            skillPhase,
          });
        }
      }

      // Draw aiming indicator based on attack type
      const mouseX = mousePositionRef.current.x;
      const mouseY = mousePositionRef.current.y;
      const playerX = playerRef.current.position.x;
      const playerY = playerRef.current.position.y;
      
      // 공유 변수 사용 (위에서 정의됨)
      // const sharedAttackRange, sharedAttackWidth, sharedAttackArc

      if (isRanged) {
        // Draw projectile cone/fan from player to mouse (공유 변수 사용)
        const dx = mouseX - playerX;
        const dy = mouseY - playerY;
        const angle = Math.atan2(dy, dx);
        const range = sharedAttackRange;
        const spreadAngle = sharedAttackArc / 2; // 공유 변수 사용

        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.moveTo(playerX, playerY);
        ctx.arc(
          playerX,
          playerY,
          range,
          angle - spreadAngle,
          angle + spreadAngle,
        );
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // Draw cone edges
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playerX, playerY);
        ctx.lineTo(
          playerX + Math.cos(angle - spreadAngle) * range,
          playerY + Math.sin(angle - spreadAngle) * range,
        );
        ctx.moveTo(playerX, playerY);
        ctx.lineTo(
          playerX + Math.cos(angle + spreadAngle) * range,
          playerY + Math.sin(angle + spreadAngle) * range,
        );
        ctx.stroke();
        ctx.restore();

        // Draw crosshair at mouse
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(mouseX - 12, mouseY);
        ctx.lineTo(mouseX - 4, mouseY);
        ctx.moveTo(mouseX + 4, mouseY);
        ctx.lineTo(mouseX + 12, mouseY);
        ctx.moveTo(mouseX, mouseY - 12);
        ctx.lineTo(mouseX, mouseY - 4);
        ctx.moveTo(mouseX, mouseY + 4);
        ctx.lineTo(mouseX, mouseY + 12);
        ctx.stroke();
      } else if (
        !isRanged &&
        playerRef.current.meleeSwingStart === null
      ) {
        // Show static melee preview when not attacking (공유 변수 사용)
        const dx = mouseX - playerX;
        const dy = mouseY - playerY;
        const targetAngle = Math.atan2(dy, dx);
        
        // 공유 변수 사용 - 스윙 애니메이션과 정확히 일치
        const meleeRange = sharedAttackRange;
        const meleeSwingArc = sharedAttackArc;

        ctx.save();
        ctx.globalAlpha = 0.3;
        // 기본 공격 스킬의 색상 사용
        const attackColor = basicAttack?.visual.color || "#fee2e2";
        ctx.fillStyle = attackColor + "40"; // 25% opacity
        ctx.beginPath();
        ctx.moveTo(playerX, playerY);
        ctx.arc(
          playerX,
          playerY,
          meleeRange,
          targetAngle - meleeSwingArc / 2,
          targetAngle + meleeSwingArc / 2,
        );
        ctx.closePath();
        ctx.fill();
        
        // 외곽선 추가
        ctx.strokeStyle = attackColor;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // End camera shake - restore context for UI elements
      ctx.restore();

      // Restore zoom/camera transform (both testMode and non-testMode have one save)
      ctx.restore();

      // Draw FPS (hide in test mode) - UI elements are not affected by shake
      if (!testMode) {
        const fpsColor =
          fps >= 55
            ? "#4ade80"
            : fps >= 30
              ? "#facc15"
              : "#f87171";
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(10, CANVAS_HEIGHT - 35, 80, 25);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "12px monospace";
        ctx.fillText("FPS:", 15, CANVAS_HEIGHT - 18);
        ctx.fillStyle = fpsColor;
        ctx.fillText(String(fps), 50, CANVAS_HEIGHT - 18);

        // Draw HUD (top-right stats)
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(
          CANVAS_WIDTH - 200,
          10,
          190,
          playerLevelConfig ? 140 : 80,
        );
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.font = "14px sans-serif";

        // Player HP
        ctx.fillText(
          `HP: ${Math.round(playerRef.current.stats.hp)}/${playerRef.current.stats.maxHp}`,
          CANVAS_WIDTH - 190,
          32,
        );

        // SP Bar (if level system enabled)
        if (playerLevelConfig) {
          const spPercent = spConfig.current / spConfig.max;
          ctx.fillText(
            `SP: ${Math.round(spConfig.current)}/${spConfig.max}`,
            CANVAS_WIDTH - 190,
            52,
          );

          // SP bar visualization
          const spBarWidth = 170;
          const spBarHeight = 8;
          ctx.fillStyle = "#374151";
          ctx.fillRect(
            CANVAS_WIDTH - 190,
            58,
            spBarWidth,
            spBarHeight,
          );
          ctx.fillStyle = "#3b82f6";
          ctx.fillRect(
            CANVAS_WIDTH - 190,
            58,
            spBarWidth * spPercent,
            spBarHeight,
          );

          // Level and EXP
          const playerStats = calculateLevelStats(
            currentPlayerLevel,
          );
          const expProgress = getLevelProgress(
            currentPlayerLevel,
          );
          ctx.fillStyle = "#ffffff";
          ctx.fillText(
            `레벨: ${playerStats.level}`,
            CANVAS_WIDTH - 190,
            82,
          );
          ctx.fillText(
            `EXP: ${currentPlayerLevel.currentExp}/${currentPlayerLevel.expToNextLevel}`,
            CANVAS_WIDTH - 190,
            102,
          );

          // EXP bar
          ctx.fillStyle = "#374151";
          ctx.fillRect(
            CANVAS_WIDTH - 190,
            108,
            spBarWidth,
            spBarHeight,
          );
          ctx.fillStyle = "#fbbf24";
          ctx.fillRect(
            CANVAS_WIDTH - 190,
            108,
            spBarWidth * (expProgress / 100),
            spBarHeight,
          );

          ctx.fillText(
            `처치: ${killCount}`,
            CANVAS_WIDTH - 190,
            132,
          );
        } else {
          ctx.fillText(
            `처치: ${killCount}`,
            CANVAS_WIDTH - 190,
            52,
          );
        }

        // Draw active buffs (top-left)
        if (activeBuffs.length > 0) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
          ctx.fillRect(
            10,
            10,
            180,
            20 + activeBuffs.length * 25,
          );
          ctx.fillStyle = "#fbbf24";
          ctx.font = "bold 14px sans-serif";
          ctx.fillText("활성 버프", 20, 28);

          activeBuffs.forEach((buff, index) => {
            ctx.fillStyle = "#ffffff";
            ctx.font = "12px sans-serif";
            const timeLeft = (
              buff.remainingTime / 1000
            ).toFixed(1);
            ctx.fillText(
              `${buff.name} (${timeLeft}s)`,
              20,
              50 + index * 25,
            );
          });
        }
      }

      // Draw start screen overlay (if game not started, in normal mode only)
      if (!isGameStarted && !testMode) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 32px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          `👥 ${title}`,
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 - 40,
        );

        ctx.font = "16px sans-serif";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(
          "아래 시작 버튼을 클릭하세요",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 + 10,
        );

        ctx.textAlign = "left";
      }

      // Draw game over overlay (if game over)
      if (isGameOverRef.current) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 32px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          "💀 게임 오버",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 - 40,
        );

        ctx.fillStyle = "#ffffff";
        ctx.font = "16px sans-serif";
        ctx.fillText(
          "플레이어가 사망했습니다",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2,
        );

        ctx.fillStyle = "#94a3b8";
        ctx.font = "14px sans-serif";
        ctx.fillText(
          `생존 시간: ${survivalTime.toFixed(1)}초`,
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 + 25,
        );
        ctx.fillText(
          `처치 수: ${killCount}`,
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 + 50,
        );

        ctx.textAlign = "left";
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    showAttackRange,
    survivalTime,
    killCount,
    propRespawnDelay,
    isGameStarted,
    activeBuffs,
    spConfig,
    activeSkills,
    activeItems,
    enableRespawn,
    playerLevelConfig,
    currentPlayerLevel,
    currentMonsterLevel,
    title,
    zoom,
    testMode,
  ]);

  // Test mode: render canvas only with zoom control
  if (testMode) {
    return (
      <div className="relative flex flex-col">
        {/* Zoom Control */}
        <div className="flex items-center gap-3 px-4 py-2 bg-slate-800">
          <Label
            htmlFor="zoom-slider"
            className="text-white text-sm whitespace-nowrap"
          >
            확대/축소:
          </Label>
          <span className="text-white text-sm font-mono w-14">
            {(zoom * 100).toFixed(0)}%
          </span>
          <Slider
            id="zoom-slider"
            min={0.5}
            max={5.0}
            step={0.1}
            value={[zoom]}
            onValueChange={(value) => handleZoomChange(value[0])}
            className="flex-1 [&_[role=slider]]:bg-white [&_[role=slider]]:border-slate-400 [&>span:first-child]:bg-slate-600 [&>span>span]:bg-white"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleZoomChange(1.0)}
            className="h-7 px-2 text-xs bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
          >
            1:1
          </Button>
        </div>

        {/* Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="bg-slate-900 cursor-crosshair block"
            style={{
              imageRendering: "crisp-edges",
              width: `${CANVAS_WIDTH}px`,
              height: `${CANVAS_HEIGHT}px`,
            }}
          />
        </div>
      </div>
    );
  }

  // Normal mode: render full UI
  return (
    <div
      ref={containerRef}
      className={
        isFullscreen
          ? "fixed inset-0 z-50 bg-slate-900 flex items-center justify-center p-4"
          : ""
      }
    >
      <Card
        className={
          isFullscreen
            ? "w-full h-full border-0 rounded-none"
            : ""
        }
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>{title}</CardTitle>
              {/* Simulator Mode Toggle */}
              <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 bg-white">
                <Button
                  size="sm"
                  variant={
                    simulatorMode === "1v1"
                      ? "default"
                      : "ghost"
                  }
                  onClick={() => {
                    setSimulatorMode("1v1");
                    setMonsterCount(1);
                    // 게임 재시작
                    if (isGameStarted) {
                      restartGame();
                    }
                  }}
                  className="h-7 px-3 text-xs"
                >
                  1:1 모드
                </Button>
                <Button
                  size="sm"
                  variant={
                    simulatorMode === "1vMany"
                      ? "default"
                      : "ghost"
                  }
                  onClick={() => {
                    setSimulatorMode("1vMany");
                    setMonsterCount(initialMonsterCount);
                    // 게임 재시작
                    if (isGameStarted) {
                      restartGame();
                    }
                  }}
                  className="h-7 px-3 text-xs"
                >
                  1:다 모드
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-yellow-100 text-yellow-800"
              >
                처치: {killCount}
              </Badge>
              <Badge
                variant={isGameOver ? "destructive" : "default"}
              >
                {isGameOver ? "게임 오버" : "플레이 중"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 relative">
          {/* Respawn Settings */}
          {showRespawnControls &&
            simulatorMode === "1vMany" && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-100 rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>
                      최대 몬스터 수: {monsterCount}
                    </Label>
                    {enableRespawn && (
                      <Badge
                        variant="secondary"
                        className="text-xs"
                      >
                        리스폰 활성화
                      </Badge>
                    )}
                    {!enableRespawn && (
                      <Badge
                        variant="outline"
                        className="text-xs"
                      >
                        리스폰 비활성화
                      </Badge>
                    )}
                  </div>
                  <Slider
                    value={[monsterCount]}
                    onValueChange={(v) => {
                      setMonsterCount(v[0]);
                      // Adjust monster array
                      const currentCount =
                        monstersRef.current.length;
                      if (v[0] > currentCount) {
                        const diff = v[0] - currentCount;
                        for (let i = 0; i < diff; i++) {
                          // 현재 설정에서 AI 패턴과 스킬 로드
                          const aiPatternConfig = currentDataRow
                            ? loadMonsterAIPattern(currentDataRow)
                            : defaultAIPatternConfig;
                          const aiConfig = currentDataRow
                            ? loadMonsterAI(currentDataRow)
                            : {
                                type: "aggressive" as const,
                                aggroRange: 300,
                                skillPriority: "damage" as const,
                              };
                          const monsterSkills = currentDataRow
                            ? loadMonsterSkills(currentDataRow)
                            : {
                                slot1: null,
                                slot2: null,
                                slot3: null,
                                slot4: null,
                              };
                          const monsterName =
                            currentDataRow?.monster_name || `몬스터 ${currentCount + i + 1}`;
                          const monsterColor =
                            currentDataRow?.monster_color || "#ff6b6b";
                            
                          monstersRef.current.push({
                            id: monsterIdRef.current++,
                            position: {
                              x:
                                Math.random() *
                                  (CANVAS_WIDTH - 100) +
                                50,
                              y:
                                Math.random() *
                                  (CANVAS_HEIGHT - 100) +
                                50,
                            },
                            stats: { ...defaultMonsterStats },
                            isAttacking: false,
                            attackCooldown: 0,
                            isDead: false,
                            aiState: "IDLE",
                            wanderTarget: null,
                            wanderCooldown: 0,
                            detectionRange:
                              aiPatternConfig.aggroRange || MONSTER_DETECTION_RANGE,
                            respawnTimer: 0,
                            velocity: { x: 0, y: 0 },
                            knockbackTime: 0,
                            name: monsterName,
                            color: monsterColor,
                            skills: monsterSkills,
                            aiConfig: aiConfig,
                            aiPatternConfig: aiPatternConfig,
                            sp: currentDataRow?.monster_sp || 100,
                            maxSP: currentDataRow?.monster_sp || 100,
                            currentSkill: null,
                            skillPhase: 'idle' as const,
                            skillPhaseStartTime: 0,
                            currentSkillTiming: undefined,
                          });
                        }
                      } else if (v[0] < currentCount) {
                        monstersRef.current =
                          monstersRef.current.slice(0, v[0]);
                      }
                    }}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                    disabled={!enableRespawn}
                  />
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>1</span>
                    <span>10</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>
                    리스폰 간격:{" "}
                    {(propRespawnDelay / 1000).toFixed(1)}초
                  </Label>
                  <div className="text-sm text-muted-foreground px-2">
                    (몬스터 데이터셋 뷰어에서 조정)
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>0.5초</span>
                    <span>10초</span>
                  </div>
                </div>
              </div>
            )}

          {/* Canvas */}
          <div
            className={`relative bg-slate-900 rounded-lg overflow-hidden ${isFullscreen ? "h-[calc(100vh-20rem)]" : ""}`}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="border border-slate-300 rounded-lg bg-slate-50 cursor-crosshair w-full h-auto"
              style={{
                imageRendering: "crisp-edges",
                maxWidth: "100%",
                height: "auto",
              }}
            />

            {!isGameStarted && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  onClick={startGame}
                  size="lg"
                  className="text-lg px-8 py-6"
                >
                  👥 게임 시작
                </Button>
              </div>
            )}

            {isGameOver && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  onClick={restartGame}
                  size="lg"
                  className="mt-32"
                >
                  재시작
                </Button>
              </div>
            )}

            {/* Skill & Item UI Overlay */}
            {(activeSkills.length > 0 ||
              activeItems.length > 0) &&
              isGameStarted &&
              !isGameOver && (
                <TooltipProvider delayDuration={1500}>
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-6">
                    {/* Skill Slots */}
                    {activeSkills.length > 0 && (
                      <div className="flex gap-2">
                        {activeSkills.map((slot) => {
                          const SkillIcon =
                            slot.skill &&
                            (LucideIcons as any)[
                              slot.skill.iconName
                            ]
                              ? (LucideIcons as any)[
                                  slot.skill.iconName
                                ]
                              : Swords;

                          return (
                            <Tooltip key={slot.slotNumber}>
                              <TooltipTrigger asChild>
                                <div className="relative w-16 h-16 bg-slate-900/80 rounded-lg border-2 border-slate-600 flex items-center justify-center cursor-pointer">
                                  {slot.skill ? (
                                    <>
                                      {/* Skill Icon */}
                                      <SkillIcon className="w-8 h-8 text-white" />

                                      {/* Key Binding */}
                                      <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs px-1 rounded-bl rounded-tr">
                                        {slot.keyBinding}
                                      </div>
                                      {/* Cooldown Overlay */}
                                      {slot.skill
                                        .isOnCooldown && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
                                          <span className="text-white text-sm">
                                            {(
                                              slot.skill
                                                .currentCooldown /
                                              1000
                                            ).toFixed(1)}
                                          </span>
                                        </div>
                                      )}
                                      {/* SP Cost */}
                                      <div className="absolute bottom-0 left-0 bg-blue-600 text-white text-xs px-1 rounded-br rounded-tl">
                                        {slot.skill.spCost}
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-slate-500 text-xs">
                                      {slot.keyBinding}
                                    </span>
                                  )}
                                </div>
                              </TooltipTrigger>
                              {slot.skill && (
                                <TooltipContent
                                  side="top"
                                  className="bg-slate-900 text-white border-purple-600"
                                >
                                  <div className="space-y-1">
                                    <div className="font-semibold">
                                      {slot.skill.name}
                                    </div>
                                    <div className="text-xs text-slate-300">
                                      {slot.skill.description}
                                    </div>
                                    <div className="text-xs text-blue-400">
                                      SP: {slot.skill.spCost}
                                    </div>
                                  </div>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          );
                        })}
                      </div>
                    )}

                    {/* Item Slots */}
                    {activeItems.length > 0 && (
                      <div className="flex gap-2">
                        {activeItems.map((slot) => {
                          const ItemIcon =
                            slot.item &&
                            (LucideIcons as any)[
                              slot.item.iconName
                            ]
                              ? (LucideIcons as any)[
                                  slot.item.iconName
                                ]
                              : Package;

                          return (
                            <Tooltip key={slot.slotNumber}>
                              <TooltipTrigger asChild>
                                <div className="relative w-16 h-16 bg-slate-900/80 rounded-lg border-2 border-yellow-600 flex items-center justify-center cursor-pointer">
                                  {slot.item ? (
                                    <>
                                      {/* Item Icon */}
                                      <ItemIcon className="w-8 h-8 text-white" />

                                      {/* Key Binding */}
                                      <div className="absolute top-0 right-0 bg-yellow-600 text-white text-xs px-1 rounded-bl rounded-tr">
                                        {slot.keyBinding}
                                      </div>
                                      {/* Cooldown Overlay */}
                                      {slot.item
                                        .isOnCooldown && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
                                          <span className="text-white text-sm">
                                            {(
                                              slot.item
                                                .currentCooldown /
                                              1000
                                            ).toFixed(1)}
                                          </span>
                                        </div>
                                      )}
                                      {/* Quantity */}
                                      <div className="absolute bottom-0 right-0 bg-green-600 text-white text-xs px-1 rounded-tl rounded-br">
                                        x{slot.item.quantity}
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-slate-500 text-xs">
                                      {slot.keyBinding}
                                    </span>
                                  )}
                                </div>
                              </TooltipTrigger>
                              {slot.item && (
                                <TooltipContent
                                  side="top"
                                  className="bg-slate-900 text-white border-yellow-600"
                                >
                                  <div className="space-y-1">
                                    <div className="font-semibold">
                                      {slot.item.name}
                                    </div>
                                    <div className="text-xs text-slate-300">
                                      {slot.item.description}
                                    </div>
                                    <div className="text-xs text-green-400">
                                      보유: {slot.item.quantity}
                                      개
                                    </div>
                                  </div>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TooltipProvider>
              )}
          </div>

          {/* Display Options & Fullscreen */}
          <div className="flex gap-4 p-4 bg-slate-100 rounded-lg items-center justify-between">
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="multi-attack-range"
                  checked={showAttackRange}
                  onCheckedChange={setShowAttackRange}
                />
                <Label htmlFor="multi-attack-range">
                  공격 범위 표시
                </Label>
              </div>
            </div>

            <Button
              onClick={toggleFullscreen}
              variant="outline"
              size="icon"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}