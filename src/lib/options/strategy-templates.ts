import type { ProfitRange } from "./profit-range";
import { createGeneratedChain } from "./providers/generated";
import {
  fallbackImpliedVolatility,
  usablePremium,
} from "./providers/normalize";
import { validateStrategyStateForTemplate } from "./strategy-template-validation";
import {
  CONTRACT_MULTIPLIER,
  type OptionChainSnapshot,
  type OptionLeg,
  type OptionQuote,
  type OptionType,
  type PositionSide,
  type StrategyEvaluation,
  type StrategyState,
  type StrategyTemplateId,
} from "./types";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export type StrategyBias = "bullish" | "bearish" | "neutral" | "income";
export type OptimizerThesis = "bullish" | "bearish" | "income";
export type TemplateRole =
  | "option"
  | "longCall"
  | "shortCall"
  | "longPut"
  | "shortPut";

export type BuildStrategyInput = {
  symbol?: string;
  strategy?: StrategyTemplateId;
  expiration?: string;
  quantity?: number;
  chain?: OptionChainSnapshot;
  strikes?: Partial<Record<TemplateRole, number>>;
  strike?: number;
  strike2?: number;
  strike3?: number;
  strike4?: number;
};

export type StrategyTemplateLegSpec =
  | {
      kind: "stock";
      side: PositionSide;
      sharesPerContract: number;
    }
  | {
      kind: "option";
      role: TemplateRole;
      optionType: OptionType;
      side: PositionSide;
      strikeTargetRatio?: number;
      relativeTo?: TemplateRole;
      direction?: "above" | "below";
    };

type OptionLegSpec = Extract<StrategyTemplateLegSpec, { kind: "option" }>;

export type StrategySummary = {
  strategyLabel: string;
  expiration: string;
  expirations: string[];
  strikes: number[];
  strikeLabel: string;
  savedName: string;
};

type CandidateInput = {
  strikeOffset: number;
  strike2Offset?: number;
  strike3Offset?: number;
  strike4Offset?: number;
  strikeTargetRatio?: number;
  strike2TargetRatio?: number;
  strike3TargetRatio?: number;
  strike4TargetRatio?: number;
};

export type OptimizerSeedInput = {
  thesis: OptimizerThesis;
  chain: OptionChainSnapshot;
  targetUnderlyingPrice: number;
  minDaysToExpiration: number;
  maxDaysToExpiration: number;
  expiration?: string;
};

export type OptimizerSeed = {
  strategy: StrategyTemplateId;
  expiration: string;
  strikes: Partial<Record<TemplateRole, number>>;
  quantity: number;
};

export type StrategyTemplateEvaluationHooks = {
  breakevens?: (state: StrategyState, netPremium: number) => number[];
  probabilityRange?: ProfitRange;
};

export type StrategyTemplateMonitoringHooks = {
  capitalAtRisk?: (
    state: StrategyState,
    evaluation: StrategyEvaluation,
  ) => number | null;
};

export type StrategyTemplateOptimizerHooks = {
  candidateInputs?: readonly CandidateInput[];
};

export type StrategyTemplateValidationRules = {
  strikeOrder?: readonly TemplateRole[];
  strikeOrderMessage?: string;
  sameStrike?: readonly TemplateRole[];
  sameStrikeMessage?: string;
  requireCredit?: boolean;
  requireCreditMessage?: string;
};

export type StrategyTemplate = {
  id: StrategyTemplateId;
  label: string;
  shape:
    | "single-option"
    | "stock-plus-option"
    | "vertical-spread"
    | "short-volatility"
    | "iron-condor";
  biases: readonly StrategyBias[];
  optimizerTheses: readonly OptimizerThesis[];
  scanMode: "single-strike" | "template-variants";
  defaultScanEnabled?: boolean;
  legs: readonly StrategyTemplateLegSpec[];
  positionalStrikeRoles?: readonly TemplateRole[];
  validation?: StrategyTemplateValidationRules;
  evaluation?: StrategyTemplateEvaluationHooks;
  monitoring?: StrategyTemplateMonitoringHooks;
  optimizer?: StrategyTemplateOptimizerHooks;
};

export type StrategyTemplateCatalog = {
  all(): readonly StrategyTemplate[];
  ids(): readonly StrategyTemplateId[];
  coerce(id?: string): StrategyTemplateId;
  get(id?: string): StrategyTemplate;
  build(input?: BuildStrategyInput): StrategyState;
  validate(state: StrategyState): ValidationResult;
  summarize(state: StrategyState): StrategySummary;
  defaultScanStrategies(): readonly StrategyTemplateId[];
  optimizerStrategies(thesis: OptimizerThesis): readonly StrategyTemplateId[];
  optimizerSeeds(input: OptimizerSeedInput): OptimizerSeed[];
};

const DEFAULT_SYMBOL = "AAPL";
const DEFAULT_STRATEGY: StrategyTemplateId = "long-call";

const templates: readonly StrategyTemplate[] = [
  {
    id: "long-call",
    label: "Long Call",
    shape: "single-option",
    biases: ["bullish"],
    optimizerTheses: ["bullish"],
    scanMode: "single-strike",
    evaluation: {
      breakevens: singleOptionBreakeven("above", "debit"),
      probabilityRange: "above",
    },
    legs: [
      { kind: "option", role: "option", optionType: "call", side: "long" },
    ],
    optimizer: {
      candidateInputs: [
        { strikeOffset: 0, strikeTargetRatio: 0.92 },
        { strikeOffset: 0, strikeTargetRatio: 0.94 },
        { strikeOffset: 0, strikeTargetRatio: 0.96 },
      ],
    },
  },
  {
    id: "long-put",
    label: "Long Put",
    shape: "single-option",
    biases: ["bearish"],
    optimizerTheses: ["bearish"],
    scanMode: "single-strike",
    evaluation: {
      breakevens: singleOptionBreakeven("below", "debit"),
      probabilityRange: "below",
    },
    legs: [{ kind: "option", role: "option", optionType: "put", side: "long" }],
    optimizer: {
      candidateInputs: [
        { strikeOffset: -1, strike2Offset: -1 },
        { strikeOffset: 0, strike2Offset: 0 },
        { strikeOffset: 1, strike2Offset: 1 },
      ],
    },
  },
  {
    id: "short-call",
    label: "Short Call",
    shape: "single-option",
    biases: ["bearish", "income"],
    optimizerTheses: ["bearish"],
    scanMode: "single-strike",
    evaluation: {
      breakevens: singleOptionBreakeven("above", "credit"),
      probabilityRange: "below",
    },
    legs: [
      { kind: "option", role: "option", optionType: "call", side: "short" },
    ],
    optimizer: {
      candidateInputs: [
        { strikeOffset: 1 },
        { strikeOffset: 2 },
        { strikeOffset: 3 },
      ],
    },
  },
  {
    id: "short-put",
    label: "Short Put",
    shape: "single-option",
    biases: ["bullish", "income"],
    optimizerTheses: ["bullish"],
    scanMode: "single-strike",
    evaluation: {
      breakevens: singleOptionBreakeven("below", "credit"),
      probabilityRange: "above",
    },
    legs: [
      { kind: "option", role: "option", optionType: "put", side: "short" },
    ],
    optimizer: {
      candidateInputs: [
        { strikeOffset: 0, strikeTargetRatio: 0.9 },
        { strikeOffset: 0, strikeTargetRatio: 0.92 },
        { strikeOffset: 0, strikeTargetRatio: 0.95 },
      ],
    },
  },
  {
    id: "covered-call",
    label: "Covered Call",
    shape: "stock-plus-option",
    biases: ["income"],
    optimizerTheses: ["income"],
    scanMode: "single-strike",
    evaluation: {
      breakevens: coveredCallBreakeven,
      probabilityRange: "below",
    },
    legs: [
      { kind: "stock", side: "long", sharesPerContract: 100 },
      { kind: "option", role: "option", optionType: "call", side: "short" },
    ],
    monitoring: { capitalAtRisk: coveredCallCapitalAtRisk },
    optimizer: {
      candidateInputs: [
        { strikeOffset: 1 },
        { strikeOffset: 2 },
        { strikeOffset: 3 },
      ],
    },
  },
  {
    id: "cash-secured-put",
    label: "Cash Secured Put",
    shape: "single-option",
    biases: ["bullish", "income"],
    optimizerTheses: ["bullish", "income"],
    scanMode: "single-strike",
    evaluation: {
      breakevens: singleOptionBreakeven("below", "credit"),
      probabilityRange: "above",
    },
    legs: [
      { kind: "option", role: "option", optionType: "put", side: "short" },
    ],
    monitoring: { capitalAtRisk: cashSecuredPutCapitalAtRisk },
    optimizer: {
      candidateInputs: [
        { strikeOffset: 0, strikeTargetRatio: 0.9 },
        { strikeOffset: 0, strikeTargetRatio: 0.92 },
        { strikeOffset: 0, strikeTargetRatio: 0.95 },
      ],
    },
  },
  {
    id: "bull-call-spread",
    label: "Bull Call Spread",
    shape: "vertical-spread",
    biases: ["bullish"],
    optimizerTheses: ["bullish"],
    scanMode: "template-variants",
    defaultScanEnabled: true,
    validation: {
      strikeOrder: ["longCall", "shortCall"],
      strikeOrderMessage:
        "bull-call-spread long call strike must be below short call strike.",
    },
    evaluation: {
      breakevens: verticalSpreadBreakeven("long", "above", "debit"),
      probabilityRange: "above",
    },
    legs: [
      { kind: "option", role: "longCall", optionType: "call", side: "long" },
      {
        kind: "option",
        role: "shortCall",
        optionType: "call",
        side: "short",
        relativeTo: "longCall",
        direction: "above",
      },
    ],
    optimizer: {
      candidateInputs: [
        {
          strikeOffset: 0,
          strike2Offset: 0,
          strikeTargetRatio: 0.94,
          strike2TargetRatio: 1.01,
        },
        {
          strikeOffset: 0,
          strike2Offset: 0,
          strikeTargetRatio: 0.96,
          strike2TargetRatio: 1.03,
        },
      ],
    },
  },
  {
    id: "bear-put-spread",
    label: "Bear Put Spread",
    shape: "vertical-spread",
    biases: ["bearish"],
    optimizerTheses: ["bearish"],
    scanMode: "template-variants",
    defaultScanEnabled: true,
    validation: {
      strikeOrder: ["shortPut", "longPut"],
      strikeOrderMessage:
        "bear-put-spread long put strike must be above short put strike.",
    },
    evaluation: {
      breakevens: verticalSpreadBreakeven("long", "below", "debit"),
      probabilityRange: "below",
    },
    legs: [
      { kind: "option", role: "longPut", optionType: "put", side: "long" },
      {
        kind: "option",
        role: "shortPut",
        optionType: "put",
        side: "short",
        relativeTo: "longPut",
        direction: "below",
      },
    ],
    optimizer: {
      candidateInputs: [
        { strikeOffset: 1, strike2Offset: -1 },
        { strikeOffset: 0, strike2Offset: -2 },
      ],
    },
  },
  {
    id: "bull-put-spread",
    label: "Bull Put Spread",
    shape: "vertical-spread",
    biases: ["bullish", "income"],
    optimizerTheses: ["bullish"],
    scanMode: "template-variants",
    defaultScanEnabled: true,
    validation: {
      strikeOrder: ["longPut", "shortPut"],
      strikeOrderMessage:
        "bull-put-spread short put strike must be above long put strike.",
      requireCredit: true,
    },
    evaluation: {
      breakevens: verticalSpreadBreakeven("short", "below", "credit"),
      probabilityRange: "above",
    },
    legs: [
      { kind: "option", role: "shortPut", optionType: "put", side: "short" },
      {
        kind: "option",
        role: "longPut",
        optionType: "put",
        side: "long",
        relativeTo: "shortPut",
        direction: "below",
      },
    ],
    optimizer: {
      candidateInputs: [
        {
          strikeOffset: 0,
          strike2Offset: 0,
          strikeTargetRatio: 0.95,
          strike2TargetRatio: 0.92,
        },
        {
          strikeOffset: 0,
          strike2Offset: 0,
          strikeTargetRatio: 0.97,
          strike2TargetRatio: 0.94,
        },
      ],
    },
  },
  {
    id: "bear-call-spread",
    label: "Bear Call Spread",
    shape: "vertical-spread",
    biases: ["bearish", "income"],
    optimizerTheses: ["bearish"],
    scanMode: "template-variants",
    defaultScanEnabled: true,
    validation: {
      strikeOrder: ["shortCall", "longCall"],
      strikeOrderMessage:
        "bear-call-spread short call strike must be below long call strike.",
      requireCredit: true,
    },
    evaluation: {
      breakevens: verticalSpreadBreakeven("short", "above", "credit"),
      probabilityRange: "below",
    },
    legs: [
      { kind: "option", role: "shortCall", optionType: "call", side: "short" },
      {
        kind: "option",
        role: "longCall",
        optionType: "call",
        side: "long",
        relativeTo: "shortCall",
        direction: "above",
      },
    ],
    optimizer: {
      candidateInputs: [
        { strikeOffset: 1, strike2Offset: 3 },
        { strikeOffset: 0, strike2Offset: 2 },
      ],
    },
  },
  {
    id: "iron-condor",
    label: "Iron Condor",
    shape: "iron-condor",
    biases: ["neutral", "income"],
    optimizerTheses: ["income"],
    scanMode: "template-variants",
    defaultScanEnabled: true,
    validation: {
      strikeOrder: ["longPut", "shortPut", "shortCall", "longCall"],
      strikeOrderMessage:
        "iron-condor requires long put, short put, short call, and long call strikes in ascending order with the same expiration.",
    },
    positionalStrikeRoles: ["longPut", "shortPut", "shortCall", "longCall"],
    evaluation: {
      breakevens: ironCondorBreakevens,
      probabilityRange: "between",
    },
    legs: [
      {
        kind: "option",
        role: "longPut",
        optionType: "put",
        side: "long",
        strikeTargetRatio: 0.94,
      },
      {
        kind: "option",
        role: "shortPut",
        optionType: "put",
        side: "short",
        strikeTargetRatio: 0.96,
      },
      {
        kind: "option",
        role: "shortCall",
        optionType: "call",
        side: "short",
        strikeTargetRatio: 1.04,
      },
      {
        kind: "option",
        role: "longCall",
        optionType: "call",
        side: "long",
        relativeTo: "shortCall",
        direction: "above",
      },
    ],
    optimizer: {
      candidateInputs: [
        {
          strikeOffset: -3,
          strike2Offset: -1,
          strike3Offset: 1,
          strike4Offset: 3,
        },
        {
          strikeOffset: -4,
          strike2Offset: -2,
          strike3Offset: 2,
          strike4Offset: 4,
        },
      ],
    },
  },
  {
    id: "short-straddle",
    label: "Short Straddle",
    shape: "short-volatility",
    biases: ["neutral", "income"],
    optimizerTheses: ["income"],
    scanMode: "single-strike",
    validation: {
      sameStrike: ["shortCall", "shortPut"],
      sameStrikeMessage:
        "short-straddle requires one short call and one short put at the same strike and expiration.",
    },
    evaluation: {
      breakevens: shortStraddleBreakevens,
      probabilityRange: "between",
    },
    legs: [
      { kind: "option", role: "shortCall", optionType: "call", side: "short" },
      { kind: "option", role: "shortPut", optionType: "put", side: "short" },
    ],
    optimizer: {
      candidateInputs: [
        { strikeOffset: -1, strike2Offset: -1 },
        { strikeOffset: 0, strike2Offset: 0 },
        { strikeOffset: 1, strike2Offset: 1 },
      ],
    },
  },
  {
    id: "short-strangle",
    label: "Short Strangle",
    shape: "short-volatility",
    biases: ["neutral", "income"],
    optimizerTheses: ["income"],
    scanMode: "template-variants",
    validation: {
      strikeOrder: ["shortPut", "shortCall"],
      strikeOrderMessage:
        "short-strangle requires one lower-strike short put and one higher-strike short call with the same expiration.",
    },
    evaluation: {
      breakevens: shortStrangleBreakevens,
      probabilityRange: "between",
    },
    legs: [
      { kind: "option", role: "shortPut", optionType: "put", side: "short" },
      {
        kind: "option",
        role: "shortCall",
        optionType: "call",
        side: "short",
        relativeTo: "shortPut",
        direction: "above",
      },
    ],
    optimizer: {
      candidateInputs: [
        { strikeOffset: -2, strike2Offset: 2 },
        { strikeOffset: -3, strike2Offset: 3 },
      ],
    },
  },
];

const templatesById = new Map(
  templates.map((template) => [template.id, template]),
);

export const strategyTemplates: StrategyTemplateCatalog = {
  all: () => templates,
  ids: () => templates.map((template) => template.id),
  coerce: (id?: string) =>
    templatesById.has(id as StrategyTemplateId)
      ? (id as StrategyTemplateId)
      : DEFAULT_STRATEGY,
  get(id?: string) {
    const template = templatesById.get(this.coerce(id));

    if (!template) {
      throw new Error("Strategy template catalog is empty.");
    }

    return template;
  },
  build: buildStrategy,
  validate(state) {
    return validateStrategyStateForTemplate(this.get(state.strategy), state);
  },
  summarize: summarizeStrategy,
  defaultScanStrategies() {
    return templates.flatMap((template) =>
      template.defaultScanEnabled === true ? [template.id] : [],
    );
  },
  optimizerStrategies(thesis) {
    return templates.flatMap((template) =>
      template.optimizerTheses.includes(thesis) ? [template.id] : [],
    );
  },
  optimizerSeeds: buildOptimizerSeeds,
};

function buildStrategy(input?: BuildStrategyInput): StrategyState {
  const symbol = (input?.symbol ?? DEFAULT_SYMBOL).trim().toUpperCase();
  const template = strategyTemplates.get(input?.strategy);
  const chain = input?.chain ?? createGeneratedChain(symbol);
  const quantity = input?.quantity ?? 1;
  const strikes = normalizeStrikeRoles(template, input);
  const quotesByRole = new Map<TemplateRole, OptionQuote>();
  const legs: StrategyState["legs"] = [];

  for (const spec of template.legs) {
    if (spec.kind === "stock") {
      legs.push({
        kind: "stock",
        side: spec.side,
        quantity: quantity * spec.sharesPerContract,
        entryPrice: chain.underlying.price,
      });
      continue;
    }

    const relativeQuote = spec.relativeTo
      ? quotesByRole.get(spec.relativeTo)
      : undefined;
    const quote =
      relativeQuote && spec.direction
        ? findSpreadQuote(
            chain,
            spec.optionType,
            relativeQuote.expiration,
            relativeQuote.strike,
            spec.direction,
            strikes[spec.role],
          )
        : findNearestQuote(
            chain,
            spec.optionType,
            input?.expiration,
            strikes[spec.role] ??
              chain.underlying.price * (spec.strikeTargetRatio ?? 1),
          );

    quotesByRole.set(spec.role, quote);
    legs.push(optionLegFromQuote(chain, quote, spec.side, quantity));
  }

  return {
    version: 1,
    strategy: template.id,
    symbol: chain.underlying.symbol,
    underlyingPrice: chain.underlying.price,
    asOf: chain.underlying.asOf,
    legs,
  };
}

function normalizeStrikeRoles(
  template: StrategyTemplate,
  input?: BuildStrategyInput,
): Partial<Record<TemplateRole, number>> {
  if (input?.strikes) {
    return { ...input.strikes };
  }

  const optionSpecs = templateOptionSpecs(template);
  const positionalRoles =
    template.positionalStrikeRoles ?? optionSpecs.map((spec) => spec.role);

  return Object.fromEntries(
    positionalRoles.map((role, index) => [
      role,
      [input?.strike, input?.strike2, input?.strike3, input?.strike4][index],
    ]),
  );
}

function findNearestQuote(
  chain: OptionChainSnapshot,
  optionType: OptionType,
  expirationValue?: string,
  strikeValue?: number,
): OptionQuote {
  const quotes = quotesForExpiration(chain, optionType, expirationValue);
  const targetStrike = strikeValue ?? chain.underlying.price;
  const quote = nearestQuoteByStrike(quotes, targetStrike);

  if (!quote) {
    throw new Error("Generated chain did not include option quotes.");
  }

  return quote;
}

function findSpreadQuote(
  chain: OptionChainSnapshot,
  optionType: OptionType,
  expirationValue: string | undefined,
  anchorStrike: number,
  direction: "above" | "below",
  strikeValue?: number,
) {
  if (strikeValue) {
    return findNearestQuote(chain, optionType, expirationValue, strikeValue);
  }

  const quotes = quotesForExpiration(chain, optionType, expirationValue);

  const candidates = quotes.filter((quote) =>
    direction === "above"
      ? quote.strike > anchorStrike
      : quote.strike < anchorStrike,
  );

  return (
    nearestQuoteByStrike(candidates, anchorStrike) ??
    findNearestQuote(chain, optionType, expirationValue, anchorStrike)
  );
}

function quotesForExpiration(
  chain: OptionChainSnapshot,
  optionType: OptionType,
  expirationValue?: string,
) {
  const expiration =
    chain.expirations.find(
      (candidate) => candidate.expiration === expirationValue,
    ) ??
    chain.expirations[3] ??
    chain.expirations[0];
  const quotes = optionType === "put" ? expiration?.puts : expiration?.calls;

  if (!quotes?.length) {
    throw new Error("Generated chain did not include option quotes.");
  }

  return quotes;
}

function nearestQuoteByStrike(quotes: readonly OptionQuote[], target: number) {
  return quotes.reduce<OptionQuote | null>((nearest, candidate) => {
    if (!nearest) {
      return candidate;
    }

    return Math.abs(candidate.strike - target) <
      Math.abs(nearest.strike - target)
      ? candidate
      : nearest;
  }, null);
}

function optionLegFromQuote(
  chain: OptionChainSnapshot,
  quote: OptionQuote,
  side: PositionSide,
  quantity: number,
): OptionLeg {
  const premium = usablePremium(quote);

  if (premium === null) {
    throw new Error(
      `Option quote ${quote.expiration} ${quote.strike} ${quote.optionType} did not include a usable premium.`,
    );
  }

  return {
    kind: "option",
    optionType: quote.optionType,
    side,
    quantity,
    expiration: quote.expiration,
    strike: quote.strike,
    premium,
    impliedVolatility: fallbackImpliedVolatility({
      quote,
      underlyingPrice: chain.underlying.price,
    }),
  };
}

function buildOptimizerSeeds(input: OptimizerSeedInput): OptimizerSeed[] {
  const seeds: OptimizerSeed[] = [];
  const strategies = strategyTemplates.optimizerStrategies(input.thesis);

  for (const expirationGroup of input.chain.expirations) {
    const expirationIso = expirationGroup.expiration;

    if (input.expiration !== undefined && expirationIso !== input.expiration) {
      continue;
    }

    if (
      input.expiration === undefined &&
      (expirationGroup.daysToExpiration < input.minDaysToExpiration ||
        expirationGroup.daysToExpiration > input.maxDaysToExpiration)
    ) {
      continue;
    }

    const strikes = expirationGroup.calls.map((quote) => quote.strike);

    for (const strategy of strategies) {
      const template = strategyTemplates.get(strategy);

      for (const candidateInput of template.optimizer?.candidateInputs ?? []) {
        seeds.push({
          strategy,
          expiration: expirationIso,
          quantity: 1,
          strikes: candidateInputToRoles(
            template,
            strikes,
            input.targetUnderlyingPrice,
            candidateInput,
          ),
        });
      }
    }
  }

  return seeds;
}

function candidateInputToRoles(
  template: StrategyTemplate,
  strikes: number[],
  targetPrice: number,
  input: CandidateInput,
): Partial<Record<TemplateRole, number>> {
  const optionSpecs = templateOptionSpecs(template);
  const positional = [
    strikeForInput(
      strikes,
      targetPrice,
      input,
      "strikeOffset",
      "strikeTargetRatio",
    ),
    strikeForInput(
      strikes,
      targetPrice,
      input,
      "strike2Offset",
      "strike2TargetRatio",
    ),
    strikeForInput(
      strikes,
      targetPrice,
      input,
      "strike3Offset",
      "strike3TargetRatio",
    ),
    strikeForInput(
      strikes,
      targetPrice,
      input,
      "strike4Offset",
      "strike4TargetRatio",
    ),
  ];

  return Object.fromEntries(
    optionSpecs.map((spec, index) => [spec.role, positional[index]]),
  );
}

function strikeForInput(
  strikes: number[],
  targetPrice: number,
  input: CandidateInput,
  offsetKey: keyof Pick<
    CandidateInput,
    "strikeOffset" | "strike2Offset" | "strike3Offset" | "strike4Offset"
  >,
  ratioKey: keyof Pick<
    CandidateInput,
    | "strikeTargetRatio"
    | "strike2TargetRatio"
    | "strike3TargetRatio"
    | "strike4TargetRatio"
  >,
) {
  const offset = input[offsetKey];

  if (offset === undefined) {
    return undefined;
  }

  const anchorPrice = targetPrice * (input[ratioKey] ?? 1);

  return strikeAt(strikes, anchorPrice, offset);
}

function strikeAt(strikes: number[], underlyingPrice: number, offset: number) {
  const sorted = strikes.toSorted((left, right) => left - right);
  const atTheMoneyIndex = sorted.reduce((nearestIndex, strike, index) => {
    const nearest = sorted[nearestIndex] ?? strike;

    return Math.abs(strike - underlyingPrice) <
      Math.abs(nearest - underlyingPrice)
      ? index
      : nearestIndex;
  }, 0);
  const nextIndex = Math.min(
    Math.max(atTheMoneyIndex + offset, 0),
    sorted.length - 1,
  );

  return sorted[nextIndex] ?? underlyingPrice;
}

function summarizeStrategy(state: StrategyState): StrategySummary {
  const expirations = [
    ...new Set(optionLegs(state).map((leg) => leg.expiration)),
  ];
  const strikes = optionLegs(state).map((leg) => leg.strike);
  const strategyLabel = strategyTemplates.get(state.strategy).label;
  const expiration =
    expirations.length === 1
      ? (expirations[0] ?? "stock")
      : expirations.length > 1
        ? "multi-exp"
        : "stock";
  const strikeLabel =
    strikes.length > 0 ? strikes.map(formatStrike).join("/") : "shares";

  return {
    strategyLabel,
    expiration,
    expirations,
    strikes,
    strikeLabel,
    savedName: `${state.symbol.toUpperCase()} ${expiration} ${strikeLabel} ${strategyLabel}`,
  };
}

function cashSecuredPutCapitalAtRisk(state: StrategyState) {
  const shortPut = state.legs.find(
    (leg) =>
      leg.kind === "option" && leg.optionType === "put" && leg.side === "short",
  );

  if (!shortPut || shortPut.kind !== "option") {
    return null;
  }

  return roundMoney(
    shortPut.strike * CONTRACT_MULTIPLIER * shortPut.quantity -
      shortPut.premium * CONTRACT_MULTIPLIER * shortPut.quantity,
  );
}

function optionLegs(state: StrategyState) {
  return state.legs.filter((leg): leg is OptionLeg => leg.kind === "option");
}

function templateOptionSpecs(template: StrategyTemplate): OptionLegSpec[] {
  return template.legs.filter(
    (leg): leg is OptionLegSpec => leg.kind === "option",
  );
}

function premiumPerShare(netPremium: number, quantity: number) {
  return Math.abs(netPremium) / CONTRACT_MULTIPLIER / Math.max(quantity, 1);
}

function creditPerShare(netPremium: number, quantity: number) {
  return Math.max(netPremium, 0) / CONTRACT_MULTIPLIER / Math.max(quantity, 1);
}

function singleOptionBreakeven(
  direction: "above" | "below",
  premiumKind: "credit" | "debit",
) {
  return (state: StrategyState, netPremium: number) => {
    const option = optionLegs(state)[0];

    if (!option) {
      return [];
    }

    const premium =
      premiumKind === "credit"
        ? creditPerShare(netPremium, option.quantity)
        : premiumPerShare(netPremium, option.quantity);
    const breakeven =
      direction === "above" ? option.strike + premium : option.strike - premium;

    return [roundMoney(breakeven)];
  };
}

function coveredCallBreakeven(state: StrategyState, netPremium: number) {
  const stockLeg = state.legs.find((leg) => leg.kind === "stock");
  const option = optionLegs(state)[0];

  if (!stockLeg || stockLeg.kind !== "stock" || !option) {
    return [];
  }

  return [
    roundMoney(
      stockLeg.entryPrice - creditPerShare(netPremium, option.quantity),
    ),
  ];
}

function verticalSpreadBreakeven(
  legSide: PositionSide,
  direction: "above" | "below",
  premiumKind: "credit" | "debit",
) {
  return (state: StrategyState, netPremium: number) => {
    const leg = optionLegs(state).find(
      (candidate) => candidate.side === legSide,
    );

    if (!leg) {
      return [];
    }

    const premium =
      premiumKind === "credit"
        ? creditPerShare(netPremium, leg.quantity)
        : premiumPerShare(netPremium, leg.quantity);
    const breakeven =
      direction === "above" ? leg.strike + premium : leg.strike - premium;

    return [roundMoney(breakeven)];
  };
}

function ironCondorBreakevens(state: StrategyState, netPremium: number) {
  const legs = optionLegs(state);
  const shortPut = legs.find(
    (leg) => leg.optionType === "put" && leg.side === "short",
  );
  const shortCall = legs.find(
    (leg) => leg.optionType === "call" && leg.side === "short",
  );

  if (!shortPut || !shortCall) {
    return [];
  }

  const credit = creditPerShare(netPremium, shortPut.quantity);

  return [
    roundMoney(shortPut.strike - credit),
    roundMoney(shortCall.strike + credit),
  ];
}

function shortStraddleBreakevens(state: StrategyState, netPremium: number) {
  const option = optionLegs(state)[0];

  if (!option) {
    return [];
  }

  const credit = creditPerShare(netPremium, option.quantity);

  return [
    roundMoney(option.strike - credit),
    roundMoney(option.strike + credit),
  ];
}

function shortStrangleBreakevens(state: StrategyState, netPremium: number) {
  const legs = optionLegs(state);
  const put = legs.find((leg) => leg.optionType === "put");
  const call = legs.find((leg) => leg.optionType === "call");

  if (!put || !call) {
    return [];
  }

  const credit = creditPerShare(netPremium, put.quantity);

  return [roundMoney(put.strike - credit), roundMoney(call.strike + credit)];
}

function coveredCallCapitalAtRisk(state: StrategyState) {
  const stockLeg = state.legs.find((leg) => leg.kind === "stock");
  const shortCall = state.legs.find(
    (leg) =>
      leg.kind === "option" &&
      leg.optionType === "call" &&
      leg.side === "short",
  );

  if (!stockLeg || stockLeg.kind !== "stock") {
    return null;
  }

  const callCredit =
    shortCall && shortCall.kind === "option"
      ? shortCall.premium * CONTRACT_MULTIPLIER * shortCall.quantity
      : 0;

  return roundMoney(stockLeg.entryPrice * stockLeg.quantity - callCredit);
}

function formatStrike(strike: number) {
  return Number.isInteger(strike) ? String(strike) : strike.toFixed(2);
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}
