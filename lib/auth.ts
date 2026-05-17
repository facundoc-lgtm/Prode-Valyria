import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getRoomByCode, getUserByUsernameAndRoom } from './db';

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Usuario', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
        roomCode: { label: 'Código de sala', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password || !credentials?.roomCode) {
          return null;
        }

        const room = getRoomByCode(credentials.roomCode.toUpperCase());
        if (!room) return null;

        const user = getUserByUsernameAndRoom(credentials.username, room.id);
        if (!user) return null;

        const passwordMatch = await bcrypt.compare(credentials.password, user.password_hash);
        if (!passwordMatch) return null;

        return {
          id: String(user.id),
          name: user.username,
          email: null,
          roomCode: room.code,
          roomId: String(room.id),
          isAdmin: user.is_admin === 1,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.username = user.name ?? '';
        token.roomCode = (user as { roomCode: string }).roomCode;
        token.roomId = (user as { roomId: string }).roomId;
        token.isAdmin = (user as { isAdmin: boolean }).isAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        userId: token.userId as string,
        username: token.username as string,
        roomCode: token.roomCode as string,
        roomId: token.roomId as string,
        isAdmin: token.isAdmin as boolean,
      };
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
};
