import { COLORS, TILE } from '../constants.js';

const MAX_RECENT_COLORS = 8;

export class UIManager {
    constructor(gameManager, persistenceManager) {
        this.gameManager = gameManager;
        this.persistenceManager = persistenceManager;
    }

    init() {
        this.createToolboxUI();
        this.setupEventListeners();
    }

    createToolboxUI() {
        const toolbox = document.getElementById('toolbox');
        if (!toolbox) return;
        
        toolbox.innerHTML = `
            <div class="category-header collapsed" data-target="category-basic-tiles">기본 타일</div>
            <div id="category-basic-tiles" class="category-content collapsed">
                <button class="tool-btn selected" data-tool="tile" data-type="FLOOR">바닥</button>
                <div class="flex items-center gap-2 my-1">
                    <input type="color" id="floorColorPicker" value="${this.gameManager.currentFloorColor}" class="w-full h-8 p-1 rounded">
                    <button id="defaultFloorColorBtn" class="p-2 rounded bg-gray-600 hover:bg-gray-500" title="기본값으로">🔄</button>
                </div>
                <div id="recentFloorColors" class="grid grid-cols-4 gap-1 mb-2"></div>
                
                <button class="tool-btn" data-tool="tile" data-type="WALL">벽</button>
                <div class="flex items-center gap-2 my-1">
                    <input type="color" id="wallColorPicker" value="${this.gameManager.currentWallColor}" class="w-full h-8 p-1 rounded">
                    <button id="defaultWallColorBtn" class="p-2 rounded bg-gray-600 hover:bg-gray-500" title="기본값으로">🔄</button>
                </div>
                <div id="recentWallColors" class="grid grid-cols-4 gap-1 mb-2"></div>
            </div>

            <div class="category-header collapsed" data-target="category-special-tiles">특수 타일</div>
            <div id="category-special-tiles" class="category-content collapsed">
                <div class="overflow-y-auto max-h-60 pr-2">
                    <div class="flex items-center gap-1 mt-1">
                        <button class="tool-btn flex-grow" data-tool="tile" data-type="LAVA">용암</button>
                        <button id="lavaSettingsBtn" class="p-2 rounded hover:bg-gray-600">⚙️</button>
                    </div>
                    <button class="tool-btn" data-tool="tile" data-type="GLASS_WALL">유리벽</button>
                    <button class="tool-btn" data-tool="tile" data-type="CRACKED_WALL">부서지는 벽</button>
                    <button class="tool-btn" data-tool="tile" data-type="HEAL_PACK">회복 팩</button>
                    <button class="tool-btn" data-tool="tile" data-type="AWAKENING_POTION">각성 물약</button>
                    <button class="tool-btn" data-tool="tile" data-type="TELEPORTER">텔레포터</button>
                    <button class="tool-btn" data-tool="tile" data-type="QUESTION_MARK">물음표</button>
                    <div class="flex items-center gap-2 mt-1">
                        <button class="tool-btn flex-grow" data-tool="tile" data-type="REPLICATION_TILE">+N 복제</button>
                        <input type="number" id="replicationValue" value="${this.gameManager.replicationValue}" min="1" class="modal-input w-16">
                    </div>
                    <div class="flex items-center gap-1 mt-1">
                        <button class="tool-btn flex-grow" data-tool="tile" data-type="DASH_TILE">돌진 타일</button>
                        <button id="dashTileSettingsBtn" class="p-2 rounded hover:bg-gray-600">⚙️</button>
                    </div>
                    <div class="flex items-center gap-1 mt-1">
                        <button class="tool-btn flex-grow" data-tool="growing_field">성장형 자기장</button>
                        <button id="growingFieldSettingsBtn" class="p-2 rounded hover:bg-gray-600">⚙️</button>
                    </div>
                    <div class="flex items-center gap-1 mt-1">
                        <button class="tool-btn flex-grow" data-tool="auto_field">자동 자기장</button>
                        <button id="autoFieldSettingsBtn" class="p-2 rounded hover:bg-gray-600">⚙️</button>
                    </div>
                </div>
            </div>

            <div class="category-header collapsed" data-target="category-units">유닛</div>
            <div id="category-units" class="category-content collapsed">
                <button class="tool-btn" data-tool="unit" data-team="A">빨강 유닛</button>
                <button class="tool-btn" data-tool="unit" data-team="B">파랑 유닛</button>
                <button class="tool-btn" data-tool="unit" data-team="C">초록 유닛</button>
                <button class="tool-btn" data-tool="unit" data-team="D">노랑 유닛</button>
            </div>
            
            <div class="category-header collapsed" data-target="category-weapons">무기</div>
            <div id="category-weapons" class="category-content collapsed">
                <div class="overflow-y-auto max-h-60 pr-2">
                    <button class="tool-btn" data-tool="weapon" data-type="sword">검</button>
                    <button class="tool-btn" data-tool="weapon" data-type="axe">도끼</button>
                    <button class="tool-btn" data-tool="weapon" data-type="bow">활</button>
                    <button class="tool-btn" data-tool="weapon" data-type="ice_diamond">얼음 다이아</button>
                    <button class="tool-btn" data-tool="weapon" data-type="dual_swords">쌍검</button>
                    <button class="tool-btn" data-tool="weapon" data-type="fire_staff">불 지팡이</button>
                    <button class="tool-btn" data-tool="weapon" data-type="lightning">번개</button>
                    <button class="tool-btn" data-tool="weapon" data-type="magic_spear">마법창</button>
                    <button class="tool-btn" data-tool="weapon" data-type="boomerang">부메랑</button>
                    <button class="tool-btn" data-tool="weapon" data-type="poison_potion">독 포션</button>
                    <button class="tool-btn" data-tool="weapon" data-type="magic_dagger">마법 단검</button>
                    <div class="flex items-center gap-1">
                        <button class="tool-btn flex-grow" data-tool="weapon" data-type="hadoken">장풍</button>
                        <button id="hadokenSettingsBtn" class="p-2 rounded hover:bg-gray-600">⚙️</button>
                    </div>
                    <button class="tool-btn" data-tool="weapon" data-type="shuriken">표창</button>
                    <button class="tool-btn" data-tool="weapon" data-type="vampiric_scythe">흡혈 낫</button>
                    <button class="tool-btn" data-tool="weapon" data-type="crown">왕관</button>
                </div>
            </div>

            <div class="category-header collapsed" data-target="category-nexus">넥서스</div>
            <div id="category-nexus" class="category-content collapsed">
                <button class="tool-btn" data-tool="nexus" data-team="A">빨강 넥서스</button>
                <button class="tool-btn" data-tool="nexus" data-team="B">파랑 넥서스</button>
                <button class="tool-btn" data-tool="nexus" data-team="C">초록 넥서스</button>
                <button class="tool-btn" data-tool="nexus" data-team="D">노랑 넥서스</button>
            </div>
            
            <div class="category-header bg-slate-800 collapsed" data-target="category-utils">기타</div>
            <div id="category-utils" class="category-content collapsed">
                 <button class="tool-btn" data-tool="erase">지우개</button>
                 <button class="tool-btn" data-tool="nametag">이름표</button>
            </div>
        `;
    }

    setupEventListeners() {
        // Modal Buttons
        document.getElementById('cancelNewMapBtn').addEventListener('click', () => this.closeModal('newMapModal'));
        document.getElementById('cancelRenameBtn').addEventListener('click', () => this.closeModal('renameMapModal'));
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => this.closeModal('deleteConfirmModal'));
        document.getElementById('closeMapSettingsModal').addEventListener('click', () => this.closeModal('mapSettingsModal'));
        document.getElementById('closeDashTileModal').addEventListener('click', () => {
            this.gameManager.dashTileSettings.direction = document.getElementById('dashTileDirection').value;
            this.closeModal('dashTileModal');
        });
        document.getElementById('cancelSaveReplayBtn').addEventListener('click', () => this.closeModal('saveReplayModal'));
        document.getElementById('confirmSaveReplayBtn').addEventListener('click', () => this.persistenceManager.saveLastReplay());
        document.getElementById('closeLavaSettingsModal').addEventListener('click', () => {
            this.gameManager.isLavaAvoidanceEnabled = document.getElementById('lavaAvoidanceToggle').checked;
            this.closeModal('lavaSettingsModal');
        });

        // Home Screen
        document.getElementById('addNewMapCard').addEventListener('click', () => {
            document.getElementById('newMapName').value = '';
            document.getElementById('newMapWidth').value = '460';
            document.getElementById('newMapHeight').value = '800';
            this.openModal('newMapModal');
        });
        document.getElementById('defaultMapsBtn').addEventListener('click', () => this.gameManager.showDefaultMapsScreen());
        document.getElementById('replaysBtn').addEventListener('click', () => this.gameManager.showReplayScreen());
        document.getElementById('backToHomeFromDefaultBtn').addEventListener('click', () => this.gameManager.showHomeScreen());
        document.getElementById('backToHomeFromReplayBtn').addEventListener('click', () => this.gameManager.showHomeScreen());

        // New Map Creation
        document.getElementById('confirmNewMapBtn').addEventListener('click', async () => {
            const name = document.getElementById('newMapName').value.trim() || '새로운 맵';
            const width = parseInt(document.getElementById('newMapWidth').value) || 460;
            const height = parseInt(document.getElementById('newMapHeight').value) || 800;
            this.closeModal('newMapModal');
            await this.persistenceManager.createNewMap(name, width, height);
        });

        // Editor Screen
        document.getElementById('backToHomeBtn').addEventListener('click', () => this.gameManager.showHomeScreen());
        document.getElementById('saveMapBtn').addEventListener('click', () => this.persistenceManager.saveCurrentMap());
        document.getElementById('saveReplayBtn').addEventListener('click', () => this.openSaveReplayModal());
        document.getElementById('mapSettingsBtn').addEventListener('click', () => {
            document.getElementById('widthInput').value = this.gameManager.canvas.width;
            document.getElementById('heightInput').value = this.gameManager.canvas.height;
            this.openModal('mapSettingsModal');
        });

        // Audio Settings
        document.getElementById('killSoundToggle').addEventListener('change', (e) => this.gameManager.audioManager.toggleKillSound(e.target.checked));
        document.getElementById('volumeControl').addEventListener('input', (e) => this.gameManager.audioManager.setVolume(parseFloat(e.target.value)));
        document.getElementById('muteBtn').addEventListener('click', () => this.gameManager.audioManager.toggleMute());

        // Simulation Controls
        document.getElementById('simStartBtn').addEventListener('click', () => this.gameManager.simulationManager.startSimulation());
        document.getElementById('simPauseBtn').addEventListener('click', () => this.gameManager.simulationManager.pauseSimulation());
        document.getElementById('simPlayBtn').addEventListener('click', () => this.gameManager.simulationManager.playSimulation());
        document.getElementById('simPlacementResetBtn').addEventListener('click', () => this.gameManager.resetPlacement());
        document.getElementById('simResetBtn').addEventListener('click', () => this.gameManager.resetMap());
        document.getElementById('resizeBtn').addEventListener('click', () => {
            this.gameManager.resizeCanvas(parseInt(document.getElementById('widthInput').value), parseInt(document.getElementById('heightInput').value));
            this.closeModal('mapSettingsModal');
        });
        document.getElementById('actionCamToggle').addEventListener('change', (e) => {
            this.gameManager.isActionCam = e.target.checked;
            if (!this.gameManager.isActionCam) this.gameManager.resetActionCam(true);
        });

        // Home Settings
        this.setupHomeSettingsModal();

        // Toolbox
        this.setupToolboxListeners();

        // Nametag Settings
        this.setupNametagSettingsModal();

        // Unit Name Modal
        document.getElementById('cancelUnitNameBtn').addEventListener('click', () => this.closeModal('unitNameModal'));
        document.getElementById('confirmUnitNameBtn').addEventListener('click', () => {
            if (this.gameManager.editingUnit) {
                this.gameManager.editingUnit.name = document.getElementById('unitNameInput').value;
                this.gameManager.editingUnit = null;
                this.gameManager.draw();
            }
            this.closeModal('unitNameModal');
        });

        // 전역 클릭 리스너 (맵 메뉴 닫기)
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.map-menu-button')) {
               document.querySelectorAll('.map-menu').forEach(menu => menu.style.display = 'none');
           }
       }, true);
    }

    setupToolboxListeners() {
        document.getElementById('toolbox').addEventListener('click', (e) => {
            const target = e.target;
            const toolButton = target.closest('.tool-btn');
            const categoryHeader = target.closest('.category-header');
            const recentColorSwatch = target.closest('.recent-color-swatch');

            if (toolButton) {
                this.selectTool(toolButton);
            } else if (recentColorSwatch) {
                this.setCurrentColor(recentColorSwatch.dataset.color, recentColorSwatch.dataset.type, true);
            } else if (target.id === 'defaultFloorColorBtn') {
                this.setCurrentColor(COLORS.FLOOR, 'floor', true);
            } else if (target.id === 'defaultWallColorBtn') {
                this.setCurrentColor(COLORS.WALL, 'wall', true);
            } else if (target.id === 'growingFieldSettingsBtn' || target.parentElement.id === 'growingFieldSettingsBtn') {
                document.getElementById('fieldDirection').value = this.gameManager.growingFieldSettings.direction;
                document.getElementById('fieldSpeed').value = this.gameManager.growingFieldSettings.speed;
                document.getElementById('fieldDelay').value = this.gameManager.growingFieldSettings.delay;
                this.openModal('growingFieldModal');
            } else if (target.id === 'lavaSettingsBtn' || target.parentElement.id === 'lavaSettingsBtn') {
                document.getElementById('lavaAvoidanceToggle').checked = this.gameManager.isLavaAvoidanceEnabled;
                this.openModal('lavaSettingsModal');
            } else if (target.id === 'dashTileSettingsBtn' || target.parentElement.id === 'dashTileSettingsBtn') {
                document.getElementById('dashTileDirection').value = this.gameManager.dashTileSettings.direction;
                this.openModal('dashTileModal');
            } else if (target.id === 'autoFieldSettingsBtn' || target.parentElement.id === 'autoFieldSettingsBtn') {
                 document.getElementById('autoFieldActiveToggle').checked = this.gameManager.autoMagneticField.isActive;
                document.getElementById('autoFieldShrinkTime').value = this.gameManager.autoMagneticField.totalShrinkTime / 60;
                document.getElementById('autoFieldSafeZoneSize').value = this.gameManager.autoMagneticField.safeZoneSize;
                document.getElementById('autoFieldShrinkType').value = this.gameManager.autoMagneticField.shrinkType || 'all';
                this.openModal('autoFieldModal');
            } else if (target.id === 'hadokenSettingsBtn' || target.parentElement.id === 'hadokenSettingsBtn') {
                document.getElementById('hadokenKnockback').value = this.gameManager.hadokenKnockback;
                document.getElementById('hadokenKnockbackValue').textContent = this.gameManager.hadokenKnockback;
                this.openModal('hadokenModal');
            } else if (categoryHeader) {
                const content = categoryHeader.nextElementSibling;
                categoryHeader.classList.toggle('collapsed');
                content.classList.toggle('collapsed');
            }
        });

        document.getElementById('closeGrowingFieldModal').addEventListener('click', () => {
            this.gameManager.growingFieldSettings.direction = document.getElementById('fieldDirection').value;
            this.gameManager.growingFieldSettings.speed = parseFloat(document.getElementById('fieldSpeed').value);
            this.gameManager.growingFieldSettings.delay = parseInt(document.getElementById('fieldDelay').value);
            this.closeModal('growingFieldModal');
        });
        document.getElementById('growingFieldDefaultBtn').addEventListener('click', () => {
            this.gameManager.growingFieldSettings = { direction: 'DOWN', speed: 4, delay: 0 };
            document.getElementById('fieldDirection').value = this.gameManager.growingFieldSettings.direction;
            document.getElementById('fieldSpeed').value = this.gameManager.growingFieldSettings.speed;
            document.getElementById('fieldDelay').value = this.gameManager.growingFieldSettings.delay;
        });

        document.getElementById('closeAutoFieldModal').addEventListener('click', () => {
            this.gameManager.autoMagneticField.isActive = document.getElementById('autoFieldActiveToggle').checked;
            this.gameManager.autoMagneticField.totalShrinkTime = parseFloat(document.getElementById('autoFieldShrinkTime').value) * 60;
            this.gameManager.autoMagneticField.safeZoneSize = parseInt(document.getElementById('autoFieldSafeZoneSize').value);
            this.gameManager.autoMagneticField.shrinkType = document.getElementById('autoFieldShrinkType').value;
            this.closeModal('autoFieldModal');
        });
        document.getElementById('autoFieldDefaultBtn').addEventListener('click', () => {
            this.gameManager.autoMagneticField = { isActive: false, totalShrinkTime: 60 * 60, safeZoneSize: 6, shrinkType: 'all', simulationTime: 0, currentBounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 } };
            document.getElementById('autoFieldActiveToggle').checked = this.gameManager.autoMagneticField.isActive;
            document.getElementById('autoFieldShrinkTime').value = this.gameManager.autoMagneticField.totalShrinkTime / 60;
            document.getElementById('autoFieldSafeZoneSize').value = this.gameManager.autoMagneticField.safeZoneSize;
            document.getElementById('autoFieldShrinkType').value = this.gameManager.autoMagneticField.shrinkType;
        });
        
        document.getElementById('closeHadokenModal').addEventListener('click', () => this.closeModal('hadokenModal'));
        document.getElementById('hadokenKnockback').addEventListener('input', (e) => {
            this.gameManager.hadokenKnockback = parseInt(e.target.value);
            document.getElementById('hadokenKnockbackValue').textContent = this.gameManager.hadokenKnockback;
        });
        document.getElementById('hadokenDefaultBtn').addEventListener('click', () => {
            this.gameManager.hadokenKnockback = 15;
            document.getElementById('hadokenKnockback').value = this.gameManager.hadokenKnockback;
            document.getElementById('hadokenKnockbackValue').textContent = this.gameManager.hadokenKnockback;
        });

        document.getElementById('toolbox').addEventListener('input', (e) => {
            if (e.target.id === 'replicationValue') this.gameManager.replicationValue = parseInt(e.target.value) || 1;
        });
        
        const floorColorPicker = document.getElementById('floorColorPicker');
        const wallColorPicker = document.getElementById('wallColorPicker');
        
        floorColorPicker.addEventListener('input', () => this.setCurrentColor(floorColorPicker.value, 'floor', false));
        floorColorPicker.addEventListener('change', () => this.addRecentColor(floorColorPicker.value, 'floor'));
        wallColorPicker.addEventListener('input', () => this.setCurrentColor(wallColorPicker.value, 'wall', false));
        wallColorPicker.addEventListener('change', () => this.addRecentColor(wallColorPicker.value, 'wall'));
    }

    setupHomeSettingsModal() {
        const homeSettingsBtn = document.getElementById('homeSettingsBtn');
        const homeSettingsModal = document.getElementById('homeSettingsModal');
        if (!homeSettingsBtn || !homeSettingsModal) return;

        homeSettingsBtn.addEventListener('click', () => {
            document.getElementById('homeLevelUpToggle').checked = !!this.gameManager.isLevelUpEnabled;
            document.getElementById('homeUnitOutlineToggle').checked = !!this.gameManager.isUnitOutlineEnabled;
            document.getElementById('homeUnitOutlineWidthControl').value = this.gameManager.unitOutlineWidth;
            document.getElementById('homeUnitOutlineWidthValue').textContent = this.gameManager.unitOutlineWidth.toFixed(1);
            document.getElementById('homeUnitEyeSizeControl').value = (this.gameManager.unitEyeScale ?? 1.0).toFixed(2);
            document.getElementById('homeUnitEyeSizeValue').textContent = (this.gameManager.unitEyeScale ?? 1.0).toFixed(2);
            document.getElementById('homeActionCamZoomMax').value = (this.gameManager.actionCam.maxZoom ?? 1.8);
            document.getElementById('homeActionCamZoomMaxValue').textContent = (this.gameManager.actionCam.maxZoom ?? 1.8).toFixed(2);
            this.openModal('homeSettingsModal');
        });

        document.getElementById('closeHomeSettingsModal').addEventListener('click', () => this.closeModal('homeSettingsModal'));

        document.getElementById('homeLevelUpToggle').addEventListener('change', (e) => this.gameManager.isLevelUpEnabled = e.target.checked);
        document.getElementById('homeUnitOutlineToggle').addEventListener('change', (e) => {
            this.gameManager.isUnitOutlineEnabled = e.target.checked;
            this.gameManager.draw();
        });
        document.getElementById('homeUnitOutlineWidthControl').addEventListener('input', (e) => {
            this.gameManager.unitOutlineWidth = parseFloat(e.target.value);
            document.getElementById('homeUnitOutlineWidthValue').textContent = this.gameManager.unitOutlineWidth.toFixed(1);
            if (this.gameManager.isUnitOutlineEnabled) this.gameManager.draw();
        });
        document.getElementById('homeUnitEyeSizeControl').addEventListener('input', (e) => {
            this.gameManager.unitEyeScale = parseFloat(e.target.value);
            document.getElementById('homeUnitEyeSizeValue').textContent = this.gameManager.unitEyeScale.toFixed(2);
            this.gameManager.draw();
        });
        document.getElementById('homeActionCamZoomMax').addEventListener('input', (e) => {
            this.gameManager.actionCam.maxZoom = parseFloat(e.target.value);
            document.getElementById('homeActionCamZoomMaxValue').textContent = this.gameManager.actionCam.maxZoom.toFixed(2);
        });

        document.getElementById('saveHomeSettingsBtn').addEventListener('click', () => {
            this.gameManager.isLevelUpEnabled = document.getElementById('homeLevelUpToggle').checked;
            this.gameManager.isUnitOutlineEnabled = document.getElementById('homeUnitOutlineToggle').checked;
            this.gameManager.unitOutlineWidth = parseFloat(document.getElementById('homeUnitOutlineWidthControl').value);
            this.gameManager.unitEyeScale = parseFloat(document.getElementById('homeUnitEyeSizeControl').value);
            this.gameManager.actionCam.maxZoom = parseFloat(document.getElementById('homeActionCamZoomMax').value);
            
            localStorage.setItem('actionCamMaxZoom', String(this.gameManager.actionCam.maxZoom));
            localStorage.setItem('levelUpEnabled', String(this.gameManager.isLevelUpEnabled));
            localStorage.setItem('unitOutlineEnabled', String(this.gameManager.isUnitOutlineEnabled));
            localStorage.setItem('unitOutlineWidth', String(this.gameManager.unitOutlineWidth));
            localStorage.setItem('unitEyeScale', String(this.gameManager.unitEyeScale));

            this.gameManager.draw();
            this.closeModal('homeSettingsModal');
        });
    }

    setupNametagSettingsModal() {
        document.getElementById('nametagSettingsBtn').addEventListener('click', () => this.openModal('nametagSettingsModal'));
        document.getElementById('closeNametagSettingsModal').addEventListener('click', () => this.closeModal('nametagSettingsModal'));
        document.getElementById('saveNametagSettingsBtn').addEventListener('click', () => {
            this.persistenceManager.saveNametagSettings();
            this.closeModal('nametagSettingsModal');
        });
        document.getElementById('nameFileUpload').addEventListener('change', (e) => this.handleNametagFileUpload(e));
        document.getElementById('addNameBtn').addEventListener('click', () => this.addNametagManually());
        document.getElementById('nametagListContainer').addEventListener('click', (e) => {
            if (e.target.classList.contains('nametag-delete-btn')) {
                this.deleteNametag(e.target.parentElement.textContent.slice(0, -1).trim());
            }
        });
        document.getElementById('nametagColorPicker').addEventListener('input', (e) => this.gameManager.nametagColor = e.target.value);
        document.getElementById('nametagColorBlack').addEventListener('click', () => {
            this.gameManager.nametagColor = '#000000';
            document.getElementById('nametagColorPicker').value = '#000000';
        });
        document.getElementById('nametagColorWhite').addEventListener('click', () => {
            this.gameManager.nametagColor = '#FFFFFF';
            document.getElementById('nametagColorPicker').value = '#FFFFFF';
        });
    }

    openModal(modalId) { document.getElementById(modalId).classList.add('show-modal'); }
    closeModal(modalId) { document.getElementById(modalId).classList.remove('show-modal'); }

    openRenameModal(id, currentName, type) {
        const input = document.getElementById('renameMapInput');
        input.value = currentName;
        this.openModal('renameMapModal');
        
        document.getElementById('confirmRenameBtn').onclick = async () => {
            const newName = input.value.trim();
            if (newName) {
                await this.persistenceManager.renameItem(id, newName, type);
                this.closeModal('renameMapModal');
            }
        };
    }

    openDeleteConfirmModal(id, name, type) {
        document.getElementById('deleteConfirmText').textContent = `'${name}' ${type === 'map' ? '맵' : '리플레이'}을(를) 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`;
        this.openModal('deleteConfirmModal');

        document.getElementById('confirmDeleteBtn').onclick = async () => {
            await this.persistenceManager.deleteItem(id, type);
            this.closeModal('deleteConfirmModal');
        };
    }

    openSaveReplayModal() {
        this.persistenceManager.prepareReplayName()
            .then(() => this.openModal('saveReplayModal'))
            .catch(err => alert(err.message));
    }

    selectTool(button) {
        const { tool, team, type } = button.dataset;
        document.querySelectorAll('#toolbox .tool-btn').forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');
        this.gameManager.currentTool = { tool, team, type };
    }

    addRecentColor(color, type) {
        const recentColors = type === 'floor' ? this.gameManager.recentFloorColors : this.gameManager.recentWallColors;
        const index = recentColors.indexOf(color);
        if (index > -1) recentColors.splice(index, 1);
        recentColors.unshift(color);
        if (recentColors.length > MAX_RECENT_COLORS) recentColors.pop();
        this.renderRecentColors(type);
    }

    renderRecentColors(type) {
        const containerId = type === 'floor' ? 'recentFloorColors' : 'recentWallColors';
        const container = document.getElementById(containerId);
        const recentColors = type === 'floor' ? this.gameManager.recentFloorColors : this.gameManager.recentWallColors;
        
        if (!container) return;
        container.innerHTML = '';
        recentColors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'recent-color-swatch w-full h-6 rounded cursor-pointer border-2 border-gray-700 hover:border-gray-400';
            swatch.style.backgroundColor = color;
            swatch.dataset.color = color;
            swatch.dataset.type = type;
            container.appendChild(swatch);
        });
    }

    setCurrentColor(color, type, addToRecent = false) {
        if (type === 'floor') {
            this.gameManager.currentFloorColor = color;
            document.getElementById('floorColorPicker').value = color;
        } else {
            this.gameManager.currentWallColor = color;
            document.getElementById('wallColorPicker').value = color;
        }
        if (addToRecent) this.addRecentColor(color, type);
        this.gameManager.draw();
    }

    renderNametagList() {
        const container = document.getElementById('nametagListContainer');
        const countSpan = document.getElementById('nameCount');
        container.innerHTML = '';
        this.gameManager.nametagList.forEach(name => {
            const item = document.createElement('div');
            item.className = 'nametag-item';
            item.innerHTML = `<span>${name}</span><button class="nametag-delete-btn">X</button>`;
            container.appendChild(item);
        });
        countSpan.textContent = this.gameManager.nametagList.length;
    }

    handleNametagFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const names = text.split(/[\r\n]+/).filter(name => name.trim() !== '');
            this.gameManager.nametagList.push(...names);
            this.gameManager.nametagList = [...new Set(this.gameManager.nametagList)];
            this.renderNametagList();
            event.target.value = '';
        };
        reader.readAsText(file);
    }
    
    addNametagManually() {
        const input = document.getElementById('addNameInput');
        const name = input.value.trim();
        if (name && !this.gameManager.nametagList.includes(name)) {
            this.gameManager.nametagList.push(name);
            this.renderNametagList();
            input.value = '';
        }
    }
    
    deleteNametag(nameToDelete) {
        this.gameManager.nametagList = this.gameManager.nametagList.filter(name => name !== nameToDelete);
        this.renderNametagList();
    }
}
