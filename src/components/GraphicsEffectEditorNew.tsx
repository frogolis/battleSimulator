/**
 * 새로운 5가지 이펙트 타입을 위한 이펙트 에디터
 */

import { ArrowDown, ArrowUp, Layers, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EFFECT_PRESETS, EffectPreset, EffectType } from '../lib/skillSystem';
import { EffectPreviewCanvasNew } from './graphics-effects/EffectPreviewCanvasNew';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';

interface GraphicsEffectEditorNewProps {
  onPresetSelect?: (preset: EffectPreset) => void;
  onPresetCustomize?: (preset: EffectPreset) => void;
  customPresets?: EffectPreset[];
  onCustomPresetsChange?: (presets: EffectPreset[]) => void;
  onAddToSkill?: (preset: EffectPreset) => void;
  onReplaceSkillEffects?: (preset: EffectPreset) => void;
  skillEffects?: EffectPreset[];
  onSkillEffectsChange?: (effects: EffectPreset[]) => void;
  showPreview?: boolean;
  selectedPresetKey?: string;
}

interface LayerSettingsProps {
  effect: EffectPreset;
  onChange: (updates: Partial<EffectPreset>) => void;
  onReplace: (effect: EffectPreset) => void;
}

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className='grid items-center gap-3 py-1.5'
      style={{ gridTemplateColumns: '120px minmax(0, 1fr)' }}
    >
      <Label className='text-xs font-medium text-slate-700'>{label}</Label>
      <div className='min-w-0'>{children}</div>
    </div>
  );
}

function PropertyGroup({
  label,
  onRemove,
  children,
}: {
  label: string;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className='mt-2 border-t border-slate-200 pt-2'>
      <div className='mb-1 flex items-center justify-between'>
        <p className='text-[10px] font-semibold text-slate-500'>{label}</p>
        <button type='button' title={`${label} 속성 삭제`} onClick={onRemove} className='rounded p-1 text-red-600 hover:bg-red-50'>
          <Trash2 className='h-3.5 w-3.5' />
        </button>
      </div>
      {children}
    </div>
  );
}

function LayerSettings({ effect, onChange, onReplace }: LayerSettingsProps) {
  const supportsSecondaryColor = effect.effectType === 'trail' || effect.effectType === 'glow';
  const numberFields = {
    projectile: [
      ['투사체 개수', 'projectileCount', 1, 20, 1],
      ['투사체 속도', 'projectileSpeed', 10, undefined, 10],
      ['투사체 크기', 'projectileSize', 1, undefined, 1],
      ['수명(ms)', 'projectileLifetime', 100, undefined, 50],
      ['확산 각도', 'spreadAngle', 0, undefined, 0.1],
    ],
    trail: [
      ['파티클 수', 'trailParticleCount', 1, 100, 1],
      ['길이', 'trailLength', 1, undefined, 1],
      ['두께', 'trailWidth', 1, undefined, 1],
      ['감쇠 속도', 'trailFadeSpeed', 0.1, undefined, 0.1],
      ['호 각도', 'trailArcAngle', 0, undefined, 0.1],
    ],
    lightning: [
      ['세그먼트', 'lightningSegments', 1, 50, 1],
      ['지터', 'lightningJitter', 0, undefined, 1],
      ['갈라짐 확률', 'lightningForkChance', 0, 1, 0.05],
    ],
    ring: [
      ['반지름', 'ringRadius', 1, undefined, 1],
      ['확장 속도', 'ringExpansionSpeed', 1, undefined, 10],
      ['링 개수', 'ringCount', 1, 10, 1],
      ['링 간격(ms)', 'ringInterval', 0, undefined, 50],
    ],
    glow: [
      ['반지름', 'glowRadius', 1, undefined, 1],
      ['파티클 수', 'glowParticleCount', 1, 100, 1],
      ['상승 속도', 'glowRiseSpeed', 1, undefined, 5],
      ['감쇠 속도', 'glowFadeSpeed', 0.1, undefined, 0.1],
    ],
  } as const;
  const fields = numberFields[effect.effectType];
  const typePropertyKeys = {
    projectile: ['projectilePattern', 'projectileCount', 'projectileSpeed', 'projectileSize', 'projectileLifetime', 'isHoming', 'spreadAngle'],
    trail: ['trailType', 'trailParticleCount', 'trailLength', 'trailWidth', 'trailFadeSpeed', 'trailArcAngle'],
    lightning: ['lightningSegments', 'lightningJitter', 'lightningForkChance'],
    ring: ['ringRadius', 'ringExpansionSpeed', 'ringCount', 'ringInterval'],
    glow: ['glowRadius', 'glowParticleCount', 'glowRiseSpeed', 'glowFadeSpeed'],
  } as const;
  const activeTypeKeys = typePropertyKeys[effect.effectType];
  const hasTypeProperties = activeTypeKeys.some(key => effect[key] !== undefined);
  const shapePropertyKeys = ['shapeScaleX', 'shapeScaleY', 'shapeRotation', 'shapeOutlineWidth', 'shapeCornerRadius', 'starPoints', 'starInnerRatio'] as const;
  const hasShapeProperties = shapePropertyKeys.some(key => effect[key] !== undefined);
  const removeProperties = (keys: readonly string[]) => {
    const nextEffect = { ...effect } as Record<string, unknown>;
    keys.forEach(key => delete nextEffect[key]);
    onReplace(nextEffect as EffectPreset);
  };
  const restoreTypeProperties = () => {
    const template = Object.values(EFFECT_PRESETS).find(preset => preset.effectType === effect.effectType);
    if (template) onReplace({ ...template, ...effect });
  };

  return (
    <div className='border-t border-slate-300 bg-white px-3 py-1 text-slate-900'>
      <ControlRow label='이펙트 이름'><Input value={effect.name} onChange={event => onChange({ name: event.target.value })} className='h-8 border-slate-300 bg-white text-slate-900' /></ControlRow>
      <ControlRow label='설명'><Input value={effect.description} onChange={event => onChange({ description: event.target.value })} className='h-8 border-slate-300 bg-white text-slate-900' /></ControlRow>
      <ControlRow label='주 색상'><Input type='color' value={effect.color} onChange={event => onChange({ color: event.target.value })} className='h-8 w-full border-slate-300 bg-white' /></ControlRow>
      {supportsSecondaryColor && <ControlRow label='보조 색상'><Input type='color' value={effect.secondaryColor} onChange={event => onChange({ secondaryColor: event.target.value })} className='h-8 w-full border-slate-300 bg-white' /></ControlRow>}
      <ControlRow label='글로우 강도'><Input type='number' min={0} max={1} step={0.1} value={effect.glowIntensity} onChange={event => onChange({ glowIntensity: Math.max(0, Math.min(1, Number(event.target.value) || 0)) })} className='h-8 border-slate-300 bg-white text-slate-900' /></ControlRow>
      <ControlRow label='텍스처'><Select value={effect.particleTexture} onValueChange={value => onChange({ particleTexture: value as EffectPreset['particleTexture'] })}><SelectTrigger className='h-8 border-slate-300 bg-white text-xs text-slate-900'><SelectValue /></SelectTrigger><SelectContent><SelectItem value='circle'>circle</SelectItem><SelectItem value='star'>star</SelectItem><SelectItem value='square'>square</SelectItem><SelectItem value='diamond'>diamond</SelectItem><SelectItem value='spark'>spark</SelectItem></SelectContent></Select></ControlRow>
      {hasShapeProperties ? <PropertyGroup label='형태 변형' onRemove={() => removeProperties(shapePropertyKeys)}><ControlRow label='가로 비율'><Input type='number' min={0.1} max={5} step={0.1} value={effect.shapeScaleX ?? 1} onChange={event => onChange({ shapeScaleX: Math.max(0.1, Number(event.target.value) || 1) })} className='h-8 border-slate-300 bg-white text-slate-900' /></ControlRow><ControlRow label='세로 비율'><Input type='number' min={0.1} max={5} step={0.1} value={effect.shapeScaleY ?? 1} onChange={event => onChange({ shapeScaleY: Math.max(0.1, Number(event.target.value) || 1) })} className='h-8 border-slate-300 bg-white text-slate-900' /></ControlRow><ControlRow label='회전 (도)'><Input type='number' min={0} max={360} step={1} value={effect.shapeRotation ?? 0} onChange={event => onChange({ shapeRotation: Number(event.target.value) || 0 })} className='h-8 border-slate-300 bg-white text-slate-900' /></ControlRow><ControlRow label='외곽선 두께'><Input type='number' min={0} max={20} step={1} value={effect.shapeOutlineWidth ?? 0} onChange={event => onChange({ shapeOutlineWidth: Math.max(0, Number(event.target.value) || 0) })} className='h-8 border-slate-300 bg-white text-slate-900' /></ControlRow>{effect.particleTexture === 'square' && <ControlRow label='모서리 둥글기'><Input type='number' min={0} max={100} step={1} value={effect.shapeCornerRadius ?? 0} onChange={event => onChange({ shapeCornerRadius: Math.max(0, Number(event.target.value) || 0) })} className='h-8 border-slate-300 bg-white text-slate-900' /></ControlRow>}{effect.particleTexture === 'star' && <><ControlRow label='별 꼭짓점'><Input type='number' min={3} max={12} step={1} value={effect.starPoints ?? 5} onChange={event => onChange({ starPoints: Math.max(3, Math.round(Number(event.target.value) || 5)) })} className='h-8 border-slate-300 bg-white text-slate-900' /></ControlRow><ControlRow label='별 안쪽 비율'><Input type='number' min={0.1} max={0.9} step={0.05} value={effect.starInnerRatio ?? 0.5} onChange={event => onChange({ starInnerRatio: Math.max(0.1, Math.min(0.9, Number(event.target.value) || 0.5)) })} className='h-8 border-slate-300 bg-white text-slate-900' /></ControlRow></>}</PropertyGroup> : <button type='button' onClick={() => onChange({ shapeScaleX: 1, shapeScaleY: 1, shapeRotation: 0, shapeOutlineWidth: 0 })} className='mt-2 text-xs text-blue-700 hover:underline'>+ 형태 변형 속성 추가</button>}
      {hasTypeProperties ? <PropertyGroup label={`${effect.effectType} 동작`} onRemove={() => removeProperties(activeTypeKeys)}>{(effect.effectType === 'projectile' || effect.effectType === 'trail') && <ControlRow label={effect.effectType === 'projectile' ? '발사 패턴' : '궤적 형태'}><Select value={effect.effectType === 'projectile' ? effect.projectilePattern : effect.trailType} onValueChange={value => onChange(effect.effectType === 'projectile' ? { projectilePattern: value as EffectPreset['projectilePattern'] } : { trailType: value as EffectPreset['trailType'] })}><SelectTrigger className='h-8 border-slate-300 bg-white text-xs text-slate-900'><SelectValue /></SelectTrigger><SelectContent>{effect.effectType === 'projectile' ? <><SelectItem value='directional'>방향</SelectItem><SelectItem value='radial'>방사</SelectItem><SelectItem value='cone'>부채꼴</SelectItem></> : <><SelectItem value='slash'>베기</SelectItem><SelectItem value='thrust'>찌르기</SelectItem><SelectItem value='spin'>회전</SelectItem></>}</SelectContent></Select></ControlRow>}{effect.effectType === 'projectile' && <ControlRow label='유도'><Switch checked={!!effect.isHoming} onCheckedChange={isHoming => onChange({ isHoming })} /></ControlRow>}{fields.map(([label, key, min, max, step]) => <ControlRow key={key} label={label}><Input type='number' min={min} max={max} step={step} value={effect[key] ?? min} onChange={event => onChange({ [key]: Math.max(min, Number(event.target.value) || min) } as Partial<EffectPreset>)} className='h-8 border-slate-300 bg-white text-slate-900' /></ControlRow>)}</PropertyGroup> : <button type='button' onClick={restoreTypeProperties} className='mt-2 text-xs text-blue-700 hover:underline'>+ {effect.effectType} 동작 속성 추가</button>}
      <ControlRow label='반복 횟수'><Input type='number' min={1} value={effect.repeatCount ?? 1} onChange={event => onChange({ repeatCount: Math.max(1, Number(event.target.value) || 1) })} className='h-8 border-slate-300 bg-white text-slate-900' /></ControlRow>
      <ControlRow label='반복 간격(ms)'><Input type='number' min={0} value={effect.repeatInterval ?? 0} onChange={event => onChange({ repeatInterval: Math.max(0, Number(event.target.value) || 0) })} className='h-8 border-slate-300 bg-white text-slate-900' /></ControlRow>
    </div>
  );
}

export function GraphicsEffectEditorNew({
  onPresetSelect,
  onPresetCustomize,
  customPresets = [],
  onCustomPresetsChange,
  onAddToSkill,
  onReplaceSkillEffects,
  skillEffects = [],
  onSkillEffectsChange,
  showPreview = true,
  selectedPresetKey: selectedPresetKeyProp,
}: GraphicsEffectEditorNewProps) {
  const availablePresets = [...Object.values(EFFECT_PRESETS), ...customPresets];
  const findPreset = (presetId: string) =>
    availablePresets.find(preset => preset.id === presetId);
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>(
    selectedPresetKeyProp && findPreset(selectedPresetKeyProp)
      ? selectedPresetKeyProp
      : 'projectile_fireball'
  );
  const [editedPreset, setEditedPreset] = useState<EffectPreset>(
    findPreset(selectedPresetKey) ?? EFFECT_PRESETS.projectile_fireball
  );
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number | null>(null);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  const selectedPreset = editedPreset;
  const isCustomPreset = customPresets.some(preset => preset.id === selectedPreset.id);
  const isCompact = true;
  const isEditingLayer = selectedLayerIndex !== null;
  const selectedLayer =
    selectedLayerIndex === null ? undefined : skillEffects[selectedLayerIndex];
  const previewEffects =
    selectedLayerIndex === null
      ? [selectedPreset]
      : skillEffects.map((effect, index) => (index === selectedLayerIndex ? selectedPreset : effect));

  useEffect(() => {
    const preset = selectedPresetKeyProp ? findPreset(selectedPresetKeyProp) : undefined;
    if (preset) {
      setSelectedPresetKey(selectedPresetKeyProp);
      setEditedPreset(preset);
    }
  }, [selectedPresetKeyProp, customPresets]);

  useEffect(() => {
    if (EFFECT_PRESETS[selectedPresetKey]) {
      setEditedPreset(EFFECT_PRESETS[selectedPresetKey]);
    }
  }, [selectedPresetKey]);

  useEffect(() => {
    if (selectedLayerIndex === null) return;
    const layer = skillEffects[selectedLayerIndex];
    if (!layer) {
      setSelectedLayerIndex(null);
      return;
    }
    setEditedPreset(layer);
  }, [selectedLayerIndex, skillEffects]);

  const handlePresetSelect = (presetKey: string) => {
    setSelectedPresetKey(presetKey);
    setSelectedLayerIndex(null);
    const preset = findPreset(presetKey);
    if (preset && onPresetSelect) {
      onPresetSelect(preset);
    }
  };

  const commitPreset = (nextPreset: EffectPreset) => {
    setEditedPreset(nextPreset);
    if (customPresets.some(preset => preset.id === nextPreset.id)) {
      onCustomPresetsChange?.(
        customPresets.map(preset => (preset.id === nextPreset.id ? nextPreset : preset))
      );
    }
    if (selectedLayerIndex !== null) {
      onSkillEffectsChange?.(
        skillEffects.map((effect, index) => (index === selectedLayerIndex ? nextPreset : effect))
      );
    }
    onPresetCustomize?.(nextPreset);
  };

  const updatePreset = (updates: Partial<EffectPreset>) => {
    const nextPreset = {
      ...selectedPreset,
      ...updates,
    };
    commitPreset(nextPreset);
  };

  const selectLayer = (index: number) => {
    const effect = skillEffects[index];
    if (!effect) return;
    setSelectedLayerIndex(index);
    setSelectedPresetKey(effect.id);
    setEditedPreset(effect);
  };

  const removeLayer = (index: number) => {
    const nextEffects = skillEffects.filter((_, effectIndex) => effectIndex !== index);
    onSkillEffectsChange?.(nextEffects);
    setSelectedLayerIndex(nextEffects.length === 0 ? null : Math.min(index, nextEffects.length - 1));
  };

  const addLayer = (template?: EffectPreset) => {
    const newLayer: EffectPreset = template
      ? {
          ...template,
          id: `layer_${Date.now()}`,
          name: `${template.name} 레이어`,
        }
      : {
          ...EFFECT_PRESETS.projectile_fireball,
          id: `layer_${Date.now()}`,
          name: '새 이펙트 레이어',
          description: '직접 구성한 이펙트 레이어',
        };
    const nextEffects = [...skillEffects, newLayer];
    onSkillEffectsChange?.(nextEffects);
    setSelectedLayerIndex(nextEffects.length - 1);
    setSelectedPresetKey(newLayer.id);
    setEditedPreset(newLayer);
    setIsCreateMenuOpen(false);
  };

  const moveLayer = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= skillEffects.length) return;
    const nextEffects = [...skillEffects];
    [nextEffects[index], nextEffects[destination]] = [nextEffects[destination], nextEffects[index]];
    onSkillEffectsChange?.(nextEffects);
    setSelectedLayerIndex(destination);
  };

  const createCustomPresetFromCurrent = () => {
    const basePreset = selectedPreset ?? EFFECT_PRESETS.projectile_fireball;
    const customId = `custom_${Date.now()}`;
    const customPreset: EffectPreset = {
      ...basePreset,
      id: customId,
      name: `${basePreset.name} (커스텀)`,
      description: `${basePreset.description} - 직접 편집된 사용자 정의 이펙트`,
    };

    setSelectedPresetKey(customId);
    setEditedPreset(customPreset);
    onCustomPresetsChange?.([...customPresets, customPreset]);
    if (onPresetCustomize) {
      onPresetCustomize(customPreset);
    }
  };

  const saveCustomPreset = () => {
    if (isCustomPreset) {
      onCustomPresetsChange?.(
        customPresets.map(preset => (preset.id === selectedPreset.id ? selectedPreset : preset))
      );
      return;
    }
    createCustomPresetFromCurrent();
  };

  const deleteCustomPreset = () => {
    if (!isCustomPreset) return;
    const nextPresets = customPresets.filter(preset => preset.id !== selectedPreset.id);
    const fallbackPreset = EFFECT_PRESETS.projectile_fireball;
    onCustomPresetsChange?.(nextPresets);
    setSelectedPresetKey(fallbackPreset.id);
    setEditedPreset(fallbackPreset);
    onPresetSelect?.(fallbackPreset);
  };

  const changeEffectType = (effectType: EffectType) => {
    const typeTemplate = Object.values(EFFECT_PRESETS).find(
      preset => preset.effectType === effectType
    );
    if (!typeTemplate || !selectedPreset) return;

    commitPreset({
      ...typeTemplate,
      id: selectedPreset.id,
      name: selectedPreset.name,
      description: selectedPreset.description,
      color: selectedPreset.color,
      secondaryColor: selectedPreset.secondaryColor,
      particleTexture: selectedPreset.particleTexture,
      glowIntensity: selectedPreset.glowIntensity,
    });
  };

  const getLayerParameterSummary = (effect: EffectPreset) => {
    switch (effect.effectType) {
      case 'projectile':
        return `패턴 ${effect.projectilePattern ?? 'directional'} · ${effect.projectileCount ?? 1}발 · ${effect.projectileSpeed ?? 400}px/s`;
      case 'trail':
        return `${effect.trailType ?? 'thrust'} · 길이 ${effect.trailLength ?? 20} · 두께 ${effect.trailWidth ?? 5}`;
      case 'lightning':
        return `세그먼트 ${effect.lightningSegments ?? 10} · 지터 ${effect.lightningJitter ?? 10}`;
      case 'ring':
        return `반지름 ${effect.ringRadius ?? 40} · ${effect.ringCount ?? 1}개 · ${effect.ringExpansionSpeed ?? 150}px/s`;
      case 'glow':
        return `반지름 ${effect.glowRadius ?? 50} · 파티클 ${effect.glowParticleCount ?? 15} · 상승 ${effect.glowRiseSpeed ?? 60}px/s`;
    }
  };

  return (
    <div className='space-y-2'>
      <Card className='gap-0'>
        <CardHeader className='py-2 px-4'>
          <div className='flex items-center gap-2'>
            <Sparkles className='h-4 w-4 text-blue-500' />
            <CardTitle className='text-sm'>이펙트 제작 워크스페이스</CardTitle>
          </div>
        </CardHeader>

        <CardContent className='px-3 pb-2 pt-1'>
          <div
            className='grid gap-2 overflow-x-auto'
            style={{ gridTemplateColumns: 'minmax(280px, 1fr) 360px' }}
          >
            {showPreview && selectedPreset && (
              <div className='self-start space-y-1 rounded-md border border-slate-200 bg-slate-950 p-2'>
                <div className='flex items-center justify-between px-1'>
                  <Label className='text-xs text-slate-200'>이펙트 미리보기</Label>
                  <span className='text-[10px] text-slate-400'>{selectedPreset.effectType}</span>
                </div>
                <EffectPreviewCanvasNew
                  preset={selectedPreset}
                  presets={[selectedPreset]}
                  width={300}
                  height={320}
                />
              </div>
            )}
            <Card className='max-h-[520px] gap-0 overflow-hidden'>
              <CardHeader className='py-2 px-3'>
                <div className='flex items-center justify-between gap-3'>
                  <CardTitle className='flex items-center gap-1.5 text-xs'>
                    <Sparkles className='h-3.5 w-3.5' />
                    이펙트 종류
                  </CardTitle>
                  <div className='flex items-center gap-1'>
                    <button
                      type='button'
                      onClick={createCustomPresetFromCurrent}
                      className='rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-100'
                    >
                      새 커스텀
                    </button>
                    <button
                      type='button'
                      onClick={saveCustomPreset}
                      className='rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100'
                    >
                      저장
                    </button>
                    {isCustomPreset && (
                      <button
                        type='button'
                        onClick={deleteCustomPreset}
                        className='rounded border border-red-200 bg-red-50 p-1 text-red-700 hover:bg-red-100'
                        title='커스텀 이펙트 삭제'
                      >
                        <Trash2 className='h-3.5 w-3.5' />
                      </button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className='overflow-y-auto px-3 pb-2 pt-0'>
                <ControlRow label='템플릿'>
                  <Select value={selectedPresetKey} onValueChange={handlePresetSelect}>
                    <SelectTrigger className='h-8 border-slate-300 bg-white text-xs text-slate-900'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePresets.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({template.effectType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </ControlRow>
                <ControlRow label='이펙트 타입'>
                  <Select value={selectedPreset.effectType} onValueChange={value => changeEffectType(value as EffectType)}>
                    <SelectTrigger className='h-8 border-slate-300 bg-white text-xs text-slate-900'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='projectile'>투사체</SelectItem>
                      <SelectItem value='trail'>궤적</SelectItem>
                      <SelectItem value='lightning'>번개</SelectItem>
                      <SelectItem value='ring'>링</SelectItem>
                      <SelectItem value='glow'>글로우</SelectItem>
                    </SelectContent>
                  </Select>
                </ControlRow>
                <LayerSettings
                  effect={selectedPreset}
                  onChange={updatePreset}
                  onReplace={commitPreset}
                />
              </CardContent>
            </Card>
            <div className='hidden w-full' style={{ order: 1 }}>
              <Card>
                <CardHeader className='py-2 px-3'>
                  <CardTitle className='text-xs'>직접 제작 설정</CardTitle>
                </CardHeader>
                <CardContent className='space-y-2 px-3 pb-2 pt-0 max-h-[360px] overflow-auto'>
                  <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <h3 className='text-xs font-semibold'>{selectedPreset?.name}</h3>
                        <p className='text-[11px] text-slate-400'>{selectedPreset?.description}</p>
                      </div>
                        <div className='flex items-center gap-2'>
                          <button
                            type='button'
                            onClick={() => selectedPreset && onAddToSkill?.(selectedPreset)}
                            className='rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 transition hover:bg-emerald-100'
                          >
                            스킬에 추가
                          </button>
                          <button
                            type='button'
                            onClick={() => selectedPreset && onReplaceSkillEffects?.(selectedPreset)}
                            className='rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 transition hover:bg-slate-100'
                          >
                            목록 교체
                          </button>
                          <button
                            type='button'
                            onClick={createCustomPresetFromCurrent}
                            className='rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 transition hover:bg-blue-100'
                          >
                            새 커스텀
                          </button>
                        <div
                          className='w-5 h-5 rounded border border-slate-600'
                          style={{ backgroundColor: selectedPreset?.color }}
                          title='주 색상'
                        />
                        <div
                          className='w-5 h-5 rounded border border-slate-600'
                          style={{ backgroundColor: selectedPreset?.secondaryColor }}
                          title='보조 색상'
                        />
                      </div>
                    </div>

                    {showPreview && selectedPreset && (
                      <div className='space-y-1'>
                        <div className='flex items-center justify-between'>
                          <Label className='text-xs'>합성 미리보기</Label>
                          <span className='text-[10px] text-slate-400'>
                            {isEditingLayer ? `레이어 ${skillEffects.length}개 합성` : '새 이펙트 초안'}
                          </span>
                        </div>
                        <EffectPreviewCanvasNew
                          preset={selectedPreset}
                          presets={previewEffects.length > 0 ? previewEffects : [selectedPreset]}
                          width={800}
                          height={180}
                        />
                      </div>
                    )}

                    <div className='hidden'>
                      <Card>
                        <CardContent>
                          <div>
                            {selectedPreset?.effectType === 'projectile' && (
                              <>
                                <div className='flex justify-between'>
                                  <span className='text-slate-400'>패턴</span>
                                  <span className='font-mono'>
                                    {selectedPreset.projectilePattern}
                                  </span>
                                </div>
                                <div className='flex justify-between'>
                                  <span className='text-slate-400'>개수</span>
                                  <span className='font-mono'>
                                    {selectedPreset.projectileCount}
                                  </span>
                                </div>
                                <div className='flex justify-between'>
                                  <span className='text-slate-400'>속도</span>
                                  <span className='font-mono'>
                                    {selectedPreset.projectileSpeed} px/s
                                  </span>
                                </div>
                              </>
                            )}

                            {selectedPreset?.effectType === 'trail' && (
                              <>
                                <div className='flex justify-between'>
                                  <span className='text-slate-400'>파티클</span>
                                  <span className='font-mono'>
                                    {selectedPreset.trailParticleCount}
                                  </span>
                                </div>
                                <div className='flex justify-between'>
                                  <span className='text-slate-400'>길이</span>
                                  <span className='font-mono'>{selectedPreset.trailLength} px</span>
                                </div>
                                <div className='flex justify-between'>
                                  <span className='text-slate-400'>두께</span>
                                  <span className='font-mono'>{selectedPreset.trailWidth} px</span>
                                </div>
                              </>
                            )}

                            {selectedPreset?.effectType === 'lightning' && (
                              <>
                                <div className='flex justify-between'>
                                  <span className='text-slate-400'>세그먼트</span>
                                  <span className='font-mono'>
                                    {selectedPreset.lightningSegments}
                                  </span>
                                </div>
                                <div className='flex justify-between'>
                                  <span className='text-slate-400'>지터</span>
                                  <span className='font-mono'>
                                    {selectedPreset.lightningJitter}
                                  </span>
                                </div>
                                <div className='flex justify-between'>
                                  <span className='text-slate-400'>갈라짐</span>
                                  <span className='font-mono'>
                                    {Math.round((selectedPreset.lightningForkChance || 0) * 100)}%
                                  </span>
                                </div>
                              </>
                            )}

                            {selectedPreset?.effectType === 'ring' && (
                              <>
                                <div className='flex justify-between'>
                                  <span className='text-slate-400'>반지름</span>
                                  <span className='font-mono'>{selectedPreset.ringRadius} px</span>
                                </div>
                                <div className='flex justify-between'>
                                  <span className='text-slate-400'>확장속도</span>
                                  <span className='font-mono'>
                                    {selectedPreset.ringExpansionSpeed} px/s
                                  </span>
                                </div>
                                <div className='flex justify-between'>
                                  <span className='text-slate-400'>개수</span>
                                  <span className='font-mono'>{selectedPreset.ringCount}</span>
                                </div>
                              </>
                            )}

                            {selectedPreset?.effectType === 'glow' && (
                              <>
                                <div className='flex justify-between'>
                                  <span className='text-slate-400'>반지름</span>
                                  <span className='font-mono'>{selectedPreset.glowRadius} px</span>
                                </div>
                                <div className='flex justify-between'>
                                  <span className='text-slate-400'>파티클</span>
                                  <span className='font-mono'>
                                    {selectedPreset.glowParticleCount}
                                  </span>
                                </div>
                                <div className='flex justify-between'>
                                  <span className='text-slate-400'>상승속도</span>
                                  <span className='font-mono'>
                                    {selectedPreset.glowRiseSpeed} px/s
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className='space-y-4 rounded-md border border-slate-200 p-3'>
                    <div>
                      <h3 className='text-xs font-semibold text-slate-700'>레이어 구성 값</h3>
                      <p className='text-[11px] text-slate-500'>
                        {selectedLayer
                          ? `레이어 ${selectedLayerIndex! + 1}: ${selectedLayer.name}`
                          : '레이어를 선택하면 공통 스타일, 타입별 동작, 재생 옵션을 편집할 수 있습니다.'}
                      </p>
                    </div>
                    <fieldset disabled={!isEditingLayer} className='space-y-4 disabled:opacity-45'>
                    <div>
                      <div className='grid grid-cols-2 gap-2'>
                        <div className='space-y-1'>
                          <Label className='text-xs'>주 색상</Label>
                          <Input
                            type='color'
                            value={selectedPreset?.color || '#ffffff'}
                            onChange={e => updatePreset({ color: e.target.value })}
                            className={isCompact ? 'h-8' : 'h-9'}
                          />
                        </div>
                        <div className='space-y-1'>
                          <Label className='text-xs'>보조 색상</Label>
                          <Input
                            type='color'
                            value={selectedPreset?.secondaryColor || '#ffffff'}
                            onChange={e => updatePreset({ secondaryColor: e.target.value })}
                            className={isCompact ? 'h-8' : 'h-9'}
                          />
                        </div>
                        <div className='space-y-1'>
                          <Label className='text-xs'>글로우 강도 (0-1)</Label>
                          <Input
                            type='number'
                            min={0}
                            max={1}
                            step={0.1}
                            value={selectedPreset?.glowIntensity ?? 0}
                            onChange={e =>
                              updatePreset({
                                glowIntensity: Math.max(
                                  0,
                                  Math.min(1, Number(e.target.value) || 0)
                                ),
                              })
                            }
                            className={isCompact ? 'h-8' : 'h-9'}
                          />
                        </div>
                        <div className='space-y-1'>
                          <Label className='text-xs'>파티클 텍스쳐</Label>
                          <Select
                            value={selectedPreset?.particleTexture}
                            onValueChange={value =>
                              updatePreset({
                                particleTexture: value as EffectPreset['particleTexture'],
                              })
                            }
                          >
                            <SelectTrigger className={isCompact ? 'h-8' : 'h-9'}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='circle'>circle</SelectItem>
                              <SelectItem value='star'>star</SelectItem>
                              <SelectItem value='square'>square</SelectItem>
                              <SelectItem value='diamond'>diamond</SelectItem>
                              <SelectItem value='spark'>spark</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div>
                      {selectedPreset?.effectType === 'projectile' && (
                        <div className='grid grid-cols-2 gap-2'>
                          <div className='space-y-1'>
                            <Label className='text-xs'>투사체 개수</Label>
                            <Input
                              type='number'
                              min={1}
                              max={20}
                              value={selectedPreset.projectileCount ?? 1}
                              onChange={e =>
                                updatePreset({
                                  projectileCount: Math.max(1, Number(e.target.value) || 1),
                                })
                              }
                              className={isCompact ? 'h-8' : 'h-9'}
                            />
                          </div>
                          <div className='space-y-1'>
                            <Label className='text-xs'>투사체 속도</Label>
                            <Input
                              type='number'
                              min={10}
                              value={selectedPreset.projectileSpeed ?? 400}
                              onChange={e =>
                                updatePreset({
                                  projectileSpeed: Math.max(10, Number(e.target.value) || 400),
                                })
                              }
                              className={isCompact ? 'h-8' : 'h-9'}
                            />
                          </div>
                          <div className='space-y-1'>
                            <Label className='text-xs'>투사체 크기</Label>
                            <Input
                              type='number'
                              min={1}
                              value={selectedPreset.projectileSize ?? 8}
                              onChange={e =>
                                updatePreset({
                                  projectileSize: Math.max(1, Number(e.target.value) || 8),
                                })
                              }
                              className={isCompact ? 'h-8' : 'h-9'}
                            />
                          </div>
                          <div className='flex items-center justify-between border rounded-md px-3 py-2 mt-5'>
                            <Label className='text-xs'>유도</Label>
                            <Switch
                              checked={!!selectedPreset.isHoming}
                              onCheckedChange={checked => updatePreset({ isHoming: checked })}
                            />
                          </div>
                        </div>
                      )}

                      {selectedPreset?.effectType === 'trail' && (
                        <div className='grid grid-cols-3 gap-2'>
                          <div className='space-y-1'>
                            <Label className='text-xs'>파티클 수</Label>
                            <Input
                              type='number'
                              min={1}
                              value={selectedPreset.trailParticleCount ?? 20}
                              onChange={e =>
                                updatePreset({
                                  trailParticleCount: Math.max(1, Number(e.target.value) || 20),
                                })
                              }
                              className={isCompact ? 'h-8' : 'h-9'}
                            />
                          </div>
                          <div className='space-y-1'>
                            <Label className='text-xs'>길이</Label>
                            <Input
                              type='number'
                              min={1}
                              value={selectedPreset.trailLength ?? 20}
                              onChange={e =>
                                updatePreset({
                                  trailLength: Math.max(1, Number(e.target.value) || 20),
                                })
                              }
                              className={isCompact ? 'h-8' : 'h-9'}
                            />
                          </div>
                          <div className='space-y-1'>
                            <Label className='text-xs'>두께</Label>
                            <Input
                              type='number'
                              min={1}
                              value={selectedPreset.trailWidth ?? 5}
                              onChange={e =>
                                updatePreset({
                                  trailWidth: Math.max(1, Number(e.target.value) || 5),
                                })
                              }
                              className={isCompact ? 'h-8' : 'h-9'}
                            />
                          </div>
                        </div>
                      )}

                      {selectedPreset?.effectType === 'lightning' && (
                        <div className='grid grid-cols-3 gap-2'>
                          <div className='space-y-1'>
                            <Label className='text-xs'>세그먼트</Label>
                            <Input
                              type='number'
                              min={1}
                              value={selectedPreset.lightningSegments ?? 10}
                              onChange={e =>
                                updatePreset({
                                  lightningSegments: Math.max(1, Number(e.target.value) || 10),
                                })
                              }
                              className={isCompact ? 'h-8' : 'h-9'}
                            />
                          </div>
                          <div className='space-y-1'>
                            <Label className='text-xs'>지터</Label>
                            <Input
                              type='number'
                              min={0}
                              value={selectedPreset.lightningJitter ?? 10}
                              onChange={e =>
                                updatePreset({
                                  lightningJitter: Math.max(0, Number(e.target.value) || 10),
                                })
                              }
                              className={isCompact ? 'h-8' : 'h-9'}
                            />
                          </div>
                          <div className='space-y-1'>
                            <Label className='text-xs'>갈라짐 확률</Label>
                            <Input
                              type='number'
                              min={0}
                              max={1}
                              step={0.05}
                              value={selectedPreset.lightningForkChance ?? 0}
                              onChange={e =>
                                updatePreset({
                                  lightningForkChance: Math.max(
                                    0,
                                    Math.min(1, Number(e.target.value) || 0)
                                  ),
                                })
                              }
                              className={isCompact ? 'h-8' : 'h-9'}
                            />
                          </div>
                        </div>
                      )}

                      {selectedPreset?.effectType === 'ring' && (
                        <div className='grid grid-cols-3 gap-2'>
                          <div className='space-y-1'>
                            <Label className='text-xs'>반지름</Label>
                            <Input
                              type='number'
                              min={1}
                              value={selectedPreset.ringRadius ?? 40}
                              onChange={e =>
                                updatePreset({
                                  ringRadius: Math.max(1, Number(e.target.value) || 40),
                                })
                              }
                              className={isCompact ? 'h-8' : 'h-9'}
                            />
                          </div>
                          <div className='space-y-1'>
                            <Label className='text-xs'>확장 속도</Label>
                            <Input
                              type='number'
                              min={1}
                              value={selectedPreset.ringExpansionSpeed ?? 150}
                              onChange={e =>
                                updatePreset({
                                  ringExpansionSpeed: Math.max(1, Number(e.target.value) || 150),
                                })
                              }
                              className={isCompact ? 'h-8' : 'h-9'}
                            />
                          </div>
                          <div className='space-y-1'>
                            <Label className='text-xs'>동심원 개수</Label>
                            <Input
                              type='number'
                              min={1}
                              value={selectedPreset.ringCount ?? 1}
                              onChange={e =>
                                updatePreset({
                                  ringCount: Math.max(1, Number(e.target.value) || 1),
                                })
                              }
                              className={isCompact ? 'h-8' : 'h-9'}
                            />
                          </div>
                        </div>
                      )}

                      {selectedPreset?.effectType === 'glow' && (
                        <div className='grid grid-cols-3 gap-2'>
                          <div className='space-y-1'>
                            <Label className='text-xs'>반지름</Label>
                            <Input
                              type='number'
                              min={1}
                              value={selectedPreset.glowRadius ?? 50}
                              onChange={e =>
                                updatePreset({
                                  glowRadius: Math.max(1, Number(e.target.value) || 50),
                                })
                              }
                              className={isCompact ? 'h-8' : 'h-9'}
                            />
                          </div>
                          <div className='space-y-1'>
                            <Label className='text-xs'>파티클 수</Label>
                            <Input
                              type='number'
                              min={1}
                              value={selectedPreset.glowParticleCount ?? 15}
                              onChange={e =>
                                updatePreset({
                                  glowParticleCount: Math.max(1, Number(e.target.value) || 15),
                                })
                              }
                              className={isCompact ? 'h-8' : 'h-9'}
                            />
                          </div>
                          <div className='space-y-1'>
                            <Label className='text-xs'>상승 속도</Label>
                            <Input
                              type='number'
                              min={1}
                              value={selectedPreset.glowRiseSpeed ?? 60}
                              onChange={e =>
                                updatePreset({
                                  glowRiseSpeed: Math.max(1, Number(e.target.value) || 60),
                                })
                              }
                              className={isCompact ? 'h-8' : 'h-9'}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className='grid grid-cols-2 gap-2'>
                        <div className='space-y-1'>
                          <Label className='text-xs'>반복 횟수</Label>
                          <Input
                            type='number'
                            min={1}
                            value={selectedPreset.repeatCount ?? 1}
                            onChange={e =>
                              updatePreset({
                                repeatCount: Math.max(1, Number(e.target.value) || 1),
                              })
                            }
                            className={isCompact ? 'h-8' : 'h-9'}
                          />
                        </div>
                        <div className='space-y-1'>
                          <Label className='text-xs'>반복 간격(ms)</Label>
                          <Input
                            type='number'
                            min={0}
                            value={selectedPreset.repeatInterval ?? 0}
                            onChange={e =>
                              updatePreset({
                                repeatInterval: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className={isCompact ? 'h-8' : 'h-9'}
                          />
                        </div>
                      </div>
                    </div>
                    </fieldset>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
