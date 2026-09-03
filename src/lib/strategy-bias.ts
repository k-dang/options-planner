import {
  type StrategyBias,
  strategyTemplates,
} from "@/lib/options/strategy-templates";
import type { StrategyTemplateId } from "@/lib/options/types";

/** The bias a badge shows: "income" is a secondary tag, never the headline direction. */
export type DisplayBias = Exclude<StrategyBias, "income">;

export const STRATEGY_BIAS = Object.fromEntries(
  strategyTemplates
    .all()
    .map((template) => [
      template.id,
      template.biases.find((bias): bias is DisplayBias => bias !== "income") ??
        "neutral",
    ]),
) as Record<StrategyTemplateId, DisplayBias>;
