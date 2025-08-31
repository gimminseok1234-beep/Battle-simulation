import { GameManager } from './gameManager.js';
import { GRID_SIZE, TILE, TEAM, COLORS } from './constants.js';

class GameObject {
    constructor(gridX, gridY) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.pixelX = gridX * GRID_SIZE + GRID_SIZE / 2;
        this.pixelY = gridY * GRID_SIZE + GRID_SIZE / 2;
    }

    draw(ctx) {
        // Base draw method (optional)
    }
}

export class Unit extends GameObject {
    constructor(gridX, gridY, team) {
        super(gridX, gridY);
        this.team = team;
        this.hp = 100;
        this.maxHp = 100;
        this.speed = 1.2;
        this.attackPower = 10;
        this.attackRange = GRID_SIZE * 1.5;
        this.detectionRange = GRID_SIZE * 6;
        this.attackCooldown = 120; // frames
        this.cooldownTimer = 0;
        this.target = null;
        this.state = 'IDLE'; // IDLE, MOVING, ATTACKING
        this.path = [];
        this.movementTimer = 0;
        this.isStunned = false;
        this.stunTimer = 0;
        this.weapon = null;
        this.isCasting = false;
        this.castTimer = 0;
        this.castDuration = 0;
        this.knockbackResistance = 1;
        this.hadokenChargeTime = 150;
        this.staffChargeTime = 200;
        this.shurikenChargeTime = 80;
    }
    
    // ====================================================================
    // ===== 수정된 부분 (START) ==========================================
    // ====================================================================
    update(enemies, weapons, projectiles) {
        if (this.isStunned) {
            this.stunTimer--;
            if (this.stunTimer <= 0) this.isStunned = false;
            return;
        }

        if (this.cooldownTimer > 0) this.cooldownTimer--;
        
        // 상태 전이 로직
        if (!this.target || this.target.hp <= 0) {
            this.target = this.findClosestEnemy(enemies);
            if (this.target) this.state = 'MOVING';
            else this.state = 'IDLE';
        }

        if (this.target) {
            const distance = Math.hypot(this.pixelX - this.target.pixelX, this.pixelY - this.target.pixelY);
            if (distance <= this.attackRange) {
                this.state = 'ATTACKING';
            } else {
                 if (this.state !== 'MOVING' || this.movementTimer <= 0) {
                     this.state = 'MOVING';
                 }
            }
        }
        
        if (!this.target && this.weapon === null) {
            const closestWeapon = this.findClosestWeapon(weapons);
            if (closestWeapon && Math.hypot(this.pixelX - closestWeapon.pixelX, this.pixelY - closestWeapon.pixelY) < this.detectionRange) {
                this.state = 'MOVING_TO_WEAPON';
                this.path = [closestWeapon];
            }
        }
        
        // 상태에 따른 행동
        switch(this.state) {
            case 'IDLE':
                // Do nothing
                break;
            case 'MOVING':
                 this.moveTowards(this.target.pixelX, this.target.pixelY);
                break;
            case 'ATTACKING':
                this.attack(this.target, projectiles);
                break;
            case 'MOVING_TO_WEAPON':
                if (this.path.length > 0) {
                    const targetWeapon = this.path[0];
                    if (targetWeapon.isEquipped) {
                        this.path = [];
                        this.state = 'IDLE';
                    } else {
                        this.moveTowards(targetWeapon.pixelX, targetWeapon.pixelY);
                        if (Math.hypot(this.pixelX - targetWeapon.pixelX, this.pixelY - targetWeapon.pixelY) < GRID_SIZE / 2) {
                            this.equipWeapon(targetWeapon.type);
                            targetWeapon.isEquipped = true;
                            this.path = [];
                            this.state = 'IDLE';
                        }
                    }
                } else {
                    this.state = 'IDLE';
                }
                break;
        }

        this.applySeparation(); // 유닛 겹침 방지 로직 호출

        this.gridX = Math.floor(this.pixelX / GRID_SIZE);
        this.gridY = Math.floor(this.pixelY / GRID_SIZE);

        this.handleTileEffects();
    }
    
    // 유닛 겹침 방지를 위한 분리 로직 함수
    applySeparation() {
        const gameManager = GameManager.getInstance();
        const allUnits = gameManager.units;
        let separationX = 0;
        let separationY = 0;
        let neighborsCount = 0;
        const desiredSeparation = (GRID_SIZE / 2) * 1.2; // 유닛 반지름의 1.2배

        for (const otherUnit of allUnits) {
            if (this === otherUnit) continue;

            const distance = Math.hypot(this.pixelX - otherUnit.pixelX, this.pixelY - otherUnit.pixelY);

            if (distance > 0 && distance < desiredSeparation) {
                let diffX = this.pixelX - otherUnit.pixelX;
                let diffY = this.pixelY - otherUnit.pixelY;
                diffX /= distance;
                diffY /= distance;
                separationX += diffX;
                separationY += diffY;
                neighborsCount++;
            }
        }

        if (neighborsCount > 0) {
            separationX /= neighborsCount;
            separationY /= neighborsCount;

            // 분리 힘을 현재 속도보다 약간 강하게 적용하여 밀어내도록 함
            const separationForce = this.speed * 0.5;
            this.pixelX += separationX * separationForce;
            this.pixelY += separationY * separationForce;
        }
    }

    attack(target, projectiles) {
        if (this.cooldownTimer <= 0) {
            if (this.weapon) {
                switch(this.weapon.type) {
                    case 'hadoken':
                    case 'staff':
                    case 'shuriken':
                        if (!this.isCasting) {
                            this.isCasting = true;
                            this.castDuration = this.weapon.type === 'hadoken' ? this.hadokenChargeTime : (this.weapon.type === 'staff' ? this.staffChargeTime : this.shurikenChargeTime);
                            this.castTimer = this.castDuration;
                            // 스킬 시작 시점의 사운드 재생 코드를 제거!
                        }
                        break;
                    default: // 근접 공격
                        this.performMeleeAttack(target);
                        break;
                }
            } else { // 기본 근접 공격
                this.performMeleeAttack(target);
            }
        }

        if (this.isCasting) {
            this.castTimer--;
            if (this.castTimer <= 0) {
                this.isCasting = false;
                this.cooldownTimer = this.attackCooldown;
                const gameManager = GameManager.getInstance();
                
                if (this.weapon.type === 'staff') {
                     const spellTargetPos = { x: target.pixelX, y: target.pixelY };
                     gameManager.castAreaSpell(spellTargetPos, this.weapon.type, this.attackPower, this.team);
                } else {
                    // 투사체 생성 시에만 GameManager를 통해 projectile을 생성
                    gameManager.createProjectile(this, target, this.weapon.type);
                }
            }
        }
    }
    // ====================================================================
    // ===== 수정된 부분 (END) ============================================
    // ====================================================================
    
    performMeleeAttack(target) {
        this.cooldownTimer = this.attackCooldown;
        const gameManager = GameManager.getInstance();
        gameManager.createEffect('slash', target.pixelX, target.pixelY);
        
        let soundKey = 'punch';
        if (this.weapon) {
            switch(this.weapon.type) {
                case 'sword': soundKey = 'sword'; break;
                case 'dual_swords': soundKey = 'doubleSword'; break;
            }
        }
        gameManager.audioManager.play(soundKey);
        
        target.takeDamage(this.attackPower);
    }
    
    takeDamage(amount, effectInfo = null) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            if (this.weapon && this.weapon.type === 'crown') {
                const gameManager = GameManager.getInstance();
                const crown = gameManager.createWeapon(this.gridX, this.gridY, 'crown');
                gameManager.weapons.push(crown);
            }
        }
        if (effectInfo) {
            if (effectInfo.interrupt && this.isCasting) {
                this.isCasting = false;
                this.castTimer = 0;
            }
            if (effectInfo.force && effectInfo.angle !== undefined) {
                 const knockbackForce = effectInfo.force * this.knockbackResistance;
                 this.pixelX += Math.cos(effectInfo.angle) * knockbackForce;
                 this.pixelY += Math.sin(effectInfo.angle) * knockbackForce;
                 
                 const newGridX = Math.floor(this.pixelX / GRID_SIZE);
                 const newGridY = Math.floor(this.pixelY / GRID_SIZE);
                 const gameManager = GameManager.getInstance();
                 if (newGridY >= 0 && newGridY < gameManager.ROWS && newGridX >= 0 && newGridX < gameManager.COLS) {
                     const tile = gameManager.map[newGridY][newGridX];
                     if (tile.type === TILE.WALL || tile.type === TILE.CRACKED_WALL) {
                         this.takeDamage(35);
                         gameManager.damageTile(newGridX, newGridY, 35);
                         // 튕겨나오기
                         this.pixelX -= Math.cos(effectInfo.angle) * knockbackForce * 1.2;
                         this.pixelY -= Math.sin(effectInfo.angle) * knockbackForce * 1.2;
                     }
                 } else { // 맵 밖으로 밀려났을 때
                     this.takeDamage(50);
                     this.pixelX -= Math.cos(effectInfo.angle) * knockbackForce * 1.2;
                     this.pixelY -= Math.sin(effectInfo.angle) * knockbackForce * 1.2;
                 }
            }
        }
    }
    
    findClosestEnemy(enemies) {
        let closestEnemy = null;
        let minDistance = this.detectionRange;
        const gameManager = GameManager.getInstance();
        
        enemies.forEach(enemy => {
            if (enemy.team !== this.team) {
                const distance = Math.hypot(this.pixelX - enemy.pixelX, this.pixelY - enemy.pixelY);
                if (distance < minDistance && gameManager.hasLineOfSight(this, enemy)) {
                    minDistance = distance;
                    closestEnemy = enemy;
                }
            }
        });
        return closestEnemy;
    }
    
    findClosestWeapon(weapons) {
        let closestWeapon = null;
        let minDistance = Infinity;
        weapons.forEach(weapon => {
             if (weapon.isEquipped) return;
             if (this.weapon && this.weapon.type === 'crown' && weapon.type !== 'crown') return;
             if (this.weapon && this.weapon.type !== 'crown' && weapon.type === 'crown') return;
            const distance = Math.hypot(this.pixelX - weapon.pixelX, this.pixelY - weapon.pixelY);
            if (distance < minDistance) {
                minDistance = distance;
                closestWeapon = weapon;
            }
        });
        return closestWeapon;
    }

    moveTowards(targetX, targetY) {
        if (this.isCasting) return;
        const angle = Math.atan2(targetY - this.pixelY, targetX - this.pixelX);
        this.pixelX += Math.cos(angle) * this.speed;
        this.pixelY += Math.sin(angle) * this.speed;
    }
    
    equipWeapon(weaponType, fromClone = false) {
        const gameManager = GameManager.getInstance();
        this.weapon = { type: weaponType };
    
        const baseStats = {
            speed: 1.2, attackPower: 10, attackRange: GRID_SIZE * 1.5,
            detectionRange: GRID_SIZE * 6, attackCooldown: 120,
            knockbackResistance: 1,
        };

        this.speed = baseStats.speed;
        this.attackPower = baseStats.attackPower;
        this.attackRange = baseStats.attackRange;
        this.detectionRange = baseStats.detectionRange;
        this.attackCooldown = baseStats.attackCooldown;
        this.knockbackResistance = baseStats.knockbackResistance;
    
        const weaponData = gameManager.createWeapon(0, 0, weaponType);
        this.attackPower += weaponData.attackPowerBonus;
        this.attackRange += weaponData.attackRangeBonus;
        this.detectionRange += weaponData.detectionRangeBonus;
        this.speed += weaponData.speedBonus;
        this.attackCooldown += weaponData.attackCooldownBonus;
    
        if (!fromClone) gameManager.audioManager.play('equip');
    }
    
    handleTileEffects() {
        const gameManager = GameManager.getInstance();
        if (this.gridY < 0 || this.gridY >= gameManager.ROWS || this.gridX < 0 || this.gridX >= gameManager.COLS) return;
        const tile = gameManager.map[this.gridY][this.gridX];
        
        if (gameManager.isPosInAnyField(this.gridX, this.gridY)) {
            this.takeDamage(0.3);
            const safeSpot = gameManager.findClosestSafeSpot(this.pixelX, this.pixelY);
            if(safeSpot) this.moveTowards(safeSpot.x, safeSpot.y);
        }

        if (tile.type === TILE.LAVA) this.takeDamage(0.5);
        if (tile.type === TILE.HEAL_PACK && this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + 0.8);
            gameManager.createEffect('heal', this.pixelX, this.pixelY, this);
        }
        if (tile.type === TILE.REPLICATION_TILE) {
            if (!tile.cooldown || gameManager.animationFrameCounter > tile.cooldown) {
                for (let i = 0; i < tile.replicationValue; i++) gameManager.spawnUnit(this, true);
                tile.cooldown = gameManager.animationFrameCounter + 300;
                gameManager.audioManager.play('replicate');
            }
        }
        if (tile.type === TILE.TELEPORTER) {
            if (!tile.cooldown || gameManager.animationFrameCounter > tile.cooldown) {
                 const teleporters = gameManager.getTilesOfType(TILE.TELEPORTER);
                 if (teleporters.length > 1) {
                     const currentTeleporterIndex = teleporters.findIndex(t => t.x === this.gridX && t.y === this.gridY);
                     const targetTeleporter = teleporters[(currentTeleporterIndex + 1) % teleporters.length];
                     
                     this.pixelX = targetTeleporter.x * GRID_SIZE + GRID_SIZE / 2;
                     this.pixelY = targetTeleporter.y * GRID_SIZE + GRID_SIZE / 2;
                     gameManager.map[this.gridY][this.gridX].cooldown = gameManager.animationFrameCounter + 180;
                     gameManager.map[targetTeleporter.y][targetTeleporter.x].cooldown = gameManager.animationFrameCounter + 180;
                     gameManager.audioManager.play('teleport');
                 }
            }
        }
    }

    draw(ctx) {
        // Draw unit body
        switch(this.team) {
            case TEAM.A: ctx.fillStyle = COLORS.TEAM_A; break;
            case TEAM.B: ctx.fillStyle = COLORS.TEAM_B; break;
            case TEAM.C: ctx.fillStyle = COLORS.TEAM_C; break;
            case TEAM.D: ctx.fillStyle = COLORS.TEAM_D; break;
            default: ctx.fillStyle = '#9ca3af'; break;
        }
        ctx.beginPath();
        ctx.arc(this.pixelX, this.pixelY, GRID_SIZE / 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Draw weapon icon
        if (this.weapon) {
            ctx.fillStyle = "white";
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            let icon = '';
            switch(this.weapon.type) {
                case 'sword': icon = 'S'; break;
                case 'bow': icon = 'B'; break;
                case 'dual_swords': icon = 'D'; break;
                case 'staff': icon = 'T'; break;
                case 'hadoken': icon = 'H'; break;
                case 'shuriken': icon = 'R'; break;
                case 'crown': icon = '👑'; break;
            }
            ctx.fillText(icon, this.pixelX, this.pixelY + 4);
        }

        // Draw HP bar
        if (this.hp < this.maxHp) {
            ctx.fillStyle = '#4b5563'; // bg
            ctx.fillRect(this.pixelX - GRID_SIZE/2, this.pixelY - GRID_SIZE/2 - 8, GRID_SIZE, 5);
            ctx.fillStyle = '#22c55e'; // fg
            ctx.fillRect(this.pixelX - GRID_SIZE/2, this.pixelY - GRID_SIZE/2 - 8, GRID_SIZE * (this.hp / this.maxHp), 5);
        }

        // Draw casting bar
        if (this.isCasting) {
             ctx.fillStyle = '#4b5563';
             ctx.fillRect(this.pixelX - GRID_SIZE/2, this.pixelY + GRID_SIZE/2 + 4, GRID_SIZE, 5);
             ctx.fillStyle = '#ef4444';
             const progress = (this.castDuration - this.castTimer) / this.castDuration;
             ctx.fillRect(this.pixelX - GRID_SIZE/2, this.pixelY + GRID_SIZE/2 + 4, GRID_SIZE * progress, 5);
        }
    }
}

// ... (rest of the classes: Weapon, Nexus, Projectile, etc.) unchanged ...
export class Weapon extends GameObject {
    constructor(gridX, gridY, type) {
        super(gridX, gridY);
        this.type = type; // 'sword', 'bow', 'dual_swords', 'staff', 'hadoken', 'shuriken', 'crown'
        this.isEquipped = false;
        this.attackPowerBonus = 0;
        this.attackRangeBonus = 0;
        this.detectionRangeBonus = 0;
        this.speedBonus = 0;
        this.attackCooldownBonus = 0;
    }
    draw(ctx) {
        if (this.isEquipped) return;
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(this.pixelX, this.pixelY, GRID_SIZE / 3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = "black";
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        let icon = '';
        switch(this.type) {
             case 'sword': icon = 'S'; break;
             case 'bow': icon = 'B'; break;
             case 'dual_swords': icon = 'D'; break;
             case 'staff': icon = 'T'; break;
             case 'hadoken': icon = 'H'; break;
             case 'shuriken': icon = 'R'; break;
             case 'crown': icon = '👑'; break;
        }
        ctx.fillText(icon, this.pixelX, this.pixelY + 4);
    }
}

export class Nexus extends GameObject {
    constructor(gridX, gridY, team) {
        super(gridX, gridY);
        this.team = team;
        this.hp = 500;
        this.maxHp = 500;
        this.isDestroying = false;
        this.explosionParticles = [];
    }

    takeDamage(amount) {
        if (this.isDestroying) return;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.isDestroying = true;
            this.createExplosion();
            GameManager.getInstance().audioManager.play('nexusExplosion');
        }
    }

    createExplosion() {
        for (let i = 0; i < 100; i++) {
            this.explosionParticles.push({
                x: this.pixelX,
                y: this.pixelY,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                alpha: 1,
                size: Math.random() * 5 + 2
            });
        }
    }

    update() {
        if (this.isDestroying) {
            this.explosionParticles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= 0.02;
                p.vx *= 0.98;
                p.vy *= 0.98;
            });
            this.explosionParticles = this.explosionParticles.filter(p => p.alpha > 0);
        }
    }

    draw(ctx) {
        if (this.hp > 0) {
            switch(this.team) {
                case TEAM.A: ctx.fillStyle = COLORS.TEAM_A; break;
                case TEAM.B: ctx.fillStyle = COLORS.TEAM_B; break;
                case TEAM.C: ctx.fillStyle = COLORS.TEAM_C; break;
                case TEAM.D: ctx.fillStyle = COLORS.TEAM_D; break;
            }
            ctx.fillRect(this.pixelX - GRID_SIZE, this.pixelY - GRID_SIZE, GRID_SIZE * 2, GRID_SIZE * 2);

            // Draw HP bar
            ctx.fillStyle = '#4b5563';
            ctx.fillRect(this.pixelX - GRID_SIZE, this.pixelY - GRID_SIZE - 12, GRID_SIZE * 2, 8);
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(this.pixelX - GRID_SIZE, this.pixelY - GRID_SIZE - 12, (GRID_SIZE * 2) * (this.hp / this.maxHp), 8);
        } else if (this.isDestroying) {
            this.explosionParticles.forEach(p => {
                ctx.fillStyle = `rgba(255, ${Math.random()*150}, 0, ${p.alpha})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
                ctx.fill();
            });
        }
    }
}


export class Projectile extends GameObject {
    constructor(owner, target, type) {
        super(Math.floor(owner.pixelX/GRID_SIZE), Math.floor(owner.pixelY/GRID_SIZE));
        this.owner = owner;
        this.type = type;
        this.speed = (type === 'shuriken' || type === 'arrow') ? 8 : 6;
        this.damage = owner.attackPower;
        this.knockback = type === 'hadoken' ? GameManager.getInstance().hadokenKnockback : 0;
        this.angle = Math.atan2(target.pixelY - this.pixelY, target.pixelX - this.pixelX);
        this.destroyed = false;
        this.trail = [];
    }

    update() {
        this.trail.push({x: this.pixelX, y: this.pixelY});
        if(this.trail.length > 10) this.trail.shift();

        this.pixelX += Math.cos(this.angle) * this.speed;
        this.pixelY += Math.sin(this.angle) * this.speed;
        
        this.gridX = Math.floor(this.pixelX / GRID_SIZE);
        this.gridY = Math.floor(this.pixelY / GRID_SIZE);
        const gameManager = GameManager.getInstance();
        if (this.gridY < 0 || this.gridY >= gameManager.ROWS || this.gridX < 0 || this.gridX >= gameManager.COLS) {
            this.destroyed = true;
            return;
        }
        const tile = gameManager.map[this.gridY][this.gridX];
        if (tile && (tile.type === TILE.WALL || tile.type === TILE.CRACKED_WALL)) {
            this.destroyed = true;
            if (tile.type === TILE.CRACKED_WALL) gameManager.damageTile(this.gridX, this.gridY, this.damage);
            gameManager.createEffect('hit_wall', this.pixelX, this.pixelY);
        }
    }
    
    draw(ctx) {
        if (this.type === 'arrow' || this.type === 'shuriken') {
            ctx.fillStyle = '#d1d5db';
            ctx.beginPath();
            ctx.arc(this.pixelX, this.pixelY, 4, 0, 2 * Math.PI);
            ctx.fill();
        } else if (this.type === 'hadoken') {
            const grd = ctx.createRadialGradient(this.pixelX, this.pixelY, 2, this.pixelX, this.pixelY, 12);
            grd.addColorStop(0, 'rgba(147, 197, 253, 1)');
            grd.addColorStop(1, 'rgba(59, 130, 246, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(this.pixelX, this.pixelY, 12, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
}

export class Effect {
    constructor(x, y, type, target=null) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.duration = 20; // frames
        this.target = target;
    }
    update() { this.duration--; }
    draw(ctx) {
        const progress = this.duration / 20;
        if(this.type === 'slash') {
            ctx.strokeStyle = `rgba(255, 255, 255, ${progress})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 15 * (1 - progress), 0, Math.PI * 2);
            ctx.stroke();
        } else if (this.type === 'heal' && this.target) {
            ctx.fillStyle = `rgba(34, 197, 94, ${progress * 0.7})`;
            ctx.font = 'bold 12px Arial';
            ctx.fillText('+', this.target.pixelX, this.target.pixelY - (20 - this.duration));
        } else if (this.type === 'hit_wall') {
            ctx.fillStyle = `rgba(200, 200, 200, ${progress})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 10 * (1 - progress), 0, 2 * Math.PI);
            ctx.fill();
        }
    }
}

export class AreaEffect {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.duration = 40;
        this.radius = GRID_SIZE * 2.5;
    }

    update() { this.duration--; }

    draw(ctx) {
        const progress = 1 - (this.duration / 40); // 0 to 1
        if(this.type === 'staff') {
            const currentRadius = this.radius * progress;
            const alpha = 1 - progress;
            ctx.fillStyle = `rgba(236, 72, 153, ${alpha * 0.4})`;
            ctx.strokeStyle = `rgba(236, 72, 153, ${alpha * 0.8})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(this.x, this.y, currentRadius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }
    }
}


export class GrowingMagneticField extends GameObject {
    constructor(id, gridX, gridY, width, height, settings) {
        super(gridX, gridY);
        this.id = id;
        this.width = width;
        this.height = height;
        this.direction = settings.direction || 'DOWN';
        this.speed = settings.speed || 4; // 초당 GRID_SIZE 단위
        this.delay = (settings.delay * 60) || 0; // 프레임 단위
        
        this.delayTimer = 0;
        this.progress = 0; // 0 to 1
        
        const distance = (this.direction === 'DOWN' || this.direction === 'UP') ? this.height : this.width;
        this.totalFrames = (distance * GRID_SIZE / this.speed) * 60; // 초를 프레임으로
    }

    update() {
        if (this.delayTimer < this.delay) {
            this.delayTimer++;
            return;
        }
        if (this.progress < 1) {
             const increment = 1 / ( ( (this.direction === 'DOWN' || this.direction === 'UP' ? this.height : this.width) * GRID_SIZE ) / this.speed );
             this.progress = Math.min(1, this.progress + increment);
        }
    }

    draw(ctx) {
        if (GameManager.getInstance().state !== 'EDIT') return;

        const x = this.gridX * GRID_SIZE;
        const y = this.gridY * GRID_SIZE;
        const w = this.width * GRID_SIZE;
        const h = this.height * GRID_SIZE;

        ctx.fillStyle = 'rgba(168, 85, 247, 0.1)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
        ctx.strokeRect(x, y, w, h);
        
        // Draw direction arrows
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        const centerX = x + w / 2;
        const centerY = y + h / 2;
        if (this.direction === 'DOWN') ctx.fillText('↓', centerX, y + h - 5);
        if (this.direction === 'UP') ctx.fillText('↑', centerX, y + 15);
        if (this.direction === 'RIGHT') ctx.fillText('→', x + w - 10, centerY + 5);
        if (this.direction === 'LEFT') ctx.fillText('←', x + 10, centerY + 5);
    }
}
