"use client";

import { Button } from "@/components/ui/button";
import type { OptionExpiration } from "@/lib/options";
import { cn } from "@/lib/utils";

type Group = {
  key: string;
  year: number;
  month: number;
  label: string;
  items: OptionExpiration[];
};

export function ExpirationTimeline({
  expirations,
  value,
  onChange,
}: {
  expirations: OptionExpiration[];
  value: string | undefined;
  onChange: (expiration: string) => void;
}) {
  if (expirations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4">
        <p className="text-sm font-medium">No expirations available</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Try another symbol or retry after the options chain updates.
        </p>
      </div>
    );
  }

  const selected = expirations.find((e) => e.expiration === value);
  const groups = groupExpirationsByMonth(expirations);

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Expiration
          </span>
          {selected && (
            <span className="font-mono text-xs tabular-nums text-foreground/55">
              {selected.expiration}
            </span>
          )}
        </div>
        {selected && (
          <div className="flex items-baseline gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 shadow-sm">
            <span className="font-mono text-sm font-bold tabular-nums leading-none text-primary">
              {selected.daysToExpiration}
            </span>
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
              days
            </span>
          </div>
        )}
      </div>

      {/* Timeline body — grid with one column per expiration so months
          (which span N columns) line up exactly with their day buttons. */}
      <div className="overflow-x-auto pb-1 [scrollbar-color:var(--color-border)_transparent] [scrollbar-width:thin]">
        <div
          className="grid gap-x-1 gap-y-2"
          style={{
            gridTemplateColumns: `repeat(${expirations.length}, minmax(0, 1fr))`,
            minWidth: `${expirations.length * 4.25}rem`,
          }}
        >
          {/* Row 1: month pills */}
          {groups.map((group) => {
            const isActive = group.items.some((e) => e.expiration === value);
            return (
              <div
                key={group.key}
                style={{ gridColumn: `span ${group.items.length}` }}
                className={cn(
                  "min-w-0 overflow-hidden rounded-full px-1.5 py-1 text-center font-mono text-xs font-semibold uppercase tracking-[0.08em] transition-colors",
                  isActive
                    ? "bg-primary/15 text-primary ring-1 ring-inset ring-primary/30"
                    : "bg-muted/50 text-muted-foreground dark:bg-white/5",
                )}
              >
                <span className="block truncate">{group.label}</span>
              </div>
            );
          })}

          {/* Row 2: hairline axis spanning all columns */}
          <div
            style={{ gridColumn: "1 / -1" }}
            className="h-px w-full bg-gradient-to-r from-transparent via-border/80 to-transparent"
          />

          {/* Row 3: day buttons, one per column */}
          {expirations.map((exp) => {
            const day = Number(exp.expiration.split("-")[2]);
            const isSelected = exp.expiration === value;
            return (
              <div
                key={exp.expiration}
                className="flex min-w-0 items-center justify-center"
              >
                <Button
                  aria-label={`${formatExpirationDate(exp.expiration)}, ${exp.daysToExpiration} days out`}
                  aria-pressed={isSelected}
                  title={`${exp.expiration} · ${exp.daysToExpiration}d`}
                  variant={isSelected ? "default" : "ghost"}
                  size="icon-xs"
                  onClick={() => onChange(exp.expiration)}
                  className={cn(
                    "size-7 rounded-full font-mono text-xs tabular-nums",
                    isSelected
                      ? "font-bold shadow-md shadow-primary/30 ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                      : "text-foreground/55",
                  )}
                >
                  {day}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const FULL_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});

function formatExpirationDate(expiration: string) {
  return FULL_DATE_FORMAT.format(new Date(`${expiration}T00:00:00.000Z`));
}

function groupExpirationsByMonth(expirations: OptionExpiration[]): Group[] {
  const map = new Map<string, Group>();
  const currentYear = new Date().getFullYear();
  for (const exp of expirations) {
    const [yearStr, monthStr] = exp.expiration.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const key = `${year}-${month}`;
    let group = map.get(key);
    if (!group) {
      const monthLabel = new Date(year, month - 1, 1).toLocaleString("en-US", {
        month: "short",
      });
      group = {
        key,
        year,
        month,
        label:
          year === currentYear
            ? monthLabel
            : `${monthLabel}'${String(year).slice(2)}`,
        items: [],
      };
      map.set(key, group);
    }
    group.items.push(exp);
  }
  return [...map.values()];
}
