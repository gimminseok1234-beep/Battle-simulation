/**
 * 맵 제목: 무기고 개방 (Armory Breach)
 * 컨셉: 왕을 없애고 검, 활, 쌍검만 사용합니다.
 * 시간이 지나면서 '성장형 자기장'이 벽을 파괴하여 새로운 무기고를 여는 컨셉입니다.
 */
export const armoryBreachMap = {
    name: '무기고 개방',
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
                const floor = { type: 'TILE.FLOOR', color: '#374151' };

                // Central Bridge
                if (y >= 18 && y <= 21 && x >= 7 && x <= 15) return floor;
                if (y === 19 && x === 11) return { type: 'HEAL_PACK' };

                // Armories
                // Tier 1 Armories (Sword & Bow) - Blocked by cracked walls
                if ((y === 11 || y === 28) && (x === 3 || x === 4 || x === 18 || x === 19)) return { type: 'WALL', color: '#111827' };
                if ((y === 12 || y === 27) && (x === 2 || x === 5 || x === 17 || x === 20)) return { type: 'WALL', color: '#111827' };
                if ((y === 13) && (x === 3 || x === 4 || x === 18 || x === 19)) return { type: 'WALL', color: '#111827' };
                if ((y === 26) && (x === 3 || x === 4 || x === 18 || x === 19)) return { type: 'WALL', color: '#111827' };

                if ((y === 12 && (x === 3 || x === 19)) || (y === 27 && (x === 3 || x === 19))) return { type: 'CRACKED_WALL', hp: 1 }; // Tier 1 wall
                if ((y === 12 && (x === 4 || x === 18)) || (y === 27 && (x === 4 || x === 18))) return { type: 'CRACKED_WALL', hp: 1 }; // Tier 1 wall

                // Tier 2 Armories (Dual Swords)
                if ((y === 16 || y === 23) && (x === 8 || x === 14)) return { type: 'WALL', color: '#111827' };
                if ((y === 17 || y === 22) && (x === 7 || x === 9 || x === 13 || x === 15)) return { type: 'WALL', color: '#111827' };
                if ((y === 18 || y === 21) && (x === 8 || x === 14)) return { type: 'CRACKED_WALL', hp: 1 }; // Tier 2 wall

                // Other small walls for cover
                if ((y === 8 || y === 31) && (x === 6 || x === 16)) return { type: 'WALL', color: '#111827' };
                if ((y === 13 || y === 26) && (x === 9 || x === 13)) return { type: 'WALL', color: '#111827' };


                return floor;
            })
        )
    ),
    units: [
        // Team A (Red) - 8 Units
        { gridX: 9, gridY: 4, team: 'A' },
        { gridX: 13, gridY: 4, team: 'A' },
        { gridX: 7, gridY: 3, team: 'A' },
        { gridX: 15, gridY: 3, team: 'A' },
        { gridX: 11, gridY: 2, team: 'A' },
        { gridX: 8, gridY: 2, team: 'A' },
        { gridX: 14, gridY: 2, team: 'A' },
        { gridX: 11, gridY: 1, team: 'A'},

        // Team B (Blue) - 8 Units
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

        // Tier 1 Weapons (Sword & Bow) - Armory
        { gridX: 3, gridY: 12, type: 'bow' },
        { gridX: 4, gridY: 12, type: 'sword' },
        { gridX: 18, gridY: 12, type: 'sword' },
        { gridX: 19, gridY: 12, type: 'bow' },
        { gridX: 3, gridY: 27, type: 'bow' },
        { gridX: 4, gridY: 27, type: 'sword' },
        { gridX: 18, gridY: 27, type: 'sword' },
        { gridX: 19, gridY: 27, type: 'bow' },

        // Tier 2 Weapons (Dual Swords) - Armory
        { gridX: 8, gridY: 18, type: 'dual_swords' },
        { gridX: 14, gridY: 18, type: 'dual_swords' },
        { gridX: 8, gridY: 21, type: 'dual_swords' },
        { gridX: 14, gridY: 21, type: 'dual_swords' },
    ],
    growingFields: [
        // Fields to open Tier 1 Armories after 10 seconds
        { id: 1, gridX: 3, gridY: 12, width: 2, height: 1, settings: { direction: 'DOWN', speed: 0.1, delay: 10 } },
        { id: 2, gridX: 18, gridY: 12, width: 2, height: 1, settings: { direction: 'DOWN', speed: 0.1, delay: 10 } },
        { id: 3, gridX: 3, gridY: 27, width: 2, height: 1, settings: { direction: 'UP', speed: 0.1, delay: 10 } },
        { id: 4, gridX: 18, gridY: 27, width: 2, height: 1, settings: { direction: 'UP', speed: 0.1, delay: 10 } },

        // Fields to open Tier 2 Armories after 25 seconds
        { id: 5, gridX: 8, gridY: 18, width: 1, height: 1, settings: { direction: 'RIGHT', speed: 0.1, delay: 25 } },
        { id: 6, gridX: 14, gridY: 18, width: 1, height: 1, settings: { direction: 'LEFT', speed: 0.1, delay: 25 } },
        { id: 7, gridX: 8, gridY: 21, width: 1, height: 1, settings: { direction: 'RIGHT', speed: 0.1, delay: 25 } },
        { id: 8, gridX: 14, gridY: 21, width: 1, height: 1, settings: { direction: 'LEFT', speed: 0.1, delay: 25 } },
    ]
};
