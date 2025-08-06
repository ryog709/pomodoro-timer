class PomodoroTimer {
    constructor() {
        // タイマーの設定（秒単位）
        this.WORK_TIME = 25 * 60; // 25分
        this.BREAK_TIME = 5 * 60; // 5分

        // 現在の状態
        this.currentTime = this.WORK_TIME;
        this.isRunning = false;
        this.isWorkTime = true;
        this.sessionCount = 1;
        this.timer = null;

        // DOM要素の取得
        this.timeDisplay = document.getElementById('timeDisplay');
        this.modeText = document.getElementById('modeText');
        this.progressBar = document.getElementById('progressBar');
        this.sessionCountEl = document.getElementById('sessionCount');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.timerEl = document.querySelector('.timer');

        // イベントリスナーの設定
        this.setupEventListeners();

        // 初期状態の設定
        this.updateDisplay();
        this.updateButtons();

        // 通知の許可を求める
        this.requestNotificationPermission();
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.resetBtn.addEventListener('click', () => this.reset());

        // キーボードショートカット
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.matches('button')) {
                e.preventDefault();
                if (this.isRunning) {
                    this.pause();
                } else {
                    this.start();
                }
            } else if (e.code === 'KeyR' && !e.target.matches('button')) {
                e.preventDefault();
                this.reset();
            }
        });
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.timerEl.classList.add('timer--running');

            this.timer = setInterval(() => {
                this.currentTime--;
                this.updateDisplay();
                this.updateProgress();

                if (this.currentTime <= 0) {
                    this.timeUp();
                }
            }, 1000);

            this.updateButtons();
        }
    }

    pause() {
        if (this.isRunning) {
            this.isRunning = false;
            this.timerEl.classList.remove('timer--running');
            clearInterval(this.timer);
            this.updateButtons();
        }
    }

    reset() {
        this.pause();
        this.currentTime = this.isWorkTime ? this.WORK_TIME : this.BREAK_TIME;
        this.updateDisplay();
        this.updateProgress();
    }

    timeUp() {
        this.pause();

        // 通知とサウンド
        this.playNotification();
        this.showNotification();

        // モード切り替え
        this.switchMode();

        // 次のタイマーを自動で始める確認
        setTimeout(() => {
            if (confirm(`${this.isWorkTime ? '作業時間' : '休憩時間'}が開始されます。続けますか？`)) {
                this.start();
            }
        }, 1000);
    }

    switchMode() {
        if (this.isWorkTime) {
            // 作業時間から休憩時間へ
            this.isWorkTime = false;
            this.currentTime = this.BREAK_TIME;
            this.timerEl.classList.add('timer--break');
        } else {
            // 休憩時間から作業時間へ
            this.isWorkTime = true;
            this.currentTime = this.WORK_TIME;
            this.sessionCount++;
            this.timerEl.classList.remove('timer--break');
        }

        this.updateDisplay();
        this.updateProgress();
    }

    updateDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;

        this.timeDisplay.textContent =
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        this.modeText.textContent = this.isWorkTime ? '作業時間' : '休憩時間';
        this.sessionCountEl.textContent = this.sessionCount;

        // ページタイトルの更新
        document.title = `${this.timeDisplay.textContent} - ${this.modeText.textContent} - ポモドーロタイマー`;
    }

    updateProgress() {
        const totalTime = this.isWorkTime ? this.WORK_TIME : this.BREAK_TIME;
        const progress = ((totalTime - this.currentTime) / totalTime) * 100;
        this.progressBar.style.width = `${progress}%`;
    }

    updateButtons() {
        this.startBtn.disabled = this.isRunning;
        this.pauseBtn.disabled = !this.isRunning;
    }

    // 通知機能
    async requestNotificationPermission() {
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                await Notification.requestPermission();
            }
        }
    }

    showNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            const title = this.isWorkTime ? '🍅 休憩時間です！' : '💪 作業時間です！';
            const body = this.isWorkTime ?
                '5分間の休憩を取りましょう。' :
                '25分間集中して作業しましょう！';

            const notification = new Notification(title, {
                body: body,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🍅</text></svg>',
                badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🍅</text></svg>'
            });

            // 5秒後に自動で閉じる
            setTimeout(() => notification.close(), 5000);
        }
    }

    playNotification() {
        // Web Audio APIを使用して通知音を生成
        try {
            const audioContext = new(window.AudioContext || window.webkitAudioContext)();

            // 複数の音を組み合わせて心地よい通知音を作成
            const playTone = (frequency, duration, startTime) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.setValueAtTime(frequency, startTime);
                oscillator.type = 'sine';

                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.1);
                gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            };

            const now = audioContext.currentTime;

            // メロディーを演奏
            if (this.isWorkTime) {
                // 休憩開始の音（下降音）
                playTone(880, 0.3, now);
                playTone(660, 0.3, now + 0.3);
                playTone(440, 0.5, now + 0.6);
            } else {
                // 作業開始の音（上昇音）
                playTone(440, 0.3, now);
                playTone(660, 0.3, now + 0.3);
                playTone(880, 0.5, now + 0.6);
            }

        } catch (error) {
            console.log('Audio notification failed:', error);
        }
    }

    // 統計情報の保存（localStorage使用）
    saveSession() {
        const today = new Date().toDateString();
        const sessions = JSON.parse(localStorage.getItem('pomodoroSessions')) || {};

        if (!sessions[today]) {
            sessions[today] = 0;
        }

        sessions[today]++;
        localStorage.setItem('pomodoroSessions', JSON.stringify(sessions));
    }
}

// ページ読み込み完了後にタイマーを初期化
document.addEventListener('DOMContentLoaded', () => {
    const pomodoroTimer = new PomodoroTimer();

    // ショートカットキーの説明を表示
    console.log('🍅 ポモドーロタイマー ショートカットキー');
    console.log('スペースキー: スタート/一時停止');
    console.log('Rキー: リセット');
});

// サービスワーカーの登録（オフライン対応）
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}