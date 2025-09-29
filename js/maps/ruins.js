// js/maps/ruins.js

/**
 * 맵 제목: 폐허 (Ruins) - 수정 버전
 * 컨셉: 기존 폐허 맵을 기반으로, 중앙 용암 지대를 없애고 맵 전체에
 * 무작위 장애물과 특수 타일을 배치하여 예측 불가능한 난전을 유도합니다.
 * 바닥 색상을 칙칙하게 변경하여 폐허의 분위기를 강조했습니다.
 */

export const ruinsMap = {
    name: "ruins",
    width: 460,
    height: 800,
    hadokenKnockback: 15,
    autoMagneticField: { isActive: false },
    nexuses: [], // 넥서스는 사용자가 직접 배치
    // [오류 수정] 맵 생성 함수가 즉시 실행된 후, 그 결과인 배열이 문자열로 변환되도록 수정
    map: JSON.stringify((() => {
        const ROWS = 40;
        const COLS = 23;
        const map = [...Array(ROWS)].map(() => Array(COLS).fill(null));
        // 요청하신 대로 폐허에 어울리는 칙칙한 바닥 색으로 변경
        const drearyFloor = { type: 'FLOOR', color: '#2d3748' }; 

        // 1. 기본 맵 생성 (바닥과 외벽)
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1) {
                    map[y][x] = { type: 'WALL', color: '#111827' };
                } else {
                    map[y][x] = { ...drearyFloor };
                }
            }
        }

        // 2. 무작위 장애물 배치 (벽, 부서지는 벽, 용암)
        for (let y = 1; y < ROWS - 1; y++) {
            for (let x = 1; x < COLS - 1; x++) {
                // 시작 지점 근처(상하 5칸)는 장애물 생성을 방지하여 초기 전투 공간 확보
                if (y <= 5 || y >= ROWS - 6) continue;

                const rand = Math.random();
                if (rand < 0.04) { // 벽 (비율 낮음)
                    map[y][x] = { type: 'WALL', color: '#111827' };
                } else if (rand < 0.15) { // 부서지는 벽 (비율 높음)
                    map[y][x] = { type: 'CRACKED_WALL', hp: 100, color: '#4a5568' };
                } else if (rand < 0.22) { // 용암 (비율 높음)
                    map[y][x] = { type: 'LAVA', color: '#FF4500' };
                }
            }
        }
        
        // 3. 무작위 특수 타일 배치 (텔레포터, 돌진 타일)
        const placeSpecialTile = (tile) => {
            let placed = false;
            while (!placed) {
                const x = Math.floor(Math.random() * (COLS - 2)) + 1;
                const y = Math.floor(Math.random() * (ROWS - 2)) + 1;
                // 바닥 타일에만 특수 타일을 설치하도록 확인
                if (map[y][x].type === 'FLOOR') {
                    map[y][x] = tile;
                    placed = true;
                }
            }
        };

        // 텔레포터 2개 배치
        placeSpecialTile({ type: 'TELEPORTER', color: '#8b5cf6' });
        placeSpecialTile({ type: 'TELEPORTER', color: '#8b5cf6' });

        // 돌진 타일 4개 배치
        const directions = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
        for (let i = 0; i < 4; i++) {
            const dir = directions[Math.floor(Math.random() * directions.length)];
            placeSpecialTile({ type: 'DASH_TILE', direction: dir, color: '#ffffff' });
        }

        return map;
    })()),
    units: [], // 유닛은 사용자가 직접 배치
    weapons: [], // 무기는 사용자가 직접 배치
    growingFields: [],
};
