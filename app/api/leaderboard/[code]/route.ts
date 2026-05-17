import { NextResponse } from 'next/server';
import { getRoomByCode, getLeaderboard } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    if (!code) {
      return NextResponse.json({ error: 'Código requerido' }, { status: 400 });
    }

    const room = getRoomByCode(code.toUpperCase());
    if (!room) {
      return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
    }

    const leaderboard = getLeaderboard(room.id);
    return NextResponse.json({ room, leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Error al obtener la tabla de posiciones' }, { status: 500 });
  }
}
