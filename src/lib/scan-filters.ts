import { DEFAULT_SCAN_CRITERIA } from "@/lib/options/optimizer";
import { strategyTemplates } from "@/lib/options/strategy-templates";
import type { StrategyTemplateId } from "@/lib/options/types";

export type ScanFilters = {
  minDays: number;
  maxDays: number;
  minPop: number;
  enabled: Set<StrategyTemplateId>;
};

export function createDefaultScanFilters(): ScanFilters {
  return {
    minDays: DEFAULT_SCAN_CRITERIA.minDaysToExpiration,
    maxDays: DEFAULT_SCAN_CRITERIA.maxDaysToExpiration,
    minPop: DEFAULT_SCAN_CRITERIA.minProbabilityOfProfit,
    enabled: new Set<StrategyTemplateId>(
      strategyTemplates.defaultScanStrategies(),
    ),
  };
}
