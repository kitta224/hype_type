// 必要なモジュールのインポート
import { Enemy, spawnEnemy as spawnEnemyModule } from './enemy.js'; // 敵クラスと生成関数
import { Bullet } from './bullet.js'; // 弾クラス
import { loadWordLists, getCurrentWordList } from './wordManager.js'; // 単語リスト管理
import wave from './wave.js'; // ウェーブ管理システム
import TypeSystem from './typesys.js'; // タイピング入力システム
import se from './se.js'; // 効果音管理
import BGMManager from './bgmManager.js'; // BGM管理
import effectManager from './effectManager.js'; // エフェクト管理
import './debug.js';
/**
 * テーマを初期化する関数
 * @param {boolean} isDark - ダークテーマかどうか
 */
function setTheme(isDark) {
    if (isDark) {
        document.body.classList.add('dark-theme');
    } else {
        document.body.classList.remove('dark-theme');
    }
    // テーマ変更時にキャンバス内の色を再適用
    applyCanvasColors();
}

/**
 * Canvas用のテーマ色を取得
 * @returns {Object} 各種色設定を含むオブジェクト
 */
function getCanvasColors() {
    const cs = getComputedStyle(document.body);
    const accent = (cs.getPropertyValue('--accent') || '#ff9800').trim();
    const canvasBg = (cs.getPropertyValue('--canvas-bg') || '#e0e0e0').trim();
    const textMain = (cs.getPropertyValue('--text-main') || '#333').trim();
    const textSub = (cs.getPropertyValue('--text-sub') || '#555').trim();

    // 指定されたルールに従う色
    const isDark = document.body.classList.contains('dark-theme');
    return {
        // ライト時は赤系、ダーク時は暗めのオレンジ（CSSの --accent があればそれを優先）
        enemy: isDark ? (accent || '#cc7000') : '#a2565f',
        // 敵の上の文字はダーク時は白、ライト時は黒
        enemyText: isDark ? '#ffffff' : '#000000',
        // 自機はダーク時に白、ライト時は従来のグレー
        player: isDark ? '#ffffff' : '#666666',
        hpText: textMain,
        bullet: '#A9A9A9',
        canvasBg: canvasBg
    };
}

/**
 * Canvas内の既存オブジェクトにテーマ色を適用
 */
function applyCanvasColors() {
    const colors = getCanvasColors();
    // プレイヤー
    player.color = colors.player;
    // 敵
    enemies.forEach(e => e.color = colors.enemy);
    // 弾
    bullets.forEach(b => b.color = colors.bullet);
}

// テーマ要素の初期化はDOMが準備されてから行う
// ユーザー設定をlocalStorageに保存するキー


const THEME_KEY = 'hype_type_theme'; // 保存キー: 'dark' | 'light' | 'system' のいずれか

function applyThemeFromPreference(pref) {
    if (pref === 'dark') return setTheme(true);
    if (pref === 'light') return setTheme(false);
    // system
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return setTheme(prefersDark);
}

// DOM準備時に要素を取得し、初期状態・イベントを設定
window.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const saved = localStorage.getItem(THEME_KEY) || 'system';

    // システムの変化を監視（systemモード時のみ使用）
    let mq = null;
    function mqHandler(e) {
        const currentPref = localStorage.getItem(THEME_KEY) || 'system';
        if (currentPref === 'system') {
            setTheme(e.matches);
            if (themeToggle) themeToggle.checked = e.matches;
        }
    }

    if (window.matchMedia) {
        mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener ? mq.addEventListener('change', mqHandler) : mq.addListener(mqHandler);
    }

    // 初期反映
    applyThemeFromPreference(saved);
    if (themeToggle) {
        // checkbox は現在の実際の表示状態に合わせておく
        themeToggle.checked = document.body.classList.contains('dark-theme');

        // ユーザー操作で明示的に切り替える場合はlocalStorageに保存
        themeToggle.addEventListener('change', (e) => {
            const isDark = !!e.target.checked;
            setTheme(isDark);
            // 明示的な指定に切り替える
            localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
        });
    }
});

// ページ読み込み後に、もしユーザーが 'system' にしていてシステム設定がdarkならcheckboxの状態を合わせる
window.addEventListener('load', () => {
    const themeToggle = document.getElementById('themeToggle');
    const saved = localStorage.getItem(THEME_KEY) || 'system';
    if (themeToggle && saved === 'system' && window.matchMedia) {
        themeToggle.checked = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
});

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
const PLAYER_RADIUS = 15;
const ENEMY_RADIUS = 5;
const BULLET_RADIUS = 5;
const PLAYER_MAX_HP = 100;
const ENEMY_MAX_HP = 30; // 初期値（10倍スケール）：3 -> 30
const BULLET_SPEED = 10;
const ENEMY_SPAWN_INTERVAL = 2000; // 敵の出現間隔 (ms)
let inputEnabled = true; // キーボード入力の有効/無効を制御
let gamePaused = false; // ゲームの一時停止状態

// ポーズメニューの表示/非表示を更新
function updatePauseMenu() {
    if (gamePaused) {
        pauseMenu.style.display = 'flex';
    } else {
        pauseMenu.style.display = 'none';
    }
}

// プレイヤー
let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    hp: PLAYER_MAX_HP,
    color: '#666' /* プレイヤーの色をグレーに */
};
// プレイヤーの攻撃力（10 が基準、弾の damage は attackPower）
player.attackPower = 10;



// 敵
let enemies = [];

// 弾
let bullets = [];

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
    const enemy = spawnEnemyModule(canvas, word, hpForWave);
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
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, ENEMY_RADIUS * 0.7, 0, Math.PI * 2); // サイズ縮小
        ctx.fillStyle = enemy.color || colors.enemy; // 敵はアクセント色
        ctx.fill();
        // 単語表示（白）
        ctx.fillStyle = colors.enemyText;
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.9;
        ctx.fillText(enemy.displayWord || enemy.word, enemy.x, enemy.y - ENEMY_RADIUS - 5);
        ctx.globalAlpha = 1.0;
        // HPバー描画（敵の下に小さく表示）
        if (typeof enemy.hp === 'number' && typeof enemy.maxHp === 'number') {
            const hpRatio = Math.max(0, enemy.hp) / Math.max(1, enemy.maxHp);
            // 満タン時は非表示
            if (hpRatio < 1) {
                const barFullWidth = 36; // 基準幅
                const barHeight = 2; // さらに細く
                const displayWidth = barFullWidth * hpRatio;
                const x = enemy.x - displayWidth / 2;
                const y = enemy.y + ENEMY_RADIUS + 6; // 敵の下に移動
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
    });

    // ウェーブ情報表示（上部中央）
    const waveNum = (wave && typeof wave.getCurrentWave === 'function') ? wave.getCurrentWave() : 1;
    const kills = (wave && typeof wave.getKillsThisWave === 'function') ? wave.getKillsThisWave() : 0;
    const need = (wave && typeof wave.getKillsToAdvance === 'function') ? wave.getKillsToAdvance() : 10;
    ctx.fillStyle = colors.hpText;
    ctx.font = '18px Montserrat';
    ctx.textAlign = 'center';
    ctx.fillText(`Wave: ${waveNum}  Kills: ${kills}/${need}`, canvas.width / 2, 28);

    // 弾描画
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, BULLET_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = bullet.color || colors.bullet;
        ctx.fill();
    });

    // HP表示
    ctx.fillStyle = colors.hpText; /* HP表示の色 */
    ctx.font = '16px Montserrat';
    ctx.textAlign = 'center';
    ctx.fillText(uiTexts[currentUiLanguage].hp + player.hp, player.x, player.y + PLAYER_RADIUS + 20);

    // BGM情報表示（右下）
    bgmManager.drawBGMInfo(ctx, canvas);

    // エフェクトの描画
    effectManager.draw(ctx);
}

/**
 * ゲーム状態を更新
 * 敵の出現、移動、衝突判定、弾の移動などを処理
 */
function update() {
    const now = Date.now();

    // エフェクトの更新
    effectManager.update();

    // 敵の出現
    if (now - lastEnemySpawnTime > ENEMY_SPAWN_INTERVAL) {
        spawnEnemyWrapper();
        lastEnemySpawnTime = now;
    }

    // 敵の移動と衝突判定
    enemies.forEach(enemy => {
        enemy.moveTowards(player.x, player.y);
        
        if (enemy.checkPlayerCollision(player.x, player.y, PLAYER_RADIUS, ENEMY_RADIUS)) {
            player.hp -= 10; // ダメージ
            enemies = enemies.filter(e => e !== enemy); // 敵を削除
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
        }
    });

    // 弾の移動と衝突判定
    bullets.forEach(bullet => {
        bullet.move();

        enemies.forEach(enemy => {
            if (bullet.checkEnemyCollision(enemy.x, enemy.y, BULLET_RADIUS, ENEMY_RADIUS)) {
                const dmg = (typeof bullet.damage === 'number') ? bullet.damage : 1;
                enemy.hp -= dmg;

                // ダメージ表示エフェクトを生成
                effectManager.createDamageEffect(enemy.x, enemy.y - 20, dmg, '#ff4444');

                // デバッグ出力
                if (window.hypeType && window.hypeType.debug && window.hypeType.logDamage) {
                    console.log(`[hypeType] ${new Date().toLocaleTimeString()} - Hit: '${enemy.word}' dmg=${dmg} hp_after=${Math.max(0, enemy.hp)} maxHp=${enemy.maxHp}`, { enemy, bullet, playerAttack: player.attackPower });
                }

                bullets = bullets.filter(b => b !== bullet); // 弾を削除
                if (enemy.hp <= 0) {
                    // 敵撃破エフェクトを生成
                    const colors = getCanvasColors();
                    effectManager.createEnemyDefeatEffect(enemy.x, enemy.y, colors.enemy);
                    
                    // 敵撃破効果音を再生
                    se.play('cu1.mp3');
                    
                    enemies = enemies.filter(e => e !== enemy); // 敵を削除
                    usedWords = usedWords.filter(w => w !== enemy.word); // 使用済み単語から削除
                    enemiesDefeated++;
                    score += 10;
                    // wave管理に通知
                    wave.onEnemyDefeated();

                    if (window.hypeType && window.hypeType.debug) {
                        console.log('[hypeType] Enemy defeated:', enemy.word);
                    }
                }
            }
        });
    });

    // 画面外に出た弾を削除
    bullets = bullets.filter(bullet => 
        bullet.x > 0 && bullet.x < canvas.width &&
        bullet.y > 0 && bullet.y < canvas.height
    );
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

function gameLoop(currentTime) {
    if (!lastFrameTime) lastFrameTime = currentTime;
    const deltaTime = currentTime - lastFrameTime;

    if (deltaTime >= frameInterval) {
        if (!gamePaused) {
            update();
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
    const angle = Math.atan2(targetEnemy.y - player.y, targetEnemy.x - player.x);
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            const colors = getCanvasColors();
            const b = new Bullet(
                player.x,
                player.y,
                Math.cos(angle) * BULLET_SPEED,
                Math.sin(angle) * BULLET_SPEED,
                player.attackPower,
                colors.bullet
            );
            // new Bullet signature: (x,y,vx,vy,damage,color)
            b.color = colors.bullet;
            bullets.push(b);

            if (window.hypeType && window.hypeType.debug) {
                console.log(`[hypeType] Fired at '${targetEnemy.word}' damage=${player.attackPower}`, { targetEnemy, bullet: b });
            }
        }, i * 100);
    }
}

// タイピング入力システムの初期化
const typeSystem = new TypeSystem();

document.addEventListener('keydown', (e) => {
    if (!inputEnabled) return;
    
    // ESCキーでゲームの一時停止/再開
    if (e.key === 'Escape') {
        gamePaused = !gamePaused;
        updatePauseMenu();
        return;
    }

    // 判定に使う入力文字を決める
    let ch = null;
    if (e.key === 'Backspace') {
        ch = 'BACKSPACE';
    } else if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
        ch = e.key.toLowerCase();
    }

    // 何もしないキーなら無視
    if (!ch) return;

    if (ch === 'BACKSPACE') {
        // 各敵の進行を1文字分巻き戻す
        enemies.forEach(enemy => {
            if (enemy.typed && enemy.typed > 0) {
                enemy.typed = Math.max(0, enemy.typed - 1);
                enemy.displayWord = enemy.word.slice(enemy.typed);
            } else {
                enemy.typed = 0;
                enemy.displayWord = enemy.word;
            }
        });
        // typedWord（グローバル表示用）はオプションで同期しておく
        typedWord = ''; // グローバルバッファは使わない運用にするためクリア
        return;
    }

    // 通常キー: 各敵について、現在の進行位置の次の文字と比較して進行/リセット
    enemies.forEach(enemy => {
        const word = enemy.word || '';
        const expected = (word[enemy.typed] || '').toLowerCase();
        const inputChar = ('' + ch).toLowerCase();
        if (expected && expected === inputChar) {
            // 正解: 進行
            enemy.typed = (enemy.typed || 0) + 1;
            enemy.displayWord = enemy.word.slice(enemy.typed);
        } else {
            // 不一致: 即リセット
            enemy.typed = 0;
            enemy.displayWord = enemy.word;
        }
    });

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

// イベントリスナー
// UIテキストを現在の言語で更新する関数
function updateUIText() {
    const texts = uiTexts[currentLanguage];
    document.querySelector('h1').textContent = texts.title;
    document.querySelector('h3') && (document.querySelector('h3').textContent = texts.subtitle);
    document.getElementById('languageLabel').textContent = texts.languageLabel;
    // 言語選択肢（英語のみ）
    if (languageSelect && languageSelect.options && languageSelect.options[0]) {
        languageSelect.options[0].text = texts.languageEnglish;
    }
    // 解像度選択肢
    document.getElementById('resolutionLabel').textContent = texts.resolutionLabel;
    document.getElementById('resolutionSelect').options[0].text = texts.Default;
    document.getElementById('resolutionSelect').options[1].text = texts['100p'];
    // テーマ切替
    document.getElementById('themeToggleLabel').textContent = texts.themeToggleLabel;
    // 設定ボタン
    document.getElementById('settingsButton').textContent = texts.settingsButton;
    //
    document.getElementById('muteToggleLabel').textContent = texts.muteToggleLabel;
    // スタートボタン
    document.getElementById('startButton').textContent = texts.startButton;
}

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
});

// ゲーム開始
startButton.addEventListener('click', () => {
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

        // ゲームループが多重起動しないように一度だけ開始
        if (!window._gameLoopRunning) {
            window._gameLoopRunning = true;
            gameLoop();
        }

        // BGM再生開始
        bgmManager.start();
    }
});

// 初期化
loadAndSetWordLists();

// 言語リソース定義
const uiTexts = {
    english: {
    }
};

// locales.jsonからUIテキストを読み込む
fetch('jsons/locales.json')
    .then(response => response.json())
    .then(data => {
        Object.assign(uiTexts.english, data.uiTexts.english);
        updateUIText();
    })
    .catch(error => console.error('Error loading locales:', error));

// ポーズメニューボタンのイベントリスナー
resumeButton.addEventListener('click', () => {
    gamePaused = false;
    updatePauseMenu();
});

menuButton.addEventListener('click', () => {
    gamePaused = false;
    updatePauseMenu();
    // ゲームを停止してスタート画面に戻る
    window._gameLoopRunning = false;
    canvas.style.display = 'none';
    startScreen.style.display = 'block';
    
    // BGMを停止
    bgmManager.stop();
});

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