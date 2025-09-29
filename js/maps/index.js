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
import { siegemap } from './siege.js';
import { arenaMap } from './arena.js';
import { crystalcavernMap } from './crystalcavern.js';
import { ninjavillageMap } from './ninjavillage.js';
import { conduitcanyonMap } from './conduitcanyon.js';
import { sunkenruinshipMap } from './sunkenruinship.js'; // 새로 추가된 유적선 맵 import
import { clockworktowerMap } from './clockworktower.js'; // 새로 추가된 태엽장치 맵 import

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
    siegemap,
    arenaMap,
    crystalcavernMap,
    ninjavillageMap,
    conduitcanyonMap,
    sunkenruinshipMap, // 배열에 유적선 맵 추가
    clockworktowerMap, // 배열에 태엽장치 맵 추가
];
