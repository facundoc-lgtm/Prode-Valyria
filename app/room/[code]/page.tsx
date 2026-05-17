'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface LeaderboardEntry {
  user_id: number;
  username: string;
  total_points: number;
  predictions_count: number;
  finished_count: number;
}

interface Room {
  id: number;
  code: string;
  name: string;
  created_at: string;
}

export default function RoomPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();

  const [room, setRoom] = useState<Room | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/');
    }
  }, [status, router]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`/api/leaderboard/${code}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Error al cargar la sala');
        return;
      }
      const data = await res.json();
      setRoom(data.room);
      setLeaderboard(data.leaderboard);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    if (status === 'authenticated' && code) {
      fetchLeaderboard();
    }
  }, [status, code, fetchLeaderboard]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-amber-400 text-xl animate-pulse">Cargando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-8 text-center max-w-md w-full">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <Link href="/" className="btn-secondary inline-block">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  const currentUser = session?.user;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Room header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-amber-400 mb-1">{room?.name}</h1>
            <p className="text-slate-400 text-sm">Sala del Mundial 2026</p>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-1">Código de sala</p>
                <span className="font-mono text-3xl font-bold text-amber-400 tracking-widest bg-slate-900 px-4 py-2 rounded-lg border border-amber-500/30">
                  {code}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                title="Copiar código"
                className="flex flex-col items-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white p-2 rounded-lg transition-colors"
              >
                <span className="text-lg">{copied ? '✓' : '📋'}</span>
                <span className="text-xs">{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-500">Compartí este código con tus amigos</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Link
          href={`/room/${code}/predictions`}
          className="card p-5 flex items-center gap-4 hover:bg-slate-700 transition-colors cursor-pointer group"
        >
          <span className="text-3xl">⚽</span>
          <div>
            <h3 className="font-semibold text-slate-100 group-hover:text-amber-400 transition-colors">
              Mis Pronósticos
            </h3>
            <p className="text-slate-400 text-sm">Predecí los resultados</p>
          </div>
          <span className="ml-auto text-slate-500 group-hover:text-amber-400 transition-colors">→</span>
        </Link>

        {currentUser?.isAdmin && (
          <Link
            href={`/room/${code}/admin`}
            className="card p-5 flex items-center gap-4 hover:bg-slate-700 transition-colors cursor-pointer group"
          >
            <span className="text-3xl">🏆</span>
            <div>
              <h3 className="font-semibold text-slate-100 group-hover:text-amber-400 transition-colors">
                Panel de Admin
              </h3>
              <p className="text-slate-400 text-sm">Cargar resultados</p>
            </div>
            <span className="ml-auto text-slate-500 group-hover:text-amber-400 transition-colors">→</span>
          </Link>
        )}
      </div>

      {/* Leaderboard */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>🏅</span> Tabla de Posiciones
          </h2>
          <span className="text-sm text-slate-400">{leaderboard.length} jugadores</span>
        </div>

        {leaderboard.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-400">
            <p className="text-2xl mb-2">👥</p>
            <p>Aún no hay jugadores en esta sala</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 text-left text-xs text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3 w-12">#</th>
                  <th className="px-4 py-3">Jugador</th>
                  <th className="px-4 py-3 text-right">Puntos</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">Pronósticos</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">Finalizados</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => {
                  const isCurrentUser = currentUser?.userId === String(entry.user_id);
                  const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;

                  return (
                    <tr
                      key={entry.user_id}
                      className={`border-b border-slate-700/50 transition-colors ${
                        isCurrentUser
                          ? 'bg-amber-500/10 border-amber-500/20'
                          : 'hover:bg-slate-700/30'
                      }`}
                    >
                      <td className="px-6 py-4 w-12">
                        {medal ? (
                          <span className="text-xl">{medal}</span>
                        ) : (
                          <span className="text-slate-400 font-mono text-sm">{index + 1}</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${
                              isCurrentUser ? 'text-amber-400' : 'text-slate-100'
                            }`}
                          >
                            {entry.username}
                          </span>
                          {isCurrentUser && (
                            <span className="text-xs text-slate-500">(vos)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span
                          className={`text-xl font-bold ${
                            index === 0 && entry.total_points > 0
                              ? 'text-amber-400'
                              : 'text-slate-100'
                          }`}
                        >
                          {entry.total_points}
                        </span>
                        <span className="text-slate-500 text-xs ml-1">pts</span>
                      </td>
                      <td className="px-4 py-4 text-right hidden sm:table-cell text-slate-300">
                        {entry.predictions_count}
                      </td>
                      <td className="px-4 py-4 text-right hidden sm:table-cell text-slate-300">
                        {entry.finished_count}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Points legend */}
      <div className="mt-6 card p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Sistema de puntos</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
            <p className="text-2xl font-bold text-green-400">3</p>
            <p className="text-xs text-slate-400 mt-1">Resultado exacto</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <p className="text-2xl font-bold text-amber-400">1</p>
            <p className="text-xs text-slate-400 mt-1">Resultado correcto (G/E/P)</p>
          </div>
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
            <p className="text-2xl font-bold text-slate-400">0</p>
            <p className="text-xs text-slate-400 mt-1">Sin puntos</p>
          </div>
        </div>
      </div>
    </div>
  );
}
