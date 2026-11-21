import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import { Webhook, Zap, FileJson, AlertCircle, CheckCircle2 } from 'lucide-react';

export function MakeConfigGuide() {
  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Zap className='w-5 h-5 text-purple-600' />
            Make(Integromat) 시나리오 구성
          </CardTitle>
          <CardDescription>구글 시트 → Figma Variables API 동기화</CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <Alert>
            <Webhook className='w-4 h-4' />
            <AlertTitle>목표</AlertTitle>
            <AlertDescription>
              시트 값 변경 감지 → Figma 변수로 자동 반영하여 실시간 프로토타입 업데이트
            </AlertDescription>
          </Alert>

          <Tabs defaultValue='workflow'>
            <TabsList className='grid w-full grid-cols-3'>
              <TabsTrigger value='workflow'>워크플로우</TabsTrigger>
              <TabsTrigger value='api'>API 요청</TabsTrigger>
              <TabsTrigger value='figma'>Figma 설정</TabsTrigger>
            </TabsList>

            <TabsContent value='workflow' className='space-y-4'>
              <div className='space-y-4'>
                <div className='flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200'>
                  <div className='w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center flex-shrink-0'>
                    1
                  </div>
                  <div className='flex-1 space-y-2'>
                    <h4 className='text-green-900'>Google Sheets - Watch Rows</h4>
                    <p className='text-sm text-green-700'>시트의 행 변경/추가를 감지합니다.</p>
                    <div className='bg-white p-3 rounded text-xs font-mono'>
                      <div>
                        Spreadsheet ID: <span className='text-blue-600'>YOUR_SHEET_ID</span>
                      </div>
                      <div>
                        Sheet Name: <span className='text-blue-600'>Dataset</span>
                      </div>
                      <div>
                        Trigger: <span className='text-blue-600'>On Update</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className='flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200'>
                  <div className='w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0'>
                    2
                  </div>
                  <div className='flex-1 space-y-2'>
                    <h4 className='text-blue-900'>Iterator (선택사항)</h4>
                    <p className='text-sm text-blue-700'>
                      여러 행이 동시에 변경된 경우, 한 건씩 처리합니다.
                    </p>
                    <div className='bg-white p-3 rounded text-xs font-mono'>
                      <div>
                        Array: <span className='text-blue-600'>{'{{1.values}}'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className='flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200'>
                  <div className='w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0'>
                    3
                  </div>
                  <div className='flex-1 space-y-2'>
                    <h4 className='text-purple-900'>HTTP - Figma Variables API</h4>
                    <p className='text-sm text-purple-700'>
                      Figma 변수를 업데이트합니다. (아래 API 탭 참고)
                    </p>
                    <div className='bg-white p-3 rounded text-xs font-mono space-y-1'>
                      <div>
                        Method: <Badge>POST</Badge>
                      </div>
                      <div>
                        URL:{' '}
                        <span className='text-purple-600'>
                          https://api.figma.com/v1/files/FILE_KEY/variables
                        </span>
                      </div>
                      <div>
                        Header: <span className='text-purple-600'>X-Figma-Token: YOUR_TOKEN</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className='flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200'>
                  <div className='w-8 h-8 rounded-full bg-yellow-600 text-white flex items-center justify-center flex-shrink-0'>
                    4
                  </div>
                  <div className='flex-1 space-y-2'>
                    <h4 className='text-yellow-900'>Sleep (Rate Limit 방지)</h4>
                    <p className='text-sm text-yellow-700'>API 호출 간격 조절 (200-500ms 권장)</p>
                    <div className='bg-white p-3 rounded text-xs font-mono'>
                      <div>
                        Delay: <span className='text-yellow-600'>300ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value='api' className='space-y-4'>
              <Alert>
                <FileJson className='w-4 h-4' />
                <AlertTitle>Figma Variables API</AlertTitle>
                <AlertDescription>
                  최신 Figma REST API를 사용하여 변수 값을 업데이트합니다.
                </AlertDescription>
              </Alert>

              <div className='space-y-3'>
                <div>
                  <h4 className='text-sm mb-2'>HTTP Request 예시</h4>
                  <div className='bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono overflow-x-auto space-y-2'>
                    <div className='text-blue-400'>POST</div>
                    <div className='text-green-400'>
                      https://api.figma.com/v1/files/{'<FILE_KEY>'}/variables
                    </div>
                    <div className='mt-3 text-slate-400'>// Headers</div>
                    <div className='text-yellow-300'>{`{
  "X-Figma-Token": "YOUR_PERSONAL_ACCESS_TOKEN",
  "Content-Type": "application/json"
}`}</div>
                  </div>
                </div>

                <div>
                  <h4 className='text-sm mb-2'>Request Body (JSON)</h4>
                  <div className='bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono overflow-x-auto'>
                    <pre className='whitespace-pre-wrap'>{`{
  "variableCollections": {
    "<COLLECTION_ID>": {
      "modes": {
        "<MODE_ID>": {
          "variables": {
            "vx": {
              "type": "FLOAT",
              "value": 250
            },
            "vy": {
              "type": "FLOAT",
              "value": 180
            },
            "vr_atk": {
              "type": "FLOAT",
              "value": 60
            },
            "vr_skill": {
              "type": "FLOAT",
              "value": 30
            },
            "v_attack": {
              "type": "BOOLEAN",
              "value": true
            },
            "v_miss": {
              "type": "BOOLEAN",
              "value": false
            },
            "v_crit": {
              "type": "BOOLEAN",
              "value": true
            }
          }
        }
      }
    }
  }
}`}</pre>
                  </div>
                </div>

                <div>
                  <h4 className='text-sm mb-2'>Make에서 동적 매핑</h4>
                  <div className='bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono overflow-x-auto'>
                    <pre className='whitespace-pre-wrap'>{`{
  "variableCollections": {
    "<COLLECTION_ID>": {
      "modes": {
        "<MODE_ID>": {
          "variables": {
            "vx": {
              "type": "FLOAT",
              "value": {{2.x}}
            },
            "vy": {
              "type": "FLOAT",
              "value": {{2.y}}
            },
            "vr_atk": {
              "type": "FLOAT",
              "value": {{2.atk_range}}
            },
            "vr_skill": {
              "type": "FLOAT",
              "value": {{2.skill_range}}
            },
            "v_attack": {
              "type": "BOOLEAN",
              "value": {{if(2.is_attack = 1, true, false)}}
            },
            "v_miss": {
              "type": "BOOLEAN",
              "value": {{if(2.is_miss = 1, true, false)}}
            },
            "v_crit": {
              "type": "BOOLEAN",
              "value": {{if(2.is_crit = 1, true, false)}}
            }
          }
        }
      }
    }
  }
}`}</pre>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value='figma' className='space-y-4'>
              <Alert>
                <CheckCircle2 className='w-4 h-4' />
                <AlertTitle>Figma 변수 설정</AlertTitle>
                <AlertDescription>
                  Variables 패널에서 아래 변수들을 생성하고 레이어에 바인딩하세요.
                </AlertDescription>
              </Alert>

              <div className='space-y-4'>
                <div>
                  <h4 className='text-sm mb-2'>1. 변수 컬렉션 생성</h4>
                  <div className='bg-blue-50 p-4 rounded-lg space-y-2 text-sm'>
                    <div className='flex items-center gap-2'>
                      <CheckCircle2 className='w-4 h-4 text-blue-600' />
                      <span>Figma 파일 열기 → 우측 "Variables" 패널</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <CheckCircle2 className='w-4 h-4 text-blue-600' />
                      <span>Create collection → 이름: "GameState"</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className='text-sm mb-2'>2. 필수 변수 목록</h4>
                  <div className='border rounded-lg overflow-hidden'>
                    <table className='w-full text-sm'>
                      <thead className='bg-slate-100'>
                        <tr>
                          <th className='text-left p-3'>변수명</th>
                          <th className='text-left p-3'>타입</th>
                          <th className='text-left p-3'>초기값</th>
                          <th className='text-left p-3'>용도</th>
                        </tr>
                      </thead>
                      <tbody className='divide-y'>
                        <tr>
                          <td className='p-3 font-mono text-blue-600'>vx</td>
                          <td className='p-3'>
                            <Badge variant='outline'>Number</Badge>
                          </td>
                          <td className='p-3'>200</td>
                          <td className='p-3'>X 좌표</td>
                        </tr>
                        <tr>
                          <td className='p-3 font-mono text-blue-600'>vy</td>
                          <td className='p-3'>
                            <Badge variant='outline'>Number</Badge>
                          </td>
                          <td className='p-3'>200</td>
                          <td className='p-3'>Y 좌표</td>
                        </tr>
                        <tr>
                          <td className='p-3 font-mono text-red-600'>vr_atk</td>
                          <td className='p-3'>
                            <Badge variant='outline'>Number</Badge>
                          </td>
                          <td className='p-3'>60</td>
                          <td className='p-3'>공격 범위</td>
                        </tr>
                        <tr>
                          <td className='p-3 font-mono text-purple-600'>vr_skill</td>
                          <td className='p-3'>
                            <Badge variant='outline'>Number</Badge>
                          </td>
                          <td className='p-3'>30</td>
                          <td className='p-3'>스킬 범위</td>
                        </tr>
                        <tr>
                          <td className='p-3 font-mono text-yellow-600'>v_attack</td>
                          <td className='p-3'>
                            <Badge variant='outline'>Boolean</Badge>
                          </td>
                          <td className='p-3'>false</td>
                          <td className='p-3'>공격 상태</td>
                        </tr>
                        <tr>
                          <td className='p-3 font-mono text-orange-600'>v_crit</td>
                          <td className='p-3'>
                            <Badge variant='outline'>Boolean</Badge>
                          </td>
                          <td className='p-3'>false</td>
                          <td className='p-3'>크리티컬</td>
                        </tr>
                        <tr>
                          <td className='p-3 font-mono text-slate-600'>v_miss</td>
                          <td className='p-3'>
                            <Badge variant='outline'>Boolean</Badge>
                          </td>
                          <td className='p-3'>false</td>
                          <td className='p-3'>회피</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h4 className='text-sm mb-2'>3. 레이어 바인딩 예시</h4>
                  <div className='space-y-3'>
                    <div className='bg-slate-50 p-4 rounded-lg'>
                      <div className='text-sm mb-2'>📍 캐릭터 프레임 (위치)</div>
                      <div className='text-xs space-y-1 font-mono text-slate-700'>
                        <div>• Auto Layout 컨테이너 프레임 생성</div>
                        <div>
                          • Padding-left → <span className='text-blue-600'>vx</span> 바인딩
                        </div>
                        <div>
                          • Padding-top → <span className='text-blue-600'>vy</span> 바인딩
                        </div>
                        <div>• 내부에 점(Ellipse) 배치</div>
                      </div>
                    </div>

                    <div className='bg-slate-50 p-4 rounded-lg'>
                      <div className='text-sm mb-2'>🎯 공격 범위 (Circle)</div>
                      <div className='text-xs space-y-1 font-mono text-slate-700'>
                        <div>
                          • Width → <span className='text-red-600'>vr_atk * 2</span>
                        </div>
                        <div>
                          • Height → <span className='text-red-600'>vr_atk * 2</span>
                        </div>
                        <div>
                          • Visible → <span className='text-yellow-600'>v_attack</span>
                        </div>
                      </div>
                    </div>

                    <div className='bg-slate-50 p-4 rounded-lg'>
                      <div className='text-sm mb-2'>⚡ 상태 표시 (Fill Color)</div>
                      <div className='text-xs space-y-1 font-mono text-slate-700'>
                        <div>
                          • Conditional: if <span className='text-orange-600'>v_crit</span> → Red
                        </div>
                        <div>
                          • Else if <span className='text-slate-600'>v_miss</span> → Gray
                        </div>
                        <div>• Else → Blue</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className='text-sm mb-2'>4. 프로토타입 재생 설정</h4>
                  <div className='bg-purple-50 p-4 rounded-lg space-y-2 text-sm'>
                    <div className='flex items-center gap-2'>
                      <CheckCircle2 className='w-4 h-4 text-purple-600' />
                      <span>프레임 선택 → Prototype 탭</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <CheckCircle2 className='w-4 h-4 text-purple-600' />
                      <span>Interaction: After delay (100ms)</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <CheckCircle2 className='w-4 h-4 text-purple-600' />
                      <span>Action: Set variable (다음 틱 값으로)</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <CheckCircle2 className='w-4 h-4 text-purple-600' />
                      <span>Navigate: None (같은 프레임 유지)</span>
                    </div>
                  </div>
                </div>
              </div>

              <Alert variant='destructive'>
                <AlertCircle className='w-4 h-4' />
                <AlertTitle>주의사항</AlertTitle>
                <AlertDescription>
                  Figma 파일이 열려있는 상태에서 변수 업데이트가 반영됩니다. 팀/파일 권한과 토큰
                  scope를 확인하세요.
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>대안: 무개발 워크플로우</CardTitle>
          <CardDescription>Google Sheets Sync 플러그인 활용</CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <h4 className='text-sm'>✅ 장점</h4>
              <ul className='text-sm text-slate-600 space-y-1 list-disc list-inside'>
                <li>개발·API 없이 구성 가능</li>
                <li>Figma 플러그인만으로 완성</li>
                <li>초보자 친화적</li>
              </ul>
            </div>
            <div className='space-y-2'>
              <h4 className='text-sm'>⚠️ 단점</h4>
              <ul className='text-sm text-slate-600 space-y-1 list-disc list-inside'>
                <li>실시간 자동 동기화 불가</li>
                <li>플러그인 수동 새로고침 필요</li>
                <li>대량 데이터 처리 느림</li>
              </ul>
            </div>
          </div>

          <div className='bg-blue-50 p-4 rounded-lg'>
            <p className='text-sm text-blue-900'>
              <strong>권장:</strong> v1은 Google Sheets Sync로 프로토타입 → v2에서 Make로 실시간
              동기화 구현
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
