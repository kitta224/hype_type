// Bulletクラス
export class Bullet {
    constructor(x, y, vx, vy, color = '#A9A9A9') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
    }

    move() {
        this.x += this.vx;
        this.y += this.vy;
    }
}
