import { Bug, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

const SPREADSHEET_ID = '1wtyQMEQn8daGbvmiRikS6n8ChcJzLucFwJ2zAez4w44';

const logSheetDebug = (..._args: unknown[]): void => {};

export function SheetDebugger() {
  const [gid, setGid] = useState('0');
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testSheet = async () => {
    setIsLoading(true);
    setResult('');

    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
      logSheetDebug('Testing URL:', csvUrl);

      const response = await fetch(csvUrl);
      const text = await response.text();

      // Parse CSV for better display
      const lines = text
        .split('\n')
        .filter(l => l.trim())
        .slice(0, 10);
      const formatted = lines.map((line, i) => `Row ${i}: ${line}`).join('\n');

      setResult(
        `✓ Status: ${response.status} OK\n\n=== First 10 Rows ===\n${formatted}\n\n=== Full Preview (500 chars) ===\n${text.substring(0, 500)}...`
      );
    } catch (error) {
      setResult(
        `✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\n시트 공유 설정을 확인하세요!`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const testAllSheets = async () => {
    setIsLoading(true);
    setResult('');

    const results: string[] = [];

    for (let i = 0; i <= 3; i++) {
      try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${i}`;
        const response = await fetch(csvUrl);
        const text = await response.text();
        const firstLine = text.split('\n')[0];

        results.push(`GID ${i}: ✓ (${firstLine.substring(0, 80)}...)`);
      } catch {
        results.push(`GID ${i}: ✗ Failed`);
      }
    }

    setResult(
      `=== All Sheets Test ===\n\n${results.join('\n')}\n\n💡 GID가 작동하는 시트를 찾아 googleSheetsLoader.ts에서 SHEET_GIDS를 업데이트하세요.`
    );
    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Bug className='w-5 h-5' />
          시트 디버거
        </CardTitle>
        <CardDescription>구글 시트 GID를 테스트하고 데이터 구조를 확인하세요</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <Alert>
          <AlertDescription>
            구글 시트의 각 탭은 고유한 GID를 가집니다. 시트 탭을 열었을 때 URL의 #gid=XXXXX 부분을
            확인하세요.
          </AlertDescription>
        </Alert>

        <div className='space-y-2'>
          <Label>Sheet GID</Label>
          <div className='flex gap-2'>
            <Input value={gid} onChange={e => setGid(e.target.value)} placeholder='0' />
            <Button onClick={testSheet} disabled={isLoading}>
              테스트
            </Button>
            <Button onClick={testAllSheets} disabled={isLoading} variant='secondary'>
              전체 스캔
            </Button>
          </div>
        </div>

        <div className='flex gap-2'>
          <Badge variant='outline'>기본 GID: 0</Badge>
          <Button
            variant='link'
            size='sm'
            onClick={() =>
              window.open(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`, '_blank')
            }
          >
            <ExternalLink className='w-3 h-3 mr-1' />
            시트 열기
          </Button>
        </div>

        {result && (
          <div className='space-y-2'>
            <Label>결과</Label>
            <pre className='bg-slate-900 text-slate-100 p-4 rounded text-xs overflow-auto max-h-64'>
              {result}
            </pre>
          </div>
        )}

        <div className='space-y-3'>
          <Alert>
            <AlertDescription>
              <strong>참고:</strong> 구글 시트 연동은 선택사항입니다. 능력치를 찾지 못하면
              기본값으로 게임이 정상 작동합니다.
            </AlertDescription>
          </Alert>

          <div className='bg-blue-50 p-3 rounded text-sm space-y-2'>
            <div>
              💡 <strong>사용 방법:</strong>
            </div>
            <ul className='list-disc list-inside space-y-1 text-xs'>
              <li>
                <strong>"전체 스캔"</strong>: GID 0~3번을 자동으로 테스트합니다
              </li>
              <li>
                <strong>"시트 열기"</strong>: 구글 시트로 이동하여 각 탭의 URL에서 #gid=XXX 확인
              </li>
              <li>
                <strong>"테스트"</strong>: 특정 GID의 데이터를 미리보기
              </li>
            </ul>
          </div>

          <div className='bg-yellow-50 p-3 rounded text-sm space-y-2'>
            <div>
              ⚠️ <strong>시트 연동이 필요하다면:</strong>
            </div>
            <ul className='list-disc list-inside space-y-1 text-xs'>
              <li>시트를 "링크가 있는 사용자에게 공개"로 설정</li>
              <li>첫 번째 행에 hp, atk, def 등의 컬럼명 작성</li>
              <li>두 번째 행에 숫자 데이터 입력</li>
              <li>예: hp | atk | def → 100 | 10 | 5</li>
            </ul>
          </div>

          <div className='bg-green-50 p-3 rounded text-sm space-y-2'>
            <div>
              ✅ <strong>현재 상태:</strong>
            </div>
            <ul className='list-disc list-inside space-y-1 text-xs'>
              <li>게임은 기본 능력치로 정상 작동 중입니다</li>
              <li>플레이어: HP 100 / ATK 10 / DEF 5</li>
              <li>몬스터: HP 50 / ATK 8 / DEF 3</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
