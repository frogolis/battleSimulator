/**
 * 엑셀 스타일 수식을 블록으로 변환하는 고급 파서
 */

import { FormulaBlock, generateBlockId } from './formulaTypes';

// 토큰 타입
type TokenType = 
  | 'NUMBER'
  | 'VARIABLE'
  | 'FUNCTION'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA';

interface Token {
  type: TokenType;
  value: string;
  position: number;
}

/**
 * 수식을 토큰으로 분해
 */
function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  
  while (i < formula.length) {
    const char = formula[i];
    
    // 공백 무시
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    
    // 숫자 (소수 포함)
    if (/\d/.test(char) || (char === '.' && i + 1 < formula.length && /\d/.test(formula[i + 1]))) {
      let num = '';
      while (i < formula.length && (/\d/.test(formula[i]) || formula[i] === '.')) {
        num += formula[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: num, position: i - num.length });
      continue;
    }
    
    // 변수 또는 함수 (대문자로 시작)
    if (/[A-Z]/.test(char)) {
      let word = '';
      while (i < formula.length && /[A-Z_]/.test(formula[i])) {
        word += formula[i];
        i++;
      }
      
      // 다음 문자가 ( 이면 함수
      if (i < formula.length && formula[i] === '(') {
        tokens.push({ type: 'FUNCTION', value: word, position: i - word.length });
      } else {
        tokens.push({ type: 'VARIABLE', value: word, position: i - word.length });
      }
      continue;
    }
    
    // 연산자
    if ('+-*/^'.includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char, position: i });
      i++;
      continue;
    }
    
    // 괄호
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: char, position: i });
      i++;
      continue;
    }
    
    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: char, position: i });
      i++;
      continue;
    }
    
    // 쉼표
    if (char === ',') {
      tokens.push({ type: 'COMMA', value: char, position: i });
      i++;
      continue;
    }
    
    // 알 수 없는 문자
    throw new Error(`알 수 없는 문자: ${char} at position ${i}`);
  }
  
  return tokens;
}

/**
 * 재귀적 하향 파서
 */
class Parser {
  private tokens: Token[];
  private current: number;
  
  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.current = 0;
  }
  
  private peek(): Token | null {
    return this.current < this.tokens.length ? this.tokens[this.current] : null;
  }
  
  private consume(): Token {
    return this.tokens[this.current++];
  }
  
  private expect(type: TokenType): Token {
    const token = this.peek();
    if (!token || token.type !== type) {
      throw new Error(`Expected ${type} but got ${token?.type || 'EOF'}`);
    }
    return this.consume();
  }
  
  // 수식 파싱 (최상위)
  parse(): FormulaBlock {
    const result = this.parseExpression();
    if (this.current < this.tokens.length) {
      throw new Error('Unexpected tokens after expression');
    }
    return result;
  }
  
  // 표현식 파싱 (덧셈/뺄셈 우선순위)
  private parseExpression(): FormulaBlock {
    let left = this.parseTerm();
    
    while (this.peek()?.type === 'OPERATOR' && (this.peek()!.value === '+' || this.peek()!.value === '-')) {
      const operator = this.consume().value as '+' | '-';
      const right = this.parseTerm();
      
      left = {
        id: generateBlockId(),
        type: 'operator',
        operator,
        color: '#f59e0b',
        children: [left, right],
      };
    }
    
    return left;
  }
  
  // 항 파싱 (곱셈/나눗셈 우선순위)
  private parseTerm(): FormulaBlock {
    let left = this.parseFactor();
    
    while (this.peek()?.type === 'OPERATOR' && (this.peek()!.value === '*' || this.peek()!.value === '/')) {
      const operator = this.consume().value as '*' | '/';
      const right = this.parseFactor();
      
      left = {
        id: generateBlockId(),
        type: 'operator',
        operator,
        color: '#f59e0b',
        children: [left, right],
      };
    }
    
    return left;
  }
  
  // 인자 파싱 (거듭제곱, 괄호, 변수, 함수, 숫자)
  private parseFactor(): FormulaBlock {
    let base = this.parsePrimary();
    
    // 거듭제곱 (우결합)
    if (this.peek()?.type === 'OPERATOR' && this.peek()!.value === '^') {
      this.consume();
      const exponent = this.parseFactor(); // 재귀적 호출
      
      return {
        id: generateBlockId(),
        type: 'operator',
        operator: '^',
        color: '#f59e0b',
        children: [base, exponent],
      };
    }
    
    return base;
  }
  
  // 기본 요소 파싱
  private parsePrimary(): FormulaBlock {
    const token = this.peek();
    
    if (!token) {
      throw new Error('Unexpected end of expression');
    }
    
    // 숫자
    if (token.type === 'NUMBER') {
      this.consume();
      return {
        id: generateBlockId(),
        type: 'constant',
        value: parseFloat(token.value),
        color: '#10b981',
      };
    }
    
    // 변수
    if (token.type === 'VARIABLE') {
      this.consume();
      return {
        id: generateBlockId(),
        type: 'variable',
        value: token.value,
        color: '#3b82f6',
      };
    }
    
    // 함수
    if (token.type === 'FUNCTION') {
      return this.parseFunction();
    }
    
    // 괄호로 묶인 표현식
    if (token.type === 'LPAREN') {
      this.consume();
      const expr = this.parseExpression();
      this.expect('RPAREN');
      return expr;
    }
    
    throw new Error(`Unexpected token: ${token.type} "${token.value}"`);
  }
  
  // 함수 파싱
  private parseFunction(): FormulaBlock {
    const funcToken = this.expect('FUNCTION');
    const funcName = funcToken.value as any;
    
    this.expect('LPAREN');
    
    // 파라미터 파싱
    const params: FormulaBlock[] = [];
    
    if (this.peek()?.type !== 'RPAREN') {
      params.push(this.parseExpression());
      
      while (this.peek()?.type === 'COMMA') {
        this.consume();
        params.push(this.parseExpression());
      }
    }
    
    this.expect('RPAREN');
    
    return {
      id: generateBlockId(),
      type: 'function',
      functionName: funcName,
      color: '#ec4899',
      children: params,
    };
  }
}

/**
 * 엑셀 스타일 수식을 블록으로 변환
 */
export function parseFormulaToBlocks(formula: string): FormulaBlock[] {
  try {
    const tokens = tokenize(formula);
    const parser = new Parser(tokens);
    const block = parser.parse();
    return [block];
  } catch (error) {
    console.error('수식 파싱 오류:', error);
    throw error;
  }
}

/**
 * 수식 유효성 검증
 */
export function validateFormula(formula: string): { valid: boolean; error?: string } {
  try {
    parseFormulaToBlocks(formula);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    };
  }
}

/**
 * 예시 수식들
 */
export const exampleFormulas = {
  simple: [
    { label: '선형 증가', formula: 'LEVEL * 5' },
    { label: '기본값 포함', formula: 'LEVEL * 2 + 10' },
    { label: '지수 증가', formula: 'LEVEL ^ 2' },
  ],
  intermediate: [
    { label: '복합 연산', formula: 'LEVEL * 5 + LEVEL ^ 2' },
    { label: '최솟값 제한', formula: 'MAX(LEVEL * 10, 50)' },
    { label: '반올림', formula: 'ROUND(LEVEL * 1.5)' },
  ],
  advanced: [
    { label: '구간별 증가', formula: 'MIN(LEVEL * 15, 300)' },
    { label: '복잡한 수식', formula: 'ROUND(LEVEL * 2.5) + MAX(LEVEL - 10, 0) * 3' },
    { label: '제곱근 기반', formula: 'FLOOR(SQRT(LEVEL) * 20)' },
  ],
};
