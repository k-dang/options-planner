import { z } from "zod";
import type { BuilderLeg } from "./types";

export const V1_APPROVED_STRATEGY_NAMES = [
  "Long Call",
  "Long Put",
  "Short Call",
  "Short Put",
  "Bull Call Spread",
  "Bear Put Spread",
  "Bull Put Spread",
  "Bear Call Spread",
  "Iron Condor",
  "Long Straddle",
  "Long Strangle",
  "Covered Call",
  "Cash-Secured Put",
] as const;

const builderLegSchema = z.object({
  kind: z.enum(["option", "stock"]),
  side: z.enum(["buy", "sell"]),
  qty: z.number(),
  right: z.enum(["C", "P"]).optional(),
  strike: z.number().optional(),
  expiry: z.string().optional(),
  entryPriceMode: z.enum(["bid", "ask", "mark", "mid", "manual"]),
  manualEntryPrice: z.number().nonnegative().optional(),
});

export const strategyTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.enum(V1_APPROVED_STRATEGY_NAMES),
  description: z.string().nullable(),
  legsSpec: z.array(builderLegSchema),
});

export type StrategyTemplate = z.infer<typeof strategyTemplateSchema>;

const opt = (side: "buy" | "sell", right: "C" | "P", qty = 1): BuilderLeg => ({
  kind: "option",
  side,
  qty,
  right,
  entryPriceMode: "mark",
});

const V1_STRATEGY_TEMPLATES: readonly StrategyTemplate[] = [
  {
    id: "long-call",
    name: "Long Call",
    description:
      "Bullish directional call with limited downside and open upside.",
    legsSpec: [opt("buy", "C")],
  },
  {
    id: "long-put",
    name: "Long Put",
    description:
      "Bearish directional put with limited downside and convex payoff.",
    legsSpec: [opt("buy", "P")],
  },
  {
    id: "short-call",
    name: "Short Call",
    description:
      "Neutral to bearish premium sale with capped credit and undefined upside risk.",
    legsSpec: [opt("sell", "C")],
  },
  {
    id: "short-put",
    name: "Short Put",
    description:
      "Neutral to bullish premium sale that benefits from staying above the strike.",
    legsSpec: [opt("sell", "P")],
  },
  {
    id: "bull-call-spread",
    name: "Bull Call Spread",
    description:
      "Defined-risk bullish vertical spread using a long call and a higher short call.",
    legsSpec: [opt("buy", "C"), opt("sell", "C")],
  },
  {
    id: "bear-put-spread",
    name: "Bear Put Spread",
    description:
      "Defined-risk bearish vertical spread using a long put and a lower short put.",
    legsSpec: [opt("buy", "P"), opt("sell", "P")],
  },
  {
    id: "bull-put-spread",
    name: "Bull Put Spread",
    description:
      "Credit spread that profits when the underlying stays above the short put.",
    legsSpec: [opt("sell", "P"), opt("buy", "P")],
  },
  {
    id: "bear-call-spread",
    name: "Bear Call Spread",
    description:
      "Credit spread that profits when the underlying stays below the short call.",
    legsSpec: [opt("sell", "C"), opt("buy", "C")],
  },
  {
    id: "iron-condor",
    name: "Iron Condor",
    description:
      "Defined-risk premium strategy that benefits from range-bound price action.",
    legsSpec: [
      opt("buy", "P"),
      opt("sell", "P"),
      opt("sell", "C"),
      opt("buy", "C"),
    ],
  },
  {
    id: "long-straddle",
    name: "Long Straddle",
    description:
      "Long volatility position using an at-the-money call and put at one expiry.",
    legsSpec: [opt("buy", "C"), opt("buy", "P")],
  },
  {
    id: "long-strangle",
    name: "Long Strangle",
    description:
      "Long volatility position using an out-of-the-money call and put.",
    legsSpec: [opt("buy", "C"), opt("buy", "P")],
  },
  {
    id: "covered-call",
    name: "Covered Call",
    description:
      "Long stock paired with a short call to harvest premium with capped upside.",
    legsSpec: [
      { kind: "stock", side: "buy", qty: 100, entryPriceMode: "mark" },
      opt("sell", "C"),
    ],
  },
  {
    id: "cash-secured-put",
    name: "Cash-Secured Put",
    description:
      "Short put strategy aimed at collecting premium or buying shares lower.",
    legsSpec: [opt("sell", "P")],
  },
];

export function getV1StrategyTemplates(): readonly StrategyTemplate[] {
  return V1_STRATEGY_TEMPLATES;
}
