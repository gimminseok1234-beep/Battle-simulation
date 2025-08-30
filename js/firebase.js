import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// 사용자가 제공한 Firebase 프로젝트 설정 값
const firebaseConfig = {
    apiKey: "AIzaSyDCB9bou34n3nKntyDbCIV-s3ccifgwI-k",
    authDomain: "battle-simulation-42512.firebaseapp.com",
    projectId: "battle-simulation-42512",
    storageBucket: "battle-simulation-42512.appspot.com",
    messagingSenderId: "705586780455",
    appId: "1:705586780455:web:9e485767a508082a0bb102"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 익명으로 로그인 처리
signInAnonymously(auth)
    .catch((error) => {
        console.error("Firebase 익명 로그인 실패:", error);
    });

/**
 * 점수를 Firebase에 저장하는 함수
 * @param {string} name - 사용자 이름
 * @param {number} score - 획득한 점수
 */
async function saveScore(name, score) {
    try {
        await addDoc(collection(db, "scores"), {
            name: name,
            score: score,
            timestamp: serverTimestamp()
        });
        console.log("점수 저장 성공!");
    } catch (error) {
        console.error("점수 저장 중 오류 발생: ", error);
    }
}

/**
 * 상위 랭킹을 Firebase에서 불러오는 함수
 * @param {number} limitCount - 불러올 랭킹 수
 * @returns {Promise<Array>} - 랭킹 데이터 배열
 */
async function getHighScores(limitCount = 10) {
    const scoresRef = collection(db, "scores");
    // 점수(score)를 기준으로 내림차순 정렬하고, timestamp를 기준으로도 내림차순 정렬하여 최신 점수가 위로 오게 함
    const q = query(scoresRef, orderBy("score", "desc"), orderBy("timestamp", "desc"), limit(limitCount));
    
    try {
        const querySnapshot = await getDocs(q);
        const highScores = [];
        querySnapshot.forEach((doc) => {
            highScores.push(doc.data());
        });
        return highScores;
    } catch (error) {
        console.error("랭킹 불러오기 중 오류 발생: ", error);
        return [];
    }
}

// 다른 모듈에서 사용할 수 있도록 함수들을 export
export { auth, saveScore, getHighScores };
