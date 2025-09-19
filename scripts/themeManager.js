// Theme Manager
// Handles theme switching, color management, and canvas color application

const THEME_KEY = 'hype_type_theme'; // 保存キー: 'dark' | 'light' | 'system' のいずれか

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
    if (typeof player !== 'undefined') player.color = colors.player;
    // 敵
    if (typeof enemies !== 'undefined') enemies.forEach(e => e.color = colors.enemy);
    // 弾
    if (typeof bullets !== 'undefined') bullets.forEach(b => b.color = colors.bullet);
}

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

export { setTheme, getCanvasColors, applyCanvasColors, applyThemeFromPreference, THEME_KEY };