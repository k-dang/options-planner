import Link from "next/link";

export function NavBar() {
  return (
    <nav className="sticky top-0 z-50 flex items-center gap-6 border-b border-border/60 bg-background/80 px-6 py-3 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-2 group">
        <span className="size-5 rounded flex items-center justify-center bg-primary/15 ring-1 ring-primary/30 group-hover:bg-primary/20 transition-colors">
          <span className="block size-2 rounded-[2px] bg-primary" />
        </span>
        <span className="font-semibold text-sm tracking-tight">Options Planner</span>
      </Link>
      <div className="h-4 w-px bg-border" />
      <Link
        href="/optimize"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Optimizer
      </Link>
    </nav>
  );
}
