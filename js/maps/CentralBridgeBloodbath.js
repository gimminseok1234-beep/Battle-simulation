/**
 * 맵 제목: 중앙대교 혈투 (v2)
 * 컨셉: 유닛 몰림 오류를 해결하고, 다양한 전략적 경로와 지형지물을 추가하여 전투의 깊이를 더한 리뉴얼 버전입니다.
 * '부서지는 벽'으로 구성된 새로운 우회로와 재배치된 핵심 무기들이 예측 불가능한 전투를 만들어냅니다.
 */
export const centralBridgeBloodbathMap = {
    name: '중앙대교 혈투 v2',
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
                        if (y === 6 || y === 33) return { type: 'CRACKED_WALL', hp: 150 };
                        return { type: 'FLOOR', color: '#312e81' };
                    }
                }

                // Central Bridge (Widened)
                if (y >= 18 && y <= 21) {
                    if (x >= 7 && x <= 15) return { type: 'FLOOR', color: '#a8a29e' }; // Bridge path
                    if (x === 6 || x === 16) return { type: 'LAVA' }; // Lava edges
                }
                if (y === 19 && x === 11) return { type: 'HEAL_PACK' }; // Center heal pack
                if ((y === 18 || y === 21) && x === 11) return { type: 'CRACKED_WALL', hp: 80 }; // Cover on bridge

                // Side Paths & new structures
                // --- Left Side Path ---
                if (x === 5 && y > 8 && y < 14) return { type: 'WALL', color: '#44403c' };
                if (x === 5 && y > 25 && y < 31) return { type: 'WALL', color: '#44403c' };
                if (y === 16 && x > 1 && x < 5) return { type: 'CRACKED_WALL', hp: 80 };
                if (y === 23 && x > 1 && x < 5) return { type: 'CRACKED_WALL', hp: 80 };

                // --- Right Side Path ---
                if (x === 17 && y > 8 && y < 14) return { type: 'WALL', color: '#44403c' };
                if (x === 17 && y > 25 && y < 31) return { type: 'WALL', color: '#44403c' };
                if (y === 16 && x > 18 && x < 22) return { type: 'CRACKED_WALL', hp: 80 };
                if (y === 23 && x > 18 && x < 22) return { type: 'CRACKED_WALL', hp: 80 };
                
                // Obstacles near bases
                if ((y === 10 || y === 29) && (x === 8 || x === 14)) return { type: 'WALL', color: '#44403c' };


                // Special Tiles in Side Paths
                if ((x === 2 && y === 19) || (x === 20 && y === 19)) return { type: 'TELEPORTER' }; // Teleporters
                if ((x === 11 && y === 8) || (x === 11 && y === 31)) return { type: 'REPLICATION_TILE', replicationValue: 2 };
                // Relocated Question Marks
                if ((x === 2 && y === 8) || (x === 20 && y === 31)) return { type: 'QUESTION_MARK' };

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

        // Relocated Weapons for strategic value
        { gridX: 3, gridY: 15, type: 'dual_swords' },
        { gridX: 19, gridY: 15, type: 'shuriken' },
        { gridX: 3, gridY: 24, type: 'shuriken' },
        { gridX: 19, gridY: 24, type: 'dual_swords' },
        { gridX: 8, gridY: 12, type: 'hadoken' },
        { gridX: 14, gridY: 27, type: 'poison_potion' },
        
        // High-Tier Weapons in new structures or contested zones
        { gridX: 2, gridY: 2, type: 'staff' },
        { gridX: 20, gridY: 37, type: 'staff' },
        { gridX: 8, gridY: 19, type: 'lightning' },
        { gridX: 14, gridY: 19, type: 'boomerang' },
        { gridX: 11, gridY: 22, type: 'magic_spear' },
    ],
    growingFields: []
};

