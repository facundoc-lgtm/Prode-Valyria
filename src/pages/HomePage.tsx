import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRoomByCode, createRoom, createUser } from '../lib/db';
import { getSession, setSession } from '../lib/auth';

const BALLS = [
  { top: '8%', left: '5%', size: 28, op: 0.18 },
  { top: '15%', left: '85%', size: 22, op: 0.14 },
  { top: '30%', left: '92%', size: 18, op: 0.12 },
  { top: '55%', left: '3%', size: 24, op: 0.16 },
  { top: '70%', left: '88%', size: 20, op: 0.13 },
  { top: '82%', left: '15%', size: 16, op: 0.11 },
  { top: '90%', left: '70%', size: 22, op: 0.14 },
  { top: '5%', left: '50%', size: 19, op: 0.12 },
];

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

type Mode = 'home' | 'create';

export default function HomePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('home');
  const [codeInput, setCodeInput] = useState('');
  const [createForm, setCreateForm] = useState({ roomName: '', username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const s = getSession();
    if (s) navigate(`/room/${s.roomCode}`);
  }, [navigate]);

  async function handleEnter(e: React.FormEvent) {
    e.preventDefault();
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    navigate(`/room/${code}`);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      let code: string;
      let attempts = 0;
      do {
        code = generateCode();
        attempts++;
        if (attempts > 20) { setError('No se pudo generar un código'); setLoading(false); return; }
      } while (await getRoomByCode(code));

      await createRoom(code, createForm.roomName.trim());
      const userId = await createUser(code, createForm.username.trim(), createForm.password, true);
      setSession({ roomCode: code, userId, username: createForm.username.trim(), isAdmin: true });
      navigate(`/room/${code}`);
    } catch (err) {
      setError('Error al crear la sala. Verificá tu conexión.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem',
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(160deg, #07131a 0%, #0d2133 50%, #07131a 100%)',
      }}
    >
      {/* Big "26" decoration */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', pointerEvents: 'none', userSelect: 'none', overflow: 'hidden',
      }}>
        <span style={{
          fontSize: 'min(80vw, 80vh)', fontWeight: 900,
          color: 'rgba(15,45,65,0.55)', lineHeight: 1, letterSpacing: '-0.05em',
        }}>26</span>
      </div>

      {/* Floating balls */}
      {BALLS.map((b, i) => (
        <div key={i} style={{
          position: 'absolute', top: b.top, left: b.left,
          fontSize: b.size, opacity: b.op, pointerEvents: 'none',
        }}>⚽</div>
      ))}

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 360 }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{
            background: '#0a0e15', border: '1px solid #1a2a38',
            borderRadius: '1rem', padding: '1.25rem 1.5rem',
            display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '0.75rem',
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1, color: 'white', letterSpacing: '-0.05em' }}>
              <span style={{ color: 'var(--teal)' }}>2</span>6
            </div>
            <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.3em', color: 'var(--text-muted)', marginTop: 4 }}>FIFA</div>
          </div>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.25em', color: 'var(--teal)' }}>
            ¡PREDICÍ Y GANÁ!
          </p>
        </div>

        {mode === 'home' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <form onSubmit={handleEnter} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                  CÓDIGO DE SALA
                </label>
                <input
                  className="input-field"
                  placeholder="ej: familia"
                  value={codeInput}
                  maxLength={6}
                  onChange={e => { setCodeInput(e.target.value.toUpperCase()); setError(''); }}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.1rem', fontFamily: 'monospace' }}
                  autoFocus
                />
              </div>
              {error && <p style={{ color: '#f87171', fontSize: '0.875rem' }}>{error}</p>}
              <button type="submit" className="btn-blue">ENTRAR A LA SALA →</button>
            </form>
            <div style={{ marginTop: '0.75rem' }}>
              <button onClick={() => { setMode('create'); setError(''); }} className="btn-dark">
                Crear sala nueva
              </button>
            </div>
          </div>
        )}

        {mode === 'create' && (
          <div className="card" style={{ padding: '1.5rem' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.2em', color: 'var(--teal)', marginBottom: '1.25rem' }}>
              CREAR SALA NUEVA
            </p>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { label: 'NOMBRE DE LA SALA', key: 'roomName', placeholder: 'ej: Los Pibes', type: 'text' },
                { label: 'TU NOMBRE', key: 'username', placeholder: 'ej: Facu', type: 'text' },
                { label: 'ELEGÍ UN CÓDIGO PERSONAL', key: 'password', placeholder: 'ej: 1234', type: 'password' },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                    {label}
                  </label>
                  <input
                    className="input-field"
                    type={type}
                    placeholder={placeholder}
                    value={createForm[key as keyof typeof createForm]}
                    onChange={e => setCreateForm(f => ({ ...f, [key]: e.target.value }))}
                    required
                    minLength={key === 'password' ? 4 : 2}
                  />
                </div>
              ))}
              {error && <p style={{ color: '#f87171', fontSize: '0.875rem' }}>{error}</p>}
              <button type="submit" disabled={loading} className="btn-blue">
                {loading ? 'Creando sala...' : 'CREAR SALA →'}
              </button>
              <button type="button" onClick={() => { setMode('home'); setError(''); }} className="btn-dark">← Volver</button>
            </form>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1.5rem', opacity: 0.6 }}>
          Mundial USA · Canadá · México 2026
        </p>
      </div>
    </div>
  );
}
