import { useEffect, useState } from 'react';
import { createManagedUser, getManagedUsers, type ManagedUser } from '../features/auth/client';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

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

interface AccountManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AccountManagementDialog({ open, onOpenChange }: AccountManagementDialogProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(undefined);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
          {error && (
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {notice && <p className='text-sm text-green-700'>{notice}</p>}
          <Button type='submit' disabled={loading}>
            {loading ? '처리 중...' : '사용자 계정 발급'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
