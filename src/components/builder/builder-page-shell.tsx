import type { ReactNode } from "react";
import { BuilderControlsPanel } from "@/components/builder/builder-controls-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { OptionIndex } from "@/modules/market/schemas";
import type { BuilderStateInput } from "@/modules/strategies/schemas";

export function BuilderPageShell(args: {
  symbol: string;
  templateName?: string;
  isFetching: boolean;
  horizonDays: number;
  legs: BuilderStateInput["legs"];
  optionIndex: OptionIndex | null;
  onHorizonDaysChange: (value: string) => void;
  onLegQuantityChange: (index: number, value: string) => void;
  onOptionLegExpiryChange: (index: number, expiry: string) => void;
  onOptionLegStrikeChange: (index: number, strike: number) => void;
  results: ReactNode;
}) {
  return (
    <div className="grain grid-bg relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[240px] top-10 h-[520px] w-[520px] rounded-full bg-[oklch(0.65_0.18_160_/_0.06)] blur-[120px]" />
        <div className="absolute -right-[180px] top-[120px] h-[440px] w-[440px] rounded-full bg-[oklch(0.55_0.15_200_/_0.05)] blur-[100px]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 lg:px-10">
        <section className="flex flex-col gap-2">
          <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground/70">
            Builder Workspace
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-heading text-3xl tracking-tight text-foreground">
                {args.templateName ?? "Custom Strategy"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {args.symbol} with live recalculation from the shared calc
                contract.
              </p>
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              {args.isFetching ? "Recalculating..." : "Up to date"}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <BuilderControlsPanel
            horizonDays={args.horizonDays}
            legs={args.legs}
            optionIndex={args.optionIndex}
            onHorizonDaysChange={args.onHorizonDaysChange}
            onLegQuantityChange={args.onLegQuantityChange}
            onOptionLegExpiryChange={args.onOptionLegExpiryChange}
            onOptionLegStrikeChange={args.onOptionLegStrikeChange}
          />
          {args.results}
        </section>
      </main>
    </div>
  );
}

export function BuilderMessage(args: {
  title: string;
  message: string | null;
}) {
  return (
    <div className="grain grid-bg flex min-h-screen items-center justify-center px-5 py-8">
      <Card className="max-w-xl border-white/[0.08] bg-[oklch(0.14_0.008_260)] shadow-[0_2px_16px_oklch(0_0_0_/_0.2)]">
        <CardHeader>
          <CardTitle>{args.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {args.message ?? "Unknown error."}
        </CardContent>
      </Card>
    </div>
  );
}

export function EmptySurface({ message }: { message: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-6 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
