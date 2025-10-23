/**
 * 비주얼 포뮬라 빌더를 위한 타입 정의
 */

export type BlockType = 
  | 'variable'    // 변수: LEVEL, BASE
  | 'operator'    // 연산자: +, -, *, /, ^
  | 'function'    // 함수: MIN, MAX, ROUND, FLOOR, CEIL, IF
  | 'constant'    // 상수: 숫자
  | 'container';  // 컨테이너: IF 조건문, 함수 파라미터

export interface FormulaBlock {
  id: string;
  type: BlockType;
  value?: string | number; // 상수 값 또는 변수 이름
  operator?: '+' | '-' | '*' | '/' | '^';
  functionName?: 'MIN' | 'MAX' | 'ROUND' | 'FLOOR' | 'CEIL' | 'IF' | 'ABS' | 'SQRT' | 'POW';
  children?: FormulaBlock[]; // 함수 파라미터 또는 연산자 피연산자
  color?: string; // UI 색상
}

export interface StatFormula {
  name: string; // HP, SP, ATK, DEF, SPD
  blocks: FormulaBlock[];
  expression: string; // 텍스트 표현
}

/**
 * 블록을 JavaScript 표현식으로 변환
 */
export function blockToExpression(block: FormulaBlock, level: number, baseValue: number): number {
  switch (block.type) {
    case 'constant':
      return Number(block.value) || 0;
    
    case 'variable':
      if (block.value === 'LEVEL') {
        return level;
      } else if (block.value === 'BASE') {
        return baseValue;
      }
      return 0;
    
    case 'operator':
      if (!block.children || block.children.length < 2) return 0;
      const left = blockToExpression(block.children[0], level, baseValue);
      const right = blockToExpression(block.children[1], level, baseValue);
      
      switch (block.operator) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return right !== 0 ? left / right : 0;
        case '^': return Math.pow(left, right);
        default: return 0;
      }
    
    case 'function':
      if (!block.children) return 0;
      const params = block.children.map(child => blockToExpression(child, level, baseValue));
      
      switch (block.functionName) {
        case 'MIN':
          return Math.min(...params);
        case 'MAX':
          return Math.max(...params);
        case 'ROUND':
          return Math.round(params[0] || 0);
        case 'FLOOR':
          return Math.floor(params[0] || 0);
        case 'CEIL':
          return Math.ceil(params[0] || 0);
        case 'ABS':
          return Math.abs(params[0] || 0);
        case 'SQRT':
          return Math.sqrt(params[0] || 0);
        case 'POW':
          return Math.pow(params[0] || 0, params[1] || 0);
        case 'IF':
          // IF(condition > 0, trueValue, falseValue)
          return (params[0] || 0) > 0 ? (params[1] || 0) : (params[2] || 0);
        default:
          return 0;
      }
    
    default:
      return 0;
  }
}

/**
 * 블록을 텍스트 표현식으로 변환
 */
export function blockToText(block: FormulaBlock): string {
  switch (block.type) {
    case 'constant':
      return String(block.value);
    
    case 'variable':
      return String(block.value);
    
    case 'operator':
      if (!block.children || block.children.length < 2) return '';
      return `(${blockToText(block.children[0])} ${block.operator} ${blockToText(block.children[1])})`;
    
    case 'function':
      if (!block.children) return `${block.functionName}()`;
      const params = block.children.map(child => blockToText(child)).join(', ');
      return `${block.functionName}(${params})`;
    
    default:
      return '';
  }
}

/**
 * 텍스트 표현식을 블록으로 파싱 (간단한 파서)
 */
export function textToBlocks(expression: string): FormulaBlock | null {
  // 간단한 예제: "LEVEL * 5 + 100"
  // 더 복잡한 파서가 필요하면 추후 구현
  try {
    const trimmed = expression.trim();
    
    // 숫자 체크
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      return {
        id: generateBlockId(),
        type: 'constant',
        value: num,
      };
    }
    
    // 변수 체크
    if (trimmed === 'LEVEL' || trimmed === 'BASE') {
      return {
        id: generateBlockId(),
        type: 'variable',
        value: trimmed,
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * 블록 ID 생성
 */
export function generateBlockId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 미리 정의된 블록 템플릿
 */
export const blockTemplates: FormulaBlock[] = [
  // 변수
  {
    id: 'template_level',
    type: 'variable',
    value: 'LEVEL',
    color: '#3b82f6',
  },
  {
    id: 'template_base',
    type: 'variable',
    value: 'BASE',
    color: '#8b5cf6',
  },
  
  // 상수
  {
    id: 'template_number',
    type: 'constant',
    value: 0,
    color: '#10b981',
  },
  
  // 연산자
  {
    id: 'template_add',
    type: 'operator',
    operator: '+',
    children: [
      { id: generateBlockId(), type: 'constant', value: 0 },
      { id: generateBlockId(), type: 'constant', value: 0 },
    ],
    color: '#f59e0b',
  },
  {
    id: 'template_multiply',
    type: 'operator',
    operator: '*',
    children: [
      { id: generateBlockId(), type: 'constant', value: 0 },
      { id: generateBlockId(), type: 'constant', value: 0 },
    ],
    color: '#f59e0b',
  },
  {
    id: 'template_power',
    type: 'operator',
    operator: '^',
    children: [
      { id: generateBlockId(), type: 'constant', value: 0 },
      { id: generateBlockId(), type: 'constant', value: 0 },
    ],
    color: '#f59e0b',
  },
  
  // 함수
  {
    id: 'template_min',
    type: 'function',
    functionName: 'MIN',
    children: [
      { id: generateBlockId(), type: 'constant', value: 0 },
      { id: generateBlockId(), type: 'constant', value: 0 },
    ],
    color: '#ec4899',
  },
  {
    id: 'template_max',
    type: 'function',
    functionName: 'MAX',
    children: [
      { id: generateBlockId(), type: 'constant', value: 0 },
      { id: generateBlockId(), type: 'constant', value: 0 },
    ],
    color: '#ec4899',
  },
  {
    id: 'template_round',
    type: 'function',
    functionName: 'ROUND',
    children: [
      { id: generateBlockId(), type: 'constant', value: 0 },
    ],
    color: '#ec4899',
  },
  {
    id: 'template_floor',
    type: 'function',
    functionName: 'FLOOR',
    children: [
      { id: generateBlockId(), type: 'constant', value: 0 },
    ],
    color: '#ec4899',
  },
];

/**
 * 블록 복제 (새 ID 생성)
 */
export function cloneBlock(block: FormulaBlock): FormulaBlock {
  return {
    ...block,
    id: generateBlockId(),
    children: block.children?.map(cloneBlock),
  };
}
