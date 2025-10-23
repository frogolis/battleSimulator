# 새로운 5가지 이펙트 시스템 가이드

## 개요
기존의 복잡한 10가지 이펙트 형태를 5가지 타입으로 재설계하여 각 타입별로 세밀한 제어가 가능합니다.

## 5가지 이펙트 타입

### 1. 투사체 (Projectile)
- **발사 패턴**: `directional`, `radial`, `cone`
- **투사체 개수**: 1~20개
- **유도 처리**: `isHoming` 옵션
- **텍스쳐**: circle, star, square, diamond, spark

### 2. 궤적 (Trail)
- **파티클 수**: 궤적 밀도 제어
- **길이**: 궤적의 전체 길이
- **두께**: 궤적 선의 두께
- **페이드 속도**: 궤적이 사라지는 속도

### 3. 번개 (Lightning)
- **세그먼트**: 번개의 굴곡 정도
- **지터**: 번개의 불규칙성
- **갈라짐**: 번개가 갈라지는 확률
- **타겟 연결**: 특정 대상과 연결

### 4. 링 (Ring)
- **반지름**: 링의 최대 크기
- **확장 속도**: 링이 커지는 속도
- **동심원 개수**: 여러 링을 생성
- **간격**: 동심원 간 시간 간격

### 5. 글로우 (Glow)
- **글로우 반지름**: 중앙 글로우의 크기
- **파티클 수**: 상승하는 파티클 개수
- **상승 속도**: 파티클이 떠오르는 속도
- **페이드 속도**: 사라지는 속도

## 프리셋 라이브러리 (17개)

### 투사체 프리셋 (6개)
1. **projectile_arrow_single** - 단일 화살
2. **projectile_arrow_multi** - 3방향 화살
3. **projectile_fireball** - 파이어볼
4. **projectile_fireball_homing** - 유도 파이어볼
5. **projectile_radial_burst** - 방사형 폭발 (8방향)
6. **projectile_cone_spread** - 부채꼴 발사 (5발)

### 궤적 프리셋 (3개)
7. **trail_slash** - 베기 궤적
8. **trail_thrust** - 찌르기 궤적
9. **trail_spin** - 회전 베기

### 번개 프리셋 (2개)
10. **lightning_chain** - 연쇄 번개
11. **lightning_strike** - 낙뢰

### 링 프리셋 (3개)
12. **ring_single** - 단일 충격파
13. **ring_concentric** - 3개 동심원
14. **ring_explosion** - 빠른 폭발 링

### 글로우 프리셋 (3개)
15. **glow_heal** - 치유의 빛
16. **glow_buff** - 신성한 축복
17. **glow_power** - 전투의 기운

## 등록된 스킬 (17개)

모든 프리셋은 개별 스킬로 등록되어 있습니다:

| 스킬 ID | 스킬 이름 | 타입 | SP | 쿨타임 |
|---------|-----------|------|-----|--------|
| `arrowSingle` | 단일 화살 | projectile | 10 | 1초 |
| `arrowMulti` | 다중 화살 | projectile | 15 | 2초 |
| `fireball` | 파이어볼 | projectile | 25 | 3초 |
| `fireballHoming` | 유도 파이어볼 | projectile | 30 | 4초 |
| `radialBurst` | 방사형 폭발 | projectile | 40 | 6초 |
| `coneSpread` | 부채꼴 발사 | projectile | 20 | 2.5초 |
| `slashTrail` | 베기 궤적 | trail | 15 | 1.5초 |
| `thrustTrail` | 찌르기 궤적 | trail | 12 | 1.2초 |
| `spinTrail` | 회전 베기 | trail | 25 | 4초 |
| `lightningChain` | 연쇄 번개 | lightning | 30 | 5초 |
| `lightningStrike` | 낙뢰 | lightning | 35 | 6초 |
| `ringSingle` | 충격파 | ring | 20 | 3초 |
| `ringConcentric` | 동심원 충격 | ring | 35 | 5초 |
| `ringExplosion` | 폭발 링 | ring | 40 | 7초 |
| `glowHeal` | 치유의 빛 | glow | 25 | 8초 |
| `glowBuff` | 신성한 축복 | glow | 30 | 12초 |
| `glowPower` | 전투의 기운 | glow | 45 | 18초 |

## 사용 방법

### 1. 프리셋에서 이펙트 생성

```typescript
import { createEffect } from './lib/simulator/particles';
import { EFFECT_PRESETS } from './lib/skillSystem';

const particles = createEffect({
  preset: EFFECT_PRESETS.projectile_fireball,
  position: { x: 100, y: 100 },
  targetPosition: { x: 200, y: 200 },
  owner: 'player',
  damage: 50,
});
```

### 2. 파티클 업데이트

```typescript
import { updateNewParticles } from './lib/simulator/particles';

const updatedParticles = updateNewParticles(particles, deltaTime, monsters);
```

### 3. 파티클 렌더링

```typescript
import { renderNewParticles } from './lib/simulator/particles';

renderNewParticles(ctx, particles);
```

### 4. 충돌 감지 (투사체)

```typescript
import { checkMonsterParticleCollision } from './lib/simulator/gameLoop';

for (const particle of particles) {
  for (const monster of monsters) {
    if (checkMonsterParticleCollision(monster, particle)) {
      // 데미지 처리
      particle.hasHit = true;
    }
  }
}
```

## 스킬에서 사용

모든 스킬에는 `visual` 필드에 이펙트 프리셋이 포함되어 있습니다:

```typescript
import { defaultSkills } from './lib/skillSystem';

const fireball = defaultSkills.fireball;
// fireball.visual === EFFECT_PRESETS.projectile_fireball

// 스킬 실행 시 이펙트 생성
const particles = createEffect({
  preset: fireball.visual,
  position: playerPosition,
  targetPosition: mousePosition,
  owner: 'player',
  damage: calculateSkillDamage(fireball, playerStats),
});
```

## UI 컴포넌트

### EffectPreviewCanvasNew
새로운 이펙트 프리셋을 실시간으로 미리보기:

```tsx
import { EffectPreviewCanvasNew } from './components/graphics-effects/EffectPreviewCanvasNew';

<EffectPreviewCanvasNew 
  preset={EFFECT_PRESETS.projectile_fireball}
  width={800}
  height={400}
/>
```

### GraphicsEffectEditorNew
17개 프리셋을 탐색하고 선택:

```tsx
import { GraphicsEffectEditorNew } from './components/GraphicsEffectEditorNew';

<GraphicsEffectEditorNew 
  onPresetSelect={(preset) => console.log(preset)}
  showPreview={true}
/>
```

## 파일 구조

```
lib/
├── skillSystem.ts              # 17개 스킬 + 프리셋 정의
├── simulator/
    ├── types.ts                # 새로운 이펙트 타입 정의
    ├── particles-new.ts        # 5가지 이펙트 구현
    ├── particles.ts            # 레거시 + 새 시스템 export
    ├── gameLoop.ts             # 충돌 감지 함수 추가
    └── index.ts                # 모듈 통합

components/
├── GraphicsEffectEditorNew.tsx           # 새 이펙트 에디터
└── graphics-effects/
    ├── EffectPresetLibrary.tsx          # 프리셋 라이브러리 (업데이트)
    └── EffectPreviewCanvasNew.tsx       # 새 미리보기 캔버스
```

## 다음 단계 (통합 작업)

MultiMonsterSimulator에서 스킬 사용 시 새로운 이펙트를 자동으로 생성하려면:

1. **스킬 실행 핸들러 찾기**
   - MultiMonsterSimulator.tsx에서 스킬 실행 부분 확인
   - 기존 파티클 생성 로직 찾기

2. **이펙트 생성 통합**
   ```typescript
   // 스킬 사용 시
   if (skill.visual.effectType) {
     const newParticles = createEffect({
       preset: skill.visual,
       position: character.position,
       targetPosition: targetPos,
       owner: 'player',
       damage: calculateSkillDamage(skill, character.stats),
     });
     particles.push(...newParticles);
   }
   ```

3. **충돌 처리 추가**
   ```typescript
   // 매 프레임 업데이트
   particles = updateNewParticles(particles, deltaTime, monsters);
   
   // 충돌 체크
   for (const particle of particles) {
     if (particle.effectType === 'projectile' && particle.damage) {
       for (const monster of monsters) {
         if (checkMonsterParticleCollision(monster, particle)) {
           // 데미지 처리
           applyDamage(monster, particle.damage);
           particle.hasHit = true;
         }
       }
     }
   }
   ```

## 성능 최적화

- 파티클 수 제한: 한 화면에 최대 500개
- 수명 관리: life <= 0인 파티클 자동 제거
- 화면 밖 제거: 캔버스 범위를 벗어난 투사체 제거
- 충돌 최적화: hasHit 플래그로 중복 충돌 방지

## 완료된 작업

- ✅ 5가지 이펙트 타입 정의
- ✅ 17개 이펙트 프리셋 구현
- ✅ 파티클 생성/업데이트/렌더링 로직
- ✅ 충돌 감지 시스템
- ✅ 17개 개별 스킬 등록
- ✅ UI 컴포넌트 (에디터, 미리보기)
- ✅ 5가지 파티클 텍스쳐 렌더링

## 기술 세부사항

### 투사체 유도 알고리즘
```typescript
// 300 px/s² 가속도로 타겟 추적
const homingStrength = 300;
const ax = (dx / dist) * homingStrength * deltaTime;
const ay = (dy / dist) * homingStrength * deltaTime;

// 최대 속도 600 px/s 제한
const maxSpeed = 600;
```

### 번개 생성 알고리즘
```typescript
// 세그먼트별로 jitter 적용
const nextX = baseX + (Math.random() - 0.5) * jitter;
const nextY = baseY + (Math.random() - 0.5) * jitter;

// forkChance 확률로 갈라짐
if (Math.random() < forkChance) {
  createForkSegment();
}
```

### 링 확장 알고리즘
```typescript
// 원주에 파티클 배치
const particleCount = Math.floor(maxRadius / 3);
for (let j = 0; j < particleCount; j++) {
  const angle = (j / particleCount) * Math.PI * 2;
  // expansionSpeed로 바깥쪽으로 이동
}
```
