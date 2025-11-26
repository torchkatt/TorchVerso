import * as THREE from 'three';

export class NPC {
    constructor(scene, position, camera, soundManager) {
        this.scene = scene;
        this.camera = camera;
        this.soundManager = soundManager;
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
            "Bonita casa, ¿verdad?",
            "El futuro es brillante.",
            "Estoy buscando un apartamento.",
            "¿Has visto la tienda nueva?",
            "Sistema online."
        ];

        this.init(position);
    }

    init(position) {
        // AI Personality
        this.systemPrompt = "You are a friendly citizen of Torchverso, a vibrant city. You are optimistic and helpful. Keep answers short (under 20 words).";
        this.isThinking = false;

        // Create person-like character
        this.mesh = new THREE.Group();

        // Skin tones variety
        const skinTones = [0xffd7b5, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0x5c3317];
        const skinColor = skinTones[Math.floor(Math.random() * skinTones.length)];

        // Shirt colors variety
        const shirtColors = [0xff0000, 0x0000ff, 0x00ff00, 0xffff00, 0xff00ff, 0x00ffff, 0xffa500];
        const shirtColor = shirtColors[Math.floor(Math.random() * shirtColors.length)];

        // Head
        const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
        const headMat = new THREE.MeshStandardMaterial({
            color: skinColor,
            roughness: 0.8
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.5;
        this.mesh.add(head);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.1, 1.55, 0.25);
        this.mesh.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.1, 1.55, 0.25);
        this.mesh.add(rightEye);

        // Body (torso)
        const bodyGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.8, 16);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: shirtColor,
            roughness: 0.7
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.8;
        this.mesh.add(body);

        // Arms
        const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8);
        const armMat = new THREE.MeshStandardMaterial({
            color: shirtColor,
            roughness: 0.7
        });

        const leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-0.35, 0.9, 0);
        leftArm.rotation.z = 0.3;
        this.mesh.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.position.set(0.35, 0.9, 0);
        rightArm.rotation.z = -0.3;
        this.mesh.add(rightArm);

        // Legs
        const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.7, 8);
        const legMat = new THREE.MeshStandardMaterial({
            color: 0x2c3e50, // Dark blue pants
            roughness: 0.8
        });

        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(-0.15, 0.05, 0);
        this.mesh.add(leftLeg);
        this.leftLeg = leftLeg;

        const rightLeg = new THREE.Mesh(legGeo, legMat);
        rightLeg.position.set(0.15, 0.05, 0);
        this.mesh.add(rightLeg);
        this.rightLeg = rightLeg;

        this.mesh.position.copy(position);
        this.mesh.position.y = 0;
        this.mesh.castShadow = true;

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

        // Walking animation (legs)
        if (this.speed > 0) {
            const walkCycle = Math.sin(Date.now() * 0.01) * 0.3;
            this.leftLeg.rotation.x = walkCycle;
            this.rightLeg.rotation.x = -walkCycle;
        }

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
        pos.y += 2; // Above head

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

    async talkToAI(userMessage, aiManager) {
        if (this.isThinking) return;

        this.showDialog("Thinking...");
        this.isThinking = true;

        const response = await aiManager.generateResponse(this.systemPrompt, userMessage);

        this.isThinking = false;
        this.showDialog(response);

        if (this.soundManager) {
            this.soundManager.speak(response);
        }
    }

    showDialog(text) {
        this.bubbleElement.innerText = text;
        this.bubbleElement.classList.add('visible');
        this.dialogTimer = 5; // Show for 5 seconds
    }

    setHovered(isHovered) {
        if (isHovered) {
            this.speed = 0; // Stop when looked at
        } else {
            this.speed = 2; // Resume walking
        }
    }

    hideDialog() {
        this.bubbleElement.classList.remove('visible');
    }
}
