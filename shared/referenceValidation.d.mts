export declare const playerDatasetSkillFields: readonly [
  'player_basic_attack_id', 'player_skill_1_id', 'player_skill_2_id',
  'player_skill_3_id', 'player_skill_4_id'
];
export declare const monsterDatasetSkillFields: readonly [
  'monster_basic_attack_id', 'monster_skill_1_id', 'monster_skill_2_id',
  'monster_skill_3_id', 'monster_skill_4_id'
];

export declare function hasSkillReference<T>(
  id: unknown,
  skillSources: Record<string, T>[],
  allowLegacySlot?: boolean
): boolean;

export declare function hasCharacterTypeReference(
  id: unknown,
  typeIds: ReadonlySet<string>
): boolean;
