import { SUPPORTED_PAIRS } from "./config";
import { calculatePercentageChange, splitPair } from "./engine";
import type { CurrencyCode, CurrencyPair, MarketSnapshot, PairQuote, Timeframe } from "./types";

export const ECB_SOURCE_URL = "https://data.ecb.europa.eu/data/datasets/EXR";
export const ECB_API_URL = "https://data-api.ecb.europa.eu/service/data/EXR/D.USD+JPY+GBP+CHF+AUD+CAD+NZD.EUR.SP00.A?lastNObservations=10&detail=dataonly&format=csvdata";
export const ECB_REAL_TIMEFRAMES = ["1d", "1w"] as const satisfies readonly Timeframe[];

type EcbCurrency = Exclude<CurrencyCode, "EUR">;

export interface EcbObservation {
  currency: EcbCurrency;
  date: string;
  value: number;
}

const ECB_CURRENCIES = new Set<EcbCurrency>(["USD", "JPY", "GBP", "CHF", "AUD", "CAD", "NZD"]);

export function parseEcbCsv(csv: string): EcbObservation[] {
  const lines = csv.replaceAll("\r", "").trim().split("\n");
  const header = lines.shift()?.split(",") ?? [];
  const currencyIndex = header.indexOf("CURRENCY");
  const dateIndex = header.indexOf("TIME_PERIOD");
  const valueIndex = header.indexOf("OBS_VALUE");
  if (currencyIndex < 0 || dateIndex < 0 || valueIndex < 0) throw new Error("ECB response schema is unsupported");

  return lines.flatMap((line) => {
    const cells = line.split(",");
    const currency = cells[currencyIndex] as EcbCurrency;
    const date = cells[dateIndex];
    const value = Number(cells[valueIndex]);
    if (!ECB_CURRENCIES.has(currency) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(value) || value <= 0) return [];
    return [{ currency, date, value }];
  });
}

function precisionFor(pair: CurrencyPair) {
  return pair.endsWith("JPY") ? 3 : 5;
}

function crossRate(pair: CurrencyPair, rates: ReadonlyMap<CurrencyCode, number>): number {
  const [base, quote] = splitPair(pair);
  const basePerEur = base === "EUR" ? 1 : rates.get(base);
  const quotePerEur = quote === "EUR" ? 1 : rates.get(quote);
  if (!basePerEur || !quotePerEur) throw new Error(`ECB rate is missing for ${pair}`);
  return quotePerEur / basePerEur;
}

export function buildEcbSnapshot(
  observations: readonly EcbObservation[],
  timeframe: Timeframe,
  fetchedAt = new Date().toISOString(),
): MarketSnapshot {
  if (!ECB_REAL_TIMEFRAMES.includes(timeframe as "1d" | "1w")) throw new Error(`ECB does not support ${timeframe}`);

  const byDate = new Map<string, Map<CurrencyCode, number>>();
  for (const observation of observations) {
    const rates = byDate.get(observation.date) ?? new Map<CurrencyCode, number>();
    rates.set(observation.currency, observation.value);
    byDate.set(observation.date, rates);
  }
  const completeDates = [...byDate.entries()]
    .filter(([, rates]) => rates.size === ECB_CURRENCIES.size)
    .sort(([a], [b]) => a.localeCompare(b));
  const lookback = timeframe === "1d" ? 1 : 5;
  if (completeDates.length <= lookback) throw new Error("ECB history is too short for the selected timeframe");

  const window = completeDates.slice(-(lookback + 1));
  const latestDate = window.at(-1)![0];
  const updatedAt = `${latestDate}T00:00:00.000Z`;
  const quotes = SUPPORTED_PAIRS.map((pair) => {
    const values = window.map(([, rates]) => crossRate(pair, rates));
    const open = values[0];
    const current = values.at(-1)!;
    const precision = precisionFor(pair);
    return {
      pair,
      current: Number(current.toFixed(precision)),
      open: Number(open.toFixed(precision)),
      high: Number(Math.max(...values).toFixed(precision)),
      low: Number(Math.min(...values).toFixed(precision)),
      changePercent: Number(calculatePercentageChange(open, current).toFixed(3)),
      updatedAt,
    } satisfies PairQuote;
  });

  return {
    provider: "European Central Bank (ECB)",
    mode: "real",
    timeframe,
    updatedAt,
    fetchedAt,
    sourceUrl: ECB_SOURCE_URL,
    quotes,
    timelineIndex: 0,
    timelineLabel: latestDate,
  };
}
