import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getRoomByCode, getUsersInRoom, getUserByUsername, createUser,
  subscribeToMatches, seedMatchesIfEmpty, getPredictionsForUser,
  savePrediction, saveMatchResult, getLeaderboard,
  type Room, type RoomUser, type Match, type Prediction, type LeaderboardEntry,
} from '../lib/db';
import { getSession, setSession, clearSession, hashPin } from '../lib/auth';
import { getFlag } from '../lib/flags';

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', timeZone: 'America/Argentina/Buenos_Aires' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' });
}

function isMatchLocked(matchDate: string): boolean {
  return Date.now() >= new Date(matchDate).getTime();
}

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    group: 'Grupos', r32: 'R32', r16: 'Octavos', qf: 'Cuartos', sf: 'Semis', '3rd': '3er Puesto', final: 'Final',
  };
  return map[stage] ?? stage;
}

function pointsColor(pts: number | null): string {
  if (pts === 3) return '#4ade80';
  if (pts === 1) return '#facc15';
  if (pts === 0) return '#f87171';
  return 'var(--text-muted)';
}

// ── Entry Screen ───────────────────────────────────────────────────────────────

interface EntryScreenProps {
  room: Room;
  onLogin: (userId: string, username: string, isAdmin: boolean) => void;
}

function EntryScreen({ room, onLogin }: EntryScreenProps) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<RoomUser[]>([]);

  useEffect(() => {
    getUsersInRoom(room.code).then(setUsers);
  }, [room.code]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !pin.trim()) return;
    setError(''); setLoading(true);
    try {
      const existing = await getUserByUsername(room.code, username.trim());
      if (existing) {
        const hash = await hashPin(pin);
        if (hash !== existing.pinHash) {
          setError('PIN incorrecto para ese usuario.');
          setLoading(false);
          return;
        }
        setSession({ roomCode: room.code, userId: existing.id, username: existing.username, isAdmin: existing.isAdmin });
        onLogin(existing.id, existing.username, existing.isAdmin);
      } else {
        const userId = await createUser(room.code, username.trim(), pin, false);
        setSession({ roomCode: room.code, userId, username: username.trim(), isAdmin: false });
        onLogin(userId, username.trim(), false);
      }
    } catch (err) {
      setError('Error al unirse. Verificá tu conexión.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem',
      position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(160deg, #07131a 0%, #0d2133 50%, #07131a 100%)',
    }}>
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            background: '#0a0e15', border: '1px solid #1a2a38', borderRadius: '1rem',
            padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '0.5rem',
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, lineHeight: 1, color: 'white', letterSpacing: '-0.05em' }}>
              <span style={{ color: 'var(--teal)' }}>2</span>6
            </div>
          </div>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginTop: '0.5rem' }}>{room.name}</p>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.2em', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {room.code}
          </p>
        </div>

        {users.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '0.5rem', textAlign: 'center' }}>
              JUGADORES EN LA SALA
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
              {users.map(u => (
                <button
                  key={u.id}
                  className={`player-chip${username === u.username ? ' selected' : ''}`}
                  onClick={() => setUsername(u.username)}
                  type="button"
                >
                  {u.username}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="card" style={{ padding: '1.5rem' }}>
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                TU NOMBRE
              </label>
              <input
                className="input-field"
                placeholder="ej: Facu"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                required
                minLength={2}
                autoFocus
              />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                TU PIN PERSONAL
              </label>
              <input
                className="input-field"
                type="password"
                placeholder="mínimo 4 caracteres"
                value={pin}
                onChange={e => { setPin(e.target.value); setError(''); }}
                required
                minLength={4}
              />
            </div>
            {error && <p style={{ color: '#f87171', fontSize: '0.875rem' }}>{error}</p>}
            <button type="submit" disabled={loading} className="btn-blue">
              {loading ? 'Entrando...' : 'JUGAR →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1.5rem', opacity: 0.6 }}>
          Mundial USA · Canadá · México 2026
        </p>
      </div>
    </div>
  );
}

// ── Match Row (predictions) ────────────────────────────────────────────────────

interface PredMatchRowProps {
  match: Match;
  prediction: { home: string; away: string };
  onChange: (matchId: string, side: 'home' | 'away', val: string) => void;
  locked: boolean;
}

function PredMatchRow({ match, prediction, onChange, locked }: PredMatchRowProps) {
  const pts = null; // shown in results tab
  const locked_ = locked || isMatchLocked(match.matchDate);

  return (
    <div className="match-row" style={{ opacity: locked_ ? 0.75 : 1 }}>
      <div style={{ flex: 1, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem', minWidth: 0 }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {match.homeTeam}
        </span>
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>{getFlag(match.homeTeam)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
        <input
          type="number"
          className="score-box"
          min={0} max={99}
          value={prediction.home}
          disabled={locked_}
          onChange={e => onChange(match.id, 'home', e.target.value)}
          style={{ opacity: locked_ ? 0.6 : 1 }}
        />
        <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>–</span>
        <input
          type="number"
          className="score-box"
          min={0} max={99}
          value={prediction.away}
          disabled={locked_}
          onChange={e => onChange(match.id, 'away', e.target.value)}
          style={{ opacity: locked_ ? 0.6 : 1 }}
        />
      </div>
      <div style={{ flex: 1, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>{getFlag(match.awayTeam)}</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {match.awayTeam}
        </span>
      </div>
      {pts !== null && (
        <div style={{ flexShrink: 0, width: 24, textAlign: 'center', fontWeight: 700, color: pointsColor(pts) }}>
          {pts}
        </div>
      )}
    </div>
  );
}

// ── Predictions Tab ───────────────────────────────────────────────────────────

interface PredictTabProps {
  matches: Match[];
  predictions: Record<string, { home: string; away: string }>;
  onChange: (matchId: string, side: 'home' | 'away', val: string) => void;
}

const STAGE_TABS = [
  { key: 'group', label: 'Grupos' },
  { key: 'r32', label: 'R32' },
  { key: 'r16', label: 'Octavos' },
  { key: 'qf', label: 'Cuartos' },
  { key: 'sf', label: 'Semis' },
  { key: '3rd', label: '3er' },
  { key: 'final', label: 'Final' },
];

function PredictTab({ matches, predictions, onChange }: PredictTabProps) {
  const [activeStage, setActiveStage] = useState('group');

  const stagesInMatches = new Set(matches.map(m => m.stage));
  const visibleTabs = STAGE_TABS.filter(t => stagesInMatches.has(t.key));
  const filtered = matches.filter(m => m.stage === activeStage);

  // Group by groupName if stage is group
  const groupedByGroup: Record<string, Match[]> = {};
  if (activeStage === 'group') {
    filtered.forEach(m => {
      const g = m.groupName ?? 'Sin Grupo';
      if (!groupedByGroup[g]) groupedByGroup[g] = [];
      groupedByGroup[g].push(m);
    });
  }

  return (
    <div>
      {/* Stage tabs */}
      <div style={{ display: 'flex', overflowX: 'auto', gap: '0.375rem', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
        {visibleTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveStage(t.key)}
            style={{
              flexShrink: 0, padding: '0.35rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700,
              border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
              background: activeStage === t.key ? 'var(--blue)' : '#1a2f40',
              borderColor: activeStage === t.key ? 'var(--blue)' : 'var(--border)',
              color: activeStage === t.key ? 'white' : 'var(--text-muted)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeStage === 'group' ? (
        Object.entries(groupedByGroup).sort(([a], [b]) => a.localeCompare(b)).map(([g, ms]) => (
          <div key={g} style={{ marginBottom: '1rem' }}>
            <div style={{
              fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.2em',
              color: 'var(--teal)', marginBottom: '0.4rem', paddingLeft: '0.25rem',
            }}>
              GRUPO {g}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {ms.map(m => (
                <PredMatchRow
                  key={m.id}
                  match={m}
                  prediction={predictions[m.id] ?? { home: '', away: '' }}
                  onChange={onChange}
                  locked={false}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {filtered.map(m => (
            <PredMatchRow
              key={m.id}
              match={m}
              prediction={predictions[m.id] ?? { home: '', away: '' }}
              onChange={onChange}
              locked={false}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', marginTop: '2rem' }}>
          No hay partidos disponibles para esta fase.
        </p>
      )}
    </div>
  );
}

// ── Leaderboard Tab ───────────────────────────────────────────────────────────

function LeaderboardTab({ roomCode }: { roomCode: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getLeaderboard(roomCode).then(e => { setEntries(e); setLoading(false); });
  }, [roomCode]);

  if (loading) return <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>Cargando...</p>;

  if (entries.length === 0) return (
    <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>
      Aún no hay puntos registrados.
    </p>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {entries.map((e, i) => (
        <div key={e.userId} style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.75rem', borderRadius: '0.75rem',
          background: i === 0 ? 'rgba(240,192,64,0.1)' : '#0f2030',
          border: `1px solid ${i === 0 ? 'rgba(240,192,64,0.3)' : 'var(--border)'}`,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: i === 0 ? 'var(--gold)' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : '#1a2f40',
            fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
            color: i < 3 ? '#000' : 'var(--text-muted)',
          }}>
            {i + 1}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {e.username}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {e.exactCount} exactos · {e.resultCount} resultados · {e.predictionsCount} predicciones
            </p>
          </div>
          <div style={{ flexShrink: 0, textAlign: 'right' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: i === 0 ? 'var(--gold)' : 'white' }}>
              {e.totalPoints}
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 2 }}>pts</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Results Tab ───────────────────────────────────────────────────────────────

interface ResultsTabProps {
  matches: Match[];
  predictions: Record<string, Prediction>;
}

function ResultsTab({ matches, predictions }: ResultsTabProps) {
  const finished = matches.filter(m => m.isFinished);

  if (finished.length === 0) return (
    <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>
      Aún no hay partidos finalizados.
    </p>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {finished.map(m => {
        const pred = predictions[m.id];
        const pts = pred?.points ?? null;
        return (
          <div key={m.id} style={{
            padding: '0.75rem', borderRadius: '0.75rem',
            background: '#0f2030', border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                {stageLabel(m.stage)} · {formatDate(m.matchDate)}
              </span>
              {pts !== null && (
                <span style={{
                  padding: '0.15rem 0.6rem', borderRadius: '1rem', fontSize: '0.75rem', fontWeight: 700,
                  background: pts === 3 ? 'rgba(74,222,128,0.15)' : pts === 1 ? 'rgba(250,204,21,0.15)' : 'rgba(248,113,113,0.15)',
                  color: pointsColor(pts),
                }}>
                  {pts === 3 ? '+3 exacto' : pts === 1 ? '+1 resultado' : '0 pts'}
                </span>
              )}
              {!pred && (
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sin predicción</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ flex: 1, textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>
                {getFlag(m.homeTeam)} {m.homeTeam}
              </span>
              <div style={{ flexShrink: 0, display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                <span style={{
                  background: '#1a3060', padding: '0.2rem 0.6rem', borderRadius: '0.4rem',
                  fontWeight: 700, fontSize: '1.1rem', color: 'white',
                }}>{m.homeScore}</span>
                <span style={{ color: 'var(--text-muted)' }}>–</span>
                <span style={{
                  background: '#1a3060', padding: '0.2rem 0.6rem', borderRadius: '0.4rem',
                  fontWeight: 700, fontSize: '1.1rem', color: 'white',
                }}>{m.awayScore}</span>
              </div>
              <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>
                {m.awayTeam} {getFlag(m.awayTeam)}
              </span>
            </div>
            {pred && (
              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                Tu predicción: {pred.homeScore} – {pred.awayScore}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Schedule Tab (with admin panel) ───────────────────────────────────────────

interface ScheduleTabProps {
  matches: Match[];
  isAdmin: boolean;
  roomCode: string;
  onAdminPanelRequest: () => void;
}

function ScheduleTab({ matches, isAdmin, roomCode, onAdminPanelRequest }: ScheduleTabProps) {
  const [adminInputs, setAdminInputs] = useState<Record<string, { home: string; away: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // Group matches by date
  const byDate: Record<string, Match[]> = {};
  matches.forEach(m => {
    const d = formatDate(m.matchDate);
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(m);
  });
  const dates = Object.keys(byDate);
  const [dateIdx, setDateIdx] = useState(0);
  const currentDate = dates[dateIdx];
  const dayMatches = currentDate ? byDate[currentDate] : [];

  async function handleSaveResult(match: Match) {
    const inp = adminInputs[match.id];
    if (!inp || inp.home === '' || inp.away === '') return;
    const h = parseInt(inp.home);
    const a = parseInt(inp.away);
    if (isNaN(h) || isNaN(a)) return;
    setSaving(match.id);
    try {
      await saveMatchResult(roomCode, match.id, h, a);
      setSavedIds(prev => new Set([...prev, match.id]));
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      {/* Date navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <button
          onClick={() => setDateIdx(i => Math.max(0, i - 1))}
          disabled={dateIdx === 0}
          style={{
            background: '#1a2f40', border: '1px solid var(--border)', borderRadius: '0.5rem',
            padding: '0.4rem 0.75rem', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem',
            opacity: dateIdx === 0 ? 0.4 : 1,
          }}
        >←</button>
        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'white' }}>{currentDate}</span>
        <button
          onClick={() => setDateIdx(i => Math.min(dates.length - 1, i + 1))}
          disabled={dateIdx === dates.length - 1}
          style={{
            background: '#1a2f40', border: '1px solid var(--border)', borderRadius: '0.5rem',
            padding: '0.4rem 0.75rem', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem',
            opacity: dateIdx === dates.length - 1 ? 0.4 : 1,
          }}
        >→</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {dayMatches.map(m => {
          const inp = adminInputs[m.id] ?? { home: m.homeScore?.toString() ?? '', away: m.awayScore?.toString() ?? '' };
          const isSaved = savedIds.has(m.id);
          return (
            <div key={m.id} style={{
              padding: '0.75rem', borderRadius: '0.75rem',
              background: m.isFinished ? 'rgba(74,222,128,0.05)' : '#0f2030',
              border: `1px solid ${m.isFinished ? 'rgba(74,222,128,0.2)' : 'var(--border)'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
                  {stageLabel(m.stage)}{m.groupName ? ` · Grupo ${m.groupName}` : ''} · {formatTime(m.matchDate)}
                </span>
                {m.isFinished && (
                  <span style={{ fontSize: '0.65rem', color: '#4ade80', letterSpacing: '0.1em' }}>FINALIZADO</span>
                )}
                {!m.isFinished && isMatchLocked(m.matchDate) && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--gold)', letterSpacing: '0.1em' }}>EN JUEGO</span>
                )}
              </div>

              {/* Teams and score */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ flex: 1, textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.homeTeam}</span>
                  <span>{getFlag(m.homeTeam)}</span>
                </div>
                {m.isFinished ? (
                  <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ background: '#1a3060', padding: '0.2rem 0.6rem', borderRadius: '0.4rem', fontWeight: 700, fontSize: '1.1rem', color: 'white' }}>{m.homeScore}</span>
                    <span style={{ color: 'var(--text-muted)' }}>–</span>
                    <span style={{ background: '#1a3060', padding: '0.2rem 0.6rem', borderRadius: '0.4rem', fontWeight: 700, fontSize: '1.1rem', color: 'white' }}>{m.awayScore}</span>
                  </div>
                ) : (
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>VS</span>
                  </div>
                )}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span>{getFlag(m.awayTeam)}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.awayTeam}</span>
                </div>
              </div>

              {/* Admin result input */}
              {isAdmin && !m.isFinished && isMatchLocked(m.matchDate) && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.65rem', letterSpacing: '0.15em', color: 'var(--teal)', fontWeight: 700, marginBottom: '0.5rem' }}>CARGAR RESULTADO</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="number" className="score-box" min={0} max={99}
                      value={inp.home}
                      onChange={e => setAdminInputs(prev => ({ ...prev, [m.id]: { ...inp, home: e.target.value } }))}
                      placeholder="0"
                    />
                    <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>–</span>
                    <input
                      type="number" className="score-box" min={0} max={99}
                      value={inp.away}
                      onChange={e => setAdminInputs(prev => ({ ...prev, [m.id]: { ...inp, away: e.target.value } }))}
                      placeholder="0"
                    />
                    <button
                      onClick={() => handleSaveResult(m)}
                      disabled={saving === m.id || isSaved}
                      style={{
                        marginLeft: '0.25rem', background: isSaved ? '#1a4020' : 'var(--teal)', color: isSaved ? '#4ade80' : '#000',
                        border: 'none', borderRadius: '0.5rem', padding: '0.4rem 0.75rem',
                        fontSize: '0.75rem', fontWeight: 700, cursor: saving === m.id ? 'wait' : 'pointer',
                        opacity: saving === m.id ? 0.7 : 1,
                      }}
                    >
                      {saving === m.id ? '...' : isSaved ? '✓' : 'Guardar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Admin panel link for non-admins */}
      {!isAdmin && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button onClick={onAdminPanelRequest} style={{
            background: 'transparent', border: '1px solid var(--border)', borderRadius: '0.625rem',
            padding: '0.5rem 1rem', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem',
          }}>
            Panel Admin
          </button>
        </div>
      )}
    </div>
  );
}

// ── Admin Modal ───────────────────────────────────────────────────────────────

interface AdminModalProps {
  roomCode: string;
  onSuccess: (userId: string, username: string) => void;
  onClose: () => void;
}

function AdminModal({ roomCode, onSuccess, onClose }: AdminModalProps) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await getUserByUsername(roomCode, username.trim());
      if (!user || !user.isAdmin) { setError('No se encontró un admin con ese nombre.'); setLoading(false); return; }
      const hash = await hashPin(pin);
      if (hash !== user.pinHash) { setError('PIN incorrecto.'); setLoading(false); return; }
      onSuccess(user.id, user.username);
    } catch (err) {
      setError('Error al verificar. Intentá de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', padding: '1rem',
    }} onClick={onClose}>
      <div className="card" style={{ padding: '1.5rem', width: '100%', maxWidth: 320 }} onClick={e => e.stopPropagation()}>
        <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.2em', color: 'var(--teal)', marginBottom: '1rem' }}>
          ACCESO ADMIN
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            className="input-field"
            placeholder="Nombre del admin"
            value={username}
            onChange={e => { setUsername(e.target.value); setError(''); }}
            autoFocus
          />
          <input
            className="input-field"
            type="password"
            placeholder="PIN"
            value={pin}
            onChange={e => { setPin(e.target.value); setError(''); }}
          />
          {error && <p style={{ color: '#f87171', fontSize: '0.8rem' }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn-blue">
            {loading ? 'Verificando...' : 'ENTRAR →'}
          </button>
          <button type="button" onClick={onClose} className="btn-dark">Cancelar</button>
        </form>
      </div>
    </div>
  );
}

// ── Main App Screen ───────────────────────────────────────────────────────────

type Tab = 'predict' | 'leaderboard' | 'results' | 'schedule';

interface AppScreenProps {
  room: Room;
  session: { userId: string; username: string; isAdmin: boolean };
  onLogout: () => void;
}

function AppScreen({ room, session, onLogout }: AppScreenProps) {
  const [tab, setTab] = useState<Tab>('predict');
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, { home: string; away: string }>>({});
  const [predMap, setPredMap] = useState<Record<string, Prediction>>({});
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(session.isAdmin);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Load matches (real-time)
  useEffect(() => {
    const unsub = subscribeToMatches(ms => setMatches(ms));
    return unsub;
  }, []);

  // Load user predictions
  useEffect(() => {
    getPredictionsForUser(room.code, session.userId).then(preds => {
      const map: Record<string, { home: string; away: string }> = {};
      const pMap: Record<string, Prediction> = {};
      preds.forEach(p => {
        map[p.matchId] = { home: p.homeScore.toString(), away: p.awayScore.toString() };
        pMap[p.matchId] = p;
      });
      setPredictions(map);
      setPredMap(pMap);
    });
  }, [room.code, session.userId]);

  const handlePredChange = useCallback((matchId: string, side: 'home' | 'away', val: string) => {
    setPredictions(prev => {
      const cur = prev[matchId] ?? { home: '', away: '' };
      return { ...prev, [matchId]: { ...cur, [side]: val } };
    });

    // Debounce save
    if (debounceRef.current[matchId]) clearTimeout(debounceRef.current[matchId]);
    debounceRef.current[matchId] = setTimeout(() => {
      setPredictions(prev => {
        const cur = prev[matchId] ?? { home: '', away: '' };
        const h = parseInt(cur.home);
        const a = parseInt(cur.away);
        if (!isNaN(h) && !isNaN(a)) {
          savePrediction(room.code, session.userId, matchId, h, a).catch(console.error);
        }
        return prev;
      });
    }, 800);
  }, [room.code, session.userId]);

  function handleAdminModalSuccess(userId: string, username: string) {
    setSession({ roomCode: room.code, userId, username, isAdmin: true });
    setIsAdmin(true);
    setShowAdminModal(false);
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'predict', label: 'PREDECIR' },
    { key: 'leaderboard', label: 'TABLA' },
    { key: 'results', label: 'RESULTADOS' },
    { key: 'schedule', label: 'PARTIDOS' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(180deg, #0a1e2e 0%, #0d2133 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '0.75rem 1rem',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div>
              <p style={{ fontWeight: 900, fontSize: '1rem', color: 'white', lineHeight: 1 }}>{room.name}</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: '0.15em' }}>
                {room.code}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Status pill */}
              <div style={{
                background: 'rgba(46,196,182,0.12)', border: '1px solid rgba(46,196,182,0.3)',
                borderRadius: '2rem', padding: '0.2rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)' }} />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--teal)' }}>
                  {session.username}{isAdmin ? ' · Admin' : ''}
                </span>
              </div>
              <button
                onClick={onLogout}
                style={{
                  background: 'transparent', border: '1px solid var(--border)', borderRadius: '0.5rem',
                  padding: '0.3rem 0.5rem', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem',
                }}
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{
        background: '#0a1e2e', borderBottom: '1px solid var(--border)',
        position: 'sticky', top: '60px', zIndex: 9,
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1, padding: '0.625rem 0.25rem',
                fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em',
                background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: `2px solid ${tab === t.key ? 'var(--teal)' : 'transparent'}`,
                color: tab === t.key ? 'var(--teal)' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          {tab === 'predict' && (
            <PredictTab
              matches={matches}
              predictions={predictions}
              onChange={handlePredChange}
            />
          )}
          {tab === 'leaderboard' && (
            <LeaderboardTab roomCode={room.code} />
          )}
          {tab === 'results' && (
            <ResultsTab matches={matches} predictions={predMap} />
          )}
          {tab === 'schedule' && (
            <ScheduleTab
              matches={matches}
              isAdmin={isAdmin}
              roomCode={room.code}
              onAdminPanelRequest={() => setShowAdminModal(true)}
            />
          )}
        </div>
      </div>

      {showAdminModal && (
        <AdminModal
          roomCode={room.code}
          onSuccess={handleAdminModalSuccess}
          onClose={() => setShowAdminModal(false)}
        />
      )}
    </div>
  );
}

// ── RoomPage (router entry) ────────────────────────────────────────────────────

export default function RoomPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sessionState, setSessionState] = useState<{ userId: string; username: string; isAdmin: boolean } | null>(null);

  useEffect(() => {
    if (!code) { navigate('/'); return; }
    const upperCode = code.toUpperCase();

    getRoomByCode(upperCode).then(async r => {
      if (!r) { setNotFound(true); setLoading(false); return; }
      setRoom(r);

      // Seed matches if this is the first room ever
      await seedMatchesIfEmpty();

      // Check session
      const s = getSession();
      if (s && s.roomCode === upperCode) {
        setSessionState({ userId: s.userId, username: s.username, isAdmin: s.isAdmin });
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [code, navigate]);

  function handleLogin(userId: string, username: string, isAdmin: boolean) {
    setSessionState({ userId, username, isAdmin });
  }

  function handleLogout() {
    clearSession();
    setSessionState(null);
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚽</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Cargando...</p>
      </div>
    </div>
  );

  if (notFound) return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '2rem',
    }}>
      <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</p>
      <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'white', marginBottom: '0.5rem' }}>Sala no encontrada</p>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        El código "{code?.toUpperCase()}" no existe.
      </p>
      <button onClick={() => navigate('/')} className="btn-blue" style={{ width: 'auto', padding: '0.75rem 2rem' }}>
        Volver al inicio
      </button>
    </div>
  );

  if (!room) return null;

  if (!sessionState) return <EntryScreen room={room} onLogin={handleLogin} />;

  return <AppScreen room={room} session={sessionState} onLogout={handleLogout} />;
}
