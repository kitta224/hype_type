// UI Manager
// Handles UI text updates, pause menu, and other UI elements

let currentUiLanguage = 'english'; // 表示言語

// ポーズメニューの表示/非表示を更新（フェードアニメーション付き）
function updatePauseMenu() {
    const pauseMenu = document.getElementById('pauseMenu');
    if (pauseMenu) {
        if (window.gamePaused) {
            // フェードイン
            pauseMenu.style.display = 'flex';
            requestAnimationFrame(() => {
                pauseMenu.style.opacity = '1';
            });
        } else {
            // フェードアウト
            pauseMenu.style.opacity = '0';
            pauseMenu.addEventListener('transitionend', function hideMenu() {
                pauseMenu.style.display = 'none';
                pauseMenu.removeEventListener('transitionend', hideMenu);
            }, { once: true });
        }
    }
}

// UIテキストを現在の言語で更新する関数
function updateUIText() {
    const texts = uiTexts[currentUiLanguage];
    const h1 = document.querySelector('h1');
    if (h1) h1.textContent = texts.title;
    const h3 = document.querySelector('h3');
    if (h3) h3.textContent = texts.subtitle;
    const languageLabel = document.getElementById('languageLabel');
    if (languageLabel) languageLabel.textContent = texts.languageLabel;
    // 言語選択肢（英語のみ）
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect && languageSelect.options && languageSelect.options[0]) {
        languageSelect.options[0].text = texts.languageEnglish;
    }
    // 解像度選択肢
    const resolutionLabel = document.getElementById('resolutionLabel');
    if (resolutionLabel) resolutionLabel.textContent = texts.resolutionLabel;
    const resolutionSelect = document.getElementById('resolutionSelect');
    if (resolutionSelect && resolutionSelect.options) {
        if (resolutionSelect.options[0]) resolutionSelect.options[0].text = texts.Default;
        if (resolutionSelect.options[1]) resolutionSelect.options[1].text = texts['100p'];
    }
    // テーマ切替
    const themeToggleLabel = document.getElementById('themeToggleLabel');
    if (themeToggleLabel) themeToggleLabel.textContent = texts.themeToggleLabel;
    // 設定ボタン
    const settingsButton = document.getElementById('settingsButton');
    if (settingsButton) settingsButton.textContent = texts.settingsButton;
    //
    const muteToggleLabel = document.getElementById('muteToggleLabel');
    if (muteToggleLabel) muteToggleLabel.textContent = texts.muteToggleLabel;
    // スタートボタン
    const startButton = document.getElementById('startButton');
    if (startButton) startButton.textContent = texts.startButton;
    // ポーズメニュー
    const pauseTitle = document.getElementById('pauseTitle');
    if (pauseTitle) pauseTitle.textContent = texts.pauseTitle;
    const resumeButton = document.getElementById('resumeButton');
    if (resumeButton) resumeButton.textContent = texts.resumeButton;
    const menuButton = document.getElementById('menuButton');
    if (menuButton) menuButton.textContent = texts.menuButton;
    const quickStartHint = document.getElementById('quickStartHint');
    if (quickStartHint) quickStartHint.textContent = texts.quickStartHint;
}

// 言語リソース定義
const uiTexts = {
    english: {
        hp: "HP: ",
        pauseTitle: "Pause",
        resumeButton: "Resume Game",
        menuButton: "Back to Menu"
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
const resumeButton = document.getElementById('resumeButton');
if (resumeButton) {
    resumeButton.addEventListener('click', () => {
        window.gamePaused = false;
        updatePauseMenu();
        if (typeof bgmManager !== 'undefined' && bgmManager.resume) {
            bgmManager.resume();
        }
    });
}

const menuButton = document.getElementById('menuButton');
if (menuButton) {
    menuButton.addEventListener('click', () => {
        window.gamePaused = false;
        updatePauseMenu();
        // ゲームを停止してスタート画面に戻る
        window._gameLoopRunning = false;
        const canvas = document.getElementById('gameCanvas');
        if (canvas) canvas.style.display = 'none';
        const startScreen = document.getElementById('startScreen');
        if (startScreen) startScreen.style.display = 'block';

        // BGMを停止
        if (typeof bgmManager !== 'undefined' && bgmManager.stop) {
            bgmManager.stop();
        }
    });
}

export { updatePauseMenu, updateUIText, uiTexts };