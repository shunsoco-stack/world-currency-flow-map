import { CurrencyFlowApp } from "@/components/currency-flow-app";
import { createDemoSnapshot } from "@/lib/market-data/demo";
import { EcbReferenceRateProvider } from "@/lib/market-data/ecb-provider";

export const revalidate = 3600;

export default async function Page() {
  let initialSnapshot;
  try {
    initialSnapshot = await new EcbReferenceRateProvider().getSnapshot("1d");
  } catch (error) {
    initialSnapshot = {
      ...createDemoSnapshot("usd-strong", "1d"),
      fallbackReason: error instanceof Error ? error.message : "市場データを取得できません",
    };
  }
  return <CurrencyFlowApp initialSnapshot={initialSnapshot} />;
}
