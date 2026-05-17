export function calculatePoints(
  predicted: { home: number; away: number },
  actual: { home: number; away: number }
): number {
  if (predicted.home === actual.home && predicted.away === actual.away) return 3;
  if (Math.sign(predicted.home - predicted.away) === Math.sign(actual.home - actual.away)) return 1;
  return 0;
}
