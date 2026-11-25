export declare function hasSkillReference<T>(
  id: unknown,
  skillSources: Record<string, T>[],
  allowLegacySlot?: boolean
): boolean;

export declare function hasCharacterTypeReference(
  id: unknown,
  typeIds: ReadonlySet<string>
): boolean;
