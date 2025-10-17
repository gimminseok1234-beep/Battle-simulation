// js/maps/clockworktower.js

/**
 * 맵 제목: 태엽장치 탑 (clockworktower) - 최종 버전
 * 컨셉: 거대한 태엽장치로 이루어진 탑의 내부에서 전투를 벌이는 대칭형 맵입니다.
 * 거리가 더 가까워진 두 태엽장치는 모든 테두리가 돌진 타일로 감싸여 있어,
 * 플레이어는 끊임없이 움직이며 상대를 나락으로 밀어내야 합니다.
 */
export const clockworktowerMap = {
    name: "clockworktower",
    width: 460,
    height: 800,
    hadokenKnockback: 15,
    autoMagneticField: { isActive: false },
    nexuses: [], // 사용자가 직접 배치
    map: JSON.stringify((() => {
        const ROWS = 40;
        const COLS = 23;

        // --- 원칙 2: 데이터 무결성 - 컨셉에 맞는 색상 정의 ---
        const wall = { type: 'WALL', color: '#4a5568' };
        const abyss = { type: 'LAVA', color: '#1a202c' };
        const gearFloor = { type: 'FLOOR', color: '#ca8a04' };
        const walkway = { type: 'FLOOR', color: '#a1a1aa' };

        // 1. 기본 맵을 추락 지점(abyss)으로 초기화
        const map = [...Array(ROWS)].map(() => [...Array(COLS)].map(() => ({ ...abyss })));
        for (let y = 0; y < ROWS; y++) {
            if (y === 0 || y === ROWS - 1) {
                for (let x = 0; x < COLS; x++) map[y][x] = { ...wall };
            }
            map[y][0] = { ...wall };
            map[y][COLS - 1] = { ...wall };
        }

        // 2. 톱니바퀴 생성 함수 (가장자리는 모두 돌진 타일)
        const createGear = (topY, leftX, height, width, clockwise) => {
            const bottomY = topY + height - 1;
            const rightX = leftX + width - 1;

            // 톱니바퀴의 내부를 일반 바닥으로 채우기
            for (let y = topY; y <= bottomY; y++) {
                for (let x = leftX; x <= rightX; x++) {
                    map[y][x] = { ...gearFloor };
                }
            }

            // 요청에 따라, 모든 테두리를 돌진 타일로 감싸기
            for (let x = leftX; x <= rightX; x++) {
                map[topY][x] = { type: 'DASH_TILE', direction: clockwise ? 'RIGHT' : 'LEFT', color: '#eab308' }; // 상단
                map[bottomY][x] = { type: 'DASH_TILE', direction: clockwise ? 'LEFT' : 'RIGHT', color: '#eab308' }; // 하단
            }
            for (let y = topY + 1; y < bottomY; y++) {
                map[y][leftX] = { type: 'DASH_TILE', direction: clockwise ? 'UP' : 'DOWN', color: '#eab308' }; // 좌측
                map[y][rightX] = { type: 'DASH_TILE', direction: clockwise ? 'DOWN' : 'UP', color: '#eab308' }; // 우측
            }
        };

        // 3. 태엽간의 거리를 2칸 줄여서 배치
        const topGear = { y: 7, x: 6, h: 12, w: 11 };
        const bottomGear = { y: ROWS - 19, x: 6, h: 12, w: 11 };

        createGear(topGear.y, topGear.x, topGear.h, topGear.w, true); // 상단 톱니 (시계방향)
        createGear(bottomGear.y, bottomGear.x, bottomGear.h, bottomGear.w, false); // 하단 톱니 (반시계방향)

        // 4. 중앙 연결 통로 및 보상 배치 (거리가 줄어들어 통로가 짧아짐)
        for(let y = 19; y < 21; y++) {
            map[y][11] = { ...walkway };
        }
        map[19][10] = { ...walkway }; map[19][12] = { ...walkway };
        map[20][10] = { ...walkway }; map[20][12] = { ...walkway };

        // 중앙 보상 타일은 중앙 통로에 그대로 유지
        map[20][11] = { type: 'AWAKENING_POTION', color: '#FFFFFF' };

        return map;
    })()),
    // --- 당신이 관여하지 않는 영역 ---
    units: [],
    weapons: [],
    growingFields: [],
};
