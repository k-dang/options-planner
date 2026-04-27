import Link from "next/link";

export function NavBar() {
  return (
    <nav className="border-b px-6 py-3 flex items-center gap-6">
      <Link href="/" className="font-semibold text-sm">
        Options Planner
      </Link>
      <Link
        href="/optimize"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Optimize
      </Link>
    </nav>
  );
}
