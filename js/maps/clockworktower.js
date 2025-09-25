// js/maps/clockworktower.js

/**
 * 맵 제목: 태엽장치 탑 (clockworktower)
 * 컨셉: 거대한 태엽장치로 이루어진 탑의 내부에서 전투를 벌이는 대칭형 맵입니다.
 * 회전하는 톱니바퀴(DASH_TILE) 위에서 위치를 선점하고 적을 밀어내는 컨트롤이 핵심입니다.
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

        // 2. 회전하는 톱니바퀴(DASH_TILE) 생성 함수
        const createGear = (centerY, centerX, radius, rotationDir) => {
            for (let y = centerY - radius; y <= centerY + radius; y++) {
                for (let x = centerX - radius; x <= centerX + radius; x++) {
                    if (Math.hypot(x - centerX, y - centerY) <= radius) {
                        map[y][x] = { ...gearFloor };
                        
                        // 원심력을 표현하는 돌진 타일 배치
                        const angle = Math.atan2(y - centerY, x - centerX);
                        let dir;
                        if (rotationDir === 'CW') { // 시계방향
                            if (angle >= -Math.PI/4 && angle < Math.PI/4) dir = 'DOWN';
                            else if (angle >= Math.PI/4 && angle < 3*Math.PI/4) dir = 'LEFT';
                            else if (angle >= 3*Math.PI/4 || angle < -3*Math.PI/4) dir = 'UP';
                            else dir = 'RIGHT';
                        } else { // 반시계방향
                            if (angle >= -Math.PI/4 && angle < Math.PI/4) dir = 'UP';
                            else if (angle >= Math.PI/4 && angle < 3*Math.PI/4) dir = 'RIGHT';
                            else if (angle >= 3*Math.PI/4 || angle < -3*Math.PI/4) dir = 'DOWN';
                            else dir = 'LEFT';
                        }
                        map[y][x] = { type: 'DASH_TILE', direction: dir, color: '#eab308' };
                    }
                }
            }
            map[centerY][centerX] = { type: 'HEAL_PACK', color: '#16a34a' }; // 톱니 중앙은 안전 지대
        };

        // 3. 톱니바퀴와 연결 통로 배치
        createGear(10, 11, 6, 'CW');  // 상단 톱니 (시계방향)
        createGear(30, 11, 6, 'CCW'); // 하단 톱니 (반시계방향)

        for(let y = 16; y < 24; y++) {
            map[y][11] = { ...walkway }; // 중앙 연결 통로
        }
        map[16][10] = { ...walkway }; map[16][12] = { ...walkway };
        map[23][10] = { ...walkway }; map[23][12] = { ...walkway };
        
        return map;
    })()),
    // --- 당신이 관여하지 않는 영역 ---
    units: [],
    weapons: [],
    growingFields: [],
};