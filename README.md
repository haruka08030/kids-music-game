# 🎵 Kids Music Game

子供向けの**リズム**と**メロディ**で遊べるシンプルな音楽ゲームです。WebAudio + React だけで動き、外部ライブラリは不要（スタイルは Tailwind を使用）。

* **リズムモード**: 最初の **4拍はカウント（4→3→2→1）**、5拍目から判定開始。拍に合わせて**スペース**または**クリック**で入力。判定は **Perfect(±80ms)** / **Good(±160ms)**。星評価あり。
* **メロディモード**: 色パッド（**ド/レ/ミ/ソ**）。「練習（自動再生）」→「ゲーム開始」で同じ順に押す。1〜4キーでも操作可。ミス時はヒント音あり。
* **効果音**: WebAudio で合成。ブラウザのオート再生制限に配慮（ユーザー操作後に初期化）。

---

## 1. すぐ使う（このリポジトリのコンポーネントを埋め込む）

1. `KidsMusicGame.tsx`（または `.jsx`）を任意の React プロジェクトにコピー。
2. Tailwind を使っていない場合、クラスは任意の CSS に置き換え可能（動作自体は純 React なのでそのままでも可）。
3. 使い方：

```tsx
import KidsMusicGame from "./KidsMusicGame";

export default function App() {
  return <KidsMusicGame />;
}
```

> **音が出ない場合**: ボタンを一度クリックしてから再度試す（ブラウザの自動再生制限のため）。iOS は端末のサイレントスイッチが ON だと無音になることがあります。

---

## 2. 新規プロジェクトで動かす（Vite + Tailwind の例）

```bash
npm create vite@latest kids-music-game -- --template react
cd kids-music-game
npm i
# Tailwind（任意）
npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

`tailwind.config.js` に下記を追加：

```js
/** @type {import('tailwindcss').Config} */
export default { content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"] , theme: { extend: {} }, plugins: [] }
```

`src/index.css` に下記を追加：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`src/` に `KidsMusicGame.tsx` を置き、`App.tsx` で読み込む。

---

## 3. 機能詳細

### リズムモード

* **カウントイン**: 最初の4拍はカウント表示のみ（判定なし）
* **判定開始**: 5拍目以降、中央で\*\*爆発フキダシ（パン！）\*\*表示、入力を判定
* **判定数**: 固定で **4×4 = 16 拍**
* **判定幅**: `Perfect = ±80ms`、`Good = ±160ms`
* **強拍**: 4拍ごとに高めの音
* **操作**: スペースキー or クリック
* **スコア**: Perfect/Good/Miss 表示、精度% と星（0〜3）

### メロディモード

* **音階**: C4=ド、D4=レ、E4=ミ、G4=ソ
* **モード**: 自由/練習（自動再生）/ゲーム（譜面通りに入力）
* **譜面**: デフォルトで「メリーさんのひつじ」一節
* **操作**: キー `1〜4`、またはクリック
* **アシスト**: ミス時にヒント音を再生（ON）

---

## 4. 主要コードとカスタマイズ

### RhythmGame（判定やテンポ）

```ts
const perfectWin = 80;   // ms（Perfect 判定幅）
const goodWin = 160;     // ms（Good 判定幅）
const judgeOffset = 4;   // カウントイン拍数（判定なし）
const judgeBeats = 16;   // 判定する拍数（4×4）
```

* 判定の厳しさを変える: `perfectWin`, `goodWin`
* カウントイン長: `judgeOffset`
* 判定する総拍数: `judgeBeats`
* 中央の爆発表示は `Starburst` コンポーネント。`label`, `spikes`, 色、線の太さを調整可。

### MelodyGame（音階と譜面）

```ts
const NOTES = [
  { name: "ド", key: "1", freq: 261.63 },
  { name: "レ", key: "2", freq: 293.66 },
  { name: "ミ", key: "3", freq: 329.63 },
  { name: "ソ", key: "4", freq: 392.0  },
];
const SONG = [2,1,0,1,2,2,2, 1,1,1, 2,3,3];
```

* 音階を増やす: `NOTES` に追加、ボタン描画は配列に追従
* 譜面を変える: `SONG` を差し替え（要素は `NOTES` のインデックス）
* BPM 範囲：スライダーで 70〜120（必要に応じて属性を変更）

### 共通（音生成）

* `useAudio().playBeep({ freq, duration, type, volume, when, attack, release })`
* Safari/モバイル対策で**ユーザー操作後に `AudioContext` を resume**

---

## 5. 既知のブラウザ制約・トラブルシュート

* **音が出ない**: 何かボタンを一度押してから再試行。iOS は本体の**サイレントスイッチ**に注意。
* **ビルドエラー `Expecting Unicode escape sequence \uXXXX`**: JSX で `className=\"...\"` のようにバックスラッシュで誤エスケープしていると発生。`className="..."` に修正。
* **レイテンシ**: 端末や負荷でわずかなズレが出ます。必要なら判定幅を広げるか、`performance.now()` を参照するタイミングの補正を検討。

---

## 6. アクセシビリティ/UX

* 主要ボタンにラベルあり、キーボードでも操作可能（Space / 1〜4）。
* クリック領域を大きめに設計。
* 追加で `aria-label` を付ける場合は、各パッドボタンに `aria-label={\`Note \${n.name}\`}\` などを設定。

---

## 7. 拡張アイデア

* 曲を複数プリセット化、選択 UI を追加
* バイブレーション（`navigator.vibrate`）で拍フィードバック（モバイルのみ）
* 判定可視化（タイミングバー・±ms 表示）
* ハイスコアの保存（localStorage）
* ノーツ落下型 UI への拡張
