import { TILE, TEAM, COLORS, GRID_SIZE } from './constants.js';
import { Weapon, MagicDaggerDashEffect, createPhysicalHitEffect } from './weaponary.js';
import { Nexus } from './entities.js';

// Unit class
export class Unit {
    constructor(gameManager, x, y, team) {
        this.gameManager = gameManager;
        this.gridX = x; this.gridY = y;
        this.pixelX = x * GRID_SIZE + GRID_SIZE / 2;
        this.pixelY = y * GRID_SIZE + GRID_SIZE / 2;
        this.team = team; this.hp = 100;
        this.baseSpeed = 1.0; this.facingAngle = gameManager.random() * Math.PI * 2;
        this.baseAttackPower = 5; this.baseAttackRange = 1.5 * GRID_SIZE;
        this.baseDetectionRange = 6 * GRID_SIZE;
        this.attackCooldown = 0; this.baseCooldownTime = 80;
        this.state = 'IDLE'; this.alertedCounter = 0;
        this.weapon = null; this.target = null; this.moveTarget = null;
        this.isCasting = false; this.castingProgress = 0; this.castTargetPos = null;
        this.castDuration = 180;
        this.teleportCooldown = 0;
        this.isKing = false; this.spawnCooldown = 0; this.spawnInterval = 720;
        this.knockbackX = 0; this.knockbackY = 0;
        this.isInMagneticField = false;
        this.evasionCooldown = 0;
        this.attackAnimationTimer = 0;
        this.magicCircleCooldown = 0;
        this.boomerangCooldown = 0;
        this.shurikenSkillCooldown = 0;
        this.isStunned = 0;
        this.stunnedByMagicCircle = false; // [추가] 마법진에 의한 기절 여부
        this.poisonEffect = { active: false, duration: 0, damage: 0 };
        this.isBeingPulled = false;
        this.puller = null;
        this.pullTargetPos = null;
        this.hpBarVisibleTimer = 0;
        this.isDashing = false;
        this.dashSpeed = 8;
        this.dashDistanceRemaining = 0;
        this.dashDirection = null;
        this.dashTrail = [];
        this.name = '';
        this.awakeningEffect = { active: false, stacks: 0, timer: 0 };
        this.magicDaggerSkillCooldown = 0;
        this.isAimingMagicDagger = false;
        this.magicDaggerAimTimer = 0;
        this.magicDaggerTargetPos = null;
        this.axeSkillCooldown = 0;
        this.spinAnimationTimer = 0;
        this.iceDiamondCharges = 0;
        this.iceDiamondChargeTimer = 0;
        this.fireStaffSpecialCooldown = 0;
        this.isSlowed = 0;
        this.attackCount = 0; // [추가] 3타 스킬을 위한 공격 횟수 카운터
        this.swordSpecialAttackAnimationTimer = 0; // [추가] 검 3타 공격 모션 타이머

        // [수정] 쌍검 스킬 관련 변수 변경
        this.dualSwordSkillCooldown = 0;
        this.dualSwordTeleportTarget = null; // 순간이동할 단일 대상
        this.dualSwordTeleportDelayTimer = 0; // 순간이동까지의 딜레이
        this.dualSwordSpinAttackTimer = 0; // 순간이동 후 회전 공격 애니메이션
        this.isMarkedByDualSword = { active: false, timer: 0 }; // 자신이 표식에 걸렸는지 여부
    }
    
    get speed() {
        const gameManager = this.gameManager;
        if (!gameManager || this.isStunned > 0) {
            return 0;
        }

        let speedModifier = 0;
        if (this.isInMagneticField) speedModifier = -0.7;
        if (this.poisonEffect.active) speedModifier -= 0.7;
        if (this.isSlowed > 0) speedModifier -= 0.3;

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
        return Math.max(0.1, finalSpeed);
    }

    get attackPower() { return this.baseAttackPower + (this.weapon ? this.weapon.attackPowerBonus || 0 : 0); }
    get attackRange() { return this.baseAttackRange + (this.weapon ? this.weapon.attackRangeBonus || 0 : 0); }
    get detectionRange() { return this.baseDetectionRange + (this.weapon ? this.weapon.detectionRangeBonus || 0 : 0); }
    get cooldownTime() { 
        if (this.weapon && this.weapon.type === 'fire_staff') return 120;
        if (this.weapon && this.weapon.type === 'hadoken') return 120;
        if (this.weapon && this.weapon.type === 'axe') return 120;
        if (this.weapon && this.weapon.type === 'ice_diamond') return 180;
        return this.baseCooldownTime + (this.weapon ? this.weapon.attackCooldownBonus || 0 : 0); 
    }

    equipWeapon(weaponType, isClone = false) {
        const gameManager = this.gameManager;
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
        const gameManager = this.gameManager;
        if (!gameManager) return;
    
        if (this.knockbackX !== 0 || this.knockbackY !== 0) {
            const nextX = this.pixelX + this.knockbackX * gameManager.gameSpeed;
            const nextY = this.pixelY + this.knockbackY * gameManager.gameSpeed;
    
            const gridX = Math.floor(nextX / GRID_SIZE);
            const gridY = Math.floor(nextY / GRID_SIZE);
    
            if (gridY >= 0 && gridY < gameManager.ROWS && gridX >= 0 && gridX < gameManager.COLS) {
                 const tile = gameManager.map[gridY][gridX];
                if (tile.type === TILE.WALL || tile.type === TILE.CRACKED_WALL || (tile.type === TILE.GLASS_WALL && !this.isBeingPulled) ) {
                    this.knockbackX = 0;
                    this.knockbackY = 0;
                } else {
                    this.pixelX = nextX;
                    this.pixelY = nextY;
                }
            }
        }
    
        this.knockbackX *= 0.9;
        this.knockbackY *= 0.9;
        if (Math.abs(this.knockbackX) < 0.1) this.knockbackX = 0;
        if (Math.abs(this.knockbackY) < 0.1) this.knockbackY = 0;
    
        gameManager.units.forEach(otherUnit => {
            if (this !== otherUnit) {
                const dx = otherUnit.pixelX - this.pixelX;
                const dy = otherUnit.pixelY - this.pixelY;
                const distance = Math.hypot(dx, dy);
                const minDistance = (GRID_SIZE / 2.5) * 2;
    
                if (distance < minDistance && distance > 0) {
                    const angle = Math.atan2(dy, dx);
                    const overlap = minDistance - distance;
                    const moveX = (overlap / 2) * Math.cos(angle);
                    const moveY = (overlap / 2) * Math.sin(angle);
                    
                    const myNextX = this.pixelX - moveX;
                    const myNextY = this.pixelY - moveY;
                    const otherNextX = otherUnit.pixelX + moveX;
                    const otherNextY = otherUnit.pixelY + moveY;

                    const myGridX = Math.floor(myNextX / GRID_SIZE);
                    const myGridY = Math.floor(myNextY / GRID_SIZE);
                    const otherGridX = Math.floor(otherNextX / GRID_SIZE);
                    const otherGridY = Math.floor(otherNextY / GRID_SIZE);

                    const isMyNextPosWall = (myGridY < 0 || myGridY >= gameManager.ROWS || myGridX < 0 || myGridX >= gameManager.COLS) ||
                                          (gameManager.map[myGridY][myGridX].type === TILE.WALL || gameManager.map[myGridY][myGridX].type === TILE.CRACKED_WALL);

                    const isOtherNextPosWall = (otherGridY < 0 || otherGridY >= gameManager.ROWS || otherGridX < 0 || otherGridX >= gameManager.COLS) ||
                                             (gameManager.map[otherGridY][otherGridX].type === TILE.WALL || gameManager.map[otherGridY][otherGridX].type === TILE.CRACKED_WALL);
                    
                    if (!isMyNextPosWall) {
                        this.pixelX = myNextX;
                        this.pixelY = myNextY;
                    }
                     if (!isOtherNextPosWall) {
                        otherUnit.pixelX = otherNextX;
                        otherUnit.pixelY = otherNextY;
                    }
                }
            }
        });
    
        const radius = GRID_SIZE / 2.5;
        let bounced = false;
        if (this.pixelX < radius) {
            this.pixelX = radius;
            this.knockbackX = Math.abs(this.knockbackX) * 0.5 || 1; 
            bounced = true;
        } else if (this.pixelX > gameManager.canvas.width - radius) {
            this.pixelX = gameManager.canvas.width - radius;
            this.knockbackX = -Math.abs(this.knockbackX) * 0.5 || -1;
            bounced = true;
        }

        if (this.pixelY < radius) {
            this.pixelY = radius;
            this.knockbackY = Math.abs(this.knockbackY) * 0.5 || 1;
            bounced = true;
        } else if (this.pixelY > gameManager.canvas.height - radius) {
            this.pixelY = gameManager.canvas.height - radius;
            this.knockbackY = -Math.abs(this.knockbackY) * 0.5 || -1;
            bounced = true;
        }

        if(bounced && this.state === 'IDLE'){
            this.moveTarget = null;
        }
    }

    move() {
        if (!this.moveTarget || this.isCasting || this.isStunned > 0 || this.isAimingMagicDagger) return;
        const gameManager = this.gameManager;
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
            if (collidedTile.type === TILE.WALL || collidedTile.type === TILE.CRACKED_WALL || collidedTile.type === TILE.GLASS_WALL) {
                if (collidedTile.type === TILE.CRACKED_WALL) {
                    gameManager.damageTile(nextGridX, nextGridY, 999);
                }
                const bounceAngle = this.facingAngle + Math.PI + (gameManager.random() - 0.5);
                this.knockbackX += Math.cos(bounceAngle) * 1.5;
                this.knockbackY += Math.sin(bounceAngle) * 1.5;
                this.moveTarget = null;
                return;
            }
        } 
        
        this.facingAngle = angle; this.pixelX = nextPixelX; this.pixelY = nextPixelY;
    }

    attack(target) {
        if (!target || this.attackCooldown > 0 || this.isStunned > 0) return;
        if (this.isCasting && this.weapon && this.weapon.type !== 'poison_potion') return;

        const gameManager = this.gameManager;
        if (!gameManager) return;

        const targetGridX = Math.floor(target.pixelX / GRID_SIZE);
        const targetGridY = Math.floor(target.pixelY / GRID_SIZE);
        if(targetGridY < 0 || targetGridY >= gameManager.ROWS || targetGridX < 0 || targetGridX >= gameManager.COLS) return;
        
        const tile = gameManager.map[targetGridY][targetGridX];
        
        if (tile.type === TILE.CRACKED_WALL) {
            gameManager.damageTile(targetGridX, targetGridY, this.attackPower);
            this.attackCooldown = this.cooldownTime;
        } else if (target instanceof Unit || target instanceof Nexus) {
            if (this.weapon) {
                this.weapon.use(this, target);
            } else {
                target.takeDamage(this.attackPower);
                gameManager.audioManager.play('punch');
                this.attackCooldown = this.cooldownTime;
            }
        }
    }

    takeDamage(damage, effectInfo = {}) {
        const gameManager = this.gameManager;
        if (gameManager && damage > 0 && !effectInfo.isTileDamage) {
            createPhysicalHitEffect(gameManager, this);
        }
        this.hp -= damage;
        this.hpBarVisibleTimer = 180;
        if (effectInfo.interrupt) {
             if (!['shuriken', 'lightning'].includes(this.weapon?.type) || effectInfo.force > 0) {
                 this.isCasting = false;
                 this.castingProgress = 0;
             }
        }
        if (effectInfo.force && effectInfo.force > 0) {
            this.knockbackX += Math.cos(effectInfo.angle) * effectInfo.force;
            this.knockbackY += Math.sin(effectInfo.angle) * effectInfo.force;
        }
        if (effectInfo.stun) {
            if (this.isStunned <= 0) {
                gameManager.audioManager.play('stern');
            }
            this.isStunned = Math.max(this.isStunned, effectInfo.stun);
            if (effectInfo.stunSource === 'magic_circle') { // [추가] 기절 출처 확인
                this.stunnedByMagicCircle = true;
            }
        }
        if (effectInfo.poison){
            this.poisonEffect.active = true;
            this.poisonEffect.duration = 180;
            this.poisonEffect.damage = effectInfo.poison.damage;
        }
        if (effectInfo.slow) {
            this.isSlowed = Math.max(this.isSlowed, effectInfo.slow);
        }
    }

    handleDeath() {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        if (this.weapon && this.weapon.type === 'poison_potion') {
            gameManager.castAreaSpell({ x: this.pixelX, y: this.pixelY }, 'poison_cloud', this.team);
        }
    }

    update(enemies, weapons, projectiles) {
        const gameManager = this.gameManager;
        if (!gameManager) {
            return;
        }
        
        if (this.isDashing) {
            this.dashTrail.push({x: this.pixelX, y: this.pixelY});
            if (this.dashTrail.length > 5) this.dashTrail.shift();
    
            let moveX = 0, moveY = 0;
            switch(this.dashDirection) {
                case 'RIGHT': moveX = this.dashSpeed; break;
                case 'LEFT':  moveX = -this.dashSpeed; break;
                case 'DOWN':  moveY = this.dashSpeed; break;
                case 'UP':    moveY = -this.dashSpeed; break;
            }
    
            for (let i = 0; i < gameManager.gameSpeed; i++) {
                const nextX = this.pixelX + moveX;
                const nextY = this.pixelY + moveY;
                const gridX = Math.floor(nextX / GRID_SIZE);
                const gridY = Math.floor(nextY / GRID_SIZE);
    
                if (gridY < 0 || gridY >= gameManager.ROWS || gridX < 0 || gridX >= gameManager.COLS) {
                    this.isDashing = false;
                    break;
                }
    
                const tile = gameManager.map[gridY][gridX];
                if (tile.type === TILE.WALL) {
                    this.isDashing = false;
                    break;
                }
    
                if (tile.type === TILE.CRACKED_WALL) {
                    gameManager.damageTile(gridX, gridY, 999);
                }
    
                this.pixelX = nextX;
                this.pixelY = nextY;
                this.dashDistanceRemaining -= this.dashSpeed;
    
                if (this.dashDistanceRemaining <= 0) {
                    this.isDashing = false;
                    break;
                }
            }
            if (!this.isDashing) this.dashTrail = [];
            return;
        }
        
        if (this.hpBarVisibleTimer > 0) this.hpBarVisibleTimer--;

        if (this.isBeingPulled && this.puller) {
            const dx = this.pullTargetPos.x - this.pixelX;
            const dy = this.pullTargetPos.y - this.pixelY;
            const dist = Math.hypot(dx, dy);
            const pullSpeed = 4; 

            if (dist < pullSpeed * gameManager.gameSpeed) {
                this.pixelX = this.pullTargetPos.x;
                this.pixelY = this.pullTargetPos.y;
                this.isBeingPulled = false;
                this.puller = null;
                this.takeDamage(20, { stun: 120 });
            } else {
                const angle = Math.atan2(dy, dx);
                this.pixelX += Math.cos(angle) * pullSpeed * gameManager.gameSpeed;
                this.pixelY += Math.sin(angle) * pullSpeed * gameManager.gameSpeed;
                this.knockbackX = 0;
                this.knockbackY = 0;
            }
            this.applyPhysics();
            return;
        }
        // ...
        if (this.isStunned > 0) {
            this.isStunned -= gameManager.gameSpeed;
            if (this.isStunned <= 0) { // [추가] 기절이 풀리면 상태 초기화
                this.stunnedByMagicCircle = false;
            }
            this.applyPhysics();
            return;
        }

        if (this.isSlowed > 0) {
            this.isSlowed -= gameManager.gameSpeed;
        }

        if (this.isMarkedByDualSword.active) {
            this.isMarkedByDualSword.timer -= gameManager.gameSpeed;
            if (this.isMarkedByDualSword.timer <= 0) {
                this.isMarkedByDualSword.active = false;
            }
        }

        if (this.awakeningEffect.active && this.awakeningEffect.stacks < 2) {
            this.awakeningEffect.timer += gameManager.gameSpeed;
            if (this.awakeningEffect.timer >= 300) {
                this.awakeningEffect.timer = 0;
                this.awakeningEffect.stacks++;
                this.hp = Math.min(100, this.hp + 30);
                this.baseAttackPower += 3;
            }
        }

        if (this.magicDaggerSkillCooldown > 0) this.magicDaggerSkillCooldown -= gameManager.gameSpeed;
        if (this.axeSkillCooldown > 0) this.axeSkillCooldown -= gameManager.gameSpeed;
        if (this.spinAnimationTimer > 0) this.spinAnimationTimer -= gameManager.gameSpeed;
        if (this.swordSpecialAttackAnimationTimer > 0) this.swordSpecialAttackAnimationTimer -= gameManager.gameSpeed; // [추가] 검 3타 공격 모션 타이머 감소
        if (this.dualSwordSkillCooldown > 0) this.dualSwordSkillCooldown -= gameManager.gameSpeed;
        if (this.dualSwordTeleportDelayTimer > 0) this.dualSwordTeleportDelayTimer -= gameManager.gameSpeed;
        if (this.dualSwordSpinAttackTimer > 0) this.dualSwordSpinAttackTimer -= gameManager.gameSpeed;
        if (this.attackCooldown > 0) this.attackCooldown -= gameManager.gameSpeed;
        if (this.teleportCooldown > 0) this.teleportCooldown -= gameManager.gameSpeed;
        if (this.alertedCounter > 0) this.alertedCounter -= gameManager.gameSpeed;
        if (this.isKing && this.spawnCooldown > 0) this.spawnCooldown -= gameManager.gameSpeed;
        if (this.evasionCooldown > 0) this.evasionCooldown -= gameManager.gameSpeed;
        if (this.attackAnimationTimer > 0) this.attackAnimationTimer -= gameManager.gameSpeed;
        if (this.magicCircleCooldown > 0) this.magicCircleCooldown -= gameManager.gameSpeed;
        if (this.boomerangCooldown > 0) this.boomerangCooldown -= gameManager.gameSpeed;
        if (this.shurikenSkillCooldown > 0) this.shurikenSkillCooldown -= gameManager.gameSpeed;
        if (this.fireStaffSpecialCooldown > 0) this.fireStaffSpecialCooldown -= gameManager.gameSpeed;
        
        if (this.poisonEffect.active) {
            this.poisonEffect.duration -= gameManager.gameSpeed;
            this.takeDamage(this.poisonEffect.damage, { isTileDamage: true });
            if (this.poisonEffect.duration <= 0) {
                this.poisonEffect.active = false;
            }
        }

        if (this.weapon && this.weapon.type === 'ice_diamond') {
            if (this.iceDiamondCharges < 5) {
                this.iceDiamondChargeTimer += gameManager.gameSpeed;
                if (this.iceDiamondChargeTimer >= 240) {
                    this.iceDiamondCharges++;
                    this.iceDiamondChargeTimer = 0;
                }
            }
        }
        
        // [삭제] 기존 쌍검 스킬 발동 로직을 AGGRESSIVE 상태로 이전합니다.

        // [수정] 쌍검 순간이동 로직 변경
        if (this.dualSwordTeleportDelayTimer > 0) {
            this.dualSwordTeleportDelayTimer -= gameManager.gameSpeed;
            if (this.dualSwordTeleportDelayTimer <= 0) {
                this.performDualSwordTeleportAttack(enemies);
            }
        }

        if (this.weapon && this.weapon.type === 'magic_dagger' && !this.isAimingMagicDagger && this.magicDaggerSkillCooldown <= 0 && this.attackCooldown <= 0) {
            const { item: closestEnemy } = this.findClosest(enemies);
            if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy)) {
                const dist = Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY);
                if (dist < this.detectionRange && dist > this.attackRange) {
                    this.isAimingMagicDagger = true;
                    this.magicDaggerAimTimer = 60;
                    const angle = Math.atan2(closestEnemy.pixelY - this.pixelY, closestEnemy.pixelX - this.pixelX);
                    const dashDistance = GRID_SIZE * 4;
                    this.magicDaggerTargetPos = {
                        x: this.pixelX + Math.cos(angle) * dashDistance,
                        y: this.pixelY + Math.sin(angle) * dashDistance
                    };
                }
            }
        }
        
        if (this.isAimingMagicDagger) {
            this.magicDaggerAimTimer -= gameManager.gameSpeed;
            if (this.magicDaggerAimTimer <= 0) {
                this.isAimingMagicDagger = false;
                this.magicDaggerSkillCooldown = 420;
                this.attackCooldown = 30;
                
                const startPos = { x: this.pixelX, y: this.pixelY };
                const endPos = this.magicDaggerTargetPos;
                
                enemies.forEach(enemy => {
                    const distToLine = Math.abs((endPos.y - startPos.y) * enemy.pixelX - (endPos.x - startPos.x) * enemy.pixelY + endPos.x * startPos.y - endPos.y * startPos.x) / Math.hypot(endPos.y - startPos.y, endPos.x - startPos.x);
                    if (distToLine < GRID_SIZE) {
                       enemy.takeDamage(20, { stun: 60 });
                    }
                });

                this.pixelX = endPos.x;
                this.pixelY = endPos.y;
                
                gameManager.effects.push(new MagicDaggerDashEffect(gameManager, startPos, endPos));
                gameManager.audioManager.play('rush');

                for (let i = 0; i < 15; i++) {
                    const angle = gameManager.random() * Math.PI * 2;
                    const speed = 1 + gameManager.random() * 2;
                    gameManager.addParticle({
                        x: endPos.x,
                        y: endPos.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 0.6,
                        color: ['#c084fc', '#a855f7', '#f5d0fe'][Math.floor(gameManager.random() * 3)],
                        size: gameManager.random() * 2 + 1,
                        gravity: 0.05
                    });
                }
                return;
            }
        }
        
        if (this.weapon && this.weapon.type === 'magic_spear') {
            if (this.magicCircleCooldown <= 0) {
                gameManager.spawnMagicCircle(this.team);
                this.magicCircleCooldown = 300;
            }
            // [수정] 마법진에 의해 기절한 적만 찾도록 변경
            const stunnedEnemy = gameManager.findStunnedByMagicCircleEnemy(this.team);
            if (stunnedEnemy && this.attackCooldown <= 0) {
                this.alertedCounter = 60;
                this.target = stunnedEnemy;
                gameManager.createProjectile(this, stunnedEnemy, 'magic_spear_special');
                gameManager.audioManager.play('spear');
                this.attackCooldown = this.cooldownTime;
                return;
            }
        } else if (this.weapon && this.weapon.type === 'boomerang' && this.boomerangCooldown <= 0) {
            const { item: closestEnemy } = this.findClosest(enemies);
            if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy)) {
                const dist = Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY);
                if (dist <= this.attackRange) {
                    this.boomerangCooldown = 480;
                    gameManager.createProjectile(this, closestEnemy, 'boomerang_projectile');
                    gameManager.audioManager.play('boomerang');
                    this.state = 'IDLE'; 
                    this.moveTarget = null;
                    this.attackCooldown = 60;
                    this.applyPhysics();
                    return; 
                }
            }
        }

        if (this.weapon && this.weapon.type === 'axe' && this.axeSkillCooldown <= 0) {
            const { item: closestEnemy } = this.findClosest(enemies);
            if (closestEnemy && Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY) < GRID_SIZE * 3) {
                this.axeSkillCooldown = 240;
                this.spinAnimationTimer = 30;

                gameManager.createEffect('axe_spin_effect', this.pixelX, this.pixelY, this);

                const damageRadius = GRID_SIZE * 3.5;
                enemies.forEach(enemy => {
                    if (Math.hypot(this.pixelX - enemy.pixelX, this.pixelY - enemy.pixelY) < damageRadius) {
                        enemy.takeDamage(this.attackPower * 1.5);
                    }
                });
                 gameManager.nexuses.forEach(nexus => {
                    if (nexus.team !== this.team && !nexus.isDestroying && Math.hypot(this.pixelX - nexus.pixelX, this.pixelY - nexus.pixelY) < damageRadius) {
                        nexus.takeDamage(this.attackPower * 1.5);
                    }
                });
                gameManager.audioManager.play('swordHit');
            }
        }


        let newState = 'IDLE';
        let newTarget = null;
        let targetEnemyForAlert = null; // [추가] 느낌표 표시를 위한 변수

        const currentGridXBeforeMove = Math.floor(this.pixelX / GRID_SIZE);
        const currentGridYBeforeMove = Math.floor(this.pixelY / GRID_SIZE);
        this.isInMagneticField = gameManager.isPosInAnyField(currentGridXBeforeMove, currentGridYBeforeMove);
        
        if(this.isInMagneticField) {
            newState = 'FLEEING_FIELD';
        } else {
            const enemyNexus = gameManager.nexuses.find(n => n.team !== this.team && !n.isDestroying);
            const { item: closestEnemy, distance: enemyDist } = this.findClosest(enemies);
            
            const visibleWeapons = weapons.filter(w => !w.isEquipped && gameManager.hasLineOfSightForWeapon(this, w));
            const { item: targetWeapon, distance: weaponDist } = this.findClosest(visibleWeapons);

            let closestQuestionMark = null;
            let questionMarkDist = Infinity;
            if (!this.weapon) {
                const questionMarkTiles = gameManager.getTilesOfType(TILE.QUESTION_MARK);
                const questionMarkPositions = questionMarkTiles.map(pos => ({
                    gridX: pos.x, gridY: pos.y,
                    pixelX: pos.x * GRID_SIZE + GRID_SIZE / 2,
                    pixelY: pos.y * GRID_SIZE + GRID_SIZE / 2
                }));
                ({ item: closestQuestionMark, distance: questionMarkDist } = this.findClosest(questionMarkPositions));
            }

            let targetEnemy = null;
            if (closestEnemy && enemyDist <= this.detectionRange && gameManager.hasLineOfSight(this, closestEnemy)) {
                targetEnemy = closestEnemy;
                targetEnemyForAlert = closestEnemy; // [추가] 느낌표를 위해 타겟 저장
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
                if (closestQuestionMark && questionMarkDist <= this.detectionRange) {
                    newState = 'SEEKING_QUESTION_MARK';
                    newTarget = closestQuestionMark;
                } else if (!this.weapon && targetWeapon && weaponDist <= this.detectionRange) {
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

        if (this.state !== newState && newState !== 'IDLE' && newState !== 'FLEEING_FIELD') {
            // [수정] 특수 공격 시에는 이미 느낌표가 뜨므로, 일반 공격 상태일 때만 느낌표를 띄웁니다.
            if (!(this.weapon && this.weapon.type === 'magic_spear' && this.target instanceof Unit && this.target.stunnedByMagicCircle)) {
                 this.alertedCounter = 60;
            }
        }
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
            case 'SEEKING_QUESTION_MARK':
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
                    // [추가] 쌍검 특수 공격 우선 로직
                    if (this.weapon && this.weapon.type === 'dual_swords' && this.dualSwordSkillCooldown <= 0) {
                        const distanceToTarget = Math.hypot(this.pixelX - this.target.pixelX, this.pixelY - this.target.pixelY);
                        // 감지 사거리 내에 있으면 특수 공격 발동
                        if (distanceToTarget <= this.detectionRange && gameManager.hasLineOfSight(this, this.target)) {
                            gameManager.createProjectile(this, this.target, 'bouncing_sword');
                            this.dualSwordSkillCooldown = 300; // 5초 쿨다운
                            this.attackCooldown = 60; // 스킬 사용 후 짧은 딜레이
                            this.moveTarget = null;
                            this.facingAngle = Math.atan2(this.target.pixelY - this.pixelY, this.target.pixelX - this.pixelX);
                            break; // 특수 공격 후 행동 종료
                        }
                    }

                    // 일반 공격 로직 (특수 공격이 쿨타임이거나 조건이 맞지 않을 때 실행)
                    let attackDistance = this.attackRange;
                    if (this.weapon && this.weapon.type === 'poison_potion') {
                        attackDistance = this.baseAttackRange;
                    }
                    if (Math.hypot(this.pixelX - this.target.pixelX, this.pixelY - this.target.pixelY) <= attackDistance) {
                        this.moveTarget = null;
                        this.attack(this.target);
                        this.facingAngle = Math.atan2(this.target.pixelY - this.pixelY, this.target.pixelX - this.pixelX);
                    } else { this.moveTarget = { x: this.target.pixelX, y: this.target.pixelY }; }
                }
                break;
            case 'IDLE': default:
                if (!this.moveTarget || Math.hypot(this.pixelX - this.moveTarget.x, this.pixelY - this.moveTarget.y) < GRID_SIZE) {
                    const angle = gameManager.random() * Math.PI * 2;
                    this.moveTarget = { x: this.pixelX + Math.cos(angle) * GRID_SIZE * 8, y: this.pixelY + Math.sin(angle) * GRID_SIZE * 8 };
                }
                break;
        }

        this.move();
        
        this.applyPhysics();

        const finalGridX = Math.floor(this.pixelX / GRID_SIZE);
        const finalGridY = Math.floor(this.pixelY / GRID_SIZE);

        if (this.isInMagneticField) {
            this.takeDamage(0.3 * gameManager.gameSpeed, { isTileDamage: true });
        }

        if(finalGridY >= 0 && finalGridY < gameManager.ROWS && finalGridX >= 0 && finalGridX < gameManager.COLS) {
            const currentTile = gameManager.map[finalGridY][finalGridX];
            if (currentTile.type === TILE.LAVA) this.takeDamage(0.2 * gameManager.gameSpeed, { isTileDamage: true });
            if (currentTile.type === TILE.HEAL_PACK) {
                this.hp = 100;
                gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor };
                gameManager.audioManager.play('heal');
            }
            if (currentTile.type === TILE.TELEPORTER && this.teleportCooldown <= 0) {
                const teleporters = gameManager.getTilesOfType(TILE.TELEPORTER);
                if (teleporters.length > 1) {
                    const otherTeleporter = teleporters.find(t => t.x !== finalGridX || t.y !== finalGridY);
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
                gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor };
                gameManager.audioManager.play('replication');
            }
            if (currentTile.type === TILE.QUESTION_MARK) {
                gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor };
                gameManager.createEffect('question_mark_effect', this.pixelX, this.pixelY);
                gameManager.audioManager.play('questionmark');
                gameManager.spawnRandomWeaponNear({ x: this.pixelX, y: this.pixelY });
            }
            if (currentTile.type === TILE.DASH_TILE) {
                this.isDashing = true;
                this.dashDirection = currentTile.direction;
                this.dashDistanceRemaining = 5 * GRID_SIZE;
                this.state = 'IDLE';
                this.moveTarget = null;
                gameManager.audioManager.play('rush');
                return;
            }
            if (currentTile.type === TILE.AWAKENING_POTION && !this.awakeningEffect.active) {
                this.awakeningEffect.active = true;
                this.awakeningEffect.stacks = 0;
                this.awakeningEffect.timer = 0;
                gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor };
            }
        }
    }

    draw(ctx, isOutlineEnabled, outlineWidth) {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        if (this.isAimingMagicDagger) {
            ctx.save();
            const aimProgress = 1 - (this.magicDaggerAimTimer / 60);
            const currentEndX = this.pixelX + (this.magicDaggerTargetPos.x - this.pixelX) * aimProgress;
            const currentEndY = this.pixelY + (this.magicDaggerTargetPos.y - this.pixelY) * aimProgress;

            ctx.globalAlpha = 0.7;
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.moveTo(this.pixelX, this.pixelY);
            ctx.lineTo(currentEndX, currentEndY);
            ctx.stroke();
            ctx.restore();
        }

        if (this.isDashing) {
            this.dashTrail.forEach((pos, index) => {
                const opacity = (index / this.dashTrail.length) * 0.5;
                ctx.save();
                ctx.globalAlpha = opacity;
                switch(this.team) {
                    case TEAM.A: ctx.fillStyle = COLORS.TEAM_A; break;
                    case TEAM.B: ctx.fillStyle = COLORS.TEAM_B; break;
                    case TEAM.C: ctx.fillStyle = COLORS.TEAM_C; break;
                    case TEAM.D: ctx.fillStyle = COLORS.TEAM_D; break;
                }
                ctx.beginPath(); ctx.arc(pos.x, pos.y, GRID_SIZE / 2.5, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            });
        }
        
        ctx.save();
        
        const scale = 1 + this.awakeningEffect.stacks * 0.2;
        if (this.awakeningEffect.active) {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.scale(scale, scale);

            const auraRadius = (GRID_SIZE / 1.4) * scale;
            const gradient = ctx.createRadialGradient(0, 0, auraRadius * 0.5, 0, 0, auraRadius);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        ctx.translate(this.pixelX, this.pixelY);
        ctx.scale(scale, scale);
        ctx.translate(-this.pixelX, -this.pixelY);


        if (this.isStunned > 0) {
            ctx.globalAlpha = 0.7;
        }

        if (this.isMarkedByDualSword.active) {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY - GRID_SIZE * 1.2);
            const scale = 0.4 + Math.sin(this.gameManager.animationFrameCounter * 0.1) * 0.05; // [수정] 크기 50% 감소 및 약간의 애니메이션
            ctx.scale(scale, scale);
            // ctx.rotate(this.gameManager.animationFrameCounter * 0.05); // [수정] 회전 제거

            ctx.strokeStyle = '#9ca3af'; // gray-400
            ctx.lineWidth = 2.5;
            
            // 두 개의 교차된 칼날 모양 그리기
            const L = GRID_SIZE * 0.5;
            ctx.beginPath();
            ctx.moveTo(-L, -L);
            ctx.lineTo(L, L);
            ctx.moveTo(L, -L);
            ctx.lineTo(-L, L);
            ctx.stroke();

            ctx.restore();
        }

        switch(this.team) {
            case TEAM.A: ctx.fillStyle = COLORS.TEAM_A; break;
            case TEAM.B: ctx.fillStyle = COLORS.TEAM_B; break;
            case TEAM.C: ctx.fillStyle = COLORS.TEAM_C; break;
            case TEAM.D: ctx.fillStyle = COLORS.TEAM_D; break;
        }
        ctx.beginPath(); ctx.arc(this.pixelX, this.pixelY, GRID_SIZE / 2.5, 0, Math.PI * 2); ctx.fill();
        
        if (isOutlineEnabled) {
            ctx.strokeStyle = 'black'; 
            ctx.lineWidth = outlineWidth;
            ctx.stroke();
        }
        
        ctx.restore(); 

        if (this.name) {
            ctx.fillStyle = 'black';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.name, this.pixelX, this.pixelY + GRID_SIZE);
        }


        if (this.isBeingPulled && this.puller) {
            ctx.save();
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.puller.pixelX, this.puller.pixelY);
            ctx.lineTo(this.pixelX, this.pixelY);
            ctx.stroke();
            ctx.restore();
        }
        
        if (this.isStunned > 0) {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY - GRID_SIZE);
            const rotation = gameManager.animationFrameCounter * 0.1;
            ctx.rotate(rotation);
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, GRID_SIZE * 0.4, 0, Math.PI * 1.5);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, 0, GRID_SIZE * 0.2, Math.PI, Math.PI * 2.5);
            ctx.stroke();
            ctx.restore();
        }

        if (this.isKing) {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY - GRID_SIZE * 0.5);
            const kingScale = 1.2;
            ctx.scale(kingScale, kingScale);
            ctx.fillStyle = '#facc15'; ctx.strokeStyle = 'black'; ctx.lineWidth = 1 / kingScale;
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.4, -GRID_SIZE * 0.1); ctx.lineTo(-GRID_SIZE * 0.4, GRID_SIZE * 0.2);
            ctx.lineTo(GRID_SIZE * 0.4, GRID_SIZE * 0.2); ctx.lineTo(GRID_SIZE * 0.4, -GRID_SIZE * 0.1);
            ctx.lineTo(GRID_SIZE * 0.2, 0); ctx.lineTo(0, -GRID_SIZE * 0.1);
            ctx.lineTo(-GRID_SIZE * 0.2, 0); ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.restore();
        }

        if (this.weapon && !this.isKing) {
            this.weapon.drawEquipped(ctx, this);
        }

        const barWidth = GRID_SIZE * 0.8; 
        const barHeight = 4;
        const barGap = 1;
        const barX = this.pixelX - barWidth / 2;
        
        const healthBarIsVisible = this.hp < 100 || this.hpBarVisibleTimer > 0;
        const normalAttackIsVisible = (this.isCasting && this.weapon?.type === 'poison_potion') || (this.attackCooldown > 0);
        let specialSkillIsVisible = 
            (this.isKing && this.spawnCooldown > 0) ||
            (this.weapon?.type === 'magic_dagger' && this.magicDaggerSkillCooldown > 0) ||
            (this.weapon?.type === 'axe' && this.axeSkillCooldown > 0) ||
            (this.weapon?.type === 'ice_diamond' && this.iceDiamondChargeTimer > 0 && this.iceDiamondCharges < 5) ||
            (this.weapon?.type === 'magic_spear' && this.magicCircleCooldown > 0) ||
            (this.weapon?.type === 'boomerang' && this.boomerangCooldown > 0) ||
            (this.weapon?.type === 'shuriken' && this.shurikenSkillCooldown > 0) ||
            (this.weapon?.type === 'fire_staff' && this.fireStaffSpecialCooldown > 0) ||
            (this.weapon?.type === 'dual_swords' && this.dualSwordSkillCooldown > 0) ||
            (this.isCasting && this.weapon?.type === 'poison_potion');

        if (this.attackCooldown > 0 && !this.isCasting) {
            specialSkillIsVisible = false;
        }
        
        let visibleBarCount = 0;
        if (healthBarIsVisible) visibleBarCount++;
        if (normalAttackIsVisible) visibleBarCount++;

        if (visibleBarCount > 0) {
            const kingYOffset = this.isKing ? GRID_SIZE * 0.4 : 0; 
            const totalBarsHeight = (visibleBarCount * barHeight) + ((visibleBarCount - 1) * barGap);
            let currentBarY = this.pixelY - (GRID_SIZE * 0.6) - totalBarsHeight - kingYOffset;

            if (normalAttackIsVisible) {
                ctx.fillStyle = '#0c4a6e'; 
                ctx.fillRect(barX, currentBarY, barWidth, barHeight);
                let progress = 0;
                if (this.isCasting && this.weapon?.type === 'fire_staff') {
                    progress = this.castingProgress / this.castDuration;
                } else {
                    progress = Math.max(0, 1 - (this.attackCooldown / this.cooldownTime));
                }
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(barX, currentBarY, barWidth * progress, barHeight);
                currentBarY += barHeight + barGap;
            }

            if (healthBarIsVisible) {
                ctx.fillStyle = '#111827';
                ctx.fillRect(barX, currentBarY, barWidth, barHeight);
                ctx.fillStyle = '#10b981';
                ctx.fillRect(barX, currentBarY, barWidth * (this.hp / 100), barHeight);
            }
        }
        
        if (specialSkillIsVisible) {
            if (this.isKing) {
                 const kingSpecialGaugeY = this.pixelY + GRID_SIZE + 2;
                 const progress = 1 - (this.spawnCooldown / this.spawnInterval);
                 ctx.fillStyle = '#111827';
                 ctx.fillRect(barX, kingSpecialGaugeY, barWidth, barHeight);
                 ctx.fillStyle = '#f97316';
                 ctx.fillRect(barX, kingSpecialGaugeY, barWidth * progress, barHeight);
            } else {
                let fgColor, progress = 0, max = 1;

                if (this.weapon?.type === 'fire_staff') {
                    fgColor = '#ef4444';
                    progress = 240 - this.fireStaffSpecialCooldown; max = 240;
                } else if (this.weapon?.type === 'magic_spear') {
                    fgColor = '#a855f7';
                    progress = 300 - this.magicCircleCooldown; max = 300;
                } else if (this.weapon?.type === 'boomerang' || this.weapon?.type === 'shuriken' || this.weapon?.type === 'poison_potion' || this.weapon?.type === 'magic_dagger' || this.weapon?.type === 'axe' || this.weapon?.type === 'dual_swords') {
                    fgColor = '#94a3b8';
                    if(this.weapon.type === 'boomerang') {
                        progress = 480 - this.boomerangCooldown; max = 480;
                    } else if(this.weapon.type === 'shuriken') {
                        progress = 300 - this.shurikenSkillCooldown; max = 300;
                    } else if(this.weapon.type === 'magic_dagger') {
                        progress = 420 - this.magicDaggerSkillCooldown; max = 420;
                    } else if(this.weapon.type === 'axe') {
                        progress = 240 - this.axeSkillCooldown; max = 240;
                    } else if(this.weapon.type === 'dual_swords') {
                        progress = 300 - this.dualSwordSkillCooldown; max = 300;
                    } else {
                        progress = this.castingProgress; max = this.castDuration;
                    }
                } else if (this.weapon?.type === 'ice_diamond') {
                    fgColor = '#38bdf8';
                    progress = this.iceDiamondChargeTimer; max = 240;
                }
                
                if (fgColor) {
                    ctx.save();
                    ctx.lineWidth = 3;
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                    const radius = GRID_SIZE / 2.5 + 3;
                    ctx.beginPath();
                    ctx.arc(this.pixelX, this.pixelY, radius, 0, Math.PI * 2);
                    ctx.stroke();

                    ctx.strokeStyle = fgColor;
                    ctx.beginPath();
                    const startAngle = -Math.PI / 2;
                    const endAngle = startAngle + (progress / max) * Math.PI * 2;
                    ctx.arc(this.pixelX, this.pixelY, radius, startAngle, endAngle);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }
        
        // [수정] 느낌표 표시 로직 변경
        const showAlert = this.alertedCounter > 0 || (this.weapon?.type === 'magic_spear' && this.target instanceof Unit && this.target.stunnedByMagicCircle);
        if (showAlert && this.state !== 'FLEEING_FIELD') {
            const yOffset = -GRID_SIZE;
            ctx.fillStyle = 'yellow'; ctx.font = 'bold 20px Arial'; ctx.textAlign = 'center';
            ctx.fillText(this.state === 'SEEKING_HEAL_PACK' ? '+' : '!', this.pixelX, this.pixelY + yOffset);
        }
    }
    
    // [수정] 쌍검 순간이동 공격 로직 변경
    performDualSwordTeleportAttack(enemies) {
        const target = this.dualSwordTeleportTarget;
        if (target && target.hp > 0) {
            const teleportPos = this.gameManager.findEmptySpotNear(target);
            this.pixelX = teleportPos.x;
            this.pixelY = teleportPos.y;
            this.dualSwordSpinAttackTimer = 20; // 회전 공격 애니메이션 시작
            
            // 주변 적에게 15 데미지 (데미지 상향)
            const damageRadius = GRID_SIZE * 2;
            enemies.forEach(enemy => {
                if (Math.hypot(this.pixelX - enemy.pixelX, this.pixelY - enemy.pixelY) < damageRadius) {
                    enemy.takeDamage(15);
                }
            });
            this.gameManager.audioManager.play('swordHit');
        }
        this.dualSwordTeleportTarget = null; // 타겟 초기화
        this.state = 'IDLE'; // 공격 후 IDLE 상태로 전환
    }
}

