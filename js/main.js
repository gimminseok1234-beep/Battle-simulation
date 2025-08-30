// js/main.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { setupAuth, handleAuthStateChange } from './firebase.js';
import { GameManager } from './gameManager.js';
import { AudioManager } from "./audioManager.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDCB9bou34n3nKntyDbCIV-s3ccifgwI-k",
    authDomain: "battle-simulation-42512.firebaseapp.com",
    projectId: "battle-simulation-42512",
    storageBucket: "battle-simulation-42512.firebasestorage.app",
    messagingSenderId: "705586780455",
    appId: "1:705586780455:web:9e485767a508082a0bb102"
};

// --- 전역 인스턴스 ---
// 다른 파일에서 import하여 사용할 수 있도록 export 합니다.
export const audioManager = new AudioManager();
export let gameManager = null;

// --- 앱 초기화 ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Firebase 앱 초기화
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // 2. GameManager 인스턴스 생성 (초기화된 db와 audioManager 전달)
    gameManager = new GameManager(db, audioManager);

    // 3. 인증 관련 UI 이벤트 설정
    setupAuth(auth);
    
    // 4. 인증 상태 변경 리스너 (가장 마지막에 설정)
    onAuthStateChanged(auth, (user) => {
        handleAuthStateChange(user, gameManager, auth);
    });
});
