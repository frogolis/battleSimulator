# 근접 공격 이펙트 테스트 가이드

## 수정 내용 요약

근접 공격의 **궤적 이펙트**(빨간색 호)가 **범위 UI**(파란색 부채꼴)와 일치하도록 수정했습니다.

### 이전 문제
- 범위 UI: 스킬의 `range`와 `area` 값 사용 ✓
- 궤적 이펙트: 프리셋의 고정값 `trailLength` 사용 ✗

### 수정 후
- 범위 UI: 스킬의 `range`와 `area` 값 사용 ✓
- 궤적 이펙트: 스킬의 `range`와 `area` 값 사용 ✓

## 테스트 방법

### 1. 기본 공격 스킬 설정 확인

기본 공격 스킬에 다음이 설정되어 있는지 확인:
```typescript
{
  type: 'melee',
  range: 100,        // 사거리 (반지름)
  area: 120,         // 넓이 (각도, 도 단위)
  visual: {
    effectPresetId: 'trail_slash'  // 궤적 이펙트 프리셋
  }
}
```

### 2. 시각적 확인

게임을 실행하고 근접 공격을 수행했을 때:

1. **범위 UI (파란색 부채꼴)**
   - 마우스 방향으로 부채꼴 모양 표시
   - 반지름 = `range` 값
   - 각도 = `area` 값

2. **궤적 이펙트 (빨간색 호)**
   - 공격 시 빨간색 호 형태로 표시
   - 반지름 = `range` 값 (범위 UI와 동일)
   - 각도 = `area` 값 (범위 UI와 동일)

### 3. 값 변경 테스트

#### Test Case 1: 범위(range) 변경
```
range: 80 → 파란색 부채꼴과 빨간색 호 모두 작아짐
range: 120 → 파란색 부채꼴과 빨간색 호 모두 커짐
```

#### Test Case 2: 넓이(area) 변경
```
area: 90 → 파란색 부채꼴과 빨간색 호 모두 좁아짐 (90도)
area: 150 → 파란색 부채꼴과 빨간색 호 모두 넓어짐 (150도)
```

#### Test Case 3: 동시 변경
```
range: 150, area: 180
→ 파란색 부채꼴과 빨간색 호 모두 크고 넓어짐 (반원 모양)
```

## 예상 결과

✓ 범위 UI와 궤적 이펙트가 완전히 겹쳐 보여야 함
✓ `range` 값 변경 시 두 개 모두 동일하게 크기 변경
✓ `area` 값 변경 시 두 개 모두 동일하게 각도 변경

## 문제 발생 시 체크리스트

### 궤적 이펙트가 표시되지 않는 경우
- [ ] 기본 공격 스킬에 `visual.effectPresetId`가 설정되어 있는가?
- [ ] `effectPresetId`가 `trail_slash` 또는 다른 trail 타입인가?
- [ ] 콘솔에 에러 메시지가 있는가?

### 궤적 이펙트 크기가 다른 경우
- [ ] `createTrailEffect` 함수가 `skillRange`를 사용하는가?
- [ ] `createSkillParticles`에서 `skillRange: skill.range`를 전달하는가?
- [ ] 프리셋의 `trailLength`가 너무 큰 값인가?

### 궤적 이펙트 각도가 다른 경우
- [ ] `createTrailEffect` 함수가 `skillArea`를 사용하는가?
- [ ] `createSkillParticles`에서 `skillArea: skill.area`를 전달하는가?
- [ ] 프리셋의 `trailArcAngle`이 우선되고 있지 않은가?

## 코드 위치

### 수정된 파일
1. `/lib/simulator/particles-new.ts`
   - `CreateEffectOptions` 인터페이스에 `skillRange` 추가
   - `createTrailEffect` 함수에서 `skillRange` 사용

2. `/lib/simulator/particles.ts`
   - `createSkillParticles` 함수에서 `skillRange: skill.range` 전달

### 관련 렌더링 코드
- `/components/MultiMonsterSimulator.tsx`
  - 3936-3969줄: 범위 UI (파란색 부채꼴)
  - 3740-3814줄: 스윙 애니메이션
  - 3699-3700줄: 궤적 이펙트 렌더링

## 추가 정보

- 전체 시스템 문서: `/EFFECT_AND_RANGE_SYSTEM.md`
- 새로운 이펙트 시스템 가이드: `/NEW_EFFECT_SYSTEM_GUIDE.md`
