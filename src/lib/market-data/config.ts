import type { CurrencyCode, CurrencyPair, FlowThresholds, Timeframe } from "./types";

export const SUPPORTED_PAIRS: readonly CurrencyPair[] = [
  "USD/JPY", "EUR/USD", "GBP/USD", "USD/CHF", "AUD/USD", "USD/CAD",
  "NZD/USD", "EUR/JPY", "GBP/JPY", "AUD/JPY", "EUR/GBP",
] as const;

export const SUPPORTED_TIMEFRAMES: readonly Timeframe[] = ["5m", "15m", "1h", "4h", "1d", "1w"];

export const FLOW_THRESHOLDS: FlowThresholds = {
  thinMax: 0.25,
  mediumMax: 0.75,
  widths: { thin: 2.25, medium: 4.5, thick: 7.5 },
};

export const CURRENCY_META: Record<CurrencyCode, {
  name: string; region: string; flag: string; coordinates: [number, number]; offset: [number, number];
}> = {
  USD: { name: "米ドル", region: "アメリカ", flag: "🇺🇸", coordinates: [-98, 38], offset: [0, 0] },
  JPY: { name: "日本円", region: "日本", flag: "🇯🇵", coordinates: [139.7, 35.7], offset: [0, 0] },
  EUR: { name: "ユーロ", region: "ユーロ圏", flag: "🇪🇺", coordinates: [10, 50], offset: [31, 4] },
  GBP: { name: "英ポンド", region: "イギリス", flag: "🇬🇧", coordinates: [-1.5, 53], offset: [-36, -21] },
  CHF: { name: "スイスフラン", region: "スイス", flag: "🇨🇭", coordinates: [8.2, 46.8], offset: [25, 34] },
  AUD: { name: "豪ドル", region: "オーストラリア", flag: "🇦🇺", coordinates: [134, -25], offset: [0, 0] },
  CAD: { name: "加ドル", region: "カナダ", flag: "🇨🇦", coordinates: [-106, 57], offset: [0, 0] },
  NZD: { name: "NZドル", region: "ニュージーランド", flag: "🇳🇿", coordinates: [174, -41], offset: [0, 0] },
};

export const TIMELINE_LABELS = ["09:00", "11:00", "13:00", "14:32"] as const;
