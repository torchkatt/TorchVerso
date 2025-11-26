import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Environment } from './Environment.js';
import { Builder } from '../builder/Builder.js';
import { WorldGenerator } from './WorldGenerator.js';
import { EntityManager } from '../ai/EntityManager.js';
import { EconomyManager } from '../game/EconomyManager.js';
import { SaveSystem } from '../game/SaveSystem.js';
import { AuthManager } from '../firebase/AuthManager.js';
import { NetworkManager } from '../game/NetworkManager.js';
import { ChatManager } from '../game/ChatManager.js';
import { AIManager } from '../ai/AIManager.js';
import { SoundManager } from '../game/SoundManager.js';

export class SceneManager {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        this.prevTime = performance.now();

        // Physics
        this.raycaster = new THREE.Raycaster();
        this.collisionDistance = 1.5; // Minimum distance to wall

        this.controls = null;
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();

        this.init();
    }

    init() {
        // 1. Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#1a1a2e'); // Dark Blue-ish to distinguish from CSS
        this.scene.fog = new THREE.FogExp2('#1a1a2e', 0.02);

        // 2. Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        // Start player OUTSIDE the city, on a street corner
        // Height = 1.7 meters (realistic human eye level)
        this.camera.position.set(-60, 1.7, -60);
        this.camera.lookAt(0, 1.7, 0);

        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Optimize for high DPI
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
        this.container.appendChild(this.renderer.domElement);

        // 4. Environment & Lighting
        this.environment = new Environment(this.scene);

        // Audio System
        this.soundManager = new SoundManager(this.camera);

        // 5. Controls
        // 5. Controls
        this.setupControls();

        // 6. Economy (Initialize BEFORE Builder)
        this.economyManager = new EconomyManager();

        // 7. Builder System
        this.builder = new Builder(this.scene, this.camera, this.economyManager);

        // 8. World Generation
        this.worldGenerator = new WorldGenerator(this.scene);

        // 9. AI / Entities (Pass SoundManager)
        this.entityManager = new EntityManager(this.scene, this.camera, this.soundManager);

        // 10. Save System
        this.saveSystem = new SaveSystem(this);

        // 11. Auth (Connects everything)
        this.authManager = new AuthManager((user) => {
            // When logged in:
            this.saveSystem.setUser(user); // Start saving
            this.networkManager.setUser(user); // Start multiplayer
            this.chatManager.setUser(user); // Start chat
        });

        // 12. Network
        this.networkManager = new NetworkManager(this);

        // 13. Chat
        this.chatManager = new ChatManager(this);

        // 14. AI Brain
        this.aiManager = new AIManager();

        // Ask for API Key (Temporary quick prompt)
        // In production, use env vars or settings menu
        this.aiManager.init("AIzaSyDO4DwYWz_xH4H0F02iIfy8qBA0TwepCjg");

        // Cleanup on exit
        window.addEventListener('beforeunload', () => {
            this.networkManager.disconnect();
        });

        // DEBUG: Add a spinning cube right in front of camera to verify rendering
        const debugGeo = new THREE.BoxGeometry(1, 1, 1);
        const debugMat = new THREE.MeshNormalMaterial();
        this.debugCube = new THREE.Mesh(debugGeo, debugMat);
        this.debugCube.position.set(0, 5, 5); // In front of camera (0,5,10)
        this.scene.add(this.debugCube);

        // Grid Helper
        const gridHelper = new THREE.GridHelper(20, 20, 0x00ffff, 0x444444);
        this.scene.add(gridHelper);

        // Resize Handler
        window.addEventListener('resize', () => this.onWindowResize());

        // Mute Button
        const muteBtn = document.getElementById('mute-btn');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                const isMuted = this.soundManager.toggleMute();
                muteBtn.textContent = isMuted ? '🔇' : '🔊';
                muteBtn.classList.toggle('muted', isMuted);
            });
        }

        // Reset Button
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm("Are you sure you want to delete your city?")) {
                    this.saveSystem.reset();
                }
            });
        }
    }

    setupControls() {
        this.controls = new PointerLockControls(this.camera, document.body);

        // Click to lock - Listen on BODY to ensure we catch it
        const blocker = document.getElementById('blocker');
        const instructions = document.getElementById('instructions');

        instructions.addEventListener('click', () => {
            this.controls.lock();
            if (this.soundManager) {
                this.soundManager.initAmbience();
            }
        });

        this.controls.addEventListener('lock', () => {
            instructions.style.display = 'none';
            blocker.style.display = 'none';
        });

        this.controls.addEventListener('unlock', () => {
            blocker.style.display = 'block';
            instructions.style.display = '';
        });

        this.controls.addEventListener('unlock', () => {
            blocker.style.display = 'block';
            instructions.style.display = '';
        });

        this.scene.add(this.camera); // Add camera directly to scene

        const onKeyDown = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = true;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = true;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = true;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = true;
                    break;
                case 'KeyE':
                    if (this.hoveredObject) {
                        // Check if Entity
                        const entity = this.entityManager.getEntityByMesh(this.hoveredObject);
                        if (entity && typeof entity.interact === 'function') {
                            entity.interact();
                            this.entityManager.currentTarget = entity; // Set chat target
                            console.log("Interacted with Entity");
                        }
                    }
                    break;
            }
        };

        const onKeyUp = (event) => {
            switch (event.code) {
                case 'ArrowUp':
                case 'KeyW':
                    this.moveForward = false;
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    this.moveLeft = false;
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    this.moveBackward = false;
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    this.moveRight = false;
                    break;
            }
        };

        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    checkCollision(velocity) {
        // Collect all obstacles
        let obstacles = [];

        // 1. Generated Buildings
        if (this.worldGenerator && this.worldGenerator.buildings) {
            obstacles = obstacles.concat(this.worldGenerator.buildings);
        }

        // 2. Built Objects
        if (this.builder && this.builder.objects) {
            obstacles = obstacles.concat(this.builder.objects);
        }

        // Raycast in direction of movement
        const direction = velocity.clone().normalize();
        this.raycaster.set(this.camera.position, direction);

        // Lower ray origin slightly to hit walls properly (waist height)
        this.raycaster.ray.origin.y -= 1;

        const intersections = this.raycaster.intersectObjects(obstacles, false);

        if (intersections.length > 0) {
            if (intersections[0].distance < this.collisionDistance) {
                return true; // Collision detected
            }
        }
        return false;
    }

    updateDebugInfo(time) {
        // Update Debug UI
        const info = document.getElementById('debug-info');
        if (info) {
            const { x, y, z } = this.camera.position;
            const locked = this.controls.isLocked ? 'LOCKED' : 'UNLOCKED';
            const keys = [
                this.moveForward ? 'W' : '_',
                this.moveBackward ? 'S' : '_',
                this.moveLeft ? 'A' : '_',
                this.moveRight ? 'D' : '_'
            ].join(' ');

            info.innerText = `[${this.frameCount}] [${locked}] Keys: ${keys} | Pos: ${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`;
        }
    }

    update(time) {
        // Prevent huge delta on first frame or lag spikes
        let delta = (time - this.prevTime) / 1000;
        this.prevTime = time;

        if (delta > 0.1) delta = 0.1; // Clamp delta

        this.frameCount = (this.frameCount || 0) + 1;

        if (this.controls.isLocked) {
            // Movement Speed
            const speed = 15 * delta; // units per second (Reduced from 100)
            const velocity = new THREE.Vector3();

            // Direction Vector
            const direction = new THREE.Vector3();
            this.camera.getWorldDirection(direction);
            direction.y = 0;
            direction.normalize();

            const sideDirection = new THREE.Vector3();
            sideDirection.crossVectors(this.camera.up, direction);
            sideDirection.normalize();

            // Calculate intended movement
            // IMPORTANT: Clone vectors before modifying them to avoid side effects
            if (this.moveForward) velocity.add(direction.clone().multiplyScalar(speed));
            if (this.moveBackward) velocity.add(direction.clone().multiplyScalar(-speed));
            if (this.moveLeft) velocity.add(sideDirection.clone().multiplyScalar(speed));
            if (this.moveRight) velocity.add(sideDirection.clone().multiplyScalar(-speed));

            // Collision Detection
            const isColliding = this.checkCollision(velocity);

            if (velocity.length() > 0 && isColliding) {
                console.log("Collision detected! Stopping movement.");
                // Stop movement if collision detected
                velocity.set(0, 0, 0);
            } else if (velocity.length() > 0) {
                // console.log("Moving:", velocity);
            }

            // Apply movement
            this.camera.position.add(velocity);

            // Safety: Respawn if fell off world or NaN
            if (this.camera.position.y < -50 || isNaN(this.camera.position.x)) {
                console.warn("Player out of bounds or NaN, respawning...");
                this.camera.position.set(0, 5, 10);
                this.velocity.set(0, 0, 0);
            }
        }

        // Update Builder
        if (this.builder) {
            this.builder.update();
        }

        // Update AI
        if (this.entityManager) {
            this.entityManager.update(delta, this.camera.position);
        }

        // Update Economy
        if (this.economyManager) {
            this.economyManager.update(delta);
        }

        // Update Save System
        if (this.saveSystem) {
            this.saveSystem.update(delta);
        }

        // Update Network
        if (this.networkManager) {
            this.networkManager.update(delta);
        }

        // Rotate debug cube
        if (this.debugCube) {
            this.debugCube.rotation.x += delta;
            this.debugCube.rotation.y += delta;
        }

        // Update Debug UI
        const info = document.getElementById('debug-info');
        if (info) {
            const { x, y, z } = this.camera.position;
            const locked = this.controls.isLocked ? 'LOCKED' : 'UNLOCKED';
            const keys = [
                this.moveForward ? 'W' : '_',
                this.moveBackward ? 'S' : '_',
                this.moveLeft ? 'A' : '_',
                this.moveRight ? 'D' : '_'
            ].join(' ');

            info.innerText = `[${this.frameCount}] [${locked}] Keys: ${keys} | Pos: ${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`;
        }

        // Update Interaction Raycast
        this.updateInteraction();

        this.render();
    }

    updateInteraction() {
        if (!this.controls.isLocked) return;

        // Raycast from center of screen
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        // Collect interactables
        let interactables = [];
        let entityMeshes = [];

        if (this.entityManager) {
            entityMeshes = this.entityManager.getInteractables();
            interactables = interactables.concat(entityMeshes);
        }

        // Add Buildings (Optional, if we want to inspect them)
        if (this.builder && this.builder.objects) {
            interactables = interactables.concat(this.builder.objects);
        }

        const intersects = this.raycaster.intersectObjects(interactables, true); // Recursive for children
        const prompt = document.getElementById('interaction-prompt');

        if (intersects.length > 0) {
            const hit = intersects[0];

            if (hit.distance < 5) { // Interaction range
                // Find the root object (Entity or Building)
                let object = hit.object;
                // Traverse up until we find the main mesh added to scene or one we recognize
                while (object.parent && object.parent !== this.scene && !interactables.includes(object)) {
                    object = object.parent;
                }

                // Handle Hover State Change
                if (this.hoveredObject !== object) {
                    // Unhover previous
                    if (this.hoveredObject) {
                        const prevEntity = this.entityManager.getEntityByMesh(this.hoveredObject);
                        if (prevEntity && typeof prevEntity.setHovered === 'function') {
                            prevEntity.setHovered(false);
                        }
                    }
                    // Hover new
                    const newEntity = this.entityManager.getEntityByMesh(object);
                    if (newEntity && typeof newEntity.setHovered === 'function') {
                        newEntity.setHovered(true);
                    }
                }

                this.hoveredObject = object;

                // Determine what it is
                let text = "Interact";

                // Check if it's an Entity
                const entity = this.entityManager.getEntityByMesh(object);
                if (entity) {
                    text = "E - Talk to Citizen";
                    if (entity.constructor.name === "CyberDog") text = "E - Pet Dog";
                }
                // Check if it's a Building
                else if (object.userData.type) {
                    text = `Building: ${object.userData.type.toUpperCase()}`;
                }

                if (prompt) {
                    prompt.innerText = text;
                    prompt.classList.add('visible');
                }
            } else {
                // Clear hover if too far
                if (this.hoveredObject) {
                    const prevEntity = this.entityManager.getEntityByMesh(this.hoveredObject);
                    if (prevEntity && typeof prevEntity.setHovered === 'function') {
                        prevEntity.setHovered(false);
                    }
                }
                this.hoveredObject = null;
                if (prompt) prompt.classList.remove('visible');
            }
        } else {
            // Clear hover if no hit
            if (this.hoveredObject) {
                const prevEntity = this.entityManager.getEntityByMesh(this.hoveredObject);
                if (prevEntity && typeof prevEntity.setHovered === 'function') {
                    prevEntity.setHovered(false);
                }
            }
            this.hoveredObject = null;
            if (prompt) prompt.classList.remove('visible');
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    start() {
        this.renderer.setAnimationLoop((time) => {
            this.update(time);
        });
    }
}
