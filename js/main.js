import { auth, db, onAuthStateChanged, handleAuthStateChange, setupAuthEventListeners } from './firebase.js';
import { GameManager } from './gameManager.js';

// GameManager 인스턴스를 생성하고 전역에서 접근 가능하도록 설정
const gameManager = new GameManager(db);

// DOM이 로드되면 초기화 로직 실행
document.addEventListener('DOMContentLoaded', () => {
    // 인증 UI 이벤트 리스너 설정
    setupAuthEventListeners();
    
    // 인증 상태 변경 감지
    onAuthStateChanged(auth, (user) => {
        handleAuthStateChange(user, gameManager);
    });
});
