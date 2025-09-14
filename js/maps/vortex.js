// js/maps/vortex.js

/**
 * 맵 제목: 소용돌이 (vortex) - 고품질 버전
 * 컨셉: 중앙 제단을 향해 나선형으로 좁아지는 길을 따라 전투를 벌이는 맵.
 * 시인성을 개선하고 소용돌이 구조를 완벽하게 재설계하여 전략적인 재미를 극대화했습니다.
 */

export const vortexmap = {
    name: "vortex",
    width: 460,
    height: 800,
    hadokenKnockback: 15,
    autoMagneticField: { isActive: false },
    nexuses: [],
    map: JSON.stringify((() => {
        const ROWS = 40;
        const COLS = 23;
        // [수정] 벽 색상을 검은색, 바닥 색상을 짙은 남색으로 변경하여 시인성 확보
        const wall = { type: 'WALL', color: '#1A202C' }; 
        const floor = { type: 'FLOOR', color: '#2C3E50' };
        const map = [...Array(ROWS)].map(() => [...Array(COLS)].map(() => ({ ...wall })));

        // [수정] 완벽한 나선형 구조를 생성하는 알고리즘으로 전면 교체
        let top = 1, bottom = ROWS - 2, left = 1, right = COLS - 2;

        while (top <= bottom && left <= right) {
            // -> 방향 길 생성
            for (let x = left; x <= right; x++) map[top][x] = { ...floor };
            top++;
            if (top > bottom) break;
            
            // v 방향 길 생성
            for (let y = top; y <= bottom; y++) map[y][right] = { ...floor };
            right--;
            if (left > right) break;

            // <- 방향 길 생성
            for (let x = right; x >= left; x--) map[bottom][x] = { ...floor };
            bottom--;
            if (top > bottom) break;

            // ^ 방향 길 생성
            for (let y = bottom; y >= top; y--) map[y][left] = { ...floor };
            left++;
        }

        // 2. 전략적 타일 배치
        // 중앙 제단 (안전지대 및 보상)
        map[19][11] = { type: 'HEAL_PACK', color: '#22c55e' };
        map[20][11] = { type: 'HEAL_PACK', color: '#22c55e' };
        map[19][10] = { ...floor }; map[19][12] = { ...floor };
        map[20][10] = { ...floor }; map[20][12] = { ...floor };

        // 용암 함정 배치
        map[2][11] = { type: 'LAVA', color: '#f97316' };
        map[37][11] = { type: 'LAVA', color: '#f97316' };
        map[19][2] = { type: 'LAVA', color: '#f97316' };
        map[20][20] = { type: 'LAVA', color: '#f97316' };
        
        // 돌진 타일 (지름길 및 함정 유도)
        map[10][2] = { type: 'DASH_TILE', direction: 'DOWN', color: '#ffffff' };
        map[29][20] = { type: 'DASH_TILE', direction: 'UP', color: '#ffffff' };

        return map;
    })()),
    units: [],
    weapons: [],
    growingFields: [],
};
