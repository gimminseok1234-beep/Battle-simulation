import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDCB9bou34n3nKntyDbCIV-s3ccifgwI-k",
    authDomain: "battle-simulation-42512.firebaseapp.com",
    projectId: "battle-simulation-42512",
    storageBucket: "battle-simulation-42512.firebasestorage.app", // .firebasestorage.app이 올바른 형식입니다.
    messagingSenderId: "705586780455",
    appId: "1:705586780455:web:9e485767a508082a0bb102"
};

// Firebase 앱 초기화 (앱에서 단 한 번만 실행)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

/**
 * Google 계정으로 로그인 팝업을 띄웁니다.
 */
function signInWithGoogle() {
    signInWithPopup(auth, provider)
        .catch((error) => {
            console.error("Google 로그인 실패:", error);
        });
}

/**
 * 현재 사용자를 로그아웃시킵니다.
 */
function logout() {
    signOut(auth).catch((error) => {
        console.error("로그아웃 실패:", error);
    });
}

/**
 * 인증 상태 변경을 감지하고 UI를 업데이트합니다.
 * @param {User | null} user - 현재 로그인된 사용자 객체 또는 null
 * @param {GameManager} gameManager - 게임 매니저 인스턴스
 */
function handleAuthStateChange(user, gameManager) {
    const loadingStatus = document.getElementById('loadingStatus');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const userDetails = document.getElementById('userDetails');
    const addNewMapCard = document.getElementById('addNewMapCard');

    loadingStatus.style.display = 'none';

    if (user) {
        // 사용자가 로그인한 경우
        googleLoginBtn.classList.add('hidden');
        userDetails.classList.remove('hidden');
        addNewMapCard.classList.remove('hidden');
        document.getElementById('userPhoto').src = user.photoURL;
        document.getElementById('userName').textContent = user.displayName;

        gameManager.setCurrentUser(user);
        gameManager.init();
    } else {
        // 사용자가 로그아웃한 경우
        googleLoginBtn.classList.remove('hidden');
        userDetails.classList.add('hidden');
        addNewMapCard.classList.add('hidden');
        
        const mapGrid = document.getElementById('mapGrid');
        while (mapGrid.firstChild && mapGrid.firstChild !== addNewMapCard) {
            mapGrid.removeChild(mapGrid.firstChild);
        }
        gameManager.setCurrentUser(null);
    }
}

/**
 * 인증 관련 UI 이벤트 리스너를 설정합니다.
 */
function setupAuthEventListeners() {
    document.getElementById('googleLoginBtn').addEventListener('click', signInWithGoogle);
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

// 다른 모듈에서 사용할 수 있도록 export
export { auth, db, onAuthStateChanged, handleAuthStateChange, setupAuthEventListeners };
