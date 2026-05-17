'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { getFlag } from '@/lib/flags';

interface Match {
  id: number;
  home_team: string;
  away_team: string;
  match_date: string;
  stage: string;
  group_name: string | null;
  match_number: number;
  home_score: number | null;
  away_score: number | null;
  is_finished: number;
}

const STAGE_LABELS: Record<string, string> = {
  group: 'Fase de Grupos', r32: 'Ronda de 32', r16: 'Octavos',
  qf: 'Cuartos', sf: 'Semifinales', '3rd': 'Tercer Puesto', final: 'Final',
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
}

function ResultRow({ match, onSave }: { match: Match; onSave: (id: number, h: number, a: number) => Promise<void> }) {
  const [h, setH] = useState(match.home_score != null ? String(match.home_score) : '');
  const [a, setA] = useState(match.away_score != null ? String(match.away_score) : '');
  const [status, setStatus] = useState<'idle'|'saving'|'saved'|'error'>('idle');
  const [err, setErr] = useState('');

  async function save() {
    const hi = parseInt(h, 10), ai = parseInt(a, 10);
    if (isNaN(hi) || isNaN(ai) || hi < 0 || ai < 0) { setErr('Valores inválidos'); return; }
    setStatus('saving'); setErr('');
    try {
      await onSave(match.id, hi, ai);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error');
      setStatus('error');
    }
  }

  return (
    <div className="px-3 py-3 rounded-xl mb-2" style={{
      background: match.is_finished ? 'rgba(46,196,182,0.07)' : '#0f2030',
      border: `1px solid ${match.is_finished ? 'rgba(46,196,182,0.25)' : 'var(--border)'}`,
    }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {fmtDate(match.match_date)}
          {match.group_name ? ` · Gr.${match.group_name}` : ` · ${STAGE_LABELS[match.stage]}`}
        </span>
        {match.is_finished ? (
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(46,196,182,0.2)', color: 'var(--teal)' }}>✓ Cargado</span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
          <span className="text-sm font-semibold text-white truncate text-right">{match.home_team}</span>
          <span>{getFlag(match.home_team)}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <input type="number" className="score-box" value={h} min={0} max={99}
            onChange={e => setH(e.target.value.replace(/\D/g,'').slice(0,2))} placeholder="0" />
          <span className="font-bold" style={{ color: 'var(--text-muted)' }}>-</span>
          <input type="number" className="score-box" value={a} min={0} max={99}
            onChange={e => setA(e.target.value.replace(/\D/g,'').slice(0,2))} placeholder="0" />
        </div>
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <span>{getFlag(match.away_team)}</span>
          <span className="text-sm font-semibold text-white truncate">{match.away_team}</span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs">
          {err && <span className="text-red-400">{err}</span>}
          {status === 'saved' && <span className="text-green-400">✓ Puntos calculados</span>}
        </span>
        <button onClick={save} disabled={status === 'saving'} className="btn-blue text-xs px-4 py-1.5 rounded-lg disabled:opacity-50">
          {status === 'saving' ? '...' : match.is_finished ? 'Actualizar' : 'Confirmar'}
        </button>
      </div>
    </div>
  );
}

function TeamRow({ match, onSave }: { match: Match; onSave: (id: number, h: string, a: string) => Promise<void> }) {
  const [h, setH] = useState(match.home_team);
  const [a, setA] = useState(match.away_team);
  const [status, setStatus] = useState<'idle'|'saving'|'saved'>('idle');
  const dirty = h !== match.home_team || a !== match.away_team;

  async function save() {
    if (!h.trim() || !a.trim()) return;
    setStatus('saving');
    await onSave(match.id, h.trim(), a.trim());
    setStatus('saved');
    setTimeout(() => setStatus('idle'), 2000);
  }

  return (
    <div className="px-3 py-3 rounded-xl mb-2" style={{ background: '#0f2030', border: '1px solid var(--border)' }}>
      <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
        {fmtDate(match.match_date)} · {STAGE_LABELS[match.stage] ?? match.stage}
        {match.group_name ? ` · Gr.${match.group_name}` : ''}
      </div>
      <div className="flex items-center gap-2">
        <input className="input-field flex-1 text-sm py-2" value={h} onChange={e => { setH(e.target.value); setStatus('idle'); }} placeholder="Equipo local" />
        <span className="text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>vs</span>
        <input className="input-field flex-1 text-sm py-2" value={a} onChange={e => { setA(e.target.value); setStatus('idle'); }} placeholder="Equipo visitante" />
        <button onClick={save} disabled={!dirty || status === 'saving'} className="btn-blue text-xs px-3 py-2 rounded-lg shrink-0 disabled:opacity-40">
          {status === 'saved' ? '✓' : 'OK'}
        </button>
      </div>
    </div>
  );
}

// Admin login form (for non-admin users)
function AdminLoginForm({ code }: { code: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr('');
    const result = await signIn('credentials', { username: name, password: pass, roomCode: code, redirect: false });
    if (result?.error) { setErr('Credenciales incorrectas'); setLoading(false); return; }
    router.refresh();
    window.location.reload();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(160deg, #07131a 0%, #0d2133 50%, #07131a 100%)' }}>
      <div className="w-full max-w-sm card p-6">
        <h2 className="text-lg font-black tracking-widest mb-1 text-red-400">ACCESO ADMIN</h2>
        <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Ingresá con las credenciales del administrador</p>
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold tracking-widest mb-2 block" style={{ color: 'var(--text-muted)' }}>USUARIO ADMIN</label>
            <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre del admin" required />
          </div>
          <div>
            <label className="text-xs font-bold tracking-widest mb-2 block" style={{ color: 'var(--text-muted)' }}>CÓDIGO ADMIN</label>
            <input className="input-field" type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Contraseña" required />
          </div>
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button type="submit" disabled={loading} className="btn-blue">{loading ? 'Verificando...' : 'ENTRAR'}</button>
          <button type="button" onClick={() => router.push(`/room/${code}`)} className="btn-dark text-sm">← Volver a la sala</button>
        </form>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const code = ((params.code as string) || '').toUpperCase();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'results' | 'teams'>('results');
  const [stage, setStage] = useState('group');

  const fetchMatches = useCallback(async () => {
    const res = await fetch('/api/matches');
    if (res.ok) setMatches(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.isAdmin) fetchMatches();
    else if (status !== 'loading') setLoading(false);
  }, [status, session, fetchMatches]);

  async function saveResult(id: number, h: number, a: number) {
    const res = await fetch('/api/admin/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId: id, homeScore: h, awayScore: a }) });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
    setMatches(p => p.map(m => m.id === id ? { ...m, home_score: h, away_score: a, is_finished: 1 } : m));
  }

  async function saveTeams(id: number, h: string, a: string) {
    const res = await fetch('/api/admin/teams', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matchId: id, homeTeam: h, awayTeam: a }) });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
    setMatches(p => p.map(m => m.id === id ? { ...m, home_team: h, away_team: a } : m));
  }

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}><span className="text-2xl animate-pulse">⚽</span></div>;
  }

  if (!session?.user?.isAdmin) {
    return <AdminLoginForm code={code} />;
  }

  const stages = ['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final'];
  const stageMatches = matches.filter(m => m.stage === stage);
  const done = matches.filter(m => m.is_finished).length;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #07131a 0%, #0d2133 50%, #07131a 100%)' }}>
      <div className="max-w-lg mx-auto px-3 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => window.location.href = `/room/${code}`} className="text-sm" style={{ color: 'var(--text-muted)' }}>←</button>
          <div>
            <h1 className="text-base font-black text-red-400 tracking-widest">PANEL ADMIN</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{done}/{matches.length} resultados cargados</p>
          </div>
        </div>

        {/* Main tabs */}
        <div className="flex rounded-xl overflow-hidden mb-4" style={{ background: '#0d2030', border: '1px solid var(--border)' }}>
          {[['results', '⚽ Resultados'], ['teams', '✏️ Equipos']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id as 'results' | 'teams')}
              className={`flex-1 py-2.5 text-xs font-bold transition-colors ${tab === id ? 'text-white' : ''}`}
              style={tab === id ? { background: 'var(--blue)' } : { color: 'var(--text-muted)' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Stage filter */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-4">
          {stages.map(s => {
            const c = matches.filter(m => m.stage === s).length;
            if (!c) return null;
            const done = matches.filter(m => m.stage === s && m.is_finished).length;
            return (
              <button key={s} onClick={() => setStage(s)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${stage === s ? 'text-white' : ''}`}
                style={stage === s ? { background: 'var(--blue)' } : { background: '#0f2030', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                {STAGE_LABELS[s]} <span style={{ opacity: 0.7 }}>{tab === 'results' ? `${done}/${c}` : c}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        {tab === 'results'
          ? stageMatches.map(m => <ResultRow key={m.id} match={m} onSave={saveResult} />)
          : <>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Actualizá los equipos cuando se definan en la fase eliminatoria.</p>
              {stageMatches.map(m => <TeamRow key={m.id} match={m} onSave={saveTeams} />)}
            </>
        }
        {stageMatches.length === 0 && (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>No hay partidos en esta etapa</div>
        )}
      </div>
    </div>
  );
}
