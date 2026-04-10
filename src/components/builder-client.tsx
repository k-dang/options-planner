"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useBuilderCalcQuery,
  useOptionsMetadataQuery,
} from "@/hooks/use-builder-queries";
import { cn } from "@/lib/utils";
import type { OptionIndex } from "@/modules/market/schemas";
import type {
  BuilderLegInput,
  BuilderStateInput,
  StrategyCalcResponse,
} from "@/modules/strategies/schemas";

type BuilderClientProps = {
  initialBuilderState: BuilderStateInput | null;
  initialError: string | null;
};

const chartConfig = {
  pnl: {
    label: "P/L",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig;

export default function BuilderClient({
  initialBuilderState,
  initialError,
}: BuilderClientProps) {
  const [builderState, setBuilderState] = useState<BuilderStateInput | null>(
    initialBuilderState,
  );

  const calcQuery = useBuilderCalcQuery(builderState);

  const optionsIndexQuery = useOptionsMetadataQuery(builderState);

  if (!builderState) {
    return (
      <BuilderMessage title="Builder unavailable" message={initialError} />
    );
  }

  const calcData = calcQuery.data?.data ?? null;
  const calcError = calcQuery.error?.message ?? null;
  const marketError =
    calcError ?? optionsIndexQuery.error?.message ?? initialError;

  function updateHorizonDays(value: number) {
    if (!Number.isFinite(value) || value < 1) {
      return;
    }

    setBuilderState((current) =>
      current === null
        ? current
        : {
            ...current,
            horizonDays: Math.trunc(value),
          },
    );
  }

  function updateLegQuantity(index: number, value: number) {
    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    setBuilderState((current) => {
      if (current === null) {
        return current;
      }

      return {
        ...current,
        legs: current.legs.map((leg, legIndex) =>
          legIndex === index
            ? {
                ...leg,
                qty: value,
              }
            : leg,
        ),
      };
    });
  }

  function updateOptionLegExpiry(index: number, expiry: string) {
    setBuilderState((current) => {
      if (current === null) {
        return current;
      }

      const leg = current.legs[index];
      if (!leg || leg.kind !== "option") {
        return current;
      }

      const nextStrike = getDefaultStrikeForExpiry({
        optionIndex: optionsIndexQuery.data,
        expiry,
        right: leg.right,
        currentStrike: leg.strike,
      });

      return {
        ...current,
        legs: current.legs.map((existingLeg, legIndex) =>
          legIndex === index && existingLeg.kind === "option"
            ? {
                ...existingLeg,
                expiry,
                strike: nextStrike ?? existingLeg.strike,
              }
            : existingLeg,
        ),
      };
    });
  }

  function updateOptionLegStrike(index: number, strike: number) {
    if (!Number.isFinite(strike) || strike <= 0) {
      return;
    }

    setBuilderState((current) => {
      if (current === null) {
        return current;
      }

      return {
        ...current,
        legs: current.legs.map((leg, legIndex) =>
          legIndex === index && leg.kind === "option"
            ? {
                ...leg,
                strike,
              }
            : leg,
        ),
      };
    });
  }

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
                {builderState.templateName ?? "Custom Strategy"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {builderState.symbol} with live recalculation from the shared
                calc contract.
              </p>
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              {calcQuery.isFetching ? "Recalculating..." : "Up to date"}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <BuilderControlsCard
            builderState={builderState}
            optionIndex={optionsIndexQuery.data ?? null}
            onHorizonDaysChange={updateHorizonDays}
            onLegQuantityChange={updateLegQuantity}
            onOptionLegExpiryChange={updateOptionLegExpiry}
            onOptionLegStrikeChange={updateOptionLegStrike}
          />

          <div className="grid gap-4">
            {marketError ? (
              <BuilderMessage title="Calculation error" message={marketError} />
            ) : null}

            <BuilderSummaryGrid data={calcData} />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)]">
              <BuilderChartCard data={calcData} />
              <BuilderGreeksCard data={calcData} />
            </div>

            <BuilderGridCard data={calcData} />
          </div>
        </section>
      </main>
    </div>
  );
}

function BuilderControlsCard({
  builderState,
  optionIndex,
  onHorizonDaysChange,
  onLegQuantityChange,
  onOptionLegExpiryChange,
  onOptionLegStrikeChange,
}: {
  builderState: BuilderStateInput;
  optionIndex: OptionIndex | null;
  onHorizonDaysChange: (value: number) => void;
  onLegQuantityChange: (index: number, value: number) => void;
  onOptionLegExpiryChange: (index: number, expiry: string) => void;
  onOptionLegStrikeChange: (index: number, strike: number) => void;
}) {
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
            value={builderState.horizonDays}
            onChange={(event) => {
              onHorizonDaysChange(Number(event.target.value));
            }}
          />
          <p className="text-xs text-muted-foreground">
            Changes recalculate automatically through the shared strategy calc
            route.
          </p>
        </div>

        <div className="grid gap-3">
          {builderState.legs.map((leg, index) => (
            <Card
              key={`${leg.kind}-${leg.side}-${leg.expiry ?? "stock"}-${leg.strike ?? index}`}
              size="sm"
              className="border-white/[0.06] bg-white/[0.02]"
            >
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
                      onLegQuantityChange(index, value);
                    }}
                  />
                  <ReadonlyField
                    label="Entry mode"
                    value={leg.entryPriceMode}
                  />
                </div>

                {leg.kind === "option" ? (
                  <div className="grid gap-3">
                    <ReadonlyField label="Right" value={leg.right ?? "--"} />
                    <EditableSelect
                      label="Expiry"
                      value={leg.expiry ?? ""}
                      options={
                        optionIndex?.expirations.map((entry) => entry.expiry) ??
                        []
                      }
                      onValueChange={(value) => {
                        onOptionLegExpiryChange(index, value);
                      }}
                    />
                    <EditableSelect
                      label="Strike"
                      value={`${leg.strike ?? ""}`}
                      options={getStrikeOptions(leg, optionIndex)}
                      onValueChange={(value) => {
                        onOptionLegStrikeChange(index, Number(value));
                      }}
                    />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input value={value} readOnly />
    </div>
  );
}

function EditableNumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        hideNumberSpinner
        min={0.01}
        step={0.01}
        value={value}
        onChange={(event) => {
          onChange(Number(event.target.value));
        }}
      />
    </div>
  );
}

function EditableSelect({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: string;
  options: string[];
  onValueChange?: (value: string) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Select value={value || undefined} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Unavailable" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function BuilderSummaryGrid({
  data,
}: {
  data: StrategyCalcResponse["data"] | null;
}) {
  const metrics = [
    {
      label: "Net debit / credit",
      value:
        data === null ? "--" : formatCurrency(data.summary.netDebitOrCredit),
    },
    {
      label: "Max profit",
      value:
        data === null ? "--" : formatNullableCurrency(data.summary.maxProfit),
    },
    {
      label: "Max loss",
      value:
        data === null ? "--" : formatNullableCurrency(data.summary.maxLoss),
    },
    {
      label: "Chance at horizon",
      value:
        data === null
          ? "--"
          : formatPercent(data.summary.chanceOfProfitAtHorizon),
    },
    {
      label: "Chance at expiration",
      value:
        data === null
          ? "--"
          : formatPercent(data.summary.chanceOfProfitAtExpiration),
    },
    {
      label: "Breakevens",
      value:
        data === null
          ? "--"
          : data.summary.breakevens.length > 0
            ? data.summary.breakevens
                .map((value) => formatCurrency(value))
                .join(", ")
            : "None",
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <Card
          key={metric.label}
          className="border-white/[0.06] bg-[oklch(0.14_0.008_260)]"
          size="sm"
        >
          <CardContent className="grid gap-1 pt-1">
            <div className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground/60">
              {metric.label}
            </div>
            <div className="text-sm font-medium text-foreground">
              {metric.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BuilderChartCard({
  data,
}: {
  data: StrategyCalcResponse["data"] | null;
}) {
  return (
    <Card className="border-white/[0.08] bg-[oklch(0.14_0.008_260)] shadow-[0_2px_16px_oklch(0_0_0_/_0.2)]">
      <CardHeader>
        <CardTitle>P/L Curve</CardTitle>
      </CardHeader>
      <CardContent>
        {data ? (
          <ChartContainer config={chartConfig} className="h-72 w-full">
            <AreaChart data={data.chart.series}>
              <defs>
                <linearGradient id="builder-pnl" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-pnl)"
                    stopOpacity={0.25}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-pnl)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="oklch(1 0 0 / 0.04)" />
              <XAxis
                dataKey="price"
                tickFormatter={(value) => formatAxisCurrency(Number(value))}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(value) => formatAxisCurrency(Number(value))}
                axisLine={false}
                tickLine={false}
                width={72}
              />
              <Tooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => (
                      <span className="font-mono font-medium text-foreground">
                        {formatCurrency(Number(value))}
                      </span>
                    )}
                    labelFormatter={(_, payload) => {
                      const hoveredPrice = payload?.[0]?.payload?.price;
                      return hoveredPrice == null
                        ? "Underlying"
                        : `Underlying ${formatCurrency(Number(hoveredPrice))}`;
                    }}
                  />
                }
              />
              <ReferenceLine
                y={0}
                stroke="oklch(1 0 0 / 0.12)"
                strokeDasharray="4 4"
              />
              <Area
                type="monotone"
                dataKey="pnl"
                stroke="var(--color-pnl)"
                fill="url(#builder-pnl)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <EmptySurface message="Waiting for calculation results." />
        )}
      </CardContent>
    </Card>
  );
}

function BuilderGreeksCard({
  data,
}: {
  data: StrategyCalcResponse["data"] | null;
}) {
  const greeks = data?.summary.netGreeks;
  const greekMetrics = [
    ["Delta", greeks?.delta],
    ["Gamma", greeks?.gamma],
    ["Theta", greeks?.theta],
    ["Vega", greeks?.vega],
    ["Rho", greeks?.rho],
  ] as const;

  return (
    <Card className="border-white/[0.08] bg-[oklch(0.14_0.008_260)] shadow-[0_2px_16px_oklch(0_0_0_/_0.2)]">
      <CardHeader>
        <CardTitle>Net Greeks</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {greekMetrics.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2"
          >
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground/60">
              {label}
            </span>
            <span className="font-mono text-sm text-foreground">
              {value == null ? "--" : value.toFixed(4)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function BuilderGridCard({
  data,
}: {
  data: StrategyCalcResponse["data"] | null;
}) {
  return (
    <Card className="border-white/[0.08] bg-[oklch(0.14_0.008_260)] shadow-[0_2px_16px_oklch(0_0_0_/_0.2)]">
      <CardHeader>
        <CardTitle>P/L Grid</CardTitle>
      </CardHeader>
      <CardContent>
        {data ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Underlying</TableHead>
                {data.grid.dates.map((date) => (
                  <TableHead key={date}>{date}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.grid.prices.map((price, rowIndex) => (
                <TableRow key={`${price}-${rowIndex}`}>
                  <TableCell className="font-mono">
                    {formatCurrency(price)}
                  </TableCell>
                  {data.grid.values[rowIndex]?.map((value, columnIndex) => (
                    <TableCell
                      key={`${price}-${data.grid.dates[columnIndex]}`}
                      className={cn(
                        "font-mono",
                        value > 0 && "text-profit",
                        value < 0 && "text-loss",
                      )}
                    >
                      {formatCurrency(value)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptySurface message="Waiting for calculation results." />
        )}
      </CardContent>
    </Card>
  );
}

function BuilderMessage({
  title,
  message,
}: {
  title: string;
  message: string | null;
}) {
  return (
    <div className="grain grid-bg flex min-h-screen items-center justify-center px-5 py-8">
      <Card className="max-w-xl border-white/[0.08] bg-[oklch(0.14_0.008_260)] shadow-[0_2px_16px_oklch(0_0_0_/_0.2)]">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {message ?? "Unknown error."}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptySurface({ message }: { message: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-6 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function getStrikeOptions(
  leg: BuilderLegInput,
  optionIndex: OptionIndex | null,
) {
  if (leg.kind !== "option" || !leg.expiry || !leg.right) {
    return [];
  }

  const expiryEntry = optionIndex?.expirations.find(
    (entry) => entry.expiry === leg.expiry,
  );
  if (!expiryEntry) {
    return leg.strike == null ? [] : [`${leg.strike}`];
  }

  return (leg.right === "C" ? expiryEntry.calls : expiryEntry.puts).map(
    (strike) => `${strike}`,
  );
}

function getDefaultStrikeForExpiry({
  optionIndex,
  expiry,
  right,
  currentStrike,
}: {
  optionIndex: OptionIndex | null | undefined;
  expiry: string;
  right: BuilderLegInput["right"];
  currentStrike: number | undefined;
}) {
  if (!right) {
    return currentStrike;
  }

  const expiryEntry = optionIndex?.expirations.find(
    (entry) => entry.expiry === expiry,
  );
  const strikes =
    right === "C" ? expiryEntry?.calls.slice() : expiryEntry?.puts.slice();

  if (!strikes || strikes.length === 0) {
    return currentStrike;
  }

  if (currentStrike == null) {
    return strikes[0];
  }

  return strikes.reduce((closest, strike) => {
    if (Math.abs(strike - currentStrike) < Math.abs(closest - currentStrike)) {
      return strike;
    }
    return closest;
  }, strikes[0]);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNullableCurrency(value: number | null) {
  return value == null ? "Unlimited" : formatCurrency(value);
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatAxisCurrency(value: number) {
  return `$${Math.round(value)}`;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}
