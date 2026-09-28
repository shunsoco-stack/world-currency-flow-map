export const CURRENCIES = ["USD", "JPY", "EUR", "GBP", "CHF", "AUD", "CAD", "NZD"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export const TIMEFRAMES = ["5m", "15m", "1h", "4h", "1d", "1w"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];
export type DemoScenarioId = "usd-strong" | "jpy-strong" | "eur-focus";

export type CurrencyPair =
  | "USD/JPY" | "EUR/USD" | "GBP/USD" | "USD/CHF" | "AUD/USD" | "USD/CAD"
  | "NZD/USD" | "EUR/JPY" | "GBP/JPY" | "AUD/JPY" | "EUR/GBP";

export interface PairQuote {
  pair: CurrencyPair;
  current: number;
  open: number;
  high: number;
  low: number;
  changePercent: number;
  updatedAt: string;
}

export interface MarketSnapshot {
  provider: string;
  mode: "demo" | "real";
  scenario?: DemoScenarioId;
  timeframe: Timeframe;
  updatedAt: string;
  fetchedAt?: string;
  sourceUrl?: string;
  quotes: PairQuote[];
  timelineIndex: number;
  timelineLabel: string;
  fallbackReason?: string;
}

export interface CurrencyStrength {
  currency: CurrencyCode;
  raw: number;
  score: number;
  direction: "up" | "flat" | "down";
  pairCount: number;
}

export interface CurrencyFlow {
  pair: CurrencyPair;
  from: CurrencyCode;
  to: CurrencyCode;
  stronger: CurrencyCode;
  weaker: CurrencyCode;
  changePercent: number;
  magnitude: number;
  width: "thin" | "medium" | "thick";
  strokeWidth: number;
  durationSeconds: number;
  quote: PairQuote;
}

export interface FlowThresholds {
  thinMax: number;
  mediumMax: number;
  widths: { thin: number; medium: number; thick: number };
}

export interface MarketDataProvider {
  readonly id: string;
  readonly supportedPairs: readonly CurrencyPair[];
  readonly supportedTimeframes: readonly Timeframe[];
  getQuote(pair: CurrencyPair): Promise<PairQuote>;
  getChange(pair: CurrencyPair, timeframe: Timeframe): Promise<PairQuote>;
  getHistory(pair: CurrencyPair, timeframe: Timeframe): Promise<PairQuote[]>;
}
