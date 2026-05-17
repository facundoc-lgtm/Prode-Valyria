'use client';
import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

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
  group: 'Fase de Grupos',
  r32: 'Ronda de 32',
  r16: 'Octavos de Final',
  qf: 'Cuartos de Final',
  sf: 'Semifinales',
  '3rd': 'Tercer Puesto',
  final: 'Final',
};

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

type Tab = 'results' | 'teams';

function ResultsRow({ match, onSave }: {
  match: Match;
  onSave: (matchId: number, home: number, away: number) => Promise<void>;
}) {
  const [home, setHome] = useState(match.home_score != null ? String(match.home_score) : '');
  const [away, setAway] = useState(match.away_score != null ? String(match.away_score) : '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    const h = parseInt(home, 10);
    const a = parseInt(away, 10);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setError('Ingresá valores válidos (0 o más)');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(match.id, h, a);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`rounded-xl border p-4 ${match.is_finished ? 'border-green-700/40 bg-green-900/10' : 'border-slate-700 bg-slate-800'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-slate-500">{formatDate(match.match_date)}</span>
        {match.group_name && (
          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
            Grupo {match.group_name}
          </span>
        )}
        {match.is_finished ? (
          <span className="text-xs bg-green-600/30 text-green-400 px-2 py-0.5 rounded-full">✓ Cargado</span>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 text-right">
          <p className="font-semibold text-slate-100 text-sm">{match.home_team}</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="number" min="0" max="99"
            className="score-input"
            value={home}
            onChange={e => setHome(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
            placeholder="0"
          />
          <span className="text-slate-500 font-bold">-</span>
          <input
            type="number" min="0" max="99"
            className="score-input"
            value={away}
            onChange={e => setAway(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
            placeholder="0"
          />
        </div>

        <div className="flex-1">
          <p className="font-semibold text-slate-100 text-sm">{match.away_team}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          {error && <span className="text-red-400 text-xs">{error}</span>}
          {saved && <span className="text-green-400 text-xs">✓ Resultado guardado y puntos calculados</span>}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary text-sm px-4 py-1.5 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : match.is_finished ? 'Actualizar resultado' : 'Confirmar resultado'}
        </button>
      </div>
    </div>
  );
}

function TeamsRow({ match, onSave }: {
  match: Match;
  onSave: (matchId: number, home: string, away: string) => Promise<void>;
}) {
  const [home, setHome] = useState(match.home_team);
  const [away, setAway] = useState(match.away_team);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!home.trim() || !away.trim()) { setError('Ingresá ambos equipos'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(match.id, home.trim(), away.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  const isDirty = home !== match.home_team || away !== match.away_team;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-slate-500">{formatDate(match.match_date)}</span>
        <span className="text-xs font-medium text-slate-400">
          {STAGE_LABELS[match.stage] ?? match.stage}
          {match.group_name ? ` · Grupo ${match.group_name}` : ''}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input
          className="input flex-1 text-sm"
          value={home}
          onChange={e => { setHome(e.target.value); setSaved(false); }}
          placeholder="Equipo local"
        />
        <span className="text-slate-500 font-bold shrink-0">vs</span>
        <input
          className="input flex-1 text-sm"
          value={away}
          onChange={e => { setAway(e.target.value); setSaved(false); }}
          placeholder="Equipo visitante"
        />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div>
          {error && <span className="text-red-400 text-xs">{error}</span>}
          {saved && <span className="text-green-400 text-xs">✓ Actualizado</span>}
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="btn-secondary text-sm px-4 py-1.5 disabled:opacity-40"
        >
          {saving ? 'Guardando...' : 'Actualizar'}
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('results');
  const [activeStage, setActiveStage] = useState('group');

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/'); return; }
    if (status === 'authenticated' && !session.user.isAdmin) {
      router.replace(`/room/${code}`);
    }
  }, [status, session, router, code]);

  const fetchMatches = useCallback(async () => {
    const res = await fetch('/api/matches');
    if (res.ok) setMatches(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.isAdmin) {
      fetchMatches();
    }
  }, [status, session, fetchMatches]);

  async function handleSaveResult(matchId: number, home: number, away: number) {
    const res = await fetch('/api/admin/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, homeScore: home, awayScore: away }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Error');
    }
    setMatches(prev => prev.map(m =>
      m.id === matchId ? { ...m, home_score: home, away_score: away, is_finished: 1 } : m
    ));
  }

  async function handleSaveTeams(matchId: number, home: string, away: string) {
    const res = await fetch('/api/admin/teams', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, homeTeam: home, awayTeam: away }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || 'Error');
    }
    setMatches(prev => prev.map(m =>
      m.id === matchId ? { ...m, home_team: home, away_team: away } : m
    ));
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-amber-400 text-xl animate-pulse">Cargando...</div>
      </div>
    );
  }

  const stages = ['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final'];
  const stageMatches = matches.filter(m => m.stage === activeStage);
  const finished = matches.filter(m => m.is_finished === 1).length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1">
          <Link href={`/room/${code}`} className="text-slate-400 hover:text-slate-200 text-sm flex items-center gap-1 mb-2">
            ← Volver a la sala
          </Link>
          <h1 className="text-2xl font-bold text-amber-400">Panel de Administración</h1>
          <p className="text-slate-400 text-sm mt-1">
            {finished} de {matches.length} partidos con resultado cargado
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-700 pb-0">
        <button
          onClick={() => setActiveTab('results')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'results'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          ⚽ Cargar Resultados
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'teams'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          ✏️ Configurar Equipos
        </button>
      </div>

      {/* Stage filter */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-6">
        {stages.map(stage => {
          const count = matches.filter(m => m.stage === stage).length;
          if (count === 0) return null;
          const doneCount = matches.filter(m => m.stage === stage && m.is_finished).length;
          return (
            <button
              key={stage}
              onClick={() => setActiveStage(stage)}
              className={`shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeStage === stage
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {STAGE_LABELS[stage] ?? stage}
              <span className="ml-1.5 text-xs opacity-70">
                {activeTab === 'results' ? `${doneCount}/${count}` : count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'results' ? (
        <div className="space-y-3">
          {stageMatches.length === 0 ? (
            <div className="card p-8 text-center text-slate-500">
              <p>No hay partidos en esta etapa</p>
            </div>
          ) : (
            stageMatches.map(match => (
              <ResultsRow key={match.id} match={match} onSave={handleSaveResult} />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-400 mb-4">
            Actualizá los nombres de los equipos cuando se definan en la fase eliminatoria.
          </p>
          {stageMatches.length === 0 ? (
            <div className="card p-8 text-center text-slate-500">
              <p>No hay partidos en esta etapa</p>
            </div>
          ) : (
            stageMatches.map(match => (
              <TeamsRow key={match.id} match={match} onSave={handleSaveTeams} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
