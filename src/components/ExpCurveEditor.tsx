import { useState, useRef, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Plus, Trash2, Move, BarChart3, TrendingUp } from 'lucide-react';
import { BezierSegment, ExpGrowthConfig, generateExpChartDataWithSegments } from '../lib/levelSystem';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';

interface ExpCurveEditorProps {
  config: ExpGrowthConfig;
  onChange: (config: ExpGrowthConfig) => void;
  maxLevel?: number;
}

export function ExpCurveEditor({ config, onChange, maxLevel = 100 }: ExpCurveEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(800);
  
  // ref로 드래그 정보 관리 (클로저 문제 해결)
  const dragInfoRef = useRef<{
    segmentId: string;
    point: 'cp1' | 'cp2' | 'start' | 'end';
  } | null>(null);

  const bezierSegments = config.bezierSegments || [];

  // 캔버스 크기
  const CANVAS_WIDTH = canvasWidth;
  const CANVAS_HEIGHT = 400;
  const PADDING = 40;
  
  const displayMaxLevel = Math.max(maxLevel, 20);

  // 좌표 변환 함수
  const levelToX = (level: number) => {
    return PADDING + ((level - 1) / (displayMaxLevel - 1)) * (CANVAS_WIDTH - 2 * PADDING);
  };

  const expToY = (exp: number, maxExp: number) => {
    return CANVAS_HEIGHT - PADDING - (exp / maxExp) * (CANVAS_HEIGHT - 2 * PADDING);
  };

  const xToLevel = (x: number) => {
    return 1 + ((x - PADDING) / (CANVAS_WIDTH - 2 * PADDING)) * (displayMaxLevel - 1);
  };

  const yToExp = (y: number, maxExp: number) => {
    return ((CANVAS_HEIGHT - PADDING - y) / (CANVAS_HEIGHT - 2 * PADDING)) * maxExp;
  };

  // 베지어 곡선의 실제 최대값 계산
  const calculateAutoMaxExp = () => {
    if (bezierSegments.length === 0) return 10000;
    
    // 모든 세그먼트의 endExp 중 최대값을 기준으로 함
    const maxEndExp = Math.max(...bezierSegments.map(s => s.endExp));
    
    // 여유 공간 30% 추가
    return Math.max(maxEndExp * 1.3, 1000);
  };
  
  // 현재 사용할 Y축 최대값 (고정값, 리셋 전까지는 변하지 않음)
  const currentMaxExp = config.yAxisMax || calculateAutoMaxExp();

  // 캔버스 그리기
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 배경
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const maxExp = currentMaxExp;

    // 그리드
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    const gridStep = displayMaxLevel <= 20 ? 2 : displayMaxLevel <= 60 ? 5 : displayMaxLevel <= 100 ? 10 : 20;
    
    for (let i = 1; i <= displayMaxLevel; i += gridStep) {
      const x = levelToX(i);
      ctx.beginPath();
      ctx.moveTo(x, PADDING);
      ctx.lineTo(x, CANVAS_HEIGHT - PADDING);
      ctx.stroke();
    }

    // Y축 그리드
    for (let i = 0; i <= 5; i++) {
      const exp = (maxExp / 5) * i;
      const y = expToY(exp, maxExp);
      ctx.beginPath();
      ctx.moveTo(PADDING, y);
      ctx.lineTo(CANVAS_WIDTH - PADDING, y);
      ctx.stroke();

      ctx.fillStyle = '#6b7280';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      const expLabel = exp >= 1000000 
        ? `${(exp / 1000000).toFixed(1)}M`
        : exp >= 1000 
        ? `${(exp / 1000).toFixed(1)}K`
        : Math.floor(exp).toString();
      ctx.fillText(expLabel, PADDING - 5, y + 4);
    }

    // X축 레이블
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const labelStep = displayMaxLevel <= 20 ? 5 : displayMaxLevel <= 60 ? 10 : displayMaxLevel <= 100 ? 20 : 50;
    
    ctx.fillText(`Lv.1`, levelToX(1), CANVAS_HEIGHT - PADDING + 20);
    for (let i = labelStep; i < displayMaxLevel; i += labelStep) {
      ctx.fillText(`Lv.${i}`, levelToX(i), CANVAS_HEIGHT - PADDING + 20);
    }
    ctx.fillText(`Lv.${displayMaxLevel}`, levelToX(displayMaxLevel), CANVAS_HEIGHT - PADDING + 20);

    // 베지어 곡선 그리기
    bezierSegments.forEach((segment, index) => {
      const isSelected = selectedSegment === segment.id;
      
      const x0 = levelToX(segment.startLevel);
      const y0 = expToY(segment.startExp, maxExp);
      const x3 = levelToX(segment.endLevel);
      const y3 = expToY(segment.endExp, maxExp);

      const expRange = segment.endExp - segment.startExp;
      const x1 = x0 + segment.controlPoint1.x * (x3 - x0);
      const y1 = y0 - segment.controlPoint1.y * expRange * (CANVAS_HEIGHT - 2 * PADDING) / maxExp;
      const x2 = x0 + segment.controlPoint2.x * (x3 - x0);
      const y2 = y0 - segment.controlPoint2.y * expRange * (CANVAS_HEIGHT - 2 * PADDING) / maxExp;

      // 곡선
      ctx.strokeStyle = isSelected ? '#8b5cf6' : '#a78bfa';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.bezierCurveTo(x1, y1, x2, y2, x3, y3);
      ctx.stroke();
      
      // 연결점 확인 (이전 세그먼트와 연결되어 있는지)
      if (index > 0) {
        const prevSegment = bezierSegments[index - 1];
        const isConnected = Math.abs(prevSegment.endExp - segment.startExp) < 1 && 
                           prevSegment.endLevel === segment.startLevel;
        if (isConnected) {
          // 연결점에 초록색 원 표시
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(x0, y0, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // 구간 번호
      ctx.fillStyle = isSelected ? '#8b5cf6' : '#9ca3af';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`#${index + 1}`, (x0 + x3) / 2, (y0 + y3) / 2 - 30);

      // 컨트롤 포인트 보조선
      if (isSelected) {
        ctx.strokeStyle = '#d8b4fe';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x3, y3);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 시작/종료점
      ctx.fillStyle = isSelected ? '#8b5cf6' : '#a78bfa';
      ctx.fillRect(x0 - 7, y0 - 7, 14, 14);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x0 - 7, y0 - 7, 14, 14);
      
      ctx.fillStyle = isSelected ? '#8b5cf6' : '#a78bfa';
      ctx.fillRect(x3 - 7, y3 - 7, 14, 14);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x3 - 7, y3 - 7, 14, 14);

      // 컨트롤 포인트
      if (isSelected) {
        ctx.fillStyle = '#c4b5fd';
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(x1, y1, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(x2, y2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Lv.${segment.startLevel}`, x0, y0 - 12);
        ctx.fillText(`${Math.floor(segment.startExp)}`, x0, y0 + 22);
        ctx.fillText(`Lv.${segment.endLevel}`, x3, y3 - 12);
        ctx.fillText(`${Math.floor(segment.endExp)}`, x3, y3 + 22);
      }
    });
  };

  // 컨테이너 크기에 맞춰 캔버스 너비 조정
  useEffect(() => {
    const updateCanvasWidth = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        // Card의 padding(16px * 2 = 32px)을 고려
        const availableWidth = containerWidth - 32;
        setCanvasWidth(Math.max(400, availableWidth));
      }
    };

    updateCanvasWidth();

    const resizeObserver = new ResizeObserver(updateCanvasWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Y축 최대값을 config에 초기화 (한 번만)
  useEffect(() => {
    if (!config.yAxisMax && bezierSegments.length > 0) {
      onChange({
        ...config,
        yAxisMax: calculateAutoMaxExp()
      });
    }
  }, []);

  // 캔버스 업데이트
  useEffect(() => {
    drawCanvas();
  }, [bezierSegments, selectedSegment, displayMaxLevel, currentMaxExp, canvasWidth]);

  // 마우스 이벤트 처리
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getMousePos = (e: MouseEvent): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const onMouseDown = (e: MouseEvent) => {
      const segments = config.bezierSegments || [];
      if (segments.length === 0) return;
      
      const pos = getMousePos(e);
      const maxExp = currentMaxExp;

      // 포인트 찾기
      for (const segment of segments) {
        const x0 = levelToX(segment.startLevel);
        const y0 = expToY(segment.startExp, maxExp);
        const x3 = levelToX(segment.endLevel);
        const y3 = expToY(segment.endExp, maxExp);

        const expRange = segment.endExp - segment.startExp;
        const x1 = x0 + segment.controlPoint1.x * (x3 - x0);
        const y1 = y0 - segment.controlPoint1.y * expRange * (CANVAS_HEIGHT - 2 * PADDING) / maxExp;
        const x2 = x0 + segment.controlPoint2.x * (x3 - x0);
        const y2 = y0 - segment.controlPoint2.y * expRange * (CANVAS_HEIGHT - 2 * PADDING) / maxExp;

        // 시작점
        if (Math.abs(pos.x - x0) < 12 && Math.abs(pos.y - y0) < 12) {
          setSelectedSegment(segment.id);
          dragInfoRef.current = { segmentId: segment.id, point: 'start' };
          setIsDragging(true);
          console.log('드래그 시작: 시작점', segment.id);
          return;
        }
        // 종료점
        if (Math.abs(pos.x - x3) < 12 && Math.abs(pos.y - y3) < 12) {
          setSelectedSegment(segment.id);
          dragInfoRef.current = { segmentId: segment.id, point: 'end' };
          setIsDragging(true);
          console.log('드래그 시작: 종료점', segment.id);
          return;
        }
        // 컨트롤 포인트
        if (selectedSegment === segment.id) {
          if (Math.hypot(pos.x - x1, pos.y - y1) < 12) {
            dragInfoRef.current = { segmentId: segment.id, point: 'cp1' };
            setIsDragging(true);
            console.log('드래그 시작: CP1', segment.id);
            return;
          }
          if (Math.hypot(pos.x - x2, pos.y - y2) < 12) {
            dragInfoRef.current = { segmentId: segment.id, point: 'cp2' };
            setIsDragging(true);
            console.log('드래그 시작: CP2', segment.id);
            return;
          }
        }
      }

      // 곡선 클릭
      for (const segment of segments) {
        const x0 = levelToX(segment.startLevel);
        const y0 = expToY(segment.startExp, maxExp);
        const x3 = levelToX(segment.endLevel);
        const y3 = expToY(segment.endExp, maxExp);

        if (pos.x >= Math.min(x0, x3) - 10 && pos.x <= Math.max(x0, x3) + 10 &&
            pos.y >= Math.min(y0, y3) - 30 && pos.y <= Math.max(y0, y3) + 30) {
          setSelectedSegment(segment.id);
          console.log('곡선 선택:', segment.id);
          return;
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragInfoRef.current) return;
      
      const segments = config.bezierSegments || [];
      if (segments.length === 0) return;

      const pos = getMousePos(e);
      const maxExp = currentMaxExp;

      console.log('드래그 중:', dragInfoRef.current.point, pos);

      // 변경이 필요한 세그먼트만 찾기
      const targetIndex = segments.findIndex(s => s.id === dragInfoRef.current!.segmentId);
      if (targetIndex === -1) return;

      const segment = segments[targetIndex];
      const x0 = levelToX(segment.startLevel);
      const y0 = expToY(segment.startExp, maxExp);
      const x3 = levelToX(segment.endLevel);
      const y3 = expToY(segment.endExp, maxExp);
      const expRange = segment.endExp - segment.startExp;

      let updatedSegment: BezierSegment = segment;

      if (dragInfoRef.current!.point === 'cp1') {
        const dx = x3 - x0;
        const newX = dx !== 0 ? Math.max(0, Math.min(1, (pos.x - x0) / dx)) : 0.33;
        const dy = expRange * (CANVAS_HEIGHT - 2 * PADDING) / maxExp;
        const newY = dy !== 0 ? Math.max(-0.5, Math.min(3, (y0 - pos.y) / dy)) : 0.25;
        console.log('CP1 업데이트:', { x: newX, y: newY });
        updatedSegment = { ...segment, controlPoint1: { x: newX, y: newY } };
      } else if (dragInfoRef.current!.point === 'cp2') {
        const dx = x3 - x0;
        const newX = dx !== 0 ? Math.max(0, Math.min(1, (pos.x - x0) / dx)) : 0.67;
        const dy = expRange * (CANVAS_HEIGHT - 2 * PADDING) / maxExp;
        const newY = dy !== 0 ? Math.max(-0.5, Math.min(3, (y0 - pos.y) / dy)) : 0.75;
        console.log('CP2 업데이트:', { x: newX, y: newY });
        updatedSegment = { ...segment, controlPoint2: { x: newX, y: newY } };
      } else if (dragInfoRef.current!.point === 'start') {
        let newLevel = Math.max(1, Math.min(segment.endLevel - 1, Math.round(xToLevel(pos.x))));
        let newExp = Math.max(0, yToExp(pos.y, maxExp));
        
        // 오토 스냅: 이전 세그먼트의 끝점에 가까우면 자동으로 붙이기
        if (targetIndex > 0) {
          const prevSegment = segments[targetIndex - 1];
          const snapThreshold = 20; // 픽셀 단위 스냅 임계값
          
          const prevEndX = levelToX(prevSegment.endLevel);
          const prevEndY = expToY(prevSegment.endExp, maxExp);
          
          const distance = Math.sqrt(
            Math.pow(pos.x - prevEndX, 2) + Math.pow(pos.y - prevEndY, 2)
          );
          
          if (distance < snapThreshold) {
            newLevel = prevSegment.endLevel;
            newExp = prevSegment.endExp;
            console.log('시작점 스냅:', { level: newLevel, exp: newExp });
          }
        }
        
        console.log('시작점 업데이트:', { level: newLevel, exp: newExp });
        updatedSegment = { ...segment, startLevel: newLevel, startExp: newExp };
      } else if (dragInfoRef.current!.point === 'end') {
        let newLevel = Math.max(segment.startLevel + 1, Math.min(displayMaxLevel, Math.round(xToLevel(pos.x))));
        let newExp = Math.max(0, yToExp(pos.y, maxExp));
        
        // 오토 스냅: 다음 세그먼트의 시작점에 가까우면 자동으로 붙이기
        if (targetIndex < segments.length - 1) {
          const nextSegment = segments[targetIndex + 1];
          const snapThreshold = 20; // 픽셀 단위 스냅 임계값
          
          const nextStartX = levelToX(nextSegment.startLevel);
          const nextStartY = expToY(nextSegment.startExp, maxExp);
          
          const distance = Math.sqrt(
            Math.pow(pos.x - nextStartX, 2) + Math.pow(pos.y - nextStartY, 2)
          );
          
          if (distance < snapThreshold) {
            newLevel = nextSegment.startLevel;
            newExp = nextSegment.startExp;
            console.log('종료점 스냅:', { level: newLevel, exp: newExp });
          }
        }
        
        console.log('종료점 업데이트:', { level: newLevel, exp: newExp });
        updatedSegment = { ...segment, endLevel: newLevel, endExp: newExp };
      }

      // 실제로 변경이 있을 때만 업데이트
      if (updatedSegment !== segment) {
        const updatedSegments = [...segments];
        updatedSegments[targetIndex] = updatedSegment;
        console.log('onChange 호출');
        onChange({ ...config, bezierSegments: updatedSegments });
      }
    };

    const onMouseUp = () => {
      if (dragInfoRef.current) {
        console.log('드래그 종료');
      }
      dragInfoRef.current = null;
      setIsDragging(false);
    };

    // 이벤트 리스너 등록
    canvas.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [config, onChange, selectedSegment, displayMaxLevel]);

  const addBezierSegment = () => {
    if (bezierSegments.length >= 10) return;

    const lastSegment = bezierSegments[bezierSegments.length - 1];
    
    // 이전 세그먼트의 endLevel을 정확히 이어받기 (중복 없이)
    // 예: 이전이 10~20이면, 새로운 것은 20~30이 되어야 함
    const newStartLevel = lastSegment ? lastSegment.endLevel : 1;
    const newEndLevel = Math.min(newStartLevel + 10, displayMaxLevel);
    
    // 이전 세그먼트의 endExp를 정확히 이어받기 (연속성 유지)
    const newStartExp = lastSegment ? lastSegment.endExp : 100;
    // 수평에 가까운 증가 (약 10% 증가)
    const newEndExp = newStartExp * 1.1;

    const newSegment: BezierSegment = {
      id: Date.now().toString(),
      startLevel: newStartLevel,
      endLevel: newEndLevel,
      startExp: newStartExp,
      endExp: newEndExp,
      // 수평에 가까운 베지어 곡선을 위한 컨트롤 포인트
      controlPoint1: { x: 0.33, y: 0.05 },
      controlPoint2: { x: 0.67, y: 0.05 },
    };

    // Y축 범위는 유지 (사용자가 수동으로 "Y축 리셋" 버튼을 누를 수 있음)
    onChange({
      ...config,
      bezierSegments: [...bezierSegments, newSegment]
    });
    setSelectedSegment(newSegment.id);
  };

  const deleteSegment = (segmentId: string) => {
    onChange({
      ...config,
      bezierSegments: bezierSegments.filter(s => s.id !== segmentId)
    });
    if (selectedSegment === segmentId) {
      setSelectedSegment(null);
    }
  };

  const redistributeSegments = () => {
    if (bezierSegments.length === 0) return;

    const numSegments = bezierSegments.length;
    const levelsPerSegment = Math.floor((displayMaxLevel - 1) / numSegments);
    const remainder = (displayMaxLevel - 1) % numSegments;

    const redistributed = bezierSegments.map((segment, index) => {
      // 첫 번째 세그먼트는 1부터 시작, 나머지는 이전 세그먼트의 endLevel 사용
      let startLevel: number;
      if (index === 0) {
        startLevel = 1;
      } else {
        // 이전 세그먼트의 endLevel을 가져오기 (중복 없이)
        const prevIndex = index - 1;
        const prevStartLevel = prevIndex === 0 ? 1 : redistributed[prevIndex].startLevel;
        const prevLevels = levelsPerSegment + (prevIndex < remainder ? 1 : 0);
        startLevel = prevStartLevel + prevLevels;
      }
      
      const currentLevels = levelsPerSegment + (index < remainder ? 1 : 0);
      const endLevel = index === numSegments - 1 
        ? displayMaxLevel 
        : startLevel + currentLevels;

      return { ...segment, startLevel, endLevel };
    });

    onChange({
      ...config,
      bezierSegments: redistributed
    });
  };

  const selectedSeg = bezierSegments.find(s => s.id === selectedSegment);

  return (
    <div className="space-y-4" ref={containerRef}>
      {/* 캔버스 */}
      <Card className="p-4">
        <div className="mb-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Move className="w-4 h-4" />
                <span>사각형(시작/종료)과 원형(컨트롤)을 드래그</span>
              </div>
              {isDragging && dragInfoRef.current && (
                <Badge variant="secondary" className="text-xs">
                  드래그 중: {dragInfoRef.current.point}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={redistributeSegments}
                disabled={bezierSegments.length === 0}
                variant="outline"
                className="h-8 text-xs"
              >
                최대 레벨 설정 적용
              </Button>
              <Button
                size="sm"
                onClick={addBezierSegment}
                disabled={bezierSegments.length >= 10}
                className="h-8 w-8 p-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* 축 범위 설정 */}
          {bezierSegments.length > 0 && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between gap-4">
                <Label className="text-xs">📊 그래프 축 설정</Label>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-4">
                {/* 최대 레벨 표시 */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-slate-600">최대 레벨</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs px-3 py-1">
                      Lv.1 ~ Lv.{displayMaxLevel}
                    </Badge>
                  </div>
                </div>
                
                {/* 최대 경험치 설정 */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-slate-600">최대 경험치 요구량 (Y축)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={Math.floor(currentMaxExp)}
                      onChange={(e) => {
                        onChange({
                          ...config,
                          yAxisMax: parseInt(e.target.value) || 1000
                        });
                      }}
                      min={1000}
                      step={1000}
                      className="h-8 text-xs flex-1"
                      placeholder="경험치 최대값"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onChange({
                          ...config,
                          yAxisMax: calculateAutoMaxExp()
                        });
                      }}
                      className="h-8 px-3 text-xs"
                      title="자동 계산된 범위로 리셋"
                    >
                      자동
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="relative w-full">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="border rounded cursor-crosshair select-none bg-white"
            style={{ 
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              width: '100%',
              height: 'auto'
            }}
          />
        </div>
      </Card>

      {/* 선택된 구간 설정 */}
      {selectedSeg && (
        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  구간 {bezierSegments.findIndex(s => s.id === selectedSeg.id) + 1}
                </Badge>
                <span className="text-xs text-slate-500">
                  Lv.{selectedSeg.startLevel}~{selectedSeg.endLevel}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteSegment(selectedSeg.id)}
                className="h-7 px-2 text-red-500 hover:bg-red-50"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-600">레벨 범위</Label>
                {(() => {
                  const segIndex = bezierSegments.findIndex(s => s.id === selectedSeg.id);
                  if (segIndex > 0) {
                    const prevSeg = bezierSegments[segIndex - 1];
                    if (prevSeg.endLevel !== selectedSeg.startLevel) {
                      return (
                        <Badge variant="destructive" className="text-xs">
                          연속성 오류
                        </Badge>
                      );
                    }
                  }
                  return null;
                })()}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Input
                    type="number"
                    value={selectedSeg.startLevel}
                    onChange={(e) => {
                      const updated = bezierSegments.map(s =>
                        s.id === selectedSeg.id
                          ? { ...s, startLevel: parseInt(e.target.value) || 1 }
                          : s
                      );
                      onChange({ ...config, bezierSegments: updated });
                    }}
                    min={1}
                    max={displayMaxLevel}
                    className="h-8"
                  />
                  <span className="text-xs text-slate-500">시작 레벨</span>
                </div>
                <div className="space-y-1">
                  <Input
                    type="number"
                    value={selectedSeg.endLevel}
                    onChange={(e) => {
                      const updated = bezierSegments.map(s =>
                        s.id === selectedSeg.id
                          ? { ...s, endLevel: parseInt(e.target.value) || 1 }
                          : s
                      );
                      onChange({ ...config, bezierSegments: updated });
                    }}
                    min={selectedSeg.startLevel}
                    max={displayMaxLevel}
                    className="h-8"
                  />
                  <span className="text-xs text-slate-500">종료 레벨</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-600">경험치 범위</Label>
                {(() => {
                  const segIndex = bezierSegments.findIndex(s => s.id === selectedSeg.id);
                  if (segIndex > 0) {
                    const prevSeg = bezierSegments[segIndex - 1];
                    if (Math.abs(prevSeg.endExp - selectedSeg.startExp) > 1) {
                      return (
                        <Badge variant="destructive" className="text-xs">
                          연속성 오류
                        </Badge>
                      );
                    }
                  }
                  return null;
                })()}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Input
                    type="number"
                    value={Math.floor(selectedSeg.startExp)}
                    onChange={(e) => {
                      const updated = bezierSegments.map(s =>
                        s.id === selectedSeg.id
                          ? { ...s, startExp: parseInt(e.target.value) || 0 }
                          : s
                      );
                      onChange({ ...config, bezierSegments: updated });
                    }}
                    min={0}
                    className="h-8"
                  />
                  <span className="text-xs text-slate-500">시작 경험치</span>
                </div>
                <div className="space-y-1">
                  <Input
                    type="number"
                    value={Math.floor(selectedSeg.endExp)}
                    onChange={(e) => {
                      const updated = bezierSegments.map(s =>
                        s.id === selectedSeg.id
                          ? { ...s, endExp: parseInt(e.target.value) || 0 }
                          : s
                      );
                      onChange({ ...config, bezierSegments: updated });
                    }}
                    min={selectedSeg.startExp}
                    className="h-8"
                  />
                  <span className="text-xs text-slate-500">종료 경험치</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 경험치 테이블 */}
      {bezierSegments.length > 0 && (
        <Card>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="exp-table">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  <span className="text-sm">레벨별 경험치 테이블</span>
                  <Badge variant="secondary" className="ml-2">
                    Lv.1 ~ Lv.{displayMaxLevel}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3">
                  {/* 통계 요약 */}
                  <div className="grid grid-cols-4 gap-3">
                    {(() => {
                      const expData = generateExpChartDataWithSegments(config, 1, displayMaxLevel);
                      const totalExp = expData.reduce((sum, d) => sum + d.exp, 0);
                      const avgExp = Math.floor(totalExp / expData.length);
                      const maxExpPerLevel = Math.max(...expData.map(d => d.exp));
                      const finalCumulativeExp = expData[expData.length - 1]?.cumulativeExp || 0;

                      return (
                        <>
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
                            <div className="text-xs text-blue-600">총 레벨 수</div>
                            <div className="text-lg text-blue-900">{displayMaxLevel}</div>
                          </div>
                          <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
                            <div className="text-xs text-green-600">평균 필요 EXP</div>
                            <div className="text-lg text-green-900">{avgExp.toLocaleString()}</div>
                          </div>
                          <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-lg border border-orange-200">
                            <div className="text-xs text-orange-600">최대 필요 EXP</div>
                            <div className="text-lg text-orange-900">{maxExpPerLevel.toLocaleString()}</div>
                          </div>
                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg border border-purple-200">
                            <div className="text-xs text-purple-600">누적 총 EXP</div>
                            <div className="text-lg text-purple-900">{finalCumulativeExp.toLocaleString()}</div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* 경험치 테이블 */}
                  <ScrollArea className="h-[400px] rounded-lg border">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead className="w-20 text-center">레벨</TableHead>
                          <TableHead className="text-right">필요 경험치</TableHead>
                          <TableHead className="text-right">증가량</TableHead>
                          <TableHead className="text-right">누적 경험치</TableHead>
                          <TableHead className="w-24 text-center">구간</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const expData = generateExpChartDataWithSegments(config, 1, displayMaxLevel);
                          return expData.map((data, index) => {
                            const prevExp = index > 0 ? expData[index - 1].exp : 0;
                            const growth = data.exp - prevExp;
                            const growthPercent = prevExp > 0 ? ((growth / prevExp) * 100).toFixed(1) : '0.0';
                            
                            const segment = bezierSegments.find(
                              s => data.level >= s.startLevel && data.level <= s.endLevel
                            );
                            const segmentIndex = segment ? bezierSegments.indexOf(segment) + 1 : null;
                            const isUndefined = !segment || data.exp === 0;

                            return (
                              <TableRow 
                                key={data.level}
                                className={`
                                  ${data.level % 10 === 0 ? 'bg-purple-50' : ''}
                                  ${isUndefined ? 'bg-slate-100 opacity-50' : ''}
                                  hover:bg-slate-50
                                `}
                              >
                                <TableCell className="text-center">
                                  <Badge variant={data.level % 10 === 0 ? 'default' : 'outline'}>
                                    Lv.{data.level}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {isUndefined ? '-' : data.exp.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">
                                  {isUndefined ? (
                                    <span className="text-slate-400 text-xs">-</span>
                                  ) : growth > 0 ? (
                                    <div className="flex items-center justify-end gap-1">
                                      <TrendingUp className="w-3 h-3 text-green-600" />
                                      <span className="text-green-600 text-xs">
                                        +{growth.toLocaleString()}
                                      </span>
                                      <span className="text-xs text-slate-400">
                                        ({growthPercent}%)
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-xs">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-mono text-slate-600">
                                  {isUndefined ? '-' : data.cumulativeExp.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-center">
                                  {segmentIndex ? (
                                    <Badge variant="secondary" className="text-xs">
                                      #{segmentIndex}
                                    </Badge>
                                  ) : (
                                    <span className="text-slate-400 text-xs">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          });
                        })()}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      )}
    </div>
  );
}
