import { TILE } from './constants.js';

/**
 * A* 길찾기 알고리즘
 * @param {Array<Array<object>>} grid - 게임 맵 그리드
 * @param {{x: number, y: number}} start - 시작 노드 (그리드 좌표)
 * @param {{x: number, y: number}} end - 종료 노드 (그리드 좌표)
 * @returns {Array<{x: number, y: number}>} - 경로 배열 (시작점 제외)
 */
export function astar(grid, start, end) {
    const openSet = [];
    const closedSet = [];
    const path = [];
    const rows = grid.length;
    const cols = grid[0].length;

    // 그리드 노드 초기화
    const nodes = Array(rows).fill(null).map(() => Array(cols).fill(null));
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            nodes[y][x] = {
                x, y,
                f: 0, g: 0, h: 0,
                parent: null,
                isWall: grid[y][x].type === TILE.WALL || grid[y][x].type === TILE.CRACKED_WALL
            };
        }
    }

    // 시작점과 끝점이 유효한지 확인
    if (start.y < 0 || start.y >= rows || start.x < 0 || start.x >= cols ||
        end.y < 0 || end.y >= rows || end.x < 0 || end.x >= cols ||
        nodes[end.y][end.x].isWall) {
        return []; // 유효하지 않은 경로
    }

    openSet.push(nodes[start.y][start.x]);

    while (openSet.length > 0) {
        // f값이 가장 낮은 노드를 찾음
        let lowestIndex = 0;
        for (let i = 1; i < openSet.length; i++) {
            if (openSet[i].f < openSet[lowestIndex].f) {
                lowestIndex = i;
            }
        }
        const currentNode = openSet[lowestIndex];

        // 경로를 찾았을 경우
        if (currentNode.x === end.x && currentNode.y === end.y) {
            let temp = currentNode;
            path.push(temp);
            while (temp.parent) {
                path.push(temp.parent);
                temp = temp.parent;
            }
            return path.reverse().slice(1); // 시작점 제외하고 반환
        }

        // 현재 노드를 openSet에서 closedSet으로 이동
        openSet.splice(lowestIndex, 1);
        closedSet.push(currentNode);

        // 이웃 노드 확인
        const neighbors = [];
        const { x, y } = currentNode;
        if (y > 0) neighbors.push(nodes[y - 1][x]);
        if (y < rows - 1) neighbors.push(nodes[y + 1][x]);
        if (x > 0) neighbors.push(nodes[y][x - 1]);
        if (x < cols - 1) neighbors.push(nodes[y][x + 1]);

        for (const neighbor of neighbors) {
            if (closedSet.includes(neighbor) || neighbor.isWall) {
                continue;
            }

            const tempG = currentNode.g + 1;

            let newPath = false;
            if (openSet.includes(neighbor)) {
                if (tempG < neighbor.g) {
                    neighbor.g = tempG;
                    newPath = true;
                }
            } else {
                neighbor.g = tempG;
                newPath = true;
                openSet.push(neighbor);
            }

            if (newPath) {
                neighbor.h = Math.hypot(neighbor.x - end.x, neighbor.y - end.y);
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = currentNode;
            }
        }
    }

    return []; // 경로를 찾지 못한 경우
}