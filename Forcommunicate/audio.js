// --- AUDIO SYNTHESIZER ---
const AudioSynth = {
    ctx: null,
    lastReelClickTime: 0,

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    playShootSound() {
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.35);
        
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
        
        osc.start();
        osc.stop(now + 0.35);
    },

    playGrabSound() {
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.08);
        
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
        
        osc.start();
        osc.stop(now + 0.08);
    },

    playReelSound(speed) {
        this.init();
        const now = this.ctx.currentTime;
        // Interval based on reel speed. Slower speed = slower click interval
        const interval = 0.12 + (1.5 / Math.max(speed, 0.5)) * 0.08; 
        if (now - this.lastReelClickTime > interval) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.setValueAtTime(25, now + 0.012);
            
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.012);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start();
            osc.stop(now + 0.012);
            this.lastReelClickTime = now;
        }
    },

    playGoldSound(weight) {
        this.init();
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc1.type = 'sine';
        osc2.type = 'sine';
        
        // Pitch depending on weight (smaller is higher pitched)
        const freq = weight < 2 ? 880 : (weight < 5 ? 659.25 : 440); // A5, E5, A4
        osc1.frequency.setValueAtTime(freq, now);
        osc2.frequency.setValueAtTime(freq * 1.5, now); // Fifth harmony
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        
        osc1.start();
        osc2.start();
        osc1.stop(now + 0.55);
        osc2.stop(now + 0.55);
    },

    playDiamondSound() {
        this.init();
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc1.type = 'sine';
        osc2.type = 'sine';
        
        osc1.frequency.setValueAtTime(1567.98, now); // G6
        osc1.frequency.exponentialRampToValueAtTime(2349.32, now + 0.18); // D7 sweep
        osc2.frequency.setValueAtTime(3135.96, now); // G7
        
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        
        osc1.start();
        osc2.start();
        osc1.stop(now + 0.6);
        osc2.stop(now + 0.6);
    },

    playBagSound() {
        this.init();
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc1.type = 'triangle';
        osc2.type = 'sine';
        
        osc1.frequency.setValueAtTime(440, now);
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.2);
        osc2.frequency.setValueAtTime(659.25, now);
        osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.2);
        
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        osc1.start();
        osc2.start();
        osc1.stop(now + 0.4);
        osc2.stop(now + 0.4);
    },

    playExplosionSound() {
        this.init();
        const now = this.ctx.currentTime;
        
        // Generate noise buffer
        const bufferSize = this.ctx.sampleRate * 1.6;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, now);
        filter.frequency.exponentialRampToValueAtTime(25, now + 1.3);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.65, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 1.6);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        // Low sub bass thump
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = 'sine';
        bassOsc.frequency.setValueAtTime(110, now);
        bassOsc.frequency.linearRampToValueAtTime(10, now + 0.45);
        bassGain.gain.setValueAtTime(0.55, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        
        bassOsc.connect(bassGain);
        bassGain.connect(this.ctx.destination);
        
        noise.start(now);
        bassOsc.start(now);
        noise.stop(now + 1.6);
        bassOsc.stop(now + 0.45);
    },

    playDynamiteSound() {
        this.init();
        const now = this.ctx.currentTime;
        
        // Short fuse fizz (high pitch noise)
        const bufferSize = this.ctx.sampleRate * 0.35;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(4500, now);
        filter.Q.setValueAtTime(10, now);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        noise.start(now);
        noise.stop(now + 0.35);
    },

    playBuySound() {
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1320, now); // E6
        osc.frequency.setValueAtTime(1760, now + 0.08); // A6
        
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.setValueAtTime(0.12, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.45);
    },

    bgmAudio: null,
    isMusicPlaying: false,
    musicVolume: 0.3,

    startMusic() {
        this.init();
        if (this.isMusicPlaying) return;

        if (!this.bgmAudio) {
            this.bgmAudio = new Audio('Background Song.mp3');
            this.bgmAudio.loop = true;
        }

        this.bgmAudio.volume = this.musicVolume;
        
        this.bgmAudio.play()
            .then(() => {
                this.isMusicPlaying = true;
            })
            .catch(err => {
                console.warn("Failed to play background music:", err);
            });
    },

    setMusicVolume(vol) {
        this.musicVolume = vol;
        if (this.bgmAudio) {
            this.bgmAudio.volume = vol;
        }
    },

    stopMusic() {
        if (this.bgmAudio) {
            this.bgmAudio.pause();
        }
        this.isMusicPlaying = false;
    }
};
