import { TILE, TEAM, COLORS, GRID_SIZE, DEEP_COLORS } from './constants.js';
import { Weapon, MagicDaggerDashEffect, createPhysicalHitEffect } from './weaponary.js';
import { Nexus } from './entities.js';

// 형광 색상 정의 (밝기를 약간 낮춤 - alpha 값 추가 고려)
const GLOW_COLORS = {
    TEAM_A: 'rgba(255, 100, 100, 0.8)', // 밝은 빨강 (투명도 추가)
    TEAM_B: 'rgba(100, 150, 255, 0.8)', // 밝은 파랑 (투명도 추가)
    TEAM_C: 'rgba(50, 220, 150, 0.8)',  // 밝은 초록 (투명도 추가)
    TEAM_D: 'rgba(255, 220, 100, 0.8)'   // 밝은 노랑 (투명도 추가)
};

// Unit class
export class Unit {
    constructor(gameManager, x, y, team) {
        this.gameManager = gameManager;
        this.gridX = x; this.gridY = y;
        this.pixelX = x * GRID_SIZE + GRID_SIZE / 2;
        this.pixelY = y * GRID_SIZE + GRID_SIZE / 2;
        this.team = team;
        this.hp = 100;
        this.maxHp = 100;
        this.displayHp = 100;
        this.damageFlash = 0;

        this.level = 1;
        this.maxLevel = 5;
        this.killedBy = null;
        this.specialAttackLevelBonus = 0;
        this.levelUpParticleCooldown = 0;

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
        this.stunnedByMagicCircle = false;
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
        this.nameColor = '#000000';
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
        this.attackCount = 0;
        this.swordSpecialAttackAnimationTimer = 0;

        this.dualSwordSkillCooldown = 0;
        this.dualSwordTeleportTarget = null;
        this.dualSwordTeleportDelayTimer = 0;
        this.dualSwordSpinAttackTimer = 0;
        this.isMarkedByDualSword = { active: false, timer: 0 };

        this.isInLava = false;
        this.fleeingCooldown = 0;

        this.stuckTimer = 0;
        this.lastPosition = { x: this.pixelX, y: this.pixelY };

        this.isSpecialReady = false;
        this.specialAttackTrail = [];
    }

    // ... (getters: speed, attackPower, attackRange, detectionRange, cooldownTime - 변경 없음) ...
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
        let finalSpeed = (this.baseSpeed + (this.weapon ? this.weapon.speedBonus || 0 : 0) + combatSpeedBoost) + speedModifier;
        finalSpeed *= (1 + (this.level - 1) * 0.06);

        return Math.max(0.1, finalSpeed);
    }

    get attackPower() {
        return this.baseAttackPower + (this.weapon ? this.weapon.attackPowerBonus || 0 : 0) + this.specialAttackLevelBonus;
    }
    get attackRange() { return this.baseAttackRange + (this.weapon ? this.weapon.attackRangeBonus || 0 : 0); }
    get detectionRange() { return this.baseDetectionRange + (this.weapon ? this.weapon.detectionRangeBonus || 0 : 0); }

    get cooldownTime() {
        let finalCooldown = this.baseCooldownTime + (this.weapon ? this.weapon.attackCooldownBonus || 0 : 0);
        finalCooldown *= (1 - (this.level - 1) * 0.04);

        if (this.weapon && this.weapon.type === 'fire_staff') return Math.max(20, Math.min(finalCooldown, 120));
        if (this.weapon && this.weapon.type === 'hadoken') return Math.max(20, Math.min(finalCooldown, 120));
        if (this.weapon && this.weapon.type === 'axe') return Math.max(20, Math.min(finalCooldown, 120));
        if (this.weapon && this.weapon.type === 'ice_diamond') return Math.max(20, Math.min(finalCooldown, 180));

        return Math.max(20, finalCooldown);
    }

    // ... (equipWeapon, levelUp, findClosest, applyPhysics, move, attack, takeDamage, handleDeath - 변경 없음) ...
     equipWeapon(weaponType, isClone = false) {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        this.weapon = gameManager.createWeapon(0, 0, weaponType);
        gameManager.audioManager.play('equip');
        if (this.weapon.type === 'crown' && !isClone) {
            this.isKing = true;
        }
        this.state = 'IDLE';
        this.isSpecialReady = false; // 무기 장착 시 특수 공격 상태 초기화
    }

    levelUp(killedUnitLevel = 0) {
        const previousLevel = this.level;
        let newLevel = this.level;

        if (killedUnitLevel > this.level) {
            newLevel = killedUnitLevel;
        } else {
            newLevel++;
        }

        this.level = Math.min(this.maxLevel, newLevel);

        if (this.level > previousLevel) {
            const levelGained = this.level - previousLevel;

            this.maxHp += 10 * levelGained;
            this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.3);

            const weaponType = this.weapon ? this.weapon.type : null;
            const skillAttackWeapons = [
                'magic_dagger', 'poison_potion', 'ice_diamond', 'fire_staff',
                'magic_spear', 'boomerang', 'hadoken', 'shuriken'
            ];

            if (skillAttackWeapons.includes(weaponType)) {
                if (weaponType === 'shuriken') {
                    this.specialAttackLevelBonus += 5 * levelGained;
                } else {
                    this.specialAttackLevelBonus += 10 * levelGained;
                }
            } else {
                this.baseAttackPower += 5 * levelGained;
            }

            this.gameManager.createEffect('level_up', this.pixelX, this.pixelY, this);
        }
    }

    findClosest(items) {
        let closestItem = null, minDistance = Infinity;
        for (const item of items) {
            const distance = Math.hypot(this.pixelX - item.pixelX, this.pixelY - item.pixelY);
            if (distance < minDistance) { minDistance = distance; closestItem = item; }
        }
        return { item: closestItem, distance: minDistance };
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
                if (tile.type === TILE.WALL || tile.type === TILE.CRACKED_WALL || (tile.type === TILE.GLASS_WALL && !this.isBeingPulled)) {
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
                const minDistance = (GRID_SIZE / 1.67) * 2;

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

        const radius = GRID_SIZE / 1.67;
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

        if (bounced && this.state === 'IDLE') {
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

        let angle = Math.atan2(dy, dx);

        if (gameManager.isLavaAvoidanceEnabled && this.state !== 'FLEEING_FIELD' && this.state !== 'FLEEING_LAVA') {
            const lookAheadDist = GRID_SIZE * 1.2;
            const lookAheadX = this.pixelX + Math.cos(angle) * lookAheadDist;
            const lookAheadY = this.pixelY + Math.sin(angle) * lookAheadDist;

            const lookAheadGridX = Math.floor(lookAheadX / GRID_SIZE);
            const lookAheadGridY = Math.floor(lookAheadY / GRID_SIZE);

            if (gameManager.isPosInLavaForUnit(lookAheadGridX, lookAheadGridY)) {
                const detourAngle = Math.PI / 3; // 60도
                let bestAngle = -1;

                const leftAngle = angle - detourAngle;
                const rightAngle = angle + detourAngle;

                const leftLookAheadX = this.pixelX + Math.cos(leftAngle) * lookAheadDist;
                const leftLookAheadY = this.pixelY + Math.sin(leftAngle) * lookAheadDist;
                const isLeftSafe = !gameManager.isPosInLavaForUnit(Math.floor(leftLookAheadX / GRID_SIZE), Math.floor(leftLookAheadY / GRID_SIZE));

                const rightLookAheadX = this.pixelX + Math.cos(rightAngle) * lookAheadDist;
                const rightLookAheadY = this.pixelY + Math.sin(rightAngle) * lookAheadDist;
                const isRightSafe = !gameManager.isPosInLavaForUnit(Math.floor(rightLookAheadX / GRID_SIZE), Math.floor(rightLookAheadY / GRID_SIZE));

                if (isLeftSafe && isRightSafe) {
                    bestAngle = Math.abs(leftAngle - angle) < Math.abs(rightAngle - angle) ? leftAngle : rightAngle;
                } else if (isLeftSafe) {
                    bestAngle = leftAngle;
                } else if (isRightSafe) {
                    bestAngle = rightAngle;
                }

                if (bestAngle !== -1) {
                    angle = bestAngle;
                }
            }
        }


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
        if (targetGridY < 0 || targetGridY >= gameManager.ROWS || targetGridX < 0 || targetGridX >= gameManager.COLS) return;

        const tile = gameManager.map[targetGridY][targetGridX];

        if (tile.type === TILE.CRACKED_WALL) {
            gameManager.damageTile(targetGridX, targetGridY, this.attackPower);
            this.attackCooldown = this.cooldownTime;
        } else if (target instanceof Unit || target instanceof Nexus) {
            if (this.weapon) {
                this.weapon.use(this, target);
            } else {
                target.takeDamage(this.attackPower, {}, this);
                gameManager.audioManager.play('punch');
                this.attackCooldown = this.cooldownTime;
            }
        }
    }

    takeDamage(damage, effectInfo = {}, attacker = null) {
        const gameManager = this.gameManager;
        if (gameManager && damage > 0 && !effectInfo.isTileDamage) {
            createPhysicalHitEffect(gameManager, this);
        }
        this.hp -= damage;
        this.hpBarVisibleTimer = 180;
        this.damageFlash = 1.0;

        if (attacker && attacker instanceof Unit) {
            this.killedBy = attacker;
        }

        if (this.hp <= 0 && !this.killedBy && attacker) {
            this.killedBy = attacker;
        }

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
            if (effectInfo.stunSource === 'magic_circle') {
                this.stunnedByMagicCircle = true;
            }
        }
        if (effectInfo.poison) {
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
            gameManager.castAreaSpell({ x: this.pixelX, y: this.pixelY }, 'poison_cloud', this.team, this.specialAttackLevelBonus);
        }
    }


    /**
     * Updates the unit's state and position.
     * @param {Unit[]} enemies - Array of enemy units.
     * @param {Weapon[]} weapons - Array of available weapons.
     * @param {Projectile[]} projectiles - Array of active projectiles.
     */
    update(enemies, weapons, projectiles) {
        const gameManager = this.gameManager;
        if (!gameManager) {
            return;
        }

        // --- 체력바, 피격 효과, 잔상 업데이트 ---
        if (this.displayHp > this.hp) {
            this.displayHp -= (this.displayHp - this.hp) * 0.1 * this.gameManager.gameSpeed;
        } else {
            this.displayHp = this.hp;
        }
        if (this.damageFlash > 0) {
            this.damageFlash -= 0.05 * this.gameManager.gameSpeed;
        }
        if (this.isSpecialReady) {
            this.specialAttackTrail.push({ x: this.pixelX, y: this.pixelY, alpha: 0.6 }); // 잔상 초기 투명도 낮춤
             if (this.specialAttackTrail.length > 6) { // 잔상 개수 줄임
                 this.specialAttackTrail.shift();
             }
        }
        this.specialAttackTrail.forEach(trail => trail.alpha -= 0.18 * gameManager.gameSpeed); // 더 빨리 사라지도록
        this.specialAttackTrail = this.specialAttackTrail.filter(trail => trail.alpha > 0);

        // --- 레벨업 파티클 (변경 없음) ---
        if (this.level >= 2 && gameManager.isLevelUpEnabled) {
             // ... (기존 레벨업 파티클 코드) ...
               this.levelUpParticleCooldown -= gameManager.gameSpeed;
            if (this.levelUpParticleCooldown <= 0) {
                this.levelUpParticleCooldown = 15 - this.level;

                let teamColor;
                switch(this.team) {
                    case TEAM.A: teamColor = DEEP_COLORS.TEAM_A; break;
                    case TEAM.B: teamColor = DEEP_COLORS.TEAM_B; break;
                    case TEAM.C: teamColor = DEEP_COLORS.TEAM_C; break;
                    case TEAM.D: teamColor = DEEP_COLORS.TEAM_D; break;
                    default: teamColor = '#FFFFFF'; break;
                }

                const particleCount = (this.level - 1) * 2;
                for (let i = 0; i < particleCount; i++) {
                    const angle = gameManager.random() * Math.PI * 2;
                    const radius = GRID_SIZE / 1.67;
                    const spawnX = this.pixelX + Math.cos(angle) * radius;
                    const spawnY = this.pixelY + Math.sin(angle) * radius;
                    const speed = 0.5 + gameManager.random() * 0.5;

                    gameManager.addParticle({
                        x: spawnX,
                        y: spawnY,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 0.6,
                        color: teamColor,
                        size: this.level * 0.5 + gameManager.random() * this.level,
                        gravity: -0.02
                    });
                }
            }
        }

        // --- 대쉬 로직 (변경 없음) ---
        if (this.isDashing) {
            // ... (기존 대쉬 코드) ...
              this.dashTrail.push({ x: this.pixelX, y: this.pixelY });
            if (this.dashTrail.length > 5) this.dashTrail.shift();

            let moveX = 0, moveY = 0;
            switch (this.dashDirection) {
                case 'RIGHT': moveX = this.dashSpeed; break;
                case 'LEFT': moveX = -this.dashSpeed; break;
                case 'DOWN': moveY = this.dashSpeed; break;
                case 'UP': moveY = -this.dashSpeed; break;
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

        // --- 상태 효과 및 쿨다운 업데이트 (변경 없음) ---
        if (this.hpBarVisibleTimer > 0) this.hpBarVisibleTimer--;
        if (this.isBeingPulled && this.puller) { /* ... 끌려가는 로직 ... */
             const dx = this.pullTargetPos.x - this.pixelX;
            const dy = this.pullTargetPos.y - this.pixelY;
            const dist = Math.hypot(dx, dy);
            const pullSpeed = 4;

            if (dist < pullSpeed * gameManager.gameSpeed) {
                this.pixelX = this.pullTargetPos.x;
                this.pixelY = this.pullTargetPos.y;
                this.isBeingPulled = false;

                const damage = 20 + (this.puller.specialAttackLevelBonus || 0);
                this.takeDamage(damage, { stun: 120 }, this.puller);

                this.puller = null;
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
        if (this.isStunned > 0) { /* ... 스턴 로직 ... */
             this.isStunned -= gameManager.gameSpeed;
            if (this.isStunned <= 0) {
                this.stunnedByMagicCircle = false;
            }
            this.applyPhysics();
            return;
         }
        if (this.isSlowed > 0) this.isSlowed -= gameManager.gameSpeed;
        if (this.isMarkedByDualSword.active) { /* ... 쌍검 표식 로직 ... */
             this.isMarkedByDualSword.timer -= gameManager.gameSpeed;
            if (this.isMarkedByDualSword.timer <= 0) {
                this.isMarkedByDualSword.active = false;
            }
         }
        if (this.awakeningEffect.active) { /* ... 각성 로직 ... */
             if (this.awakeningEffect.stacks < 3) {
                this.awakeningEffect.timer += gameManager.gameSpeed;
                if (this.awakeningEffect.timer >= 300) {
                    this.awakeningEffect.timer = 0;
                    this.awakeningEffect.stacks++;
                    this.maxHp += 20;
                    this.hp = Math.min(this.maxHp, this.hp + 20);
                    this.baseAttackPower += 3;
                    gameManager.audioManager.play('Arousal');
                    for (let i = 0; i < 30; i++) {
                        const angle = gameManager.random() * Math.PI * 2;
                        const speed = 1 + gameManager.random() * 3;
                        const color = gameManager.random() > 0.5 ? '#FFFFFF' : '#3b82f6';
                        gameManager.addParticle({
                            x: this.pixelX,
                            y: this.pixelY,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            life: 0.8,
                            color: color,
                            size: gameManager.random() * 2 + 1.5,
                            gravity: 0.05
                        });
                    }
                }
            }
         }
        if (this.magicDaggerSkillCooldown > 0) this.magicDaggerSkillCooldown -= gameManager.gameSpeed;
        if (this.axeSkillCooldown > 0) this.axeSkillCooldown -= gameManager.gameSpeed;
        if (this.spinAnimationTimer > 0) this.spinAnimationTimer -= gameManager.gameSpeed;
        if (this.swordSpecialAttackAnimationTimer > 0) this.swordSpecialAttackAnimationTimer -= gameManager.gameSpeed;
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
        if (this.fleeingCooldown > 0) this.fleeingCooldown -= gameManager.gameSpeed;
        if (this.poisonEffect.active) { /* ... 독 효과 로직 ... */
             this.poisonEffect.duration -= gameManager.gameSpeed;
            this.takeDamage(this.poisonEffect.damage, { isTileDamage: true });
            if (this.poisonEffect.duration <= 0) {
                this.poisonEffect.active = false;
            }
         }
        if (this.weapon && this.weapon.type === 'ice_diamond') { /* ... 얼음 충전 로직 ... */
             if (this.iceDiamondCharges < 5) {
                this.iceDiamondChargeTimer += gameManager.gameSpeed;
                if (this.iceDiamondChargeTimer >= 240) {
                    this.iceDiamondCharges++;
                    this.iceDiamondChargeTimer = 0;
                }
            }
        }

        // --- 특수 공격 준비 상태 업데이트 (변경 없음) ---
        if (this.weapon) {
             switch (this.weapon.type) {
                 case 'sword':
                 case 'bow':
                     this.isSpecialReady = this.attackCount >= 2;
                     break;
                 case 'axe':
                     this.isSpecialReady = this.axeSkillCooldown <= 0;
                     break;
                 case 'fire_staff':
                     this.isSpecialReady = this.fireStaffSpecialCooldown <= 0;
                     break;
                 case 'boomerang':
                     this.isSpecialReady = this.boomerangCooldown <= 0;
                     break;
                 case 'shuriken':
                     this.isSpecialReady = this.shurikenSkillCooldown <= 0;
                     break;
                 case 'magic_dagger':
                     this.isSpecialReady = this.magicDaggerSkillCooldown <= 0 && !this.isAimingMagicDagger;
                     break;
                 case 'dual_swords':
                     this.isSpecialReady = this.dualSwordSkillCooldown <= 0;
                     break;
                 default:
                     this.isSpecialReady = false;
             }
        } else {
             this.isSpecialReady = false;
        }

        // --- 회피 로직 (변경 없음) ---
        if (this.weapon && (this.weapon.type === 'shuriken' || this.weapon.type === 'lightning') && this.evasionCooldown <= 0) {
            // ... (기존 회피 코드) ...
            for (const p of projectiles) {
                if (p.owner.team === this.team) continue;
                const dist = Math.hypot(this.pixelX - p.pixelX, this.pixelY - p.pixelY);
                if (dist < GRID_SIZE * 3) {
                    const angleToUnit = Math.atan2(this.pixelY - p.pixelY, this.pixelX - p.pixelX);
                    const angleDiff = Math.abs(angleToUnit - p.angle);
                    if (angleDiff < Math.PI / 4 || angleDiff > Math.PI * 1.75) {
                        if (gameManager.random() > 0.5) {
                            const dodgeAngle = p.angle + (Math.PI / 2) * (gameManager.random() < 0.5 ? 1 : -1);
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

        // --- 쌍검 텔레포트 (변경 없음) ---
        if (this.dualSwordTeleportDelayTimer > 0) { /* ... 쌍검 텔레포트 로직 ... */
            this.dualSwordTeleportDelayTimer -= gameManager.gameSpeed;
            if (this.dualSwordTeleportDelayTimer <= 0) {
                this.performDualSwordTeleportAttack(enemies);
            }
         }

        // --- 왕 유닛 스폰 (변경 없음) ---
        if (this.isKing && this.spawnCooldown <= 0) { /* ... 왕 스폰 로직 ... */
             this.spawnCooldown = this.spawnInterval;
            gameManager.spawnUnit(this, false);
         }

        // --- 캐스팅 로직 (변경 없음) ---
        if (this.isCasting) { /* ... 캐스팅 로직 ... */
            this.castingProgress += gameManager.gameSpeed;
            if (!this.target || (this.target instanceof Unit && this.target.hp <= 0)) {
                this.isCasting = false; this.castingProgress = 0; return;
            }
            if (this.castingProgress >= this.castDuration) {
                this.isCasting = false; this.castingProgress = 0;

                if (this.weapon.type === 'poison_potion') {
                    gameManager.audioManager.play('poison');
                    this.hp = 0;
                }
            }
            this.applyPhysics();
            return;
        }

        // --- 마법 단검 조준/사용 (변경 없음) ---
        if (this.weapon && this.weapon.type === 'magic_dagger' && !this.isAimingMagicDagger && this.isSpecialReady && this.attackCooldown <= 0) {
            // ... (기존 조준 시작 로직) ...
             const { item: closestEnemy } = this.findClosest(enemies);
            if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy)) {
                const dist = Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY);
                if (dist < this.detectionRange) {
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
            // ... (기존 조준 중 및 스킬 사용 로직) ...
             this.magicDaggerAimTimer -= gameManager.gameSpeed;
            if (this.magicDaggerAimTimer <= 0) {
                this.isAimingMagicDagger = false;
                this.magicDaggerSkillCooldown = 420;
                this.isSpecialReady = false; // 스킬 사용 후 상태 초기화
                this.attackCooldown = 30;

                const startPos = { x: this.pixelX, y: this.pixelY };
                const endPos = this.magicDaggerTargetPos;

                enemies.forEach(enemy => {
                    const distToLine = Math.abs((endPos.y - startPos.y) * enemy.pixelX - (endPos.x - startPos.x) * enemy.pixelY + endPos.x * startPos.y - endPos.y * startPos.x) / Math.hypot(endPos.y - startPos.y, endPos.x - startPos.x);
                    if (distToLine < GRID_SIZE) {
                        enemy.takeDamage(this.attackPower * 1.2, { stun: 60 }, this);
                    }
                });

                this.pixelX = endPos.x;
                this.pixelY = endPos.y;

                gameManager.effects.push(new MagicDaggerDashEffect(gameManager, startPos, endPos));
                gameManager.audioManager.play('rush'); // rush 효과음은 magicdagger로 변경해야 할 수도 있음

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

        // --- 마법창/부메랑 스킬 (변경 없음) ---
        if (this.weapon && this.weapon.type === 'magic_spear') { /* ... 마법창 스킬 로직 ... */
             if (this.magicCircleCooldown <= 0) {
                gameManager.spawnMagicCircle(this.team);
                this.magicCircleCooldown = 300;
            }
            const stunnedEnemy = gameManager.findStunnedByMagicCircleEnemy(this.team);
            if (stunnedEnemy && this.attackCooldown <= 0) {
                this.alertedCounter = 60;
                this.target = stunnedEnemy;
                gameManager.createProjectile(this, stunnedEnemy, 'magic_spear_special');
                gameManager.audioManager.play('spear');
                this.attackCooldown = this.cooldownTime;
                return;
            }
        } else if (this.weapon && this.weapon.type === 'boomerang' && this.isSpecialReady && this.attackCooldown <= 0) {
             /* ... 부메랑 스킬 로직 ... */
              const { item: closestEnemy } = this.findClosest(enemies);
            if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy)) {
                const dist = Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY);
                if (dist <= this.attackRange) {
                    this.boomerangCooldown = 480;
                    this.isSpecialReady = false; // 스킬 사용 후 상태 초기화
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

        // --- 도끼 스킬 (변경 없음) ---
        if (this.weapon && this.weapon.type === 'axe' && this.isSpecialReady && this.attackCooldown <= 0) {
             /* ... 도끼 스킬 로직 ... */
              const { item: closestEnemy } = this.findClosest(enemies);
            if (closestEnemy && Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY) < GRID_SIZE * 3) {
                this.axeSkillCooldown = 240;
                this.isSpecialReady = false; // 스킬 사용 후 상태 초기화
                this.spinAnimationTimer = 30;
                gameManager.audioManager.play('axe');
                gameManager.createEffect('axe_spin_effect', this.pixelX, this.pixelY, this);

                const damageRadius = GRID_SIZE * 3.5;
                enemies.forEach(enemy => {
                    if (Math.hypot(this.pixelX - enemy.pixelX, this.pixelY - enemy.pixelY) < damageRadius) {
                        enemy.takeDamage(this.attackPower * 1.5, {}, this);
                    }
                });
                gameManager.nexuses.forEach(nexus => {
                    if (nexus.team !== this.team && !nexus.isDestroying && Math.hypot(this.pixelX - nexus.pixelX, this.pixelY - nexus.pixelY) < damageRadius) {
                        nexus.takeDamage(this.attackPower * 1.5, {}, this);
                    }
                });
                gameManager.audioManager.play('swordHit');
                 this.attackCooldown = 30;
                 return;
            }
         }

        // --- 상태 결정 및 행동 로직 (변경 없음) ---
        // ... (기존 상태 결정 및 행동 코드: FLEEING, SEEKING, AGGRESSIVE 등) ...
        let newState = 'IDLE';
        let newTarget = null;
        // ... (target 설정 로직) ...

        this.state = newState;
        this.target = newTarget;

        switch (this.state) {
             case 'FLEEING_FIELD': // ...
                this.moveTarget = gameManager.findClosestSafeSpot(this.pixelX, this.pixelY);
                break;
            case 'FLEEING_LAVA': // ...
                 this.moveTarget = gameManager.findClosestSafeSpotFromLava(this.pixelX, this.pixelY);
                break;
            case 'FLEEING': // ...
                  if (this.target) {
                    const fleeAngle = Math.atan2(this.pixelY - this.target.pixelY, this.pixelX - this.target.pixelX);
                    this.moveTarget = { x: this.pixelX + Math.cos(fleeAngle) * GRID_SIZE * 5, y: this.pixelY + Math.sin(fleeAngle) * GRID_SIZE * 5 };
                }
                break;
            case 'SEEKING_HEAL_PACK': // ...
                 if (this.target) this.moveTarget = { x: this.target.pixelX, y: this.target.pixelY };
                break;
            case 'SEEKING_QUESTION_MARK': // ...
                 if (this.target) this.moveTarget = { x: this.target.pixelX, y: this.target.pixelY };
                break;
            case 'SEEKING_WEAPON': // ...
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
            case 'AGGRESSIVE': // ... (불지팡이/쌍검 스킬 로직 포함) ...
                 if (this.target) {
                    if (this.weapon && this.weapon.type === 'fire_staff' && this.isSpecialReady && this.attackCooldown <= 0) {
                        const distanceToTarget = Math.hypot(this.pixelX - this.target.pixelX, this.pixelY - this.target.pixelY);
                        if (distanceToTarget <= this.attackRange && gameManager.hasLineOfSight(this, this.target)) {
                            gameManager.createProjectile(this, this.target, 'fireball_projectile');
                            gameManager.audioManager.play('fireball');
                            this.fireStaffSpecialCooldown = 240;
                             this.isSpecialReady = false;
                            this.attackCooldown = 60;
                            break;
                        }
                    } else if (this.weapon && this.weapon.type === 'dual_swords' && this.isSpecialReady && this.attackCooldown <= 0) {
                        const distanceToTarget = Math.hypot(this.pixelX - this.target.pixelX, this.pixelY - this.target.pixelY);
                        if (distanceToTarget <= this.detectionRange && gameManager.hasLineOfSight(this, this.target)) {
                            gameManager.audioManager.play('shurikenShoot');
                            gameManager.createProjectile(this, this.target, 'bouncing_sword');
                            this.dualSwordSkillCooldown = 300;
                            this.isSpecialReady = false;
                            this.attackCooldown = 60;
                            this.moveTarget = null;
                            this.facingAngle = Math.atan2(this.target.pixelY - this.pixelY, this.target.pixelX - this.pixelX);
                            break;
                        }
                    }

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
            case 'IDLE': default: // ...
                 if (!this.moveTarget || Math.hypot(this.pixelX - this.moveTarget.x, this.pixelY - this.moveTarget.y) < GRID_SIZE) {
                    const angle = gameManager.random() * Math.PI * 2;
                    this.moveTarget = { x: this.pixelX + Math.cos(angle) * GRID_SIZE * 8, y: this.pixelY + Math.sin(angle) * GRID_SIZE * 8 };
                }
                break;
        }


        this.move();
        this.applyPhysics();

        // --- 막힘 처리 (변경 없음) ---
        if (this.moveTarget) { /* ... 막힘 처리 로직 ... */
             const distMoved = Math.hypot(this.pixelX - this.lastPosition.x, this.pixelY - this.lastPosition.y);
            if (distMoved < 0.2 * gameManager.gameSpeed) {
                this.stuckTimer += 1;
            } else {
                this.stuckTimer = 0;
            }

            if (this.stuckTimer > 30) {
                const angle = gameManager.random() * Math.PI * 2;
                const radius = GRID_SIZE * 3;
                const newTargetX = this.pixelX + Math.cos(angle) * radius;
                const newTargetY = this.pixelY + Math.sin(angle) * radius;

                const gridX = Math.floor(newTargetX / GRID_SIZE);
                const gridY = Math.floor(newTargetY / GRID_SIZE);

                if (gridY >= 0 && gridY < gameManager.ROWS && gridX >= 0 && gridX < gameManager.COLS &&
                    gameManager.map[gridY][gridX].type !== TILE.WALL &&
                    gameManager.map[gridY][gridX].type !== TILE.CRACKED_WALL) {
                    this.moveTarget = { x: newTargetX, y: newTargetY };
                }

                this.stuckTimer = 0;
            }
         } else {
            this.stuckTimer = 0;
        }
        this.lastPosition = { x: this.pixelX, y: this.pixelY };


        // --- 타일 상호작용 (변경 없음) ---
        const finalGridX = Math.floor(this.pixelX / GRID_SIZE);
        const finalGridY = Math.floor(this.pixelY / GRID_SIZE);
        if (this.isInMagneticField) { /* ... 자기장 데미지 ... */
            this.takeDamage(0.3 * gameManager.gameSpeed, { isTileDamage: true });
         }
        if (finalGridY >= 0 && finalGridY < gameManager.ROWS && finalGridX >= 0 && finalGridX < gameManager.COLS) {
            // ... (LAVA, HEAL_PACK, TELEPORTER, REPLICATION_TILE, QUESTION_MARK, DASH_TILE, AWAKENING_POTION 타일 로직) ...
             const currentTile = gameManager.map[finalGridY][finalGridX];
            if (currentTile.type === TILE.LAVA) this.takeDamage(0.2 * gameManager.gameSpeed, { isTileDamage: true });
            if (currentTile.type === TILE.HEAL_PACK) {
                this.hp = this.maxHp;
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
                for (let i = 0; i < currentTile.replicationValue; i++) {
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
                gameManager.audioManager.play('Arousal');
                 for (let i = 0; i < 30; i++) {
                    const angle = gameManager.random() * Math.PI * 2;
                    const speed = 1 + gameManager.random() * 3;
                    const color = gameManager.random() > 0.5 ? '#FFFFFF' : '#3b82f6';
                    gameManager.addParticle({
                        x: this.pixelX,
                        y: this.pixelY,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        life: 0.8,
                        color: color,
                        size: gameManager.random() * 2 + 1.5,
                        gravity: 0.05
                    });
                }
            }
        }
    }


    /**
     * Draws the unit on the canvas.
     * @param {CanvasRenderingContext2D} ctx - The drawing context.
     * @param {boolean} isOutlineEnabled - Whether to draw an outline.
     * @param {number} outlineWidth - The width of the outline.
     */
    draw(ctx, isOutlineEnabled, outlineWidth) {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        ctx.save();

        const scale = 1 + this.awakeningEffect.stacks * 0.2;
        const levelScale = 1 + (this.level - 1) * 0.08;
        const totalScale = scale * levelScale;

        // --- 잔상 그리기 (변경 없음) ---
        this.specialAttackTrail.forEach((trail, index) => {
             const opacity = trail.alpha * 0.5 * (index / this.specialAttackTrail.length);
             ctx.save();
             ctx.globalAlpha = opacity;
             let trailColor;
             switch (this.team) {
                 case TEAM.A: trailColor = GLOW_COLORS.TEAM_A; break;
                 case TEAM.B: trailColor = GLOW_COLORS.TEAM_B; break;
                 case TEAM.C: trailColor = GLOW_COLORS.TEAM_C; break;
                 case TEAM.D: trailColor = GLOW_COLORS.TEAM_D; break;
                 default: trailColor = 'rgba(255, 255, 255, 0.5)'; break; // 기본 흰색 잔상
             }
              // 잔상 색상에서 alpha 값 제거하고 opacity 적용
             const rgbColor = trailColor.substring(0, trailColor.lastIndexOf(',')) + ')';
             ctx.fillStyle = rgbColor;
             ctx.beginPath();
             ctx.arc(trail.x, trail.y, (GRID_SIZE / 1.67) * totalScale, 0, Math.PI * 2);
             ctx.fill();
             ctx.restore();
        });

        // --- 각성 효과 (변경 없음) ---
        if (this.awakeningEffect.active) { /* ... 각성 아우라 ... */
             ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.scale(totalScale, totalScale);

            const auraRadius = (GRID_SIZE / 1.4);
            const gradient = ctx.createRadialGradient(0, 0, auraRadius * 0.5, 0, 0, auraRadius);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
         }

        // --- 마법 단검 조준선 (변경 없음) ---
        if (this.isAimingMagicDagger) { /* ... 조준선 ... */
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
            ctx.setLineDash([]);
         }

        // --- 대쉬 잔상 (변경 없음) ---
        if (this.isDashing) { /* ... 대쉬 잔상 ... */
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
                ctx.beginPath(); ctx.arc(pos.x, pos.y, (GRID_SIZE / 1.67) * totalScale, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            });
         }

        // --- 유닛 크기 조절 (변경 없음) ---
        ctx.translate(this.pixelX, this.pixelY);
        ctx.scale(totalScale, totalScale);
        ctx.translate(-this.pixelX, -this.pixelY);

        // --- 스턴 효과 (변경 없음) ---
        if (this.isStunned > 0) ctx.globalAlpha = 0.7;

        // --- 쌍검 표식 (변경 없음) ---
        if (this.isMarkedByDualSword.active) { /* ... 표식 ... */
             ctx.save();
            ctx.translate(this.pixelX, this.pixelY - GRID_SIZE * 1.2 * totalScale);
            const markScale = 0.4 + Math.sin(this.gameManager.animationFrameCounter * 0.1) * 0.05;
            ctx.scale(markScale, markScale);

            ctx.strokeStyle = '#9ca3af';
            ctx.lineWidth = 2.5;

            const L = GRID_SIZE * 0.5;
            ctx.beginPath();
            ctx.moveTo(-L, -L);
            ctx.lineTo(L, L);
            ctx.moveTo(L, -L);
            ctx.lineTo(-L, L);
            ctx.stroke();

            ctx.restore();
         }

        // --- 수정: 유닛 본체 그리기 및 형광 효과 ---
        const unitRadius = GRID_SIZE / 1.67;
        let baseColor;
        let glowColor;

        switch (this.team) {
            case TEAM.A: baseColor = COLORS.TEAM_A; glowColor = GLOW_COLORS.TEAM_A; break;
            case TEAM.B: baseColor = COLORS.TEAM_B; glowColor = GLOW_COLORS.TEAM_B; break;
            case TEAM.C: baseColor = COLORS.TEAM_C; glowColor = GLOW_COLORS.TEAM_C; break;
            case TEAM.D: baseColor = COLORS.TEAM_D; glowColor = GLOW_COLORS.TEAM_D; break;
            default: baseColor = '#CCCCCC'; glowColor = 'rgba(255, 255, 255, 0.7)'; break;
        }

        // 1. 기본 색상 그리기
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(this.pixelX, this.pixelY, unitRadius, 0, Math.PI * 2);
        ctx.fill();

        // 2. 특수 공격 준비 시, 빛 효과 추가 (덜 밝게)
        if (this.isSpecialReady) {
            ctx.save();
            //ctx.globalCompositeOperation = 'lighter'; // lighter 제거하여 밝기 낮춤
            ctx.fillStyle = glowColor; // GLOW_COLORS 사용 (이미 alpha 포함)
            ctx.shadowColor = glowColor.substring(0, glowColor.lastIndexOf(',')) + ', 0.5)'; // 그림자 투명도 낮춤
            ctx.shadowBlur = 8 / totalScale; // 블러 반경 줄임
            ctx.beginPath();
            ctx.arc(this.pixelX, this.pixelY, unitRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        // ----------------------------------------

        // --- 테두리 (변경 없음) ---
        if (isOutlineEnabled) {
             ctx.strokeStyle = 'black';
             ctx.lineWidth = outlineWidth / totalScale;
             ctx.beginPath(); // 테두리를 위한 경로 다시 시작
             ctx.arc(this.pixelX, this.pixelY, unitRadius, 0, Math.PI * 2);
             ctx.stroke();
        }

        // --- 눈 그리기 (변경 없음) ---
        { /* ... 눈 그리기 로직 ... */
              const headRadius = GRID_SIZE / 1.67;
            const eyeScale = this.gameManager?.unitEyeScale ?? 1.0;
            const faceWidth = headRadius * 1.1 * eyeScale;
            const faceHeight = headRadius * 0.7 * eyeScale;
            const gap = headRadius * 0.3;
            const eyeWidth = (faceWidth - gap) / 2;
            const eyeHeight = faceHeight;

            const isDead = this.hp <= 0;
            const isFighting = this.attackAnimationTimer > 0 || this.isCasting || (this.target && this.weapon);
            const isMoving = !!this.moveTarget && !isFighting && !this.isDashing;

            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);

            if (isDead) {
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = headRadius * 0.5;
                const xo = headRadius * 0.5;
                const yo = headRadius * 0.5;
                ctx.beginPath();
                ctx.moveTo(-xo, -yo);
                ctx.lineTo(xo, yo);
                ctx.moveTo(xo, -yo);
                ctx.lineTo(-xo, yo);
                ctx.stroke();
            } else {
                const leftX = -faceWidth / 2;
                const rightX = gap / 2;
                const topY = -eyeHeight / 2;
                ctx.fillStyle = '#ffffff';
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = headRadius * 0.12;

                const rx = Math.min(eyeWidth, eyeHeight) * 0.35;
                ctx.beginPath();
                ctx.moveTo(leftX + rx, topY);
                ctx.lineTo(leftX + eyeWidth - rx, topY);
                ctx.quadraticCurveTo(leftX + eyeWidth, topY, leftX + eyeWidth, topY + rx);
                ctx.lineTo(leftX + eyeWidth, topY + eyeHeight - rx);
                ctx.quadraticCurveTo(leftX + eyeWidth, topY + eyeHeight, leftX + eyeWidth - rx, topY + eyeHeight);
                ctx.lineTo(leftX + rx, topY + eyeHeight);
                ctx.quadraticCurveTo(leftX, topY + eyeHeight, leftX, topY + eyeHeight - rx);
                ctx.lineTo(leftX, topY + rx);
                ctx.quadraticCurveTo(leftX, topY, leftX + rx, topY);
                ctx.closePath();
                ctx.fill(); ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(rightX + rx, topY);
                ctx.lineTo(rightX + eyeWidth - rx, topY);
                ctx.quadraticCurveTo(rightX + eyeWidth, topY, rightX + eyeWidth, topY + rx);
                ctx.lineTo(rightX + eyeWidth, topY + eyeHeight - rx);
                ctx.quadraticCurveTo(rightX + eyeWidth, topY + eyeHeight, rightX + eyeWidth - rx, topY + eyeHeight);
                ctx.lineTo(rightX + rx, topY + eyeHeight);
                ctx.quadraticCurveTo(rightX, topY + eyeHeight, rightX, topY + eyeHeight - rx);
                ctx.lineTo(rightX, topY + rx);
                ctx.quadraticCurveTo(rightX, topY, rightX + rx, topY);
                ctx.closePath();
                ctx.fill(); ctx.stroke();

                let targetX = 0, targetY = 0;
                 if (isFighting && this.target) {
                    targetX = this.target.pixelX - this.pixelX;
                    targetY = this.target.pixelY - this.pixelY;
                } else if (isMoving && this.moveTarget) {
                    targetX = this.moveTarget.x - this.pixelX;
                    targetY = this.moveTarget.y - this.pixelY;
                } else {
                    const t = this.gameManager.animationFrameCounter * 0.09 + (this.pixelX + this.pixelY) * 0.001;
                    targetX = Math.cos(t);
                    targetY = Math.sin(t * 1.4);
                }


                const ang = Math.atan2(targetY, targetX);
                const maxOffX = eyeWidth * 0.18;
                const maxOffY = eyeHeight * 0.18;
                const offX = Math.cos(ang) * maxOffX;
                const offY = Math.sin(ang) * maxOffY;

                 if (isFighting) {
                    switch(this.team) {
                        case TEAM.A: ctx.fillStyle = DEEP_COLORS.TEAM_A; break;
                        case TEAM.B: ctx.fillStyle = DEEP_COLORS.TEAM_B; break;
                        case TEAM.C: ctx.fillStyle = DEEP_COLORS.TEAM_C; break;
                        case TEAM.D: ctx.fillStyle = DEEP_COLORS.TEAM_D; break;
                        default: ctx.fillStyle = '#0b1020'; break;
                    }
                } else {
                    ctx.fillStyle = '#0b1020';
                }
                const basePR = Math.min(eyeWidth, eyeHeight) * (isFighting ? 0.34 : 0.42);


                ctx.beginPath();
                ctx.arc(leftX + eyeWidth / 2 + offX * 0.6, topY + eyeHeight / 2 + offY * 0.6, basePR, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(rightX + eyeWidth / 2 + offX * 0.6, topY + eyeHeight / 2 + offY * 0.6, basePR, 0, Math.PI * 2);
                ctx.fill();

                if (isFighting) {
                     ctx.strokeStyle = '#0b1020';
                    ctx.lineWidth = headRadius * 0.25;
                    const browY = topY - headRadius * 0.15;
                    ctx.beginPath();
                    ctx.moveTo(leftX + eyeWidth * 0.15, browY + headRadius * 0.12);
                    ctx.lineTo(leftX + eyeWidth * 0.85, browY - headRadius * 0.12);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(rightX + eyeWidth * 0.15, browY - headRadius * 0.12);
                    ctx.lineTo(rightX + eyeWidth * 0.85, browY + headRadius * 0.12);
                    ctx.stroke();
                }
            }
            ctx.restore();
         }

        ctx.restore(); // scale 복원

        // --- 이름표 (변경 없음) ---
        if (this.name) { /* ... 이름표 ... */
             ctx.fillStyle = this.nameColor;
            ctx.font = `bold 10px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(this.name, this.pixelX, this.pixelY + GRID_SIZE);
         }

        // --- 부메랑 줄 (변경 없음) ---
        if (this.isBeingPulled && this.puller) { /* ... 부메랑 줄 ... */
             ctx.save();
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.puller.pixelX, this.puller.pixelY);
            ctx.lineTo(this.pixelX, this.pixelY);
            ctx.stroke();
            ctx.restore();
         }

        // --- 스턴 아이콘 (변경 없음) ---
        if (this.isStunned > 0) { /* ... 스턴 아이콘 ... */
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

        // --- 장착 무기 그리기 (변경 없음 - weaponary.js에서 처리) ---
        ctx.save();
        ctx.translate(this.pixelX, this.pixelY);
        if (this.isKing) { /* ... 왕관 ... */
             const kingTotalScale = 1.2;
            ctx.translate(0, -GRID_SIZE * 0.5);
            ctx.scale(kingTotalScale, kingTotalScale);
            ctx.fillStyle = '#facc15'; ctx.strokeStyle = 'black'; ctx.lineWidth = 1 / kingTotalScale;
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.4, -GRID_SIZE * 0.1); ctx.lineTo(-GRID_SIZE * 0.4, GRID_SIZE * 0.2);
            ctx.lineTo(GRID_SIZE * 0.4, GRID_SIZE * 0.2); ctx.lineTo(GRID_SIZE * 0.4, -GRID_SIZE * 0.1);
            ctx.lineTo(GRID_SIZE * 0.2, 0); ctx.lineTo(0, -GRID_SIZE * 0.1);
            ctx.lineTo(-GRID_SIZE * 0.2, 0); ctx.closePath();
            ctx.fill(); ctx.stroke();
         } else if (this.weapon) {
             this.weapon.drawEquipped(ctx, { ...this, pixelX: 0, pixelY: 0 }); // weaponary.js의 drawEquipped 호출
        }
        ctx.restore();

        // --- 상태 바 (HP, 쿨타임 등 - 변경 없음) ---
        // ... (기존 상태 바 그리기 코드) ...
          const barWidth = GRID_SIZE * 0.8 * totalScale;
        const barHeight = 4;
        const barGap = 1;
        const barX = this.pixelX - barWidth / 2;

        const healthBarIsVisible = this.hp < this.maxHp || this.hpBarVisibleTimer > 0;
        const normalAttackIsVisible = (this.isCasting && this.weapon?.type === 'poison_potion') || (this.attackCooldown > 0);
        const kingSpawnBarIsVisible = this.isKing && this.spawnCooldown > 0;
        let specialSkillIsVisible =
            (this.weapon?.type === 'magic_dagger' && this.magicDaggerSkillCooldown > 0) ||
            (this.weapon?.type === 'axe' && this.axeSkillCooldown > 0) ||
            (this.weapon?.type === 'ice_diamond' && this.iceDiamondChargeTimer > 0 && this.iceDiamondCharges < 5) ||
            (this.weapon?.type === 'magic_spear' && this.magicCircleCooldown > 0) ||
            (this.weapon?.type === 'boomerang' && this.boomerangCooldown > 0) ||
            (this.weapon?.type === 'shuriken' && this.shurikenSkillCooldown > 0) ||
            (this.weapon?.type === 'fire_staff' && this.fireStaffSpecialCooldown > 0) ||
            (this.weapon?.type === 'dual_swords' && this.dualSwordSkillCooldown > 0) ||
            (this.isCasting);

        if (this.attackCooldown > 0 && !this.isCasting) {
            specialSkillIsVisible = false;
        }

        const barsToShow = [];
        if (normalAttackIsVisible) barsToShow.push('attack');
        if (healthBarIsVisible) barsToShow.push('health');

        if (barsToShow.length > 0) {
            const kingYOffset = this.isKing ? GRID_SIZE * 0.4 * totalScale : 0;
            const totalBarsHeight = (barsToShow.length * barHeight) + ((barsToShow.length - 1) * barGap);
            let currentBarY = this.pixelY - (GRID_SIZE * 0.9 * totalScale) - totalBarsHeight - kingYOffset;


            if (normalAttackIsVisible) {
                ctx.fillStyle = '#0c4a6e';
                ctx.fillRect(barX, currentBarY, barWidth, barHeight);
                let progress = 0;
                if (this.isCasting && this.weapon?.type === 'poison_potion') {
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

                if (this.displayHp > this.hp) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.fillRect(barX, currentBarY, barWidth * (this.displayHp / this.maxHp), barHeight);
                }

                ctx.fillStyle = '#10b981';
                ctx.fillRect(barX, currentBarY, barWidth * (this.hp / this.maxHp), barHeight);

                if (this.damageFlash > 0) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${this.damageFlash * 0.6})`;
                    ctx.fillRect(barX, currentBarY, barWidth * (this.hp / this.maxHp), barHeight);
                }

                if (gameManager.isLevelUpEnabled && this.level > 0) {
                    const levelCircleRadius = 8;
                    const levelX = barX + barWidth + levelCircleRadius + 4;
                    const levelY = currentBarY + barHeight / 2;

                    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                    ctx.beginPath();
                    ctx.arc(levelX, levelY, levelCircleRadius, 0, Math.PI * 2);
                    ctx.fill();

                    const fontSize = 10;
                    ctx.font = `bold ${fontSize}px Arial`;
                    ctx.fillStyle = 'white';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(this.level, levelX, levelY);
                }
            }
        }

         if (kingSpawnBarIsVisible) {
            const spawnBarY = this.pixelY + GRID_SIZE + (this.name ? 5 : 0);
            ctx.fillStyle = '#450a0a';
            ctx.fillRect(barX, spawnBarY, barWidth, barHeight);
            const progress = 1 - (this.spawnCooldown / this.spawnInterval);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(barX, spawnBarY, barWidth * progress, barHeight);
        }


        if (specialSkillIsVisible) {
             let fgColor, progress = 0, max = 1;

            if (this.weapon?.type === 'fire_staff') {
                fgColor = '#ef4444';
                progress = 240 - this.fireStaffSpecialCooldown; max = 240;
            } else if (this.weapon?.type === 'magic_spear') {
                fgColor = '#a855f7';
                progress = 300 - this.magicCircleCooldown; max = 300;
            } else if (['boomerang', 'shuriken', 'poison_potion', 'magic_dagger', 'axe', 'dual_swords'].includes(this.weapon?.type)) {
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
                const radius = (GRID_SIZE / 1.67 + 3) * totalScale;
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


        // --- 경고 아이콘 (변경 없음) ---
        const showAlert = this.alertedCounter > 0 || (this.weapon?.type === 'magic_spear' && this.target instanceof Unit && this.target.stunnedByMagicCircle);
        if (showAlert && this.state !== 'FLEEING_FIELD' && this.state !== 'FLEEING_LAVA') { /* ... 경고 아이콘 ... */
            const yOffset = -GRID_SIZE * totalScale;
            ctx.fillStyle = 'yellow';
            ctx.font = `bold 20px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(this.state === 'SEEKING_HEAL_PACK' ? '+' : '!', this.pixelX, this.pixelY + yOffset);
         }
    }

    performDualSwordTeleportAttack(enemies) {
        const target = this.dualSwordTeleportTarget;
        if (target && target.hp > 0) {
            const teleportPos = this.gameManager.findEmptySpotNear(target);
            this.pixelX = teleportPos.x;
            this.pixelY = teleportPos.y;
            this.dualSwordSpinAttackTimer = 20;

            const damageRadius = GRID_SIZE * 2;
            enemies.forEach(enemy => {
                if (Math.hypot(this.pixelX - enemy.pixelX, this.pixelY - enemy.pixelY) < damageRadius) {
                    enemy.takeDamage(this.attackPower * 1.5, {}, this);
                }
            });
            this.gameManager.audioManager.play('rotaryknife');
        }
        this.dualSwordTeleportTarget = null;
        this.state = 'IDLE';
    }
}
