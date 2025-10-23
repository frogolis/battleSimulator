/**
 * 새로운 5가지 이펙트 타입을 위한 미리보기 캔버스
 */

import React, { useEffect, useRef } from "react";
import { EffectPreset } from "../../lib/skillSystem";
import { createEffect, updateNewParticles, renderNewParticles } from "../../lib/simulator/particles";
import { SkillParticle } from "../../lib/simulator/types";

interface EffectPreviewCanvasNewProps {
  preset: EffectPreset;
  width?: number;
  height?: number;
}

export function EffectPreviewCanvasNew({
  preset,
  width = 800,
  height = 400,
}: EffectPreviewCanvasNewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: SkillParticle[] = [];
    let lastTime = Date.now();
    let spawnTimer = 0;
    let animationId = 0;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const createEffectParticles = () => {
      const targetX = centerX + 200; // 타겟 위치 (오른쪽)
      const targetY = centerY;

      const newParticles = createEffect({
        preset,
        position: { x: centerX, y: centerY },
        targetPosition: { x: targetX, y: targetY },
        owner: 'player',
      });

      particles.push(...newParticles);
    };

    const animate = () => {
      const now = Date.now();
      const deltaTime = (now - lastTime) / 1000; // 초 단위
      lastTime = now;

      // 화면 클리어
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 중앙 마커 (이펙트 발생 위치)
      ctx.fillStyle = "#4a5568";
      ctx.beginPath();
      ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
      ctx.fill();

      // 타겟 마커 (투사체/번개 타겟 위치)
      if (preset.effectType === 'projectile' || preset.effectType === 'lightning') {
        ctx.fillStyle = "#ed8936";
        ctx.beginPath();
        ctx.arc(centerX + 200, centerY, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // 파티클 업데이트
      particles = updateNewParticles(particles, deltaTime);

      // 파티클 렌더링
      renderNewParticles(ctx, particles);

      // 자동 재생성 (반복 간격)
      spawnTimer += deltaTime;
      const repeatInterval = (preset.repeatInterval || 1000) / 1000;
      
      if (spawnTimer >= repeatInterval) {
        createEffectParticles();
        spawnTimer = 0;
      }

      animationId = requestAnimationFrame(animate);
    };

    // 초기 이펙트 생성
    createEffectParticles();
    
    // 애니메이션 시작
    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [preset, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border border-slate-700 rounded-lg bg-slate-950"
    />
  );
}
