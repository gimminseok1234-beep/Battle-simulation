// js/maps/RuinsOfValor.js

export const RuinsOfValor = {
    name: "용맹의 폐허",
    description: "폐허가 된 전장에서 부서진 벽과 돌진 타일을 활용하여 적을 제압하세요. 중앙의 위험을 감수하고 강력한 무기를 차지해야 합니다.",
    tiles: [
        // 맵의 전체 타일 배열 (21x32)
        ["WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL"],
        ["WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL"],
        ["WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL", "FLOOR", "FLOOR", "WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "CRACKED_WALL", "LAVA", "LAVA", "LAVA", "LAVA", "CRACKED_WALL", "FLOOR", "FLOOR", "FLOOR", "WALL", "FLOOR", "FLOOR", "WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL"],
        ["WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "CRACKED_WALL", "LAVA", "LAVA", "LAVA", "LAVA", "LAVA", "LAVA", "LAVA", "LAVA", "CRACKED_WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL"],
        ["WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL", "DASH_TILE:UP", "FLOOR", "FLOOR", "CRACKED_WALL", "LAVA", "LAVA", "LAVA", "LAVA", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "LAVA", "LAVA", "LAVA", "LAVA", "CRACKED_WALL", "FLOOR", "FLOOR", "DASH_TILE:UP", "WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL"],
        ["WALL", "WALL", "WALL", "FLOOR", "FLOOR", "WALL", "FLOOR", "FLOOR", "WALL", "WALL", "WALL", "WALL", "LAVA", "LAVA", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "LAVA", "LAVA", "WALL", "WALL", "WALL", "WALL", "FLOOR", "FLOOR", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL"],
        ["WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL", "LAVA", "FLOOR", "FLOOR", "CRACKED_WALL", "CRACKED_WALL", "FLOOR", "FLOOR", "LAVA", "WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL"],
        ["WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "CRACKED_WALL", "FLOOR", "FLOOR", "CRACKED_WALL", "FLOOR", "FLOOR", "CRACKED_WALL", "FLOOR", "FLOOR", "CRACKED_WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL"],
        ["WALL", "FLOOR", "FLOOR", "WALL", "WALL", "WALL", "WALL", "WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL", "WALL", "WALL", "WALL", "WALL", "FLOOR", "FLOOR", "FLOOR", "WALL"],
        ["WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "LAVA", "LAVA", "LAVA", "LAVA", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL"],
        ["WALL", "FLOOR", "FLOOR", "WALL", "WALL", "WALL", "WALL", "WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL", "WALL", "WALL", "WALL", "WALL", "FLOOR", "FLOOR", "FLOOR", "WALL"],
        ["WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "LAVA", "LAVA", "LAVA", "LAVA", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL"],
        ["WALL", "FLOOR", "FLOOR", "WALL", "WALL", "WALL", "WALL", "WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL", "WALL", "WALL", "WALL", "WALL", "FLOOR", "FLOOR", "FLOOR", "WALL"],
        ["WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "CRACKED_WALL", "FLOOR", "FLOOR", "CRACKED_WALL", "FLOOR", "FLOOR", "CRACKED_WALL", "FLOOR", "FLOOR", "CRACKED_WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL"],
        ["WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL", "LAVA", "FLOOR", "FLOOR", "CRACKED_WALL", "CRACKED_WALL", "FLOOR", "FLOOR", "LAVA", "WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL"],
        ["WALL", "WALL", "WALL", "FLOOR", "FLOOR", "WALL", "FLOOR", "FLOOR", "WALL", "WALL", "WALL", "WALL", "LAVA", "LAVA", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "LAVA", "LAVA", "WALL", "WALL", "WALL", "WALL", "FLOOR", "FLOOR", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL"],
        ["WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL", "DASH_TILE:DOWN", "FLOOR", "FLOOR", "CRACKED_WALL", "LAVA", "LAVA", "LAVA", "LAVA", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "LAVA", "LAVA", "LAVA", "LAVA", "CRACKED_WALL", "FLOOR", "FLOOR", "DASH_TILE:DOWN", "WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL"],
        ["WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "CRACKED_WALL", "LAVA", "LAVA", "LAVA", "LAVA", "LAVA", "LAVA", "LAVA", "LAVA", "CRACKED_WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL"],
        ["WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL", "FLOOR", "FLOOR", "WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "CRACKED_WALL", "LAVA", "LAVA", "LAVA", "LAVA", "CRACKED_WALL", "FLOOR", "FLOOR", "FLOOR", "WALL", "FLOOR", "FLOOR", "WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL"],
        ["WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "FLOOR", "WALL"],
        ["WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL", "WALL"],
    ],
    units: [
        // Red Team
        { x: 2, y: 2, team: 'A' },
        { x: 3, y: 3, team: 'A' },
        { x: 4, y: 2, team: 'A' },
        { x: 3, y: 5, team: 'A' },
        { x: 5, y: 5, team: 'A' },
        // Blue Team
        { x: 29, y: 18, team: 'B' },
        { x: 28, y: 17, team: 'B' },
        { x: 27, y: 18, team: 'B' },
        { x: 29, y: 15, team: 'B' },
        { x: 28, y: 15, team: 'B' },
    ],
    weapons: [
        // Red Team Side (5 weapons)
        { x: 2, y: 10, type: 'sword' },
        { x: 6, y: 2, type: 'bow' },
        { x: 13, y: 6, type: 'staff' },
        { x: 1, y: 8, type: 'sword' },
        { x: 8, y: 8, type: 'dual_swords' },
        // Blue Team Side (5 weapons)
        { x: 29, y: 10, type: 'dual_swords' },
        { x: 25, y: 18, type: 'staff' },
        { x: 18, y: 14, type: 'bow' },
        { x: 30, y: 12, type: 'dual_swords' },
        { x: 23, y: 12, type: 'sword' },
    ],
    nexuses: [
        { x: 4, y: 2, team: 'A' },
        { x: 27, y: 18, team: 'B' },
    ],
    magneticFields: [],
};

