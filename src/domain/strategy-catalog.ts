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
  manualEntryPrice: z.number().optional(),
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
    description: null,
    legsSpec: [opt("buy", "C")],
  },
  {
    id: "long-put",
    name: "Long Put",
    description: null,
    legsSpec: [opt("buy", "P")],
  },
  {
    id: "short-call",
    name: "Short Call",
    description: null,
    legsSpec: [opt("sell", "C")],
  },
  {
    id: "short-put",
    name: "Short Put",
    description: null,
    legsSpec: [opt("sell", "P")],
  },
  {
    id: "bull-call-spread",
    name: "Bull Call Spread",
    description: null,
    legsSpec: [opt("buy", "C"), opt("sell", "C")],
  },
  {
    id: "bear-put-spread",
    name: "Bear Put Spread",
    description: null,
    legsSpec: [opt("buy", "P"), opt("sell", "P")],
  },
  {
    id: "bull-put-spread",
    name: "Bull Put Spread",
    description: null,
    legsSpec: [opt("sell", "P"), opt("buy", "P")],
  },
  {
    id: "bear-call-spread",
    name: "Bear Call Spread",
    description: null,
    legsSpec: [opt("sell", "C"), opt("buy", "C")],
  },
  {
    id: "iron-condor",
    name: "Iron Condor",
    description: null,
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
    description: null,
    legsSpec: [opt("buy", "C"), opt("buy", "P")],
  },
  {
    id: "long-strangle",
    name: "Long Strangle",
    description: null,
    legsSpec: [opt("buy", "C"), opt("buy", "P")],
  },
  {
    id: "covered-call",
    name: "Covered Call",
    description: null,
    legsSpec: [
      { kind: "stock", side: "buy", qty: 100, entryPriceMode: "mark" },
      opt("sell", "C"),
    ],
  },
  {
    id: "cash-secured-put",
    name: "Cash-Secured Put",
    description: null,
    legsSpec: [opt("sell", "P")],
  },
];

export function getV1StrategyTemplates(): readonly StrategyTemplate[] {
  return V1_STRATEGY_TEMPLATES;
}
