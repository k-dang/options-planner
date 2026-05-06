import { getAlpacaClient } from "@/lib/alpaca/client";
import type { OptionChainProvider } from "../types";
import { AlpacaOptionChainProvider } from "./alpaca";
import { GeneratedChainProvider } from "./generated";

export function getOptionChainProvider(): OptionChainProvider {
  if (process.env.OPTION_CHAIN_PROVIDER === "alpaca") {
    const client = getAlpacaClient();

    if (!client) {
      throw new Error(
        "ALPACA_API_KEY and ALPACA_API_SECRET are required when OPTION_CHAIN_PROVIDER=alpaca.",
      );
    }

    return new AlpacaOptionChainProvider({
      client,
      feed: process.env.ALPACA_OPTIONS_FEED === "opra" ? "opra" : "indicative",
    });
  }

  return new GeneratedChainProvider();
}
