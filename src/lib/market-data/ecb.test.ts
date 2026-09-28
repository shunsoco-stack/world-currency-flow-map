import { describe, expect, it } from "vitest";

import { buildEcbSnapshot, parseEcbCsv, type EcbObservation } from "./ecb";
import { quoteToFlow } from "./engine";
import type { CurrencyCode } from "./types";

const currencies = ["USD", "JPY", "GBP", "CHF", "AUD", "CAD", "NZD"] as const satisfies readonly Exclude<CurrencyCode, "EUR">[];

function observationsFor(dates: readonly string[]): EcbObservation[] {
  return dates.flatMap((date, index) => currencies.map((currency) => ({
    currency,
    date,
    value: currency === "JPY" ? 150 + index * 3 : 1 + index * 0.001,
  })));
}

describe("ECB reference rate provider logic", () => {
  it("ECB CSVの必要列だけを安全にparseする", () => {
    const csv = [
      "KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE",
      "EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2026-09-24,1.14",
      "EXR.D.JPY.EUR.SP00.A,D,JPY,EUR,SP00,A,2026-09-24,178.2",
      "EXR.D.BAD.EUR.SP00.A,D,BAD,EUR,SP00,A,2026-09-24,1",
    ].join("\n");
    expect(parseEcbCsv(csv)).toEqual([
      { currency: "USD", date: "2026-09-24", value: 1.14 },
      { currency: "JPY", date: "2026-09-24", value: 178.2 },
    ]);
  });

  it("EUR建て実レートから11 Pairのcross rateと1日変化を算出する", () => {
    const snapshot = buildEcbSnapshot(observationsFor(["2026-09-24", "2026-09-25"]), "1d", "2026-09-25T16:01:00Z");
    const usdJpy = snapshot.quotes.find((quote) => quote.pair === "USD/JPY")!;
    expect(snapshot.mode).toBe("real");
    expect(snapshot.provider).toContain("ECB");
    expect(snapshot.quotes).toHaveLength(11);
    expect(usdJpy.current).toBeCloseTo(153 / 1.001, 2);
    expect(usdJpy.changePercent).toBeGreaterThan(0);
    expect(quoteToFlow(usdJpy).from).toBe("JPY");
    expect(quoteToFlow(usdJpy).to).toBe("USD");
  });

  it("1週間は5営業日前を基準に期間高値・安値を算出する", () => {
    const snapshot = buildEcbSnapshot(
      observationsFor(["2026-09-18", "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25"]),
      "1w",
    );
    const usdJpy = snapshot.quotes.find((quote) => quote.pair === "USD/JPY")!;
    expect(snapshot.timeframe).toBe("1w");
    expect(usdJpy.high).toBeGreaterThanOrEqual(usdJpy.current);
    expect(usdJpy.low).toBeLessThanOrEqual(usdJpy.open);
  });
});
