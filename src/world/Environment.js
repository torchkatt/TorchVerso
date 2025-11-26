import * as THREE from 'three';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.init();
    }

    init() {
        // 1. Background (Sky Blue)
        this.scene.background = new THREE.Color(0x87CEEB);

        // 2. Fog (Matches Sky)
        // FogExp2 gives a realistic exponential fog
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.015);

        // 3. Lighting (Daylight)
        // Hemisphere Light: Sky color (Blue) -> Ground color (Greenish)
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);

        // Directional Light (Sun)
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(50, 100, 50);
        dirLight.castShadow = true;

        // Shadow properties for better quality
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 500;
        dirLight.shadow.camera.left = -100;
        dirLight.shadow.camera.right = 100;
        dirLight.shadow.camera.top = 100;
        dirLight.shadow.camera.bottom = -100;

        this.scene.add(dirLight);

        // 4. Ground (Grass-like)
        const groundGeo = new THREE.PlaneGeometry(2000, 2000);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x4caf50, // Green grass
            roughness: 1,
            metalness: 0
        });

        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Grid Helper (Subtle white for reference)
        const grid = new THREE.GridHelper(2000, 1000, 0xffffff, 0xffffff);
        grid.material.opacity = 0.2;
        grid.material.transparent = true;
        this.scene.add(grid);
    }
}
