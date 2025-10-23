import { Unit } from './unit.js';
import { Weapon, Projectile, AreaEffect, Effect, MagicDaggerDashEffect, createFireballHitEffect, Particle } from './weaponary.js';
import { Nexus, GrowingMagneticField, MagicCircle, PoisonCloud } from './entities.js';
import { AudioManager } from './audioManager.js';
import { TILE, TEAM, COLORS, GRID_SIZE } from './constants.js';
import { drawImpl, drawMapImpl } from './gameManager.render.js';
import { localMaps } from './maps/index.js';
import { SeededRandom } from './utils.js';
import { UIManager } from './managers/UIManager.js';
import { PersistenceManager } from './managers/PersistenceManager.js';
import { SimulationManager } from './managers/SimulationManager.js';
import { InputManager } from './managers/InputManager.js';

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
        
        // 고품질 렌더링 설정
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        this.ctx.textRenderingOptimization = 'optimizeQuality';
        this.ctx.textBaseline = 'middle';
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
        this.replicationValue = 2;
        this.isActionCam = false;
        this.actionCam = {
            current: { x: 0, y: 0, scale: 1 },
            target: { x: 0, y: 0, scale: 1 },
            isAnimating: false,
            maxZoom: parseFloat(localStorage.getItem('actionCamMaxZoom') || '1.8')
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
            shrinkType: 'all',
            currentBounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 }
        };
        this.hadokenKnockback = 15;
        this.initialNexusCount = 0;
        this.winnerTeam = null;

        // Managers
        this.uiManager = new UIManager(this, this.persistenceManager);
        this.persistenceManager = new PersistenceManager(this);
        this.simulationManager = new SimulationManager(this);
        this.inputManager = new InputManager(this);
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
        
        this.simulationTime = 0;
        this.timerElement = document.getElementById('timerText');

        this.isLavaAvoidanceEnabled = true;

        instance = this;

        // These were in UIManager, but they need access to GameManager state that is not yet initialized.
        // So we keep them here for now.
        this.recentWallColors = [];
        this.recentFloorColors = [];
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
        this.showHomeScreen();
        await this.persistenceManager.loadNametagSettings();
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
        this.persistenceManager.renderMapCards();
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
        this.persistenceManager.renderReplayCards();
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
        
        // Level up system preference
        const levelUpPref = localStorage.getItem('levelUpEnabled');
        this.isLevelUpEnabled = levelUpPref !== null ? (levelUpPref === 'true') : false;

        const outlineEnabledPref = localStorage.getItem('unitOutlineEnabled');
        this.isUnitOutlineEnabled = outlineEnabledPref !== null ? (outlineEnabledPref === 'true') : true;

        const outlineWidthPref = localStorage.getItem('unitOutlineWidth');
        this.unitOutlineWidth = outlineWidthPref !== null ? parseFloat(outlineWidthPref) : 2.5;

        // Eye size preference
        const eyeSizePref = localStorage.getItem('unitEyeScale');
        this.unitEyeScale = eyeSizePref !== null ? parseFloat(eyeSizePref) : 1.04;

        this.resetActionCam(true);
        
        if (this.timerElement) this.timerElement.style.display = 'none';

        if (mapId !== 'replay') {
             this.updateUIToEditorMode(); 
             await this.loadMapForEditing(mapId);
        }
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
                this.uiManager.openRenameModal(mapId, mapData.name, 'map');
            };
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'w-full text-left px-3 py-1.5 text-sm text-red-400 rounded hover:bg-gray-600';
            deleteBtn.textContent = '삭제';
            deleteBtn.onclick = () => {
                menu.style.display = 'none';
                this.uiManager.openDeleteConfirmModal(mapId, mapData.name, 'map');
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
    
    createEmptyMap(width, height) {
        const rows = Math.floor(height / GRID_SIZE);
        const cols = Math.floor(width / GRID_SIZE);
        return Array(rows).fill().map(() => Array(cols).fill({ type: TILE.FLOOR, color: COLORS.FLOOR }));
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

    handleActionCamClick(pos) {
        if (this.actionCam.isAnimating) return;
        if (this.actionCam.target.scale === 1) {
            this.actionCam.target.x = pos.pixelX;
            this.actionCam.target.y = pos.pixelY;
            const maxZ = this.actionCam.maxZoom || 1.8;
            this.actionCam.target.scale = Math.min(maxZ, 3.0);
        } else {
            this.actionCam.target.x = this.canvas.width / 2;
            this.actionCam.target.y = this.canvas.height / 2;
            this.actionCam.target.scale = 1;
        }
        this.actionCam.isAnimating = true;
        if (this.state !== 'SIMULATE' && !this.animationFrameId) this.gameLoop();
        return;
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
        this.map = this.createEmptyMap(this.canvas.width, this.canvas.height);
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

        if (this.currentTool.tool === 'growing_field' && this.inputManager.dragStartPos) {
             const startX = Math.min(this.inputManager.dragStartPos.gridX, x);
             const startY = Math.min(this.inputManager.dragStartPos.gridY, y);
             const endX = Math.max(this.inputManager.dragStartPos.gridX, x);
             const endY = Math.max(this.inputManager.dragStartPos.gridY, y);
             const width = endX - startX + 1;
             const height = endY - startY + 1;
             
             const newZone = new GrowingMagneticField(this, Date.now(), startX, startY, width, height, {...this.growingFieldSettings});
             this.growingFields.push(newZone);
             this.inputManager.dragStartPos = null;
        } else if (this.currentTool.tool === 'tile') {
            if (itemExists) return;
            
            const tileType = TILE[this.currentTool.type];
            if (tileType === TILE.TELEPORTER && this.getTilesOfType(TILE.TELEPORTER).length >= 2) { return; }

            let tileColor;
            if (tileType === TILE.WALL) {
                tileColor = this.currentWallColor;
                this.uiManager.addRecentColor(tileColor, 'wall');
            } else if (tileType === TILE.FLOOR) {
                tileColor = this.currentFloorColor;
                this.uiManager.addRecentColor(tileColor, 'floor');
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

    gameLoop() {
        this.animationFrameCounter++;
        
        if (this.actionCam.isAnimating) {
            const cam = this.actionCam;
            const ease = 0.15; 
            cam.current.x += (cam.target.x - cam.current.x) * ease;
            cam.current.y += (cam.target.y - cam.current.y) * ease;
            cam.current.scale += (cam.target.scale - cam.current.scale) * ease;
            if (cam.maxZoom) {
                cam.current.scale = Math.min(cam.current.scale, cam.maxZoom);
                cam.target.scale = Math.min(cam.target.scale, cam.maxZoom);
            }

            if (Math.abs(cam.current.scale - cam.target.scale) < 0.001 && Math.abs(cam.current.x - cam.target.x) < 0.1) {
                cam.current = { ...cam.target };
                cam.isAnimating = false;
            }
        }

        if (this.state === 'SIMULATE' || this.state === 'ENDING') {
            this.simulationManager.update();
        }
        
        if (this.timerElement && (this.state === 'SIMULATE' || this.state === 'PAUSED' || this.state === 'ENDING' || this.state === 'DONE')) {
            const minutes = Math.floor(this.simulationTime / 60).toString().padStart(2, '0');
            const seconds = Math.floor(this.simulationTime % 60).toString().padStart(2, '0');
            this.timerElement.textContent = `${minutes}:${seconds}`;
        }
        
        this.draw();
        
        if (this.state === 'SIMULATE') {
            this.simulationManager.checkGameOver();
        } else if (this.state === 'ENDING') {
            this.simulationManager.handleEnding();
        }

        if ((this.state === 'DONE' || this.state === 'PAUSED') && !this.actionCam.isAnimating) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        } else {
            this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
        }
    }

    draw(mouseEvent = null) { return drawImpl.call(this, mouseEvent); }

    drawMap() {
        // 고품질 렌더링을 위한 설정
        this.ctx.save();
        this.ctx.imageSmoothingEnabled = false; // 픽셀 아트 스타일을 위해 비활성화
        
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
                
                // 더 선명한 픽셀 렌더링을 위해 정수 좌표 사용
                const pixelX = Math.round(x * GRID_SIZE);
                const pixelY = Math.round(y * GRID_SIZE);
                this.ctx.fillRect(pixelX, pixelY, GRID_SIZE, GRID_SIZE);

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
        
        // 고품질 렌더링 설정 복원
        this.ctx.restore();
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
                if (tile.type === TILE.WALL || tile.type === TILE.CRACKED_WALL) {
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

    isPosInLavaForUnit(gridX, gridY) {
        if (gridY < 0 || gridY >= this.ROWS || gridX < 0 || gridX >= this.COLS) {
            return true;
        }
        return this.map[gridY][gridX].type === TILE.LAVA;
    }

    findClosestSafeSpotFromLava(pixelX, pixelY) {
        let closestSpot = null;
        let minDistance = Infinity;
        const startGridX = Math.floor(pixelX / GRID_SIZE);
        const startGridY = Math.floor(pixelY / GRID_SIZE);

        for (let y = 0; y < this.ROWS; y++) {
            for (let x = 0; x < this.COLS; x++) {
                if (!this.isPosInLavaForUnit(x, y)) {
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
    
    findClosestEnemy(x, y, ownerTeam, excludeSet) {
        let closest = null;
        let minDistance = Infinity;
        for (const unit of this.units) {
            if (unit.team !== ownerTeam && !excludeSet.has(unit) && unit.hp > 0) {
                const dist = Math.hypot(x - unit.pixelX, y - unit.pixelY);
                if (dist < minDistance) {
                    minDistance = dist;
                    closest = unit;
                }
            }
        }
        return closest;
    }

    findEmptySpotNear(targetUnit) {
        const startX = Math.floor(targetUnit.pixelX / GRID_SIZE);
        const startY = Math.floor(targetUnit.pixelY / GRID_SIZE);
    
        for (let radius = 1; radius < 5; radius++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
    
                    const checkX = startX + dx;
                    const checkY = startY + dy;
    
                    if (checkY >= 0 && checkY < this.ROWS && checkX >= 0 && checkX < this.COLS &&
                        (this.map[checkY][checkX].type === TILE.FLOOR || this.map[checkY][checkX].type === TILE.LAVA)) {
                        
                        const isOccupied = this.units.some(u => 
                            Math.floor(u.pixelX / GRID_SIZE) === checkX && 
                            Math.floor(u.pixelY / GRID_SIZE) === checkY
                        );
                        
                        if (!isOccupied) {
                            return { x: checkX * GRID_SIZE + GRID_SIZE / 2, y: checkY * GRID_SIZE + GRID_SIZE / 2 };
                        }
                    }
                }
            }
        }
        return { x: targetUnit.pixelX, y: targetUnit.pixelY };
    }

    findStunnedEnemy(team) {
        return this.units.find(u => u.team !== team && u.isStunned > 0);
    }

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
        const mapData = await this.persistenceManager.getMapById(mapId);
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
        
        // 레벨업 시스템은 홈 설정에서 관리하므로 맵 데이터로 덮어씌우지 않음
        // this.isLevelUpEnabled = mapData.isLevelUpEnabled || false;
        this.isLavaAvoidanceEnabled = mapData.isLavaAvoidanceEnabled !== undefined ? mapData.isLavaAvoidanceEnabled : true;

        this.resetSimulationState();
        this.uiManager.renderRecentColors('floor');
        this.uiManager.renderRecentColors('wall');
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
        
        // 레벨업 시스템은 홈 설정에서 관리하므로 맵 데이터로 덮어씌우지 않음
        // this.isLevelUpEnabled = mapData.isLevelUpEnabled || false;
        this.isLavaAvoidanceEnabled = mapData.isLavaAvoidanceEnabled !== undefined ? mapData.isLavaAvoidanceEnabled : true;
        
        this.resetSimulationState();
        this.uiManager.renderRecentColors('floor');
        this.uiManager.renderRecentColors('wall');
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
            alert(`'${replayName}' 리플레이가 저장되었습니다!`);
        const replays = replaySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const wallColor = mapData.wallColor || (this.recentWallColors.length > 0 ? this.recentWallColors[0] : COLORS.WALL);
        
        this.uiManager.setCurrentColor(floorColor, 'floor', false);
        this.uiManager.setCurrentColor(wallColor, 'wall', false);
    }
    
    createReplayCard(replayData) {
        const card = document.createElement('div');
        card.className = 'relative group bg-gray-800 rounded-lg overflow-hidden flex flex-col cursor-pointer shadow-lg hover:shadow-green-500/30 transition-shadow duration-300';
        
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.map-menu-button')) {
                this.persistenceManager.loadReplay(replayData.id);
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
            this.uiManager.openRenameModal(replayData.id, replayData.name, 'replay');
        };
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'w-full text-left px-3 py-1.5 text-sm text-red-400 rounded hover:bg-gray-600';
        deleteBtn.textContent = '삭제';
        deleteBtn.onclick = () => {
            menu.style.display = 'none';
            this.uiManager.openDeleteConfirmModal(replayData.id, replayData.name, 'replay');
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

    async loadReplay(replayId, replayData) {
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
