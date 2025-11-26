import * as THREE from 'three';

export class CyberDog {
    constructor(scene, position, playerCamera) {
        this.scene = scene;
        this.playerCamera = playerCamera;
        this.mesh = null;
        this.velocity = new THREE.Vector3();
        this.speed = 4; // Faster than NPCs

        this.state = 'IDLE'; // IDLE, FOLLOW
        this.minDistance = 3;
        this.maxDistance = 8;

        this.init(position);
    }

    init(position) {
        // Body
        const geometry = new THREE.BoxGeometry(0.4, 0.4, 0.8);
        const material = new THREE.MeshStandardMaterial({
            color: 0xffaa00, // Orange/Gold
            roughness: 0.2,
            metalness: 0.8
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.position.y = 0.5;
        this.mesh.castShadow = true;

        // Head
        const headGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const head = new THREE.Mesh(headGeo, material);
        head.position.set(0, 0.4, 0.4);
        this.mesh.add(head);

        // Ears
        const earGeo = new THREE.ConeGeometry(0.05, 0.2, 4);
        const earL = new THREE.Mesh(earGeo, material);
        earL.position.set(0.1, 0.2, 0);
        head.add(earL);

        const earR = new THREE.Mesh(earGeo, material);
        earR.position.set(-0.1, 0.2, 0);
        head.add(earR);

        // Tail
        const tailGeo = new THREE.BoxGeometry(0.1, 0.1, 0.4);
        const tail = new THREE.Mesh(tailGeo, material);
        tail.position.set(0, 0.2, -0.5);
        tail.rotation.x = Math.PI / 4;
        this.mesh.add(tail);
        this.tail = tail;

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

            // Tail wag
            this.tail.rotation.y = Math.sin(Date.now() * 0.02) * 0.5;
        } else {
            // Idle animation (pant/breathe)
            this.mesh.scale.y = 1 + Math.sin(Date.now() * 0.005) * 0.02;
        }
    }
    interact() {
        console.log("Woof! Woof!");
        // Happy jump
        this.mesh.position.y += 0.5;
        setTimeout(() => {
            this.mesh.position.y -= 0.5;
        }, 200);
    }
}
