import * as THREE from 'three';

export class SoundManager {
    constructor(camera) {
        this.camera = camera;
        this.listener = new THREE.AudioListener();

        if (this.camera) {
            this.camera.add(this.listener);
        }

        this.audioLoader = new THREE.AudioLoader();
        this.sounds = new Map();
        this.isMuted = false;

        // Speech Synthesis (TTS)
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.initVoices();

        // Ambience
        this.ambienceSound = null;
    }

    initVoices() {
        // Wait for voices to load
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = () => {
                this.voices = this.synth.getVoices();
            };
        }
    }

    initAmbience() {
        if (this.ambienceSound) return; // Already initialized

        // Create a procedural wind/city hum sound using an oscillator if no file
        // For now, we'll just set up the structure or use a placeholder if available
        // Since we don't have assets, we'll skip actual file loading for ambience to avoid errors
        // and just log it. In a real app, we'd load 'ambience.mp3'
        console.log("Ambience initialized (Placeholder)");
    }

    playSound(name, position = null, volume = 1.0) {
        if (this.isMuted) return;

        // Procedural sounds based on name
        if (name === 'step') {
            // Simple click/step sound
            // Implementation would go here
        }
    }

    playBark(position) {
        if (this.isMuted) return;

        // Create a positional sound for the dog
        const sound = new THREE.PositionalAudio(this.listener);

        // Procedural bark using oscillator
        const oscillator = this.listener.context.createOscillator();
        const gainNode = this.listener.context.createGain();

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(400, this.listener.context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, this.listener.context.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.5, this.listener.context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.listener.context.currentTime + 0.1);

        oscillator.connect(gainNode);
        sound.setNodeSource(oscillator); // Connect oscillator to Three.js audio

        // Add to a temporary mesh at position to play 3D sound
        const mesh = new THREE.Object3D();
        mesh.position.copy(position);
        mesh.add(sound);

        // We need to add mesh to scene to update matrix world, 
        // but SoundManager doesn't have scene ref directly usually.
        // Assuming position is enough for the node if we don't attach to scene graph for long

        oscillator.start();
        oscillator.stop(this.listener.context.currentTime + 0.2);
    }

    speak(text, position) {
        if (this.isMuted) return;

        const utterance = new SpeechSynthesisUtterance(text);
        // Pick a random voice or specific one
        if (this.voices.length > 0) {
            utterance.voice = this.voices[Math.floor(Math.random() * this.voices.length)];
        }
        utterance.volume = 1;
        utterance.rate = 1;
        utterance.pitch = 1;

        this.synth.speak(utterance);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.synth.cancel();
            this.listener.setMasterVolume(0);
        } else {
            this.listener.setMasterVolume(1);
        }
        return this.isMuted;
    }

    update(delta) {
        // Update logic if needed
    }
}
