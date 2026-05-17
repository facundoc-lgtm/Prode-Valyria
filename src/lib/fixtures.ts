export interface FixtureMatch {
  homeTeam: string;
  awayTeam: string;
  matchDate: string; // ISO string
  stage: 'group' | 'r32' | 'r16' | 'qf' | 'sf' | '3rd' | 'final';
  groupName: string | null;
  matchNumber: number;
}

const groups: { name: string; teams: string[] }[] = [
  { name: 'A', teams: ['México', 'Corea del Sur', 'Sudáfrica', 'Chequia'] },
  { name: 'B', teams: ['Estados Unidos', 'Panamá', 'Uruguay', 'Bolivia'] },
  { name: 'C', teams: ['Canadá', 'Honduras', 'Brasil', 'Marruecos'] },
  { name: 'D', teams: ['España', 'Ecuador', 'Japón', 'Ghana'] },
  { name: 'E', teams: ['Francia', 'Jamaica', 'Arabia Saudita', 'Nigeria'] },
  { name: 'F', teams: ['Alemania', 'Costa Rica', 'Australia', 'Costa de Marfil'] },
  { name: 'G', teams: ['Portugal', 'Argentina', 'Irán', 'Senegal'] },
  { name: 'H', teams: ['Inglaterra', 'Colombia', 'Irak', 'Argelia'] },
  { name: 'I', teams: ['Países Bajos', 'Venezuela', 'Turquía', 'Egipto'] },
  { name: 'J', teams: ['Bélgica', 'Paraguay', 'Croacia', 'Uzbekistán'] },
  { name: 'K', teams: ['Italia', 'Serbia', 'Hungría', 'Playoff A'] },
  { name: 'L', teams: ['Suiza', 'Dinamarca', 'Austria', 'Playoff B'] },
];

// Round robin: each pair plays once
const pairings = [[0, 2], [1, 3], [0, 1], [2, 3], [0, 3], [1, 2]];

export function generateFixtures(): FixtureMatch[] {
  const matches: FixtureMatch[] = [];
  let num = 1;
  const base = new Date('2026-06-11T15:00:00Z').getTime();
  const day = 86400000;

  // Group stage: spread over 15 days, ~5 matches/day
  groups.forEach((g, gi) => {
    pairings.forEach(([a, b], pi) => {
      const slot = gi * 6 + pi;
      const dayOff = Math.floor(slot / 5);
      const hourOff = (slot % 5) * 3;
      const d = new Date(base + dayOff * day + hourOff * 3600000);
      matches.push({
        homeTeam: g.teams[a],
        awayTeam: g.teams[b],
        matchDate: d.toISOString(),
        stage: 'group',
        groupName: g.name,
        matchNumber: num++,
      });
    });
  });

  // Knockout stages
  const ko: { stage: FixtureMatch['stage']; count: number; start: string }[] = [
    { stage: 'r32',   count: 16, start: '2026-07-01T18:00:00Z' },
    { stage: 'r16',   count: 8,  start: '2026-07-08T18:00:00Z' },
    { stage: 'qf',    count: 4,  start: '2026-07-12T18:00:00Z' },
    { stage: 'sf',    count: 2,  start: '2026-07-15T18:00:00Z' },
    { stage: '3rd',   count: 1,  start: '2026-07-18T15:00:00Z' },
    { stage: 'final', count: 1,  start: '2026-07-19T18:00:00Z' },
  ];
  ko.forEach(({ stage, count, start }) => {
    const b = new Date(start).getTime();
    for (let i = 0; i < count; i++) {
      const d = new Date(b + Math.floor(i / 2) * day + (i % 2) * 4 * 3600000);
      matches.push({
        homeTeam: 'Por definir',
        awayTeam: 'Por definir',
        matchDate: d.toISOString(),
        stage,
        groupName: null,
        matchNumber: num++,
      });
    }
  });

  return matches;
}
