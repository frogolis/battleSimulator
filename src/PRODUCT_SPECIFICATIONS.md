# RPG 게임 시뮬레이터 - 제품 스펙 문서

## 📋 프로젝트 개요

**프로젝트명**: RPG 게임 시뮬레이터 (스프레드시트-Figma-Make 워크플로우)  
**개발 환경**: React + TypeScript + Tailwind CSS  
**버전**: 1.0  
**최종 업데이트**: 2025년 10월

---

## 🎯 핵심 목표

Google Sheets 기반의 데이터 주도형 RPG 게임 시뮬레이터 구축
- 게임 디자이너가 코드 없이 게임 밸런스 테스트 가능
- 실시간 시뮬레이션을 통한 빠른 반복 테스트
- 완전한 캐릭터/스킬/AI 커스터마이징 시스템

---

## 🏗️ 시스템 아키텍처

### 1. 캔버스 시스템
- **해상도**: 1200×700px (고정)
- **렌더링**: HTML5 Canvas 2D Context
- **레이아웃**: 왼쪽 사이드바 메뉴 + 메인 시뮬레이터 캔버스
- **카메라**: 플레이어 중심 추적 카메라 (테스트 모드)

### 2. 데이터 관리 시스템

#### Google Sheets 연동 (8개 데이터 타입)
1. **캐릭터 타입 정의** (CharacterTypes)
   - 전사, 궁수, 마법사 등 프리셋 타입
   - 기본 스탯, 크기, AI 패턴, 스킬 세트 포함

2. **경험치 곡선** (ExpCurve)
   - 레벨별 요구 경험치 설정
   - 커스텀 경험치 곡선 에디터

3. **레벨 기반 스탯** (LevelBasedStats)
   - 레벨업 시 스탯 성장 공식
   - 캐릭터 타입별 차별화된 성장률

4. **스킬 데이터** (Skills)
   - 스킬 효과, 데미지 공식, 쿨다운
   - 시각 효과 설정 (파티클, 이펙트)

5. **아이템 데이터** (Items)
   - 장비 아이템 스탯 보너스
   - 아이템 효과 및 조건

6. **몬스터 AI 패턴** (MonsterAI)
   - 행동 패턴 정의
   - 상태별 조건 및 액션

7. **스탯 공식** (StatFormulas)
   - 복잡한 스탯 계산 공식
   - 능력치 연산자 기반 시스템

8. **키 바인딩** (KeyBindings)
   - 사용자 정의 단축키 설정

---

## 🎮 핵심 게임 시스템

### 1. 전투 시스템

#### 공격 타입
- **근접 공격 (Melee)**: 부채꼴 범위 공격
- **원거리 공격 (Ranged)**: 투사체 기반 공격
- **영역 공격 (Area)**: AOE 범위 피해
- **지속 효과**: 버프/디버프 시스템

#### 데미지 계산
```
데미지 = (기본 데미지 + 공격력 × 계수) × (1 - 방어력 / (방어력 + 100))
크리티컬 = 데미지 × 크리티컬 배율
```

#### 파티클 시스템 (마비노기 모바일 스타일)
- **타격 이펙트**: 일반 공격, 크리티컬, 스킬별 차별화
- **파티클 전략**:
  - `projectile`: 투사체 (델타타임 기반, 픽셀/초)
  - `melee_splash`: 근접 확산 (프레임 기반)
  - `aoe_burst`: 영역 폭발
  - `static`: 정적 이펙트

### 2. 스킬 시스템

#### 스킬 카테고리
- `basicAttack`: 기본 공격 (쿨다운 없음)
- `skill`: 일반 스킬 (SP 소모, 쿨다운)

#### 스킬 타입
- `melee`: 근접 공격
- `ranged`: 원거리 공격
- `damage`: 순수 데미지
- `heal`: 회복
- `buff`: 버프
- `debuff`: 디버프
- `area`: 영역 효과
- `defense`: 방어 스킬

#### 투사체 타입
- `arrow`: 화살
- `fireball`: 화염구
- `lightning`: 번개
- `wave`: 파동
- `energy`: 에너지
- `ice`: 얼음
- `wind`: 바람

#### 이펙트 형태 (10가지)
1. **circle**: 원형 확산
2. **cone**: 부채꼴
3. **line**: 직선
4. **ring**: 링/테두리
5. **star**: 별 모양 (5개 꼭지점)
6. **shield**: 방패 (반원)
7. **dome**: 돔 (반구)
8. **spiral**: 나선
9. **cross**: 십자
10. **wave**: 파동 (sine wave)

#### 이펙트 프리셋 (17개)
| 프리셋 | 설명 | 형태 | 투사체 타입 |
|--------|------|------|-------------|
| 화염구 | 불타는 화염구 | circle | fireball |
| 화살 | 날카로운 화살 | line | arrow |
| 번개 | 번개 공격 | line | lightning |
| 얼음 파편 | 날카로운 얼음 | star | ice |
| 에너지 볼트 | 마법 에너지 | circle | energy |
| 바람 칼날 | 바람 칼날 | wave | wind |
| 베기 | 부채꼴 베기 | cone | none |
| 폭발 | 원형 폭발 | circle | none |
| 충격파 | 링 충격파 | ring | none |
| 별빛 폭발 | 별 모양 폭발 | star | none |
| 방어막 | 보호 방어막 | shield | none |
| 돔 실드 | 돔 형태 보호막 | dome | none |
| 치유의 빛 | 회복 효과 | circle | none |
| 회복의 별 | 별 모양 회복 | star | none |
| 축복 | 황금빛 링 | ring | none |
| 나선 | 회전 효과 | spiral | none |
| 십자 섬광 | 십자 형태 | cross | none |

### 3. 스킬 상세 설정 시스템

#### 기본 설정
- 이름, 설명, 타입, 카테고리
- 아이콘 (lucide-react 기반)
- 태그 시스템

#### 효과 설정 (능력치 기반)
```typescript
{
  statType: 'attack' | 'defense' | 'speed' | 'magic' | 'hp' | 'sp',
  operator: '+' | '-' | '*' | '/',
  value: number
}
```

#### 범위 설정
- **range**: 사거리 (픽셀)
- **area**: 넓이/각도 (도)

#### 타이밍 설정
- **windup**: 준비 시간 (ms)
- **execution**: 실행 시간 (ms)
- **recovery**: 후딜레이 (ms)
- **cooldown**: 재사용 대기 시간 (ms)

#### 투사체 설정
- 타입, 속도 (픽셀/초), 크기

#### 시각 효과 설정
- 파티클 수, 크기, 수명 (ms)
- 색상 (primary, secondary)
- 글로우 강도 (0.0 ~ 1.0)
- 이펙트 형태

### 4. 레벨 및 성장 시스템

#### 경험치 시스템
- 레벨업 요구 경험치 (커스텀 곡선)
- 몬스터 처치 시 경험치 획득
- 레벨 차이에 따른 경험치 보정

#### 스탯 성장
```typescript
interface CharacterStats {
  level: number;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  attack: number;
  defense: number;
  speed: number;
  magic: number;
  critRate: number;
  critDamage: number;
  exp: number;
  expToNext: number;
}
```

### 5. 몬스터 AI 시스템

#### AI 상태
- `IDLE`: 대기
- `CHASE`: 추적
- `ATTACK`: 공격
- `FLEE`: 도망
- `DEFEND`: 방어

#### AI 행동 패턴
```typescript
interface AIPatternConfig {
  aggressive: number;      // 공격성 (0.0 ~ 1.0)
  defensive: number;       // 방어성
  supportive: number;      // 지원성
  moveSpeed: number;       // 이동 속도
  attackRange: number;     // 공격 사거리
  detectionRange: number;  // 감지 범위
  fleeHpThreshold: number; // 도망 HP 임계값 (%)
}
```

#### 안정화 시스템
- 공격 중/쿨다운 중 상태 재평가 방지
- ATTACK 상태 내 추적 로직
- 히스테리시스 적용 (상태 전환 안정화)

---

## 🔧 컴포넌트 구조 (12개 핵심 컴포넌트)

### 1. 시뮬레이터 컴포넌트
- **MultiMonsterSimulator.tsx**: 메인 게임 시뮬레이터
- **SkillTestLab.tsx**: 스킬 테스트 환경

### 2. 데이터 관리 컴포넌트
- **GoogleSheetManager.tsx**: Google Sheets 연동 관리
- **DataExportImport.tsx**: JSON 데이터 내보내기/가져오기
- **SheetDebugger.tsx**: 시트 데이터 디버깅

### 3. 설정 컴포넌트
- **CharacterSettings.tsx**: 캐릭터 스탯 설정
- **SimulatorSettings.tsx**: 시뮬레이터 설정
- **KeyBindingSettings.tsx**: 키 바인딩 설정
- **SkillAndItemSettings.tsx**: 스킬/아이템 설정

### 4. 편집 컴포넌트
- **SkillBuilder.tsx**: 스킬 생성 도구
- **SkillDetailPanel.tsx**: 스킬 상세 설정 패널
- **SkillWorkspace.tsx**: 스킬 작업 공간
- **StatFormulaBuilder.tsx**: 스탯 공식 빌더
- **ExpCurveEditor.tsx**: 경험치 곡선 에디터

### 5. 타입 관리 컴포넌트
- **CharacterTypeManager.tsx**: 캐릭터 타입 관리
- **MonsterTypeDefinition.tsx**: 몬스터 타입 정의
- **MonsterAIPatternEditor.tsx**: AI 패턴 편집기

### 6. 뷰어 컴포넌트
- **PlayerDatasetViewer.tsx**: 플레이어 데이터 뷰어
- **MonsterDatasetViewer.tsx**: 몬스터 데이터 뷰어

### 7. 가이드 컴포넌트
- **MakeConfigGuide.tsx**: 설정 가이드

---

## 📚 라이브러리 구조

### Core Systems (/lib)

#### 1. 게임 데이터 (gameData.ts)
- 캐릭터 스탯 인터페이스
- 몬스터 스탯 인터페이스
- 기본 데이터 구조

#### 2. 스킬 시스템 (skillSystem.ts)
- 스킬 정의 및 관리
- 쿨타임 관리
- 스킬 효과 적용
- 이펙트 프리셋 시스템

#### 3. 아이템 시스템 (itemSystem.ts)
- 아이템 정의
- 장비 효과
- 인벤토리 관리

#### 4. 전투 시스템 (combatSystem.ts)
- 데미지 계산
- 크리티컬 시스템
- 넉백 효과

#### 5. 레벨 시스템 (levelSystem.ts)
- 경험치 관리
- 레벨업 처리
- 스탯 성장

#### 6. 몬스터 AI (monsterAI.ts)
- AI 행동 결정
- 패턴 관리
- 상태 머신

#### 7. 캐릭터 타입 (characterTypes.ts)
- 타입별 프리셋
- 성장 공식
- 기본 스킬 세트

#### 8. 공식 파서 (formulaParser.ts)
- 수식 파싱
- 동적 계산
- 능력치 연산

#### 9. Google Sheets 로더 (googleSheetsLoader.ts)
- 시트 데이터 로딩
- 데이터 검증
- 동기화

### Simulator Modules (/lib/simulator)

#### 1. 타입 정의 (types.ts)
- 캐릭터 상태
- 몬스터 상태
- 투사체
- 파티클

#### 2. 게임 루프 (gameLoop.ts)
- 메인 업데이트 루프
- 델타타임 계산
- 상태 업데이트

#### 3. AI 로직 (ai.ts)
- AI 결정 로직
- 행동 평가
- 우선순위 시스템

#### 4. 렌더링 (rendering.ts)
- 캐릭터 렌더링
- 이펙트 렌더링
- UI 렌더링

#### 5. 파티클 시스템 (particles.ts)
- 파티클 생성
- 파티클 업데이트
- 파티클 렌더링
- 투사체 기능 통합

#### 6. 카메라 (camera.ts)
- 카메라 위치 계산
- 부드러운 추적
- 화면 변환

#### 7. 캐릭터 관리 (characters.ts)
- 캐릭터 생성
- 상태 관리
- 이동 처리

#### 8. 리스폰 (respawn.ts)
- 몬스터 리스폰
- 리스폰 타이머
- 웨이브 관리

#### 9. 상수 (constants.ts)
- 게임 상수 정의
- 밸런스 값

---

## 🎨 UI/UX 시스템

### Shadcn/ui 컴포넌트 (40개 이상)
- 버튼, 입력, 셀렉트, 체크박스
- 다이얼로그, 시트, 팝오버
- 테이블, 탭, 아코디언
- 카드, 배지, 아바타
- 토스트, 알림, 프로그레스
- 차트 (Recharts)
- 기타 고급 UI 컴포넌트

### 스타일 시스템
- **Tailwind CSS v4.0**: 유틸리티 우선 CSS
- **globals.css**: 타이포그래피 토큰 시스템
- **반응형**: 모바일/데스크탑 지원

---

## 🔐 데이터 보안 및 성능

### 데이터 검증
- Google Sheets API 연동 검증
- 데이터 타입 체크 (TypeScript)
- 런타임 검증

### 성능 최적화
- Canvas 기반 렌더링 (60 FPS 목표)
- 델타타임 기반 업데이트
- 파티클 풀링 시스템
- AI 상태 캐싱

### 에러 핸들링
- Sonner 토스트 알림
- 디버깅 모드
- 로그 시스템

---

## 🎯 주요 기능 요약

### ✅ 완료된 기능
1. ✅ Google Sheets 8개 타입 데이터 연동
2. ✅ 완전한 RPG 시스템 (레벨, 스탯, 스킬, 아이템)
3. ✅ 1200×700px 캔버스 시뮬레이터
4. ✅ 왼쪽 사이드바 메뉴 네비게이션
5. ✅ 12개 핵심 컴포넌트 리팩토링
6. ✅ 캐릭터 타입 프리셋 시스템 (전사/궁수/마법사 등)
7. ✅ 마비노기 모바일 스타일 파티클 시스템
8. ✅ 스킬 효과 상세 설정 페이지 (능력치/연산자 기반)
9. ✅ 넓이(각도) 설정을 포함한 스킬 커스터마이징
10. ✅ 몬스터 AI 안정화 (추적-공격-추적 반복 해결)
11. ✅ 히스테리시스 기반 상태 전환
12. ✅ 17개 이펙트 프리셋 시스템
13. ✅ 10가지 이펙트 형태 (circle, cone, line, ring, star, shield, dome, spiral, cross, wave)
14. ✅ 파티클 기반 투사체 시스템 (이펙트 자체가 투사체)

### 🚧 진행 중인 기능
1. 🚧 파티클-투사체 충돌 감지 로직 통합
2. 🚧 이펙트별 세부 동작 튜닝

---

## 📊 기술 스택

### Frontend
- **React 18**: UI 라이브러리
- **TypeScript**: 타입 안정성
- **Tailwind CSS v4.0**: 스타일링
- **Shadcn/ui**: UI 컴포넌트
- **Lucide React**: 아이콘

### Canvas & Graphics
- **HTML5 Canvas 2D**: 렌더링
- **Custom Particle System**: 이펙트

### Data Integration
- **Google Sheets API**: 외부 데이터 소스
- **JSON Import/Export**: 데이터 이동성

### State Management
- **React Refs**: 게임 상태 (성능)
- **React State**: UI 상태

### Utilities
- **Sonner**: 토스트 알림
- **Recharts**: 차트 시각화

---

## 📈 확장 가능성

### 향후 개선 가능 항목
1. 멀티플레이어 지원
2. 추가 캐릭터 타입 (도적, 성직자 등)
3. 더 복잡한 AI 패턴 (머신러닝 기반)
4. 던전/맵 시스템
5. 퀘스트/스토리 시스템
6. PvP 모드
7. 길드/파티 시스템
8. 실시간 리더보드
9. 모바일 앱 버전
10. 사운드 시스템

---

## 📝 사용 사례

### 게임 디자이너
- 밸런스 조정 및 테스트
- 스킬 디자인 및 프로토타입
- AI 패턴 실험

### 개발자
- 게임 로직 검증
- 성능 테스트
- 버그 재현 및 디버깅

### QA 테스터
- 자동화된 시나리오 테스트
- 엣지 케이스 발견
- 리그레션 테스트

---

## 🎓 프로젝트 철학

### 설계 원칙
1. **데이터 주도**: 코드 수정 없이 게임 조정
2. **모듈화**: 독립적이고 재사용 가능한 컴포넌트
3. **타입 안전성**: TypeScript로 런타임 오류 방지
4. **성능 우선**: 60 FPS 유지
5. **사용자 친화적**: 직관적인 UI/UX

### 코드 품질
- ESLint/Prettier 규칙 준수
- 컴포넌트 문서화
- 명확한 네이밍 컨벤션
- 에러 핸들링

---

## 📞 문의 및 지원

프로젝트 구조 문서: `/PROJECT_STRUCTURE.md`  
가이드라인: `/guidelines/Guidelines.md`  
속성 정보: `/Attributions.md`

---

**문서 버전**: 1.0  
**최종 수정일**: 2025년 10월 22일  
**작성자**: Figma Make AI Assistant
