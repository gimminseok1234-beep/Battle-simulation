// js/maps/chessboard.js

/**
 * 맵 제목: 여섯 개의 전당 (Six Chambers) - 리뉴얼 버전
 * 컨셉: 기존의 구조를 6개의 독립된 테마를 가진 방으로 확장한 맵입니다.
 * 3x2 구조로 재설계되어 더욱 다채로운 전략적 동선과 전투 경험을 제공합니다.
 */

export const chessboardmap = {
    name: "chessboard",
    width: 460,
    height: 800,
    hadokenKnockback: 15,
    autoMagneticField: { isActive: false },
    nexuses: [], // 사용자가 직접 배치
    map: JSON.stringify((() => {
        const ROWS = 40;
        const COLS = 23;

        // --- 원칙 2: 데이터 무결성 - 색상 정의 ---
        const wall = { type: 'WALL', color: '#1A202C' };
        const floor = { type: 'FLOOR', color: '#A0AEC0' };
        const darkFloor = { type: 'FLOOR', color: '#4A5568' };
        const lava = { type: 'LAVA', color: '#f97316' };

        // 1. 모든 공간을 벽으로 초기화
        const map = [...Array(ROWS)].map(() => [...Array(COLS)].map(() => ({ ...wall })));

        // 2. 6개의 방 (3x2 그리드)과 통로 생성
        const roomHeight = 12;
        const roomWidth = 10;

        // 방 생성 함수
        const createRoom = (startY, startX, floorType) => {
            for (let y = startY; y < startY + roomHeight; y++) {
                for (let x = startX; x < startX + roomWidth; x++) {
                    // 방의 경계선은 벽으로 유지
                    if (y > startY && y < startY + roomHeight - 1 && x > startX && x < startX + roomWidth - 1) {
                         map[y][x] = { ...floorType };
                    }
                }
            }
        };

        // 6개의 방 배치
        createRoom(1, 1, floor);      // 좌상: 시작 방 1
        createRoom(1, 12, darkFloor); // 우상: 용암 함정 방
        createRoom(14, 1, darkFloor); // 좌중: 장애물 방
        createRoom(14, 12, darkFloor); // 우중: 중앙 보상 방
        createRoom(27, 1, floor);     // 좌하: 시작 방 2
        createRoom(27, 12, floor);    // 우하: 전략적 보상 방

        // 통로 생성
        for (let y = 1; y < ROWS - 1; y++) { map[y][11] = { ...darkFloor }; } // 중앙 세로 통로
        map[7][11] = { ...floor }; // 통로 확장
        map[33][11] = { ...floor };
        
        for (let x = 1; x < COLS - 1; x++) { // 가로 통로들
            map[13][x] = { ...darkFloor };
            map[26][x] = { ...darkFloor };
        }


        // 3. 각 방의 테마에 맞는 특수 타일 배치
        // 우상단 방: 용암 함정
        map[5][15] = { ...lava };
        map[5][18] = { ...lava };
        map[9][16] = { ...lava };

        // 좌중단 방: 파괴 가능한 기둥
        map[18][4] = { type: 'CRACKED_WALL', hp: 150, color: '#718096' };
        map[18][8] = { type: 'CRACKED_WALL', hp: 150, color: '#718096' };
        
        // 우중단 방: 중앙 회복 팩
        map[19][16] = { type: 'HEAL_PACK', color: '#16a34a' };

        // 우하단 방: 기습용 텔레포터
        map[32][16] = { type: 'TELEPORTER', color: '#8b5cf6' };
        // 좌상단 방: 텔레포터 도착 지점
        map[6][6] = { type: 'TELEPORTER', color: '#8b5cf6' };
        
        return map;
    })()),
    // --- 당신이 관여하지 않는 영역 ---
    units: [],
    weapons: [],
    growingFields: [],
};
