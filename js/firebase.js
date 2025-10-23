import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

// UI 업데이트 로직을 별도 함수로 분리하여 handleAuthStateChange의 복잡도를 낮춥니다.
function updateUIForUser(user) {
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const userDetails = document.getElementById('userDetails');
    const addNewMapCard = document.getElementById('addNewMapCard');

    if (user && !user.isAnonymous) {
        googleLoginBtn.classList.add('hidden');
        userDetails.classList.remove('hidden');
        document.getElementById('userPhoto').src = user.photoURL;
        document.getElementById('userName').textContent = user.displayName;
        addNewMapCard.classList.remove('hidden');
    } else { // 익명 사용자 또는 로그아웃 상태
        googleLoginBtn.classList.remove('hidden');
        userDetails.classList.add('hidden');
        addNewMapCard.classList.add('hidden');
    }
}

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
async function handleAuthStateChange(user, gameManager) {
    const loadingStatus = document.getElementById('loadingStatus');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const userDetails = document.getElementById('userDetails');
    const addNewMapCard = document.getElementById('addNewMapCard');
    const mapGrid = document.getElementById('mapGrid');

    loadingStatus.style.display = 'none';
    updateUIForUser(user);

    if (user) {
        gameManager.setCurrentUser(user);
        // 사용자 정보가 확실히 설정된 후에 게임 매니저를 초기화합니다.
        await gameManager.init();
    } else {
        // 로그아웃 상태일 때 맵 목록을 정리합니다.
        while (mapGrid.firstChild && mapGrid.firstChild !== addNewMapCard) {
            mapGrid.removeChild(mapGrid.firstChild);
        }
        gameManager.setCurrentUser(null);
        
        // 최초 접속 시 익명 로그인을 시도합니다.
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("익명 로그인 실패:", error);
            loadingStatus.textContent = "인증 서버 접속 실패";
        }
    }
}

function setupAuthEventListeners() {
    document.getElementById('googleLoginBtn').addEventListener('click', signInWithGoogle);
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

export { auth, db, onAuthStateChanged, handleAuthStateChange, setupAuthEventListeners };
