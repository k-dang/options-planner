"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
    <main className="min-h-screen bg-[#f4f1ea] text-[#1f2933]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6">
        <header className="border-[#1f2933]/15 border-b pb-5">
          <p className="font-medium text-[#58616f] text-sm">Options Planner</p>
          <h1 className="font-semibold text-3xl tracking-normal">
            Strategy builder
          </h1>
        </header>

        <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <aside className="rounded-lg border border-[#d4c8b8] bg-white p-4 shadow-sm">
            <div className="grid gap-4">
              <label className="grid gap-2 font-medium text-sm">
                Symbol
                <div className="flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-md border border-[#c7bbaa] px-3 py-2 uppercase"
                    value={symbolDraft}
                    onChange={(event) => setSymbolDraft(event.target.value)}
                  />
                  <button
                    className="rounded-md bg-[#266867] px-3 py-2 font-medium text-sm text-white"
                    type="button"
                    onClick={() => updateFromInputs({ symbol: symbolDraft })}
                  >
                    Load
                  </button>
                </div>
              </label>

              <div className="rounded-md bg-[#f7f3ec] p-3">
                <p className="font-medium text-[#58616f] text-sm">Strategy</p>
                <p className="mt-1 font-semibold capitalize">
                  {state.strategy.replaceAll("-", " ")}
                </p>
              </div>

              <label className="grid gap-2 font-medium text-sm">
                Expiration
                <select
                  className="rounded-md border border-[#c7bbaa] px-3 py-2"
                  value={leg.expiration}
                  onChange={(event) =>
                    updateFromInputs({ expiration: event.target.value })
                  }
                >
                  {chain.expirations.map((candidate) => (
                    <option
                      key={candidate.expiration}
                      value={candidate.expiration}
                    >
                      {candidate.expiration} ({candidate.daysToExpiration}d)
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 font-medium text-sm">
                Strike
                <select
                  className="rounded-md border border-[#c7bbaa] px-3 py-2"
                  value={leg.strike}
                  onChange={(event) =>
                    updateFromInputs({ strike: Number(event.target.value) })
                  }
                >
                  {quotes?.map((quote) => (
                    <option key={quote.strike} value={quote.strike}>
                      {formatCurrency(quote.strike)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-md bg-[#f7f3ec] p-3">
                <p className="font-medium text-[#58616f] text-sm">
                  Option price
                </p>
                <p className="mt-1 font-semibold">
                  {selectedQuote ? formatCurrency(selectedQuote.mid) : "n/a"}
                </p>
              </div>

              <div className="grid gap-3">
                <label className="grid gap-2 font-medium text-sm">
                  Contracts
                  <input
                    className="rounded-md border border-[#c7bbaa] px-3 py-2"
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
                </label>
              </div>
            </div>
          </aside>

          <section className="grid gap-5">
            <div className="grid gap-4 rounded-lg border border-[#d4c8b8] bg-white p-5 shadow-sm md:grid-cols-4">
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
            </div>

            <div className="rounded-lg border border-[#d4c8b8] bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-xl">Trade summary</h2>
              <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
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
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-medium text-[#58616f] text-sm">{label}</p>
      <p className="mt-1 font-semibold text-2xl">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-[#f7f3ec] p-3">
      <dt className="font-medium text-[#58616f]">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
