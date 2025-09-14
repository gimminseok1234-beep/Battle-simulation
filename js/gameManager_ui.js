import { TILE, COLORS, GRID_SIZE, TEAM } from './constants.js';
import { Weapon } from './weaponary.js';
import { Unit } from './unit.js';
import { Nexus } from './entities.js';
import { GrowingMagneticField } from './entities.js';

const MAX_RECENT_COLORS = 8;

/**
 * UI 렌더링, 사용자 입력 처리, DOM 요소 조작 등
 * 화면 표시와 관련된 모든 로직을 담당하는 클래스입니다.
 * (수정이 잦은 코드)
 */
export class GameUIManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.ctx = gameManager.ctx;

        // UI 상태 및 설정
        this.currentTool = { tool: 'tile', type: 'FLOOR' };
        this.isPainting = false;
        this.dragStartPos = null;
        
        this.currentWallColor = COLORS.WALL;
        this.currentFloorColor = COLORS.FLOOR;
        this.recentWallColors = [];
        this.recentFloorColors = [];
        this.replicationValue = 2;
        
        this.growingFieldSettings = {
            direction: 'DOWN', speed: 4, delay: 0
        };
        this.dashTileSettings = {
            direction: 'RIGHT'
        };
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

    selectTool(button) {
        const { tool, team, type } = button.dataset;

        document.querySelectorAll('#toolbox .tool-btn').forEach(btn => btn.classList.remove('selected'));
        button.classList.add('selected');

        this.currentTool = { tool, team, type };
    }

    getMousePos(e) {
         const rect = this.gameManager.canvas.getBoundingClientRect();
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

    spawnRandomWeaponNear(pos) {
        const gm = this.gameManager;
        const weaponTypes = ['sword', 'bow', 'dual_swords', 'fire_staff', 'lightning', 'magic_spear', 'boomerang', 'poison_potion', 'magic_dagger', 'axe', 'hadoken', 'shuriken', 'ice_diamond'];
        const randomType = weaponTypes[Math.floor(gm.random() * weaponTypes.length)];

        for (let i = 0; i < 10; i++) {
            const angle = gm.random() * Math.PI * 2;
            const radius = GRID_SIZE * (gm.random() * 2 + 1);
            const spawnX = Math.floor((pos.x + Math.cos(angle) * radius) / GRID_SIZE);
            const spawnY = Math.floor((pos.y + Math.sin(angle) * radius) / GRID_SIZE);

            if (spawnY >= 0 && spawnY < gm.ROWS && spawnX >= 0 && spawnX < gm.COLS && gm.map[spawnY][spawnX].type === TILE.FLOOR) {
                const isOccupied = gm.weapons.some(w => w.gridX === spawnX && w.gridY === spawnY);
                if (!isOccupied) {
                    gm.weapons.push(this.createWeapon(spawnX, spawnY, randomType));
                    return;
                }
            }
        }
    }

    draw(mouseEvent = null) {
        const gm = this.gameManager;
        this.ctx.save();
        this.ctx.fillStyle = '#1f2937';
        this.ctx.fillRect(0, 0, gm.canvas.width, gm.canvas.height);

        const cam = gm.actionCam;
        this.ctx.translate(gm.canvas.width / 2, gm.canvas.height / 2);
        this.ctx.scale(cam.current.scale, cam.current.scale);
        this.ctx.translate(-cam.current.x, -cam.current.y);

        this.drawMap();
        gm.magicCircles.forEach(c => c.draw(this.ctx));
        gm.poisonClouds.forEach(c => c.draw(this.ctx));
        
        if (gm.state === 'SIMULATE' || gm.state === 'PAUSED' || gm.state === 'ENDING') {
            if (gm.autoMagneticField.isActive) {
                this.ctx.fillStyle = `rgba(168, 85, 247, 0.2)`;
                const b = gm.autoMagneticField.currentBounds;
                this.ctx.fillRect(0, 0, b.minX * GRID_SIZE, gm.canvas.height);
                this.ctx.fillRect(b.maxX * GRID_SIZE, 0, gm.canvas.width - b.maxX * GRID_SIZE, gm.canvas.height);
                this.ctx.fillRect(b.minX * GRID_SIZE, 0, (b.maxX - b.minX) * GRID_SIZE, b.minY * GRID_SIZE);
                this.ctx.fillRect(b.minX * GRID_SIZE, b.maxY * GRID_SIZE, (b.maxX - b.minX) * GRID_SIZE, gm.canvas.height - b.maxY * GRID_SIZE);
            }

            gm.growingFields.forEach(field => {
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
        
        gm.growingFields.forEach(w => w.draw(this.ctx));
        gm.weapons.forEach(w => w.draw(this.ctx));
        gm.nexuses.forEach(n => n.draw(this.ctx));
        gm.projectiles.forEach(p => p.draw(this.ctx));
        gm.units.forEach(u => u.draw(this.ctx, gm.isUnitOutlineEnabled, gm.unitOutlineWidth));
        gm.effects.forEach(e => e.draw(this.ctx));
        gm.areaEffects.forEach(e => e.draw(this.ctx));
        gm.particles.forEach(p => p.draw(this.ctx));

        if (gm.state === 'EDIT' && this.currentTool.tool === 'growing_field' && this.dragStartPos && this.isPainting && mouseEvent) {
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
        const gm = this.gameManager;
        for (let y = 0; y < gm.ROWS; y++) {
            for (let x = 0; x < gm.COLS; x++) {
                if (!gm.map || !gm.map[y] || !gm.map[y][x]) continue;
                const tile = gm.map[y][x];
                
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
                    const flicker = Math.sin(gm.animationFrameCounter * 0.1 + x + y) * 10 + 10;
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
                    const angle = gm.animationFrameCounter * 0.05;
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

                if (gm.state === 'EDIT') {
                    this.ctx.strokeStyle = COLORS.GRID;
                    this.ctx.strokeRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
                }
            }
        }
    }
}
