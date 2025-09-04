// js/maps/ruins.js

/**
 * 맵 제목: 폐허 (Ruins) - 용암과 돌진 버전
 * 컨셉: 곳곳에 흩어진 용암과 돌진 타일을 이용한 난전 유도 맵입니다.
 * 원거리 무기(장풍, 부메랑)만 존재하여 거리 조절이 핵심입니다.
 */

// 각 타일 문자열을 객체로 변환하는 함수
const parseTile = (tileString) => {
    const [type, direction] = tileString.split(':');
    const tileObject = { type };

    // 타일 유형에 따라 속성을 부여합니다.
    switch (type) {
        case 'FLOOR':
            tileObject.color = '#374151';
            break;
        case 'WALL':
            tileObject.color = '#111827';
            break;
        case 'LAVA':
            tileObject.color = '#FF4500';
            break;
        case 'CRACKED_WALL':
            tileObject.color = '#4a5568';
            tileObject.hp = 100;
            break;
        case 'DASH_TILE':
             tileObject.direction = direction || 'RIGHT';
             break;
    }
    return tileObject;
};

// 재설계된 ruinsMap 데이터
export const ruinsMap = {
    name: "ruins",
    width: 460, // 기본 맵 너비
    height: 800, // 기본 맵 높이
    hadokenKnockback: 15,
    autoMagneticField: { isActive: false },
    nexuses: [], // 넥서스 제거
    map: JSON.stringify(
        [...Array(40)].map((_, y) =>
            [...Array(23)].map((_, x) => {
                // 외벽 생성
                if (y === 0 || y === 39 || x === 0 || x === 22) return parseTile("WALL");

                // 용암 타일 분산 배치 (한 칸씩 띄어서)
                if ((x % 4 === 2) && (y % 4 === 2)) return parseTile("LAVA");
                
                // 돌진 타일 배치
                if (y === 5 && (x > 5 && x < 17)) return parseTile("DASH_TILE:RIGHT");
                if (y === 34 && (x > 5 && x < 17)) return parseTile("DASH_TILE:LEFT");
                if (x === 5 && (y > 8 && y < 16)) return parseTile("DASH_TILE:DOWN");
                if (x === 17 && (y > 24 && y < 32)) return parseTile("DASH_TILE:UP");

                // 중앙 지역 벽
                if ((y === 19 || y === 20) && (x > 8 && x < 14)) return parseTile("WALL");

                return parseTile("FLOOR");
            })
        )
    ),
    // 총 유닛: 10
    units: [
        // Team A (5)
        { gridX: 10, gridY: 2, team: 'A' }, { gridX: 12, gridY: 2, team: 'A' },
        { gridX: 9, gridY: 3, team: 'A' }, { gridX: 13, gridY: 3, team: 'A' },
        { gridX: 11, gridY: 4, team: 'A' },
        // Team B (5)
        { gridX: 10, gridY: 37, team: 'B' }, { gridX: 12, gridY: 37, team: 'B' },
        { gridX: 9, gridY: 36, team: 'B' }, { gridX: 13, gridY: 36, team: 'B' },
        { gridX: 11, gridY: 35, team: 'B' },
    ],
    // 총 무기: 10 (장풍 5, 부메랑 5)
    weapons: [
        { gridX: 2, gridY: 10, type: 'hadoken' }, { gridX: 20, gridY: 10, type: 'boomerang' },
        { gridX: 2, gridY: 29, type: 'boomerang' }, { gridX: 20, gridY: 29, type: 'hadoken' },
        { gridX: 8, gridY: 18, type: 'hadoken' }, { gridX: 14, gridY: 21, type: 'boomerang' },
        { gridX: 11, gridY: 8, type: 'boomerang' }, { gridX: 11, gridY: 31, type: 'hadoken' },
        { gridX: 4, gridY: 20, type: 'hadoken' }, { gridX: 18, gridY: 19, type: 'boomerang' },
    ],
    growingFields: [],
};

