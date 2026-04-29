import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="relative flex flex-1 items-center overflow-hidden bg-background px-6">
      {/* Subtle grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(oklch(1 0 0 / 0.025) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.025) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      {/* Radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 size-[600px] rounded-full opacity-[0.07]"
        style={{
          background:
            "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
        }}
      />

      <section className="relative mx-auto w-full max-w-5xl py-24">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Options Planner
        </p>
        <h1 className="mt-5 max-w-3xl text-5xl font-bold leading-[1.08] tracking-tight md:text-6xl lg:text-7xl">
          Model any trade
          <br />
          <span className="text-primary">before you make it.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Build options strategies from templates or scan candidates across
          strategy families — with Black-Scholes pricing, Greeks, payoff
          diagrams, and probability estimates.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Button
            nativeButton={false}
            size="lg"
            render={<Link href="/optimize" />}
          >
            Open optimizer
          </Button>
          <span className="text-sm text-muted-foreground">
            13 strategies · Black-Scholes pricing · No account needed
          </span>
        </div>

        {/* Decorative stat strip */}
        <div className="mt-16 flex flex-wrap gap-8 border-t border-border/40 pt-8">
          {[
            { label: "Strategy families", value: "13" },
            { label: "Greeks tracked", value: "5" },
            { label: "Payoff grid points", value: "41" },
            { label: "Live or generated chain", value: "Both" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
                {value}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
