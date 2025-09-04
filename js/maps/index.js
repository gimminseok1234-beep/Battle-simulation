// js/maps/index.js

// 수정한 파일 이름과 변수명으로 데이터를 가져옵니다.
import { grasslandMap } from './grassland.js';
import { bridgeMap } from './bridge.js';
import { ruinsMap } from './ruins.js';

// localMaps 배열에 새로운 변수명을 사용합니다.
export const localMaps = [
    grasslandMap,
    bridgeMap,
    ruinsMap,
];
