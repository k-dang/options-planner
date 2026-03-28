import { getMockMarketDataProvider } from "./mock-provider";
import type { MarketDataProvider } from "./types";

export {
  getMockMarketDataProvider,
  MockMarketDataProvider,
} from "./mock-provider";
export type { MarketDataProvider } from "./types";

export function getMarketDataProvider(): MarketDataProvider {
  return getMockMarketDataProvider();
}
