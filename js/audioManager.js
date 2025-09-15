export class AudioManager {
    constructor() {
        this.isInitialized = false;
        this.isMuted = false;
        this.isKillSoundEnabled = true;
        this.players = {};
        this.volume = 0; // 데시벨 단위

        this.soundFiles = {
            replication: './sounds/2+.mp3',
            arrowShoot: './sounds/arrow.mp3',
            crackedWallBreak: './sounds/boxcrash.mp3',
            dualSwordHit: './sounds/double sword.mp3',
            equip: './sounds/equip.mp3',
            fireball: './sounds/fireball.mp3',
            heal: './sounds/heal.mp3',
            unitDeath: './sounds/kill.mp3',
            hadokenShoot: './sounds/shuriken.mp3',
            nexusDestruction: './sounds/Nexus destruction.mp3',
            punch: './sounds/punch.mp3',
            shurikenShoot: './sounds/shuriken.mp3',
            swordHit: './sounds/sword.mp3',
            teleport: './sounds/teleport.mp3',
            hadokenHit: './sounds/punch.mp3',
            boomerang: './sounds/boomerang.mp3',
            poison: './sounds/Poison.mp3',
            questionmark: './sounds/questionmark.mp3',
            rush: './sounds/rush.mp3',
            spear: './sounds/spear.mp3',
            stern: './sounds/Stern.mp3',
            electricity: './sounds/electricity.mp3',
            // 신규 효과음 추가
            magicdagger: './sounds/magicdagger.mp3',
            Aurablade: './sounds/Aurablade.mp3',
            axe: './sounds/axe.mp3',
            Ice: './sounds/Ice.mp3',
            Arousal: './sounds/Arousal.mp3'
        };
    }

    async init() {
        if (this.isInitialized) return;
        try {
            await Tone.start();
            // 모든 사운드를 미리 로드합니다.
            const loadPromises = Object.keys(this.soundFiles).map(key => {
                const player = new Tone.Player(this.soundFiles[key]).toDestination();
                return player.load(this.soundFiles[key]).then(() => {
                    this.players[key] = player;
                });
            });
            await Promise.all(loadPromises);

            const savedVolume = localStorage.getItem('gameVolume');
            if (savedVolume !== null) {
                this.setVolume(parseFloat(savedVolume));
            } else {
                this.setVolume(0); // 기본 볼륨
            }
            
            this.isInitialized = true;
            console.log("Audio Initialized and all sounds pre-loaded.");
        } catch (e) {
            console.error("Could not start or load audio context:", e);
        }
    }

    play(sound) {
        if (!this.isInitialized || this.isMuted || !this.players[sound]) return;
        if (sound === 'unitDeath' && !this.isKillSoundEnabled) return;

        const player = this.players[sound];
        if (player && player.loaded) {
            // 사운드가 이미 재생 중이면 멈추고 다시 시작하여 중첩을 방지합니다.
            if (player.state === 'started') {
                player.stop();
            }
            player.start();
        }
    }
    
    setVolume(db) {
        this.volume = db;
        Tone.Destination.volume.value = db;
        localStorage.setItem('gameVolume', db);

        // UI 업데이트
        const volumeSlider = document.getElementById('volumeControl');
        const volumeValue = document.getElementById('volumeValue');
        if (volumeSlider) volumeSlider.value = db;
        if(volumeValue) {
             const percentage = Math.round(((db + 30) / 30) * 100);
             volumeValue.textContent = percentage;
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        Tone.Destination.mute = this.isMuted;
        document.getElementById('soundOnIcon').classList.toggle('hidden', this.isMuted);
        document.getElementById('soundOffIcon').classList.toggle('hidden', !this.isMuted);
        return this.isMuted;
    }

    toggleKillSound(isEnabled) {
        this.isKillSoundEnabled = isEnabled;
        localStorage.setItem('arenaKillSoundEnabled', isEnabled);
    }
}
