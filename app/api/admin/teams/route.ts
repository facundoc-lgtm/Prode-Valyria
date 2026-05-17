import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMatchById, updateMatchTeams } from '@/lib/db';

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    if (!session.user.isAdmin) {
      return NextResponse.json({ error: 'Solo los administradores pueden modificar equipos' }, { status: 403 });
    }

    const body = await request.json();
    const { matchId, homeTeam, awayTeam } = body;

    if (matchId == null || !homeTeam?.trim() || !awayTeam?.trim()) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const match = getMatchById(Number(matchId));
    if (!match) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 });
    }

    updateMatchTeams(Number(matchId), homeTeam.trim(), awayTeam.trim());

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating teams:', error);
    return NextResponse.json({ error: 'Error al actualizar equipos' }, { status: 500 });
  }
}
