import Link from "next/link";

function NavIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="size-6" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#0b111d" />
      <path d="M18 39.5c4.6-11 9-16.5 13.2-16.5 3.9 0 5.7 4.5 8.2 4.5 1.8 0 3.6-1.3 5.4-3.8" fill="none" stroke="#5ed7df" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="16" y="42" width="32" height="5" rx="2.5" fill="#56d58f" />
      <rect x="15" y="15" width="34" height="34" rx="8" fill="none" stroke="#5ed7df" strokeOpacity=".2" strokeWidth="2" />
      <circle cx="18" cy="39.5" r="3.6" fill="#5ed7df" />
      <circle cx="31.2" cy="23" r="3.6" fill="#5ed7df" />
      <circle cx="39.4" cy="27.5" r="3.6" fill="#5ed7df" />
      <circle cx="44.8" cy="23.7" r="3.6" fill="#5ed7df" />
    </svg>
  );
}

export function NavBar() {
  return (
    <nav className="sticky top-0 z-50 flex items-center gap-6 border-b border-border/60 bg-background/80 px-6 py-3 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-2">
        <NavIcon />
        <span className="font-semibold text-sm tracking-tight">
          Options Planner
        </span>
      </Link>
      <div className="h-4 w-px bg-border" />
      <Link
        href="/optimize"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Optimizer
      </Link>
      <Link
        href="/scan"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Scan
      </Link>
      <Link
        href="/watchlist"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Watchlist
      </Link>
      <Link
        href="/positions"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Positions
      </Link>
    </nav>
  );
}
