import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isRegister = mode === 'register';

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      if (isRegister) {
        await register(email.trim(), password, name.trim());
      } else {
        await login(email.trim(), password);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login">
      <form className="login-card" onSubmit={submit}>
        <p className="eyebrow">Barbon Performance</p>
        <h1>Analysis</h1>
        <p className="lede">{isRegister ? 'Set up your coach workspace' : 'Coach workspace'}</p>

        {isRegister ? (
          <label className="field">
            <span>Name</span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
        ) : null}

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
            required
          />
        </label>

        {error ? (
          <p className="error" id="login-error" role="alert">
            {error}
          </p>
        ) : null}

        {/* aria-disabled rather than disabled: a disabled button drops keyboard focus mid-submit. */}
        <button type="submit" className="primary" aria-disabled={busy}>
          {busy
            ? isRegister
              ? 'Creating account…'
              : 'Signing in…'
            : isRegister
              ? 'Create account'
              : 'Sign in'}
        </button>

        <button
          type="button"
          className="switch"
          onClick={() => {
            setMode(isRegister ? 'login' : 'register');
            setError(null);
          }}
        >
          {isRegister ? 'Already have an account? Sign in' : 'First time here? Create your account'}
        </button>
      </form>
    </main>
  );
}
