import "server-only";

import type { CurrencyPair, MarketDataProvider, PairQuote, Timeframe } from "./types";

/**
 * Real providers implement this interface on the server only. API keys are read
 * from process.env and responses should be cached according to provider terms.
 */
export class UnconfiguredRealMarketDataProvider implements MarketDataProvider {
  readonly id = process.env.MARKET_DATA_PROVIDER || "unconfigured";
  readonly supportedPairs: readonly CurrencyPair[] = [];
  readonly supportedTimeframes: readonly Timeframe[] = [];

  private unavailable(): never {
    throw new Error("Real data provider is not configured");
  }
  async getQuote(pair: CurrencyPair): Promise<PairQuote> { void pair; return this.unavailable(); }
  async getChange(pair: CurrencyPair, timeframe: Timeframe): Promise<PairQuote> { void pair; void timeframe; return this.unavailable(); }
  async getHistory(pair: CurrencyPair, timeframe: Timeframe): Promise<PairQuote[]> { void pair; void timeframe; return this.unavailable(); }
}
