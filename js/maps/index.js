// js/maps/index.js

import { grasslandMap } from './grassland.js';
import { bridgeMap } from './bridge.js';
import { ruinsMap } from './ruins.js';
import { mazeMap } from './maze.js';
// [수정] 파일 경로와 변수 이름을 소문자로 변경
import { hadokenarenamap } from './hadokenarena.js'; 

export const localMaps = [
    grasslandMap,
    bridgeMap,
    ruinsMap,
    mazeMap,
    hadokenarenamap, // [수정] 배열에 추가되는 변수 이름 변경
];
