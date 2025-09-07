// js/constants.js

export const GRID_SIZE = 20;

export const TILE = {
    FLOOR: 'FLOOR',
    WALL: 'WALL',
    LAVA: 'LAVA',
    CRACKED_WALL: 'CRACKED_WALL',
    HEAL_PACK: 'HEAL_PACK',
    REPLICATION_TILE: 'REPLICATION_TILE',
    TELEPORTER: 'TELEPORTER',
    QUESTION_MARK: 'QUESTION_MARK',
    DASH_TILE: 'DASH_TILE' // 돌진 타일 추가
};

export const TEAM = {
    A: 'A', // 빨강
    B: 'B', // 파랑
    C: 'C', // 초록
    D: 'D'  // 노랑
};

export const COLORS = {
    GRID: 'rgba(255, 255, 255, 0.1)',
    FLOOR: '#374151',
    WALL: '#111827', // 기본 벽 색상을 검은색 계열로 변경
    LAVA: '#f97316',
    CRACKED_WALL: '#a8a29e',
    HEAL_PACK: '#22c55e',
    REPLICATION_TILE: '#ec4899',
    TELEPORTER: '#8b5cf6',
    QUESTION_MARK: '#facc15',
    DASH_TILE: '#ffffff', // 돌진 타일 색상 (흰색)
    TEAM_A: '#ef4444',
    TEAM_B: '#3b82f6',
    TEAM_C: '#10b981',
    TEAM_D: '#facc15'
};
