// js/maps/factory.js

/**
 * 맵 제목: 자동화 공장 (factory)
 * 컨셉: 돌진 타일을 '컨베이어 벨트'처럼 활용하여 강제 이동 기믹을 가진 맵.
 * 벨트 끝의 함정과 교차로에서의 전투가 핵심 전략 요소입니다.
 */

export const factorymap = {
    name: "factory",
    width: 460,
    height: 800,
    hadokenKnockback: 15,
    autoMagneticField: { isActive: false },
    nexuses: [],
    map: JSON.stringify((() => {
        const ROWS = 40;
        const COLS = 23;
        const wall = { type: 'WALL', color: '#2d3748' };
        const floor = { type: 'FLOOR', color: '#4a5568' };
        const lava = { type: 'LAVA', color: '#f97316' };
        const map = [...Array(ROWS)].map(() => [...Array(COLS)].map(() => ({ ...floor })));

        for (let y = 0; y < ROWS; y++) {
            if (y === 0 || y === ROWS - 1) {
                for (let x = 0; x < COLS; x++) map[y][x] = { ...wall };
            }
            map[y][0] = { ...wall };
            map[y][COLS - 1] = { ...wall };
        }
        
        const placeDashLine = (x, y, length, direction) => {
            for (let i = 0; i < length; i++) {
                let cX = x, cY = y;
                if (direction === 'RIGHT') cX += i; else if (direction === 'LEFT') cX -= i;
                if (direction === 'DOWN') cY += i; else if (direction === 'UP') cY -= i;
                if (map[cY] && map[cY][cX]) {
                    map[cY][cX] = { type: 'DASH_TILE', direction, color: '#CBD5E0' };
                }
            }
        };

        placeDashLine(1, 10, 21, 'RIGHT');
        placeDashLine(21, 29, 21, 'LEFT');
        placeDashLine(5, 1, 38, 'DOWN');
        placeDashLine(17, 38, 38, 'UP');

        map[15][11] = { type: 'DASH_TILE', direction: 'UP', color: '#ffffff' };
        map[24][11] = { type: 'DASH_TILE', direction: 'DOWN', color: '#ffffff' };
        map[20][8] = { type: 'DASH_TILE', direction: 'LEFT', color: '#ffffff' };
        map[20][14] = { type: 'DASH_TILE', direction: 'RIGHT', color: '#ffffff' };
        
        for (let i = 1; i < 5; i++) map[10][i] = { ...lava };
        for (let i = 18; i < 22; i++) map[29][i] = { ...lava };

        map[18][10] = { ...wall }; map[18][12] = { ...wall };
        map[21][10] = { ...wall }; map[21][12] = { ...wall };

        map[3][3] = { type: 'TELEPORTER', color: '#8b5cf6' };
        map[36][19] = { type: 'TELEPORTER', color: '#8b5cf6' };
        
        map[20][11] = { type: 'HEAL_PACK', color: '#22c55e' };

        return map;
    })()),
    units: [],
    weapons: [],
    growingFields: [],
};