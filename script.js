import { Enemy, spawnEnemy as spawnEnemyModule } from './enemy.js';
import { Bullet } from './bullet.js';
import { loadWordLists, getCurrentWordList } from './wordManager.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const languageSelect = document.getElementById('languageSelect');
const uiLanguageSelect = document.getElementById('uiLanguageSelect');
const difficultySelect = document.getElementById('difficultySelect');
const progressiveDifficulty = document.getElementById('progressiveDifficulty');
const resolutionSelect = document.getElementById('resolutionSelect');

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
const ENEMY_MAX_HP = 3; // 初期値は3回攻撃で倒れる
const BULLET_SPEED = 10;
const ENEMY_SPAWN_INTERVAL = 2000; // 敵の出現間隔 (ms)

// プレイヤー
let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    hp: PLAYER_MAX_HP,
    color: '#666' /* プレイヤーの色をグレーに */
};

// 敵
let enemies = [];

// 弾
let bullets = [];

// 単語リスト管理
let wordLists = {};
let currentLanguage = 'english'; // タイプ言語
let currentUiLanguage = 'japanese'; // 表示言語
let currentDifficulty = 'easy';
let useProgressiveDifficulty = true;
let currentWordList = [];
let score = 0;
let enemiesDefeated = 0;
let usedWords = [];

// ゲームの状態
let currentWord = '';
let typedWord = '';
let lastEnemySpawnTime = 0;
let currentDifficultyLevel = 0;
const difficultyOrder = ['easy', 'medium', 'hard', 'expert'];

// 単語リストを読み込む
// 単語リストを読み込む
async function loadAndSetWordLists() {
    wordLists = await loadWordLists();
    updateCurrentWordList();
}

function updateCurrentWordList() {
    currentWordList = getCurrentWordList(wordLists, currentLanguage, currentDifficulty);
}

// 難易度を上昇させる
function increaseDifficulty() {
    if (!useProgressiveDifficulty) return;
    
    const currentIndex = difficultyOrder.indexOf(currentDifficulty);
    if (currentIndex < difficultyOrder.length - 1) {
        currentDifficulty = difficultyOrder[currentIndex + 1];
        difficultySelect.value = currentDifficulty;
        updateCurrentWordList();
    }
}

// 敵を生成
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
    const enemy = spawnEnemyModule(canvas, word, ENEMY_MAX_HP);
    enemies.push(enemy);
}

// 描画
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // プレイヤー描画
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = player.color;
    ctx.lineWidth = 4;
    ctx.stroke();
    // 塗りつぶしなし

    // 敵描画
    enemies.forEach(enemy => {
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, ENEMY_RADIUS * 0.7, 0, Math.PI * 2); // サイズ縮小
        ctx.fillStyle = '#a2565f'; // 赤色指定
        ctx.fill();
        // 縁取りなし
        // 単語表示
        ctx.fillStyle = 'black';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.7;
        ctx.fillText(enemy.displayWord || enemy.word, enemy.x, enemy.y - ENEMY_RADIUS - 5);
        ctx.globalAlpha = 1.0;
    });

    // 弾描画
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, BULLET_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = bullet.color;
        ctx.fill();
    });

    // HP表示
    ctx.fillStyle = '#666'; /* HP表示の色をグレーに */
    ctx.font = '16px Montserrat';
    ctx.textAlign = 'center';
    ctx.fillText(uiTexts[currentUiLanguage].hp + player.hp, player.x, player.y + PLAYER_RADIUS + 20);
}

// 更新
function update() {
    const now = Date.now();

    // 敵の出現
    if (now - lastEnemySpawnTime > ENEMY_SPAWN_INTERVAL) {
        spawnEnemyWrapper();
        lastEnemySpawnTime = now;
    }

    // 敵の移動 (プレイヤーに向かってくる)
    enemies.forEach(enemy => {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.x += Math.cos(angle) * 0.25; /* 敵の移動速度を低下 */
        enemy.y += Math.sin(angle) * 0.25; /* 敵の移動速度を低下 */

        // 敵とプレイヤーの衝突判定
        const dist = Math.sqrt(Math.pow(player.x - enemy.x, 2) + Math.pow(player.y - enemy.y, 2));
        if (dist < PLAYER_RADIUS + ENEMY_RADIUS) {
            player.hp -= 10; // ダメージ
            enemies = enemies.filter(e => e !== enemy); // 敵を削除
            if (player.hp <= 0) {
                alert('Game Over!');
                // ゲームオーバー時の処理
                // 例: リロードせずにスタート画面に戻る
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
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;

        enemies.forEach(enemy => {
            const dist = Math.sqrt(Math.pow(bullet.x - enemy.x, 2) + Math.pow(bullet.y - enemy.y, 2));
            if (dist < BULLET_RADIUS + ENEMY_RADIUS) {
                enemy.hp--;
                bullets = bullets.filter(b => b !== bullet); // 弾を削除
                if (enemy.hp <= 0) {
                    enemies = enemies.filter(e => e !== enemy); // 敵を削除
                    usedWords = usedWords.filter(w => w !== enemy.word); // 使用済み単語から削除
                    enemiesDefeated++;
                    score += 10;
                    
                    // 一定数の敵を倒したら難易度を上昇
                    if (enemiesDefeated % 10 === 0) {
                        increaseDifficulty();
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

// ゲームの初期化
function initializeGame() {
    currentLanguage = languageSelect.value;
    currentDifficulty = difficultySelect.value;
    useProgressiveDifficulty = progressiveDifficulty.checked;
    enemiesDefeated = 0;
    score = 0;

    // 解像度設定
    const selectedResolution = resolutionSelect.value;
    if (selectedResolution === 'default') {
        currentCanvasWidth = window.innerWidth * 0.8;
        currentCanvasHeight = window.innerHeight * 0.8;
    } else {
        const [width, height] = selectedResolution.split('x').map(Number);
        currentCanvasWidth = width;
        currentCanvasHeight = height;
    }
    canvas.width = currentCanvasWidth;
    canvas.height = currentCanvasHeight;
    
    updateCurrentWordList();
    
    if (currentWordList.length === 0) {
        alert('選択された言語または難易度の単語リストが見つかりません。');
        return false;
    }
    
    return true;
}

// ゲームループ
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// 攻撃処理を関数化
function fireBurstAtEnemy(targetEnemy) {
    if (!targetEnemy) return;
    const angle = Math.atan2(targetEnemy.y - player.y, targetEnemy.x - player.x);
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            bullets.push(new Bullet(
                player.x,
                player.y,
                Math.cos(angle) * BULLET_SPEED,
                Math.sin(angle) * BULLET_SPEED
            ));
        }, i * 100);
    }
}

// 入力処理
// 入力受付フラグ
let inputEnabled = true;
document.addEventListener('keydown', (e) => {
    if (!inputEnabled) return;
    if (e.key === 'Backspace') {
        typedWord = typedWord.slice(0, -1);
    } else if (currentLanguage === 'japanese') {
        typedWord += e.key;
    } else if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
        typedWord += e.key.toLowerCase();
    }

    // 進捗リセット判定
    const anyMatch = enemies.some(enemy => enemy.word.toLowerCase().startsWith(typedWord.toLowerCase()));
    if (!anyMatch && typedWord.length > 0) {
        typedWord = '';
        enemies.forEach(enemy => { enemy.displayWord = enemy.word; });
        return;
    }

    enemies.forEach(enemy => {
        if (enemy.word.toLowerCase().startsWith(typedWord.toLowerCase())) {
            enemy.displayWord = enemy.word.slice(typedWord.length);
        } else {
            enemy.displayWord = enemy.word;
        }
    });

    const matchedEnemy = enemies.find(enemy => enemy.word.toLowerCase() === typedWord.toLowerCase());
    if (matchedEnemy) {
        fireBurstAtEnemy(matchedEnemy);
        typedWord = '';
        // タイプ完了した敵の単語を再抽選
        let availableWords = currentWordList.filter(word => !usedWords.includes(word));
        if (availableWords.length === 0) {
            usedWords = [];
            availableWords = currentWordList;
        }
        const newWord = availableWords[Math.floor(Math.random() * availableWords.length)];
        usedWords.push(newWord);
        matchedEnemy.word = newWord;
        matchedEnemy.displayWord = newWord;
    }
}); 

// イベントリスナー
// UIテキストを現在の言語で更新する関数
function updateUIText() {
    const texts = uiTexts[currentUiLanguage];
    document.querySelector('h1').textContent = texts.title;
    document.querySelector('h3') && (document.querySelector('h3').textContent = texts.subtitle);
    document.getElementById('languageLabel').textContent = texts.languageLabel;
    // 言語選択肢
    languageSelect.options[0].text = texts.languageEnglish;
    languageSelect.options[1].text = texts.languageJapanese;
    document.querySelector('#difficultySelection label').textContent = texts.difficultyLabel;
    difficultySelect.options[0].text = texts.difficultyEasy;
    difficultySelect.options[1].text = texts.difficultyMedium;
    difficultySelect.options[2].text = texts.difficultyHard;
    difficultySelect.options[3].text = texts.difficultyExpert;
    document.querySelector('#progressiveMode label').lastChild.textContent = texts.progressiveLabel;
    document.querySelector('#resolutionSelection label').textContent = texts.resolutionLabel;
    resolutionSelect.options[0].text = texts.resolutionDefault;
    document.getElementById('startButton').textContent = texts.startButton;
}

// 言語切替時にUI更新

languageSelect.addEventListener('change', () => {
    currentLanguage = languageSelect.value;
    updateCurrentWordList();
});

uiLanguageSelect.addEventListener('change', () => {
    currentUiLanguage = uiLanguageSelect.value;
    updateUIText();
});

// 初期表示時にもUI更新
window.addEventListener('DOMContentLoaded', () => {
    // セレクトボックス初期値反映
    languageSelect.value = currentLanguage;
    uiLanguageSelect.value = currentUiLanguage;
    updateUIText();
});
difficultySelect.addEventListener('change', () => {
    currentDifficulty = difficultySelect.value;
    updateCurrentWordList();
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

        // ゲームループが多重起動しないように一度だけ開始
        if (!window._gameLoopRunning) {
            window._gameLoopRunning = true;
            gameLoop();
        }
    }
});

// 初期化
loadAndSetWordLists();

// 言語リソース定義
const uiTexts = {
    english: {
        title: "Hype_Type",
        subtitle: "Weaponize your WPM",
        languageLabel: "Select language for typing:",
        languageEnglish: "English",
        languageJapanese: "Japanese",
        difficultyLabel: "Select difficulty:",
        difficultyEasy: "Easy",
        difficultyMedium: "Medium",
        difficultyHard: "Hard",
        difficultyExpert: "Expert",
        progressiveLabel: "Increase difficulty progressively",
        resolutionLabel: "Resolution:",
        resolutionDefault: "Default (80% of window)",
        startButton: "Start Game",
        hp: "HP: "
    },
    japanese: {
        title: "Hype_Type",
        subtitle: "あなたのタイプ速度を武器に",
        languageLabel: "タイプ時に使用する言語を選択:",
        languageEnglish: "英語",
        languageJapanese: "日本語",
        difficultyLabel: "難易度を選択:",
        difficultyEasy: "初級",
        difficultyMedium: "中級",
        difficultyHard: "上級",
        difficultyExpert: "達人",
        progressiveLabel: "難易度を徐々に上昇させる",
        resolutionLabel: "解像度:",
        resolutionDefault: "デフォルト (ウィンドウの80%)",
        startButton: "ゲーム開始",
        hp: "HP: "
    }
};