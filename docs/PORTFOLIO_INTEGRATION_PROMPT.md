# 既存ポートフォリオ掲載用・完全版プロンプト

既存ポートフォリオ`my-homepage`へ、新しい制作実績「世界通貨フローマップ」を追加してください。元の企画書ではなく、次の完成済み成果物をSource of Truthとして扱ってください。

- Production: <https://world-currency-flow-map.vercel.app>
- GitHub: <https://github.com/shunsoco-stack/world-currency-flow-map>
- README: GitHub Repositoryの`README.md`
- Screenshots: Repositoryの`docs/screenshots/01-world-flow.png`〜`05-mobile.png`
- Source: Repositoryの`src/`
- Tests: Repositoryの`src/lib/market-data/engine.test.ts`

## 既存構造に合わせる

1. `my-homepage/src/mocks/works.ts`を確認し、既存の`WorkItem`型と配列構造を変更せずに追加してください。
2. カテゴリは既存カテゴリの**「アプリ開発」**を使用してください。新しい類似カテゴリを作らないでください。
3. 現在の最大IDが10であることを再確認できた場合だけID 11を使用してください。競合があれば次の未使用IDにしてください。
4. 作品名は必ず**「世界通貨フローマップ」**とし、独自ブランド名へ変更しないでください。
5. Main thumbnailはLanding Pageではなく、`01-world-flow.png`の世界地図・Currency Node・複数Arrowが見える画面を使用してください。
6. 5枚すべてを`my-homepage/public/works/world-currency-flow-map/`へコピーし、Git管理対象にしてください。必要ならMain card用WebPを`public/works/world-currency-flow-map.webp`として生成してください。

## 掲載内容

紹介の中心は次の一文にしてください。

> 数字やチャートだけでは分かりにくい主要通貨の強弱を、世界地図上を流れる矢印として直感的に可視化するWebアプリ。

説明には、実装を確認できた次の内容だけを含めてください。

- Natural Earth由来の実地理データを使ったInteractive World Map
- USD / JPY / EUR / GBP / CHF / AUD / CAD / NZDの8 Currency Node
- 11 Currency Pairの変化率から決定論的に算出するCurrency Strength
- 「弱い通貨 → 強い通貨」へ流れるAnimated Arrow
- 変化率に連動するArrow thickness / animation speed
- ECB公式日次参照レートによる実データ初期表示（1日 / 1週間）
- 6 Timeframe、3 Demo Scenario、4時点Timeline / Play Mode（短時間足とTimelineはDemo）
- Currency Filter、JPY Focus、Pair Detail、Strength Ranking、Pair一覧
- Zoom / Pan / Reset、Light / Dark / System、Reduced Motion
- MarketDataProvider抽象化、server-side cache、Stale / Market Closed / API fallback engine
- Manifest / icon / standaloneのPWA基本対応
- 起動直後のMap-first表示、横画面最適化、PWA landscape指定

次の注意書きを必ず表示してください。

> 初期表示はEuropean Central Bank（ECB）の日次参照レートを使用しています。Realtime / Streamingではありません。Arrowは実際の国際資金移動量ではなく、為替レート変化率から算出した相対的な通貨強弱であり、投資助言を目的としたアプリではありません。

推奨tagsは`Next.js 16`、`React 19`、`TypeScript`、`D3 Geo`、`Vitest`、`Vercel`です。推奨badgesは`ECB Real Data`、`Deterministic Strength`、`Natural Earth Map`、`Landscape PWA`です。

## Gallery

次の順番・説明で5枚を登録してください。

1. `01-world-flow.png` — World Flow — 実世界地図上の8通貨Nodeと複数のCurrency Strength Flow
2. `02-usdjpy.png` — USD/JPY Detail — 実データに基づくArrow方向と期間値・強弱通貨の詳細
3. `03-jpy-focus.png` — JPY Focus — 円関連Arrowのhighlightと通貨別比較
4. `04-strength-ranking.png` — Strength Ranking — 8通貨の決定論的Ranking
5. `05-mobile.png` — Mobile Landscape — 844×390の横画面Responsive表示

## URL

- `appUrl`: `https://world-currency-flow-map.vercel.app`
- `githubUrl`: `https://github.com/shunsoco-stack/world-currency-flow-map`
- CTAは既存の外部公開作品に合わせて`Live Demo`または`作品詳細を見る`を選んでください。

## QA

変更後にポートフォリオのlint / typecheck / test / buildを実行してください。Desktop / MobileでCardとDetail/Galleryを確認し、5枚すべてがローカル相対pathから表示されること、Main thumbnailが世界地図画面であること、Production/GitHub CTAが正しいことを確認してください。ECB実データは1日 / 1週間のみで、Realtime、経済イベントLayer、将来Assetを実装済みとして記載しないでください。
