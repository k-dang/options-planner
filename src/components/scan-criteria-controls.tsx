"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { formatPercent } from "@/lib/format";
import { type StrategyTemplateId, strategyTemplates } from "@/lib/options";
import { cn } from "@/lib/utils";

export type ScanFilters = {
  minDays: number;
  maxDays: number;
  minPop: number;
  enabled: Set<StrategyTemplateId>;
};

export const DEFAULT_SCAN_FILTERS = {
  minDays: 30,
  maxDays: 60,
  minPop: 0.25,
} satisfies Omit<ScanFilters, "enabled">;

export function createDefaultScanFilters(): ScanFilters {
  return {
    ...DEFAULT_SCAN_FILTERS,
    enabled: new Set<StrategyTemplateId>(
      strategyTemplates.defaultScanStrategies(),
    ),
  };
}

export function ScanCriteriaControls({
  filters,
  onFiltersChange,
  hiddenInputs = false,
}: {
  filters: ScanFilters;
  onFiltersChange: (filters: ScanFilters) => void;
  hiddenInputs?: boolean;
}) {
  function updateFilters(update: (current: ScanFilters) => ScanFilters) {
    onFiltersChange(update(filters));
  }

  function toggleStrategy(strategy: StrategyTemplateId) {
    updateFilters((current) => {
      const next = new Set(current.enabled);

      if (next.has(strategy)) {
        next.delete(strategy);
      } else {
        next.add(strategy);
      }

      return { ...current, enabled: next };
    });
  }

  function setAllStrategies(value: boolean) {
    updateFilters((current) => ({
      ...current,
      enabled: value ? new Set(strategyTemplates.ids()) : new Set(),
    }));
  }

  function handleDteChange(value: number | readonly number[]) {
    if (!Array.isArray(value)) return;
    const [lo, hi] = value;

    if (typeof lo !== "number" || typeof hi !== "number") return;

    updateFilters((current) => ({
      ...current,
      minDays: Math.min(lo, hi),
      maxDays: Math.max(lo, hi),
    }));
  }

  function handlePopChange(value: number | readonly number[]) {
    const next = Array.isArray(value) ? (value[0] ?? 0) : value;

    updateFilters((current) => ({ ...current, minPop: next / 100 }));
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field className="flex flex-col gap-2">
          <FieldLabel className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Days To Expiration · {filters.minDays}-{filters.maxDays}
          </FieldLabel>
          <div className="rounded-2xl border border-border/60 bg-white/80 px-4 py-3 shadow-sm dark:bg-white/8">
            <Slider
              aria-label="Days to expiration"
              min={1}
              max={180}
              step={1}
              value={[filters.minDays, filters.maxDays]}
              onValueChange={handleDteChange}
            />
          </div>
          {hiddenInputs ? (
            <>
              <input
                type="hidden"
                name="minDaysToExpiration"
                value={filters.minDays}
              />
              <input
                type="hidden"
                name="maxDaysToExpiration"
                value={filters.maxDays}
              />
            </>
          ) : null}
        </Field>

        <Field className="flex flex-col gap-2">
          <FieldLabel className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Min Probability of Profit · {formatPercent(filters.minPop)}
          </FieldLabel>
          <div className="rounded-2xl border border-border/60 bg-white/80 px-4 py-3 shadow-sm dark:bg-white/8">
            <Slider
              aria-label="Minimum probability of profit"
              min={0}
              max={90}
              step={5}
              value={[Math.round(filters.minPop * 100)]}
              onValueChange={handlePopChange}
            />
          </div>
          {hiddenInputs ? (
            <input
              type="hidden"
              name="minProbabilityOfProfit"
              value={Math.round(filters.minPop * 100)}
            />
          ) : null}
        </Field>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-3">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Strategies
          </span>
          <Button
            type="button"
            variant="link"
            size="xs"
            className="h-auto p-0 text-[11px] text-muted-foreground hover:text-foreground hover:no-underline"
            onClick={() => setAllStrategies(true)}
          >
            Select all
          </Button>
          <Button
            type="button"
            variant="link"
            size="xs"
            className="h-auto p-0 text-[11px] text-muted-foreground hover:text-foreground hover:no-underline"
            onClick={() => setAllStrategies(false)}
          >
            Clear
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {strategyTemplates.ids().map((strategy) => {
            const enabled = filters.enabled.has(strategy);

            return (
              <Button
                key={strategy}
                type="button"
                variant="outline"
                size="xs"
                aria-pressed={enabled}
                onClick={() => toggleStrategy(strategy)}
                className={cn(
                  enabled
                    ? "border-primary/40 bg-primary/15 text-foreground hover:bg-primary/20"
                    : "border-border/60 bg-white/60 text-muted-foreground hover:border-primary/30 dark:bg-white/5",
                )}
              >
                {strategyTemplates.get(strategy).label}
              </Button>
            );
          })}
        </div>
        {hiddenInputs
          ? [...filters.enabled].map((strategy) => (
              <input
                key={strategy}
                type="hidden"
                name="enabledStrategies"
                value={strategy}
              />
            ))
          : null}
      </div>
    </>
  );
}
