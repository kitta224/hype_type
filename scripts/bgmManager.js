class BGMManager {
    constructor() {
        this.audio = null;
        this.currentTrack = 0;
        this.volume = 0.5;
        this.isPlaying = false;
        this.trackCount = 184; // BGMフォルダ内のトラック数
        this.controlsText = "↑↓:音量  ←→:曲スキップ  Alt+R:ランダム再生";
        
        // BGMファイルのベースパス
        this.bgmBasePath = './BGM/lofi/';
        
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
        this.audio.volume = 0; // 初期音量を0に設定（フェードイン開始）
        this.audio.loop = true;
        
        // 曲の先頭から再生開始
        this.audio.addEventListener('loadedmetadata', () => {
            this.audio.currentTime = 0;
            this.audio.play().catch(e => console.error('BGM再生エラー:', e));
            this.isPlaying = true;
            
            // フェードイン効果を適用
            this.applyFadeIn();
        });
        
        this.audio.load();
    }
    
    // フェードイン効果を適用
    applyFadeIn() {
        if (!this.audio) return;
        
        const fadeDuration = 2000; // フェードイン時間（ミリ秒）
        const startTime = Date.now();
        const targetVolume = this.volume;
        
        const fadeInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / fadeDuration, 1);
            
            // イージング関数を使用してスムーズなフェードイン
            const easedProgress = 1 - Math.pow(1 - progress, 2); // イージングアウト
            this.audio.volume = easedProgress * targetVolume;
            
            if (progress >= 1) {
                clearInterval(fadeInterval);
                this.audio.volume = targetVolume; // 最終的に目標音量に設定
            }
        }, 50); // 50msごとに更新
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
            } else if (e.key === 'r' && e.altKey) {
                // Alt+R: ランダムな曲を再選択して再生
                this.playRandomTrack();
                e.preventDefault();
            }
        });
    }
    
    // BGM情報を描画
    drawBGMInfo(ctx, canvas) {
        if (!this.isPlaying) return;
        
        // テーマシステムから色を取得（getCanvasColors関数が利用可能な場合）
        let textColor = 'rgba(255, 255, 255, 0.7)';
        if (typeof getCanvasColors === 'function') {
            try {
                const colors = getCanvasColors();
                // テキストメインカラーを使用し、透明度を追加
                textColor = colors.textMain.replace(')', ', 0.7)').replace('rgb', 'rgba');
            } catch (e) {
                console.warn('テーマ色の取得に失敗しました:', e);
            }
        }
        
        ctx.fillStyle = textColor;
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        
        // 現在のBGM番号
        const trackInfo = `BGM No.${this.currentTrack.toString().padStart(3, '0')}`;
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