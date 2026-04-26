export const CONTRACT_MULTIPLIER = 100;

export type OptionType = "call" | "put";
export type PositionSide = "long" | "short";
export type StrategyTemplateId =
  | "long-call"
  | "long-put"
  | "covered-call"
  | "cash-secured-put"
  | "bull-call-spread"
  | "bear-put-spread";

export type StockLeg = {
  kind: "stock";
  side: PositionSide;
  quantity: number;
  entryPrice: number;
};

export type OptionLeg = {
  kind: "option";
  optionType: OptionType;
  side: PositionSide;
  quantity: number;
  expiration: string;
  strike: number;
  premium: number;
  impliedVolatility: number;
};

export type PositionLeg = StockLeg | OptionLeg;

export type StrategyState = {
  version: 1;
  strategy: StrategyTemplateId;
  symbol: string;
  underlyingPrice: number;
  asOf: string;
  legs: PositionLeg[];
};

export type UnderlyingQuote = {
  symbol: string;
  price: number;
  asOf: string;
};

export type OptionQuote = {
  optionType: OptionType;
  expiration: string;
  strike: number;
  bid: number;
  ask: number;
  mid: number;
  impliedVolatility: number;
  delta: number;
};

export type OptionExpiration = {
  expiration: string;
  daysToExpiration: number;
  calls: OptionQuote[];
  puts: OptionQuote[];
};

export type OptionChainSnapshot = {
  underlying: UnderlyingQuote;
  expirations: OptionExpiration[];
};

export type ChainProvider = {
  getChain(symbol: string, asOf?: Date): OptionChainSnapshot;
};

export type LegGreeks = {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  rho: number;
};

export type LegEvaluation = {
  leg: PositionLeg;
  marketValue: number;
  entryValue: number;
  greeks: LegGreeks;
};

export type PayoffPoint = {
  underlyingPrice: number;
  expirationProfitLoss: number;
  modelProfitLoss: number;
  profitLoss: number;
};

export type StrategyEvaluation = {
  state: StrategyState;
  netPremium: number;
  capitalRequired: number;
  maxProfit: number | null;
  maxLoss: number | null;
  breakevens: number[];
  probabilityOfProfit: number | null;
  legs: LegEvaluation[];
  greeks: LegGreeks;
  payoff: PayoffPoint[];
};
