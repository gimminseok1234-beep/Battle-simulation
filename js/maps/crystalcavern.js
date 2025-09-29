// js/maps/crystalcavern.js

/**
 * 맵 제목: 수정 동굴 (crystalcavern) - 최종 버전
 * 컨셉: 신비로운 빛을 내는 거대한 수정들이 가득한 지하 동굴 맵입니다.
 * 이동을 막지만 시야와 공격은 통과시키는 반투명 수정벽(GLASS_WALL)을 중심으로
 * 위치 선점과 원거리 심리전이 전투의 핵심이 됩니다.
 */

export const crystalcavernMap = {
    name: "crystalcavern",
    width: 460,
    height: 800,
    hadokenKnockback: 15,
    autoMagneticField: { isActive: false },
    nexuses: [], // 사용자가 직접 배치
    map: JSON.stringify((() => {
        const ROWS = 40;
        const COLS = 23;

        // --- 원칙 2: 데이터 무결성 - type과 color 속성을 반드시 포함 ---
        const wall = { type: 'WALL', color: '#1e293b' };             // 동굴 암벽
        // 요청에 따라 어두운 회색 바닥으로 변경
        const floor = { type: 'FLOOR', color: '#4A5568' };
        const purpleWall = { type: 'WALL', color: '#5b21b6' };       // 보라색 수정 암석
        const blueWall = { type: 'WALL', color: '#2563eb' };         // 파란색 수정 암석
        const crystalWall = { type: 'GLASS_WALL', color: 'rgba(135, 206, 250, 0.5)' }; // 반투명 수정벽
        const crackedPath = { type: 'CRACKED_WALL', hp: 120, color: '#64748b' }; // 부서지는 바위 길
        const lava = { type: 'LAVA', color: '#f97316' };             // 용암

        // 1. 기본 동굴 구조 생성
        const map = [...Array(ROWS)].map(() => [...Array(COLS)].map(() => ({ ...floor })));
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1) {
                    map[y][x] = { ...wall };
                }
            }
        }

        // 2. 보라색과 파란색 벽을 활용한 동굴 장식 추가
        const decorativeWalls = [
            {y: 5, x: 5}, {y: 6, x: 5}, {y: 5, x: 6}, // 좌상단
            {y: 5, x: COLS - 6}, {y: 6, x: COLS - 6}, {y: 5, x: COLS - 7}, // 우상단
            {y: ROWS - 6, x: 5}, {y: ROWS - 7, x: 5}, {y: ROWS - 6, x: 6}, // 좌하단
            {y: ROWS - 6, x: COLS - 6}, {y: ROWS - 7, x: COLS - 6}, {y: ROWS - 6, x: COLS - 7}, // 우하단
            {y: 15, x: 3}, {y: 24, x: 3}, // 좌측 중앙
            {y: 15, x: COLS - 4}, {y: 24, x: COLS - 4}, // 우측 중앙
        ];
        decorativeWalls.forEach((pos, index) => {
            // 파란색과 보라색 벽을 번갈아 배치
            map[pos.y][pos.x] = index % 2 === 0 ? { ...purpleWall } : { ...blueWall };
        });


        // 3. 중앙 광장과 거대 수정(GLASS_WALL) 배치
        const centerCrystalPositions = [
            {y: 8, x: 10}, {y: 8, x: 11}, {y: 8, x: 12}, {y: 9, x: 11},
            {y: 31, x: 10}, {y: 31, x: 11}, {y: 31, x: 12}, {y: 30, x: 11},
        ];
        centerCrystalPositions.forEach(pos => map[pos.y][pos.x] = { ...crystalWall });

        // 4. 좌우 대칭 수정벽 기둥 및 우회로
        for (let y = 12; y <= 27; y+=3) {
            map[y][5] = { ...crystalWall };
            map[y][COLS - 6] = { ...crystalWall };
        }
        
        map[10][3] = { ...crackedPath }; map[10][4] = { ...crackedPath };
        map[10][COLS - 4] = { ...crackedPath }; map[10][COLS - 5] = { ...crackedPath };
        map[29][3] = { ...crackedPath }; map[29][4] = { ...crackedPath };
        map[29][COLS - 4] = { ...crackedPath }; map[29][COLS - 5] = { ...crackedPath };

        // 5. 전략적 특수 타일 배치
        map[20][10] = { type: 'HEAL_PACK', color: '#16a34a' };
        map[20][12] = { type: 'HEAL_PACK', color: '#16a34a' };
        map[ROWS - 2][1] = { type: 'TELEPORTER', color: '#8b5cf6' };
        map[1][COLS - 2] = { type: 'TELEPORTER', color: '#8b5cf6' };
        map[15][1] = { type: 'DASH_TILE', direction: 'RIGHT', color: '#e2e8f0' };
        map[15][2] = { ...lava };
        map[24][COLS - 2] = { type: 'DASH_TILE', direction: 'LEFT', color: '#e2e8f0' };
        map[24][COLS - 3] = { ...lava };

        return map;
    })()),
    // --- 당신이 관여하지 않는 영역 ---
    units: [],
    weapons: [],
    growingFields: [],
};
