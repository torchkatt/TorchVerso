import * as THREE from 'three';

export class WorldGenerator {
    constructor(scene) {
        this.scene = scene;
        this.buildings = [];
        this.init();
    }

    init() {
        this.createFloor();
        this.generateCorporateZone();
    }

    createFloor() {
        // Checkerboard texture
        const size = 500;
        const divisions = 50;

        const geometry = new THREE.PlaneGeometry(size, size);
        const material = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.8,
            metalness: 0.2
        });

        const floor = new THREE.Mesh(geometry, material);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        const gridHelper = new THREE.GridHelper(size, divisions, 0x00ffff, 0x333333);
        gridHelper.position.y = 0.1;
        this.scene.add(gridHelper);
    }

    generateCorporateZone() {
        // Generate some random buildings
        for (let i = 0; i < 50; i++) {
            this.createBuilding();
        }
    }

    createBuilding() {
        const width = Math.random() * 5 + 5;
        const height = Math.random() * 20 + 10;
        const depth = Math.random() * 5 + 5;

        // Random Position (avoid center)
        let x = (Math.random() - 0.5) * 100;
        let z = (Math.random() - 0.5) * 100;

        if (Math.abs(x) < 10 && Math.abs(z) < 10) {
            x += 20; // Push away from spawn
        }

        // Geometry
        const geometry = new THREE.BoxGeometry(width, height, depth);

        // Material (Futuristic/Corporate)
        const material = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.2,
            metalness: 0.8
        });

        const building = new THREE.Mesh(geometry, material);
        building.position.set(x, height / 2, z);
        building.castShadow = true;
        building.receiveShadow = true;

        // Add neon strips (Emissive)
        const stripGeo = new THREE.BoxGeometry(width + 0.1, 0.5, depth + 0.1);
        const stripMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });

        // Add a few strips
        for (let y = 2; y < height; y += 4) {
            const strip = new THREE.Mesh(stripGeo, stripMat);
            strip.position.y = y - height / 2; // Relative to parent center
            building.add(strip);
        }

        this.scene.add(building);
        this.buildings.push(building);
    }
}
