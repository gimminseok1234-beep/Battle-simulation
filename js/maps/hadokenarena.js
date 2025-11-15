// js/maps/hadokenarena.js

/**
 * 맵 제목: 장풍 결투장 (hadokenarena)
 * 컨셉: 오직 장풍의 넉백 효과를 이용해 상대를 용암으로 밀어내는 배틀로얄 맵.
 * 중앙의 부서지는 벽과 돌진 타일이 전략적인 변수를 창출합니다.
 */

export const hadokenarenamap = {
    name: "hadokenarena",
    width: 460,
    height: 800,
    hadokenKnockback: 25,
    autoMagneticField: { isActive: false },
    nexuses: [],
    map: JSON.stringify((() => {
        const ROWS = 40;
        const COLS = 23;
        const wall = { type: 'WALL', color: '#1A202C' };
        const floor = { type: 'FLOOR', color: '#4A5568' };
        const lava = { type: 'LAVA', color: '#f97316' }; // color 속성 추가

        const map = [...Array(ROWS)].map(() => Array(COLS).fill(null));

        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1) {
                    map[y][x] = { ...wall };
                } else if (y >= 1 && y <= 4 || y >= ROWS - 5 && y <= ROWS - 2) {
                    map[y][x] = { ...lava };
                } else {
                    map[y][x] = { ...floor };
                }
            }
        }

        const placeCrackedWall = (x, y, hp = 100) => {
            if (map[y] && map[y][x]) {
                map[y][x] = { type: 'CRACKED_WALL', hp, color: '#718096' };
            }
        };

        placeCrackedWall(7, 15);
        placeCrackedWall(COLS - 1 - 7, ROWS - 1 - 15);
        placeCrackedWall(15, 15);
        placeCrackedWall(COLS - 1 - 15, ROWS - 1 - 15);
        placeCrackedWall(11, 18);
        placeCrackedWall(11, 21);

        map[20][3] = { type: 'DASH_TILE', direction: 'RIGHT', color: '#ffffff' };
        map[19][COLS - 1 - 3] = { type: 'DASH_TILE', direction: 'LEFT', color: '#ffffff' };
        map[12][11] = { type: 'DASH_TILE', direction: 'DOWN', color: '#ffffff' };
        map[ROWS - 1 - 12][11] = { type: 'DASH_TILE', direction: 'UP', color: '#ffffff' };

        return map;
    })()),
    units: [],
    weapons: [],
    growingFields: [],
};
