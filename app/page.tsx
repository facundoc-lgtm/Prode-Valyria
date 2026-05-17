'use client';
import { useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

type Mode = 'home' | 'create' | 'join-new' | 'join-existing';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [createForm, setCreateForm] = useState({ roomName: '', username: '', password: '' });
  const [joinNewForm, setJoinNewForm] = useState({ roomCode: '', username: '', password: '' });
  const [loginForm, setLoginForm] = useState({ roomCode: '', username: '', password: '' });

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.roomCode) {
      router.replace(`/room/${session.user.roomCode}`);
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-amber-400 text-xl animate-pulse">Cargando...</div>
      </div>
    );
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
      if (!res.ok) { setError(data.error); return; }

      const result = await signIn('credentials', {
        username: createForm.username,
        password: createForm.password,
        roomCode: data.code,
        redirect: false,
      });
      if (result?.error) { setError('Error al iniciar sesión automáticamente'); return; }
      router.push(`/room/${data.code}`);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinNew(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...joinNewForm, roomCode: joinNewForm.roomCode.toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }

      const result = await signIn('credentials', {
        username: joinNewForm.username,
        password: joinNewForm.password,
        roomCode: joinNewForm.roomCode.toUpperCase(),
        redirect: false,
      });
      if (result?.error) { setError('Error al iniciar sesión'); return; }
      router.push(`/room/${joinNewForm.roomCode.toUpperCase()}`);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        username: loginForm.username,
        password: loginForm.password,
        roomCode: loginForm.roomCode.toUpperCase(),
        redirect: false,
      });
      if (result?.error) { setError('Usuario, contraseña o código incorrecto'); return; }
      router.push(`/room/${loginForm.roomCode.toUpperCase()}`);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-3">⚽</div>
        <h1 className="text-4xl sm:text-5xl font-bold text-amber-400 mb-2">Prode Valyria</h1>
        <p className="text-slate-400 text-lg">Mundial 2026 · Jugá con tus amigos</p>
      </div>

      {/* Main card */}
      <div className="w-full max-w-md">
        {mode === 'home' && (
          <div className="card p-8 flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-slate-200 text-center mb-2">¿Qué querés hacer?</h2>
            <button onClick={() => { setMode('create'); setError(''); }} className="btn-primary text-center py-3 text-base rounded-xl">
              🏟️ Crear una sala nueva
            </button>
            <button onClick={() => { setMode('join-new'); setError(''); }} className="btn-secondary text-center py-3 text-base rounded-xl">
              👤 Unirme a una sala (nuevo usuario)
            </button>
            <button onClick={() => { setMode('join-existing'); setError(''); }} className="btn-secondary text-center py-3 text-base rounded-xl">
              🔑 Ya tengo cuenta en una sala
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="card p-8">
            <button onClick={() => { setMode('home'); setError(''); }} className="text-slate-400 hover:text-slate-200 text-sm mb-4 flex items-center gap-1">
              ← Volver
            </button>
            <h2 className="text-xl font-semibold text-amber-400 mb-6">Crear sala nueva</h2>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Nombre de la sala</label>
                <input className="input" placeholder="Ej: Los Pibes del Trabajo" value={createForm.roomName}
                  onChange={e => setCreateForm(f => ({ ...f, roomName: e.target.value }))} required />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Tu nombre de usuario</label>
                <input className="input" placeholder="Ej: Facundo" value={createForm.username}
                  onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))} required minLength={2} />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Contraseña</label>
                <input className="input" type="password" placeholder="Mínimo 4 caracteres" value={createForm.password}
                  onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} required minLength={4} />
              </div>
              {error && <p className="text-red-400 text-sm bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary py-3 mt-2 rounded-xl">
                {loading ? 'Creando sala...' : 'Crear sala ✨'}
              </button>
            </form>
          </div>
        )}

        {mode === 'join-new' && (
          <div className="card p-8">
            <button onClick={() => { setMode('home'); setError(''); }} className="text-slate-400 hover:text-slate-200 text-sm mb-4 flex items-center gap-1">
              ← Volver
            </button>
            <h2 className="text-xl font-semibold text-amber-400 mb-6">Unirme a una sala</h2>
            <form onSubmit={handleJoinNew} className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Código de sala</label>
                <input className="input font-mono uppercase tracking-widest text-lg" placeholder="Ej: ABC123"
                  value={joinNewForm.roomCode} maxLength={6}
                  onChange={e => setJoinNewForm(f => ({ ...f, roomCode: e.target.value.toUpperCase() }))} required />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Elegí tu nombre de usuario</label>
                <input className="input" placeholder="Ej: María" value={joinNewForm.username}
                  onChange={e => setJoinNewForm(f => ({ ...f, username: e.target.value }))} required minLength={2} />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Contraseña</label>
                <input className="input" type="password" placeholder="Mínimo 4 caracteres" value={joinNewForm.password}
                  onChange={e => setJoinNewForm(f => ({ ...f, password: e.target.value }))} required minLength={4} />
              </div>
              {error && <p className="text-red-400 text-sm bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary py-3 mt-2 rounded-xl">
                {loading ? 'Uniéndome...' : 'Unirme a la sala'}
              </button>
            </form>
            <p className="text-center text-slate-500 text-sm mt-4">
              ¿Ya tenés cuenta?{' '}
              <button onClick={() => { setMode('join-existing'); setError(''); }} className="text-amber-400 hover:underline">
                Iniciá sesión
              </button>
            </p>
          </div>
        )}

        {mode === 'join-existing' && (
          <div className="card p-8">
            <button onClick={() => { setMode('home'); setError(''); }} className="text-slate-400 hover:text-slate-200 text-sm mb-4 flex items-center gap-1">
              ← Volver
            </button>
            <h2 className="text-xl font-semibold text-amber-400 mb-6">Iniciar sesión</h2>
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Código de sala</label>
                <input className="input font-mono uppercase tracking-widest text-lg" placeholder="Ej: ABC123"
                  value={loginForm.roomCode} maxLength={6}
                  onChange={e => setLoginForm(f => ({ ...f, roomCode: e.target.value.toUpperCase() }))} required />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Tu nombre de usuario</label>
                <input className="input" placeholder="Ej: Facundo" value={loginForm.username}
                  onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))} required />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Contraseña</label>
                <input className="input" type="password" placeholder="" value={loginForm.password}
                  onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} required />
              </div>
              {error && <p className="text-red-400 text-sm bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary py-3 mt-2 rounded-xl">
                {loading ? 'Iniciando sesión...' : 'Entrar a la sala'}
              </button>
            </form>
            <p className="text-center text-slate-500 text-sm mt-4">
              ¿Primera vez en esta sala?{' '}
              <button onClick={() => { setMode('join-new'); setError(''); }} className="text-amber-400 hover:underline">
                Registrate
              </button>
            </p>
          </div>
        )}
      </div>

      <p className="text-slate-600 text-sm mt-8">Mundial USA · Canadá · México 2026</p>
    </div>
  );
}
