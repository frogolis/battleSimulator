import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { CharacterTypeInfo } from '../lib/characterTypes';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface CharacterSettingsProps {
  characterTypes: CharacterTypeInfo[];
  onCharacterTypesChange: (types: CharacterTypeInfo[]) => void;
}

const AVAILABLE_COLORS = [
  { id: 'text-red-600', name: '빨강' },
  { id: 'text-blue-600', name: '파랑' },
  { id: 'text-green-600', name: '초록' },
  { id: 'text-yellow-600', name: '노랑' },
  { id: 'text-purple-600', name: '보라' },
  { id: 'text-pink-600', name: '분홍' },
  { id: 'text-orange-600', name: '주황' },
  { id: 'text-teal-600', name: '청록' },
  { id: 'text-indigo-600', name: '남색' },
  { id: 'text-gray-600', name: '회색' },
  { id: 'text-slate-600', name: '슬레이트' },
  { id: 'text-rose-600', name: '장미' },
];

export function CharacterSettings({
  characterTypes,
  onCharacterTypesChange,
}: CharacterSettingsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newType, setNewType] = useState<Partial<CharacterTypeInfo>>({
    id: '',
    name: '',
    description: '',
    color: 'text-gray-600',
  });

  const handleAddType = () => {
    if (!newType.id || !newType.name) {
      toast.error('ID와 이름을 입력해주세요.');
      return;
    }

    // ID 중복 체크
    if (characterTypes.some(t => t.id === newType.id)) {
      toast.error('이미 존재하는 ID입니다.');
      return;
    }

    // ID 유효성 체크 (영문, 숫자, 언더스코어만 허용)
    if (!/^[a-z0-9_]+$/.test(newType.id)) {
      toast.error('ID는 영문 소문자, 숫자, 언더스코어(_)만 사용 가능합니다.');
      return;
    }

    onCharacterTypesChange([
      ...characterTypes,
      {
        id: newType.id!,
        name: newType.name!,
        description: newType.description || '',
        color: newType.color || 'text-gray-600',
      },
    ]);

    setNewType({
      id: '',
      name: '',
      description: '',
      color: 'text-gray-600',
    });
    setIsDialogOpen(false);
    toast.success('새 캐릭터 타입이 추가되었습니다.');
  };

  const handleDeleteType = (id: string) => {
    // 기본 타입(melee, projectile)은 삭제 불가
    if (id === 'melee' || id === 'projectile') {
      toast.error('기본 타입은 삭제할 수 없습니다.');
      return;
    }

    onCharacterTypesChange(characterTypes.filter(t => t.id !== id));
    toast.success('캐릭터 타입이 삭제되었습니다.');
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>캐릭터 타입 관리</CardTitle>
              <CardDescription>
                게임에서 사용할 캐릭터 타입을 관리합니다
              </CardDescription>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              새 타입 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {characterTypes.map((type) => (
              <div
                key={type.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Badge variant="outline" className={type.color}>
                    {type.name}
                  </Badge>
                  <div className="flex flex-col gap-1">
                    <code className="text-xs text-gray-500">{type.id}</code>
                    {type.description && (
                      <p className="text-sm text-gray-600">{type.description}</p>
                    )}
                  </div>
                </div>
                {type.id !== 'melee' && type.id !== 'projectile' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteType(type.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                {(type.id === 'melee' || type.id === 'projectile') && (
                  <Badge variant="secondary" className="text-xs">기본</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Type Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 캐릭터 타입 추가</DialogTitle>
            <DialogDescription>
              새로운 캐릭터 타입의 정보를 입력해주세요
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="type-id">ID (영문 소문자, 숫자, _만 가능)</Label>
              <Input
                id="type-id"
                placeholder="예: magic, tank, healer"
                value={newType.id}
                onChange={(e) =>
                  setNewType({ ...newType, id: e.target.value.toLowerCase() })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-name">이름</Label>
              <Input
                id="type-name"
                placeholder="예: 마법사"
                value={newType.name}
                onChange={(e) => setNewType({ ...newType, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-description">설명 (선택)</Label>
              <Input
                id="type-description"
                placeholder="예: 강력한 마법 공격"
                value={newType.description}
                onChange={(e) =>
                  setNewType({ ...newType, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type-color">색상</Label>
              <Select
                value={newType.color}
                onValueChange={(value) => setNewType({ ...newType, color: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_COLORS.map((color) => (
                    <SelectItem key={color.id} value={color.id}>
                      <span className={color.id}>{color.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAddType}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
