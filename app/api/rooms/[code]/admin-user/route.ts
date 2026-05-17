import { NextResponse } from 'next/server';
import { getRoomByCode, getAdminUser } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const room = getRoomByCode(params.code.toUpperCase());
  if (!room) return NextResponse.json({ error: 'Sala no encontrada' }, { status: 404 });

  const admin = getAdminUser(room.id);
  if (!admin) return NextResponse.json({ error: 'Sin admin' }, { status: 404 });

  return NextResponse.json({ adminUsername: admin.username });
}
