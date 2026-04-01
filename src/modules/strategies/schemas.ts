import { z } from "zod";

const commissionsSchema = z.strictObject({
  perContract: z.number().nonnegative(),
  perLegFee: z.number().nonnegative(),
});

const ivOverridesSchema = z.strictObject({
  global: z.number().positive().optional(),
  byExpiry: z.record(z.string(), z.number().positive()),
});

const gridSchema = z.strictObject({
  pricePoints: z.number().int().min(3),
  datePoints: z.number().int().min(2),
  priceRangePct: z.number().positive(),
});

export const builderLegInputSchema = z
  .strictObject({
    kind: z.enum(["option", "stock"]),
    side: z.enum(["buy", "sell"]),
    qty: z.number().positive(),
    right: z.enum(["C", "P"]).optional(),
    strike: z.number().positive().optional(),
    expiry: z.string().optional(),
    entryPriceMode: z.enum(["bid", "ask", "mark", "mid", "manual"]),
    manualEntryPrice: z.number().nonnegative().optional(),
  })
  .superRefine((leg, ctx) => {
    if (leg.kind === "option") {
      if (!leg.right) {
        ctx.addIssue({
          code: "custom",
          path: ["right"],
          message: "Option legs require a right",
        });
      }
      if (leg.strike == null) {
        ctx.addIssue({
          code: "custom",
          path: ["strike"],
          message: "Option legs require a strike",
        });
      }
      if (!leg.expiry) {
        ctx.addIssue({
          code: "custom",
          path: ["expiry"],
          message: "Option legs require an expiry",
        });
      }
    }

    if (leg.entryPriceMode === "manual" && leg.manualEntryPrice == null) {
      ctx.addIssue({
        code: "custom",
        path: ["manualEntryPrice"],
        message: "Manual entry price is required when entryPriceMode is manual",
      });
    }
  });

export const builderStateSchema = z.strictObject({
  symbol: z.string().trim().min(1),
  templateName: z.string().trim().min(1).optional(),
  horizonDays: z.number().int().positive(),
  riskFreeRate: z.number().min(0),
  commissions: commissionsSchema,
  ivOverrides: ivOverridesSchema,
  grid: gridSchema,
  legs: z.array(builderLegInputSchema).min(1),
});

export const calcSummarySchema = z.strictObject({
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

export const calcGridSchema = z.strictObject({
  prices: z.array(z.number()),
  dates: z.array(z.string()),
  values: z.array(z.array(z.number())),
});

export const calcChartSchema = z.strictObject({
  selectedDate: z.string(),
  series: z.array(
    z.strictObject({
      price: z.number(),
      pnl: z.number(),
    }),
  ),
  impliedMove1x: z.strictObject({
    down: z.number(),
    up: z.number(),
  }),
  impliedMove2x: z.strictObject({
    down: z.number(),
    up: z.number(),
  }),
});

export const strategyCalcRequestSchema = z.strictObject({
  builderState: builderStateSchema,
});

export const strategyCalcResponseSchema = z.strictObject({
  data: z.strictObject({
    summary: calcSummarySchema,
    grid: calcGridSchema,
    chart: calcChartSchema,
  }),
});

export type BuilderStateInput = z.infer<typeof builderStateSchema>;
export type StrategyCalcRequest = z.infer<typeof strategyCalcRequestSchema>;
export type StrategyCalcResponse = z.infer<typeof strategyCalcResponseSchema>;
