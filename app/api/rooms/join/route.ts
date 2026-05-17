import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getRoomByCode, getUserByUsernameAndRoom, createUser } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomCode, username, password } = body;

    if (!roomCode?.trim() || !username?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 });
    }

    if (username.trim().length < 2) {
      return NextResponse.json({ error: 'El nombre de usuario debe tener al menos 2 caracteres' }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 4 caracteres' }, { status: 400 });
    }

    const room = getRoomByCode(roomCode.trim().toUpperCase());
    if (!room) {
      return NextResponse.json({ error: 'Sala no encontrada. Verificá el código.' }, { status: 404 });
    }

    const existingUser = getUserByUsernameAndRoom(username.trim(), room.id);
    if (existingUser) {
      return NextResponse.json({ error: 'El nombre de usuario ya está en uso en esta sala' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    createUser(username.trim(), passwordHash, room.id, false);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error joining room:', error);
    return NextResponse.json({ error: 'Error al unirse a la sala' }, { status: 500 });
  }
}
