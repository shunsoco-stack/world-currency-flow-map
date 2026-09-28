"use client";

import {
  ArrowDown, ArrowRight, ArrowUp, BarChart3, ChevronRight, CircleHelp,
  Clock3, Gauge, Globe2, Info, ListFilter, Maximize2, Moon, Pause, Play,
  ShieldCheck, SkipBack, SkipForward, SlidersHorizontal, Sun,
  X, Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { WorldMap } from "./world-map";
import { CURRENCY_META, SUPPORTED_TIMEFRAMES, TIMELINE_LABELS } from "@/lib/market-data/config";
import { createDemoSnapshot } from "@/lib/market-data/demo";
import {
  computeCurrencyStrength, createMarketSummary, getCurrencyComparisons,
  isFxMarketClosed, quoteToFlow, shouldAnimate,
} from "@/lib/market-data/engine";
import type { CurrencyCode, DemoScenarioId, Timeframe } from "@/lib/market-data/types";
import styles from "./currency-flow-app.module.css";

type ViewMode = "flow" | "ranking" | "pairs";
type ThemeMode = "light" | "dark" | "system";
type SortMode = "change" | "strength" | "currency";

const scenarioOptions: { id: DemoScenarioId; label: string; note: string }[] = [
  { id: "usd-strong", label: "ドル全面高", note: "USD強・JPY弱" },
  { id: "jpy-strong", label: "円全面高", note: "JPYへ集中" },
  { id: "eur-focus", label: "EUR中心", note: "EUR優勢" },
];

const timeframeLabels: Record<Timeframe, string> = {
  "5m": "5分", "15m": "15分", "1h": "1時間", "4h": "4時間", "1d": "1日", "1w": "1週間",
};

function AppIcon({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs><linearGradient id="icon-gradient" x1="8" y1="7" x2="57" y2="58"><stop stopColor="#62e4d6" /><stop offset="1" stopColor="#4f8cff" /></linearGradient></defs>
      <rect x="2" y="2" width="60" height="60" rx="17" fill="#0b1c2a" stroke="#31546a" />
      <circle cx="30" cy="31" r="17" fill="none" stroke="url(#icon-gradient)" strokeWidth="3" />
      <path d="M13 31h34M30 14c6 5 8 11 8 17s-2 12-8 17M30 14c-6 5-8 11-8 17s2 12 8 17" fill="none" stroke="#72e5da" strokeWidth="2" opacity=".82" />
      <path d="M37 44c7-1 12-5 15-11" fill="none" stroke="#ffd06b" strokeWidth="3" strokeLinecap="round" />
      <path d="m48 31 5 1-1 5" fill="none" stroke="#ffd06b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <text x="30" y="36" textAnchor="middle" fill="white" fontSize="15" fontWeight="800">¥$</text>
    </svg>
  );
}

function DirectionIcon({ score }: { score: number }) {
  if (score > 5) return <ArrowUp size={14} aria-hidden="true" />;
  if (score < -5) return <ArrowDown size={14} aria-hidden="true" />;
  return <ArrowRight size={14} aria-hidden="true" />;
}

function scoreLabel(score: number) { return `${score > 0 ? "+" : ""}${score}`; }

export function CurrencyFlowApp() {
  const [viewMode, setViewMode] = useState<ViewMode>("flow");
  const [scenario, setScenario] = useState<DemoScenarioId>("usd-strong");
  const [timeframe, setTimeframe] = useState<Timeframe>("1d");
  const [timelineIndex, setTimelineIndex] = useState(3);
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode | null>(null);
  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [showHelp, setShowHelp] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [userPaused, setUserPaused] = useState(false);
  const [pairSort, setPairSort] = useState<SortMode>("change");

  const snapshot = useMemo(() => createDemoSnapshot(scenario, timeframe, timelineIndex), [scenario, timeframe, timelineIndex]);
  const strengths = useMemo(() => computeCurrencyStrength(snapshot.quotes), [snapshot.quotes]);
  const flows = useMemo(() => snapshot.quotes.map((quote) => quoteToFlow(quote)).sort((a, b) => b.magnitude - a.magnitude), [snapshot.quotes]);
  const selectedFlow = useMemo(() => flows.find((flow) => flow.pair === selectedPair) ?? null, [flows, selectedPair]);
  const comparisons = useMemo(() => selectedCurrency ? getCurrencyComparisons(selectedCurrency, flows) : [], [selectedCurrency, flows]);
  const strongest = strengths[0];
  const weakest = strengths[strengths.length - 1];
  const biggest = flows[0];
  const summary = useMemo(() => createMarketSummary(strengths), [strengths]);
  const animate = shouldAnimate({ prefersReducedMotion, pageVisible, userPaused });
  const marketClosed = isFxMarketClosed(new Date(snapshot.updatedAt));

  const sortedQuotes = useMemo(() => {
    const rows = [...snapshot.quotes];
    if (pairSort === "currency") return rows.sort((a, b) => a.pair.localeCompare(b.pair));
    return rows.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  }, [snapshot.quotes, pairSort]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => { document.documentElement.dataset.theme = theme === "system" ? (media.matches ? "dark" : "light") : theme; };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    if (!timelinePlaying || prefersReducedMotion) return;
    const timer = window.setTimeout(() => {
      if (timelineIndex >= TIMELINE_LABELS.length - 1) setTimelinePlaying(false);
      else setTimelineIndex(timelineIndex + 1);
    }, 1250 / playbackSpeed);
    return () => window.clearTimeout(timer);
  }, [timelineIndex, timelinePlaying, playbackSpeed, prefersReducedMotion]);

  function changeScenario(next: DemoScenarioId) {
    setScenario(next);
    setTimelineIndex(3);
    setTimelinePlaying(false);
    setSelectedPair(null);
  }

  function focusJpy() {
    setViewMode("flow");
    setSelectedCurrency("JPY");
  }

  return (
    <main className={styles.appShell}>
      <header className={styles.topBar}>
        <a href="#main-content" className={styles.brand} aria-label="世界通貨フローマップ トップへ">
          <AppIcon />
          <span><strong>世界通貨フローマップ</strong><small>CURRENCY STRENGTH VISUALIZATION</small></span>
        </a>
        <div className={styles.headerStatus}>
          <span className={styles.demoPill}><i /> DEMO</span>
          <span>実相場ではありません</span>
        </div>
        <div className={styles.headerActions}>
          <button type="button" onClick={focusJpy} className={styles.jpyButton}>¥ 円を見る</button>
          <div className={styles.themeControl} aria-label="表示テーマ">
            <button type="button" onClick={() => setTheme("light")} aria-pressed={theme === "light"} aria-label="ライトテーマ"><Sun size={15} /></button>
            <button type="button" onClick={() => setTheme("dark")} aria-pressed={theme === "dark"} aria-label="ダークテーマ"><Moon size={15} /></button>
            <button type="button" onClick={() => setTheme("system")} aria-pressed={theme === "system"} aria-label="システム設定に合わせる"><SlidersHorizontal size={15} /></button>
          </div>
          <button type="button" className={styles.helpButton} onClick={() => setShowHelp(true)} aria-label="計算方法と注意事項を開く"><CircleHelp size={19} /></button>
        </div>
      </header>

      <div className={styles.page} id="main-content">
        <section className={styles.intro}>
          <div><span className={styles.eyebrow}><Globe2 size={14} /> WORLD CURRENCY STRENGTH</span><h1>世界地図で、通貨の強弱を読む。</h1><p>数字だけでは見えにくい「弱い通貨 → 強い通貨」の方向を、地図上の動きとして可視化します。</p></div>
          <div className={styles.dataBadge}><Info size={15} /><span>矢印は実際の国際資金移動額ではなく、<strong>為替レートから算出した相対的な通貨強弱</strong>を表しています。</span></div>
        </section>

        <section className={styles.controlDeck} aria-label="表示設定">
          <div className={styles.segmentedControl} aria-label="表示モード">
            <button type="button" onClick={() => setViewMode("flow")} aria-pressed={viewMode === "flow"}><Globe2 size={15} />世界フロー</button>
            <button type="button" onClick={() => setViewMode("ranking")} aria-pressed={viewMode === "ranking"}><BarChart3 size={15} />通貨ランキング</button>
            <button type="button" onClick={() => setViewMode("pairs")} aria-pressed={viewMode === "pairs"}><ListFilter size={15} />Pair一覧</button>
          </div>
          <div className={styles.timeframeControl} aria-label="時間足">
            {SUPPORTED_TIMEFRAMES.map((item) => <button type="button" key={item} onClick={() => { setTimeframe(item); setSelectedPair(null); }} aria-pressed={timeframe === item}>{timeframeLabels[item]}</button>)}
          </div>
          <label className={styles.scenarioSelect}><span>デモシナリオ</span><select value={scenario} onChange={(event) => changeScenario(event.target.value as DemoScenarioId)}>{scenarioOptions.map((item) => <option key={item.id} value={item.id}>{item.label} — {item.note}</option>)}</select></label>
        </section>

        <section className={styles.summaryGrid} aria-label="マーケット概要">
          <article><span>最強通貨</span><div><strong>{strongest.currency}</strong><em className={styles.positive}><ArrowUp size={16} />{scoreLabel(strongest.score)}</em></div><small>{CURRENCY_META[strongest.currency].region}</small></article>
          <article><span>最弱通貨</span><div><strong>{weakest.currency}</strong><em className={styles.negative}><ArrowDown size={16} />{scoreLabel(weakest.score)}</em></div><small>{CURRENCY_META[weakest.currency].region}</small></article>
          <article><span>最大変動Pair</span><div><strong>{biggest.pair}</strong><em className={biggest.changePercent >= 0 ? styles.positive : styles.negative}>{biggest.changePercent > 0 ? "+" : ""}{biggest.changePercent.toFixed(2)}%</em></div><small>{biggest.from} → {biggest.to}</small></article>
          <article><span>最終更新</span><div><strong>{snapshot.timelineLabel}</strong><em className={marketClosed ? styles.warning : styles.neutral}><Clock3 size={14} />{marketClosed ? "市場休場" : "デモ基準"}</em></div><small>2026/09/28 JST</small></article>
        </section>

        {viewMode === "flow" ? (
          <section className={styles.flowWorkspace}>
            <div className={styles.mapCard}>
              <div className={styles.mapCardHeader}>
                <div><span className={styles.sectionLabel}>CURRENCY STRENGTH FLOW</span><h2>世界通貨フロー</h2></div>
                <div className={styles.mapHeaderActions}>
                  {selectedCurrency ? <button type="button" className={styles.filterChip} onClick={() => setSelectedCurrency(null)}>{selectedCurrency} 関連のみ <X size={13} /></button> : null}
                  <button type="button" onClick={() => setUserPaused((value) => !value)} className={styles.animationButton}>{animate ? <Pause size={15} /> : <Play size={15} />}{animate ? "動きを停止" : "動きを再生"}</button>
                </div>
              </div>
              <WorldMap flows={flows} strengths={strengths} selectedCurrency={selectedCurrency} selectedPair={selectedPair} animate={animate} onCurrencySelect={setSelectedCurrency} onFlowSelect={(flow) => setSelectedPair(flow.pair)} />
              <div className={styles.timelinePanel}>
                <div className={styles.timelineTitle}><span><Clock3 size={15} /> Timeline / Play Mode</span><small>デモ内の4時点を再生</small></div>
                <div className={styles.playControls}>
                  <button type="button" onClick={() => { setTimelinePlaying(false); setTimelineIndex(Math.max(0, timelineIndex - 1)); }} aria-label="前の時点"><SkipBack size={16} /></button>
                  <button type="button" onClick={() => { if (timelineIndex >= 3) setTimelineIndex(0); setTimelinePlaying((value) => !value); }} aria-label={timelinePlaying ? "タイムラインを一時停止" : "タイムラインを再生"} className={styles.primaryPlay}>{timelinePlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}</button>
                  <button type="button" onClick={() => { setTimelinePlaying(false); setTimelineIndex(Math.min(3, timelineIndex + 1)); }} aria-label="次の時点"><SkipForward size={16} /></button>
                </div>
                <div className={styles.timelineTrack}>{TIMELINE_LABELS.map((label, index) => <button type="button" key={label} onClick={() => { setTimelineIndex(index); setTimelinePlaying(false); }} className={index <= timelineIndex ? styles.timelinePassed : ""} aria-current={index === timelineIndex ? "step" : undefined}><i /><span>{label}</span></button>)}</div>
                <button type="button" className={styles.speedButton} onClick={() => setPlaybackSpeed((speed) => speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1)}>{playbackSpeed}×</button>
              </div>
            </div>

            <aside className={styles.inspector}>
              {selectedFlow ? (
                <article className={styles.detailCard} data-testid="pair-detail">
                  <div className={styles.cardTitle}><div><span>PAIR DETAIL</span><h2>{selectedFlow.pair}</h2></div><button type="button" onClick={() => setSelectedPair(null)} aria-label="詳細を閉じる"><X size={17} /></button></div>
                  <div className={styles.directionHero}><div><span>{selectedFlow.from}</span><small>弱い</small></div><div><strong>{selectedFlow.from} → {selectedFlow.to}</strong><i /></div><div><span>{selectedFlow.to}</span><small>強い</small></div></div>
                  <dl className={styles.detailGrid}>
                    <div><dt>現在値</dt><dd>{selectedFlow.quote.current}</dd></div><div><dt>変化率</dt><dd className={selectedFlow.changePercent >= 0 ? styles.positive : styles.negative}>{selectedFlow.changePercent > 0 ? "+" : ""}{selectedFlow.changePercent.toFixed(2)}%</dd></div>
                    <div><dt>始値</dt><dd>{selectedFlow.quote.open}</dd></div><div><dt>高値</dt><dd>{selectedFlow.quote.high}</dd></div><div><dt>安値</dt><dd>{selectedFlow.quote.low}</dd></div><div><dt>値動き</dt><dd>{selectedFlow.width === "thick" ? "大" : selectedFlow.width === "medium" ? "中" : "小"}</dd></div>
                  </dl>
                  <div className={styles.detailUpdated}><Clock3 size={13} />最終更新 {snapshot.timelineLabel}（デモ基準）</div>
                </article>
              ) : selectedCurrency ? (
                <article className={styles.focusCard} data-testid="currency-focus">
                  <div className={styles.cardTitle}><div><span>CURRENCY FOCUS</span><h2>{CURRENCY_META[selectedCurrency].flag} {selectedCurrency}を見る</h2></div><button type="button" onClick={() => setSelectedCurrency(null)} aria-label="通貨フィルターを解除"><X size={17} /></button></div>
                  <div className={styles.focusStrength}><span>総合Strength</span><strong>{scoreLabel(strengths.find((item) => item.currency === selectedCurrency)?.score ?? 0)}</strong></div>
                  <div className={styles.comparisonList}>{comparisons.map((item) => <div key={item.pair}><span>{selectedCurrency} vs {item.other}</span><strong className={item.relation === "stronger" ? styles.positive : styles.negative}>{item.relation === "stronger" ? "↑ 強い" : "↓ 弱い"}</strong><small>{item.pair}</small></div>)}</div>
                </article>
              ) : (
                <article className={styles.nowCard}>
                  <span className={styles.sectionLabel}><Zap size={13} /> NOW</span><h2>今、何が起きている？</h2><p>{summary}</p><div className={styles.evidence}><ShieldCheck size={14} /><span>11 Pairの変化率を根拠に、決定論的テンプレートで生成</span></div>
                </article>
              )}

              <article className={styles.rankingCard}>
                <div className={styles.cardTitle}><div><span>STRENGTH RANKING</span><h2>通貨強弱ランキング</h2></div><button type="button" onClick={() => setViewMode("ranking")} aria-label="ランキングを拡大"><Maximize2 size={16} /></button></div>
                <ol className={styles.rankingList}>{strengths.map((item, index) => <li key={item.currency}><span className={styles.rank}>{index + 1}</span><span className={styles.rankFlag}>{CURRENCY_META[item.currency].flag}</span><strong>{item.currency}</strong><span className={`${styles.rankScore} ${item.score > 5 ? styles.positive : item.score < -5 ? styles.negative : styles.neutral}`}><DirectionIcon score={item.score} />{scoreLabel(item.score)}</span><i><b style={{ width: `${Math.abs(item.score)}%` }} /></i></li>)}</ol>
              </article>
            </aside>
          </section>
        ) : null}

        {viewMode === "ranking" ? (
          <section className={styles.fullPanel} data-testid="ranking-view">
            <div className={styles.fullPanelHeader}><div><span className={styles.sectionLabel}>DETERMINISTIC INDEX</span><h2>通貨強弱ランキング</h2><p>各通貨が関係するPairの変化率をBaseは加算、Quoteは減算し、平均値を最大絶対値で−100〜+100に正規化しています。</p></div><Gauge size={30} /></div>
            <div className={styles.rankGrid}>{strengths.map((item, index) => <article key={item.currency}><span className={styles.bigRank}>{String(index + 1).padStart(2, "0")}</span><span className={styles.bigFlag}>{CURRENCY_META[item.currency].flag}</span><div><h3>{item.currency}</h3><p>{CURRENCY_META[item.currency].name} · {item.pairCount} pairs</p></div><strong className={item.score > 5 ? styles.positive : item.score < -5 ? styles.negative : styles.neutral}><DirectionIcon score={item.score} />{scoreLabel(item.score)}</strong><i><b style={{ width: `${Math.abs(item.score)}%` }} /></i></article>)}</div>
          </section>
        ) : null}

        {viewMode === "pairs" ? (
          <section className={styles.fullPanel} data-testid="pairs-view">
            <div className={styles.fullPanelHeader}><div><span className={styles.sectionLabel}>11 SUPPORTED PAIRS</span><h2>Pair一覧</h2><p>すべてデモデータです。実データProvider接続時は対応可能なPair・Timeframeだけを表示します。</p></div><div className={styles.sortControl}><span>並び順</span>{(["change", "strength", "currency"] as SortMode[]).map((item) => <button type="button" key={item} onClick={() => setPairSort(item)} aria-pressed={pairSort === item}>{item === "change" ? "変化率" : item === "strength" ? "Strength" : "通貨名"}</button>)}</div></div>
            <div className={styles.pairTableWrap}><table className={styles.pairTable}><thead><tr><th>Pair</th><th>現在値</th><th>変化率</th><th>Arrow方向</th><th>値動き</th><th>最終更新</th><th /></tr></thead><tbody>{sortedQuotes.map((quote) => { const flow = quoteToFlow(quote); return <tr key={quote.pair}><td><strong>{quote.pair}</strong></td><td>{quote.current}</td><td className={quote.changePercent >= 0 ? styles.positive : styles.negative}>{quote.changePercent > 0 ? "+" : ""}{quote.changePercent.toFixed(2)}%</td><td>{flow.from} <ArrowRight size={14} /> {flow.to}</td><td><span className={`${styles.magnitudeBadge} ${styles[flow.width]}`}>{flow.width === "thick" ? "大" : flow.width === "medium" ? "中" : "小"}</span></td><td>{snapshot.timelineLabel}</td><td><button type="button" onClick={() => { setSelectedPair(quote.pair); setViewMode("flow"); }}>地図で見る <ChevronRight size={14} /></button></td></tr>; })}</tbody></table></div>
          </section>
        ) : null}

        <footer className={styles.footerNote}>
          <Info size={16} /><p><strong>ご注意：</strong>本サービスは市場データの可視化・学習を目的としており、投資助言ではありません。Arrowは実際の国際資金移動量ではなく、為替レートから算出した相対的な通貨強弱を表現しています。</p>
        </footer>
      </div>

      {showHelp ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowHelp(false); }}>
          <section className={styles.helpModal} role="dialog" aria-modal="true" aria-labelledby="help-title">
            <button type="button" className={styles.modalClose} onClick={() => setShowHelp(false)} aria-label="閉じる"><X size={18} /></button>
            <span className={styles.sectionLabel}>HOW IT WORKS</span><h2 id="help-title">通貨強弱の計算方法</h2>
            <div className={styles.formula}>Pair変化率 → Base通貨へ加算 / Quote通貨から減算 → 通貨別平均 → 最大絶対値を100として正規化</div>
            <ol><li>USD/JPYが+1.20%なら、USDへ+1.20、JPYへ−1.20を寄与させます。</li><li>各通貨について、関係する全Pairの寄与を平均します。</li><li>最大絶対値を基準に−100〜+100へ正規化し、RankingとNodeへ表示します。</li><li>Arrowは必ず「弱い通貨 → 強い通貨」の方向へ描画します。</li></ol>
            <div className={styles.helpWarning}><Info size={17} /><p>これは実際の送金・投資資金の移動を示すものではありません。将来、国際資金フロー統計を追加する場合は別Layerとして扱います。</p></div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
