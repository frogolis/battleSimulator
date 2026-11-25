export function hasSkillReference(id, skillSources, allowLegacySlot = false) {
  if (typeof id !== 'string' || id.trim() === '') return false;
  if (skillSources.some(skills => Object.hasOwn(skills, id))) return true;
  return allowLegacySlot && /^skill[1-4]$/.test(id);
}

export function hasCharacterTypeReference(id, typeIds) {
  return typeof id === 'string' && id.trim() !== '' && typeIds.has(id);
}
