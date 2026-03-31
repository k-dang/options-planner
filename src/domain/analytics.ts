import { z } from "zod";

const commissionsSchema = z
  .object({
    perContract: z.number().nonnegative(),
    perLegFee: z.number().nonnegative(),
  })
  .strict();

const ivOverridesSchema = z
  .object({
    global: z.number().positive().optional(),
    byExpiry: z.record(z.string(), z.number().positive()),
  })
  .strict();

const gridSchema = z
  .object({
    pricePoints: z.number().int().min(3),
    datePoints: z.number().int().min(2),
    priceRangePct: z.number().positive(),
  })
  .strict();

export const builderLegInputSchema = z
  .object({
    kind: z.enum(["option", "stock"]),
    side: z.enum(["buy", "sell"]),
    qty: z.number().positive(),
    right: z.enum(["C", "P"]).optional(),
    strike: z.number().optional(),
    expiry: z.string().optional(),
    entryPriceMode: z.enum(["bid", "ask", "mark", "mid", "manual"]),
    manualEntryPrice: z.number().nonnegative().optional(),
  })
  .strict()
  .superRefine((leg, ctx) => {
    if (leg.kind === "option") {
      if (!leg.right) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["right"],
          message: "Option legs require a right",
        });
      }
      if (leg.strike == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["strike"],
          message: "Option legs require a strike",
        });
      }
      if (!leg.expiry) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expiry"],
          message: "Option legs require an expiry",
        });
      }
    }

    if (leg.entryPriceMode === "manual" && leg.manualEntryPrice == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["manualEntryPrice"],
        message: "Manual entry price is required when entryPriceMode is manual",
      });
    }
  });

export const builderStateSchema = z
  .object({
    symbol: z.string().trim().min(1),
    templateName: z.string().trim().min(1).optional(),
    horizonDays: z.number().int().positive(),
    riskFreeRate: z.number().min(0),
    commissions: commissionsSchema,
    ivOverrides: ivOverridesSchema,
    grid: gridSchema,
    legs: z.array(builderLegInputSchema).min(1),
  })
  .strict();

export const calcSummarySchema = z
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

export const calcGridSchema = z
  .object({
    prices: z.array(z.number()),
    dates: z.array(z.string()),
    values: z.array(z.array(z.number())),
  })
  .strict();

export const calcChartSchema = z
  .object({
    selectedDate: z.string(),
    series: z.array(
      z
        .object({
          price: z.number(),
          pnl: z.number(),
        })
        .strict(),
    ),
    impliedMove1x: z
      .object({
        down: z.number(),
        up: z.number(),
      })
      .strict(),
    impliedMove2x: z
      .object({
        down: z.number(),
        up: z.number(),
      })
      .strict(),
  })
  .strict();

export const strategyCalcRequestSchema = z
  .object({
    builderState: builderStateSchema,
  })
  .strict();

export const strategyCalcResponseSchema = z
  .object({
    data: z
      .object({
        summary: calcSummarySchema,
        grid: calcGridSchema,
        chart: calcChartSchema,
      })
      .strict(),
  })
  .strict();

export type BuilderStateInput = z.infer<typeof builderStateSchema>;
export type StrategyCalcRequest = z.infer<typeof strategyCalcRequestSchema>;
export type StrategyCalcResponse = z.infer<typeof strategyCalcResponseSchema>;
