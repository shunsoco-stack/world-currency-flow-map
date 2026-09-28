import { CURRENCIES, type CurrencyCode, type CurrencyFlow, type CurrencyPair, type CurrencyStrength, type FlowThresholds, type MarketDataProvider, type MarketSnapshot, type PairQuote, type Timeframe } from "./types";
import { FLOW_THRESHOLDS } from "./config";

export function splitPair(pair: CurrencyPair): [CurrencyCode, CurrencyCode] {
  return pair.split("/") as [CurrencyCode, CurrencyCode];
}

export function safeNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function calculatePercentageChange(open: number, current: number): number {
  if (!Number.isFinite(open) || !Number.isFinite(current) || open === 0) return 0;
  return ((current - open) / open) * 100;
}

export function getFlowWidth(magnitude: number, thresholds: FlowThresholds = FLOW_THRESHOLDS) {
  const clean = Math.abs(safeNumber(magnitude));
  if (clean <= thresholds.thinMax) return { width: "thin" as const, strokeWidth: thresholds.widths.thin };
  if (clean <= thresholds.mediumMax) return { width: "medium" as const, strokeWidth: thresholds.widths.medium };
  return { width: "thick" as const, strokeWidth: thresholds.widths.thick };
}

export function quoteToFlow(quote: PairQuote, thresholds: FlowThresholds = FLOW_THRESHOLDS): CurrencyFlow {
  const [base, counter] = splitPair(quote.pair);
  const change = safeNumber(quote.changePercent);
  const positive = change >= 0;
  const magnitude = Math.abs(change);
  const { width, strokeWidth } = getFlowWidth(magnitude, thresholds);
  return {
    pair: quote.pair,
    from: positive ? counter : base,
    to: positive ? base : counter,
    stronger: positive ? base : counter,
    weaker: positive ? counter : base,
    changePercent: change,
    magnitude,
    width,
    strokeWidth,
    durationSeconds: Math.max(1.4, 4.4 - Math.min(magnitude, 1.5) * 1.8),
    quote,
  };
}

export function computeCurrencyStrength(quotes: readonly PairQuote[]): CurrencyStrength[] {
  const totals = new Map<CurrencyCode, { sum: number; count: number }>(
    CURRENCIES.map((currency) => [currency, { sum: 0, count: 0 }]),
  );

  for (const quote of quotes) {
    const [base, counter] = splitPair(quote.pair);
    const change = safeNumber(quote.changePercent);
    const baseEntry = totals.get(base)!;
    const counterEntry = totals.get(counter)!;
    baseEntry.sum += change;
    baseEntry.count += 1;
    counterEntry.sum -= change;
    counterEntry.count += 1;
  }

  const averages = CURRENCIES.map((currency) => {
    const entry = totals.get(currency)!;
    return { currency, raw: entry.count ? entry.sum / entry.count : 0, pairCount: entry.count };
  });
  const maxAbsolute = Math.max(...averages.map((item) => Math.abs(item.raw)), 0.0001);

  return averages
    .map(({ currency, raw, pairCount }) => {
      const score = Math.round((raw / maxAbsolute) * 100);
      return { currency, raw, score, pairCount, direction: score > 5 ? "up" as const : score < -5 ? "down" as const : "flat" as const };
    })
    .sort((a, b) => b.score - a.score || a.currency.localeCompare(b.currency));
}

export function filterFlows(flows: readonly CurrencyFlow[], currency: CurrencyCode | null): CurrencyFlow[] {
  if (!currency) return [...flows];
  return flows.filter((flow) => flow.from === currency || flow.to === currency);
}

export function getCurrencyComparisons(currency: CurrencyCode, flows: readonly CurrencyFlow[]) {
  return flows
    .filter((flow) => flow.from === currency || flow.to === currency)
    .map((flow) => ({
      pair: flow.pair,
      other: flow.from === currency ? flow.to : flow.from,
      relation: flow.to === currency ? "stronger" as const : "weaker" as const,
      changePercent: flow.changePercent,
    }))
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
}

export function createMarketSummary(strengths: readonly CurrencyStrength[]): string {
  const strongest = strengths[0];
  const weakest = strengths[strengths.length - 1];
  if (!strongest || !weakest) return "表示できる市場データがありません。";
  return `${strongest.currency}が主要通貨に対して相対的に優勢です。${weakest.currency}は主要通貨の多くに対して相対的に弱い動きです。`;
}

export function isStale(updatedAt: string, now = new Date(), staleAfterMs = 90_000): boolean {
  const updated = new Date(updatedAt).getTime();
  return !Number.isFinite(updated) || now.getTime() - updated > staleAfterMs;
}

export function isDailyReferenceStale(updatedAt: string, now = new Date()): boolean {
  const observed = new Date(`${updatedAt.slice(0, 10)}T00:00:00.000Z`);
  if (!Number.isFinite(observed.getTime())) return true;
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (observed >= today) return false;

  let businessDays = 0;
  const cursor = new Date(observed);
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  while (cursor <= today) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) businessDays += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return businessDays > 1;
}

export function isFxMarketClosed(date = new Date()): boolean {
  const day = date.getUTCDay();
  const hour = date.getUTCHours();
  return day === 6 || (day === 5 && hour >= 22) || (day === 0 && hour < 22);
}

export function shouldAnimate(options: { prefersReducedMotion: boolean; pageVisible: boolean; userPaused: boolean }): boolean {
  return !options.prefersReducedMotion && options.pageVisible && !options.userPaused;
}

export async function loadSnapshotWithFallback(
  provider: MarketDataProvider,
  pairs: readonly CurrencyPair[],
  timeframe: Timeframe,
  fallback: () => MarketSnapshot,
): Promise<MarketSnapshot> {
  try {
    const quotes = await Promise.all(pairs.map((pair) => provider.getChange(pair, timeframe)));
    return {
      provider: provider.id, mode: "real", scenario: "usd-strong", timeframe,
      updatedAt: quotes[0]?.updatedAt ?? new Date(0).toISOString(), quotes,
      timelineIndex: 0, timelineLabel: "最新",
    };
  } catch (error) {
    return { ...fallback(), fallbackReason: error instanceof Error ? error.message : "市場データを取得できません" };
  }
}
