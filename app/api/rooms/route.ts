import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createRoom, createUser, getRoomByCode } from '@/lib/db';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { roomName, username, password } = body;

    if (!roomName?.trim() || !username?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 });
    }

    if (username.trim().length < 2) {
      return NextResponse.json({ error: 'El nombre de usuario debe tener al menos 2 caracteres' }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 4 caracteres' }, { status: 400 });
    }

    // Generate unique code
    let code: string;
    let attempts = 0;
    do {
      code = generateRoomCode();
      attempts++;
      if (attempts > 20) {
        return NextResponse.json({ error: 'No se pudo generar un código único' }, { status: 500 });
      }
    } while (getRoomByCode(code));

    const passwordHash = await bcrypt.hash(password, 10);
    const room = createRoom(code, roomName.trim());
    createUser(username.trim(), passwordHash, room.id, true);

    return NextResponse.json({ code: room.code, username: username.trim() });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ error: 'Error al crear la sala' }, { status: 500 });
  }
}
