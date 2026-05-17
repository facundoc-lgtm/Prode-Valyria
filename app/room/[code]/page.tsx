'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { getFlag } from '@/lib/flags';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RoomInfo { id: number; code: string; name: string; }
interface Player { id: number; username: string; isAdmin: boolean; }

interface Match {
  id: number;
  home_team: string;
  away_team: string;
  match_date: string;
  stage: 'group' | 'r32' | 'r16' | 'qf' | 'sf' | '3rd' | 'final';
  group_name: string | null;
  match_number: number;
  home_score: number | null;
  away_score: number | null;
  is_finished: number;
  prediction: { home_score: number; away_score: number; points: number | null } | null;
}

interface LeaderboardEntry {
  user_id: number;
  username: string;
  total_points: number;
  predictions_count: number;
  finished_count: number;
  exact_count: number;
  result_count: number;
}

const STAGE_LABELS: Record<string, string> = {
  group: 'Fase de Grupos',
  r32: 'Ronda de 32',
  r16: 'Octavos',
  qf: 'Cuartos',
  sf: 'Semifinales',
  '3rd': 'Tercer Puesto',
  final: 'Final',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasStarted(d: string) { return new Date() >= new Date(d); }

function fmtDate(iso: string) {
  const d = new Date(iso);
  const days = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return `${days[d.getUTCDay()]} ${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
}

function fmtDayKey(iso: string) {
  return iso.slice(0, 10);
}

// ─── Background decoration ────────────────────────────────────────────────────

const BALLS = [
  { top: '5%',  left: '4%',  size: 24, opacity: 0.12 },
  { top: '12%', left: '88%', size: 18, opacity: 0.10 },
  { top: '40%', left: '95%', size: 20, opacity: 0.09 },
  { top: '65%', left: '2%',  size: 22, opacity: 0.11 },
  { top: '85%', left: '80%', size: 18, opacity: 0.09 },
  { top: '92%', left: '30%', size: 15, opacity: 0.08 },
];

// ─── MatchPredictionCard ──────────────────────────────────────────────────────

function MatchPredictionCard({ match, onSave }: {
  match: Match;
  onSave: (matchId: number, h: number, a: number) => Promise<void>;
}) {
  const [home, setHome] = useState(match.prediction?.home_score != null ? String(match.prediction.home_score) : '');
  const [away, setAway] = useState(match.prediction?.away_score != null ? String(match.prediction.away_score) : '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const debounce = useRef<NodeJS.Timeout | null>(null);
  const started = hasStarted(match.match_date);
  const finished = match.is_finished === 1;

  useEffect(() => {
    if (match.prediction?.home_score != null) setHome(String(match.prediction.home_score));
    if (match.prediction?.away_score != null) setAway(String(match.prediction.away_score));
  }, [match.prediction]);

  const save = useCallback(async (h: string, a: string) => {
    const hi = parseInt(h, 10), ai = parseInt(a, 10);
    if (isNaN(hi) || isNaN(ai) || hi < 0 || ai < 0) return;
    setStatus('saving');
    try {
      await onSave(match.id, hi, ai);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
    }
  }, [match.id, onSave]);

  function onChange(side: 'h' | 'a', val: string) {
    const v = val.replace(/[^0-9]/g, '').slice(0, 2);
    if (side === 'h') setHome(v); else setAway(v);
    setStatus('idle');
    if (debounce.current) clearTimeout(debounce.current);
    const nh = side === 'h' ? v : home;
    const na = side === 'a' ? v : away;
    debounce.current = setTimeout(() => save(nh, na), 700);
  }

  // Points color
  const pts = match.prediction?.points;
  const ptsBg = finished && pts != null
    ? pts === 3 ? 'border-green-500/30 bg-green-900/15'
      : pts === 1 ? 'border-yellow-500/30 bg-yellow-900/10'
      : 'border-red-500/20'
    : '';

  return (
    <div className={`match-row ${ptsBg}`}>
      {/* Home team */}
      <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
        <span className="text-sm font-semibold text-white truncate text-right">{match.home_team}</span>
        <span className="text-base shrink-0">{getFlag(match.home_team)}</span>
      </div>

      {/* Scores */}
      <div className="flex items-center gap-1 shrink-0">
        {started ? (
          <>
            <div className="score-box flex items-center justify-center text-base">
              {home !== '' ? home : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>-</span>}
            </div>
            <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>-</span>
            <div className="score-box flex items-center justify-center text-base">
              {away !== '' ? away : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>-</span>}
            </div>
          </>
        ) : (
          <>
            <input type="number" className="score-box" value={home} onChange={e => onChange('h', e.target.value)} placeholder="-" min={0} max={99} />
            <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>-</span>
            <input type="number" className="score-box" value={away} onChange={e => onChange('a', e.target.value)} placeholder="-" min={0} max={99} />
          </>
        )}
      </div>

      {/* Away team */}
      <div className="flex-1 flex items-center justify-start gap-2 min-w-0">
        <span className="text-base shrink-0">{getFlag(match.away_team)}</span>
        <span className="text-sm font-semibold text-white truncate">{match.away_team}</span>
      </div>

      {/* Right: result or status */}
      <div className="shrink-0 w-8 text-right">
        {finished && match.home_score != null ? (
          <span className="text-xs font-bold" style={{
            color: pts === 3 ? '#4ade80' : pts === 1 ? '#facc15' : pts === 0 ? '#f87171' : 'var(--text-muted)'
          }}>
            {pts === 3 ? '🎯' : pts === 1 ? '✅' : pts === 0 ? '❌' : ''}
          </span>
        ) : status === 'saving' ? (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>...</span>
        ) : status === 'saved' ? (
          <span className="text-xs text-green-400">✓</span>
        ) : (
          <span className="text-xs" style={{ color: 'var(--border-light)', fontSize: 10 }}>–</span>
        )}
      </div>
    </div>
  );
}

// ─── PredecirTab ──────────────────────────────────────────────────────────────

function PredecirTab({ matches, onSave }: {
  matches: Match[];
  onSave: (matchId: number, h: number, a: number) => Promise<void>;
}) {
  const stages = ['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final'];
  const [activeStage, setActiveStage] = useState('group');

  const stageMatches = matches.filter(m => m.stage === activeStage);
  const byGroup: Record<string, Match[]> = {};
  if (activeStage === 'group') {
    for (const m of stageMatches) {
      const g = m.group_name || '?';
      if (!byGroup[g]) byGroup[g] = [];
      byGroup[g].push(m);
    }
  }

  return (
    <div>
      {/* Stage tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-4 no-scrollbar">
        {stages.map(s => {
          const count = matches.filter(m => m.stage === s).length;
          if (!count) return null;
          return (
            <button key={s} onClick={() => setActiveStage(s)}
              className={activeStage === s ? 'tab-btn-active' : 'tab-btn'}
            >
              {STAGE_LABELS[s]}
            </button>
          );
        })}
      </div>

      {activeStage === 'group' ? (
        <div className="space-y-5">
          {Object.entries(byGroup).sort(([a], [b]) => a.localeCompare(b)).map(([g, ms]) => (
            <div key={g}>
              <h3 className="text-xs font-black tracking-[0.25em] mb-2 uppercase" style={{ color: 'var(--text-muted)' }}>
                Grupo {g}
              </h3>
              <div className="space-y-1.5">
                {ms.map(m => <MatchPredictionCard key={m.id} match={m} onSave={onSave} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {stageMatches.length === 0 ? (
            <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
              <p className="text-2xl mb-2">🕐</p>
              <p className="text-sm">Los partidos de esta fase aún no están definidos</p>
            </div>
          ) : (
            stageMatches.map(m => <MatchPredictionCard key={m.id} match={m} onSave={onSave} />)
          )}
        </div>
      )}
    </div>
  );
}

// ─── TablaTab ─────────────────────────────────────────────────────────────────

function TablaTab({ leaderboard, currentUserId }: {
  leaderboard: LeaderboardEntry[];
  currentUserId: string;
}) {
  return (
    <div>
      {leaderboard.length === 0 ? (
        <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
          <p className="text-sm">Aún no hay jugadores</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((e, i) => {
            const isMe = String(e.user_id) === currentUserId;
            return (
              <div key={e.user_id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{
                  background: isMe ? 'rgba(77,116,239,0.12)' : '#0f2030',
                  border: `1px solid ${isMe ? 'rgba(77,116,239,0.35)' : 'var(--border)'}`,
                }}>
                <span className="text-lg font-black w-6 text-center" style={{ color: 'var(--text-muted)' }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: isMe ? '#7aa0f7' : 'white' }}>
                    {e.username}{isMe && <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>(vos)</span>}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    🎯 {e.exact_count} exactos &nbsp;✅ {e.result_count} resultado
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xl font-black" style={{ color: 'var(--gold)' }}>{e.total_points}</span>
                  <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>PTS</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Legend */}
      <p className="text-xs text-center mt-5" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
        🎯 Marcador exacto = 3 pts &nbsp;|&nbsp; ✅ Resultado correcto = 1 pt
      </p>
    </div>
  );
}

// ─── ResultadosTab ────────────────────────────────────────────────────────────

function ResultadosTab({ matches }: { matches: Match[] }) {
  const finished = matches.filter(m => m.is_finished === 1);
  if (finished.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
        <p className="text-3xl mb-3">⏳</p>
        <p className="text-sm">Todavía no hay partidos finalizados</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {finished.map(m => {
        const pts = m.prediction?.points;
        const predStr = m.prediction != null
          ? `${m.prediction.home_score}-${m.prediction.away_score}`
          : '–';
        return (
          <div key={m.id} className="px-3 py-3 rounded-xl"
            style={{
              background: pts === 3 ? 'rgba(74,222,128,0.08)' : pts === 1 ? 'rgba(250,204,21,0.07)' : '#0f2030',
              border: `1px solid ${pts === 3 ? 'rgba(74,222,128,0.25)' : pts === 1 ? 'rgba(250,204,21,0.2)' : 'var(--border)'}`,
            }}>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                <span className="text-sm font-semibold text-white truncate text-right">{m.home_team}</span>
                <span>{getFlag(m.home_team)}</span>
              </div>
              <div className="shrink-0 flex flex-col items-center">
                <span className="text-sm font-black text-white px-2">
                  {m.home_score}–{m.away_score}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Tu pred: {predStr}
                </span>
              </div>
              <div className="flex-1 flex items-center gap-1.5 min-w-0">
                <span>{getFlag(m.away_team)}</span>
                <span className="text-sm font-semibold text-white truncate">{m.away_team}</span>
              </div>
              <div className="shrink-0 w-8 text-right">
                {pts === 3 ? <span className="text-green-400 font-bold">+3</span>
                  : pts === 1 ? <span className="text-yellow-400 font-bold">+1</span>
                  : pts === 0 ? <span className="text-red-400 font-bold">+0</span>
                  : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── PartidosTab ──────────────────────────────────────────────────────────────

function PartidosTab({ matches }: { matches: Match[] }) {
  // Get unique days
  const days = Array.from(new Set(matches.map(m => fmtDayKey(m.match_date)))).sort();
  const today = new Date().toISOString().slice(0, 10);
  const defaultDay = days.find(d => d >= today) ?? days[0] ?? today;
  const [day, setDay] = useState(defaultDay);
  const idx = days.indexOf(day);

  const dayMatches = matches.filter(m => fmtDayKey(m.match_date) === day);
  const dayLabel = dayMatches.length > 0 ? fmtDate(dayMatches[0].match_date) : day;

  return (
    <div>
      {/* Date navigation */}
      <div className="flex items-center justify-between mb-4 px-1">
        <button
          onClick={() => setDay(days[idx - 1])}
          disabled={idx <= 0}
          className="text-xl px-3 py-1 rounded-lg transition-colors disabled:opacity-30"
          style={{ color: 'var(--teal)' }}
        >
          ←
        </button>
        <p className="text-sm font-bold capitalize" style={{ color: 'var(--text-muted)' }}>
          {dayLabel}
        </p>
        <button
          onClick={() => setDay(days[idx + 1])}
          disabled={idx >= days.length - 1}
          className="text-xl px-3 py-1 rounded-lg transition-colors disabled:opacity-30"
          style={{ color: 'var(--teal)' }}
        >
          →
        </button>
      </div>

      {/* Matches */}
      <div className="space-y-2">
        {dayMatches.map(m => (
          <div key={m.id} className="match-row">
            <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
              <span className="text-sm font-semibold text-white truncate text-right">{m.home_team}</span>
              <span className="text-base">{getFlag(m.home_team)}</span>
            </div>
            <div className="shrink-0 flex flex-col items-center px-2">
              {m.is_finished ? (
                <span className="text-sm font-black text-white">{m.home_score}–{m.away_score}</span>
              ) : hasStarted(m.match_date) ? (
                <span className="text-xs font-bold text-green-400">EN VIVO</span>
              ) : (
                <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  {fmtTime(m.match_date)}
                </span>
              )}
              {m.group_name && (
                <span className="text-xs" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                  Gr.{m.group_name}
                </span>
              )}
            </div>
            <div className="flex-1 flex items-center justify-start gap-1.5 min-w-0">
              <span className="text-base">{getFlag(m.away_team)}</span>
              <span className="text-sm font-semibold text-white truncate">{m.away_team}</span>
            </div>
          </div>
        ))}
        {dayMatches.length === 0 && (
          <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
            No hay partidos este día
          </p>
        )}
      </div>
    </div>
  );
}

// ─── AdminModal ───────────────────────────────────────────────────────────────

function AdminModal({ roomCode, onClose }: { roomCode: string; onClose: () => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    // Fetch admin username for the room, then sign in
    try {
      const res = await fetch(`/api/rooms/${roomCode}/admin-user`);
      if (!res.ok) { setError('Error al obtener datos de admin'); setLoading(false); return; }
      const { adminUsername } = await res.json();
      const result = await signIn('credentials', {
        username: adminUsername,
        password: code,
        roomCode,
        redirect: false,
      });
      if (result?.error) { setError('Código incorrecto'); setLoading(false); return; }
      window.location.reload();
    } catch {
      setError('Error de conexión');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm card p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-xl" style={{ color: 'var(--text-muted)' }}>×</button>
        <h2 className="text-lg font-black tracking-widest mb-5 text-red-400">ACCESO ADMIN</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold tracking-widest mb-2 block" style={{ color: 'var(--text-muted)' }}>
              CÓDIGO ADMIN
            </label>
            <input
              className="input-field"
              type="password"
              placeholder="Contraseña"
              value={code}
              onChange={e => { setCode(e.target.value); setError(''); }}
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="btn-blue">
            {loading ? 'Verificando...' : 'ENTRAR'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── EntryView ────────────────────────────────────────────────────────────────

function EntryView({ room, players, code }: { room: RoomInfo; players: Player[]; code: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function selectPlayer(username: string) {
    setName(username);
    setError('');
  }

  async function handlePlay(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !pin.trim()) { setError('Ingresá tu nombre y código personal'); return; }
    setLoading(true);
    setError('');

    // Try to sign in first (existing user)
    const result = await signIn('credentials', {
      username: name.trim(),
      password: pin,
      roomCode: code,
      redirect: false,
    });

    if (!result?.error) {
      router.push(`/room/${code}`);
      return;
    }

    // If sign in failed, try to register as new user
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: code, username: name.trim(), password: pin }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al unirse'); setLoading(false); return; }

      const result2 = await signIn('credentials', {
        username: name.trim(),
        password: pin,
        roomCode: code,
        redirect: false,
      });
      if (result2?.error) { setError('Error al iniciar sesión'); setLoading(false); return; }
      router.push(`/room/${code}`);
    } catch {
      setError('Error de conexión');
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Logo */}
      <div className="flex flex-col items-center mb-5">
        <div className="px-5 py-4 rounded-2xl flex flex-col items-center mb-3" style={{ background: '#0a0e15', border: '1px solid #1a2a38' }}>
          <div className="text-4xl font-black tracking-tight text-white leading-none">
            <span style={{ color: 'var(--teal)' }}>2</span><span>6</span>
          </div>
          <div className="text-xs font-bold tracking-[0.3em] mt-0.5" style={{ color: 'var(--text-muted)' }}>FIFA</div>
        </div>
        <p className="text-base font-black tracking-[0.2em] uppercase" style={{ color: 'var(--teal)' }}>
          {room.name}
        </p>
      </div>

      <div className="card p-5">
        {players.length > 0 && (
          <>
            <p className="text-xs font-bold tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
              JUGADORES EN ESTA SALA
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {players.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectPlayer(p.username)}
                  className={`player-chip ${name === p.username ? 'player-chip-selected' : ''}`}
                >
                  {p.username}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>o ingresá como nuevo</span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>
          </>
        )}

        <form onSubmit={handlePlay} className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-bold tracking-widest mb-2 block" style={{ color: 'var(--text-muted)' }}>
              TU NOMBRE
            </label>
            <input
              className="input-field"
              placeholder="ej: Juan"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              required
            />
          </div>
          <div>
            <label className="text-xs font-bold tracking-widest mb-2 block" style={{ color: 'var(--text-muted)' }}>
              ELEGÍ UN CÓDIGO PERSONAL
            </label>
            <input
              className="input-field"
              type="password"
              placeholder="ej: 1234"
              value={pin}
              onChange={e => { setPin(e.target.value); setError(''); }}
              required minLength={4}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="btn-blue mt-1">
            {loading ? 'Cargando...' : 'JUGAR →'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="btn-dark text-sm"
          >
            ← Cambiar sala
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── AppView ──────────────────────────────────────────────────────────────────

type Tab = 'predecir' | 'tabla' | 'resultados' | 'partidos';

function AppView({ code, session }: { code: string; session: { user: { userId: string; username: string; roomCode: string; isAdmin: boolean } } }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('predecir');
  const [showAdminModal, setShowAdminModal] = useState(false);

  const fetchData = useCallback(async () => {
    const [mRes, lRes, rRes] = await Promise.all([
      fetch('/api/matches'),
      fetch(`/api/leaderboard/${code}`),
      fetch(`/api/rooms/${code}`),
    ]);
    if (mRes.ok) setMatches(await mRes.json());
    if (lRes.ok) { const d = await lRes.json(); setLeaderboard(d.leaderboard); }
    if (rRes.ok) { const d = await rRes.json(); setRoomName(d.room.name); }
    setLoading(false);
  }, [code]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = useCallback(async (matchId: number, h: number, a: number) => {
    const res = await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, homeScore: h, awayScore: a }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
    setMatches(prev => prev.map(m =>
      m.id === matchId ? { ...m, prediction: { home_score: h, away_score: a, points: m.prediction?.points ?? null } } : m
    ));
  }, []);

  const finished = matches.filter(m => m.is_finished === 1).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="text-2xl animate-pulse">⚽</span>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'predecir', label: 'PREDECIR' },
    { id: 'tabla', label: 'TABLA' },
    { id: 'resultados', label: 'RESULTADOS' },
    { id: 'partidos', label: 'PARTIDOS' },
  ];

  return (
    <div className="max-w-lg mx-auto px-3 py-5">
      {/* Header */}
      <div className="flex flex-col items-center mb-4">
        <div className="px-4 py-3 rounded-xl flex flex-col items-center mb-3" style={{ background: '#0a0e15', border: '1px solid #1a2a38' }}>
          <div className="text-3xl font-black tracking-tight text-white leading-none">
            <span style={{ color: 'var(--teal)' }}>2</span><span>6</span>
          </div>
          <div className="text-xs font-bold tracking-[0.3em]" style={{ color: 'var(--text-muted)' }}>FIFA</div>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Sala: <strong className="text-white">{roomName || code}</strong>
          <span className="mx-2">|</span>
          Jugando como: <strong className="text-white">{session.user.username}</strong>
        </p>

        {/* Status pill */}
        <div
          className="mt-3 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider flex items-center gap-2"
          style={{ background: 'rgba(46,196,182,0.15)', border: '1px solid rgba(46,196,182,0.3)', color: 'var(--teal)' }}
        >
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          PREDICCIONES ABIERTAS — GRUPOS
        </div>

        {/* Links */}
        <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <button onClick={() => signOut({ callbackUrl: '/' })} className="hover:text-white transition-colors underline-offset-2 hover:underline">
            Cambiar sala
          </button>
          <button
            onClick={() => session.user.isAdmin ? window.location.href = `/room/${code}/admin` : setShowAdminModal(true)}
            className="hover:text-white transition-colors underline-offset-2 hover:underline"
          >
            Panel Admin
          </button>
          <button onClick={fetchData} className="hover:text-white transition-colors">
            ↺ Sync
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden mb-5" style={{ background: '#0d2030', border: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-bold tracking-wider transition-colors ${tab === t.id ? 'text-white rounded-xl' : ''}`}
            style={tab === t.id ? { background: 'var(--blue)' } : { color: 'var(--text-muted)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'predecir' && <PredecirTab matches={matches} onSave={handleSave} />}
      {tab === 'tabla' && <TablaTab leaderboard={leaderboard} currentUserId={session.user.userId} />}
      {tab === 'resultados' && <ResultadosTab matches={matches} />}
      {tab === 'partidos' && <PartidosTab matches={matches} />}

      {/* Footer info */}
      <div className="mt-8 text-center text-xs" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
        {finished} partidos finalizados · Sala {code}
      </div>

      {/* Admin modal */}
      {showAdminModal && <AdminModal roomCode={code} onClose={() => setShowAdminModal(false)} />}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function RoomPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const code = ((params.code as string) || '').toUpperCase();

  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/rooms/${code}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setRoom(d.room); setPlayers(d.players); })
      .catch(s => { if (s === 404) setNotFound(true); });
  }, [code]);

  const isInRoom = status === 'authenticated' && session?.user?.roomCode === code;

  const bg = 'linear-gradient(160deg, #07131a 0%, #0d2133 50%, #07131a 100%)';

  if (status === 'loading' || (!room && !notFound)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <span className="text-2xl animate-pulse">⚽</span>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: bg }}>
        <p className="text-4xl mb-4">🔍</p>
        <p className="font-bold text-white mb-2">Sala no encontrada</p>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>El código <strong>{code}</strong> no existe</p>
        <Link href="/" className="btn-blue px-6 py-2 text-sm rounded-xl">← Volver al inicio</Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: bg }}>
      {/* Floating balls */}
      {BALLS.map((b, i) => (
        <div key={i} className="absolute pointer-events-none select-none"
          style={{ top: b.top, left: b.left, fontSize: b.size, opacity: b.opacity }}
          aria-hidden>⚽</div>
      ))}
      <div className="relative z-10 pt-4 pb-16">
        {isInRoom
          ? <AppView code={code} session={session as { user: { userId: string; username: string; roomCode: string; isAdmin: boolean } }} />
          : <EntryView room={room!} players={players} code={code} />
        }
      </div>
    </div>
  );
}
