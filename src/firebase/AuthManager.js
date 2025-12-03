import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth } from "./config.js";

export class AuthManager {
    constructor(onLogin) {
        this.user = null;
        this.onLogin = onLogin; // Callback when user logs in
        this.init();
    }

    init() {
        // Listen for auth state changes
        onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log("Auth: User signed in anonymously", user.uid);
                this.user = user;
                if (this.onLogin) this.onLogin(user);
                if (this.authReadyCallback) this.authReadyCallback(user);
            } else {
                console.log("Auth: User signed out");
                this.user = null;
            }
        });

        // Auto sign-in anonymously
        signInAnonymously(auth)
            .catch((error) => {
                console.error("Auth Error:", error);
            });
    }

    onAuthReady(callback) {
        this.authReadyCallback = callback;
        // If already logged in, trigger immediately
        if (this.user) {
            callback(this.user);
        }
    }

    getCurrentUser() {
        return this.user;
    }
}
