import { db } from '../firebase/config.js';
import { doc, setDoc, onSnapshot, collection, query, where, deleteDoc } from "firebase/firestore";
import { RemotePlayer } from './RemotePlayer.js';

export class NetworkManager {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.userId = null;
        this.remotePlayers = {}; // Map of uid -> RemotePlayer

        this.updateRate = 100; // ms (10 updates per second)
        this.lastUpdate = 0;

        this.unsubscribe = null;
    }

    setUser(user) {
        this.userId = user.uid;
        console.log("Network: Connected as", this.userId);
        this.startListening();
    }

    startListening() {
        console.log("Network: Starting to listen for other players...");
        // Listen to ALL players
        // In a real game, you'd use geo-queries to only listen to nearby players
        const q = query(collection(db, "players"));

        this.unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const uid = change.doc.id;
                const data = change.doc.data();

                if (uid === this.userId) return; // Ignore self

                if (change.type === "added") {
                    console.log("Network: Player joined:", uid);
                    this.addRemotePlayer(uid, data);
                }
                if (change.type === "modified") {
                    // console.log("Network: Player moved:", uid); // Too spammy
                    this.updateRemotePlayer(uid, data);
                }
                if (change.type === "removed") {
                    console.log("Network: Player left:", uid);
                    this.removeRemotePlayer(uid);
                }
            });
        }, (error) => {
            console.error("Network: Listener Error:", error);
        });
    }

    addRemotePlayer(uid, data) {
        if (this.remotePlayers[uid]) return;
        const player = new RemotePlayer(this.sceneManager.scene, this.sceneManager.camera, uid, data);
        this.remotePlayers[uid] = player;
    }

    updateRemotePlayer(uid, data) {
        const player = this.remotePlayers[uid];
        if (player) {
            player.updateData(data);
        }
    }

    removeRemotePlayer(uid) {
        const player = this.remotePlayers[uid];
        if (player) {
            player.dispose();
            delete this.remotePlayers[uid];
        }
    }

    update(delta) {
        if (!this.userId) return;

        // 1. Update Remote Players (Interpolation)
        Object.values(this.remotePlayers).forEach(p => p.update(delta));

        // 2. Publish Local Position
        const now = Date.now();
        if (now - this.lastUpdate > this.updateRate) {
            this.publishPosition();
            this.lastUpdate = now;
        }

        // 3. Cleanup stale players (Optional, if they crash without disconnecting)
        // Could check lastSeen timestamp here
    }

    async publishPosition() {
        const camera = this.sceneManager.camera;
        if (!camera) return;

        try {
            await setDoc(doc(db, "players", this.userId), {
                x: camera.position.x,
                y: camera.position.y,
                z: camera.position.z,
                rotation: camera.rotation.y, // Only Y rotation matters for avatar
                lastSeen: Date.now()
            });
        } catch (e) {
            console.error("Network: Error publishing position:", e);
        }
    }

    disconnect() {
        if (this.unsubscribe) this.unsubscribe();
        // Remove self from DB
        if (this.userId) {
            deleteDoc(doc(db, "players", this.userId));
        }
    }
}
