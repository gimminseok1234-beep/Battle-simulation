// js/maps/index.js

import { grasslandMap } from './grassland.js';
import { bridgeMap } from './bridge.js';
import { ruinsMap } from './ruins.js';
import { mazeMap } from './maze.js';
import { hadokenarenamap } from './hadokenarena.js';
import { factorymap } from './factory.js';
import { vortexmap } from './vortex.js';
import { chessboardmap } from './chessboard.js';
import { rivermap } from './river.js';
import { siegemap } from './siege.js'; // 새로 추가된 공성전 맵 import

export const localMaps = [
    grasslandMap,
    bridgeMap,
    ruinsMap,
    mazeMap,
    hadokenarenamap,
    factorymap,
    vortexmap,
    chessboardmap,
    rivermap,
    siegemap, // 배열에 공성전 맵 추가
];
