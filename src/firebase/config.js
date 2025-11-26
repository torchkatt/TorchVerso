import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBdJ0ew0ULE75SZiiIElUS-fqa5VPthA2w",
    authDomain: "torchverso.firebaseapp.com",
    projectId: "torchverso",
    storageBucket: "torchverso.firebasestorage.app",
    messagingSenderId: "476828589012",
    appId: "1:476828589012:web:1d54782aca8a2d0197d441"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);
