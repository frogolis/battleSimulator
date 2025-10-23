/**
 * 시뮬레이터 상수
 * 게임 플레이에 사용되는 모든 상수값을 정의합니다.
 */

/**
 * 공격 쿨다운 시간 (밀리초)
 */
export const ATTACK_COOLDOWN = 1000;

/**
 * 투사체 속도 (픽셀/초)
 */
export const PROJECTILE_SPEED = 300;

/**
 * 투사체 크기 (픽셀)
 */
export const PROJECTILE_SIZE = 8;

/**
 * 투사체 최대 이동 거리 (픽셀)
 */
export const PROJECTILE_MAX_DISTANCE = 400;

/**
 * 투사체 페이드 시작 거리 (픽셀)
 */
export const PROJECTILE_FADE_START = 300;

/**
 * 근접 공격 스윙 지속 시간 (밀리초)
 */
export const MELEE_SWING_DURATION = 250;

/**
 * 몬스터 감지 범위 (픽셀)
 * @deprecated 현재는 사용하지 않음 (무제한 감지)
 */
export const MONSTER_DETECTION_RANGE = 200;

/**
 * 몬스터 후퇴 HP 퍼센트
 * 이 값 이하로 HP가 떨어지면 후퇴 AI 상태로 전환
 */
export const MONSTER_RETREAT_HP_PERCENT = 0.3;

/**
 * 몬스터 배회 속도 배율
 * @deprecated 현재는 사용하지 않음
 */
export const MONSTER_WANDER_SPEED = 0.3;

/**
 * 기본 리스폰 딜레이 (밀리초)
 */
export const DEFAULT_RESPAWN_DELAY = 2000;

/**
 * 기본 캔버스 너비 (픽셀)
 */
export const DEFAULT_CANVAS_WIDTH = 1200;

/**
 * 기본 캔버스 높이 (픽셀)
 */
export const DEFAULT_CANVAS_HEIGHT = 700;

/**
 * 테스트 모드 기본 줌 배율
 */
export const DEFAULT_TEST_ZOOM = 3.0;

/**
 * 프레임 업데이트 간격 (밀리초)
 */
export const FRAME_INTERVAL = 16; // ~60 FPS
