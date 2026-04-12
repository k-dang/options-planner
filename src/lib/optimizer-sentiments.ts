export const OPTIMIZER_SENTIMENTS = [
  { key: "very-bearish", multiplier: 0.85 },
  { key: "bearish", multiplier: 0.93 },
  { key: "neutral", multiplier: 1.0 },
  { key: "directional", multiplier: 1.05 },
  { key: "bullish", multiplier: 1.1 },
  { key: "very-bullish", multiplier: 1.2 },
] as const;

export type OptimizerSentimentKey =
  (typeof OPTIMIZER_SENTIMENTS)[number]["key"];

export function getSentimentTargetPrice(
  quotePrice: number,
  sentiment: OptimizerSentimentKey,
) {
  const multiplier = OPTIMIZER_SENTIMENTS.find(
    (candidate) => candidate.key === sentiment,
  )?.multiplier;

  if (multiplier == null) {
    return null;
  }

  return Math.round(quotePrice * multiplier * 100) / 100;
}
