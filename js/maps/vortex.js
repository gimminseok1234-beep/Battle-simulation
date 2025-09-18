// js/maps/vortex.js

/**
 * 맵 제목: 삼중 나선 (vortex) - 리뉴얼 버전
 * 컨셉: 중앙 제단을 향해 뻗어있는 세 개의 독립된 라인에서 전투가 벌어지는 대칭형 맵입니다.
 * 각 라인의 특성을 파악하고 활용하는 것이 승리의 열쇠가 됩니다.
 */

export const vortexmap = {
    name: "vortex",
    width: 460,
    height: 800,
    hadokenKnockback: 15,
    autoMagneticField: { isActive: false },
    nexuses: [], // 사용자가 직접 배치
    map: JSON.stringify((() => {
        const ROWS = 40;
        const COLS = 23;

        // --- 원칙 2: 데이터 무결성 - 색상 정의 ---
        const wall = { type: 'WALL', color: '#1A202C' };       // 공허 벽
        const floor = { type: 'FLOOR', color: '#2D3748' };     // 기본 바닥
        const midLane = { type: 'FLOOR', color: '#4A5568' };   // 중앙 라인 바닥

        // 1. 기본 맵 생성 (모든 공간을 벽으로 초기화)
        const map = [...Array(ROWS)].map(() => [...Array(COLS)].map(() => ({ ...wall })));

        // 2. 세 개의 라인 생성 (프로그래밍 방식)
        // 중앙 라인 (넓고 직선적)
        for (let y = 1; y < ROWS - 1; y++) {
            for (let x = 9; x <= 13; x++) {
                map[y][x] = { ...midLane };
            }
        }

        // 왼쪽 라인 (좁고 구불구불함)
        for (let y = 1; y < 15; y++) { map[y][4] = { ...floor }; map[y][5] = { ...floor };}
        for (let x = 5; x < 9; x++) { map[14][x] = { ...floor }; map[15][x] = { ...floor };}
        for (let y = 15; y < 25; y++) { map[y][8] = { ...floor }; }
        for (let x = 5; x < 9; x++) { map[24][x] = { ...floor }; map[25][x] = { ...floor };}
        for (let y = 25; y < ROWS - 1; y++) { map[y][4] = { ...floor }; map[y][5] = { ...floor };}

        // 오른쪽 라인 (왼쪽과 대칭)
        for (let y = 1; y < 15; y++) { map[y][COLS - 5] = { ...floor }; map[y][COLS - 6] = { ...floor };}
        for (let x = COLS - 9; x < COLS - 5; x++) { map[14][x] = { ...floor }; map[15][x] = { ...floor };}
        for (let y = 15; y < 25; y++) { map[y][COLS - 9] = { ...floor }; }
        for (let x = COLS - 9; x < COLS - 5; x++) { map[24][x] = { ...floor }; map[25][x] = { ...floor };}
        for (let y = 25; y < ROWS - 1; y++) { map[y][COLS - 5] = { ...floor }; map[y][COLS - 6] = { ...floor };}


        // 3. 전략적 타일 배치
        // 중앙 라인의 장애물
        map[12][11] = { type: 'CRACKED_WALL', hp: 200, color: '#718096' };
        map[ROWS - 13][11] = { type: 'CRACKED_WALL', hp: 200, color: '#718096' };

        // 중앙 제단 (핵심 쟁탈 지역)
        map[19][11] = { type: 'HEAL_PACK', color: '#16a34a' };
        map[20][11] = { type: 'HEAL_PACK', color: '#16a34a' };

        // 사이드 라인의 돌진 타일 (빠른 합류 및 기습 유도)
        map[10][4] = { type: 'DASH_TILE', direction: 'DOWN', color: '#e2e8f0' };
        map[10][COLS - 5] = { type: 'DASH_TILE', direction: 'DOWN', color: '#e2e8f0' };
        map[ROWS - 11][4] = { type: 'DASH_TILE', direction: 'UP', color: '#e2e8f0' };
        map[ROWS - 11][COLS - 5] = { type: 'DASH_TILE', direction: 'UP', color: '#e2e8f0' };


        return map;
    })()),
    units: [],
    weapons: [],
    growingFields: [],
};
