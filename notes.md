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
│  ├─ script.js         … メインエントリ / ゲームループ / UI / 解像度スケーリング
│  ├─ enemy.js          … 敵クラス
│  ├─ bullet.js         … 弾クラス
│  ├─ wave.js           … ウェーブ管理
│  ├─ wordManager.js    … 単語リスト管理
│  ├─ typesys.js        … タイピング判定ユーティリティ
│  ├─ effectManager.js  … エフェクト生成・管理
│  ├─ bgmManager.js     … BGM 再生制御
│  ├─ se.js             … 効果音管理
│  ├─ weaponSystem.js   … 武器システム管理
│  ├─ upgradeUI.js      … アップグレードUI管理
│  ├─ uiManager.js      … UI管理 (ポーズメニュー・ローカライズ)
│  ├─ themeManager.js   … テーマ管理 (ライト/ダーク)
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
| **startGame()** | ゲーム初期化・解像度設定・アップグレードUI構築・初期ポイント設定 |
| **gameLoop()** | `requestAnimationFrame` で 60 FPS 固定ループ<br>  - `FPS = 60`, `frameInterval = 16.666…ms`<br>  - ポーズ中は `update()` スキップし `draw()` のみ |
| **update() / draw()** | 各オブジェクト更新 & 描画 (解像度非依存スケーリング対応) |
| **Keyboard Handler** | 文字キー → TypeSystem、ESC → ポーズ、Space → アップグレード画面 |
| **Resolution Scaling** | `canvasScale` でオブジェクトサイズを解像度に合わせて調整 |
| **Quick Start** | Enterキーでの高速ゲーム開始 |

### 4.2 upgradeUI.js
| 機能 | 説明 |
|------|------|
| **UpgradeUI Class** | アップグレード画面の管理・ノード配置・依存関係チェック |
| **canPurchaseNode()** | ポイント・依存関係チェック (AND/ORロジック対応) |
| **buildUpgradeUI()** | ノード自動配置・SVGエッジ描画・UI更新 |
| **setInitialPoints()** | ゲーム開始時の初期ポイント設定 (2ポイント) |
| **Zoom/Pan Support** | マウスホイール・ドラッグでのUI操作 |

### 4.3 uiManager.js
| 機能 | 説明 |
|------|------|
| **updatePauseMenu()** | ポーズメニューの表示切替・フェードアニメーション |
| **updateUIText()** | 多言語対応UIテキスト更新 |
| **Menu Interactions** | スタート画面のホバー展開・クリックトグル |

### 4.4 themeManager.js
| 機能 | 説明 |
|------|------|
| **setTheme()** | ライト/ダークテーマ切替 |
| **getCanvasColors()** | テーマに応じたキャンバス色取得 |
| **applyCanvasColors()** | リアルタイムでの色適用 |

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
   * キーボード文字キー: 敵単語タイプ (タイプミス時は効果音再生)
   * `ESC`: ゲームポーズ/再開
   * `Space`: アップグレード画面開閉
   * `Enter`: スタート画面でのクイックスタート
3. **撃破条件**: 敵単語を完全入力すると弾 3 連射。HP を 0 にすると撃破。
4. **スコア**: 撃破毎に加点 (実装予定箇所あり)。
5. **ウェーブ**: 一定撃破数で `advanceWave()`。敵 HP 増加。
6. **アップグレード**: 敵撃破でポイント獲得。アップグレード画面で武器強化が可能。
7. **敗北条件**: プレイヤー HP が 0 など。

---

## 6. UI & 設定
| UI | 説明 |
|----|------|
| スタート画面 | 言語・解像度・テーマ・ミュートを選択<br>ツリー構造メニュー・ホバー展開・左揃えレイアウト・Enterキー高速開始 |
| ポーズメニュー | `ゲーム再開` / `メニューに戻る`<br>フェードアニメーション・BGM一時停止/再開・ESCキー操作 |
| アップグレード画面 | ノードベースのアップグレードツリー<br>ズーム/パン操作・依存関係表示・コスト表示・初期2ポイント付与 |
| テーマ | ライト / ダーク (`body.dark-theme`)<br>CSS変数による動的色変更・テキスト色のみテーマ対応 |

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
- 追加武器・エフェクト
---

## 9. 引き継ぎポイントまとめ
* **モジュール化**: ES6モジュールでコード分割 (`upgradeUI.js`, `uiManager.js`, `themeManager.js`)
* **解像度非依存**: `canvasScale` で全オブジェクトサイズを動的調整
* **FPS 固定**: `script.js` 冒頭に `FPS`, `frameInterval`, `lastFrameTime` あり
* **ポーズシステム**: `gamePaused` フラグ・ESCキー・BGM一時停止/再開
* **アップグレードシステム**: ノードベース・依存関係チェック・初期2ポイント付与
* **UI/UX改善**: ツリー構造メニュー・ホバー展開・フェードアニメーション
* **効果音管理**: タイプミス時のみ `cu3.mp3` 再生・正解時は無音
* **テーマ対応**: CSS変数による動的色変更・テキスト色のみテーマ反映
* **SVG描画修正**: `getBoundingClientRect()` フォールバックで安定化
* **単語リスト追加**: `jsons/wordLists.json` に追記
* **多言語拡張**: `jsons/locales.json` と UI 文字列同期
* **デバッグ**: `debug.js` でコンソール操作 + グローバル変数公開
* **エディタ機能**: `editer/` ディレクトリ内のファイルで実装・自動並び替え対応

## 10. 最近の実装変更履歴
* ✅ 解像度非依存のオブジェクトサイズを実装
* ✅ 使用していないポジション機能を削除
* ✅ エディターに自動並び替え機能を追加
* ✅ ORロジックで解放できるノードの線を点線に
* ✅ upgrade-header要素を各テーマに対応
* ✅ 敵撃破時ではなくタイプミス時にcu3.mp3を再生
* ✅ updatePauseMenu is not defined エラーを修正
* ✅ backspaceで一文字戻す機能を削除
* ✅ テーマに応じたテキストではなく、そのままに
* ✅ 線SVGがゲーム開始時に一度ズーム or パンをしないと描画されない問題を修正
* ✅ タイプミス時のみcu3.mp3を再生するように修正
* ✅ テキストの色のみテーマに対応させる

以上が現行バージョンの全体像です。