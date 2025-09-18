# HypeType 開発・引き継ぎドキュメント

---

## 1. ゲーム概要
タイピング・シューティングゲームです。キャンバス上に出現する敵の頭上に表示された単語をタイプすると弾が発射され、敵にダメージを与えられます。ウェーブ形式で進行し、敵を倒し続けてスコアを伸ばすことが目的です。

---

## 2. ディレクトリ構成
```
proj/hype_type/
├─ readme.md            … プロジェクト概要・使用方法
├─ favicon.ico          … ファビコン
├─ index.html           … 画面レイアウト & 設定 UI
├─ style.css            … テーマ・UI・キャンバスの CSS
├─ notes.md             … 開発・引き継ぎドキュメント
├─ scripts/             … ゲームロジック (ES2020)
│  ├─ script.js         … メインエントリ / ゲームループ / UI
│  ├─ enemy.js          … 敵クラス
│  ├─ bullet.js         … 弾クラス
│  ├─ wave.js           … ウェーブ管理
│  ├─ wordManager.js    … 単語リスト管理
│  ├─ typesys.js        … タイピング判定ユーティリティ
│  ├─ effectManager.js  … エフェクト生成・管理
│  ├─ bgmManager.js     … BGM 再生制御
│  ├─ se.js             … 効果音管理
│  ├─ weaponSystem.js   … 武器システム管理
│  └─ debug.js          … ブラウザコンソール用デバッグ API
├─ jsons/               … 定義ファイル
│  ├─ wordLists.json    … 難易度・言語別単語リスト
│  ├─ locales.json      … UI 文字列 (多言語対応)
│  └─ upgrades.json     … アップグレード定義
├─ editer/              … エディタ関連ファイル
│  ├─ editor.js         … エディタ機能
│  ├─ index.html        … エディタページ
│  └─ style.css         … エディタスタイル
├─ BGM/                 … BGM アセット
│  └─ lofi/             … ローファイ BGM ファイル (001.mp3 ~ 010.mp3)
├─ SE/                  … 効果音アセット
├─ wordlists/           … 旧プレーンテキスト単語リスト
├─ .github/             … GitHub Actions などの CI/CD 設定
├─ .qodo/               … (不明: 開発補助ファイル)
└─ .trae/               … (不明: 開発補助ファイル)
```

---

## 3. 主要依存関係
本ゲームは **純粋なクライアントサイド実装** です。外部ライブラリは使用していません (原生 JS / HTML5 Canvas)。

* Audio 再生: `<audio>` 要素 + JS 制御
* 設定永続化: `localStorage`
* 多言語/データ読込: `fetch()` による JSON ロード (wordLists.json, locales.json, upgrades.json)

---

## 4. コード概要
### 4.1 script.js (コア)
| 機能 | 説明 |
|------|------|
| **initGame()** | 画面要素取得・イベント登録・データ読込 |
| **gameLoop()** | `requestAnimationFrame` で 60 FPS 固定ループ<br>  - `FPS = 60`, `frameInterval = 16.666…ms`<br>  - ポーズ中は `update()` スキップし `draw()` のみ |
| **update() / draw()** | 各オブジェクト更新 & 描画 |
| **Keyboard Handler** | 文字キー → TypeSystem、ESC → ポーズ |
| **Pause Menu** | `gamePaused` フラグと `updatePauseMenu()` で表示切替 |

### 4.2 enemy.js / bullet.js
- **Enemy**: 位置 (`x`,`y`)、単語、HP、進捗 (`typed`) を保持。`moveTowards()` でプレイヤーへ接近。
- **Bullet**: 座標 & ベクトル (`vx`,`vy`)。`move()` が毎フレーム移動。敵との当たり判定は `script.js` 内。

### 4.3 wave.js
- `waveState` に現在ウェーブ・撃破数を保持。
- `advanceWave()` で進行、`getEnemyHPForWave()` で HP スケール。

### 4.4 wordManager.js
- JSON から全単語リストをロードし、言語・難易度でフィルタ。

### 4.5 typesys.js
- 入力文字列と敵単語の **プレフィックス比較** で命中対象を決定。
- プレイヤー座標との距離で最寄り敵を計算。

### 4.6 effectManager.js
- ヒット時・撃破時のスプライト/パーティクル管理 (Canvas).

### 4.7 bgmManager.js / se.js
- **bgmManager**: ループ再生・BGM 切替・ミュート。
- **se.js**: 効果音の短い一括管理。

### 4.8 debug.js
- `window.hypeType.cmd('debug on')` などでログ出力を切替可能。

### 4.9 weaponSystem.js
- 武器の種類、アップグレード、発射ロジックを管理。`upgrades.json` と連携して武器強化を実装。

---

## 5. ゲームデザイン / ルール
1. **開始**: スタート画面から `Start` を押すとゲーム開始。BGM 再生。
2. **操作**:
   * キーボード文字キー: 敵単語タイプ
   * `Backspace`: 入力進捗を 1 文字戻す (全敵一括)
   * `ESC`: ゲームポーズ/再開
3. **撃破条件**: 敵単語を完全入力すると弾 3 連射。HP を 0 にすると撃破。
4. **スコア**: 撃破毎に加点 (実装予定箇所あり)。
5. **ウェーブ**: 一定撃破数で `advanceWave()`。敵 HP 増加。
6. **敗北条件**: (未実装) プレイヤー HP が 0 など。

---

## 6. UI & 設定
| UI | 説明 |
|----|------|
| スタート画面 | 言語・解像度・テーマ・ミュートを選択 |
| ポーズメニュー | `ゲーム再開` / `メニューに戻る` |
| テーマ | ライト / ダーク (`body.dark-theme`) |

---

## 7. ビルド & 実行方法
1. リポジトリをクローンし、VS Code などで開く。
2. ルートで開発用サーバを起動 (例):
   ```bash
   python -m http.server 8000
   ```
3. ブラウザで `http://localhost:8000/` を開く。

依存ライブラリ不要。最新ブラウザ (Chrome / Edge) 推奨。

---

## 8. 今後の改善案
- スコア & ランキング実装
- モバイル入力対応 (画面キーボード)
- 敗北条件・タイトルリトライ
- WebGL 化によるパフォーマンス向上

---

## 9. 引き継ぎポイントまとめ
* **FPS 固定**: `script.js` 冒頭に `FPS`, `frameInterval`, `lastFrameTime` あり。
* **ポーズ**: `gamePaused` と ESC キー処理。
* **単語リスト追加**: `jsons/wordLists.json` に追記。
* **多言語拡張**: `jsons/locales.json` と UI 文字列同期。
* **デバッグ**: `debug.js` でコンソール操作。
* **アップグレードシステム**: `jsons/upgrades.json` と `scripts/weaponSystem.js` で管理。
* **エディタ機能**: `editer/` ディレクトリ内のファイルで実装。

以上が現行バージョンの全体像です。