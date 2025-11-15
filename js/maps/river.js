// js/maps/river.js

/**
 * 맵 제목: 깊은 숲 속의 강 (river) - 리뉴얼 버전
 * 컨셉: 맵을 가로지르는 깊고 어두운 강과 두 개의 다리, 그리고 위험과 기회가 공존하는 신비로운 숲으로 재탄생한 MOBA 스타일 맵입니다.
 * 바닥 색상을 어둡게 변경하고, 중앙 섬과 다양한 특수 타일을 추가하여 전략성을 극대화했습니다.
 */

export const rivermap = {
    name: "river",
    width: 460,
    height: 800,
    hadokenKnockback: 15,
    autoMagneticField: { isActive: false },
    nexuses: [], // 사용자가 직접 배치
    map: JSON.stringify((() => {
        const ROWS = 40;
        const COLS = 23;

        // --- 원칙 2: 데이터 무결성 - 색상 재정의 ---
        const wall = { type: 'WALL', color: '#2F855A' };        // 숲 외벽
        const floor = { type: 'FLOOR', color: '#276749' };      // 어두운 숲 바닥
        const river = { type: 'LAVA', color: '#2B6CB0' };       // 깊은 강 (파란색 용암 타일 활용)
        const bridge = { type: 'FLOOR', color: '#718096' };     // 돌다리

        // 1. 기본 맵 생성 (바닥과 외벽)
        const map = [...Array(ROWS)].map(() => [...Array(COLS)].map(() => ({ ...floor })));
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1) {
                    map[y][x] = { ...wall };
                }
            }
        }

        // 2. 중앙 강 생성 (sin 함수를 이용한 자연스러운 곡선)
        for (let y = 0; y < ROWS; y++) {
            const riverCenter = 11 + Math.sin(y / 5) * 3;
            for (let x = Math.floor(riverCenter) - 2; x <= Math.ceil(riverCenter) + 2; x++) {
                if (x > 0 && x < COLS -1) {
                    map[y][x] = { ...river };
                }
            }
        }

        // 3. 두 개의 다리(라인) 생성
        for (let y = 15; y < 25; y++) { // 중앙 다리
             map[y][11] = { ...bridge };
        }
        for (let x = 3; x < COLS - 3; x++) { // 상단 다리
             map[10][x] = { ...bridge };
        }
        for (let x = 3; x < COLS - 3; x++) { // 하단 다리
             map[29][x] = { ...bridge };
        }


        // 4. 다양한 타일을 활용한 맵 꾸미기
        // 강 중앙의 작은 섬 (중요 전략적 요충지)
        map[19][11] = { type: 'FLOOR', color: '#276749' };
        map[20][11] = { type: 'FLOOR', color: '#276749' };
        map[19][12] = { type: 'FLOOR', color: '#276749' };
        map[20][12] = { type: 'FLOOR', color: '#276749' };
        map[20][11] = { type: 'HEAL_PACK', color: '#16a34a' }; // 섬 중앙의 회복 팩

        // 숲 속의 기습용 텔레포터 (좌측 상단 <-> 우측 하단)
        map[3][3] = { type: 'TELEPORTER', color: '#8b5cf6' };
        map[ROWS - 4][COLS - 4] = { type: 'TELEPORTER', color: '#8b5cf6' };

        // 숲 속의 파괴 가능한 장애물
        map[18][3] = { type: 'CRACKED_WALL', hp: 100, color: '#4A5568' };
        map[21][COLS - 4] = { type: 'CRACKED_WALL', hp: 100, color: '#4A5568' };
        map[5][15] = { type: 'CRACKED_WALL', hp: 80, color: '#4A5568' };
        map[34][7] = { type: 'CRACKED_WALL', hp: 80, color: '#4A5568' };

        return map;
    })()),
    units: [],
    weapons: [],
    growingFields: [],
};
