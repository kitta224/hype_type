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
}
