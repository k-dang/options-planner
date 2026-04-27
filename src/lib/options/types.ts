export const CONTRACT_MULTIPLIER = 100;

export type OptionType = "call" | "put";
export type PositionSide = "long" | "short";
export type StrategyTemplateId =
  | "long-call"
  | "long-put"
  | "short-call"
  | "short-put"
  | "covered-call"
  | "cash-secured-put"
  | "bull-call-spread"
  | "bear-put-spread"
  | "bull-put-spread"
  | "bear-call-spread"
  | "iron-condor"
  | "short-straddle"
  | "short-strangle";

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

export type OptionChainProviderId = "generated" | "alpaca" | "polygon";

export type OptionQuote = {
  provider: OptionChainProviderId;
  providerSymbol?: string;
  optionType: OptionType;
  expiration: string;
  strike: number;
  bid: number | null;
  ask: number | null;
  mid: number | null;
  last: number | null;
  volume: number | null;
  openInterest: number | null;
  impliedVolatility: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  rho: number | null;
  updatedAt: string | null;
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

export type OptionChainRequest = {
  symbol: string;
  asOf?: Date;
  expirationGte?: string;
  expirationLte?: string;
  strikeGte?: number;
  strikeLte?: number;
  feed?: "indicative" | "opra";
};

export type OptionChainProvider = {
  getChain(input: OptionChainRequest): Promise<OptionChainSnapshot>;
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
  maxProfit: number | null;
  maxLoss: number | null;
  breakevens: number[];
  probabilityOfProfit: number | null;
  legs: LegEvaluation[];
  greeks: LegGreeks;
  payoff: PayoffPoint[];
};
