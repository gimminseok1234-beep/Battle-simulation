/**
 * 맵 제목: 초원 접전 (Grassland Skirmish)
 * 컨셉: 잔디색 바닥을 중심으로 자동 자기장이 줄어드는 배틀로얄 맵입니다.
 * 검과 활만 사용하며, 다양한 벽과 특수 타일로 전략적인 재미를 더했습니다.
 */
export const grasslandSkirmishMap = {
    name: '초원 접전',
    width: 500,
    height: 500,
    hadokenKnockback: 12,
    autoMagneticField: { 
        isActive: true, 
        totalShrinkTime: 1800, // 30초 (1800 프레임 / 60 fps)
        safeZoneSize: 8 
    },
    nexuses: [], // 이 모드에는 넥서스가 없습니다.
    map: JSON.stringify(
        [...Array(25)].map((_, y) =>
            [...Array(25)].map((_, x) => {
                const floor = { type: 'FLOOR', color: '#4ade80' }; // 잔디 바닥

                // 외부 벽 - 검은색
                if (y === 0 || y === 24 || x === 0 || x === 24) return { type: 'WALL', color: '#111827' };

                // 중앙 구조물
                if (y >= 10 && y <= 14 && x >= 10 && x <= 14) {
                    if (y === 10 || y === 14 || x === 10 || x === 14) return { type: 'WALL', color: '#111827' };
                    if (y === 12 && x === 12) return { type: 'HEAL_PACK' };
                    return floor;
                }
                
                // 중앙 구조물로 가는 부서지는 벽
                if ((x === 11 || x === 13) && y === 9) return { type: 'CRACKED_WALL', hp: 50 };
                if ((x === 11 || x === 13) && y === 15) return { type: 'CRACKED_WALL', hp: 50 };

                // 흩어져 있는 벽과 위험 요소
                if ((y === 5 || y === 19) && x >= 4 && x <= 8) return { type: 'WALL', color: '#111827' };
                if ((y === 5 || y === 19) && x >= 16 && x <= 20) return { type: 'WALL', color: '#111827' };
                if ((x === 5 || x === 19) && (y === 8 || y === 16)) return { type: 'LAVA' };

                // 특수 타일
                if ((x === 2 && y === 2) || (x === 22 && y === 22)) return { type: 'TELEPORTER' };
                if ((x === 2 && y === 22) || (x === 22 && y === 2)) return { type: 'QUESTION_MARK' };
                if ((x === 12 && y === 3) || (x === 12 && y === 21)) return { type: 'REPLICATION_TILE', replicationValue: 1 };

                return floor;
            })
        )
    ),
    units: [
        // A팀 (빨강) - 5 유닛
        { gridX: 3, gridY: 4, team: 'A' },
        { gridX: 4, gridY: 3, team: 'A' },
        { gridX: 8, gridY: 8, team: 'A' },
        { gridX: 2, gridY: 12, team: 'A' },
        { gridX: 6, gridY: 1, team: 'A' },

        // B팀 (파랑) - 5 유닛
        { gridX: 21, gridY: 20, team: 'B' },
        { gridX: 20, gridY: 21, team: 'B' },
        { gridX: 16, gridY: 16, team: 'B' },
        { gridX: 22, gridY: 12, team: 'B' },
        { gridX: 18, gridY: 23, team: 'B' },
    ],
    weapons: [
        // 흩어져 있는 검과 활
        { gridX: 1, gridY: 8, type: 'sword' },
        { gridX: 8, gridY: 1, type: 'bow' },
        { gridX: 16, gridY: 1, type: 'sword' },
        { gridX: 23, gridY: 8, type: 'bow' },
        { gridX: 1, gridY: 16, type: 'bow' },
        { gridX: 8, gridY: 23, type: 'sword' },
        { gridX: 16, gridY: 23, type: 'bow' },
        { gridX: 23, gridY: 16, type: 'sword' },
        { gridX: 12, gridY: 11, type: 'sword' },
        { gridX: 12, gridY: 13, type: 'bow' },
    ],
    growingFields: [] // 자동 자기장만 사용
};
