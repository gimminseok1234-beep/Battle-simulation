// js/maps/ninjavillage.js

/**
 * 맵 제목: 그림자 도장 (ninjavillage) - 디자인 강화 버전
 * 컨셉: 달빛 아래 훈련하는 닌자들의 비밀스러운 도장. 짙은 색감의 대비와
 * 상징적인 건축물을 통해 맵의 시각적 완성도와 테마를 극대화했습니다.
 */

export const ninjavillageMap = {
    name: "ninjavillage",
    width: 460,
    height: 800,
    hadokenKnockback: 15,
    autoMagneticField: { isActive: false },
    nexuses: [], // 사용자가 직접 배치
    map: JSON.stringify((() => {
        const ROWS = 40;
        const COLS = 23;

        // --- 원칙 2: 데이터 무결성 - 컨셉에 맞는 다양한 색상 정의 ---
        const wall = { type: 'WALL', color: '#2d3748' };             // 도장 외벽
        const floor = { type: 'FLOOR', color: '#1a202c' };           // 어두운 바닥
        const woodFloor = { type: 'FLOOR', color: '#5c3317' };      // 나무 마루
        const water = { type: 'LAVA', color: '#2b6cb0' };            // 해자 (깊은 물)
        const bridge = { type: 'FLOOR', color: '#9b2c2c' };          // 붉은 다리
        const crackedWall = { type: 'CRACKED_WALL', hp: 80, color: '#718096' }; // 부서지는 장지문

        // 1. 기본 맵 생성
        const map = [...Array(ROWS)].map(() => [...Array(COLS)].map(() => ({ ...floor })));
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1) {
                    map[y][x] = { ...wall };
                }
            }
        }

        // 2. 중앙 도장과 주변 해자(water) 생성
        const dojoTop = 15;
        const dojoBottom = 24;
        const dojoLeft = 6;
        const dojoRight = 16;

        for (let y = dojoTop - 2; y <= dojoBottom + 2; y++) {
            for (let x = dojoLeft - 2; x <= dojoRight + 2; x++) {
                 map[y][x] = { ...water };
            }
        }
        for (let y = dojoTop; y <= dojoBottom; y++) {
            for (let x = dojoLeft; x <= dojoRight; x++) {
                map[y][x] = { ...woodFloor };
            }
        }

        // 3. 도장으로 진입하는 붉은 다리(bridge) 건설
        map[dojoTop - 2][11] = { ...bridge }; map[dojoTop - 1][11] = { ...bridge };
        map[dojoBottom + 1][11] = { ...bridge }; map[dojoBottom + 2][11] = { ...bridge };

        // 4. 파괴 가능한 벽(CRACKED_WALL) 재배치
        map[dojoTop][11] = { ...crackedWall }; map[dojoBottom][11] = { ...crackedWall }; // 도장 정문
        map[20][dojoLeft] = { ...crackedWall }; map[20][dojoRight] = { ...crackedWall }; // 도장 측면 비밀문

        // 5. 민첩한 이동을 위한 돌진 타일(DASH_TILE) 재배치
        // 외곽 순환 경로
        map[5][5] = { type: 'DASH_TILE', direction: 'RIGHT', color: '#e2e8f0' };
        map[5][COLS - 6] = { type: 'DASH_TILE', direction: 'DOWN', color: '#e2e8f0' };
        map[ROWS - 6][COLS - 6] = { type: 'DASH_TILE', direction: 'LEFT', color: '#e2e8f0' };
        map[ROWS - 6][5] = { type: 'DASH_TILE', direction: 'UP', color: '#e2e8f0' };

        // 6. 전략적 특수 타일 배치
        // 도장 내부의 보상
        map[20][11] = { type: 'HEAL_PACK', color: '#16a34a' };

        // 비밀 통로 (텔레포터)
        map[1][1] = { type: 'TELEPORTER', color: '#8b5cf6' };
        map[ROWS - 2][COLS - 2] = { type: 'TELEPORTER', color: '#8b5cf6' };

        return map;
    })()),
    // --- 당신이 관여하지 않는 영역 ---
    units: [],
    weapons: [],
    growingFields: [],
};
