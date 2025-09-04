// js/maps/RuinsOfValor.js

// 헬퍼 함수: RuinsOfValor의 타일 문자열을 GameManager가 사용하는 객체 형식으로 변환합니다.
const parseTile = (tileString) => {
    const [type, direction] = tileString.split(':');
    const tileObject = { type };
    if (type === 'DASH_TILE') {
        tileObject.direction = direction || 'RIGHT'; // 기본값 설정
    }
    // 필요하다면 다른 타일 타입에 대한 색상이나 속성 추가 가능
    // 예: if (type === 'WALL') tileObject.color = '#111827';
    return tileObject;
};

export const RuinsOfValor = {
    name: "용맹의 폐허",
    // 캔버스 크기를 다른 맵과 유사하게 설정합니다. (GRID_SIZE * 타일 수)
    width: 640, // 20 * 32
    height: 420, // 20 * 21
    hadokenKnockback: 15,
    autoMagneticField: { isActive: false },
    nexuses: [
        // x, y를 gridX, gridY로 변경
        { gridX: 4, gridY: 2, team: 'A' },
        { gridX: 27, gridY: 18, team: 'B' },
    ],
    // 'tiles' 배열을 순회하며 'map' 데이터를 생성 (JSON 문자열 형식으로)
    map: JSON.stringify(
        // 원본 tiles 배열 (21x32 크기)
        [
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
        ].map(row => row.map(tileString => parseTile(tileString)))
    ),
    units: [
        // x, y를 gridX, gridY로 변경
        { gridX: 2, gridY: 2, team: 'A' },
        { gridX: 3, gridY: 3, team: 'A' },
        { gridX: 4, gridY: 2, team: 'A' },
        { gridX: 3, gridY: 5, team: 'A' },
        { gridX: 5, gridY: 5, team: 'A' },
        { gridX: 29, gridY: 18, team: 'B' },
        { gridX: 28, gridY: 17, team: 'B' },
        { gridX: 27, gridY: 18, team: 'B' },
        { gridX: 29, gridY: 15, team: 'B' },
        { gridX: 28, gridY: 15, team: 'B' },
    ],
    weapons: [
        // x, y를 gridX, gridY로 변경
        { gridX: 2, gridY: 10, type: 'sword' },
        { gridX: 6, gridY: 2, type: 'bow' },
        { gridX: 13, gridY: 6, type: 'staff' },
        { gridX: 1, gridY: 8, type: 'sword' },
        { gridX: 8, gridY: 8, type: 'dual_swords' },
        { gridX: 29, gridY: 10, type: 'dual_swords' },
        { gridX: 25, gridY: 17, type: 'staff' },
        { gridX: 18, gridY: 14, type: 'bow' },
        { gridX: 30, gridY: 12, type: 'dual_swords' },
        { gridX: 23, gridY: 12, type: 'sword' },
    ],
    growingFields: [], // 빈 배열 추가
};
