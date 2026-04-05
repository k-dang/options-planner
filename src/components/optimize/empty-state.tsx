export function EmptyState() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[oklch(0.12_0.008_260)]">
      {/* Decorative grid lines */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(oklch(1 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute bottom-0 left-1/2 h-32 w-64 -translate-x-1/2 rounded-full bg-primary/5 blur-[60px]" />
      </div>

      <div className="relative flex flex-col items-center gap-5 px-8 py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-6 w-6 text-muted-foreground/30"
            stroke="currentColor"
            strokeWidth="1"
          >
            <title>Chart</title>
            <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
            <path
              d="M7 16l4-8 4 4 6-8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium text-foreground/50">
            No strategies loaded
          </p>
          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground/40">
            Enter a ticker symbol above to scan options chains and visualize the
            highest expected-value strategies.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
          <span className="font-mono text-[0.55rem] tracking-wider text-muted-foreground/30">
            Try AAPL, TSLA, or SPY
          </span>
        </div>
      </div>
    </div>
  );
}
