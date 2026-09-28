import { NextRequest } from "next/server";

import { ECB_REAL_TIMEFRAMES } from "@/lib/market-data/ecb";
import { EcbReferenceRateProvider } from "@/lib/market-data/ecb-provider";
import type { Timeframe } from "@/lib/market-data/types";

export async function GET(request: NextRequest) {
  const timeframe = (request.nextUrl.searchParams.get("timeframe") ?? "1d") as Timeframe;
  if (!ECB_REAL_TIMEFRAMES.includes(timeframe as "1d" | "1w")) {
    return Response.json({ error: "ECB実データは1日・1週間に対応しています。" }, { status: 400 });
  }

  try {
    const snapshot = await new EcbReferenceRateProvider().getSnapshot(timeframe);
    return Response.json(snapshot, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "市場データを取得できません" },
      { status: 503 },
    );
  }
}
