import type { OptionChainProvider } from "../types";
import { AlpacaOptionChainProvider } from "./alpaca";
import { GeneratedChainProvider } from "./generated";

export function getOptionChainProvider(): OptionChainProvider {
  if (process.env.OPTION_CHAIN_PROVIDER === "alpaca") {
    return new AlpacaOptionChainProvider({
      apiKey: requiredEnv("ALPACA_API_KEY"),
      apiSecret: requiredEnv("ALPACA_API_SECRET"),
      feed: process.env.ALPACA_OPTIONS_FEED === "opra" ? "opra" : "indicative",
    });
  }

  return new GeneratedChainProvider();
}

function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required when OPTION_CHAIN_PROVIDER=alpaca.`);
  }

  return value;
}
