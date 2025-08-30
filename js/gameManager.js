import { db } from './firebase.js';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js';
import { GRID_SIZE, TILE, TEAM, COLORS } from './constants.js';
import { Unit, Weapon, Nexus } from './gameEntities.js';
import { SoundManager } from './soundManager.js';
import { FieldManager } from './fieldManager.js';

class GameManager {
    constructor() {
        if (GameManager.instance) {
            return GameManager.instance;
        }
        GameManager.instance = this;

        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentUser = null;
        this.currentMapId = null;
        this.currentMapData = null;
        this.gameInterval = null;
        this.simulationRunning = false;
        this.activeTool = TILE.FLOOR; // 초기 도구는 바닥 타일
        this.replicationValue = 2; // 복제 타일 기본값
        this.selectedTeam = TEAM.A; // 기본 선택 팀
        this.gameGrid = []; // 맵의 타일 정보를 저장
        this.units = []; // 현재 맵에 배치된 유닛
        this.weapons = []; // 현재 맵에 배치된 무기
        this.nexuses = []; // 현재 맵에 배치된 넥서스
        this.mapListCache = []; // 로드된 맵 목록 캐시
        this.unitIdCounter = 0; // 유닛 ID 카운터
        this.weaponIdCounter = 0; // 무기 ID 카운터
        this.nexusIdCounter = 0; // 넥서스 ID 카운터
        this.placementMode = true; // 배치 모드 (true: 에디터, false: 시뮬레이션)

        this.lastUpdateTime = performance.now();
        this.elapsedTime = 0;
        this.updateInterval = 100; // 100ms 마다 업데이트
        this.drawingInterval = 16; // 60 FPS
        this.lastDrawTime = performance.now();

        this.fieldManager = new FieldManager(this.ctx); // FieldManager 인스턴스 생성
        this.soundManager = new SoundManager(); // SoundManager 인스턴스 생성

        // 무기별 넉백 설정
        this.weaponKnockbacks = {
            hadoken: 15
        };

        // 자기장 설정
        this.autoFieldSettings = {
            active: false,
            shrinkTime: 60, // 분 단위
            safeZoneSize: 6, // 타일 크기
        };
        this.growingFieldSettings = {
            direction: 'DOWN', // DOWN, UP, LEFT, RIGHT
            speed: 4, // 초
            delay: 0, // 초
        };

        this.initDOMReferences();
        this.setupEventListeners();
    }

    static getInstance() {
        if (!GameManager.instance) {
            GameManager.instance = new GameManager();
        }
        return GameManager.instance;
    }

    initDOMReferences() {
        this.homeScreen = document.getElementById('homeScreen');
        this.editorScreen = document.getElementById('editorScreen');
        this.mapGridElement = document.getElementById('mapGrid');
        this.addNewMapCard = document.getElementById('addNewMapCard');
        this.newMapModal = document.getElementById('newMapModal');
        this.newMapNameInput = document.getElementById('newMapName');
        this.newMapWidthInput = document.getElementById('newMapWidth');
        this.newMapHeightInput = document.getElementById('newMapHeight');
        this.confirmNewMapBtn = document.getElementById('confirmNewMapBtn');
        this.cancelNewMapBtn = document.getElementById('cancelNewMapBtn');
        this.backToHomeBtn = document.getElementById('backToHomeBtn');
        this.saveMapBtn = document.getElementById('saveMapBtn');
        this.mapSettingsBtn = document.getElementById('mapSettingsBtn');
        this.simStartBtn = document.getElementById('simStartBtn');
        this.simPauseBtn = document.getElementById('simPauseBtn');
        this.simPlayBtn = document.getElementById('simPlayBtn');
        this.simPlacementResetBtn = document.getElementById('simPlacementResetBtn');
        this.simResetBtn = document.getElementById('simResetBtn');
        this.statusText = document.getElementById('statusText');
        this.toolbox = document.getElementById('toolbox');
        this.replicationValueInput = document.getElementById('replicationValue');
        this.floorColorPicker = document.getElementById('floorColorPicker');
        this.wallColorPicker = document.getElementById('wallColorPicker');
        this.muteBtn = document.getElementById('muteBtn');
        this.soundOnIcon = document.getElementById('soundOnIcon');
        this.soundOffIcon = document.getElementById('soundOffIcon');
        this.killSoundToggle = document.getElementById('killSoundToggle');
        this.actionCamToggle = document.getElementById('actionCamToggle');

        // 모달 관련 DOM 참조 추가
        this.renameMapModal = document.getElementById('renameMapModal');
        this.renameMapInput = document.getElementById('renameMapInput');
        this.confirmRenameBtn = document.getElementById('confirmRenameBtn');
        this.cancelRenameBtn = document.getElementById('cancelRenameBtn');

        this.deleteConfirmModal = document.getElementById('deleteConfirmModal');
        this.deleteConfirmText = document.getElementById('deleteConfirmText');
        this.confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
        this.cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

        this.mapSettingsModal = document.getElementById('mapSettingsModal');
        this.widthInput = document.getElementById('widthInput');
        this.heightInput = document.getElementById('heightInput');
        this.resizeBtn = document.getElementById('resizeBtn');
        this.closeMapSettingsModal = document.getElementById('closeMapSettingsModal');

        this.growingFieldModal = document.getElementById('growingFieldModal');
        this.growingFieldSettingsBtn = document.getElementById('growingFieldSettingsBtn');
        this.fieldDirectionSelect = document.getElementById('fieldDirection');
        this.fieldSpeedInput = document.getElementById('fieldSpeed');
        this.fieldDelayInput = document.getElementById('fieldDelay');
        this.growingFieldDefaultBtn = document.getElementById('growingFieldDefaultBtn');
        this.closeGrowingFieldModal = document.getElementById('closeGrowingFieldModal');

        this.autoFieldModal = document.getElementById('autoFieldModal');
        this.autoFieldSettingsBtn = document.getElementById('autoFieldSettingsBtn');
        this.autoFieldActiveToggle = document.getElementById('autoFieldActiveToggle');
        this.autoFieldShrinkTimeInput = document.getElementById('autoFieldShrinkTime');
        this.autoFieldSafeZoneSizeInput = document.getElementById('autoFieldSafeZoneSize');
        this.autoFieldDefaultBtn = document.getElementById('autoFieldDefaultBtn');
        this.closeAutoFieldModal = document.getElementById('closeAutoFieldModal');

        this.hadokenModal = document.getElementById('hadokenModal');
        this.hadokenSettingsBtn = document.getElementById('hadokenSettingsBtn');
        this.hadokenKnockbackInput = document.getElementById('hadokenKnockback');
        this.hadokenKnockbackValueSpan = document.getElementById('hadokenKnockbackValue');
        this.hadokenDefaultBtn = document.getElementById('hadokenDefaultBtn');
        this.closeHadokenModal = document.getElementById('closeHadokenModal');

        // 카테고리 헤더
        this.categoryHeaders = document.querySelectorAll('.category-header');
    }

    setupEventListeners() {
        // 홈 스크린 맵 카드 클릭 리스너 (addNewMapCard 포함)
        this.mapGridElement.addEventListener('click', async (event) => {
            const mapCard = event.target.closest('.map-card');
            if (mapCard) {
                const mapId = mapCard.dataset.mapId;
                await this.loadMapForEditing(mapId);
            } else if (event.target.closest('#addNewMapCard')) {
                this.showModal(this.newMapModal);
            }
        });

        // 새 맵 생성 모달
        this.confirmNewMapBtn.addEventListener('click', () => this.createNewMap());
        this.cancelNewMapBtn.addEventListener('click', () => this.hideModal(this.newMapModal));

        // 에디터 화면 버튼
        this.backToHomeBtn.addEventListener('click', () => this.leaveEditor());
        this.saveMapBtn.addEventListener('click', () => this.saveMap());
        this.mapSettingsBtn.addEventListener('click', () => this.openMapSettings());
        this.simStartBtn.addEventListener('click', () => this.startSimulation());
        this.simPauseBtn.addEventListener('click', () => this.pauseSimulation());
        this.simPlayBtn.addEventListener('click', () => this.resumeSimulation());
        this.simPlacementResetBtn.addEventListener('click', () => this.resetPlacements());
        this.simResetBtn.addEventListener('click', () => this.fullReset());

        // 툴박스 도구 선택
        this.toolbox.addEventListener('click', (event) => {
            const btn = event.target.closest('.tool-btn');
            if (btn) {
                const tool = btn.dataset.tool;
                const type = btn.dataset.type;
                const team = btn.dataset.team;

                if (tool === 'tile' || tool === 'unit' || tool === 'weapon' || tool === 'nexus' || tool === 'erase' || tool === 'growing_field' || tool === 'auto_field') {
                    this.activeTool = type || tool; // 'tile' 도구의 경우 type 사용, 그 외는 tool 자체 사용
                    this.selectedTeam = team || null; // 팀 정보 저장
                    this.updateStatusText();
                }
            }
        });

        // 맵 캔버스 클릭 이벤트
        this.canvas.addEventListener('click', (event) => this.handleCanvasClick(event));
        this.canvas.addEventListener('mousemove', (event) => this.handleCanvasMouseMove(event));
        this.canvas.addEventListener('contextmenu', (event) => this.handleCanvasRightClick(event));

        // 복제 타일 값 변경
        this.replicationValueInput.addEventListener('change', (e) => {
            this.replicationValue = parseInt(e.target.value);
            if (isNaN(this.replicationValue) || this.replicationValue < 1) {
                this.replicationValue = 1;
                e.target.value = 1;
            }
        });

        // 색상 피커 변경
        this.floorColorPicker.addEventListener('change', (e) => {
            COLORS.FLOOR = e.target.value;
            this.drawGame();
        });
        this.wallColorPicker.addEventListener('change', (e) => {
            COLORS.WALL = e.target.value;
            this.drawGame();
        });

        // 음소거 버튼
        this.muteBtn.addEventListener('click', () => {
            this.soundManager.toggleMute();
            this.soundOnIcon.classList.toggle('hidden', this.soundManager.isMuted);
            this.soundOffIcon.classList.toggle('hidden', !this.soundManager.isMuted);
        });

        // 킬 사운드 토글
        this.killSoundToggle.addEventListener('change', (e) => {
            this.soundManager.killSoundEnabled = e.target.checked;
        });

        // 액션캠 토글
        this.actionCamToggle.addEventListener('change', (e) => {
            this.actionCamEnabled = e.target.checked;
            this.drawGame(); // 토글 시 바로 맵을 다시 그려 카메라 상태 반영
        });

        // 카테고리 헤더 토글
        this.categoryHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const targetId = header.dataset.target;
                const targetContent = document.getElementById(targetId);
                header.classList.toggle('collapsed');
                targetContent.classList.toggle('collapsed');
            });
        });

        // 맵 이름 변경 모달
        this.confirmRenameBtn.addEventListener('click', () => this.renameMap());
        this.cancelRenameBtn.addEventListener('click', () => this.hideModal(this.renameMapModal));

        // 맵 삭제 확인 모달
        this.confirmDeleteBtn.addEventListener('click', () => this.deleteMap());
        this.cancelDeleteBtn.addEventListener('click', () => this.hideModal(this.deleteConfirmModal));

        // 맵 설정 모달
        this.resizeBtn.addEventListener('click', () => this.resizeMap());
        this.closeMapSettingsModal.addEventListener('click', () => this.hideModal(this.mapSettingsModal));

        // 성장형 자기장 설정 모달
        this.growingFieldSettingsBtn.addEventListener('click', () => this.openGrowingFieldSettings());
        this.growingFieldDefaultBtn.addEventListener('click', () => this.setGrowingFieldDefaults());
        this.closeGrowingFieldModal.addEventListener('click', () => this.closeGrowingFieldSettings());

        // 자동 자기장 설정 모달
        this.autoFieldSettingsBtn.addEventListener('click', () => this.openAutoFieldSettings());
        this.autoFieldDefaultBtn.addEventListener('click', () => this.setAutoFieldDefaults());
        this.closeAutoFieldModal.addEventListener('click', () => this.closeAutoFieldSettings());

        // 장풍 넉백 설정 모달
        this.hadokenSettingsBtn.addEventListener('click', () => this.openHadokenSettings());
        this.hadokenKnockbackInput.addEventListener('input', (e) => {
            this.weaponKnockbacks.hadoken = parseInt(e.target.value);
            this.hadokenKnockbackValueSpan.textContent = e.target.value;
        });
        this.hadokenDefaultBtn.addEventListener('click', () => this.setHadokenDefaults());
        this.closeHadokenModal.addEventListener('click', () => this.closeHadokenSettings());
    }

    setCurrentUser(user) {
        this.currentUser = user;
    }

    async init() {
        if (this.currentUser) {
            await this.loadMapList();
        }
    }

    /** 모달 관련 헬퍼 함수 */
    showModal(modalElement) {
        modalElement.classList.add('show-modal');
    }

    hideModal(modalElement) {
        modalElement.classList.remove('show-modal');
    }

    async loadMapList() {
        this.mapGridElement.innerHTML = ''; // 기존 맵 카드 모두 제거
        this.mapGridElement.appendChild(this.addNewMapCard); // '새 맵 추가' 카드 다시 추가

        try {
            const mapsColRef = collection(db, `users/${this.currentUser.uid}/maps`);
            const mapSnap = await getDocs(mapsColRef);
            this.mapListCache = []; // 캐시 초기화

            if (mapSnap.empty) {
                console.log("No maps found for this user.");
                return;
            }

            mapSnap.forEach(doc => {
                const mapData = { id: doc.id, ...doc.data() };
                this.mapListCache.push(mapData);
                this.displayMapCard(mapData);
            });
        } catch (error) {
            console.error("맵 목록 로드 중 오류 발생:", error);
        }
    }

    displayMapCard(mapData) {
        const mapCard = document.createElement('div');
        mapCard.className = 'map-card bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer aspect-[3/4] flex flex-col justify-between';
        mapCard.dataset.mapId = mapData.id;

        const mapName = document.createElement('h3');
        mapName.className = 'text-lg font-semibold mb-2 truncate';
        mapName.textContent = mapData.name;

        const mapDetails = document.createElement('p');
        mapDetails.className = 'text-gray-400 text-sm';
        mapDetails.textContent = `크기: ${mapData.width}x${mapData.height}`;

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex justify-end gap-2 mt-4';

        const renameBtn = document.createElement('button');
        renameBtn.className = 'bg-gray-600 hover:bg-gray-700 text-white text-xs py-1 px-2 rounded';
        renameBtn.textContent = '이름 변경';
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 맵 카드 클릭 이벤트 방지
            this.openRenameModal(mapData.id, mapData.name);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-2 rounded';
        deleteBtn.textContent = '삭제';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 맵 카드 클릭 이벤트 방지
            this.openDeleteConfirmModal(mapData.id, mapData.name);
        });

        buttonContainer.appendChild(renameBtn);
        buttonContainer.appendChild(deleteBtn);

        mapCard.appendChild(mapName);
        mapCard.appendChild(mapDetails);
        mapCard.appendChild(buttonContainer);

        this.mapGridElement.insertBefore(mapCard, this.addNewMapCard);
    }

    async createNewMap() {
        const name = this.newMapNameInput.value.trim();
        const width = parseInt(this.newMapWidthInput.value);
        const height = parseInt(this.newMapHeightInput.value);

        if (!name || isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
            alert("유효한 맵 이름과 크기를 입력해주세요.");
            return;
        }

        this.hideModal(this.newMapModal);

        // 새 맵 데이터 초기화
        const newMapData = {
            name: name,
            width: width,
            height: height,
            grid: Array(height).fill(null).map(() => Array(width).fill(TILE.FLOOR)),
            units: [],
            weapons: [],
            nexuses: [],
            autoField: { ...this.autoFieldSettings },
            growingField: { ...this.growingFieldSettings },
            weaponKnockbacks: { ...this.weaponKnockbacks },
            colors: {
                FLOOR: COLORS.FLOOR,
                WALL: COLORS.WALL,
            }
        };

        try {
            const userMapsColRef = collection(db, `users/${this.currentUser.uid}/maps`);
            const newMapRef = doc(userMapsColRef); // Firestore가 ID를 자동으로 생성하도록 함
            await setDoc(newMapRef, newMapData);
            console.log("새 맵 생성 및 저장 완료:", newMapRef.id);

            // 캐시에 추가 및 UI 업데이트
            newMapData.id = newMapRef.id;
            this.mapListCache.push(newMapData);
            this.displayMapCard(newMapData);

            await this.loadMapForEditing(newMapRef.id);
        } catch (error) {
            console.error("새 맵 생성 중 오류 발생:", error);
            alert("맵 생성에 실패했습니다.");
        }
    }

    async loadMapForEditing(mapId) {
        if (!this.currentUser) {
            alert("로그인 후 맵을 편집할 수 있습니다.");
            return;
        }

        const mapRef = doc(db, `users/${this.currentUser.uid}/maps`, mapId);
        try {
            const mapSnap = await getDoc(mapRef);
            if (!mapSnap.exists()) {
                alert("맵을 찾을 수 없습니다.");
                return;
            }

            this.currentMapId = mapId;
            this.currentMapData = mapSnap.data();
            console.log("맵 로드 완료:", this.currentMapData);

            // 맵 데이터 적용
            this.canvas.width = this.currentMapData.width * GRID_SIZE;
            this.canvas.height = this.currentMapData.height * GRID_SIZE;
            this.gameGrid = this.currentMapData.grid;

            // 저장된 색상 값 적용 (없으면 기본값 사용)
            COLORS.FLOOR = this.currentMapData.colors?.FLOOR || COLORS.FLOOR;
            COLORS.WALL = this.currentMapData.colors?.WALL || COLORS.WALL;
            this.floorColorPicker.value = COLORS.FLOOR;
            this.wallColorPicker.value = COLORS.WALL;

            // 유닛, 무기, 넥서스 데이터 역직렬화 및 ID 카운터 초기화
            this.units = this.currentMapData.units.map(u => new Unit(u.x, u.y, u.team, u.id));
            this.unitIdCounter = this.units.length > 0 ? Math.max(...this.units.map(u => u.id)) + 1 : 0;

            this.weapons = this.currentMapData.weapons.map(w => new Weapon(w.x, w.y, w.type, w.id));
            this.weaponIdCounter = this.weapons.length > 0 ? Math.max(...this.weapons.map(w => w.id)) + 1 : 0;

            this.nexuses = this.currentMapData.nexuses.map(n => new Nexus(n.x, n.y, n.team, n.id));
            this.nexusIdCounter = this.nexuses.length > 0 ? Math.max(...this.nexuses.map(n => n.id)) + 1 : 0;

            // 자기장 및 넉백 설정 로드
            this.autoFieldSettings = { ...this.autoFieldSettings, ...this.currentMapData.autoField };
            this.growingFieldSettings = { ...this.growingFieldSettings, ...this.currentMapData.growingField };
            this.weaponKnockbacks = { ...this.weaponKnockbacks, ...this.currentMapData.weaponKnockbacks };

            this.homeScreen.classList.add('hidden');
            this.editorScreen.classList.remove('hidden');
            this.placementMode = true;
            this.statusText.textContent = `맵 편집: ${this.currentMapData.name}`;

            this.fieldManager.initField(this.currentMapData.width, this.currentMapData.height);
            this.fieldManager.updateSettings(this.autoFieldSettings, this.growingFieldSettings);

            this.drawGame(); // 초기 맵 상태 그리기
        } catch (error) {
            console.error("맵 로드 중 오류 발생:", error);
            alert("맵을 로드하지 못했습니다.");
        }
    }

    async saveMap() {
        if (!this.currentMapId || !this.currentUser) {
            alert("저장할 맵이 없습니다.");
            return;
        }

        try {
            const mapRef = doc(db, `users/${this.currentUser.uid}/maps`, this.currentMapId);
            const updatedMapData = {
                ...this.currentMapData,
                grid: this.gameGrid,
                units: this.units.map(u => u.serialize()), // 직렬화된 유닛 데이터 저장
                weapons: this.weapons.map(w => w.serialize()), // 직렬화된 무기 데이터 저장
                nexuses: this.nexuses.map(n => n.serialize()), // 직렬화된 넥서스 데이터 저장
                autoField: { ...this.autoFieldSettings },
                growingField: { ...this.growingFieldSettings },
                weaponKnockbacks: { ...this.weaponKnockbacks },
                colors: {
                    FLOOR: COLORS.FLOOR,
                    WALL: COLORS.WALL,
                }
            };
            await setDoc(mapRef, updatedMapData);
            this.currentMapData = updatedMapData; // 현재 맵 데이터 업데이트
            alert("맵 저장 완료!");
            console.log("맵 저장 완료:", this.currentMapData);

            // 캐시 업데이트
            const index = this.mapListCache.findIndex(map => map.id === this.currentMapId);
            if (index !== -1) {
                this.mapListCache[index] = { id: this.currentMapId, ...updatedMapData };
            }

        } catch (error) {
            console.error("맵 저장 중 오류 발생:", error);
            alert("맵 저장에 실패했습니다.");
        }
    }

    async renameMap() {
        if (!this.renameMapInput.dataset.mapId || !this.currentUser) return;

        const newName = this.renameMapInput.value.trim();
        if (!newName) {
            alert("새 맵 이름을 입력해주세요.");
            return;
        }

        const mapIdToRename = this.renameMapInput.dataset.mapId;
        const mapRef = doc(db, `users/${this.currentUser.uid}/maps`, mapIdToRename);

        try {
            await updateDoc(mapRef, { name: newName });
            alert("맵 이름 변경 완료!");
            this.hideModal(this.renameMapModal);
            await this.loadMapList(); // 목록 새로고침
        } catch (error) {
            console.error("맵 이름 변경 중 오류 발생:", error);
            alert("맵 이름 변경에 실패했습니다.");
        }
    }

    openRenameModal(mapId, currentName) {
        this.renameMapInput.value = currentName;
        this.renameMapInput.dataset.mapId = mapId;
        this.showModal(this.renameMapModal);
    }

    async deleteMap() {
        if (!this.deleteConfirmBtn.dataset.mapId || !this.currentUser) return;

        const mapIdToDelete = this.deleteConfirmBtn.dataset.mapId;
        const mapRef = doc(db, `users/${this.currentUser.uid}/maps`, mapIdToDelete);

        try {
            await deleteDoc(mapRef);
            alert("맵 삭제 완료!");
            this.hideModal(this.deleteConfirmModal);
            await this.loadMapList(); // 목록 새로고침
            if (this.currentMapId === mapIdToDelete) {
                this.currentMapId = null;
                this.currentMapData = null;
                this.leaveEditor(); // 현재 편집 중인 맵이었다면 에디터 나감
            }
        } catch (error) {
            console.error("맵 삭제 중 오류 발생:", error);
            alert("맵 삭제에 실패했습니다.");
        }
    }

    openDeleteConfirmModal(mapId, mapName) {
        this.deleteConfirmText.textContent = `'${mapName}' 맵을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`;
        this.deleteConfirmBtn.dataset.mapId = mapId;
        this.showModal(this.deleteConfirmModal);
    }


    openMapSettings() {
        this.widthInput.value = this.currentMapData.width;
        this.heightInput.value = this.currentMapData.height;
        this.showModal(this.mapSettingsModal);
    }

    resizeMap() {
        const newWidth = parseInt(this.widthInput.value);
        const newHeight = parseInt(this.heightInput.value);

        if (isNaN(newWidth) || isNaN(newHeight) || newWidth <= 0 || newHeight <= 0) {
            alert("유효한 너비와 높이를 입력해주세요.");
            return;
        }

        if (newWidth === this.currentMapData.width && newHeight === this.currentMapData.height) {
            this.hideModal(this.mapSettingsModal);
            return; // 크기 변경 없음
        }

        // 새 그리드 생성 및 기존 데이터 복사 (잘리거나 늘어날 수 있음)
        const newGrid = Array(newHeight).fill(null).map(() => Array(newWidth).fill(TILE.FLOOR));
        for (let y = 0; y < Math.min(this.currentMapData.height, newHeight); y++) {
            for (let x = 0; x < Math.min(this.currentMapData.width, newWidth); x++) {
                newGrid[y][x] = this.gameGrid[y][x];
            }
        }
        this.gameGrid = newGrid;

        // 캔버스 크기 업데이트
        this.canvas.width = newWidth * GRID_SIZE;
        this.canvas.height = newHeight * GRID_SIZE;
        this.currentMapData.width = newWidth;
        this.currentMapData.height = newHeight;

        // 변경된 크기에 따라 유닛/무기/넥서스 위치 조정 (범위 밖이면 제거)
        this.units = this.units.filter(unit => unit.x < newWidth && unit.y < newHeight);
        this.weapons = this.weapons.filter(weapon => weapon.x < newWidth && weapon.y < newHeight);
        this.nexuses = this.nexuses.filter(nexus => nexus.x < newWidth && nexus.y < newHeight);

        this.fieldManager.initField(newWidth, newHeight); // 자기장도 새 크기에 맞게 초기화

        this.drawGame();
        this.hideModal(this.mapSettingsModal);
        this.saveMap(); // 크기 변경 후 자동 저장
    }

    openGrowingFieldSettings() {
        this.fieldDirectionSelect.value = this.growingFieldSettings.direction;
        this.fieldSpeedInput.value = this.growingFieldSettings.speed;
        this.fieldDelayInput.value = this.growingFieldSettings.delay;
        this.showModal(this.growingFieldModal);
    }

    setGrowingFieldDefaults() {
        this.growingFieldSettings.direction = 'DOWN';
        this.growingFieldSettings.speed = 4;
        this.growingFieldSettings.delay = 0;
        this.fieldDirectionSelect.value = this.growingFieldSettings.direction;
        this.fieldSpeedInput.value = this.growingFieldSettings.speed;
        this.fieldDelayInput.value = this.growingFieldSettings.delay;
    }

    closeGrowingFieldSettings() {
        this.growingFieldSettings.direction = this.fieldDirectionSelect.value;
        this.growingFieldSettings.speed = parseFloat(this.fieldSpeedInput.value);
        this.growingFieldSettings.delay = parseFloat(this.fieldDelayInput.value);
        // 유효성 검사
        if (isNaN(this.growingFieldSettings.speed) || this.growingFieldSettings.speed <= 0) {
            this.growingFieldSettings.speed = 4;
            this.fieldSpeedInput.value = 4;
            alert("자기장 속도는 0보다 큰 숫자를 입력해주세요.");
        }
        if (isNaN(this.growingFieldSettings.delay) || this.growingFieldSettings.delay < 0) {
            this.growingFieldSettings.delay = 0;
            this.fieldDelayInput.value = 0;
            alert("자기장 딜레이는 0 이상의 숫자를 입력해주세요.");
        }
        this.fieldManager.updateSettings(this.autoFieldSettings, this.growingFieldSettings);
        this.hideModal(this.growingFieldModal);
        this.saveMap();
    }

    openAutoFieldSettings() {
        this.autoFieldActiveToggle.checked = this.autoFieldSettings.active;
        this.autoFieldShrinkTimeInput.value = this.autoFieldSettings.shrinkTime;
        this.autoFieldSafeZoneSizeInput.value = this.autoFieldSettings.safeZoneSize;
        this.showModal(this.autoFieldModal);
    }

    setAutoFieldDefaults() {
        this.autoFieldSettings.active = false;
        this.autoFieldSettings.shrinkTime = 60; // 1분
        this.autoFieldSettings.safeZoneSize = 6;
        this.autoFieldActiveToggle.checked = this.autoFieldSettings.active;
        this.autoFieldShrinkTimeInput.value = this.autoFieldSettings.shrinkTime;
        this.autoFieldSafeZoneSizeInput.value = this.autoFieldSettings.safeZoneSize;
    }

    closeAutoFieldSettings() {
        this.autoFieldSettings.active = this.autoFieldActiveToggle.checked;
        this.autoFieldSettings.shrinkTime = parseFloat(this.autoFieldShrinkTimeInput.value);
        this.autoFieldSettings.safeZoneSize = parseInt(this.autoFieldSafeZoneSizeInput.value);

        // 유효성 검사
        if (isNaN(this.autoFieldSettings.shrinkTime) || this.autoFieldSettings.shrinkTime <= 0) {
            this.autoFieldSettings.shrinkTime = 60;
            this.autoFieldShrinkTimeInput.value = 60;
            alert("축소 시간은 0보다 큰 숫자를 입력해주세요.");
        }
        if (isNaN(this.autoFieldSettings.safeZoneSize) || this.autoFieldSettings.safeZoneSize < 1) {
            this.autoFieldSettings.safeZoneSize = 1;
            this.autoFieldSafeZoneSizeInput.value = 1;
            alert("안전구역 크기는 1 이상의 숫자를 입력해주세요.");
        }

        this.fieldManager.updateSettings(this.autoFieldSettings, this.growingFieldSettings);
        this.hideModal(this.autoFieldModal);
        this.saveMap();
    }

    openHadokenSettings() {
        this.hadokenKnockbackInput.value = this.weaponKnockbacks.hadoken;
        this.hadokenKnockbackValueSpan.textContent = this.weaponKnockbacks.hadoken;
        this.showModal(this.hadokenModal);
    }

    setHadokenDefaults() {
        this.weaponKnockbacks.hadoken = 15;
        this.hadokenKnockbackInput.value = 15;
        this.hadokenKnockbackValueSpan.textContent = 15;
    }

    closeHadokenSettings() {
        // 이미 input 이벤트 리스너에서 this.weaponKnockbacks.hadoken 값이 업데이트됨
        this.hideModal(this.hadokenModal);
        this.saveMap();
    }

    leaveEditor() {
        this.homeScreen.classList.remove('hidden');
        this.editorScreen.classList.add('hidden');
        this.currentMapId = null;
        this.currentMapData = null;
        this.units = [];
        this.weapons = [];
        this.nexuses = [];
        this.stopSimulation();
        this.activeTool = TILE.FLOOR; // 에디터 나갈 때 도구 초기화
        this.loadMapList(); // 홈으로 돌아갈 때 맵 목록 새로고침
    }

    updateStatusText() {
        if (this.placementMode) {
            let toolText = '';
            switch (this.activeTool) {
                case TILE.FLOOR: toolText = '바닥'; break;
                case TILE.WALL: toolText = '벽'; break;
                case TILE.LAVA: toolText = '용암'; break;
                case TILE.CRACKED_WALL: toolText = '금 간 벽'; break;
                case TILE.HEAL_PACK: toolText = '힐 팩'; break;
                case TILE.REPLICATION_TILE: toolText = `복제 타일 (+${this.replicationValue})`; break;
                case TILE.TELEPORTER: toolText = '순간이동'; break;
                case 'growing_field': toolText = '성장형 자기장'; break;
                case 'auto_field': toolText = '자동 자기장'; break;
                case 'nexus': toolText = `${this.selectedTeam} 넥서스`; break;
                case 'unit': toolText = `${this.selectedTeam} 유닛`; break;
                case 'sword': toolText = '검'; break;
                case 'bow': toolText = '활'; break;
                case 'dual_swords': toolText = '쌍검'; break;
                case 'staff': toolText = '지팡이'; break;
                case 'hadoken': toolText = '장풍'; break;
                case 'shuriken': toolText = '표창'; break;
                case 'crown': toolText = '왕관'; break;
                case 'erase': toolText = '지우개'; break;
                default: toolText = '선택됨'; break;
            }
            this.statusText.textContent = `맵 편집: ${this.currentMapData.name} / 도구: ${toolText}`;
        } else {
            this.statusText.textContent = `시뮬레이션 중... 남은 유닛: ${this.units.length}`;
        }
    }

    handleCanvasClick(event) {
        if (!this.currentMapData || !this.placementMode) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / GRID_SIZE);
        const y = Math.floor((event.clientY - rect.top) / GRID_SIZE);

        if (x >= 0 && x < this.currentMapData.width && y >= 0 && y < this.currentMapData.height) {
            this.applyTool(x, y);
            this.drawGame();
        }
    }

    handleCanvasMouseMove(event) {
        if (!this.currentMapData || !this.placementMode || !event.buttons) return; // 마우스 버튼이 눌려있지 않으면 리턴

        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / GRID_SIZE);
        const y = Math.floor((event.clientY - rect.top) / GRID_SIZE);

        if (x >= 0 && x < this.currentMapData.width && y >= 0 && y < this.currentMapData.height) {
            if (this.lastHoveredTile && this.lastHoveredTile.x === x && this.lastHoveredTile.y === y) {
                // 이전에 호버했던 타일과 같으면 중복 적용 방지
                return;
            }
            this.applyTool(x, y);
            this.drawGame();
            this.lastHoveredTile = { x, y };
        } else {
            this.lastHoveredTile = null;
        }
    }

    handleCanvasRightClick(event) {
        event.preventDefault(); // 기본 컨텍스트 메뉴 방지
        if (!this.currentMapData || !this.placementMode) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / GRID_SIZE);
        const y = Math.floor((event.clientY - rect.top) / GRID_SIZE);

        if (x >= 0 && x < this.currentMapData.width && y >= 0 && y < this.currentMapData.height) {
            // 오른쪽 클릭 시 지우개 기능
            this.applyTool(x, y, 'erase');
            this.drawGame();
        }
    }

    applyTool(x, y, forcedTool = null) {
        const tool = forcedTool || this.activeTool;

        switch (tool) {
            case TILE.FLOOR:
            case TILE.WALL:
            case TILE.LAVA:
            case TILE.CRACKED_WALL:
            case TILE.HEAL_PACK:
            case TILE.REPLICATION_TILE:
            case TILE.TELEPORTER:
                this.gameGrid[y][x] = tool;
                break;
            case 'nexus':
                if (!this.nexuses.some(n => n.x === x && n.y === y)) {
                    this.nexuses.push(new Nexus(x, y, this.selectedTeam, this.nexusIdCounter++));
                }
                break;
            case 'unit':
                if (!this.units.some(u => u.x === x && u.y === y)) {
                    this.units.push(new Unit(x, y, this.selectedTeam, this.unitIdCounter++));
                }
                break;
            case 'sword':
            case 'bow':
            case 'dual_swords':
            case 'staff':
            case 'hadoken':
            case 'shuriken':
            case 'crown':
                if (!this.weapons.some(w => w.x === x && w.y === y)) {
                    this.weapons.push(new Weapon(x, y, tool, this.weaponIdCounter++));
                }
                break;
            case 'erase':
                this.gameGrid[y][x] = TILE.FLOOR; // 타일 초기화

                // 유닛, 무기, 넥서스 제거
                this.units = this.units.filter(u => !(u.x === x && u.y === y));
                this.weapons = this.weapons.filter(w => !(w.x === x && w.y === y));
                this.nexuses = this.nexuses.filter(n => !(n.x === x && n.y === y));
                break;
        }
    }

    drawGrid() {
        const width = this.currentMapData.width;
        const height = this.currentMapData.height;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 배경색
        this.ctx.fillStyle = COLORS.FLOOR;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 각 타일 그리기
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const tileType = this.gameGrid[y][x];
                let color = COLORS.FLOOR;

                switch (tileType) {
                    case TILE.WALL: color = COLORS.WALL; break;
                    case TILE.LAVA: color = COLORS.LAVA; break;
                    case TILE.CRACKED_WALL: color = COLORS.CRACKED_WALL; break;
                    case TILE.HEAL_PACK: color = COLORS.HEAL_PACK; break;
                    case TILE.REPLICATION_TILE: color = COLORS.REPLICATION_TILE; break;
                    case TILE.TELEPORTER: color = COLORS.TELEPORTER; break;
                }

                this.ctx.fillStyle = color;
                this.ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
            }
        }

        // 그리드 라인 그리기
        this.ctx.strokeStyle = COLORS.GRID;
        this.ctx.lineWidth = 0.5;
        for (let x = 0; x <= width; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * GRID_SIZE, 0);
            this.ctx.lineTo(x * GRID_SIZE, this.canvas.height);
            this.ctx.stroke();
        }
        for (let y = 0; y <= height; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * GRID_SIZE);
            this.ctx.lineTo(this.canvas.width, y * GRID_SIZE);
            this.ctx.stroke();
        }
    }

    drawEntities() {
        // 넥서스 그리기 (유닛보다 먼저 그려져야 함)
        this.nexuses.forEach(nexus => nexus.draw(this.ctx));

        // 무기 그리기 (유닛보다 먼저 그려져야 함)
        this.weapons.forEach(weapon => weapon.draw(this.ctx));

        // 유닛 그리기 (가장 위에 그려져야 함)
        this.units.forEach(unit => unit.draw(this.ctx));
    }

    drawField() {
        if (!this.placementMode) { // 시뮬레이션 중에만 자기장 그림
            this.fieldManager.draw(this.ctx);
        }
    }


    drawGame() {
        if (!this.currentMapData) return;

        // 액션캠이 활성화되어 있고 시뮬레이션 중이며 유닛이 1개 이상일 때
        if (this.actionCamEnabled && !this.placementMode && this.units.length > 0) {
            this.applyActionCam();
        } else {
            // 일반 시점 (모든 것을 한 번에 그림)
            this.ctx.setTransform(1, 0, 0, 1, 0, 0); // 변환 초기화
            this.drawGrid();
            this.drawField();
            this.drawEntities();
        }
    }

    applyActionCam() {
        // 가장 오래 살아남은 유닛을 추적 (또는 특정 유닛을 추적하도록 변경 가능)
        const targetUnit = this.units.length > 0 ? this.units[0] : null;

        if (targetUnit) {
            // 캔버스 중앙에 유닛이 오도록 오프셋 계산
            const offsetX = this.canvas.width / 2 - (targetUnit.x + 0.5) * GRID_SIZE;
            const offsetY = this.canvas.height / 2 - (targetUnit.y + 0.5) * GRID_SIZE;

            // 변환 적용
            this.ctx.setTransform(1, 0, 0, 1, offsetX, offsetY);

            // 그리기 (변환된 좌표계에서 그려짐)
            this.drawGrid();
            this.drawField();
            this.drawEntities();

            // 유닛 위에 이름 표시
            this.ctx.fillStyle = 'white';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            // 변환이 적용된 상태이므로 유닛의 원래 좌표를 사용하면 됩니다.
            this.ctx.fillText(`${targetUnit.team} ${targetUnit.id}`, (targetUnit.x + 0.5) * GRID_SIZE, targetUnit.y * GRID_SIZE - 5);
        } else {
            // 추적할 유닛이 없으면 일반 시점으로 전환
            this.ctx.setTransform(1, 0, 0, 1, 0, 0); // 변환 초기화
            this.drawGrid();
            this.drawField();
            this.drawEntities();
        }
    }

    startSimulation() {
        if (!this.currentMapData) {
            alert("편집할 맵을 먼저 선택해주세요.");
            return;
        }

        if (this.units.length === 0 && this.nexuses.length === 0) {
            alert("시뮬레이션을 시작하려면 유닛이나 넥서스가 최소 하나는 있어야 합니다.");
            return;
        }

        this.placementMode = false;
        this.simulationRunning = true;
        this.simStartBtn.classList.add('hidden');
        this.simPauseBtn.classList.remove('hidden');
        this.simPlayBtn.classList.add('hidden'); // 시작 시 플레이 버튼 숨김
        this.statusText.textContent = "시뮬레이션 중...";
        this.fieldManager.startField(this.autoFieldSettings, this.growingFieldSettings);

        this.lastUpdateTime = performance.now();
        this.lastDrawTime = performance.now();
        this.gameLoop();
    }

    pauseSimulation() {
        this.simulationRunning = false;
        this.simPauseBtn.classList.add('hidden');
        this.simPlayBtn.classList.remove('hidden');
        this.statusText.textContent = "시뮬레이션 일시정지";
    }

    resumeSimulation() {
        this.simulationRunning = true;
        this.simPauseBtn.classList.remove('hidden');
        this.simPlayBtn.classList.add('hidden');
        this.statusText.textContent = "시뮬레이션 중...";
        this.lastUpdateTime = performance.now(); // 일시정지 시간 보정
        this.lastDrawTime = performance.now();
        this.gameLoop();
    }

    stopSimulation() {
        this.simulationRunning = false;
        if (this.gameInterval) {
            cancelAnimationFrame(this.gameInterval);
            this.gameInterval = null;
        }
        this.simStartBtn.classList.remove('hidden');
        this.simPauseBtn.classList.add('hidden');
        this.simPlayBtn.classList.add('hidden');
        this.placementMode = true; // 배치 모드로 전환
        this.statusText.textContent = `맵 편집: ${this.currentMapData ? this.currentMapData.name : ''}`;

        // 자기장 초기화 (시뮬레이션 종료 시)
        this.fieldManager.resetField();
    }

    resetPlacements() {
        // 현재 배치된 유닛, 무기, 넥서스만 초기화하고 맵 타일은 유지
        this.units = [];
        this.weapons = [];
        this.nexuses = [];
        this.unitIdCounter = 0;
        this.weaponIdCounter = 0;
        this.nexusIdCounter = 0;
        this.stopSimulation(); // 시뮬레이션 중이면 중지
        this.placementMode = true; // 배치 모드 유지
        this.drawGame();
        this.updateStatusText();
    }

    fullReset() {
        if (confirm("맵의 모든 배치와 타일을 초기화하고 기본 맵으로 되돌리시겠습니까?")) {
            this.stopSimulation(); // 시뮬레이션 중이면 중지
            this.placementMode = true;

            // 모든 타일을 바닥으로 초기화
            this.gameGrid = Array(this.currentMapData.height).fill(null).map(() => Array(this.currentMapData.width).fill(TILE.FLOOR));

            // 모든 유닛, 무기, 넥서스 제거
            this.units = [];
            this.weapons = [];
            this.nexuses = [];
            this.unitIdCounter = 0;
            this.weaponIdCounter = 0;
            this.nexusIdCounter = 0;

            // 색상도 기본값으로 초기화
            COLORS.FLOOR = '#374151';
            COLORS.WALL = '#9ca3af';
            this.floorColorPicker.value = COLORS.FLOOR;
            this.wallColorPicker.value = COLORS.WALL;

            // 자기장 설정도 기본값으로 초기화
            this.setAutoFieldDefaults();
            this.setGrowingFieldDefaults();
            this.setHadokenDefaults();
            this.fieldManager.updateSettings(this.autoFieldSettings, this.growingFieldSettings); // 필드 매니저에도 적용

            this.drawGame(); // 초기화된 맵 그리기
            this.updateStatusText();
            this.saveMap(); // 초기화된 맵 자동 저장
            alert("맵이 완전히 초기화되었습니다.");
        }
    }


    gameLoop() {
        if (!this.simulationRunning) {
            cancelAnimationFrame(this.gameInterval);
            return;
        }

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastUpdateTime;
        this.elapsedTime += deltaTime;

        // 일정 시간마다 게임 로직 업데이트 (예: 100ms)
        if (this.elapsedTime >= this.updateInterval) {
            this.update(this.elapsedTime / 1000); // 초 단위로 전달
            this.elapsedTime = 0;
            this.lastUpdateTime = currentTime;
        }

        // 일정 FPS로 화면 그리기 (예: 60 FPS)
        if (currentTime - this.lastDrawTime >= this.drawingInterval) {
            this.drawGame();
            this.lastDrawTime = currentTime;
        }

        this.gameInterval = requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime) {
        if (this.placementMode) return;

        // 자기장 업데이트 (유닛 움직임 전에)
        this.fieldManager.update(deltaTime, this.currentMapData.width, this.currentMapData.height, this.units);

        // 넥서스 업데이트 (유닛 생성)
        this.nexuses.forEach(nexus => nexus.update(deltaTime, this.units, this.gameGrid, this.unitIdCounter++));

        // 유닛 업데이트
        this.units.forEach(unit => {
            unit.update(
                deltaTime,
                this.gameGrid,
                this.units,
                this.weapons,
                this.nexuses,
                this.fieldManager.isInsideSafeZone(unit.x, unit.y), // 유닛이 안전 지대 안에 있는지 전달
                this.soundManager,
                this.weaponKnockbacks
            );
        });

        // 텔레포터 타일 처리 (유닛 이동 후)
        this.handleTeleporterTiles();

        // 복제 타일 처리 (유닛 이동 후)
        this.handleReplicationTiles();

        // 킬 사운드 및 로그 처리
        this.processKills();

        // 자기장에 의한 피해 처리
        this.applyFieldDamage();

        // 죽은 유닛 제거
        this.units = this.units.filter(unit => unit.isAlive());

        // 팀 승리 조건 확인
        this.checkWinCondition();

        this.updateStatusText();
    }

    handleTeleporterTiles() {
        this.units.forEach(unit => {
            const tileType = this.gameGrid[unit.y][unit.x];
            if (tileType === TILE.TELEPORTER && !unit.teleportedThisTick) {
                // 현재 맵의 모든 텔레포터 타일 찾기
                const teleporters = [];
                for (let y = 0; y < this.currentMapData.height; y++) {
                    for (let x = 0; x < this.currentMapData.width; x++) {
                        if (this.gameGrid[y][x] === TILE.TELEPORTER) {
                            teleporters.push({ x, y });
                        }
                    }
                }

                // 현재 유닛이 서있는 텔레포터는 제외
                const otherTeleporters = teleporters.filter(t => !(t.x === unit.x && t.y === unit.y));

                if (otherTeleporters.length > 0) {
                    // 다른 텔레포터 중 랜덤하게 하나 선택
                    const randomTeleporter = otherTeleporters[Math.floor(Math.random() * otherTeleporters.length)];
                    unit.x = randomTeleporter.x;
                    unit.y = randomTeleporter.y;
                    unit.teleportedThisTick = true; // 한 틱에 한 번만 텔레포트
                    this.soundManager.playTeleportSound();
                }
            }
            unit.teleportedThisTick = false; // 다음 틱을 위해 초기화
        });
    }

    handleReplicationTiles() {
        const newUnitsToAdd = [];
        this.units.forEach(unit => {
            const tileType = this.gameGrid[unit.y][unit.x];
            if (tileType === TILE.REPLICATION_TILE && !unit.replicatedThisTick) {
                for (let i = 0; i < this.replicationValue; i++) {
                    // 주변 빈 공간 찾기
                    const emptySpot = this.findEmptySpotAround(unit.x, unit.y);
                    if (emptySpot) {
                        const newUnit = new Unit(emptySpot.x, emptySpot.y, unit.team, this.unitIdCounter++);
                        newUnitsToAdd.push(newUnit);
                    }
                }
                unit.replicatedThisTick = true; // 한 틱에 한 번만 복제
                this.soundManager.playReplicationSound();
            }
            unit.replicatedThisTick = false; // 다음 틱을 위해 초기화
        });
        this.units.push(...newUnitsToAdd);
    }

    findEmptySpotAround(x, y) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue; // 자기 자신 위치는 제외

                const nx = x + dx;
                const ny = y + dy;

                // 맵 범위 내이고, 타일이 바닥이며, 다른 유닛이 없는지 확인
                if (nx >= 0 && nx < this.currentMapData.width &&
                    ny >= 0 && ny < this.currentMapData.height &&
                    this.gameGrid[ny][nx] === TILE.FLOOR &&
                    !this.units.some(u => u.x === nx && u.y === ny)) {
                    return { x: nx, y: ny };
                }
            }
        }
        return null; // 주변에 빈 공간 없음
    }

    processKills() {
        const deadUnits = this.units.filter(unit => !unit.isAlive());
        deadUnits.forEach(deadUnit => {
            console.log(`${deadUnit.team} 팀 ${deadUnit.id}번 유닛 사망.`);
            if (this.soundManager.killSoundEnabled) {
                this.soundManager.playKillSound();
            }
        });
    }

    applyFieldDamage() {
        this.units.forEach(unit => {
            if (!this.fieldManager.isInsideSafeZone(unit.x, unit.y)) {
                unit.takeDamage(this.fieldManager.damagePerTick);
            }
        });
    }

    checkWinCondition() {
        const aliveTeams = new Set(this.units.map(unit => unit.team));
        if (aliveTeams.size <= 1) {
            this.stopSimulation();
            if (aliveTeams.size === 1) {
                const winnerTeam = aliveTeams.values().next().value;
                this.statusText.textContent = `${winnerTeam} 팀 승리!`;
                alert(`${winnerTeam} 팀이 승리했습니다!`);
            } else {
                this.statusText.textContent = "모든 유닛 전멸! (무승부)";
                alert("모든 유닛이 전멸했습니다. 무승부!");
            }
        }
    }
}

// GameManager 인스턴스를 전역으로 노출하여 다른 모듈에서 접근할 수 있도록 함
// (main.js에서 import GameManager from './gameManager.js' 후 GameManager.getInstance() 호출)
export default GameManager;
