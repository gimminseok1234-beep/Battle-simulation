// js/maps/arena.js

/**
 * 맵 제목: 왕의 결투장 (arena)
 * 컨셉: 성 내부의 화려하고 장엄한 홀에서 벌어지는 1대1 대결에 최적화된 맵입니다.
 * 중앙의 기둥과 전략적으로 배치된 특수 타일들이 깊이 있는 전투를 유도합니다.
 */

export const arenaMap = {
    name: "arena",
    width: 460,
    height: 800,
    hadokenKnockback: 15, // 기본값 설정
    autoMagneticField: { isActive: false }, // 비활성화
    nexuses: [], // 사용자가 직접 배치
    map: JSON.stringify((() => {
        const ROWS = 40;
        const COLS = 23;

        // --- 맵 제작 4대 핵심 원칙 준수 ---
        // 원칙 2: 데이터 무결성 - type과 color 속성을 반드시 포함
        const wall = { type: 'WALL', color: '#2d3748' }; // 성벽 (Stone Gray)
        const floor = { type: 'FLOOR', color: '#4a5568' }; // 대리석 바닥 (Slate Gray)
        const carpet = { type: 'FLOOR', color: '#881337' }; // 레드 카펫 (Royal Red)

        // 1. 기본 바닥과 외벽 생성 (원칙 3: 구조 설계)
        const map = [...Array(ROWS)].map(() => [...Array(COLS)].map(() => ({ ...floor })));

        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1) {
                    map[y][x] = { ...wall };
                }
            }
        }

        // 2. 중앙 결투장 레드 카펫 배치
        for (let y = 8; y < ROWS - 8; y++) {
            for (let x = 9; x < COLS - 9; x++) {
                map[y][x] = { ...carpet };
            }
        }

        // 3. 전략적 구조물 (기둥) 배치
        // 파괴 가능한 기둥 (엄폐물 역할)
        const pillarPositions = [
            { y: 12, x: 7 }, { y: 12, x: COLS - 8 },
            { y: 20, x: 7 }, { y: 20, x: COLS - 8 },
            { y: 28, x: 7 }, { y: 28, x: COLS - 8 },
        ];

        pillarPositions.forEach(pos => {
            // 원칙 2: 데이터 무결성 - CRACKED_WALL에 hp 속성 포함
            map[pos.y][pos.x] = { type: 'CRACKED_WALL', hp: 150, color: '#1a202c' };
        });

        // 4. 특수 타일 대칭 배치 (1대1 공정성 확보)
        // 상단 진영 (Player 1)
        map[2][11] = { type: 'DASH_TILE', direction: 'DOWN', color: '#e2e8f0' }; // 시작 돌진 타일
        map[8][4] = { type: 'WALL', color: '#2d3748' }; // 방어벽
        map[8][COLS - 5] = { type: 'WALL', color: '#2d3748' };

        // 하단 진영 (Player 2)
        map[ROWS - 3][11] = { type: 'DASH_TILE', direction: 'UP', color: '#e2e8f0' };
        map[ROWS - 9][4] = { type: 'WALL', color: '#2d3748' };
        map[ROWS - 9][COLS - 5] = { type: 'WALL', color: '#2d3748' };

        // 중앙 쟁탈 요소
        map[Math.floor(ROWS / 2)][Math.floor(COLS / 2)] = { type: 'HEAL_PACK', color: '#16a34a' };

        return map;
    })()),
    // --- 당신이 관여하지 않는 영역 ---
    // 유닛, 무기 등은 사용자가 직접 배치하도록 비워둠
    units: [],
    weapons: [],
    growingFields: [],
};