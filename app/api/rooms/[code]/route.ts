import { NextResponse } from 'next/server';
import { getRoomByCode } from '@/lib/db';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const room = getRoomByCode(code);
  if (!room) {
    return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });
  }

  const players = db
    .prepare('SELECT id, username, is_admin FROM users WHERE room_id = ? ORDER BY created_at ASC')
    .all(room.id) as { id: number; username: string; is_admin: number }[];

  return NextResponse.json({
    room: { id: room.id, code: room.code, name: room.name },
    players: players.map(p => ({ id: p.id, username: p.username, isAdmin: p.is_admin === 1 })),
  });
}
