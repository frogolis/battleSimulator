export const playerDatasetSkillFields = [
  'player_basic_attack_id',
  'player_skill_1_id',
  'player_skill_2_id',
  'player_skill_3_id',
  'player_skill_4_id',
];

export const monsterDatasetSkillFields = [
  'monster_basic_attack_id',
  'monster_skill_1_id',
  'monster_skill_2_id',
  'monster_skill_3_id',
  'monster_skill_4_id',
];

export function hasSkillReference(id, skillSources, allowLegacySlot = false) {
  if (typeof id !== 'string' || id.trim() === '') return false;
  if (skillSources.some(skills => Object.hasOwn(skills, id))) return true;
  return allowLegacySlot && /^skill[1-4]$/.test(id);
}

export function hasCharacterTypeReference(id, typeIds) {
  return typeof id === 'string' && id.trim() !== '' && typeIds.has(id);
}
