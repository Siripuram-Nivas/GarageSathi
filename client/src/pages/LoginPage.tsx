import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Lock } from 'lucide-react';
import { api } from '../lib/api';
import { Button, Card, Field, Input, PageHeader, useToast } from '../components/ui';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState('');
  const { push } = useToast();

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoggingIn(true);
    try {
      await api.auth.login({ username, password });
      push('Signed in.', 'success');
      navigate('/');
    } catch (e: any) {
      setError(e.message || 'Sign in failed.');
      push(e.message || 'Sign in failed.', 'error');
    } finally {
      setLoggingIn(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950 px-4">
      <Card className="w-full max-w-md p-8">
        <PageHeader
          title="Sign in"
          subtitle="Enter your GarageSathi owner credentials."
          actions={<Link to="/" className="text-xs text-teal-300 hover:text-teal-200">← Back to dashboard</Link>}
        />

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <Field label="Username">
            <Input
              placeholder="mechanic"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              aria-label="Username"
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-label="Password"
            />
          </Field>
          <Button type="submit" className="w-full" loading={loggingIn}>
            <LogIn size={16} /> Sign in
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-ink-700 flex items-center gap-2 text-xs text-slate-500">
          <Lock size={14} />
          <span>Sessions are server-managed; credentials are never stored in the browser.</span>
        </div>
      </Card>
    </div>
  );
}
