// js/maps/sunkenruinship.js

/**
 * 맵 제목: 침몰한 유적선 (sunkenruinship)
 * 컨셉: 깊은 바닷속에 가라앉은 거대 유적선을 배경으로 하는 맵입니다.
 * 파괴 가능한 썩은 갑판을 뚫어 새로운 경로를 개척하거나,
 * 좁은 복도와 넓은 갑판을 오가며 입체적인 전투를 펼칠 수 있습니다.
 */
export const sunkenruinshipMap = {
    name: "sunkenruinship",
    width: 460,
    height: 800,
    hadokenKnockback: 18, // 바다로 밀어내는 효과 강화
    autoMagneticField: { isActive: false },
    nexuses: [], // 사용자가 직접 배치
    map: JSON.stringify((() => {
        const ROWS = 40;
        const COLS = 23;

        // --- 원칙 2: 데이터 무결성 - 컨셉에 맞는 색상 정의 ---
        const wall = { type: 'WALL', color: '#4a5568' };         // 낡은 선체 벽
        const water = { type: 'LAVA', color: '#2b6cb0' };        // 깊은 바다
        const deck = { type: 'FLOOR', color: '#854d0e' };        // 나무 갑판
        const rottenDeck = { type: 'CRACKED_WALL', hp: 100, color: '#a16207' }; // 썩은 갑판

        // 1. 기본 맵을 바다(water)로 초기화
        const map = [...Array(ROWS)].map(() => [...Array(COLS)].map(() => ({ ...water })));
        for (let y = 0; y < ROWS; y++) {
            if (y === 0 || y === ROWS - 1) {
                for (let x = 0; x < COLS; x++) map[y][x] = { ...wall };
            }
            map[y][0] = { ...wall };
            map[y][COLS - 1] = { ...wall };
        }

        // 2. 거대한 유적선 형태 제작
        // 선체 중앙 복도 (하층)
        for (let y = 5; y < ROWS - 5; y++) {
            for (let x = 8; x < 15; x++) {
                map[y][x] = { ...deck };
            }
        }
        // 갑판 (상층)
        for (let y = 10; y < ROWS - 10; y++) {
            for (let x = 4; x < COLS - 4; x++) {
                map[y][x] = { ...deck };
            }
        }

        // 3. 썩은 갑판(rottenDeck)을 전략적으로 배치
        // 갑판 가장자리를 파괴 가능한 지형으로 설정
        for (let y = 10; y < ROWS - 10; y++) {
            map[y][4] = { ...rottenDeck };
            map[y][COLS - 5] = { ...rottenDeck };
        }
        for (let x = 5; x < COLS - 5; x++) {
            map[10][x] = { ...rottenDeck };
            map[ROWS - 11][x] = { ...rottenDeck };
        }

        // 4. 선장실 및 특수 타일 배치
        // 선장실 (우측 상단)
        for (let y = 11; y < 16; y++) {
            for (let x = 15; x < 20; x++) {
                map[y][x] = { ...wall };
            }
        }
        map[13][15] = { ...deck }; // 선장실 입구
        map[13][17] = { type: 'HEAL_PACK', color: '#16a34a' }; // 선장실 내부 보상

        // 갑판-선체 하부 연결 텔레포터
        map[20][5] = { type: 'TELEPORTER', color: '#8b5cf6' }; // 갑판 위
        map[8][11] = { type: 'TELEPORTER', color: '#8b5cf6' }; // 복도 안

        return map;
    })()),
    // --- 당신이 관여하지 않는 영역 ---
    units: [],
    weapons: [],
    growingFields: [],
};