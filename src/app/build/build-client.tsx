"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { DebugDrawer } from "@/components/debug-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDecimal, formatPercent } from "@/lib/format";
import {
  createBuilderState,
  getBuilderOptionLegs,
  type OptionChainSnapshot,
  type OptionExpiration,
  type OptionLeg,
  type OptionQuote,
  type StrategyState,
  safeEvaluateStrategy,
  serializeBuilderState,
} from "@/lib/options";
import { cn } from "@/lib/utils";

type BuilderClientProps = {
  initialChain: OptionChainSnapshot;
  initialState: StrategyState;
};

export function BuilderClient({
  initialChain,
  initialState,
}: BuilderClientProps) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [symbolDraft, setSymbolDraft] = useState(initialState.symbol);
  const [debugOpen, setDebugOpen] = useState(false);
  const chain = initialChain;
  const optionLegs = getBuilderOptionLegs(state);
  const primaryLeg = optionLegs[0];
  const secondaryLeg = optionLegs[1];
  const expiration =
    chain.expirations.find(
      (candidate) => candidate.expiration === primaryLeg?.expiration,
    ) ?? chain.expirations[0];
  const evaluationResult = useMemo(() => safeEvaluateStrategy(state), [state]);
  const evaluation = evaluationResult.evaluation;
  const netPremiumLabel =
    evaluation === null
      ? "Net premium"
      : evaluation.netPremium > 0
        ? "Net credit"
        : evaluation.netPremium < 0
          ? "Net debit"
          : "Net premium";
  const initialChainDebugJson = useMemo(
    () => JSON.stringify(initialChain, null, 2),
    [initialChain],
  );
  const currentValuesDebugJson = useMemo(
    () =>
      JSON.stringify(
        {
          strategy: state.strategy,
          symbol: state.symbol,
          underlyingPrice: state.underlyingPrice,
          asOf: state.asOf,
          selectedExpiration: expiration
            ? {
                expiration: expiration.expiration,
                daysToExpiration: expiration.daysToExpiration,
                callCount: expiration.calls.length,
                putCount: expiration.puts.length,
              }
            : null,
          selectedLegs: optionLegs.map((leg) => ({
            stateLeg: leg,
            chainQuote:
              quotesForLeg(expiration, leg).find(
                (quote) => quote.strike === leg.strike,
              ) ?? null,
          })),
          evaluation: {
            valid: evaluationResult.valid,
            errors: evaluationResult.errors,
            netPremium: evaluation?.netPremium ?? null,
            maxProfit: evaluation?.maxProfit ?? null,
            maxLoss: evaluation?.maxLoss ?? null,
            breakevens: evaluation?.breakevens ?? [],
            probabilityOfProfit: evaluation?.probabilityOfProfit ?? null,
          },
        },
        null,
        2,
      ),
    [state, expiration, optionLegs, evaluation, evaluationResult],
  );

  function commitState(next: StrategyState) {
    setState(next);
    router.replace(serializeBuilderState(next), { scroll: false });
  }

  function updateFromInputs(input: Parameters<typeof createBuilderState>[0]) {
    const next = createBuilderState({
      symbol: state.symbol,
      expiration: primaryLeg?.expiration,
      strike: primaryLeg?.strike,
      strike2: secondaryLeg?.strike,
      strike3: optionLegs[2]?.strike,
      strike4: optionLegs[3]?.strike,
      quantity: primaryLeg?.quantity,
      ...input,
      chain,
      strategy: state.strategy,
    });

    commitState(next);
  }

  function loadSymbol() {
    const symbol = symbolDraft.trim().toUpperCase() || state.symbol;

    router.push(
      `/build/${encodeURIComponent(state.strategy)}/${encodeURIComponent(symbol)}`,
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        {/* Page header */}
        <header>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            Options Planner · Builder
          </p>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight">
            {formatStrategyName(state.strategy)}
          </h1>
        </header>

        {/* Metric strip — shown when evaluation is available */}
        {evaluation && (
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            <MetricTile
              label="Max profit"
              value={formatCurrency(evaluation.maxProfit)}
              color="profit"
            />
            <MetricTile
              label="Max loss"
              value={formatCurrency(evaluation.maxLoss)}
              color="loss"
            />
            <MetricTile
              label="Prob. of profit"
              value={formatPercent(evaluation.probabilityOfProfit)}
              color="primary"
            />
            <MetricTile
              label={netPremiumLabel}
              value={formatCurrency(Math.abs(evaluation.netPremium))}
            />
            <MetricTile
              label="Breakeven"
              value={
                evaluation.breakevens.length
                  ? evaluation.breakevens.map(formatCurrency).join(", ")
                  : "None"
              }
            />
          </section>
        )}

        {/* Two-column layout */}
        <section className="grid gap-5 lg:grid-cols-[340px_1fr]">
          {/* Sidebar: strategy controls */}
          <aside>
            <Card className="h-fit" size="sm">
              <CardContent>
                <FieldGroup className="gap-4">
                  {/* Symbol */}
                  <Field>
                    <FieldLabel htmlFor="symbol">Symbol</FieldLabel>
                    <div className="flex gap-2">
                      <Input
                        className="font-mono uppercase"
                        id="symbol"
                        value={symbolDraft}
                        onChange={(event) => setSymbolDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") loadSymbol();
                        }}
                      />
                      <Button type="button" onClick={loadSymbol}>
                        Load
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 pt-1.5">
                      <span className="font-mono text-lg font-bold tabular-nums">
                        {formatCurrency(chain.underlying.price)}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {chain.expirations[0]?.calls[0]?.provider ??
                          "generated"}
                      </Badge>
                    </div>
                  </Field>

                  {/* Expiration */}
                  <Field>
                    <FieldLabel htmlFor="expiration">Expiration</FieldLabel>
                    <Select
                      id="expiration"
                      value={primaryLeg?.expiration}
                      onValueChange={(value) => {
                        if (value !== null) {
                          updateFromInputs({ expiration: value });
                        }
                      }}
                    >
                      <SelectTrigger className="w-full font-mono">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {chain.expirations.map((candidate) => (
                          <SelectItem
                            key={candidate.expiration}
                            value={candidate.expiration}
                          >
                            {candidate.expiration}{" "}
                            <span className="text-muted-foreground">
                              ({candidate.daysToExpiration}d)
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  {/* Strike selects */}
                  {optionLegs.map((leg, index) => (
                    <StrikeSelect
                      id={`strike${index + 1}`}
                      key={`${leg.optionType}-${leg.side}-${index}`}
                      label={strikeLabel(leg)}
                      quotes={quotesForLeg(expiration, leg)}
                      value={leg.strike}
                      onChange={(strike) =>
                        updateFromInputs(strikeInput(index, strike))
                      }
                    />
                  ))}

                </FieldGroup>
              </CardContent>
            </Card>

          </aside>

          {/* Main analysis area */}
          {evaluation ? (
            <section className="flex flex-col gap-5">
              {/* Payoff chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Payoff Analysis</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <ChartContainer
                    className="aspect-[2.4/1] min-h-72"
                    config={{
                      expirationProfitLoss: {
                        label: "Expiration P/L",
                        color: "var(--chart-1)",
                      },
                      modelProfitLoss: {
                        label: "Model P/L today",
                        color: "var(--chart-2)",
                      },
                    }}
                  >
                    <LineChart
                      accessibilityLayer
                      data={evaluation.payoff}
                      margin={{ left: 16, right: 16, top: 12, bottom: 8 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke="var(--border)"
                        strokeOpacity={0.5}
                      />
                      <XAxis
                        dataKey="underlyingPrice"
                        tickFormatter={(value) => `$${value}`}
                        type="number"
                        domain={["dataMin", "dataMax"]}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        tickFormatter={(value) =>
                          formatCurrency(Number(value))
                        }
                        width={76}
                        tick={{ fontSize: 11 }}
                      />
                      <ReferenceLine
                        y={0}
                        stroke="var(--border)"
                        strokeWidth={1.5}
                      />
                      <ReferenceLine
                        x={state.underlyingPrice}
                        stroke="var(--muted-foreground)"
                        strokeDasharray="4 4"
                        strokeWidth={1}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            labelFormatter={(_, payload) => {
                              const price =
                                payload[0]?.payload?.underlyingPrice;

                              return price
                                ? `Underlying ${formatCurrency(price)}`
                                : "Underlying";
                            }}
                          />
                        }
                      />
                      <Line
                        dataKey="expirationProfitLoss"
                        dot={false}
                        name="Expiration P/L"
                        stroke="var(--color-expirationProfitLoss)"
                        strokeWidth={2.5}
                        type="monotone"
                      />
                      <Line
                        dataKey="modelProfitLoss"
                        dot={false}
                        name="Model P/L today"
                        stroke="var(--color-modelProfitLoss)"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        type="monotone"
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Leg Greeks */}
              <Card>
                <CardHeader>
                  <CardTitle>Leg Greeks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-border text-muted-foreground">
                        <tr>
                          <th className="pb-2 pr-4 font-medium">Leg</th>
                          <th className="pb-2 pr-4 font-mono font-medium">IV</th>
                          <th className="pb-2 pr-4 font-mono font-medium">Δ Delta</th>
                          <th className="pb-2 pr-4 font-mono font-medium">Γ Gamma</th>
                          <th className="pb-2 pr-4 font-mono font-medium">Θ Theta</th>
                          <th className="pb-2 pr-4 font-mono font-medium">V Vega</th>
                          <th className="pb-2 font-mono font-medium">ρ Rho</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evaluation.legs.map((evaluatedLeg, index) => (
                          <tr
                            className="border-b border-border/50 last:border-b-0"
                            key={`${evaluatedLeg.leg.kind}-${index}`}
                          >
                            <td className="py-3 pr-4 font-medium">
                              <LegDescription leg={evaluatedLeg.leg} />
                            </td>
                            <td className="py-3 pr-4 font-mono tabular-nums">
                              {evaluatedLeg.leg.kind === "option"
                                ? formatPercent(evaluatedLeg.leg.impliedVolatility)
                                : "—"}
                            </td>
                            <td className="py-3 pr-4 font-mono tabular-nums">
                              {formatDecimal(evaluatedLeg.greeks.delta)}
                            </td>
                            <td className="py-3 pr-4 font-mono tabular-nums">
                              {formatDecimal(evaluatedLeg.greeks.gamma)}
                            </td>
                            <td className="py-3 pr-4 font-mono tabular-nums">
                              {formatCurrency(evaluatedLeg.greeks.theta)}
                            </td>
                            <td className="py-3 pr-4 font-mono tabular-nums">
                              {formatCurrency(evaluatedLeg.greeks.vega)}
                            </td>
                            <td className="py-3 font-mono tabular-nums">
                              {formatCurrency(evaluatedLeg.greeks.rho)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Trade summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Trade Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <SummaryRow label="Symbol" value={state.symbol} />
                    <SummaryRow
                      label="Breakeven"
                      value={
                        evaluation.breakevens.length
                          ? evaluation.breakevens
                              .map(formatCurrency)
                              .join(", ")
                          : "None in modeled range"
                      }
                    />
                    <SummaryRow
                      label={netPremiumLabel}
                      value={formatCurrency(Math.abs(evaluation.netPremium))}
                    />
                    <SummaryRow
                      label="Delta"
                      value={formatDecimal(evaluation.greeks.delta)}
                    />
                    <SummaryRow
                      label="Gamma"
                      value={formatDecimal(evaluation.greeks.gamma)}
                    />
                    <SummaryRow
                      label="Theta / day"
                      value={formatCurrency(evaluation.greeks.theta)}
                    />
                    <SummaryRow
                      label="Vega / vol point"
                      value={formatCurrency(evaluation.greeks.vega)}
                    />
                    <SummaryRow
                      label="Expiration"
                      value={primaryLeg?.expiration ?? "n/a"}
                    />
                    <SummaryRow
                      label="Position"
                      value={optionLegs.map(describeLegText).join(" / ")}
                    />
                  </dl>
                </CardContent>
              </Card>

            </section>
          ) : (
            <ValidationPanel errors={evaluationResult.errors} />
          )}
        </section>
      </div>

      <DebugDrawer
        closeLabel="Close chain debug panel"
        openLabel="Open chain debug panel"
        open={debugOpen}
        panels={[
          {
            title: "Currently used values",
            value: currentValuesDebugJson,
          },
          {
            title: "Full initialChain payload",
            value: initialChainDebugJson,
          },
        ]}
        subtitle={`Provider ${
          chain.expirations[0]?.calls[0]?.provider ?? "n/a"
        } · ${chain.underlying.symbol} ${formatCurrency(
          chain.underlying.price,
        )}`}
        summary={[
          { label: "As of", value: chain.underlying.asOf },
          { label: "Expirations", value: String(chain.expirations.length) },
        ]}
        title="Initial chain debug"
        onClose={() => setDebugOpen(false)}
        onOpen={() => setDebugOpen(true)}
      />
    </main>
  );
}

function ValidationPanel({ errors }: { errors: string[] }) {
  return (
    <section className="flex flex-col gap-4">
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">
            Strategy needs attention
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            The selected legs do not form a valid strategy. Adjust strikes,
            expiration, or contracts to continue.
          </p>
          <ul className="flex flex-col gap-1.5">
            {errors.map((error) => (
              <li
                className="rounded-lg border border-destructive/20 bg-background px-3 py-2.5 text-sm"
                key={error}
              >
                {error}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

function quotesForLeg(
  expiration: OptionExpiration,
  leg?: OptionLeg,
): OptionQuote[] {
  if (!leg) return [];
  return leg.optionType === "put" ? expiration.puts : expiration.calls;
}

function strikeInput(index: number, strike: number) {
  if (index === 0) return { strike };
  if (index === 1) return { strike2: strike };
  if (index === 2) return { strike3: strike };
  return { strike4: strike };
}

function strikeLabel(leg: OptionLeg) {
  return `${legAction(leg)} ${leg.optionType} strike`;
}

function formatStrategyName(strategy: StrategyState["strategy"]) {
  return strategy
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function StrikeSelect({
  id,
  label,
  quotes,
  value,
  onChange,
}: {
  id: string;
  label: string;
  quotes?: OptionQuote[];
  value?: number;
  onChange: (strike: number) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        id={id}
        value={value === undefined ? undefined : String(value)}
        onValueChange={(nextValue) => {
          if (nextValue !== null) onChange(Number(nextValue));
        }}
      >
        <SelectTrigger className="w-full font-mono">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {quotes?.map((quote) => (
            <SelectItem
              key={quote.strike}
              value={String(quote.strike)}
              className="font-mono"
            >
              {formatCurrency(quote.strike)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function describeLegText(leg: StrategyState["legs"][number]) {
  if (leg.kind === "stock") {
    return `${leg.quantity} ${leg.side === "long" ? "bought" : "sold"} shares @ ${formatCurrency(
      leg.entryPrice,
    )}`;
  }

  return `${leg.quantity} ${legAction(leg)} ${leg.optionType} ${formatCurrency(
    leg.strike,
  )} ${leg.expiration}`;
}

function LegDescription({ leg }: { leg: StrategyState["legs"][number] }) {
  if (leg.kind === "stock") {
    return <span className="font-mono text-xs">{describeLegText(leg)}</span>;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge variant={leg.side === "long" ? "default" : "destructive"}>
        {legAction(leg)}
      </Badge>
      <span className="font-mono text-xs">
        {leg.quantity} {leg.optionType} {formatCurrency(leg.strike)}{" "}
        {leg.expiration}
      </span>
    </span>
  );
}

function legAction(leg: OptionLeg) {
  return leg.side === "long" ? "Buy" : "Sell";
}

type MetricColor = "profit" | "loss" | "primary" | "default";

function MetricTile({
  label,
  value,
  color = "default",
}: {
  label: string;
  value: string;
  color?: MetricColor;
}) {
  const valueClass = cn(
    "font-mono text-xl font-bold tabular-nums leading-none",
    color === "profit" && "text-profit",
    color === "loss" && "text-destructive",
    color === "primary" && "text-primary",
    color === "default" && "text-foreground",
  );

  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-1.5", valueClass)}>{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums">
        {value}
      </dd>
    </div>
  );
}
