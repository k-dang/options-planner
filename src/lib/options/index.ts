export {
  evaluateStrategy,
  expirationProfitLossAtPrice,
  payoffPriceRange,
  type StrategyEvaluationResult,
  StrategyValidationError,
  safeEvaluateStrategy,
} from "./evaluate";
export {
  defaultTargetUnderlyingPrice,
  enumerateOptimizerCandidates,
  type OptimizerCandidate,
  type OptimizerInputs,
  type OptimizerResultRow,
  type OptimizerThesis,
  optimizeStrategies,
  rankOptimizerCandidates,
  rankOptimizerShortlist,
  type ScanInputs,
  scanRiskReward,
  toOptimizerResultRows,
} from "./optimizer";
export { blackScholes, intrinsicValue } from "./pricing";
export {
  createGeneratedChain,
  GeneratedChainProvider,
} from "./providers/generated";
export { formatStrategyExport } from "./strategy-export";
export {
  type BuildStrategyInput,
  type StrategySummary,
  type StrategyTemplate,
  type StrategyTemplateCatalog,
  strategyTemplates,
  type TemplateRole,
  type ValidationResult,
} from "./strategy-templates";
export type * from "./types";
export { CONTRACT_MULTIPLIER } from "./types";
