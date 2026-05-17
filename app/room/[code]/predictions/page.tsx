'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';

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
  prediction: {
    home_score: number;
    away_score: number;
    points: number | null;
  } | null;
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
  const months = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const day = date.getUTCDate();
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const mins = String(date.getUTCMinutes()).padStart(2, '0');
  return `${day} de ${month}, ${year} · ${hours}:${mins} UTC`;
}

function hasStarted(matchDate: string): boolean {
  return new Date() >= new Date(matchDate);
}

function getPointsColor(points: number | null): string {
  if (points === null) return 'text-slate-400';
  if (points === 3) return 'text-green-400';
  if (points === 1) return 'text-amber-400';
  return 'text-red-400';
}

function getPointsLabel(points: number | null): string {
  if (points === null) return '';
  if (points === 3) return '¡Exacto! +3';
  if (points === 1) return 'Resultado correcto +1';
  return 'Sin puntos +0';
}

interface MatchCardProps {
  match: Match;
  onSave: (matchId: number, homeScore: number, awayScore: number) => Promise<void>;
}

function MatchCard({ match, onSave }: MatchCardProps) {
  const [homeInput, setHomeInput] = useState(
    match.prediction?.home_score != null ? String(match.prediction.home_score) : ''
  );
  const [awayInput, setAwayInput] = useState(
    match.prediction?.away_score != null ? String(match.prediction.away_score) : ''
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const started = hasStarted(match.match_date);
  const finished = match.is_finished === 1;

  // Sync prediction updates from parent
  useEffect(() => {
    if (match.prediction?.home_score != null) {
      setHomeInput(String(match.prediction.home_score));
    }
    if (match.prediction?.away_score != null) {
      setAwayInput(String(match.prediction.away_score));
    }
  }, [match.prediction]);

  const triggerSave = useCallback(
    async (home: string, away: string) => {
      const h = parseInt(home, 10);
      const a = parseInt(away, 10);
      if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;
      setSaving(true);
      setSaveError('');
      try {
        await onSave(match.id, h, a);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err: unknown) {
        setSaveError(err instanceof Error ? err.message : 'Error al guardar');
      } finally {
        setSaving(false);
      }
    },
    [match.id, onSave]
  );

  const handleChange = (home: string, away: string) => {
    setSaved(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      triggerSave(home, away);
    }, 800);
  };

  const handleHomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
    setHomeInput(val);
    handleChange(val, awayInput);
  };

  const handleAwayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
    setAwayInput(val);
    handleChange(homeInput, val);
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        finished
          ? match.prediction?.points === 3
            ? 'bg-green-900/20 border-green-700/40'
            : match.prediction?.points === 1
            ? 'bg-amber-900/20 border-amber-700/40'
            : match.prediction?.points === 0
            ? 'bg-red-900/10 border-red-700/30'
            : 'bg-slate-800 border-slate-700'
          : started
          ? 'bg-slate-800/50 border-slate-700 opacity-80'
          : 'bg-slate-800 border-slate-700'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-slate-500">{formatDate(match.match_date)}</span>
        {finished && (
          <span className="text-xs bg-slate-600 text-slate-300 px-2 py-0.5 rounded-full">
            Finalizado
          </span>
        )}
        {started && !finished && (
          <span className="text-xs bg-blue-600/30 text-blue-400 px-2 py-0.5 rounded-full">
            En curso
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Home team */}
        <div className="flex-1 text-right">
          <p className="font-semibold text-slate-100 text-sm sm:text-base">{match.home_team}</p>
        </div>

        {/* Scores */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Prediction input or locked view */}
          {started ? (
            <div className="flex items-center gap-1.5">
              <div className="w-10 h-10 flex items-center justify-center bg-slate-700 rounded-lg text-slate-300 font-bold text-lg border border-slate-600">
                {homeInput || <span className="text-slate-500 text-xs">-</span>}
              </div>
              <span className="text-slate-500 text-sm">:</span>
              <div className="w-10 h-10 flex items-center justify-center bg-slate-700 rounded-lg text-slate-300 font-bold text-lg border border-slate-600">
                {awayInput || <span className="text-slate-500 text-xs">-</span>}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                max="99"
                className="score-input"
                value={homeInput}
                onChange={handleHomeChange}
                placeholder="-"
              />
              <span className="text-slate-500 font-bold text-lg">:</span>
              <input
                type="number"
                min="0"
                max="99"
                className="score-input"
                value={awayInput}
                onChange={handleAwayChange}
                placeholder="-"
              />
            </div>
          )}

          {/* Actual result */}
          {finished && match.home_score != null && match.away_score != null && (
            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-600">
              <span className="text-xs text-slate-500">Real:</span>
              <span className="font-bold text-slate-200 text-sm">
                {match.home_score}–{match.away_score}
              </span>
            </div>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1">
          <p className="font-semibold text-slate-100 text-sm sm:text-base">{match.away_team}</p>
        </div>
      </div>

      {/* Status / points */}
      <div className="mt-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {saving && <span className="text-slate-400">Guardando...</span>}
          {saved && !saving && <span className="text-green-400">Guardado ✓</span>}
          {saveError && <span className="text-red-400">{saveError}</span>}
          {!started && !saving && !saved && !saveError && homeInput !== '' && awayInput !== '' && (
            <span className="text-slate-500">Guardado automáticamente</span>
          )}
          {!started && homeInput === '' && awayInput === '' && (
            <span className="text-slate-600 italic">Sin pronóstico</span>
          )}
          {started && !finished && homeInput === '' && (
            <span className="text-slate-600 italic">No pronosticaste</span>
          )}
        </div>
        {finished && match.prediction != null && (
          <span className={`font-semibold ${getPointsColor(match.prediction.points)}`}>
            {getPointsLabel(match.prediction.points)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function PredictionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();

  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeStage, setActiveStage] = useState<string>('group');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/');
    }
  }, [status, router]);

  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch('/api/matches');
      if (!res.ok) throw new Error('Error al cargar partidos');
      const data = await res.json();
      setMatches(data);
    } catch {
      setError('Error al cargar partidos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchMatches();
    }
  }, [status, fetchMatches]);

  const handleSave = useCallback(
    async (matchId: number, homeScore: number, awayScore: number) => {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, homeScore, awayScore }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar');
      }
      // Optimistically update local state
      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId
            ? {
                ...m,
                prediction: {
                  home_score: homeScore,
                  away_score: awayScore,
                  points: m.prediction?.points ?? null,
                },
              }
            : m
        )
      );
    },
    []
  );

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-amber-400 text-xl animate-pulse">Cargando partidos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-8 text-center max-w-md w-full">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <Link href={`/room/${code}`} className="btn-secondary inline-block">Volver</Link>
        </div>
      </div>
    );
  }

  const stages = ['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final'];
  const filteredMatches = matches.filter((m) => m.stage === activeStage);

  // For group stage: group by group_name
  const groupedMatches: Record<string, Match[]> = {};
  if (activeStage === 'group') {
    for (const match of filteredMatches) {
      const g = match.group_name || 'Sin grupo';
      if (!groupedMatches[g]) groupedMatches[g] = [];
      groupedMatches[g].push(match);
    }
  }

  // Stats for current stage
  const withPrediction = filteredMatches.filter((m) => m.prediction !== null).length;
  const finished = filteredMatches.filter((m) => m.is_finished === 1).length;
  const totalPts = filteredMatches.reduce(
    (sum, m) => sum + (m.prediction?.points ?? 0),
    0
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href={`/room/${code}`}
            className="text-slate-400 hover:text-slate-200 text-sm mb-2 flex items-center gap-1 transition-colors"
          >
            ← Volver a la sala
          </Link>
          <h1 className="text-2xl font-bold text-amber-400">Mis Pronósticos</h1>
          <p className="text-slate-400 text-sm mt-1">
            Hola, <span className="text-slate-200">{session?.user?.username}</span>
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-slate-500">Sala</p>
          <p className="font-mono text-xl font-bold text-amber-400">{code}</p>
        </div>
      </div>

      {/* Stage tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {stages.map((stage) => {
          const stageMatches = matches.filter((m) => m.stage === stage);
          if (stageMatches.length === 0) return null;
          const hasAny = stageMatches.some((m) => m.prediction !== null);
          return (
            <button
              key={stage}
              onClick={() => setActiveStage(stage)}
              className={`shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeStage === stage
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700'
              }`}
            >
              {STAGE_LABELS[stage] || stage}
              {hasAny && activeStage !== stage && (
                <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-green-400 inline-block align-middle" />
              )}
            </button>
          );
        })}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-3 text-center">
          <p className="text-lg font-bold text-slate-100">{withPrediction}/{filteredMatches.length}</p>
          <p className="text-xs text-slate-400">Pronósticos</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-lg font-bold text-slate-100">{finished}</p>
          <p className="text-xs text-slate-400">Finalizados</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-lg font-bold text-green-400">{totalPts}</p>
          <p className="text-xs text-slate-400">Puntos (esta fase)</p>
        </div>
      </div>

      {/* Matches */}
      {activeStage === 'group' ? (
        <div className="space-y-6">
          {Object.entries(groupedMatches)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([groupName, groupMatches]) => (
              <div key={groupName}>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-bold text-amber-400 text-base">
                    Grupo {groupName}
                  </h3>
                  <div className="flex-1 h-px bg-slate-700" />
                  <span className="text-xs text-slate-500">
                    {groupMatches.filter((m) => m.prediction !== null).length}/{groupMatches.length} pronósticos
                  </span>
                </div>
                <div className="space-y-2">
                  {groupMatches.map((match) => (
                    <MatchCard key={match.id} match={match} onSave={handleSave} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMatches.length === 0 ? (
            <div className="card p-8 text-center text-slate-400">
              <p className="text-3xl mb-3">🕐</p>
              <p>Los partidos de esta fase aún no están definidos</p>
            </div>
          ) : (
            filteredMatches.map((match) => (
              <MatchCard key={match.id} match={match} onSave={handleSave} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
