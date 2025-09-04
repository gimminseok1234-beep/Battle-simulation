// js/maps/CentralBridgeShowdown.js

/**
 * 맵 제목: 중앙대교 혈투 (Central Bridge Showdown)
 * 컨셉: 중앙 다리를 중심으로 한 대칭형 전장입니다.
 * 중앙의 용암 지대는 위험하지만, 강력한 무기를 얻을 수 있는 기회를 제공합니다.
 */
export const CentralBridgeShowdown = { // 변수 이름을 CentralBridgeShowdown으로 수정
    name: '중앙대교 혈투',
    width: 460,
    height: 800,
    hadokenKnockback: 12,
    autoMagneticField: { isActive: false },
    nexuses: [
        { gridX: 11, gridY: 3, team: 'A' },
        { gridX: 11, gridY: 36, team: 'B' }
    ],
    map: JSON.stringify(
        [...Array(40)].map((_, y) =>
            [...Array(23)].map((_, x) => {
                const floor = { type: 'FLOOR', color: '#374151' };
                const wall = { type: 'WALL', color: '#111827' };
                const lava = { type: 'LAVA' };

                // Outer walls
                if (y === 0 || y === 39 || x === 0 || x === 22) return wall;

                // Team Bases (Top A, Bottom B)
                if ((y >= 1 && y <= 6) || (y >= 33 && y <= 38)) {
                    if (x > 5 && x < 17) {
                        if (y === 6 || y === 33) return { type: 'CRACKED_WALL', hp: 150 };
                        return floor;
                    }
                }

                // Central Bridge
                if (y >= 18 && y <= 21) {
                    if (x >= 7 && x <= 15) return floor;
                    if (x === 6 || x === 16) return lava;
                }
                if (y === 19 && x === 11) return { type: 'HEAL_PACK' };
                if ((y === 18 || y === 21) && x === 11) return { type: 'CRACKED_WALL', hp: 80 };


                // Side Paths & Structures
                if (x === 5 && y > 8 && y < 14) return wall;
                if (x === 5 && y > 25 && y < 31) return wall;
                if (y === 16 && x > 1 && x < 5) return { type: 'CRACKED_WALL', hp: 80 };
                if (y === 23 && x > 1 && x < 5) return { type: 'CRACKED_WALL', hp: 80 };

                if (x === 17 && y > 8 && y < 14) return wall;
                if (x === 17 && y > 25 && y < 31) return wall;
                if (y === 16 && x > 18 && x < 22) return { type: 'CRACKED_WALL', hp: 80 };
                if (y === 23 && x > 18 && x < 22) return { type: 'CRACKED_WALL', hp: 80 };
                
                if ((y === 10 || y === 29) && (x === 8 || x === 14)) return wall;

                // Special Tiles
                if ((x === 2 && y === 19) || (x === 20 && y === 19)) return { type: 'TELEPORTER' };
                if ((x === 11 && y === 8) || (x === 11 && y === 31)) return { type: 'REPLICATION_TILE', replicationValue: 2 };
                if ((x === 2 && y === 8) || (x === 20 && y === 31)) return { type: 'QUESTION_MARK' };

                return floor;
            })
        )
    ),
    units: [
        { gridX: 9, gridY: 6, team: 'A' }, { gridX: 13, gridY: 6, team: 'A' },
        { gridX: 7, gridY: 5, team: 'A' }, { gridX: 15, gridY: 5, team: 'A' },
        { gridX: 11, gridY: 5, team: 'A' }, { gridX: 9, gridY: 4, team: 'A' },
        { gridX: 13, gridY: 4, team: 'A' }, { gridX: 8, gridY: 2, team: 'A' },
        { gridX: 14, gridY: 2, team: 'A' }, { gridX: 11, gridY: 1, team: 'A', isKing: true },
        { gridX: 9, gridY: 33, team: 'B' }, { gridX: 13, gridY: 33, team: 'B' },
        { gridX: 7, gridY: 34, team: 'B' }, { gridX: 15, gridY: 34, team: 'B' },
        { gridX: 11, gridY: 34, team: 'B' }, { gridX: 9, gridY: 35, team: 'B' },
        { gridX: 13, gridY: 35, team: 'B' }, { gridX: 8, gridY: 37, team: 'B' },
        { gridX: 14, gridY: 37, team: 'B' }, { gridX: 11, gridY: 38, team: 'B', isKing: true },
    ],
    weapons: [
        { gridX: 8, gridY: 1, type: 'sword' }, { gridX: 14, gridY: 1, type: 'bow' },
        { gridX: 11, gridY: 1, type: 'crown' }, { gridX: 8, gridY: 38, type: 'sword' },
        { gridX: 14, gridY: 38, type: 'bow' }, { gridX: 11, gridY: 38, type: 'crown' },
        { gridX: 3, gridY: 15, type: 'dual_swords' }, { gridX: 19, gridY: 15, type: 'shuriken' },
        { gridX: 3, gridY: 24, type: 'shuriken' }, { gridX: 19, gridY: 24, type: 'dual_swords' },
        { gridX: 8, gridY: 12, type: 'hadoken' }, { gridX: 14, gridY: 27, type: 'poison_potion' },
        { gridX: 2, gridY: 2, type: 'staff' }, { gridX: 20, gridY: 37, type: 'staff' },
        { gridX: 8, gridY: 19, type: 'lightning' }, { gridX: 14, gridY: 19, type: 'boomerang' },
        { gridX: 11, gridY: 22, type: 'magic_spear' },
    ],
    growingFields: []
};
