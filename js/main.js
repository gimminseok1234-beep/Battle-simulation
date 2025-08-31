import { auth, db, onAuthStateChanged, handleAuthStateChange, setupAuthEventListeners } from './firebase.js';
import { GameManager } from './gameManager.js';

document.addEventListener('DOMContentLoaded', () => {
    // GameManager 생성 시, 반드시 db 정보를 전달해야 합니다.
    const gameManager = new GameManager(db); 
    
    // 인증 UI 이벤트 리스너 설정
    setupAuthEventListeners();
    
    // Firebase 인증 상태 변경 감지
    onAuthStateChanged(auth, (user) => {
        handleAuthStateChange(user, gameManager);
    });
});
