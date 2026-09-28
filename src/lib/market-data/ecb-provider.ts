import "server-only";

import { buildEcbSnapshot, ECB_API_URL, parseEcbCsv } from "./ecb";
import type { CurrencyPair, MarketDataProvider, PairQuote, Timeframe } from "./types";
import { SUPPORTED_PAIRS } from "./config";

export class EcbReferenceRateProvider implements MarketDataProvider {
  readonly id = "ecb-reference-rates";
  readonly supportedPairs = SUPPORTED_PAIRS;
  readonly supportedTimeframes = ["1d", "1w"] as const;
  private observationsPromise?: Promise<ReturnType<typeof parseEcbCsv>>;

  private async loadObservations() {
    this.observationsPromise ??= fetch(ECB_API_URL, {
      headers: { Accept: "text/csv" },
      next: { revalidate: 3600 },
    }).then(async (response) => {
      if (!response.ok) throw new Error(`ECB Data API returned ${response.status}`);
      return parseEcbCsv(await response.text());
    });
    return this.observationsPromise;
  }

  async getSnapshot(timeframe: Timeframe) {
    return buildEcbSnapshot(await this.loadObservations(), timeframe);
  }

  async getQuote(pair: CurrencyPair): Promise<PairQuote> {
    return this.getChange(pair, "1d");
  }

  async getChange(pair: CurrencyPair, timeframe: Timeframe): Promise<PairQuote> {
    const quote = (await this.getSnapshot(timeframe)).quotes.find((item) => item.pair === pair);
    if (!quote) throw new Error(`Unsupported pair: ${pair}`);
    return quote;
  }

  async getHistory(pair: CurrencyPair, timeframe: Timeframe): Promise<PairQuote[]> {
    const observations = await this.loadObservations();
    const dates = [...new Set(observations.map((item) => item.date))].sort();
    const lookback = timeframe === "1d" ? 1 : timeframe === "1w" ? 5 : Number.POSITIVE_INFINITY;
    if (!Number.isFinite(lookback)) throw new Error(`ECB does not support ${timeframe}`);

    return dates.slice(lookback).map((date) => {
      const snapshot = buildEcbSnapshot(observations.filter((item) => item.date <= date), timeframe);
      const quote = snapshot.quotes.find((item) => item.pair === pair);
      if (!quote) throw new Error(`Unsupported pair: ${pair}`);
      return quote;
    });
  }
}
