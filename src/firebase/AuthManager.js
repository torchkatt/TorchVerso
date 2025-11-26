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

    getCurrentUser() {
        return this.user;
    }
}
