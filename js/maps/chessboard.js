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

        // 3x5 격자의 방 생성
        for (let roomY = 0; roomY < 5; roomY++) {
            for (let roomX = 0; roomX < 3; roomX++) {
                const startX = roomX * 7 + 2;
                const startY = roomY * 7 + 3;
                // 방 내부 바닥
                for (let y = startY; y < startY + 5; y++) {
                    for (let x = startX; x < startX + 5; x++) {
                        map[y][x] = { ...floor };
                    }
                }
                // 문 생성
                if (roomX < 2) map[startY + 2][startX + 4] = { ...floor }; // 오른쪽 문
                if (roomY < 4) map[startY + 4][startX + 2] = { ...floor }; // 아래쪽 문
            }
        }

        // 특수 방 설정
        // 용암 방
        const lavaRoomX = 2, lavaRoomY = 2;
        for (let y = lavaRoomY * 7 + 3; y < lavaRoomY * 7 + 8; y++) {
            for (let x = lavaRoomX * 7 + 2; x < lavaRoomX * 7 + 7; x++) {
                 if(map[y][x].type == 'FLOOR') map[y][x] = { type: 'LAVA' };
            }
        }
        // 치료실
        map[1 * 7 + 5][0 * 7 + 4] = { type: 'HEAL_PACK', color: '#22c55e' };
        
        // 고립실 (부서지는 벽)
        map[3 * 7 + 5][1 * 7 + 6] = { type: 'CRACKED_WALL', hp: 200, color: '#718096' };

        // 텔레포터 방
        map[0 * 7 + 5][2 * 7 + 4] = { type: 'TELEPORTER', color: '#8b5cf6' };
        map[4 * 7 + 5][0 * 7 + 4] = { type: 'TELEPORTER', color: '#8b5cf6' };

        return map;
    })()),
    units: [],
    weapons: [],
    growingFields: [],
};