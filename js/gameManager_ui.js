import { TILE, COLORS, GRID_SIZE } from './constants.js';
import { Weapon } from './weaponary.js';
import { Unit } from './unit.js';
import { Nexus } from './entities.js';
import { GrowingMagneticField } from './entities.js';

export class GameUIManager {
    constructor(gameManager) {
        this.gameManager = gameManager;

        // [오류 수정] UIManager의 속성들을 생성자에서 명확하게 초기화합니다.
        this.isPainting = false;
        this.dragStartPos = null;
        this.currentTool = { tool: 'tile', type: 'FLOOR' }; // currentTool에 기본값을 설정하여 오류를 방지합니다.
        
        this.currentFloorColor = COLORS.FLOOR;
        this.currentWallColor = COLORS.WALL;
        this.recentFloorColors = [];
        this.recentWallColors = [];

        this.replicationValue = 1;
        this.dashTileSettings = { direction: 'RIGHT' };
        this.growingFieldSettings = { direction: 'DOWN', speed: 4, delay: 0 };
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
    
    selectTool(toolButton) {
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('selected'));
        toolButton.classList.add('selected');
        this.currentTool = {
            tool: toolButton.dataset.tool,
            type: toolButton.dataset.type,
            team: toolButton.dataset.team
        };
    }
    
    setCurrentColor(color, type, updatePicker = false) {
        if (type === 'floor') {
            this.currentFloorColor = color;
            if (updatePicker) document.getElementById('floorColorPicker').value = color;
        } else if (type === 'wall') {
            this.currentWallColor = color;
            if (updatePicker) document.getElementById('wallColorPicker').value = color;
        }
        this.gameManager.draw();
    }
    
    addRecentColor(color, type) {
        const recentColors = type === 'floor' ? this.recentFloorColors : this.recentWallColors;
        if (!recentColors.includes(color)) {
            recentColors.unshift(color);
            if (recentColors.length > 8) recentColors.pop();
            this.renderRecentColors(type);
        }
    }
    
    renderRecentColors(type) {
        const containerId = type === 'floor' ? 'recentFloorColors' : 'recentWallColors';
        const recentColors = type === 'floor' ? this.recentFloorColors : this.recentWallColors;
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        recentColors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'recent-color-swatch w-full h-6 rounded cursor-pointer border-2 border-transparent hover:border-white';
            swatch.style.backgroundColor = color;
            swatch.dataset.color = color;
            swatch.dataset.type = type;
            container.appendChild(swatch);
        });
    }

    handleMapColors(mapData) {
        this.currentFloorColor = mapData.floorColor || COLORS.FLOOR;
        this.currentWallColor = mapData.wallColor || COLORS.WALL;
        this.recentFloorColors = mapData.recentFloorColors || [];
        this.recentWallColors = mapData.recentWallColors || [];
        document.getElementById('floorColorPicker').value = this.currentFloorColor;
        document.getElementById('wallColorPicker').value = this.currentWallColor;
    }

    getMousePos(evt) {
        const rect = this.gameManager.canvas.getBoundingClientRect();
        const scaleX = this.gameManager.canvas.width / rect.width;
        const scaleY = this.gameManager.canvas.height / rect.height;
        
        const cam = this.gameManager.actionCam;
        const mouseX = (evt.clientX - rect.left) * scaleX;
        const mouseY = (evt.clientY - rect.top) * scaleY;

        const worldX = (mouseX - this.gameManager.canvas.width / 2) / cam.current.scale + cam.current.x;
        const worldY = (mouseY - this.gameManager.canvas.height / 2) / cam.current.scale + cam.current.y;
        
        return {
            pixelX: worldX,
            pixelY: worldY,
            gridX: Math.floor(worldX / GRID_SIZE),
            gridY: Math.floor(worldY / GRID_SIZE)
        };
    }

    spawnRandomWeaponNear(pos) {
        const gm = this.gameManager;
        const weaponTypes = Object.keys(gm.uiManager.createWeapon(0, 0, 'sword').constructor.prototype).filter(type => type !== 'constructor' && type !== 'drawEquipped');
        const randomType = weaponTypes[Math.floor(gm.random() * weaponTypes.length)];
        
        let placed = false;
        for (let i = 0; i < 10; i++) {
            const angle = gm.random() * Math.PI * 2;
            const distance = GRID_SIZE * (gm.random() * 2 + 1);
            const newX = pos.x + Math.cos(angle) * distance;
            const newY = pos.y + Math.sin(angle) * distance;
            const gridX = Math.floor(newX / GRID_SIZE);
            const gridY = Math.floor(newY / GRID_SIZE);

            if (gridX >= 0 && gridX < gm.COLS && gridY >= 0 && gridY < gm.ROWS && gm.map[gridY][gridX].type === TILE.FLOOR) {
                const weapon = gm.uiManager.createWeapon(gridX, gridY, randomType);
                gm.weapons.push(weapon);
                placed = true;
                break;
            }
        }
    }
    
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
            const weapon = this.createWeapon(x, y, this.currentTool.type);
            gm.weapons.push(weapon);
        } else if (this.currentTool.tool === 'nexus' && !itemExists) {
            if (gm.nexuses.some(n => n.team === this.currentTool.team)) { return; }
            gm.nexuses.push(new Nexus(gm, x, y, this.currentTool.team));
        }
        gm.draw();
    }

    createWeapon(x, y, type) {
        const weapon = new Weapon(this.gameManager, x, y, type);
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
                    const plusWidth = 4;
                    const plusLength = GRID_SIZE - 8;
                    ctx.fillRect(x * GRID_SIZE + (GRID_SIZE - plusWidth) / 2, y * GRID_SIZE + 4, plusWidth, plusLength);
                    ctx.fillRect(x * GRID_SIZE + 4, y * GRID_SIZE + (GRID_SIZE - plusWidth) / 2, plusLength, plusWidth);
                } else if (tile.type === TILE.AWAKENING_POTION) {
                    const centerX = x * GRID_SIZE + GRID_SIZE / 2;
                    const centerY = y * GRID_SIZE + GRID_SIZE / 2;
                    ctx.fillStyle = 'rgba(150, 150, 150, 0.4)';
                    ctx.strokeStyle = '#9CA3AF';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, GRID_SIZE * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    ctx.fillStyle = '#A1662F';
                    ctx.fillRect(centerX - GRID_SIZE * 0.15, centerY - GRID_SIZE * 0.6, GRID_SIZE * 0.3, GRID_SIZE * 0.2);
                    ctx.fillStyle = '#FFFFFF';
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, GRID_SIZE * 0.35, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.beginPath();
                    ctx.arc(centerX - GRID_SIZE * 0.15, centerY - GRID_SIZE * 0.15, GRID_SIZE * 0.08, 0, Math.PI * 2);
                    ctx.fill();
                } else if(tile.type === TILE.REPLICATION_TILE) {
                    ctx.fillStyle = 'black'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
                    ctx.fillText(`+${tile.replicationValue}`, x * GRID_SIZE + 10, y * GRID_SIZE + 14);
                } else if (tile.type === TILE.QUESTION_MARK) {
                    ctx.fillStyle = 'black';
                    ctx.font = 'bold 16px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('?', x * GRID_SIZE + 10, y * GRID_SIZE + 16);
                } else if (tile.type === TILE.DASH_TILE) {
                    ctx.save();
                    ctx.translate(x * GRID_SIZE + GRID_SIZE / 2, y * GRID_SIZE + GRID_SIZE / 2);
                    let angle = 0;
                    switch(tile.direction) {
                        case 'RIGHT': angle = 0; break;
                        case 'LEFT': angle = Math.PI; break;
                        case 'DOWN': angle = Math.PI / 2; break;
                        case 'UP':    angle = -Math.PI / 2; break;
                    }
                    ctx.rotate(angle);
                    ctx.fillStyle = 'black';
                    ctx.beginPath();
                    ctx.moveTo(-6, -6);
                    ctx.lineTo(4, 0);
                    ctx.lineTo(-6, 6);
                    ctx.lineTo(-4, 0);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                } else if(tile.type === TILE.GLASS_WALL) {
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(x * GRID_SIZE + 4, y * GRID_SIZE + 4);
                    ctx.lineTo(x * GRID_SIZE + GRID_SIZE - 4, y * GRID_SIZE + GRID_SIZE - 4);
                    ctx.stroke();
                }

                if (gm.state === 'EDIT') {
                    ctx.strokeStyle = COLORS.GRID;
                    ctx.strokeRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                }
            }
        }
    }
}
