import { getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { Unit, Weapon, Nexus, Projectile, AreaEffect, Effect, GrowingMagneticField } from './gameEntities.js';
import { TILE, TEAM, COLORS, GRID_SIZE } from './constants.js';

let instance = null;

export class GameManager {
    constructor(db, audioManager) {
        if (instance) {
            return instance;
        }
        this.db = db;
        this.audioManager = audioManager;
        this.currentUser = null;

        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.COLS = 0;
        this.ROWS = 0;
        
        this.state = 'HOME';
        this.currentMapId = null;
        this.currentMapName = null;
        this.map = [];
        this.units = [];
        this.weapons = [];
        this.nexuses = [];
        this.effects = [];
        this.projectiles = [];
        this.areaEffects = [];
        this.growingFields = [];
        this.currentTool = { tool: 'tile', type: 'FLOOR' };
        this.isPainting = false;
        this.dragStartPos = null;
        this.initialUnitsState = [];
        this.initialWeaponsState = [];
        this.initialNexusesState = [];
        this.initialMapState = [];
        this.initialGrowingFieldsState = [];
        this.animationFrameId = null;
        this.animationFrameCounter = 0;
        this.gameSpeed = 1;
        this.currentWallColor = COLORS.WALL;
        this.currentFloorColor = COLORS.FLOOR;
        this.replicationValue = 2;
        this.isActionCam = false;
        this.actionCam = {
            current: { x: 0, y: 0, scale: 1 },
            target: { x: 0, y: 0, scale: 1 },
            isAnimating: false
        };
        this.growingFieldSettings = {
            direction: 'DOWN', speed: 4, delay: 0
        };
        this.autoMagneticField = {
            isActive: false,
            safeZoneSize: 6,
            simulationTime: 0,
            totalShrinkTime: 60 * 60,
            currentBounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 }
        };
        this.hadokenKnockback = 15;
        this.initialNexusCount = 0;
        this.winnerTeam = null;

        instance = this;
    }

    setCurrentUser(user) {
        this.currentUser = user;
    }

    init() {
        if (!this.currentUser) return;
        this.setupEventListeners();
        this.showHomeScreen();
    }
   
    showHomeScreen() {
        this.state = 'HOME';
        this.currentMapId = null;
        this.currentMapName = null;
        document.getElementById('homeScreen').style.display = 'flex';
        document.getElementById('editorScreen').style.display = 'none';
        this.renderMapCards();
    }

    async showEditorScreen(mapId) {
        this.state = 'EDIT';
        this.currentMapId = mapId;
        document.getElementById('homeScreen').style.display = 'none';
        document.getElementById('editorScreen').style.display = 'flex';
        await this.audioManager.init();

        const killSoundPref = localStorage.getItem('arenaKillSoundEnabled');
        if (killSoundPref !== null) {
            const isEnabled = killSoundPref === 'true';
            document.getElementById('killSoundToggle').checked = isEnabled;
            this.audioManager.toggleKillSound(isEnabled);
        }

        await this.loadMapForEditing(mapId);
    }

    async getAllMaps() {
        if (!this.currentUser) return [];
        const mapsColRef = collection(this.db, "maps", this.currentUser.uid, "userMaps");
        const mapSnapshot = await getDocs(mapsColRef);
        return mapSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async getMapById(mapId) {
        if (!this.currentUser) return null;
        const mapDocRef = doc(this.db, "maps", this.currentUser.uid, "userMaps", mapId);
        const mapSnap = await getDoc(mapDocRef);
        return mapSnap.exists() ? { id: mapSnap.id, ...mapSnap.data() } : null;
    }

    async saveCurrentMap() {
        if (!this.currentMapId || !this.currentUser || !this.currentMapName) return;

        const plainUnits = this.units.map(u => ({...u, weapon: u.weapon ? {type: u.weapon.type, ...u.weapon} : null}));
        const plainWeapons = this.weapons.map(w => ({...w}));
        const plainNexuses = this.nexuses.map(n => ({...n}));
        const plainGrowingFields = this.growingFields.map(f => ({...f}));

        const mapData = {
            name: this.currentMapName,
            width: this.canvas.width,
            height: this.canvas.height,
            map: JSON.stringify(this.map),
            units: plainUnits,
            weapons: plainWeapons,
            nexuses: plainNexuses,
            growingFields: plainGrowingFields,
            autoMagneticField: this.autoMagneticField,
            hadokenKnockback: this.hadokenKnockback,
        };

        const mapDocRef = doc(this.db, "maps", this.currentUser.uid, "userMaps", this.currentMapId);
        try {
            await setDoc(mapDocRef, mapData, { merge: true });
            alert('맵이 Firebase에 저장되었습니다!');
        } catch (error) {
            console.error("Error saving map to Firebase: ", error);
            alert('맵 저장에 실패했습니다.');
        }
    }

    async renderMapCards() {
        document.getElementById('loadingStatus').textContent = "맵 목록을 불러오는 중...";
        const maps = await this.getAllMaps();
        document.getElementById('loadingStatus').style.display = 'none';
        
        const mapGrid = document.getElementById('mapGrid');
        const addNewMapCard = document.getElementById('addNewMapCard');
        while (mapGrid.firstChild && mapGrid.firstChild !== addNewMapCard) {
            mapGrid.removeChild(mapGrid.firstChild);
        }

        maps.forEach(mapData => {
            const card = document.createElement('div');
            card.className = 'map-card rounded-lg overflow-hidden flex flex-col cursor-pointer';
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.map-menu-button')) {
                    this.showEditorScreen(mapData.id);
                }
            });

            const previewCanvas = document.createElement('canvas');
            previewCanvas.className = 'map-preview-canvas';
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'p-3 flex-grow';
            const nameP = document.createElement('p');
            nameP.className = 'font-bold text-white truncate';
            nameP.id = `map-name-${mapData.id}`;
            nameP.textContent = mapData.name;
            infoDiv.appendChild(nameP);

            const menuButton = document.createElement('button');
            menuButton.className = 'map-menu-button p-1 rounded-full hover:bg-gray-600';
            menuButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>`;
            
            const menu = document.createElement('div');
            menu.className = 'map-menu p-2 rounded-md shadow-lg';
            const renameBtn = document.createElement('button');
            renameBtn.className = 'w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-500';
            renameBtn.textContent = '이름 변경';
            renameBtn.onclick = () => {
                menu.style.display = 'none';
                this.openRenameModal(mapData.id, mapData.name);
            };
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'w-full text-left px-3 py-1.5 text-sm text-red-400 rounded hover:bg-gray-500';
            deleteBtn.textContent = '삭제';
            deleteBtn.onclick = () => {
                menu.style.display = 'none';
                this.openDeleteConfirmModal(mapData.id, mapData.name);
            };
            menu.append(renameBtn, deleteBtn);

            menuButton.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            });

            card.append(previewCanvas, infoDiv, menuButton, menu);
            mapGrid.insertBefore(card, addNewMapCard);

            this.drawMapPreview(previewCanvas, mapData);
        });

        document.addEventListener('click', (e) => {
            document.querySelectorAll('.map-menu').forEach(menu => {
                if (!menu.previousElementSibling.contains(e.target)) {
                    menu.style.display = 'none';
                }
            });
        });
    }

    drawMapPreview(previewCanvas, mapData) {
        const prevCtx = previewCanvas.getContext('2d');
        const mapWidth = mapData.width;
        const mapHeight = mapData.height;
        
        previewCanvas.width = mapWidth / 5;
        previewCanvas.height = mapHeight / 5;

        const pixelSizeX = previewCanvas.width / (mapWidth / GRID_SIZE);
        const pixelSizeY = previewCanvas.height / (mapHeight / GRID_SIZE);

        prevCtx.fillStyle = '#111827';
        prevCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
        
        const mapGridData = (typeof mapData.map === 'string') ? JSON.parse(mapData.map) : mapData.map;
        mapGridData.forEach((row, y) => {
            row.forEach((tile, x) => {
                switch(tile.type) {
                    case TILE.WALL: prevCtx.fillStyle = tile.color || COLORS.WALL; break;
                    case TILE.FLOOR: prevCtx.fillStyle = tile.color || COLORS.FLOOR; break;
                    case TILE.LAVA: prevCtx.fillStyle = COLORS.LAVA; break;
                    case TILE.CRACKED_WALL: prevCtx.fillStyle = COLORS.CRACKED_WALL; break;
                    case TILE.HEAL_PACK: prevCtx.fillStyle = COLORS.HEAL_PACK; break;
                    case TILE.REPLICATION_TILE: prevCtx.fillStyle = COLORS.REPLICATION_TILE; break;
                    case TILE.TELEPORTER: prevCtx.fillStyle = COLORS.TELEPORTER; break;
                    default: prevCtx.fillStyle = COLORS.FLOOR; break;
                }
                prevCtx.fillRect(x * pixelSizeX, y * pixelSizeY, pixelSizeX, pixelSizeY);
            });
        });
        
        const drawItem = (item, colorOverride = null) => {
            let color;
            if (colorOverride) {
                color = colorOverride;
            } else {
                switch(item.team) {
                    case TEAM.A: color = COLORS.TEAM_A; break;
                    case TEAM.B: color = COLORS.TEAM_B; break;
                    case TEAM.C: color = COLORS.TEAM_C; break;
                    case TEAM.D: color = COLORS.TEAM_D; break;
                    default: color = '#9ca3af'; break;
                }
            }
            prevCtx.fillStyle = color;
            prevCtx.fillRect(item.gridX * pixelSizeX, item.gridY * pixelSizeY, pixelSizeX, pixelSizeY);
        };

        (mapData.nexuses || []).forEach(item => drawItem(item));
        (mapData.units || []).forEach(item => drawItem(item));
        (mapData.weapons || []).forEach(item => drawItem(item, '#eab308'));
    }
    
    openRenameModal(mapId, currentName) {
        const input = document.getElementById('renameMapInput');
        const renameMapModal = document.getElementById('renameMapModal');
        input.value = currentName;
        renameMapModal.style.display = 'flex';
        
        document.getElementById('confirmRenameBtn').onclick = async () => {
            const newName = input.value.trim();
            if (newName && this.currentUser) {
                const mapDocRef = doc(this.db, "maps", this.currentUser.uid, "userMaps", mapId);
                try {
                    await setDoc(mapDocRef, { name: newName }, { merge: true });
                    this.currentMapName = newName; 
                    this.renderMapCards();
                } catch (error) {
                    console.error("Error renaming map: ", error);
                }
                renameMapModal.style.display = 'none';
            }
        };
    }

    openDeleteConfirmModal(mapId, mapName) {
        const deleteConfirmModal = document.getElementById('deleteConfirmModal');
        document.getElementById('deleteConfirmText').textContent = `'${mapName}' 맵을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`;
        deleteConfirmModal.style.display = 'flex';

        document.getElementById('confirmDeleteBtn').onclick = async () => {
            if (!this.currentUser) return;
            const mapDocRef = doc(this.db, "maps", this.currentUser.uid, "userMaps", mapId);
            try {
                await deleteDoc(mapDocRef);
                this.renderMapCards();
            } catch (error) {
                console.error("Error deleting map: ", error);
            }
            deleteConfirmModal.style.display = 'none';
        };
    }

    setupEventListeners() {
        // Modal buttons
        document.getElementById('cancelNewMapBtn').addEventListener('click', () => document.getElementById('newMapModal').style.display = 'none');
        document.getElementById('cancelRenameBtn').addEventListener('click', () => document.getElementById('renameMapModal').style.display = 'none');
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => document.getElementById('deleteConfirmModal').style.display = 'none');
        document.getElementById('closeMapSettingsModal').addEventListener('click', () => document.getElementById('mapSettingsModal').style.display = 'none');

        // Home screen
        document.getElementById('addNewMapCard').addEventListener('click', () => {
            document.getElementById('newMapName').value = '';
            document.getElementById('newMapWidth').value = '600';
            document.getElementById('newMapHeight').value = '900';
            document.getElementById('newMapModal').style.display = 'flex';
        });

        document.getElementById('confirmNewMapBtn').addEventListener('click', async () => {
            if (!this.currentUser) return;
            const name = document.getElementById('newMapName').value.trim() || '새로운 맵';
            const width = parseInt(document.getElementById('newMapWidth').value) || 600;
            const height = parseInt(document.getElementById('newMapHeight').value) || 900;
            
            const newMapId = `map_${Date.now()}`;
            const newMapData = {
                id: newMapId,
                name: name,
                width: width,
                height: height,
                map: JSON.stringify(Array(Math.floor(height / GRID_SIZE)).fill().map(() => Array(Math.floor(width / GRID_SIZE)).fill({ type: TILE.FLOOR, color: COLORS.FLOOR }))),
                units: [], weapons: [], nexuses: [], growingFields: []
            };
            
            const newMapDocRef = doc(this.db, "maps", this.currentUser.uid, "userMaps", newMapId);
            try {
                await setDoc(newMapDocRef, newMapData);
                document.getElementById('newMapModal').style.display = 'none';
                this.showEditorScreen(newMapId);
            } catch(error) {
                console.error("Error creating new map: ", error);
            }
        });

        // Editor screen
        document.getElementById('backToHomeBtn').addEventListener('click', () => this.showHomeScreen());
        document.getElementById('saveMapBtn').addEventListener('click', () => this.saveCurrentMap());
        document.getElementById('muteBtn').addEventListener('click', () => this.audioManager.toggleMute());
        document.getElementById('mapSettingsBtn').addEventListener('click', () => {
            document.getElementById('widthInput').value = this.canvas.width;
            document.getElementById('heightInput').value = this.canvas.height;
            document.getElementById('mapSettingsModal').style.display = 'flex';
        });
        document.getElementById('killSoundToggle').addEventListener('change', (e) => {
            this.audioManager.toggleKillSound(e.target.checked);
        });

        document.getElementById('toolbox').addEventListener('click', (e) => this.selectTool(e));
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.isActionCam) {
                if (this.actionCam.isAnimating) return;
                const pos = this.getMousePos(e);
                if (this.actionCam.target.scale === 1) {
                    this.actionCam.target.x = pos.pixelX;
                    this.actionCam.target.y = pos.pixelY;
                    this.actionCam.target.scale = 1.8;
                } else {
                    this.actionCam.target.x = this.canvas.width / 2;
                    this.actionCam.target.y = this.canvas.height / 2;
                    this.actionCam.target.scale = 1;
                }
                this.actionCam.isAnimating = true;
                if (this.state !== 'SIMULATE' && !this.animationFrameId) {
                    this.gameLoop();
                }
                return;
            }

            if (this.state === 'EDIT') {
                const pos = this.getMousePos(e);
                this.isPainting = true;
                if (this.currentTool.tool === 'growing_field') {
                    this.dragStartPos = pos;
                } else {
                    this.applyTool(pos);
                }
            }
        });
        this.canvas.addEventListener('mouseup', (e) => {
            if (this.state === 'EDIT' && this.currentTool.tool === 'growing_field' && this.dragStartPos) {
                const pos = this.getMousePos(e);
                this.applyTool(pos);
            }
            this.isPainting = false;
            this.dragStartPos = null;
        });
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isPainting && this.state === 'EDIT' && this.currentTool.tool !== 'growing_field') {
                const pos = this.getMousePos(e);
                this.applyTool(pos);
            }
            if (this.state === 'EDIT' && this.dragStartPos) {
                this.draw(e);
            }
        });
        this.canvas.addEventListener('mouseleave', () => {
            this.isPainting = false;
            this.dragStartPos = null;
            this.draw();
        });

        document.getElementById('simStartBtn').addEventListener('click', () => this.startSimulation());
        document.getElementById('simPauseBtn').addEventListener('click', () => this.pauseSimulation());
        document.getElementById('simPlayBtn').addEventListener('click', () => this.playSimulation());
        document.getElementById('simPlacementResetBtn').addEventListener('click', () => this.resetPlacement());
        document.getElementById('simResetBtn').addEventListener('click', () => this.resetMap());
        document.getElementById('resizeBtn').addEventListener('click', () => {
            this.resizeCanvas(parseInt(document.getElementById('widthInput').value), parseInt(document.getElementById('heightInput').value));
            document.getElementById('mapSettingsModal').style.display = 'none';
        });
        document.getElementById('actionCamToggle').addEventListener('change', (e) => {
            this.isActionCam = e.target.checked;
            if (!this.isActionCam) {
                this.resetActionCam(false);
            }
        });

        // Tool settings modals
        document.getElementById('growingFieldSettingsBtn').addEventListener('click', () => {
            document.getElementById('fieldDirection').value = this.growingFieldSettings.direction;
            document.getElementById('fieldSpeed').value = this.growingFieldSettings.speed;
            document.getElementById('fieldDelay').value = this.growingFieldSettings.delay;
            document.getElementById('growingFieldModal').style.display = 'flex';
        });
        document.getElementById('closeGrowingFieldModal').addEventListener('click', () => {
            this.growingFieldSettings.direction = document.getElementById('fieldDirection').value;
            this.growingFieldSettings.speed = parseFloat(document.getElementById('fieldSpeed').value);
            this.growingFieldSettings.delay = parseInt(document.getElementById('fieldDelay').value);
            document.getElementById('growingFieldModal').style.display = 'none';
        });
        document.getElementById('growingFieldDefaultBtn').addEventListener('click', () => {
            this.growingFieldSettings = { direction: 'DOWN', speed: 4, delay: 0 };
            document.getElementById('fieldDirection').value = this.growingFieldSettings.direction;
            document.getElementById('fieldSpeed').value = this.growingFieldSettings.speed;
            document.getElementById('fieldDelay').value = this.growingFieldSettings.delay;
        });

        document.getElementById('autoFieldSettingsBtn').addEventListener('click', () => {
            document.getElementById('autoFieldActiveToggle').checked = this.autoMagneticField.isActive;
            document.getElementById('autoFieldShrinkTime').value = this.autoMagneticField.totalShrinkTime / 60;
            document.getElementById('autoFieldSafeZoneSize').value = this.autoMagneticField.safeZoneSize;
            document.getElementById('autoFieldModal').style.display = 'flex';
        });
        document.getElementById('closeAutoFieldModal').addEventListener('click', () => {
            this.autoMagneticField.isActive = document.getElementById('autoFieldActiveToggle').checked;
            this.autoMagneticField.totalShrinkTime = parseFloat(document.getElementById('autoFieldShrinkTime').value) * 60;
            this.autoMagneticField.safeZoneSize = parseInt(document.getElementById('autoFieldSafeZoneSize').value);
            document.getElementById('autoFieldModal').style.display = 'none';
        });
        document.getElementById('autoFieldDefaultBtn').addEventListener('click', () => {
            this.autoMagneticField.isActive = false;
            this.autoMagneticField.totalShrinkTime = 60 * 60;
            this.autoMagneticField.safeZoneSize = 6;
            document.getElementById('autoFieldActiveToggle').checked = this.autoMagneticField.isActive;
            document.getElementById('autoFieldShrinkTime').value = this.autoMagneticField.totalShrinkTime / 60;
            document.getElementById('autoFieldSafeZoneSize').value = this.autoMagneticField.safeZoneSize;
        });
        
        document.getElementById('hadokenSettingsBtn').addEventListener('click', () => {
            document.getElementById('hadokenKnockback').value = this.hadokenKnockback;
            document.getElementById('hadokenKnockbackValue').textContent = this.hadokenKnockback;
            document.getElementById('hadokenModal').style.display = 'flex';
        });
        document.getElementById('closeHadokenModal').addEventListener('click', () => {
            document.getElementById('hadokenModal').style.display = 'none';
        });
        document.getElementById('hadokenKnockback').addEventListener('input', (e) => {
            this.hadokenKnockback = parseInt(e.target.value);
            document.getElementById('hadokenKnockbackValue').textContent = this.hadokenKnockback;
        });
        document.getElementById('hadokenDefaultBtn').addEventListener('click', () => {
            this.hadokenKnockback = 15;
            document.getElementById('hadokenKnockback').value = this.hadokenKnockback;
            document.getElementById('hadokenKnockbackValue').textContent = this.hadokenKnockback;
        });


        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', () => {
                const targetId = header.dataset.target;
                const content = document.getElementById(targetId);
                if (content.style.maxHeight) {
                    content.style.maxHeight = null;
                } else {
                    content.style.maxHeight = content.scrollHeight + "px";
                }
            });
        });
        document.getElementById('replicationValue').addEventListener('change', (e) => {
            this.replicationValue = parseInt(e.target.value) || 1;
        });
        document.getElementById('wallColorPicker').addEventListener('input', (e) => {
            this.currentWallColor = e.target.value;
            this.draw();
        });
        document.getElementById('floorColorPicker').addEventListener('input', (e) => {
            this.currentFloorColor = e.target.value;
            this.draw();
        });
    }

}
