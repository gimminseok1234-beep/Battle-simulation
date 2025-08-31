import { auth, onAuthStateChanged, handleAuthStateChange, setupAuthEventListeners } from './firebase.js';
import { GameManager } from './gameManager.js';

document.addEventListener('DOMContentLoaded', () => {
    // GameManager의 싱글톤 인스턴스를 가져옵니다.
    const gameManager = new GameManager(); 
    
    // 인증 UI(로그인/로그아웃 버튼) 이벤트 리스너를 설정합니다.
    setupAuthEventListeners();
    
    // Firebase 인증 상태 변경을 감지하는 리스너를 설정합니다.
    // 인증 상태가 변경될 때마다 handleAuthStateChange 함수가 호출됩니다.
    onAuthStateChanged(auth, (user) => {
        handleAuthStateChange(user, gameManager);
    });
});
