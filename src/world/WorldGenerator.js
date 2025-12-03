import * as THREE from 'three';

export class WorldGenerator {
    constructor(scene, landManager) {
        this.scene = scene;
        this.landManager = landManager;
        this.buildings = [];
        this.interactables = []; // Store interactable objects like signs

        // Simple clean city grid
        this.blockSize = 30; // Size of each block
        this.streetWidth = 10; // Street width
        this.sidewalkWidth = 2;
        this.citySize = 5; // 5x5 blocks (increased from 3x3 for more real estate)

        this.init();
    }

    init() {
        this.createGround();
        this.createStreetGrid();
        this.createBuildings();
        this.createStreetDetails();
    }

    createGround() {
        // Base ground
        const groundGeo = new THREE.PlaneGeometry(400, 400);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x2d5016, // Grass
            roughness: 0.9
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    createStreetGrid() {
        const totalSpan = this.citySize * (this.blockSize + this.streetWidth);
        const asphaltMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.9
        });

        const sidewalkMat = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.8
        });

        // Create horizontal and vertical streets
        for (let i = 0; i <= this.citySize; i++) {
            const offset = i * (this.blockSize + this.streetWidth) - totalSpan / 2;

            // Horizontal street (goes along X axis)
            const hStreetGeo = new THREE.PlaneGeometry(totalSpan, this.streetWidth);
            const hStreet = new THREE.Mesh(hStreetGeo, asphaltMat);
            hStreet.rotation.x = -Math.PI / 2;
            hStreet.position.set(0, 0.01, offset);
            hStreet.receiveShadow = true;
            this.scene.add(hStreet);

            // Sidewalks for horizontal street
            const swGeo = new THREE.PlaneGeometry(totalSpan, this.sidewalkWidth);
            const swNorth = new THREE.Mesh(swGeo, sidewalkMat);
            swNorth.rotation.x = -Math.PI / 2;
            swNorth.position.set(0, 0.15, offset - this.streetWidth / 2 - this.sidewalkWidth / 2);
            this.scene.add(swNorth);

            const swSouth = new THREE.Mesh(swGeo, sidewalkMat);
            swSouth.rotation.x = -Math.PI / 2;
            swSouth.position.set(0, 0.15, offset + this.streetWidth / 2 + this.sidewalkWidth / 2);
            this.scene.add(swSouth);

            // Vertical street (goes along Z axis)
            const vStreetGeo = new THREE.PlaneGeometry(this.streetWidth, totalSpan);
            const vStreet = new THREE.Mesh(vStreetGeo, asphaltMat);
            vStreet.rotation.x = -Math.PI / 2;
            vStreet.position.set(offset, 0.01, 0);
            vStreet.receiveShadow = true;
            this.scene.add(vStreet);

            // Sidewalks for vertical street
            const swvGeo = new THREE.PlaneGeometry(this.sidewalkWidth, totalSpan);
            const swEast = new THREE.Mesh(swvGeo, sidewalkMat);
            swEast.rotation.x = -Math.PI / 2;
            swEast.position.set(offset - this.streetWidth / 2 - this.sidewalkWidth / 2, 0.15, 0);
            this.scene.add(swEast);

            const swWest = new THREE.Mesh(swvGeo, sidewalkMat);
            swWest.rotation.x = -Math.PI / 2;
            swWest.position.set(offset + this.streetWidth / 2 + this.sidewalkWidth / 2, 0.15, 0);
            this.scene.add(swWest);
        }
    }

    createBuildings() {
        const totalSpan = this.citySize * (this.blockSize + this.streetWidth);

        // For each block in the grid
        for (let bx = 0; bx < this.citySize; bx++) {
            for (let bz = 0; bz < this.citySize; bz++) {
                // Calculate block center
                const blockCenterX = bx * (this.blockSize + this.streetWidth) + this.blockSize / 2 - totalSpan / 2 + this.streetWidth;
                const blockCenterZ = bz * (this.blockSize + this.streetWidth) + this.blockSize / 2 - totalSpan / 2 + this.streetWidth;

                // Decide block type: 70% land plots (PRIORITY), 30% buildings
                const blockType = Math.random();
                if (blockType < 0.7) {
                    // Dedicated LAND BLOCK - only plots for sale (MAIN BUSINESS)
                    this.populateLandBlock(blockCenterX, blockCenterZ);
                } else {
                    // Building block - shops and offices
                    this.populateBuildingBlock(blockCenterX, blockCenterZ);
                }
            }
        }
    }

    populateLandBlock(centerX, centerZ) {
        // This block is dedicated to land plots
        // Plot size: 10x10, so spacing must be >10 to prevent overlap
        const plotSpacing = 11; // Tight but safe spacing (plot is 10x10)
        const halfBlock = this.blockSize / 2;
        const safeMargin = this.streetWidth / 2 + this.sidewalkWidth + 3;

        // Create plots in a grid within the block
        for (let offsetX = -halfBlock + safeMargin; offsetX < halfBlock - safeMargin; offsetX += plotSpacing) {
            for (let offsetZ = -halfBlock + safeMargin; offsetZ < halfBlock - safeMargin; offsetZ += plotSpacing) {
                const x = centerX + offsetX;
                const z = centerZ + offsetZ;
                // Keep rotation consistent for clean grid
                const rotation = 0; // Aligned grid
                this.createEmptyPlot(x, z, rotation);
            }
        }
    }

    populateBuildingBlock(centerX, centerZ) {
        // Buildings on all 4 sides but WELL INSIDE the block
        const spacing = 12; // Space between buildings
        const halfBlock = this.blockSize / 2;
        // CRITICAL: Buildings must be at least this far from street edge
        const safeMargin = this.streetWidth / 2 + this.sidewalkWidth + 3;

        // Helper to build structures (no more random plots here)
        const placeBuilding = (x, z, rotation) => {
            const type = Math.random();
            if (type < 0.5) this.createShop(x, z, rotation);
            else this.createOfficeBuilding(x, z, rotation);
        };

        // North side (buildings facing south)
        let x = centerX - halfBlock + safeMargin;
        const northZ = centerZ - halfBlock + safeMargin + 3;
        while (x < centerX + halfBlock - safeMargin) {
            placeBuilding(x, northZ, 0);
            x += spacing;
        }

        // South side (buildings facing north)
        x = centerX - halfBlock + safeMargin;
        const southZ = centerZ + halfBlock - safeMargin - 3;
        while (x < centerX + halfBlock - safeMargin) {
            placeBuilding(x, southZ, Math.PI);
            x += spacing;
        }

        // West side (buildings facing east)
        let z = centerZ - halfBlock + safeMargin;
        const westX = centerX - halfBlock + safeMargin + 3;
        while (z < centerZ + halfBlock - safeMargin) {
            placeBuilding(westX, z, Math.PI / 2);
            z += spacing;
        }

        // East side (buildings facing west)
        z = centerZ - halfBlock + safeMargin;
        const eastX = centerX + halfBlock - safeMargin - 3;
        while (z < centerZ + halfBlock - safeMargin) {
            placeBuilding(eastX, z, -Math.PI / 2);
            z += spacing;
        }
    }

    createEmptyPlot(x, z, rotation) {
        // Plot visual boundary
        const width = 10;
        const depth = 10;

        // Ground plane (subtle)
        const plotGeo = new THREE.PlaneGeometry(width, depth);
        const plotMat = new THREE.MeshBasicMaterial({
            color: 0x0088ff,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide
        });
        const plot = new THREE.Mesh(plotGeo, plotMat);
        plot.rotation.x = -Math.PI / 2;
        plot.position.set(x, 0.05, z);
        this.scene.add(plot);

        // Holographic border (animated lines)
        const borderGroup = new THREE.Group();
        const borderMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8
        });

        // Create 4 border edges
        const edgeHeight = 1.5;
        const edgeThickness = 0.05;

        // North edge
        const northEdge = new THREE.Mesh(
            new THREE.BoxGeometry(width, edgeHeight, edgeThickness),
            borderMat
        );
        northEdge.position.set(0, edgeHeight / 2, depth / 2);
        borderGroup.add(northEdge);

        // South edge
        const southEdge = new THREE.Mesh(
            new THREE.BoxGeometry(width, edgeHeight, edgeThickness),
            borderMat
        );
        southEdge.position.set(0, edgeHeight / 2, -depth / 2);
        borderGroup.add(southEdge);

        // East edge
        const eastEdge = new THREE.Mesh(
            new THREE.BoxGeometry(edgeThickness, edgeHeight, depth),
            borderMat
        );
        eastEdge.position.set(width / 2, edgeHeight / 2, 0);
        borderGroup.add(eastEdge);

        // West edge
        const westEdge = new THREE.Mesh(
            new THREE.BoxGeometry(edgeThickness, edgeHeight, depth),
            borderMat
        );
        westEdge.position.set(-width / 2, edgeHeight / 2, 0);
        borderGroup.add(westEdge);

        borderGroup.position.set(x, 0, z);
        this.scene.add(borderGroup);

        // "FOR SALE" Sign (improved)
        const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.5);
        const poleMat = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.7,
            roughness: 0.3
        });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(x, 1.25, z);
        pole.castShadow = true;
        this.scene.add(pole);

        const signGeo = new THREE.BoxGeometry(2, 1.2, 0.1);
        const signMat = new THREE.MeshStandardMaterial({
            color: 0xff3333,
            emissive: 0xff0000,
            emissiveIntensity: 0.6,
            metalness: 0.3,
            roughness: 0.4
        });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, 1.5, 0);
        pole.add(sign);

        // SE VENDE text (white bars)
        const textGeo = new THREE.PlaneGeometry(1.6, 0.25);
        const textMat = new THREE.MeshBasicMaterial({
            color: 0xffffff
        });

        const text1 = new THREE.Mesh(textGeo, textMat);
        text1.position.set(0, 0.3, 0.06);
        sign.add(text1);

        const text2 = new THREE.Mesh(textGeo, textMat);
        text2.position.set(0, 0, 0.06);
        sign.add(text2);

        const text3 = new THREE.Mesh(textGeo, textMat);
        text3.position.set(0, -0.3, 0.06);
        sign.add(text3);

        pole.rotation.y = rotation;

        // Register with LandManager if available
        if (this.landManager) {
            const id = `plot_${Math.floor(x)}_${Math.floor(z)}`;
            const price = Math.floor(Math.random() * 5000) + 5000; // $5k - $10k
            this.landManager.registerPlot(id, price, new THREE.Vector3(x, 0, z), { width, depth });

            // Link meshes for updates
            const plotData = this.landManager.plots.get(id);
            if (plotData) {
                plotData.mesh = plot;
                plotData.borderGroup = borderGroup;
                plotData.signMesh = sign;
            }

            // Add to interactables
            sign.userData = {
                isInteractable: true,
                type: 'land_sign',
                plotId: id
            };
            this.interactables.push(sign);
        }
    }

    createStreetDetails() {
        const totalSpan = this.citySize * (this.blockSize + this.streetWidth);

        // Street lamps along sidewalks, evenly spaced
        for (let i = 0; i <= this.citySize; i++) {
            const streetOffset = i * (this.blockSize + this.streetWidth) - totalSpan / 2;

            // Every 20 units along the streets
            for (let pos = -totalSpan / 2; pos < totalSpan / 2; pos += 20) {
                // Along horizontal streets
                this.createStreetLamp(pos, streetOffset + this.streetWidth / 2 + this.sidewalkWidth);
                this.createStreetLamp(pos, streetOffset - this.streetWidth / 2 - this.sidewalkWidth);

                // Along vertical streets
                this.createStreetLamp(streetOffset + this.streetWidth / 2 + this.sidewalkWidth, pos);
                this.createStreetLamp(streetOffset - this.streetWidth / 2 - this.sidewalkWidth, pos);
            }
        }

        // Trees next to some lamps
        for (let i = 0; i <= this.citySize; i++) {
            const streetOffset = i * (this.blockSize + this.streetWidth) - totalSpan / 2;

            for (let pos = -totalSpan / 2; pos < totalSpan / 2; pos += 30) {
                if (Math.random() > 0.5) {
                    const treeOffset = this.streetWidth / 2 + this.sidewalkWidth / 2;
                    this.createTree(pos, streetOffset + treeOffset);
                    this.createTree(pos, streetOffset - treeOffset);
                    this.createTree(streetOffset + treeOffset, pos);
                    this.createTree(streetOffset - treeOffset, pos);
                }
            }
        }
    }

    createStreetLamp(x, z) {
        const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 5, 8),
            new THREE.MeshStandardMaterial({ color: 0x444444 })
        );
        pole.position.set(x, 2.5, z);
        pole.castShadow = true;
        this.scene.add(pole);

        const lamp = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 16, 16),
            new THREE.MeshStandardMaterial({
                color: 0xffffaa,
                emissive: 0xffffaa,
                emissiveIntensity: 0.5
            })
        );
        lamp.position.set(x, 5.2, z);
        this.scene.add(lamp);
    }

    createTree(x, z) {
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.3, 3, 8),
            new THREE.MeshStandardMaterial({ color: 0x4a3520 })
        );
        trunk.position.set(x, 1.5, z);
        trunk.castShadow = true;
        this.scene.add(trunk);

        const foliage = new THREE.Mesh(
            new THREE.SphereGeometry(1.5, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x2d5016 })
        );
        foliage.position.set(x, 4, z);
        foliage.castShadow = true;
        this.scene.add(foliage);
    }

    createShop(x, z, rotation = 0) {
        const shop = new THREE.Group();

        const baseGeo = new THREE.BoxGeometry(8, 5, 6);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 2.5;
        base.castShadow = true;
        base.receiveShadow = true;
        shop.add(base);

        const roofGeo = new THREE.BoxGeometry(8.5, 0.5, 6.5);
        const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0x666666 }));
        roof.position.y = 5.25;
        shop.add(roof);

        const signGeo = new THREE.BoxGeometry(7, 1, 0.2);
        const signMat = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 0.5
        });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, 4.5, 3.1);
        shop.add(sign);

        const windowGeo = new THREE.BoxGeometry(6, 2.5, 0.1);
        const window = new THREE.Mesh(windowGeo, new THREE.MeshStandardMaterial({
            color: 0x87ceeb,
            transparent: true,
            opacity: 0.6
        }));
        window.position.set(0, 2, 3.05);
        shop.add(window);

        shop.position.set(x, 0, z);
        shop.rotation.y = rotation;
        this.scene.add(shop);
        this.buildings.push(base);
    }

    createOfficeBuilding(x, z, rotation = 0) {
        const building = new THREE.Group();
        const height = Math.random() * 15 + 10;

        const baseGeo = new THREE.BoxGeometry(7, height, 7);
        const base = new THREE.Mesh(baseGeo, new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.3,
            metalness: 0.7
        }));
        base.position.y = height / 2;
        base.castShadow = true;
        base.receiveShadow = true;
        building.add(base);

        const windowMat = new THREE.MeshStandardMaterial({
            color: 0xffffaa,
            emissive: 0xffff88,
            emissiveIntensity: 0.3
        });

        for (let floor = 1; floor < height / 2; floor += 2) {
            const windowRow = new THREE.BoxGeometry(6.5, 0.8, 0.1);
            for (let side = 0; side < 4; side++) {
                const win = new THREE.Mesh(windowRow, windowMat);
                win.position.y = floor - height / 2;

                if (side === 0) win.position.set(0, 0, 3.55);
                else if (side === 1) win.position.set(0, 0, -3.55);
                else if (side === 2) {
                    win.position.set(3.55, 0, 0);
                    win.rotation.y = Math.PI / 2;
                } else {
                    win.position.set(-3.55, 0, 0);
                    win.rotation.y = Math.PI / 2;
                }

                building.add(win);
            }
        }

        building.position.set(x, 0, z);
        building.rotation.y = rotation;
        this.scene.add(building);
        this.buildings.push(base);
    }
}
