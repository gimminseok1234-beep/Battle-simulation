import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { setupAuth, handleAuthStateChange } from './firebase.js';
import { GameManager } from './gameManager.js';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDCB9bou34n3nKntyDbCIV-s3ccifgwI-k",
    authDomain: "battle-simulation-42512.firebaseapp.com",
    projectId: "battle-simulation-42512",
    storageBucket: "battle-simulation-42512.firebasestorage.app",
    messagingSenderId: "705586780455",
    appId: "1:705586780455:web:9e485767a508082a0bb102"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let gameManager = null;

document.addEventListener('DOMContentLoaded', () => {
    gameManager = new GameManager(db);
    setupAuth(auth);
    
    onAuthStateChanged(auth, (user) => {
        handleAuthStateChange(user, gameManager, auth);
    });
});