"use client";

import { useRouter } from "next/navigation";
import type React from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDecimal } from "@/lib/format";
import {
  createBuilderState,
  evaluateStrategy,
  getBuilderChain,
  getBuilderOptionLeg,
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
  const leg = getBuilderOptionLeg(state);
  const expiration =
    chain.expirations.find(
      (candidate) => candidate.expiration === leg.expiration,
    ) ?? chain.expirations[0];
  const quotes =
    state.strategy === "long-put" ? expiration?.puts : expiration?.calls;
  const selectedQuote = quotes?.find((quote) => quote.strike === leg.strike);
  const evaluation = useMemo(() => evaluateStrategy(state), [state]);

  function commitState(next: StrategyState) {
    setState(next);
    router.replace(serializeBuilderState(next), { scroll: false });
  }

  function updateFromInputs(input: Parameters<typeof createBuilderState>[0]) {
    const next = createBuilderState({
      symbol: state.symbol,
      expiration: leg.expiration,
      strike: leg.strike,
      quantity: leg.quantity,
      ...input,
      strategy: state.strategy,
    });

    commitState(next);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6">
        <header className="border-b pb-5">
          <p className="font-medium text-muted-foreground text-sm">
            Options Planner
          </p>
          <h1 className="font-semibold text-3xl tracking-normal">
            Strategy builder
          </h1>
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

                  <InfoPanel label="Strategy">
                    {state.strategy.replaceAll("-", " ")}
                  </InfoPanel>

                  <Field>
                    <FieldLabel htmlFor="expiration">Expiration</FieldLabel>
                    <Select
                      id="expiration"
                      value={leg.expiration}
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

                  <Field>
                    <FieldLabel htmlFor="strike">Strike</FieldLabel>
                    <Select
                      id="strike"
                      value={leg.strike}
                      onValueChange={(value) => {
                        if (value !== null) {
                          updateFromInputs({ strike: Number(value) });
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {quotes?.map((quote) => (
                          <SelectItem key={quote.strike} value={quote.strike}>
                            {formatCurrency(quote.strike)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

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
                      value={leg.quantity}
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
                  <SummaryRow label="Expiration" value={leg.expiration} />
                  <SummaryRow
                    label="Position"
                    value={`${leg.quantity} long ${leg.optionType} @ ${formatCurrency(
                      leg.strike,
                    )}`}
                  />
                </dl>
              </CardContent>
            </Card>
          </section>
        </section>
      </div>
    </main>
  );
}

function InfoPanel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-muted p-3">
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
    <div className="rounded-3xl bg-muted p-3">
      <dt className="font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
