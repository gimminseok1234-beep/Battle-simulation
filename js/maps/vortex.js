// js/maps/vortex.js

/**
 * 맵 제목: 소용돌이 (vortex)
 * 컨셉: 중앙 제단을 향해 나선형으로 좁아지는 길을 따라 전투를 벌이는 맵.
 * 길목의 용암 함정과 돌진 타일을 이용한 전략적인 플레이가 요구됩니다.
 */

export const vortexmap = {
    name: "vortex",
    width: 460,
    height: 800,
    hadokenKnockback: 15,
    autoMagneticField: { isActive: false },
    nexuses: [],
    map: JSON.stringify((() => {
        const ROWS = 40;
        const COLS = 23;
        const wall = { type: 'WALL', color: '#434190' };
        const floor = { type: 'FLOOR', color: '#3c3a80' };
        const map = [...Array(ROWS)].map(() => [...Array(COLS)].map(() => ({ ...wall })));

        let x = 1, y = 1, dx = 1, dy = 0, len = COLS - 1, passed = 0;
        while (len > 1) {
            for (let i = 0; i < len -1; i++) {
                if (map[y] && map[y][x]) {
                    map[y][x] = { ...floor };
                    if(map[y+1] && map[y+1][x+1]) map[y+1][x+1] = { ...floor };
                    if (i > 1 && Math.random() < 0.05) map[y][x] = { type: 'LAVA', color: '#f97316' };
                }
                x += dx; y += dy;
            }
            [dx, dy] = [-dy, dx];
            passed++;
            if (passed % 2 === 0) len -= 2;
        }

        for(let i = 18; i < 22; i++) {
            for (let j = 10; j < 13; j++) map[i][j] = { ...floor };
        }
        map[19][11] = { type: 'HEAL_PACK', color: '#22c55e' };
        map[20][11] = { type: 'HEAL_PACK', color: '#22c55e' };

        map[5][5] = { type: 'DASH_TILE', direction: 'RIGHT', color: '#ffffff' };
        map[34][17] = { type: 'DASH_TILE', direction: 'LEFT', color: '#ffffff' };
        
        return map;
    })()),
    units: [],
    weapons: [],
    growingFields: [],
};
