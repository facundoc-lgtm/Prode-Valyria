import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc,
  query, where, orderBy, Timestamp, writeBatch, onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { hashPin } from './auth';
import { calculatePoints } from './scoring';
import { generateFixtures } from './fixtures';

// Types
export interface Room { code: string; name: string; adminPinHash: string; }
export interface RoomUser { id: string; username: string; pinHash: string; isAdmin: boolean; }
export interface Match {
  id: string; homeTeam: string; awayTeam: string; matchDate: string;
  stage: string; groupName: string | null; matchNumber: number;
  homeScore: number | null; awayScore: number | null; isFinished: boolean;
}
export interface Prediction {
  userId: string; matchId: string;
  homeScore: number; awayScore: number; points: number | null;
}
export interface LeaderboardEntry {
  userId: string; username: string; totalPoints: number;
  exactCount: number; resultCount: number; predictionsCount: number;
}

// ── Room ──────────────────────────────────────────────────────────────────────

export async function getRoomByCode(code: string): Promise<Room | null> {
  const snap = await getDoc(doc(db, 'rooms', code.toUpperCase()));
  return snap.exists() ? snap.data() as Room : null;
}

export async function createRoom(code: string, name: string): Promise<void> {
  await setDoc(doc(db, 'rooms', code.toUpperCase()), { code: code.toUpperCase(), name, createdAt: Timestamp.now() });
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getUsersInRoom(roomCode: string): Promise<RoomUser[]> {
  const snap = await getDocs(collection(db, 'rooms', roomCode.toUpperCase(), 'users'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as RoomUser));
}

export async function getUserByUsername(roomCode: string, username: string): Promise<RoomUser | null> {
  const q = query(
    collection(db, 'rooms', roomCode.toUpperCase(), 'users'),
    where('username', '==', username)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as RoomUser;
}

export async function createUser(roomCode: string, username: string, pin: string, isAdmin: boolean): Promise<string> {
  const pinHash = await hashPin(pin);
  const ref = await addDoc(collection(db, 'rooms', roomCode.toUpperCase(), 'users'), {
    username, pinHash, isAdmin, createdAt: Timestamp.now(),
  });
  return ref.id;
}

// ── Matches ───────────────────────────────────────────────────────────────────

export async function getMatches(): Promise<Match[]> {
  const snap = await getDocs(query(collection(db, 'matches'), orderBy('matchNumber')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Match));
}

export async function seedMatchesIfEmpty(): Promise<void> {
  const snap = await getDocs(collection(db, 'matches'));
  if (!snap.empty) return;
  const fixtures = generateFixtures();
  const batch = writeBatch(db);
  fixtures.forEach(f => {
    const ref = doc(collection(db, 'matches'));
    batch.set(ref, { ...f, homeScore: null, awayScore: null, isFinished: false });
  });
  await batch.commit();
}

export function subscribeToMatches(cb: (matches: Match[]) => void): Unsubscribe {
  return onSnapshot(query(collection(db, 'matches'), orderBy('matchNumber')), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Match)));
  });
}

export async function updateMatchTeams(matchId: string, homeTeam: string, awayTeam: string): Promise<void> {
  await updateDoc(doc(db, 'matches', matchId), { homeTeam, awayTeam });
}

// ── Predictions ───────────────────────────────────────────────────────────────

export async function getPredictionsForUser(roomCode: string, userId: string): Promise<Prediction[]> {
  const q = query(
    collection(db, 'rooms', roomCode.toUpperCase(), 'predictions'),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Prediction);
}

export async function savePrediction(
  roomCode: string, userId: string, matchId: string,
  homeScore: number, awayScore: number
): Promise<void> {
  const predId = `${userId}_${matchId}`;
  await setDoc(doc(db, 'rooms', roomCode.toUpperCase(), 'predictions', predId), {
    userId, matchId, homeScore, awayScore, points: null, updatedAt: Timestamp.now(),
  }, { merge: true });
}

// ── Admin: results ────────────────────────────────────────────────────────────

export async function saveMatchResult(
  roomCode: string, matchId: string,
  homeScore: number, awayScore: number
): Promise<void> {
  // Update match globally
  await updateDoc(doc(db, 'matches', matchId), { homeScore, awayScore, isFinished: true });

  // Calculate points for all predictions in this room
  const q = query(
    collection(db, 'rooms', roomCode.toUpperCase(), 'predictions'),
    where('matchId', '==', matchId)
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => {
    const p = d.data();
    const points = calculatePoints(
      { home: p.homeScore, away: p.awayScore },
      { home: homeScore, away: awayScore }
    );
    batch.update(d.ref, { points });
  });
  await batch.commit();
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export async function getLeaderboard(roomCode: string): Promise<LeaderboardEntry[]> {
  const [usersSnap, predsSnap] = await Promise.all([
    getDocs(collection(db, 'rooms', roomCode.toUpperCase(), 'users')),
    getDocs(collection(db, 'rooms', roomCode.toUpperCase(), 'predictions')),
  ]);
  const preds = predsSnap.docs.map(d => d.data() as Prediction);
  return usersSnap.docs.map(d => {
    const user = d.data();
    const up = preds.filter(p => p.userId === d.id);
    return {
      userId: d.id,
      username: user.username as string,
      totalPoints: up.reduce((s, p) => s + (p.points ?? 0), 0),
      exactCount: up.filter(p => p.points === 3).length,
      resultCount: up.filter(p => p.points === 1).length,
      predictionsCount: up.length,
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints || a.username.localeCompare(b.username));
}
