// Bulletクラス
export class Bullet {
    // damage: damage value (scaled by 10 system). default 10 for compatibility
    constructor(x, y, vx, vy, damage = 10, color = '#A9A9A9') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.damage = damage;
        this.color = color;

        // 拡張プロパティ（WeaponSystemから設定される）
        this.lifeTimeMs = 2000; // デフォルト生存時間
        this.pierceCount = 0;
        this.chainCount = 0;
        this.chainRange = 120;
        this.splitCount = 0;
        this.splitAngleDeg = 30;
        this.aoeRadius = 0;
        this.homing = { enabled: false, turnRateDegPerSec: 0 };
        this.ricochetCount = 0; // 跳ね返り回数
        this.statusOnHit = []; // ヒット時のステータス効果
    }

    move() {
        this.x += this.vx;
        this.y += this.vy;
    }

    checkEnemyCollision(enemyX, enemyY, bulletRadius, enemyRadius) {
        const dist = Math.sqrt(Math.pow(this.x - enemyX, 2) + Math.pow(this.y - enemyY, 2));
        return dist < bulletRadius + enemyRadius;
    }

    // 壁との衝突判定と跳ね返り処理
    checkWallCollisionAndRicochet(canvasWidth, canvasHeight) {
        let ricochetHappened = false;

        // 左壁との衝突
        if (this.x <= 0) {
            this.x = 0;
            this.vx = Math.abs(this.vx); // 右向きに反射
            ricochetHappened = this.handleRicochet();
        }
        // 右壁との衝突
        else if (this.x >= canvasWidth) {
            this.x = canvasWidth;
            this.vx = -Math.abs(this.vx); // 左向きに反射
            ricochetHappened = this.handleRicochet();
        }

        // 上壁との衝突
        if (this.y <= 0) {
            this.y = 0;
            this.vy = Math.abs(this.vy); // 下向きに反射
            ricochetHappened = this.handleRicochet();
        }
        // 下壁との衝突
        else if (this.y >= canvasHeight) {
            this.y = canvasHeight;
            this.vy = -Math.abs(this.vy); // 上向きに反射
            ricochetHappened = this.handleRicochet();
        }

        return ricochetHappened;
    }

    // 跳ね返り処理
    handleRicochet() {
        if (this.ricochetCount > 0) {
            this.ricochetCount--;
            // 跳ね返り時の視覚効果（色変更など）
            this.color = '#FFD700'; // 跳ね返り時は金色に
            return true; // 跳ね返りが発生した
        } else {
            return false; // 跳ね返り回数が尽きた
        }
    }

    // 生存時間チェック
    checkLifetime(currentTime) {
        if (this.createdTime === undefined) {
            this.createdTime = currentTime;
        }
        return currentTime - this.createdTime >= this.lifeTimeMs;
    }
}