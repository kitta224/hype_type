/**
 * タイピング入力処理システム
 * 各敵ごとの入力進行度を管理し、最寄りのマッチする敵をターゲットとする
 */
class TypeSystem {
    constructor() {
        this.inputEnabled = true;
    }

    /**
     * プレフィックスにマッチする敵を検索
     * @param {string} prefix - 入力プレフィックス
     * @param {Array} enemies - 敵オブジェクトの配列
     * @returns {Array} マッチした敵の配列
     */
    findMatchingEnemiesByPrefix(prefix, enemies) {
        if (!prefix) return [];
        const p = prefix.toLowerCase();
        return enemies.filter(enemy => enemy.word.toLowerCase().startsWith(p));
    }

    /**
     * プレイヤーからの距離を計算
     * @param {Object} enemy - 敵オブジェクト
     * @param {Object} player - プレイヤーオブジェクト
     * @returns {number} 距離
     */
    distanceToPlayer(enemy, player) {
        return Math.hypot(player.x - enemy.x, player.y - enemy.y);
    }

    /**
     * 最も近い敵を検索
     * @param {Array} list - 敵オブジェクトの配列
     * @param {Object} player - プレイヤーオブジェクト
     * @returns {Object|null} 最も近い敵オブジェクト
     */
    nearestEnemy(list, player) {
        if (!list || list.length === 0) return null;
        let nearest = list[0];
        let best = this.distanceToPlayer(nearest, player);
        for (let i = 1; i < list.length; i++) {
            const d = this.distanceToPlayer(list[i], player);
            if (d < best) {
                best = d;
                nearest = list[i];
            }
        }
        return nearest;
    }

    /**
     * 全ての敵の入力進行度をリセット
     * @param {Array} enemies - 敵オブジェクトの配列
     */
    resetAllEnemyProgress(enemies) {
        enemies.forEach(enemy => {
            enemy.typed = '';
        });
    }
}

export default TypeSystem;