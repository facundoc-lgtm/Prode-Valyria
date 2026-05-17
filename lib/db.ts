import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Singleton pattern for Next.js hot reload compatibility
const globalForDb = globalThis as unknown as { _db: Database.Database | undefined };

function getDb(): Database.Database {
  if (globalForDb._db) return globalForDb._db;

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'prode.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  globalForDb._db = db;
  return db;
}

const db = getDb();

// ── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    code       TEXT    NOT NULL UNIQUE,
    name       TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    username     TEXT    NOT NULL,
    password_hash TEXT   NOT NULL,
    room_id      INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    is_admin     INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(username, room_id)
  );

  CREATE TABLE IF NOT EXISTS matches (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    home_team    TEXT    NOT NULL,
    away_team    TEXT    NOT NULL,
    match_date   TEXT    NOT NULL,
    stage        TEXT    NOT NULL CHECK(stage IN ('group','r32','r16','qf','sf','3rd','final')),
    group_name   TEXT,
    match_number INTEGER NOT NULL,
    home_score   INTEGER,
    away_score   INTEGER,
    is_finished  INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS predictions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_id   INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    home_score INTEGER NOT NULL,
    away_score INTEGER NOT NULL,
    points     INTEGER,
    updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, match_id)
  );
`);

// ── Seed matches ─────────────────────────────────────────────────────────────

const matchCount = (db.prepare('SELECT COUNT(*) as c FROM matches').get() as { c: number }).c;

if (matchCount === 0) {
  const insertMatch = db.prepare(`
    INSERT INTO matches (home_team, away_team, match_date, stage, group_name, match_number)
    VALUES (@home_team, @away_team, @match_date, @stage, @group_name, @match_number)
  `);

  const groups: { name: string; teams: string[] }[] = [
    { name: 'A', teams: ['Estados Unidos', 'Uzbekistán', 'Marruecos', 'Escocia'] },
    { name: 'B', teams: ['México', 'Ecuador', 'Arabia Saudita', 'Argelia'] },
    { name: 'C', teams: ['Canadá', 'Uruguay', 'Japón', 'Sudáfrica'] },
    { name: 'D', teams: ['España', 'Panamá', 'Australia', 'Nigeria'] },
    { name: 'E', teams: ['Francia', 'Honduras', 'Corea del Sur', 'Ghana'] },
    { name: 'F', teams: ['Alemania', 'Jamaica', 'Irán', 'Camerún'] },
    { name: 'G', teams: ['Portugal', 'Argentina', 'Qatar', 'Senegal'] },
    { name: 'H', teams: ['Inglaterra', 'Colombia', 'Irak', 'Costa de Marfil'] },
    { name: 'I', teams: ['Países Bajos', 'Brasil', 'Turquía', 'Egipto'] },
    { name: 'J', teams: ['Bélgica', 'Paraguay', 'Croacia', 'Nueva Zelanda'] },
    { name: 'K', teams: ['Italia', 'Serbia', 'Hungría', 'Playoff A'] },
    { name: 'L', teams: ['Suiza', 'Dinamarca', 'Austria', 'Playoff B'] },
  ];

  // Group stage fixture pattern (1-indexed positions):
  // Match 1: pos1 vs pos3, Match 2: pos2 vs pos4
  // Match 3: pos1 vs pos2, Match 4: pos3 vs pos4
  // Match 5: pos1 vs pos4, Match 6: pos2 vs pos3
  const fixturePattern = [
    [0, 2], [1, 3],
    [0, 1], [2, 3],
    [0, 3], [1, 2],
  ];

  // Group stage dates: June 11 – June 25, 2026
  // Spread 72 matches across 15 days (roughly 4-5 matches per day)
  const groupStartDate = new Date('2026-06-11T15:00:00Z');

  let matchNumber = 1;
  const seedMatches = db.transaction(() => {
    const matchesPerDay = 5;

    groups.forEach((group, gIdx) => {
      fixturePattern.forEach((pair, pIdx) => {
        const slotIndex = gIdx * 6 + pIdx;
        const dayOffset = Math.floor(slotIndex / matchesPerDay);
        const matchDate = new Date(groupStartDate.getTime());
        matchDate.setDate(matchDate.getDate() + dayOffset);
        matchDate.setHours(15 + (pIdx % 3) * 3, 0, 0, 0);

        insertMatch.run({
          home_team: group.teams[pair[0]],
          away_team: group.teams[pair[1]],
          match_date: matchDate.toISOString(),
          stage: 'group',
          group_name: group.name,
          match_number: matchNumber++,
        });
      });
    });

    // Knockout stage dates
    const koStages: { stage: string; count: number; startDate: string }[] = [
      { stage: 'r32', count: 16, startDate: '2026-07-01T18:00:00Z' },
      { stage: 'r16', count: 8,  startDate: '2026-07-08T18:00:00Z' },
      { stage: 'qf',  count: 4,  startDate: '2026-07-12T18:00:00Z' },
      { stage: 'sf',  count: 2,  startDate: '2026-07-15T18:00:00Z' },
      { stage: '3rd', count: 1,  startDate: '2026-07-18T18:00:00Z' },
      { stage: 'final', count: 1, startDate: '2026-07-19T18:00:00Z' },
    ];

    koStages.forEach(({ stage, count, startDate }) => {
      const base = new Date(startDate);
      for (let i = 0; i < count; i++) {
        const matchDate = new Date(base.getTime());
        matchDate.setDate(matchDate.getDate() + Math.floor(i / 2));
        matchDate.setHours(i % 2 === 0 ? 15 : 19, 0, 0, 0);
        insertMatch.run({
          home_team: 'Por definir',
          away_team: 'Por definir',
          match_date: matchDate.toISOString(),
          stage,
          group_name: null,
          match_number: matchNumber++,
        });
      }
    });
  });

  seedMatches();
}

// ── Type definitions ─────────────────────────────────────────────────────────

export interface Room {
  id: number;
  code: string;
  name: string;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  password_hash: string;
  room_id: number;
  is_admin: number;
  created_at: string;
}

export interface Match {
  id: number;
  home_team: string;
  away_team: string;
  match_date: string;
  stage: 'group' | 'r32' | 'r16' | 'qf' | 'sf' | '3rd' | 'final';
  group_name: string | null;
  match_number: number;
  home_score: number | null;
  away_score: number | null;
  is_finished: number;
}

export interface Prediction {
  id: number;
  user_id: number;
  match_id: number;
  home_score: number;
  away_score: number;
  points: number | null;
  updated_at: string;
}

// ── Helper functions ─────────────────────────────────────────────────────────

export function getRoomByCode(code: string): Room | undefined {
  return db.prepare('SELECT * FROM rooms WHERE code = ?').get(code) as Room | undefined;
}

export function getRoomById(id: number): Room | undefined {
  return db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as Room | undefined;
}

export function createRoom(code: string, name: string): Room {
  const result = db.prepare('INSERT INTO rooms (code, name) VALUES (?, ?)').run(code, name);
  return db.prepare('SELECT * FROM rooms WHERE id = ?').get(result.lastInsertRowid) as Room;
}

export function getUserByUsernameAndRoom(username: string, roomId: number): User | undefined {
  return db.prepare('SELECT * FROM users WHERE username = ? AND room_id = ?').get(username, roomId) as User | undefined;
}

export function getUserById(id: number): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function createUser(username: string, passwordHash: string, roomId: number, isAdmin: boolean): User {
  const result = db.prepare(
    'INSERT INTO users (username, password_hash, room_id, is_admin) VALUES (?, ?, ?, ?)'
  ).run(username, passwordHash, roomId, isAdmin ? 1 : 0);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as User;
}

export function getAllMatches(): Match[] {
  return db.prepare('SELECT * FROM matches ORDER BY match_number').all() as Match[];
}

export function getMatchById(id: number): Match | undefined {
  return db.prepare('SELECT * FROM matches WHERE id = ?').get(id) as Match | undefined;
}

export function updateMatchResult(matchId: number, homeScore: number, awayScore: number): void {
  db.prepare(
    'UPDATE matches SET home_score = ?, away_score = ?, is_finished = 1 WHERE id = ?'
  ).run(homeScore, awayScore, matchId);
}

export function updateMatchTeams(matchId: number, homeTeam: string, awayTeam: string): void {
  db.prepare(
    'UPDATE matches SET home_team = ?, away_team = ? WHERE id = ?'
  ).run(homeTeam, awayTeam, matchId);
}

export function getPrediction(userId: number, matchId: number): Prediction | undefined {
  return db.prepare('SELECT * FROM predictions WHERE user_id = ? AND match_id = ?').get(userId, matchId) as Prediction | undefined;
}

export function getPredictionsForMatch(matchId: number): Prediction[] {
  return db.prepare('SELECT * FROM predictions WHERE match_id = ?').all(matchId) as Prediction[];
}

export function getPredictionsForUser(userId: number): Prediction[] {
  return db.prepare('SELECT * FROM predictions WHERE user_id = ?').all(userId) as Prediction[];
}

export function upsertPrediction(userId: number, matchId: number, homeScore: number, awayScore: number): void {
  db.prepare(`
    INSERT INTO predictions (user_id, match_id, home_score, away_score, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, match_id)
    DO UPDATE SET home_score = excluded.home_score,
                  away_score = excluded.away_score,
                  updated_at = excluded.updated_at
  `).run(userId, matchId, homeScore, awayScore);
}

export function updatePredictionPoints(predictionId: number, points: number): void {
  db.prepare('UPDATE predictions SET points = ? WHERE id = ?').run(points, predictionId);
}

export interface LeaderboardEntry {
  user_id: number;
  username: string;
  total_points: number;
  predictions_count: number;
  finished_count: number;
}

export function getLeaderboard(roomId: number): LeaderboardEntry[] {
  return db.prepare(`
    SELECT
      u.id   AS user_id,
      u.username,
      COALESCE(SUM(p.points), 0) AS total_points,
      COUNT(p.id)                AS predictions_count,
      COUNT(CASE WHEN p.points IS NOT NULL THEN 1 END) AS finished_count
    FROM users u
    LEFT JOIN predictions p ON p.user_id = u.id
    WHERE u.room_id = ?
    GROUP BY u.id, u.username
    ORDER BY total_points DESC, u.username ASC
  `).all(roomId) as LeaderboardEntry[];
}

export default db;
