import { describe, it, expect } from "vitest";

// 테스트 대상 함수 예시
function add(a: number, b: number): number {
  return a + b;
}

describe("math utility", () => {
  it("should add two numbers correctly", () => {
    const result = add(2, 3);
    expect(result).toBe(5);
  });
});
