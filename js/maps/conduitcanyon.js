// js/maps/conduitcanyon.js

/**
 * 맵 제목: 전도체 협곡 (conduitcanyon)
 * 컨셉: 얼어붙은 협곡 사이로 강력한 마력이 흐르는 '전도성 강물'이 흐르는 맵입니다.
 * 전기 유닛은 좁은 다리에서, 얼음 유닛은 넓은 빙판에서 지형적 우위를 점할 수 있어,
 * 지형을 선점하고 활용하는 능력이 승패를 좌우합니다.
 */

export const conduitcanyonMap = {
    name: "conduitcanyon",
    width: 460,
    height: 800,
    hadokenKnockback: 15,
    autoMagneticField: { isActive: false },
    nexuses: [], // 사용자가 직접 배치
    map: JSON.stringify((() => {
        const ROWS = 40;
        const COLS = 23;

        // --- 원칙 2: 데이터 무결성 - 컨셉에 맞는 다채로운 색상 정의 ---
        const wall = { type: 'WALL', color: '#2d3748' };             // 협곡 암벽
        const iceFloor1 = { type: 'FLOOR', color: '#e2e8f0' };       // 밝은 빙판 바닥
        const iceFloor2 = { type: 'FLOOR', color: '#cbd5e0' };       // 어두운 빙판 바닥
        const conduitRiver = { type: 'LAVA', color: '#60a5fa' };     // 전도성 강물 (푸른색 용암)
        const breakableBridge = { type: 'CRACKED_WALL', hp: 250, color: '#718096' }; // 파괴 가능한 다리
        const crystal = { type: 'GLASS_WALL', color: 'rgba(135, 206, 250, 0.6)' }; // 얼음 수정

        // 1. 기본 빙판 지형 생성 (두 가지 회색을 섞어 자연스러움 연출)
        const map = [...Array(ROWS)].map((_, y) => 
            [...Array(COLS)].map((_, x) => {
                if (y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1) return { ...wall };
                return (x + y) % 2 === 0 ? { ...iceFloor1 } : { ...iceFloor2 };
            })
        );

        // 2. 중앙을 가로지르는 '전도성 강' 생성
        for (let y = 16; y < 24; y++) {
            for (let x = 1; x < COLS - 1; x++) {
                map[y][x] = { ...conduitRiver };
            }
        }

        // 3. 강을 건너는 '파괴 가능한 다리' 2개 배치
        const createBridge = (y, startX, length) => {
            for (let x = startX; x < startX + length; x++) {
                map[y][x] = { ...breakableBridge };
            }
        };
        createBridge(19, 3, 5);  // 좌측 다리
        createBridge(20, 15, 5); // 우측 다리

        // 4. 넓은 빙판 광장에 '얼음 수정(GLASS_WALL)' 배치
        const crystalPositions = [
            // 상단 빙판
            {y: 8, x: 5}, {y: 9, x: 5}, {y: 8, x: 6},
            {y: 8, x: 17}, {y: 9, x: 17}, {y: 8, x: 16},
            // 하단 빙판
            {y: 31, x: 5}, {y: 30, x: 5}, {y: 31, x: 6},
            {y: 31, x: 17}, {y: 30, x: 17}, {y: 31, x: 16},
        ];
        crystalPositions.forEach(pos => map[pos.y][pos.x] = { ...crystal });
        
        // 5. 전략적 거점에 특수 타일 배치
        // 강 중앙의 작은 섬과 보상
        map[20][11] = { type: 'FLOOR', color: '#a0aec0' };
        map[20][10] = { type: 'AWAKENING_POTION', color: '#FFFFFF' };

        return map;
    })()),
    // --- 당신이 관여하지 않는 영역 ---
    units: [],
    weapons: [],
    growingFields: [],
};