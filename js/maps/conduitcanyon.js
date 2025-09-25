// js/maps/conduitcanyon.js

/**
 * 맵 제목: 고립된 빙원 (Isolated Glacier) - 리뉴얼 버전
 * 컨셉: 끓어오르는 용암의 바다 한가운데에 떠 있는 둥글고 긴 빙판 위에서 전투가 벌어집니다.
 * 제한된 공간과 치명적인 용암 지대가 어우러져, 정교한 컨트롤과 거리 조절 능력이 승패를 가르는 극한의 결투장입니다.
 */

export const conduitcanyonMap = {
    name: "conduitcanyon",
    width: 460,
    height: 800,
    hadokenKnockback: 20, // 넉백 효과를 더 중요하게 설정
    autoMagneticField: { isActive: false },
    nexuses: [], // 사용자가 직접 배치
    map: JSON.stringify((() => {
        const ROWS = 40;
        const COLS = 23;
        const CENTER_X = COLS / 2;
        const CENTER_Y = ROWS / 2;

        // --- 원칙 2: 데이터 무결성 - 컨셉에 맞는 색상 정의 ---
        const wall = { type: 'WALL', color: '#1A202C' };
        // 요청에 따라 하늘색 빙판 바닥으로 변경
        const iceFloor = { type: 'FLOOR', color: '#7dd3fc' };
        const lava = { type: 'LAVA', color: '#f97316' };
        const crystal = { type: 'GLASS_WALL', color: 'rgba(224, 242, 254, 0.7)' };

        // 1. 기본 맵을 용암으로 초기화
        const map = [...Array(ROWS)].map(() => [...Array(COLS)].map(() => ({ ...lava })));

        // 맵 가장자리는 벽으로 설정
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1) {
                    map[y][x] = { ...wall };
                }
            }
        }

        // 2. 중앙에 둥글고 긴 하늘색 빙판 생성 (타원 공식 활용)
        const xRadius = 8;  // 가로 반지름
        const yRadius = 18; // 세로 반지름

        for (let y = 1; y < ROWS - 1; y++) {
            for (let x = 1; x < COLS - 1; x++) {
                // 타원 방정식: (x^2 / a^2) + (y^2 / b^2) <= 1
                if (Math.pow((x - CENTER_X) / xRadius, 2) + Math.pow((y - CENTER_Y) / yRadius, 2) <= 1) {
                    map[y][x] = { ...iceFloor };
                }
            }
        }
        
        // 3. 빙판 위에 전략적 엄폐물 (얼음 수정) 배치
        const crystalPositions = [
            {y: 12, x: 11},
            {y: ROWS - 13, x: 11},
            {y: 20, x: 7},
            {y: 20, x: COLS - 8},
        ];
        crystalPositions.forEach(pos => {
            map[pos.y][pos.x] = { ...crystal };
        });

        // 4. 중앙 쟁탈 요소 배치
        map[20][11] = { type: 'AWAKENING_POTION', color: '#FFFFFF' };


        return map;
    })()),
    // --- 당신이 관여하지 않는 영역 ---
    units: [],
    weapons: [],
    growingFields: [],
};
