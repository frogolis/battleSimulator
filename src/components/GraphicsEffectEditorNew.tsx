/**
 * 새로운 5가지 이펙트 타입을 위한 이펙트 에디터
 */

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Sparkles, Eye, Layers } from "lucide-react";
import { EFFECT_PRESETS, EffectPreset } from "../lib/skillSystem";
import { EffectPreviewCanvasNew } from "./graphics-effects/EffectPreviewCanvasNew";
import { EffectPresetLibrary } from "./graphics-effects/EffectPresetLibrary";

interface GraphicsEffectEditorNewProps {
  onPresetSelect?: (preset: EffectPreset) => void;
  showPreview?: boolean;
}

export function GraphicsEffectEditorNew({
  onPresetSelect,
  showPreview = true,
}: GraphicsEffectEditorNewProps) {
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('projectile_fireball');
  const [currentTab, setCurrentTab] = useState<string>('library');
  const selectedPreset = EFFECT_PRESETS[selectedPresetKey];

  const handlePresetSelect = (presetKey: string) => {
    setSelectedPresetKey(presetKey);
    const preset = EFFECT_PRESETS[presetKey];
    if (preset && onPresetSelect) {
      onPresetSelect(preset);
    }
    // 미리보기 탭으로 자동 전환
    if (showPreview) {
      setCurrentTab('preview');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            <CardTitle>이펙트 프리셋 라이브러리</CardTitle>
          </div>
          <CardDescription>
            5가지 이펙트 타입 (투사체, 궤적, 번개, 링, 글로우)에서 선택하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="library">
                <Layers className="h-4 w-4 mr-2" />
                프리셋 라이브러리
              </TabsTrigger>
              {showPreview && (
                <TabsTrigger value="preview">
                  <Eye className="h-4 w-4 mr-2" />
                  미리보기
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="library" className="mt-6">
              <EffectPresetLibrary
                selectedPreset={selectedPresetKey}
                onPresetSelect={handlePresetSelect}
              />
            </TabsContent>

            {showPreview && (
              <TabsContent value="preview" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{selectedPreset?.name}</h3>
                      <p className="text-sm text-slate-400">{selectedPreset?.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <div
                        className="w-8 h-8 rounded border-2 border-slate-600"
                        style={{ backgroundColor: selectedPreset?.color }}
                        title="주 색상"
                      />
                      <div
                        className="w-8 h-8 rounded border-2 border-slate-600"
                        style={{ backgroundColor: selectedPreset?.secondaryColor }}
                        title="보조 색상"
                      />
                    </div>
                  </div>

                  {selectedPreset && (
                    <EffectPreviewCanvasNew
                      preset={selectedPreset}
                      width={800}
                      height={400}
                    />
                  )}

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <Card className="bg-slate-900/50">
                      <CardHeader className="p-4">
                        <CardTitle className="text-sm">이펙트 타입</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">타입:</span>
                            <span className="font-mono">{selectedPreset?.effectType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">텍스쳐:</span>
                            <span className="font-mono">{selectedPreset?.particleTexture}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">글로우:</span>
                            <span className="font-mono">{Math.round((selectedPreset?.glowIntensity || 0) * 100)}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-slate-900/50">
                      <CardHeader className="p-4">
                        <CardTitle className="text-sm">상세 설정</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <div className="space-y-2 text-sm">
                          {selectedPreset?.effectType === 'projectile' && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-slate-400">발사 패턴:</span>
                                <span className="font-mono">{selectedPreset.projectilePattern}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">개수:</span>
                                <span className="font-mono">{selectedPreset.projectileCount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">속도:</span>
                                <span className="font-mono">{selectedPreset.projectileSpeed} px/s</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">유도:</span>
                                <span className="font-mono">{selectedPreset.isHoming ? '활성' : '비활성'}</span>
                              </div>
                            </>
                          )}

                          {selectedPreset?.effectType === 'trail' && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-slate-400">파티클 수:</span>
                                <span className="font-mono">{selectedPreset.trailParticleCount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">길이:</span>
                                <span className="font-mono">{selectedPreset.trailLength} px</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">두께:</span>
                                <span className="font-mono">{selectedPreset.trailWidth} px</span>
                              </div>
                            </>
                          )}

                          {selectedPreset?.effectType === 'lightning' && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-slate-400">세그먼트:</span>
                                <span className="font-mono">{selectedPreset.lightningSegments}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">지터:</span>
                                <span className="font-mono">{selectedPreset.lightningJitter}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">갈라짐:</span>
                                <span className="font-mono">{Math.round((selectedPreset.lightningForkChance || 0) * 100)}%</span>
                              </div>
                            </>
                          )}

                          {selectedPreset?.effectType === 'ring' && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-slate-400">반지름:</span>
                                <span className="font-mono">{selectedPreset.ringRadius} px</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">확장 속도:</span>
                                <span className="font-mono">{selectedPreset.ringExpansionSpeed} px/s</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">동심원 개수:</span>
                                <span className="font-mono">{selectedPreset.ringCount}</span>
                              </div>
                            </>
                          )}

                          {selectedPreset?.effectType === 'glow' && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-slate-400">반지름:</span>
                                <span className="font-mono">{selectedPreset.glowRadius} px</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">파티클 수:</span>
                                <span className="font-mono">{selectedPreset.glowParticleCount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">상승 속도:</span>
                                <span className="font-mono">{selectedPreset.glowRiseSpeed} px/s</span>
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
