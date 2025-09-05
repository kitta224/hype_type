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
    }

    moveTowards(targetX, targetY, speed = 0.25) {
        const angle = Math.atan2(targetY - this.y, targetX - this.x);
        this.x += Math.cos(angle) * speed;
        this.y += Math.sin(angle) * speed;
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
