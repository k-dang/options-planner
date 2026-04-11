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
  exerciseStyle: z.enum(["american", "european"]),
  multiplier: z.number().int().positive(),
  bid: z.number(),
  ask: z.number(),
  mark: z.number(),
  iv: z.number(),
  volume: z.number().int().nonnegative(),
  openInterest: z.number().int().nonnegative(),
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

export const optionIndexEntrySchema = z.object({
  expiry: z.string(),
  calls: z.array(z.number()),
  puts: z.array(z.number()),
});

export const optionIndexSchema = z.object({
  symbol: z.string(),
  expirations: z.array(optionIndexEntrySchema),
});

export const symbolSearchResponseSchema = z.strictObject({
  data: z.array(symbolSearchResultSchema),
});

export const optionIndexResponseSchema = z.strictObject({
  data: optionIndexSchema,
});

export const quoteResponseSchema = z.strictObject({
  data: underlyingQuoteSchema,
});

export const symbolsQuerySchema = z.object({
  q: z.string().optional().default(""),
});

export const symbolParamSchema = z.object({
  symbol: z.string().min(1),
});

export type SymbolSearchResult = z.infer<typeof symbolSearchResultSchema>;
export type SymbolSearchResponse = z.infer<typeof symbolSearchResponseSchema>;
export type UnderlyingQuote = z.infer<typeof underlyingQuoteSchema>;
export type OptionChainContract = z.infer<typeof optionChainContractSchema>;
export type OptionChain = z.infer<typeof optionChainSchema>;
export type OptionIndex = z.infer<typeof optionIndexSchema>;
export type OptionIndexResponse = z.infer<typeof optionIndexResponseSchema>;
export type QuoteResponse = z.infer<typeof quoteResponseSchema>;
