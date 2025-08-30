import { signInAnonymously, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

const provider = new GoogleAuthProvider();

export function setupAuth(auth) {
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    googleLoginBtn.addEventListener('click', () => {
        signInWithPopup(auth, provider).catch(error => {
            console.error("Google sign-in error", error);
        });
    });

    logoutBtn.addEventListener('click', () => {
        signOut(auth);
    });
}

export function handleAuthStateChange(user, gameManager, auth) {
    const loadingStatus = document.getElementById('loadingStatus');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const userDetails = document.getElementById('userDetails');
    const userPhoto = document.getElementById('userPhoto');
    const userName = document.getElementById('userName');

    if (user) {
        gameManager.setCurrentUser(user);
        loadingStatus.style.display = 'none';

        if (user.isAnonymous) {
            googleLoginBtn.style.display = 'flex';
            userDetails.style.display = 'none';
        } else {
            googleLoginBtn.style.display = 'none';
            userDetails.style.display = 'flex';
            userPhoto.src = user.photoURL;
            userName.textContent = user.displayName;
        }
        document.getElementById('addNewMapCard').classList.remove('hidden');
        if (gameManager.state === 'HOME') {
             gameManager.init();
        }
    } else {
        gameManager.setCurrentUser(null);
        userDetails.style.display = 'none';
        googleLoginBtn.style.display = 'flex';
        loadingStatus.style.display = 'none';
        
        const mapGrid = document.getElementById('mapGrid');
        const addNewMapCard = document.getElementById('addNewMapCard');
        while (mapGrid.firstChild && mapGrid.firstChild !== addNewMapCard) {
            mapGrid.removeChild(mapGrid.firstChild);
        }
        addNewMapCard.classList.add('hidden');

        signInAnonymously(auth).catch((error) => {
            console.error("Anonymous sign-in failed:", error);
            loadingStatus.textContent = '로그인에 실패했습니다. 새로고침 해주세요.';
            loadingStatus.style.display = 'block';
        });
    }
}
