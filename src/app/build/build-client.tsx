"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { BiasBadge, STRATEGY_BIAS } from "@/components/bias-badge";
import { DebugDrawer } from "@/components/debug-drawer";
import { StrikeSlider } from "@/components/strike-slider";
import { TickerCombobox } from "@/components/ticker-combobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
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
  type SaveStrategyResult,
  saveBuilderStrategy,
} from "@/lib/build-actions";
import { formatCurrency, formatDecimal, formatPercent } from "@/lib/format";
import { builderStrategyHref, strategyBuilderHref } from "@/lib/hrefs";
import {
  type BuildStrategyInput,
  type OptionChainSnapshot,
  type OptionExpiration,
  type OptionLeg,
  type OptionQuote,
  type StrategyState,
  safeEvaluateStrategy,
  strategyTemplates,
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
  const [debugOpen, setDebugOpen] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveStrategyResult | null>(null);
  const [isSaving, startSaving] = useTransition();
  const chain = initialChain;
  const optionLegs = state.legs.filter(
    (leg): leg is OptionLeg => leg.kind === "option",
  );
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
    () => (debugOpen ? JSON.stringify(initialChain, null, 2) : ""),
    [debugOpen, initialChain],
  );
  const currentValuesDebugJson = useMemo(
    () =>
      debugOpen
        ? JSON.stringify(
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
          )
        : "",
    [debugOpen, state, expiration, optionLegs, evaluation, evaluationResult],
  );

  function commitState(next: StrategyState) {
    setState(next);
    window.history.replaceState(null, "", strategyBuilderHref(next));
  }

  function updateFromInputs(input: BuildStrategyInput) {
    const next = strategyTemplates.build({
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

  function navigateToSymbol(symbol: string) {
    router.push(builderStrategyHref(state.strategy, symbol));
  }

  function saveCurrentStrategy() {
    if (!evaluationResult.valid) {
      return;
    }

    setSaveResult(null);
    startSaving(async () => {
      const result = await saveBuilderStrategy(state);
      setSaveResult(result);
    });
  }

  return (
    <>
      <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {formatStrategyName(state.strategy)}
          </h1>
          <BiasBadge bias={STRATEGY_BIAS[state.strategy]} />
        </div>
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <Button
            disabled={!evaluationResult.valid || isSaving}
            size="sm"
            type="button"
            onClick={saveCurrentStrategy}
          >
            <Save data-icon="inline-start" />
            {isSaving ? "Saving" : "Save strategy"}
          </Button>
          {saveResult && (
            <p
              className={cn(
                "max-w-sm text-pretty text-xs",
                saveResult.ok ? "text-muted-foreground" : "text-destructive",
              )}
            >
              {saveResult.ok ? `Saved as ${saveResult.name}` : saveResult.error}
            </p>
          )}
        </div>
      </section>

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

      {expiration && optionLegs.length > 0 && (
        <StrikeSlider
          legs={optionLegs}
          expiration={expiration}
          underlyingPrice={state.underlyingPrice}
          symbol={state.symbol}
          onLegStrikeChange={(index, strike) =>
            updateFromInputs(strikeInput(index, strike))
          }
        />
      )}

      <section className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <aside>
          <Card className="h-fit" size="sm">
            <CardContent>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="symbol">Symbol</FieldLabel>
                  <TickerCombobox
                    defaultSymbol={state.symbol}
                    onNavigate={navigateToSymbol}
                  />
                  <div className="flex items-center gap-2 pt-1.5">
                    <span className="font-mono text-lg font-bold tabular-nums">
                      {formatCurrency(chain.underlying.price)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {chain.expirations[0]?.calls[0]?.provider ?? "generated"}
                    </Badge>
                  </div>
                </Field>

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
              </FieldGroup>
            </CardContent>
          </Card>
        </aside>

        {evaluation ? (
          <section className="flex flex-col gap-5">
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
                      tickFormatter={(value) => formatCurrency(Number(value))}
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
                            const price = payload[0]?.payload?.underlyingPrice;

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

            <Card>
              <CardHeader>
                <CardTitle>Leg Greeks</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Leg</TableHead>
                      <TableHead className="font-mono">IV</TableHead>
                      <TableHead className="font-mono">Δ Delta</TableHead>
                      <TableHead className="font-mono">Γ Gamma</TableHead>
                      <TableHead className="font-mono">Θ Theta</TableHead>
                      <TableHead className="font-mono">V Vega</TableHead>
                      <TableHead className="font-mono">ρ Rho</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluation.legs.map((evaluatedLeg) => (
                      <TableRow key={legRowKey(evaluatedLeg.leg)}>
                        <TableCell className="font-medium">
                          <LegDescription leg={evaluatedLeg.leg} />
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">
                          {evaluatedLeg.leg.kind === "option"
                            ? formatPercent(evaluatedLeg.leg.impliedVolatility)
                            : "—"}
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">
                          {formatDecimal(evaluatedLeg.greeks.delta)}
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">
                          {formatDecimal(evaluatedLeg.greeks.gamma)}
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">
                          {formatCurrency(evaluatedLeg.greeks.theta)}
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">
                          {formatCurrency(evaluatedLeg.greeks.vega)}
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">
                          {formatCurrency(evaluatedLeg.greeks.rho)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

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
                        ? evaluation.breakevens.map(formatCurrency).join(", ")
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
    </>
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

function legRowKey(leg: StrategyState["legs"][number]) {
  if (leg.kind === "stock") return `stock-${leg.side}`;
  return `option-${leg.optionType}-${leg.side}-${leg.strike}-${leg.expiration}`;
}

function formatStrategyName(strategy: StrategyState["strategy"]) {
  return strategyTemplates.get(strategy).label;
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
