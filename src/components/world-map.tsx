"use client";

import { geoNaturalEarth1, geoPath } from "d3-geo";
import { Minus, Move, Plus, RotateCcw } from "lucide-react";
import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import countriesTopology from "world-atlas/countries-110m.json";

import { CURRENCY_META } from "@/lib/market-data/config";
import type { CurrencyCode, CurrencyFlow, CurrencyStrength } from "@/lib/market-data/types";
import styles from "./currency-flow-app.module.css";

const WIDTH = 960;
const HEIGHT = 520;
const MAX_ANIMATED_FLOWS = 8;

type Transform = { x: number; y: number; scale: number };

interface WorldMapProps {
  flows: CurrencyFlow[];
  strengths: CurrencyStrength[];
  selectedCurrency: CurrencyCode | null;
  selectedPair: string | null;
  animate: boolean;
  onCurrencySelect: (currency: CurrencyCode | null) => void;
  onFlowSelect: (flow: CurrencyFlow) => void;
}

export function WorldMap({
  flows,
  strengths,
  selectedCurrency,
  selectedPair,
  animate,
  onCurrencySelect,
  onFlowSelect,
}: WorldMapProps) {
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [mobileMapActive, setMobileMapActive] = useState(false);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);

  const projection = useMemo(() => geoNaturalEarth1().scale(156).translate([WIDTH / 2, HEIGHT / 2 + 10]), []);
  const countries = useMemo(() => {
    const topology = countriesTopology as unknown as Topology<{ countries: GeometryCollection }>;
    return feature(topology, topology.objects.countries);
  }, []);
  const countryPath = useMemo(() => geoPath(projection), [projection]);
  const mapPath = useMemo(() => countryPath(countries) ?? "", [countries, countryPath]);
  const scores = useMemo(() => new Map(strengths.map((item) => [item.currency, item])), [strengths]);
  const positions = useMemo(() => {
    const result = {} as Record<CurrencyCode, [number, number]>;
    for (const [currency, meta] of Object.entries(CURRENCY_META) as [CurrencyCode, (typeof CURRENCY_META)[CurrencyCode]][]) {
      const projected = projection(meta.coordinates) ?? [0, 0];
      result[currency] = [projected[0] + meta.offset[0], projected[1] + meta.offset[1]];
    }
    return result;
  }, [projection]);

  function arcPath(flow: CurrencyFlow) {
    const [x1, y1] = positions[flow.from];
    const [x2, y2] = positions[flow.to];
    const distance = Math.abs(x2 - x1);
    const curve = Math.min(150, Math.max(42, distance * 0.22));
    const midX = (x1 + x2) / 2;
    const midY = Math.min(y1, y2) - curve;
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }

  function zoom(nextScale: number) {
    const scale = Math.max(1, Math.min(3, nextScale));
    setTransform((current) => ({ ...current, scale }));
  }

  function onPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (!mobileMapActive && matchMedia("(max-width: 700px)").matches) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: transform.x, originY: transform.y };
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setTransform((current) => ({ ...current, x: drag.originX + event.clientX - drag.startX, y: drag.originY + event.clientY - drag.startY }));
  }

  function endDrag(event: PointerEvent<SVGSVGElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  function onWheel(event: WheelEvent<SVGSVGElement>) {
    if (!event.ctrlKey && !mobileMapActive) return;
    event.preventDefault();
    zoom(transform.scale + (event.deltaY > 0 ? -0.18 : 0.18));
  }

  function activateNode(event: KeyboardEvent<SVGGElement>, currency: CurrencyCode) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onCurrencySelect(selectedCurrency === currency ? null : currency);
    }
  }

  return (
    <div className={`${styles.mapViewport} ${mobileMapActive ? styles.mapInteractionActive : ""}`}>
      <div className={styles.mapToolbar} aria-label="地図操作">
        <button type="button" onClick={() => zoom(transform.scale + 0.3)} aria-label="拡大"><Plus size={17} /></button>
        <button type="button" onClick={() => zoom(transform.scale - 0.3)} aria-label="縮小"><Minus size={17} /></button>
        <button type="button" onClick={() => setTransform({ x: 0, y: 0, scale: 1 })} aria-label="表示をリセット"><RotateCcw size={16} /></button>
      </div>

      <button
        type="button"
        className={styles.mobileMapToggle}
        onClick={() => setMobileMapActive((value) => !value)}
        aria-pressed={mobileMapActive}
      >
        <Move size={15} /> {mobileMapActive ? "スクロールに戻る" : "地図を操作"}
      </button>

      <svg
        className={styles.mapSvg}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="主要8通貨の相対的な強弱フローを示す世界地図"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={onWheel}
      >
        <defs>
          <radialGradient id="ocean-light" cx="52%" cy="35%" r="75%"><stop offset="0%" stopColor="var(--ocean-glow)" /><stop offset="100%" stopColor="var(--ocean)" /></radialGradient>
          <filter id="flow-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          {flows.map((flow) => (
            <marker key={flow.pair} id={`arrow-${flow.pair.replace("/", "-")}`} markerWidth="13" markerHeight="13" refX="11" refY="6.5" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M0,0 L9,4.5 L0,9 Z" fill="var(--flow-target)" />
            </marker>
          ))}
        </defs>
        <rect width={WIDTH} height={HEIGHT} rx="22" fill="url(#ocean-light)" />
        <g className={styles.graticule} aria-hidden="true">
          {[80, 160, 240, 320, 400, 480, 560, 640, 720, 800, 880].map((x) => <line key={`x${x}`} x1={x} y1="0" x2={x} y2={HEIGHT} />)}
          {[80, 160, 240, 320, 400, 480].map((y) => <line key={`y${y}`} x1="0" y1={y} x2={WIDTH} y2={y} />)}
        </g>
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`} className={styles.mapTransform}>
          <path d={mapPath} className={styles.countries} />

          <g className={styles.flowLayer}>
            {flows.map((flow, index) => {
              const path = arcPath(flow);
              const related = !selectedCurrency || flow.from === selectedCurrency || flow.to === selectedCurrency;
              const selected = selectedPair === flow.pair;
              return (
                <g key={`${flow.pair}-${flow.changePercent}`} className={`${styles.flowGroup} ${related ? "" : styles.flowDimmed} ${selected ? styles.flowSelected : ""}`}>
                  <path d={path} className={styles.flowHalo} style={{ strokeWidth: flow.strokeWidth + 8 }} />
                  <path
                    d={path}
                    className={styles.flowLine}
                    style={{ strokeWidth: flow.strokeWidth }}
                    markerEnd={`url(#arrow-${flow.pair.replace("/", "-")})`}
                  />
                  <path d={path} className={styles.flowHitArea} onClick={() => onFlowSelect(flow)} role="button" tabIndex={0} aria-label={`${flow.pair} ${flow.changePercent > 0 ? "+" : ""}${flow.changePercent}%、${flow.from}から${flow.to}。詳細を開く`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onFlowSelect(flow); }} />
                  {animate && index < MAX_ANIMATED_FLOWS && related ? (
                    <circle r={flow.width === "thick" ? 4.2 : 3} className={styles.flowParticle}>
                      <animateMotion path={path} dur={`${flow.durationSeconds}s`} repeatCount="indefinite" />
                    </circle>
                  ) : null}
                </g>
              );
            })}
          </g>

          <g className={styles.nodeLayer}>
            {(Object.keys(CURRENCY_META) as CurrencyCode[]).map((currency) => {
              const [x, y] = positions[currency];
              const strength = scores.get(currency);
              const score = strength?.score ?? 0;
              const direction = score > 5 ? "↑" : score < -5 ? "↓" : "→";
              const selected = selectedCurrency === currency;
              const tone = score > 5 ? styles.nodePositive : score < -5 ? styles.nodeNegative : styles.nodeNeutral;
              return (
                <g
                  key={currency}
                  transform={`translate(${x} ${y}) scale(${1 / Math.sqrt(transform.scale)})`}
                  className={`${styles.currencyNode} ${tone} ${selected ? styles.nodeSelected : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${CURRENCY_META[currency].region} ${currency}、強度${score > 0 ? "+" : ""}${score}、${direction}。選択して関連ペアを表示`}
                  onClick={(event) => { event.stopPropagation(); onCurrencySelect(selected ? null : currency); }}
                  onKeyDown={(event) => activateNode(event, currency)}
                >
                  <circle r="27" className={styles.nodeRing} />
                  <circle r="22" className={styles.nodeCore} />
                  <text x="0" y="-5" textAnchor="middle" className={styles.nodeCode}>{currency}</text>
                  <text x="0" y="11" textAnchor="middle" className={styles.nodeScore}>{direction} {score > 0 ? "+" : ""}{score}</text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      <div className={styles.mapLegend}>
        <span><i className={styles.legendArrow} /> Arrow：弱い通貨 → 強い通貨</span>
        <span><i className={styles.legendThin} /> 小</span>
        <span><i className={styles.legendMedium} /> 中</span>
        <span><i className={styles.legendThick} /> 大（値動き）</span>
      </div>
    </div>
  );
}
