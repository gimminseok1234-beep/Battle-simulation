/**
 * 맵 제목: 중앙대교 결전 (Central Bridge Showdown)
 * 컨셉: '중앙대교 혈투' 맵을 기반으로 왕 유닛과 시간차 기믹을 제거하고,
 * 검, 활, 쌍검 무기만 사용하도록 수정한 버전입니다.
 */
export const centralBridgeShowdownMap = {
    name: '중앙대교 결전',
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
                // Outer walls - Black
                if (y === 0 || y === 39 || x === 0 || x === 22) return { type: 'WALL', color: '#111827' };

                // Floor - Unified color
                const floor = { type: 'FLOOR', color: '#374151' };

                // Central Bridge
                if (y >= 18 && y <= 21 && x >= 7 && x <= 15) return floor;
                if (y === 19 && x === 11) return { type: 'HEAL_PACK' };

                // Side paths and cover walls
                if (x === 5 && y > 8 && y < 31) return { type: 'WALL', color: '#111827' };
                if (x === 17 && y > 8 && y < 31) return { type: 'WALL', color: '#111827' };
                if ((y === 10 || y === 29) && (x === 8 || x === 14)) return { type: 'WALL', color: '#111827' };
                if ((y === 14 || y === 25) && (x > 7 && x < 15)) return { type: 'WALL', color: '#111827' };


                return floor;
            })
        )
    ),
    units: [
        // Team A (Red) - 8 Units, No King
        { gridX: 9, gridY: 4, team: 'A' },
        { gridX: 13, gridY: 4, team: 'A' },
        { gridX: 7, gridY: 3, team: 'A' },
        { gridX: 15, gridY: 3, team: 'A' },
        { gridX: 11, gridY: 2, team: 'A' },
        { gridX: 8, gridY: 2, team: 'A' },
        { gridX: 14, gridY: 2, team: 'A' },
        { gridX: 11, gridY: 1, team: 'A'},

        // Team B (Blue) - 8 Units, No King
        { gridX: 9, gridY: 35, team: 'B' },
        { gridX: 13, gridY: 35, team: 'B' },
        { gridX: 7, gridY: 36, team: 'B' },
        { gridX: 15, gridY: 36, team: 'B' },
        { gridX: 11, gridY: 37, team: 'B' },
        { gridX: 8, gridY: 37, team: 'B' },
        { gridX: 14, gridY: 37, team: 'B' },
        { gridX: 11, gridY: 38, team: 'B'},
    ],
    weapons: [
        // Initial Weapons in Base
        { gridX: 9, gridY: 1, type: 'sword' },
        { gridX: 13, gridY: 1, type: 'bow' },
        { gridX: 9, gridY: 38, type: 'sword' },
        { gridX: 13, gridY: 38, type: 'bow' },

        // Side Path Weapons
        { gridX: 2, gridY: 10, type: 'bow' },
        { gridX: 20, gridY: 10, type: 'bow' },
        { gridX: 2, gridY: 29, type: 'sword' },
        { gridX: 20, gridY: 29, type: 'sword' },
        
        // High-Tier Weapons (Dual Swords) in contested zones
        { gridX: 8, gridY: 18, type: 'dual_swords' },
        { gridX: 14, gridY: 21, type: 'dual_swords' },
        { gridX: 11, gridY: 16, type: 'dual_swords' },
    ],
    growingFields: [] // No timed mechanics
};
