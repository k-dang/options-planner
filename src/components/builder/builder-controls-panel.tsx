"use client";

import { useEffect, useState } from "react";
import {
  formatCommittedIntegerInput,
  isCompletePositiveIntegerInput,
} from "@/components/builder/builder-helpers";
import { BuilderLegCard } from "@/components/builder/builder-leg-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OptionIndex } from "@/modules/market/schemas";
import type { BuilderStateInput } from "@/modules/strategies/schemas";

export function BuilderControlsPanel(args: {
  horizonDays: number;
  legs: BuilderStateInput["legs"];
  optionIndex: OptionIndex | null;
  onHorizonDaysChange: (value: string) => void;
  onLegQuantityChange: (index: number, value: string) => void;
  onOptionLegExpiryChange: (index: number, expiry: string) => void;
  onOptionLegStrikeChange: (index: number, strike: number) => void;
}) {
  const [horizonDaysInput, setHorizonDaysInput] = useState(
    () => `${args.horizonDays}`,
  );

  useEffect(() => {
    setHorizonDaysInput(`${args.horizonDays}`);
  }, [args.horizonDays]);

  return (
    <Card className="border-white/[0.08] bg-[oklch(0.14_0.008_260)] shadow-[0_2px_16px_oklch(0_0_0_/_0.2)]">
      <CardHeader>
        <CardTitle>Strategy Controls</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="builder-horizon-days">Horizon days</Label>
          <Input
            id="builder-horizon-days"
            type="number"
            hideNumberSpinner
            min={1}
            value={horizonDaysInput}
            onChange={(event) => {
              const nextValue = event.target.value;
              setHorizonDaysInput(nextValue);
              if (isCompletePositiveIntegerInput(nextValue)) {
                args.onHorizonDaysChange(nextValue);
              }
            }}
            onBlur={(event) => {
              const nextValue = event.target.value;
              args.onHorizonDaysChange(nextValue);
              setHorizonDaysInput(
                formatCommittedIntegerInput(nextValue, args.horizonDays),
              );
            }}
          />
          <p className="text-xs text-muted-foreground">
            Changes recalculate automatically on the server.
          </p>
        </div>

        <div className="grid gap-3">
          {args.legs.map((leg, index) => (
            <BuilderLegCard
              key={`${leg.kind}-${leg.side}-${leg.expiry ?? "stock"}-${leg.strike ?? index}`}
              leg={leg}
              index={index}
              optionIndex={args.optionIndex}
              onLegQuantityChange={args.onLegQuantityChange}
              onOptionLegExpiryChange={args.onOptionLegExpiryChange}
              onOptionLegStrikeChange={args.onOptionLegStrikeChange}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
