/**
 * 이펙트 생성 코드 편집기.
 * 프리셋 타입에 맞는 기본 코드를 만들고, 직접 수정한 코드가 유효할 때만 프리셋에 반영한다.
 */

import { useEffect, useRef, useState, type ComponentProps } from 'react';
import {
  EFFECT_CODE_API_REFERENCE,
  generateEffectCode,
  validateEffectCode,
  type EffectCodeResult,
} from '../../lib/effects/customCode';
import type { EffectPreset } from '../../lib/effects/presets';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';

interface EffectCodeEditorProps {
  preset: EffectPreset;
  onChange: (updates: Partial<EffectPreset>) => void;
}

const VALIDATION_DELAY_MS = 300;

export function EffectCodeEditor({ preset, onChange }: EffectCodeEditorProps) {
  const enabled = !!preset.useCustomCode;
  const [draft, setDraft] = useState(preset.customCode ?? generateEffectCode(preset));
  const [result, setResult] = useState<EffectCodeResult | null>(null);
  const synced = useRef({ id: preset.id, code: preset.customCode ?? '', type: preset.effectType });

  // 다른 프리셋 선택 등 외부 변경은 초안에 반영하되, 직접 입력 중인 초안은 덮어쓰지 않는다
  useEffect(() => {
    const code = preset.customCode ?? '';
    if (
      synced.current.id !== preset.id ||
      synced.current.code !== code ||
      (!preset.customCode && synced.current.type !== preset.effectType)
    ) {
      synced.current = { id: preset.id, code, type: preset.effectType };
      setDraft(preset.customCode ?? generateEffectCode(preset));
    }
  }, [preset.id, preset.customCode, preset.effectType]);

  const validateAndApply = () => {
    const validation = validateEffectCode(draft, preset);
    setResult(validation);
    if (validation.ok && draft !== preset.customCode) {
      synced.current = { id: preset.id, code: draft, type: preset.effectType };
      onChange({ customCode: draft });
    }
  };

  useEffect(() => {
    if (!enabled) {
      setResult(null);
      return;
    }
    const timer = setTimeout(() => {
      validateAndApply();
    }, VALIDATION_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, enabled, preset, onChange]);

  const applyGeneratedCode = () => {
    const code = generateEffectCode(preset);
    synced.current = { id: preset.id, code, type: preset.effectType };
    setDraft(code);
    onChange({ customCode: code, useCustomCode: true });
  };

  const toggleEnabled = (next: boolean) => {
    if (next && !preset.customCode?.trim()) {
      applyGeneratedCode();
      return;
    }
    onChange({ useCustomCode: next });
  };

  const deleteCode = () => {
    synced.current = { id: preset.id, code: '', type: preset.effectType };
    setDraft(generateEffectCode(preset));
    setResult(null);
    onChange({ customCode: undefined, useCustomCode: false });
  };

  const handleKeyDown: ComponentProps<'textarea'>['onKeyDown'] = event => {
    if (event.key !== 'Tab') return;
    event.preventDefault();
    const target = event.currentTarget;
    const { selectionStart, selectionEnd, value } = target;
    const next = `${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`;
    setDraft(next);
    setResult(null);
    requestAnimationFrame(() => {
      target.selectionStart = target.selectionEnd = selectionStart + 2;
    });
  };

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <Label className='text-xs font-semibold text-slate-700'>
            이펙트 생성 코드 · {preset.name}
          </Label>
          <p className='text-[11px] text-slate-500'>
            위 템플릿에서 이펙트를 선택하세요. 생성 코드를 수정하면 유효한 변경만 미리보기에
            반영됩니다.
          </p>
          <p className='text-[11px] text-slate-500'>
            기본 프리셋은 상단 저장 버튼으로 커스텀 복사본을 만들어야 보관됩니다. 커스텀 프리셋은
            자동 저장됩니다.
          </p>
          <p className='text-[11px] text-amber-700'>
            코드는 브라우저에서 제한 없이 실행됩니다. 신뢰할 수 있는 코드만 사용하세요.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          {!preset.customCode && (
            <button
              type='button'
              onClick={applyGeneratedCode}
              className='rounded border border-slate-300 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-100'
            >
              코드 생성
            </button>
          )}
          {preset.customCode && (
            <button
              type='button'
              onClick={() => {
                if (window.confirm('작성한 코드를 현재 타입의 기본 코드로 바꾸시겠습니까?')) {
                  applyGeneratedCode();
                }
              }}
              className='rounded border border-slate-300 px-2 py-1 text-[10px] text-slate-700 hover:bg-slate-100'
            >
              기본 코드로 되돌리기
            </button>
          )}
          {preset.customCode && (
            <button
              type='button'
              onClick={() => {
                if (window.confirm('사용자 코드를 삭제하고 내장 생성 방식으로 돌아가시겠습니까?')) {
                  deleteCode();
                }
              }}
              className='rounded border border-red-200 px-2 py-1 text-[10px] text-red-700 hover:bg-red-50'
            >
              코드 삭제
            </button>
          )}
          <Label className='text-[10px]'>코드 사용</Label>
          <Switch aria-label='코드 사용' checked={enabled} onCheckedChange={toggleEnabled} />
        </div>
      </div>

      <p className='text-[11px] text-slate-500'>
        {preset.customCode
          ? draft !== preset.customCode
            ? '미적용 코드 초안 · 마지막으로 유효했던 코드가 보관됩니다'
            : enabled
              ? '사용자 코드 실행 중'
              : '저장된 사용자 코드 · 내장 생성 방식 사용 중'
          : '내장 생성 방식의 편집용 코드 · 코드 생성 후 수정할 수 있습니다'}
      </p>
      <textarea
        value={draft}
        onChange={event => {
          setDraft(event.target.value);
          setResult(null);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (enabled && draft !== preset.customCode) validateAndApply();
        }}
        readOnly={!enabled}
        spellCheck={false}
        wrap='off'
        aria-label='이펙트 생성 코드'
        className='h-72 w-full resize-y rounded-md border border-slate-300 bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100 outline-none focus:border-blue-400'
      />
      {enabled && (
        <div
          className={`rounded border px-2 py-1 text-[11px] ${
            result && !result.ok
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {!result
            ? '검사 중...'
            : result.ok
              ? `정상 · 샘플 실행 시 파티클 ${result.particleCount}개`
              : `오류 · ${result.error} (마지막으로 정상이던 코드가 계속 적용됩니다)`}
        </div>
      )}
      <details className='text-[11px] text-slate-600'>
        <summary className='cursor-pointer select-none font-medium'>사용 가능한 값 / 함수</summary>
        <pre className='mt-1 overflow-x-auto rounded bg-slate-100 p-2 font-mono text-[10px] leading-4'>
          {EFFECT_CODE_API_REFERENCE}
        </pre>
      </details>
    </div>
  );
}
