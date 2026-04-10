"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { serializeBuilderStateForUrl } from "@/lib/builder-state-url";
import type { OptimizerCandidate } from "@/modules/optimizer/schemas";
import type { StrategyCalcResponse } from "@/modules/strategies/schemas";

const chartConfig = {
  pnl: {
    label: "P/L",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig;

export function StrategyCard({
  candidate,
  detail,
}: {
  candidate: OptimizerCandidate;
  detail: StrategyCalcResponse["data"];
}) {
  const builderHref = serializeBuilderStateForUrl({
    strategyName: candidate.strategyName,
    builderState: candidate.builderState,
  });
  const isProfit = candidate.expectedProfitAtTarget >= 0;
  const returnOnRisk =
    detail.summary.maxLoss != null && detail.summary.maxLoss !== 0
      ? (candidate.expectedProfitAtTarget / Math.abs(detail.summary.maxLoss)) *
        100
      : null;

  return (
    <Card className="group/strategy overflow-hidden border-white/[0.06] bg-[oklch(0.14_0.008_260)] shadow-[0_2px_16px_oklch(0_0_0_/_0.2)] transition-all hover:border-white/[0.1] hover:shadow-[0_4px_32px_oklch(0_0_0_/_0.3)]">
      <CardHeader className="space-y-3 pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="font-heading text-lg tracking-tight">
              {candidate.strategyName}
            </CardTitle>
            <CardDescription className="font-mono text-[0.65rem] tracking-wide">
              {formatLegSummary(candidate.legs)}
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={
              isProfit
                ? "border-profit/25 bg-profit/10 font-mono text-profit"
                : "border-loss/25 bg-loss/10 font-mono text-loss"
            }
          >
            {formatCurrency(candidate.expectedProfitAtTarget)}
          </Badge>
        </div>

        {/* Thin accent line */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </CardHeader>

      <CardContent className="grid gap-4 pt-2">
        <ChartContainer config={chartConfig} className="h-56 w-full">
          <AreaChart data={detail.chart.series}>
            <defs>
              <linearGradient
                id={gradientId(candidate.strategyName)}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
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
              tickFormatter={(value) => formatAxisCurrency(value)}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "oklch(0.5 0 0)" }}
            />
            <YAxis
              tickFormatter={(value) => formatAxisCurrency(value)}
              axisLine={false}
              tickLine={false}
              width={72}
              tick={{ fontSize: 10, fill: "oklch(0.5 0 0)" }}
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
              fill={`url(#${gradientId(candidate.strategyName)})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>

        <div className="grid grid-cols-2 gap-2">
          <Metric
            label="Return on risk"
            value={
              returnOnRisk != null
                ? `${returnOnRisk >= 0 ? "+" : ""}${returnOnRisk.toFixed(1)}%`
                : "--"
            }
            tone={
              returnOnRisk != null
                ? returnOnRisk >= 0
                  ? "profit"
                  : "loss"
                : undefined
            }
          />
          <Metric
            label="Chance of profit"
            value={formatPercent(detail.summary.chanceOfProfitAtExpiration)}
            tone={
              detail.summary.chanceOfProfitAtExpiration > 0.5
                ? "profit"
                : "neutral"
            }
          />
          <Metric
            label="Max profit"
            value={formatNullableCurrency(detail.summary.maxProfit)}
            tone="profit"
          />
          <Metric
            label="Max loss"
            value={formatNullableCurrency(detail.summary.maxLoss)}
            tone="loss"
          />
        </div>
      </CardContent>

      <CardFooter className="px-5 pb-4 pt-0">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="w-full border-white/[0.08] font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground/60 hover:border-primary/30 hover:text-primary"
        >
          <Link href={builderHref}>Open in Builder</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "profit" | "loss" | "neutral";
}) {
  const toneClasses = {
    profit: "text-profit",
    loss: "text-loss",
    neutral: "text-foreground",
  };

  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 transition-colors hover:bg-white/[0.03]">
      <div className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground/50">
        {label}
      </div>
      <div
        className={`mt-1 font-mono text-sm font-medium ${tone ? toneClasses[tone] : toneClasses.neutral}`}
      >
        {value}
      </div>
    </div>
  );
}

function gradientId(name: string) {
  return `optimize-${name.toLowerCase().replace(/\s+/g, "-")}`;
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

function formatLegSummary(legs: OptimizerCandidate["legs"]) {
  return legs
    .map((leg) => {
      if (leg.kind === "stock") {
        return `${capitalize(leg.side)} stock`;
      }
      return `${capitalize(leg.side)} ${leg.right === "C" ? "call" : "put"} ${Math.round(leg.strike ?? 0)}`;
    })
    .join(" · ");
}

function capitalize(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}
