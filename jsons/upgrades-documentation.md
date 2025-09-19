# HypeType Upgrade System Documentation

## 概要

このドキュメントは、HypeTypeゲームのアップグレードシステム (`jsons/upgrades.json`) のカスタマイズ方法について説明します。

## ファイル構造

### 基本構造

```json
{
  "trees": [
    {
      "id": "main",
      "name": "Neural Network",
      "nodes": [
        // ノード定義の配列
      ]
    }
  ]
}
```

### ツリー定義

| プロパティ | 型 | 説明 |
|-----------|----|------|
| `id` | string | ツリーの一意の識別子 |
| `name` | string | UIに表示されるツリー名 |
| `nodes` | array | アップグレードノードの配列 |

## ノード定義

### 基本プロパティ

```json
{
  "id": "speed_opt_1",
  "name": "SPEED OPTIMIZATION",
  "description": "Reduce fire cooldown by 10%",
  "icon": "⚙️",
  "requires": { "and": [] },
  "cost": 1,
  "maxLevel": 1,
  "effects": [
    // エフェクト定義の配列
  ]
}
```

| プロパティ | 型 | 説明 |
|-----------|----|------|
| `id` | string | ノードの一意の識別子 |
| `name` | string | UIに表示されるノード名 |
| `description` | string | UIに表示される説明文 |
| `icon` | string | ノードに表示される絵文字アイコン |
| `requires` | object | 依存関係定義 |
| `cost` | number | アップグレードに必要なポイント数 |
| `maxLevel` | number | 最大レベル (現在は1固定) |
| `effects` | array | 適用されるエフェクトの配列 |

## 依存関係 (requires)

### AND条件

```json
"requires": { "and": ["node_id_1", "node_id_2"] }
```

- すべての指定ノードが取得済みの場合のみ解放
- 配列が空の場合は依存なし (最初から解放)

### OR条件

```json
"requires": { "and": ["node_id_1"], "or": ["node_id_2", "node_id_3"] }
```

- AND条件 + OR条件の組み合わせ
- OR条件のノードが1つでも取得済みの場合に解放

### 旧形式 (後方互換)

```json
"requires": ["node_id_1", "node_id_2"]  // AND条件として扱われる
```

## エフェクト定義

### 1. 武器ステータスエフェクト (kind: "stat")

武器の基本ステータスを変更します。

```json
{
  "kind": "stat",
  "target": "weapon.fireCooldownMs",
  "op": "mul",
  "value": 0.9
}
```

#### 利用可能なターゲット

| ターゲット | 説明 | デフォルト値 |
|-----------|------|-------------|
| `weapon.bulletDamage` | 弾のダメージ | 10 |
| `weapon.fireCooldownMs` | 発射クールダウン (ms) | 250 |
| `weapon.burstCount` | バースト数 | 3 |
| `weapon.shotDelayMs` | ショット間隔 (ms) | 100 |
| `weapon.bulletSpeed` | 弾の速度 | 10 |
| `weapon.spreadDeg` | 拡散角度 (度) | 0 |
| `weapon.lifeTimeMs` | 弾の寿命 (ms) | 2000 |
| `weapon.pierceCount` | 貫通数 | 0 |
| `weapon.chainCount` | チェーン数 | 0 |
| `weapon.chainRange` | チェーン範囲 | 120 |
| `weapon.splitCount` | 分裂数 | 0 |
| `weapon.splitAngleDeg` | 分裂角度 (度) | 30 |
| `weapon.aoeRadius` | AoE半径 | 0 |
| `weapon.ricochetCount` | 跳ね返り数 | 0 |

#### 演算子

| 演算子 | 説明 | 例 |
|-------|------|----|
| `"add"` | 加算 | `"value": 1` (ダメージ +1) |
| `"mul"` | 乗算 | `"value": 0.9` (クールダウン 90%) |

### 2. ステータス効果エフェクト (kind: "special")

敵のステータス効果を調整します。

#### ステータス調整 (type: "status_tuning")

```json
{
  "kind": "special",
  "type": "status_tuning",
  "path": "chill.dpsGrowthMul",
  "op": "mul",
  "value": 1.3
}
```

#### ステータスベース変更 (type: "status_base_add")

```json
{
  "kind": "special",
  "type": "status_base_add",
  "path": "bleed.percentPerSec",
  "op": "add",
  "value": 0.02
}
```

#### 利用可能なステータスパス

##### Burn (燃焼)
| パス | 説明 | デフォルト |
|-----|------|-----------|
| `burn.durationMul` | 持続時間倍率 | 1.0 |
| `burn.dpsMul` | DPS倍率 | 1.0 |

##### Chill (冷却)
| パス | 説明 | デフォルト |
|-----|------|-----------|
| `chill.durationMul` | 持続時間倍率 | 1.0 |
| `chill.slowFactorMul` | 移動速度倍率 | 1.0 |
| `chill.baseDpsMul` | 初期DPS倍率 | 1.0 |
| `chill.dpsGrowthMul` | DPS増加率倍率 | 1.0 |
| `chill.freezeBaseSecMul` | 凍結移行時間倍率 | 1.0 |
| `chill.freezePerHpMul` | HP依存凍結時間倍率 | 1.0 |
| `chill.freezeDurationMul` | 凍結持続時間倍率 | 1.0 |

##### Freeze (凍結)
| パス | 説明 | デフォルト |
|-----|------|-----------|
| `freeze.durationMul` | 持続時間倍率 | 1.0 |

##### Bleed (出血)
| パス | 説明 | デフォルト |
|-----|------|-----------|
| `bleed.durationMul` | 持続時間倍率 | 1.0 |
| `bleed.percentPerSecMul` | 毎秒減少率倍率 | 1.0 |
| `bleed.minRatioMul` | 最小体力比率倍率 | 1.0 |

## 使用例

### 基本的な武器強化

```json
{
  "id": "damage_boost",
  "name": "DAMAGE BOOST",
  "description": "Increase bullet damage by 25%",
  "icon": "💥",
  "requires": { "and": [] },
  "cost": 1,
  "maxLevel": 1,
  "effects": [
    {
      "kind": "stat",
      "target": "weapon.bulletDamage",
      "op": "mul",
      "value": 1.25
    }
  ]
}
```

### 複合エフェクト

```json
{
  "id": "rapid_fire",
  "name": "RAPID FIRE",
  "description": "Faster firing with reduced damage",
  "icon": "🔫",
  "requires": { "and": ["speed_opt_1"] },
  "cost": 2,
  "maxLevel": 1,
  "effects": [
    {
      "kind": "stat",
      "target": "weapon.fireCooldownMs",
      "op": "mul",
      "value": 0.7
    },
    {
      "kind": "stat",
      "target": "weapon.bulletDamage",
      "op": "mul",
      "value": 0.8
    }
  ]
}
```

### ステータス効果強化

```json
{
  "id": "chill_master",
  "name": "CHILL MASTER",
  "description": "Enhanced chill effects",
  "icon": "❄️",
  "requires": { "and": ["chill_bias"] },
  "cost": 2,
  "maxLevel": 1,
  "effects": [
    {
      "kind": "special",
      "type": "status_tuning",
      "path": "chill.dpsGrowthMul",
      "op": "mul",
      "value": 2.0
    },
    {
      "kind": "special",
      "type": "status_tuning",
      "path": "chill.freezeDurationMul",
      "op": "mul",
      "value": 1.5
    }
  ]
}
```

### OR条件を使用した代替パス

```json
{
  "id": "advanced_weapon",
  "name": "ADVANCED WEAPON",
  "description": "Unlocks advanced weapon features",
  "icon": "⚡",
  "requires": {
    "and": ["basic_weapon"],
    "or": ["fire_path", "ice_path", "lightning_path"]
  },
  "cost": 3,
  "maxLevel": 1,
  "effects": [
    {
      "kind": "stat",
      "target": "weapon.pierceCount",
      "op": "add",
      "value": 2
    }
  ]
}
```

## 注意事項

1. **ノードIDの一意性**: 各ノードの `id` はツリー内で一意である必要があります
2. **依存関係の循環**: 循環依存は作成しないでください
3. **コストのバランス**: 強力なエフェクトには適切なコストを設定してください
4. **テスト**: 新しいアップグレードを追加したら、ゲーム内で正常に動作するかテストしてください
5. **UI表示**: `name` と `description` はUIに表示されるため、わかりやすい文言を使用してください

## デバッグ

アップグレードシステムのデバッグには、ブラウザコンソールで以下のコマンドを使用できます：

```javascript
// 現在のアップグレードポイントを確認
console.log(window.hypeType.upgradePoints);

// 取得済みアップグレードを確認
console.log(window.hypeType.acquiredUpgrades);

// 特定のノードが購入可能か確認
upgradeUI.canPurchaseNode(nodeObject);