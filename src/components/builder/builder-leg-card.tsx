"use client";

import { useEffect, useId, useState } from "react";
import {
  formatCommittedNumberInput,
  formatNumber,
  getStrikeOptions,
  isCompletePositiveNumberInput,
} from "@/components/builder/builder-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OptionIndex } from "@/modules/market/schemas";
import type {
  BuilderLegInput,
  BuilderStateInput,
} from "@/modules/strategies/schemas";

export function BuilderLegCard(args: {
  leg: BuilderStateInput["legs"][number];
  index: number;
  optionIndex: OptionIndex | null;
  onLegQuantityChange: (index: number, value: string) => void;
  onOptionLegExpiryChange: (index: number, expiry: string) => void;
  onOptionLegStrikeChange: (index: number, strike: number) => void;
}) {
  const { index, leg } = args;

  return (
    <Card size="sm" className="border-white/[0.06] bg-white/[0.02]">
      <CardHeader>
        <CardTitle className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Leg {index + 1}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <ReadonlyField label="Kind" value={leg.kind} />
          <ReadonlyField label="Side" value={leg.side} />
          <EditableNumberField
            label="Quantity"
            value={formatNumber(leg.qty)}
            onChange={(value) => {
              args.onLegQuantityChange(index, value);
            }}
          />
          <ReadonlyField label="Entry mode" value={leg.entryPriceMode} />
        </div>

        {leg.kind === "option" ? (
          <OptionLegFields
            index={index}
            leg={leg}
            optionIndex={args.optionIndex}
            onOptionLegExpiryChange={args.onOptionLegExpiryChange}
            onOptionLegStrikeChange={args.onOptionLegStrikeChange}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function OptionLegFields(args: {
  index: number;
  leg: BuilderLegInput;
  optionIndex: OptionIndex | null;
  onOptionLegExpiryChange: (index: number, expiry: string) => void;
  onOptionLegStrikeChange: (index: number, strike: number) => void;
}) {
  return (
    <div className="grid gap-3">
      <ReadonlyField label="Right" value={args.leg.right ?? "--"} />
      <EditableSelect
        label="Expiry"
        value={args.leg.expiry ?? ""}
        options={
          args.optionIndex?.expirations.map((entry) => entry.expiry) ?? []
        }
        onValueChange={(value) => {
          args.onOptionLegExpiryChange(args.index, value);
        }}
      />
      <EditableSelect
        label="Strike"
        value={`${args.leg.strike ?? ""}`}
        options={getStrikeOptions(args.leg, args.optionIndex)}
        onValueChange={(value) => {
          args.onOptionLegStrikeChange(args.index, Number(value));
        }}
      />
    </div>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  const inputId = useId();

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <Input id={inputId} value={value} readOnly />
    </div>
  );
}

function EditableNumberField(args: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const inputId = useId();
  const [draftValue, setDraftValue] = useState(args.value);

  useEffect(() => {
    setDraftValue(args.value);
  }, [args.value]);

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={inputId}>{args.label}</Label>
      <Input
        id={inputId}
        type="number"
        hideNumberSpinner
        min={0.01}
        step={0.01}
        value={draftValue}
        onChange={(event) => {
          const nextValue = event.target.value;
          setDraftValue(nextValue);
          if (isCompletePositiveNumberInput(nextValue)) {
            args.onChange(nextValue);
          }
        }}
        onBlur={(event) => {
          const nextValue = event.target.value;
          args.onChange(nextValue);
          setDraftValue(formatCommittedNumberInput(nextValue, args.value));
        }}
      />
    </div>
  );
}

function EditableSelect(args: {
  label: string;
  value: string;
  options: string[];
  onValueChange?: (value: string) => void;
}) {
  const selectId = useId();

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={selectId}>{args.label}</Label>
      <Select
        value={args.value || undefined}
        onValueChange={args.onValueChange}
      >
        <SelectTrigger id={selectId} className="w-full">
          <SelectValue placeholder="Unavailable" />
        </SelectTrigger>
        <SelectContent>
          {args.options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
