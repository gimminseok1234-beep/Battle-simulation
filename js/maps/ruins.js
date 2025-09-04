// js/maps/ruins.js

/**
 * 맵 제목: 폐허 (ruins)
 * 컨셉: 복잡한 구조와 다양한 타일을 특징으로 하는 맵입니다.
 */

// 각 타일 문자열을 객체로 변환하는 함수
const parseTile = (tileString) => {
    const [type, direction] = tileString.split(':');
    const tileObject = { type };

    // 오류 수정을 위해 타일 유형에 따라 'color' 속성을 추가합니다.
    switch (type) {
        case 'FLOOR':
            tileObject.color = '#374151'; // 다른 맵과 동일한 바닥 색상
            break;
        case 'WALL':
            tileObject.color = '#111827'; // 다른 맵과 동일한 벽 색상
            break;
    }

    // 대시 타일의 경우 방향 정보를 추가합니다.
    if (type === 'DASH_TILE') {
        tileObject.direction = direction || 'RIGHT';
    }
    return tileObject;
};

// 맵 데이터 정의
export const ruinsMap = {
    name: "ruins",
    width: 640,
    height: 420,
    hadokenKnockback: 15,
    autoMagneticField: { isActive: false },
    nexuses: [
        { gridX: 4, gridY: 2, team: 'A' },
        { gridX: 27, gridY: 18, team: 'B' },
    ],
    map: JSON.stringify(
        [
            ["WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL"],
            ["WALL","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","WALL","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","WALL","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","WALL"],
            ["WALL","FLOOR","FLOOR","FLOOR","FLOOR","WALL","FLOOR","FLOOR","WALL","FLOOR","FLOOR","FLOOR","FLOOR","CRACKED_WALL","LAVA","LAVA","LAVA","LAVA","CRACKED_WALL","FLOOR","FLOOR","FLOOR","WALL","FLOOR","FLOOR","WALL","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","WALL"],
            ["WALL","FLOOR","FLOOR","FLOOR","FLOOR","WALL","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","CRACKED_WALL","LAVA","LAVA","LAVA","LAVA","LAVA","LAVA","LAVA","LAVA","CRACKED_WALL","FLOOR","FLOOR","FLOOR","FLOOR","WALL","FLOOR","FLOOR","FLOOR","FLOOR","WALL"],
            ["WALL","FLOOR","FLOOR","FLOOR","FLOOR","WALL","DASH_TILE:UP","FLOOR","FLOOR","CRACKED_WALL","LAVA","LAVA","LAVA","LAVA","FLOOR","FLOOR","FLOOR","FLOOR","LAVA","LAVA","LAVA","LAVA","CRACKED_WALL","FLOOR","FLOOR","DASH_TILE:UP","WALL","FLOOR","FLOOR","FLOOR","FLOOR","WALL"],
            ["WALL","WALL","WALL","FLOOR","FLOOR","WALL","FLOOR","FLOOR","WALL","WALL","WALL","WALL","LAVA","LAVA","FLOOR","FLOOR","FLOOR","FLOOR","LAVA","LAVA","WALL","WALL","WALL","WALL","FLOOR","FLOOR","WALL","WALL","WALL","WALL","WALL","WALL"],
            ["WALL","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","WALL","LAVA","FLOOR","FLOOR","CRACKED_WALL","CRACKED_WALL","FLOOR","FLOOR","LAVA","WALL","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","WALL"],
            ["WALL","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","CRACKED_WALL","FLOOR","FLOOR","CRACKED_WALL","FLOOR","FLOOR","CRACKED_WALL","FLOOR","FLOOR","CRACKED_WALL","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","WALL"],
            ["WALL","FLOOR","FLOOR","WALL","WALL","WALL","WALL","WALL","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","WALL","WALL","WALL","WALL","WALL","FLOOR","FLOOR","FLOOR","WALL"],
            ["WALL","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","LAVA","LAVA","LAVA","LAVA","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","WALL"],
            ["WALL","FLOOR","FLOOR","WALL","WALL","WALL","WALL","WALL","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","WALL","WALL","WALL","WALL","WALL","FLOOR","FLOOR","FLOOR","WALL"],
            ["WALL","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","LAVA","LAVA","LAVA","LAVA","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","WALL"],
            ["WALL","FLOOR","FLOOR","WALL","WALL","WALL","WALL","WALL","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","WALL","WALL","WALL","WALL","WALL","FLOOR","FLOOR","FLOOR","WALL"],
            ["WALL","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","CRACKED_WALL","FLOOR","FLOOR","CRACKED_WALL","FLOOR","FLOOR","CRACKED_WALL","FLOOR","FLOOR","CRACKED_WALL","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","WALL"],
            ["WALL","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","WALL","LAVA","FLOOR","FLOOR","CRACKED_WALL","CRACKED_WALL","FLOOR","FLOOR","LAVA","WALL","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","WALL"],
            ["WALL","WALL","WALL","FLOOR","FLOOR","WALL","FLOOR","FLOOR","WALL","WALL","WALL","WALL","LAVA","LAVA","FLOOR","FLOOR","FLOOR","FLOOR","LAVA","LAVA","WALL","WALL","WALL","WALL","FLOOR","FLOOR","WALL","WALL","WALL","WALL","WALL","WALL"],
            ["WALL","FLOOR","FLOOR","FLOOR","FLOOR","WALL","DASH_TILE:DOWN","FLOOR","FLOOR","CRACKED_WALL","LAVA","LAVA","LAVA","LAVA","FLOOR","FLOOR","FLOOR","FLOOR","LAVA","LAVA","LAVA","LAVA","CRACKED_WALL","FLOOR","FLOOR","DASH_TILE:DOWN","WALL","FLOOR","FLOOR","FLOOR","FLOOR","WALL"],
            ["WALL","FLOOR","FLOOR","FLOOR","FLOOR","WALL","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","CRACKED_WALL","LAVA","LAVA","LAVA","LAVA","LAVA","LAVA","LAVA","LAVA","CRACKED_WALL","FLOOR","FLOOR","FLOOR","FLOOR","WALL","FLOOR","FLOOR","FLOOR","FLOOR","WALL"],
            ["WALL","FLOOR","FLOOR","FLOOR","FLOOR","WALL","FLOOR","FLOOR","WALL","FLOOR","FLOOR","FLOOR","FLOOR","CRACKED_WALL","LAVA","LAVA","LAVA","LAVA","CRACKED_WALL","FLOOR","FLOOR","FLOOR","WALL","FLOOR","FLOOR","WALL","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","WALL"],
            ["WALL","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","WALL","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","WALL","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","FLOOR","WALL"],
            ["WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL","WALL"],
        ].map(row => row.map(tileString => parseTile(tileString)))
    ),
    units: [
        { gridX: 2, gridY: 2, team: 'A' }, { gridX: 3, gridY: 3, team: 'A' },
        { gridX: 4, gridY: 2, team: 'A' }, { gridX: 3, gridY: 5, team: 'A' },
        { gridX: 5, gridY: 5, team: 'A' }, { gridX: 29, gridY: 18, team: 'B' },
        { gridX: 28, gridY: 17, team: 'B' }, { gridX: 27, gridY: 18, team: 'B' },
        { gridX: 29, gridY: 15, team: 'B' }, { gridX: 28, gridY: 15, team: 'B' },
    ],
    weapons: [
        { gridX: 2, gridY: 10, type: 'sword' }, { gridX: 6, gridY: 2, type: 'bow' },
        { gridX: 13, gridY: 6, type: 'staff' }, { gridX: 1, gridY: 8, type: 'sword' },
        { gridX: 8, gridY: 8, type: 'dual_swords' }, { gridX: 29, gridY: 10, type: 'dual_swords' },
        { gridX: 25, gridY: 17, type: 'staff' }, { gridX: 18, gridY: 14, type: 'bow' },
        { gridX: 30, gridY: 12, type: 'dual_swords' }, { gridX: 23, gridY: 12, type: 'sword' },
    ],
    growingFields: [],
};
