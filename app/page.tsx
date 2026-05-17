'use client';
import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const BALLS = [
  { top: '8%',  left: '5%',  size: 28, opacity: 0.18 },
  { top: '15%', left: '85%', size: 22, opacity: 0.14 },
  { top: '30%', left: '92%', size: 18, opacity: 0.12 },
  { top: '55%', left: '3%',  size: 24, opacity: 0.16 },
  { top: '70%', left: '88%', size: 20, opacity: 0.13 },
  { top: '82%', left: '15%', size: 16, opacity: 0.11 },
  { top: '90%', left: '70%', size: 22, opacity: 0.14 },
  { top: '42%', left: '96%', size: 15, opacity: 0.10 },
  { top: '5%',  left: '50%', size: 19, opacity: 0.12 },
  { top: '65%', left: '50%', size: 17, opacity: 0.09 },
];

type Mode = 'home' | 'create';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('home');
  const [codeInput, setCodeInput] = useState('');
  const [createForm, setCreateForm] = useState({ roomName: '', username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.roomCode) {
      router.replace(`/room/${session.user.roomCode}`);
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl animate-pulse" style={{ color: 'var(--teal)' }}>⚽</div>
      </div>
    );
  }

  async function handleEnterRoom(e: React.FormEvent) {
    e.preventDefault();
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    router.push(`/room/${code}`);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }

      const result = await signIn('credentials', {
        username: createForm.username,
        password: createForm.password,
        roomCode: data.code,
        redirect: false,
      });
      if (result?.error) { setError('Error al iniciar sesión'); setLoading(false); return; }
      router.push(`/room/${data.code}`);
    } catch {
      setError('Error de conexión');
      setLoading(false);
    }
  }

  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center px-4 py-8 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #07131a 0%, #0d2133 50%, #07131a 100%)' }}
    >
      {/* Big "26" background decoration */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
        aria-hidden
      >
        <span
          className="font-black leading-none"
          style={{
            fontSize: 'min(80vw, 80vh)',
            color: 'rgba(15, 45, 65, 0.55)',
            letterSpacing: '-0.05em',
          }}
        >
          26
        </span>
      </div>

      {/* Floating soccer balls */}
      {BALLS.map((b, i) => (
        <div
          key={i}
          className="absolute pointer-events-none select-none"
          style={{ top: b.top, left: b.left, fontSize: b.size, opacity: b.opacity }}
          aria-hidden
        >
          ⚽
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Logo */}
        <div
          className="mb-5 px-6 py-5 rounded-2xl flex flex-col items-center"
          style={{ background: '#0a0e15', border: '1px solid #1a2a38' }}
        >
          <div className="text-5xl font-black tracking-tight text-white leading-none">
            <span style={{ color: 'var(--teal)' }}>2</span>
            <span>6</span>
          </div>
          <div className="text-xs font-bold tracking-[0.3em] mt-1" style={{ color: 'var(--text-muted)' }}>
            FIFA
          </div>
        </div>

        <p className="text-sm font-bold tracking-[0.25em] mb-6" style={{ color: 'var(--teal)' }}>
          ¡PREDICÍ Y GANÁ!
        </p>

        {mode === 'home' && (
          <div className="w-full card p-6 flex flex-col gap-3">
            <form onSubmit={handleEnterRoom} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold tracking-widest mb-2 block" style={{ color: 'var(--text-muted)' }}>
                  CÓDIGO DE SALA
                </label>
                <input
                  className="input-field font-mono uppercase tracking-[0.3em] text-lg text-center"
                  placeholder="ej: familia"
                  value={codeInput}
                  maxLength={6}
                  onChange={e => { setCodeInput(e.target.value.toUpperCase()); setError(''); }}
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
              )}
              <button type="submit" className="btn-blue text-base mt-1">
                ENTRAR A LA SALA →
              </button>
            </form>
            <button onClick={() => { setMode('create'); setError(''); }} className="btn-dark text-sm">
              Crear sala nueva
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="w-full card p-6">
            <h2 className="text-sm font-bold tracking-widest mb-5" style={{ color: 'var(--teal)' }}>
              CREAR SALA NUEVA
            </h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold tracking-widest mb-2 block" style={{ color: 'var(--text-muted)' }}>
                  NOMBRE DE LA SALA
                </label>
                <input
                  className="input-field"
                  placeholder="ej: Los Pibes"
                  value={createForm.roomName}
                  onChange={e => setCreateForm(f => ({ ...f, roomName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold tracking-widest mb-2 block" style={{ color: 'var(--text-muted)' }}>
                  TU NOMBRE
                </label>
                <input
                  className="input-field"
                  placeholder="ej: Facu"
                  value={createForm.username}
                  onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))}
                  required minLength={2}
                />
              </div>
              <div>
                <label className="text-xs font-bold tracking-widest mb-2 block" style={{ color: 'var(--text-muted)' }}>
                  ELEGÍ UN CÓDIGO PERSONAL
                </label>
                <input
                  className="input-field"
                  placeholder="ej: 1234"
                  value={createForm.password}
                  onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                  required minLength={4}
                />
              </div>
              {error && (
                <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
              )}
              <button type="submit" disabled={loading} className="btn-blue text-sm mt-1">
                {loading ? 'Creando sala...' : 'CREAR SALA →'}
              </button>
              <button
                type="button"
                onClick={() => { setMode('home'); setError(''); }}
                className="btn-dark text-sm"
              >
                ← Volver
              </button>
            </form>
          </div>
        )}

        <p className="text-xs mt-6" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
          Mundial USA · Canadá · México 2026
        </p>
      </div>
    </div>
  );
}
