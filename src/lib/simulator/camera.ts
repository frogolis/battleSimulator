/**
 * 카메라 시스템
 * 카메라 위치, 줌, 좌표 변환 로직을 관리합니다.
 */

import { Position } from './types';

/**
 * 카메라 설정
 */
export interface CameraConfig {
  zoom: number; // 줌 배율 (1.0 = 기본)
  followTarget: boolean; // 타겟 추적 여부
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * 월드 좌표를 화면 좌표로 변환 (testMode용)
 * @param worldPos 월드 좌표
 * @param cameraPos 카메라 위치 (보통 플레이어 위치)
 * @param config 카메라 설정
 * @returns 화면 좌표
 */
export function worldToScreen(
  worldPos: Position,
  cameraPos: Position,
  config: CameraConfig
): Position {
  const centerX = config.canvasWidth / 2;
  const centerY = config.canvasHeight / 2;

  return {
    x: (worldPos.x - cameraPos.x) * config.zoom + centerX,
    y: (worldPos.y - cameraPos.y) * config.zoom + centerY,
  };
}

/**
 * 화면 좌표를 월드 좌표로 변환 (testMode용)
 * @param screenPos 화면 좌표
 * @param cameraPos 카메라 위치 (보통 플레이어 위치)
 * @param config 카메라 설정
 * @returns 월드 좌표
 */
export function screenToWorld(
  screenPos: Position,
  cameraPos: Position,
  config: CameraConfig
): Position {
  const centerX = config.canvasWidth / 2;
  const centerY = config.canvasHeight / 2;

  return {
    x: (screenPos.x - centerX) / config.zoom + cameraPos.x,
    y: (screenPos.y - centerY) / config.zoom + cameraPos.y,
  };
}

/**
 * 캔버스 좌표를 월드 좌표로 변환 (마우스 이벤트용)
 * @param canvasX 캔버스 X 좌표
 * @param canvasY 캔버스 Y 좌표
 * @param cameraPos 카메라 위치
 * @param config 카메라 설정
 * @param testMode 테스트 모드 여부
 * @returns 월드 좌표
 */
export function canvasToWorld(
  canvasX: number,
  canvasY: number,
  cameraPos: Position,
  config: CameraConfig,
  testMode: boolean
): Position {
  if (testMode) {
    return screenToWorld({ x: canvasX, y: canvasY }, cameraPos, config);
  }
  
  // 일반 모드에서는 캔버스 좌표 = 월드 좌표
  return { x: canvasX, y: canvasY };
}

/**
 * 줌 값 검증 및 제한
 * @param zoom 줌 값
 * @param min 최소값
 * @param max 최대값
 * @returns 제한된 줌 값
 */
export function clampZoom(zoom: number, min: number = 0.5, max: number = 5.0): number {
  return Math.max(min, Math.min(max, zoom));
}

/**
 * 카메라 흔들림 효과 생성
 * @param intensity 흔들림 강도
 * @returns 흔들림 오프셋
 */
export function generateShake(intensity: number): Position {
  return {
    x: (Math.random() - 0.5) * intensity,
    y: (Math.random() - 0.5) * intensity,
  };
}

/**
 * 카메라 흔들림 적용
 * @param position 원래 위치
 * @param shakeOffset 흔들림 오프셋
 * @returns 흔들림이 적용된 위치
 */
export function applyShake(position: Position, shakeOffset: Position): Position {
  return {
    x: position.x + shakeOffset.x,
    y: position.y + shakeOffset.y,
  };
}

/**
 * 부드러운 카메라 추적
 * @param currentPos 현재 카메라 위치
 * @param targetPos 목표 위치
 * @param smoothness 부드러움 정도 (0-1, 낮을수록 부드러움)
 * @returns 새 카메라 위치
 */
export function smoothFollow(
  currentPos: Position,
  targetPos: Position,
  smoothness: number = 0.1
): Position {
  return {
    x: currentPos.x + (targetPos.x - currentPos.x) * smoothness,
    y: currentPos.y + (targetPos.y - currentPos.y) * smoothness,
  };
}

/**
 * 화면에 보이는지 체크
 * @param worldPos 월드 좌표
 * @param cameraPos 카메라 위치
 * @param config 카메라 설정
 * @param margin 여유 공간
 * @returns 화면에 보이는지 여부
 */
export function isOnScreen(
  worldPos: Position,
  cameraPos: Position,
  config: CameraConfig,
  margin: number = 100
): boolean {
  const screenPos = worldToScreen(worldPos, cameraPos, config);
  
  return (
    screenPos.x >= -margin &&
    screenPos.x <= config.canvasWidth + margin &&
    screenPos.y >= -margin &&
    screenPos.y <= config.canvasHeight + margin
  );
}
