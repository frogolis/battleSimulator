import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Sparkles, Eye, Layers, Settings } from "lucide-react";
import { toast } from "sonner";
import { EffectShape, ProjectileType, ParticleUpdateStrategy } from "../lib/simulator/particles";
import { DETAILED_EFFECT_PRESETS } from "../lib/skillSystem";
import { EffectPreviewCanvas } from "./graphics-effects/EffectPreviewCanvas";
import { EffectPresetLibrary } from "./graphics-effects/EffectPresetLibrary";
import { EffectHierarchyView } from "./graphics-effects/EffectHierarchyView";
import { EffectDetailsPanel } from "./graphics-effects/EffectDetailsPanel";
import { createInitialEffects } from "./graphics-effects/AdditionalEffectsPanel";

export interface GraphicsEffectConfig {
  particleCount: number;
  particleSize: number;
  particleLifetime: number;
  primaryColor: string;
  secondaryColor: string;
  glowIntensity: number;
  effectShape: EffectShape;
  projectileType: ProjectileType;
  projectileSpeed: number;
  projectileSize: number;
  homingEnabled: boolean;
  pierceCount: number;
  windupDuration: number;
  executionDuration: number;
  recoveryDuration: number;
  particleStrategy: ParticleUpdateStrategy;
  spawnDelay: number;
  fadeInDuration: number;
  fadeOutDuration: number;
  cameraShake: number;
  cameraShakeDuration: number;
  enableRings: boolean;
  ringCount: number;
  ringSpeed: number;
  ringThickness: number;
  enableScreenFlash: boolean;
  flashIntensity: number;
  flashColor: string;
  rotationSpeed: number;
  pulseSpeed: number;
  effectPlaybackSpeed: number;    // 이펙트 전체 재생 속도
  particlePlaybackSpeed: number;  // 개별 파티클 애니메이션 속도
  trailEnabled: boolean;           // 궤적 활성화
  trailLength: number;             // 궤적 길이
  trailWidth: number;              // 궤적 두께
}

const DEFAULT_CONFIG: GraphicsEffectConfig = {
  particleCount: 30,
  particleSize: 6,
  particleLifetime: 800,
  primaryColor: "#3b82f6",
  secondaryColor: "#60a5fa",
  glowIntensity: 0.6,
  effectShape: "circle",
  projectileType: "arrow",
  projectileSpeed: 400,
  projectileSize: 10,
  homingEnabled: false,
  pierceCount: 0,
  windupDuration: 200,
  executionDuration: 400,
  recoveryDuration: 200,
  particleStrategy: "projectile",
  spawnDelay: 0,
  fadeInDuration: 100,
  fadeOutDuration: 200,
  cameraShake: 0,
  cameraShakeDuration: 200,
  enableRings: false,
  ringCount: 3,
  ringSpeed: 200,
  ringThickness: 3,
  enableScreenFlash: false,
  flashIntensity: 0.3,
  flashColor: "#ffffff",
  rotationSpeed: 0,
  pulseSpeed: 0,
  effectPlaybackSpeed: 1.0,
  particlePlaybackSpeed: 1.0,
  trailEnabled: false,
  trailLength: 20,
  trailWidth: 2,
};

interface GraphicsEffectEditorProps {
  onConfigChange?: (config: GraphicsEffectConfig) => void;
  initialConfig?: Partial<GraphicsEffectConfig>;
  showPreview?: boolean;
}

export function GraphicsEffectEditor({
  onConfigChange,
  initialConfig,
  showPreview = true,
}: GraphicsEffectEditorProps) {
  const [config, setConfig] = useState<GraphicsEffectConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });

  const [activeTab, setActiveTab] = useState<string>("presets");
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  
  const [additionalEffects, setAdditionalEffects] = useState(() => createInitialEffects(config));
  
  const [openSections, setOpenSections] = useState({
    core: true,
    particle: true,
    projectile: false,
    animation: false,
    additional: true,
  });

  // 설정 변경 핸들러
  const updateConfig = (updates: Partial<GraphicsEffectConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  // 프리셋 적용
  const handlePresetSelect = (presetKey: string) => {
    const preset = DETAILED_EFFECT_PRESETS[presetKey];
    if (!preset) return;

    const newConfig = {
      ...config,
      primaryColor: preset.color,
      secondaryColor: preset.secondaryColor,
      particleCount: preset.particleCount,
      particleSize: preset.particleSize,
      particleLifetime: preset.particleLifetime,
      glowIntensity: preset.glowIntensity,
      effectShape: preset.shape,
      projectileType: preset.projectileType,
      projectileSpeed: preset.projectileSpeed,
      effectPlaybackSpeed: preset.effectPlaybackSpeed,
      particlePlaybackSpeed: preset.particlePlaybackSpeed,
      trailEnabled: preset.trailEnabled || false,
      trailLength: preset.trailLength || 20,
      trailWidth: preset.trailWidth || 2,
    };
    
    setConfig(newConfig);
    setSelectedPreset(presetKey);
    onConfigChange?.(newConfig);
    toast.success(`프리셋 적용: ${preset.name}`);
  };

  // 추가 효과 토글
  const toggleAdditionalEffect = (effectId: string) => {
    const effect = additionalEffects.find(e => e.id === effectId);
    if (!effect) return;

    const newEnabled = !effect.enabled;
    let updates: Partial<GraphicsEffectConfig> = {};

    switch (effect.type) {
      case 'trail':
        updates = { trailEnabled: newEnabled };
        break;
      case 'cameraShake':
        updates = { cameraShake: newEnabled ? 5 : 0 };
        break;
      case 'rings':
        updates = { enableRings: newEnabled };
        break;
      case 'screenFlash':
        updates = { enableScreenFlash: newEnabled };
        break;
      case 'glow':
        updates = { glowIntensity: newEnabled ? 0.6 : 0 };
        break;
      case 'rotation':
        updates = { rotationSpeed: newEnabled ? 90 : 0 };
        break;
      case 'pulse':
        updates = { pulseSpeed: newEnabled ? 3 : 0 };
        break;
    }

    updateConfig(updates);
    
    setAdditionalEffects(prev =>
      prev.map(e => e.id === effectId ? { ...e, enabled: newEnabled } : e)
    );
  };

  // 추가 효과 삭제
  const removeAdditionalEffect = (effectId: string) => {
    toggleAdditionalEffect(effectId);
    toast.info('효과가 비활성화되었습니다');
  };

  // 섹션 토글
  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section as keyof typeof prev] }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          그래픽 효과 에디터
        </CardTitle>
        <CardDescription>
          시각 효과, 투사체, 애니메이션을 계층적으로 구성합니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 프리뷰 캔버스 */}
        {showPreview && <EffectPreviewCanvas config={config} />}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="presets">
              <Eye className="h-4 w-4 mr-2" />
              프리셋 라이브러리
            </TabsTrigger>
            <TabsTrigger value="hierarchy">
              <Layers className="h-4 w-4 mr-2" />
              계층 구조
            </TabsTrigger>
            <TabsTrigger value="details">
              <Settings className="h-4 w-4 mr-2" />
              세부 설정
            </TabsTrigger>
          </TabsList>

          {/* 프리셋 라이브러리 탭 */}
          <TabsContent value="presets" className="mt-4">
            <EffectPresetLibrary
              selectedPreset={selectedPreset}
              onPresetSelect={handlePresetSelect}
            />
          </TabsContent>

          {/* 계층 구조 탭 */}
          <TabsContent value="hierarchy" className="mt-4">
            <EffectHierarchyView
              config={config}
              additionalEffects={additionalEffects}
              openSections={openSections}
              onConfigUpdate={updateConfig}
              onToggleSection={toggleSection}
              onToggleEffect={toggleAdditionalEffect}
              onRemoveEffect={removeAdditionalEffect}
              setAdditionalEffects={setAdditionalEffects}
            />
          </TabsContent>

          {/* 세부 설정 탭 */}
          <TabsContent value="details" className="mt-4">
            <EffectDetailsPanel
              config={config}
              additionalEffects={additionalEffects}
              onConfigUpdate={updateConfig}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
