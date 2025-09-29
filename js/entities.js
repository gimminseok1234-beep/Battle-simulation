import { TEAM, COLORS, GRID_SIZE } from './constants.js';
import { createPhysicalHitEffect } from './weaponary.js'; // [수정] 빠져있던 import 구문을 추가합니다.

// Nexus class
export class Nexus {
    constructor(gameManager, x, y, team) {
        this.gameManager = gameManager;
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
        const gameManager = this.gameManager;
        if (gameManager && damage > 0) {
            createPhysicalHitEffect(gameManager, this);
        }
        this.hp -= damage;
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
                angle: this.gameManager.random() * Math.PI * 2,
                speed: this.gameManager.random() * 6 + 2,
                radius: this.gameManager.random() * 5 + 2,
                lifespan: 80,
                color: ['#ffcc00', '#ff9900', '#ff6600', '#666666', '#ef4444'][Math.floor(this.gameManager.random() * 5)]
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


// GrowingMagneticField class
export class GrowingMagneticField {
    constructor(gameManager, id, x, y, width, height, settings) {
        this.gameManager = gameManager;
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
        const gameManager = this.gameManager;
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

// MagicCircle class
export class MagicCircle {
    constructor(gameManager, x, y, team) {
        this.gameManager = gameManager;
        this.gridX = x; this.gridY = y;
        this.pixelX = x * GRID_SIZE + GRID_SIZE / 2;
        this.pixelY = y * GRID_SIZE + GRID_SIZE / 2;
        this.team = team;
        this.duration = 600; // 10 seconds
        this.animationTimer = 0;
    }

    update() {
        this.duration--;
        this.animationTimer++;
    }

    draw(ctx) {
        const opacity = Math.min(1, (600 - this.duration) / 60) * Math.min(1, this.duration / 60);
        const scale = 1 + Math.sin(this.animationTimer * 0.1) * 0.05;
        
        ctx.save();
        ctx.translate(this.pixelX, this.pixelY);
        ctx.scale(scale * 0.7, scale * 0.7);
        ctx.globalAlpha = opacity;

        const glowGradient = ctx.createRadialGradient(0, 0, GRID_SIZE * 0.35, 0, 0, GRID_SIZE * 1.05);
        glowGradient.addColorStop(0, 'rgba(192, 132, 252, 0.6)');
        glowGradient.addColorStop(1, 'rgba(192, 132, 252, 0)');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(-GRID_SIZE * 1.5, -GRID_SIZE * 1.5, GRID_SIZE * 3, GRID_SIZE * 3);

        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(0, 0, GRID_SIZE * 0.6, 0, Math.PI * 2);
        ctx.fill();

        switch(this.team) {
            case TEAM.A: ctx.strokeStyle = COLORS.TEAM_A; break;
            case TEAM.B: ctx.strokeStyle = COLORS.TEAM_B; break;
            case TEAM.C: ctx.strokeStyle = COLORS.TEAM_C; break;
            case TEAM.D: ctx.strokeStyle = COLORS.TEAM_D; break;
            default: ctx.strokeStyle = '#c084fc'; break;
        }
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, GRID_SIZE * 0.9, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, GRID_SIZE * 1.1, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
}

// PoisonCloud class
export class PoisonCloud {
    constructor(gameManager, x, y, ownerTeam) {
        this.gameManager = gameManager;
        this.pixelX = x;
        this.pixelY = y;
        this.ownerTeam = ownerTeam;
        this.duration = 300; // 5 seconds
        this.damage = 0.2;
        this.animationTimer = 0;
    }

    update() {
        this.duration--;
        this.animationTimer++;
        const gameManager = this.gameManager;
        if (!gameManager) return;
        
        // [수정] 순환 참조를 피하기 위해, 직접 Unit, Nexus 클래스를 참조하는 대신,
        // gameManager에 있는 유닛과 넥서스 배열을 순회합니다.
        const targets = [...gameManager.units, ...gameManager.nexuses];

        targets.forEach(target => {
            if (target.team !== this.ownerTeam && !target.isDestroying) {
               const dx = Math.abs(target.pixelX - this.pixelX);
               const dy = Math.abs(target.pixelY - this.pixelY);
               if (dx < GRID_SIZE * 2.5 && dy < GRID_SIZE * 2.5) {
                   if(target.constructor.name === 'Unit') { // target이 Unit인지 확인
                       gameManager.applyDamage(target, 0, { poison: { damage: this.damage * gameManager.gameSpeed }, isTileDamage: true });
                   } else if (target.constructor.name === 'Nexus') { // target이 Nexus인지 확인
                       gameManager.applyDamage(target, this.damage * gameManager.gameSpeed);
                   }
               }
           }
        });
    }

    draw(ctx) {
        const opacity = Math.min(1, this.duration / 60) * 0.4;
        ctx.fillStyle = `rgba(132, 204, 22, ${opacity})`;
        ctx.fillRect(this.pixelX - GRID_SIZE * 2.5, this.pixelY - GRID_SIZE * 2.5, GRID_SIZE * 5, GRID_SIZE * 5);

        ctx.fillStyle = `rgba(163, 230, 53, ${opacity * 1.5})`;
        const bubbleX = this.pixelX + Math.sin(this.animationTimer * 0.1) * GRID_SIZE * 2;
        const bubbleY = this.pixelY + Math.cos(this.animationTimer * 0.05) * GRID_SIZE * 2;
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY, GRID_SIZE * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
}

