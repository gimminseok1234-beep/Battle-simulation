import { TILE, COLORS, GRID_SIZE } from './constants.js';
import { Weapon } from './weaponary.js';
import { Unit } from './unit.js';
import { Nexus, GrowingMagneticField } from './entities.js';

const MAX_RECENT_COLORS = 8;

/**
 * UI 관련 로직 및 자주 수정되는 코드를 관리하는 클래스입니다.
 * (툴박스, 그리기, 사용자 입력, 무기/타일 생성 등)
 */
export class GameUIManager {
    constructor(gameManager) {
        this.gameManager = gameManager;

        // UI 상태 및 편집 도구 관련 속성
        this.isPainting = false;
        this.dragStartPos = null;
        this.currentTool = { tool: 'tile', type: 'FLOOR' };
        
        // 색상 관련 속성
        this.currentFloorColor = COLORS.FLOOR;
        this.currentWallColor = COLORS.WALL;
        this.recentFloorColors = [];
        this.recentWallColors = [];

        // 타일 및 무기 설정 관련 속성
        this.replicationValue = 1;
        this.dashTileSettings = { direction: 'RIGHT' };
        this.growingFieldSettings = { direction: 'DOWN', speed: 4, delay: 0 };
    }

    /**
     * 왼쪽 툴박스 UI를 생성하고 HTML에 삽입합니다.
     */
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

    /**
     * 사용자가 선택한 도구를 현재 도구로 설정합니다.
     * @param {HTMLElement} toolButton - 사용자가 클릭한 도구 버튼 요소
     */
    selectTool(toolButton) {
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('selected'));
        toolButton.classList.add('selected');
        this.currentTool = {
            tool: toolButton.dataset.tool,
            type: toolButton.dataset.type,
            team: toolButton.dataset.team
        };
    }

    /**
     * 마우스 이벤트로부터 캔버스 좌표를 계산하여 반환합니다.
     * @param {MouseEvent} evt - 마우스 이벤트 객체
     * @returns {{pixelX: number, pixelY: number, gridX: number, gridY: number}}
     */
    getMousePos(evt) {
        const gm = this.gameManager;
        const rect = gm.canvas.getBoundingClientRect();
        const transform = gm.ctx.getTransform();
        const invTransform = transform.inverse();

        const canvasX = evt.clientX - rect.left;
        const canvasY = evt.clientY - rect.top;

        const worldX = canvasX * invTransform.a + canvasY * invTransform.c + invTransform.e;
        const worldY = canvasX * invTransform.b + canvasY * invTransform.d + invTransform.f;
        
        return {
            pixelX: worldX,
            pixelY: worldY,
            gridX: Math.floor(worldX / GRID_SIZE),
            gridY: Math.floor(worldY / GRID_SIZE)
        };
    }

    /**
     * 현재 선택된 도구를 지정된 위치에 적용합니다.
     * @param {{pixelX: number, pixelY: number, gridX: number, gridY: number}} pos 
     */
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

    /**
     * 지정된 타입의 무기를 생성하고 능력치를 설정하여 반환합니다.
     * @param {number} x - 그리드 X 좌표
     * @param {number} y - 그리드 Y 좌표
     * @param {string} type - 무기 타입
     * @returns {Weapon}
     */
    createWeapon(x, y, type) {
        const weapon = new Weapon(this.gameManager, x, y, type);
        // 무기 타입별 능력치 설정 (수정이 잦은 부분이므로 여기에 위치)
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

    /**
     * '물음표' 타일 효과로 주변에 무작위 무기를 생성합니다.
     * @param {{x: number, y: number}} pos 
     */
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
    
    /**
     * 현재 게임 상태를 캔버스에 그립니다.
     * @param {MouseEvent | null} mouseEvent - 마우스 이동 이벤트 (드래그 영역 표시에 사용)
     */
    draw(mouseEvent = null) {
        const gm = this.gameManager;
        const ctx = gm.ctx;

        ctx.save();
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, 0, gm.canvas.width, gm.canvas.height);

        const cam = gm.actionCam;
        ctx.translate(gm.canvas.width / 2, gm.canvas.height / 2);
        ctx.scale(cam.current.scale, cam.current.scale);
        ctx.translate(-cam.current.x, -cam.current.y);

        this.drawMap();
        gm.magicCircles.forEach(c => c.draw(ctx));
        gm.poisonClouds.forEach(c => c.draw(ctx));
        
        if (gm.state === 'SIMULATE' || gm.state === 'PAUSED' || gm.state === 'ENDING') {
            if (gm.autoMagneticField.isActive) {
                ctx.fillStyle = `rgba(168, 85, 247, 0.2)`;
                const b = gm.autoMagneticField.currentBounds;
                ctx.fillRect(0, 0, b.minX * GRID_SIZE, gm.canvas.height);
                ctx.fillRect(b.maxX * GRID_SIZE, 0, gm.canvas.width - b.maxX * GRID_SIZE, gm.canvas.height);
                ctx.fillRect(b.minX * GRID_SIZE, 0, (b.maxX - b.minX) * GRID_SIZE, b.minY * GRID_SIZE);
                ctx.fillRect(b.minX * GRID_SIZE, b.maxY * GRID_SIZE, (b.maxX - b.minX) * GRID_SIZE, gm.canvas.height - b.maxY * GRID_SIZE);
            }

            gm.growingFields.forEach(field => {
                if (field.delayTimer < field.delay) return;
                ctx.fillStyle = `rgba(168, 85, 247, 0.2)`;
                const startX = field.gridX * GRID_SIZE;
                const startY = field.gridY * GRID_SIZE;
                const totalWidth = field.width * GRID_SIZE;
                const totalHeight = field.height * GRID_SIZE;

                if (field.direction === 'DOWN') ctx.fillRect(startX, startY, totalWidth, totalHeight * field.progress);
                else if (field.direction === 'UP') ctx.fillRect(startX, startY + totalHeight * (1 - field.progress), totalWidth, totalHeight * field.progress);
                else if (field.direction === 'RIGHT') ctx.fillRect(startX, startY, totalWidth * field.progress, totalHeight);
                else if (field.direction === 'LEFT') ctx.fillRect(startX + totalWidth * (1 - field.progress), startY, totalWidth * field.progress, totalHeight);
            });
        }
        
        gm.growingFields.forEach(w => w.draw(ctx));
        gm.weapons.forEach(w => w.draw(ctx));
        gm.nexuses.forEach(n => n.draw(ctx));
        gm.projectiles.forEach(p => p.draw(ctx));
        gm.units.forEach(u => u.draw(ctx, gm.isUnitOutlineEnabled, gm.unitOutlineWidth));
        gm.effects.forEach(e => e.draw(ctx));
        gm.areaEffects.forEach(e => e.draw(ctx));
        gm.particles.forEach(p => p.draw(ctx));

        if (gm.state === 'EDIT' && this.currentTool.tool === 'growing_field' && this.dragStartPos && this.isPainting && mouseEvent) {
            const currentPos = this.getMousePos(mouseEvent);
            const x = Math.min(this.dragStartPos.gridX, currentPos.gridX) * GRID_SIZE;
            const y = Math.min(this.dragStartPos.gridY, currentPos.gridY) * GRID_SIZE;
            const width = (Math.abs(this.dragStartPos.gridX - currentPos.gridX) + 1) * GRID_SIZE;
            const height = (Math.abs(this.dragStartPos.gridY - currentPos.gridY) + 1) * GRID_SIZE;
            
            ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
            ctx.fillRect(x, y, width, height);
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
            ctx.strokeRect(x, y, width, height);
        }

        ctx.restore();
    }

    /**
     * 맵의 타일들을 캔버스에 그립니다.
     */
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
    
    /**
     * 맵 카드에 표시될 작은 미리보기 이미지를 그립니다.
     * @param {HTMLCanvasElement} previewCanvas 
     * @param {object} mapData 
     */
    drawMapPreview(previewCanvas, mapData) {
        const gm = this.gameManager;
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
                    case 'A': color = COLORS.TEAM_A; break;
                    case 'B': color = COLORS.TEAM_B; break;
                    case 'C': color = COLORS.TEAM_C; break;
                    case 'D': color = COLORS.TEAM_D; break;
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

    // --- 색상 관리 메서드 ---
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
        this.gameManager.draw();
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
}

