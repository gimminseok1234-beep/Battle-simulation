import { auth, db, onAuthStateChanged, handleAuthStateChange, setupAuthEventListeners } from './firebase.js';
import { GameManager } from './gameManager.js';

document.addEventListener('DOMContentLoaded', () => {
    // GameManager 생성 시, 반드시 db 정보를 전달해야 합니다.
    const gameManager = new GameManager(db); 
    
    // 인증 UI 이벤트 리스너 설정
    setupAuthEventListeners();
    
    // Firebase 인증 상태 변경 감지
    // 사용자의 로그인 상태가 확인된 후에 handleAuthStateChange를 호출하여 GameManager를 초기화합니다.
    // 이렇게 함으로써 로그인 정보가 필요한 기능들이 정상적으로 작동합니다.
    onAuthStateChanged(auth, (user) => {
        handleAuthStateChange(user, gameManager);
    });
});
