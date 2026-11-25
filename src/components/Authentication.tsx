import { useEffect, useState } from 'react';
import {
  createManagedUser,
  getManagedUsers,
  resetManagedUserPassword,
  type ManagedUser,
} from '../features/auth/client';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface AuthenticationScreenProps {
  needsSetup: boolean;
  busy: boolean;
  error?: string;
  onSubmit: (username: string, password: string) => void;
}

export function AuthenticationScreen({
  needsSetup,
  busy,
  error,
  onSubmit,
}: AuthenticationScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [formError, setFormError] = useState<string>();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(undefined);
    if (needsSetup && password !== confirmation) {
      setFormError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    onSubmit(username, password);
  };

  return (
    <main className='flex min-h-screen items-center justify-center bg-slate-100 p-6'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>{needsSetup ? '최초 관리자 계정 설정' : '로그인'}</CardTitle>
          <CardDescription>
            로컬 SQLite에 저장된 사용자별 시뮬레이터 작업공간입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className='space-y-4' onSubmit={handleSubmit}>
            <div className='space-y-2'>
              <Label htmlFor='auth-username'>사용자 이름</Label>
              <Input
                id='auth-username'
                autoComplete='username'
                minLength={3}
                maxLength={32}
                pattern='(?:[A-Za-z0-9._]|-)+'
                required
                value={username}
                onChange={event => setUsername(event.target.value)}
              />
              <p className='text-xs text-muted-foreground'>
                영문, 숫자, 점, 밑줄, 하이픈으로 3~32자
              </p>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='auth-password'>비밀번호</Label>
              <Input
                id='auth-password'
                type='password'
                autoComplete={needsSetup ? 'new-password' : 'current-password'}
                minLength={needsSetup ? 12 : undefined}
                maxLength={128}
                required
                value={password}
                onChange={event => setPassword(event.target.value)}
              />
              {needsSetup && (
                <p className='text-xs text-muted-foreground'>12자 이상 입력해 주세요.</p>
              )}
            </div>
            {needsSetup && (
              <div className='space-y-2'>
                <Label htmlFor='auth-password-confirm'>비밀번호 확인</Label>
                <Input
                  id='auth-password-confirm'
                  type='password'
                  autoComplete='new-password'
                  minLength={12}
                  maxLength={128}
                  required
                  value={confirmation}
                  onChange={event => setConfirmation(event.target.value)}
                />
              </div>
            )}
            {(formError || error) && (
              <Alert variant='destructive'>
                <AlertDescription>{formError || error}</AlertDescription>
              </Alert>
            )}
            <Button className='w-full' type='submit' disabled={busy}>
              {busy ? '처리 중...' : needsSetup ? '관리자 계정 만들기' : '로그인'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

interface WorkspaceRecoveryScreenProps {
  username: string;
  error: string;
  busy: boolean;
  exported: boolean;
  onExport: () => void;
  onConfirmExport: (confirmed: boolean) => void;
  onReload: () => void;
  onReset: () => void;
  onLogout: () => void;
}

export function WorkspaceRecoveryScreen({
  username,
  error,
  busy,
  exported,
  onExport,
  onConfirmExport,
  onReload,
  onReset,
  onLogout,
}: WorkspaceRecoveryScreenProps) {
  return (
    <main className='flex min-h-screen items-center justify-center bg-slate-100 p-6'>
      <Card className='w-full max-w-lg'>
        <CardHeader>
          <CardTitle>작업공간 복구가 필요합니다</CardTitle>
          <CardDescription>
            {username} 계정의 저장 데이터 구조를 읽을 수 없어 시뮬레이터를 열지 않았습니다. 원본은
            아직 변경되지 않았습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <Alert variant='destructive'>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <p className='text-sm text-muted-foreground'>
            먼저 저장된 원본을 JSON 파일로 내보내 보관하세요. 기본 작업공간으로 복구하면 이 계정의
            현재 저장본이 대체됩니다.
          </p>
          <div className='space-y-2'>
            <Button className='w-full' variant='outline' onClick={onExport} disabled={busy}>
              손상된 원본 작업공간 내보내기
            </Button>
            <label className='flex items-start gap-2 text-sm'>
              <input
                type='checkbox'
                checked={exported}
                onChange={event => onConfirmExport(event.target.checked)}
                disabled={busy}
                className='mt-1'
              />
              내보낸 JSON 파일을 보관했습니다.
            </label>
            <Button className='w-full' variant='outline' onClick={onReload} disabled={busy}>
              최신 저장본 다시 확인
            </Button>
            <Button className='w-full' onClick={onReset} disabled={busy || !exported}>
              {busy ? '복구 중...' : '내보낸 뒤 기본 작업공간으로 복구'}
            </Button>
            <Button className='w-full' variant='ghost' onClick={onLogout} disabled={busy}>
              로그아웃
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

interface AccountManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountManagementDialog({ open, onOpenChange }: AccountManagementDialogProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [resetUserId, setResetUserId] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmation, setResetConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [feedbackAction, setFeedbackAction] = useState<'create' | 'reset'>('create');

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(undefined);
    setNotice(undefined);
    setFeedbackAction('create');
    getManagedUsers()
      .then(result => {
        if (active) setUsers(result.users);
      })
      .catch(reason => {
        if (active)
          setError(reason instanceof Error ? reason.message : '사용자 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedbackAction('create');
    setError(undefined);
    setNotice(undefined);
    if (password !== confirmation) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    try {
      const result = await createManagedUser(username, password);
      setUsers(previous =>
        [...previous, result.user].sort((a, b) => a.username.localeCompare(b.username))
      );
      setUsername('');
      setPassword('');
      setConfirmation('');
      setNotice(`${result.user.username} 계정을 발급했습니다.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '계정을 발급하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setFeedbackAction('reset');
    setError(undefined);
    setNotice(undefined);
    if (!resetUserId) {
      setError('비밀번호를 재설정할 사용자를 선택해 주세요.');
      return;
    }
    if (resetPassword !== resetConfirmation) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    setLoading(true);
    try {
      await resetManagedUserPassword(resetUserId, resetPassword);
      setResetPassword('');
      setResetConfirmation('');
      setNotice('비밀번호를 재설정했습니다. 해당 사용자는 다시 로그인해야 합니다.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '비밀번호를 재설정하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>사용자 계정 관리</DialogTitle>
          <DialogDescription>
            새 사용자를 발급합니다. 계정 이름과 초기 비밀번호를 사용자에게 안전하게 전달해 주세요.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-3'>
          <h3 className='text-sm font-medium'>등록된 사용자</h3>
          {loading && users.length === 0 ? (
            <p className='text-sm text-muted-foreground'>불러오는 중...</p>
          ) : (
            <ul className='max-h-36 space-y-1 overflow-auto rounded-md border p-3 text-sm'>
              {users.map(user => (
                <li key={user.id} className='flex justify-between gap-3'>
                  <span>{user.username}</span>
                  <span className='text-muted-foreground'>
                    {user.role === 'admin' ? '관리자' : '사용자'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <form className='space-y-3' onSubmit={handleSubmit}>
          <h3 className='text-sm font-medium'>사용자 발급</h3>
          <div className='space-y-2'>
            <Label htmlFor='new-user-username'>사용자 이름</Label>
            <Input
              id='new-user-username'
              autoComplete='off'
              minLength={3}
              maxLength={32}
              pattern='(?:[A-Za-z0-9._]|-)+'
              required
              value={username}
              onChange={event => setUsername(event.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='new-user-password'>초기 비밀번호</Label>
            <Input
              id='new-user-password'
              type='password'
              autoComplete='new-password'
              minLength={12}
              maxLength={128}
              required
              value={password}
              onChange={event => setPassword(event.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='new-user-password-confirm'>비밀번호 확인</Label>
            <Input
              id='new-user-password-confirm'
              type='password'
              autoComplete='new-password'
              minLength={12}
              maxLength={128}
              required
              value={confirmation}
              onChange={event => setConfirmation(event.target.value)}
            />
          </div>
          {feedbackAction === 'create' && error && (
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {feedbackAction === 'create' && notice && (
            <p className='text-sm text-green-700'>{notice}</p>
          )}
          <Button type='submit' disabled={loading}>
            {loading ? '처리 중...' : '사용자 계정 발급'}
          </Button>
        </form>
        <form className='space-y-3 border-t pt-3' onSubmit={handleReset}>
          <h3 className='text-sm font-medium'>사용자 비밀번호 재설정</h3>
          <Label htmlFor='reset-user'>사용자 선택</Label>
          <Select value={resetUserId} onValueChange={setResetUserId}>
            <SelectTrigger id='reset-user'>
              <SelectValue placeholder='사용자를 선택하세요' />
            </SelectTrigger>
            <SelectContent>
              {users
                .filter(user => user.role === 'user')
                .map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.username}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Label htmlFor='reset-password'>새 비밀번호</Label>
          <Input
            id='reset-password'
            type='password'
            autoComplete='new-password'
            minLength={12}
            maxLength={128}
            required
            value={resetPassword}
            onChange={event => setResetPassword(event.target.value)}
          />
          <Label htmlFor='reset-password-confirm'>새 비밀번호 확인</Label>
          <Input
            id='reset-password-confirm'
            type='password'
            autoComplete='new-password'
            minLength={12}
            maxLength={128}
            required
            value={resetConfirmation}
            onChange={event => setResetConfirmation(event.target.value)}
          />
          {feedbackAction === 'reset' && error && (
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {feedbackAction === 'reset' && notice && (
            <p className='text-sm text-green-700'>{notice}</p>
          )}
          <Button type='submit' disabled={loading}>
            비밀번호 재설정
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
