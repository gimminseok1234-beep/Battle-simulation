// js/maps/clockworktower.js

/**
 * 맵 제목: 태엽장치 탑 (clockworktower) - 리뉴얼 버전
 * 컨셉: 거대한 태엽장치로 이루어진 탑의 내부에서 전투를 벌이는 대칭형 맵입니다.
 * 톱니바퀴의 안쪽은 안전한 바닥으로, 바깥쪽 가장자리는 사각형의 돌진 타일이 흐르도록 하여
 * 안정성과 변칙적인 움직임을 모두 활용할 수 있습니다.
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

        // 2. 사각형 돌진 타일이 있는 톱니바퀴 생성 함수
        const createGear = (topY, leftX, height, width, clockwise) => {
            const bottomY = topY + height - 1;
            const rightX = leftX + width - 1;

            // 톱니바퀴의 내부를 일반 바닥으로 채우기
            for (let y = topY; y <= bottomY; y++) {
                for (let x = leftX; x <= rightX; x++) {
                    map[y][x] = { ...gearFloor };
                }
            }

            // 가장자리에 사각형 방향으로 돌진 타일 배치
            for (let x = leftX; x <= rightX; x++) {
                map[topY][x] = { type: 'DASH_TILE', direction: clockwise ? 'RIGHT' : 'LEFT', color: '#eab308' }; // 상단
                map[bottomY][x] = { type: 'DASH_TILE', direction: clockwise ? 'LEFT' : 'RIGHT', color: '#eab308' }; // 하단
            }
            for (let y = topY + 1; y < bottomY; y++) {
                map[y][leftX] = { type: 'DASH_TILE', direction: clockwise ? 'UP' : 'DOWN', color: '#eab308' }; // 좌측
                map[y][rightX] = { type: 'DASH_TILE', direction: clockwise ? 'DOWN' : 'UP', color: '#eab308' }; // 우측
            }
        };

        // 3. 톱니바퀴와 연결 통로 배치
        // 상단 톱니 (시계방향)
        createGear(5, 6, 12, 11, true);
        // 하단 톱니 (반시계방향으로 대칭미 부여)
        createGear(ROWS - 17, 6, 12, 11, false);
        
        // 중앙 연결 통로
        for(let y = 17; y < 23; y++) {
            map[y][11] = { ...walkway };
        }
        map[17][10] = { ...walkway }; map[17][12] = { ...walkway };
        map[22][10] = { ...walkway }; map[22][12] = { ...walkway };
        
        // 중앙 보상 타일
        map[20][11] = { type: 'AWAKENING_POTION', color: '#FFFFFF' };


        return map;
    })()),
    // --- 당신이 관여하지 않는 영역 ---
    units: [],
    weapons: [],
    growingFields: [],
};
