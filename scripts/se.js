class SE {
  constructor() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  play(fileName) {
    const audio = new Audio(`../SE/${fileName}`);
    audio.play().catch(e => console.error('音声再生エラー:', e));
  }
}

const se = new SE();
export default se;