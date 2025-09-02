/**
 * 맵 제목: 중앙대교 혈투
 * 컨셉: 20명의 유닛과 2개의 넥서스가 배치된 대규모 2팀 점령전 맵입니다.
 * 중앙의 좁은 다리를 중심으로 격렬한 전투가 벌어지며,
 * 양 옆의 우회로와 다양한 특수 타일, 숨겨진 무기들이 전략적인 재미를 더합니다.
 */
export const centralBridgeBloodbathMap = {
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
                // Outer walls
                if (y === 0 || y === 39 || x === 0 || x === 22) return { type: 'WALL', color: '#44403c' };

                // Team Bases (Top A, Bottom B)
                if ((y >= 1 && y <= 6) || (y >= 33 && y <= 38)) {
                    if (x > 5 && x < 17) { // Base inner area
                        if (y === 6 || y === 33) return { type: 'CRACKED_WALL', hp: 100 };
                        return { type: 'FLOOR', color: '#312e81' };
                    }
                }

                // Central Bridge
                if (y >= 18 && y <= 21) {
                    if (x >= 8 && x <= 14) return { type: 'FLOOR', color: '#a8a29e' }; // Bridge path
                    if (x === 7 || x === 15) return { type: 'LAVA' }; // Lava edges
                }
                if (y === 19 && x === 11) return { type: 'HEAL_PACK' }; // Center heal pack

                // Side Paths & Jungle walls
                if ((x === 6 || x === 16) && ((y > 6 && y < 18) || (y > 21 && y < 33))) return { type: 'WALL', color: '#44403c' };
                if (y === 10 && (x < 5 || x > 17)) return { type: 'WALL', color: '#44403c' };
                if (y === 29 && (x < 5 || x > 17)) return { type: 'WALL', color: '#44403c' };
                if (x === 11 && (y === 13 || y === 26)) return { type: 'WALL', color: '#44403c' };

                // Special Tiles in Side Paths
                if ((x === 2 && y === 19) || (x === 20 && y === 19)) return { type: 'TELEPORTER' }; // Teleporters
                if ((x === 11 && y === 8) || (x === 11 && y === 31)) return { type: 'REPLICATION_TILE', replicationValue: 2 };
                if ((x === 3 && y === 3) || (x === 19 && y === 3) || (x === 3 && y === 36) || (x === 19 && y === 36)) return { type: 'QUESTION_MARK' };

                return { type: 'FLOOR', color: '#374151' };
            })
        )
    ),
    units: [
        // Team A (Red) - 10 Units
        { gridX: 9, gridY: 6, team: 'A' },
        { gridX: 13, gridY: 6, team: 'A' },
        { gridX: 7, gridY: 5, team: 'A' },
        { gridX: 15, gridY: 5, team: 'A' },
        { gridX: 11, gridY: 5, team: 'A' },
        { gridX: 9, gridY: 4, team: 'A' },
        { gridX: 13, gridY: 4, team: 'A' },
        { gridX: 8, gridY: 2, team: 'A' },
        { gridX: 14, gridY: 2, team: 'A' },
        { gridX: 11, gridY: 1, team: 'A', isKing: true }, // King Unit

        // Team B (Blue) - 10 Units
        { gridX: 9, gridY: 33, team: 'B' },
        { gridX: 13, gridY: 33, team: 'B' },
        { gridX: 7, gridY: 34, team: 'B' },
        { gridX: 15, gridY: 34, team: 'B' },
        { gridX: 11, gridY: 34, team: 'B' },
        { gridX: 9, gridY: 35, team: 'B' },
        { gridX: 13, gridY: 35, team: 'B' },
        { gridX: 8, gridY: 37, team: 'B' },
        { gridX: 14, gridY: 37, team: 'B' },
        { gridX: 11, gridY: 38, team: 'B', isKing: true }, // King Unit
    ],
    weapons: [
        // Team A Base Weapons
        { gridX: 8, gridY: 1, type: 'sword' },
        { gridX: 14, gridY: 1, type: 'bow' },
        { gridX: 11, gridY: 1, type: 'crown' },

        // Team B Base Weapons
        { gridX: 8, gridY: 38, type: 'sword' },
        { gridX: 14, gridY: 38, type: 'bow' },
        { gridX: 11, gridY: 38, type: 'crown' },

        // Jungle & Side Path Weapons
        { gridX: 3, gridY: 8, type: 'dual_swords' },
        { gridX: 19, gridY: 8, type: 'shuriken' },
        { gridX: 3, gridY: 31, type: 'shuriken' },
        { gridX: 19, gridY: 31, type: 'dual_swords' },
        { gridX: 8, gridY: 15, type: 'hadoken' },
        { gridX: 14, gridY: 24, type: 'poison_potion' },
        
        // Central Bridge High-Tier Weapons
        { gridX: 9, gridY: 17, type: 'staff' },
        { gridX: 13, gridY: 22, type: 'lightning' },
        { gridX: 11, gridY: 15, type: 'boomerang' },
        { gridX: 11, gridY: 24, type: 'magic_spear' },
    ],
    growingFields: []
};

