import { Dispatch, SetStateAction } from 'react';
import { CharacterConfig, CharacterType } from '../../lib/gameTypes';
import { LevelConfig } from '../../lib/levelSystem';
import { DataRow } from '../../lib/mockData';
import { BasicAttackSlot, Skill, SkillSlot } from '../../lib/skillSystem';

interface PlayerRowApplyParams {
  row: DataRow;
  skillConfigs: Record<string, Skill>;
  setPlayerLevelConfig: Dispatch<SetStateAction<LevelConfig>>;
  setPlayerConfig: Dispatch<SetStateAction<CharacterConfig>>;
  setPlayerBasicAttack: Dispatch<SetStateAction<BasicAttackSlot>>;
  setSkillSlots: Dispatch<SetStateAction<SkillSlot[]>>;
}

interface MonsterRowApplyParams {
  row: DataRow;
  skillConfigs: Record<string, Skill>;
  setMonsterLevelConfig: Dispatch<SetStateAction<LevelConfig>>;
  setMonsterConfig: Dispatch<SetStateAction<CharacterConfig>>;
  setMonsterBasicAttack: Dispatch<SetStateAction<BasicAttackSlot>>;
}

export function selectImportedRows(
  playerDataset: DataRow[],
  monsterDataset: DataRow[],
  currentTick: number
): { tick: number; playerRow?: DataRow; monsterRow?: DataRow; currentRow: DataRow | null } {
  const tick = playerDataset[currentTick] || monsterDataset[currentTick] ? currentTick : 0;
  const playerRow = playerDataset[tick];
  const monsterRow = monsterDataset[tick];
  return {
    tick,
    playerRow,
    monsterRow,
    currentRow: playerRow ? { ...playerRow, ...monsterRow } : monsterRow ? { ...monsterRow } : null,
  };
}

export function applyPlayerRowFromData({
  row,
  skillConfigs,
  setPlayerLevelConfig,
  setPlayerConfig,
  setPlayerBasicAttack,
  setSkillSlots,
}: PlayerRowApplyParams): void {
  if (row.player_size === undefined) return;

  if (row.player_level !== undefined) {
    setPlayerLevelConfig(prev => ({
      ...prev,
      currentLevel: row.player_level as number,
    }));
  }

  setPlayerConfig(prev => ({
    ...prev,
    size:
      row.player_size !== undefined ? { min: row.player_size, max: row.player_size } : prev.size,
    speed:
      row.player_speed !== undefined
        ? { min: row.player_speed, max: row.player_speed }
        : prev.speed,
    attack:
      row.player_attack !== undefined
        ? { min: row.player_attack, max: row.player_attack }
        : prev.attack,
    defense:
      row.player_defense !== undefined
        ? { min: row.player_defense, max: row.player_defense }
        : prev.defense,
    attackSpeed:
      row.player_attack_speed !== undefined
        ? { min: row.player_attack_speed, max: row.player_attack_speed }
        : prev.attackSpeed,
    accuracy:
      row.player_accuracy !== undefined
        ? { min: row.player_accuracy, max: row.player_accuracy }
        : prev.accuracy,
    criticalRate:
      row.player_critical_rate !== undefined
        ? { min: row.player_critical_rate, max: row.player_critical_rate }
        : prev.criticalRate,
    attackRange:
      row.player_attack_range !== undefined
        ? { min: row.player_attack_range, max: row.player_attack_range }
        : prev.attackRange,
    attackWidth:
      row.player_attack_width !== undefined
        ? { min: row.player_attack_width, max: row.player_attack_width }
        : prev.attackWidth,
    typeId: row.player_attack_type || prev.typeId,
    attackType: (row.player_attack_type as CharacterType) || prev.attackType,
  }));

  if (row.player_basic_attack_id) {
    const basicAttackSkill = skillConfigs[row.player_basic_attack_id as string];
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

  const newSkillSlots: SkillSlot[] = [];
  for (const i of [1, 2, 3, 4] as const) {
    const skillId = row[`player_skill_${i}_id`];
    if (skillId && Object.hasOwn(skillConfigs, skillId)) {
      const baseSkill = skillConfigs[skillId];
      const range = row[`player_skill_${i}_range`];
      const area = row[`player_skill_${i}_width`];
      const damageMultiplier = row[`player_skill_${i}_damage`];
      const cooldown = row[`player_skill_${i}_cooldown`];
      const spCost = row[`player_skill_${i}_sp_cost`];
      const castTime = row[`player_skill_${i}_cast_time`];
      const overrides: NonNullable<SkillSlot['overrides']> = {};
      if (range !== undefined) overrides.range = range;
      if (area !== undefined) overrides.area = area;
      if (damageMultiplier !== undefined) overrides.damageMultiplier = damageMultiplier;
      if (cooldown !== undefined) overrides.cooldown = cooldown;
      if (spCost !== undefined) overrides.spCost = spCost;
      if (castTime !== undefined) overrides.castTime = castTime;

      newSkillSlots.push({
        slotNumber: i,
        skill: {
          ...baseSkill,
          ...overrides,
          currentCooldown: 0,
          isOnCooldown: false,
        },
        overrides,
        keyBinding: i.toString(),
      });
    }
  }

  setSkillSlots(newSkillSlots);
}

export function applyMonsterRowFromData({
  row,
  skillConfigs,
  setMonsterLevelConfig,
  setMonsterConfig,
  setMonsterBasicAttack,
}: MonsterRowApplyParams): void {
  if (row.monster_size === undefined) return;

  if (row.monster_level !== undefined) {
    setMonsterLevelConfig(prev => ({
      ...prev,
      currentLevel: row.monster_level as number,
    }));
  }

  setMonsterConfig(prev => ({
    ...prev,
    size:
      row.monster_size !== undefined ? { min: row.monster_size, max: row.monster_size } : prev.size,
    speed:
      row.monster_speed !== undefined
        ? { min: row.monster_speed, max: row.monster_speed }
        : prev.speed,
    attack:
      row.monster_attack !== undefined
        ? { min: row.monster_attack, max: row.monster_attack }
        : prev.attack,
    defense:
      row.monster_defense !== undefined
        ? { min: row.monster_defense, max: row.monster_defense }
        : prev.defense,
    attackSpeed:
      row.monster_attack_speed !== undefined
        ? { min: row.monster_attack_speed, max: row.monster_attack_speed }
        : prev.attackSpeed,
    accuracy:
      row.monster_accuracy !== undefined
        ? { min: row.monster_accuracy, max: row.monster_accuracy }
        : prev.accuracy,
    criticalRate:
      row.monster_critical_rate !== undefined
        ? { min: row.monster_critical_rate, max: row.monster_critical_rate }
        : prev.criticalRate,
    attackRange:
      row.monster_attack_range !== undefined
        ? { min: row.monster_attack_range, max: row.monster_attack_range }
        : prev.attackRange,
    attackWidth:
      row.monster_attack_width !== undefined
        ? { min: row.monster_attack_width, max: row.monster_attack_width }
        : prev.attackWidth,
    typeId: row.monster_attack_type || prev.typeId,
    attackType: (row.monster_attack_type as CharacterType) || prev.attackType,
  }));

  if (row.monster_basic_attack_id) {
    const basicAttackSkill = skillConfigs[row.monster_basic_attack_id as string];
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
