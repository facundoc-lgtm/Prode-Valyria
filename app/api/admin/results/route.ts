import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getMatchById,
  updateMatchResult,
  getPredictionsForMatch,
  updatePredictionPoints,
} from '@/lib/db';
import { calculatePoints } from '@/lib/scoring';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    if (!session.user.isAdmin) {
      return NextResponse.json({ error: 'Solo los administradores pueden cargar resultados' }, { status: 403 });
    }

    const body = await request.json();
    const { matchId, homeScore, awayScore } = body;

    if (matchId == null || homeScore == null || awayScore == null) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const homeScoreNum = Number(homeScore);
    const awayScoreNum = Number(awayScore);

    if (!Number.isInteger(homeScoreNum) || !Number.isInteger(awayScoreNum) || homeScoreNum < 0 || awayScoreNum < 0) {
      return NextResponse.json({ error: 'Los puntajes deben ser números enteros no negativos' }, { status: 400 });
    }

    const match = getMatchById(Number(matchId));
    if (!match) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
    }

    // Save match result
    updateMatchResult(Number(matchId), homeScoreNum, awayScoreNum);

    // Calculate points for all predictions on this match
    const predictions = getPredictionsForMatch(Number(matchId));
    let pointsAwarded = 0;

    for (const prediction of predictions) {
      const points = calculatePoints(
        { home: prediction.home_score, away: prediction.away_score },
        { home: homeScoreNum, away: awayScoreNum }
      );
      updatePredictionPoints(prediction.id, points);
      pointsAwarded += points;
    }

    return NextResponse.json({ success: true, pointsAwarded, predictionsScored: predictions.length });
  } catch (error) {
    console.error('Error saving result:', error);
    return NextResponse.json({ error: 'Error al guardar resultado' }, { status: 500 });
  }
}
