/**
 * 맵 제목: 초원 접전 (v6)
 * 컨셉: 자동 자기장 기능을 제거하여, 시간제한 없이 자유롭게 전투를 즐길 수 있도록 수정한 버전입니다.
 */
export const grasslandSkirmishMap = {
    name: '초원 접전 v6',
    width: 460,
    height: 800,
    hadokenKnockback: 12,
    autoMagneticField: { 
        isActive: false, // 자동 자기장 비활성화
        totalShrinkTime: 1800,
        safeZoneSize: 8 
    },
    nexuses: [],
    map: JSON.stringify(
        [...Array(40)].map((_, y) =>
            [...Array(23)].map((_, x) => {
                // 기본 바닥 색상 통일
                const floor = { type: 'FLOOR', color: '#374151' }; 

                // 외부 벽 - 검은색
                if (y === 0 || y === 39 || x === 0 || x === 22) return { type: 'WALL', color: '#111827' };

                // 중앙 구조물 (부서지는 벽)
                if (y >= 18 && y <= 21 && x >= 8 && x <= 14) {
                    if (y === 18 || y === 21 || x === 8 || x === 14) return { type: 'CRACKED_WALL', hp: 100 };
                    if (y === 19 && x === 11) return { type: 'HEAL_PACK' };
                    return floor;
                }

                // 상단/하단 구조물 (부서지는 벽)
                if ((y === 8 || y === 31) && x >= 5 && x <= 17) {
                     if (x === 5 || x === 17 || y === 8 || y === 31) return { type: 'CRACKED_WALL', hp: 80 };
                     return floor;
                }
                
                // 흩어져 있는 벽과 특수 타일
                if ((x === 4 || x === 18) && (y === 4 || y === 35)) return { type: 'WALL', color: '#111827' };
                if ((x === 2 && y === 2) || (x === 20 && y === 37)) return { type: 'TELEPORTER' };
                if ((x === 2 && y === 37) || (x === 20 && y === 2)) return { type: 'QUESTION_MARK' };

                return floor;
            })
        )
    ),
    units: [
        // A팀 (빨강)
        { gridX: 10, gridY: 2, team: 'A' },
        { gridX: 12, gridY: 2, team: 'A' },
        { gridX: 8, gridY: 3, team: 'A' },
        { gridX: 14, gridY: 3, team: 'A' },
        { gridX: 11, gridY: 1, team: 'A' },

        // B팀 (파랑)
        { gridX: 10, gridY: 37, team: 'B' },
        { gridX: 12, gridY: 37, team: 'B' },
        { gridX: 8, gridY: 36, team: 'B' },
        { gridX: 14, gridY: 36, team: 'B' },
        { gridX: 11, gridY: 38, team: 'B' },
    ],
    weapons: [
        // 흩어져 있는 검과 활
        { gridX: 6, gridY: 8, type: 'sword' },
        { gridX: 16, gridY: 8, type: 'bow' },
        { gridX: 11, gridY: 9, type: 'sword' },
        { gridX: 6, gridY: 31, type: 'bow' },
        { gridX: 16, gridY: 31, type: 'sword' },
        { gridX: 11, gridY: 30, type: 'bow' },
        { gridX: 2, gridY: 15, type: 'sword' },
        { gridX: 20, gridY: 24, type: 'bow' },
    ],
    growingFields: []
};

