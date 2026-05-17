export function calculatePoints(
  predicted: { home: number; away: number },
  actual: { home: number; away: number }
): number {
  if (predicted.home === actual.home && predicted.away === actual.away) return 3;
  const predictedResult = Math.sign(predicted.home - predicted.away);
  const actualResult = Math.sign(actual.home - actual.away);
  if (predictedResult === actualResult) return 1;
  return 0;
}
