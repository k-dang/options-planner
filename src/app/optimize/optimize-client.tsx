"use client";

import { useRouter } from "next/navigation";
import { useDeferredValue, useState } from "react";
import { ExpirationTimeline } from "@/app/optimize/expiration-timeline";
import { StrategyCard } from "@/app/optimize/strategy-card";
import {
  formatTargetPriceDraft,
  parseTargetPriceDraft,
} from "@/app/optimize/target-price";
import { DebugDrawer } from "@/components/debug-drawer";
import { TickerCombobox } from "@/components/ticker-combobox";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Slider } from "@/components/ui/slider";
import { formatPercent, formatPrice } from "@/lib/format";
import { optimizeSymbolHref } from "@/lib/hrefs";
import {
  defaultTargetUnderlyingPrice,
  enumerateOptimizerCandidates,
  type OptimizerCandidate,
  type OptimizerInputs,
  type OptimizerThesis,
  type OptionChainSnapshot,
  payoffPriceRange,
  rankOptimizerCandidates,
  rankOptimizerShortlist,
} from "@/lib/options";
import { cn } from "@/lib/utils";

const THESIS_OPTIONS = [
  ["bearish", "Bearish"],
  ["income", "Income"],
  ["bullish", "Bullish"],
] as [OptimizerThesis, string][];

const IS_DEV = process.env.NODE_ENV === "development";

const SNAPSHOT_TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
  timeZoneName: "short",
});

const EXPIRATION_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const DEFAULT_INPUTS: OptimizerInputs = {
  symbol: "AAPL",
  thesis: "bullish",
  returnChanceWeight: 50,
  minDaysToExpiration: 20,
  maxDaysToExpiration: 70,
  minProbabilityOfProfit: 0,
};

export function OptimizeClient({
  initialChain,
}: {
  initialChain: OptionChainSnapshot;
}) {
  const router = useRouter();
  const defaultExpiration =
    initialChain.expirations.find((e) => e.daysToExpiration >= 30)
      ?.expiration ?? initialChain.expirations[0]?.expiration;
  const initialTargetUnderlyingPrice = defaultTargetUnderlyingPrice(
    DEFAULT_INPUTS.thesis,
    initialChain.underlying.price,
  );
  const [inputs, setInputs] = useState<OptimizerInputs>(() => ({
    ...DEFAULT_INPUTS,
    symbol: initialChain.underlying.symbol,
    expiration: defaultExpiration,
    targetUnderlyingPrice: initialTargetUnderlyingPrice,
  }));
  const [targetUnderlyingDraft, setTargetUnderlyingDraft] = useState(() =>
    formatTargetPriceDraft(initialTargetUnderlyingPrice),
  );
  const [targetTouched, setTargetTouched] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const chain = initialChain;
  const provider = chain.expirations[0]?.calls[0]?.provider ?? "unknown";
  const candidates = enumerateOptimizerCandidates(inputs, chain);
  const deferredWeight = useDeferredValue(inputs.returnChanceWeight);
  const strategyCards = selectTopStrategyCards(deferredWeight, candidates);
  const topCandidate = strategyCards[0];
  const alternativeCards = strategyCards.slice(1);
  const chartTarget =
    topCandidate?.summary.targetUnderlyingPrice ?? chain.underlying.price;
  const targetRange = payoffPriceRange(chain.underlying.price);
  const targetResult = parseTargetPriceDraft(
    targetUnderlyingDraft,
    targetRange,
  );
  const appliedTarget =
    inputs.targetUnderlyingPrice ?? initialTargetUnderlyingPrice;
  const targetIsDirty =
    targetResult.valid && targetResult.value !== appliedTarget;
  const targetError =
    targetTouched && !targetResult.valid ? targetResult.message : null;
  const optimizerDebugJson = debugOpen
    ? JSON.stringify(
        {
          inputs,
          selectedCards: strategyCards.map((candidate) =>
            optimizerCandidateDebug(candidate),
          ),
        },
        null,
        2,
      )
    : "";
  const initialChainDebugJson = debugOpen
    ? JSON.stringify(initialChain, null, 2)
    : "";
  function updateInputs(next: Partial<OptimizerInputs>) {
    setInputs((current) => {
      for (const key of Object.keys(next) as (keyof OptimizerInputs)[]) {
        if (current[key] !== next[key]) {
          return { ...current, ...next };
        }
      }
      return current;
    });
  }

  function handleSliderChange(value: number | readonly number[]) {
    updateInputs({
      returnChanceWeight: Array.isArray(value) ? (value[0] ?? 50) : value,
    });
  }

  function handleThesisChange(thesis: OptimizerThesis) {
    const targetUnderlyingPrice = defaultTargetUnderlyingPrice(
      thesis,
      chain.underlying.price,
    );

    setTargetUnderlyingDraft(formatTargetPriceDraft(targetUnderlyingPrice));
    setTargetTouched(false);
    updateInputs({ thesis, targetUnderlyingPrice });
  }

  function applyTargetPrice() {
    setTargetTouched(true);

    if (!targetResult.valid) {
      return;
    }

    setTargetUnderlyingDraft(formatTargetPriceDraft(targetResult.value));
    setTargetTouched(false);
    updateInputs({ targetUnderlyingPrice: targetResult.value });
  }

  function handleTargetKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      applyTargetPrice();
    }

    if (e.key === "Escape") {
      setTargetUnderlyingDraft(formatTargetPriceDraft(appliedTarget));
      setTargetTouched(false);
    }
  }

  return (
    <>
      <section className="rounded-xl bg-card p-5 ring-1 ring-border">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <TickerCombobox
              defaultSymbol={initialChain.underlying.symbol}
              onNavigate={(symbol) => router.push(optimizeSymbolHref(symbol))}
            />
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Last
            </span>
            <span className="font-mono font-semibold tabular-nums">
              {formatPrice(chain.underlying.price)}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {THESIS_OPTIONS.map(([value, label]) => (
              <Button
                key={value}
                aria-pressed={inputs.thesis === value}
                variant={inputs.thesis === value ? "default" : "outline"}
                className={cn(
                  "rounded-full shadow-none",
                  inputs.thesis === value
                    ? ""
                    : "border-border bg-transparent text-muted-foreground hover:border-primary/40 hover:bg-muted/60 hover:text-foreground",
                )}
                onClick={() => handleThesisChange(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            className="flex flex-col gap-1.5"
            data-invalid={targetError ? true : undefined}
          >
            <FieldLabel
              className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground"
              htmlFor="target-price"
            >
              Target Price at Expiration
            </FieldLabel>
            <InputGroup className="rounded-full border-border bg-input/50 shadow-none">
              <InputGroupAddon>$</InputGroupAddon>
              <InputGroupInput
                id="target-price"
                type="number"
                min={targetRange.low}
                max={targetRange.high}
                step="0.01"
                aria-describedby={
                  targetError ? "target-price-error" : "target-price-help"
                }
                aria-invalid={targetError ? true : undefined}
                className="font-mono font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={targetUnderlyingDraft}
                onChange={(e) => {
                  setTargetUnderlyingDraft(e.target.value);
                  setTargetTouched(true);
                }}
                onBlur={applyTargetPrice}
                onKeyDown={handleTargetKeyDown}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton
                  aria-label="Apply target price"
                  disabled={!targetResult.valid || !targetIsDirty}
                  onClick={applyTargetPrice}
                >
                  Apply
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {targetError ? (
              <FieldError id="target-price-error">{targetError}</FieldError>
            ) : (
              <p
                aria-live="polite"
                className="text-xs leading-5 text-muted-foreground"
                id="target-price-help"
              >
                {targetIsDirty
                  ? "Not applied yet. Press Enter or choose Apply to update the analysis."
                  : `Applied to rankings and estimated P/L at expiration. Range ${formatPrice(targetRange.low)}–${formatPrice(targetRange.high)}.`}
              </p>
            )}
          </Field>

          <Field className="flex flex-col gap-1.5">
            <span className="font-mono text-xs font-medium tracking-[0.12em] text-muted-foreground">
              Rank By
            </span>
            <div className="rounded-lg bg-muted/40 px-4 py-3 ring-1 ring-inset ring-border/70">
              <Slider
                aria-label="Rank by"
                max={100}
                min={0}
                step={10}
                value={[inputs.returnChanceWeight ?? 50]}
                onValueChange={handleSliderChange}
              />
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Max Return{" "}
                  <span className="font-semibold tabular-nums text-foreground/70">
                    {100 - (inputs.returnChanceWeight ?? 50)}%
                  </span>
                </span>
                <span>
                  <span className="font-semibold tabular-nums text-foreground/70">
                    {inputs.returnChanceWeight ?? 50}%
                  </span>{" "}
                  Max Chance
                </span>
              </div>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Balances modeled return against modeled probability. A 50/50
              setting weights them equally.
            </p>
          </Field>
        </div>

        <div className="mt-4">
          <ExpirationTimeline
            expirations={chain.expirations}
            value={inputs.expiration}
            onChange={(expiration) => updateInputs({ expiration })}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border/70 pt-3 text-xs leading-5 text-muted-foreground">
          <p>
            Underlying snapshot: {formatSnapshotTime(chain.underlying.asOf)} ·
            Options chain: {formatProvider(provider)}
          </p>
          <p>Model estimates support planning; they are not guarantees.</p>
        </div>
      </section>

      <section aria-labelledby="payoff-chart-guide" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div>
            <h2 className="text-base font-semibold" id="payoff-chart-guide">
              Payoff charts
            </h2>
            <p className="max-w-2xl text-xs leading-5 text-muted-foreground">
              Each chart shows estimated P/L at expiration. Return/risk uses
              maximum profit when capped and target profit when unlimited;
              unavailable means losses are not capped.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-0.5 w-3 bg-primary" />
              P/L
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="w-3 border-t border-dashed border-muted-foreground"
              />
              Current {formatPrice(chain.underlying.price)}
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="w-3 border-t border-dashed border-destructive"
              />
              Target {formatPrice(chartTarget)}
            </span>
          </div>
        </div>
        {topCandidate ? (
          <>
            <section aria-labelledby="top-match-heading" className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4">
                <div>
                  <h2 className="text-xl font-semibold" id="top-match-heading">
                    Top-ranked match
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatRecommendationContext(inputs, topCandidate)}
                  </p>
                </div>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                  {formatRecommendationRationale(
                    topCandidate,
                    inputs.returnChanceWeight,
                  )}
                </p>
              </div>
              <StrategyCard candidate={topCandidate} featured />
            </section>

            {alternativeCards.length > 0 ? (
              <section
                aria-labelledby="alternative-heading"
                className="space-y-3"
              >
                <div>
                  <h2
                    className="text-base font-semibold"
                    id="alternative-heading"
                  >
                    Other strategies
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Compare different payoff shapes using the same assumptions.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {alternativeCards.map((candidate) => (
                    <StrategyCard candidate={candidate} key={candidate.id} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
            <div className="max-w-sm">
              <h2 className="text-lg font-semibold">No strategies match</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Try another thesis, expiration, or target price to widen the
                search.
              </p>
            </div>
          </div>
        )}
      </section>

      {IS_DEV ? (
        <DebugDrawer
          closeLabel="Close optimizer debug panel"
          openLabel="Open optimizer debug panel"
          open={debugOpen}
          panels={[
            {
              title: "Currently selected optimizer cards",
              value: optimizerDebugJson,
            },
            {
              title: "Full initialChain payload",
              value: initialChainDebugJson,
            },
          ]}
          subtitle={`Provider ${
            chain.expirations[0]?.calls[0]?.provider ?? "n/a"
          } · ${chain.underlying.symbol} ${formatPrice(
            chain.underlying.price,
          )}`}
          summary={[
            { label: "As of", value: chain.underlying.asOf },
            { label: "Expirations", value: String(chain.expirations.length) },
          ]}
          title="Optimizer debug"
          onClose={() => setDebugOpen(false)}
          onOpen={() => setDebugOpen(true)}
        />
      ) : null}
    </>
  );
}

function formatSnapshotTime(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : SNAPSHOT_TIME_FORMAT.format(date);
}

function formatProvider(provider: string) {
  return provider.replace(/^./, (character) => character.toUpperCase());
}

function formatRecommendationContext(
  inputs: OptimizerInputs,
  candidate: OptimizerCandidate,
) {
  const thesis = inputs.thesis.replace(/^./, (letter) => letter.toUpperCase());
  const expiration = EXPIRATION_DATE_FORMAT.format(
    new Date(`${candidate.summary.expiration}T00:00:00.000Z`),
  );

  return `${thesis} thesis · ${expiration} expiration · ${formatPrice(candidate.summary.targetUnderlyingPrice)} target`;
}

function formatRecommendationRationale(
  candidate: OptimizerCandidate,
  chanceWeight = 50,
) {
  const chance = formatPercent(candidate.summary.probabilityOfProfit);
  const returnOnRisk = formatPercent(candidate.summary.returnOnRisk);

  if (candidate.summary.maxLoss === null) {
    return "Ranks first on modeled probability, but losses are uncapped. Compare the defined-risk alternatives before proceeding.";
  }

  if (chanceWeight >= 65) {
    return `Ranked first with ${chance} modeled probability of profit while preserving ${returnOnRisk} return/risk.`;
  }

  if (chanceWeight <= 35) {
    return `Ranked first with ${returnOnRisk} modeled return/risk and a ${chance} probability of profit.`;
  }

  return `Best blended score at the current balance: ${returnOnRisk} modeled return/risk and ${chance} probability of profit.`;
}

function selectTopStrategyCards(
  weight: number | undefined,
  candidates: OptimizerCandidate[],
) {
  const ranked = rankOptimizerCandidates(weight, candidates);
  const byStrategy = new Map<string, OptimizerCandidate>();

  for (const candidate of ranked) {
    if (!byStrategy.has(candidate.state.strategy)) {
      byStrategy.set(candidate.state.strategy, candidate);
    }
  }

  return rankOptimizerShortlist(weight, [...byStrategy.values()]);
}

function optimizerCandidateDebug(candidate: OptimizerCandidate) {
  return {
    id: candidate.id,
    strategy: candidate.state.strategy,
    symbol: candidate.state.symbol,
    underlyingPrice: candidate.state.underlyingPrice,
    expiration: candidate.summary.expiration,
    strikes: candidate.summary.strikes,
    score: candidate.summary.score,
    rankingInputs: {
      maxProfit: candidate.summary.maxProfit,
      maxLoss: candidate.summary.maxLoss,
      returnProfitBasis: candidate.summary.returnProfitBasis,
      returnProfitBasisLabel: candidate.summary.returnProfitBasisLabel,
      riskDenominator: candidate.summary.riskDenominator,
      returnOnRisk: candidate.summary.returnOnRisk,
      probabilityOfProfit: candidate.summary.probabilityOfProfit,
    },
    summary: {
      netPremium: candidate.summary.netPremium,
      targetUnderlyingPrice: candidate.summary.targetUnderlyingPrice,
      targetProfitLoss: candidate.summary.targetProfitLoss,
      delta: candidate.summary.delta,
      builderHref: candidate.summary.builderHref,
    },
    legs: candidate.state.legs,
    evaluatedLegs: candidate.evaluation.legs,
    breakevens: candidate.evaluation.breakevens,
  };
}
