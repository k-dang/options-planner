import { z } from "zod";
import { builderLegInputSchema, builderStateSchema } from "./analytics";

export const optimizerObjectiveSchema = z.enum([
  "expectedProfit",
  "chanceOfProfit",
]);

export const optimizerRequestSchema = z
  .object({
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
      .object({
        perContract: z.number().nonnegative().default(0.65),
        perLegFee: z.number().nonnegative().default(0.1),
      })
      .strict()
      .default({ perContract: 0.65, perLegFee: 0.1 }),
    ivOverrides: z
      .object({
        global: z.number().positive().optional(),
        byExpiry: z.record(z.string(), z.number().positive()).default({}),
      })
      .strict()
      .default({ byExpiry: {} }),
    grid: z
      .object({
        pricePoints: z.number().int().min(3).default(7),
        datePoints: z.number().int().min(2).default(3),
        priceRangePct: z.number().positive().default(0.25),
      })
      .strict()
      .default({ pricePoints: 7, datePoints: 3, priceRangePct: 0.25 }),
  })
  .strict();

const optimizerSummarySchema = z
  .object({
    netDebitOrCredit: z.number(),
    maxProfit: z.number().nullable(),
    maxLoss: z.number().nullable(),
    breakevens: z.array(z.number()),
    chanceOfProfitAtHorizon: z.number(),
    chanceOfProfitAtExpiration: z.number(),
    netGreeks: z
      .object({
        delta: z.number(),
        gamma: z.number(),
        theta: z.number(),
        vega: z.number(),
        rho: z.number(),
      })
      .strict(),
  })
  .strict();

export const optimizerCandidateSchema = z
  .object({
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
  })
  .strict();

export const optimizerResponseSchema = z
  .object({
    data: z
      .object({
        candidates: z.array(optimizerCandidateSchema),
      })
      .strict(),
  })
  .strict();

export type OptimizerRequest = z.infer<typeof optimizerRequestSchema>;
export type OptimizerCandidate = z.infer<typeof optimizerCandidateSchema>;
