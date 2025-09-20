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
| `rarity` | string | ノードのレアリティ (オプション) |
| `special` | boolean | 特殊ノードフラグ (オプション) |
| `exclusiveGroup` | string | 排他的選択グループ名 (オプション) |

## レアリティシステム

ノードのレアリティを指定することで、視覚的な強調表示と特別なアニメーション効果を適用できます。

### 利用可能なレアリティ

| レアリティ | 説明 | 視覚効果 |
|-----------|------|----------|
| `common` | 標準的なノード | 銀色のグラデーション |
| `rare` | レアなノード | 青色のグラデーション + グロー効果 |
| `epic` | エピックなノード | 紫色のグラデーション + 強いグロー効果 |
| `legendary` | 伝説的なノード | 金色のグラデーション + 強力なグロー効果 |

### レアリティの使用例

```json
{
  "id": "ultimate_damage",
  "name": "ULTIMATE DAMAGE",
  "description": "Massive damage increase (+300%)",
  "icon": "💎",
  "rarity": "legendary",
  "cost": 3,
  "effects": [
    { "kind": "stat", "target": "weapon.damage", "op": "mul", "value": 4.0 }
  ]
}
```

## 特殊ノードシステム

`special`フラグを`true`に設定することで、特別な視覚効果と強調表示を適用できます。

### 特殊ノードの特徴

- 赤からオレンジのグラデーション背景
- 特別な赤いボーダー
- 強力なグローアニメーション
- サイズが10%拡大
- 取得済み時は緑色の特別効果

### 特殊ノードの使用例

```json
{
  "id": "time_slow",
  "name": "TIME SLOW",
  "description": "Slow down time for better aiming",
  "icon": "⏰",
  "special": true,
  "cost": 2,
  "effects": [
    { "kind": "stat", "target": "weapon.timeScale", "op": "mul", "value": 0.7 }
  ]
}
```

## 排他的選択グループ

同じ`exclusiveGroup`を持つノードは、一度に一つしか選択できません。新しいノードを選択すると、同じグループ内の他のノードは自動的に解除されます。

### 排他的選択の特徴

- 同じグループ内のノードが選択された場合、他のノードは自動的に無効化
- 無効化されたノードは赤みがかった背景とグレースケール効果
- 選択されたノードはオレンジ色の強調枠線
- 効果の反転処理で適切にアップグレードを除去
- ポイントの自動返却システム

### 排他的選択の使用例

```json
{
  "id": "rapid_fire",
  "name": "RAPID FIRE",
  "description": "Fast continuous shots (3 bullets)",
  "icon": "🔫",
  "exclusiveGroup": "attack_style",
  "cost": 1,
  "effects": [
    { "kind": "stat", "target": "weapon.burstCount", "op": "add", "value": 3 }
  ]
}
```

複数の攻撃スタイル（例: 高速連射 vs 強力単発 vs 範囲攻撃）を排他的に選択させる場合に有効です。

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

### レアリティシステムを使用した例

```json
{
  "id": "ultimate_damage",
  "name": "ULTIMATE DAMAGE",
  "description": "Massive damage increase (+300%)",
  "icon": "💎",
  "requires": { "and": ["rapid_fire", "heavy_shot"] },
  "cost": 3,
  "rarity": "legendary",
  "effects": [
    { "kind": "stat", "target": "weapon.damage", "op": "mul", "value": 4.0 }
  ]
}
```

### 特殊ノードを使用した例

```json
{
  "id": "time_slow",
  "name": "TIME SLOW",
  "description": "Slow down time for better aiming",
  "icon": "⏰",
  "special": true,
  "cost": 2,
  "effects": [
    { "kind": "stat", "target": "weapon.timeScale", "op": "mul", "value": 0.7 }
  ]
}
```

### 排他的選択グループを使用した例

```json
{
  "id": "rapid_fire",
  "name": "RAPID FIRE",
  "description": "Fast continuous shots (3 bullets)",
  "icon": "🔫",
  "exclusiveGroup": "attack_style",
  "cost": 1,
  "effects": [
    { "kind": "stat", "target": "weapon.burstCount", "op": "add", "value": 3 },
    { "kind": "stat", "target": "weapon.fireCooldownMs", "op": "mul", "value": 0.7 }
  ]
},
{
  "id": "heavy_shot",
  "name": "HEAVY SHOT",
  "description": "Powerful single shots (high damage)",
  "icon": "💥",
  "exclusiveGroup": "attack_style",
  "cost": 1,
  "effects": [
    { "kind": "stat", "target": "weapon.damage", "op": "mul", "value": 2.0 },
    { "kind": "stat", "target": "weapon.fireCooldownMs", "op": "mul", "value": 1.5 }
  ]
}
```

### 複合機能を使用した例

```json
{
  "id": "multishot_master",
  "name": "MULTISHOT MASTER",
  "description": "Fire multiple bullets simultaneously",
  "icon": "⭐",
  "requires": { "and": ["spread_shot"] },
  "cost": 2,
  "rarity": "epic",
  "special": true,
  "effects": [
    { "kind": "stat", "target": "weapon.burstCount", "op": "add", "value": 8 },
    { "kind": "stat", "target": "weapon.spreadAngle", "op": "add", "value": 0.8 }
  ]
}
```

## 注意事項

1. **ノードIDの一意性**: 各ノードの `id` はツリー内で一意である必要があります
2. **依存関係の循環**: 循環依存は作成しないでください
3. **コストのバランス**: 強力なエフェクトには適切なコストを設定してください
4. **テスト**: 新しいアップグレードを追加したら、ゲーム内で正常に動作するかテストしてください
5. **UI表示**: `name` と `description` はUIに表示されるため、わかりやすい文言を使用してください
6. **レアリティの使用**: `rarity`プロパティは視覚効果を追加するため、適切なレアリティを選択してください
7. **特殊ノードの使用**: `special`フラグは本当に特別なノードにのみ使用してください
8. **排他的グループの設計**: `exclusiveGroup`を使用する場合は、論理的にグループ化してください
9. **パフォーマンス**: 多数の特殊効果を使用するとパフォーマンスに影響する可能性があります

## デバッグ

アップグレードシステムのデバッグには、ブラウザコンソールで以下のコマンドを使用できます：

```javascript
// 現在のアップグレードポイントを確認
console.log(window.hypeType.upgradePoints);

// 取得済みアップグレードを確認
console.log(window.hypeType.acquiredUpgrades);

// 特定のノードが購入可能か確認
upgradeUI.canPurchaseNode(nodeObject);

// 排他的グループの情報を確認
console.log(window.hypeType.exclusiveGroups);

// ノードのレアリティと特殊フラグを確認
const node = upgradeUI.findNodeById('node_id');
console.log('Rarity:', node?.rarity, 'Special:', node?.special);