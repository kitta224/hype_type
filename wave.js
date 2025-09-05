// wave.js: ウェーブ管理
// シンプルなウェーブシステム実装

const DEFAULT_KILLS_PER_WAVE = 10;
const DIFFICULTY_ORDER = ['easy', 'medium', 'hard', 'expert'];

const waveState = {
    currentWave: 1,
    killsThisWave: 0,
    killsToAdvance: DEFAULT_KILLS_PER_WAVE
};

function init(options = {}) {
    waveState.currentWave = options.startWave || 1;
    waveState.killsThisWave = 0;
    waveState.killsToAdvance = options.killsPerWave || DEFAULT_KILLS_PER_WAVE;
}

function getCurrentWave() {
    return waveState.currentWave;
}

function getKillsThisWave() {
    return waveState.killsThisWave;
}

function getKillsToAdvance() {
    return waveState.killsToAdvance;
}

function onEnemyDefeated() {
    waveState.killsThisWave++;
    if (waveState.killsThisWave >= waveState.killsToAdvance) {
        advanceWave();
    }
}

function advanceWave() {
    waveState.currentWave++;
    waveState.killsThisWave = 0;
    // 将来的に波ごとのイベントトリガやボス解禁などをここに追加
}

function getEnemyHPForWave(baseHP = 3) {
    // ウェーブが進むごとに僅かに強くする（1every 3 waves）
    const extra = Math.floor((waveState.currentWave - 1) / 2);
    return Math.max(1, baseHP + extra);
}

function getAllowedDifficulties() {
    // wave 1: ['easy']
    // wave 2: ['easy','medium']
    // wave 4: add 'hard'
    // wave 6: add 'expert'
    // unlock every 2 waves up to available difficulties
    const allowed = [];
    const unlockCount = Math.min(DIFFICULTY_ORDER.length, Math.floor((waveState.currentWave + 1) / 2));
    for (let i = 0; i < unlockCount; i++) {
        allowed.push(DIFFICULTY_ORDER[i]);
    }
    return allowed;
}

function reset() {
    waveState.currentWave = 1;
    waveState.killsThisWave = 0;
}

export default {
    init,
    getCurrentWave,
    onEnemyDefeated,
    getEnemyHPForWave,
    getAllowedDifficulties,
    getKillsThisWave,
    getKillsToAdvance,
    reset
};
