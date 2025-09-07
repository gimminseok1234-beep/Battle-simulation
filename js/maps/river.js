// js/maps/river.js

/**
 * 맵 제목: 강변 (river)
 * 컨셉: 맵을 가로지르는 강과 두 개의 다리(라인), 그리고 정글로 구성된 MOBA 스타일 맵.
 * 라인전과 정글을 활용한 기습이 조화를 이룹니다.
 */

export const rivermap = {
    name: "river",
    width: 460,
    height: 800,
    hadokenKnockback: 15,
    autoMagneticField: { isActive: false },
    nexuses: [],
    map: JSON.stringify((() => {
        const ROWS = 40;
        const COLS = 23;
        const wall = { type: 'WALL', color: '#2F855A' };
        const floor = { type: 'FLOOR', color: '#9AE6B4' };
        const river = { type: 'LAVA', color: '#4299E1' }; // 강은 용암 타일로 표현
        const map = [...Array(ROWS)].map(() => [...Array(COLS)].map(() => ({ ...floor })));

        // 외벽
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1) {
                    map[y][x] = { ...wall };
                }
            }
        }
        
        // 강 생성 (대각선)
        for(let i = 0; i < ROWS; i++) {
            map[i][Math.floor(i * 0.4 + 4)] = { ...river };
            map[i][Math.floor(i * 0.4 + 5)] = { ...river };
        }
        
        // 다리 생성 (라인)
        for(let i = 7; i < 16; i++) {
            map[10][i] = { ...floor };
            map[11][i] = { ...floor };
            map[28][i] = { ...floor };
            map[29][i] = { ...floor };
        }

        // 정글 지역 (벽, 부서지는 벽)
        for(let y = 14; y < 26; y++) {
            for (let x = 8; x < 15; x++) {
                if(map[y][x].type === 'FLOOR' && Math.random() < 0.4) {
                    map[y][x] = Math.random() < 0.5 ? { ...wall } : { type: 'CRACKED_WALL', hp: 100, color: '#48BB78' };
                }
            }
        }
        // 정글 보상
        map[20][11] = { type: 'QUESTION_MARK', color: '#facc15' };

        return map;
    })()),
    units: [],
    weapons: [],
    growingFields: [],
};