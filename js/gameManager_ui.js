import { TILE, COLORS, GRID_SIZE } from './constants.js';
import { Unit } from './unit.js';
import { Nexus, GrowingMagneticField } from './entities.js';

// [오류 수정] GameManager UI 클래스는 게임의 시각적 요소와 사용자 인터페이스를 전담합니다.
// 기존 GameManager 클래스에 혼재되어 있던 UI 관련 기능들을 모두 이 클래스로 이전했습니다.
export class GameUIManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        
        // --- UI 상태 관련 변수 ---
        this.currentTool = { tool: 'tile', type: 'FLOOR' };
        this.isPainting = false;
        this.dragStartPos = null;
        
        // --- 맵 에디터 설정 관련 변수 ---
        this.replicationValue = 2;
        this.dashTileSettings = { direction: 'RIGHT' };
        this.growingFieldSettings = { direction: 'DOWN', speed: 4, delay: 0 };
        this.currentFloorColor = COLORS.FLOOR;
        this.currentWallColor = COLORS.WALL;
        this.recentFloorColors = [];
        this.recentWallColors = [];
    }
    
    // [기능 이전] 툴박스 UI를 생성합니다.
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

    // [기능 이전] 사용자가 선택한 도구를 적용합니다.
    applyTool(pos) {
        const gm = this.gameManager;
        const {gridX: x, gridY: y} = pos;
        if (x < 0 || x >= gm.COLS || y < 0 || y >= gm.ROWS) return;

        if (this.currentTool.tool === 'erase') {
            gm.map[y][x] = { type: TILE.FLOOR, color: this.currentFloorColor };
            gm.units = gm.units.filter(u => u.gridX !== x || u.gridY !== y);
            gm.weapons = gm.weapons.filter(w => w.gridX !== x || w.gridY !== y);
            gm.nexuses = gm.nexuses.filter(n => n.gridX !== x || n.gridY !== y);
            gm.growingFields = gm.growingFields.filter(zone => !(x >= zone.gridX && x < zone.gridX + zone.width && y >= zone.gridY && y < zone.gridY + zone.height));
            gm.draw();
            return;
        }

        const isWallTypeTool = this.currentTool.tool === 'tile' && (this.currentTool.type === 'WALL' || this.currentTool.type === 'GLASS_WALL');

        if (!isWallTypeTool && (gm.map[y][x].type === TILE.WALL || gm.map[y][x].type === TILE.GLASS_WALL)) {
            return; 
        }
        
        if (isWallTypeTool) {
            gm.units = gm.units.filter(u => u.gridX !== x || u.gridY !== y);
            gm.weapons = gm.weapons.filter(w => w.gridX !== x || w.gridY !== y);
            gm.nexuses = gm.nexuses.filter(n => n.gridX !== x || n.gridY !== y);
        }

        const itemExists = gm.units.some(u => u.gridX === x && u.gridY === y) || 
                         gm.weapons.some(w => w.gridX === x && w.gridY === y) || 
                         gm.nexuses.some(n => n.gridX === x && n.gridY === y);

        if (this.currentTool.tool === 'growing_field' && this.dragStartPos) {
             const startX = Math.min(this.dragStartPos.gridX, x);
             const startY = Math.min(this.dragStartPos.gridY, y);
             const endX = Math.max(this.dragStartPos.gridX, x);
             const endY = Math.max(this.dragStartPos.gridY, y);
             const width = endX - startX + 1;
             const height = endY - startY + 1;
             
             const newZone = new GrowingMagneticField(gm, Date.now(), startX, startY, width, height, {...this.growingFieldSettings});
             gm.growingFields.push(newZone);
             this.dragStartPos = null;
        } else if (this.currentTool.tool === 'tile') {
            if (itemExists) return;
            
            const tileType = TILE[this.currentTool.type];
            if (tileType === TILE.TELEPORTER && gm.getTilesOfType(TILE.TELEPORTER).length >= 2) { return; }
            gm.map[y][x] = {
                type: tileType,
                hp: tileType === TILE.CRACKED_WALL ? 50 : undefined,
                color: tileType === TILE.WALL ? this.currentWallColor : (tileType === TILE.FLOOR ? this.currentFloorColor : undefined),
                replicationValue: tileType === TILE.REPLICATION_TILE ? this.replicationValue : undefined,
                direction: tileType === TILE.DASH_TILE ? this.dashTileSettings.direction : undefined
            };
        } else if (this.currentTool.tool === 'unit' && !itemExists) {
            gm.units.push(new Unit(gm, x, y, this.currentTool.team));
        } else if (this.currentTool.tool === 'weapon' && !itemExists) {
            // [오류 수정] 무기 생성은 핵심 로직이므로 GameManager에게 요청합니다.
            const weapon = gm.createWeapon(x, y, this.currentTool.type);
            gm.weapons.push(weapon);
        } else if (this.currentTool.tool === 'nexus' && !itemExists) {
            if (gm.nexuses.some(n => n.team === this.currentTool.team)) { return; }
            gm.nexuses.push(new Nexus(gm, x, y, this.currentTool.team));
        }
        gm.draw();
    }
    
    // [기능 이전] 맵을 그립니다.
    drawMap() {
        const gm = this.gameManager;
        const ctx = gm.ctx;

        for (let y = 0; y < gm.ROWS; y++) {
            for (let x = 0; x < gm.COLS; x++) {
                if (!gm.map || !gm.map[y] || !gm.map[y][x]) continue;
                const tile = gm.map[y][x];
                
                switch(tile.type) {
                    case TILE.WALL: ctx.fillStyle = tile.color || this.currentWallColor; break;
                    case TILE.FLOOR: ctx.fillStyle = tile.color || this.currentFloorColor; break;
                    case TILE.LAVA: ctx.fillStyle = COLORS.LAVA; break;
                    case TILE.CRACKED_WALL: ctx.fillStyle = COLORS.CRACKED_WALL; break;
                    case TILE.HEAL_PACK: ctx.fillStyle = COLORS.HEAL_PACK; break;
                    case TILE.AWAKENING_POTION: ctx.fillStyle = this.currentFloorColor; break;
                    case TILE.REPLICATION_TILE: ctx.fillStyle = COLORS.REPLICATION_TILE; break;
                    case TILE.QUESTION_MARK: ctx.fillStyle = COLORS.QUESTION_MARK; break;
                    case TILE.DASH_TILE: ctx.fillStyle = COLORS.DASH_TILE; break;
                    case TILE.GLASS_WALL: ctx.fillStyle = COLORS.GLASS_WALL; break;
                    case TILE.TELEPORTER: ctx.fillStyle = this.currentFloorColor; break;
                    default: ctx.fillStyle = this.currentFloorColor;
                }
                
                ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);

                if(tile.type === TILE.LAVA) {
                    const flicker = Math.sin(gm.animationFrameCounter * 0.1 + x + y) * 10 + 10;
                    ctx.fillStyle = `rgba(255, 255, 0, 0.3)`;
                    ctx.beginPath(); ctx.arc(x * GRID_SIZE + 10, y * GRID_SIZE + 10, flicker / 4, 0, Math.PI * 2); ctx.fill();
                } else if(tile.type === TILE.CRACKED_WALL) {
                    ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(x * GRID_SIZE + 4, y * GRID_SIZE + 4); ctx.lineTo(x * GRID_SIZE + 10, y * GRID_SIZE + 10);
                    ctx.moveTo(x * GRID_SIZE + 10, y * GRID_SIZE + 10); ctx.lineTo(x * GRID_SIZE + 8, y * GRID_SIZE + 16);
                    ctx.moveTo(x * GRID_SIZE + 16, y * GRID_SIZE + 5); ctx.lineTo(x * GRID_SIZE + 10, y * GRID_SIZE + 9);
                    ctx.moveTo(x * GRID_SIZE + 10, y * GRID_SIZE + 9); ctx.lineTo(x * GRID_SIZE + 15, y * GRID_SIZE + 17);
                    ctx.stroke();
                } else if(tile.type === TILE.TELEPORTER) {
                    const angle = gm.animationFrameCounter * 0.05;
                    ctx.save();
                    ctx.translate(x * GRID_SIZE + GRID_SIZE / 2, y * GRID_SIZE + GRID_SIZE / 2);
                    ctx.rotate(angle);
                    for (let i = 0; i < 6; i++) {
                        ctx.fillStyle = i % 2 === 0 ? COLORS.TELEPORTER : '#4c1d95';
                        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(GRID_SIZE * 0.5, 0);
                        ctx.arc(0, 0, GRID_SIZE * 0.5, 0, Math.PI / 3); ctx.closePath();
                        ctx.fill(); ctx.rotate(Math.PI / 3);
                    }
                    ctx.restore();
                } else if(tile.type === TILE.HEAL_PACK) {
                    ctx.fillStyle = 'white';
                    const plusWidth = 4; const plusLength = GRID_SIZE - 8;
                    ctx.fillRect(x * GRID_SIZE + (GRID_SIZE - plusWidth) / 2, y * GRID_SIZE + 4, plusWidth, plusLength);
                    ctx.fillRect(x * GRID_SIZE + 4, y * GRID_SIZE + (GRID_SIZE - plusWidth) / 2, plusLength, plusWidth);
                } else if (tile.type === TILE.AWAKENING_POTION) {
                    const centerX = x * GRID_SIZE + GRID_SIZE / 2, centerY = y * GRID_SIZE + GRID_SIZE / 2;
                    ctx.fillStyle = 'rgba(150, 150, 150, 0.4)'; ctx.strokeStyle = '#9CA3AF'; ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.arc(centerX, centerY, GRID_SIZE * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                    ctx.fillStyle = '#A1662F'; ctx.fillRect(centerX - GRID_SIZE * 0.15, centerY - GRID_SIZE * 0.6, GRID_SIZE * 0.3, GRID_SIZE * 0.2);
                    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(centerX, centerY, GRID_SIZE * 0.35, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; ctx.beginPath(); ctx.arc(centerX - GRID_SIZE * 0.15, centerY - GRID_SIZE * 0.15, GRID_SIZE * 0.08, 0, Math.PI * 2); ctx.fill();
                } else if(tile.type === TILE.REPLICATION_TILE) {
                    ctx.fillStyle = 'black'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
                    ctx.fillText(`+${tile.replicationValue}`, x * GRID_SIZE + 10, y * GRID_SIZE + 14);
                } else if (tile.type === TILE.QUESTION_MARK) {
                    ctx.fillStyle = 'black'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center';
                    ctx.fillText('?', x * GRID_SIZE + 10, y * GRID_SIZE + 16);
                } else if (tile.type === TILE.DASH_TILE) {
                    ctx.save();
                    ctx.translate(x * GRID_SIZE + GRID_SIZE / 2, y * GRID_SIZE + GRID_SIZE / 2);
                    let angle = 0;
                    switch(tile.direction) {
                        case 'RIGHT': angle = 0; break; case 'LEFT': angle = Math.PI; break;
                        case 'DOWN': angle = Math.PI / 2; break; case 'UP': angle = -Math.PI / 2; break;
                    }
                    ctx.rotate(angle); ctx.fillStyle = 'black'; ctx.beginPath();
                    ctx.moveTo(-6, -6); ctx.lineTo(4, 0); ctx.lineTo(-6, 6); ctx.lineTo(-4, 0);
                    ctx.closePath(); ctx.fill(); ctx.restore();
                } else if(tile.type === TILE.GLASS_WALL) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.moveTo(x * GRID_SIZE + 4, y * GRID_SIZE + 4);
                    ctx.lineTo(x * GRID_SIZE + GRID_SIZE - 4, y * GRID_SIZE + GRID_SIZE - 4); ctx.stroke();
                }

                if (gm.state === 'EDIT') {
                    ctx.strokeStyle = COLORS.GRID;
                    ctx.strokeRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                }
            }
        }
    }
    
    // [기능 추가] 아래부터는 UI Manager가 담당해야 할 새로운 함수들입니다.
    
    showHomeScreen() {
        this.gameManager.state = 'HOME';
        this.gameManager.currentMapId = null;
        this.gameManager.currentMapName = null;
        document.getElementById('homeScreen').style.display = 'block';
        document.getElementById('editorScreen').style.display = 'none';
        document.getElementById('defaultMapsScreen').style.display = 'none';
        document.getElementById('replayScreen').style.display = 'none';
        this.updateUIToEditorMode(); 
        this.gameManager.resetActionCam(true);
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
        const gm = this.gameManager;
        gm.state = 'EDIT';
        gm.currentMapId = mapId;
        gm.isReplayMode = false;
        document.getElementById('homeScreen').style.display = 'none';
        document.getElementById('defaultMapsScreen').style.display = 'none';
        document.getElementById('replayScreen').style.display = 'none';
        document.getElementById('editorScreen').style.display = 'flex';
        await gm.audioManager.init();

        const killSoundPref = localStorage.getItem('arenaKillSoundEnabled');
        if (killSoundPref !== null) {
            const isEnabled = killSoundPref === 'true';
            document.getElementById('killSoundToggle').checked = isEnabled;
            gm.audioManager.toggleKillSound(isEnabled);
        }
        
        const outlineEnabledPref = localStorage.getItem('unitOutlineEnabled');
        gm.isUnitOutlineEnabled = outlineEnabledPref !== null ? (outlineEnabledPref === 'true') : true;
        document.getElementById('unitOutlineToggle').checked = gm.isUnitOutlineEnabled;

        const outlineWidthPref = localStorage.getItem('unitOutlineWidth');
        gm.unitOutlineWidth = outlineWidthPref !== null ? parseFloat(outlineWidthPref) : 1.5;
        document.getElementById('unitOutlineWidthControl').value = gm.unitOutlineWidth;
        document.getElementById('unitOutlineWidthValue').textContent = gm.unitOutlineWidth.toFixed(1);

        gm.resetActionCam(true);

        if (mapId !== 'replay') {
             this.updateUIToEditorMode(); 
             await this.loadMapForEditing(mapId);
        }
    }

    async renderMapCards() {
        const gm = this.gameManager;
        document.getElementById('loadingStatus').textContent = "맵 목록을 불러오는 중...";
        const maps = await gm.getAllMaps();
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
                document.querySelectorAll('.map-menu').forEach(menu => menu.style.display = 'none');
            }
        }, true);
    }
    
    renderDefaultMapCards() {
        const defaultMapGrid = document.getElementById('defaultMapGrid');
        while (defaultMapGrid.firstChild) defaultMapGrid.removeChild(defaultMapGrid.firstChild);
        this.gameManager.constructor.localMaps.forEach(mapData => { // [오류 수정] localMaps에 접근
            const card = this.createMapCard(mapData, true);
            defaultMapGrid.appendChild(card);
        });
    }

    createMapCard(mapData, isLocal) {
        const card = document.createElement('div');
        card.className = 'relative group bg-gray-800 rounded-lg overflow-hidden flex flex-col cursor-pointer shadow-lg hover:shadow-indigo-500/30 transition-shadow duration-300';
        
        const mapId = isLocal ? `local_${mapData.name}` : mapData.id;

        card.addEventListener('click', (e) => {
            if (!e.target.closest('.map-menu-button')) {
                if (isLocal) this.loadLocalMapForEditing(mapData);
                else this.showEditorScreen(mapId);
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
            renameBtn.onclick = () => { menu.style.display = 'none'; this.openRenameModal(mapId, mapData.name, 'map'); };
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'w-full text-left px-3 py-1.5 text-sm text-red-400 rounded hover:bg-gray-600';
            deleteBtn.textContent = '삭제';
            deleteBtn.onclick = () => { menu.style.display = 'none'; this.openDeleteConfirmModal(mapId, mapData.name, 'map'); };
            menu.append(renameBtn, deleteBtn);

            menuButton.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.map-menu').forEach(m => { if (m !== menu) m.style.display = 'none'; });
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            });
            card.append(menuButton, menu);
        }

        card.append(previewCanvas, infoDiv);
        this.drawMapPreview(previewCanvas, mapData);
        return card;
    }
    
    // [기능 이전] 맵 미리보기를 그립니다.
    drawMapPreview(previewCanvas, mapData) {
        const gm = this.gameManager;
        const prevCtx = previewCanvas.getContext('2d');
        const mapGridData = (typeof mapData.map === 'string') ? JSON.parse(mapData.map) : mapData.map;
        
        const mapHeight = mapGridData.length * GRID_SIZE;
        const mapWidth = mapGridData.length > 0 ? mapGridData[0].length * GRID_SIZE : 0;

        if(mapWidth === 0 || mapHeight === 0) return;
        
        const cardWidth = 200; // 고정값 사용
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
            if (colorOverride) { color = colorOverride; }
            else {
                switch(item.team) {
                    case 'A': color = COLORS.TEAM_A; break; case 'B': color = COLORS.TEAM_B; break;
                    case 'C': color = COLORS.TEAM_C; break; case 'D': color = COLORS.TEAM_D; break;
                    default: color = '#9ca3af'; break;
                }
            }
            prevCtx.fillStyle = color;
            prevCtx.beginPath();
            prevCtx.arc(item.gridX * pixelSizeX + pixelSizeX / 2, item.gridY * pixelSizeY + pixelSizeY / 2, Math.min(pixelSizeX, pixelSizeY) / 1.8, 0, 2 * Math.PI);
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
            const gm = this.gameManager;
            if (newName && gm.currentUser) {
                const collectionPath = type === 'map' ? 'userMaps' : 'userReplays';
                const docRef = gm.constructor.doc(gm.db, type === 'map' ? "maps" : "replays", gm.currentUser.uid, collectionPath, id);
                try {
                    await gm.constructor.setDoc(docRef, { name: newName }, { merge: true });
                    if (type === 'map') this.renderMapCards(); else this.renderReplayCards();
                } catch (error) { console.error(`Error renaming ${type}:`, error); }
                renameMapModal.classList.remove('show-modal');
            }
        };
    }

    openDeleteConfirmModal(id, name, type) {
        const deleteConfirmModal = document.getElementById('deleteConfirmModal');
        document.getElementById('deleteConfirmText').textContent = `'${name}' ${type === 'map' ? '맵' : '리플레이'}을(를) 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`;
        deleteConfirmModal.classList.add('show-modal');

        document.getElementById('confirmDeleteBtn').onclick = async () => {
            const gm = this.gameManager;
            if (!gm.currentUser) return;
            const collectionPath = type === 'map' ? 'userMaps' : 'userReplays';
            const docRef = gm.constructor.doc(gm.db, type === 'map' ? "maps" : "replays", gm.currentUser.uid, collectionPath, id);
            try {
                await gm.constructor.deleteDoc(docRef);
                if (type === 'map') this.renderMapCards(); else this.renderReplayCards();
            } catch (error) { console.error(`Error deleting ${type}:`, error); }
            deleteConfirmModal.classList.remove('show-modal');
        };
    }

    setupEventListeners() {
        const gm = this.gameManager;
        // [오류 수정] 모든 이벤트 리스너의 콜백 함수에서 this가 UIManager 인스턴스를 가리키도록 수정합니다.
        document.getElementById('cancelNewMapBtn').addEventListener('click', () => document.getElementById('newMapModal').classList.remove('show-modal'));
        document.getElementById('cancelRenameBtn').addEventListener('click', () => document.getElementById('renameMapModal').classList.remove('show-modal'));
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => document.getElementById('deleteConfirmModal').classList.remove('show-modal'));
        document.getElementById('closeMapSettingsModal').addEventListener('click', () => document.getElementById('mapSettingsModal').classList.remove('show-modal'));
        document.getElementById('closeDashTileModal').addEventListener('click', () => { this.dashTileSettings.direction = document.getElementById('dashTileDirection').value; document.getElementById('dashTileModal').classList.remove('show-modal'); });
        document.getElementById('cancelSaveReplayBtn').addEventListener('click', () => document.getElementById('saveReplayModal').classList.remove('show-modal'));
        document.getElementById('confirmSaveReplayBtn').addEventListener('click', () => this.saveLastReplay());
        document.getElementById('addNewMapCard').addEventListener('click', () => { document.getElementById('newMapName').value = ''; document.getElementById('newMapWidth').value = '460'; document.getElementById('newMapHeight').value = '800'; document.getElementById('newMapModal').classList.add('show-modal'); });
        document.getElementById('defaultMapsBtn').addEventListener('click', () => this.showDefaultMapsScreen());
        document.getElementById('replaysBtn').addEventListener('click', () => this.showReplayScreen());
        document.getElementById('backToHomeFromDefaultBtn').addEventListener('click', () => this.showHomeScreen());
        document.getElementById('backToHomeFromReplayBtn').addEventListener('click', () => this.showHomeScreen());
        document.getElementById('confirmNewMapBtn').addEventListener('click', async () => {
            if (!gm.currentUser) return;
            const name = document.getElementById('newMapName').value.trim() || '새로운 맵';
            const width = parseInt(document.getElementById('newMapWidth').value) || 460;
            const height = parseInt(document.getElementById('newMapHeight').value) || 800;
            const newMapId = `map_${Date.now()}`;
            const newMapData = { id: newMapId, name, width, height, map: JSON.stringify(Array(Math.floor(height / GRID_SIZE)).fill().map(() => Array(Math.floor(width / GRID_SIZE)).fill({ type: TILE.FLOOR, color: COLORS.FLOOR }))), units: [], weapons: [], nexuses: [], growingFields: [], floorColor: COLORS.FLOOR, wallColor: COLORS.WALL, recentFloorColors: [], recentWallColors: [] };
            const newMapDocRef = gm.constructor.doc(gm.db, "maps", gm.currentUser.uid, "userMaps", newMapId);
            try { await gm.constructor.setDoc(newMapDocRef, newMapData); document.getElementById('newMapModal').classList.remove('show-modal'); this.showEditorScreen(newMapId); }
            catch(error) { console.error("Error creating new map: ", error); }
        });
        document.getElementById('backToHomeBtn').addEventListener('click', () => this.showHomeScreen());
        document.getElementById('saveMapBtn').addEventListener('click', () => gm.saveCurrentMap());
        document.getElementById('saveReplayBtn').addEventListener('click', () => this.openSaveReplayModal());
        document.getElementById('mapSettingsBtn').addEventListener('click', () => { document.getElementById('widthInput').value = gm.canvas.width; document.getElementById('heightInput').value = gm.canvas.height; document.getElementById('mapSettingsModal').classList.add('show-modal'); });
        document.getElementById('killSoundToggle').addEventListener('change', (e) => gm.audioManager.toggleKillSound(e.target.checked));
        document.getElementById('volumeControl').addEventListener('input', (e) => gm.audioManager.setVolume(parseFloat(e.target.value)));
        document.getElementById('unitOutlineToggle').addEventListener('change', (e) => { gm.isUnitOutlineEnabled = e.target.checked; localStorage.setItem('unitOutlineEnabled', gm.isUnitOutlineEnabled); gm.draw(); });
        document.getElementById('unitOutlineWidthControl').addEventListener('input', (e) => { gm.unitOutlineWidth = parseFloat(e.target.value); document.getElementById('unitOutlineWidthValue').textContent = gm.unitOutlineWidth.toFixed(1); localStorage.setItem('unitOutlineWidth', gm.unitOutlineWidth); if (gm.isUnitOutlineEnabled) gm.draw(); });
        document.getElementById('muteBtn').addEventListener('click', () => gm.audioManager.toggleMute());
        gm.canvas.addEventListener('mousedown', (e) => {
            if (gm.isActionCam) {
                if (gm.actionCam.isAnimating) return;
                const pos = gm.getMousePos(e);
                if (gm.actionCam.target.scale === 1) { gm.actionCam.target.x = pos.pixelX; gm.actionCam.target.y = pos.pixelY; gm.actionCam.target.scale = 1.8; }
                else { gm.actionCam.target.x = gm.canvas.width / 2; gm.actionCam.target.y = gm.canvas.height / 2; gm.actionCam.target.scale = 1; }
                gm.actionCam.isAnimating = true;
                if (gm.state !== 'SIMULATE' && !gm.animationFrameId) gm.gameLoop();
                return;
            }
            if (gm.state === 'EDIT') {
                const pos = gm.getMousePos(e);
                if (this.currentTool.tool === 'nametag') {
                    const clickedUnit = gm.units.find(u => Math.hypot(u.pixelX - pos.pixelX, u.pixelY - pos.pixelY) < GRID_SIZE / 2);
                    if (clickedUnit) { gm.editingUnit = clickedUnit; document.getElementById('unitNameInput').value = clickedUnit.name || ''; document.getElementById('unitNameModal').classList.add('show-modal'); return; }
                }
                this.isPainting = true;
                if (this.currentTool.tool === 'growing_field') this.dragStartPos = pos;
                else this.applyTool(pos);
            }
        });
        gm.canvas.addEventListener('mouseup', (e) => { if (gm.state === 'EDIT' && this.currentTool.tool === 'growing_field' && this.dragStartPos) this.applyTool(gm.getMousePos(e)); this.isPainting = false; this.dragStartPos = null; });
        gm.canvas.addEventListener('mousemove', (e) => { if (this.isPainting && gm.state === 'EDIT' && this.currentTool.tool !== 'growing_field') this.applyTool(gm.getMousePos(e)); if (gm.state === 'EDIT' && this.dragStartPos) gm.draw(e); });
        gm.canvas.addEventListener('mouseleave', () => { this.isPainting = false; this.dragStartPos = null; gm.draw(); });
        document.getElementById('simStartBtn').addEventListener('click', () => gm.startSimulation());
        document.getElementById('simPauseBtn').addEventListener('click', () => gm.pauseSimulation());
        document.getElementById('simPlayBtn').addEventListener('click', () => gm.playSimulation());
        document.getElementById('simPlacementResetBtn').addEventListener('click', () => gm.resetPlacement());
        document.getElementById('simResetBtn').addEventListener('click', () => gm.resetMap());
        document.getElementById('resizeBtn').addEventListener('click', () => { gm.resizeCanvas(parseInt(document.getElementById('widthInput').value), parseInt(document.getElementById('heightInput').value)); document.getElementById('mapSettingsModal').classList.remove('show-modal'); });
        document.getElementById('actionCamToggle').addEventListener('change', (e) => { gm.isActionCam = e.target.checked; if (!gm.isActionCam) gm.resetActionCam(false); });
        document.getElementById('toolbox').addEventListener('click', (e) => {
            const target = e.target; const toolButton = target.closest('.tool-btn'); const categoryHeader = target.closest('.category-header'); const recentColorSwatch = target.closest('.recent-color-swatch');
            if (toolButton) this.selectTool(toolButton);
            else if (recentColorSwatch) this.setCurrentColor(recentColorSwatch.dataset.color, recentColorSwatch.dataset.type, true);
            else if (target.id === 'defaultFloorColorBtn') this.setCurrentColor(COLORS.FLOOR, 'floor', true);
            else if (target.id === 'defaultWallColorBtn') this.setCurrentColor(COLORS.WALL, 'wall', true);
            else if (target.id === 'growingFieldSettingsBtn' || target.parentElement.id === 'growingFieldSettingsBtn') { document.getElementById('fieldDirection').value = this.growingFieldSettings.direction; document.getElementById('fieldSpeed').value = this.growingFieldSettings.speed; document.getElementById('fieldDelay').value = this.growingFieldSettings.delay; document.getElementById('growingFieldModal').classList.add('show-modal'); }
            else if (target.id === 'dashTileSettingsBtn' || target.parentElement.id === 'dashTileSettingsBtn') { document.getElementById('dashTileDirection').value = this.dashTileSettings.direction; document.getElementById('dashTileModal').classList.add('show-modal'); }
            else if (target.id === 'autoFieldSettingsBtn' || target.parentElement.id === 'autoFieldSettingsBtn') { document.getElementById('autoFieldActiveToggle').checked = gm.autoMagneticField.isActive; document.getElementById('autoFieldShrinkTime').value = gm.autoMagneticField.totalShrinkTime / 60; document.getElementById('autoFieldSafeZoneSize').value = gm.autoMagneticField.safeZoneSize; document.getElementById('autoFieldModal').classList.add('show-modal'); }
            else if (target.id === 'hadokenSettingsBtn' || target.parentElement.id === 'hadokenSettingsBtn') { document.getElementById('hadokenKnockback').value = gm.hadokenKnockback; document.getElementById('hadokenKnockbackValue').textContent = gm.hadokenKnockback; document.getElementById('hadokenModal').classList.add('show-modal'); }
            else if (categoryHeader) { const content = categoryHeader.nextElementSibling; categoryHeader.classList.toggle('collapsed'); content.classList.toggle('collapsed'); }
        });
        document.getElementById('closeGrowingFieldModal').addEventListener('click', () => { this.growingFieldSettings.direction = document.getElementById('fieldDirection').value; this.growingFieldSettings.speed = parseFloat(document.getElementById('fieldSpeed').value); this.growingFieldSettings.delay = parseInt(document.getElementById('fieldDelay').value); document.getElementById('growingFieldModal').classList.remove('show-modal'); });
        document.getElementById('growingFieldDefaultBtn').addEventListener('click', () => { this.growingFieldSettings = { direction: 'DOWN', speed: 4, delay: 0 }; document.getElementById('fieldDirection').value = this.growingFieldSettings.direction; document.getElementById('fieldSpeed').value = this.growingFieldSettings.speed; document.getElementById('fieldDelay').value = this.growingFieldSettings.delay; });
        document.getElementById('closeAutoFieldModal').addEventListener('click', () => { gm.autoMagneticField.isActive = document.getElementById('autoFieldActiveToggle').checked; gm.autoMagneticField.totalShrinkTime = parseFloat(document.getElementById('autoFieldShrinkTime').value) * 60; gm.autoMagneticField.safeZoneSize = parseInt(document.getElementById('autoFieldSafeZoneSize').value); document.getElementById('autoFieldModal').classList.remove('show-modal'); });
        document.getElementById('autoFieldDefaultBtn').addEventListener('click', () => { gm.autoMagneticField = { isActive: false, totalShrinkTime: 60 * 60, safeZoneSize: 6, simulationTime: 0, currentBounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 } }; document.getElementById('autoFieldActiveToggle').checked = gm.autoMagneticField.isActive; document.getElementById('autoFieldShrinkTime').value = gm.autoMagneticField.totalShrinkTime / 60; document.getElementById('autoFieldSafeZoneSize').value = gm.autoMagneticField.safeZoneSize; });
        document.getElementById('closeHadokenModal').addEventListener('click', () => document.getElementById('hadokenModal').classList.remove('show-modal'));
        document.getElementById('hadokenKnockback').addEventListener('input', (e) => { gm.hadokenKnockback = parseInt(e.target.value); document.getElementById('hadokenKnockbackValue').textContent = gm.hadokenKnockback; });
        document.getElementById('hadokenDefaultBtn').addEventListener('click', () => { gm.hadokenKnockback = 15; document.getElementById('hadokenKnockback').value = gm.hadokenKnockback; document.getElementById('hadokenKnockbackValue').textContent = gm.hadokenKnockback; });
        document.getElementById('toolbox').addEventListener('input', (e) => { if (e.target.id === 'replicationValue') this.replicationValue = parseInt(e.target.value) || 1; });
        const floorColorPicker = document.getElementById('floorColorPicker'); const wallColorPicker = document.getElementById('wallColorPicker');
        floorColorPicker.addEventListener('input', () => this.setCurrentColor(floorColorPicker.value, 'floor', false));
        floorColorPicker.addEventListener('change', () => this.addRecentColor(floorColorPicker.value, 'floor'));
        wallColorPicker.addEventListener('input', () => this.setCurrentColor(wallColorPicker.value, 'wall', false));
        wallColorPicker.addEventListener('change', () => this.addRecentColor(wallColorPicker.value, 'wall'));
        document.getElementById('nametagSettingsBtn').addEventListener('click', () => document.getElementById('nametagSettingsModal').classList.add('show-modal'));
        document.getElementById('closeNametagSettingsModal').addEventListener('click', () => document.getElementById('nametagSettingsModal').classList.remove('show-modal'));
        document.getElementById('saveNametagSettingsBtn').addEventListener('click', () => { gm.saveNametagSettings(); document.getElementById('nametagSettingsModal').classList.remove('show-modal'); });
        document.getElementById('nameFileUpload').addEventListener('change', (e) => this.handleNametagFileUpload(e));
        document.getElementById('addNameBtn').addEventListener('click', () => this.addNametagManually());
        document.getElementById('nametagListContainer').addEventListener('click', (e) => { if (e.target.classList.contains('nametag-delete-btn')) this.deleteNametag(e.target.parentElement.textContent.slice(0, -1).trim()); });
        document.getElementById('cancelUnitNameBtn').addEventListener('click', () => { document.getElementById('unitNameModal').classList.remove('show-modal'); });
        document.getElementById('confirmUnitNameBtn').addEventListener('click', () => { if (gm.editingUnit) { gm.editingUnit.name = document.getElementById('unitNameInput').value; gm.editingUnit = null; gm.draw(); } document.getElementById('unitNameModal').classList.remove('show-modal'); });
    }

    async loadMapForEditing(mapId) {
        const gm = this.gameManager;
        const mapData = await gm.getMapById(mapId);
        if (!mapData) { console.error("Map not found:", mapId); this.showHomeScreen(); return; }
        
        gm.currentMapId = mapId; gm.currentMapName = mapData.name;
        gm.canvas.width = mapData.width || 600; gm.canvas.height = mapData.height || 900;
        document.getElementById('widthInput').value = gm.canvas.width; document.getElementById('heightInput').value = gm.canvas.height;
        gm.COLS = Math.floor(gm.canvas.width / GRID_SIZE); gm.ROWS = Math.floor(gm.canvas.height / GRID_SIZE);

        this.handleMapColors(mapData);

        if (mapData.map && typeof mapData.map === 'string') gm.map = JSON.parse(mapData.map);
        else gm.map = Array(gm.ROWS).fill().map(() => Array(gm.COLS).fill({ type: TILE.FLOOR, color: this.currentFloorColor }));
        
        gm.units = (mapData.units || []).map(uData => Object.assign(new Unit(gm, uData.gridX, uData.gridY, uData.team), uData));
        gm.weapons = (mapData.weapons || []).map(wData => gm.createWeapon(wData.gridX, wData.gridY, wData.type));
        gm.nexuses = (mapData.nexuses || []).map(nData => Object.assign(new Nexus(gm, nData.gridX, nData.gridY, nData.team), nData));
        gm.growingFields = (mapData.growingFields || []).map(fieldData => {
             const settings = { direction: fieldData.direction, speed: (fieldData.totalFrames / 60) || 4, delay: (fieldData.delay / 60) || 0 };
            return new GrowingMagneticField(gm, fieldData.id, fieldData.gridX, fieldData.gridY, fieldData.width, fieldData.height, settings);
        });
        gm.autoMagneticField = mapData.autoMagneticField || { isActive: false, safeZoneSize: 6, simulationTime: 0, totalShrinkTime: 60 * 60, currentBounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 } };
        gm.hadokenKnockback = mapData.hadokenKnockback || 15;
        
        this.resetSimulationState();
        this.renderRecentColors('floor'); this.renderRecentColors('wall'); gm.draw();
    }
    
    async loadLocalMapForEditing(mapData) {
        const gm = this.gameManager;
        gm.state = 'EDIT'; gm.isReplayMode = false; gm.currentMapId = `local_${mapData.name}`;
        document.getElementById('homeScreen').style.display = 'none'; document.getElementById('defaultMapsScreen').style.display = 'none'; document.getElementById('replayScreen').style.display = 'none'; document.getElementById('editorScreen').style.display = 'flex';
        await gm.audioManager.init();
        
        gm.currentMapName = mapData.name; gm.canvas.width = mapData.width; gm.canvas.height = mapData.height;
        document.getElementById('widthInput').value = gm.canvas.width; document.getElementById('heightInput').value = gm.canvas.height;
        gm.COLS = Math.floor(gm.canvas.width / GRID_SIZE); gm.ROWS = Math.floor(gm.canvas.height / GRID_SIZE);

        this.handleMapColors(mapData);
        gm.map = JSON.parse(mapData.map);
        gm.units = (mapData.units || []).map(uData => Object.assign(new Unit(gm, uData.gridX, uData.gridY, uData.team), uData));
        gm.weapons = (mapData.weapons || []).map(wData => gm.createWeapon(wData.gridX, wData.gridY, wData.type));
        gm.nexuses = (mapData.nexuses || []).map(nData => Object.assign(new Nexus(gm, nData.gridX, nData.gridY, nData.team), nData));
        gm.growingFields = (mapData.growingFields || []).map(fieldData => {
             const settings = { direction: fieldData.direction, speed: (fieldData.totalFrames / 60) || 4, delay: (fieldData.delay / 60) || 0 };
            return new GrowingMagneticField(gm, fieldData.id, fieldData.gridX, fieldData.gridY, fieldData.width, fieldData.height, settings);
        });
        gm.autoMagneticField = mapData.autoMagneticField; gm.hadokenKnockback = mapData.hadokenKnockback;
        
        this.resetSimulationState();
        this.renderRecentColors('floor'); this.renderRecentColors('wall'); gm.draw();
    }

    resetSimulationState() {
        const gm = this.gameManager;
        cancelAnimationFrame(gm.animationFrameId); gm.animationFrameId = null;
        gm.state = 'EDIT'; gm.effects = []; gm.projectiles = []; gm.areaEffects = []; gm.magicCircles = []; gm.poisonClouds = []; gm.particles = [];
        gm.initialUnitsState = []; gm.initialWeaponsState = []; gm.initialNexusesState = []; gm.initialMapState = []; gm.initialGrowingFieldsState = []; gm.initialAutoFieldState = {};
        gm.usedNametagsInSim.clear();
        this.updateStatusText("에디터 모드");
        this.toggleSimButtons('EDIT');
        gm.resetActionCam(true);
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
    
    handleNametagFileUpload(event) {
        const file = event.target.files[0]; if (!file) return;
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
        const gm = this.gameManager;
        gm.nametagList = gm.nametagList.filter(name => name !== nameToDelete);
        this.renderNametagList();
    }

    async openSaveReplayModal() {
        const gm = this.gameManager;
        if (!gm.lastSimulationResult) { this.showAlert("저장할 시뮬레이션 결과가 없습니다."); return; }
        const replaysColRef = gm.constructor.collection(gm.db, "replays", gm.currentUser.uid, "userReplays");
        const q = gm.constructor.query(replaysColRef, gm.constructor.where("mapName", "==", gm.lastSimulationResult.mapName));
        const querySnapshot = await gm.constructor.getDocs(q);
        const replayCount = querySnapshot.size;
        document.getElementById('newReplayName').value = `${gm.lastSimulationResult.mapName} 리플레이 ${replayCount + 1}`;
        document.getElementById('saveReplayModal').classList.add('show-modal');
    }

    async saveLastReplay() {
        const gm = this.gameManager;
        if (!gm.currentUser || !gm.lastSimulationResult) return;
        const replayName = document.getElementById('newReplayName').value.trim();
        if (!replayName) { this.showAlert("리플레이 이름을 입력해주세요."); return; }
        const replayId = `replay_${Date.now()}`;
        const replayData = { name: replayName, ...gm.lastSimulationResult };
        const replayDocRef = gm.constructor.doc(gm.db, "replays", gm.currentUser.uid, "userReplays", replayId);
        try {
            await gm.constructor.setDoc(replayDocRef, replayData);
            this.showAlert(`'${replayName}' 리플레이가 저장되었습니다!`);
            document.getElementById('saveReplayModal').classList.remove('show-modal');
        } catch (error) { console.error("Error saving replay:", error); this.showAlert("리플레이 저장에 실패했습니다."); }
    }
}
