import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllMatches, getPredictionsForUser } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage');

    let matches = getAllMatches();
    if (stage) {
      matches = matches.filter((m) => m.stage === stage);
    }

    const session = await getServerSession(authOptions);

    const predictionsMap: Record<number, { home_score: number; away_score: number; points: number | null }> = {};
    if (session?.user?.userId) {
      const userPredictions = getPredictionsForUser(Number(session.user.userId));
      for (const p of userPredictions) {
        predictionsMap[p.match_id] = {
          home_score: p.home_score,
          away_score: p.away_score,
          points: p.points,
        };
      }
    }

    const result = matches.map((m) => ({
      ...m,
      prediction: predictionsMap[m.id] ?? null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json({ error: 'Error al obtener partidos' }, { status: 500 });
  }
}
