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
import { LandManager } from '../economy/LandManager.js';

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
        this.landManager = null; // New LandManager

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

        // 7. Land Management
        this.landManager = new LandManager(this.scene, this.camera, this.container); // Init LandManager

        // 8. Builder System (pass landManager for ownership checks)
        this.builder = new Builder(this.scene, this.camera, this.economyManager, this.landManager);

        // 9. World Generation
        this.worldGenerator = new WorldGenerator(this.scene, this.landManager); // Pass to Generator

        // 10. AI / Entities (Pass SoundManager)
        this.entityManager = new EntityManager(this.scene, this.camera, this.soundManager);

        // 11. Save System
        this.saveSystem = new SaveSystem(this);

        // 12. Auth (Connects everything)
        this.authManager = new AuthManager();
        this.authManager.onAuthReady((user) => {
            this.saveSystem.setUser(user); // Enable cloud saves
            this.landManager.setUser(user.uid); // Set userId for land ownership
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
                        // Check if it's a land sign
                        if (this.hoveredObject.userData.type === 'land_sign') {
                            const plotId = this.hoveredObject.userData.plotId;
                            if (plotId && this.landManager) {
                                this.landManager.interactWithPlot(plotId);
                                console.log("Interacted with Land Sign:", plotId);
                            }
                        }
                        // Check if Entity (NPC)
                        else {
                            const entity = this.entityManager.getEntityByMesh(this.hoveredObject);
                            if (entity && typeof entity.interact === 'function') {
                                entity.interact();
                                this.entityManager.currentTarget = entity;
                                console.log("Interacted with Entity");
                            }
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

    updateDebugInfo() {
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

            this.frameCount = (this.frameCount || 0) + 1;
            info.innerText = `[${this.frameCount}] [${locked}] Keys: ${keys} | Pos: ${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`;
        }
    }

    checkInteractions() {
        if (!this.controls.isLocked) return;

        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        // Collect interactables
        let interactables = [];

        // Entities
        if (this.entityManager) {
            interactables = interactables.concat(this.entityManager.getInteractables());
        }

        // Land Signs
        if (this.worldGenerator && this.worldGenerator.interactables) {
            interactables = interactables.concat(this.worldGenerator.interactables);
            // DEBUG
            if (this.worldGenerator.interactables.length > 0 && Math.random() < 0.01) {
                console.log("Land signs available:", this.worldGenerator.interactables.length);
            }
        }

        const intersects = this.raycaster.intersectObjects(interactables, true);
        const prompt = document.getElementById('interaction-prompt');

        if (intersects.length > 0) {
            const hit = intersects[0];
            if (hit.distance < 5) {
                let object = hit.object;

                // Traverse up to find object with userData
                // This handles cases where we hit a child mesh (like text bars on the sign)
                let maxIterations = 10;
                let iterations = 0;
                while (iterations < maxIterations) {
                    if (object.userData && object.userData.isInteractable) {
                        break; // Found it
                    }
                    if (object.parent && object.parent !== this.scene) {
                        object = object.parent;
                    } else {
                        break; // Reached scene or no parent
                    }
                    iterations++;
                }

                if (object.userData && object.userData.isInteractable) {
                    // Show prompt
                    if (prompt) {
                        if (object.userData.type === 'land_sign') {
                            prompt.innerText = "E - Ver Terreno";
                        } else if (object.userData.type === 'npc') {
                            prompt.innerText = "E - Hablar";
                        } else {
                            prompt.innerText = "E - Interactuar";
                        }
                        prompt.classList.add('visible');
                    }
                    this.hoveredObject = object;
                    return;
                }
            }
        }

        // No interaction
        if (prompt) prompt.classList.remove('visible');
        this.hoveredObject = null;
    }

    handleMovement(delta) {
        // Safety checks
        if (!this.velocity) this.velocity = new THREE.Vector3();
        if (!this.direction) this.direction = new THREE.Vector3();

        const speed = 3.5; // Realistic walking speed (reduced from 10.0)

        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;

        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();

        if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * 150.0 * delta;
        if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * 150.0 * delta;

        // Predict next position for collision
        const nextVelocity = this.velocity.clone().multiplyScalar(delta);

        if (!this.checkCollision(nextVelocity)) {
            this.controls.moveRight(-this.velocity.x * delta);
            this.controls.moveForward(-this.velocity.z * delta);
        } else {
            // Simple stop on collision
            this.velocity.x = 0;
            this.velocity.z = 0;
        }
    }

    update(time) {
        const delta = this.clock.getDelta();

        if (this.controls.isLocked) {
            this.handleMovement(delta);
        }

        // Update Managers
        if (this.entityManager) this.entityManager.update(delta, this.camera.position);
        if (this.builder) this.builder.update();
        if (this.soundManager) this.soundManager.update(delta);
        if (this.landManager) this.landManager.update();
        if (this.economyManager) this.economyManager.update(delta);
        if (this.saveSystem) this.saveSystem.update(delta);
        if (this.networkManager) this.networkManager.update(delta);

        // Rotate debug cube
        if (this.debugCube) {
            this.debugCube.rotation.x += delta;
            this.debugCube.rotation.y += delta;
        }

        this.updateDebugInfo();
        this.checkInteractions();

        this.renderer.render(this.scene, this.camera);
    }

    start() {
        this.renderer.setAnimationLoop((time) => {
            this.update(time);
        });
    }
}