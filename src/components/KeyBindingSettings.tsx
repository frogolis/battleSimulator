import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Keyboard, Mouse, RotateCcw } from 'lucide-react';

export interface KeyBindings {
  moveUp: string;
  moveDown: string;
  moveLeft: string;
  moveRight: string;
  attack: string;
  skill1: string;
  skill2: string;
  skill3: string;
  skill4: string;
  mouseAttack: number; // 0 = left, 1 = middle, 2 = right
  mouseSkill: number;
}

interface KeyBindingSettingsProps {
  bindings: KeyBindings;
  onBindingsChange: (bindings: KeyBindings) => void;
}

const defaultBindings: KeyBindings = {
  moveUp: 'w',
  moveDown: 's',
  moveLeft: 'a',
  moveRight: 'd',
  attack: ' ', // spacebar
  skill1: '1',
  skill2: '2',
  skill3: '3',
  skill4: '4',
  mouseAttack: 0, // left click
  mouseSkill: 2, // right click
};

export function KeyBindingSettings({ bindings, onBindingsChange }: KeyBindingSettingsProps) {
  const [listening, setListening] = useState<string | null>(null);

  const startListening = (key: keyof KeyBindings) => {
    if (key.startsWith('mouse')) return;
    setListening(key);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!listening) return;
    e.preventDefault();

    const key = e.key.toLowerCase();
    onBindingsChange({
      ...bindings,
      [listening]: key,
    });
    setListening(null);
  };

  const resetToDefaults = () => {
    onBindingsChange(defaultBindings);
  };

  const getKeyDisplay = (key: string) => {
    if (key === ' ') return 'Space';
    if (key === 'arrowup') return '↑';
    if (key === 'arrowdown') return '↓';
    if (key === 'arrowleft') return '←';
    if (key === 'arrowright') return '→';
    return key.toUpperCase();
  };

  const getMouseButtonName = (button: number) => {
    if (button === 0) return '좌클릭';
    if (button === 1) return '휠클릭';
    if (button === 2) return '우클릭';
    return `버튼 ${button}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='flex items-center gap-2'>
              <Keyboard className='w-5 h-5' />키 설정
            </CardTitle>
            <CardDescription>키보드와 마우스 컨트롤 설정</CardDescription>
          </div>
          <Button onClick={resetToDefaults} variant='outline' size='sm'>
            <RotateCcw className='w-4 h-4 mr-2' />
            초기화
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className='space-y-6' onKeyDown={handleKeyDown} tabIndex={0}>
          {/* Keyboard Bindings */}
          <div className='space-y-3'>
            <h4 className='flex items-center gap-2 text-sm'>
              <Keyboard className='w-4 h-4' />
              키보드
            </h4>
            <div className='grid grid-cols-3 gap-3'>
              <div className='space-y-2'>
                <Label className='text-xs text-slate-600'>위로 이동</Label>
                <Button
                  onClick={() => startListening('moveUp')}
                  variant={listening === 'moveUp' ? 'default' : 'outline'}
                  className='w-full'
                  size='sm'
                >
                  {listening === 'moveUp' ? '키 입력 대기...' : getKeyDisplay(bindings.moveUp)}
                </Button>
              </div>
              <div className='space-y-2'>
                <Label className='text-xs text-slate-600'>아래로 이동</Label>
                <Button
                  onClick={() => startListening('moveDown')}
                  variant={listening === 'moveDown' ? 'default' : 'outline'}
                  className='w-full'
                  size='sm'
                >
                  {listening === 'moveDown' ? '키 입력 대기...' : getKeyDisplay(bindings.moveDown)}
                </Button>
              </div>
              <div className='space-y-2'>
                <Label className='text-xs text-slate-600'>왼쪽 이동</Label>
                <Button
                  onClick={() => startListening('moveLeft')}
                  variant={listening === 'moveLeft' ? 'default' : 'outline'}
                  className='w-full'
                  size='sm'
                >
                  {listening === 'moveLeft' ? '키 입력 대기...' : getKeyDisplay(bindings.moveLeft)}
                </Button>
              </div>
              <div className='space-y-2'>
                <Label className='text-xs text-slate-600'>오른쪽 이동</Label>
                <Button
                  onClick={() => startListening('moveRight')}
                  variant={listening === 'moveRight' ? 'default' : 'outline'}
                  className='w-full'
                  size='sm'
                >
                  {listening === 'moveRight'
                    ? '키 입력 대기...'
                    : getKeyDisplay(bindings.moveRight)}
                </Button>
              </div>
              <div className='space-y-2'>
                <Label className='text-xs text-slate-600'>공격</Label>
                <Button
                  onClick={() => startListening('attack')}
                  variant={listening === 'attack' ? 'default' : 'outline'}
                  className='w-full'
                  size='sm'
                >
                  {listening === 'attack' ? '키 입력 대기...' : getKeyDisplay(bindings.attack)}
                </Button>
              </div>
              <div className='space-y-2'>
                <Label className='text-xs text-slate-600'>스킬 1</Label>
                <Button
                  onClick={() => startListening('skill1')}
                  variant={listening === 'skill1' ? 'default' : 'outline'}
                  className='w-full'
                  size='sm'
                >
                  {listening === 'skill1' ? '키 입력 대기...' : getKeyDisplay(bindings.skill1)}
                </Button>
              </div>
              <div className='space-y-2'>
                <Label className='text-xs text-slate-600'>스킬 2</Label>
                <Button
                  onClick={() => startListening('skill2')}
                  variant={listening === 'skill2' ? 'default' : 'outline'}
                  className='w-full'
                  size='sm'
                >
                  {listening === 'skill2' ? '키 입력 대기...' : getKeyDisplay(bindings.skill2)}
                </Button>
              </div>
              <div className='space-y-2'>
                <Label className='text-xs text-slate-600'>스킬 3</Label>
                <Button
                  onClick={() => startListening('skill3')}
                  variant={listening === 'skill3' ? 'default' : 'outline'}
                  className='w-full'
                  size='sm'
                >
                  {listening === 'skill3' ? '키 입력 대기...' : getKeyDisplay(bindings.skill3)}
                </Button>
              </div>
              <div className='space-y-2'>
                <Label className='text-xs text-slate-600'>스킬 4</Label>
                <Button
                  onClick={() => startListening('skill4')}
                  variant={listening === 'skill4' ? 'default' : 'outline'}
                  className='w-full'
                  size='sm'
                >
                  {listening === 'skill4' ? '키 입력 대기...' : getKeyDisplay(bindings.skill4)}
                </Button>
              </div>
            </div>
          </div>

          {/* Mouse Bindings */}
          <div className='space-y-3'>
            <h4 className='flex items-center gap-2 text-sm'>
              <Mouse className='w-4 h-4' />
              마우스
            </h4>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-2'>
                <Label className='text-xs text-slate-600'>공격</Label>
                <div className='flex gap-2'>
                  {[0, 1, 2].map(btn => (
                    <Button
                      key={btn}
                      onClick={() => onBindingsChange({ ...bindings, mouseAttack: btn })}
                      variant={bindings.mouseAttack === btn ? 'default' : 'outline'}
                      size='sm'
                      className='flex-1'
                    >
                      {getMouseButtonName(btn)}
                    </Button>
                  ))}
                </div>
              </div>
              <div className='space-y-2'>
                <Label className='text-xs text-slate-600'>스킬</Label>
                <div className='flex gap-2'>
                  {[0, 1, 2].map(btn => (
                    <Button
                      key={btn}
                      onClick={() => onBindingsChange({ ...bindings, mouseSkill: btn })}
                      variant={bindings.mouseSkill === btn ? 'default' : 'outline'}
                      size='sm'
                      className='flex-1'
                    >
                      {getMouseButtonName(btn)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className='bg-blue-50 p-3 rounded-lg text-xs text-blue-900'>
            <p>💡 키보드 버튼을 클릭한 후 원하는 키를 눌러 설정할 수 있습니다.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { defaultBindings };
