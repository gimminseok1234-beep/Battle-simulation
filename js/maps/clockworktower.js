// js/maps/clockworktower.js

/**
 * 맵 제목: 태엽장치 탑 (clockworktower) - 최종 수정 버전
 * 컨셉: 거대한 태엽장치로 이루어진 탑의 내부에서 전투를 벌이는 대칭형 맵입니다.
 * 이제 톱니바퀴 사이를 돌진 타일로 빠르게 건널 수 있어,
 * 두 전장을 넘나드는 기습적이고 역동적인 전투가 가능합니다.
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
        const wall = { type: 'WALL', color: '#4a5568' };         // 탑의 벽
        const abyss = { type: 'LAVA', color: '#1a202c' };        // 추락 지점 (어두운 배경)
        const gearFloor = { type: 'FLOOR', color: '#ca8a04' };   // 톱니바퀴 바닥 (황동색)
        const walkway = { type: 'FLOOR', color: '#a1a1aa' };     // 연결 통로 (강철색)

        // 1. 기본 맵을 추락 지점(abyss)으로 초기화
        const map = [...Array(ROWS)].map(() => [...Array(COLS)].map(() => ({ ...abyss })));
        for (let y = 0; y < ROWS; y++) {
            if (y === 0 || y === ROWS - 1) {
                for (let x = 0; x < COLS; x++) map[y][x] = { ...wall };
            }
            map[y][0] = { ...wall };
            map[y][COLS - 1] = { ...wall };
        }

        // 2. 톱니바퀴 생성 함수 (내부는 일반 바닥)
        const createGear = (topY, leftX, height, width) => {
            for (let y = topY; y < topY + height; y++) {
                for (let x = leftX; x < leftX + width; x++) {
                    map[y][x] = { ...gearFloor };
                }
            }
        };

        const topGear = { y: 5, x: 6, h: 12, w: 11 };
        const bottomGear = { y: ROWS - 17, x: 6, h: 12, w: 11 };

        createGear(topGear.y, topGear.x, topGear.h, topGear.w);
        createGear(bottomGear.y, bottomGear.x, bottomGear.h, bottomGear.w);

        // 3. 돌진 타일 방향 수정: 서로 마주보는 톱니바퀴로 향하도록
        // 상단 톱니바퀴의 하단 엣지 -> 아래를 향함
        for (let x = topGear.x; x < topGear.x + topGear.w; x++) {
            map[topGear.y + topGear.h - 1][x] = { type: 'DASH_TILE', direction: 'DOWN', color: '#eab308' };
        }
        // 하단 톱니바퀴의 상단 엣지 -> 위를 향함
        for (let x = bottomGear.x; x < bottomGear.x + bottomGear.w; x++) {
            map[bottomGear.y][x] = { type: 'DASH_TILE', direction: 'UP', color: '#eab308' };
        }
        
        // 4. 중앙 연결 통로 및 보상 배치 (통로는 이제 보조 경로)
        for(let y = 17; y < 23; y++) {
            map[y][11] = { ...walkway };
        }
        map[17][10] = { ...walkway }; map[17][12] = { ...walkway };
        map[22][10] = { ...walkway }; map[22][12] = { ...walkway };
        
        map[20][11] = { type: 'AWAKENING_POTION', color: '#FFFFFF' };

        return map;
    })()),
    // --- 당신이 관여하지 않는 영역 ---
    units: [],
    weapons: [],
    growingFields: [],
};
