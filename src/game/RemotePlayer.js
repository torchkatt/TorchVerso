import * as THREE from 'three';

export class RemotePlayer {
    constructor(scene, camera, id, initialData) {
        this.scene = scene;
        this.camera = camera; // Store camera reference
        this.id = id;
        this.mesh = null;

        // Interpolation
        this.targetPosition = new THREE.Vector3();
        this.targetRotation = 0;
        this.lastUpdate = Date.now();

        this.init(initialData);
    }

    init(data) {
        // Simple Avatar: Capsule-like shape
        const geometry = new THREE.CapsuleGeometry(0.5, 1.8, 4, 8);
        const material = new THREE.MeshStandardMaterial({
            color: Math.random() * 0xffffff, // Random color for each player
            roughness: 0.7,
            metalness: 0.3
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(data.x, data.y, data.z);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Add "Visor" to indicate facing direction
        const visorGeo = new THREE.BoxGeometry(0.6, 0.2, 0.4);
        const visorMat = new THREE.MeshBasicMaterial({ color: 0x00ffff }); // Glowing eyes
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 0.5, -0.3); // Front of face
        this.mesh.add(visor);

        // Add ID Label (Floating Text)
        // Note: For a real game, use HTML overlay or SpriteText. 
        // Keeping it simple for now.

        this.scene.add(this.mesh);

        // Set initial targets
        this.targetPosition.copy(this.mesh.position);
        this.targetRotation = data.rotation;
    }

    updateData(data) {
        this.targetPosition.set(data.x, data.y, data.z);
        this.targetRotation = data.rotation;
        this.lastUpdate = Date.now();
    }

    update(delta) {
        if (!this.mesh) return;

        // Interpolate Position (Lerp)
        // 10.0 is the interpolation speed. Higher = snappier, Lower = smoother but laggier
        this.mesh.position.lerp(this.targetPosition, 10.0 * delta);

        // Interpolate Rotation (Shortest path)
        // Simple lerp for Y rotation
        let rotDiff = this.targetRotation - this.mesh.rotation.y;
        // Normalize angle to -PI to PI
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;

        this.mesh.rotation.y += rotDiff * 10.0 * delta;

        // Update Chat Bubble Position
        this.updateBubblePosition();
    }

    showChatBubble(text) {
        // Create bubble element if not exists
        if (!this.bubbleElement) {
            this.bubbleElement = document.createElement('div');
            this.bubbleElement.className = 'bubble visible';
            document.getElementById('bubble-container').appendChild(this.bubbleElement);
        }

        this.bubbleElement.innerText = text;
        this.bubbleElement.classList.add('visible');

        // Reset timer
        if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
        this.bubbleTimer = setTimeout(() => {
            if (this.bubbleElement) {
                this.bubbleElement.classList.remove('visible');
                // Optional: Remove from DOM after fade out
            }
        }, 5000);
    }

    updateBubblePosition() {
        if (!this.bubbleElement || !this.bubbleElement.classList.contains('visible')) return;

        const headPos = this.mesh.position.clone();
        headPos.y += 2.5; // Above head

        headPos.project(this.camera);

        const x = (headPos.x * .5 + .5) * window.innerWidth;
        const y = (-(headPos.y * .5) + .5) * window.innerHeight;

        this.bubbleElement.style.left = `${x}px`;
        this.bubbleElement.style.top = `${y}px`;

        // Hide if behind camera
        if (headPos.z > 1) {
            this.bubbleElement.style.display = 'none';
        } else {
            this.bubbleElement.style.display = 'block';
        }
    }

    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }
        if (this.bubbleElement) {
            this.bubbleElement.remove();
        }
    }
}
