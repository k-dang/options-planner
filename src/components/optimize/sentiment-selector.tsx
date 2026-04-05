export const SENTIMENTS = [
  {
    key: "very-bearish",
    label: "Very Bearish",
    multiplier: 0.85,
    color: "oklch(0.65 0.2 25)",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <title>Very Bearish</title>
        <path d="M12 5v14" />
        <path d="M5 12l7 7 7-7" />
      </svg>
    ),
  },
  {
    key: "bearish",
    label: "Bearish",
    multiplier: 0.93,
    color: "oklch(0.7 0.15 55)",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <title>Bearish</title>
        <path d="M7 7l10 10" />
        <path d="M17 7v10H7" />
      </svg>
    ),
  },
  {
    key: "neutral",
    label: "Neutral",
    multiplier: 1.0,
    color: "oklch(0.6 0.01 260)",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <title>Neutral</title>
        <path d="M5 12h14" />
        <path d="M13 5l7 7-7 7" />
      </svg>
    ),
  },
  {
    key: "directional",
    label: "Directional",
    multiplier: 1.05,
    color: "oklch(0.65 0.2 300)",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <title>Directional</title>
        <path d="M16 7l5 5-5 5" />
        <path d="M8 7L3 12l5 5" />
        <path d="M21 12H3" />
      </svg>
    ),
  },
  {
    key: "bullish",
    label: "Bullish",
    multiplier: 1.1,
    color: "oklch(0.72 0.19 155)",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <title>Bullish</title>
        <path d="M7 17L17 7" />
        <path d="M7 7h10v10" />
      </svg>
    ),
  },
  {
    key: "very-bullish",
    label: "Very Bullish",
    multiplier: 1.2,
    color: "oklch(0.8 0.22 145)",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <title>Very Bullish</title>
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </svg>
    ),
  },
] as const;

type SentimentSelectorProps = {
  quotePrice: number;
  sentiment: string | null;
  onSentimentChange: (key: string, targetPrice: number) => void;
};

export function SentimentSelector({
  quotePrice,
  sentiment,
  onSentimentChange,
}: SentimentSelectorProps) {
  return (
    <div className="grid w-full grid-cols-6 items-end">
      {SENTIMENTS.map((s) => {
        const isActive = sentiment === s.key;
        return (
          <button
            key={s.key}
            type="button"
            className="group flex w-full flex-col items-center gap-1.5"
            onClick={() =>
              onSentimentChange(
                s.key,
                Math.round(quotePrice * s.multiplier * 100) / 100,
              )
            }
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full border transition-all sm:h-14 sm:w-14"
              style={{
                borderColor: isActive ? s.color : "oklch(1 0 0 / 0.08)",
                backgroundColor: isActive
                  ? `color-mix(in oklch, ${s.color} 15%, transparent)`
                  : "oklch(0.14 0.008 260)",
                boxShadow: isActive
                  ? `0 0 12px color-mix(in oklch, ${s.color} 25%, transparent)`
                  : "none",
                color: isActive ? s.color : "oklch(0.5 0.01 260)",
              }}
            >
              {s.icon}
            </div>
            <span
              className="font-mono text-[0.5rem] uppercase tracking-wider transition-colors sm:text-[0.55rem]"
              style={{
                color: isActive ? s.color : "oklch(0.45 0.01 260)",
              }}
            >
              {s.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
