// js/maps/crystalcavern.js

/**
 * 맵 제목: 수정 동굴 (crystalcavern)
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
        const floor = { type: 'FLOOR', color: '#334155' };           // 동굴 바닥
        const crystalWall = { type: 'GLASS_WALL', color: 'rgba(135, 206, 250, 0.5)' }; // 수정벽 (반투명)
        const crackedPath = { type: 'CRACKED_WALL', hp: 120, color: '#64748b' }; // 부서지는 바위 길

        // 1. 기본 동굴 구조 생성 (바닥과 외벽)
        const map = [...Array(ROWS)].map(() => [...Array(COLS)].map(() => ({ ...floor })));
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1) {
                    map[y][x] = { ...wall };
                }
            }
        }

        // 2. 중앙 광장과 거대 수정(GLASS_WALL) 배치
        const centerCrystalPositions = [
            // 중앙 상단 수정 덩어리
            {y: 8, x: 10}, {y: 8, x: 11}, {y: 8, x: 12},
            {y: 9, x: 11},
            // 중앙 하단 수정 덩어리
            {y: 31, x: 10}, {y: 31, x: 11}, {y: 31, x: 12},
            {y: 30, x: 11},
        ];
        centerCrystalPositions.forEach(pos => map[pos.y][pos.x] = { ...crystalWall });

        // 3. 좁은 수정길과 우회로 설계
        // 좌우 대칭 수정벽 기둥 배치
        for (let y = 12; y <= 27; y+=3) {
            map[y][5] = { ...crystalWall };
            map[y][COLS - 6] = { ...crystalWall };
        }
        
        // 파괴하여 길을 만들 수 있는 우회로
        map[10][3] = { ...crackedPath }; map[10][4] = { ...crackedPath };
        map[10][COLS - 4] = { ...crackedPath }; map[10][COLS - 5] = { ...crackedPath };
        map[29][3] = { ...crackedPath }; map[29][4] = { ...crackedPath };
        map[29][COLS - 4] = { ...crackedPath }; map[29][COLS - 5] = { ...crackedPath };

        // 4. 신비로운 특수 타일 배치
        // 중앙 광장 쟁탈 요소 (각성 물약)
        map[20][11] = { type: 'AWAKENING_POTION', color: '#FFFFFF' };

        // 숨겨진 텔레포터 (좌측 하단 <-> 우측 상단)
        map[ROWS - 2][1] = { type: 'TELEPORTER', color: '#8b5cf6' };
        map[1][COLS - 2] = { type: 'TELEPORTER', color: '#8b5cf6' };

        // 빛나는 바닥 (돌진 타일)
        map[15][1] = { type: 'DASH_TILE', direction: 'RIGHT', color: '#e2e8f0' };
        map[24][COLS - 2] = { type: 'DASH_TILE', direction: 'LEFT', color: '#e2e8f0' };

        return map;
    })()),
    // --- 당신이 관여하지 않는 영역 ---
    units: [],
    weapons: [],
    growingFields: [],
};