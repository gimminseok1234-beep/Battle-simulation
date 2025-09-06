// js/maps/index.js

import { grasslandMap } from './grassland.js';
import { bridgeMap } from './bridge.js';
import { ruinsMap } from './ruins.js';
import { mazeMap } from './maze.js'; // 새로 추가된 미로 맵 import

export const localMaps = [
    grasslandMap,
    bridgeMap,
    ruinsMap,
    mazeMap, // 배열에 미로 맵 추가
];
