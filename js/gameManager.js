import { TILE, TEAM, COLORS, GRID_SIZE } from './constants.js';
import { GameManager } from './gameManager.js'; // GameManager 클래스만 import

// 성장형 자기장 클래스
export class GrowingMagneticField {
    constructor(id, x, y, width, height, settings) {
        this.id = id;
        this.gridX = x; this.gridY = y;
        this.width = width; this.height = height;
        
        this.direction = settings.direction;
        this.totalFrames = settings.speed * 60;
        this.delay = settings.delay * 60;
        
        this.delayTimer = 0;
        this.animationTimer = 0;
        this.progress = 0;
    }

    update() {
        if (this.delayTimer < this.delay) {
            this.delayTimer++;
            return;
        }
        if (this.animationTimer < this.totalFrames) {
            this.animationTimer++;
        }
        const linearProgress = this.animationTimer / this.totalFrames;
        this.progress = -(Math.cos(Math.PI * linearProgress) - 1) / 2;
    }

    draw(ctx) {
        const gameManager = GameManager.getInstance(); // GameManager 인스턴스 가져오기
        if (!gameManager) return;

        const startX = this.gridX * GRID_SIZE;
        const startY = this.gridY * GRID_SIZE;
        const totalWidth = this.width * GRID_SIZE;
        const totalHeight = this.height * GRID_SIZE;
        
        if (gameManager.state === 'EDIT') {
            ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
            ctx.fillRect(startX, startY, totalWidth, totalHeight);
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
            ctx.strokeRect(startX, startY, totalWidth, totalHeight);

            const centerX = startX + totalWidth / 2;
            const centerY = startY + totalHeight / 2;
            
            ctx.save();
            ctx.translate(centerX, centerY);
            
            let angle = 0;
            switch(this.direction) {
                case 'RIGHT': angle = 0; break;
                case 'LEFT':  angle = Math.PI; break;
                case 'DOWN':  angle = Math.PI / 2; break;
                case 'UP':    angle = -Math.PI / 2; break;
            }
            ctx.rotate(angle);

            const arrowLength = Math.min(totalWidth, totalHeight) * 0.4;
            const headSize = Math.min(arrowLength * 0.5, GRID_SIZE * 1.5);
            const bodyWidth = headSize * 0.4;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(-arrowLength / 2, -bodyWidth / 2);
            ctx.lineTo(arrowLength / 2 - headSize, -bodyWidth / 2);
            ctx.lineTo(arrowLength / 2 - headSize, -headSize / 2);
            ctx.lineTo(arrowLength / 2, 0);
            ctx.lineTo(arrowLength / 2 - headSize, headSize / 2);
            ctx.lineTo(arrowLength / 2 - headSize, bodyWidth / 2);
            ctx.lineTo(-arrowLength / 2, bodyWidth / 2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }
    }
}


// 넥서스 클래스
export class Nexus {
    constructor(x, y, team) {
        this.gridX = x; this.gridY = y;
        this.pixelX = x * GRID_SIZE + GRID_SIZE / 2;
        this.pixelY = y * GRID_SIZE + GRID_SIZE / 2;
        this.team = team;
        this.hp = 500;
        this.maxHp = 500;
        this.isDestroying = false;
        this.explosionParticles = [];
    }
    takeDamage(damage) {
        if (this.isDestroying) return;
        this.hp -= damage;
        const gameManager = GameManager.getInstance();
        if (this.hp <= 0) {
            this.hp = 0;
            this.isDestroying = true;
            this.createExplosion();
            if (gameManager) gameManager.audioManager.play('nexusDestruction');
        }
    }
    createExplosion() {
        for (let i = 0; i < 60; i++) {
            this.explosionParticles.push({
                x: this.pixelX, y: this.pixelY,
                angle: Math.random() * Math.PI * 2,
                speed: Math.random() * 6 + 2,
                radius: Math.random() * 5 + 2,
                lifespan: 80,
                color: ['#ffcc00', '#ff9900', '#ff6600', '#666666', '#ef4444'][Math.floor(Math.random() * 5)]
            });
        }
    }
    update() {
        if (!this.isDestroying) return;
        this.explosionParticles.forEach(p => {
            p.x += Math.cos(p.angle) * p.speed;
            p.y += Math.sin(p.angle) * p.speed;
            p.lifespan -= 1;
            p.speed *= 0.97;
        });
        this.explosionParticles = this.explosionParticles.filter(p => p.lifespan > 0);
    }
    draw(ctx) {
        if (this.isDestroying) {
            this.drawExplosion(ctx);
        } else {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            switch(this.team) {
                case TEAM.A: ctx.fillStyle = COLORS.TEAM_A; break;
                case TEAM.B: ctx.fillStyle = COLORS.TEAM_B; break;
                case TEAM.C: ctx.fillStyle = COLORS.TEAM_C; break;
                case TEAM.D: ctx.fillStyle = COLORS.TEAM_D; break;
            }
            ctx.strokeStyle = 'black'; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -GRID_SIZE * 0.8); ctx.lineTo(GRID_SIZE * 0.7, 0);
            ctx.lineTo(0, GRID_SIZE * 0.8); ctx.lineTo(-GRID_SIZE * 0.7, 0);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            const hpBarWidth = GRID_SIZE * 1.5;
            const hpBarX = -hpBarWidth / 2;
            const hpBarY = -GRID_SIZE * 1.2;
            ctx.fillStyle = '#111827'; ctx.fillRect(hpBarX, hpBarY, hpBarWidth, 8);
            ctx.fillStyle = '#facc15'; ctx.fillRect(hpBarX, hpBarY, hpBarWidth * (this.hp / this.maxHp), 8);
            ctx.restore();
        }
    }
    drawExplosion(ctx) {
        this.explosionParticles.forEach(p => {
            ctx.globalAlpha = p.lifespan / 80;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1.0;
    }
}

// 발사체 클래스
export class Projectile {
    constructor(owner, target, type = 'arrow') {
        const gameManager = GameManager.getInstance();
        this.owner = owner; this.pixelX = owner.pixelX; this.pixelY = owner.pixelY;
        this.type = type;
        
        if (type === 'hadoken') this.speed = 4;
        else if (type === 'shuriken') this.speed = 2;
        else this.speed = 6;

        this.damage = owner.attackPower;
        this.knockback = (type === 'hadoken') ? gameManager.hadokenKnockback : 0;
        const inaccuracy = (type === 'shuriken') ? 0 : GRID_SIZE * 0.8;
        const targetX = target.pixelX + (Math.random() - 0.5) * inaccuracy;
        const targetY = target.pixelY + (Math.random() - 0.5) * inaccuracy;
        const dx = targetX - this.pixelX; const dy = targetY - this.pixelY;
        this.angle = Math.atan2(dy, dx);
        this.destroyed = false;
        this.trail = [];
        this.rotationAngle = 0;
    }
    update() {
        const gameManager = GameManager.getInstance();
        if (!gameManager) return;
        
        if (this.type === 'hadoken') {
            this.trail.push({x: this.pixelX, y: this.pixelY});
            if (this.trail.length > 10) this.trail.shift();
        }
        if (this.type === 'shuriken') {
            this.rotationAngle += 0.4 * gameManager.gameSpeed;
        }

        const nextX = this.pixelX + Math.cos(this.angle) * gameManager.gameSpeed * this.speed;
        const nextY = this.pixelY + Math.sin(this.angle) * gameManager.gameSpeed * this.speed;
        const gridX = Math.floor(nextX / GRID_SIZE);
        const gridY = Math.floor(nextY / GRID_SIZE);

        if (gridY >= 0 && gridY < gameManager.ROWS && gridX >= 0 && gridX < gameManager.COLS) {
            const tile = gameManager.map[gridY][gridX];
            if (tile.type === TILE.WALL || tile.type === TILE.CRACKED_WALL) {
                if (tile.type === TILE.CRACKED_WALL) {
                    gameManager.damageTile(gridX, gridY, this.damage);
                }
                this.destroyed = true;
                return;
            }
        }
        this.pixelX = nextX; this.pixelY = nextY;
    }
    draw(ctx) {
        if (this.type === 'arrow') {
            ctx.save(); ctx.translate(this.pixelX, this.pixelY); ctx.rotate(this.angle);
            ctx.fillStyle = '#a16207';
            ctx.fillRect(-GRID_SIZE * 0.6, -1, GRID_SIZE * 0.6, 2);
            ctx.strokeRect(-GRID_SIZE * 0.6, -1, GRID_SIZE * 0.6, 2);
            ctx.fillStyle = '#e5e7eb';
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-4, -3); ctx.lineTo(-4, 3); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#d1d5db';
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.6, -1); ctx.lineTo(-GRID_SIZE * 0.7, -3);
            ctx.lineTo(-GRID_SIZE * 0.5, -1); ctx.closePath();
            ctx.fill()
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.6, 1); ctx.lineTo(-GRID_SIZE * 0.7, 3);
            ctx.lineTo(-GRID_SIZE * 0.5, 1); ctx.closePath();
            ctx.fill()
            ctx.restore();
        } else if (this.type === 'hadoken') {
            // Draw trail
            for (let i = 0; i < this.trail.length; i++) {
                const pos = this.trail[i];
                const alpha = (i / this.trail.length) * 0.5;
                ctx.fillStyle = `rgba(139, 92, 246, ${alpha})`;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, (GRID_SIZE / 2) * (i / this.trail.length), 0, Math.PI * 2);
                ctx.fill();
            }
            // Draw main projectile
            ctx.fillStyle = '#c4b5fd';
            ctx.beginPath();
            ctx.arc(this.pixelX, this.pixelY, GRID_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#8b5cf6';
            ctx.beginPath();
            ctx.arc(this.pixelX, this.pixelY, GRID_SIZE / 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'shuriken') {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.rotationAngle);
            const scale = 0.6;
            ctx.scale(scale, scale);
            ctx.fillStyle = '#9ca3af'; 
            ctx.strokeStyle = '#4b5563'; 
            ctx.lineWidth = 2 / scale;

            ctx.beginPath();
            ctx.moveTo(0, -GRID_SIZE * 0.8);
            ctx.lineTo(GRID_SIZE * 0.2, -GRID_SIZE * 0.2);
            ctx.lineTo(GRID_SIZE * 0.8, 0);
            ctx.lineTo(GRID_SIZE * 0.2, GRID_SIZE * 0.2);
            ctx.lineTo(0, GRID_SIZE * 0.8);
            ctx.lineTo(-GRID_SIZE * 0.2, GRID_SIZE * 0.2);
            ctx.lineTo(-GRID_SIZE * 0.8, 0);
            ctx.lineTo(-GRID_SIZE * 0.2, -GRID_SIZE * 0.2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#d1d5db'; 
            ctx.beginPath();
            ctx.arc(0, 0, GRID_SIZE * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
    }
}

// 광역 효과 클래스
export class AreaEffect {
    constructor(x, y, type) {
        this.pixelX = x; this.pixelY = y; this.type = type;
        this.duration = 30; this.maxRadius = GRID_SIZE * 2.5; this.currentRadius = 0;
    }
    update() {
        const gameManager = GameManager.getInstance();
        if (!gameManager) return;
        this.duration -= gameManager.gameSpeed;
        this.currentRadius = this.maxRadius * (1 - (this.duration / 30));
    }
    draw(ctx) {
        if (this.type === 'fire_pillar') {
            const opacity = this.duration / 30;
            ctx.fillStyle = `rgba(255, 165, 0, ${opacity * 0.5})`;
            ctx.beginPath(); ctx.arc(this.pixelX, this.pixelY, this.currentRadius, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = `rgba(255, 69, 0, ${opacity * 0.7})`;
            ctx.beginPath(); ctx.arc(this.pixelX, this.pixelY, this.currentRadius * 0.6, 0, Math.PI * 2); ctx.fill();
        }
    }
}

// 시각 효과 클래스
export class Effect {
    constructor(x, y, type, target) {
        this.x = x; this.y = y; this.type = type; this.target = target;
        this.duration = 20; this.angle = Math.random() * Math.PI * 2;
    }
    update() {
        const gameManager = GameManager.getInstance();
        if (!gameManager) return;
        this.duration -= gameManager.gameSpeed;
    }
    draw(ctx) {
        if (this.type === 'slash' || this.type === 'dual_sword_slash') {
            ctx.save();
            ctx.translate(this.target.pixelX, this.target.pixelY);
            ctx.rotate(this.angle);
            ctx.strokeStyle = `rgba(220, 38, 38, ${this.duration / 20})`;
            ctx.lineWidth = this.type === 'slash' ? 3 : 2;
            const arcSize = this.type === 'slash' ? GRID_SIZE : GRID_SIZE * 0.7;
            ctx.beginPath();
            ctx.arc(0, 0, arcSize, -0.5, 0.5);
            ctx.stroke();
            ctx.restore();
        }
    }
}

// 무기 클래스
export class Weapon {
    constructor(x, y, type) {
        this.gridX = x; this.gridY = y;
        this.pixelX = x * GRID_SIZE + GRID_SIZE / 2;
        this.pixelY = y * GRID_SIZE + GRID_SIZE / 2;
        this.type = type;
        this.isEquipped = false;
    }
    draw(ctx) {
        if (this.isEquipped) return;
        const centerX = this.pixelX; const centerY = this.pixelY;
        const scale = (this.type === 'crown') ? 1.0 : 0.8;
        ctx.save(); ctx.translate(centerX, centerY); ctx.scale(scale, scale);
        ctx.strokeStyle = 'black'; ctx.lineWidth = 1 / scale;

        if (this.type === 'sword') {
            ctx.rotate(Math.PI / 4);
            const bladeGradient = ctx.createLinearGradient(0, -GRID_SIZE, 0, 0);
            bladeGradient.addColorStop(0, '#f3f4f6'); bladeGradient.addColorStop(1, '#9ca3af');
            ctx.fillStyle = bladeGradient;
            ctx.beginPath();
            ctx.moveTo(-2, GRID_SIZE * 0.3); ctx.lineTo(-2, -GRID_SIZE * 1.0);
            ctx.lineTo(0, -GRID_SIZE * 1.2); ctx.lineTo(2, -GRID_SIZE * 1.0);
            ctx.lineTo(2, GRID_SIZE * 0.3);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#374151';
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.4, GRID_SIZE * 0.3); ctx.lineTo(GRID_SIZE * 0.4, GRID_SIZE * 0.3);
            ctx.lineTo(GRID_SIZE * 0.5, GRID_SIZE * 0.3 + 3); ctx.lineTo(-GRID_SIZE * 0.5, GRID_SIZE * 0.3 + 3);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(-1.5, GRID_SIZE * 0.3 + 3, 3, GRID_SIZE * 0.3); ctx.strokeRect(-1.5, GRID_SIZE * 0.3 + 3, 3, GRID_SIZE * 0.3);
        } else if (this.type === 'bow') {
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#f3f4f6';
            ctx.fillRect(-GRID_SIZE * 0.7, -1, GRID_SIZE * 1.2, 2);
            ctx.strokeRect(-GRID_SIZE * 0.7, -1, GRID_SIZE * 1.2, 2);
            ctx.fillStyle = '#e5e7eb';
            ctx.beginPath(); ctx.moveTo(GRID_SIZE * 0.5, 0); ctx.lineTo(GRID_SIZE * 0.3, -3); ctx.lineTo(GRID_SIZE * 0.3, 3); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#d1d5db';
            ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.6, -1); ctx.lineTo(-GRID_SIZE * 0.7, -4); ctx.lineTo(-GRID_SIZE * 0.5, -1); ctx.closePath(); ctx.fill()
            ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.6, 1); ctx.lineTo(-GRID_SIZE * 0.7, 4); ctx.lineTo(-GRID_SIZE * 0.5, 1); ctx.closePath(); ctx.fill()
            ctx.strokeStyle = 'black'; ctx.lineWidth = 6 / scale; ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.8, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke();
            ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 4 / scale; ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.8, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke();
            ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1.5 / scale; ctx.beginPath();
            const arcRadius = GRID_SIZE * 0.8, arcAngle = Math.PI / 2.2;
            ctx.moveTo(Math.cos(-arcAngle) * arcRadius, Math.sin(-arcAngle) * arcRadius);
            ctx.lineTo(-GRID_SIZE * 0.4, 0);
            ctx.lineTo(Math.cos(arcAngle) * arcRadius, Math.sin(arcAngle) * arcRadius); ctx.stroke();
        } else if (this.type === 'dual_swords') {
            const drawCurvedSword = (rotation) => {
                ctx.save();
                ctx.rotate(rotation);
                ctx.fillStyle = '#6b7280';
                ctx.fillRect(-GRID_SIZE * 0.1, GRID_SIZE * 0.3, GRID_SIZE * 0.2, GRID_SIZE * 0.3);
                ctx.strokeRect(-GRID_SIZE * 0.1, GRID_SIZE * 0.3, GRID_SIZE * 0.2, GRID_SIZE * 0.3);
                ctx.beginPath();
                ctx.moveTo(-GRID_SIZE * 0.3, GRID_SIZE * 0.3); ctx.lineTo(GRID_SIZE * 0.3, GRID_SIZE * 0.3);
                ctx.lineTo(GRID_SIZE * 0.3, GRID_SIZE * 0.2); ctx.lineTo(-GRID_SIZE * 0.3, GRID_SIZE * 0.2);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                const bladeGradient = ctx.createLinearGradient(0, -GRID_SIZE, 0, 0);
                bladeGradient.addColorStop(0, '#f3f4f6'); bladeGradient.addColorStop(0.5, '#9ca3af'); bladeGradient.addColorStop(1, '#d1d5db');
                ctx.fillStyle = bladeGradient;
                ctx.beginPath();
                ctx.moveTo(0, GRID_SIZE * 0.2);
                ctx.quadraticCurveTo(GRID_SIZE * 0.5, -GRID_SIZE * 0.4, 0, -GRID_SIZE * 0.9);
                ctx.quadraticCurveTo(-GRID_SIZE * 0.1, -GRID_SIZE * 0.4, 0, GRID_SIZE * 0.2);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.restore();
            };
            drawCurvedSword(-Math.PI / 4);
            drawCurvedSword(Math.PI / 4);
        } else if (this.type === 'staff') {
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#a16207'; ctx.fillRect(-2, -GRID_SIZE * 0.6, 4, GRID_SIZE * 1.2); ctx.strokeRect(-2, -GRID_SIZE * 0.6, 4, GRID_SIZE * 1.2);
            ctx.fillStyle = '#a855f7'; ctx.beginPath(); ctx.arc(0, -GRID_SIZE * 0.7, GRID_SIZE * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        } else if (this.type === 'hadoken') {
            ctx.rotate(Math.PI / 4);
            const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, GRID_SIZE * 1.2);
            grad.addColorStop(0, '#bfdbfe');
            grad.addColorStop(0.6, '#3b82f6');
            grad.addColorStop(1, '#1e40af');
            ctx.fillStyle = grad;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1.5 / scale;
            ctx.beginPath();
            ctx.arc(-GRID_SIZE * 0.2, 0, GRID_SIZE * 0.6, Math.PI / 2, -Math.PI / 2, false);
            ctx.lineTo(GRID_SIZE * 0.8, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'shuriken') {
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#9ca3af';
            ctx.strokeStyle = 'black'; // 테두리 검은색으로 수정
            ctx.lineWidth = 2 / scale;

            ctx.beginPath();
            ctx.moveTo(0, -GRID_SIZE * 0.8);
            ctx.lineTo(GRID_SIZE * 0.2, -GRID_SIZE * 0.2);
            ctx.lineTo(GRID_SIZE * 0.8, 0);
            ctx.lineTo(GRID_SIZE * 0.2, GRID_SIZE * 0.2);
            ctx.lineTo(0, GRID_SIZE * 0.8);
            ctx.lineTo(-GRID_SIZE * 0.2, GRID_SIZE * 0.2);
            ctx.lineTo(-GRID_SIZE * 0.8, 0);
            ctx.lineTo(-GRID_SIZE * 0.2, -GRID_SIZE * 0.2);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#d1d5db';
            ctx.beginPath();
            ctx.arc(0, 0, GRID_SIZE * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'crown') {
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.6, -GRID_SIZE * 0.25); ctx.lineTo(-GRID_SIZE * 0.6, GRID_SIZE * 0.35);
            ctx.lineTo(GRID_SIZE * 0.6, GRID_SIZE * 0.35); ctx.lineTo(GRID_SIZE * 0.6, -GRID_SIZE * 0.25);
            ctx.lineTo(GRID_SIZE * 0.3, 0); ctx.lineTo(0, -GRID_SIZE * 0.25);
            ctx.lineTo(-GRID_SIZE * 0.3, 0); ctx.closePath();
            ctx.fill(); ctx.stroke();
        }
        ctx.restore();
    }
}

// 유닛 클래스
export class Unit {
    constructor(x, y, team) {
        this.gridX = x; this.gridY = y;
        this.pixelX = x * GRID_SIZE + GRID_SIZE / 2;
        this.pixelY = y * GRID_SIZE + GRID_SIZE / 2;
        this.team = team; this.hp = 100;
        this.baseSpeed = 1.0; this.facingAngle = Math.random() * Math.PI * 2;
        this.baseAttackPower = 5; this.baseAttackRange = 1.5 * GRID_SIZE;
        this.baseDetectionRange = 6 * GRID_SIZE;
        this.attackCooldown = 0; this.baseCooldownTime = 80;
        this.state = 'IDLE'; this.alertedCounter = 0;
        this.weapon = null; this.target = null; this.moveTarget = null;
        this.isCasting = false; this.castingProgress = 0; this.castTargetPos = null;
        this.castDuration = 120; // 2초
        this.teleportCooldown = 0;
        this.isKing = false; this.spawnCooldown = 0; this.spawnInterval = 420;
        this.knockbackX = 0; this.knockbackY = 0;
        this.isInMagneticField = false;
        this.evasionCooldown = 0; // 표창 유닛 회피 쿨다운
    }
    
    get speed() {
        const gameManager = GameManager.getInstance();
        if (!gameManager) return this.baseSpeed;

        let speedModifier = 0;
        if (this.isInMagneticField) speedModifier = -0.7;

        const gridX = Math.floor(this.pixelX / GRID_SIZE);
        const gridY = Math.floor(this.pixelY / GRID_SIZE);
        if (gridY >= 0 && gridY < gameManager.ROWS && gridX >= 0 && gridX < gameManager.COLS) {
            const tile = gameManager.map[gridY][gridX];
            if (tile.type === TILE.LAVA) speedModifier = -0.5;
        }
        
        let combatSpeedBoost = 0;
        if (this.weapon && this.weapon.type === 'dual_swords' && (this.state === 'AGGRESSIVE' || this.state === 'ATTACKING_NEXUS')) {
            combatSpeedBoost = 0.5;
        }
        const finalSpeed = (this.baseSpeed + (this.weapon ? this.weapon.speedBonus || 0 : 0) + combatSpeedBoost) + speedModifier;
        return Math.max(0.1, finalSpeed); // 최소 속도 보장
    }
    get attackPower() { return this.baseAttackPower + (this.weapon ? this.weapon.attackPowerBonus || 0 : 0); }
    get attackRange() { return this.baseAttackRange + (this.weapon ? this.weapon.attackRangeBonus || 0 : 0); }
    get detectionRange() { return this.baseDetectionRange + (this.weapon ? this.weapon.detectionRangeBonus || 0 : 0); }
    get cooldownTime() { return this.baseCooldownTime + (this.weapon ? this.weapon.attackCooldownBonus || 0 : 0); }

    equipWeapon(weaponType, isClone = false) {
        const gameManager = GameManager.getInstance();
        if (!gameManager) return;

        this.weapon = gameManager.createWeapon(0, 0, weaponType);
        gameManager.audioManager.play('equip');
        if (this.weapon.type === 'crown' && !isClone) {
            this.isKing = true;
        }
        this.state = 'IDLE';
    }

    findClosest(items) {
        let closestItem = null, minDistance = Infinity;
        for (const item of items) {
            const distance = Math.hypot(this.pixelX - item.pixelX, this.pixelY - item.pixelY);
            if (distance < minDistance) { minDistance = distance; closestItem = item; }
        }
        return {item: closestItem, distance: minDistance};
    }
    
    applyPhysics() {
        const gameManager = GameManager.getInstance();
        if (!gameManager) return;
        
        let nextX = this.pixelX + this.knockbackX * gameManager.gameSpeed;
        let nextY = this.pixelY + this.knockbackY * gameManager.gameSpeed;
        
        const nextGridX_kb = Math.floor(nextX / GRID_SIZE);
        const nextGridY_kb = Math.floor(nextY / GRID_SIZE);
        if (nextGridY_kb >= 0 && nextGridY_kb < gameManager.ROWS && nextGridX_kb >= 0 && nextGridX_kb < gameManager.COLS) {
            const collidedTile = gameManager.map[nextGridY_kb][nextGridX_kb];
             if (collidedTile.type === TILE.WALL || collidedTile.type === TILE.CRACKED_WALL) {
                nextX = this.pixelX;
                nextY = this.pixelY;
                this.knockbackX = 0;
                this.knockbackY = 0;
            }
        }

        nextX = Math.max(0, Math.min(gameManager.canvas.width, nextX));
        nextY = Math.max(0, Math.min(gameManager.canvas.height, nextY));

        this.pixelX = nextX;
        this.pixelY = nextY;

        this.knockbackX *= 0.9;
        this.knockbackY *= 0.9;
        if (Math.abs(this.knockbackX) < 0.1) this.knockbackX = 0;
        if (Math.abs(this.knockbackY) < 0.1) this.knockbackY = 0;
    }

    move() {
        if (!this.moveTarget || this.isCasting) return;
        const gameManager = GameManager.getInstance();
        if (!gameManager) return;
        
        const dx = this.moveTarget.x - this.pixelX, dy = this.moveTarget.y - this.pixelY;
        const distance = Math.hypot(dx, dy);
        const currentSpeed = this.speed * gameManager.gameSpeed;
        if (distance < currentSpeed) {
            this.pixelX = this.moveTarget.x; this.pixelY = this.moveTarget.y;
            this.moveTarget = null; return;
        }
        const angle = Math.atan2(dy, dx);
        const nextPixelX = this.pixelX + Math.cos(angle) * currentSpeed;
        const nextPixelY = this.pixelY + Math.sin(angle) * currentSpeed;
        const nextGridX = Math.floor(nextPixelX / GRID_SIZE);
        const nextGridY = Math.floor(nextPixelY / GRID_SIZE);

        if (nextGridY >= 0 && nextGridY < gameManager.ROWS && nextGridX >= 0 && nextGridX < gameManager.COLS) {
            const collidedTile = gameManager.map[nextGridY][nextGridX];
            if (collidedTile.type === TILE.WALL || collidedTile.type === TILE.CRACKED_WALL) {
                if (collidedTile.type === TILE.CRACKED_WALL) {
                    gameManager.damageTile(nextGridX, nextGridY, 999);
                }
                const bounceAngle = this.facingAngle + Math.PI;
                this.pixelX += Math.cos(bounceAngle) * 2;
                this.pixelY += Math.sin(bounceAngle) * 2;
                this.moveTarget = null;
                return;
            }
        } else {
            const bounceAngle = this.facingAngle + Math.PI;
            this.pixelX += Math.cos(bounceAngle) * 2;
            this.pixelY += Math.sin(bounceAngle) * 2;
            this.moveTarget = null;
            return;
        }
        
        this.facingAngle = angle; this.pixelX = nextPixelX; this.pixelY = nextPixelY;
    }

    attack(target) {
        if (!target || this.attackCooldown > 0) return;
        const gameManager = GameManager.getInstance();
        if (!gameManager) return;
        
        const currentAttackPower = this.attackPower;

        if (this.weapon && this.weapon.type === 'staff') {
            this.isCasting = true; this.castingProgress = 0; this.castTargetPos = { x: target.pixelX, y: target.pixelY }; this.target = target;
            gameManager.audioManager.play('fireball');
        } else if (this.weapon && this.weapon.type === 'hadoken') {
             this.isCasting = true; this.castingProgress = 0; this.castTargetPos = { x: target.pixelX, y: target.pixelY }; this.target = target;
             gameManager.audioManager.play('hadokenCast');
        } else {
            this.attackCooldown = this.cooldownTime;
            const targetGridX = Math.floor(target.pixelX / GRID_SIZE);
            const targetGridY = Math.floor(target.pixelY / GRID_SIZE);
            if(targetGridY < 0 || targetGridY >= gameManager.ROWS || targetGridX < 0 || targetGridX >= gameManager.COLS) return;
            const tile = gameManager.map[targetGridY][targetGridX];
            
            if (tile.type === TILE.CRACKED_WALL) {
                gameManager.damageTile(targetGridX, targetGridY, currentAttackPower);
            } else if (target instanceof Unit || target instanceof Nexus) {
                if (this.weapon && this.weapon.type === 'sword') {
                    target.takeDamage(currentAttackPower); gameManager.createEffect('slash', this.pixelX, this.pixelY, target);
                    gameManager.audioManager.play('swordHit');
                } else if (this.weapon && this.weapon.type === 'bow') {
                    gameManager.createProjectile(this, target, 'arrow');
                    gameManager.audioManager.play('arrowShoot');
                } else if (this.weapon && this.weapon.type === 'dual_swords') {
                    target.takeDamage(currentAttackPower); gameManager.createEffect('dual_sword_slash', this.pixelX, this.pixelY, target);
                    gameManager.audioManager.play('dualSwordHit');
                } else if (this.weapon && this.weapon.type === 'shuriken') {
                     gameManager.createProjectile(this, target, 'shuriken');
                     gameManager.audioManager.play('shurikenShoot');
                }
                else {
                    target.takeDamage(currentAttackPower);
                    gameManager.audioManager.play('punch');
                }
            }
        }
    }

    takeDamage(damage, effectInfo = {}) {
        this.hp -= damage;
        if (effectInfo.interrupt) {
             if (this.weapon?.type !== 'shuriken' || effectInfo.force > 0) {
                 this.isCasting = false;
                 this.castingProgress = 0;
             }
        }
        if (effectInfo.force && effectInfo.force > 0) {
            this.knockbackX += Math.cos(effectInfo.angle) * effectInfo.force;
            this.knockbackY += Math.sin(effectInfo.angle) * effectInfo.force;
        }
    }

    update(enemies, weapons, projectiles) {
        const gameManager = GameManager.getInstance();
        if (!gameManager) return;

        if (this.attackCooldown > 0) this.attackCooldown -= gameManager.gameSpeed;
        if (this.teleportCooldown > 0) this.teleportCooldown -= gameManager.gameSpeed;
        if (this.alertedCounter > 0) this.alertedCounter -= gameManager.gameSpeed;
        if (this.isKing && this.spawnCooldown > 0) this.spawnCooldown -= gameManager.gameSpeed;
        if (this.evasionCooldown > 0) this.evasionCooldown -= gameManager.gameSpeed;
        
        if (this.weapon && this.weapon.type === 'shuriken' && this.evasionCooldown <= 0) {
            for (const p of projectiles) {
                if (p.owner.team === this.team) continue;
                const dist = Math.hypot(this.pixelX - p.pixelX, this.pixelY - p.pixelY);
                if (dist < GRID_SIZE * 3) {
                    const angleToUnit = Math.atan2(this.pixelY - p.pixelY, this.pixelX - p.pixelX);
                    const angleDiff = Math.abs(angleToUnit - p.angle);
                    if (angleDiff < Math.PI / 4 || angleDiff > Math.PI * 1.75) {
                        if (Math.random() > 0.5) {
                            const dodgeAngle = p.angle + (Math.PI / 2) * (Math.random() < 0.5 ? 1 : -1);
                            const dodgeForce = 4;
                            this.knockbackX += Math.cos(dodgeAngle) * dodgeForce;
                            this.knockbackY += Math.sin(dodgeAngle) * dodgeForce;
                            this.evasionCooldown = 30;
                            break;
                        }
                    }
                }
            }
        }
        
        this.applyPhysics();

        const currentGridX = Math.floor(this.pixelX / GRID_SIZE);
        const currentGridY = Math.floor(this.pixelY / GRID_SIZE);

        this.isInMagneticField = gameManager.isPosInAnyField(currentGridX, currentGridY);
        if(this.isInMagneticField) {
            this.takeDamage(0.3 * gameManager.gameSpeed);
        }

        if (this.isCasting) {
            this.castingProgress += gameManager.gameSpeed;
            if (!this.target || this.target.hp <= 0) {
                this.isCasting = false; this.castingProgress = 0; return;
            }
            if (this.castingProgress >= this.castDuration) {
                this.isCasting = false; this.castingProgress = 0;
                this.attackCooldown = this.cooldownTime;
                if (this.weapon.type === 'staff') {
                    gameManager.castAreaSpell(this.castTargetPos, 'fire_pillar', this.attackPower, this.team);
                } else if (this.weapon.type === 'hadoken') {
                    gameManager.createProjectile(this, this.target, 'hadoken');
                }
            }
            return;
        }

        if (this.isKing && this.spawnCooldown <= 0) {
            gameManager.spawnUnit(this, false);
            this.spawnCooldown = this.spawnInterval;
        }
        
        if(currentGridY >= 0 && currentGridY < gameManager.ROWS && currentGridX >= 0 && currentGridX < gameManager.COLS) {
            const currentTile = gameManager.map[currentGridY][currentGridX];
            if (currentTile.type === TILE.LAVA) this.hp -= 0.2 * gameManager.gameSpeed;
            if (currentTile.type === TILE.HEAL_PACK) {
                this.hp = 100;
                gameManager.map[currentGridY][currentGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor };
                gameManager.audioManager.play('heal');
            }
            if (currentTile.type === TILE.TELEPORTER && this.teleportCooldown <= 0) {
                const teleporters = gameManager.getTilesOfType(TILE.TELEPORTER);
                if (teleporters.length > 1) {
                    const otherTeleporter = teleporters.find(t => t.x !== currentGridX || t.y !== currentGridY);
                    if (otherTeleporter) {
                        this.pixelX = otherTeleporter.x * GRID_SIZE + GRID_SIZE / 2;
                        this.pixelY = otherTeleporter.y * GRID_SIZE + GRID_SIZE / 2;
                        this.teleportCooldown = 120;
                        gameManager.audioManager.play('teleport');
                    }
                }
            }
            if (currentTile.type === TILE.REPLICATION_TILE && !this.isKing) {
                for(let i = 0; i < currentTile.replicationValue; i++) {
                    gameManager.spawnUnit(this, true);
                }
                gameManager.map[currentGridY][currentGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor };
                gameManager.audioManager.play('replication');
            }
        }

        let newState = 'IDLE';
        let newTarget = null;
        
        if (this.isInMagneticField) {
            newState = 'FLEEING_FIELD';
        } else {
            const enemyNexus = gameManager.nexuses.find(n => n.team !== this.team && !n.isDestroying);
            const { item: closestEnemy, distance: enemyDist } = this.findClosest(enemies);
            const { item: targetWeapon, distance: weaponDist } = this.findClosest(weapons.filter(w => !w.isEquipped));

            let targetEnemy = null;
            if (closestEnemy && enemyDist <= this.detectionRange && gameManager.hasLineOfSight(this, closestEnemy)) {
                targetEnemy = closestEnemy;
            }

            if (this.isKing && targetEnemy) {
                newState = 'FLEEING'; newTarget = targetEnemy;
            } else if (this.hp < 50) {
                const healPacks = gameManager.getTilesOfType(TILE.HEAL_PACK);
                if (healPacks.length > 0) {
                    const healPackPositions = healPacks.map(pos => ({
                        gridX: pos.x, gridY: pos.y,
                        pixelX: pos.x * GRID_SIZE + GRID_SIZE / 2,
                        pixelY: pos.y * GRID_SIZE + GRID_SIZE / 2
                    }));
                    const { item: closestPack, distance: packDist } = this.findClosest(healPackPositions);
                    if (closestPack && packDist < this.detectionRange * 1.5) {
                        newState = 'SEEKING_HEAL_PACK';
                        newTarget = closestPack;
                    }
                }
            }
            
            if (newState === 'IDLE') {
                if (!this.weapon && targetWeapon && weaponDist <= this.detectionRange) {
                    newState = 'SEEKING_WEAPON';
                    newTarget = targetWeapon;
                } else if (targetEnemy) {
                    newState = 'AGGRESSIVE';
                    newTarget = targetEnemy;
                } else if (enemyNexus && gameManager.hasLineOfSight(this, enemyNexus) && Math.hypot(this.pixelX - enemyNexus.pixelX, this.pixelY - enemyNexus.pixelY) <= this.detectionRange) {
                    newState = 'ATTACKING_NEXUS';
                    newTarget = enemyNexus;
                }
            }
        }

        if (this.state !== newState && newState !== 'IDLE' && newState !== 'FLEEING_FIELD') this.alertedCounter = 60;
        this.state = newState;
        this.target = newTarget;
        
        switch(this.state) {
            case 'FLEEING_FIELD':
                this.moveTarget = gameManager.findClosestSafeSpot(this.pixelX, this.pixelY);
                break;
            case 'FLEEING':
                if (this.target) {
                    const fleeAngle = Math.atan2(this.pixelY - this.target.pixelY, this.pixelX - this.target.pixelX);
                    this.moveTarget = { x: this.pixelX + Math.cos(fleeAngle) * GRID_SIZE * 5, y: this.pixelY + Math.sin(fleeAngle) * GRID_SIZE * 5 };
                }
                break;
            case 'SEEKING_HEAL_PACK':
                if (this.target) this.moveTarget = { x: this.target.pixelX, y: this.target.pixelY };
                break;
            case 'SEEKING_WEAPON':
                if (this.target) {
                    const distance = Math.hypot(this.pixelX - this.target.pixelX, this.pixelY - this.target.pixelY);
                    if (distance < GRID_SIZE * 0.8 && !this.target.isEquipped) {
                        this.equipWeapon(this.target.type);
                        this.target.isEquipped = true;
                        this.target = null;
                    } else {
                        this.moveTarget = { x: this.target.pixelX, y: this.target.pixelY };
                    }
                }
                break;
            case 'ATTACKING_NEXUS':
            case 'AGGRESSIVE':
                if (this.target) {
                    if (Math.hypot(this.pixelX - this.target.pixelX, this.pixelY - this.target.pixelY) <= this.attackRange) {
                        this.moveTarget = null; this.attack(this.target);
                        this.facingAngle = Math.atan2(this.target.pixelY - this.pixelY, this.target.pixelX - this.pixelX);
                    } else { this.moveTarget = { x: this.target.pixelX, y: this.target.pixelY }; }
                }
                break;
            case 'IDLE': default:
                if (!this.moveTarget || Math.hypot(this.pixelX - this.moveTarget.x, this.pixelY - this.moveTarget.y) < GRID_SIZE) {
                    const angle = Math.random() * Math.PI * 2;
                    this.moveTarget = { x: this.pixelX + Math.cos(angle) * GRID_SIZE * 8, y: this.pixelY + Math.sin(angle) * GRID_SIZE * 8 };
                }
                break;
        }
        this.move();
    }

    draw(ctx) {
        const gameManager = GameManager.getInstance();
        if (!gameManager) return;
        
        switch(this.team) {
            case TEAM.A: ctx.fillStyle = COLORS.TEAM_A; break;
            case TEAM.B: ctx.fillStyle = COLORS.TEAM_B; break;
            case TEAM.C: ctx.fillStyle = COLORS.TEAM_C; break;
            case TEAM.D: ctx.fillStyle = COLORS.TEAM_D; break;
        }
        ctx.beginPath(); ctx.arc(this.pixelX, this.pixelY, GRID_SIZE / 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'black'; ctx.lineWidth = 1; ctx.stroke();
        
        if (this.weapon && this.weapon.type === 'hadoken') {
             ctx.save();
             ctx.globalAlpha = 0.3 + Math.sin(gameManager.animationFrameCounter * 0.1) * 0.1;
             ctx.fillStyle = '#a855f7';
             ctx.beginPath();
             ctx.arc(this.pixelX, this.pixelY, GRID_SIZE * 0.7, 0, Math.PI * 2);
             ctx.fill();
             ctx.restore();
        }

        if (this.weapon && this.weapon.type === 'dual_swords' && (this.state === 'AGGRESSIVE' || this.state === 'ATTACKING_NEXUS')) {
            ctx.save();
            ctx.globalAlpha = 0.3;
            const backX = this.pixelX - Math.cos(this.facingAngle) * GRID_SIZE * 0.6;
            const backY = this.pixelY - Math.sin(this.facingAngle) * GRID_SIZE * 0.6;
            ctx.fillStyle = '#e5e7eb';
            ctx.beginPath(); ctx.arc(backX, backY, GRID_SIZE / 3, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 0.2;
            const backX2 = this.pixelX - Math.cos(this.facingAngle) * GRID_SIZE * 1.2;
            const backY2 = this.pixelY - Math.sin(this.facingAngle) * GRID_SIZE * 1.2;
            ctx.beginPath(); ctx.arc(backX2, backY2, GRID_SIZE / 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }

        if (this.isKing) {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY - GRID_SIZE * 0.5);
            const scale = 1.2;
            ctx.scale(scale, scale);
            ctx.fillStyle = '#facc15'; ctx.strokeStyle = 'black'; ctx.lineWidth = 1 / scale;
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.4, -GRID_SIZE * 0.1); ctx.lineTo(-GRID_SIZE * 0.4, GRID_SIZE * 0.2);
            ctx.lineTo(GRID_SIZE * 0.4, GRID_SIZE * 0.2); ctx.lineTo(GRID_SIZE * 0.4, -GRID_SIZE * 0.1);
            ctx.lineTo(GRID_SIZE * 0.2, 0); ctx.lineTo(0, -GRID_SIZE * 0.1);
            ctx.lineTo(-GRID_SIZE * 0.2, 0); ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.restore();
        }

        if (this.weapon && !this.isKing) {
            ctx.save(); ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.facingAngle);

            if (this.weapon.type === 'staff') {
                ctx.translate(GRID_SIZE * 0.4, 0);
                ctx.fillStyle = '#a16207'; ctx.fillRect(-1.5, -GRID_SIZE * 0.5, 3, GRID_SIZE * 1.0); ctx.strokeRect(-1.5, -GRID_SIZE * 0.5, 3, GRID_SIZE * 1.0);
                ctx.fillStyle = '#a855f7'; ctx.beginPath(); ctx.arc(0, -GRID_SIZE * 0.6, GRID_SIZE * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            } else if (this.weapon.type === 'hadoken') {
                ctx.translate(GRID_SIZE * 0.5, 0);
                const scale = 0.7;
                ctx.scale(scale, scale);
                const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, GRID_SIZE * 1.2);
                grad.addColorStop(0, '#bfdbfe');
                grad.addColorStop(0.6, '#3b82f6');
                grad.addColorStop(1, '#1e40af');
                ctx.fillStyle = grad;
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1.5 / scale;
                ctx.beginPath();
                ctx.arc(GRID_SIZE * 0.2, 0, GRID_SIZE * 0.6, -Math.PI / 2, Math.PI / 2, false);
                ctx.lineTo(-GRID_SIZE * 0.8, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            } else if (this.weapon.type === 'shuriken') {
                ctx.translate(GRID_SIZE * 0.4, GRID_SIZE * 0.3);
                const scale = 0.5;
                ctx.scale(scale, scale);
                ctx.rotate(gameManager.animationFrameCounter * 0.1);
                ctx.fillStyle = '#4a5568';
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2 / scale;
                ctx.beginPath();
                ctx.moveTo(0, -GRID_SIZE * 0.8);
                ctx.lineTo(GRID_SIZE * 0.2, -GRID_SIZE * 0.2);
                ctx.lineTo(GRID_SIZE * 0.8, 0);
                ctx.lineTo(GRID_SIZE * 0.2, GRID_SIZE * 0.2);
                ctx.lineTo(0, GRID_SIZE * 0.8);
                ctx.lineTo(-GRID_SIZE * 0.2, GRID_SIZE * 0.2);
                ctx.lineTo(-GRID_SIZE * 0.8, 0);
                ctx.lineTo(-GRID_SIZE * 0.2, -GRID_SIZE * 0.2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            } else if (this.weapon.type === 'sword') {
                ctx.translate(GRID_SIZE * 0.5, 0);
                const bladeGradient = ctx.createLinearGradient(0, -GRID_SIZE, 0, 0);
                bladeGradient.addColorStop(0, '#f3f4f6'); bladeGradient.addColorStop(1, '#9ca3af');
                ctx.fillStyle = bladeGradient;
                ctx.beginPath();
                ctx.moveTo(-2, GRID_SIZE * 0.3); ctx.lineTo(-2, -GRID_SIZE * 1.0);
                ctx.lineTo(0, -GRID_SIZE * 1.2); ctx.lineTo(2, -GRID_SIZE * 1.0);
                ctx.lineTo(2, GRID_SIZE * 0.3);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#374151';
                ctx.beginPath();
                ctx.moveTo(-GRID_SIZE * 0.4, GRID_SIZE * 0.3); ctx.lineTo(GRID_SIZE * 0.4, GRID_SIZE * 0.3);
                ctx.lineTo(GRID_SIZE * 0.5, GRID_SIZE * 0.3 + 3); ctx.lineTo(-GRID_SIZE * 0.5, GRID_SIZE * 0.3 + 3);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#1f2937';
                ctx.fillRect(-1.5, GRID_SIZE * 0.3 + 3, 3, GRID_SIZE * 0.3); ctx.strokeRect(-1.5, GRID_SIZE * 0.3 + 3, 3, GRID_SIZE * 0.3);
            } else if (this.weapon.type === 'bow') {
                ctx.translate(GRID_SIZE * 0.4, 0);
                ctx.rotate(-Math.PI / 4);
                const scale = 0.8;
                ctx.scale(scale, scale);
                ctx.fillStyle = '#f3f4f6';
                ctx.fillRect(-GRID_SIZE * 0.7, -1, GRID_SIZE * 1.2, 2);
                ctx.strokeRect(-GRID_SIZE * 0.7, -1, GRID_SIZE * 1.2, 2);
                ctx.fillStyle = '#e5e7eb';
                ctx.beginPath(); ctx.moveTo(GRID_SIZE * 0.5, 0); ctx.lineTo(GRID_SIZE * 0.3, -3); ctx.lineTo(GRID_SIZE * 0.3, 3); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#d1d5db';
                ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.6, -1); ctx.lineTo(-GRID_SIZE * 0.7, -4); ctx.lineTo(-GRID_SIZE * 0.5, -1); ctx.closePath(); ctx.fill()
                ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.6, 1); ctx.lineTo(-GRID_SIZE * 0.7, 4); ctx.lineTo(-GRID_SIZE * 0.5, 1); ctx.closePath(); ctx.fill()
                ctx.strokeStyle = 'black'; ctx.lineWidth = 6 / scale; ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.8, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke();
                ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 4 / scale; ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.8, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke();
                ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1.5 / scale; ctx.beginPath();
                const arcRadius = GRID_SIZE * 0.8, arcAngle = Math.PI / 2.2;
                ctx.moveTo(Math.cos(-arcAngle) * arcRadius, Math.sin(-arcAngle) * arcRadius);
                ctx.lineTo(-GRID_SIZE * 0.4, 0);
                ctx.lineTo(Math.cos(arcAngle) * arcRadius, Math.sin(arcAngle) * arcRadius); ctx.stroke();
            } else if (this.weapon.type === 'dual_swords') {
                const drawEquippedCurvedSword = (isRightHand) => {
                    ctx.save();
                    const yOffset = isRightHand ? GRID_SIZE * 0.6 : -GRID_SIZE * 0.6;
                    const rotation = isRightHand ? Math.PI / 8 : -Math.PI / 8;
                    ctx.translate(GRID_SIZE * 0.1, yOffset);
                    ctx.rotate(rotation);
                    ctx.fillStyle = '#374151';
                    ctx.fillRect(-GRID_SIZE * 0.05, 0, GRID_SIZE * 0.1, GRID_SIZE * 0.2);
                    ctx.strokeRect(-GRID_SIZE * 0.05, 0, GRID_SIZE * 0.1, GRID_SIZE * 0.2);
                    ctx.beginPath();
                    ctx.moveTo(-GRID_SIZE * 0.2, 0); ctx.lineTo(GRID_SIZE * 0.2, 0);
                    ctx.lineTo(GRID_SIZE * 0.2, -GRID_SIZE * 0.05); ctx.lineTo(-GRID_SIZE * 0.2, -GRID_SIZE * 0.05);
                    ctx.closePath(); ctx.fill(); ctx.stroke();
                    const bladeGradient = ctx.createLinearGradient(0, -GRID_SIZE*0.8, 0, 0);
                    bladeGradient.addColorStop(0, '#f3f4f6'); bladeGradient.addColorStop(0.5, '#9ca3af'); bladeGradient.addColorStop(1, '#4b5563');
                    ctx.fillStyle = bladeGradient;
                    ctx.beginPath();
                    ctx.moveTo(0, -GRID_SIZE * 0.05);
                    ctx.quadraticCurveTo(GRID_SIZE * 0.4, -GRID_SIZE * 0.3, 0, -GRID_SIZE * 0.8);
                    ctx.quadraticCurveTo(-GRID_SIZE * 0.1, -GRID_SIZE * 0.3, 0, -GRID_SIZE * 0.05);
                    ctx.closePath(); ctx.fill(); ctx.stroke();
                    ctx.restore();
                };
                drawEquippedCurvedSword(true);
                drawEquippedCurvedSword(false);
            }
            ctx.restore();
        }
        
        const hpBarYOffset = this.isKing ? GRID_SIZE * 1.0 : GRID_SIZE * 0.8;
        const hpBarWidth = GRID_SIZE * 0.8, hpBarX = this.pixelX - hpBarWidth / 2, hpBarY = this.pixelY - hpBarYOffset;
        ctx.fillStyle = '#111827'; ctx.fillRect(hpBarX, hpBarY, hpBarWidth, 5);
        ctx.fillStyle = '#10b981'; ctx.fillRect(hpBarX, hpBarY, hpBarWidth * (this.hp / 100), 5);
        
        const skillBarY = hpBarY - 6;
        if (this.isCasting) {
            ctx.fillStyle = '#450a0a';
            ctx.fillRect(hpBarX, skillBarY, hpBarWidth, 4);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(hpBarX, skillBarY, hpBarWidth * (this.castingProgress / this.castDuration), 4);
        } else if (this.weapon && this.weapon.type === 'shuriken' && this.attackCooldown > 0) {
            ctx.fillStyle = '#450a0a';
            ctx.fillRect(hpBarX, skillBarY, hpBarWidth, 4);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(hpBarX, skillBarY, hpBarWidth * ((this.cooldownTime - this.attackCooldown) / this.cooldownTime), 4);
        } else if (this.isKing && this.spawnCooldown > 0) {
            ctx.fillStyle = '#450a0a';
            ctx.fillRect(hpBarX, skillBarY, hpBarWidth, 4);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(hpBarX, skillBarY, hpBarWidth * ((this.spawnInterval - this.spawnCooldown) / this.spawnInterval), 4);
        }
        
        if (this.alertedCounter > 0 && !(this.weapon && this.weapon.type === 'shuriken') && this.state !== 'FLEEING_FIELD') {
            ctx.fillStyle = 'yellow'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center';
            ctx.fillText(this.state === 'SEEKING_HEAL_PACK' ? '+' : '!', this.pixelX, this.pixelY - GRID_SIZE);
        }
    }
}
