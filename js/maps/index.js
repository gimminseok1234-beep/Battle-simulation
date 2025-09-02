// 이 파일에서 모든 기본 맵들을 불러와서 관리합니다.
// 새로운 맵을 추가하려면, 아래에 import 구문을 추가하고 localMaps 배열에 맵 변수를 추가하기만 하면 됩니다.

import { grasslandSkirmishMap } from './GrasslandSkirmish.js';
// import { centralBridgeShowdownMap } from './CentralBridgeShowdown.js'; // 예시: 다른 맵 추가

// 홈 화면에 표시할 기본 맵 목록
export const localMaps = [
    grasslandSkirmishMap,
    // centralBridgeShowdownMap, // 예시: 다른 맵 추가
];
