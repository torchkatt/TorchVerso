import * as THREE from 'three';

export class NPC {
    constructor(scene, position, camera) {
        this.scene = scene;
        this.camera = camera;
        this.mesh = null;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
        this.speed = 2;
        this.changeDirectionTimer = 0;

        // Dialog
        this.bubbleElement = null;
        this.dialogTimer = 0;
        this.phrases = [
            "¡Bienvenido al Torchverso!",
            "Bonita oficina, ¿verdad?",
            "El futuro es brillante.",
            "Estoy buscando un apartamento.",
            "¿Has visto el parque?",
            "Sistema online."
        ];

        this.init(position);
    }

    init(position) {
        // Geometry: Robot Head
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0xff0055,
            roughness: 0.4,
            metalness: 0.8
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.position.y = 1;
        this.mesh.castShadow = true;

        // Body
        const bodyGeo = new THREE.CylinderGeometry(0.3, 0.3, 1, 16);
        const body = new THREE.Mesh(bodyGeo, material);
        body.position.y = -0.8;
        this.mesh.add(body);

        // Eyes (Emissive)
        const eyeGeo = new THREE.BoxGeometry(0.4, 0.1, 0.2);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const eyes = new THREE.Mesh(eyeGeo, eyeMat);
        eyes.position.set(0, 0.1, 0.4);
        this.mesh.add(eyes);

        this.scene.add(this.mesh);

        // Create Bubble DOM Element
        this.bubbleElement = document.createElement('div');
        this.bubbleElement.className = 'bubble';
        document.getElementById('bubble-container').appendChild(this.bubbleElement);
    }

    update(delta, playerPosition) {
        if (!this.mesh) return;

        // Wander Logic
        this.changeDirectionTimer -= delta;
        if (this.changeDirectionTimer <= 0) {
            this.direction.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
            this.changeDirectionTimer = Math.random() * 3 + 2;
        }

        // Move
        this.velocity.copy(this.direction).multiplyScalar(this.speed * delta);
        this.mesh.position.add(this.velocity);

        // Face direction
        const lookTarget = this.mesh.position.clone().add(this.direction);
        this.mesh.lookAt(lookTarget);

        // Bounds check
        if (this.mesh.position.length() > 50) {
            this.direction.negate();
            this.mesh.position.add(this.direction.clone().multiplyScalar(1));
        }

        // Update Bubble Position
        this.updateBubblePosition();

        // Dialog Timer
        if (this.dialogTimer > 0) {
            this.dialogTimer -= delta;
            if (this.dialogTimer <= 0) {
                this.hideDialog();
            }
        }
    }

    updateBubblePosition() {
        if (!this.bubbleElement) return;

        // Project 3D position to 2D screen
        const pos = this.mesh.position.clone();
        pos.y += 1.5; // Above head

        pos.project(this.camera);

        const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(pos.y * 0.5) + 0.5) * window.innerHeight;

        // Only show if in front of camera
        if (pos.z < 1) {
            this.bubbleElement.style.left = `${x}px`;
            this.bubbleElement.style.top = `${y}px`;
            this.bubbleElement.style.display = 'block';
        } else {
            this.bubbleElement.style.display = 'none';
        }
    }

    interact() {
        const phrase = this.phrases[Math.floor(Math.random() * this.phrases.length)];
        this.showDialog(phrase);
    }

    showDialog(text) {
        this.bubbleElement.innerText = text;
        this.bubbleElement.classList.add('visible');
        this.dialogTimer = 3; // Show for 3 seconds
    }

    hideDialog() {
        this.bubbleElement.classList.remove('visible');
    }
}
