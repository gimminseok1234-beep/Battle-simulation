/**
 * 맵 제목: 초원 접전 (v5)
 * 컨셉: 기본 맵 크기를 유지하고, 바닥 색상을 기본값으로 되돌렸습니다.
 * '부서지는 벽' 구조물로 전략적인 요소를 유지합니다.
 */
export const grasslandSkirmishMap = {
    name: '초원 접전 v5',
    width: 460,
    height: 800,
    hadokenKnockback: 12,
    autoMagneticField: { 
        isActive: true, 
        totalShrinkTime: 2400, // 40초
        safeZoneSize: 8 
    },
    nexuses: [],
    map: JSON.stringify(
        [...Array(40)].map((_, y) =>
            [...Array(23)].map((_, x) => {
                const floor = { type: 'FLOOR', color: '#374151' }; // 기본 바닥 색상으로 변경
                const wall = { type: 'WALL', color: '#111827' };

                // 외부 벽
                if (y === 0 || y === 39 || x === 0 || x === 22) return wall;

                // 중앙 구조물
                if (y >= 18 && y <= 21 && x >= 8 && x <= 14) {
                    if (y === 18 || y === 21 || x === 8 || x === 14) return { type: 'CRACKED_WALL', hp: 100 };
                    if (y === 19 && x === 11) return { type: 'HEAL_PACK' };
                    return floor;
                }
                
                // 상단 구조물
                if (y >= 5 && y <= 8 && x >= 5 && x <= 17) {
                    if (y === 5 || y === 8 || x === 5 || x === 17) return { type: 'CRACKED_WALL', hp: 60 };
                    return floor;
                }

                // 하단 구조물
                if (y >= 31 && y <= 34 && x >= 5 && x <= 17) {
                    if (y === 31 || y === 34 || x === 5 || x === 17) return { type: 'CRACKED_WALL', hp: 60 };
                    return floor;
                }

                // 흩어져 있는 벽들
                if ((x === 4 || x === 18) && (y === 12 || y === 27)) return wall;
                if ((y === 15 || y === 24) && (x === 2 || x === 20)) return wall;

                // 특수 타일
                if ((x === 2 && y === 2) || (x === 20 && y === 37)) return { type: 'TELEPORTER' };
                if ((x === 2 && y === 37) || (x === 20 && y === 2)) return { type: 'QUESTION_MARK' };
                if ((x === 11 && y === 2) || (x === 11 && y === 37)) return { type: 'REPLICATION_TILE', replicationValue: 1 };

                return floor;
            })
        )
    ),
    units: [
        // A팀 (빨강) - 5 유닛
        { gridX: 4, gridY: 4, team: 'A' },
        { gridX: 18, gridY: 4, team: 'A' },
        { gridX: 11, gridY: 4, team: 'A' },
        { gridX: 7, gridY: 2, team: 'A' },
        { gridX: 15, gridY: 2, team: 'A' },

        // B팀 (파랑) - 5 유닛
        { gridX: 4, gridY: 35, team: 'B' },
        { gridX: 18, gridY: 35, team: 'B' },
        { gridX: 11, gridY: 35, team: 'B' },
        { gridX: 7, gridY: 37, team: 'B' },
        { gridX: 15, gridY: 37, team: 'B' },
    ],
    weapons: [
        // 흩어져 있는 검과 활
        { gridX: 2, gridY: 18, type: 'sword' },
        { gridX: 20, gridY: 18, type: 'bow' },
        { gridX: 2, gridY: 21, type: 'bow' },
        { gridX: 20, gridY: 21, type: 'sword' },
        
        // 상단 구조물 내부 무기
        { gridX: 11, gridY: 6, type: 'bow' },
        { gridX: 11, gridY: 7, type: 'sword' },

        // 하단 구조물 내부 무기
        { gridX: 11, gridY: 32, type: 'sword' },
        { gridX: 11, gridY: 33, type: 'bow' },

        // 중앙 구조물 내부 무기
        { gridX: 10, gridY: 20, type: 'sword' },
        { gridX: 12, gridY: 20, type: 'bow' },
    ],
    growingFields: []
};

