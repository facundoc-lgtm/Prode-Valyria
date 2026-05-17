'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export default function NavBar() {
  const { data: session, status } = useSession();

  const roomCode = session?.user?.roomCode;

  return (
    <nav className="bg-slate-800 border-b border-slate-700 h-16 flex items-center px-4 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">⚽</span>
          <span className="font-bold text-amber-400 text-lg leading-tight hidden sm:block">
            Prode Valyria
            <span className="text-slate-400 text-sm font-normal block leading-none">2026</span>
          </span>
          <span className="font-bold text-amber-400 text-lg sm:hidden">PV26</span>
        </Link>

        {/* Nav links */}
        {status === 'authenticated' && session?.user && (
          <div className="flex items-center gap-2 flex-1 justify-center">
            {roomCode && (
              <>
                <Link
                  href={`/room/${roomCode}`}
                  className="text-sm text-slate-300 hover:text-amber-400 transition-colors px-2 py-1 rounded"
                >
                  Tabla
                </Link>
                <Link
                  href={`/room/${roomCode}/predictions`}
                  className="text-sm text-slate-300 hover:text-amber-400 transition-colors px-2 py-1 rounded"
                >
                  Pronósticos
                </Link>
                {session.user.isAdmin && (
                  <Link
                    href={`/room/${roomCode}/admin`}
                    className="text-sm text-slate-300 hover:text-amber-400 transition-colors px-2 py-1 rounded"
                  >
                    Admin
                  </Link>
                )}
              </>
            )}
          </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          {status === 'authenticated' && session?.user ? (
            <>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-100">
                  {session.user.username}
                  {session.user.isAdmin && (
                    <span className="ml-1 text-xs text-amber-400">(admin)</span>
                  )}
                </p>
                {roomCode && (
                  <p className="text-xs text-slate-400 font-mono">
                    Sala: {roomCode}
                  </p>
                )}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                Salir
              </button>
            </>
          ) : status === 'unauthenticated' ? (
            <Link
              href="/"
              className="text-sm text-amber-400 hover:text-amber-300 font-semibold transition-colors"
            >
              Ingresar
            </Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
