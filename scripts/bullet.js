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
    }

    move() {
        this.x += this.vx;
        this.y += this.vy;
    }

    checkEnemyCollision(enemyX, enemyY, bulletRadius, enemyRadius) {
        const dist = Math.sqrt(Math.pow(this.x - enemyX, 2) + Math.pow(this.y - enemyY, 2));
        return dist < bulletRadius + enemyRadius;
    }
}