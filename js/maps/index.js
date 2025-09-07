// js/maps/index.js

import { grasslandMap } from './grassland.js';
import { bridgeMap } from './bridge.js';
import { ruinsMap } from './ruins.js';
import { mazeMap } from './maze.js';
import { hadokenarenamap } from './hadokenarena.js';
import { factorymap } from './factory.js';
import { vortexmap } from './vortex.js';       // 소용돌이 맵 import
import { chessboardmap } from './chessboard.js'; // 체스판 맵 import
import { rivermap } from './river.js';         // 강변 맵 import

export const localMaps = [
    grasslandMap,
    bridgeMap,
    ruinsMap,
    mazeMap,
    hadokenarenamap,
    factorymap,
    vortexmap,      // 소용돌이 맵 추가
    chessboardmap,  // 체스판 맵 추가
    rivermap,       // 강변 맵 추가
];
