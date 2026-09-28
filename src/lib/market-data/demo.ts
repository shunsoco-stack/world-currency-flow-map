import { SUPPORTED_PAIRS, TIMELINE_LABELS } from "./config";
import type { CurrencyPair, DemoScenarioId, MarketDataProvider, MarketSnapshot, PairQuote, Timeframe } from "./types";

const scenarioChanges: Record<DemoScenarioId, Record<CurrencyPair, number>> = {
  "usd-strong": {
    "USD/JPY": 1.2, "EUR/USD": -0.62, "GBP/USD": -0.75, "USD/CHF": 0.3,
    "AUD/USD": -0.82, "USD/CAD": 0.28, "NZD/USD": -0.38, "EUR/JPY": 0.65,
    "GBP/JPY": 0.54, "AUD/JPY": 0.32, "EUR/GBP": 0.15,
  },
  "jpy-strong": {
    "USD/JPY": -1.05, "EUR/USD": 0.18, "GBP/USD": -0.12, "USD/CHF": 0.08,
    "AUD/USD": -0.45, "USD/CAD": 0.16, "NZD/USD": -0.34, "EUR/JPY": -0.88,
    "GBP/JPY": -0.7, "AUD/JPY": -1.22, "EUR/GBP": 0.28,
  },
  "eur-focus": {
    "USD/JPY": 0.14, "EUR/USD": 0.92, "GBP/USD": 0.22, "USD/CHF": -0.12,
    "AUD/USD": -0.2, "USD/CAD": 0.09, "NZD/USD": -0.18, "EUR/JPY": 1.1,
    "GBP/JPY": 0.35, "AUD/JPY": -0.06, "EUR/GBP": 0.67,
  },
};

const baseRates: Record<CurrencyPair, number> = {
  "USD/JPY": 155.55, "EUR/USD": 1.091, "GBP/USD": 1.281, "USD/CHF": 0.898,
  "AUD/USD": 0.648, "USD/CAD": 1.368, "NZD/USD": 0.592, "EUR/JPY": 169.7,
  "GBP/JPY": 199.2, "AUD/JPY": 100.8, "EUR/GBP": 0.851,
};

const timeframeScale: Record<Timeframe, number> = { "5m": 0.12, "15m": 0.2, "1h": 0.38, "4h": 0.62, "1d": 1, "1w": 1.48 };
const timelineScale = [0.32, 0.55, 0.78, 1];

function precisionFor(pair: CurrencyPair) { return pair.endsWith("JPY") ? 3 : 5; }

export function createDemoSnapshot(
  scenario: DemoScenarioId = "usd-strong",
  timeframe: Timeframe = "1d",
  timelineIndex = 3,
): MarketSnapshot {
  const safeIndex = Math.max(0, Math.min(TIMELINE_LABELS.length - 1, timelineIndex));
  const updatedAt = "2026-09-28T05:32:08.000Z";
  const quotes = SUPPORTED_PAIRS.map((pair) => {
    const changePercent = scenarioChanges[scenario][pair] * timeframeScale[timeframe] * timelineScale[safeIndex];
    const open = baseRates[pair];
    const current = open * (1 + changePercent / 100);
    const spread = Math.abs(current - open) * 0.46 + open * 0.0003;
    const precision = precisionFor(pair);
    return {
      pair, open: Number(open.toFixed(precision)), current: Number(current.toFixed(precision)),
      high: Number((Math.max(open, current) + spread).toFixed(precision)),
      low: Number((Math.min(open, current) - spread).toFixed(precision)),
      changePercent: Number(changePercent.toFixed(3)), updatedAt,
    } satisfies PairQuote;
  });
  return {
    provider: "Built-in deterministic demo", mode: "demo", scenario, timeframe,
    updatedAt, quotes, timelineIndex: safeIndex, timelineLabel: TIMELINE_LABELS[safeIndex],
  };
}

export class DemoMarketDataProvider implements MarketDataProvider {
  readonly id = "demo";
  readonly supportedPairs = SUPPORTED_PAIRS;
  readonly supportedTimeframes = ["5m", "15m", "1h", "4h", "1d", "1w"] as const;

  async getQuote(pair: CurrencyPair) { return this.getChange(pair, "1d"); }
  async getChange(pair: CurrencyPair, timeframe: Timeframe) {
    const quote = createDemoSnapshot("usd-strong", timeframe).quotes.find((item) => item.pair === pair);
    if (!quote) throw new Error(`Unsupported pair: ${pair}`);
    return quote;
  }
  async getHistory(pair: CurrencyPair, timeframe: Timeframe) {
    return TIMELINE_LABELS.map((_, index) => {
      const quote = createDemoSnapshot("usd-strong", timeframe, index).quotes.find((item) => item.pair === pair);
      if (!quote) throw new Error(`Unsupported pair: ${pair}`);
      return quote;
    });
  }
}
