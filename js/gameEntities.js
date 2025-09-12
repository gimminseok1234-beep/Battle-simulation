import { TILE, TEAM, COLORS, GRID_SIZE } from './constants.js';
import { Weapon } from './weapons.js';

// Particle class
export class Particle {
    constructor(gameManager, options) {
        this.gameManager = gameManager; // Save GameManager instance
        this.x = options.x;
        this.y = options.y;
        this.vx = options.vx;
        this.vy = options.vy;
        this.life = options.life; // in seconds
        this.initialLife = options.life;
        this.color = options.color;
        this.size = options.size;
        this.gravity = options.gravity || 0;
    }

    isAlive() {
        return this.life > 0;
    }

    update(gameSpeed = 1) {
        this.x += this.vx * gameSpeed;
        this.y += this.vy * gameSpeed;
        this.vy += this.gravity * gameSpeed;
        this.life -= (1 / 60) * gameSpeed; // Assuming 60 FPS
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life / this.initialLife);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

/**
 * Function to create a physical hit effect
 * @param {object} gameManager 
 * @param {Unit | Nexus} target 
 */
function createPhysicalHitEffect(gameManager, target) {
    const particleCount = 6;
    for (let i = 0; i < particleCount; i++) {
        const angle = gameManager.random() * Math.PI * 2;
        const speed = 2 + gameManager.random() * 3;
        gameManager.addParticle({
            x: target.pixelX,
            y: target.pixelY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.7,
            color: '#ef4444',
            size: gameManager.random() * 2.5 + 1.5,
            gravity: 0.1
        });
    }
}

/**
 * [신규] 화염구 폭발 효과 생성 함수
 * @param {object} gameManager 
 * @param {number} x 
 * @param {number} y 
 */
export function createFireballHitEffect(gameManager, x, y) {
    const particleCount = 20; // 파티클 수를 20개로 줄임
    for (let i = 0; i < particleCount; i++) {
        const angle = gameManager.random() * Math.PI * 2;
        const speed = 1 + gameManager.random() * 4;
        gameManager.addParticle({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.6, // 지속 시간 감소
            color: ['#ffcc00', '#ff9900', '#ff6600', '#ef4444'][Math.floor(gameManager.random() * 4)],
            size: gameManager.random() * 3 + 2,
            gravity: -0.05 // 불꽃처럼 위로 솟구치는 느낌
        });
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
        
        const applyPoisonDamage = (target) => {
             if (target.team !== this.ownerTeam) {
                const dx = Math.abs(target.pixelX - this.pixelX);
                const dy = Math.abs(target.pixelY - this.pixelY);
                if (dx < GRID_SIZE * 2.5 && dy < GRID_SIZE * 2.5) {
                    if(target instanceof Unit) {
                        target.takeDamage(0, { poison: { damage: this.damage * gameManager.gameSpeed }, isTileDamage: true });
                    } else if (target instanceof Nexus && !target.isDestroying) {
                        target.takeDamage(this.damage * gameManager.gameSpeed);
                    }
                }
            }
        };

        gameManager.units.forEach(applyPoisonDamage);
        gameManager.nexuses.forEach(applyPoisonDamage);
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

// Projectile class
export class Projectile {
    constructor(gameManager, owner, target, type = 'arrow', options = {}) {
        this.gameManager = gameManager;
        this.owner = owner;
        this.pixelX = options.startX !== undefined ? options.startX : owner.pixelX;
        this.pixelY = options.startY !== undefined ? options.startY : owner.pixelY;
        this.type = type;
        
        // --- Shuriken Special Attack ---
        this.state = options.state || 'DEFAULT';
        this.lingerDuration = options.lingerDuration || 60; // Linger for 1 second (60 frames)
        this.maxDistance = options.maxDistance || 0;
        this.distanceTraveled = 0;
        this.turnPoint = null;
        this.damageInterval = 30;
        this.damageCooldown = 0;
        this.alreadyDamagedOnReturn = new Set();
        this.lingerRotationSpeed = 0.5;

        if (type === 'hadoken') this.speed = 4;
        else if (type === 'shuriken' || type === 'returning_shuriken') this.speed = 5;
        else if (type === 'lightning_bolt') this.speed = 8;
        else if (type === 'boomerang_projectile' || type === 'boomerang_normal_projectile') this.speed = 5;
        else if (type === 'ice_diamond_projectile') this.speed = 5;
        else if (type === 'ice_bolt_projectile') this.speed = 7;
        else if (type === 'fireball_projectile') this.speed = 5;
        else if (type === 'mini_fireball_projectile') this.speed = 8;
        else this.speed = 6;

        this.damage = owner.attackPower;
        if (type === 'magic_spear_special') {
            this.damage = (owner.weapon?.specialAttackPowerBonus || 0) + owner.baseAttackPower;
        } else if (type === 'magic_spear_normal') {
            this.damage = (owner.weapon?.normalAttackPowerBonus || 0) + owner.baseAttackPower;
        } else if (type === 'boomerang_projectile') {
            this.damage = 0;
        } else if (type === 'boomerang_normal_projectile') {
            this.damage = 12;
        } else if (type === 'ice_diamond_projectile') {
            this.damage = 28;
        } else if (type === 'fireball_projectile') {
            this.damage = 25;
        } else if (type === 'mini_fireball_projectile') {
            this.damage = 12;
        }

        this.knockback = (type === 'hadoken') ? gameManager.hadokenKnockback : 0;
        const inaccuracy = (type === 'shuriken' || type === 'lightning_bolt') ? 0 : GRID_SIZE * 0.8;
        const targetX = target.pixelX + (gameManager.random() - 0.5) * inaccuracy;
        const targetY = target.pixelY + (gameManager.random() - 0.5) * inaccuracy;
        const dx = targetX - this.pixelX; const dy = targetY - this.pixelY;
        this.angle = options.angle !== undefined ? options.angle : Math.atan2(dy, dx);
        this.destroyed = false;
        this.trail = [];
        this.rotationAngle = 0;

        this.hitTargets = options.hitTargets || new Set();
        if (type === 'lightning_bolt' && options.initialTarget) {
            this.hitTargets.add(options.initialTarget);
        }
    }

    update() {
        const gameManager = this.gameManager;
        if (!gameManager) return;
        
        // --- NEW LOGIC FOR RETURNING SHURIKEN ---
        if (this.type === 'returning_shuriken') {
            this.rotationAngle += this.lingerRotationSpeed * gameManager.gameSpeed;

            if (this.state === 'MOVING_OUT') {
                const moveX = Math.cos(this.angle) * this.speed * gameManager.gameSpeed;
                const moveY = Math.sin(this.angle) * this.speed * gameManager.gameSpeed;
                this.pixelX += moveX;
                this.pixelY += moveY;
                this.distanceTraveled += Math.hypot(moveX, moveY);
                
                for (const unit of gameManager.units) {
                    if (unit.team !== this.owner.team && !this.hitTargets.has(unit) && Math.hypot(this.pixelX - unit.pixelX, this.pixelY - unit.pixelY) < GRID_SIZE / 2) {
                        unit.takeDamage(this.damage);
                        this.hitTargets.add(unit);
                        this.state = 'LINGERING';
                        this.turnPoint = { x: this.pixelX, y: this.pixelY };
                        return;
                    }
                }

                if (this.distanceTraveled >= this.maxDistance) {
                    this.state = 'LINGERING';
                    this.turnPoint = { x: this.pixelX, y: this.pixelY };
                }
            } else if (this.state === 'LINGERING') {
                this.lingerDuration -= gameManager.gameSpeed;
                this.damageCooldown -= gameManager.gameSpeed;

                if (this.damageCooldown <= 0) {
                    for (const unit of gameManager.units) {
                        if (unit.team !== this.owner.team && Math.hypot(this.pixelX - unit.pixelX, this.pixelY - unit.pixelY) < GRID_SIZE * 2) {
                            unit.takeDamage(this.damage * 0.15); // Reduced lingering damage
                        }
                    }
                    this.damageCooldown = this.damageInterval;
                }

                if (this.lingerDuration <= 0) {
                    this.state = 'RETURNING';
                }
            } else if (this.state === 'RETURNING') {
                if (!this.owner || this.owner.hp <= 0) {
                    this.destroyed = true;
                    return;
                }
                const dx = this.owner.pixelX - this.pixelX;
                const dy = this.owner.pixelY - this.pixelY;
                const dist = Math.hypot(dx, dy);

                if (dist < this.speed * gameManager.gameSpeed) {
                    this.destroyed = true;
                    return;
                }

                const returnAngle = Math.atan2(dy, dx);
                this.pixelX += Math.cos(returnAngle) * this.speed * gameManager.gameSpeed;
                this.pixelY += Math.sin(returnAngle) * this.speed * gameManager.gameSpeed;

                for (const unit of gameManager.units) {
                    if (unit.team !== this.owner.team && !this.alreadyDamagedOnReturn.has(unit) && Math.hypot(this.pixelX - unit.pixelX, this.pixelY - unit.pixelY) < GRID_SIZE / 2) {
                        unit.takeDamage(this.damage);
                        this.alreadyDamagedOnReturn.add(unit);
                    }
                }
            }
            return; // End of returning_shuriken logic
        }

        // --- Original projectile logic ---
        if (['hadoken', 'lightning_bolt', 'magic_spear', 'ice_diamond_projectile', 'fireball_projectile', 'mini_fireball_projectile'].some(t => this.type.startsWith(t))) {
            this.trail.push({x: this.pixelX, y: this.pixelY});
            if (this.trail.length > 10) this.trail.shift();
        }
        if (this.type.includes('shuriken') || this.type.includes('boomerang')) {
            this.rotationAngle += 0.4 * gameManager.gameSpeed;
        }

        if (this.type === 'ice_diamond_projectile' && gameManager.random() > 0.4) {
            gameManager.addParticle({
                x: this.pixelX, y: this.pixelY,
                vx: (gameManager.random() - 0.5) * 1, vy: (gameManager.random() - 0.5) * 1,
                life: 0.6, color: '#3b82f6', size: gameManager.random() * 2 + 1,
            });
        }

        const nextX = this.pixelX + Math.cos(this.angle) * gameManager.gameSpeed * this.speed;
        const nextY = this.pixelY + Math.sin(this.angle) * gameManager.gameSpeed * this.speed;
        const gridX = Math.floor(nextX / GRID_SIZE);
        const gridY = Math.floor(nextY / GRID_SIZE);

        if (gridY >= 0 && gridY < gameManager.ROWS && gridX >= 0 && gridX < gameManager.COLS) {
            const tile = gameManager.map[gridY][gridX];
            const isCollidableWall = tile.type === TILE.WALL || tile.type === TILE.CRACKED_WALL;
            if (this.type !== 'magic_spear_special' && isCollidableWall) {
                if (tile.type === TILE.CRACKED_WALL) {
                    gameManager.damageTile(gridX, gridY, 999);
                }
                this.destroyed = true;
                return;
            }
        }
        this.pixelX = nextX; this.pixelY = nextY;
    }
    
    draw(ctx) {
        if (this.type === 'shuriken' || this.type === 'returning_shuriken') {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.rotationAngle);
            const scale = 0.8; 
            ctx.scale(scale, scale);
            ctx.fillStyle = '#9ca3af'; 
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

            ctx.fillStyle = '#d1d5db'; 
            ctx.beginPath();
            ctx.arc(0, 0, GRID_SIZE * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
            return;
        }

        // --- Original draw logic for other projectiles ---
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
            for (let i = 0; i < this.trail.length; i++) {
                const pos = this.trail[i];
                const alpha = (i / this.trail.length) * 0.5;
                ctx.fillStyle = `rgba(139, 92, 246, ${alpha})`;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, (GRID_SIZE / 2) * (i / this.trail.length), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = '#c4b5fd';
            ctx.beginPath();
            ctx.arc(this.pixelX, this.pixelY, GRID_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#8b5cf6';
            ctx.beginPath();
            ctx.arc(this.pixelX, this.pixelY, GRID_SIZE / 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'lightning_bolt') {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.angle);
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.5, 0);
            for(let i = -GRID_SIZE * 0.5; i < GRID_SIZE * 0.5; i += 4) {
                ctx.lineTo(i, (this.gameManager.random() - 0.5) * 4);
            }
            ctx.lineTo(GRID_SIZE * 0.5, 0);
            ctx.stroke();
            ctx.restore();
        } else if (this.type.startsWith('magic_spear')) {
            const isSpecial = this.type === 'magic_spear_special';
            const mainColor = isSpecial ? '#a855f7' : '#111827';
            const trailColor = isSpecial ? 'rgba(192, 132, 252, 0.4)' : 'rgba(107, 114, 128, 0.4)';
            const spearLength = isSpecial ? GRID_SIZE * 1.2 : GRID_SIZE * 1.0;
            const spearWidth = isSpecial ? GRID_SIZE * 0.25 : GRID_SIZE * 0.2;


            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.angle);

            for (let i = 0; i < this.trail.length; i++) {
                const pos = this.trail[i];
                const alpha = (i / this.trail.length) * 0.3;
                const trailX = (pos.x - this.pixelX) * Math.cos(-this.angle) - (pos.y - this.pixelY) * Math.sin(-this.angle);
                const trailY = (pos.x - this.pixelX) * Math.sin(-this.angle) + (pos.y - this.pixelY) * Math.cos(-this.angle);
                
                ctx.fillStyle = trailColor.replace('0.4', alpha);
                ctx.beginPath();
                ctx.arc(trailX, trailY, (GRID_SIZE / 4) * (i / this.trail.length), 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.fillStyle = mainColor;
            ctx.beginPath();
            ctx.moveTo(spearLength, 0);
            ctx.lineTo(0, -spearWidth);
            ctx.lineTo(0, spearWidth);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        } else if (this.type === 'boomerang_projectile') {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.rotationAngle); 
            this.owner.weapon.drawBoomerang(ctx, 0.6); 
            ctx.restore();
        } else if (this.type === 'boomerang_normal_projectile') {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.rotationAngle);
            this.owner.weapon.drawBoomerang(ctx, 0.3, 0, '#18181b');
            ctx.restore();
        } else if (this.type === 'ice_diamond_projectile') {
            for (let i = 0; i < this.trail.length; i++) {
                const pos = this.trail[i];
                const alpha = (i / this.trail.length) * 0.5;
                ctx.fillStyle = `rgba(165, 243, 252, ${alpha})`;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, (GRID_SIZE / 2.5) * (i / this.trail.length), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.angle);
            
            const size = GRID_SIZE * 0.6;
            const grad = ctx.createLinearGradient(-size, -size, size, size);
            grad.addColorStop(0, '#e0f2fe');
            grad.addColorStop(0.5, '#7dd3fc');
            grad.addColorStop(1, '#0ea5e9');

            ctx.fillStyle = grad;
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(size * 0.8, 0);
            ctx.lineTo(0, -size * 0.6);
            ctx.lineTo(-size * 0.8, 0);
            ctx.lineTo(0, size * 0.6);
            ctx.closePath();
            
            ctx.fill();
            ctx.stroke();
            
            ctx.restore();
        } else if (this.type === 'ice_bolt_projectile') {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.angle);
            ctx.fillStyle = '#000000';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, GRID_SIZE / 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        } else if (this.type === 'fireball_projectile' || this.type === 'mini_fireball_projectile') {
            const size = this.type === 'fireball_projectile' ? GRID_SIZE / 2.5 : GRID_SIZE / 4;
            for (let i = 0; i < this.trail.length; i++) {
                const pos = this.trail[i];
                const alpha = (i / this.trail.length) * 0.4;
                ctx.fillStyle = `rgba(255, 100, 0, ${alpha})`;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, size * (i / this.trail.length), 0, Math.PI * 2);
                ctx.fill();
            }
            const grad = ctx.createRadialGradient(this.pixelX, this.pixelY, size * 0.2, this.pixelX, this.pixelY, size);
            grad.addColorStop(0, '#ffff99');
            grad.addColorStop(0.6, '#ff9900');
            grad.addColorStop(1, '#ff4500');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(this.pixelX, this.pixelY, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Re-export Weapon to keep other modules working
export { Weapon };

