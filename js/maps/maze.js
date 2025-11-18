// js/maps/maze.js

/**
 * 맵 제목: 미로 (Maze)
 * 컨셉: 2칸 너비의 넓은 길을 가진 미로. 유닛들이 충분히 전투를 벌일 수 있으며,
 * 중앙의 개방된 공간과 막다른 길에 배치된 특수 타일들이 전략적인 재미를 더합니다.
 */

export const mazeMap = {
    name: "maze",
    width: 460,
    height: 800,
    hadokenKnockback: 15,
    autoMagneticField: { isActive: false },
    nexuses: [], // 넥서스는 사용자가 직접 배치
    map: JSON.stringify((() => {
        const ROWS = 40;
        const COLS = 23;
        const wall = { type: 'WALL', color: '#2c5282' }; // 미로 벽 색상
        const floor = { type: 'FLOOR', color: '#1a202c' }; // 미로 바닥 색상
        
        // 1. 모든 칸을 벽으로 초기화
        const map = [...Array(ROWS)].map(() => [...Array(COLS)].map(() => ({ ...wall })));

        // 2. 미로 생성을 위한 헬퍼 함수
        const carveRect = (x, y, w, h) => {
            for (let i = y; i < y + h && i < ROWS - 1; i++) {
                for (let j = x; j < x + w && j < COLS - 1; j++) {
                    map[i][j] = { ...floor };
                }
            }
        };

        // 3. 넓은 길(2칸 너비) 미로 생성
        // 시작 지점 (상단)
        carveRect(10, 1, 3, 5); 
        
        // 왼쪽 길
        carveRect(5, 5, 8, 2);
        carveRect(5, 5, 2, 12);
        carveRect(5, 17, 10, 2);

        // 오른쪽 길
        carveRect(12, 5, 7, 2);
        carveRect(17, 5, 2, 8);
        carveRect(11, 13, 8, 2);

        // 중앙 전투 지역 (넓은 공간)
        carveRect(9, 19, 6, 6);

        // 중앙에서 아래로 이어지는 길
        carveRect(11, 25, 2, 8);
        
        // 하단 왼쪽 길
        carveRect(3, 27, 8, 2);
        carveRect(3, 27, 2, 8);
        carveRect(3, 35, 10, 2);
        
        // 하단 오른쪽 길
        carveRect(13, 27, 8, 2);
        carveRect(19, 27, 2, 11);
        carveRect(11, 38, 8, 2);

        // 4. 전략적 특수 타일 배치 (오류 수정: 접근 가능한 길 위에 배치)
        // 막다른 길 끝에 보상 배치
        map[15][6] = { type: 'HEAL_PACK', color: '#22c55e' }; // 왼쪽 중간 막다른 길
        map[12][18] = { type: 'QUESTION_MARK', color: '#facc15' }; // 오른쪽 위 막다른 길
        map[33][4] = { type: 'REPLICATION_TILE', replicationValue: 2, color: '#ec4899' }; // 왼쪽 아래 막다른 길

        // 중앙 지역 진입로에 돌진 타일 배치
        map[18][11] = { type: 'DASH_TILE', direction: 'DOWN', color: '#ffffff' };
        map[25][12] = { type: 'DASH_TILE', direction: 'UP', color: '#ffffff' };

        return map;
    })()),
    units: [],    // 유닛은 사용자가 직접 배치
    weapons: [],  // 무기는 사용자가 직접 배치
    growingFields: [],
};