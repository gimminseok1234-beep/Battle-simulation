// js/maps/ninjavillage.js

/**
 * 맵 제목: 그림자 도장 (ninjavillage)
 * 컨셉: 닌자들이 훈련하는 비밀스러운 도장을 테마로 한 맵입니다.
 * 맵 전체에 깔린 돌진 타일을 이용해 지붕과 벽을 넘나드는 민첩한 기동전을 펼칠 수 있으며,
 * 파괴 가능한 벽을 뚫고 기습하는 등 다양한 닌자 플레이가 가능합니다.
 */

export const ninjavillageMap = {
    name: "ninjavillage",
    width: 460,
    height: 800,
    hadokenKnockback: 15,
    autoMagneticField: { isActive: false },
    nexuses: [], // 사용자가 직접 배치
    map: JSON.stringify((() => {
        const ROWS = 40;
        const COLS = 23;

        // --- 원칙 2: 데이터 무결성 - type과 color 속성을 반드시 포함 ---
        const wall = { type: 'WALL', color: '#2d3748' };             // 도장 외벽
        const floor = { type: 'FLOOR', color: '#1a202c' };           // 어두운 바닥
        const rooftop = { type: 'FLOOR', color: '#4a5568' };         // 지붕 바닥
        const crackedWall = { type: 'CRACKED_WALL', hp: 80, color: '#718096' }; // 부서지는 장지문

        // 1. 기본 맵 생성 (바닥과 외벽)
        const map = [...Array(ROWS)].map(() => [...Array(COLS)].map(() => ({ ...floor })));
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1) {
                    map[y][x] = { ...wall };
                }
            }
        }

        // 2. 대칭 구조의 도장 건물 및 지붕(rooftop) 생성
        const createBuilding = (startY, startX, height, width) => {
            for (let y = startY; y < startY + height; y++) {
                for (let x = startX; x < startX + width; x++) {
                    map[y][x] = { ...rooftop };
                    if (y === startY || y === startY + height - 1 || x === startX || x === startX + width - 1) {
                        map[y][x] = { ...wall };
                    }
                }
            }
        };

        createBuilding(4, 4, 8, 15); // 상단 건물
        createBuilding(ROWS - 12, 4, 8, 15); // 하단 건물
        createBuilding(16, 1, 8, 8); // 좌측 중앙 건물
        createBuilding(16, COLS - 9, 8, 8); // 우측 중앙 건물

        // 3. 파괴 가능한 벽(CRACKED_WALL)을 곳곳에 배치
        // 건물 내/외부의 파괴 가능한 통로
        map[11][11] = { ...crackedWall }; map[ROWS - 12][11] = { ...crackedWall };
        map[19][8] = { ...crackedWall }; map[19][COLS - 9] = { ...crackedWall };
        map[15][5] = { ...crackedWall }; map[ROWS - 16][COLS - 6] = { ...crackedWall };

        // 4. 민첩한 이동을 위한 돌진 타일(DASH_TILE) 대량 배치
        // 벽을 타고 넘는 움직임 구현
        map[12][7] = { type: 'DASH_TILE', direction: 'DOWN', color: '#e2e8f0' };
        map[ROWS - 13][15] = { type: 'DASH_TILE', direction: 'UP', color: '#e2e8f0' };

        map[17][9] = { type: 'DASH_TILE', direction: 'RIGHT', color: '#e2e8f0' };
        map[22][13] = { type: 'DASH_TILE', direction: 'LEFT', color: '#e2e8f0' };

        // 맵 중앙을 가로지르는 고속 이동 경로
        for (let x = 9; x <= 13; x++) {
            map[2][x] = { type: 'DASH_TILE', direction: 'DOWN', color: '#e2e8f0' };
            map[ROWS - 3][x] = { type: 'DASH_TILE', direction: 'UP', color: '#e2e8f0' };
        }

        // 5. 전략적 특수 타일 배치
        // 중앙 건물 안의 보상
        map[19][4] = { type: 'HEAL_PACK', color: '#16a34a' };
        map[19][COLS - 5] = { type: 'HEAL_PACK', color: '#16a34a' };

        // 비밀 통로 (텔레포터)
        map[1][1] = { type: 'TELEPORTER', color: '#8b5cf6' };
        map[ROWS - 2][COLS - 2] = { type: 'TELEPORTER', color: '#8b5cf6' };

        return map;
    })()),
    // --- 당신이 관여하지 않는 영역 ---
    units: [],
    weapons: [],
    growingFields: [],
};