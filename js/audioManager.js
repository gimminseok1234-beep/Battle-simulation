export class AudioManager {
    constructor() {
        this.isInitialized = false;
        this.isMuted = false;
        this.isKillSoundEnabled = true;
        this.players = {};

        this.soundFiles = {
            replication: './sounds/2+.mp3',
            arrowShoot: './sounds/arrow.mp3',
            crackedWallBreak: './sounds/boxcrash.mp3',
            dualSwordHit: './sounds/double sword.mp3',
            equip: './sounds/equip.mp3',
            fireball: './sounds/fireball.mp3',
            heal: './sounds/heal.mp3',
            unitDeath: './sounds/kill.mp3',
            hadokenShoot: './sounds/shuriken.mp3', // 장풍 발사 효과음
            nexusDestruction: './sounds/Nexus destruction.mp3',
            punch: './sounds/punch.mp3',
            shurikenShoot: './sounds/shuriken.mp3',
            swordHit: './sounds/sword.mp3',
            teleport: './sounds/teleport.mp3',
            hadokenHit: './sounds/punch.mp3',
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
