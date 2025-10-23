# 이펙트와 범위 시스템 통합 문서

## 문제점
근접 공격 시 다음 3가지 시각적 요소가 서로 다른 범위를 표시하는 문제가 있었습니다:
1. 범위 UI (파란색 부채꼴) 
2. 스윙 애니메이션 (빨간색 호)
3. 궤적 이펙트

## 해결 방안

### 1. 스킬 범위(area) 값 통일
모든 근접 공격 시각 효과는 스킬의 `area` 값(도 단위)을 기준으로 합니다.

### 2. 코드 위치

#### A. 범위 UI
- 파일: `/components/MultiMonsterSimulator.tsx`
- 위치: 3936-3969줄 (근접 공격 미리보기)
- 위치: 3874-3914줄 (원거리 공격 미리보기)
- 사용 값: `attackWidth = basicAttack?.area`
- 계산: `meleeSwingArc = (attackWidth * Math.PI) / 180`

#### B. 스윙 애니메이션
- 파일: `/components/MultiMonsterSimulator.tsx`
- 위치: 3740-3814줄 (근접 스윙 그리기)
- 사용 값: `meleeWidth = basicAttack?.area`
- 계산: `meleeSwingArc = (meleeWidth * Math.PI) / 180`

#### C. 궤적 이펙트
- 파일: `/lib/simulator/particles-new.ts`
- 함수: `createTrailEffect()`
- 파라미터: 
  - `skillArea` (도 단위) - 호의 각도
  - `skillRange` (픽셀) - 호의 반지름
- 계산: 
  - `radius = skillRange` (스킬 사거리를 반지름으로 사용)
  - `arcAngle = skillArea * Math.PI / 180` (호 각도, slash 타입)

### 3. 데이터 흐름

```
스킬 정의 (Skill)
  └─ area: number (도 단위, 예: 120)
      ├─ 범위 UI: area를 직접 사용
      ├─ 스윙 애니메이션: area를 직접 사용
      └─ 궤적 이펙트: CreateEffectOptions.skillArea로 전달
          └─ particles-new.ts에서 처리
```

### 4. 수정 내역

#### 수정 1: CreateEffectOptions에 skillArea 추가
```typescript
// /lib/simulator/particles-new.ts
export interface CreateEffectOptions {
  // ... 기존 필드들
  skillArea?: number; // 스킬 범위/각도 (궤적 이펙트 길이 조절용)
}
```

#### 수정 2: createTrailEffect에서 skillArea와 skillRange 사용
```typescript
export function createTrailEffect(options: CreateEffectOptions): SkillParticle[] {
  const { preset, position, targetPosition, skillArea, skillRange } = options;
  
  // 스킬 사거리를 우선 사용, 없으면 프리셋 값 사용
  const radius = skillRange || preset.trailLength || 80;
  
  // slash 타입: skillArea 값을 호 각도로 사용, skillRange를 반지름으로 사용
  switch (trailType) {
    case 'slash': {
      const arcAngle = skillArea 
        ? (skillArea * Math.PI / 180) 
        : (preset.trailArcAngle || Math.PI / 2.5);
      const startAngle = angle - arcAngle / 2;
      const currentAngle = startAngle + arcAngle * progress;
      // 반지름은 skillRange 사용
      x = position.x + Math.cos(currentAngle) * radius;
      y = position.y + Math.sin(currentAngle) * radius;
      // ...
    }
  }
}
```

#### 수정 3: createSkillParticles에서 skillArea와 skillRange 전달
```typescript
// /lib/simulator/particles.ts
export function createSkillParticles(...): SkillParticle[] {
  // ...
  if (skill.visual.effectPresetId) {
    const preset = EFFECT_PRESETS[skill.visual.effectPresetId];
    if (preset) {
      return createEffect({
        preset,
        position,
        targetPosition,
        owner,
        monsterId,
        damage,
        skillName: skill.name,
        skillArea: skill.area, // 스킬 범위/각도 전달 (궤적 이펙트용)
        skillRange: skill.range, // 스킬 사거리 전달 (궤적 이펙트 반지름용)
      });
    }
  }
}
```

#### 수정 4: CreateEffectOptions 인터페이스 업데이트
```typescript
// /lib/simulator/particles-new.ts
export interface CreateEffectOptions {
  // ... 기존 필드들
  skillArea?: number; // 스킬 범위/각도 (궤적 이펙트용, 도 단위)
  skillRange?: number; // 스킬 사거리 (궤적 이펙트 반지름용)
}
```

### 5. 테스트 방법

1. 스킬 설정에서 근접 공격의 `area` 값을 변경 (예: 90, 120, 150)
2. 게임 실행
3. 다음 3가지가 모두 같은 각도를 표시하는지 확인:
   - 파란색 부채꼴 (마우스 방향 범위 표시)
   - 빨간색 스윙 애니메이션 (공격 시)
   - 궤적 이펙트 (공격 시, effectPresetId 설정된 경우)

### 6. 최종 수정 사항 (2025-10-23)

**문제**: 근접 공격의 궤적 이펙트(빨간색 호)가 범위 UI(파란색 부채�ol)와 다른 크기로 표시됨

**원인**: 궤적 이펙트가 프리셋의 `trailLength` 값을 반지름으로 사용하고 있었음

**해결**:
1. `CreateEffectOptions`에 `skillRange` 파라미터 추가
2. `createTrailEffect`에서 `skillRange`를 반지름으로 우선 사용
3. `createSkillParticles`에서 `skill.range` 전달

**결과**:
- 범위 UI와 궤적 이펙트가 동일한 반지름(`skill.range`) 사용
- 범위 UI와 궤적 이펙트가 동일한 각도(`skill.area`) 사용
- 스킬 설정에서 `range`와 `area`를 변경하면 모든 시각 요소가 일관되게 변경됨

### 7. 향후 개선 사항

- [ ] 범위 UI를 별도의 렌더링 함수로 분리
- [ ] 스킬 phase (windup, execution, recovery)에 따른 범위 UI 색상 변경
- [ ] 궤적 이펙트와 범위 UI를 완전히 일치시키는 시각적 피드백 추가
- [x] 프리셋 시스템에서 skillRange 우선 사용 (완료)
