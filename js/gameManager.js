import { Unit } from './unit.js';
import { Weapon, Projectile, AreaEffect, Effect, MagicDaggerDashEffect, createFireballHitEffect } from './weaponary.js';
import { Nexus, GrowingMagneticField, MagicCircle, PoisonCloud } from './entities.js';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { AudioManager } from './audioManager.js';
import { TILE, TEAM, COLORS, GRID_SIZE } from './constants.js';
import { localMaps } from './maps/index.js';

// Seed based random number generator: the same seed will always produce the same sequence of random numbers.
class SeededRandom {
    constructor(seed) {
        this.seed = seed % 2147483647;
        if (this.seed <= 0) this.seed += 2147483646;
    }

    next() {
        this.seed = (this.seed * 16807) % 2147483647;
        return (this.seed - 1) / 2147483646;
    }
}

let instance = null;

const MAX_RECENT_COLORS = 8;

export class GameManager {
    constructor(db) {
        if (instance) {
            return instance;
        }
        this.db = db;
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
        this.magicCircles = [];
        this.poisonClouds = [];
        this.particles = [];
        this.currentTool = { tool: 'tile', type: 'FLOOR' };
        this.isPainting = false;
        this.dragStartPos = null;
        this.initialUnitsState = [];
        this.initialWeaponsState = [];
        this.initialNexusesState = [];
        this.initialMapState = [];
        this.initialGrowingFieldsState = [];
        this.initialAutoFieldState = {};
        this.animationFrameId = null;
        this.animationFrameCounter = 0;
        this.gameSpeed = 1;
        this.currentWallColor = COLORS.WALL;
        this.currentFloorColor = COLORS.FLOOR;
        this.recentWallColors = [];
        this.recentFloorColors = [];
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
        this.dashTileSettings = {
            direction: 'RIGHT'
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

        this.audioManager = new AudioManager();
        
        this.isUnitOutlineEnabled = true;
        this.unitOutlineWidth = 1.5;

        this.isNametagEnabled = false;
        this.nametagList = [];
        this.usedNametagsInSim = new Set();
        this.editingUnit = null;
        
        this.prng = new SeededRandom(Date.now());
        this.simulationSeed = null;
        this.isReplayMode = false;
        this.lastSimulationResult = null;

        instance = this;
    }

    random() {
        return this.prng.next();
    }

    static getInstance() {
        return instance;
    }

    addParticle(options) {
        this.particles.push(new Particle(this, options));
    }

    setCurrentUser(user) {
        this.currentUser = user;
    }

    async init() {
        if (!this.currentUser) return;
        this.createToolboxUI();
        this.setupEventListeners();
        this.showHomeScreen();
        await this.loadNametagSettings();
    }
   
    showHomeScreen() {
        this.state = 'HOME';
        this.currentMapId = null;
        this.currentMapName = null;
        document.getElementById('homeScreen').style.display = 'block';
        document.getElementById('editorScreen').style.display = 'none';
        document.getElementById('defaultMapsScreen').style.display = 'none';
        document.getElementById('replayScreen').style.display = 'none';
        this.updateUIToEditorMode(); 
        this.resetActionCam(true);
        this.renderMapCards();
    }

    showDefaultMapsScreen() {
        document.getElementById('homeScreen').style.display = 'none';
        document.getElementById('editorScreen').style.display = 'none';
        document.getElementById('defaultMapsScreen').style.display = 'block';
        document.getElementById('replayScreen').style.display = 'none';
        this.renderDefaultMapCards();
    }

    showReplayScreen() {
        document.getElementById('homeScreen').style.display = 'none';
        document.getElementById('editorScreen').style.display = 'none';
        document.getElementById('defaultMapsScreen').style.display = 'none';
        document.getElementById('replayScreen').style.display = 'block';
        this.renderReplayCards();
    }

    async showEditorScreen(mapId) {
        this.state = 'EDIT';
        this.currentMapId = mapId;
        this.isReplayMode = false;
        document.getElementById('homeScreen').style.display = 'none';
        document.getElementById('defaultMapsScreen').style.display = 'none';
        document.getElementById('replayScreen').style.display = 'none';
        document.getElementById('editorScreen').style.display = 'flex';
        await this.audioManager.init();

        const killSoundPref = localStorage.getItem('arenaKillSoundEnabled');
        if (killSoundPref !== null) {
            const isEnabled = killSoundPref === 'true';
            document.getElementById('killSoundToggle').checked = isEnabled;
            this.audioManager.toggleKillSound(isEnabled);
        }
        
        const outlineEnabledPref = localStorage.getItem('unitOutlineEnabled');
        this.isUnitOutlineEnabled = outlineEnabledPref !== null ? (outlineEnabledPref === 'true') : true;
        document.getElementById('unitOutlineToggle').checked = this.isUnitOutlineEnabled;

        const outlineWidthPref = localStorage.getItem('unitOutlineWidth');
        this.unitOutlineWidth = outlineWidthPref !== null ? parseFloat(outlineWidthPref) : 1.5;
        document.getElementById('unitOutlineWidthControl').value = this.unitOutlineWidth;
        document.getElementById('unitOutlineWidthValue').textContent = this.unitOutlineWidth.toFixed(1);

        this.resetActionCam(true);

        if (mapId !== 'replay') {
             this.updateUIToEditorMode(); 
             await this.loadMapForEditing(mapId);
        }
    }
    
    createToolboxUI() {
        const toolbox = document.getElementById('toolbox');
        if (!toolbox) return;
        
        toolbox.innerHTML = `
            <div class="category-header collapsed" data-target="category-basic-tiles">기본 타일</div>
            <div id="category-basic-tiles" class="category-content collapsed">
                <button class="tool-btn selected" data-tool="tile" data-type="FLOOR">바닥</button>
                <div class="flex items-center gap-2 my-1">
                    <input type="color" id="floorColorPicker" value="${this.currentFloorColor}" class="w-full h-8 p-1 rounded">
                    <button id="defaultFloorColorBtn" class="p-2 rounded bg-gray-600 hover:bg-gray-500" title="기본값으로">🔄</button>
                </div>
                <div id="recentFloorColors" class="grid grid-cols-4 gap-1 mb-2"></div>
                
                <button class="tool-btn" data-tool="tile" data-type="WALL">벽</button>
                <div class="flex items-center gap-2 my-1">
                    <input type="color" id="wallColorPicker" value="${this.currentWallColor}" class="w-full h-8 p-1 rounded">
                    <button id="defaultWallColorBtn" class="p-2 rounded bg-gray-600 hover:bg-gray-500" title="기본값으로">🔄</button>
                </div>
                <div id="recentWallColors" class="grid grid-cols-4 gap-1 mb-2"></div>
            </div>

            <div class="category-header collapsed" data-target="category-special-tiles">특수 타일</div>
            <div id="category-special-tiles" class="category-content collapsed">
                <div class="overflow-y-auto max-h-60 pr-2">
                    <button class="tool-btn" data-tool="tile" data-type="LAVA">용암</button>
                    <button class="tool-btn" data-tool="tile" data-type="GLASS_WALL">유리벽</button>
                    <button class="tool-btn" data-tool="tile" data-type="CRACKED_WALL">부서지는 벽</button>
                    <button class="tool-btn" data-tool="tile" data-type="HEAL_PACK">회복 팩</button>
                    <button class="tool-btn" data-tool="tile" data-type="AWAKENING_POTION">각성 물약</button>
                    <button class="tool-btn" data-tool="tile" data-type="TELEPORTER">텔레포터</button>
                    <button class="tool-btn" data-tool="tile" data-type="QUESTION_MARK">물음표</button>
                    <div class="flex items-center gap-2 mt-1">
                        <button class="tool-btn flex-grow" data-tool="tile" data-type="REPLICATION_TILE">+N 복제</button>
                        <input type="number" id="replicationValue" value="${this.replicationValue}" min="1" class="modal-input w-16">
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
        if (!this.currentUser || !this.currentMapName) {
            alert('맵을 저장하려면 로그인이 필요하며, 맵 이름이 지정되어야 합니다.');
            return;
        }

        if (!this.currentMapId || this.currentMapId.startsWith('local_')) {
            this.currentMapId = `map_${Date.now()}`;
            const newName = prompt("새로운 맵의 이름을 입력하세요:", this.currentMapName);
            if (newName) {
                this.currentMapName = newName;
            } else {
                this.currentMapId = null; 
                return;
            }
        }

        const plainUnits = this.units.map(u => ({
            gridX: u.gridX,
            gridY: u.gridY,
            team: u.team,
            hp: u.hp,
            isKing: u.isKing,
            name: u.name,
            weapon: u.weapon ? { type: u.weapon.type } : null
        }));
        
        const plainWeapons = this.weapons.map(w => ({
            gridX: w.gridX,
            gridY: w.gridY,
            type: w.type
        }));
        
        const plainNexuses = this.nexuses.map(n => ({
            gridX: n.gridX,
            gridY: n.gridY,
            team: n.team,
            hp: n.hp
        }));
        
        const plainGrowingFields = this.growingFields.map(f => ({
            id: f.id,
            gridX: f.gridX,
            gridY: f.gridY,
            width: f.width,
            height: f.height,
            direction: f.direction,
            totalFrames: f.totalFrames,
            delay: f.delay
        }));

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
            floorColor: this.currentFloorColor,
            wallColor: this.currentWallColor,
            recentFloorColors: this.recentFloorColors,
            recentWallColors: this.recentWallColors,
        };

        const mapDocRef = doc(this.db, "maps", this.currentUser.uid, "userMaps", this.currentMapId);
        try {
            await setDoc(mapDocRef, mapData, { merge: true });
            alert(`'${this.currentMapName}' 맵이 Firebase에 성공적으로 저장되었습니다!`);
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
            const card = this.createMapCard(mapData, false);
            mapGrid.insertBefore(card, addNewMapCard);
        });

        document.addEventListener('click', (e) => {
             if (!e.target.closest('.map-menu-button')) {
                document.querySelectorAll('.map-menu').forEach(menu => {
                     menu.style.display = 'none';
                });
            }
        }, true);
    }

    renderDefaultMapCards() {
        const defaultMapGrid = document.getElementById('defaultMapGrid');
        while (defaultMapGrid.firstChild) {
            defaultMapGrid.removeChild(defaultMapGrid.firstChild);
        }

        localMaps.forEach(mapData => {
            const card = this.createMapCard(mapData, true);
            defaultMapGrid.appendChild(card);
        });
    }

    createMapCard(mapData, isLocal) {
        const card = document.createElement('div');
        card.className = 'relative group bg-gray-800 rounded-lg overflow-hidden flex flex-col cursor-pointer shadow-lg hover:shadow-indigo-500/30 transition-shadow duration-300';
        
        const mapId = isLocal ? mapData.name : mapData.id;

        card.addEventListener('click', (e) => {
            if (!e.target.closest('.map-menu-button')) {
                if (isLocal) {
                    this.loadLocalMapForEditing(mapData);
                } else {
                    this.showEditorScreen(mapId);
                }
            }
        });

        const previewCanvas = document.createElement('canvas');
        previewCanvas.className = 'w-full aspect-[3/4] object-cover';
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'p-3 flex-grow flex items-center justify-between';
        const nameP = document.createElement('p');
        nameP.className = 'font-bold text-white truncate';
        nameP.id = `map-name-${mapId}`;
        nameP.textContent = mapData.name;
        
        if (isLocal) {
            const localBadge = document.createElement('span');
            localBadge.className = 'ml-2 text-xs font-semibold bg-indigo-500 text-white px-2 py-0.5 rounded-full';
            localBadge.textContent = '기본';
            nameP.appendChild(localBadge);
        }

        infoDiv.appendChild(nameP);

        if (!isLocal) {
            const menuButton = document.createElement('button');
            menuButton.className = 'map-menu-button absolute top-2 right-2 p-1.5 rounded-full bg-gray-900/50 hover:bg-gray-700/70 opacity-0 group-hover:opacity-100 transition-opacity';
            menuButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>`;
            
            const menu = document.createElement('div');
            menu.className = 'map-menu hidden absolute top-10 right-2 z-10 bg-gray-700 p-2 rounded-md shadow-lg w-32';
            const renameBtn = document.createElement('button');
            renameBtn.className = 'w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-600';
            renameBtn.textContent = '이름 변경';
            renameBtn.onclick = () => {
                menu.style.display = 'none';
                this.openRenameModal(mapId, mapData.name, 'map');
            };
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'w-full text-left px-3 py-1.5 text-sm text-red-400 rounded hover:bg-gray-600';
            deleteBtn.textContent = '삭제';
            deleteBtn.onclick = () => {
                menu.style.display = 'none';
                this.openDeleteConfirmModal(mapId, mapData.name, 'map');
            };
            menu.append(renameBtn, deleteBtn);

            menuButton.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.map-menu').forEach(m => {
                    if (m !== menu) m.style.display = 'none';
                });
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            });
            card.append(menuButton, menu);
        }

        card.append(previewCanvas, infoDiv);
        this.drawMapPreview(previewCanvas, mapData);
        return card;
    }

    drawMapPreview(previewCanvas, mapData) {
        const prevCtx = previewCanvas.getContext('2d');
        const mapGridData = (typeof mapData.map === 'string') ? JSON.parse(mapData.map) : mapData.map;
        
        const mapHeight = mapGridData.length * GRID_SIZE;
        const mapWidth = mapGridData.length > 0 ? mapGridData[0].length * GRID_SIZE : 0;

        if(mapWidth === 0 || mapHeight === 0) return;
        
        const cardWidth = previewCanvas.parentElement.clientWidth || 200;
        previewCanvas.width = cardWidth;
        previewCanvas.height = cardWidth * (mapHeight / mapWidth);


        const pixelSizeX = previewCanvas.width / (mapWidth / GRID_SIZE);
        const pixelSizeY = previewCanvas.height / (mapHeight / GRID_SIZE);

        prevCtx.fillStyle = '#111827';
        prevCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
        
        if (mapGridData) {
            const floorColor = mapData.floorColor || COLORS.FLOOR;
            const wallColor = mapData.wallColor || COLORS.WALL;
            mapGridData.forEach((row, y) => {
                row.forEach((tile, x) => {
                    switch(tile.type) {
                        case TILE.WALL: prevCtx.fillStyle = tile.color || wallColor; break;
                        case TILE.FLOOR: prevCtx.fillStyle = tile.color || floorColor; break;
                        case TILE.LAVA: prevCtx.fillStyle = COLORS.LAVA; break;
                        case TILE.CRACKED_WALL: prevCtx.fillStyle = COLORS.CRACKED_WALL; break;
                        case TILE.HEAL_PACK: prevCtx.fillStyle = COLORS.HEAL_PACK; break;
                        case TILE.AWAKENING_POTION: prevCtx.fillStyle = COLORS.AWAKENING_POTION; break;
                        case TILE.REPLICATION_TILE: prevCtx.fillStyle = COLORS.REPLICATION_TILE; break;
                        case TILE.TELEPORTER: prevCtx.fillStyle = COLORS.TELEPORTER; break;
                        case TILE.QUESTION_MARK: prevCtx.fillStyle = COLORS.QUESTION_MARK; break;
                        case TILE.DASH_TILE: prevCtx.fillStyle = COLORS.DASH_TILE; break;
                        case TILE.GLASS_WALL: prevCtx.fillStyle = COLORS.GLASS_WALL; break;
                        default: prevCtx.fillStyle = floorColor; break;
                    }
                    prevCtx.fillRect(x * pixelSizeX, y * pixelSizeY, pixelSizeX + 0.5, pixelSizeY + 0.5);
                });
            });
        }
        
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
            prevCtx.beginPath();
            prevCtx.arc(
                item.gridX * pixelSizeX + pixelSizeX / 2, 
                item.gridY * pixelSizeY + pixelSizeY / 2, 
                Math.min(pixelSizeX, pixelSizeY) / 1.8, 
                0, 2 * Math.PI
            );
            prevCtx.fill();
        };

        (mapData.nexuses || []).forEach(item => drawItem(item));
        (mapData.units || []).forEach(item => drawItem(item));
        (mapData.weapons || []).forEach(item => drawItem(item, '#eab308'));
    }
    
    openRenameModal(id, currentName, type) {
        const input = document.getElementById('renameMapInput');
        const renameMapModal = document.getElementById('renameMapModal');
        input.value = currentName;
        renameMapModal.classList.add('show-modal');
        
        document.getElementById('confirmRenameBtn').onclick = async () => {
            const newName = input.value.trim();
            if (newName && this.currentUser) {
                const collectionPath = type === 'map' ? 'userMaps' : 'userReplays';
                const docRef = doc(this.db, type === 'map' ? "maps" : "replays", this.currentUser.uid, collectionPath, id);
                try {
                    await setDoc(docRef, { name: newName }, { merge: true });
                    if (type === 'map') this.renderMapCards();
                    else this.renderReplayCards();
                } catch (error) {
                    console.error(`Error renaming ${type}:`, error);
                }
                renameMapModal.classList.remove('show-modal');
            }
        };
    }

    openDeleteConfirmModal(id, name, type) {
        const deleteConfirmModal = document.getElementById('deleteConfirmModal');
        document.getElementById('deleteConfirmText').textContent = `'${name}' ${type === 'map' ? '맵' : '리플레이'}을(를) 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`;
        deleteConfirmModal.classList.add('show-modal');

        document.getElementById('confirmDeleteBtn').onclick = async () => {
            if (!this.currentUser) return;
            const collectionPath = type === 'map' ? 'userMaps' : 'userReplays';
            const docRef = doc(this.db, type === 'map' ? "maps" : "replays", this.currentUser.uid, collectionPath, id);
            try {
                await deleteDoc(docRef);
                if (type === 'map') this.renderMapCards();
                else this.renderReplayCards();
            } catch (error) {
                console.error(`Error deleting ${type}:`, error);
            }
            deleteConfirmModal.classList.remove('show-modal');
        };
    }
    
    setupEventListeners() {
        document.getElementById('cancelNewMapBtn').addEventListener('click', () => document.getElementById('newMapModal').classList.remove('show-modal'));
        document.getElementById('cancelRenameBtn').addEventListener('click', () => document.getElementById('renameMapModal').classList.remove('show-modal'));
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => document.getElementById('deleteConfirmModal').classList.remove('show-modal'));
        document.getElementById('closeMapSettingsModal').addEventListener('click', () => document.getElementById('mapSettingsModal').classList.remove('show-modal'));
        document.getElementById('closeDashTileModal').addEventListener('click', () => {
            this.dashTileSettings.direction = document.getElementById('dashTileDirection').value;
            document.getElementById('dashTileModal').classList.remove('show-modal');
        });
        document.getElementById('cancelSaveReplayBtn').addEventListener('click', () => document.getElementById('saveReplayModal').classList.remove('show-modal'));
        document.getElementById('confirmSaveReplayBtn').addEventListener('click', () => this.saveLastReplay());

        document.getElementById('addNewMapCard').addEventListener('click', () => {
            document.getElementById('newMapName').value = '';
            document.getElementById('newMapWidth').value = '460';
            document.getElementById('newMapHeight').value = '800';
            document.getElementById('newMapModal').classList.add('show-modal');
        });

        document.getElementById('defaultMapsBtn').addEventListener('click', () => this.showDefaultMapsScreen());
        document.getElementById('replaysBtn').addEventListener('click', () => this.showReplayScreen());
        document.getElementById('backToHomeFromDefaultBtn').addEventListener('click', () => this.showHomeScreen());
        document.getElementById('backToHomeFromReplayBtn').addEventListener('click', () => this.showHomeScreen());


        document.getElementById('confirmNewMapBtn').addEventListener('click', async () => {
            if (!this.currentUser) return;
            const name = document.getElementById('newMapName').value.trim() || '새로운 맵';
            const width = parseInt(document.getElementById('newMapWidth').value) || 460;
            const height = parseInt(document.getElementById('newMapHeight').value) || 800;
            
            const newMapId = `map_${Date.now()}`;
            const newMapData = {
                id: newMapId,
                name: name,
                width: width,
                height: height,
                map: JSON.stringify(Array(Math.floor(height / GRID_SIZE)).fill().map(() => Array(Math.floor(width / GRID_SIZE)).fill({ type: TILE.FLOOR, color: COLORS.FLOOR }))),
                units: [], weapons: [], nexuses: [], growingFields: [],
                floorColor: COLORS.FLOOR, wallColor: COLORS.WALL,
                recentFloorColors: [], recentWallColors: []
            };
            
            const newMapDocRef = doc(this.db, "maps", this.currentUser.uid, "userMaps", newMapId);
            try {
                await setDoc(newMapDocRef, newMapData);
                document.getElementById('newMapModal').classList.remove('show-modal');
                this.showEditorScreen(newMapId);
            } catch(error) {
                console.error("Error creating new map: ", error);
            }
        });

        document.getElementById('backToHomeBtn').addEventListener('click', () => this.showHomeScreen());
        document.getElementById('saveMapBtn').addEventListener('click', () => this.saveCurrentMap());
        document.getElementById('saveReplayBtn').addEventListener('click', () => this.openSaveReplayModal());
        document.getElementById('mapSettingsBtn').addEventListener('click', () => {
            document.getElementById('widthInput').value = this.canvas.width;
            document.getElementById('heightInput').value = this.canvas.height;
            document.getElementById('mapSettingsModal').classList.add('show-modal');
        });
        document.getElementById('killSoundToggle').addEventListener('change', (e) => {
            this.audioManager.toggleKillSound(e.target.checked);
        });
        document.getElementById('volumeControl').addEventListener('input', (e) => {
            this.audioManager.setVolume(parseFloat(e.target.value));
        });
        document.getElementById('unitOutlineToggle').addEventListener('change', (e) => {
            this.isUnitOutlineEnabled = e.target.checked;
            localStorage.setItem('unitOutlineEnabled', this.isUnitOutlineEnabled);
            this.draw();
        });
        document.getElementById('unitOutlineWidthControl').addEventListener('input', (e) => {
            this.unitOutlineWidth = parseFloat(e.target.value);
            document.getElementById('unitOutlineWidthValue').textContent = this.unitOutlineWidth.toFixed(1);
            localStorage.setItem('unitOutlineWidth', this.unitOutlineWidth);
            if (this.isUnitOutlineEnabled) {
                this.draw();
            }
        });
        document.getElementById('muteBtn').addEventListener('click', () => this.audioManager.toggleMute());

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
                if (this.state !== 'SIMULATE' && !this.animationFrameId) this.gameLoop();
                return;
            }
            if (this.state === 'EDIT') {
                const pos = this.getMousePos(e);
                
                if (this.currentTool.tool === 'nametag') {
                    const clickedUnit = this.units.find(u => Math.hypot(u.pixelX - pos.pixelX, u.pixelY - pos.pixelY) < GRID_SIZE / 2);
                    if (clickedUnit) {
                        this.editingUnit = clickedUnit;
                        document.getElementById('unitNameInput').value = clickedUnit.name || '';
                        document.getElementById('unitNameModal').classList.add('show-modal');
                        return;
                    }
                }

                this.isPainting = true;
                if (this.currentTool.tool === 'growing_field') this.dragStartPos = pos;
                else this.applyTool(pos);
            }
        });
        this.canvas.addEventListener('mouseup', (e) => {
            if (this.state === 'EDIT' && this.currentTool.tool === 'growing_field' && this.dragStartPos) {
                this.applyTool(this.getMousePos(e));
            }
            this.isPainting = false;
            this.dragStartPos = null;
        });
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isPainting && this.state === 'EDIT' && this.currentTool.tool !== 'growing_field') {
                this.applyTool(this.getMousePos(e));
            }
            if (this.state === 'EDIT' && this.dragStartPos) this.draw(e);
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
            document.getElementById('mapSettingsModal').classList.remove('show-modal');
        });
        document.getElementById('actionCamToggle').addEventListener('change', (e) => {
            this.isActionCam = e.target.checked;
            if (!this.isActionCam) this.resetActionCam(false);
        });
        
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
                document.getElementById('fieldDirection').value = this.growingFieldSettings.direction;
                document.getElementById('fieldSpeed').value = this.growingFieldSettings.speed;
                document.getElementById('fieldDelay').value = this.growingFieldSettings.delay;
                document.getElementById('growingFieldModal').classList.add('show-modal');
            } else if (target.id === 'dashTileSettingsBtn' || target.parentElement.id === 'dashTileSettingsBtn') {
                document.getElementById('dashTileDirection').value = this.dashTileSettings.direction;
                document.getElementById('dashTileModal').classList.add('show-modal');
            } else if (target.id === 'autoFieldSettingsBtn' || target.parentElement.id === 'autoFieldSettingsBtn') {
                 document.getElementById('autoFieldActiveToggle').checked = this.autoMagneticField.isActive;
                document.getElementById('autoFieldShrinkTime').value = this.autoMagneticField.totalShrinkTime / 60;
                document.getElementById('autoFieldSafeZoneSize').value = this.autoMagneticField.safeZoneSize;
                document.getElementById('autoFieldModal').classList.add('show-modal');
            } else if (target.id === 'hadokenSettingsBtn' || target.parentElement.id === 'hadokenSettingsBtn') {
                document.getElementById('hadokenKnockback').value = this.hadokenKnockback;
                document.getElementById('hadokenKnockbackValue').textContent = this.hadokenKnockback;
                document.getElementById('hadokenModal').classList.add('show-modal');
            } else if (categoryHeader) {
                const content = categoryHeader.nextElementSibling;
                categoryHeader.classList.toggle('collapsed');
                content.classList.toggle('collapsed');
            }
        });
        
        document.getElementById('closeGrowingFieldModal').addEventListener('click', () => {
            this.growingFieldSettings.direction = document.getElementById('fieldDirection').value;
            this.growingFieldSettings.speed = parseFloat(document.getElementById('fieldSpeed').value);
            this.growingFieldSettings.delay = parseInt(document.getElementById('fieldDelay').value);
            document.getElementById('growingFieldModal').classList.remove('show-modal');
        });
        document.getElementById('growingFieldDefaultBtn').addEventListener('click', () => {
            this.growingFieldSettings = { direction: 'DOWN', speed: 4, delay: 0 };
            document.getElementById('fieldDirection').value = this.growingFieldSettings.direction;
            document.getElementById('fieldSpeed').value = this.growingFieldSettings.speed;
            document.getElementById('fieldDelay').value = this.growingFieldSettings.delay;
        });

        document.getElementById('closeAutoFieldModal').addEventListener('click', () => {
            this.autoMagneticField.isActive = document.getElementById('autoFieldActiveToggle').checked;
            this.autoMagneticField.totalShrinkTime = parseFloat(document.getElementById('autoFieldShrinkTime').value) * 60;
            this.autoMagneticField.safeZoneSize = parseInt(document.getElementById('autoFieldSafeZoneSize').value);
            document.getElementById('autoFieldModal').classList.remove('show-modal');
        });
        document.getElementById('autoFieldDefaultBtn').addEventListener('click', () => {
            this.autoMagneticField = { isActive: false, totalShrinkTime: 60 * 60, safeZoneSize: 6, simulationTime: 0, currentBounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 } };
            document.getElementById('autoFieldActiveToggle').checked = this.autoMagneticField.isActive;
            document.getElementById('autoFieldShrinkTime').value = this.autoMagneticField.totalShrinkTime / 60;
            document.getElementById('autoFieldSafeZoneSize').value = this.autoMagneticField.safeZoneSize;
        });
        
        document.getElementById('closeHadokenModal').addEventListener('click', () => document.getElementById('hadokenModal').classList.remove('show-modal'));
        document.getElementById('hadokenKnockback').addEventListener('input', (e) => {
            this.hadokenKnockback = parseInt(e.target.value);
            document.getElementById('hadokenKnockbackValue').textContent = this.hadokenKnockback;
        });
        document.getElementById('hadokenDefaultBtn').addEventListener('click', () => {
            this.hadokenKnockback = 15;
            document.getElementById('hadokenKnockback').value = this.hadokenKnockback;
            document.getElementById('hadokenKnockbackValue').textContent = this.hadokenKnockback;
        });

        document.getElementById('toolbox').addEventListener('input', (e) => {
            if (e.target.id === 'replicationValue') this.replicationValue = parseInt(e.target.value) || 1;
        });
        
        const floorColorPicker = document.getElementById('floorColorPicker');
        const wallColorPicker = document.getElementById('wallColorPicker');
        
        floorColorPicker.addEventListener('input', () => this.setCurrentColor(floorColorPicker.value, 'floor', false));
        floorColorPicker.addEventListener('change', () => this.addRecentColor(floorColorPicker.value, 'floor'));
        wallColorPicker.addEventListener('input', () => this.setCurrentColor(wallColorPicker.value, 'wall', false));
        wallColorPicker.addEventListener('change', () => this.addRecentColor(wallColorPicker.value, 'wall'));

        document.getElementById('nametagSettingsBtn').addEventListener('click', () => {
            document.getElementById('nametagSettingsModal').classList.add('show-modal');
        });
        document.getElementById('closeNametagSettingsModal').addEventListener('click', () => {
            document.getElementById('nametagSettingsModal').classList.remove('show-modal');
        });
        document.getElementById('saveNametagSettingsBtn').addEventListener('click', () => {
            this.saveNametagSettings();
            document.getElementById('nametagSettingsModal').classList.remove('show-modal');
        });
        document.getElementById('nameFileUpload').addEventListener('change', (e) => this.handleNametagFileUpload(e));
        document.getElementById('addNameBtn').addEventListener('click', () => this.addNametagManually());
        document.getElementById('nametagListContainer').addEventListener('click', (e) => {
            if (e.target.classList.contains('nametag-delete-btn')) {
                this.deleteNametag(e.target.parentElement.textContent.slice(0, -1).trim());
            }
        });

        document.getElementById('cancelUnitNameBtn').addEventListener('click', () => {
             document.getElementById('unitNameModal').classList.remove('show-modal');
        });
        document.getElementById('confirmUnitNameBtn').addEventListener('click', () => {
            if (this.editingUnit) {
                this.editingUnit.name = document.getElementById('unitNameInput').value;
                this.editingUnit = null;
                this.draw();
            }
            document.getElementById('unitNameModal').classList.remove('show-modal');
        });
    }

    resetActionCam(isInstant = true) {
        const targetX = this.canvas.width / 2;
        const targetY = this.canvas.height / 2;
        const targetScale = 1;

        if (isInstant) {
            this.actionCam.current = { x: targetX, y: targetY, scale: targetScale };
            this.actionCam.target = { x: targetX, y: targetY, scale: targetScale };
            this.actionCam.isAnimating = false;
        } else {
            this.actionCam.target = { x: targetX, y: targetY, scale: targetScale };
            this.actionCam.isAnimating = true;
            if (this.state !== 'SIMULATE' && !this.animationFrameId) {
                this.gameLoop();
            }
        }
        
        if (isInstant && !this.animationFrameId) {
            this.draw();
        }
    }

    resizeCanvas(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        document.getElementById('widthInput').value = width;
        document.getElementById('heightInput').value = height;
        this.COLS = Math.floor(this.canvas.width / GRID_SIZE);
        this.ROWS = Math.floor(this.canvas.height / GRID_SIZE);
        
        this.resetMap();
    }

    resetMap() {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
        this.state = 'EDIT';
        this.map = Array(this.ROWS).fill().map(() => Array(this.COLS).fill().map(() => ({ type: TILE.FLOOR, color: this.currentFloorColor })));
        this.units = []; this.weapons = []; this.nexuses = []; this.growingFields = [];
        this.effects = []; this.projectiles = []; this.areaEffects = []; this.magicCircles = []; this.poisonClouds = []; this.particles = [];
        this.initialUnitsState = []; this.initialWeaponsState = [];
        this.initialNexusesState = [];
        this.initialMapState = [];
        this.initialGrowingFieldsState = [];
        this.initialAutoFieldState = {};
        this.usedNametagsInSim.clear();
        document.getElementById('statusText').textContent = "에디터 모드";
        document.getElementById('simStartBtn').classList.remove('hidden');
        document.getElementById('simPauseBtn').classList.add('hidden');
        document.getElementById('simPlayBtn').classList.add('hidden');
        document.getElementById('saveReplayBtn').classList.add('hidden');
        document.getElementById('simStartBtn').disabled = false;
        document.getElementById('toolbox').style.pointerEvents = 'auto';
        this.resetActionCam(true);
        this.prng = new SeededRandom(Date.now());
        this.isReplayMode = false;
        this.draw();
    }
    
    startSimulation() {
        if (this.state !== 'EDIT') return;

        if (!this.isReplayMode) {
            this.simulationSeed = Date.now();
        }
        this.prng = new SeededRandom(this.simulationSeed);
        
        this.usedNametagsInSim.clear();

        if (this.isNametagEnabled && this.nametagList.length > 0) {
            this.units.forEach(unit => unit.name = '');

            const shuffledNames = [...this.nametagList].sort(() => 0.5 - this.random());
            
            const assignmentCount = Math.min(this.units.length, shuffledNames.length);

            for (let i = 0; i < assignmentCount; i++) {
                this.units[i].name = shuffledNames[i];
                this.usedNametagsInSim.add(shuffledNames[i]);
            }
        } else {
            this.units.forEach(unit => unit.name = '');
        }

        const cleanDataForJSON = (obj) => {
            const data = { ...obj };
            delete data.gameManager;
            return data;
        };
        
        const cleanUnits = this.units.map(u => {
            const unitData = cleanDataForJSON(u);
            unitData.weapon = u.weapon ? { type: u.weapon.type } : null;
            return unitData;
        });
        const cleanWeapons = this.weapons.map(cleanDataForJSON);
        const cleanNexuses = this.nexuses.map(cleanDataForJSON);
        const cleanGrowingFields = this.growingFields.map(cleanDataForJSON);

        this.initialUnitsState = JSON.stringify(cleanUnits);
        this.initialWeaponsState = JSON.stringify(cleanWeapons);
        this.initialNexusesState = JSON.stringify(cleanNexuses);
        this.initialMapState = JSON.stringify(this.map);
        this.initialGrowingFieldsState = JSON.stringify(cleanGrowingFields);
        this.initialAutoFieldState = JSON.stringify(this.autoMagneticField);
        
        this.initialNexusCount = this.nexuses.length;
        this.winnerTeam = null;
        this.magicCircles = [];
        this.poisonClouds = [];
        this.particles = [];

        this.state = 'SIMULATE';
        document.getElementById('statusText').textContent = "시뮬레이션 진행 중...";
        document.getElementById('simStartBtn').classList.add('hidden');
        document.getElementById('saveReplayBtn').classList.add('hidden');
        document.getElementById('simPauseBtn').classList.remove('hidden');
        document.getElementById('simPlayBtn').classList.add('hidden');
        
        if (!this.isReplayMode) {
            document.getElementById('toolbox').style.pointerEvents = 'none';
        }
        this.gameLoop();
    }

    resetPlacement() {
        if (this.initialUnitsState.length === 0) {
            if (this.isReplayMode) {
                 this.loadReplay(this.currentMapId);
                 return;
            }
            console.warn("배치 초기화를 하려면 먼저 시뮬레이션을 한 번 시작해야 합니다.");
            return;
        }

        if (this.simulationSeed) {
            this.prng = new SeededRandom(this.simulationSeed);
        } else {
            this.prng = new SeededRandom(Date.now());
        }

        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
        this.state = 'EDIT';

        this.units = JSON.parse(this.initialUnitsState).map(uData => {
            const unit = Object.assign(new Unit(this, uData.gridX, uData.gridY, uData.team), uData);
            if (uData.weapon && uData.weapon.type) {
                unit.equipWeapon(uData.weapon.type, unit.isKing);
            }
            return unit;
        });
        this.weapons = JSON.parse(this.initialWeaponsState).map(wData => Object.assign(new Weapon(this, wData.gridX, wData.gridY, wData.type), wData));
        this.nexuses = JSON.parse(this.initialNexusesState).map(nData => Object.assign(new Nexus(this, nData.gridX, nData.gridY, nData.team), nData));
        
        this.map = JSON.parse(this.initialMapState);
        this.growingFields = JSON.parse(this.initialGrowingFieldsState).map(fieldData => {
             const settings = {
                 direction: fieldData.direction,
                 speed: fieldData.totalFrames / 60,
                 delay: fieldData.delay / 60,
             };
            return new GrowingMagneticField(this, fieldData.id, fieldData.gridX, fieldData.gridY, fieldData.width, fieldData.height, settings);
        });
        this.autoMagneticField = JSON.parse(this.initialAutoFieldState);
        this.effects = []; this.projectiles = []; this.areaEffects = []; this.magicCircles = []; this.poisonClouds = []; this.particles = [];
        this.usedNametagsInSim.clear();
        document.getElementById('statusText').textContent = "에디터 모드";
        document.getElementById('simStartBtn').classList.remove('hidden');
        document.getElementById('saveReplayBtn').classList.add('hidden');
        document.getElementById('simPauseBtn').classList.add('hidden');
        document.getElementById('simPlayBtn').classList.add('hidden');
        document.getElementById('simStartBtn').disabled = false;
        
        if (!this.isReplayMode) {
            document.getElementById('toolbox').style.pointerEvents = 'auto';
            this.updateUIToEditorMode();
        } else {
            this.updateUIToReplayMode();
        }

        this.resetActionCam(true);
        this.draw();
    }
    
    selectTool(button) {
        const { tool, team, type } = button.dataset;

        document.querySelectorAll('#toolbox .tool-btn').forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');

        this.currentTool = { tool, team, type };
    }

    getMousePos(e) {
         const rect = this.canvas.getBoundingClientRect();
         const transform = this.ctx.getTransform();
         const invTransform = transform.inverse();

         const canvasX = e.clientX - rect.left;
         const canvasY = e.clientY - rect.top;

         const worldX = canvasX * invTransform.a + canvasY * invTransform.c + invTransform.e;
         const worldY = canvasX * invTransform.b + canvasY * invTransform.d + invTransform.f;
        
         return {
             pixelX: worldX,
             pixelY: worldY,
             gridX: Math.floor(worldX / GRID_SIZE),
             gridY: Math.floor(worldY / GRID_SIZE)
         };
    }

    applyTool(pos) {
        const {gridX: x, gridY: y} = pos;
        if (x < 0 || x >= this.COLS || y < 0 || y >= this.ROWS) return;

        if (this.currentTool.tool === 'erase') {
            this.map[y][x] = { type: TILE.FLOOR, color: this.currentFloorColor };
            this.units = this.units.filter(u => u.gridX !== x || u.gridY !== y);
            this.weapons = this.weapons.filter(w => w.gridX !== x || w.gridY !== y);
            this.nexuses = this.nexuses.filter(n => n.gridX !== x || n.gridY !== y);
            this.growingFields = this.growingFields.filter(zone => !(x >= zone.gridX && x < zone.gridX + zone.width && y >= zone.gridY && y < zone.gridY + zone.height));
            this.draw();
            return;
        }

        const isWallTypeTool = this.currentTool.tool === 'tile' && (this.currentTool.type === 'WALL' || this.currentTool.type === 'GLASS_WALL');

        if (!isWallTypeTool && (this.map[y][x].type === TILE.WALL || this.map[y][x].type === TILE.GLASS_WALL)) {
            return; 
        }
        
        if (isWallTypeTool) {
            this.units = this.units.filter(u => u.gridX !== x || u.gridY !== y);
            this.weapons = this.weapons.filter(w => w.gridX !== x || w.gridY !== y);
            this.nexuses = this.nexuses.filter(n => n.gridX !== x || n.gridY !== y);
        }

        const itemExists = this.units.some(u => u.gridX === x && u.gridY === y) || 
                         this.weapons.some(w => w.gridX === x && w.gridY === y) || 
                         this.nexuses.some(n => n.gridX === x && n.gridY === y);

        if (this.currentTool.tool === 'growing_field' && this.dragStartPos) {
             const startX = Math.min(this.dragStartPos.gridX, x);
             const startY = Math.min(this.dragStartPos.gridY, y);
             const endX = Math.max(this.dragStartPos.gridX, x);
             const endY = Math.max(this.dragStartPos.gridY, y);
             const width = endX - startX + 1;
             const height = endY - startY + 1;
             
             const newZone = new GrowingMagneticField(this, Date.now(), startX, startY, width, height, {...this.growingFieldSettings});
             this.growingFields.push(newZone);
             this.dragStartPos = null;
        } else if (this.currentTool.tool === 'tile') {
            if (itemExists) return;
            
            const tileType = TILE[this.currentTool.type];
            if (tileType === TILE.TELEPORTER && this.getTilesOfType(TILE.TELEPORTER).length >= 2) { return; }
            this.map[y][x] = {
                type: tileType,
                hp: tileType === TILE.CRACKED_WALL ? 50 : undefined,
                color: tileType === TILE.WALL ? this.currentWallColor : (tileType === TILE.FLOOR ? this.currentFloorColor : undefined),
                replicationValue: tileType === TILE.REPLICATION_TILE ? this.replicationValue : undefined,
                direction: tileType === TILE.DASH_TILE ? this.dashTileSettings.direction : undefined
            };
        } else if (this.currentTool.tool === 'unit' && !itemExists) {
            this.units.push(new Unit(this, x, y, this.currentTool.team));
        } else if (this.currentTool.tool === 'weapon' && !itemExists) {
            const weapon = this.createWeapon(x, y, this.currentTool.type);
            this.weapons.push(weapon);
        } else if (this.currentTool.tool === 'nexus' && !itemExists) {
            if (this.nexuses.some(n => n.team === this.currentTool.team)) { return; }
            this.nexuses.push(new Nexus(this, x, y, this.currentTool.team));
        }
        this.draw();
    }

    pauseSimulation() {
        if (this.state !== 'SIMULATE') return;
        this.state = 'PAUSED';
        document.getElementById('statusText').textContent = "일시정지됨";
        document.getElementById('simPauseBtn').classList.add('hidden');
        document.getElementById('simPlayBtn').classList.remove('hidden');
    }

    playSimulation() {
        if (this.state !== 'PAUSED') return;
        this.state = 'SIMULATE';
        document.getElementById('statusText').textContent = "시뮬레이션 진행 중...";
        document.getElementById('simPauseBtn').classList.remove('hidden');
        document.getElementById('simPlayBtn').classList.add('hidden');
        this.gameLoop();
    }

    gameLoop() {
        this.animationFrameCounter++;
        
        if (this.actionCam.isAnimating) {
            const cam = this.actionCam;
            const ease = 0.15; 
            cam.current.x += (cam.target.x - cam.current.x) * ease;
            cam.current.y += (cam.target.y - cam.current.y) * ease;
            cam.current.scale += (cam.target.scale - cam.current.scale) * ease;

            if (Math.abs(cam.current.scale - cam.target.scale) < 0.001 && Math.abs(cam.current.x - cam.target.x) < 0.1) {
                cam.current = { ...cam.target };
                cam.isAnimating = false;
            }
        }

        if (this.state === 'SIMULATE' || this.state === 'ENDING') {
            this.update();
        }
        
        this.draw();
        
        if (this.state === 'SIMULATE') {
            const activeNexuses = this.nexuses.filter(n => !n.isDestroying);
            const activeNexusTeams = new Set(activeNexuses.map(n => n.team));
            const activeUnitTeams = new Set(this.units.map(u => u.team));
            
            let gameOver = false;
            let winner = null;

            if (this.initialNexusCount >= 2) {
                if (activeNexusTeams.size < 2 || activeUnitTeams.size <= 1) {
                    gameOver = true;
                    if (activeNexusTeams.size < 2) {
                        winner = activeNexusTeams.values().next().value || null;
                    }
                    else {
                        winner = activeUnitTeams.values().next().value || null;
                    }
                }
            } else {
                const allRemainingTeams = new Set([...activeNexusTeams, ...activeUnitTeams]);
                if (allRemainingTeams.size <= 1) {
                    const initialTeams = new Set(JSON.parse(this.initialNexusesState).map(n => n.team).concat(JSON.parse(this.initialUnitsState).map(u => u.team)));
                    if (initialTeams.size > 1) {
                        gameOver = true;
                        winner = allRemainingTeams.size === 1 ? allRemainingTeams.values().next().value : null;
                    }
                }
            }

            if (gameOver) {
                this.state = 'ENDING';
                this.winnerTeam = winner;
            }
        } else if (this.state === 'ENDING') {
            const explosionsFinished = this.nexuses.every(n => !n.isDestroying || n.explosionParticles.length === 0);
            if (explosionsFinished) {
                this.state = 'DONE';
                this.lastSimulationResult = {
                    initialMapState: this.initialMapState,
                    initialUnitsState: this.initialUnitsState,
                    initialWeaponsState: this.initialWeaponsState,
                    initialNexusesState: this.initialNexusesState,
                    initialGrowingFieldsState: this.initialGrowingFieldsState,
                    initialAutoFieldState: this.initialAutoFieldState,
                    simulationSeed: this.simulationSeed,
                    mapName: this.currentMapName || '기본 맵',
                    mapWidth: this.canvas.width,
                    mapHeight: this.canvas.height
                };

                if (!this.isReplayMode) {
                    document.getElementById('saveReplayBtn').classList.remove('hidden');
                }

                let winnerName = "무승부";
                if(this.winnerTeam) {
                    switch(this.winnerTeam) {
                        case TEAM.A: winnerName = "빨강 팀"; break;
                        case TEAM.B: winnerName = "파랑 팀"; break;
                        case TEAM.C: winnerName = "초록 팀"; break;
                        case TEAM.D: winnerName = "노랑 팀"; break;
                    }
                    document.getElementById('statusText').textContent = `${winnerName} 승리!`;
                } else {
                    document.getElementById('statusText').textContent = "무승부!";
                }
                document.getElementById('simPauseBtn').classList.add('hidden');
                document.getElementById('simPlayBtn').classList.add('hidden');
                this.resetActionCam(false);
            }
        }

        if ((this.state === 'DONE' || this.state === 'PAUSED') && !this.actionCam.isAnimating) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        } else {
            this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
        }
    }

    update() {
        if (this.state === 'PAUSED' || this.state === 'DONE') return;

        if (this.state === 'ENDING') {
            this.nexuses.forEach(n => n.update());
            this.projectiles.forEach(p => p.update());
            this.projectiles = this.projectiles.filter(p => !p.destroyed);
            return;
        }

        this.gameSpeed = 1;

        if (this.autoMagneticField.isActive) {
            this.autoMagneticField.simulationTime++;
            const progress = Math.min(1, this.autoMagneticField.simulationTime / this.autoMagneticField.totalShrinkTime);
            
            const finalWidth = this.autoMagneticField.safeZoneSize;
            const finalHeight = this.autoMagneticField.safeZoneSize;
            
            const finalMinX = (this.COLS - finalWidth) / 2;
            const finalMaxX = (this.COLS + finalWidth) / 2;
            const finalMinY = (this.ROWS - finalHeight) / 2;
            const finalMaxY = (this.ROWS + finalHeight) / 2;

            this.autoMagneticField.currentBounds.minX = 0 + (finalMinX - 0) * progress;
            this.autoMagneticField.currentBounds.maxX = this.COLS - (this.COLS - finalMaxX) * progress;
            this.autoMagneticField.currentBounds.minY = 0 + (finalMinY - 0) * progress;
            this.autoMagneticField.currentBounds.maxY = this.ROWS - (this.ROWS - finalMaxY) * progress;
        }
        
        this.growingFields.forEach(field => field.update());
        
        const unitsBeforeUpdate = this.units.length;

        const unitsByTeam = {};
        for (const unit of this.units) {
            if (!unitsByTeam[unit.team]) {
                unitsByTeam[unit.team] = [];
            }
            unitsByTeam[unit.team].push(unit);
        }
        const allTeamKeys = Object.keys(unitsByTeam);
        
        this.units.forEach(unit => {
            const enemyTeams = allTeamKeys.filter(key => key !== unit.team);
            const enemies = enemyTeams.flatMap(key => unitsByTeam[key]);
            unit.update(enemies, this.weapons, this.projectiles);
        });
        
        const deadUnits = this.units.filter(u => u.hp <= 0);
        deadUnits.forEach(u => u.handleDeath());
        
        this.units = this.units.filter(u => u.hp > 0);
        if (this.units.length < unitsBeforeUpdate) {
            this.audioManager.play('unitDeath');
        }
        
        this.nexuses.forEach(n => n.update());

        this.projectiles.forEach(p => p.update());
        this.projectiles = this.projectiles.filter(p => !p.destroyed);

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            let hit = false;
        
            for (const unit of this.units) {
                if (p.owner.team !== unit.team && !p.hitTargets.has(unit) && Math.hypot(p.pixelX - unit.pixelX, p.pixelY - unit.pixelY) < GRID_SIZE / 2) {
                    p.hitTargets.add(unit);
                    hit = true;
        
                    if (p.type === 'boomerang_projectile') {
                        unit.isBeingPulled = true;
                        unit.puller = p.owner;
                        const pullToX = p.owner.pixelX + Math.cos(p.owner.facingAngle) * GRID_SIZE;
                        const pullToY = p.owner.pixelY + Math.sin(p.owner.facingAngle) * GRID_SIZE;
                        unit.pullTargetPos = { x: pullToX, y: pullToY };
                    } else if (p.type === 'ice_diamond_projectile') {
                        unit.takeDamage(p.damage, { slow: 120 });
                    } else if (p.type === 'fireball_projectile') {
                        unit.takeDamage(p.damage);
                        createFireballHitEffect(this, unit.pixelX, unit.pixelY);
                        p.destroyed = true;
                        
                        const initialHitTargets = new Set([unit]);
                        for (let j = 0; j < 4; j++) {
                            const angle = j * Math.PI / 2;
                            const dummyTarget = {
                                pixelX: unit.pixelX + Math.cos(angle) * 100,
                                pixelY: unit.pixelY + Math.sin(angle) * 100
                            };
                            this.createProjectile(p.owner, dummyTarget, 'mini_fireball_projectile', { 
                                angle: angle,
                                startX: unit.pixelX,
                                startY: unit.pixelY,
                                hitTargets: initialHitTargets
                             });
                        }
                    } else {
                        const effectInfo = {
                            interrupt: p.type === 'hadoken',
                            force: p.knockback,
                            angle: p.angle
                        };
                        unit.takeDamage(p.damage, effectInfo);
                        if (p.type === 'hadoken') this.audioManager.play('hadokenHit');
                    }
        
                    if (p.type === 'lightning_bolt') {
                        p.destroyed = true; 
        
                        const potentialTargets = this.units.filter(u =>
                            u.team !== p.owner.team && !p.hitTargets.has(u) && u.hp > 0
                        );
        
                        if (potentialTargets.length > 0) {
                            let closestEnemy = potentialTargets[0];
                            let minDistance = Math.hypot(unit.pixelX - closestEnemy.pixelX, unit.pixelY - closestEnemy.pixelY);
        
                            for (let j = 1; j < potentialTargets.length; j++) {
                                const distance = Math.hypot(unit.pixelX - potentialTargets[j].pixelX, unit.pixelY - potentialTargets[j].pixelY);
                                if (distance < minDistance) {
                                    minDistance = distance;
                                    closestEnemy = potentialTargets[j];
                                }
                            }
        
                            const newProjectile = new Projectile(this, p.owner, closestEnemy, 'lightning_bolt', {
                                hitTargets: p.hitTargets
                            });
                            newProjectile.pixelX = unit.pixelX;
                            newProjectile.pixelY = unit.pixelY;
                            this.projectiles.push(newProjectile);
                        }
                    }
        
                    if (p.type !== 'lightning_bolt' && p.type !== 'fireball_projectile') {
                        break;
                    }
                }
            }
        
            if (!hit) {
                for (const nexus of this.nexuses) {
                    if (p.owner.team !== nexus.team && Math.hypot(p.pixelX - nexus.pixelX, p.pixelY - nexus.pixelY) < GRID_SIZE) {
                        if (p.type === 'ice_diamond_projectile') {
                           nexus.takeDamage(p.damage);
                        } else if (p.type === 'fireball_projectile') {
                            nexus.takeDamage(p.damage);
                            createFireballHitEffect(this, nexus.pixelX, nexus.pixelY);
                            p.destroyed = true;
                            
                            const initialHitTargets = new Set([nexus]);
                            for (let j = 0; j < 4; j++) {
                                const angle = j * Math.PI / 2;
                                 const dummyTarget = {
                                    pixelX: nexus.pixelX + Math.cos(angle) * 100,
                                    pixelY: nexus.pixelY + Math.sin(angle) * 100
                                };
                                this.createProjectile(p.owner, dummyTarget, 'mini_fireball_projectile', { 
                                    angle: angle,
                                    startX: nexus.pixelX,
                                    startY: nexus.pixelY,
                                    hitTargets: initialHitTargets
                                });
                            }
                        } else {
                            nexus.takeDamage(p.damage);
                            if (p.type === 'hadoken') this.audioManager.play('hadokenHit');
                        }
                        hit = true;
                        break;
                    }
                }
            }
        
            if (hit || p.pixelX < 0 || p.pixelX > this.canvas.width || p.pixelY < 0 || p.pixelY > this.canvas.height) {
                if (p.type === 'fireball_projectile' && !hit) {
                    createFireballHitEffect(this, p.pixelX, p.pixelY);
                }
                p.destroyed = true;
            }
        }
        
        this.projectiles = this.projectiles.filter(p => !p.destroyed);
        
        this.magicCircles.forEach(circle => circle.update());
        this.magicCircles = this.magicCircles.filter(c => c.duration > 0);
        
        this.poisonClouds.forEach(cloud => cloud.update());
        this.poisonClouds = this.poisonClouds.filter(c => c.duration > 0);

        for (const unit of this.units) {
            const gridX = Math.floor(unit.pixelX / GRID_SIZE);
            const gridY = Math.floor(unit.pixelY / GRID_SIZE);
            for (let i = this.magicCircles.length - 1; i >= 0; i--) {
                const circle = this.magicCircles[i];
                if (circle.gridX === gridX && circle.gridY === gridY && circle.team !== unit.team) {
                    unit.takeDamage(0, { stun: 120, stunSource: 'magic_circle' }); // [수정] 기절 출처 정보 추가
                    this.magicCircles.splice(i, 1);
                }
            }
        }

        this.weapons = this.weapons.filter(w => !w.isEquipped);

        this.effects.forEach(e => e.update());
        this.effects = this.effects.filter(e => e.duration > 0);
        this.areaEffects.forEach(e => e.update());
        this.areaEffects = this.areaEffects.filter(e => e.duration > 0);

        this.particles.forEach(p => p.update(this.gameSpeed));
        this.particles = this.particles.filter(p => p.isAlive());
    }
    
    draw(mouseEvent = null) {
        this.ctx.save();
        this.ctx.fillStyle = '#1f2937';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const cam = this.actionCam;
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(cam.current.scale, cam.current.scale);
        this.ctx.translate(-cam.current.x, -cam.current.y);

        this.drawMap();
        this.magicCircles.forEach(c => c.draw(this.ctx));
        this.poisonClouds.forEach(c => c.draw(this.ctx));
        
        if (this.state === 'SIMULATE' || this.state === 'PAUSED' || this.state === 'ENDING') {
            if (this.autoMagneticField.isActive) {
                this.ctx.fillStyle = `rgba(168, 85, 247, 0.2)`;
                const b = this.autoMagneticField.currentBounds;
                this.ctx.fillRect(0, 0, b.minX * GRID_SIZE, this.canvas.height);
                this.ctx.fillRect(b.maxX * GRID_SIZE, 0, this.canvas.width - b.maxX * GRID_SIZE, this.canvas.height);
                this.ctx.fillRect(b.minX * GRID_SIZE, 0, (b.maxX - b.minX) * GRID_SIZE, b.minY * GRID_SIZE);
                this.ctx.fillRect(b.minX * GRID_SIZE, b.maxY * GRID_SIZE, (b.maxX - b.minX) * GRID_SIZE, this.canvas.height - b.maxY * GRID_SIZE);
            }

            this.growingFields.forEach(field => {
                if (field.delayTimer < field.delay) return;
                this.ctx.fillStyle = `rgba(168, 85, 247, 0.2)`;
                const startX = field.gridX * GRID_SIZE;
                const startY = field.gridY * GRID_SIZE;
                const totalWidth = field.width * GRID_SIZE;
                const totalHeight = field.height * GRID_SIZE;

                if (field.direction === 'DOWN') this.ctx.fillRect(startX, startY, totalWidth, totalHeight * field.progress);
                else if (field.direction === 'UP') this.ctx.fillRect(startX, startY + totalHeight * (1 - field.progress), totalWidth, totalHeight * field.progress);
                else if (field.direction === 'RIGHT') this.ctx.fillRect(startX, startY, totalWidth * field.progress, totalHeight);
                else if (field.direction === 'LEFT') this.ctx.fillRect(startX + totalWidth * (1 - field.progress), startY, totalWidth * field.progress, totalHeight);
            });
        }
        
        this.growingFields.forEach(w => w.draw(this.ctx));
        this.weapons.forEach(w => w.draw(this.ctx));
        this.nexuses.forEach(n => n.draw(this.ctx));
        this.projectiles.forEach(p => p.draw(this.ctx));
        this.units.forEach(u => u.draw(this.ctx, this.isUnitOutlineEnabled, this.unitOutlineWidth));
        this.effects.forEach(e => e.draw(this.ctx));
        this.areaEffects.forEach(e => e.draw(this.ctx));
        this.particles.forEach(p => p.draw(this.ctx));

        if (this.state === 'EDIT' && this.currentTool.tool === 'growing_field' && this.dragStartPos && this.isPainting && mouseEvent) {
            const currentPos = this.getMousePos(mouseEvent);
            const x = Math.min(this.dragStartPos.gridX, currentPos.gridX) * GRID_SIZE;
            const y = Math.min(this.dragStartPos.gridY, currentPos.gridY) * GRID_SIZE;
            const width = (Math.abs(this.dragStartPos.gridX - currentPos.gridX) + 1) * GRID_SIZE;
            const height = (Math.abs(this.dragStartPos.gridY - currentPos.gridY) + 1) * GRID_SIZE;
            
            this.ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
            this.ctx.fillRect(x, y, width, height);
            this.ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
            this.ctx.strokeRect(x, y, width, height);
        }

        this.ctx.restore();
    }

    drawMap() {
        for (let y = 0; y < this.ROWS; y++) {
            for (let x = 0; x < this.COLS; x++) {
                if (!this.map || !this.map[y] || !this.map[y][x]) continue;
                const tile = this.map[y][x];
                
                switch(tile.type) {
                    case TILE.WALL: this.ctx.fillStyle = tile.color || this.currentWallColor; break;
                    case TILE.FLOOR: this.ctx.fillStyle = tile.color || this.currentFloorColor; break;
                    case TILE.LAVA: this.ctx.fillStyle = COLORS.LAVA; break;
                    case TILE.CRACKED_WALL: this.ctx.fillStyle = COLORS.CRACKED_WALL; break;
                    case TILE.HEAL_PACK: this.ctx.fillStyle = COLORS.HEAL_PACK; break;
                    case TILE.AWAKENING_POTION: this.ctx.fillStyle = this.currentFloorColor; break;
                    case TILE.REPLICATION_TILE: this.ctx.fillStyle = COLORS.REPLICATION_TILE; break;
                    case TILE.QUESTION_MARK: this.ctx.fillStyle = COLORS.QUESTION_MARK; break;
                    case TILE.DASH_TILE: this.ctx.fillStyle = COLORS.DASH_TILE; break;
                    case TILE.GLASS_WALL: this.ctx.fillStyle = COLORS.GLASS_WALL; break;
                    case TILE.TELEPORTER: this.ctx.fillStyle = this.currentFloorColor; break;
                    default: this.ctx.fillStyle = this.currentFloorColor;
                }
                
                this.ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);

                if(tile.type === TILE.LAVA) {
                    const flicker = Math.sin(this.animationFrameCounter * 0.1 + x + y) * 10 + 10;
                    this.ctx.fillStyle = `rgba(255, 255, 0, 0.3)`;
                    this.ctx.beginPath(); this.ctx.arc(x * GRID_SIZE + 10, y * GRID_SIZE + 10, flicker / 4, 0, Math.PI * 2); this.ctx.fill();
                } else if(tile.type === TILE.CRACKED_WALL) {
                    this.ctx.strokeStyle = 'rgba(0,0,0,0.7)'; this.ctx.lineWidth = 1.5;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x * GRID_SIZE + 4, y * GRID_SIZE + 4); this.ctx.lineTo(x * GRID_SIZE + 10, y * GRID_SIZE + 10);
                    this.ctx.moveTo(x * GRID_SIZE + 10, y * GRID_SIZE + 10); this.ctx.lineTo(x * GRID_SIZE + 8, y * GRID_SIZE + 16);
                    this.ctx.moveTo(x * GRID_SIZE + 16, y * GRID_SIZE + 5); this.ctx.lineTo(x * GRID_SIZE + 10, y * GRID_SIZE + 9);
                    this.ctx.moveTo(x * GRID_SIZE + 10, y * GRID_SIZE + 9); this.ctx.lineTo(x * GRID_SIZE + 15, y * GRID_SIZE + 17);
                    this.ctx.stroke();
                } else if(tile.type === TILE.TELEPORTER) {
                    const angle = this.animationFrameCounter * 0.05;
                    this.ctx.save();
                    this.ctx.translate(x * GRID_SIZE + GRID_SIZE / 2, y * GRID_SIZE + GRID_SIZE / 2);
                    this.ctx.rotate(angle);
                    for (let i = 0; i < 6; i++) {
                        this.ctx.fillStyle = i % 2 === 0 ? COLORS.TELEPORTER : '#4c1d95';
                        this.ctx.beginPath(); this.ctx.moveTo(0, 0); this.ctx.lineTo(GRID_SIZE * 0.5, 0);
                        this.ctx.arc(0, 0, GRID_SIZE * 0.5, 0, Math.PI / 3); this.ctx.closePath();
                        this.ctx.fill(); this.ctx.rotate(Math.PI / 3);
                    }
                    this.ctx.restore();
                } else if(tile.type === TILE.HEAL_PACK) {
                    this.ctx.fillStyle = 'white';
                    const plusWidth = 4;
                    const plusLength = GRID_SIZE - 8;
                    this.ctx.fillRect(x * GRID_SIZE + (GRID_SIZE - plusWidth) / 2, y * GRID_SIZE + 4, plusWidth, plusLength);
                    this.ctx.fillRect(x * GRID_SIZE + 4, y * GRID_SIZE + (GRID_SIZE - plusWidth) / 2, plusLength, plusWidth);
                } else if (tile.type === TILE.AWAKENING_POTION) {
                    const centerX = x * GRID_SIZE + GRID_SIZE / 2;
                    const centerY = y * GRID_SIZE + GRID_SIZE / 2;
                    this.ctx.fillStyle = 'rgba(150, 150, 150, 0.4)';
                    this.ctx.strokeStyle = '#9CA3AF';
                    this.ctx.lineWidth = 1.5;
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, GRID_SIZE * 0.4, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.stroke();
                    this.ctx.fillStyle = '#A1662F';
                    this.ctx.fillRect(centerX - GRID_SIZE * 0.15, centerY - GRID_SIZE * 0.6, GRID_SIZE * 0.3, GRID_SIZE * 0.2);
                    this.ctx.fillStyle = '#FFFFFF';
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, GRID_SIZE * 0.35, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    this.ctx.beginPath();
                    this.ctx.arc(centerX - GRID_SIZE * 0.15, centerY - GRID_SIZE * 0.15, GRID_SIZE * 0.08, 0, Math.PI * 2);
                    this.ctx.fill();
                } else if(tile.type === TILE.REPLICATION_TILE) {
                    this.ctx.fillStyle = 'black'; this.ctx.font = 'bold 12px Arial'; this.ctx.textAlign = 'center';
                    this.ctx.fillText(`+${tile.replicationValue}`, x * GRID_SIZE + 10, y * GRID_SIZE + 14);
                } else if (tile.type === TILE.QUESTION_MARK) {
                    this.ctx.fillStyle = 'black';
                    this.ctx.font = 'bold 16px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('?', x * GRID_SIZE + 10, y * GRID_SIZE + 16);
                } else if (tile.type === TILE.DASH_TILE) {
                    this.ctx.save();
                    this.ctx.translate(x * GRID_SIZE + GRID_SIZE / 2, y * GRID_SIZE + GRID_SIZE / 2);
                    let angle = 0;
                    switch(tile.direction) {
                        case 'RIGHT': angle = 0; break;
                        case 'LEFT': angle = Math.PI; break;
                        case 'DOWN': angle = Math.PI / 2; break;
                        case 'UP': angle = -Math.PI / 2; break;
                    }
                    this.ctx.rotate(angle);
                    this.ctx.fillStyle = 'black';
                    this.ctx.beginPath();
                    this.ctx.moveTo(-6, -6);
                    this.ctx.lineTo(4, 0);
                    this.ctx.lineTo(-6, 6);
                    this.ctx.lineTo(-4, 0);
                    this.ctx.closePath();
                    this.ctx.fill();
                    this.ctx.restore();
                } else if(tile.type === TILE.GLASS_WALL) {
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                    this.ctx.lineWidth = 1.5;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x * GRID_SIZE + 4, y * GRID_SIZE + 4);
                    this.ctx.lineTo(x * GRID_SIZE + GRID_SIZE - 4, y * GRID_SIZE + GRID_SIZE - 4);
                    this.ctx.stroke();
                }

                if (this.state === 'EDIT') {
                    this.ctx.strokeStyle = COLORS.GRID;
                    this.ctx.strokeRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                }
            }
        }
    }
    
    hasLineOfSight(startUnit, endTarget, isWeaponCheck = false) {
        let x1 = startUnit.pixelX;
        let y1 = startUnit.pixelY;
        const x2 = endTarget.pixelX;
        const y2 = endTarget.pixelY;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.hypot(dx, dy);
        const step = GRID_SIZE / 4;

        for (let i = step; i < distance; i += step) {
            const currentX = x1 + (dx / distance) * i;
            const currentY = y1 + (dy / distance) * i;

            const gridX = Math.floor(currentX / GRID_SIZE);
            const gridY = Math.floor(currentY / GRID_SIZE);

            if (gridY < 0 || gridY >= this.ROWS || gridX < 0 || gridX >= this.COLS) return false;

            const tile = this.map[gridY][gridX];
            
            if (isWeaponCheck) {
                if (tile.type === TILE.WALL) return false;
            } else {
                if (tile.type === TILE.WALL || tile.type === TILE.CRACKED_WALL || tile.type === TILE.GLASS_WALL) {
                    return false;
                }
            }
        }
        return true;
    }

    hasLineOfSightForWeapon(startUnit, endTarget) {
        return this.hasLineOfSight(startUnit, endTarget, true);
    }

    createWeapon(x, y, type) {
        const weapon = new Weapon(this, x, y, type);
        if (type === 'sword') {
            weapon.attackPowerBonus = 15;
        } else if (type === 'bow') {
            weapon.attackPowerBonus = 10;
            weapon.attackRangeBonus = 5 * GRID_SIZE;
            weapon.detectionRangeBonus = 4 * GRID_SIZE;
        } else if (type === 'ice_diamond') {
            weapon.attackPowerBonus = 8;
            weapon.attackRangeBonus = 5 * GRID_SIZE;
            weapon.detectionRangeBonus = 4 * GRID_SIZE;
        } else if (type === 'dual_swords') {
            weapon.attackPowerBonus = 3;
            weapon.speedBonus = 0.6;
            weapon.attackCooldownBonus = -40;
        } else if (type === 'fire_staff') {
            weapon.attackPowerBonus = 25;
            weapon.attackRangeBonus = 6 * GRID_SIZE;
            weapon.detectionRangeBonus = 2 * GRID_SIZE;
        } else if (type === 'hadoken') {
            weapon.attackPowerBonus = 20;
            weapon.attackRangeBonus = 5 * GRID_SIZE;
            weapon.detectionRangeBonus = 4 * GRID_SIZE;
        } else if (type === 'shuriken') {
            weapon.attackPowerBonus = 12;
            weapon.speedBonus = 0.3;
            weapon.attackCooldownBonus = 100;
            weapon.attackRangeBonus = 5 * GRID_SIZE;
            weapon.detectionRangeBonus = 4 * GRID_SIZE;
        } else if (type === 'lightning') {
            weapon.attackPowerBonus = 8; 
            weapon.attackRangeBonus = 6 * GRID_SIZE;
            weapon.attackCooldownBonus = -20;
        } else if (type === 'magic_spear') {
            weapon.attackRangeBonus = 5 * GRID_SIZE;
            weapon.normalAttackPowerBonus = 5;
            weapon.specialAttackPowerBonus = 15;
        } else if (type === 'boomerang') {
            weapon.attackPowerBonus = 10;
            weapon.attackRangeBonus = 7 * GRID_SIZE;
            weapon.detectionRangeBonus = 6 * GRID_SIZE;
        } else if (type === 'poison_potion') {
            weapon.attackPowerBonus = 10;
        } else if (type === 'magic_dagger') {
            weapon.attackPowerBonus = 12;
        } else if (type === 'axe') {
            weapon.attackPowerBonus = 18;
            weapon.attackRangeBonus = -0.2 * GRID_SIZE;
        } else if (type === 'crown') {
            weapon.attackPowerBonus = 5;
        }
        return weapon;
    }

    spawnUnit(spawner, cloneWeapon = false) {
        for(let dx = -1; dx <= 1; dx++) {
            for(let dy = -1; dy <= 1; dy++) {
                if(dx === 0 && dy === 0) continue;
                const newX = Math.floor(spawner.pixelX / GRID_SIZE) + dx;
                const newY = Math.floor(spawner.pixelY / GRID_SIZE) + dy;
                if (newY >= 0 && newY < this.ROWS && newX >= 0 && newX < this.COLS && this.map[newY][newX].type === TILE.FLOOR) {
                    const isOccupied = this.units.some(u => u.gridX === newX && u.gridY === newY) || this.weapons.some(w => w.gridX === newX && w.gridY === newY) || this.nexuses.some(n => n.gridX === newX && n.gridY === newY);
                    if (!isOccupied) {
                        const newUnit = new Unit(this, newX, newY, spawner.team);
                        
                        if (this.isNametagEnabled && this.nametagList.length > 0) {
                            const availableNames = this.nametagList.filter(name => !this.usedNametagsInSim.has(name));
                            if (availableNames.length > 0) {
                                const randomName = availableNames[Math.floor(this.random() * availableNames.length)];
                                newUnit.name = randomName;
                                this.usedNametagsInSim.add(randomName);
                            }
                        }

                        if (cloneWeapon && spawner.weapon) {
                            newUnit.equipWeapon(spawner.weapon.type, true);
                        }
                        this.units.push(newUnit);
                        return;
                    }
                }
            }
        }
    }
    
    createEffect(type, x, y, target, options = {}) { this.effects.push(new Effect(this, x, y, type, target, options)); }
    createProjectile(owner, target, type, options = {}) { this.projectiles.push(new Projectile(this, owner, target, type, options)); }
    
    castAreaSpell(pos, type, ...args) {
        if (type === 'poison_cloud') {
            const ownerTeam = args[0];
            this.poisonClouds.push(new PoisonCloud(this, pos.x, pos.y, ownerTeam));
        } else if (type === 'fire_pillar') {
            const damage = args[0];
            const ownerTeam = args[1];
            this.areaEffects.push(new AreaEffect(this, pos.x, pos.y, type, { damage, ownerTeam }));
        } else {
            const options = args[0] || {};
            this.areaEffects.push(new AreaEffect(this, pos.x, pos.y, type, options));
        }
    }

    damageTile(x, y, damage) {
        if (y >= 0 && y < this.ROWS && x >= 0 && x < this.COLS) {
            const tile = this.map[y][x];
            if (tile.type === TILE.CRACKED_WALL) {
                tile.hp -= damage;
                if (tile.hp <= 0) {
                    this.map[y][x] = { type: TILE.FLOOR, color: this.currentFloorColor };
                    this.audioManager.play('crackedWallBreak');
                }
            }
        }
    }
    getTilesOfType(type) {
        const tiles = [];
        for (let y = 0; y < this.ROWS; y++) {
            for (let x = 0; x < this.COLS; x++) {
                if (this.map[y][x].type === type) {
                    tiles.push({ x, y });
                }
            }
        }
        return tiles;
    }

    isPosInAnyField(gridX, gridY) {
        if (this.autoMagneticField.isActive) {
            const b = this.autoMagneticField.currentBounds;
            if (gridX < b.minX || gridX >= b.maxX || gridY < b.minY || gridY >= b.maxY) {
                return true;
            }
        }
        for (const field of this.growingFields) {
            if (field.delayTimer < field.delay) continue;

            let isInside = false;
            const currentProgress = field.progress;
            const startX = field.gridX;
            const startY = field.gridY;
            const endX = field.gridX + field.width;
            const endY = field.gridY + field.height;

            if (gridX >= startX && gridX < endX && gridY >= startY && gridY < endY) {
                if (field.direction === 'DOWN') {
                    if (gridY < startY + field.height * currentProgress) isInside = true;
                } else if (field.direction === 'UP') {
                    if (gridY >= endY - field.height * currentProgress) isInside = true;
                } else if (field.direction === 'RIGHT') {
                    if (gridX < startX + field.width * currentProgress) isInside = true;
                } else if (field.direction === 'LEFT') {
                    if (gridX >= endX - field.width * currentProgress) isInside = true;
                }
            }
            if (isInside) return true;
        }
        return false;
    }

    findClosestSafeSpot(pixelX, pixelY) {
        let closestSpot = null;
        let minDistance = Infinity;

        for (let y = 0; y < this.ROWS; y++) {
            for (let x = 0; x < this.COLS; x++) {
                if (!this.isPosInAnyField(x, y)) {
                    const targetPixelX = x * GRID_SIZE + GRID_SIZE / 2;
                    const targetPixelY = y * GRID_SIZE + GRID_SIZE / 2;
                    const distance = Math.hypot(pixelX - targetPixelX, pixelY - targetPixelY);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestSpot = { x: targetPixelX, y: targetPixelY };
                    }
                }
            }
        }
        return closestSpot || { x: this.canvas.width / 2, y: this.canvas.height / 2 };
    }
    
    findStunnedEnemy(team) {
        return this.units.find(u => u.team !== team && u.isStunned > 0);
    }

    // [추가] 마법진에 의해 기절한 적을 찾는 함수
    findStunnedByMagicCircleEnemy(team) {
        return this.units.find(u => u.team !== team && u.isStunned > 0 && u.stunnedByMagicCircle);
    }

    spawnMagicCircle(team) {
        const availableTiles = [];
        for (let y = 0; y < this.ROWS; y++) {
            for (let x = 0; x < this.COLS; x++) {
                if (this.map[y][x].type === TILE.FLOOR) {
                    const isOccupied = this.units.some(u => u.gridX === x && u.gridY === y) ||
                                     this.nexuses.some(n => n.gridX === x && n.gridY === y) ||
                                     this.magicCircles.some(c => c.gridX === x && c.gridY === y);
                    if (!isOccupied) {
                        availableTiles.push({ x, y });
                    }
                }
            }
        }

        if (availableTiles.length > 0) {
            const pos = availableTiles[Math.floor(this.random() * availableTiles.length)];
            this.magicCircles.push(new MagicCircle(this, pos.x, pos.y, team));
        }
    }

    spawnRandomWeaponNear(pos) {
        const weaponTypes = ['sword', 'bow', 'dual_swords', 'fire_staff', 'lightning', 'magic_spear', 'boomerang', 'poison_potion', 'magic_dagger', 'axe', 'hadoken', 'shuriken', 'ice_diamond'];
        const randomType = weaponTypes[Math.floor(this.random() * weaponTypes.length)];

        for (let i = 0; i < 10; i++) {
            const angle = this.random() * Math.PI * 2;
            const radius = GRID_SIZE * (this.random() * 2 + 1);
            const spawnX = Math.floor((pos.x + Math.cos(angle) * radius) / GRID_SIZE);
            const spawnY = Math.floor((pos.y + Math.sin(angle) * radius) / GRID_SIZE);

            if (spawnY >= 0 && spawnY < this.ROWS && spawnX >= 0 && spawnX < this.COLS && this.map[spawnY][spawnX].type === TILE.FLOOR) {
                const isOccupied = this.weapons.some(w => w.gridX === spawnX && w.gridY === spawnY);
                if (!isOccupied) {
                    this.weapons.push(this.createWeapon(spawnX, spawnY, randomType));
                    return;
                }
            }
        }
    }

    async loadMapForEditing(mapId) {
        const mapData = await this.getMapById(mapId);
        if (!mapData) {
            console.error("Map not found:", mapId);
            this.showHomeScreen();
            return;
        }
        
        this.currentMapId = mapId;
        this.currentMapName = mapData.name;
        this.canvas.width = mapData.width || 600;
        this.canvas.height = mapData.height || 900;
        document.getElementById('widthInput').value = this.canvas.width;
        document.getElementById('heightInput').value = this.canvas.height;
        this.COLS = Math.floor(this.canvas.width / GRID_SIZE);
        this.ROWS = Math.floor(this.canvas.height / GRID_SIZE);

        this.handleMapColors(mapData);

        if (mapData.map && typeof mapData.map === 'string') {
            this.map = JSON.parse(mapData.map);
        } else {
            this.map = Array(this.ROWS).fill().map(() => Array(this.COLS).fill({ type: TILE.FLOOR, color: this.currentFloorColor }));
        }
        
        this.units = (mapData.units || []).map(uData => Object.assign(new Unit(this, uData.gridX, uData.gridY, uData.team), uData));
        this.weapons = (mapData.weapons || []).map(wData => Object.assign(new Weapon(this, wData.gridX, wData.gridY, wData.type), wData));
        this.nexuses = (mapData.nexuses || []).map(nData => Object.assign(new Nexus(this, nData.gridX, nData.gridY, nData.team), nData));
        
        this.growingFields = (mapData.growingFields || []).map(fieldData => {
             const settings = {
                 direction: fieldData.direction,
                 speed: (fieldData.totalFrames / 60) || 4,
                 delay: (fieldData.delay / 60) || 0,
             };
            return new GrowingMagneticField(this, fieldData.id, fieldData.gridX, fieldData.gridY, fieldData.width, fieldData.height, settings);
        });

        this.autoMagneticField = mapData.autoMagneticField || {
            isActive: false, safeZoneSize: 6, simulationTime: 0,
            totalShrinkTime: 60 * 60, currentBounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 }
        };
        this.hadokenKnockback = mapData.hadokenKnockback || 15;
        
        this.resetSimulationState();
        this.renderRecentColors('floor');
        this.renderRecentColors('wall');
        this.draw();
    }

    async loadLocalMapForEditing(mapData) {
        this.state = 'EDIT';
        this.isReplayMode = false;
        this.currentMapId = `local_${mapData.name}`;
        document.getElementById('homeScreen').style.display = 'none';
        document.getElementById('defaultMapsScreen').style.display = 'none';
        document.getElementById('replayScreen').style.display = 'none';
        document.getElementById('editorScreen').style.display = 'flex';
        await this.audioManager.init();
        
        this.currentMapName = mapData.name;
        this.canvas.width = mapData.width;
        this.canvas.height = mapData.height;
        document.getElementById('widthInput').value = this.canvas.width;
        document.getElementById('heightInput').value = this.canvas.height;
        this.COLS = Math.floor(this.canvas.width / GRID_SIZE);
        this.ROWS = Math.floor(this.canvas.height / GRID_SIZE);

        this.handleMapColors(mapData);

        this.map = JSON.parse(mapData.map);
        
        this.units = (mapData.units || []).map(uData => Object.assign(new Unit(this, uData.gridX, uData.gridY, uData.team), uData));
        this.weapons = (mapData.weapons || []).map(wData => Object.assign(new Weapon(this, wData.gridX, wData.gridY, wData.type), wData));
        this.nexuses = (mapData.nexuses || []).map(nData => Object.assign(new Nexus(this, nData.gridX, nData.gridY, nData.team), nData));
        
        this.growingFields = (mapData.growingFields || []).map(fieldData => {
             const settings = {
                 direction: fieldData.direction,
                 speed: (fieldData.totalFrames / 60) || 4,
                 delay: (fieldData.delay / 60) || 0,
             };
            return new GrowingMagneticField(this, fieldData.id, fieldData.gridX, fieldData.gridY, fieldData.width, fieldData.height, settings);
        });

        this.autoMagneticField = mapData.autoMagneticField;
        this.hadokenKnockback = mapData.hadokenKnockback;
        
        this.resetSimulationState();
        this.renderRecentColors('floor');
        this.renderRecentColors('wall');
        this.draw();
    }

    resetSimulationState() {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
        this.state = 'EDIT';
        this.effects = [];
        this.projectiles = [];
        this.areaEffects = [];
        this.magicCircles = [];
        this.poisonClouds = [];
        this.particles = [];
        this.initialUnitsState = [];
        this.initialWeaponsState = [];
        this.initialNexusesState = [];
        this.initialMapState = [];
        this.initialGrowingFieldsState = [];
        this.initialAutoFieldState = {};
        this.usedNametagsInSim.clear();
        document.getElementById('statusText').textContent = "에디터 모드";
        document.getElementById('simStartBtn').classList.remove('hidden');
        document.getElementById('saveReplayBtn').classList.add('hidden');
        document.getElementById('simPauseBtn').classList.add('hidden');
        document.getElementById('simPlayBtn').classList.add('hidden');
        document.getElementById('simStartBtn').disabled = false;
        document.getElementById('toolbox').style.pointerEvents = 'auto';
        this.resetActionCam(true);
    }

    addRecentColor(color, type) {
        const recentColors = type === 'floor' ? this.recentFloorColors : this.recentWallColors;
        const index = recentColors.indexOf(color);
        if (index > -1) {
            recentColors.splice(index, 1);
        }
        recentColors.unshift(color);
        if (recentColors.length > MAX_RECENT_COLORS) {
            recentColors.pop();
        }
        this.renderRecentColors(type);
    }

    renderRecentColors(type) {
        const containerId = type === 'floor' ? 'recentFloorColors' : 'recentWallColors';
        const container = document.getElementById(containerId);
        const recentColors = type === 'floor' ? this.recentFloorColors : this.recentWallColors;
        
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
            this.currentFloorColor = color;
            const picker = document.getElementById('floorColorPicker');
            if (picker.value !== color) picker.value = color;
        } else {
            this.currentWallColor = color;
            const picker = document.getElementById('wallColorPicker');
            if (picker.value !== color) picker.value = color;
        }
        if (addToRecent) {
            this.addRecentColor(color, type);
        }
        this.draw();
    }

    handleMapColors(mapData) {
        this.recentFloorColors = mapData.recentFloorColors || [];
        this.recentWallColors = mapData.recentWallColors || [];
        
        let floorColor = mapData.floorColor;
        let wallColor = mapData.wallColor;

        if (!floorColor || !wallColor) {
            const mapGridData = (typeof mapData.map === 'string') ? JSON.parse(mapData.map) : mapData.map;
            const floorColors = {};
            const wallColors = {};
            
            mapGridData.forEach(row => {
                row.forEach(tile => {
                    if (tile.type === TILE.FLOOR && tile.color) {
                        floorColors[tile.color] = (floorColors[tile.color] || 0) + 1;
                    } else if (tile.type === TILE.WALL && tile.color) {
                        wallColors[tile.color] = (wallColors[tile.color] || 0) + 1;
                    }
                });
            });

            const mostCommonFloor = Object.keys(floorColors).reduce((a, b) => floorColors[a] > floorColors[b] ? a : b, null);
            const mostCommonWall = Object.keys(wallColors).reduce((a, b) => wallColors[a] > wallColors[b] ? a : b, null);

            floorColor = mostCommonFloor || COLORS.FLOOR;
            wallColor = mostCommonWall || COLORS.WALL;
        }
        
        this.setCurrentColor(floorColor, 'floor', false);
        this.setCurrentColor(wallColor, 'wall', false);
    }
    
    async loadNametagSettings() {
        if (!this.currentUser) return;
        const nametagDocRef = doc(this.db, "users", this.currentUser.uid, "settings", "nametags");
        try {
            const docSnap = await getDoc(nametagDocRef);
            if (docSnap.exists()) {
                const settings = docSnap.data();
                this.isNametagEnabled = settings.enabled || false;
                this.nametagList = settings.list || [];
            } else {
                this.isNametagEnabled = false;
                this.nametagList = [];
            }
        } catch (error) {
            console.error("Error loading nametag settings:", error);
            this.isNametagEnabled = false;
            this.nametagList = [];
        }
        
        document.getElementById('nametagToggle').checked = this.isNametagEnabled;
        this.renderNametagList();
    }
    
    async saveNametagSettings() {
        if (!this.currentUser) {
            alert("이름표 설정을 저장하려면 로그인이 필요합니다.");
            return;
        }
        this.isNametagEnabled = document.getElementById('nametagToggle').checked;
        const settingsData = {
            enabled: this.isNametagEnabled,
            list: this.nametagList
        };

        const nametagDocRef = doc(this.db, "users", this.currentUser.uid, "settings", "nametags");
        try {
            await setDoc(nametagDocRef, settingsData);
            alert('이름표 설정이 Firebase에 저장되었습니다.');
        } catch (error) {
            console.error("Error saving nametag settings:", error);
            alert('이름표 설정 저장에 실패했습니다.');
        }
    }
    
    renderNametagList() {
        const container = document.getElementById('nametagListContainer');
        const countSpan = document.getElementById('nameCount');
        container.innerHTML = '';
        this.nametagList.forEach(name => {
            const item = document.createElement('div');
            item.className = 'nametag-item';
            item.innerHTML = `<span>${name}</span><button class="nametag-delete-btn">X</button>`;
            container.appendChild(item);
        });
        countSpan.textContent = this.nametagList.length;
    }

    handleNametagFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const names = text.split(/[\r\n]+/).filter(name => name.trim() !== '');
            this.nametagList.push(...names);
            this.nametagList = [...new Set(this.nametagList)];
            this.renderNametagList();
            event.target.value = '';
        };
        reader.readAsText(file);
    }
    
    addNametagManually() {
        const input = document.getElementById('addNameInput');
        const name = input.value.trim();
        if (name && !this.nametagList.includes(name)) {
            this.nametagList.push(name);
            this.renderNametagList();
            input.value = '';
        }
    }
    
    deleteNametag(nameToDelete) {
        this.nametagList = this.nametagList.filter(name => name !== nameToDelete);
        this.renderNametagList();
    }
    
    async openSaveReplayModal() {
        if (!this.lastSimulationResult) {
            alert("저장할 시뮬레이션 결과가 없습니다.");
            return;
        }
    
        const replaysColRef = collection(this.db, "replays", this.currentUser.uid, "userReplays");
        const q = query(replaysColRef, where("mapName", "==", this.lastSimulationResult.mapName));
        const querySnapshot = await getDocs(q);
        const replayCount = querySnapshot.size;
    
        document.getElementById('newReplayName').value = `${this.lastSimulationResult.mapName} 리플레이 ${replayCount + 1}`;
        document.getElementById('saveReplayModal').classList.add('show-modal');
    }

    async saveLastReplay() {
        if (!this.currentUser || !this.lastSimulationResult) return;
        
        const replayName = document.getElementById('newReplayName').value.trim();
        if (!replayName) {
            alert("리플레이 이름을 입력해주세요.");
            return;
        }

        const replayId = `replay_${Date.now()}`;
        const replayData = {
            name: replayName,
            ...this.lastSimulationResult
        };

        const replayDocRef = doc(this.db, "replays", this.currentUser.uid, "userReplays", replayId);
        try {
            await setDoc(replayDocRef, replayData);
            alert(`'${replayName}' 리플레이가 저장되었습니다!`);
            document.getElementById('saveReplayModal').classList.remove('show-modal');
        } catch (error) {
            console.error("Error saving replay:", error);
            alert("리플레이 저장에 실패했습니다.");
        }
    }

    async renderReplayCards() {
        if (!this.currentUser) return;
        
        const replaysColRef = collection(this.db, "replays", this.currentUser.uid, "userReplays");
        const replaySnapshot = await getDocs(replaysColRef);
        const replays = replaySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const replayGrid = document.getElementById('replayGrid');
        replayGrid.innerHTML = '';

        replays.forEach(replayData => {
            const card = this.createReplayCard(replayData);
            replayGrid.appendChild(card);
        });
    }
    
    createReplayCard(replayData) {
        const card = document.createElement('div');
        card.className = 'relative group bg-gray-800 rounded-lg overflow-hidden flex flex-col cursor-pointer shadow-lg hover:shadow-green-500/30 transition-shadow duration-300';
        
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.map-menu-button')) {
                this.loadReplay(replayData.id);
            }
        });

        const previewCanvas = document.createElement('canvas');
        previewCanvas.className = 'w-full aspect-[3/4] object-cover';
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'p-3 flex-grow flex items-center justify-between';
        const nameP = document.createElement('p');
        nameP.className = 'font-bold text-white truncate';
        nameP.textContent = replayData.name;
        
        const replayBadge = document.createElement('span');
        replayBadge.className = 'ml-2 text-xs font-semibold bg-green-500 text-white px-2 py-0.5 rounded-full';
        replayBadge.textContent = '리플레이';
        nameP.appendChild(replayBadge);

        infoDiv.appendChild(nameP);

        const menuButton = document.createElement('button');
        menuButton.className = 'map-menu-button absolute top-2 right-2 p-1.5 rounded-full bg-gray-900/50 hover:bg-gray-700/70 opacity-0 group-hover:opacity-100 transition-opacity';
        menuButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>`;
        
        const menu = document.createElement('div');
        menu.className = 'map-menu hidden absolute top-10 right-2 z-10 bg-gray-700 p-2 rounded-md shadow-lg w-32';
        const renameBtn = document.createElement('button');
        renameBtn.className = 'w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-600';
        renameBtn.textContent = '이름 변경';
        renameBtn.onclick = () => {
            menu.style.display = 'none';
            this.openRenameModal(replayData.id, replayData.name, 'replay');
        };
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'w-full text-left px-3 py-1.5 text-sm text-red-400 rounded hover:bg-gray-600';
        deleteBtn.textContent = '삭제';
        deleteBtn.onclick = () => {
            menu.style.display = 'none';
            this.openDeleteConfirmModal(replayData.id, replayData.name, 'replay');
        };
        menu.append(renameBtn, deleteBtn);

        menuButton.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.map-menu').forEach(m => {
                if (m !== menu) m.style.display = 'none';
            });
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        });
        card.append(menuButton, menu);

        card.append(previewCanvas, infoDiv);
        
        const tempMapData = {
            width: replayData.mapWidth,
            height: replayData.mapHeight,
            map: replayData.initialMapState,
            units: JSON.parse(replayData.initialUnitsState || '[]'),
            weapons: JSON.parse(replayData.initialWeaponsState || '[]'),
            nexuses: JSON.parse(replayData.initialNexusesState || '[]'),
        };
        this.drawMapPreview(previewCanvas, tempMapData);

        return card;
    }

    async loadReplay(replayId) {
        if (!this.currentUser) return;
        const replayDocRef = doc(this.db, "replays", this.currentUser.uid, "userReplays", replayId);
        const replaySnap = await getDoc(replayDocRef);
        
        if (!replaySnap.exists()) {
            console.error("Replay not found:", replayId);
            return;
        }
        
        const replayData = replaySnap.data();

        await this.showEditorScreen('replay');
        this.isReplayMode = true;
        this.simulationSeed = replayData.simulationSeed;
        this.currentMapId = replayId; 
        this.currentMapName = replayData.name;

        this.canvas.width = replayData.mapWidth;
        this.canvas.height = replayData.mapHeight;
        const map = JSON.parse(replayData.initialMapState);
        this.COLS = map[0].length;
        this.ROWS = map.length;
        this.map = map;

        this.initialUnitsState = replayData.initialUnitsState;
        this.initialWeaponsState = replayData.initialWeaponsState;
        this.initialNexusesState = replayData.initialNexusesState;
        this.initialMapState = replayData.initialMapState;
        this.initialGrowingFieldsState = replayData.initialGrowingFieldsState;
        this.initialAutoFieldState = replayData.initialAutoFieldState;

        this.updateUIToReplayMode();
        this.resetPlacement();
        
        this.draw();
    }

    updateUIToReplayMode() {
        document.getElementById('toolbox').style.display = 'none';
        document.getElementById('editor-controls').style.display = 'none';
        document.getElementById('simResetBtn').style.display = 'none';
        const placementResetBtn = document.getElementById('simPlacementResetBtn');
        placementResetBtn.textContent = '리플레이 초기화';
        placementResetBtn.style.display = 'inline-block';
    }

    updateUIToEditorMode() {
        document.getElementById('toolbox').style.display = 'flex';
        document.getElementById('editor-controls').style.display = 'flex';
        document.getElementById('simResetBtn').style.display = 'inline-block';
        const placementResetBtn = document.getElementById('simPlacementResetBtn');
        placementResetBtn.textContent = '배치 초기화';
        placementResetBtn.style.display = 'inline-block';
    }
}
