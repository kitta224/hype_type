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

    /**
     * 状態異常を付与/更新する
     * @param {('burn'|'chill'|'freeze'|'bleed')} type
     * @param {Object} [opts]
     */
    applyStatus(type, opts = {}) {
        switch (type) {
            case 'burn': {
                const duration = opts.durationSec ?? 3.0;
                const dps = opts.dps ?? 4.0; // 強い継続ダメージ
                // 既存より強い/長い場合は上書き、そうでなければ延長
                if (this.status.burn) {
                    this.status.burn.remaining = Math.max(this.status.burn.remaining, duration);
                    this.status.burn.dps = Math.max(this.status.burn.dps, dps);
                } else {
                    this.status.burn = { remaining: duration, dps };
                }
                break;
            }
            case 'chill': {
                const duration = opts.durationSec ?? 4.0;
                const slowFactor = Math.min(1, Math.max(0, opts.slowFactor ?? 0.5)); // 0..1
                const baseDps = opts.baseDps ?? 1; // 弱い継続ダメージ
                const dpsGrowthPerSec = opts.dpsGrowthPerSec ?? 0.5; // 経過時間で増加
                const freezeThresholdSec = (opts.freezeThresholdSec != null)
                    ? opts.freezeThresholdSec
                    : Math.max(0, 1.5 + 0.5 * this.baseMaxHp); // HP比例の基準時間（例）
                const canFreeze = duration >= freezeThresholdSec; // 指定継続が閾値未満なら凍結移行なし
                const freezeDurationSec = opts.freezeDurationSec ?? 1.5;
                if (this.status.chill) {
                    // 延長/上書き
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
                const duration = opts.durationSec ?? 5.0;
                this.status.freeze = { remaining: duration };
                // 凍結中は冷却を無効化
                this.status.chill = null;
                break;
            }
            case 'bleed': {
                const duration = opts.durationSec ?? 6.0;
                const percentPerSec = opts.percentPerSec ?? 0.05; // 1秒あたり基準Maxの5%低下
                const minRatio = Math.min(1, Math.max(0, opts.minRatio ?? 0.1)); // スポーン時の10%まで
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