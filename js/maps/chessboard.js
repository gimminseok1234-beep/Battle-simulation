// js/maps/chessboard.js

/**
 * 맵 제목: 연결된 전당 (Linked Chambers) - 최종 수정 버전
 * 컨셉: 6개의 방이 통로 없이 벽이 뚫린 형태로 직접 연결되는 구조의 맵입니다.
 * 모든 방의 바닥을 통일하고, 직관적인 동선을 제공하여 끊임없는 교전을 유도합니다.
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
        // 요청하신 대로, 너무 밝지 않은 회색으로 바닥색을 최종 수정했습니다.
        const floor = { type: 'FLOOR', color: '#374151' };
        const lava = { type: 'LAVA', color: '#f97316' };

        // 1. 모든 공간을 벽으로 초기화
        const map = [...Array(ROWS)].map(() => [...Array(COLS)].map(() => ({ ...wall })));

        // 2. 6개의 방 (3x2 그리드) 생성
        const roomHeight = 12;
        const roomWidth = 10;
        const rooms = [];

        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 2; col++) {
                const startY = row * 13 + 1; // 방 사이 간격 포함
                const startX = col * 11 + 1; // 방 사이 간격 포함
                rooms.push({y: startY, x: startX});

                for (let y = startY; y < startY + roomHeight; y++) {
                    for (let x = startX; x < startX + roomWidth; x++) {
                        map[y][x] = { ...floor };
                    }
                }
            }
        }

        // 3. 통로 대신, 방 사이의 벽을 허물어 직접 연결
        // 세로 연결 (위-아래 방)
        for (let col = 0; col < 2; col++) {
            const x = col * 11 + 5;
            map[13][x] = { ...floor }; // 1층-2층 연결
            map[13][x+1] = { ...floor };
            map[26][x] = { ...floor }; // 2층-3층 연결
            map[26][x+1] = { ...floor };
        }

        // 가로 연결 (왼쪽-오른쪽 방)
        for (let row = 0; row < 3; row++) {
            const y = row * 13 + 6;
            for (let x = 11; x <= 12; x++) {
                 map[y][x] = { ...floor };
            }
        }

        // 4. 각 방의 테마에 맞는 특수 타일 재배치
        // 우상단 방: 용암 함정
        map[5][15] = { ...lava };
        map[5][18] = { ...lava };
        map[9][16] = { ...lava };

        // 좌중단 방: 파괴 가능한 기둥
        map[18][4] = { type: 'CRACKED_WALL', hp: 150, color: '#718096' };
        map[18][8] = { type: 'CRACKED_WALL', hp: 150, color: '#718096' };

        // 우중단 방: 중앙 회복 팩
        map[19][16] = { type: 'HEAL_PACK', color: '#16a34a' };

        // 우하단 방 <-> 좌상단 방 텔레포터
        map[32][16] = { type: 'TELEPORTER', color: '#8b5cf6' };
        map[6][6] = { type: 'TELEPORTER', color: '#8b5cf6' };

        return map;
    })()),
    // --- 당신이 관여하지 않는 영역 ---
    units: [],
    weapons: [],
    growingFields: [],
};
