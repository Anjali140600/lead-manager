import { useState, type FormEvent } from 'react';

interface Props {
  onLogin: (input: { email: string; password: string }) => Promise<void>;
  onSignup: (input: { name: string; email: string; password: string }) => Promise<void>;
}

export function AuthScreen({ onLogin, onSignup }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function switchMode(next: 'login' | 'signup') {
    setMode(next);
    setError('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (mode === 'signup' && name.trim().length < 2) return setError('Enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setSaving(true);
    try {
      if (mode === 'login') await onLogin({ email: email.trim().toLowerCase(), password });
      else await onSignup({ name: name.trim(), email: email.trim().toLowerCase(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to continue.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <a className="brand auth-brand" href="#"><span>LF</span><strong>LeadFlow</strong></a>
        <div>
          <span className="eyebrow">Your sales workspace</span>
          <h1>Turn every enquiry into an opportunity.</h1>
          <p>Keep your leads organised, follow their progress, and focus on the conversations that matter.</p>
        </div>
        <small>Simple lead management for focused sales teams.</small>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <span className="eyebrow">Welcome to LeadFlow</span>
          <h2>{mode === 'login' ? 'Log in to your account' : 'Create your account'}</h2>
          <p>{mode === 'login' ? 'Enter your details to open your workspace.' : 'Start managing your sales pipeline in minutes.'}</p>
          <div className="auth-tabs" role="tablist">
            <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')} type="button">Log in</button>
            <button className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')} type="button">Sign up</button>
          </div>
          <form onSubmit={submit} noValidate>
            {error && <div className="alert" role="alert">{error}</div>}
            {mode === 'signup' && <label><span>Full name</span><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Aarav Sharma" autoComplete="name" /></label>}
            <label><span>Email address</span><input autoFocus={mode === 'login'} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" /></label>
            <label><span>Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
            <button className="button primary auth-submit" disabled={saving}>{saving ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}</button>
          </form>
        </div>
      </section>
    </main>
  );
}
