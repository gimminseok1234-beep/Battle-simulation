import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// [수정] 사용자의 예전 코드에 있던 Firebase 프로젝트 정보로 교체했습니다.
const firebaseConfig = {
    apiKey: "AIzaSyCV-12_D_50P_g1RWCwYxsoJbWkI-fC4as",
    authDomain: "battle-simulation-a7d3a.firebaseapp.com",
    projectId: "battle-simulation-a7d3a",
    storageBucket: "battle-simulation-a7d3a.appspot.com",
    messagingSenderId: "1018313322588",
    appId: "1:1018313322588:web:b1d5563e35186f26485a4a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export { onAuthStateChanged };

const provider = new GoogleAuthProvider();

async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, provider);
        console.log("Google 로그인 성공:", result.user);
    } catch (error) {
        console.error("Google 로그인 에러:", error);
    }
}

async function signInAnonymouslyHandler() {
    try {
        const result = await signInAnonymously(auth);
        console.log("익명 로그인 성공:", result.user);
    } catch (error) {
        console.error("익명 로그인 에러:", error);
    }
}

async function handleSignOut() {
    try {
        await signOut(auth);
        console.log("로그아웃 성공");
    } catch (error) {
        console.error("로그아웃 에러:", error);
    }
}

export function setupAuthEventListeners() {
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    const anonymousSignInBtn = document.getElementById('anonymousSignInBtn');

    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', signInWithGoogle);
    }
    if (signOutBtn) {
        signOutBtn.addEventListener('click', handleSignOut);
    }
    if (anonymousSignInBtn) {
        anonymousSignInBtn.addEventListener('click', signInAnonymouslyHandler);
    }
}

export function handleAuthStateChange(user, gameManager) {
    const authScreen = document.getElementById('authScreen');
    const homeScreen = document.getElementById('homeScreen');
    const authContainer = document.getElementById('auth-container');
    const userInfo = document.getElementById('user-info');
    const userEmail = document.getElementById('user-email');
    const homeUserInfo = document.getElementById('home-user-info');

    if (user) {
        authScreen.style.display = 'none';
        homeScreen.style.display = 'block';

        authContainer.classList.add('hidden');
        userInfo.classList.remove('hidden');
        
        let welcomeMsg;
        if (user.isAnonymous) {
            welcomeMsg = `환영합니다, 익명 유저 (ID: ...${user.uid.slice(-6)})`;
        } else {
            welcomeMsg = `환영합니다, ${user.email}`;
        }
        
        if (userEmail) userEmail.textContent = welcomeMsg;

        if (homeUserInfo) {
            homeUserInfo.innerHTML = `
                <p class="text-white truncate">${welcomeMsg}</p>
                <button id="homeSignOutBtn" class="mt-2 text-sm text-red-400 hover:text-red-300">로그아웃</button>
            `;
            document.getElementById('homeSignOutBtn').addEventListener('click', handleSignOut);
        }
        
        gameManager.setCurrentUser(user);
        gameManager.init();
    } else {
        authScreen.style.display = 'flex';
        homeScreen.style.display = 'none';
        
        authContainer.classList.remove('hidden');
        userInfo.classList.add('hidden');
        if (homeUserInfo) homeUserInfo.innerHTML = '';

        gameManager.setCurrentUser(null);
    }
}

