// 이 파일에서 모든 기본 맵들을 불러와서 관리합니다.
// 새로운 맵을 추가하려면, 아래에 import 구문을 추가하고 localMaps 배열에 맵 변수를 추가하기만 하면 됩니다.

import { grasslandSkirmishMap } from './GrasslandSkirmish.js';
// '중앙대교 요새' 맵 추가 (가져오는 변수 이름을 수정해야 합니다)
import { centralBridgeFortressMap } from './CentralBridgeShowdown.js';

// 홈 화면에 표시할 기본 맵 목록
export const localMaps = [
    centralBridgeFortressMap, // 배열에 추가하는 변수 이름도 수정해야 합니다.
    grasslandSkirmishMap,
];
