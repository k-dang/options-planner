import { z } from "zod";
import { underlyingQuoteSchema } from "@/modules/market/schemas";
import {
  builderLegInputSchema,
  builderStateSchema,
  calcChartSchema,
  calcGridSchema,
  calcSummarySchema,
} from "@/modules/strategies/schemas";

export const optimizerRunRequestSchema = z.strictObject({
  symbol: z.string().trim().min(1),
});

export const optimizerObjectiveSchema = z.enum([
  "expectedProfit",
  "chanceOfProfit",
]);

export const optimizerRequestSchema = z.strictObject({
  symbol: z.string().trim().min(1),
  targetPrice: z.number().positive(),
  targetDate: z.string().min(1),
  objective: optimizerObjectiveSchema,
  maxLoss: z.number().positive().optional(),
  maxLegs: z.number().int().min(1).max(4).default(2),
  strikeWindow: z.number().int().min(1).max(8).default(2),
  horizonDays: z.number().int().positive().default(30),
  riskFreeRate: z.number().min(0).default(0.04),
  commissions: z
    .strictObject({
      perContract: z.number().nonnegative().default(0.65),
      perLegFee: z.number().nonnegative().default(0.1),
    })
    .default({ perContract: 0.65, perLegFee: 0.1 }),
  ivOverrides: z
    .strictObject({
      global: z.number().positive().optional(),
      byExpiry: z.record(z.string(), z.number().positive()).default({}),
    })
    .default({ byExpiry: {} }),
  grid: z
    .strictObject({
      pricePoints: z.number().int().min(3).default(7),
      datePoints: z.number().int().min(2).default(3),
      priceRangePct: z.number().positive().default(0.25),
    })
    .default({ pricePoints: 7, datePoints: 3, priceRangePct: 0.25 }),
});

const optimizerSummarySchema = z.strictObject({
  netDebitOrCredit: z.number(),
  maxProfit: z.number().nullable(),
  maxLoss: z.number().nullable(),
  breakevens: z.array(z.number()),
  chanceOfProfitAtHorizon: z.number(),
  chanceOfProfitAtExpiration: z.number(),
  netGreeks: z.strictObject({
    delta: z.number(),
    gamma: z.number(),
    theta: z.number(),
    vega: z.number(),
    rho: z.number(),
  }),
});

export const optimizerCandidateSchema = z.strictObject({
  strategyName: z.enum([
    "Long Call",
    "Long Put",
    "Bull Call Spread",
    "Bear Put Spread",
  ]),
  objectiveValue: z.number(),
  expectedProfitAtTarget: z.number(),
  summary: optimizerSummarySchema,
  legs: z.array(builderLegInputSchema),
  builderState: builderStateSchema,
});

export const optimizerResponseSchema = z.strictObject({
  data: z.strictObject({
    candidates: z.array(optimizerCandidateSchema),
  }),
});

export const optimizedStrategyCardSchema = z.strictObject({
  candidate: optimizerCandidateSchema,
  detail: z.strictObject({
    summary: calcSummarySchema,
    grid: calcGridSchema,
    chart: calcChartSchema,
  }),
});

export const optimizerRunResponseSchema = z.strictObject({
  data: z.strictObject({
    quote: underlyingQuoteSchema,
    selectedExpiry: z.string().nullable(),
    cards: z.array(optimizedStrategyCardSchema),
  }),
});

export type OptimizerRequest = z.infer<typeof optimizerRequestSchema>;
export type OptimizerCandidate = z.infer<typeof optimizerCandidateSchema>;
export type OptimizerRunResponse = z.infer<typeof optimizerRunResponseSchema>;
