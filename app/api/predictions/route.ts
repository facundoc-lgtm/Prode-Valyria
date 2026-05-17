import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMatchById, upsertPrediction } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
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

    const matchDate = new Date(match.match_date);
    if (new Date() >= matchDate) {
      return NextResponse.json({ error: 'El partido ya comenzó, no podés modificar tu pronóstico' }, { status: 403 });
    }

    upsertPrediction(Number(session.user.userId), Number(matchId), homeScoreNum, awayScoreNum);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving prediction:', error);
    return NextResponse.json({ error: 'Error al guardar pronóstico' }, { status: 500 });
  }
}
