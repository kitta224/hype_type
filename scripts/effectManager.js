// エフェクト管理システム
class EffectManager {
    constructor() {
        this.particles = [];
    }

    /**
     * 敵撃破時のエフェクトを生成
     * @param {number} x - エフェクト発生X座標
     * @param {number} y - エフェクト発生Y座標
     * @param {string} color - エフェクトの色
     */
    createEnemyDefeatEffect(x, y, color) {
        
        // 破片エフェクト生成
        this.createFragments(x, y, color);
    }

    /**
     * 破片エフェクトを生成
     * @param {number} x - 発生X座標
     * @param {number} y - 発生Y座標
     * @param {string} color - 破片の色
     */
    createFragments(x, y, color) {
        const fragmentCount = 12; // 破片数を増加
        for (let i = 0; i < fragmentCount; i++) {
            const angle = Math.random() * Math.PI * 2; // ランダムな角度
            const speed = 2 + Math.random() * 4; // 速度を増加
            const size = 4 + Math.random() * 6; // サイズを増加
            const lifetime = 40 + Math.random() * 40; // 生存時間を増加
            const rotationSpeed = (Math.random() - 0.5) * 0.2; // 回転速度
            
            // より多様な破片タイプ
            const fragmentTypes = ['square', 'triangle', 'circle', 'diamond', 'star'];
            const type = fragmentTypes[Math.floor(Math.random() * fragmentTypes.length)];
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                color: color,
                lifetime: lifetime,
                type: type,
                rotation: Math.random() * Math.PI * 2, // 初期回転角度
                rotationSpeed: rotationSpeed,
                alpha: 1.0
            });
        }
    }

    /**
     * エフェクトを更新
     */
    update() {
        this.particles = this.particles.filter(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.lifetime--;
            
            // 透明度を時間とともに減少
            if (particle.lifetime < 20) {
                particle.alpha = particle.lifetime / 20;
            }
            
            return particle.lifetime > 0;
        });
    }

    /**
     * エフェクトを描画
     * @param {CanvasRenderingContext2D} ctx - キャンバスコンテキスト
     */
    draw(ctx) {
        this.particles.forEach(particle => {
            ctx.save();
            
            // 透明度を時間とともに減少
            const alpha = Math.min(1.0, particle.lifetime / 40) * particle.alpha;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = particle.color;
            
            // 回転と位置の変換
            ctx.translate(particle.x, particle.y);
            particle.rotation += particle.rotationSpeed;
            ctx.rotate(particle.rotation);
            
            // 破片タイプに応じた描画
            switch (particle.type) {
                case 'square':
                    ctx.fillRect(
                        -particle.size / 2,
                        -particle.size / 2,
                        particle.size,
                        particle.size
                    );
                    break;
                
                case 'triangle':
                    ctx.beginPath();
                    ctx.moveTo(0, -particle.size / 2);
                    ctx.lineTo(-particle.size / 2, particle.size / 2);
                    ctx.lineTo(particle.size / 2, particle.size / 2);
                    ctx.closePath();
                    ctx.fill();
                    break;
                
                case 'circle':
                    ctx.beginPath();
                    ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                
                case 'diamond':
                    ctx.beginPath();
                    ctx.moveTo(0, -particle.size / 2);
                    ctx.lineTo(particle.size / 2, 0);
                    ctx.lineTo(0, particle.size / 2);
                    ctx.lineTo(-particle.size / 2, 0);
                    ctx.closePath();
                    ctx.fill();
                    break;
                
                case 'star':
                    ctx.beginPath();
                    for (let i = 0; i < 5; i++) {
                        const angle = i * Math.PI * 0.4;
                        const radius = particle.size / 2;
                        ctx.lineTo(
                            Math.cos(angle) * radius,
                            Math.sin(angle) * radius
                        );
                    }
                    ctx.closePath();
                    ctx.fill();
                    break;
            }
            
            ctx.restore();
        });
    }
}

// エフェクト管理
const effectManager = new EffectManager();  
export default effectManager;