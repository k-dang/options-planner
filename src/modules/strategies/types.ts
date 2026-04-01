export type BuilderLeg = {
  kind: "option" | "stock";
  side: "buy" | "sell";
  qty: number;
  right?: "C" | "P";
  strike?: number;
  expiry?: string;
  entryPriceMode: "bid" | "ask" | "mark" | "mid" | "manual";
  manualEntryPrice?: number;
};

export type BuilderState = {
  symbol: string;
  templateName?: string;
  horizonDays: number;
  riskFreeRate: number;
  commissions: { perContract: number; perLegFee: number };
  ivOverrides: { global?: number; byExpiry: Record<string, number> };
  grid: { pricePoints: number; datePoints: number; priceRangePct: number };
  legs: BuilderLeg[];
};
