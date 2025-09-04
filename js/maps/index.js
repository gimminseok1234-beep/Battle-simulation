// js/maps/index.js

import { grasslandSkirmishMap } from './GrasslandSkirmish.js'; // 수정: grasslandSkirmishMap으로 가져옵니다.
import { CentralBridgeShowdown } from './CentralBridgeShowdown.js';
import { RuinsOfValor } from './RuinsOfValor.js';

export const maps = {
    // 수정: 키 이름을 GrasslandSkirmish로 하고, 값으로 grasslandSkirmishMap을 할당합니다.
    GrasslandSkirmish: grasslandSkirmishMap, 
    CentralBridgeShowdown,
    RuinsOfValor,
};
