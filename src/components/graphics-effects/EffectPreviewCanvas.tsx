import React, { useEffect, useRef } from "react";
import { EffectShape, ProjectileType, ParticleUpdateStrategy } from "../../lib/simulator/particles";

interface TrailPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface GraphicsEffectConfig {
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
  trailEnabled: boolean;
  trailLength: number;
  trailWidth: number;
}

interface EffectPreviewCanvasProps {
  config: GraphicsEffectConfig;
  width?: number;
  height?: number;
}

export function EffectPreviewCanvas({
  config,
  width = 800,
  height = 400,
}: EffectPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: any[] = [];
    let lastTime = Date.now();
    let spawnTimer = 0;
    let animationId = 0;

    const normalizeHexColor = (hex: string) => {
      return hex.length === 7 ? hex : hex + 'ff';
    };

    const primaryColor = normalizeHexColor(config.primaryColor);
    const secondaryColor = normalizeHexColor(config.secondaryColor);

    const createParticles = () => {
      const count = Math.min(config.particleCount, 20);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count;
        let vx = 0;
        let vy = 0;

        if (config.particleStrategy === "projectile") {
          vx = Math.cos(angle) * (config.projectileSpeed / 1000);
          vy = Math.sin(angle) * (config.projectileSpeed / 1000);
        }

        particles.push({
          x: centerX,
          y: centerY,
          vx,
          vy,
          life: 0,
          maxLife: config.particleLifetime,
          size: config.particleSize,
          angle,
        });
      }
    };

    const animate = () => {
      const now = Date.now();
      const deltaTime = (now - lastTime) / 1000;
      const time = now / 1000;
      lastTime = now;

      spawnTimer += deltaTime * 1000;

      if (spawnTimer > 1000 && particles.length < 50) {
        createParticles();
        spawnTimer = 0;
      }

      ctx.fillStyle = "#1f2937";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 그리드
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // 중심점
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 5, 0, Math.PI * 2);
      ctx.fill();

      // 동심원 효과
      if (config.enableRings) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        for (let i = 0; i < config.ringCount; i++) {
          const offset = (i / config.ringCount) * 1000;
          const radius = ((time * config.ringSpeed + offset) % 300) + 20;
          const alpha = 1 - (radius / 320);

          ctx.strokeStyle = primaryColor + Math.floor(alpha * 100).toString(16).padStart(2, "0");
          ctx.lineWidth = config.ringThickness;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 파티클 렌더링
      particles = particles.filter((p) => {
        p.life += deltaTime * 1000;
        if (p.life > p.maxLife) return false;

        if (config.rotationSpeed > 0 && p.angle !== undefined) {
          p.angle += (config.rotationSpeed * Math.PI / 180) * deltaTime;
        }

        if (config.particleStrategy === "projectile") {
          p.x += p.vx * deltaTime * 1000;
          p.y += p.vy * deltaTime * 1000;
        }

        let sizeMultiplier = 1;
        if (config.pulseSpeed > 0) {
          sizeMultiplier = 1 + Math.sin(p.life / 100 * config.pulseSpeed) * 0.3;
        }
        const currentSize = p.size * sizeMultiplier;

        let alpha = 1;
        if (p.life < config.fadeInDuration) {
          alpha = p.life / config.fadeInDuration;
        } else if (p.life > p.maxLife - config.fadeOutDuration) {
          alpha = (p.maxLife - p.life) / config.fadeOutDuration;
        }

        if (config.glowIntensity > 0) {
          ctx.shadowColor = primaryColor;
          ctx.shadowBlur = config.glowIntensity * 20;
        }

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentSize);
        gradient.addColorStop(0, primaryColor + Math.floor(alpha * 255).toString(16).padStart(2, "0"));
        gradient.addColorStop(1, secondaryColor + "00");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        return true;
      });

      // 화면 플래시
      if (config.enableScreenFlash && particles.length > 0) {
        const flashCycle = (time * 3) % 2;
        const flashAlpha = flashCycle < 1
          ? flashCycle * config.flashIntensity
          : (2 - flashCycle) * config.flashIntensity;

        const normalizedFlashColor = normalizeHexColor(config.flashColor);
        ctx.fillStyle = normalizedFlashColor + Math.floor(flashAlpha * 255).toString(16).padStart(2, "0");
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      animationId = requestAnimationFrame(animate);
    };

    createParticles();
    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [config]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full border border-slate-700 rounded-lg bg-slate-800"
      />
      <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        실시간 프리뷰 ({width}×{height}px)
      </div>
    </div>
  );
}
