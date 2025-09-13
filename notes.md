# HypeType ゲーム仕様書

## ゲーム概要
タイピングシューティングゲームで、敵に表示された単語をタイプして倒すことが基本コンセプトです。

## 主要コンポーネント

### 1. コアシステム
- **script.js**: ゲームのメインロジック
  - ゲームループ管理
  - オブジェクト(プレイヤー、敵、弾)の更新と描画
  - 衝突判定
  - スコア管理

### 2. ゲームオブジェクト
- **enemy.js**: 敵クラス
  - 敵の移動ロジック
  - プレイヤーとの衝突判定
  - 単語表示機能

- **bullet.js**: 弾クラス
  - 弾の移動ロジック
  - 敵との衝突判定
  - ダメージ計算

### 3. データ管理
- **wordManager.js**: 単語リスト管理
  - 単語リストの読み込み
  - 難易度別、言語別の単語選択
  - JSONからの単語リスト読み込み
  - 現在の単語リスト取得
  - フォールバック用単語リスト

```javascript
// 単語リストの読み込み
async function loadWordLists() {
    const response = await fetch('../jsons/wordLists.json');
    return await response.json();
}

// 現在の単語リスト取得
function getCurrentWordList(wordLists, language, difficulty) {
    return wordLists.languages[language].difficultyLevels[difficulty].words;
}
```

- **wave.js**: ウェーブ管理
  - 敵の出現パターン
  - 難易度進行
  - ウェーブ進行処理
  - 敵HPのウェーブごとの調整
  - 許可される難易度の管理

```javascript
// ウェーブ進行処理
function advanceWave() {
    waveState.currentWave++;
    waveState.killsThisWave = 0;
}

// 敵HPのウェーブごとの調整
function getEnemyHPForWave(baseHP = 3) {
    const extra = Math.floor((waveState.currentWave - 1) / 2);
    return Math.max(1, baseHP + extra);
}
```

### 4. ユーティリティ
- **typesys.js**: タイピング入力システム
  - キー入力検出
  - タイプミスの判定
  - プレフィックスにマッチする敵の検索
  - プレイヤーからの距離計算
  - 最も近い敵の検索
  - 敵の入力進行度リセット

```javascript
class TypeSystem {
    // プレフィックスにマッチする敵を検索
    findMatchingEnemiesByPrefix(prefix, enemies) {
        // 実装内容
    }

    // プレイヤーからの距離を計算
    distanceToPlayer(enemy, player) {
        return Math.hypot(player.x - enemy.x, player.y - enemy.y);
    }
}
```

## 詳細なコード説明

### script.js の主要機能
```javascript
// テーマ設定
function setTheme(isDark) {
    if (isDark) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    applyCanvasColors();
}

// ゲーム初期化
function initGame() {
    // キャンバス設定、イベントリスナー登録など
    loadWordLists();
    setTheme(localStorage.getItem(THEME_KEY) === 'dark');
}

// ゲームループ
function gameLoop() {
    // オブジェクト更新 → 描画 → リクエストアニメーションフレーム
    updateObjects();
    renderObjects();
    requestAnimationFrame(gameLoop);
}
```

### enemy.js の主要メソッド
```javascript
class Enemy {
    constructor(x, y, word, hp, color = '#808080') {
        this.x = x;
        this.y = y;
        this.word = word;
        this.displayWord = word;
        this.typed = '';
        this.hp = hp;
        this.color = color;
        this.maxHp = hp;
    }

    // 敵をプレイヤーに向かって移動させる
    moveTowards(targetX, targetY, speed = 0.25) {
        const angle = Math.atan2(targetY - this.y, targetX - this.x);
        this.x += Math.cos(angle) * speed;
        this.y += Math.sin(angle) * speed;
    }

    // プレイヤーとの衝突判定
    checkPlayerCollision(playerX, playerY, playerRadius, enemyRadius) {
        const dist = Math.sqrt(Math.pow(playerX - this.x, 2) + Math.pow(playerY - this.y, 2));
        return dist < playerRadius + enemyRadius;
    }
}
```

## 設定ファイル
- **wordLists.json**: 単語リストの設定
- **locales.json**: 多言語対応用テキスト

## 開発メモ
- テーマ切り替え機能あり(dark/light)
- 解像度調整可能