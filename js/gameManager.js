import { Unit } from './unit.js';
import { Weapon, Projectile, AreaEffect, Effect, MagicDaggerDashEffect, createFireballHitEffect, Particle } from './weaponary.js';
import { Nexus, GrowingMagneticField, MagicCircle, PoisonCloud } from './entities.js';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { AudioManager } from './audioManager.js';
import { TILE, TEAM, COLORS, GRID_SIZE } from './constants.js';
import { drawImpl, drawMapImpl, WeaponRegistry, SpecialTileRegistry, applyWeaponBonuses, getRandomWeaponType, TuningDefaults, hasLineOfSightImpl, hasLineOfSightForWeaponImpl, isPosInAnyFieldImpl, findClosestSafeSpotImpl, isPosInLavaForUnitImpl, findClosestSafeSpotFromLavaImpl, findClosestEnemyImpl, findEmptySpotNearImpl, damageTileImpl, applyDamageImpl, spawnMagicCircleImpl, spawnRandomWeaponNearImpl } from './gameManager.mod.js';
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
        this.growingFieldSettings = { ...TuningDefaults.growingFieldSettings };
        this.dashTileSettings = { ...TuningDefaults.dashTileSettings };
        this.autoMagneticField = { ...TuningDefaults.autoMagneticField };
        this.hadokenKnockback = TuningDefaults.hadokenKnockback;
        this.initialNexusCount = 0;
        this.winnerTeam = null;

        this.audioManager = new AudioManager();
        
        this.isUnitOutlineEnabled = true;
        this.unitOutlineWidth = 1.5;

        this.isLevelUpEnabled = false;
        
        this.isNametagEnabled = false;
        this.nametagList = [];
        this.nametagColor = '#000000'; 
        this.usedNametagsInSim = new Set();
        this.editingUnit = null;
        
        this.prng = new SeededRandom(Date.now());
        this.uiPrng = new SeededRandom(Date.now());
        this.simulationSeed = null;
        this.rngPolicy = 'legacy'; // 'legacy' | 'seeded_v2'
        this._originalMathRandom = null;
        this.isReplayMode = false;
        this.lastSimulationResult = null;
        
        this.simulationTime = 0;
        this.timerElement = document.getElementById('timerText');

        this.isLavaAvoidanceEnabled = true;

        instance = this;
    }

    random() {
        return this.prng.next();
    }

    enableDeterministicRng() {
        if (this.rngPolicy !== 'seeded_v2') return;
        if (!this._originalMathRandom) {
            this._originalMathRandom = Math.random;
            Math.random = () => this.prng.next();
        }
    }

    disableDeterministicRng() {
        if (this._originalMathRandom) {
            Math.random = this._originalMathRandom;
            this._originalMathRandom = null;
        }
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
        if (this.timerElement) this.timerElement.style.display = 'none';
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
        // Determine RNG policy for new sessions (do not alter existing replays)
        this.rngPolicy = 'seeded_v2';

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

        // Eye size preference
        const eyeSizePref = localStorage.getItem('unitEyeScale');
        this.unitEyeScale = eyeSizePref !== null ? parseFloat(eyeSizePref) : 1.0;
        const eyeSliderInit = document.getElementById('unitEyeSizeControl');
        const eyeValueInit = document.getElementById('unitEyeSizeValue');
        if (eyeSliderInit && eyeValueInit) {
            eyeSliderInit.value = this.unitEyeScale.toFixed(2);
            eyeValueInit.textContent = this.unitEyeScale.toFixed(2);
        }

        this.resetActionCam(true);
        
        if (this.timerElement) this.timerElement.style.display = 'none';

        if (mapId !== 'replay') {
             this.updateUIToEditorMode(); 
             await this.loadMapForEditing(mapId);
        }
    }
    
    createToolboxUI() {
        const toolbox = document.getElementById('toolbox');
        if (!toolbox) return;
        
        // Build dynamic sections from registries
        const specialTilesButtons = [
            // LAVA has settings row
            `<div class="flex items-center gap-1 mt-1">`+
            `<button class="tool-btn flex-grow" data-tool="tile" data-type="LAVA">용암</button>`+
            `<button id="lavaSettingsBtn" class="p-2 rounded hover:bg-gray-600">⚙️</button>`+
            `</div>`,
            // Simple special tiles
            ...SpecialTileRegistry.map(t => `<button class="tool-btn" data-tool="tile" data-type="${t.type}">${t.label}</button>`),
            // Replication tile with input
            `<div class="flex items-center gap-2 mt-1">`+
            `<button class="tool-btn flex-grow" data-tool="tile" data-type="REPLICATION_TILE">+N 복제</button>`+
            `<input type="number" id="replicationValue" value="${this.replicationValue}" min="1" class="modal-input w-16">`+
            `</div>`,
            // Dash tile with settings
            `<div class="flex items-center gap-1 mt-1">`+
            `<button class="tool-btn flex-grow" data-tool="tile" data-type="DASH_TILE">돌진 타일</button>`+
            `<button id="dashTileSettingsBtn" class="p-2 rounded hover:bg-gray-600">⚙️</button>`+
            `</div>`,
            // Growing/Auto field
            `<div class="flex items-center gap-1 mt-1">`+
            `<button class="tool-btn flex-grow" data-tool="growing_field">성장형 자기장</button>`+
            `<button id="growingFieldSettingsBtn" class="p-2 rounded hover:bg-gray-600">⚙️</button>`+
            `</div>`,
            `<div class="flex items-center gap-1 mt-1">`+
            `<button class="tool-btn flex-grow" data-tool="auto_field">자동 자기장</button>`+
            `<button id="autoFieldSettingsBtn" class="p-2 rounded hover:bg-gray-600">⚙️</button>`+
            `</div>`
        ].join('');

        const weaponButtons = [
            ...WeaponRegistry.map(w => {
                if (w.hasSettings) {
                    return `<div class="flex items-center gap-1">`+
                        `<button class="tool-btn flex-grow" data-tool="weapon" data-type="${w.type}">${w.label}</button>`+
                        `<button id="${w.settingsBtnId}" class="p-2 rounded hover:bg-gray-600">⚙️</button>`+
                    `</div>`;
                }
                return `<button class="tool-btn" data-tool="weapon" data-type="${w.type}">${w.label}</button>`;
            })
        ].join('');
        
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
                    ${specialTilesButtons}
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
                    ${weaponButtons}
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
            isLevelUpEnabled: this.isLevelUpEnabled,
            floorColor: this.currentFloorColor,
            wallColor: this.currentWallColor,
            recentFloorColors: this.recentFloorColors,
            recentWallColors: this.recentWallColors,
            isLavaAvoidanceEnabled: this.isLavaAvoidanceEnabled,
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
        
        if (!mapGridData) return;

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

        document.getElementById('closeLavaSettingsModal').addEventListener('click', () => {
            this.isLavaAvoidanceEnabled = document.getElementById('lavaAvoidanceToggle').checked;
            document.getElementById('lavaSettingsModal').classList.remove('show-modal');
        });

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
                isLevelUpEnabled: false,
                floorColor: COLORS.FLOOR, wallColor: COLORS.WALL,
                recentFloorColors: [], recentWallColors: [],
                isLavaAvoidanceEnabled: true,
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
            document.getElementById('levelUpToggle').checked = this.isLevelUpEnabled;
            document.getElementById('mapSettingsModal').classList.add('show-modal');
        });

        document.getElementById('levelUpToggle').addEventListener('change', (e) => {
            this.isLevelUpEnabled = e.target.checked;
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
        // Eye size slider events
        const eyeSliderEv = document.getElementById('unitEyeSizeControl');
        if (eyeSliderEv) {
            eyeSliderEv.addEventListener('input', (e) => {
                this.unitEyeScale = parseFloat(e.target.value);
                localStorage.setItem('unitEyeScale', this.unitEyeScale);
                const label = document.getElementById('unitEyeSizeValue');
                if (label) label.textContent = this.unitEyeScale.toFixed(2);
                this.draw();
            });
        }

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
            } else if (target.id === 'lavaSettingsBtn' || target.parentElement.id === 'lavaSettingsBtn') {
                document.getElementById('lavaAvoidanceToggle').checked = this.isLavaAvoidanceEnabled;
                document.getElementById('lavaSettingsModal').classList.add('show-modal');
            } else if (target.id === 'dashTileSettingsBtn' || target.parentElement.id === 'dashTileSettingsBtn') {
                document.getElementById('dashTileDirection').value = this.dashTileSettings.direction;
                document.getElementById('dashTileModal').classList.add('show-modal');
            } else if (target.id === 'autoFieldSettingsBtn' || target.parentElement.id === 'autoFieldSettingsBtn') {
                 document.getElementById('autoFieldActiveToggle').checked = this.autoMagneticField.isActive;
                document.getElementById('autoFieldShrinkTime').value = this.autoMagneticField.totalShrinkTime / 60;
                document.getElementById('autoFieldSafeZoneSize').value = this.autoMagneticField.safeZoneSize;
                document.getElementById('autoFieldShrinkType').value = this.autoMagneticField.shrinkType || 'all';
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
            this.autoMagneticField.shrinkType = document.getElementById('autoFieldShrinkType').value;
            document.getElementById('autoFieldModal').classList.remove('show-modal');
        });
        document.getElementById('autoFieldDefaultBtn').addEventListener('click', () => {
            this.autoMagneticField = { isActive: false, totalShrinkTime: 60 * 60, safeZoneSize: 6, shrinkType: 'all', simulationTime: 0, currentBounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 } };
            document.getElementById('autoFieldActiveToggle').checked = this.autoMagneticField.isActive;
            document.getElementById('autoFieldShrinkTime').value = this.autoMagneticField.totalShrinkTime / 60;
            document.getElementById('autoFieldSafeZoneSize').value = this.autoMagneticField.safeZoneSize;
            document.getElementById('autoFieldShrinkType').value = this.autoMagneticField.shrinkType;
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
        
        document.getElementById('nametagColorPicker').addEventListener('input', (e) => {
            this.nametagColor = e.target.value;
        });
        document.getElementById('nametagColorBlack').addEventListener('click', () => {
            this.nametagColor = '#000000';
            document.getElementById('nametagColorPicker').value = '#000000';
        });
        document.getElementById('nametagColorWhite').addEventListener('click', () => {
            this.nametagColor = '#FFFFFF';
            document.getElementById('nametagColorPicker').value = '#FFFFFF';
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
        if (this.timerElement) this.timerElement.style.display = 'none';
        this.disableDeterministicRng();
        this.draw();
    }
    
    startSimulation() {
        if (this.state !== 'EDIT') return;

        this.units.forEach(unit => unit.level = 1);

        if (!this.isReplayMode) {
            this.simulationSeed = Date.now();
        }
        this.prng = new SeededRandom(this.simulationSeed);
        this.enableDeterministicRng();
        
        this.usedNametagsInSim.clear();

        if (this.isNametagEnabled && this.nametagList.length > 0) {
            this.units.forEach(unit => {
                unit.name = '';
                unit.nameColor = this.nametagColor;
            });

            const shuffledNames = [...this.nametagList].sort(() => 0.5 - this.uiPrng.next());
            
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
        
        this.simulationTime = 0;
        if (this.timerElement) {
            this.timerElement.style.display = 'block';
            this.timerElement.textContent = '00:00';
        }
        
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
        this.enableDeterministicRng();

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
        
        if (this.timerElement) this.timerElement.style.display = 'none';
        
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

            let tileColor;
            if (tileType === TILE.WALL) {
                tileColor = this.currentWallColor;
                this.addRecentColor(tileColor, 'wall');
            } else if (tileType === TILE.FLOOR) {
                tileColor = this.currentFloorColor;
                this.addRecentColor(tileColor, 'floor');
            }

            this.map[y][x] = {
                type: tileType,
                hp: tileType === TILE.CRACKED_WALL ? 50 : undefined,
                color: tileColor,
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
        
        if (this.timerElement && (this.state === 'SIMULATE' || this.state === 'PAUSED' || this.state === 'ENDING' || this.state === 'DONE')) {
            const minutes = Math.floor(this.simulationTime / 60).toString().padStart(2, '0');
            const seconds = Math.floor(this.simulationTime % 60).toString().padStart(2, '0');
            this.timerElement.textContent = `${minutes}:${seconds}`;
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
                    mapHeight: this.canvas.height,
                    floorColor: this.currentFloorColor,
                    wallColor: this.currentWallColor,
                    isLevelUpEnabled: this.isLevelUpEnabled,
                    hadokenKnockback: this.hadokenKnockback,
                    isLavaAvoidanceEnabled: this.isLavaAvoidanceEnabled,
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

        if (this.state === 'SIMULATE') {
            this.simulationTime += 1 / 60;
        }

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

            if (this.autoMagneticField.shrinkType === 'vertical') {
                const finalHeight = this.autoMagneticField.safeZoneSize;
                const finalMinY = (this.ROWS - finalHeight) / 2;
                const finalMaxY = (this.ROWS + finalHeight) / 2;
                this.autoMagneticField.currentBounds = {
                    minX: 0,
                    maxX: this.COLS,
                    minY: 0 + (finalMinY - 0) * progress,
                    maxY: this.ROWS - (this.ROWS - finalMaxY) * progress,
                };
            } else { // 'all'
                const finalWidth = this.autoMagneticField.safeZoneSize;
                const finalHeight = this.autoMagneticField.safeZoneSize;
                const finalMinX = (this.COLS - finalWidth) / 2;
                const finalMaxX = (this.COLS + finalWidth) / 2;
                const finalMinY = (this.ROWS - finalHeight) / 2;
                const finalMaxY = (this.ROWS + finalHeight) / 2;
                this.autoMagneticField.currentBounds = {
                    minX: 0 + (finalMinX - 0) * progress,
                    maxX: this.COLS - (this.COLS - finalMaxX) * progress,
                    minY: 0 + (finalMinY - 0) * progress,
                    maxY: this.ROWS - (this.ROWS - finalMaxY) * progress,
                };
            }
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

        if (this.isLevelUpEnabled) {
            deadUnits.forEach(deadUnit => {
                if (deadUnit.killedBy && deadUnit.killedBy.hp > 0) {
                    deadUnit.killedBy.levelUp(deadUnit.level);
                }
            });
        }

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
                    
                    if (p.type === 'bouncing_sword') {
                        this.applyDamage(unit, p.damage, {}, p.owner);
                        p.owner.dualSwordTeleportTarget = unit;
                        p.owner.dualSwordTeleportDelayTimer = 60;
                        p.destroyed = true;
                        hit = true;
                        break; 
                    }

                    p.hitTargets.add(unit);
                    hit = true;
        
                    if (p.type === 'boomerang_projectile') {
                        unit.isBeingPulled = true;
                        unit.puller = p.owner;
                        const pullToX = p.owner.pixelX + Math.cos(p.owner.facingAngle) * GRID_SIZE;
                        const pullToY = p.owner.pixelY + Math.sin(p.owner.facingAngle) * GRID_SIZE;
                        unit.pullTargetPos = { x: pullToX, y: pullToY };
                    } else if (p.type === 'ice_diamond_projectile') {
                        this.applyDamage(unit, p.damage, { slow: 120 }, p.owner);
                    } else if (p.type === 'fireball_projectile') {
                        this.applyDamage(unit, p.damage, {}, p.owner);
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
                    } else if (p.type === 'lightning_bolt') {
                        this.applyDamage(unit, p.damage, {}, p.owner);
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
                    } else {
                        const effectInfo = {
                            interrupt: p.type === 'hadoken',
                            force: p.knockback,
                            angle: p.angle
                        };
                        this.applyDamage(unit, p.damage, effectInfo, p.owner);
                        if (p.type === 'hadoken') this.audioManager.play('hadokenHit');
                    }
        
                    if (!p.piercing) {
                        if (p.type !== 'lightning_bolt' && p.type !== 'fireball_projectile') {
                            p.destroyed = true;
                            break;
                        }
                    }
                }
            }
        
            if (!hit) {
                for (const nexus of this.nexuses) {
                    if (p.owner.team !== nexus.team && Math.hypot(p.pixelX - nexus.pixelX, p.pixelY - nexus.pixelY) < GRID_SIZE) {
                        if (p.type === 'ice_diamond_projectile') {
                           this.applyDamage(nexus, p.damage, {}, p.owner);
                        } else if (p.type === 'fireball_projectile') {
                            this.applyDamage(nexus, p.damage, {}, p.owner);
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
                            this.applyDamage(nexus, p.damage, {}, p.owner);
                            if (p.type === 'hadoken') this.audioManager.play('hadokenHit');
                        }
                        hit = true;
                        if (!p.piercing) {
                           p.destroyed = true;
                        }
                        break;
                    }
                }
            }
        
            if (p.pixelX < 0 || p.pixelX > this.canvas.width || p.pixelY < 0 || p.pixelY > this.canvas.height) {
                p.destroyed = true;
            }

            if (hit && p.type === 'fireball_projectile' && !p.destroyed) {
                createFireballHitEffect(this, p.pixelX, p.pixelY);
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
                    this.applyDamage(unit, 15, { stun: 120, stunSource: 'magic_circle' });
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
    
    draw(mouseEvent = null) { return drawImpl.call(this, mouseEvent); }

    drawMap() { return drawMapImpl.call(this); }
    
    hasLineOfSight(startUnit, endTarget, isWeaponCheck = false) { return hasLineOfSightImpl.call(this, startUnit, endTarget, isWeaponCheck); }
    
    hasLineOfSightForWeapon(startUnit, endTarget) { return hasLineOfSightForWeaponImpl.call(this, startUnit, endTarget); }

    createWeapon(x, y, type) { return applyWeaponBonuses(new Weapon(this, x, y, type)); }

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
                            newUnit.nameColor = this.nametagColor;
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
    applyDamage(target, damage, effectInfo = {}, attacker = null) { return applyDamageImpl.call(this, target, damage, effectInfo, attacker); }
    
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

    damageTile(x, y, damage) { return damageTileImpl.call(this, x, y, damage); }
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

    isPosInAnyField(gridX, gridY) { return isPosInAnyFieldImpl.call(this, gridX, gridY); }

    findClosestSafeSpot(pixelX, pixelY) { return findClosestSafeSpotImpl.call(this, pixelX, pixelY); }

    isPosInLavaForUnit(gridX, gridY) { return isPosInLavaForUnitImpl.call(this, gridX, gridY); }

    findClosestSafeSpotFromLava(pixelX, pixelY) { return findClosestSafeSpotFromLavaImpl.call(this, pixelX, pixelY); }
    
    findClosestEnemy(x, y, ownerTeam, excludeSet) { return findClosestEnemyImpl.call(this, x, y, ownerTeam, excludeSet); }

    findEmptySpotNear(targetUnit) { return findEmptySpotNearImpl.call(this, targetUnit); }

    findStunnedEnemy(team) {
        return this.units.find(u => u.team !== team && u.isStunned > 0);
    }

    findStunnedByMagicCircleEnemy(team) {
        return this.units.find(u => u.team !== team && u.isStunned > 0 && u.stunnedByMagicCircle);
    }

    spawnMagicCircle(team) { return spawnMagicCircleImpl.call(this, team); }

    spawnRandomWeaponNear(pos) { return spawnRandomWeaponNearImpl.call(this, pos); }

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
            isActive: false, safeZoneSize: 6, simulationTime: 0, shrinkType: 'all',
            totalShrinkTime: 60 * 60, currentBounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 }
        };
        this.hadokenKnockback = mapData.hadokenKnockback || 15;
        
        this.isLevelUpEnabled = mapData.isLevelUpEnabled || false;
        this.isLavaAvoidanceEnabled = mapData.isLavaAvoidanceEnabled !== undefined ? mapData.isLavaAvoidanceEnabled : true;

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
        
        this.isLevelUpEnabled = mapData.isLevelUpEnabled || false;
        this.isLavaAvoidanceEnabled = mapData.isLavaAvoidanceEnabled !== undefined ? mapData.isLavaAvoidanceEnabled : true;
        
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
        
        if (this.timerElement) this.timerElement.style.display = 'none';
        
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
        
        const mapGridData = (typeof mapData.map === 'string') ? JSON.parse(mapData.map) : mapData.map;
        const floorColors = new Set(this.recentFloorColors);
        const wallColors = new Set(this.recentWallColors);
        
        if (mapGridData) {
            mapGridData.forEach(row => {
                row.forEach(tile => {
                    if (tile.type === TILE.FLOOR && tile.color) {
                        floorColors.add(tile.color);
                    } else if (tile.type === TILE.WALL && tile.color) {
                        wallColors.add(tile.color);
                    }
                });
            });
        }
    
        this.recentFloorColors = [...floorColors].slice(0, MAX_RECENT_COLORS);
        this.recentWallColors = [...wallColors].slice(0, MAX_RECENT_COLORS);
    
        const floorColor = mapData.floorColor || (this.recentFloorColors.length > 0 ? this.recentFloorColors[0] : COLORS.FLOOR);
        const wallColor = mapData.wallColor || (this.recentWallColors.length > 0 ? this.recentWallColors[0] : COLORS.WALL);
        
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
                this.nametagColor = settings.color || '#000000';
            } else {
                this.isNametagEnabled = false;
                this.nametagList = [];
                this.nametagColor = '#000000';
            }
        } catch (error) {
            console.error("Error loading nametag settings:", error);
            this.isNametagEnabled = false;
            this.nametagList = [];
            this.nametagColor = '#000000';
        }
        
        document.getElementById('nametagToggle').checked = this.isNametagEnabled;
        document.getElementById('nametagColorPicker').value = this.nametagColor;
        this.renderNametagList();
    }
    
    async saveNametagSettings() {
        if (!this.currentUser) {
            alert("이름표 설정을 저장하려면 로그인이 필요합니다.");
            return;
        }
        this.isNametagEnabled = document.getElementById('nametagToggle').checked;
        this.nametagColor = document.getElementById('nametagColorPicker').value;
        const settingsData = {
            enabled: this.isNametagEnabled,
            list: this.nametagList,
            color: this.nametagColor
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
            ...this.lastSimulationResult,
            rngPolicy: this.rngPolicy
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
            floorColor: replayData.floorColor,
            wallColor: replayData.wallColor,
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
        this.rngPolicy = replayData.rngPolicy || 'legacy';
        this.currentMapId = replayId; 
        this.currentMapName = replayData.name;

        if (this.rngPolicy === 'seeded_v2') this.enableDeterministicRng();
        else this.disableDeterministicRng();

        this.isLevelUpEnabled = replayData.isLevelUpEnabled || false;
        this.hadokenKnockback = replayData.hadokenKnockback || 15;
        this.isLavaAvoidanceEnabled = replayData.isLavaAvoidanceEnabled !== undefined ? replayData.isLavaAvoidanceEnabled : false;

        this.canvas.width = replayData.mapWidth;
        this.canvas.height = replayData.mapHeight;
        const map = JSON.parse(replayData.initialMapState);
        this.COLS = map[0].length;
        this.ROWS = map.length;
        this.map = map;

        const mapColorData = {
            floorColor: replayData.floorColor,
            wallColor: replayData.wallColor,
            map: replayData.initialMapState,
            recentFloorColors: replayData.recentFloorColors,
            recentWallColors: replayData.recentWallColors
        };
        this.handleMapColors(mapColorData);

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
        const toolbox = document.getElementById('toolbox');
        toolbox.style.display = 'flex';
        toolbox.classList.add('replay-mode');

        const utilsHeader = toolbox.querySelector('[data-target="category-utils"]');
        const utilsContent = document.getElementById('category-utils');
        if (utilsHeader && utilsContent) {
            utilsHeader.classList.remove('collapsed');
            utilsContent.classList.remove('collapsed');
        }

        document.getElementById('editor-controls').style.display = 'none';
        document.getElementById('simResetBtn').style.display = 'none';
        const placementResetBtn = document.getElementById('simPlacementResetBtn');
        placementResetBtn.textContent = '리플레이 초기화';
        placementResetBtn.style.display = 'inline-block';
    }

    updateUIToEditorMode() {
        const toolbox = document.getElementById('toolbox');
        toolbox.style.display = 'flex';
        toolbox.classList.remove('replay-mode');

        document.getElementById('editor-controls').style.display = 'flex';
        document.getElementById('simResetBtn').style.display = 'inline-block';
        const placementResetBtn = document.getElementById('simPlacementResetBtn');
        placementResetBtn.textContent = '배치 초기화';
        placementResetBtn.style.display = 'inline-block';
    }
}

