# 게임 시뮬레이터 프로젝트 구조

## 📋 프로젝트 개요
스프레드시트-Figma-Make 워크플로우를 활용한 RPG 게임 시뮬레이터

## 🎯 핵심 기능
- ✅ 실시간 1:1 / 1:다 전투 시뮬레이션
- ✅ Google Sheets 연동 데이터 관리
- ✅ 완전한 RPG 시스템 (레벨, 스킬, 아이템, AI)
- ✅ 스킬 테스트 랩 (무한 SP, 300% 줌)
- ✅ 몬스터 AI 패턴 시스템 (최대 10개 패턴)
- ✅ 플레이어/몬스터 별도 데이터셋 관리

---

## 📁 파일 구조

### 🎮 메인 애플리케이션
```
/App.tsx                    # 메인 앱 (사이드바 메뉴, 뷰 라우팅)
```

### 🧩 핵심 컴포넌트 (/components)

#### 시뮬레이터
- **MultiMonsterSimulator.tsx** - 통합 시뮬레이터 (1:1, 1:다 모드)
- **SkillTestLab.tsx** - 스킬 테스트 전용 환경 (SP 무한, 줌 기능)

#### 설정 관리
- **CharacterSettings.tsx** - 플레이어 캐릭터 설정
- **MonsterTypeDefinition.tsx** - 몬스터 타입별 설정
- **SimulatorSettings.tsx** - 레벨링 시스템 설정
- **SkillAndItemSettings.tsx** - 스킬 & 아이템 관리
- **KeyBindingSettings.tsx** - 키 바인딩 설정
- **CharacterTypeManager.tsx** - 캐릭터 타입 관리

#### 데이터 관리
- **PlayerDatasetViewer.tsx** - 플레이어 데이터셋
- **MonsterDatasetViewer.tsx** - 몬스터 데이터셋
- **GoogleSheetManager.tsx** - Google Sheets 8개 타입 연동
- **MonsterAIPatternEditor.tsx** - AI 패턴 에디터

#### 유틸리티
- **SheetDebugger.tsx** - 데이터 디버깅 도구
- **MakeConfigGuide.tsx** - Make 워크플로우 가이드

### 📚 라이브러리 (/lib)

#### 게임 시스템
- **gameData.ts** - 캐릭터 스탯, 충돌 처리
- **gameLogic.ts** - 게임 로직 (이동, 공격)
- **gameRenderer.ts** - 캔버스 렌더링
- **gameTypes.ts** - 타입 정의

#### RPG 시스템
- **levelSystem.ts** - 레벨링, 경험치 시스템
- **skillSystem.ts** - 스킬 시스템, SP 관리
- **itemSystem.ts** - 아이템 시스템, 버프 관리
- **combatSystem.ts** - 전투 시스템 (플레이어/몬스터 스킬)
- **monsterAI.ts** - AI 패턴 시스템 (최대 10개 패턴)

#### 데이터 관리
- **characterTypes.ts** - 캐릭터 타입 정의
- **googleSheetsLoader.ts** - Google Sheets 로더
- **mockData.ts** - 목 데이터
- **configUtils.ts** - 설정 유틸리티
- **levelBasedStats.ts** - 레벨 기반 스탯 계산
- **gameConstants.ts** - 게임 상수

### 🎨 UI 컴포넌트 (/components/ui)
ShadCN UI 컴포넌트 라이브러리 (42개 컴포넌트)

---

## 🗂️ 데이터 구조

### Google Sheets 8개 타입 시스템
1. **PLAYER_STATS** - 플레이어 기본 스탯
2. **PLAYER_LEVEL** - 플레이어 레벨 설정
3. **MONSTER_STATS** - 몬스터 기본 스탯
4. **MONSTER_LEVEL** - 몬스터 레벨 설정
5. **SKILL_CONFIG** - 스킬 설정
6. **ITEM_CONFIG** - 아이템 설정
7. **AI_PATTERN** - 몬스터 AI 패턴
8. **CHARACTER_TYPE** - 캐릭터 타입 정의

---

## 🎮 주요 기능

### 시뮬레이터 모드
- **1:1 모드** - 플레이어 vs 단일 몬스터
- **1:다 모드** - 플레이어 vs 다수 몬스터 (리스폰)

### 스킬 테스트 랩
- 무한 SP 모드
- 0.5x ~ 3.0x 확대/축소 (기본 300%)
- 플레이어 중심 카메라 추적
- 드래그 앤 드롭 스킬 할당

### 몬스터 AI 시스템
- 조건 기반 패턴 (거리, HP%)
- 10가지 행동: 이동, 공격, 방어, 추적, 도망, 스킬1-4, 대기
- 우선순위 기반 실행
- 최대 10개 패턴 등록

### 전투 시스템
- WASD 이동, 스페이스바 기본 공격
- 숫자키 1-4: 스킬 사용
- F1-F4: 아이템 사용
- 마우스 클릭: 근접/원거리 공격
- 충돌 처리, 대미지 계산

### 레벨 시스템
- 경험치 획득 및 레벨업
- 레벨별 스탯 증가
- 플레이어/몬스터 독립 레벨링

---

## 🔧 기술 스택
- **React** + TypeScript
- **Tailwind CSS** (v4.0)
- **ShadCN UI**
- **Canvas API** (게임 렌더링)
- **Google Sheets API** (데이터 연동)
- **Sonner** (토스트 알림)
- **Lucide React** (아이콘)

---

## 📊 캔버스 해상도
- 기본: **1200 × 700px**
- 스킬 테스트 랩: **1200 × 600px**

---

## 🗑️ 제거된 파일 (2024-10-20 리팩토링)

### 컴포넌트
- ~~BasicAttackSettings.tsx~~ → SkillAndItemSettings로 통합
- ~~CanvasSimulator.tsx~~ → MultiMonsterSimulator로 대체
- ~~DatasetViewer.tsx~~ → Player/MonsterDatasetViewer로 분리
- ~~FigmaSimulator.tsx~~ → 미사용
- ~~MonsterSpawnSettings.tsx~~ → MultiMonsterSimulator 내장

### 문서
- ~~MONSTER_AI_PATTERN_GUIDE.md~~
- ~~MONSTER_SKILL_INTEGRATION_STATUS.md~~
- ~~SIMULATOR_ARCHITECTURE.md~~
- ~~SKILL_INTEGRATION_ARCHITECTURE.md~~
- ~~SKILL_SYSTEM_ARCHITECTURE.md~~
- ~~SKILL_SYSTEM_GUIDE.md~~
- ~~UNIFIED_ARCHITECTURE.md~~

---

## 🚀 개발 히스토리
- Google Sheets 8개 타입 시스템 구축
- 몬스터 AI 패턴 시스템 완성
- 스킬 테스트 랩 testMode 환경 구현
- SP 무한 모드 & 300% 줌 기본 설정
- 중복 컴포넌트 제거 및 코드 정리

---

## 📝 남은 문서
- **Attributions.md** - 라이센스 및 크레딧
- **PROJECT_STRUCTURE.md** - 이 파일 (프로젝트 구조 요약)
