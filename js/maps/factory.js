// js/maps/factory.js

/**
 * 맵 제목: 자동화 공장 (factory) - 고품질 버전
 * 컨셉: 예측 불가능한 돌진 타일과 위험한 함정이 가득한 혼돈의 공장.
 * 긴 컨베이어 벨트를 제거하고, 변칙적인 전투를 유도하는 무작위 타일 배치를 적용했습니다.
 */

export const factorymap = {
    name: "factory",
    width: 460,
    height: 800,
    hadokenKnockback: 15,
    autoMagneticField: { isActive: false },
    nexuses: [], // 넥서스는 사용자가 직접 배치
    map: JSON.stringify((() => {
        const ROWS = 40;
        const COLS = 23;
        const wall = { type: 'WALL', color: '#2d3748' }; // 공장 외벽
        const floor = { type: 'FLOOR', color: '#4a5568' }; // 공장 바닥
        const lava = { type: 'LAVA', color: '#f97316' };
        const map = [...Array(ROWS)].map(() => [...Array(COLS)].map(() => ({ ...floor })));

        // 1. 외벽 생성
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1) {
                    map[y][x] = { ...wall };
                }
            }
        }
        
        // 2. 중앙을 제외한 전장에 무작위 타일 배치 (돌진, 벽, 용암)
        const directions = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
        for (let y = 1; y < ROWS - 1; y++) {
            for (let x = 1; x < COLS - 1; x++) {
                // 시작 지점(상하 6칸)과 중앙 통로(가로 5칸)는 안전 구역으로 확보
                if (y <= 6 || y >= ROWS - 7 || (x >= 9 && x <= 13)) continue;
                
                const rand = Math.random();
                if (rand < 0.08) { // 돌진 타일 (비율 높음)
                    const dir = directions[Math.floor(Math.random() * directions.length)];
                    map[y][x] = { type: 'DASH_TILE', direction: dir, color: '#CBD5E0' };
                } else if (rand < 0.12) { // 일반 벽
                    map[y][x] = { ...wall };
                } else if (rand < 0.16) { // 용암 함정
                    map[y][x] = { ...lava };
                }
            }
        }

        // 3. 중앙 지역 구조물 및 특수 타일 배치
        // 중앙 전투 공간 확보 및 장애물 배치
        for (let y = 15; y < 25; y++) {
             map[y][10] = { type: 'CRACKED_WALL', hp: 150, color: '#718096'};
             map[y][12] = { type: 'CRACKED_WALL', hp: 150, color: '#718096'};
        }
        
        // 중앙 보상
        map[19][11] = { type: 'HEAL_PACK', color: '#22c55e' };
        map[20][11] = { type: 'HEAL_PACK', color: '#22c55e' };


        // 4. 외곽 지역 텔레포터 배치 (기습 경로)
        map[3][3] = { type: 'TELEPORTER', color: '#8b5cf6' };
        map[36][19] = { type: 'TELEPORTER', color: '#8b5cf6' };

        return map;
    })()),
    units: [],    // 유닛은 사용자가 직접 배치
    weapons: [],  // 무기는 사용자가 직접 배치
    growingFields: [],
};
