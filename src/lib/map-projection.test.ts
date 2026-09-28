import { describe, expect, it } from "vitest";

import { CURRENCY_META } from "./market-data/config";
import { createJapanCenteredProjection } from "./map-projection";

describe("Japan-centered world map projection", () => {
  const width = 960;
  const projection = createJapanCenteredProjection(width, 520);

  it("日本を世界地図の中央付近へ配置する", () => {
    const japan = projection(CURRENCY_META.JPY.coordinates);
    expect(japan).not.toBeNull();
    expect(Math.abs(japan![0] - width / 2)).toBeLessThan(15);
  });

  it("日本から見て欧州を左、北米を右へ配置する", () => {
    const japanX = projection(CURRENCY_META.JPY.coordinates)![0];
    const europeX = projection(CURRENCY_META.EUR.coordinates)![0];
    const usaX = projection(CURRENCY_META.USD.coordinates)![0];
    expect(europeX).toBeLessThan(japanX);
    expect(usaX).toBeGreaterThan(japanX);
  });
});
