// js/maps/index.js

import { grasslandSkirmishMap } from './GrasslandSkirmish.js';
// 'CentralBridgeShowdown' 대신 'centralBridgeFortressMap'으로 가져옵니다.
import { centralBridgeFortressMap } from './CentralBridgeShowdown.js';
import { RuinsOfValor } from './RuinsOfValor.js';

// GameManager에서 'localMaps'를 사용하므로 export 이름을 수정하고, 배열 형태로 만듭니다.
export const localMaps = [
    grasslandSkirmishMap,
    centralBridgeFortressMap, // 가져온 이름 그대로 사용합니다.
    RuinsOfValor,
];
