import { TILE, COLORS, GRID_SIZE } from './constants.js';

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

export function drawMapImpl() {
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
                // keep as-is; additional map decorations remain in the original file
            }
        }
    }
}


