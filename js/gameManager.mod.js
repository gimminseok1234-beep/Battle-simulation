// Frequently-edited module: weapons/tiles registries, map drawing utilities, and tuning knobs
import { TILE, COLORS, GRID_SIZE } from './constants.js';

// Weapon registry: extend when adding new weapons (label used in toolbox)
export const WeaponRegistry = [
    { type: 'sword', label: '검' },
    { type: 'axe', label: '도끼' },
    { type: 'bow', label: '활' },
    { type: 'ice_diamond', label: '얼음 다이아' },
    { type: 'dual_swords', label: '쌍검' },
    { type: 'fire_staff', label: '불 지팡이' },
    { type: 'lightning', label: '번개' },
    { type: 'magic_spear', label: '마법창' },
    { type: 'boomerang', label: '부메랑' },
    { type: 'poison_potion', label: '독 포션' },
    { type: 'magic_dagger', label: '마법 단검' },
    { type: 'hadoken', label: '장풍', hasSettings: true, settingsBtnId: 'hadokenSettingsBtn' },
    { type: 'shuriken', label: '표창' },
    { type: 'crown', label: '왕관' }
];

// Centralized weapon balance knobs
export const WeaponBalance = {
    sword: { attackPowerBonus: 15 },
    axe: { attackPowerBonus: 18, attackRangeBonus: -0.2 * GRID_SIZE },
    bow: { attackPowerBonus: 10, attackRangeBonus: 5 * GRID_SIZE, detectionRangeBonus: 4 * GRID_SIZE },
    ice_diamond: { attackPowerBonus: 8, attackRangeBonus: 5 * GRID_SIZE, detectionRangeBonus: 4 * GRID_SIZE },
    dual_swords: { attackPowerBonus: 3, speedBonus: 0.6, attackCooldownBonus: -40 },
    fire_staff: { attackPowerBonus: 25, attackRangeBonus: 6 * GRID_SIZE, detectionRangeBonus: 2 * GRID_SIZE },
    hadoken: { attackPowerBonus: 20, attackRangeBonus: 5 * GRID_SIZE, detectionRangeBonus: 4 * GRID_SIZE },
    shuriken: { attackPowerBonus: 12, speedBonus: 0.3, attackCooldownBonus: 100, attackRangeBonus: 5 * GRID_SIZE, detectionRangeBonus: 4 * GRID_SIZE },
    lightning: { attackPowerBonus: 8, attackRangeBonus: 6 * GRID_SIZE, attackCooldownBonus: -20 },
    magic_spear: { attackRangeBonus: 5 * GRID_SIZE, normalAttackPowerBonus: 5, specialAttackPowerBonus: 15 },
    boomerang: { attackPowerBonus: 10, attackRangeBonus: 7 * GRID_SIZE, detectionRangeBonus: 6 * GRID_SIZE },
    poison_potion: { attackPowerBonus: 10 },
    magic_dagger: { attackPowerBonus: 12 },
    crown: { attackPowerBonus: 5 }
};

export function applyWeaponBonuses(weapon) {
    const b = WeaponBalance[weapon.type];
    if (!b) return weapon;
    for (const k in b) {
        weapon[k] = b[k];
    }
    return weapon;
}

export function getRandomWeaponType(randomFn = Math.random) {
    const types = WeaponRegistry.map(w => w.type);
    return types[Math.floor(randomFn() * types.length)];
}

// Global tuning defaults
export const TuningDefaults = {
    hadokenKnockback: 15,
    growingFieldSettings: { direction: 'DOWN', speed: 4, delay: 0 },
    dashTileSettings: { direction: 'RIGHT' },
    autoMagneticField: {
        isActive: false,
        safeZoneSize: 6,
        simulationTime: 0,
        totalShrinkTime: 60 * 60,
        shrinkType: 'all',
        currentBounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 }
    }
};

// Special tile registry (simple button-only tiles)
export const SpecialTileRegistry = [
    { type: 'GLASS_WALL', label: '유리벽' },
    { type: 'CRACKED_WALL', label: '부서지는 벽' },
    { type: 'HEAL_PACK', label: '회복 팩' },
    { type: 'AWAKENING_POTION', label: '각성 물약' },
    { type: 'TELEPORTER', label: '텔레포터' },
    { type: 'QUESTION_MARK', label: '물음표' }
];

// Tile registry: extend when adding new tiles
export const TileRegistry = {
    getTileFillStyle(tile, currentWallColor, currentFloorColor) {
        switch (tile.type) {
            case TILE.WALL: return tile.color || currentWallColor;
            case TILE.FLOOR: return tile.color || currentFloorColor;
            case TILE.LAVA: return COLORS.LAVA;
            case TILE.CRACKED_WALL: return COLORS.CRACKED_WALL;
            case TILE.HEAL_PACK: return COLORS.HEAL_PACK;
            case TILE.AWAKENING_POTION: return currentFloorColor;
            case TILE.REPLICATION_TILE: return COLORS.REPLICATION_TILE;
            case TILE.QUESTION_MARK: return COLORS.QUESTION_MARK;
            case TILE.DASH_TILE: return COLORS.DASH_TILE;
            case TILE.GLASS_WALL: return COLORS.GLASS_WALL;
            case TILE.TELEPORTER: return currentFloorColor;
            default: return currentFloorColor;
        }
    }
};

// Map rendering implementation (was in gameManager.render.js)
export function drawMapImpl() {
    for (let y = 0; y < this.ROWS; y++) {
        for (let x = 0; x < this.COLS; x++) {
            if (!this.map || !this.map[y] || !this.map[y][x]) continue;
            const tile = this.map[y][x];

            this.ctx.fillStyle = TileRegistry.getTileFillStyle(
                tile,
                this.currentWallColor,
                this.currentFloorColor
            );
            this.ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);

            if (tile.type === TILE.LAVA) {
                const flicker = Math.sin(this.animationFrameCounter * 0.1 + x + y) * 10 + 10;
                this.ctx.fillStyle = `rgba(255, 255, 0, 0.3)`;
                this.ctx.beginPath(); this.ctx.arc(x * GRID_SIZE + 10, y * GRID_SIZE + 10, flicker / 4, 0, Math.PI * 2); this.ctx.fill();
            } else if (tile.type === TILE.CRACKED_WALL) {
                this.ctx.strokeStyle = 'rgba(0,0,0,0.7)'; this.ctx.lineWidth = 1.5;
                this.ctx.beginPath();
                this.ctx.moveTo(x * GRID_SIZE + 4, y * GRID_SIZE + 4); this.ctx.lineTo(x * GRID_SIZE + 10, y * GRID_SIZE + 10);
                this.ctx.moveTo(x * GRID_SIZE + 10, y * GRID_SIZE + 10); this.ctx.lineTo(x * GRID_SIZE + 8, y * GRID_SIZE + 16);
                this.ctx.moveTo(x * GRID_SIZE + 16, y * GRID_SIZE + 5); this.ctx.lineTo(x * GRID_SIZE + 10, y * GRID_SIZE + 9);
                this.ctx.moveTo(x * GRID_SIZE + 10, y * GRID_SIZE + 9); this.ctx.lineTo(x * GRID_SIZE + 15, y * GRID_SIZE + 17);
                this.ctx.stroke();
            } else if (tile.type === TILE.TELEPORTER) {
                // Additional decorations remain optional
            }
        }
    }
}

// High-level draw implementation (merged from gameManager.render.js)
export function drawImpl(mouseEvent) {
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
            if (this.autoMagneticField.shrinkType === 'vertical') {
                this.ctx.fillRect(0, 0, this.canvas.width, b.minY * GRID_SIZE);
                this.ctx.fillRect(0, b.maxY * GRID_SIZE, this.canvas.width, this.canvas.height - b.maxY * GRID_SIZE);
            } else {
                this.ctx.fillRect(0, 0, b.minX * GRID_SIZE, this.canvas.height);
                this.ctx.fillRect(b.maxX * GRID_SIZE, 0, this.canvas.width - b.maxX * GRID_SIZE, this.canvas.height);
                this.ctx.fillRect(b.minX * GRID_SIZE, 0, (b.maxX - b.minX) * GRID_SIZE, b.minY * GRID_SIZE);
                this.ctx.fillRect(b.minX * GRID_SIZE, b.maxY * GRID_SIZE, (b.maxX - b.minX) * GRID_SIZE, this.canvas.height - b.maxY * GRID_SIZE);
            }
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

// Logic helpers
export function hasLineOfSightImpl(startUnit, endTarget, isWeaponCheck = false) {
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
            if (tile.type === TILE.WALL || tile.type === TILE.CRACKED_WALL) return false;
        }
    }
    return true;
}

export function hasLineOfSightForWeaponImpl(startUnit, endTarget) {
    return hasLineOfSightImpl.call(this, startUnit, endTarget, true);
}

export function isPosInAnyFieldImpl(gridX, gridY) {
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

export function findClosestSafeSpotImpl(pixelX, pixelY) {
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

export function isPosInLavaForUnitImpl(gridX, gridY) {
    if (gridY < 0 || gridY >= this.ROWS || gridX < 0 || gridX >= this.COLS) {
        return true;
    }
    return this.map[gridY][gridX].type === TILE.LAVA;
}

export function findClosestSafeSpotFromLavaImpl(pixelX, pixelY) {
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

export function findClosestEnemyImpl(x, y, ownerTeam, excludeSet) {
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

export function findEmptySpotNearImpl(targetUnit) {
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

export function damageTileImpl(x, y, damage) {
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

// Centralized damage hook for units/nexus; extend to add modifiers
export function applyDamageImpl(target, damage, effectInfo = {}, attacker = null) {
    if (!target || typeof target.takeDamage !== 'function') return;
    target.takeDamage(damage, effectInfo, attacker);
}

export function spawnMagicCircleImpl(team) {
    const availableTiles = [];
    for (let y = 0; y < this.ROWS; y++) {
        for (let x = 0; x < this.COLS; x++) {
            if (this.map[y][x].type === TILE.FLOOR) {
                const isOccupied = this.units.some(u => u.gridX === x && u.gridY === y) ||
                                   this.nexuses.some(n => n.gridX === x && n.gridY === y) ||
                                   this.magicCircles.some(c => c.gridX === x && c.gridY === y);
                if (!isOccupied) availableTiles.push({ x, y });
            }
        }
    }
    if (availableTiles.length > 0) {
        const pos = availableTiles[Math.floor(this.random() * availableTiles.length)];
        this.magicCircles.push(new MagicCircle(this, pos.x, pos.y, team));
    }
}

export function spawnRandomWeaponNearImpl(pos) {
    const randomType = getRandomWeaponType(() => this.random());
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


