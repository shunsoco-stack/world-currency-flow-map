import { describe, expect, it } from "vitest";

import { FLOW_THRESHOLDS, SUPPORTED_PAIRS, SUPPORTED_TIMEFRAMES } from "./config";
import { createDemoSnapshot } from "./demo";
import {
  calculatePercentageChange, computeCurrencyStrength, filterFlows, getFlowWidth,
  isDailyReferenceStale, isFxMarketClosed, isStale, loadSnapshotWithFallback, quoteToFlow, shouldAnimate,
} from "./engine";
import type { MarketDataProvider, PairQuote } from "./types";

const usdJpy = (changePercent: number): PairQuote => ({
  pair: "USD/JPY", current: 157.4, open: 155.5, high: 158, low: 155,
  changePercent, updatedAt: "2026-09-28T05:32:08.000Z",
});

describe("flow direction engine", () => {
  it("USD/JPYプラスではJPYからUSDへ向ける", () => {
    const flow = quoteToFlow(usdJpy(1.2));
    expect(flow.from).toBe("JPY");
    expect(flow.to).toBe("USD");
    expect(flow.stronger).toBe("USD");
  });

  it("USD/JPYマイナスではUSDからJPYへ向ける", () => {
    const flow = quoteToFlow(usdJpy(-1));
    expect(flow.from).toBe("USD");
    expect(flow.to).toBe("JPY");
    expect(flow.stronger).toBe("JPY");
  });

  it("Percentage Changeを安全に計算する", () => {
    expect(calculatePercentageChange(100, 101.2)).toBeCloseTo(1.2);
    expect(calculatePercentageChange(0, 100)).toBe(0);
    expect(calculatePercentageChange(Number.NaN, 100)).toBe(0);
  });

  it("Arrow Thickness Thresholdを設定値で分類する", () => {
    expect(getFlowWidth(0.25, FLOW_THRESHOLDS).width).toBe("thin");
    expect(getFlowWidth(0.5, FLOW_THRESHOLDS).width).toBe("medium");
    expect(getFlowWidth(0.76, FLOW_THRESHOLDS).width).toBe("thick");
  });
});

describe("currency strength and ranking", () => {
  it("Baseを加算、Quoteを減算して正規化する", () => {
    const strengths = computeCurrencyStrength([
      usdJpy(1.2),
      { ...usdJpy(-0.8), pair: "EUR/USD", current: 1.08, open: 1.09 },
    ]);
    expect(strengths.find((item) => item.currency === "USD")!.score).toBeGreaterThan(0);
    expect(strengths.find((item) => item.currency === "JPY")!.score).toBeLessThan(0);
    expect(Math.max(...strengths.map((item) => Math.abs(item.score)))).toBe(100);
  });

  it("RankingをScore降順で返す", () => {
    const strengths = computeCurrencyStrength(createDemoSnapshot("usd-strong").quotes);
    expect(strengths[0].score).toBeGreaterThanOrEqual(strengths[1].score);
    expect(strengths.at(-1)!.score).toBeLessThanOrEqual(strengths.at(-2)!.score);
  });
});

describe("timeframe, filter, and demo scenarios", () => {
  it("6つのTimeframeを持ち、選択により変化率が変わる", () => {
    expect(SUPPORTED_TIMEFRAMES).toEqual(["5m", "15m", "1h", "4h", "1d", "1w"]);
    const fiveMinute = createDemoSnapshot("usd-strong", "5m").quotes[0].changePercent;
    const oneDay = createDemoSnapshot("usd-strong", "1d").quotes[0].changePercent;
    expect(Math.abs(fiveMinute)).toBeLessThan(Math.abs(oneDay));
  });

  it("Currency Filterは選択通貨に関係するFlowだけ返す", () => {
    const flows = createDemoSnapshot().quotes.map((quote) => quoteToFlow(quote));
    const jpyFlows = filterFlows(flows, "JPY");
    expect(jpyFlows).toHaveLength(4);
    expect(jpyFlows.every((flow) => flow.from === "JPY" || flow.to === "JPY")).toBe(true);
  });

  it("3つのDemo Scenarioが全11 Pairを提供する", () => {
    for (const scenario of ["usd-strong", "jpy-strong", "eur-focus"] as const) {
      const snapshot = createDemoSnapshot(scenario);
      expect(snapshot.mode).toBe("demo");
      expect(snapshot.quotes.map((item) => item.pair)).toEqual(SUPPORTED_PAIRS);
    }
    expect(quoteToFlow(createDemoSnapshot("jpy-strong").quotes[0]).to).toBe("JPY");
  });
});

describe("data status and fallback", () => {
  it("Stale Dataを閾値で判定する", () => {
    const now = new Date("2026-09-28T05:34:00.000Z");
    expect(isStale("2026-09-28T05:33:00.000Z", now, 90_000)).toBe(false);
    expect(isStale("2026-09-28T05:30:00.000Z", now, 90_000)).toBe(true);
    expect(isStale("invalid", now, 90_000)).toBe(true);
  });

  it("日次参照値は週末を遅延扱いせず、2営業日遅れでStaleにする", () => {
    expect(isDailyReferenceStale("2026-09-25T00:00:00.000Z", new Date("2026-09-28T12:00:00Z"))).toBe(false);
    expect(isDailyReferenceStale("2026-09-25T00:00:00.000Z", new Date("2026-09-29T12:00:00Z"))).toBe(true);
    expect(isDailyReferenceStale("invalid", new Date("2026-09-29T12:00:00Z"))).toBe(true);
  });

  it("Market Closedを週末境界で判定する", () => {
    expect(isFxMarketClosed(new Date("2026-09-26T12:00:00Z"))).toBe(true);
    expect(isFxMarketClosed(new Date("2026-09-27T21:00:00Z"))).toBe(true);
    expect(isFxMarketClosed(new Date("2026-09-27T22:01:00Z"))).toBe(false);
    expect(isFxMarketClosed(new Date("2026-09-28T12:00:00Z"))).toBe(false);
  });

  it("API Error時はDemo ModeへFallbackする", async () => {
    const failingProvider: MarketDataProvider = {
      id: "failing", supportedPairs: ["USD/JPY"], supportedTimeframes: ["1d"],
      getQuote: async () => { throw new Error("API unavailable"); },
      getChange: async () => { throw new Error("API unavailable"); },
      getHistory: async () => { throw new Error("API unavailable"); },
    };
    const result = await loadSnapshotWithFallback(failingProvider, ["USD/JPY"], "1d", () => createDemoSnapshot());
    expect(result.mode).toBe("demo");
    expect(result.fallbackReason).toBe("API unavailable");
  });

  it("Reduced Motion、非表示Tab、User PauseでAnimationを止める", () => {
    expect(shouldAnimate({ prefersReducedMotion: true, pageVisible: true, userPaused: false })).toBe(false);
    expect(shouldAnimate({ prefersReducedMotion: false, pageVisible: false, userPaused: false })).toBe(false);
    expect(shouldAnimate({ prefersReducedMotion: false, pageVisible: true, userPaused: true })).toBe(false);
    expect(shouldAnimate({ prefersReducedMotion: false, pageVisible: true, userPaused: false })).toBe(true);
  });
});
