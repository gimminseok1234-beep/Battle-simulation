import { TILE, TEAM, COLORS, GRID_SIZE, DEEP_COLORS } from './constants.js';
import { Weapon, MagicDaggerDashEffect, createPhysicalHitEffect } from './weaponary.js';
import { Nexus } from './entities.js';

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
        this.displayHp = 100; // [추가] 화면에 표시될 체력
        this.damageFlash = 0; // [추가] 피격 시 깜빡임 효과

        // 레벨업 시스템 속성
        this.level = 1;
        this.maxLevel = 5;
        this.killedBy = null;
        this.specialAttackLevelBonus = 0;
        this.levelUpParticleCooldown = 0; // 레벨업 파티클 생성 쿨다운

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
        this.axeSkillCooldown = 0; // 도끼는 충전식이 아니므로 이펙트 대상에서 제외
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

        // 유닛이 길을 찾지 못하고 막혔는지 판단하기 위한 속성
        this.stuckTimer = 0;
        this.lastPosition = { x: this.pixelX, y: this.pixelY };

        // [🌟 NEW] 특수 공격 활성화 상태 플래그
        this.isSpecialAttackReady = false;
    }

    // ... (기존 getter들은 그대로 유지) ...
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

        // 도끼 쿨타임 조정 제거 (충전식 아님)
        if (this.weapon && this.weapon.type === 'fire_staff') return Math.max(20, Math.min(finalCooldown, 120));
        if (this.weapon && this.weapon.type === 'hadoken') return Math.max(20, Math.min(finalCooldown, 120));
        // if (this.weapon && this.weapon.type === 'axe') return Math.max(20, Math.min(finalCooldown, 120)); // 제거
        if (this.weapon && this.weapon.type === 'ice_diamond') return Math.max(20, Math.min(finalCooldown, 180));

        return Math.max(20, finalCooldown);
    }


    // ... (equipWeapon, levelUp, findClosest, applyPhysics, move, attack, takeDamage, handleDeath 함수는 그대로 유지) ...
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
        this.damageFlash = 1.0; // [추가] 피격 효과 활성화

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

    update(enemies, weapons, projectiles) {
        const gameManager = this.gameManager;
        if (!gameManager) {
            return;
        }

        // [추가] 부드러운 체력바 감소 및 피격 효과 처리
        if (this.displayHp > this.hp) {
            this.displayHp -= (this.displayHp - this.hp) * 0.1 * this.gameManager.gameSpeed;
        } else {
            this.displayHp = this.hp;
        }
        if (this.damageFlash > 0) {
            this.damageFlash -= 0.05 * this.gameManager.gameSpeed;
        }


        // [MODIFIED] 레벨 2 이상일 때 유닛 주변에서 파티클이 생성되도록 수정
        if (this.level >= 2 && gameManager.isLevelUpEnabled) {
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
                    const radius = GRID_SIZE / 1.67; // 유닛 반지름
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

        if (this.isDashing) {
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

        if (this.isStunned > 0) {
            this.isStunned -= gameManager.gameSpeed;
            if (this.isStunned <= 0) {
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

        if (this.awakeningEffect.active && this.awakeningEffect.stacks < 3) {
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

        // [🌟 MODIFIED] 스킬 쿨타임 감소 로직에 이펙트 상태 업데이트 추가
        if (this.magicDaggerSkillCooldown > 0) this.magicDaggerSkillCooldown -= gameManager.gameSpeed;
        // 도끼는 충전식이 아니므로 이펙트 대상에서 제외
        // if (this.axeSkillCooldown > 0) this.axeSkillCooldown -= gameManager.gameSpeed;
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

        // [🌟 NEW] 특수 공격 준비 상태 업데이트
        this.updateSpecialAttackReadyStatus();


        if (this.weapon && (this.weapon.type === 'shuriken' || this.weapon.type === 'lightning') && this.evasionCooldown <= 0) {
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

        if (this.dualSwordTeleportDelayTimer > 0) {
            this.dualSwordTeleportDelayTimer -= gameManager.gameSpeed;
            if (this.dualSwordTeleportDelayTimer <= 0) {
                this.performDualSwordTeleportAttack(enemies);
            }
        }

        if (this.isKing && this.spawnCooldown <= 0) {
            this.spawnCooldown = this.spawnInterval;
            gameManager.spawnUnit(this, false);
        }

        if (this.isCasting) {
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

        // 마법 단검 스킬 사용 로직 (aiming 상태 관리)
        if (this.weapon && this.weapon.type === 'magic_dagger' && !this.isAimingMagicDagger && this.magicDaggerSkillCooldown <= 0 && this.attackCooldown <= 0) {
            const { item: closestEnemy } = this.findClosest(enemies);
            if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy)) {
                const dist = Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY);
                if (dist < this.detectionRange) {
                    this.isAimingMagicDagger = true;
                    this.magicDaggerAimTimer = 60; // 1초 조준 시간
                    const angle = Math.atan2(closestEnemy.pixelY - this.pixelY, closestEnemy.pixelX - this.pixelX);
                    const dashDistance = GRID_SIZE * 4; // 대시 거리
                    this.magicDaggerTargetPos = {
                        x: this.pixelX + Math.cos(angle) * dashDistance,
                        y: this.pixelY + Math.sin(angle) * dashDistance
                    };
                }
            }
        }

        // 마법 단검 조준 및 스킬 발동
        if (this.isAimingMagicDagger) {
            this.magicDaggerAimTimer -= gameManager.gameSpeed;
            if (this.magicDaggerAimTimer <= 0) {
                this.isAimingMagicDagger = false;
                this.magicDaggerSkillCooldown = 420; // 스킬 쿨타임 (7초)
                this.attackCooldown = 30; // 공격 후 잠시 딜레이

                const startPos = { x: this.pixelX, y: this.pixelY };
                const endPos = this.magicDaggerTargetPos;

                // 경로상의 모든 적에게 데미지 및 스턴
                enemies.forEach(enemy => {
                    const distToLine = Math.abs((endPos.y - startPos.y) * enemy.pixelX - (endPos.x - startPos.x) * enemy.pixelY + endPos.x * startPos.y - endPos.y * startPos.x) / Math.hypot(endPos.y - startPos.y, endPos.x - startPos.x);
                    if (distToLine < GRID_SIZE) { // 선분과 점 사이 거리 체크
                        // 이동 경로 내에 있는지 추가 확인 (선분 위에 있는지)
                        const dotProduct = (enemy.pixelX - startPos.x) * (endPos.x - startPos.x) + (enemy.pixelY - startPos.y) * (endPos.y - startPos.y);
                        const squaredLength = Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2);
                        if (dotProduct >= 0 && dotProduct <= squaredLength) {
                           enemy.takeDamage(this.attackPower * 1.2 + this.specialAttackLevelBonus, { stun: 60 }, this);
                        }
                    }
                });

                // 목표 위치로 순간이동
                this.pixelX = endPos.x;
                this.pixelY = endPos.y;

                // 이펙트 생성 및 효과음 재생
                gameManager.effects.push(new MagicDaggerDashEffect(gameManager, startPos, endPos));
                gameManager.audioManager.play('magicdagger'); // magicdagger 효과음 추가 필요

                // 파티클 효과
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
                return; // 스킬 사용 후에는 다른 행동 X
            }
        }


        // 마법창 스킬 로직 (마법진 생성 및 스턴된 적 공격)
        if (this.weapon && this.weapon.type === 'magic_spear') {
            if (this.magicCircleCooldown <= 0) {
                gameManager.spawnMagicCircle(this.team);
                this.magicCircleCooldown = 300; // 5초 쿨타임
            }
            // 마법진에 스턴된 적 찾기
            const stunnedEnemy = gameManager.findStunnedByMagicCircleEnemy(this.team);
            if (stunnedEnemy && this.attackCooldown <= 0) {
                this.alertedCounter = 60;
                this.target = stunnedEnemy;
                gameManager.createProjectile(this, stunnedEnemy, 'magic_spear_special');
                gameManager.audioManager.play('spear'); // spear 효과음
                this.attackCooldown = this.cooldownTime;
                return; // 스킬 공격 후 다른 행동 X
            }
        }
        // 부메랑 스킬 로직
        else if (this.weapon && this.weapon.type === 'boomerang' && this.boomerangCooldown <= 0) {
            const { item: closestEnemy } = this.findClosest(enemies);
            if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy)) {
                const dist = Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY);
                if (dist <= this.attackRange) {
                    this.boomerangCooldown = 480; // 8초 쿨타임
                    gameManager.createProjectile(this, closestEnemy, 'boomerang_projectile'); // 특수 부메랑 투사체
                    gameManager.audioManager.play('boomerang'); // boomerang 효과음
                    this.state = 'IDLE'; // 스킬 사용 후 잠시 멈춤
                    this.moveTarget = null;
                    this.attackCooldown = 60; // 스킬 사용 후 짧은 쿨타임
                    this.applyPhysics();
                    return; // 스킬 사용 후 다른 행동 X
                }
            }
        }
        // 표창 스킬 로직
        else if (this.weapon && this.weapon.type === 'shuriken' && this.shurikenSkillCooldown <= 0) {
             const { item: closestEnemy } = this.findClosest(enemies);
             if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy)) {
                 const dist = Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY);
                 if (dist <= this.attackRange) {
                     this.weapon.use(this, closestEnemy); // use 메서드에서 스킬 사용 로직 처리
                     return; // 스킬 사용 후 다른 행동 X
                 }
             }
        }
        // 불 지팡이 스킬 로직
        else if (this.weapon && this.weapon.type === 'fire_staff' && this.fireStaffSpecialCooldown <= 0) {
            const { item: closestEnemy } = this.findClosest(enemies);
             if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy)) {
                 const dist = Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY);
                 if (dist <= this.attackRange) {
                    gameManager.createProjectile(this, closestEnemy, 'fireball_projectile');
                    gameManager.audioManager.play('fireball');
                    this.fireStaffSpecialCooldown = 240; // 4초 쿨타임
                    this.attackCooldown = 60;
                    return; // 스킬 사용 후 다른 행동 X
                 }
             }
        }
        // 쌍검 스킬 로직
        else if (this.weapon && this.weapon.type === 'dual_swords' && this.dualSwordSkillCooldown <= 0) {
             const { item: closestEnemy } = this.findClosest(enemies);
             if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy)) {
                 const distanceToTarget = Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY);
                 if (distanceToTarget <= this.detectionRange * 1.2) { // 탐지 범위보다 조금 더 넓게
                     gameManager.audioManager.play('shurikenShoot'); // 표창 소리 재활용
                     gameManager.createProjectile(this, closestEnemy, 'bouncing_sword');
                     this.dualSwordSkillCooldown = 300; // 5초 쿨타임
                     this.attackCooldown = 60;
                     this.moveTarget = null; // 이동 멈춤
                     this.facingAngle = Math.atan2(closestEnemy.pixelY - this.pixelY, closestEnemy.pixelX - this.pixelX);
                     return; // 스킬 사용 후 다른 행동 X
                 }
             }
        }


        // 도끼 스킬 로직 제거 (충전식이 아님)
        // if (this.weapon && this.weapon.type === 'axe' && this.axeSkillCooldown <= 0) { ... } // 제거


        // --- 상태 결정 로직 (기존과 유사하게 유지) ---
        let newState = 'IDLE';
        let newTarget = null;
        let targetEnemyForAlert = null;

        const currentGridXBeforeMove = Math.floor(this.pixelX / GRID_SIZE);
        const currentGridYBeforeMove = Math.floor(this.pixelY / GRID_SIZE);
        this.isInMagneticField = gameManager.isPosInAnyField(currentGridXBeforeMove, currentGridYBeforeMove);
        this.isInLava = gameManager.isPosInLavaForUnit(currentGridXBeforeMove, currentGridYBeforeMove);

        // 자기장/용암 회피 우선
        if (this.isInMagneticField) {
            newState = 'FLEEING_FIELD';
        } else if (gameManager.isLavaAvoidanceEnabled && this.isInLava) {
            newState = 'FLEEING_LAVA';
            this.fleeingCooldown = 60; // 일정 시간 동안 회피 상태 유지
        }
        // 회피 쿨타임 중이 아니거나 회피할 필요 없을 때 다음 로직 실행
        else if (this.fleeingCooldown <= 0) {
            const enemyNexus = gameManager.nexuses.find(n => n.team !== this.team && !n.isDestroying);
            const { item: closestEnemy, distance: enemyDist } = this.findClosest(enemies);

            const visibleWeapons = weapons.filter(w => !w.isEquipped && gameManager.hasLineOfSightForWeapon(this, w));
            const { item: targetWeapon, distance: weaponDist } = this.findClosest(visibleWeapons);

            // 무기가 없을 때만 물음표 타일 찾기
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

            // 시야 내 적 탐지
            let targetEnemy = null;
            if (closestEnemy && enemyDist <= this.detectionRange && gameManager.hasLineOfSight(this, closestEnemy)) {
                targetEnemy = closestEnemy;
                targetEnemyForAlert = closestEnemy; // 경계 상태 트리거용
            }

            // 상태 결정 우선순위
            if (this.isKing && targetEnemy) { // 왕은 적 발견 시 도망
                newState = 'FLEEING'; newTarget = targetEnemy;
            } else if (this.hp < this.maxHp / 2) { // 체력이 절반 이하일 때
                const healPacks = gameManager.getTilesOfType(TILE.HEAL_PACK);
                if (healPacks.length > 0) {
                    const healPackPositions = healPacks.map(pos => ({
                        gridX: pos.x, gridY: pos.y,
                        pixelX: pos.x * GRID_SIZE + GRID_SIZE / 2,
                        pixelY: pos.y * GRID_SIZE + GRID_SIZE / 2
                    }));
                    const { item: closestPack, distance: packDist } = this.findClosest(healPackPositions);
                    if (closestPack && packDist < this.detectionRange * 1.5) { // 탐지 범위 1.5배 내
                        newState = 'SEEKING_HEAL_PACK';
                        newTarget = closestPack;
                    }
                }
            }

            // 위 조건에 해당하지 않을 경우
            if (newState === 'IDLE') {
                 if (closestQuestionMark && questionMarkDist <= this.detectionRange) { // 물음표 타일 우선 (무기 없을 때)
                    newState = 'SEEKING_QUESTION_MARK';
                    newTarget = closestQuestionMark;
                } else if (!this.weapon && targetWeapon && weaponDist <= this.detectionRange) { // 무기 줍기
                    newState = 'SEEKING_WEAPON';
                    newTarget = targetWeapon;
                } else if (targetEnemy) { // 적 공격
                    newState = 'AGGRESSIVE';
                    newTarget = targetEnemy;
                } else if (enemyNexus && gameManager.hasLineOfSight(this, enemyNexus) && Math.hypot(this.pixelX - enemyNexus.pixelX, this.pixelY - enemyNexus.pixelY) <= this.detectionRange) { // 넥서스 공격
                    newState = 'ATTACKING_NEXUS';
                    newTarget = enemyNexus;
                }
                // 아무 대상도 없으면 IDLE 유지 (아래 switch문에서 처리)
            }
        }
        // 회피 쿨타임 중일 때는 현재 상태 유지 (IDLE 또는 이동 중)
        else {
            if (this.moveTarget) { // 이동 목표가 있으면 현재 상태 유지
                newState = this.state;
            } else { // 이동 목표 없으면 IDLE
                newState = 'IDLE';
            }
        }

        // 상태 변경 시 경계 상태 활성화 (IDLE, FLEEING_FIELD, FLEEING_LAVA 제외)
        if (this.state !== newState && newState !== 'IDLE' && newState !== 'FLEEING_FIELD' && newState !== 'FLEEING_LAVA') {
             // 마법창 특수 공격 중에는 경계 상태 변경 X
            if (!(this.weapon && this.weapon.type === 'magic_spear' && this.target instanceof Unit && this.target.stunnedByMagicCircle)) {
                this.alertedCounter = 60;
            }
        }
        this.state = newState;
        this.target = newTarget; // 현재 목표 설정

        // --- 상태별 행동 처리 ---
        switch (this.state) {
            case 'FLEEING_FIELD': // 자기장 회피
                this.moveTarget = gameManager.findClosestSafeSpot(this.pixelX, this.pixelY);
                break;
            case 'FLEEING_LAVA': // 용암 회피
                 this.moveTarget = gameManager.findClosestSafeSpotFromLava(this.pixelX, this.pixelY);
                 break;
            case 'FLEEING': // 왕 도망
                if (this.target) {
                    const fleeAngle = Math.atan2(this.pixelY - this.target.pixelY, this.pixelX - this.target.pixelX);
                    // 목표 반대 방향으로 이동
                    this.moveTarget = { x: this.pixelX + Math.cos(fleeAngle) * GRID_SIZE * 5, y: this.pixelY + Math.sin(fleeAngle) * GRID_SIZE * 5 };
                }
                break;
            case 'SEEKING_HEAL_PACK': // 회복 팩 찾기
                if (this.target) this.moveTarget = { x: this.target.pixelX, y: this.target.pixelY };
                break;
            case 'SEEKING_QUESTION_MARK': // 물음표 타일 찾기
                if (this.target) this.moveTarget = { x: this.target.pixelX, y: this.target.pixelY };
                break;
            case 'SEEKING_WEAPON': // 무기 줍기
                if (this.target) {
                    const distance = Math.hypot(this.pixelX - this.target.pixelX, this.pixelY - this.target.pixelY);
                    if (distance < GRID_SIZE * 0.8 && !this.target.isEquipped) { // 가까이 있고 아직 안 주워졌으면
                        this.equipWeapon(this.target.type);
                        this.target.isEquipped = true; // 주웠음 표시
                        this.target = null; // 목표 초기화
                    } else { // 멀리 있으면 이동
                        this.moveTarget = { x: this.target.pixelX, y: this.target.pixelY };
                    }
                }
                break;
            case 'ATTACKING_NEXUS': // 넥서스 공격
            case 'AGGRESSIVE': // 적 공격
                if (this.target) {
                    // 공격 사거리 계산
                    let attackDistance = this.attackRange;
                    if (this.weapon && this.weapon.type === 'poison_potion') {
                        attackDistance = this.baseAttackRange; // 독 포션은 기본 사거리
                    }

                    // 사거리 내에 있고 공격 가능하면 공격
                    if (Math.hypot(this.pixelX - this.target.pixelX, this.pixelY - this.target.pixelY) <= attackDistance) {
                        this.moveTarget = null; // 이동 멈춤
                        this.attack(this.target); // 공격 실행
                        // 공격 방향으로 유닛 방향 전환
                        this.facingAngle = Math.atan2(this.target.pixelY - this.pixelY, this.target.pixelX - this.pixelX);
                    } else { // 사거리 밖이면 이동
                        this.moveTarget = { x: this.target.pixelX, y: this.target.pixelY };
                    }
                }
                break;
            case 'IDLE': default: // 기본 상태 (배회)
                // 이동 목표가 없거나 목표에 거의 도달했으면 새로운 배회 목표 설정
                if (!this.moveTarget || Math.hypot(this.pixelX - this.moveTarget.x, this.pixelY - this.moveTarget.y) < GRID_SIZE) {
                    const angle = gameManager.random() * Math.PI * 2;
                    // 현재 위치에서 랜덤 방향으로 일정 거리 이동 목표 설정
                    this.moveTarget = { x: this.pixelX + Math.cos(angle) * GRID_SIZE * 8, y: this.pixelY + Math.sin(angle) * GRID_SIZE * 8 };
                }
                break;
        }

        // 이동 실행
        this.move();

        // 물리 효과 적용 (충돌 처리, 넉백 등)
        this.applyPhysics();

        // 유닛 막힘 감지 및 처리
        if (this.moveTarget) {
            const distMoved = Math.hypot(this.pixelX - this.lastPosition.x, this.pixelY - this.lastPosition.y);
            if (distMoved < 0.2 * gameManager.gameSpeed) { // 거의 움직이지 않았으면
                this.stuckTimer += 1;
            } else {
                this.stuckTimer = 0; // 움직였으면 타이머 초기화
            }

            // 0.5초(30프레임) 이상 막혀있으면 새로운 랜덤 목표 설정 시도
            if (this.stuckTimer > 30) {
                const angle = gameManager.random() * Math.PI * 2;
                const radius = GRID_SIZE * 3;
                const newTargetX = this.pixelX + Math.cos(angle) * radius;
                const newTargetY = this.pixelY + Math.sin(angle) * radius;

                const gridX = Math.floor(newTargetX / GRID_SIZE);
                const gridY = Math.floor(newTargetY / GRID_SIZE);

                // 새로운 목표 지점이 맵 안이고 벽이 아니면 목표 변경
                if (gridY >= 0 && gridY < gameManager.ROWS && gridX >= 0 && gridX < gameManager.COLS &&
                    gameManager.map[gridY][gridX].type !== TILE.WALL &&
                    gameManager.map[gridY][gridX].type !== TILE.CRACKED_WALL) {
                    this.moveTarget = { x: newTargetX, y: newTargetY };
                }

                this.stuckTimer = 0; // 막힘 타이머 초기화
            }
        } else {
            this.stuckTimer = 0; // 이동 목표 없으면 타이머 초기화
        }
        this.lastPosition = { x: this.pixelX, y: this.pixelY }; // 현재 위치 기록


        // 현재 위치의 타일 효과 처리
        const finalGridX = Math.floor(this.pixelX / GRID_SIZE);
        const finalGridY = Math.floor(this.pixelY / GRID_SIZE);

        // 자기장 안에 있으면 데미지
        if (this.isInMagneticField) {
            this.takeDamage(0.3 * gameManager.gameSpeed, { isTileDamage: true });
        }

        // 맵 범위 안에 있는지 확인
        if (finalGridY >= 0 && finalGridY < gameManager.ROWS && finalGridX >= 0 && finalGridX < gameManager.COLS) {
            const currentTile = gameManager.map[finalGridY][finalGridX];
            // 용암 타일 데미지
            if (currentTile.type === TILE.LAVA) this.takeDamage(0.2 * gameManager.gameSpeed, { isTileDamage: true });
            // 회복 팩 처리
            if (currentTile.type === TILE.HEAL_PACK) {
                this.hp = this.maxHp; // 체력 최대로 회복
                // 회복 팩 타일을 일반 바닥으로 변경
                gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor };
                gameManager.audioManager.play('heal'); // heal 효과음
            }
            // 텔레포터 처리
            if (currentTile.type === TILE.TELEPORTER && this.teleportCooldown <= 0) {
                const teleporters = gameManager.getTilesOfType(TILE.TELEPORTER);
                if (teleporters.length > 1) { // 텔레포터가 2개 이상 있을 때만 작동
                    // 현재 위치가 아닌 다른 텔레포터 찾기
                    const otherTeleporter = teleporters.find(t => t.x !== finalGridX || t.y !== finalGridY);
                    if (otherTeleporter) {
                        // 다른 텔레포터 위치로 이동
                        this.pixelX = otherTeleporter.x * GRID_SIZE + GRID_SIZE / 2;
                        this.pixelY = otherTeleporter.y * GRID_SIZE + GRID_SIZE / 2;
                        this.teleportCooldown = 120; // 2초 쿨타임
                        gameManager.audioManager.play('teleport'); // teleport 효과음
                    }
                }
            }
            // 복제 타일 처리
            if (currentTile.type === TILE.REPLICATION_TILE && !this.isKing) { // 왕은 복제 X
                for (let i = 0; i < currentTile.replicationValue; i++) {
                    gameManager.spawnUnit(this, true); // 유닛 복제 (무기도 복제)
                }
                // 복제 타일을 일반 바닥으로 변경
                gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor };
                gameManager.audioManager.play('replication'); // replication 효과음
            }
            // 물음표 타일 처리
            if (currentTile.type === TILE.QUESTION_MARK) {
                // 물음표 타일을 일반 바닥으로 변경
                gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor };
                // 물음표 이펙트 생성
                gameManager.createEffect('question_mark_effect', this.pixelX, this.pixelY);
                gameManager.audioManager.play('questionmark'); // questionmark 효과음
                // 주변에 랜덤 무기 생성
                gameManager.spawnRandomWeaponNear({ x: this.pixelX, y: this.pixelY });
            }
            // 돌진 타일 처리
            if (currentTile.type === TILE.DASH_TILE) {
                this.isDashing = true; // 대시 상태 활성화
                this.dashDirection = currentTile.direction; // 돌진 방향 설정
                this.dashDistanceRemaining = 5 * GRID_SIZE; // 돌진 거리 설정 (5칸)
                this.state = 'IDLE'; // 상태 IDLE로 변경
                this.moveTarget = null; // 이동 목표 제거
                gameManager.audioManager.play('rush'); // rush 효과음
                return; // 대시 시작 후 다른 행동 X
            }
             // 각성 물약 타일 처리
            if (currentTile.type === TILE.AWAKENING_POTION && !this.awakeningEffect.active) {
                this.awakeningEffect.active = true; // 각성 효과 활성화
                this.awakeningEffect.stacks = 0; // 스택 초기화
                this.awakeningEffect.timer = 0; // 타이머 초기화
                 // 물약 타일을 일반 바닥으로 변경
                gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor };
                gameManager.audioManager.play('Arousal'); // Arousal 효과음

                // 각성 파티클 효과
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

    // [🌟 NEW] 특수 공격 준비 상태 업데이트 함수
    updateSpecialAttackReadyStatus() {
        if (!this.weapon) {
            this.isSpecialAttackReady = false;
            return;
        }

        switch (this.weapon.type) {
            case 'sword':
            case 'bow':
                this.isSpecialAttackReady = this.attackCount >= 2; // 다음 공격(3타)이 특수 공격
                break;
            case 'boomerang':
                this.isSpecialAttackReady = this.boomerangCooldown <= 0;
                break;
            case 'shuriken':
                this.isSpecialAttackReady = this.shurikenSkillCooldown <= 0;
                break;
            case 'fire_staff':
                this.isSpecialAttackReady = this.fireStaffSpecialCooldown <= 0;
                break;
            case 'magic_dagger':
                this.isSpecialAttackReady = this.magicDaggerSkillCooldown <= 0;
                break;
            case 'dual_swords':
                this.isSpecialAttackReady = this.dualSwordSkillCooldown <= 0;
                break;
            default:
                this.isSpecialAttackReady = false; // 다른 무기는 해당 없음
        }
    }


    // ... (draw 함수는 그대로 유지) ...
    draw(ctx, isOutlineEnabled, outlineWidth) {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        ctx.save();

        const scale = 1 + this.awakeningEffect.stacks * 0.2;
        const levelScale = 1 + (this.level - 1) * 0.08;
        const totalScale = scale * levelScale;

        if (this.awakeningEffect.active) {
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

        if (this.isAimingMagicDagger) {
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
                ctx.beginPath(); ctx.arc(pos.x, pos.y, (GRID_SIZE / 1.67) * totalScale, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            });
        }

        ctx.translate(this.pixelX, this.pixelY);
        ctx.scale(totalScale, totalScale);
        ctx.translate(-this.pixelX, -this.pixelY);


        if (this.isStunned > 0) {
            ctx.globalAlpha = 0.7;
        }

        if (this.isMarkedByDualSword.active) {
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

        switch(this.team) {
            case TEAM.A: ctx.fillStyle = COLORS.TEAM_A; break;
            case TEAM.B: ctx.fillStyle = COLORS.TEAM_B; break;
            case TEAM.C: ctx.fillStyle = COLORS.TEAM_C; break;
            case TEAM.D: ctx.fillStyle = COLORS.TEAM_D; break;
        }
        ctx.beginPath(); ctx.arc(this.pixelX, this.pixelY, GRID_SIZE / 1.67, 0, Math.PI * 2); ctx.fill();

        if (isOutlineEnabled) {
            ctx.strokeStyle = 'black';
            ctx.lineWidth = outlineWidth / totalScale;
            ctx.stroke();
        }

        // Eyes
        {
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

        ctx.restore(); // Restore scale and translation before drawing weapon/hp bar

        // 이름표 그리기
        if (this.name) {
            ctx.fillStyle = this.nameColor;
            ctx.font = `bold 10px Arial`;
            ctx.textAlign = 'center';
            // 이름표 위치 조정 (유닛 크기 변경 고려)
            ctx.fillText(this.name, this.pixelX, this.pixelY + GRID_SIZE * 0.8 * totalScale);
        }

        // 부메랑 당겨지는 선 그리기
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

        // 스턴 효과 그리기
        if (this.isStunned > 0) {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY - GRID_SIZE * 0.8 * totalScale); // 위치 조정
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

        // 무기 그리기 (이펙트 포함)
        ctx.save();
        ctx.translate(this.pixelX, this.pixelY); // 유닛 위치로 이동
        if (this.isKing) { // 왕관 그리기
            const kingTotalScale = 1.2 * totalScale; // 전체 스케일 적용
            ctx.translate(0, -GRID_SIZE * 0.5 * totalScale); // 위치 조정
            ctx.scale(kingTotalScale, kingTotalScale);
            ctx.fillStyle = '#facc15'; ctx.strokeStyle = 'black'; ctx.lineWidth = 1 / kingTotalScale;
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.4, -GRID_SIZE * 0.1); ctx.lineTo(-GRID_SIZE * 0.4, GRID_SIZE * 0.2);
            ctx.lineTo(GRID_SIZE * 0.4, GRID_SIZE * 0.2); ctx.lineTo(GRID_SIZE * 0.4, -GRID_SIZE * 0.1);
            ctx.lineTo(GRID_SIZE * 0.2, 0); ctx.lineTo(0, -GRID_SIZE * 0.1);
            ctx.lineTo(-GRID_SIZE * 0.2, 0); ctx.closePath();
            ctx.fill(); ctx.stroke();
        } else if (this.weapon) {
             // [🌟 NEW] 특수 공격 준비 시 빛나는 이펙트 그리기
            if (this.isSpecialAttackReady) {
                let teamColor;
                switch(this.team) {
                    case TEAM.A: teamColor = COLORS.TEAM_A; break;
                    case TEAM.B: teamColor = COLORS.TEAM_B; break;
                    case TEAM.C: teamColor = COLORS.TEAM_C; break;
                    case TEAM.D: teamColor = COLORS.TEAM_D; break;
                    default: teamColor = 'white'; break;
                }
                const glowRadius = GRID_SIZE * 0.7; // 빛 크기
                const gradient = ctx.createRadialGradient(0, 0, glowRadius * 0.2, 0, 0, glowRadius);
                gradient.addColorStop(0, `${teamColor}B3`); // 70% 투명도
                gradient.addColorStop(1, `${teamColor}00`); // 완전 투명

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
                ctx.fill();
            }
            // 무기 그리기 (Unit 클래스의 draw 메서드가 아닌 Weapon 클래스의 drawEquipped 사용)
            this.weapon.drawEquipped(ctx, { ...this, pixelX: 0, pixelY: 0 }); // 상대 좌표 (0,0) 전달
        }
        ctx.restore(); // 유닛 위치 이동 복원


        // --- 상태 바 그리기 (기존 로직 유지, 위치 조정) ---
        const barWidth = GRID_SIZE * 0.8 * totalScale;
        const barHeight = 4;
        const barGap = 1;
        const barX = this.pixelX - barWidth / 2;

        const healthBarIsVisible = this.hp < this.maxHp || this.hpBarVisibleTimer > 0;
        const normalAttackIsVisible = (this.isCasting && this.weapon?.type === 'poison_potion') || (this.attackCooldown > 0);
        const kingSpawnBarIsVisible = this.isKing && this.spawnCooldown > 0;
        let specialSkillIsVisible =
            (this.weapon?.type === 'magic_dagger' && this.magicDaggerSkillCooldown > 0) ||
            (this.weapon?.type === 'axe' && this.axeSkillCooldown > 0) || // 도끼는 충전식이 아니므로 제외
            (this.weapon?.type === 'ice_diamond' && this.iceDiamondChargeTimer > 0 && this.iceDiamondCharges < 5) ||
            (this.weapon?.type === 'magic_spear' && this.magicCircleCooldown > 0) ||
            (this.weapon?.type === 'boomerang' && this.boomerangCooldown > 0) ||
            (this.weapon?.type === 'shuriken' && this.shurikenSkillCooldown > 0) ||
            (this.weapon?.type === 'fire_staff' && this.fireStaffSpecialCooldown > 0) ||
            (this.weapon?.type === 'dual_swords' && this.dualSwordSkillCooldown > 0) ||
            (this.isCasting);

        // 공격 쿨타임 중에는 스킬 바 숨김 (단, 캐스팅 중 제외)
        if (this.attackCooldown > 0 && !this.isCasting) {
             specialSkillIsVisible = false;
        }

        const barsToShow = [];
        if (normalAttackIsVisible) barsToShow.push('attack');
        if (healthBarIsVisible) barsToShow.push('health');
        // 스킬바는 원형 테두리로 대체하므로 여기서 제거

        if (barsToShow.length > 0) {
            const kingYOffset = this.isKing ? GRID_SIZE * 0.4 * totalScale : 0;
            const totalBarsHeight = (barsToShow.length * barHeight) + ((barsToShow.length - 1) * barGap);
            // 체력바 위치를 더 위로 조정
            let currentBarY = this.pixelY - (GRID_SIZE * 0.9 * totalScale) - totalBarsHeight - kingYOffset;

            // 일반 공격 쿨타임 바
            if (normalAttackIsVisible) {
                ctx.fillStyle = '#0c4a6e'; // 배경색 (진한 파랑)
                ctx.fillRect(barX, currentBarY, barWidth, barHeight);
                let progress = 0;
                // 독 포션 캐스팅 또는 일반 공격 쿨타임 진행률 계산
                if (this.isCasting && this.weapon?.type === 'poison_potion') {
                    progress = this.castingProgress / this.castDuration;
                } else {
                    progress = Math.max(0, 1 - (this.attackCooldown / this.cooldownTime));
                }
                ctx.fillStyle = '#38bdf8'; // 진행률 색 (밝은 파랑)
                ctx.fillRect(barX, currentBarY, barWidth * progress, barHeight);
                currentBarY += barHeight + barGap; // 다음 바 위치로 이동
            }

            // 체력 바
            if (healthBarIsVisible) {
                ctx.fillStyle = '#111827'; // 배경색 (검은색)
                ctx.fillRect(barX, currentBarY, barWidth, barHeight);

                // 부드럽게 감소하는 흰색 체력 부분
                if (this.displayHp > this.hp) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.fillRect(barX, currentBarY, barWidth * (this.displayHp / this.maxHp), barHeight);
                }

                // 실제 체력 (녹색) 부분
                ctx.fillStyle = '#10b981';
                ctx.fillRect(barX, currentBarY, barWidth * (this.hp / this.maxHp), barHeight);

                // 피격 시 흰색 점멸 효과
                if (this.damageFlash > 0) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${this.damageFlash * 0.6})`;
                    ctx.fillRect(barX, currentBarY, barWidth * (this.hp / this.maxHp), barHeight);
                }

                // 레벨 표시 (활성화 시)
                if (gameManager.isLevelUpEnabled && this.level > 0) {
                    const levelCircleRadius = 8;
                    const levelX = barX + barWidth + levelCircleRadius + 4; // 체력바 오른쪽에 위치
                    const levelY = currentBarY + barHeight / 2; // 체력바 중앙 높이

                    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; // 검은색 배경
                    ctx.beginPath();
                    ctx.arc(levelX, levelY, levelCircleRadius, 0, Math.PI * 2);
                    ctx.fill();

                    const fontSize = 10;
                    ctx.font = `bold ${fontSize}px Arial`;
                    ctx.fillStyle = 'white'; // 흰색 글자
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(this.level, levelX, levelY); // 레벨 숫자 표시
                }
                // currentBarY += barHeight + barGap; // 다음 바 위치로 이동 (현재는 체력바가 마지막)
            }
        }

        // 왕 유닛 스폰 쿨타임 바
        if (kingSpawnBarIsVisible) {
            // 이름표 아래에 위치
            const spawnBarY = this.pixelY + GRID_SIZE * 0.8 * totalScale + (this.name ? 12 : 2);
            ctx.fillStyle = '#450a0a'; // 배경색 (진한 빨강)
            ctx.fillRect(barX, spawnBarY, barWidth, barHeight);
            const progress = 1 - (this.spawnCooldown / this.spawnInterval); // 진행률 계산
            ctx.fillStyle = '#ef4444'; // 진행률 색 (빨강)
            ctx.fillRect(barX, spawnBarY, barWidth * progress, barHeight);
        }

         // [🌟 MODIFIED] 스킬 쿨타임 원형 테두리 그리기
        if (specialSkillIsVisible) {
            let fgColor, progress = 0, max = 1;

            // 무기 타입별 색상 및 진행률 계산
            if (this.weapon?.type === 'fire_staff') {
                fgColor = '#ef4444'; // 빨강
                progress = max - this.fireStaffSpecialCooldown; max = 240;
            } else if (this.weapon?.type === 'magic_spear') {
                fgColor = '#a855f7'; // 보라
                progress = max - this.magicCircleCooldown; max = 300;
            } else if (['boomerang', 'shuriken', 'poison_potion', 'magic_dagger', 'dual_swords'].includes(this.weapon?.type)) {
                fgColor = '#94a3b8'; // 회색
                if(this.weapon.type === 'boomerang') {
                    progress = max - this.boomerangCooldown; max = 480;
                } else if(this.weapon.type === 'shuriken') {
                    progress = max - this.shurikenSkillCooldown; max = 300; // 표창 스킬 쿨타임 반영
                } else if(this.weapon.type === 'magic_dagger') {
                    progress = max - this.magicDaggerSkillCooldown; max = 420;
                } else if(this.weapon.type === 'dual_swords') {
                     progress = max - this.dualSwordSkillCooldown; max = 300;
                } else { // 독 포션 캐스팅
                    progress = this.castingProgress; max = this.castDuration;
                }
            } else if (this.weapon?.type === 'ice_diamond') {
                fgColor = '#38bdf8'; // 파랑
                progress = this.iceDiamondChargeTimer; max = 240;
            }

            if (fgColor) {
                ctx.save();
                ctx.lineWidth = 3; // 테두리 두께
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'; // 배경 테두리 색
                // 유닛 크기에 맞춰 반지름 조정
                const radius = (GRID_SIZE / 1.67 + 3) * totalScale;
                // 배경 원 그리기
                ctx.beginPath();
                ctx.arc(this.pixelX, this.pixelY, radius, 0, Math.PI * 2);
                ctx.stroke();

                // 진행률 테두리 그리기
                ctx.strokeStyle = fgColor; // 스킬별 색상
                ctx.beginPath();
                const startAngle = -Math.PI / 2; // 위쪽에서 시작
                const endAngle = startAngle + (progress / max) * Math.PI * 2; // 진행률만큼 각도 계산
                ctx.arc(this.pixelX, this.pixelY, radius, startAngle, endAngle);
                ctx.stroke();
                ctx.restore();
            }
        }


        // 경계 상태 표시 (!)
        const showAlert = this.alertedCounter > 0 || (this.weapon?.type === 'magic_spear' && this.target instanceof Unit && this.target.stunnedByMagicCircle);
        if (showAlert && this.state !== 'FLEEING_FIELD' && this.state !== 'FLEEING_LAVA') {
            const yOffset = -GRID_SIZE * totalScale; // 유닛 위쪽 위치 조정
            ctx.fillStyle = 'yellow';
            ctx.font = `bold ${20 * totalScale}px Arial`; // 스케일 적용
            ctx.textAlign = 'center';
            // 상태에 따라 다른 문자 표시
            ctx.fillText(this.state === 'SEEKING_HEAL_PACK' ? '+' : '!', this.pixelX, this.pixelY + yOffset);
        }
    }


    // ... (performDualSwordTeleportAttack 함수는 그대로 유지) ...
    performDualSwordTeleportAttack(enemies) {
        const target = this.dualSwordTeleportTarget;
        if (target && target.hp > 0) {
            const teleportPos = this.gameManager.findEmptySpotNear(target);
            this.pixelX = teleportPos.x;
            this.pixelY = teleportPos.y;
            this.dualSwordSpinAttackTimer = 20; // 회전 애니메이션 타이머

            const damageRadius = GRID_SIZE * 2;
            enemies.forEach(enemy => {
                if (Math.hypot(this.pixelX - enemy.pixelX, this.pixelY - enemy.pixelY) < damageRadius) {
                    enemy.takeDamage(this.attackPower * 1.5 + this.specialAttackLevelBonus, {}, this); // 레벨 보너스 추가
                }
            });
            this.gameManager.nexuses.forEach(nexus => { // 넥서스도 공격
                 if (nexus.team !== this.team && !nexus.isDestroying && Math.hypot(this.pixelX - nexus.pixelX, this.pixelY - nexus.pixelY) < damageRadius) {
                    nexus.takeDamage(this.attackPower * 1.5 + this.specialAttackLevelBonus); // 레벨 보너스 추가
                 }
            });
            this.gameManager.audioManager.play('rotaryknife'); // 회전베기 효과음
        }
        this.dualSwordTeleportTarget = null; // 타겟 초기화
        this.state = 'IDLE'; // 상태 초기화
    }

}
