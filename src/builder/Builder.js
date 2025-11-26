import * as THREE from 'three';

export class Builder {
    constructor(scene, camera, economyManager) {
        this.scene = scene;
        this.camera = camera;
        this.economyManager = economyManager; // Dependency Injection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.isActive = false; // Start disabled
        this.gridSize = 1;

        this.ghostMesh = null;
        this.objects = []; // Store placed objects

        // Prefab Configuration
        this.prefabs = {
            office: {
                geometry: new THREE.BoxGeometry(4, 10, 4),
                material: new THREE.MeshStandardMaterial({
                    color: 0x00aaff,
                    roughness: 0.2,
                    metalness: 0.8
                }),
                offsetY: 5,
                cost: 500,
                income: 5 // Income per second
            },
            residential: {
                geometry: new THREE.BoxGeometry(3, 4, 3),
                material: new THREE.MeshStandardMaterial({
                    color: 0xffaa00,
                    roughness: 0.5
                }),
                offsetY: 2,
                cost: 200,
                income: 2
            },
            park: {
                geometry: new THREE.CylinderGeometry(2, 2, 0.5, 16),
                material: new THREE.MeshStandardMaterial({
                    color: 0x00ff44,
                    roughness: 1
                }),
                offsetY: 0.25,
                cost: 100,
                income: 1
            },
            lamp: {
                geometry: new THREE.CylinderGeometry(0.1, 0.1, 4, 8),
                material: new THREE.MeshStandardMaterial({
                    color: 0x333333,
                    roughness: 0.5
                }),
                offsetY: 2,
                cost: 50,
                income: 0
            },
            bench: {
                geometry: new THREE.BoxGeometry(2, 0.5, 0.8),
                material: new THREE.MeshStandardMaterial({
                    color: 0x8d6e63, // Wood color
                    roughness: 0.9
                }),
                offsetY: 0.25,
                cost: 25,
                income: 0
            }
        };

        this.currentType = 'office';
        this.rotation = 0;

        this.init();
    }

    init() {
        // Don't show ghost initially
        // this.updateGhost(); 

        // Event listeners
        document.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('keydown', (e) => this.onKeyDown(e));

        // UI Listeners
        const tools = document.querySelectorAll('.tool-item');
        tools.forEach(tool => {
            tool.addEventListener('click', () => {
                // Remove active class from all
                tools.forEach(t => t.classList.remove('active'));
                // Add to clicked
                tool.classList.add('active');
                // Set type
                this.setType(tool.dataset.type);
            });
        });

        // Hide toolbar initially
        const toolbar = document.getElementById('toolbar');
        if (toolbar) toolbar.style.display = 'none';
    }

    setType(type) {
        if (this.prefabs[type]) {
            this.currentType = type;
            if (this.isActive) {
                this.updateGhost();
            }
        }
    }

    updateGhost() {
        if (this.ghostMesh) {
            this.scene.remove(this.ghostMesh);
        }

        const prefab = this.prefabs[this.currentType];
        const material = prefab.material.clone();
        material.transparent = true;
        material.opacity = 0.5;
        material.emissive = material.color;
        material.emissiveIntensity = 0.5;

        this.ghostMesh = new THREE.Mesh(prefab.geometry, material);
        this.scene.add(this.ghostMesh);
    }

    onKeyDown(event) {
        if (event.code === 'KeyC') {
            this.toggleBuildMode();
        }

        if (!this.isActive) return; // Ignore other keys if not building

        if (event.code === 'KeyR') {
            this.rotation += Math.PI / 2;
        }
        // Number keys for selection
        if (event.code === 'Digit1') this.selectByIndex(0);
        if (event.code === 'Digit2') this.selectByIndex(1);
        if (event.code === 'Digit3') this.selectByIndex(2);
    }

    toggleBuildMode() {
        this.isActive = !this.isActive;
        const toolbar = document.getElementById('toolbar');

        if (this.isActive) {
            console.log("Builder: ON");
            this.updateGhost();
            if (toolbar) toolbar.style.display = 'flex';
        } else {
            console.log("Builder: OFF");
            if (this.ghostMesh) {
                this.scene.remove(this.ghostMesh);
                this.ghostMesh = null;
            }
            if (toolbar) toolbar.style.display = 'none';
        }
    }

    selectByIndex(index) {
        const types = Object.keys(this.prefabs);
        if (index < types.length) {
            const type = types[index];
            this.setType(type);

            // Update UI
            const tools = document.querySelectorAll('.tool-item');
            tools.forEach(t => t.classList.remove('active'));
            if (tools[index]) tools[index].classList.add('active');
        }
    }

    update() {
        if (!this.isActive || !this.ghostMesh) return;

        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const target = new THREE.Vector3();

        this.raycaster.ray.intersectPlane(plane, target);

        if (target) {
            const x = Math.round(target.x / this.gridSize) * this.gridSize;
            const z = Math.round(target.z / this.gridSize) * this.gridSize;

            const prefab = this.prefabs[this.currentType];
            this.ghostMesh.position.set(x, prefab.offsetY, z);
            this.ghostMesh.rotation.y = this.rotation;
        }
    }

    onMouseDown(event) {
        // Only build if pointer is locked (playing)
        if (!document.pointerLockElement) return;

        if (!this.isActive) return; // Don't build if mode is off

        if (event.button !== 0) return; // Only left click

        // Check Cost
        const prefab = this.prefabs[this.currentType];
        if (this.economyManager) {
            if (!this.economyManager.spend(prefab.cost)) {
                this.economyManager.showFloatingText("Insufficient Funds!", "#ff0000");
                return; // Cancel build
            }

            // Add Income
            if (prefab.income > 0) {
                this.economyManager.addIncomeSource(prefab.income);
            }
        }

        const object = new THREE.Mesh(prefab.geometry, prefab.material);

        object.position.copy(this.ghostMesh.position);
        object.rotation.y = this.rotation;
        object.castShadow = true;
        object.receiveShadow = true;
        object.userData.type = this.currentType; // For SaveSystem

        this.scene.add(object);
        this.objects.push(object);

        // Visual feedback for placement
        if (this.economyManager) {
            this.economyManager.showFloatingText(`-${prefab.cost}`, "#ffd700");
        }
    }
}
