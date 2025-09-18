// js/maps/arena.js

/**
 * 맵 제목: 왕의 결투장 (arena) - 리뉴얼 버전
 * 컨셉: 즉각적인 전투를 유도하기 위해 맵의 구조를 좁혔으며,
 * 황금색 타일과 용암 해자를 추가하여 더욱 화려하고 장엄한 분위기를 연출합니다.
 */

export const arenaMap = {
    name: "arena",
    width: 460,
    height: 800,
    hadokenKnockback: 15,
    autoMagneticField: { isActive: false },
    nexuses: [], // 사용자가 직접 배치
    map: JSON.stringify((() => {
        const ROWS = 40;
        const COLS = 23;

        // --- 원칙 2: 데이터 무결성 - 새로운 색상 정의 ---
        const outerWall = { type: 'WALL', color: '#2d3748' };     // 외부 성벽
        const innerWall = { type: 'WALL', color: '#1a202c' };     // 내부 결투장 벽 (검은색)
        const floor = { type: 'FLOOR', color: '#4a5568' };      // 기본 바닥
        const carpet = { type: 'FLOOR', color: '#581c87' };     // 결투장 카펫 (Royal Purple)
        const gold = { type: 'FLOOR', color: '#facc15' };       // 황금 장식
        const lava = { type: 'LAVA', color: '#f97316' };        // 장식용 용암

        // 1. 기본 바닥과 외부 성벽 생성
        const map = [...Array(ROWS)].map(() => [...Array(COLS)].map(() => ({ ...floor })));
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1) {
                    map[y][x] = { ...outerWall };
                }
            }
        }

        // 2. 장식용 용암 해자 배치
        for (let y = 1; y < ROWS - 1; y++) {
            map[y][1] = { ...lava };
            map[y][COLS - 2] = { ...lava };
        }
        for (let x = 2; x < COLS - 2; x++) {
            map[1][x] = { ...lava };
            map[ROWS - 2][x] = { ...lava };
        }

        // 3. 내부 결투장 벽을 생성하여 맵 좁히기
        const arenaTop = 8;
        const arenaBottom = ROWS - 9;
        const arenaLeft = 5;
        const arenaRight = COLS - 6;

        for (let y = arenaTop; y <= arenaBottom; y++) {
            for (let x = arenaLeft; x <= arenaRight; x++) {
                if (y === arenaTop || y === arenaBottom || x === arenaLeft || x === arenaRight) {
                    map[y][x] = { ...innerWall };
                } else {
                    map[y][x] = { ...carpet };
                }
            }
        }
        // 결투장 입구 생성
        map[arenaTop][11] = { ...carpet };
        map[arenaBottom][11] = { ...carpet };


        // 4. 화려한 황금 장식 추가
        const goldPositions = [
            {y: arenaTop + 2, x: arenaLeft}, {y: arenaTop + 2, x: arenaRight},
            {y: arenaBottom - 2, x: arenaLeft}, {y: arenaBottom - 2, x: arenaRight},
            {y: 18, x: arenaLeft - 1}, {y: 18, x: arenaRight + 1},
            {y: 21, x: arenaLeft - 1}, {y: 21, x: arenaRight + 1},
        ];
        goldPositions.forEach(pos => {
            map[pos.y][pos.x] = { ...gold };
        });

        // 5. 특수 타일 재배치
        // 시작 지점을 결투장 바로 앞으로 이동
        map[arenaTop - 2][11] = { type: 'DASH_TILE', direction: 'DOWN', color: '#e2e8f0' };
        map[arenaBottom + 2][11] = { type: 'DASH_TILE', direction: 'UP', color: '#e2e8f0' };

        // 중앙 힐 팩 제거 완료 (자동으로 카펫으로 덮임)

        return map;
    })()),
    // --- 당신이 관여하지 않는 영역 ---
    units: [],
    weapons: [],
    growingFields: [],
};
