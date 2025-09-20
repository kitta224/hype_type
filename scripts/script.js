// 必要なモジュールのインポート
import { Enemy, spawnEnemy as spawnEnemyModule } from './enemy.js'; // 敵クラスと生成関数
import { Bullet } from './bullet.js'; // 弾クラス
import { loadWordLists, getCurrentWordList } from './wordManager.js'; // 単語リスト管理
import wave from './wave.js'; // ウェーブ管理システム
import TypeSystem from './typesys.js'; // タイピング入力システム
import se from './se.js'; // 効果音管理
import BGMManager from './bgmManager.js'; // BGM管理
import effectManager from './effectManager.js'; // エフェクト管理
import WeaponSystem from './weaponSystem.js'; // 武器管理
import upgradeUI, { upgradeData, upgradePoints, acquiredUpgrades } from './upgradeUI.js'; // アップグレードUI管理
import { getCanvasColors, applyCanvasColors } from './themeManager.js'; // テーマ管理
import { updatePauseMenu, updateUIText, uiTexts } from './uiManager.js'; // UI管理
import './debug.js';

// アップグレードUI初期化
(async () => {
    await upgradeUI.init();
})();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const languageSelect = document.getElementById('languageSelect');
const resolutionSelect = document.getElementById('resolutionSelect');
const pauseMenu = document.getElementById('pauseMenu');
const resumeButton = document.getElementById('resumeButton');
const menuButton = document.getElementById('menuButton');

// 初期解像度設定
let currentCanvasWidth = window.innerWidth * 0.8;
let currentCanvasHeight = window.innerHeight * 0.8;
canvas.width = currentCanvasWidth;
canvas.height = currentCanvasHeight;

// ゲーム設定
const BASE_CANVAS_WIDTH = 800;
const BASE_CANVAS_HEIGHT = 600;
const BASE_PLAYER_RADIUS = 15;
const BASE_ENEMY_RADIUS = 5;
const BASE_BULLET_RADIUS = 5;
const PLAYER_MAX_HP = 100;
const ENEMY_MAX_HP = 30; // 初期値（10倍スケール）：3 -> 30
// BULLET_SPEEDはWeaponSystemから取得するように変更
function getBulletSpeed() {
    return weapon.getStats().bulletSpeed;
}

// 他のWeaponSystemプロパティも取得する関数
function getWeaponStats() {
    return weapon.getStats();
}

// デバッグ用に現在のWeaponSystemの状態を表示
function logWeaponStats() {
    const stats = getWeaponStats();
    console.log('Current Weapon Stats:', {
        bulletSpeed: stats.bulletSpeed,
        bulletDamage: stats.bulletDamage,
        fireCooldownMs: stats.fireCooldownMs,
        ricochetCount: stats.ricochetCount,
        lifeTimeMs: stats.lifeTimeMs
    });
}

// デバッグコマンドをグローバルに公開
window.hypeType = window.hypeType || {};
window.hypeType.logWeaponStats = logWeaponStats;

// テスト用のアップグレード適用関数
window.hypeType.testUpgrade = function(target, op, value) {
    const stats = getWeaponStats();
    console.log(`Before: ${target} = ${stats[target]}`);

    if (op === 'add') {
        weapon.setBase(target, (weapon.base[target] || 0) + value);
    } else if (op === 'mul') {
        weapon.setMul(target, (weapon.mul[target] || 1) * value);
    }

    const newStats = getWeaponStats();
    console.log(`After: ${target} = ${newStats[target]}`);
};

// コンソールで使用できる便利なコマンドを追加
window.hypeType.cmd = function(command) {
    const args = command.split(' ');
    const cmd = args[0];
    const params = args.slice(1);

    switch (cmd) {
        case 'help':
            console.log('Available commands:');
            console.log('  help - Show this help');
            console.log('  stats - Show current weapon stats');
            console.log('  upgrade <target> <op> <value> - Test upgrade (e.g., "upgrade bulletSpeed mul 1.5")');
            console.log('  reset - Reset all upgrades');
            break;

        case 'stats':
            logWeaponStats();
            break;

        case 'upgrade':
            if (params.length >= 3) {
                const target = params[0];
                const op = params[1];
                const value = parseFloat(params[2]);
                window.hypeType.testUpgrade(target, op, value);
            } else {
                console.log('Usage: upgrade <target> <op> <value>');
                console.log('Example: upgrade bulletSpeed mul 1.5');
            }
            break;

        case 'reset':
            // すべてのアップグレードをリセット
            Object.keys(weapon.base).forEach(key => {
                if (key !== 'bulletDamage' && key !== 'fireCooldownMs' && key !== 'burstCount') {
                    weapon.setBase(key, 0);
                }
            });
            Object.keys(weapon.mul).forEach(key => {
                weapon.setMul(key, 1);
            });
            console.log('All upgrades reset');
            logWeaponStats();
            break;

        default:
            console.log('Unknown command. Type "help" for available commands.');
    }
};

// デバッグ用の説明を表示
console.log('🎮 HypeType Debug Commands Available!');
console.log('Type: hypeType.cmd("help") in console for more info');
const ENEMY_SPAWN_INTERVAL = 2000; // 敵の出現間隔 (ms)
const ENEMY_BASE_SPEED = 0.25; // 敵の基準移動速度（状態異常で変化）
let inputEnabled = true; // キーボード入力の有効/無効を制御
window.gamePaused = false; // ゲームの一時停止状態

// 解像度に応じたスケーリング
let canvasScale = 1;
let PLAYER_RADIUS = BASE_PLAYER_RADIUS;
let ENEMY_RADIUS = BASE_ENEMY_RADIUS;
let BULLET_RADIUS = BASE_BULLET_RADIUS;


// プレイヤー
let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    hp: PLAYER_MAX_HP,
    color: '#666' /* プレイヤーの色をグレーに */
};
// プレイヤーの攻撃力（10 が基準、弾の damage は attackPower）
player.attackPower = 10;

// 武器管理（プレイヤーの発射特性）
const weapon = new WeaponSystem();
// expose for console-based tweaking
window.hypeType = window.hypeType || {};
window.hypeType.weapon = weapon;



// 敵
let enemies = [];

// 弾
let bullets = [];

// Debug: expose game accessors for debug.js utilities
if (window.hypeType && typeof window.hypeType.__setGameAccess === 'function') {
    window.hypeType.__setGameAccess({
        getEnemies: () => enemies,
        getPlayer: () => player,
    });
}

// 単語リスト管理
let wordLists = {};
let currentLanguage = 'english'; // タイプ言語
let currentUiLanguage = 'english'; // 表示言語（日本語UIは一時無効化）

let currentWordList = [];
let score = 0;
let enemiesDefeated = 0;
let usedWords = [];

// ゲームの状態
let currentWord = '';
let typedWord = '';
let lastEnemySpawnTime = 0;

// BGM管理
const bgmManager = new BGMManager();

// 単語リストを読み込む
async function loadAndSetWordLists() {
    wordLists = await loadWordLists();
    updateCurrentWordList();
}


function updateCurrentWordList() {
    // 波の許容難易度に基づいて現在の単語プールを生成
    const allowed = wave.getAllowedDifficulties();
    // 許可された難易度の単語をマージする（順序を維持する）
    currentWordList = [];
    if (wordLists.languages && wordLists.languages[currentLanguage]) {
        const diffs = wordLists.languages[currentLanguage].difficultyLevels || {};
        allowed.forEach(d => {
            const data = diffs[d];
            if (data && Array.isArray(data.words)) {
                currentWordList.push(...data.words);
            }
        });
    }
}



/**
 * 敵を生成するラッパー関数
 * 単語リストからランダムに単語を選び、敵を生成
 */
function spawnEnemyWrapper() {
    if (currentWordList.length === 0) {
        console.warn('単語リストが空です');
        return;
    }
    let availableWords = currentWordList.filter(word => !usedWords.includes(word));
    if (availableWords.length === 0) {
        usedWords = [];
        availableWords = currentWordList;
    }
    const word = availableWords[Math.floor(Math.random() * availableWords.length)];
    usedWords.push(word);
    // HP は wave システムに従って算出
    const hpForWave = wave.getEnemyHPForWave(ENEMY_MAX_HP);
    // デフォルト値を10倍にしたため、そのまま渡す
    const enemy = spawnEnemyModule(canvas, word, hpForWave, ENEMY_RADIUS);
    enemy.maxHp = hpForWave;
    // テーマの色を適用
    const colors = getCanvasColors();
    enemy.color = colors.enemy;
    enemy.displayColor = colors.enemy; // 予備
    enemies.push(enemy);
}

/**
 * ゲーム画面を描画
 * 背景、プレイヤー、敵、弾、UIなどを描画
 */
function draw() {
    // 背景
    const colors = getCanvasColors();
    ctx.fillStyle = colors.canvasBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // プレイヤー描画（白い輪郭）
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = colors.player;
    ctx.lineWidth = 4;
    ctx.stroke();
    // 塗りつぶしなし

    // 敵描画
    enemies.forEach(enemy => {
        // 状態エフェクトのアタッチ更新
        if (enemy.status) {
            if (enemy.status.burn) effectManager.attachStatus(enemy, 'burn'); else effectManager.detachStatus(enemy, 'burn');
            if (enemy.status.chill) effectManager.attachStatus(enemy, 'chill'); else effectManager.detachStatus(enemy, 'chill');
            if (enemy.status.freeze) effectManager.attachStatus(enemy, 'freeze'); else effectManager.detachStatus(enemy, 'freeze');
            if (enemy.status.bleed) effectManager.attachStatus(enemy, 'bleed'); else effectManager.detachStatus(enemy, 'bleed');
        }
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius * 0.7, 0, Math.PI * 2); // サイズ縮小
        ctx.fillStyle = enemy.color || colors.enemy; // 敵はアクセント色
        ctx.fill();
        // 単語表示（白）
        ctx.fillStyle = colors.enemyText;
        ctx.font = `${16 * canvasScale}px Arial`;
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.9;
        ctx.fillText(enemy.displayWord || enemy.word, enemy.x, enemy.y - enemy.radius - 5 * canvasScale);
        ctx.globalAlpha = 1.0;
        // HPバー描画（敵の下に小さく表示）
        if (typeof enemy.hp === 'number' && typeof enemy.maxHp === 'number') {
            const hpRatio = Math.max(0, enemy.hp) / Math.max(1, enemy.maxHp);
            // 満タン時は非表示
            if (hpRatio < 1) {
                const barFullWidth = 36 * canvasScale; // 基準幅
                const barHeight = 2 * canvasScale; // さらに細く
                const displayWidth = barFullWidth * hpRatio;
                const x = enemy.x - displayWidth / 2;
                const y = enemy.y + enemy.radius + 6 * canvasScale; // 敵の下に移動
                ctx.globalAlpha = 0.95;
                ctx.fillStyle = colors.enemyText;
                // 角丸長方形を描く
                const radius = barHeight / 2;
                ctx.beginPath();
                ctx.moveTo(x + radius, y);
                ctx.lineTo(x + displayWidth - radius, y);
                ctx.quadraticCurveTo(x + displayWidth, y, x + displayWidth, y + radius);
                ctx.lineTo(x + displayWidth, y + barHeight - radius);
                ctx.quadraticCurveTo(x + displayWidth, y + barHeight, x + displayWidth - radius, y + barHeight);
                ctx.lineTo(x + radius, y + barHeight);
                ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - radius);
                ctx.lineTo(x, y + radius);
                ctx.quadraticCurveTo(x, y, x + radius, y);
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }
        }
        // 状態エフェクトの描画
        effectManager.drawStatusAttachments(ctx, enemy);
    });

    // ウェーブ情報表示（上部中央）
    const waveNum = (wave && typeof wave.getCurrentWave === 'function') ? wave.getCurrentWave() : 1;
    const kills = (wave && typeof wave.getKillsThisWave === 'function') ? wave.getKillsThisWave() : 0;
    const need = (wave && typeof wave.getKillsToAdvance === 'function') ? wave.getKillsToAdvance() : 10;
    ctx.fillStyle = colors.hpText;
    ctx.font = `${18 * canvasScale}px Montserrat`;
    ctx.textAlign = 'center';
    ctx.fillText(`Wave: ${waveNum}  Kills: ${kills}/${need}`, canvas.width / 2, 28 * canvasScale);

    // 弾描画
    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color || colors.bullet;
        ctx.fillRect(
            bullet.x - BULLET_RADIUS / 2,
            bullet.y - BULLET_RADIUS / 2,
            BULLET_RADIUS,
            BULLET_RADIUS
        );
    });

    // HP表示
    ctx.fillStyle = colors.hpText; /* HP表示の色 */
    ctx.font = `${16 * canvasScale}px Montserrat`;
    ctx.textAlign = 'center';
    ctx.fillText(uiTexts[currentUiLanguage].hp + player.hp, player.x, player.y + PLAYER_RADIUS + 20 * canvasScale);

    // BGM情報表示（右下）
    bgmManager.drawBGMInfo(ctx, canvas);

    // FPSカウンター表示（左下）
    ctx.fillStyle = colors.hpText; // テーマに対応した色を使用
    ctx.font = `${12 * canvasScale}px Arial`; // 小さめのフォント
    ctx.textAlign = 'left';
    ctx.fillText(`FPS: ${fpsDisplay}`, 10 * canvasScale, canvas.height - 10 * canvasScale);

    // エフェクトの描画
    effectManager.draw(ctx);
}

/**
 * ゲーム状態を更新
 * 敵の出現、移動、衝突判定、弾の移動などを処理
 */
function update(dtSec) {
    const now = Date.now();

    // エフェクトの更新
    effectManager.update();

    // 敵の出現
    if (now - lastEnemySpawnTime > ENEMY_SPAWN_INTERVAL) {
        spawnEnemyWrapper();
        lastEnemySpawnTime = now;
    }

    // 敵の移動と衝突判定 + 状態異常の経過
    enemies = enemies.filter(enemy => {
        // 状態異常の進行
        let st = { freezeActive: false, bleedKill: false };
        if (typeof enemy.updateStatus === 'function') {
            st = enemy.updateStatus(dtSec || (frameInterval / 1000));
        }

        // 凍結なら停止、冷却なら減速
        let speed = ENEMY_BASE_SPEED;
        if (st.freezeActive) speed = 0;
        else if (enemy.status && enemy.status.chill) speed = ENEMY_BASE_SPEED * enemy.status.chill.slowFactor;

        enemy.moveTowards(player.x, player.y, speed);
        
        if (enemy.checkPlayerCollision(player.x, player.y, PLAYER_RADIUS, enemy.radius)) {
            player.hp -= 10; // ダメージ
            effectManager.clearEnemy(enemy);
            if (player.hp <= 0) {
                alert('Game Over!');
                // ゲームオーバー時の処理
                startScreen.style.display = 'block';
                canvas.style.display = 'none';
                // ゲームの状態をリセット
                player.hp = PLAYER_MAX_HP;
                enemies = [];
                bullets = [];
                currentWord = '';
                typedWord = '';
                lastEnemySpawnTime = 0;
            }
            return false; // 敵を削除
        }

        // DoT/出血による死亡
        if ((st && st.bleedKill) || enemy.hp <= 0) {
            killEnemy(enemy);
            return false;
        }

        return true;
    });

    // 弾の移動と衝突判定
    bullets.forEach(bullet => {
        // 弾の軌跡エフェクトを生成（移動するたびに）
        const colors = getCanvasColors();
        effectManager.createBulletTrailEffect(
            bullet.x,
            bullet.y,
            bullet.vx,
            bullet.vy,
            colors.bullet,
            canvasScale
        );

        bullet.move();

        // 壁との衝突判定と跳ね返り処理
        const ricochetHappened = bullet.checkWallCollisionAndRicochet(canvas.width, canvas.height);

        enemies.forEach(enemy => {
            if (bullet.checkEnemyCollision(enemy.x, enemy.y, BULLET_RADIUS, enemy.radius)) {
                const dmg = (typeof bullet.damage === 'number') ? bullet.damage : 1;
                enemy.hp -= dmg;

                // ダメージ表示エフェクトを生成
                effectManager.createDamageEffect(enemy.x, enemy.y - 20 * canvasScale, dmg, '#ff4444', canvasScale);

                // デバッグ出力
                if (window.hypeType && window.hypeType.debug && window.hypeType.logDamage) {
                    console.log(`[hypeType] ${new Date().toLocaleTimeString()} - Hit: '${enemy.word}' dmg=${dmg} hp_after=${Math.max(0, enemy.hp)} maxHp=${enemy.maxHp}`, { enemy, bullet, playerAttack: player.attackPower });
                }

                bullets = bullets.filter(b => b !== bullet); // 弾を削除
                if (enemy.hp <= 0) {
                    killEnemy(enemy);
                    enemies = enemies.filter(e => e !== enemy); // 敵を削除
                }
            }
        });
    });

    // 画面外に出た弾を削除
    bullets = bullets.filter(bullet =>
        bullet.x > 0 && bullet.x < canvas.width &&
        bullet.y > 0 && bullet.y < canvas.height
    );

    // ricochetCountが0になった弾を削除
    bullets = bullets.filter(bullet => bullet.ricochetCount >= 0);

    // 生存時間が過ぎた弾を削除
    bullets = bullets.filter(bullet => !bullet.checkLifetime(Date.now()));
}

/**
 * ゲームを初期化
 * 言語設定、難易度、解像度などを設定
 * @returns {boolean} 初期化が成功したかどうか
 */
function initializeGame() {
    currentLanguage = languageSelect.value;
    
    enemiesDefeated = 0;
    score = 0;

    // wave 初期化
    wave.init({ startWave: 1 });

    // 解像度設定
    const selectedResolution = resolutionSelect.value;
    if (selectedResolution === 'default') {
        currentCanvasWidth = window.innerWidth * 0.8;
        currentCanvasHeight = window.innerHeight * 0.8;
    } else if (selectedResolution === '100p') {
        currentCanvasWidth = window.innerWidth;
        currentCanvasHeight = window.innerHeight;
    } else {
        const [width, height] = selectedResolution.split('x').map(Number);
        currentCanvasWidth = width;
        currentCanvasHeight = height;
    }
    canvas.width = currentCanvasWidth;
    canvas.height = currentCanvasHeight;

    // 解像度に応じたスケーリング計算
    canvasScale = Math.min(canvas.width / BASE_CANVAS_WIDTH, canvas.height / BASE_CANVAS_HEIGHT);
    PLAYER_RADIUS = BASE_PLAYER_RADIUS * canvasScale;
    ENEMY_RADIUS = BASE_ENEMY_RADIUS * canvasScale;
    BULLET_RADIUS = BASE_BULLET_RADIUS * canvasScale;

    updateCurrentWordList();
    // キャンバスの色を反映
    applyCanvasColors();
    
    if (currentWordList.length === 0) {
        alert('選択された言語または難易度の単語リストが見つかりません。');
        return false;
    }
    
    return true;
}

/**
 * メインゲームループ
 * updateとdrawを繰り返し呼び出す
 */
const FPS = 60;
const frameInterval = 1000 / FPS;
let lastFrameTime = 0;

// FPS測定用変数
let fpsCounter = 0;
let fpsDisplay = 60;
let lastFpsUpdateTime = 0;

/**
 * 敵撃破処理（弾・DoT共通）
 */
function killEnemy(enemy) {
    const colors = getCanvasColors();
    effectManager.createEnemyDefeatEffect(enemy.x, enemy.y, colors.enemy, undefined, undefined, canvasScale);
    effectManager.clearEnemy(enemy);
    se.play('cu1.mp3');
    usedWords = usedWords.filter(w => w !== enemy.word);
    enemiesDefeated++;
    score += 10;
    if (wave && typeof wave.onEnemyDefeated === 'function') wave.onEnemyDefeated();
    if (window.hypeType && window.hypeType.debug) {
        console.log('[hypeType] Enemy defeated:', enemy.word);
    }
}


function gameLoop(currentTime) {
    if (!lastFrameTime) lastFrameTime = currentTime;
    const deltaTime = currentTime - lastFrameTime;
    const dtSec = deltaTime / 1000;

    // FPS測定
    fpsCounter++;
    if (currentTime - lastFpsUpdateTime >= 1000) { // 1秒ごとに更新
        const rawFps = fpsCounter / ((currentTime - lastFpsUpdateTime) / 1000);
        fpsDisplay = parseFloat(rawFps.toFixed(1)); // 小数点第1位まで表示
        fpsCounter = 0;
        lastFpsUpdateTime = currentTime;
    }

    if (deltaTime >= frameInterval) {
        if (!window.gamePaused) {
            update(dtSec);
            draw();
        } else {
            // ポーズ中は描画のみ行う（ゲーム状態は更新しない）
            draw();
        }
        lastFrameTime = currentTime - (deltaTime % frameInterval);
    }
    requestAnimationFrame(gameLoop);
}

/**
 * 敵に対して3連射する攻撃処理
 * @param {Object} targetEnemy - 攻撃対象の敵オブジェクト
 */
function fireBurstAtEnemy(targetEnemy) {
    if (!targetEnemy) return;
    const colors = getCanvasColors();
    weapon.fireAtTarget(
        player,
        targetEnemy,
        (b) => {
            bullets.push(b);
            if (window.hypeType && window.hypeType.debug) {
                console.log(`[hypeType] Fired at '${targetEnemy.word}' damage=${b.damage}`, { targetEnemy, bullet: b });
            }
        },
        colors
    );
}

// タイピング入力システムの初期化
const typeSystem = new TypeSystem();

document.addEventListener('keydown', (e) => {
    if (!inputEnabled) return;

    // Space: open/close upgrade overlay (confirm/close)
    if (e.code === 'Space') {
        e.preventDefault();
        const overlay = document.getElementById('upgradeOverlay');
        if (!overlay) return;
        if (overlay.style.display === 'block') { upgradeUI.closeUpgradeOverlay(); }
        else { upgradeUI.openUpgradeOverlay(); }
        return;
    }

    // Tab: toggle protocols sidebar
    if (e.code === 'Tab') {
        e.preventDefault();
        upgradeUI.toggleProtocols();
        return;
    }
    
    // ESCキー: 強化画面中は再開しない。オーバーレイを閉じるのみ。
    if (e.key === 'Escape' && !e.repeat) {
        const overlay = document.getElementById('upgradeOverlay');
        if (overlay && overlay.style.display === 'block') {
            upgradeUI.closeUpgradeOverlay();
        } else {
            window.gamePaused = !window.gamePaused;
            updatePauseMenu();
            if (window.gamePaused) {
                bgmManager.pause();
                se.play('info.mp3');
            } else {
                bgmManager.resume();
            }
        }
        return;
    }

    // 判定に使う入力文字を決める
    let ch = null;
    if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
        ch = e.key.toLowerCase();
    }

    // 何もしないキーなら無視
    if (!ch) return;

    // 通常キー: 各敵について、現在の進行位置の次の文字と比較して進行/リセット
    let hasCorrectInput = false;
    let hasTypo = false;
    enemies.forEach(enemy => {
        const word = enemy.word || '';
        const expected = (word[enemy.typed] || '').toLowerCase();
        const inputChar = ('' + ch).toLowerCase();
        if (expected && expected === inputChar) {
            // 正解: 進行
            enemy.typed = (enemy.typed || 0) + 1;
            enemy.displayWord = enemy.word.slice(enemy.typed);
            hasCorrectInput = true; // 正解があったことを記録
        } else {
            // 不一致: 即リセット
            enemy.typed = 0;
            enemy.displayWord = enemy.word;
            hasTypo = true; // タイプミスがあったことを記録
        }
    });

    // タイプミスがあり、かつ正解入力がなかった場合にのみ効果音を再生
    if (hasTypo && !hasCorrectInput) {
        se.play('cu3.mp3');
    }

    // 進行が完了した敵を探す（単語長と typed が一致）
    const completed = enemies.filter(enemy => enemy.typed && enemy.typed >= enemy.word.length);
    if (completed.length > 0) {
        // 重複がある場合はプレイヤーからの距離で最寄りを選ぶ
        const target = typeSystem.nearestEnemy(completed, player);
        if (target) {
            fireBurstAtEnemy(target);

            // 単語の再抽選
            let availableWords = currentWordList.filter(word => !usedWords.includes(word));
            if (availableWords.length === 0) {
                usedWords = [];
                availableWords = currentWordList;
            }
            const newWord = availableWords[Math.floor(Math.random() * availableWords.length)];
            usedWords.push(newWord);
            target.word = newWord;
            target.typed = 0;
            target.displayWord = newWord;
        }

        // 他の敵は進行を維持しない（仕様に合わせてリセットする）
        enemies.forEach(enemy => {
            if (enemy !== target) {
                enemy.typed = 0;
                enemy.displayWord = enemy.word;
            }
        });
    }

    // グローバル表示用バッファは使用しないが、便宜上空にしておく
    typedWord = '';
});


// 言語切替時にUI更新

languageSelect.addEventListener('change', () => {
    currentLanguage = languageSelect.value;
    updateCurrentWordList();
});

// 初期表示時にもUI更新
window.addEventListener('DOMContentLoaded', () => {
    // セレクトボックス初期値反映
    languageSelect.value = currentLanguage;
    updateUIText();

    // メニューのホバー状態保存
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        const label = item.querySelector('.menu-label');
        const submenu = item.querySelector('.submenu');

        if (label && submenu) {
            // ホバーで開く（他のタブを閉じる）
            item.addEventListener('mouseenter', () => {
                // 他のタブのopenクラスを削除
                menuItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('open');
                    }
                });
                item.classList.add('open');
            });

            // クリックでトグル
            label.addEventListener('click', (e) => {
                e.preventDefault();
                // 他のタブのopenクラスを削除してからトグル
                menuItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('open');
                    }
                });
                item.classList.toggle('open');
            });
        }
    });
});

// ゲーム開始
startButton.addEventListener('click', startGame);

// エンターキーでクイックスタート
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && startScreen.style.display !== 'none') {
        startGame();
    }
});

function startGame() {
    if (initializeGame()) {
        startScreen.style.display = 'none';
        canvas.style.display = 'block';

        player.x = currentCanvasWidth / 2;
        player.y = currentCanvasHeight / 2;

        // 状態リセット
        enemies = [];
        bullets = [];
        typedWord = '';
        currentWord = '';
        lastEnemySpawnTime = Date.now();
        usedWords = [];
        inputEnabled = true;

        // FPSカウンター初期化
        fpsCounter = 0;
        fpsDisplay = 60;
        lastFpsUpdateTime = Date.now();

        // ゲームループが多重起動しないように一度だけ開始
        if (!window._gameLoopRunning) {
            window._gameLoopRunning = true;
            gameLoop();
        }

        // BGM再生開始
        bgmManager.start();

        // アップグレードUI構築（自動オープンはしない）
        upgradeUI.buildUpgradeUI();

        // ウェーブ統合設定
        upgradeUI.setupWaveIntegration(wave);

        // ゲーム開始時に初期ポイントを与える
        upgradeUI.setInitialPoints(2);
    }
}

// 初期化
loadAndSetWordLists();


// ===== Debug Utilities: apply status effects from console =====
window.hypeType = window.hypeType || {};
(function exposeStatusDebug() {
    const allowed = new Set(['burn', 'chill', 'freeze', 'bleed']);
    function withDefaults(type, opts) {
        const o = Object.assign({}, opts || {});
        switch (type) {
            case 'burn':
                if (o.durationSec == null) o.durationSec = 3.0;
                if (o.dps == null) o.dps = 4.0;
                break;
            case 'chill':
                if (o.durationSec == null) o.durationSec = 4.0;
                if (o.slowFactor == null) o.slowFactor = 0.5;
                if (o.baseDps == null) o.baseDps = 0.5;
                if (o.dpsGrowthPerSec == null) o.dpsGrowthPerSec = 0.5;
                break;
            case 'freeze':
                if (o.durationSec == null) o.durationSec = 1.5;
                break;
            case 'bleed':
                if (o.durationSec == null) o.durationSec = 6.0;
                if (o.percentPerSec == null) o.percentPerSec = 0.05;
                if (o.minRatio == null) o.minRatio = 0.1;
                break;
        }
        return o;
    }

    function nearestEnemy() {
        if (!enemies.length) return null;
        let best = null, bd = Infinity;
        for (const e of enemies) {
            const dx = e.x - player.x, dy = e.y - player.y;
            const d = dx*dx + dy*dy;
            if (d < bd) { bd = d; best = e; }
        }
        return best;
    }

    function applyToEnemy(enemy, type, opts) {
        if (!enemy || typeof enemy.applyStatus !== 'function') return false;
        if (!allowed.has(type)) {
            console.warn('[hypeType] Unknown status type:', type);
            return false;
        }
        enemy.applyStatus(type, withDefaults(type, opts));
        if (window.hypeType && window.hypeType.debug) {
            console.log('[hypeType] applied', type, 'to', enemy.word, enemy);
        }
        return true;
    }

    window.hypeType.applyStatusToNearest = function(type, opts) {
        const e = nearestEnemy();
        if (!e) return console.warn('[hypeType] no enemies');
        return applyToEnemy(e, type, opts);
    };

    window.hypeType.applyStatusToIndex = function(index, type, opts) {
        const e = enemies[index | 0];
        if (!e) return console.warn('[hypeType] enemy index not found:', index);
        return applyToEnemy(e, type, opts);
    };

    window.hypeType.applyStatusToAll = function(type, opts) {
        if (!enemies.length) return console.warn('[hypeType] no enemies');
        let c = 0;
        enemies.forEach(e => { c += applyToEnemy(e, type, opts) ? 1 : 0; });
        console.log(`[hypeType] applied ${type} to ${c} enemies`);
        return c;
    };

    window.hypeType.listEnemies = function() {
        const list = enemies.map((e, i) => ({ i, word: e.word, hp: Math.round(e.hp), maxHp: Math.round(e.maxHp), x: Math.round(e.x), y: Math.round(e.y), status: e.status }));
        console.table(list);
        return list;
    };
})();