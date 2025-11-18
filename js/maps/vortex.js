// js/maps/vortex.js

/**
 * 맵 제목: 삼중 통로 (vortex) - 최종 수정 버전
 * 컨셉: 세 개의 라인이 서로 만나지 않고 완전히 분리된 독특한 구조의 맵입니다.
 * 각 라인은 고유한 특성을 지니고 있어, 라인 선택과 운영의 중요성이 극대화됩니다.
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
        const lava = { type: 'LAVA', color: '#f97316' };       // 용암 함정

        // 1. 모든 공간을 벽으로 초기화하여 라인을 완벽하게 분리
        const map = [...Array(ROWS)].map(() => [...Array(COLS)].map(() => ({ ...wall })));

        // 2. 세 개의 분리된 라인 생성
        // 왼쪽 라인 (장애물 코스)
        const leftLaneX = [3, 4, 5];
        leftLaneX.forEach(x => {
            for (let y = 1; y < ROWS - 1; y++) {
                map[y][x] = { ...floor };
            }
        });
        map[12][4] = { type: 'CRACKED_WALL', hp: 120, color: '#718096' };
        map[20][3] = { type: 'CRACKED_WALL', hp: 120, color: '#718096' };
        map[20][5] = { type: 'CRACKED_WALL', hp: 120, color: '#718096' };
        map[28][4] = { type: 'CRACKED_WALL', hp: 120, color: '#718096' };

        // 중앙 라인 (힘싸움 코스)
        const midLaneX = [10, 11, 12];
        midLaneX.forEach(x => {
            for (let y = 1; y < ROWS - 1; y++) {
                map[y][x] = { ...floor };
            }
        });
        // 중앙 라인의 핵심 쟁탈 지점
        map[19][11] = { type: 'HEAL_PACK', color: '#16a34a' };
        map[20][11] = { type: 'HEAL_PACK', color: '#16a34a' };

        // 오른쪽 라인 (고속 기동 코스)
        const rightLaneX = [17, 18, 19];
        rightLaneX.forEach(x => {
            for (let y = 1; y < ROWS - 1; y++) {
                map[y][x] = { ...floor };
            }
        });
        // 돌진 타일과 용암 함정의 조합
        map[10][18] = { type: 'DASH_TILE', direction: 'DOWN', color: '#e2e8f0' };
        map[15][17] = { ...lava };
        map[15][19] = { ...lava };
        map[ROWS - 11][18] = { type: 'DASH_TILE', direction: 'UP', color: '#e2e8f0' };
        map[ROWS - 16][17] = { ...lava };
        map[ROWS - 16][19] = { ...lava };

        return map;
    })()),
    // --- 당신이 관여하지 않는 영역 ---
    units: [],
    weapons: [],
    growingFields: [],
};
