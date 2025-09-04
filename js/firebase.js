import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDCB9bou34n3nKntyDbCIV-s3ccifgwI-k",
    authDomain: "battle-simulation-42512.firebaseapp.com",
    projectId: "battle-simulation-42512",
    storageBucket: "battle-simulation-42512.appspot.com",
    messagingSenderId: "705586780455",
    appId: "1:705586780455:web:9e485767a508082a0bb102"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

function signInWithGoogle() {
    signInWithPopup(auth, provider).catch(error => console.error("Google 로그인 실패:", error));
}

function logout() {
    signOut(auth).catch(error => console.error("로그아웃 실패:", error));
}

/**
 * @param {import("firebase/auth").User | null} user
 * @param {import("./gameManager.js").GameManager} gameManager
 */
function handleAuthStateChange(user, gameManager) {
    const loadingStatus = document.getElementById('loadingStatus');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const userDetails = document.getElementById('userDetails');
    const addNewMapCard = document.getElementById('addNewMapCard');
    const mapGrid = document.getElementById('mapGrid');

    loadingStatus.style.display = 'none';

    if (user) {
        // 익명 또는 Google 사용자로 로그인된 상태
        if (user.isAnonymous) {
            googleLoginBtn.classList.remove('hidden');
            userDetails.classList.add('hidden');
        } else {
            googleLoginBtn.classList.add('hidden');
            userDetails.classList.remove('hidden');
            document.getElementById('userPhoto').src = user.photoURL;
            document.getElementById('userName').textContent = user.displayName;
        }
        
        addNewMapCard.classList.remove('hidden');
        gameManager.setCurrentUser(user);
        gameManager.init(); // GameManager 초기화
    } else {
        // 로그아웃 상태 -> 익명 로그인 시도
        googleLoginBtn.classList.remove('hidden');
        userDetails.classList.add('hidden');
        addNewMapCard.classList.add('hidden');
        
        // 맵 목록 클리어
        while (mapGrid.firstChild && mapGrid.firstChild !== addNewMapCard) {
            mapGrid.removeChild(mapGrid.firstChild);
        }
        gameManager.setCurrentUser(null);
        
        signInAnonymously(auth).catch(error => {
            console.error("익명 로그인 실패:", error);
            loadingStatus.textContent = "인증 서버 접속 실패";
        });
    }
}

function setupAuthEventListeners() {
    document.getElementById('googleLoginBtn').addEventListener('click', signInWithGoogle);
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

export { auth, db, onAuthStateChanged, handleAuthStateChange, setupAuthEventListeners };
