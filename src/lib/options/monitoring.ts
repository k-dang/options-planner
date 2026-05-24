import type { StrategySnapshotLegMark } from "@/db/schema";
import { blackScholes } from "./pricing";
import { strategyTemplates } from "./strategy-templates";
import type { StrategyEvaluation, StrategyState } from "./types";
import {
  CONTRACT_MULTIPLIER,
  type OptionChainSnapshot,
  type OptionQuote,
} from "./types";

export type CurrentMarkSnapshotInput = {
  state: StrategyState;
  chain: OptionChainSnapshot;
  entrySignedMarkValue: number;
  capitalAtRisk: number | null;
  observedAt?: Date;
};

export type CurrentMarkSnapshotResult = {
  observedAt: Date;
  underlyingPrice: number;
  signedMarkValue: number;
  unrealizedProfitLoss: number;
  returnOnRisk: number | null;
  legMarks: StrategySnapshotLegMark[];
  quoteSource: string;
};

export function calculateSignedMarkValue(state: StrategyState) {
  return roundMoney(
    state.legs.reduce((total, leg) => total + signedEntryLegValue(leg), 0),
  );
}

export function buildEntryLegMarks(
  state: StrategyState,
): StrategySnapshotLegMark[] {
  return state.legs.map((leg, index) => {
    const markPrice = leg.kind === "stock" ? leg.entryPrice : leg.premium;

    return {
      legIndex: index,
      kind: leg.kind,
      side: leg.side,
      quantity: leg.quantity,
      markPrice,
      signedMarkValue: roundMoney(signedEntryLegValue(leg)),
      source: leg.kind === "stock" ? "underlying" : "entry",
      updatedAt: state.asOf,
    };
  });
}

export function calculateCurrentMarkSnapshot(
  input: CurrentMarkSnapshotInput,
): CurrentMarkSnapshotResult {
  const observedAt = input.observedAt ?? new Date();
  const underlyingPrice = input.chain.underlying.price;
  const legMarks = input.state.legs.map((leg, index) => {
    if (leg.kind === "stock") {
      const direction = leg.side === "long" ? 1 : -1;
      const signedMarkValue = direction * underlyingPrice * leg.quantity;

      return {
        legIndex: index,
        kind: leg.kind,
        side: leg.side,
        quantity: leg.quantity,
        markPrice: underlyingPrice,
        signedMarkValue: roundMoney(signedMarkValue),
        source: "underlying" as const,
        updatedAt: input.chain.underlying.asOf,
      };
    }

    const quote = findOptionQuote(input.chain, leg);
    const selected = selectOptionMark({
      quote,
      leg,
      underlyingPrice,
      observedAt,
    });
    const direction = leg.side === "long" ? 1 : -1;

    return {
      legIndex: index,
      kind: leg.kind,
      side: leg.side,
      quantity: leg.quantity,
      markPrice: selected.markPrice,
      signedMarkValue: roundMoney(
        direction * selected.markPrice * CONTRACT_MULTIPLIER * leg.quantity,
      ),
      source: selected.source,
      providerSymbol: quote?.providerSymbol,
      updatedAt: quote?.updatedAt ?? input.chain.underlying.asOf,
    };
  });
  const signedMarkValue = roundMoney(
    legMarks.reduce((total, leg) => total + leg.signedMarkValue, 0),
  );
  const unrealizedProfitLoss = roundMoney(
    signedMarkValue - input.entrySignedMarkValue,
  );

  return {
    observedAt,
    underlyingPrice,
    signedMarkValue,
    unrealizedProfitLoss,
    returnOnRisk:
      input.capitalAtRisk === null
        ? null
        : roundRatio(unrealizedProfitLoss / input.capitalAtRisk),
    legMarks,
    quoteSource: summarizeQuoteSources(legMarks),
  };
}

export function selectOptionMark(input: {
  quote: OptionQuote | null;
  leg: Extract<StrategyState["legs"][number], { kind: "option" }>;
  underlyingPrice: number;
  observedAt: Date;
}): Pick<StrategySnapshotLegMark, "markPrice" | "source"> {
  const quote = input.quote;

  if (quote?.bid !== null && quote?.bid !== undefined && quote.ask !== null) {
    return {
      markPrice: roundMoney((quote.bid + quote.ask) / 2),
      source: "mid",
    };
  }

  if (quote?.mid !== null && quote?.mid !== undefined) {
    return { markPrice: roundMoney(quote.mid), source: "mid" };
  }

  if (quote?.last !== null && quote?.last !== undefined) {
    return { markPrice: roundMoney(quote.last), source: "last" };
  }

  return {
    markPrice: roundMoney(
      blackScholes({
        optionType: input.leg.optionType,
        spot: input.underlyingPrice,
        strike: input.leg.strike,
        yearsToExpiration: yearsUntilExpiration(
          input.leg.expiration,
          input.observedAt,
        ),
        volatility: input.leg.impliedVolatility,
      }).price,
    ),
    source: "model",
  };
}

export function calculateCapitalAtRisk(
  state: StrategyState,
  evaluation: StrategyEvaluation,
) {
  if (evaluation.maxLoss !== null && Number.isFinite(evaluation.maxLoss)) {
    return roundMoney(Math.abs(evaluation.maxLoss));
  }

  return (
    strategyTemplates
      .get(state.strategy)
      .monitoring?.capitalAtRisk?.(state, evaluation) ?? null
  );
}

export function getDaysUntilExpiration(
  state: Pick<StrategyState, "legs">,
  asOf: Date = new Date(),
) {
  const expirations = state.legs
    .filter((leg) => leg.kind === "option")
    .map((leg) => leg.expiration);

  if (expirations.length === 0) {
    return null;
  }

  const earliestExpiration = expirations.sort()[0];
  const expirationDate = new Date(`${earliestExpiration}T00:00:00.000Z`);
  const asOfDate = Date.UTC(
    asOf.getUTCFullYear(),
    asOf.getUTCMonth(),
    asOf.getUTCDate(),
  );

  return Math.ceil((expirationDate.getTime() - asOfDate) / 86_400_000);
}

function signedEntryLegValue(leg: StrategyState["legs"][number]) {
  const direction = leg.side === "long" ? 1 : -1;

  if (leg.kind === "stock") {
    return direction * leg.entryPrice * leg.quantity;
  }

  return direction * leg.premium * CONTRACT_MULTIPLIER * leg.quantity;
}

function findOptionQuote(
  chain: OptionChainSnapshot,
  leg: Extract<StrategyState["legs"][number], { kind: "option" }>,
) {
  const expiration = chain.expirations.find(
    (candidate) => candidate.expiration === leg.expiration,
  );

  if (!expiration) {
    return null;
  }

  const quotes = leg.optionType === "call" ? expiration.calls : expiration.puts;

  return (
    quotes.find((quote) => Math.abs(quote.strike - leg.strike) < 0.0001) ?? null
  );
}

function summarizeQuoteSources(legMarks: StrategySnapshotLegMark[]) {
  return [...new Set(legMarks.map((leg) => leg.source))].join(",");
}

function yearsUntilExpiration(expiration: string, asOf: Date) {
  const expirationDate = new Date(`${expiration}T21:00:00.000Z`);

  return Math.max(
    (expirationDate.getTime() - asOf.getTime()) / (365 * 86_400_000),
    1 / 365,
  );
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function roundRatio(value: number) {
  return Number(value.toFixed(6));
}
