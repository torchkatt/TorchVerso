import * as THREE from 'three';
import { db } from '../firebase/config.js';
import { doc, setDoc, getDoc } from "firebase/firestore";

export class SaveSystem {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.autoSaveInterval = 10000; // 10 seconds
        this.timer = 0;
        this.userId = null;

        // Wait for Auth to provide User ID
    }

    setUser(user) {
        this.userId = user.uid;
        console.log("SaveSystem: User set", this.userId);
        this.load(); // Load data once user is available
    }

    update(delta) {
        if (!this.userId) return; // Don't save if not logged in

        this.timer += delta;
        if (this.timer >= this.autoSaveInterval / 1000) {
            this.save();
            this.timer = 0;
        }
    }

    async save() {
        if (!this.userId) return;

        const economy = this.sceneManager.economyManager;
        const builder = this.sceneManager.builder;
        const landManager = this.sceneManager.landManager;

        if (!economy || !builder || !landManager) return;

        const data = {
            economy: {
                balance: economy.balance,
                incomeRate: economy.incomeRate
            },
            land: landManager.exportData(),
            buildings: builder.objects.map(obj => {
                return {
                    type: obj.userData.type,
                    x: obj.position.x,
                    y: obj.position.y,
                    z: obj.position.z,
                    rotation: obj.rotation.y
                };
            }).filter(b => b.type),
            lastSaved: new Date().toISOString()
        };

        try {
            await setDoc(doc(db, "cities", this.userId), data);
            console.log('Game Saved to Cloud');
            economy.showFloatingText("Cloud Save", "#00aaff");
        } catch (e) {
            console.error("Error saving to cloud:", e);
        }
    }

    async load() {
        if (!this.userId) return;

        try {
            const docRef = doc(db, "cities", this.userId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log("Cloud Data found:", data);

                // 1. Load Economy
                if (data.economy) {
                    const economy = this.sceneManager.economyManager;
                    economy.balance = data.economy.balance;
                    economy.incomeRate = data.economy.incomeRate;
                    economy.updateUI();
                }

                // 2. Load Land
                if (data.land) {
                    const landManager = this.sceneManager.landManager;
                    if (landManager) landManager.importData(data.land);
                }

                // 3. Load Buildings
                if (data.buildings && Array.isArray(data.buildings)) {
                    const builder = this.sceneManager.builder;

                    // Clear existing objects first (optional, but good practice to avoid dupes on re-load)
                    // builder.clear(); 

                    data.buildings.forEach(bData => {
                        const prefab = builder.prefabs[bData.type];
                        if (prefab) {
                            const mesh = new THREE.Mesh(prefab.geometry, prefab.material);
                            mesh.position.set(bData.x, bData.y, bData.z);
                            mesh.rotation.y = bData.rotation;
                            mesh.castShadow = true;
                            mesh.receiveShadow = true;
                            mesh.userData.type = bData.type;

                            builder.scene.add(mesh);
                            builder.objects.push(mesh);
                        }
                    });
                }
                console.log('Game Loaded from Cloud');
            } else {
                console.log("No cloud save found. Starting fresh.");
            }
        } catch (e) {
            console.error('Failed to load cloud save:', e);
        }
    }

    async reset() {
        if (!this.userId) return;
        // To reset, we just overwrite with empty data or delete the doc.
        // Let's overwrite with initial state.
        const initialData = {
            economy: { balance: 1000, incomeRate: 0 },
            land: { wallet: 50000, ownedPlots: [] },
            buildings: []
        };
        await setDoc(doc(db, "cities", this.userId), initialData);
        location.reload();
    }
}
