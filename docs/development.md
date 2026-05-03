# 開発環境・手順

## 前提環境

| ツール | バージョン | 用途 |
|--------|-----------|------|
| Node.js | v18 以上 | 開発サーバー（npx 経由） |
| ブラウザ | Chrome 90+ / Firefox 88+ / Safari 15+ | 動作確認・デバッグ |

ビルドツール・パッケージインストールは不要。ゲーム本体は Vanilla JS のみで構成する。

---

## ローカル開発サーバー起動

ES Modules（`import`/`export`）を使用するため、`file://` では動作しない。必ずローカルサーバー経由で開く。

```bash
# 推奨：Vite（ホットリロードあり）
npx vite

# 代替：静的サーバー
npx serve .

# 代替：Python
python3 -m http.server 8080
```

Vite 起動後は `http://localhost:5173` が自動で開く。

---

## 推奨ファイル構成

```
mega-block-breaker/
├── index.html          # canvas要素・script type="module" のみ
├── src/
│   ├── config.js       # CONFIGオブジェクト（全定数）
│   ├── main.js         # 初期化・requestAnimationFrameループ
│   ├── blocks.js       # ブロックグリッド管理（Uint8Array）・描画
│   ├── ball.js         # ボール物理・グリッドベース衝突判定
│   ├── paddle.js       # パドル状態・キーボード/マウス入力
│   ├── items.js        # アイテム落下・A〜Z効果適用
│   └── effects.js      # パーティクル・スクリーンシェイク
└── docs/
    ├── spec.md
    └── development.md
```

### `index.html` の最小構成

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>Mega-Block Breaker</title>
  <style>
    body { margin: 0; background: #000; display: flex; justify-content: center; align-items: center; height: 100vh; }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="gameCanvas"></canvas>
  <script type="module" src="src/main.js"></script>
</body>
</html>
```

---

## ゲームループ

`main.js` は以下の順で毎フレーム処理する。

```
requestAnimationFrame
  └─ update(dt)
       ├─ paddle.update(input)
       ├─ ball.update(dt)          ← グリッド衝突判定を含む
       ├─ items.update(dt)         ← 落下・パドル取得判定
       └─ effects.update(dt)       ← パーティクル寿命管理
  └─ render(ctx)
       ├─ blocks.render(ctx)
       ├─ ball.render(ctx)
       ├─ paddle.render(ctx)
       ├─ items.render(ctx)
       ├─ effects.render(ctx)
       └─ hud.render(ctx)
```

`dt`（前フレームからの経過時間）を使った時間ベース更新にすると、フレームレートに依存しない物理挙動になる。

---

## ブロックグリッドのデータ構造

15,000 個のブロックを `Uint8Array` で管理する（1ブロック = 1バイト: `0` = 破壊済、`1` = 通常、`2` = 耐久ブロックなど）。

```js
// config.js
const blocks = new Uint8Array(CONFIG.BLOCK_COLS * CONFIG.BLOCK_ROWS);

// インデックス計算（衝突判定で使用）
function blockIndex(col, row) {
  return row * CONFIG.BLOCK_COLS + col;
}

// ボール座標 → グリッド位置
function ballToGrid(x, y) {
  const col = Math.floor((x - CONFIG.BLOCK_OFFSET_X) / CONFIG.BLOCK_W);
  const row = Math.floor((y - CONFIG.BLOCK_OFFSET_Y) / CONFIG.BLOCK_H);
  return { col, row };
}
```

---

## 操作

| 入力 | 操作 |
|------|------|
| `←` / `→` または `A` / `D` | パドル左右移動 |
| `Space` | ゲーム開始 / ボール発射（Catchアイテム取得後） |
| `P` | 一時停止（デバッグ用） |

---

## パフォーマンス確認

Chrome DevTools の **Performance** タブでフレームを記録し、以下を確認する。

- **Rendering** が各フレームで 16ms（60fps）以内に収まっているか
- **Scripting** に占める割合（衝突判定・パーティクル更新が多い場合は要最適化）

FPS をゲーム内に常時表示しておくと開発中の指標になる。

```js
// main.js に仮実装
let fps = 0, lastTime = 0;
function loop(ts) {
  fps = Math.round(1000 / (ts - lastTime));
  lastTime = ts;
  // ...
  ctx.fillText(`FPS: ${fps}`, 8, 16);
  requestAnimationFrame(loop);
}
```

---

## よくある落とし穴

**Retina で 3px ブロックがぼやける**  
HiDPI 対応を `main.js` の初期化時に必ず行う（詳細は `spec.md` §6）。

**`file://` で ES Module が読み込まれない**  
ローカルサーバーを経由する（上記「開発サーバー起動」参照）。

**15,000 ブロックを毎フレーム個別に `fillRect` すると重い**  
未破壊ブロックのみ描画、または ImageData で一括書き込みする。破壊済みブロックはスキップする。

**複数ボールの衝突が同一フレームで連鎖する**  
D（Double）や T（Twin）適用後は、各ボールが同フレームで同一ブロックを破壊しないよう、破壊フラグの更新タイミングに注意する。
