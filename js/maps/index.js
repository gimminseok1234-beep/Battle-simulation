// js/maps/index.js

import { grasslandSkirmishMap } from './GrasslandSkirmish.js';
import { CentralBridgeShowdown } from './CentralBridgeShowdown.js';
import { RuinsOfValor } from './RuinsOfValor.js';

// gameManager.js에서 localMaps로 import 하므로 변수 이름을 수정합니다.
export const localMaps = [
    grasslandSkirmishMap,
    CentralBridgeShowdown,
    RuinsOfValor,
];
