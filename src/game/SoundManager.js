import * as THREE from 'three';

export class SoundManager {
    constructor(camera) {
        this.camera = camera;
        this.audioListener = new THREE.AudioListener();

        // Add listener to camera if camera exists
        if (this.camera) {
            this.camera.add(this.audioListener);
        }

        this.synth = window.speechSynthesis;
        this.voices = [];

        // Wait for voices to load
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => {
                this.voices = this.synth.getVoices();
            };
        }

        // Web Audio Context for SFX
        this.audioContext = this.audioListener.context;
        this.isMuted = false;
        this.ambienceSource = null;
    }

    toggleMute() {
        this.isMuted = !this.isMuted;

        // Stop ambient if muted
        if (this.isMuted && this.ambienceSource) {
            this.ambienceSource.stop();
            this.ambienceSource = null;
        } else if (!this.isMuted && !this.ambienceSource) {
            this.initAmbience();
        }

        console.log("Audio:", this.isMuted ? "MUTED" : "UNMUTED");
        return this.isMuted;
    }

    initAmbience() {
        if (this.isMuted) return;
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        // Create a better ambient sound (filtered noise with LFO)
        const bufferSize = this.audioContext.sampleRate * 4; // 4 seconds buffer
        const buffer = this.audioContext.createBuffer(2, bufferSize, this.audioContext.sampleRate);

        // Generate stereo pink noise
        for (let channel = 0; channel < 2; channel++) {
            const data = buffer.getChannelData(channel);
            let lastOut = 0;

            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                data[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = data[i];
                data[i] *= 2.5;
            }
        }

        const noise = this.audioContext.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        // Filter for more pleasant sound
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200; // Deep rumble

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0.03; // Very subtle

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        noise.start();
        this.ambienceSource = noise;
        console.log("Audio: Ambience started");
    }

    speak(text) {
        if (this.isMuted) return;
        if (this.synth.speaking) {
            this.synth.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);

        // Try to find a good voice
        const preferredVoice = this.voices.find(v => v.name.includes('Google') && v.lang.includes('en')) || this.voices[0];
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.pitch = 0.8;
        utterance.rate = 1.1;

        this.synth.speak(utterance);
    }

    playCyberBark() {
        if (this.isMuted) return;
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const t = this.audioContext.currentTime;

        // Create a more realistic bark with multiple oscillators
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        osc1.type = 'sawtooth';
        osc2.type = 'square';
        filter.type = 'bandpass';
        filter.frequency.value = 400;

        // Two-part bark (woof-woof)
        // Part 1
        osc1.frequency.setValueAtTime(600, t);
        osc1.frequency.exponentialRampToValueAtTime(150, t + 0.08);

        osc2.frequency.setValueAtTime(300, t);
        osc2.frequency.exponentialRampToValueAtTime(100, t + 0.08);

        gainNode.gain.setValueAtTime(0.4, t);
        gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

        // Short pause
        gainNode.gain.setValueAtTime(0.01, t + 0.1);

        // Part 2 (echo bark)
        gainNode.gain.setValueAtTime(0.3, t + 0.15);
        osc1.frequency.setValueAtTime(500, t + 0.15);
        osc1.frequency.exponentialRampToValueAtTime(120, t + 0.22);
        gainNode.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + 0.25);
        osc2.stop(t + 0.25);
    }
}
