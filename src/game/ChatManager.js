import { db } from '../firebase/config.js';
import { collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from "firebase/firestore";

export class ChatManager {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.userId = null;
        this.userName = "User-" + Math.floor(Math.random() * 1000); // Temporary name

        this.chatHistory = document.getElementById('chat-history');
        this.chatInput = document.getElementById('chat-input');

        this.unsubscribe = null;

        this.setupUI();
    }

    setUser(user) {
        this.userId = user.uid;
        // In a real app, fetch username from profile
        this.subscribe();
    }

    setupUI() {
        if (!this.chatInput) return;

        // Handle Enter key
        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const text = this.chatInput.value.trim();
                if (text) {
                    this.sendMessage(text);
                    this.chatInput.value = '';
                    this.chatInput.blur(); // Unfocus to return control to game
                }
            }
        });

        // Prevent game controls while typing
        this.chatInput.addEventListener('focus', () => {
            if (this.sceneManager.controls) {
                this.sceneManager.controls.unlock(); // Unlock pointer to type
            }
        });
    }

    async sendMessage(text) {
        if (!this.userId) return;

        // Check if talking to NPC
        const entityManager = this.sceneManager.entityManager;
        const target = entityManager ? entityManager.getCurrentTarget() : null;

        if (target && typeof target.talkToAI === 'function') {
            // Talk to AI
            this.addMessageToUI({ senderName: "You", text: text }); // Show my msg locally
            target.talkToAI(text, this.sceneManager.aiManager);
            return; // Don't send to global chat
        }

        // Global Chat
        try {
            await addDoc(collection(db, "messages"), {
                text: text,
                senderId: this.userId,
                senderName: this.userName,
                timestamp: serverTimestamp()
            });
        } catch (e) {
            console.error("Chat: Error sending message:", e);
        }
    }

    subscribe() {
        const q = query(
            collection(db, "messages"),
            orderBy("timestamp", "desc"),
            limit(50)
        );

        this.unsubscribe = onSnapshot(q, (snapshot) => {
            // Clear current list to avoid dupes/reordering issues (simple approach)
            // Ideally, handle added/modified events individually for performance
            this.chatHistory.innerHTML = '';

            const messages = [];
            snapshot.forEach((doc) => {
                messages.push({ id: doc.id, ...doc.data() });
            });

            // Reverse to show oldest at top, newest at bottom
            messages.reverse().forEach(msg => {
                this.addMessageToUI(msg);

                // Trigger visual bubble if it's a recent message (less than 5s old)
                // And not from self (optional, maybe show self bubble too)
                if (msg.timestamp) { // Timestamp might be null immediately after send (latency compensation)
                    const now = Date.now();
                    const msgTime = msg.timestamp.toMillis();
                    if (now - msgTime < 5000) {
                        this.showBubble(msg);
                    }
                }
            });

            // Scroll to bottom
            this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
        });
    }

    addMessageToUI(msg) {
        const div = document.createElement('div');
        div.className = 'chat-message';

        const authorSpan = document.createElement('span');
        authorSpan.className = 'author';
        authorSpan.innerText = msg.senderName + ":";

        const textSpan = document.createElement('span');
        textSpan.innerText = msg.text;

        div.appendChild(authorSpan);
        div.appendChild(textSpan);

        this.chatHistory.appendChild(div);
    }

    showBubble(msg) {
        // If message is from another player, find them and show bubble
        if (msg.senderId !== this.userId) {
            const network = this.sceneManager.networkManager;
            if (network && network.remotePlayers[msg.senderId]) {
                network.remotePlayers[msg.senderId].showChatBubble(msg.text);
            }
        } else {
            // Show bubble on self? (Need reference to self mesh or just UI)
            // For now, skip self bubble
        }
    }
}
