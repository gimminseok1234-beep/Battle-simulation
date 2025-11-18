// js/maps/siege.js

/**
 * 맵 제목: 공성전 (siege) - 고품질 버전
 * 컨셉: 맵 상단의 견고한 요새를 방어하는 팀과 하단의 넓은 평야에서 공격하는 팀으로 나뉘는 비대칭 공성전 맵입니다.
 * 짙은 초록색 바닥과 개선된 돌진 타일 배치를 통해 전략적인 공방전의 재미를 높였습니다.
 */

export const siegemap = {
    name: "siege",
    width: 460,
    height: 800,
    hadokenKnockback: 15,
    autoMagneticField: { isActive: false },
    nexuses: [], // 넥서스는 사용자가 직접 배치
    map: JSON.stringify((() => {
        const ROWS = 40;
        const COLS = 23;
        // [수정] 벽 색상과 바닥 색상 변경
        const wall = { type: 'WALL', color: '#2D3748' }; // 더 짙은 회색 외벽
        const floor = { type: 'FLOOR', color: '#38A169' }; // 공격팀 평야 짙은 초록 바닥
        const fortressFloor = { type: 'FLOOR', color: '#48BB78' }; // 요새 약간 밝은 초록 바닥
        const map = [...Array(ROWS)].map(() => [...Array(COLS)].map(() => ({ ...floor })));

        // 1. 외벽 생성
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (y === 0 || y === ROWS - 1 || x === 0 || x === COLS - 1) {
                    map[y][x] = { ...wall };
                }
            }
        }

        // 2. 수비팀의 요새(상단 1/3) 설계
        // 요새 바닥
        for (let y = 1; y < 14; y++) {
            for (let x = 1; x < COLS - 1; x++) {
                map[y][x] = { ...fortressFloor };
            }
        }
        // 1차 외벽 (파괴 가능)
        for (let x = 3; x < COLS - 3; x++) {
            map[13][x] = { type: 'CRACKED_WALL', hp: 200, color: '#2D3748' }; // 벽 색상 통일
        }
        // 2차 내벽 (파괴 불가능)
        for (let x = 5; x < COLS - 5; x++) {
            map[10][x] = { ...wall };
        }
        // 중앙 성문 (더 단단한 파괴 가능 벽)
        for (let i = 0; i < 3; i++) {
             map[10][10 + i] = { type: 'CRACKED_WALL', hp: 300, color: '#1A202C' }; // 더 짙은 벽 색
             map[13][10 + i] = { ...fortressFloor }; // 성문 자리 바닥으로 복원 (뚫린 통로)
        }
        // 최종 방어선
        for (let x = 8; x < COLS - 8; x++) {
            map[7][x] = { ...wall };
        }
        map[7][11] = { ...fortressFloor }; // 중앙 통로

        // 3. 공격팀의 평야(하단 2/3) 및 타일 배치
        // 돌진 타일 라인 생성 함수 (오류 수정)
        function placeDashLine(x, y, length, direction) {
            for (let i = 0; i < length; i++) {
                let currentY = y, currentX = x;
                if (direction === 'UP') currentY -= i;
                if (map[currentY] && map[currentY][currentX]) {
                    map[currentY][currentX] = { type: 'DASH_TILE', direction, color: '#CBD5E0' };
                }
            }
        }
        // 공격팀 진격로 돌진 타일 (성벽으로 빠르게 진입)
        placeDashLine(11, 35, 5, 'UP'); // 중앙 라인
        placeDashLine(5, 30, 4, 'UP'); // 좌측 라인
        placeDashLine(COLS - 6, 30, 4, 'UP'); // 우측 라인

        // 측면 기습용 텔레포터
        map[38][2] = { type: 'TELEPORTER', color: '#8b5cf6' }; // 공격팀 진영
        map[2][2] = { type: 'TELEPORTER', color: '#8b5cf6' };  // 수비팀 요새 내부
        map[38][COLS-3] = { type: 'TELEPORTER', color: '#8b5cf6' }; // 공격팀 진영 2
        map[2][COLS-3] = { type: 'TELEPORTER', color: '#8b5cf6' }; // 수비팀 요새 내부 2

        // 평야의 엄폐물 (부서지는 벽)
        map[25][5] = { type: 'CRACKED_WALL', hp: 100, color: '#718096' };
        map[25][COLS - 6] = { type: 'CRACKED_WALL', hp: 100, color: '#718096' };
        map[20][11] = { type: 'CRACKED_WALL', hp: 80, color: '#718096' };
        
        // 요새 내부 보상
        map[4][11] = { type: 'HEAL_PACK', color: '#22c55e' };
        
        return map;
    })()),
    units: [],    // 유닛은 사용자가 직접 배치
    weapons: [],  // 무기는 사용자가 직접 배치
    growingFields: [],
};