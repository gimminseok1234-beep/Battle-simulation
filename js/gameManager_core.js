import { Unit } from './unit.js';
import { Weapon, Projectile, AreaEffect, Effect, MagicDaggerDashEffect, createFireballHitEffect, Particle } from './weaponary.js';
import { Nexus, GrowingMagneticField, MagicCircle, PoisonCloud } from './entities.js';
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { AudioManager } from './audioManager.js';
import { TILE, TEAM, COLORS, GRID_SIZE } from './constants.js';
import { localMaps } from './maps/index.js';
import { GameUIManager } from './gameManager_ui.js';

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
        
        this.initialUnitsState = [];
        this.initialWeaponsState = [];
        this.initialNexusesState = [];
        this.initialMapState = [];
        this.initialGrowingFieldsState = [];
        this.initialAutoFieldState = {};
        this.animationFrameId = null;
        this.animationFrameCounter = 0;
        this.gameSpeed = 1;
       
        this.isActionCam = false;
        this.actionCam = {
            current: { x: 0, y: 0, scale: 1 },
            target: { x: 0, y: 0, scale: 1 },
            isAnimating: false
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
        
        // [오류 수정] UI Manager가 UI 관련 작업을 전담하도록 합니다.
        // 기존에는 GameManager에 UI와 핵심 로직이 혼재되어 있었습니다.
        this.uiManager = new GameUIManager(this);

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
        // [오류 수정] UI 생성 및 이벤트 리스너 설정을 UI Manager가 담당하도록 책임을 위임합니다.
        this.uiManager.createToolboxUI();
        this.uiManager.setupEventListeners();
        this.uiManager.showHomeScreen();
        await this.loadNametagSettings();
    }
   
    // [오류 수정] 이하는 UI Manager로 이동했거나, 누락되었던 핵심 로직 함수들입니다.

    /**
     * [누락 기능 추가] 마우스 좌표를 캔버스 좌표로 변환하는 함수.
     * 이 함수가 없으면 마우스 클릭/드래그가 작동하지 않습니다.
     */
    getMousePos(evt) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const rawX = (evt.clientX - rect.left) * scaleX;
        const rawY = (evt.clientY - rect.top) * scaleY;

        const cam = this.actionCam;
        const mouseX = (rawX - this.canvas.width / 2) / cam.current.scale + cam.current.x;
        const mouseY = (rawY - this.canvas.height / 2) / cam.current.scale + cam.current.y;

        return {
            pixelX: mouseX,
            pixelY: mouseY,
            gridX: Math.floor(mouseX / GRID_SIZE),
            gridY: Math.floor(mouseY / GRID_SIZE)
        };
    }

    /**
     * [누락 기능 추가] 무기 객체를 생성하는 함수.
     * 무기의 능력치를 정의하는 핵심 로직이므로 Core 파일에 위치해야 합니다.
     */
    createWeapon(x, y, type) {
        const weapon = new Weapon(this, x, y, type);
        if (type === 'sword') weapon.attackPowerBonus = 15;
        else if (type === 'bow') { weapon.attackPowerBonus = 10; weapon.attackRangeBonus = 5 * GRID_SIZE; weapon.detectionRangeBonus = 4 * GRID_SIZE; }
        else if (type === 'ice_diamond') { weapon.attackPowerBonus = 8; weapon.attackRangeBonus = 5 * GRID_SIZE; weapon.detectionRangeBonus = 4 * GRID_SIZE; }
        else if (type === 'dual_swords') { weapon.attackPowerBonus = 3; weapon.speedBonus = 0.6; weapon.attackCooldownBonus = -40; }
        else if (type === 'fire_staff') { weapon.attackPowerBonus = 25; weapon.attackRangeBonus = 6 * GRID_SIZE; weapon.detectionRangeBonus = 2 * GRID_SIZE; }
        else if (type === 'hadoken') { weapon.attackPowerBonus = 20; weapon.attackRangeBonus = 5 * GRID_SIZE; weapon.detectionRangeBonus = 4 * GRID_SIZE; }
        else if (type === 'shuriken') { weapon.attackPowerBonus = 12; weapon.speedBonus = 0.3; weapon.attackCooldownBonus = 100; weapon.attackRangeBonus = 5 * GRID_SIZE; weapon.detectionRangeBonus = 4 * GRID_SIZE; }
        else if (type === 'lightning') { weapon.attackPowerBonus = 8; weapon.attackRangeBonus = 6 * GRID_SIZE; weapon.attackCooldownBonus = -20; }
        else if (type === 'magic_spear') { weapon.attackRangeBonus = 5 * GRID_SIZE; weapon.normalAttackPowerBonus = 5; weapon.specialAttackPowerBonus = 15; }
        else if (type === 'boomerang') { weapon.attackPowerBonus = 10; weapon.attackRangeBonus = 7 * GRID_SIZE; weapon.detectionRangeBonus = 6 * GRID_SIZE; }
        else if (type === 'poison_potion') weapon.attackPowerBonus = 10;
        else if (type === 'magic_dagger') weapon.attackPowerBonus = 12;
        else if (type === 'axe') { weapon.attackPowerBonus = 18; weapon.attackRangeBonus = -0.2 * GRID_SIZE; }
        else if (type === 'crown') weapon.attackPowerBonus = 5;
        return weapon;
    }

    /**
     * [누락 기능 추가] 두 지점 사이에 벽이 있는지 확인합니다. 유닛의 시야 판정에 사용됩니다.
     */
    hasLineOfSight(unit, target) {
        let x0 = Math.floor(unit.pixelX / GRID_SIZE);
        let y0 = Math.floor(unit.pixelY / GRID_SIZE);
        const x1 = Math.floor(target.pixelX / GRID_SIZE);
        const y1 = Math.floor(target.pixelY / GRID_SIZE);

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = (x0 < x1) ? 1 : -1;
        const sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;

        while (true) {
            if (x0 === x1 && y0 === y1) break;
            const tile = this.map[y0]?.[x0];
            if (tile && (tile.type === TILE.WALL || tile.type === TILE.GLASS_WALL)) {
                return false;
            }

            const e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
        return true;
    }

    /**
     * [누락 기능 추가] 유닛과 무기 사이에 벽이 있는지 확인합니다.
     */
    hasLineOfSightForWeapon(unit, weapon) {
        return this.hasLineOfSight(unit, { pixelX: weapon.pixelX, pixelY: weapon.pixelY });
    }

    /**
     * [누락 기능 추가] 유닛을 복제하거나 스폰합니다.
     */
    spawnUnit(spawner, isClone) {
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const x = spawner.gridX + dx;
                const y = spawner.gridY + dy;
                if (y >= 0 && y < this.ROWS && x >= 0 && x < this.COLS && this.map[y][x].type === TILE.FLOOR) {
                    if (!this.units.some(u => u.gridX === x && u.gridY === y)) {
                        const newUnit = new Unit(this, x, y, spawner.team);
                        if (isClone && spawner.weapon) {
                            newUnit.equipWeapon(spawner.weapon.type, true);
                        }
                        this.units.push(newUnit);
                        return;
                    }
                }
            }
        }
    }
    
    /**
     * [누락 기능 추가] 타일에 피해를 줍니다. (예: 부서지는 벽)
     */
    damageTile(x, y, damage) {
        const tile = this.map[y]?.[x];
        if (tile && tile.type === TILE.CRACKED_WALL) {
            tile.hp -= damage;
            if (tile.hp <= 0) {
                this.map[y][x] = { type: TILE.FLOOR, color: this.uiManager.currentFloorColor };
                this.audioManager.play('crackedWallBreak');
            }
        }
    }

    /**
     * [누락 기능 추가] 투사체를 생성합니다.
     */
    createProjectile(owner, target, type, options = {}) {
        this.projectiles.push(new Projectile(this, owner, target, type, options));
    }

    /**
     * [누락 기능 추가] 시각 효과(예: 베기 효과)를 생성합니다.
     */
    createEffect(type, x, y, target = null) {
        this.effects.push(new Effect(this, x, y, type, target));
    }
    
    /**
     * [누락 기능 추가] 광역 효과(예: 독 안개)를 생성합니다.
     */
    castAreaSpell(position, type, team) {
        if (type === 'poison_cloud') {
            this.poisonClouds.push(new PoisonCloud(this, position.x, position.y, team));
        }
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
            this.uiManager.showAlert('맵을 저장하려면 로그인이 필요하며, 맵 이름이 지정되어야 합니다.');
            return;
        }

        if (!this.currentMapId || this.currentMapId.startsWith('local_')) {
            const newName = prompt("새로운 맵의 이름을 입력하세요:", this.currentMapName);
            if (newName) {
                this.currentMapName = newName;
                this.currentMapId = `map_${Date.now()}`;
            } else {
                return;
            }
        }

        const plainUnits = this.units.map(u => ({
            gridX: u.gridX, gridY: u.gridY, team: u.team, hp: u.hp,
            isKing: u.isKing, name: u.name,
            weapon: u.weapon ? { type: u.weapon.type } : null
        }));
        const plainWeapons = this.weapons.map(w => ({ gridX: w.gridX, gridY: w.gridY, type: w.type }));
        const plainNexuses = this.nexuses.map(n => ({ gridX: n.gridX, gridY: n.gridY, team: n.team, hp: n.hp }));
        const plainGrowingFields = this.growingFields.map(f => ({
            id: f.id, gridX: f.gridX, gridY: f.gridY, width: f.width, height: f.height,
            direction: f.direction, totalFrames: f.totalFrames, delay: f.delay
        }));

        const mapData = {
            name: this.currentMapName, width: this.canvas.width, height: this.canvas.height,
            map: JSON.stringify(this.map), units: plainUnits, weapons: plainWeapons,
            nexuses: plainNexuses, growingFields: plainGrowingFields,
            autoMagneticField: this.autoMagneticField, hadokenKnockback: this.hadokenKnockback,
            floorColor: this.uiManager.currentFloorColor, wallColor: this.uiManager.currentWallColor,
            recentFloorColors: this.uiManager.recentFloorColors, recentWallColors: this.uiManager.recentWallColors,
        };

        const mapDocRef = doc(this.db, "maps", this.currentUser.uid, "userMaps", this.currentMapId);
        try {
            await setDoc(mapDocRef, mapData, { merge: true });
            this.uiManager.showAlert(`'${this.currentMapName}' 맵이 Firebase에 성공적으로 저장되었습니다!`);
        } catch (error) {
            console.error("Error saving map to Firebase: ", error);
            this.uiManager.showAlert('맵 저장에 실패했습니다.');
        }
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
        this.COLS = Math.floor(this.canvas.width / GRID_SIZE);
        this.ROWS = Math.floor(this.canvas.height / GRID_SIZE);
        this.resetMap();
    }

    resetMap() {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
        this.state = 'EDIT';
        this.map = Array(this.ROWS).fill().map(() => Array(this.COLS).fill().map(() => ({ type: TILE.FLOOR, color: this.uiManager.currentFloorColor })));
        this.units = []; this.weapons = []; this.nexuses = []; this.growingFields = [];
        this.effects = []; this.projectiles = []; this.areaEffects = []; this.magicCircles = []; this.poisonClouds = []; this.particles = [];
        this.initialUnitsState = []; this.initialWeaponsState = []; this.initialNexusesState = [];
        this.initialMapState = []; this.initialGrowingFieldsState = []; this.initialAutoFieldState = {};
        this.usedNametagsInSim.clear();
        this.uiManager.updateStatusText("에디터 모드");
        this.uiManager.toggleSimButtons('EDIT');
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

        const cleanDataForJSON = (obj) => { const data = { ...obj }; delete data.gameManager; return data; };
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
        this.magicCircles = []; this.poisonClouds = []; this.particles = [];

        this.state = 'SIMULATE';
        this.uiManager.updateStatusText("시뮬레이션 진행 중...");
        this.uiManager.toggleSimButtons('SIMULATE');
        
        if (!this.isReplayMode) {
            document.getElementById('toolbox').style.pointerEvents = 'none';
        }
        this.gameLoop();
    }

    resetPlacement() {
        if (this.initialUnitsState.length === 0) {
            if (this.isReplayMode) {
                 this.uiManager.loadReplay(this.currentMapId);
                 return;
            }
            console.warn("배치 초기화를 하려면 먼저 시뮬레이션을 한 번 시작해야 합니다.");
            return;
        }

        if (this.simulationSeed) this.prng = new SeededRandom(this.simulationSeed);
        else this.prng = new SeededRandom(Date.now());

        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
        this.state = 'EDIT';

        this.units = JSON.parse(this.initialUnitsState).map(uData => {
            const unit = Object.assign(new Unit(this, uData.gridX, uData.gridY, uData.team), uData);
            if (uData.weapon && uData.weapon.type) unit.equipWeapon(uData.weapon.type, unit.isKing);
            return unit;
        });
        this.weapons = JSON.parse(this.initialWeaponsState).map(wData => Object.assign(new Weapon(this, wData.gridX, wData.gridY, wData.type), wData));
        this.nexuses = JSON.parse(this.initialNexusesState).map(nData => Object.assign(new Nexus(this, nData.gridX, nData.gridY, nData.team), nData));
        
        this.map = JSON.parse(this.initialMapState);
        this.growingFields = JSON.parse(this.initialGrowingFieldsState).map(fieldData => {
             const settings = { direction: fieldData.direction, speed: fieldData.totalFrames / 60, delay: fieldData.delay / 60 };
            return new GrowingMagneticField(this, fieldData.id, fieldData.gridX, fieldData.gridY, fieldData.width, fieldData.height, settings);
        });
        this.autoMagneticField = JSON.parse(this.initialAutoFieldState);
        this.effects = []; this.projectiles = []; this.areaEffects = []; this.magicCircles = []; this.poisonClouds = []; this.particles = [];
        this.usedNametagsInSim.clear();
        this.uiManager.updateStatusText("에디터 모드");
        this.uiManager.toggleSimButtons('EDIT');
        
        if (!this.isReplayMode) this.uiManager.updateUIToEditorMode();
        else this.uiManager.updateUIToReplayMode();

        this.resetActionCam(true);
        this.draw();
    }
    
    pauseSimulation() {
        if (this.state !== 'SIMULATE') return;
        this.state = 'PAUSED';
        this.uiManager.updateStatusText("일시정지됨");
        this.uiManager.toggleSimButtons('PAUSED');
    }

    playSimulation() {
        if (this.state !== 'PAUSED') return;
        this.state = 'SIMULATE';
        this.uiManager.updateStatusText("시뮬레이션 진행 중...");
        this.uiManager.toggleSimButtons('SIMULATE');
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
            
            let gameOver = false; let winner = null;
            if (this.initialNexusCount >= 2) {
                if (activeNexusTeams.size < 2 || activeUnitTeams.size <= 1) {
                    gameOver = true;
                    if (activeNexusTeams.size < 2) winner = activeNexusTeams.values().next().value || null;
                    else winner = activeUnitTeams.values().next().value || null;
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

            if (gameOver) { this.state = 'ENDING'; this.winnerTeam = winner; }
        } else if (this.state === 'ENDING') {
            const explosionsFinished = this.nexuses.every(n => !n.isDestroying || n.explosionParticles.length === 0);
            if (explosionsFinished) {
                this.state = 'DONE';
                this.lastSimulationResult = {
                    initialMapState: this.initialMapState, initialUnitsState: this.initialUnitsState,
                    initialWeaponsState: this.initialWeaponsState, initialNexusesState: this.initialNexusesState,
                    initialGrowingFieldsState: this.initialGrowingFieldsState, initialAutoFieldState: this.initialAutoFieldState,
                    simulationSeed: this.simulationSeed, mapName: this.currentMapName || '기본 맵',
                    mapWidth: this.canvas.width, mapHeight: this.canvas.height
                };

                if (!this.isReplayMode) document.getElementById('saveReplayBtn').classList.remove('hidden');

                let winnerName = "무승부";
                if(this.winnerTeam) {
                    switch(this.winnerTeam) {
                        case TEAM.A: winnerName = "빨강 팀"; break; case TEAM.B: winnerName = "파랑 팀"; break;
                        case TEAM.C: winnerName = "초록 팀"; break; case TEAM.D: winnerName = "노랑 팀"; break;
                    }
                    this.uiManager.updateStatusText(`${winnerName} 승리!`);
                } else {
                    this.uiManager.updateStatusText("무승부!");
                }
                this.uiManager.toggleSimButtons('DONE');
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
            const finalWidth = this.autoMagneticField.safeZoneSize, finalHeight = this.autoMagneticField.safeZoneSize;
            const finalMinX = (this.COLS - finalWidth) / 2, finalMaxX = (this.COLS + finalWidth) / 2;
            const finalMinY = (this.ROWS - finalHeight) / 2, finalMaxY = (this.ROWS + finalHeight) / 2;
            this.autoMagneticField.currentBounds.minX = 0 + (finalMinX - 0) * progress;
            this.autoMagneticField.currentBounds.maxX = this.COLS - (this.COLS - finalMaxX) * progress;
            this.autoMagneticField.currentBounds.minY = 0 + (finalMinY - 0) * progress;
            this.autoMagneticField.currentBounds.maxY = this.ROWS - (this.ROWS - finalMaxY) * progress;
        }
        
        this.growingFields.forEach(field => field.update());
        
        const unitsBeforeUpdate = this.units.length;
        const unitsByTeam = {};
        for (const unit of this.units) { if (!unitsByTeam[unit.team]) unitsByTeam[unit.team] = []; unitsByTeam[unit.team].push(unit); }
        const allTeamKeys = Object.keys(unitsByTeam);
        
        this.units.forEach(unit => {
            const enemyTeams = allTeamKeys.filter(key => key !== unit.team);
            const enemies = enemyTeams.flatMap(key => unitsByTeam[key]);
            unit.update(enemies, this.weapons, this.projectiles);
        });
        
        const deadUnits = this.units.filter(u => u.hp <= 0);
        deadUnits.forEach(u => u.handleDeath());
        
        this.units = this.units.filter(u => u.hp > 0);
        if (this.units.length < unitsBeforeUpdate) this.audioManager.play('unitDeath');
        
        this.nexuses.forEach(n => n.update());
        this.projectiles.forEach(p => p.update());
        this.projectiles = this.projectiles.filter(p => !p.destroyed);

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i]; let hit = false;
            for (const unit of this.units) {
                if (p.owner.team !== unit.team && !p.hitTargets.has(unit) && Math.hypot(p.pixelX - unit.pixelX, p.pixelY - unit.pixelY) < GRID_SIZE / 2) {
                    p.hitTargets.add(unit); hit = true;
                    if (p.type === 'boomerang_projectile') { unit.isBeingPulled = true; unit.puller = p.owner; const pullToX = p.owner.pixelX + Math.cos(p.owner.facingAngle) * GRID_SIZE; const pullToY = p.owner.pixelY + Math.sin(p.owner.facingAngle) * GRID_SIZE; unit.pullTargetPos = { x: pullToX, y: pullToY }; }
                    else if (p.type === 'ice_diamond_projectile') unit.takeDamage(p.damage, { slow: 120 });
                    else if (p.type === 'fireball_projectile') {
                        unit.takeDamage(p.damage); createFireballHitEffect(this, unit.pixelX, unit.pixelY); p.destroyed = true;
                        const initialHitTargets = new Set([unit]);
                        for (let j = 0; j < 4; j++) {
                            const angle = j * Math.PI / 2;
                            const dummyTarget = { pixelX: unit.pixelX + Math.cos(angle) * 100, pixelY: unit.pixelY + Math.sin(angle) * 100 };
                            this.createProjectile(p.owner, dummyTarget, 'mini_fireball_projectile', { angle, startX: unit.pixelX, startY: unit.pixelY, hitTargets: initialHitTargets });
                        }
                    } else {
                        const effectInfo = { interrupt: p.type === 'hadoken', force: p.knockback, angle: p.angle };
                        unit.takeDamage(p.damage, effectInfo);
                        if (p.type === 'hadoken') this.audioManager.play('hadokenHit');
                    }
                    if (p.type === 'lightning_bolt') {
                        p.destroyed = true; 
                        const potentialTargets = this.units.filter(u => u.team !== p.owner.team && !p.hitTargets.has(u) && u.hp > 0);
                        if (potentialTargets.length > 0) {
                            let closestEnemy = potentialTargets.sort((a, b) => Math.hypot(unit.pixelX - a.pixelX, unit.pixelY - a.pixelY) - Math.hypot(unit.pixelX - b.pixelX, unit.pixelY - b.pixelY))[0];
                            const newProjectile = new Projectile(this, p.owner, closestEnemy, 'lightning_bolt', { hitTargets: p.hitTargets });
                            newProjectile.pixelX = unit.pixelX; newProjectile.pixelY = unit.pixelY;
                            this.projectiles.push(newProjectile);
                        }
                    }
                    if (p.type !== 'lightning_bolt' && p.type !== 'fireball_projectile') break;
                }
            }
            if (!hit) {
                for (const nexus of this.nexuses) {
                    if (p.owner.team !== nexus.team && Math.hypot(p.pixelX - nexus.pixelX, p.pixelY - nexus.pixelY) < GRID_SIZE) {
                        if (p.type === 'ice_diamond_projectile') nexus.takeDamage(p.damage);
                        else if (p.type === 'fireball_projectile') {
                            nexus.takeDamage(p.damage); createFireballHitEffect(this, nexus.pixelX, nexus.pixelY); p.destroyed = true;
                            const initialHitTargets = new Set([nexus]);
                            for (let j = 0; j < 4; j++) {
                                const angle = j * Math.PI / 2;
                                const dummyTarget = { pixelX: nexus.pixelX + Math.cos(angle) * 100, pixelY: nexus.pixelY + Math.sin(angle) * 100 };
                                this.createProjectile(p.owner, dummyTarget, 'mini_fireball_projectile', { angle, startX: nexus.pixelX, startY: nexus.pixelY, hitTargets: initialHitTargets });
                            }
                        } else {
                            nexus.takeDamage(p.damage);
                            if (p.type === 'hadoken') this.audioManager.play('hadokenHit');
                        }
                        hit = true; break;
                    }
                }
            }
            if (hit || p.pixelX < 0 || p.pixelX > this.canvas.width || p.pixelY < 0 || p.pixelY > this.canvas.height) {
                if (p.type === 'fireball_projectile' && !hit) createFireballHitEffect(this, p.pixelX, p.pixelY);
                p.destroyed = true;
            }
        }
        
        this.projectiles = this.projectiles.filter(p => !p.destroyed);
        this.magicCircles.forEach(c => c.update()); this.magicCircles = this.magicCircles.filter(c => c.duration > 0);
        this.poisonClouds.forEach(c => c.update()); this.poisonClouds = this.poisonClouds.filter(c => c.duration > 0);

        for (const unit of this.units) {
            const gridX = Math.floor(unit.pixelX / GRID_SIZE); const gridY = Math.floor(unit.pixelY / GRID_SIZE);
            for (let i = this.magicCircles.length - 1; i >= 0; i--) {
                const circle = this.magicCircles[i];
                if (circle.gridX === gridX && circle.gridY === gridY && circle.team !== unit.team) {
                    unit.takeDamage(0, { stun: 120, stunSource: 'magic_circle' });
                    this.magicCircles.splice(i, 1);
                }
            }
        }
        this.weapons = this.weapons.filter(w => !w.isEquipped);
        this.effects.forEach(e => e.update()); this.effects = this.effects.filter(e => e.duration > 0);
        this.areaEffects.forEach(e => e.update()); this.areaEffects = this.areaEffects.filter(e => e.duration > 0);
        this.particles.forEach(p => p.update(this.gameSpeed)); this.particles = this.particles.filter(p => p.isAlive());
    }
    
    draw(mouseEvent = null) {
        this.ctx.save();
        this.ctx.fillStyle = '#1f2937';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const cam = this.actionCam;
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(cam.current.scale, cam.current.scale);
        this.ctx.translate(-cam.current.x, -cam.current.y);

        this.uiManager.drawMap();
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
                const startX = field.gridX * GRID_SIZE, startY = field.gridY * GRID_SIZE;
                const totalWidth = field.width * GRID_SIZE, totalHeight = field.height * GRID_SIZE;
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

        if (this.state === 'EDIT' && this.uiManager.currentTool.tool === 'growing_field' && this.uiManager.dragStartPos && this.uiManager.isPainting && mouseEvent) {
            const currentPos = this.getMousePos(mouseEvent);
            const x = Math.min(this.uiManager.dragStartPos.gridX, currentPos.gridX) * GRID_SIZE;
            const y = Math.min(this.uiManager.dragStartPos.gridY, currentPos.gridY) * GRID_SIZE;
            const width = (Math.abs(this.uiManager.dragStartPos.gridX - currentPos.gridX) + 1) * GRID_SIZE;
            const height = (Math.abs(this.uiManager.dragStartPos.gridY - currentPos.gridY) + 1) * GRID_SIZE;
            
            this.ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
            this.ctx.fillRect(x, y, width, height);
            this.ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
            this.ctx.strokeRect(x, y, width, height);
        }

        this.ctx.restore();
    }
    
    getTilesOfType(type) {
        const tiles = [];
        for (let y = 0; y < this.ROWS; y++) {
            for (let x = 0; x < this.COLS; x++) {
                if (this.map[y][x].type === type) tiles.push({ x, y });
            }
        }
        return tiles;
    }

    isPosInAnyField(gridX, gridY) {
        if (this.autoMagneticField.isActive) {
            const b = this.autoMagneticField.currentBounds;
            if (gridX < b.minX || gridX >= b.maxX || gridY < b.minY || gridY >= b.maxY) return true;
        }
        for (const field of this.growingFields) {
            if (field.delayTimer < field.delay) continue;
            let isInside = false;
            const currentProgress = field.progress;
            const startX = field.gridX, startY = field.gridY;
            const endX = field.gridX + field.width, endY = field.gridY + field.height;

            if (gridX >= startX && gridX < endX && gridY >= startY && gridY < endY) {
                if (field.direction === 'DOWN') { if (gridY < startY + field.height * currentProgress) isInside = true; }
                else if (field.direction === 'UP') { if (gridY >= endY - field.height * currentProgress) isInside = true; }
                else if (field.direction === 'RIGHT') { if (gridX < startX + field.width * currentProgress) isInside = true; }
                else if (field.direction === 'LEFT') { if (gridX >= endX - field.width * currentProgress) isInside = true; }
            }
            if (isInside) return true;
        }
        return false;
    }

    findClosestSafeSpot(pixelX, pixelY) {
        let closestSpot = null, minDistance = Infinity;
        for (let y = 0; y < this.ROWS; y++) {
            for (let x = 0; x < this.COLS; x++) {
                if (!this.isPosInAnyField(x, y)) {
                    const targetPixelX = x * GRID_SIZE + GRID_SIZE / 2;
                    const targetPixelY = y * GRID_SIZE + GRID_SIZE / 2;
                    const distance = Math.hypot(pixelX - targetPixelX, pixelY - targetPixelY);
                    if (distance < minDistance) { minDistance = distance; closestSpot = { x: targetPixelX, y: targetPixelY }; }
                }
            }
        }
        return closestSpot || { x: this.canvas.width / 2, y: this.canvas.height / 2 };
    }
    
    findStunnedEnemy(team) { return this.units.find(u => u.team !== team && u.isStunned > 0); }
    findStunnedByMagicCircleEnemy(team) { return this.units.find(u => u.team !== team && u.isStunned > 0 && u.stunnedByMagicCircle); }

    spawnMagicCircle(team) {
        const availableTiles = [];
        for (let y = 0; y < this.ROWS; y++) {
            for (let x = 0; x < this.COLS; x++) {
                if (this.map[y][x].type === TILE.FLOOR) {
                    const isOccupied = this.units.some(u => u.gridX === x && u.gridY === y) || this.nexuses.some(n => n.gridX === x && n.gridY === y) || this.magicCircles.some(c => c.gridX === x && c.gridY === y);
                    if (!isOccupied) availableTiles.push({ x, y });
                }
            }
        }
        if (availableTiles.length > 0) {
            const pos = availableTiles[Math.floor(this.random() * availableTiles.length)];
            this.magicCircles.push(new MagicCircle(this, pos.x, pos.y, team));
        }
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
            } else { this.isNametagEnabled = false; this.nametagList = []; }
        } catch (error) {
            console.error("Error loading nametag settings:", error);
            this.isNametagEnabled = false; this.nametagList = [];
        }
        this.uiManager.updateNametagSettingsUI();
    }
    
    async saveNametagSettings() {
        if (!this.currentUser) {
            this.uiManager.showAlert("이름표 설정을 저장하려면 로그인이 필요합니다.");
            return;
        }
        this.isNametagEnabled = document.getElementById('nametagToggle').checked;
        const settingsData = { enabled: this.isNametagEnabled, list: this.nametagList };
        const nametagDocRef = doc(this.db, "users", this.currentUser.uid, "settings", "nametags");
        try {
            await setDoc(nametagDocRef, settingsData);
            this.uiManager.showAlert('이름표 설정이 Firebase에 저장되었습니다.');
        } catch (error) {
            console.error("Error saving nametag settings:", error);
            this.uiManager.showAlert('이름표 설정 저장에 실패했습니다.');
        }
    }
}
