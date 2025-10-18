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
        this.axeSkillCooldown = 0;
        this.spinAnimationTimer = 0;
        this.iceDiamondCharges = 0;
        this.iceDiamondChargeTimer = 0;
        this.fireStaffSpecialCooldown = 0;
        this.isSlowed = 0;
        this.attackCount = 0;
        this.swordSpecialAttackAnimationTimer = 0;

        // [신규] 검, 활 3타 준비 상태 (weaponary.js에서 갱신됨)
        this.isSwordReady = false;
        this.isBowReady = false;

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
    }

    // --- 나머지 getter, equipWeapon, levelUp, findClosest, applyPhysics, move, attack, takeDamage, handleDeath 메소드는 이전과 동일 ---
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

    equipWeapon(weaponType, isClone = false) {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        this.weapon = gameManager.createWeapon(0, 0, weaponType);
        gameManager.audioManager.play('equip');
        if (this.weapon.type === 'crown' && !isClone) {
            this.isKing = true;
        }
        this.state = 'IDLE';
        // 무기 장착 시 3타 카운트 초기화
        this.attackCount = 0;
        this.isSwordReady = false;
        this.isBowReady = false;
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
                this.weapon.use(this, target); // weaponary.js의 use 함수에서 attackCount 및 isReady 상태 업데이트
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
            // 현재 체력과 표시 체력의 차이에 비례하여 빠르게 감소 (0.1은 속도 조절 계수)
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

        // --- 마법 단검 스킬 조준 로직 ---
        if (this.weapon && this.weapon.type === 'magic_dagger' && !this.isAimingMagicDagger && this.magicDaggerSkillCooldown <= 0 && this.attackCooldown <= 0) {
            const { item: closestEnemy } = this.findClosest(enemies);
            if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy)) {
                const dist = Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY);
                if (dist < this.detectionRange) { // 탐지 범위 내에 적이 있으면 조준 시작
                    this.isAimingMagicDagger = true;
                    this.magicDaggerAimTimer = 60; // 조준 시간 (1초)
                    const angle = Math.atan2(closestEnemy.pixelY - this.pixelY, closestEnemy.pixelX - this.pixelX);
                    const dashDistance = GRID_SIZE * 4; // 돌진 거리
                    this.magicDaggerTargetPos = {
                        x: this.pixelX + Math.cos(angle) * dashDistance,
                        y: this.pixelY + Math.sin(angle) * dashDistance
                    };
                    this.moveTarget = null; // 조준 중에는 이동 멈춤
                    this.state = 'CASTING'; // 상태 변경 (옵션)
                }
            }
        }

        // --- 마법 단검 스킬 실행 로직 ---
        if (this.isAimingMagicDagger) {
            this.magicDaggerAimTimer -= gameManager.gameSpeed;
            if (this.magicDaggerAimTimer <= 0) {
                this.isAimingMagicDagger = false;
                this.magicDaggerSkillCooldown = 420; // 스킬 쿨다운 (7초)
                this.attackCooldown = 30; // 공격 후 짧은 딜레이

                const startPos = { x: this.pixelX, y: this.pixelY };
                const endPos = this.magicDaggerTargetPos;

                // 돌진 경로 상의 적에게 데미지 및 스턴
                enemies.forEach(enemy => {
                     // 점과 직선 사이의 거리 공식 활용
                    const distToLine = Math.abs((endPos.y - startPos.y) * enemy.pixelX - (endPos.x - startPos.x) * enemy.pixelY + endPos.x * startPos.y - endPos.y * startPos.x) / Math.hypot(endPos.y - startPos.y, endPos.x - startPos.x);
                    // 경로 위에 있고, 시작점과 끝점 사이에 있는지 확인 (넉넉하게 GRID_SIZE 추가)
                    const lineLength = Math.hypot(endPos.x - startPos.x, endPos.y - startPos.y);
                    const distStart = Math.hypot(enemy.pixelX - startPos.x, enemy.pixelY - startPos.y);
                    const distEnd = Math.hypot(enemy.pixelX - endPos.x, enemy.pixelY - endPos.y);

                    if (distToLine < GRID_SIZE && distStart <= lineLength + GRID_SIZE && distEnd <= lineLength + GRID_SIZE) {
                        enemy.takeDamage(this.attackPower * 1.2, { stun: 60 }, this);
                    }
                });

                // 순간이동
                this.pixelX = endPos.x;
                this.pixelY = endPos.y;

                gameManager.effects.push(new MagicDaggerDashEffect(gameManager, startPos, endPos)); // 돌진 이펙트
                gameManager.audioManager.play('rush'); // 돌진 사운드

                // 파티클 효과
                for (let i = 0; i < 15; i++) {
                    const angle = gameManager.random() * Math.PI * 2;
                    const speed = 1 + gameManager.random() * 2;
                    gameManager.addParticle({
                        x: endPos.x, y: endPos.y,
                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                        life: 0.6,
                        color: ['#c084fc', '#a855f7', '#f5d0fe'][Math.floor(gameManager.random() * 3)],
                        size: gameManager.random() * 2 + 1, gravity: 0.05
                    });
                }
                this.state = 'IDLE'; // 스킬 사용 후 상태 초기화
                this.applyPhysics(); // 물리 효과 적용 (벽 통과 방지 등)
                return; // 스킬 사용 후에는 다른 동작 중지
            }
            // 조준 중에는 물리 효과만 적용하고 다른 행동 X
            this.applyPhysics();
            return;
        }


        // --- 기존 상태 결정 로직 ---
        if (this.weapon && this.weapon.type === 'magic_spear') {
            if (this.magicCircleCooldown <= 0) {
                gameManager.spawnMagicCircle(this.team);
                this.magicCircleCooldown = 300;
            }
            const stunnedEnemy = gameManager.findStunnedByMagicCircleEnemy(this.team);
            if (stunnedEnemy && this.attackCooldown <= 0) {
                this.alertedCounter = 60;
                this.target = stunnedEnemy;
                // weaponary.js의 use 함수에서 처리되도록 수정
                // gameManager.createProjectile(this, stunnedEnemy, 'magic_spear_special');
                // gameManager.audioManager.play('spear');
                // this.attackCooldown = this.cooldownTime;
                // return; // 공격 후 바로 리턴
            }
        }
        // ... (boomerang 스킬 로직도 weaponary.js use 함수로 이동)

        // ... (axe 스킬 로직도 weaponary.js use 함수로 이동)


        let newState = 'IDLE';
        let newTarget = null;
        let targetEnemyForAlert = null;

        const currentGridXBeforeMove = Math.floor(this.pixelX / GRID_SIZE);
        const currentGridYBeforeMove = Math.floor(this.pixelY / GRID_SIZE);
        this.isInMagneticField = gameManager.isPosInAnyField(currentGridXBeforeMove, currentGridYBeforeMove);
        this.isInLava = gameManager.isPosInLavaForUnit(currentGridXBeforeMove, currentGridYBeforeMove);

        if (this.isInMagneticField) {
            newState = 'FLEEING_FIELD';
        } else if (gameManager.isLavaAvoidanceEnabled && this.isInLava) {
            newState = 'FLEEING_LAVA';
            this.fleeingCooldown = 60;
        } else if (this.fleeingCooldown <= 0) {
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
                targetEnemyForAlert = closestEnemy;
            }

            if (this.isKing && targetEnemy) {
                newState = 'FLEEING'; newTarget = targetEnemy;
            } else if (this.hp < this.maxHp / 2) {
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
        } else {
            if (this.moveTarget) {
                newState = this.state;
            } else {
                newState = 'IDLE';
            }
        }


        if (this.state !== newState && newState !== 'IDLE' && newState !== 'FLEEING_FIELD' && newState !== 'FLEEING_LAVA') {
            if (!(this.weapon && this.weapon.type === 'magic_spear' && this.target instanceof Unit && this.target.stunnedByMagicCircle)) {
                this.alertedCounter = 60;
            }
        }
        this.state = newState;
        this.target = newTarget;

        switch (this.state) {
            case 'FLEEING_FIELD':
                this.moveTarget = gameManager.findClosestSafeSpot(this.pixelX, this.pixelY);
                break;
            case 'FLEEING_LAVA':
                this.moveTarget = gameManager.findClosestSafeSpotFromLava(this.pixelX, this.pixelY);
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
                     // 스킬 사용 로직은 weaponary.js use 함수로 이동
                    // if (this.weapon && this.weapon.type === 'fire_staff' && ...) { ... }
                    // else if (this.weapon && this.weapon.type === 'dual_swords' && ...) { ... }

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

        if (this.moveTarget) {
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


        const finalGridX = Math.floor(this.pixelX / GRID_SIZE);
        const finalGridY = Math.floor(this.pixelY / GRID_SIZE);

        if (this.isInMagneticField) {
            this.takeDamage(0.3 * gameManager.gameSpeed, { isTileDamage: true });
        }

        if (finalGridY >= 0 && finalGridY < gameManager.ROWS && finalGridX >= 0 && finalGridX < gameManager.COLS) {
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

    // --- draw 메소드는 이전과 동일 (weaponary.js에서 isReady 상태를 사용하므로 수정 불필요) ---
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

        ctx.restore(); // 맨 처음 save() 복원

        if (this.name) {
            ctx.fillStyle = this.nameColor;
            ctx.font = `bold 10px Arial`;
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

        // --- 무기 장착 상태 그리기 ---
        ctx.save();
        ctx.translate(this.pixelX, this.pixelY); // 유닛 위치로 이동

        if (this.isKing) {
            const kingTotalScale = 1.2;
            ctx.translate(0, -GRID_SIZE * 0.5); // 왕관 위치 조정
            ctx.scale(kingTotalScale, kingTotalScale);
            ctx.fillStyle = '#facc15'; ctx.strokeStyle = 'black'; ctx.lineWidth = 1 / kingTotalScale;
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.4, -GRID_SIZE * 0.1); ctx.lineTo(-GRID_SIZE * 0.4, GRID_SIZE * 0.2);
            ctx.lineTo(GRID_SIZE * 0.4, GRID_SIZE * 0.2); ctx.lineTo(GRID_SIZE * 0.4, -GRID_SIZE * 0.1);
            ctx.lineTo(GRID_SIZE * 0.2, 0); ctx.lineTo(0, -GRID_SIZE * 0.1);
            ctx.lineTo(-GRID_SIZE * 0.2, 0); ctx.closePath();
            ctx.fill(); ctx.stroke();
        } else if (this.weapon) {
            // weaponary.js의 drawEquipped 호출 (내부에서 isReady 상태 확인 및 테두리 그림)
            this.weapon.drawEquipped(ctx, { ...this, pixelX: 0, pixelY: 0 }); // 유닛 좌표는 0,0으로 전달
        }
        ctx.restore(); // 무기 그리기 복원


        // --- UI 바 그리기 (체력, 공격 쿨다운 등) ---
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

        // 공격 쿨다운 중에는 스킬 쿨다운 바 숨김 (일반 공격 후 스킬 쿨다운 표시 방지)
        if (this.attackCooldown > 0 && !this.isCasting) {
            specialSkillIsVisible = false;
        }

        const barsToShow = [];
        if (normalAttackIsVisible) barsToShow.push('attack');
        if (healthBarIsVisible) barsToShow.push('health');

        if (barsToShow.length > 0) {
            const kingYOffset = this.isKing ? GRID_SIZE * 0.4 * totalScale : 0;
            const totalBarsHeight = (barsToShow.length * barHeight) + ((barsToShow.length - 1) * barGap);

            // [수정] 체력바 위치를 더 위로 조정 (기존 0.6 -> 0.9)
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
                // [수정] 부드러운 체력 감소 효과 렌더링 로직
                ctx.fillStyle = '#111827'; // 배경
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

        // --- 스킬 쿨다운 시각화 (원형 게이지) ---
        if (specialSkillIsVisible) {
            let fgColor, progress = 0, max = 1;

            if (this.weapon?.type === 'fire_staff') {
                fgColor = '#ef4444'; // 빨강
                progress = 240 - this.fireStaffSpecialCooldown; max = 240;
            } else if (this.weapon?.type === 'magic_spear') {
                fgColor = '#a855f7'; // 보라
                progress = 300 - this.magicCircleCooldown; max = 300;
            } else if (['boomerang', 'shuriken', 'poison_potion', 'magic_dagger', 'axe', 'dual_swords'].includes(this.weapon?.type)) {
                fgColor = '#94a3b8'; // 회색
                if(this.weapon.type === 'boomerang') {
                    progress = 480 - this.boomerangCooldown; max = 480;
                } else if(this.weapon.type === 'shuriken') {
                     // weaponary.js에서 쿨다운이 480으로 설정됨
                    progress = 480 - this.shurikenSkillCooldown; max = 480;
                } else if(this.weapon.type === 'magic_dagger') {
                    progress = 420 - this.magicDaggerSkillCooldown; max = 420;
                } else if(this.weapon.type === 'axe') {
                    progress = 240 - this.axeSkillCooldown; max = 240;
                } else if(this.weapon.type === 'dual_swords') {
                    progress = 300 - this.dualSwordSkillCooldown; max = 300;
                } else { // poison_potion casting
                    progress = this.castingProgress; max = this.castDuration;
                }
            } else if (this.weapon?.type === 'ice_diamond') {
                fgColor = '#38bdf8'; // 하늘색
                progress = this.iceDiamondChargeTimer; max = 240;
            }

            if (fgColor) {
                ctx.save();
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'; // 배경 원
                const radius = (GRID_SIZE / 1.67 + 3) * totalScale; // 유닛 크기에 맞게 조절
                ctx.beginPath();
                ctx.arc(this.pixelX, this.pixelY, radius, 0, Math.PI * 2);
                ctx.stroke();

                ctx.strokeStyle = fgColor; // 진행률 원
                ctx.beginPath();
                const startAngle = -Math.PI / 2; // 12시 방향에서 시작
                const endAngle = startAngle + (progress / max) * Math.PI * 2;
                ctx.arc(this.pixelX, this.pixelY, radius, startAngle, endAngle);
                ctx.stroke();
                ctx.restore();
            }
        }

        // --- 경고 표시 (!) ---
        const showAlert = this.alertedCounter > 0 || (this.weapon?.type === 'magic_spear' && this.target instanceof Unit && this.target.stunnedByMagicCircle);
        if (showAlert && this.state !== 'FLEEING_FIELD' && this.state !== 'FLEEING_LAVA') {
            const yOffset = -GRID_SIZE * totalScale; // 유닛 크기에 맞게 조절
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
            this.dualSwordSpinAttackTimer = 20; // 회전 애니메이션 시작

            const damageRadius = GRID_SIZE * 2;
            enemies.forEach(enemy => {
                if (Math.hypot(this.pixelX - enemy.pixelX, this.pixelY - enemy.pixelY) < damageRadius) {
                    enemy.takeDamage(this.attackPower * 1.5, {}, this);
                }
            });
            this.gameManager.audioManager.play('rotaryknife'); // 회전 베기 사운드
        }
        this.dualSwordTeleportTarget = null; // 타겟 초기화
        this.state = 'IDLE'; // 상태 초기화
    }

}
