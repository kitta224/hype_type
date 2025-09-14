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
     * @param {string} [fragmentType] - 破片タイプ指定（オプション）
     * @param {string} [enemyShape] - 敵の形状に基づくパーティクル生成（オプション）
     */
    createEnemyDefeatEffect(x, y, color, fragmentType, enemyShape) {
        
        // 破片エフェクト生成
        this.createFragments(x, y, color, fragmentType, enemyShape);
    }

    /**
     * 破片エフェクトを生成
     * @param {number} x - 発生X座標
     * @param {number} y - 発生Y座標
     * @param {string} color - 破片の色
     * @param {string} [fragmentType] - 破片タイプ指定（オプション）
     * @param {string} [enemyShape] - 敵の形状に基づくパーティクル生成（オプション）
     */
    createFragments(x, y, color, fragmentType, enemyShape) {
        const fragmentCount = 12; // 破片数を増加
        
        // 敵の形状に基づいて破片タイプを決定
        let effectiveFragmentType = fragmentType;
        if (!effectiveFragmentType && enemyShape) {
            switch (enemyShape.toLowerCase()) {
                case 'circle':
                    effectiveFragmentType = 'circle';
                    break;
                case 'square':
                    effectiveFragmentType = 'square';
                    break;
                case 'triangle':
                    effectiveFragmentType = 'triangle';
                    break;
                default:
                    effectiveFragmentType = null;
            }
        }
        
        // 利用可能な破片タイプ
        const fragmentTypes = ['square', 'triangle', 'circle', 'diamond', 'star'];
        
        for (let i = 0; i < fragmentCount; i++) {
            const angle = Math.random() * Math.PI * 2; // ランダムな角度
            const speed = 1 + Math.random() * 2; // 速度を増加
            const size = 2 + Math.random() * 3; // サイズを増加
            const lifetime = 40 + Math.random() * 20; // 生存時間を増加
            const rotationSpeed = (Math.random() - 0.5) * 0.2; // 回転速度
            
            // 破片タイプを決定
            let type;
            if (effectiveFragmentType && fragmentTypes.includes(effectiveFragmentType)) {
                type = effectiveFragmentType;
            } else {
                type = fragmentTypes[Math.floor(Math.random() * fragmentTypes.length)];
            }
            
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
     * ダメージ表示エフェクトを生成
     * @param {number} x - 発生X座標
     * @param {number} y - 発生Y座標
     * @param {number} damage - 表示するダメージ値
     * @param {string} [color] - テキストの色（オプション）
     */
    createDamageEffect(x, y, damage, color = '#ff4444') {
        this.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 0.5, // わずかな横方向の動き
            vy: -2.5, // 上方向に移動
            size: 16, // フォントサイズ
            color: color,
            lifetime: 45, // 表示時間
            type: 'damage', // ダメージ表示タイプ
            damageValue: damage, // ダメージ値
            alpha: 1.0,
            rotation: 0,
            rotationSpeed: 0
        });
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
            // ダメージ表示タイプの場合は専用の描画メソッドを呼び出す
            if (particle.type === 'damage') {
                this.drawDamageText(ctx, particle);
                return;
            }
            
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

    /**
     * ダメージテキストを描画
     * @param {CanvasRenderingContext2D} ctx - キャンバスコンテキスト
     * @param {Object} particle - パーティクルデータ
     */
    drawDamageText(ctx, particle) {
        ctx.save();
        
        // 透明度設定
        ctx.globalAlpha = particle.alpha;
        
        // フォント設定
        ctx.font = `bold ${particle.size}px Arial`;
        ctx.fillStyle = particle.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 影を追加して視認性向上
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        // ダメージ値を描画
        ctx.fillText(particle.damageValue.toString(), particle.x, particle.y);
        
        // 影をリセット
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        ctx.restore();
    }
}

// エフェクト管理
const effectManager = new EffectManager();  
export default effectManager;