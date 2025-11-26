import { NPC } from './NPC.js';
import { CyberDog } from './CyberDog.js';

export class EntityManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.entities = [];

        this.init();
    }

    init() {
        // Spawn some initial citizens
        for (let i = 0; i < 5; i++) {
            const x = (Math.random() - 0.5) * 20;
            const z = (Math.random() - 0.5) * 20;
            this.spawnNPC({ x, y: 0, z });
        }

        // Spawn a Pet Dog
        this.spawnDog({ x: 2, y: 0, z: 2 });

        // Interaction Listener (Key E)
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyE') {
                this.tryInteract();
            }
        });
    }

    spawnNPC(position) {
        const npc = new NPC(this.scene, position, this.camera);
        this.entities.push(npc);
    }

    spawnDog(position) {
        const dog = new CyberDog(this.scene, position, this.camera);
        this.entities.push(dog);
    }

    tryInteract() {
        // Find closest NPC
        let closest = null;
        let minDist = 5; // Interaction range

        this.entities.forEach(entity => {
            const dist = entity.mesh.position.distanceTo(this.camera.position);
            if (dist < minDist) {
                minDist = dist;
                closest = entity;
            }
        });

        if (closest) {
            closest.interact();
        }
    }

    update(delta, playerPosition) {
        this.entities.forEach(entity => entity.update(delta, playerPosition));
    }
}
