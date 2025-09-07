// js/maps/chessboard.js

/**
 * 맵 제목: 체스판 (chessboard)
 * 컨셉: 체스판처럼 나뉜 여러 방을 오가며 싸우는 실내전 맵.
 * 각 방의 특성을 파악하고 텔레포터를 활용하는 전략이 중요합니다.
 */

export const chessboardmap = {
    name: "chessboard",
    width: 460,
    height: 800,
    hadokenKnockback: 15,
    autoMagneticField: { isActive: false },
    nexuses: [],
    map: JSON.stringify((() => {
        const ROWS = 40;
        const COLS = 23;
        const wall = { type: 'WALL', color: '#1A202C' };
        const floor = { type: 'FLOOR', color: '#A0AEC0' };
        const map = [...Array(ROWS)].map(() => [...Array(COLS)].map(() => ({ ...wall })));

        for (let roomY = 0; roomY < 5; roomY++) {
            for (let roomX = 0; roomX < 3; roomX++) {
                const startX = roomX * 7 + 1;
                const startY = roomY * 8;
                for (let y = startY + 1; y < startY + 7; y++) {
                    for (let x = startX + 1; x < startX + 6; x++) {
                        if (y < ROWS -1 && x < COLS -1) map[y][x] = { ...floor };
                    }
                }
                // [오류 수정] 문 위치를 정확한 벽 좌표로 수정
                if (roomX < 2) {
                    map[startY + 3][startX + 6] = { ...floor };
                    map[startY + 4][startX + 6] = { ...floor };
                }
                if (roomY < 4) {
                    map[startY + 7][startX + 3] = { ...floor };
                }
            }
        }
        
        const lavaRoomX = 2, lavaRoomY = 2;
        for (let y = lavaRoomY * 8 + 1; y < lavaRoomY * 8 + 7; y++) {
            for (let x = lavaRoomX * 7 + 2; x < lavaRoomX * 7 + 7; x++) {
                 if(map[y][x].type === 'FLOOR') map[y][x] = { type: 'LAVA', color: '#f97316' };
            }
        }
        
        map[1 * 8 + 4][0 * 7 + 4] = { type: 'HEAL_PACK', color: '#22c55e' };
        map[3 * 8 + 7][1 * 7 + 4] = { type: 'CRACKED_WALL', hp: 200, color: '#718096' };

        map[0 * 8 + 4][2 * 7 + 4] = { type: 'TELEPORTER', color: '#8b5cf6' };
        map[4 * 8 + 4][0 * 7 + 4] = { type: 'TELEPORTER', color: '#8b5cf6' };

        return map;
    })()),
    units: [],
    weapons: [],
    growingFields: [],
};
