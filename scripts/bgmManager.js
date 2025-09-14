class BGMManager {
    constructor() {
        this.audio = null;
        this.currentTrack = 0;
        this.volume = 0.5;
        this.isPlaying = false;
        this.trackCount = 184; // BGMフォルダ内のトラック数
        this.controlsText = "↑↓:音量調整  ←→:曲スキップ";
        
        // BGMファイルのベースパス
        this.bgmBasePath = '../BGM/lofi/';
        
        // キーボードイベントリスナーを設定
        this.setupKeyboardControls();
    }
    
    // ランダムなトラック番号を選択して再生開始
    playRandomTrack() {
        // ランダムなトラック番号を選択 (1-184)
        this.currentTrack = Math.floor(Math.random() * this.trackCount) + 1;
        this.playCurrentTrack();
    }
    
    // 現在のトラックを再生
    playCurrentTrack() {
        if (this.audio) {
            this.audio.pause();
            this.audio = null;
        }
        
        // ファイル名を生成 (001.mp3, 002.mp3, ..., 184.mp3 形式)
        const trackNumber = this.currentTrack.toString().padStart(3, '0');
        const fileName = `${trackNumber}.mp3`;
        
        this.audio = new Audio(`${this.bgmBasePath}${fileName}`);
        this.audio.volume = this.volume;
        this.audio.loop = true;
        
        // 曲の先頭から再生開始
        this.audio.addEventListener('loadedmetadata', () => {
            this.audio.currentTime = 0;
            this.audio.play().catch(e => console.error('BGM再生エラー:', e));
            this.isPlaying = true;
        });
        
        this.audio.load();
    }
    
    // 次のトラックにスキップ
    nextTrack() {
        this.currentTrack = (this.currentTrack % this.trackCount) + 1;
        this.playCurrentTrack();
    }
    
    // 前のトラックにスキップ
    previousTrack() {
        this.currentTrack = this.currentTrack === 1 ? this.trackCount : this.currentTrack - 1;
        this.playCurrentTrack();
    }
    
    // 音量調整
    adjustVolume(delta) {
        this.volume = Math.max(0, Math.min(1, this.volume + delta));
        if (this.audio) {
            this.audio.volume = this.volume;
        }
    }
    
    // キーボードコントロールの設定
    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') {
                // 音量アップ
                this.adjustVolume(0.1);
                e.preventDefault();
            } else if (e.key === 'ArrowDown') {
                // 音量ダウン
                this.adjustVolume(-0.1);
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                // 次の曲
                this.nextTrack();
                e.preventDefault();
            } else if (e.key === 'ArrowLeft') {
                // 前の曲
                this.previousTrack();
                e.preventDefault();
            }
        });
    }
    
    // BGM情報を描画
    drawBGMInfo(ctx, canvas) {
        if (!this.isPlaying) return;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        
        // 現在のBGM番号
        const trackInfo = `BGM: ${this.currentTrack.toString().padStart(3, '0')}`;
        ctx.fillText(trackInfo, canvas.width - 10, canvas.height - 30);
        
        // 操作方法
        ctx.fillText(this.controlsText, canvas.width - 10, canvas.height - 10);
    }
    
    // ゲーム開始時にBGM再生
    start() {
        this.playRandomTrack();
    }
    
    // ゲーム終了時にBGM停止
    stop() {
        if (this.audio) {
            this.audio.pause();
            this.isPlaying = false;
        }
    }
}

export default BGMManager;