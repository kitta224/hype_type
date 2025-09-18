// Enemyクラスと敵管理用関数
export class Enemy {
    constructor(x, y, word, hp, color = '#808080') {
        this.x = x;
        this.y = y;
        this.word = word;
        this.displayWord = word;
        this.typed = '';
        this.hp = hp;
        this.color = color;
        // 最大体力（動的に変わる）と基準最大体力（固定）
        this.maxHp = hp;
        this.baseMaxHp = hp;

        // 状態異常管理
        // 各ステータスは null または { remaining:秒, ... } を保持
        this.status = {
            burn: null,   // { remaining, dps }
            chill: null,  // { remaining, elapsed, slowFactor, baseDps, dpsGrowthPerSec, canFreeze, freezeThresholdSec, freezeDurationSec }
            freeze: null, // { remaining }
            bleed: null   // { remaining, percentPerSec, minRatio }
        };
        // ステータス演出の簡易クールダウン（連続生成を抑制）
        this._statusFxCooldown = 0; // 秒
    }

    moveTowards(targetX, targetY, speed = 0.25) {
        const angle = Math.atan2(targetY - this.y, targetX - this.x);
        this.x += Math.cos(angle) * speed;
        this.y += Math.sin(angle) * speed;
    }

    checkPlayerCollision(playerX, playerY, playerRadius, enemyRadius) {
        const dist = Math.sqrt(Math.pow(playerX - this.x, 2) + Math.pow(playerY - this.y, 2));
        return dist < playerRadius + enemyRadius;
    }

    // ベース+チューニングから実効デフォルト値を算出
    _getEffectiveDefaults(type) {
        const B = Enemy.statusBase;
        const T = Enemy.statusTuning;
        switch (type) {
            case 'burn': {
                const b = B.burn, t = T.burn;
                return {
                    durationSec: (b.durationSec ?? 3.0) * (t.durationMul ?? 1),
                    dps: (b.dps ?? 4.0) * (t.dpsMul ?? 1)
                };
            }
            case 'chill': {
                const b = B.chill, t = T.chill;
                return {
                    durationSec: (b.durationSec ?? 4.0) * (t.durationMul ?? 1),
                    slowFactor: Math.min(1, Math.max(0, (b.slowFactor ?? 0.5) * (t.slowFactorMul ?? 1))),
                    baseDps: (b.baseDps ?? 0.5) * (t.baseDpsMul ?? 1),
                    dpsGrowthPerSec: (b.dpsGrowthPerSec ?? 0.5) * (t.dpsGrowthMul ?? 1),
                    freezeThresholdSec: ((b.freezeBaseSec ?? 1.5) * (t.freezeBaseSecMul ?? 1)) + ((b.freezePerHp ?? 0.02) * (t.freezePerHpMul ?? 1)) * this.baseMaxHp,
                    freezeDurationSec: (b.freezeDurationSec ?? 1.5) * (t.freezeDurationMul ?? 1)
                };
            }
            case 'freeze': {
                const b = B.freeze, t = T.freeze;
                return {
                    durationSec: (b.durationSec ?? 1.5) * (t.durationMul ?? 1)
                };
            }
            case 'bleed': {
                const b = B.bleed, t = T.bleed;
                return {
                    durationSec: (b.durationSec ?? 6.0) * (t.durationMul ?? 1),
                    percentPerSec: (b.percentPerSec ?? 0.05) * (t.percentPerSecMul ?? 1),
                    minRatio: Math.min(1, Math.max(0, (b.minRatio ?? 0.1) * (t.minRatioMul ?? 1)))
                };
            }
        }
        return {};
    }

    /**
     * 状態異常を付与/更新する
     * @param {('burn'|'chill'|'freeze'|'bleed')} type
     * @param {Object} [opts]
     */
    applyStatus(type, opts = {}) {
        switch (type) {
            case 'burn': {
                const base = this._getEffectiveDefaults('burn');
                const duration = (opts.durationSec != null) ? opts.durationSec : base.durationSec;
                const dps = (opts.dps != null) ? opts.dps : base.dps; // 継続ダメージ
                if (this.status.burn) {
                    this.status.burn.remaining = Math.max(this.status.burn.remaining, duration);
                    this.status.burn.dps = Math.max(this.status.burn.dps, dps);
                } else {
                    this.status.burn = { remaining: duration, dps };
                }
                break;
            }
            case 'chill': {
                const base = this._getEffectiveDefaults('chill');
                const duration = (opts.durationSec != null) ? opts.durationSec : base.durationSec;
                const slowFactor = Math.min(1, Math.max(0, (opts.slowFactor != null) ? opts.slowFactor : base.slowFactor));
                const baseDps = (opts.baseDps != null) ? opts.baseDps : base.baseDps;
                const dpsGrowthPerSec = (opts.dpsGrowthPerSec != null) ? opts.dpsGrowthPerSec : base.dpsGrowthPerSec;
                const freezeThresholdSec = (opts.freezeThresholdSec != null) ? opts.freezeThresholdSec : base.freezeThresholdSec;
                const canFreeze = duration >= freezeThresholdSec;
                const freezeDurationSec = (opts.freezeDurationSec != null) ? opts.freezeDurationSec : base.freezeDurationSec;
                if (this.status.chill) {
                    this.status.chill.remaining = Math.max(this.status.chill.remaining, duration);
                    this.status.chill.slowFactor = Math.min(this.status.chill.slowFactor, slowFactor);
                    this.status.chill.baseDps = Math.max(this.status.chill.baseDps, baseDps);
                    this.status.chill.dpsGrowthPerSec = Math.max(this.status.chill.dpsGrowthPerSec, dpsGrowthPerSec);
                    this.status.chill.freezeThresholdSec = Math.max(this.status.chill.freezeThresholdSec, freezeThresholdSec);
                    this.status.chill.canFreeze = this.status.chill.canFreeze || canFreeze;
                    this.status.chill.freezeDurationSec = Math.max(this.status.chill.freezeDurationSec, freezeDurationSec);
                } else {
                    this.status.chill = {
                        remaining: duration,
                        elapsed: 0,
                        slowFactor,
                        baseDps,
                        dpsGrowthPerSec,
                        canFreeze,
                        freezeThresholdSec,
                        freezeDurationSec
                    };
                }
                break;
            }
            case 'freeze': {
                const base = this._getEffectiveDefaults('freeze');
                const duration = (opts.durationSec != null) ? opts.durationSec : base.durationSec;
                this.status.freeze = { remaining: duration };
                this.status.chill = null; // 凍結中は冷却を無効化
                break;
            }
            case 'bleed': {
                const base = this._getEffectiveDefaults('bleed');
                const duration = (opts.durationSec != null) ? opts.durationSec : base.durationSec;
                const percentPerSec = (opts.percentPerSec != null) ? opts.percentPerSec : base.percentPerSec;
                const minRatio = Math.min(1, Math.max(0, (opts.minRatio != null) ? opts.minRatio : base.minRatio));
                if (this.status.bleed) {
                    this.status.bleed.remaining = Math.max(this.status.bleed.remaining, duration);
                    this.status.bleed.percentPerSec = Math.max(this.status.bleed.percentPerSec, percentPerSec);
                    this.status.bleed.minRatio = Math.min(this.status.bleed.minRatio, minRatio);
                } else {
                    this.status.bleed = { remaining: duration, percentPerSec, minRatio };
                }
                break;
            }
        }
    }

    /**
     * 状態異常の経過処理（毎フレーム呼び出す）
     * @param {number} dtSec - 経過秒
     * @returns {{freezeActive:boolean, bleedKill:boolean, dotDamage:number}}
     */
    updateStatus(dtSec) {
        let dotDamage = 0;
        let bleedKill = false;

        // ステータス演出の簡易CD
        if (this._statusFxCooldown > 0) this._statusFxCooldown = Math.max(0, this._statusFxCooldown - dtSec);

        // 凍結
        if (this.status.freeze) {
            this.status.freeze.remaining -= dtSec;
            if (this.status.freeze.remaining <= 0) {
                this.status.freeze = null;
            }
        }

        // 燃焼（凍結中でも燃える設計にするかはゲームデザイン次第。ここでは凍結中は燃焼無効）
        if (this.status.burn && !this.status.freeze) {
            const dps = this.status.burn.dps;
            const dmg = dps * dtSec;
            dotDamage += dmg;
            this.hp -= dmg;
            this.status.burn.remaining -= dtSec;
            if (this.status.burn.remaining <= 0) this.status.burn = null;
        }

        // 冷却（凍結中は進行しない）
        if (this.status.chill && !this.status.freeze) {
            const s = this.status.chill;
            const dps = s.baseDps + s.elapsed * s.dpsGrowthPerSec; // 時間経過でDPS増
            const dmg = dps * dtSec;
            dotDamage += dmg;
            this.hp -= dmg;
            s.elapsed += dtSec;
            s.remaining -= dtSec;
            if (s.canFreeze && s.elapsed >= s.freezeThresholdSec) {
                // 凍結に移行
                this.status.freeze = { remaining: s.freezeDurationSec };
                this.status.chill = null;
            } else if (s.remaining <= 0) {
                this.status.chill = null;
            }
        }

        // 出血：最大体力を徐々に低下��DoTはなし）
        if (this.status.bleed) {
            const s = this.status.bleed;
            // 基準最大体力に対する線形低下
            const dec = s.percentPerSec * this.baseMaxHp * dtSec;
            const minMax = this.baseMaxHp * s.minRatio;
            this.maxHp = Math.max(minMax, this.maxHp - dec);
            if (this.hp > this.maxHp) this.hp = this.maxHp;
            s.remaining -= dtSec;
            if (this.maxHp <= minMax + 1e-6) {
                // 即死条件
                bleedKill = true;
            }
            if (s.remaining <= 0) this.status.bleed = null;
        }

        return {
            freezeActive: !!this.status.freeze,
            bleedKill,
            dotDamage
        };
    }
}

// ベース定義と倍率（後で強化要素で変更可能）
// 数値は初期チューニング値（10倍スケールと整合）
Enemy.statusBase = {
    burn: { durationSec: 3.0, dps: 4.0 },
    chill: {
        durationSec: 4.0,
        slowFactor: 0.5,
        baseDps: 0.5,
        dpsGrowthPerSec: 0.5,
        freezeBaseSec: 1.5,
        freezePerHp: 0.02,
        freezeDurationSec: 1.5
    },
    freeze: { durationSec: 1.5 },
    bleed: { durationSec: 6.0, percentPerSec: 0.05, minRatio: 0.1 }
};
Enemy.statusTuning = {
    burn: { durationMul: 1, dpsMul: 1 },
    chill: { durationMul: 1, slowFactorMul: 1, baseDpsMul: 1, dpsGrowthMul: 1, freezeBaseSecMul: 1, freezePerHpMul: 1, freezeDurationMul: 1 },
    freeze: { durationMul: 1 },
    bleed: { durationMul: 1, percentPerSecMul: 1, minRatioMul: 1 }
};

export function spawnEnemy(canvas, word, hp) {
    const ENEMY_RADIUS = 5;
    const side = Math.floor(Math.random() * 4); // 0:上, 1:右, 2:下, 3:左
    let x, y;
    switch (side) {
        case 0: x = Math.random() * canvas.width; y = -ENEMY_RADIUS; break;
        case 1: x = canvas.width + ENEMY_RADIUS; y = Math.random() * canvas.height; break;
        case 2: x = Math.random() * canvas.width; y = canvas.height + ENEMY_RADIUS; break;
        case 3: x = -ENEMY_RADIUS; y = Math.random() * canvas.height; break;
    }
    return new Enemy(x, y, word, hp);
}