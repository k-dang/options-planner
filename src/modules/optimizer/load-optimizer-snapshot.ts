import { getErrorMessage } from "@/modules/errors";
import { getMarketDataProvider } from "@/modules/market";
import { optimizerRunRequestSchema } from "@/modules/optimizer/schemas";
import { loadChainsByExpiry } from "@/modules/strategies/option-chains";
import type { OptimizerDataset } from "./compute-optimizer-cards";

export type OptimizerSnapshotData = OptimizerDataset;

export type OptimizerRunInput = {
  symbol: string;
};

export type OptimizerSnapshotResult =
  | {
      ok: false;
      error: string;
    }
  | {
      ok: true;
      data: OptimizerSnapshotData;
    };

export async function loadOptimizerSnapshot(
  input: OptimizerRunInput,
): Promise<OptimizerSnapshotResult> {
  const parsed = optimizerRunRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid optimizer input.",
    };
  }

  try {
    const provider = getMarketDataProvider();
    const { symbol } = parsed.data;
    const [quote, expirations] = await Promise.all([
      provider.getQuote(symbol),
      provider.getExpirations(symbol),
    ]);

    if (!quote) {
      return {
        ok: false,
        error: `No quote for symbol: ${symbol}`,
      };
    }

    const chainsByExpiry = await loadChainsByExpiry({
      provider,
      symbol,
      expiries: expirations,
    });
    const data = {
      quote,
      expirations,
      chainsByExpiry,
    };

    return {
      ok: true,
      data,
    };
  } catch (error) {
    return {
      ok: false,
      error: getErrorMessage(error),
    };
  }
}
