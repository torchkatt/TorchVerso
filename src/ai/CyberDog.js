import * as THREE from 'three';

export class CyberDog {
    constructor(scene, position, camera, soundManager) {
        this.scene = scene;
        this.camera = camera;
        this.soundManager = soundManager;
        this.mesh = null;
        this.velocity = new THREE.Vector3();
        this.speed = 4; // Faster than NPCs

        this.state = 'IDLE'; // IDLE, FOLLOW
        this.minDistance = 3;
        this.maxDistance = 8;

        this.init(position);
    }

    init(position) {
        // Create realistic dog
        this.mesh = new THREE.Group();

        const dogColor = 0xcd853f; // Golden brown
        const dogMat = new THREE.MeshStandardMaterial({
            color: dogColor,
            roughness: 0.9
        });

        // Body (main torso)
        const bodyGeo = new THREE.BoxGeometry(0.8, 0.5, 1.2);
        const body = new THREE.Mesh(bodyGeo, dogMat);
        body.position.y = 0.5;
        body.castShadow = true;
        this.mesh.add(body);

        // Head
        const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.5);
        const head = new THREE.Mesh(headGeo, dogMat);
        head.position.set(0, 0.6, 0.7);
        this.mesh.add(head);

        // Snout
        const snoutGeo = new THREE.BoxGeometry(0.25, 0.2, 0.3);
        const snout = new THREE.Mesh(snoutGeo, new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.9
        }));
        snout.position.set(0, 0.55, 1.0);
        this.mesh.add(snout);

        // Nose
        const noseGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const noseMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.set(0, 0.58, 1.15);
        this.mesh.add(nose);

        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.12, 0.68, 0.9);
        this.mesh.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.12, 0.68, 0.9);
        this.mesh.add(rightEye);

        // Ears (triangular)
        const earGeo = new THREE.ConeGeometry(0.15, 0.3, 4);
        const leftEar = new THREE.Mesh(earGeo, dogMat);
        leftEar.position.set(-0.15, 0.85, 0.6);
        leftEar.rotation.z = -0.3;
        this.mesh.add(leftEar);

        const rightEar = new THREE.Mesh(earGeo, dogMat);
        rightEar.position.set(0.15, 0.85, 0.6);
        rightEar.rotation.z = 0.3;
        this.mesh.add(rightEar);

        // Legs (4 legs)
        const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8);

        // Front left
        const frontLeftLeg = new THREE.Mesh(legGeo, dogMat);
        frontLeftLeg.position.set(-0.25, 0.25, 0.4);
        this.mesh.add(frontLeftLeg);
        this.frontLeftLeg = frontLeftLeg;

        // Front right
        const frontRightLeg = new THREE.Mesh(legGeo, dogMat);
        frontRightLeg.position.set(0.25, 0.25, 0.4);
        this.mesh.add(frontRightLeg);
        this.frontRightLeg = frontRightLeg;

        // Back left
        const backLeftLeg = new THREE.Mesh(legGeo, dogMat);
        backLeftLeg.position.set(-0.25, 0.25, -0.3);
        this.mesh.add(backLeftLeg);
        this.backLeftLeg = backLeftLeg;

        // Back right
        const backRightLeg = new THREE.Mesh(legGeo, dogMat);
        backRightLeg.position.set(0.25, 0.25, -0.3);
        this.mesh.add(backRightLeg);
        this.backRightLeg = backRightLeg;

        // Tail
        const tailGeo = new THREE.CylinderGeometry(0.06, 0.02, 0.6, 8);
        const tail = new THREE.Mesh(tailGeo, dogMat);
        tail.position.set(0, 0.6, -0.7);
        tail.rotation.x = -0.5; // Curved up
        this.mesh.add(tail);
        this.tail = tail;

        this.mesh.position.copy(position);
        this.mesh.position.y = 0;
        this.scene.add(this.mesh);
    }

    update(delta, playerPosition) {
        if (!this.mesh) return;

        const dist = this.mesh.position.distanceTo(playerPosition);

        // State Logic
        if (dist > this.maxDistance) {
            this.state = 'FOLLOW';
        } else if (dist < this.minDistance) {
            this.state = 'IDLE';
        }

        // Behavior
        if (this.state === 'FOLLOW') {
            // Move towards player
            const direction = new THREE.Vector3().subVectors(playerPosition, this.mesh.position);
            direction.y = 0; // Keep on ground
            direction.normalize();

            this.velocity.copy(direction).multiplyScalar(this.speed * delta);
            this.mesh.position.add(this.velocity);

            // Look at player
            this.mesh.lookAt(playerPosition.x, this.mesh.position.y, playerPosition.z);

            // Running animation (legs move)
            const runCycle = Math.sin(Date.now() * 0.02);
            this.frontLeftLeg.rotation.x = runCycle * 0.5;
            this.frontRightLeg.rotation.x = -runCycle * 0.5;
            this.backLeftLeg.rotation.x = -runCycle * 0.5;
            this.backRightLeg.rotation.x = runCycle * 0.5;

            // Tail wag when running
            this.tail.rotation.z = Math.sin(Date.now() * 0.02) * 0.5;
        } else {
            // Idle animation (breathe)
            this.mesh.scale.y = 1 + Math.sin(Date.now() * 0.005) * 0.02;

            // Gentle tail wag
            this.tail.rotation.z = Math.sin(Date.now() * 0.01) * 0.2;
        }
    }

    interact() {
        console.log("Woof!");
        // Happy jump
        this.mesh.position.y += 0.5;
        setTimeout(() => {
            this.mesh.position.y -= 0.5;
        }, 200);

        if (this.soundManager) {
            this.soundManager.playCyberBark();
        }
    }
}
