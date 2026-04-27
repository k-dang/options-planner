"use client";

import Link from "next/link";
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
  evaluateStrategy,
  getBuilderChain,
  getBuilderOptionLegs,
  type OptionExpiration,
  type OptionLeg,
  type OptionQuote,
  type StrategyState,
  serializeBuilderState,
} from "@/lib/options";

type BuilderClientProps = {
  initialState: StrategyState;
};

export function BuilderClient({ initialState }: BuilderClientProps) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [symbolDraft, setSymbolDraft] = useState(initialState.symbol);
  const chain = useMemo(() => getBuilderChain(state), [state]);
  const optionLegs = getBuilderOptionLegs(state);
  const primaryLeg = optionLegs[0];
  const secondaryLeg = optionLegs[1];
  const expiration =
    chain.expirations.find(
      (candidate) => candidate.expiration === primaryLeg?.expiration,
    ) ?? chain.expirations[0];
  const primaryQuotes = quotesForLeg(expiration, primaryLeg);
  const selectedQuote = primaryQuotes?.find(
    (quote) => quote.strike === primaryLeg?.strike,
  );
  const evaluation = useMemo(() => evaluateStrategy(state), [state]);

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
      strategy: state.strategy,
    });

    commitState(next);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6">
        <header className="flex items-start justify-between border-b pb-5">
          <div>
            <p className="font-medium text-muted-foreground text-sm">
              Options Planner
            </p>
            <h1 className="font-semibold text-3xl tracking-normal">
              Strategy builder
            </h1>
          </div>
          <Link className="text-sm" href="/optimize">
            Optimizer
          </Link>
        </header>

        <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <aside>
            <Card className="h-fit" size="sm">
              <CardContent>
                <FieldGroup className="gap-4">
                  <Field>
                    <FieldLabel htmlFor="symbol">Symbol</FieldLabel>
                    <div className="flex gap-2">
                      <Input
                        className="uppercase"
                        id="symbol"
                        value={symbolDraft}
                        onChange={(event) => setSymbolDraft(event.target.value)}
                      />
                      <Button
                        type="button"
                        onClick={() =>
                          updateFromInputs({ symbol: symbolDraft })
                        }
                      >
                        Load
                      </Button>
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
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {chain.expirations.map((candidate) => (
                          <SelectItem
                            key={candidate.expiration}
                            value={candidate.expiration}
                          >
                            {candidate.expiration} ({candidate.daysToExpiration}
                            d)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

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

                  <InfoPanel label="Option price">
                    {selectedQuote ? formatCurrency(selectedQuote.mid) : "n/a"}
                  </InfoPanel>

                  <Field>
                    <FieldLabel htmlFor="contracts">Contracts</FieldLabel>
                    <Input
                      id="contracts"
                      min="1"
                      step="1"
                      type="number"
                      value={primaryLeg?.quantity ?? 1}
                      onChange={(event) => {
                        const quantity = Number(event.target.value);

                        if (Number.isFinite(quantity) && quantity >= 1) {
                          updateFromInputs({ quantity: Math.floor(quantity) });
                        }
                      }}
                    />
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>
          </aside>

          <section className="grid gap-5">
            <Card>
              <CardContent className="grid gap-4 md:grid-cols-4">
                <Metric
                  label="Underlying"
                  value={formatCurrency(state.underlyingPrice)}
                />
                <Metric
                  label="Max profit"
                  value={formatCurrency(evaluation.maxProfit)}
                />
                <Metric
                  label="Max loss"
                  value={formatCurrency(evaluation.maxLoss)}
                />
                <Metric
                  label="Capital usage"
                  value={formatCurrency(evaluation.capitalRequired)}
                />
                <Metric
                  label="Estimated Probability of Profit"
                  value={formatPercent(evaluation.probabilityOfProfit)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payoff analysis</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <ChartContainer
                  className="aspect-[2.4/1] min-h-80"
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
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="underlyingPrice"
                      tickFormatter={(value) => `$${value}`}
                      type="number"
                      domain={["dataMin", "dataMax"]}
                    />
                    <YAxis
                      tickFormatter={(value) => formatCurrency(Number(value))}
                      width={76}
                    />
                    <ReferenceLine y={0} stroke="var(--muted-foreground)" />
                    <ReferenceLine
                      x={state.underlyingPrice}
                      stroke="var(--muted-foreground)"
                      strokeDasharray="4 4"
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
                      strokeWidth={2}
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
                <p className="text-muted-foreground text-sm">
                  Expiration P/L uses intrinsic value at the selected expiry.
                  Model P/L today and estimated probability of profit are
                  Black-Scholes estimates using generated bid/ask mids, leg IV,
                  the current quote date, no dividends, and a fixed risk-free
                  rate. Sample chains are deterministic planning inputs, not
                  live market data.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trade summary</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 text-sm md:grid-cols-2">
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
                    label="Net debit"
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
                    value={optionLegs.map(describeLeg).join(" / ")}
                  />
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leg Greeks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-4 font-medium">Leg</th>
                        <th className="py-2 pr-4 font-medium">Delta</th>
                        <th className="py-2 pr-4 font-medium">Gamma</th>
                        <th className="py-2 pr-4 font-medium">Theta</th>
                        <th className="py-2 pr-4 font-medium">Vega</th>
                        <th className="py-2 font-medium">Rho</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluation.legs.map((evaluatedLeg, index) => (
                        <tr
                          className="border-b last:border-b-0"
                          key={`${evaluatedLeg.leg.kind}-${index}`}
                        >
                          <td className="py-3 pr-4 font-medium">
                            {describeLeg(evaluatedLeg.leg)}
                          </td>
                          <td className="py-3 pr-4">
                            {formatDecimal(evaluatedLeg.greeks.delta)}
                          </td>
                          <td className="py-3 pr-4">
                            {formatDecimal(evaluatedLeg.greeks.gamma)}
                          </td>
                          <td className="py-3 pr-4">
                            {formatCurrency(evaluatedLeg.greeks.theta)}
                          </td>
                          <td className="py-3 pr-4">
                            {formatCurrency(evaluatedLeg.greeks.vega)}
                          </td>
                          <td className="py-3">
                            {formatCurrency(evaluatedLeg.greeks.rho)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        </section>
      </div>
    </main>
  );
}

function quotesForLeg(
  expiration: OptionExpiration,
  leg?: OptionLeg,
): OptionQuote[] {
  if (!leg) {
    return [];
  }

  return leg.optionType === "put" ? expiration.puts : expiration.calls;
}

function strikeInput(index: number, strike: number) {
  if (index === 0) {
    return { strike };
  }

  if (index === 1) {
    return { strike2: strike };
  }

  if (index === 2) {
    return { strike3: strike };
  }

  return { strike4: strike };
}

function strikeLabel(leg: OptionLeg) {
  return `${leg.side} ${leg.optionType} strike`;
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
          if (nextValue !== null) {
            onChange(Number(nextValue));
          }
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {quotes?.map((quote) => (
            <SelectItem key={quote.strike} value={String(quote.strike)}>
              {formatCurrency(quote.strike)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function describeLeg(leg: StrategyState["legs"][number]) {
  if (leg.kind === "stock") {
    return `${leg.quantity} ${leg.side} shares @ ${formatCurrency(
      leg.entryPrice,
    )}`;
  }

  return `${leg.quantity} ${leg.side} ${leg.optionType} ${formatCurrency(
    leg.strike,
  )} ${leg.expiration}`;
}

function InfoPanel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <p className="font-medium text-muted-foreground text-sm">{label}</p>
      <p className="mt-1 font-semibold capitalize">{children}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-medium text-muted-foreground text-sm">{label}</p>
      <p className="mt-1 font-semibold text-2xl">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
