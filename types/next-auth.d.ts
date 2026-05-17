import { DefaultSession, DefaultJWT } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      userId: string;
      username: string;
      roomCode: string;
      roomId: string;
      isAdmin: boolean;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    roomCode: string;
    roomId: string;
    isAdmin: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    username: string;
    roomCode: string;
    roomId: string;
    isAdmin: boolean;
  }
}
