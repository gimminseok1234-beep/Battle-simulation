// js/maps/ruins.js

/**
 * 맵 제목: 폐허 (Ruins) - 최종 수정본
 * 컨셉: 중앙 용암 지대를 중심으로 한 대칭형 전장.
 * 규칙 준수: 겹침 방지, 기본 맵 크기, 유닛과 무기 수량 일치(각 10개)
 */

// 각 타일 문자열을 객체로 변환하는 함수
const parseTile = (tileString) => {
    const [type] = tileString.split(':');
    const tileObject = { type };

    // 타일 유형에 따라 색상 정보를 부여합니다.
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

                // 중앙 용암 지대
                if (y >= 16 && y <= 23 && x >= 7 && x <= 15) {
                    if (y === 16 || y === 23 || x === 7 || x === 15) {
                        return parseTile("CRACKED_WALL"); // 용암 주변은 부서지는 벽
                    }
                    return parseTile("LAVA");
                }

                // 중앙 상단/하단 구조물
                if ((y === 12 || y === 27) && (x >= 9 && x <= 13)) return parseTile("WALL");

                // 양쪽 대칭 벽 구조물
                if ((x === 5 || x === 17) && ((y >= 8 && y <= 14) || (y >= 25 && y <= 31))) {
                    return parseTile("WALL");
                }
                
                // 맵 중앙 부서지는 벽
                if ((y === 19 || y === 20) && (x === 4 || x === 18)) return parseTile("CRACKED_WALL");


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
    // 총 무기: 10 (유닛 수와 일치)
    weapons: [
        // 외곽 지역 무기
        { gridX: 2, gridY: 10, type: 'sword' }, { gridX: 20, gridY: 10, type: 'bow' },
        { gridX: 2, gridY: 29, type: 'bow' }, { gridX: 20, gridY: 29, type: 'sword' },
        
        // 중앙 지역 고급 무기
        { gridX: 8, gridY: 19, type: 'dual_swords' }, { gridX: 14, gridY: 20, type: 'dual_swords' },
        { gridX: 11, gridY: 15, type: 'staff' },
        
        // 시작 지점 근처 무기
        { gridX: 6, gridY: 5, type: 'sword' }, { gridX: 16, gridY: 5, type: 'bow' },
        { gridX: 11, gridY: 34, type: 'shuriken' },
    ],
    growingFields: [],
};
