import { z } from "zod";

export const mockDatasetVersionSchema = z.literal("1");

export const symbolSearchResultSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  exchange: z.string().optional(),
});

export const underlyingQuoteSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  last: z.number(),
  bid: z.number(),
  ask: z.number(),
  previousClose: z.number(),
  currency: z.string(),
});

export const optionChainContractSchema = z.object({
  strike: z.number(),
  right: z.enum(["C", "P"]),
  contractSymbol: z.string(),
  bid: z.number(),
  ask: z.number(),
  mark: z.number(),
  iv: z.number(),
  delta: z.number(),
  gamma: z.number(),
  theta: z.number(),
  vega: z.number(),
  rho: z.number(),
});

export const optionChainSchema = z.object({
  symbol: z.string(),
  expiry: z.string(),
  underlyingPrice: z.number(),
  contracts: z.array(optionChainContractSchema),
});

export const symbolsQuerySchema = z.object({
  q: z.string().optional().default(""),
});

export const symbolParamSchema = z.object({
  symbol: z.string().min(1),
});

export const chainQuerySchema = z.object({
  symbol: z.string().min(1),
  expiry: z.string().min(1),
});

export type SymbolSearchResult = z.infer<typeof symbolSearchResultSchema>;
export type UnderlyingQuote = z.infer<typeof underlyingQuoteSchema>;
export type OptionChainContract = z.infer<typeof optionChainContractSchema>;
export type OptionChain = z.infer<typeof optionChainSchema>;
