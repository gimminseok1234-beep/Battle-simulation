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
        this.displayHp = 100;
        this.damageFlash = 0;

        // 레벨업 시스템 속성
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
        this.axeSkillCooldown = 0; // [🪓 MODIFIED] 도끼 스킬 쿨다운 추가
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

        this.isSpecialAttackReady = false;
    }

    // ... (getters: speed, attackPower, attackRange, detectionRange는 그대로 유지) ...
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

    // [🪓 MODIFIED] 도끼 쿨타임 조정 추가
    get cooldownTime() {
        let finalCooldown = this.baseCooldownTime + (this.weapon ? this.weapon.attackCooldownBonus || 0 : 0);
        finalCooldown *= (1 - (this.level - 1) * 0.04);

        if (this.weapon && this.weapon.type === 'fire_staff') return Math.max(20, Math.min(finalCooldown, 120));
        if (this.weapon && this.weapon.type === 'hadoken') return Math.max(20, Math.min(finalCooldown, 120));
        if (this.weapon && this.weapon.type === 'axe') return Math.max(20, Math.min(finalCooldown, 120)); // 도끼 쿨타임 제한 추가
        if (this.weapon && this.weapon.type === 'ice_diamond') return Math.max(20, Math.min(finalCooldown, 180));

        return Math.max(20, finalCooldown);
    }

    // ... (equipWeapon, levelUp, findClosest, applyPhysics, move, attack, takeDamage, handleDeath 함수는 이전과 동일) ...
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
                'magic_spear', 'boomerang', 'hadoken', 'shuriken', 'axe' // 도끼 추가
            ];

            if (skillAttackWeapons.includes(weaponType)) {
                if (weaponType === 'shuriken') {
                    this.specialAttackLevelBonus += 5 * levelGained;
                } else {
                    this.specialAttackLevelBonus += 10 * levelGained;
                }
            } else { // 검, 활 등
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
            } else { // 맵 밖으로 밀려날 경우 (처리 보강)
                this.pixelX = nextX;
                this.pixelY = nextY;
            }
        }

        this.knockbackX *= 0.9;
        this.knockbackY *= 0.9;
        if (Math.abs(this.knockbackX) < 0.1) this.knockbackX = 0;
        if (Math.abs(this.knockbackY) < 0.1) this.knockbackY = 0;

        // 유닛 간 충돌 처리
        gameManager.units.forEach(otherUnit => {
            if (this !== otherUnit) {
                const dx = otherUnit.pixelX - this.pixelX;
                const dy = otherUnit.pixelY - this.pixelY;
                const distance = Math.hypot(dx, dy);
                const minDistance = (GRID_SIZE / 1.67) * 2; // 유닛 반지름 * 2

                if (distance < minDistance && distance > 0) {
                    const angle = Math.atan2(dy, dx);
                    const overlap = minDistance - distance;
                    const moveX = (overlap / 2) * Math.cos(angle);
                    const moveY = (overlap / 2) * Math.sin(angle);

                    // 다음 예상 위치
                    const myNextX = this.pixelX - moveX;
                    const myNextY = this.pixelY - moveY;
                    const otherNextX = otherUnit.pixelX + moveX;
                    const otherNextY = otherUnit.pixelY + moveY;

                    // 다음 위치가 벽인지 확인
                    const myGridX = Math.floor(myNextX / GRID_SIZE);
                    const myGridY = Math.floor(myNextY / GRID_SIZE);
                    const otherGridX = Math.floor(otherNextX / GRID_SIZE);
                    const otherGridY = Math.floor(otherNextY / GRID_SIZE);

                    const isMyNextPosWall = (myGridY < 0 || myGridY >= gameManager.ROWS || myGridX < 0 || myGridX >= gameManager.COLS) ||
                        (gameManager.map[myGridY][myGridX].type === TILE.WALL || gameManager.map[myGridY][myGridX].type === TILE.CRACKED_WALL);

                    const isOtherNextPosWall = (otherGridY < 0 || otherGridY >= gameManager.ROWS || otherGridX < 0 || otherGridX >= gameManager.COLS) ||
                        (gameManager.map[otherGridY][otherGridX].type === TILE.WALL || gameManager.map[otherGridY][otherGridX].type === TILE.CRACKED_WALL);

                    // 벽이 아니면 위치 조정
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

        // 맵 경계 충돌 처리
        const radius = GRID_SIZE / 1.67; // 유닛 반지름
        let bounced = false;
        if (this.pixelX < radius) {
            this.pixelX = radius;
            this.knockbackX = Math.abs(this.knockbackX) * 0.5 || 1; // 튕겨나감
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

        // 튕겨나갔고 IDLE 상태면 이동 목표 초기화
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

        // 용암 회피 로직
        if (gameManager.isLavaAvoidanceEnabled && this.state !== 'FLEEING_FIELD' && this.state !== 'FLEEING_LAVA') {
            const lookAheadDist = GRID_SIZE * 1.2; // 조금 앞 예측
            const lookAheadX = this.pixelX + Math.cos(angle) * lookAheadDist;
            const lookAheadY = this.pixelY + Math.sin(angle) * lookAheadDist;

            const lookAheadGridX = Math.floor(lookAheadX / GRID_SIZE);
            const lookAheadGridY = Math.floor(lookAheadY / GRID_SIZE);

            // 예측 지점이 용암이면 우회 시도
            if (gameManager.isPosInLavaForUnit(lookAheadGridX, lookAheadGridY)) {
                const detourAngle = Math.PI / 3; // 60도 우회 각도
                let bestAngle = -1;

                // 좌/우 각도 계산
                const leftAngle = angle - detourAngle;
                const rightAngle = angle + detourAngle;

                // 좌/우 예측 지점 계산 및 안전 확인
                const leftLookAheadX = this.pixelX + Math.cos(leftAngle) * lookAheadDist;
                const leftLookAheadY = this.pixelY + Math.sin(leftAngle) * lookAheadDist;
                const isLeftSafe = !gameManager.isPosInLavaForUnit(Math.floor(leftLookAheadX / GRID_SIZE), Math.floor(leftLookAheadY / GRID_SIZE));

                const rightLookAheadX = this.pixelX + Math.cos(rightAngle) * lookAheadDist;
                const rightLookAheadY = this.pixelY + Math.sin(rightAngle) * lookAheadDist;
                const isRightSafe = !gameManager.isPosInLavaForUnit(Math.floor(rightLookAheadX / GRID_SIZE), Math.floor(rightLookAheadY / GRID_SIZE));

                // 안전한 방향 선택 (둘 다 안전하면 원래 방향과 가까운 쪽)
                if (isLeftSafe && isRightSafe) {
                    bestAngle = Math.abs(leftAngle - angle) < Math.abs(rightAngle - angle) ? leftAngle : rightAngle;
                } else if (isLeftSafe) {
                    bestAngle = leftAngle;
                } else if (isRightSafe) {
                    bestAngle = rightAngle;
                }

                // 안전한 우회 각도가 있으면 적용
                if (bestAngle !== -1) {
                    angle = bestAngle;
                }
                // 안전한 방향 없으면 그냥 직진 (어쩔 수 없이 용암 통과)
            }
        }

        // 다음 위치 계산
        const nextPixelX = this.pixelX + Math.cos(angle) * currentSpeed;
        const nextPixelY = this.pixelY + Math.sin(angle) * currentSpeed;
        const nextGridX = Math.floor(nextPixelX / GRID_SIZE);
        const nextGridY = Math.floor(nextPixelY / GRID_SIZE);

        // 벽 충돌 처리
        if (nextGridY >= 0 && nextGridY < gameManager.ROWS && nextGridX >= 0 && nextGridX < gameManager.COLS) {
            const collidedTile = gameManager.map[nextGridY][nextGridX];
            if (collidedTile.type === TILE.WALL || collidedTile.type === TILE.CRACKED_WALL || collidedTile.type === TILE.GLASS_WALL) {
                if (collidedTile.type === TILE.CRACKED_WALL) { // 부서지는 벽이면 파괴 시도
                    gameManager.damageTile(nextGridX, nextGridY, this.attackPower); // 약한 데미지
                }
                // 벽에 부딪히면 튕겨나감
                const bounceAngle = this.facingAngle + Math.PI + (gameManager.random() - 0.5); // 반대 방향 + 랜덤
                this.knockbackX += Math.cos(bounceAngle) * 1.5;
                this.knockbackY += Math.sin(bounceAngle) * 1.5;
                this.moveTarget = null; // 이동 목표 제거
                return; // 이동 중지
            }
        } else { // 맵 밖으로 나가려고 하면
             // 튕겨나감 (applyPhysics 에서 처리될 것임)
             this.moveTarget = null;
             return;
        }

        // 이동 및 방향 전환
        this.facingAngle = angle;
        this.pixelX = nextPixelX;
        this.pixelY = nextPixelY;
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

        // 부서지는 벽 공격
        if (tile.type === TILE.CRACKED_WALL) {
            gameManager.damageTile(targetGridX, targetGridY, this.attackPower);
            this.attackCooldown = this.cooldownTime;
            this.attackAnimationTimer = 15; // 공격 애니메이션
        }
        // 유닛 또는 넥서스 공격
        else if (target instanceof Unit || target instanceof Nexus) {
            if (this.weapon) { // 무기 사용
                this.weapon.use(this, target);
            } else { // 맨손 공격
                target.takeDamage(this.attackPower, {}, this);
                gameManager.audioManager.play('punch');
                this.attackCooldown = this.cooldownTime;
                this.attackAnimationTimer = 15; // 공격 애니메이션
            }
        }
    }

    takeDamage(damage, effectInfo = {}, attacker = null) {
        const gameManager = this.gameManager;
        // 데미지가 있고 타일 데미지가 아니면 피격 이펙트 생성
        if (gameManager && damage > 0 && !effectInfo.isTileDamage) {
            createPhysicalHitEffect(gameManager, this);
        }
        this.hp -= damage; // 체력 감소
        this.hpBarVisibleTimer = 180; // 체력바 표시 타이머 활성화
        this.damageFlash = 1.0; // 피격 시 흰색 깜빡임 효과 활성화

        // 마지막 공격자 기록
        if (attacker && attacker instanceof Unit) {
            this.killedBy = attacker;
        }
        // 체력이 0 이하가 된 순간의 공격자 기록
        if (this.hp <= 0 && !this.killedBy && attacker) {
            this.killedBy = attacker;
        }

        // 캐스팅 방해 효과
        if (effectInfo.interrupt) {
            // 표창, 번개 외 무기 또는 강제 방해 시 캐스팅 취소
            if (!['shuriken', 'lightning'].includes(this.weapon?.type) || effectInfo.force > 0) {
                this.isCasting = false;
                this.castingProgress = 0;
            }
        }
        // 넉백 효과
        if (effectInfo.force && effectInfo.force > 0) {
            this.knockbackX += Math.cos(effectInfo.angle) * effectInfo.force;
            this.knockbackY += Math.sin(effectInfo.angle) * effectInfo.force;
        }
        // 스턴 효과
        if (effectInfo.stun) {
            if (this.isStunned <= 0) { // 스턴이 처음 걸릴 때 효과음 재생
                gameManager.audioManager.play('stern');
            }
            this.isStunned = Math.max(this.isStunned, effectInfo.stun); // 스턴 시간 갱신 (더 긴 시간으로)
            // 마법진 스턴 여부 기록
            if (effectInfo.stunSource === 'magic_circle') {
                this.stunnedByMagicCircle = true;
            }
        }
        // 독 효과
        if (effectInfo.poison) {
            this.poisonEffect.active = true;
            this.poisonEffect.duration = 180; // 3초 지속
            this.poisonEffect.damage = effectInfo.poison.damage; // 독 데미지 설정
        }
        // 둔화 효과
        if (effectInfo.slow) {
            this.isSlowed = Math.max(this.isSlowed, effectInfo.slow); // 둔화 시간 갱신
        }
    }

    handleDeath() {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        // 독 포션 유닛 사망 시 독구름 생성
        if (this.weapon && this.weapon.type === 'poison_potion') {
            gameManager.castAreaSpell({ x: this.pixelX, y: this.pixelY }, 'poison_cloud', this.team, this.specialAttackLevelBonus);
        }
        // 추가적인 사망 처리 로직 (예: 아이템 드랍 등)을 여기에 추가 가능
    }


    update(enemies, weapons, projectiles) {
        const gameManager = this.gameManager;
        if (!gameManager) {
            return;
        }

        // 부드러운 체력바 감소 및 피격 효과 처리
        if (this.displayHp > this.hp) {
            this.displayHp -= (this.displayHp - this.hp) * 0.1 * this.gameManager.gameSpeed; // 부드럽게 감소
            if (this.displayHp < this.hp) this.displayHp = this.hp; // 실제 체력보다 낮아지지 않도록
        } else {
            this.displayHp = this.hp;
        }
        if (this.damageFlash > 0) {
            this.damageFlash -= 0.05 * this.gameManager.gameSpeed; // 깜빡임 효과 점차 감소
        }


        // 레벨업 파티클 효과 (레벨 2 이상, 레벨업 시스템 활성화 시)
        if (this.level >= 2 && gameManager.isLevelUpEnabled) {
            this.levelUpParticleCooldown -= gameManager.gameSpeed;
            if (this.levelUpParticleCooldown <= 0) {
                this.levelUpParticleCooldown = 15 - this.level; // 레벨 높을수록 자주 발생

                // 팀 색상 가져오기
                let teamColor;
                switch(this.team) {
                    case TEAM.A: teamColor = DEEP_COLORS.TEAM_A; break;
                    case TEAM.B: teamColor = DEEP_COLORS.TEAM_B; break;
                    case TEAM.C: teamColor = DEEP_COLORS.TEAM_C; break;
                    case TEAM.D: teamColor = DEEP_COLORS.TEAM_D; break;
                    default: teamColor = '#FFFFFF'; break;
                }

                const particleCount = (this.level - 1) * 2; // 레벨 비례 파티클 수
                for (let i = 0; i < particleCount; i++) {
                    const angle = gameManager.random() * Math.PI * 2;
                    const radius = GRID_SIZE / 1.67; // 유닛 반지름
                    // 유닛 가장자리에서 생성
                    const spawnX = this.pixelX + Math.cos(angle) * radius;
                    const spawnY = this.pixelY + Math.sin(angle) * radius;
                    const speed = 0.5 + gameManager.random() * 0.5; // 느린 속도

                    // 파티클 추가
                    gameManager.addParticle({
                        x: spawnX, y: spawnY,
                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, // 바깥쪽으로 퍼짐
                        life: 0.6, // 짧은 수명
                        color: teamColor,
                        size: this.level * 0.5 + gameManager.random() * this.level, // 레벨 비례 크기
                        gravity: -0.02 // 살짝 위로 떠오름
                    });
                }
            }
        }

        // 대시 상태 업데이트
        if (this.isDashing) {
            this.dashTrail.push({ x: this.pixelX, y: this.pixelY }); // 궤적 추가
            if (this.dashTrail.length > 5) this.dashTrail.shift(); // 최대 5개 유지

            // 대시 방향에 따른 이동량 계산
            let moveX = 0, moveY = 0;
            switch (this.dashDirection) {
                case 'RIGHT': moveX = this.dashSpeed; break;
                case 'LEFT': moveX = -this.dashSpeed; break;
                case 'DOWN': moveY = this.dashSpeed; break;
                case 'UP': moveY = -this.dashSpeed; break;
            }

            // 게임 속도만큼 반복하여 이동 및 충돌 처리
            for (let i = 0; i < gameManager.gameSpeed; i++) {
                const nextX = this.pixelX + moveX;
                const nextY = this.pixelY + moveY;
                const gridX = Math.floor(nextX / GRID_SIZE);
                const gridY = Math.floor(nextY / GRID_SIZE);

                // 맵 밖으로 나가면 대시 중지
                if (gridY < 0 || gridY >= gameManager.ROWS || gridX < 0 || gridX >= gameManager.COLS) {
                    this.isDashing = false;
                    break;
                }

                const tile = gameManager.map[gridY][gridX];
                // 벽에 부딪히면 대시 중지
                if (tile.type === TILE.WALL) {
                    this.isDashing = false;
                    break;
                }
                // 부서지는 벽은 파괴
                if (tile.type === TILE.CRACKED_WALL) {
                    gameManager.damageTile(gridX, gridY, 999);
                }

                // 이동 및 남은 거리 감소
                this.pixelX = nextX;
                this.pixelY = nextY;
                this.dashDistanceRemaining -= this.dashSpeed;

                // 목표 거리 도달 시 대시 중지
                if (this.dashDistanceRemaining <= 0) {
                    this.isDashing = false;
                    break;
                }
            }
            // 대시 끝나면 궤적 제거
            if (!this.isDashing) this.dashTrail = [];
            return; // 대시 중에는 다른 행동 X
        }

        // 체력바 표시 타이머 감소
        if (this.hpBarVisibleTimer > 0) this.hpBarVisibleTimer--;

        // 부메랑에 끌려가는 상태 업데이트
        if (this.isBeingPulled && this.puller) {
            const dx = this.pullTargetPos.x - this.pixelX;
            const dy = this.pullTargetPos.y - this.pixelY;
            const dist = Math.hypot(dx, dy);
            const pullSpeed = 4; // 끌려가는 속도

            // 목표 지점 도달 시
            if (dist < pullSpeed * gameManager.gameSpeed) {
                this.pixelX = this.pullTargetPos.x;
                this.pixelY = this.pullTargetPos.y;
                this.isBeingPulled = false; // 상태 종료

                // 데미지 및 스턴 적용
                const damage = 20 + (this.puller.specialAttackLevelBonus || 0);
                this.takeDamage(damage, { stun: 120 }, this.puller);

                this.puller = null; // 부메랑 시전자 정보 제거
            } else { // 목표 지점으로 이동
                const angle = Math.atan2(dy, dx);
                this.pixelX += Math.cos(angle) * pullSpeed * gameManager.gameSpeed;
                this.pixelY += Math.sin(angle) * pullSpeed * gameManager.gameSpeed;
                this.knockbackX = 0; // 넉백 무시
                this.knockbackY = 0;
            }
            this.applyPhysics(); // 충돌 처리
            return; // 끌려가는 중에는 다른 행동 X
        }

        // 스턴 상태 업데이트
        if (this.isStunned > 0) {
            this.isStunned -= gameManager.gameSpeed; // 스턴 시간 감소
            if (this.isStunned <= 0) {
                this.stunnedByMagicCircle = false; // 마법진 스턴 해제
            }
            this.applyPhysics(); // 충돌 처리만 적용
            return; // 스턴 중에는 다른 행동 X
        }

        // 둔화 상태 업데이트
        if (this.isSlowed > 0) {
            this.isSlowed -= gameManager.gameSpeed;
        }

        // 쌍검 표식 상태 업데이트
        if (this.isMarkedByDualSword.active) {
            this.isMarkedByDualSword.timer -= gameManager.gameSpeed;
            if (this.isMarkedByDualSword.timer <= 0) {
                this.isMarkedByDualSword.active = false;
            }
        }

        // 각성 효과 업데이트 (스택 증가)
        if (this.awakeningEffect.active && this.awakeningEffect.stacks < 3) {
            this.awakeningEffect.timer += gameManager.gameSpeed;
            if (this.awakeningEffect.timer >= 300) { // 5초마다 스택 증가
                this.awakeningEffect.timer = 0;
                this.awakeningEffect.stacks++;
                this.maxHp += 20; // 최대 체력 증가
                this.hp = Math.min(this.maxHp, this.hp + 20); // 체력 회복
                this.baseAttackPower += 3; // 기본 공격력 증가
                gameManager.audioManager.play('Arousal'); // 효과음 재생
                // 각성 파티클 효과
                for (let i = 0; i < 30; i++) { /* ... 파티클 생성 로직 ... */ }
            }
        }

        // 쿨타임 감소
        if (this.magicDaggerSkillCooldown > 0) this.magicDaggerSkillCooldown -= gameManager.gameSpeed;
        if (this.axeSkillCooldown > 0) this.axeSkillCooldown -= gameManager.gameSpeed; // [🪓 ADDED] 도끼 쿨다운 감소
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

        // 특수 공격 준비 상태 업데이트
        this.updateSpecialAttackReadyStatus();

        // 회피 로직 (표창, 번개 무기)
        if (this.weapon && (this.weapon.type === 'shuriken' || this.weapon.type === 'lightning') && this.evasionCooldown <= 0) {
            for (const p of projectiles) {
                if (p.owner.team === this.team) continue; // 아군 투사체 무시
                const dist = Math.hypot(this.pixelX - p.pixelX, this.pixelY - p.pixelY);
                // 가까운 적 투사체 감지
                if (dist < GRID_SIZE * 3) {
                    const angleToUnit = Math.atan2(this.pixelY - p.pixelY, this.pixelX - p.pixelX);
                    const angleDiff = Math.abs(angleToUnit - p.angle); // 각도 차이
                    // 자신을 향해 날아오는 투사체 감지 (45도 이내)
                    if (angleDiff < Math.PI / 4 || angleDiff > Math.PI * 1.75) {
                        if (gameManager.random() > 0.5) { // 50% 확률로 회피
                            // 투사체 방향과 수직으로 회피 (좌 또는 우 랜덤)
                            const dodgeAngle = p.angle + (Math.PI / 2) * (gameManager.random() < 0.5 ? 1 : -1);
                            const dodgeForce = 4; // 회피 넉백 강도
                            this.knockbackX += Math.cos(dodgeAngle) * dodgeForce;
                            this.knockbackY += Math.sin(dodgeAngle) * dodgeForce;
                            this.evasionCooldown = 30; // 0.5초 회피 쿨타임
                            break; // 한 번만 회피
                        }
                    }
                }
            }
        }

        // 독 효과 업데이트
        if (this.poisonEffect.active) {
            this.poisonEffect.duration -= gameManager.gameSpeed; // 지속 시간 감소
            this.takeDamage(this.poisonEffect.damage * gameManager.gameSpeed, { isTileDamage: true }); // 독 데미지 적용
            if (this.poisonEffect.duration <= 0) {
                this.poisonEffect.active = false; // 효과 종료
            }
        }

        // 얼음 다이아 충전 업데이트
        if (this.weapon && this.weapon.type === 'ice_diamond') {
            if (this.iceDiamondCharges < 5) { // 최대 5개 충전
                this.iceDiamondChargeTimer += gameManager.gameSpeed;
                if (this.iceDiamondChargeTimer >= 240) { // 4초마다 충전
                    this.iceDiamondCharges++;
                    this.iceDiamondChargeTimer = 0;
                }
            }
        }

        // 쌍검 순간이동 딜레이 업데이트
        if (this.dualSwordTeleportDelayTimer > 0) {
            this.dualSwordTeleportDelayTimer -= gameManager.gameSpeed;
            if (this.dualSwordTeleportDelayTimer <= 0) { // 딜레이 끝나면 공격 실행
                this.performDualSwordTeleportAttack(enemies);
            }
        }

        // 왕 유닛 스폰 처리
        if (this.isKing && this.spawnCooldown <= 0) {
            this.spawnCooldown = this.spawnInterval; // 스폰 쿨타임 초기화
            gameManager.spawnUnit(this, false); // 유닛 스폰 (무기 복제 X)
        }

        // 캐스팅 상태 업데이트 (독 포션 자폭)
        if (this.isCasting) {
            this.castingProgress += gameManager.gameSpeed; // 캐스팅 진행
            // 타겟이 죽거나 없어지면 캐스팅 취소
            if (!this.target || (this.target instanceof Unit && this.target.hp <= 0)) {
                this.isCasting = false; this.castingProgress = 0; return;
            }
            // 캐스팅 완료 시
            if (this.castingProgress >= this.castDuration) {
                this.isCasting = false; this.castingProgress = 0;
                if (this.weapon.type === 'poison_potion') {
                    gameManager.audioManager.play('poison'); // poison 효과음
                    this.hp = 0; // 자폭
                    // 사망 처리는 handleDeath에서 함 (독구름 생성)
                }
                // 다른 캐스팅 스킬 추가 가능
            }
            this.applyPhysics(); // 충돌 처리만 적용
            return; // 캐스팅 중에는 다른 행동 X
        }

        // --- 스킬 사용 로직 ---
        // 마법 단검 스킬 (조준 시작)
        if (this.weapon && this.weapon.type === 'magic_dagger' && !this.isAimingMagicDagger && this.magicDaggerSkillCooldown <= 0 && this.attackCooldown <= 0) {
            const { item: closestEnemy } = this.findClosest(enemies);
            if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy)) {
                const dist = Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY);
                if (dist < this.detectionRange) { // 탐지 범위 내 적 발견 시
                    this.isAimingMagicDagger = true; // 조준 시작
                    this.magicDaggerAimTimer = 60; // 1초 조준 시간
                    const angle = Math.atan2(closestEnemy.pixelY - this.pixelY, closestEnemy.pixelX - this.pixelX);
                    const dashDistance = GRID_SIZE * 4; // 대시 거리
                    this.magicDaggerTargetPos = { // 목표 위치 계산
                        x: this.pixelX + Math.cos(angle) * dashDistance,
                        y: this.pixelY + Math.sin(angle) * dashDistance
                    };
                }
            }
        }
        // 마법 단검 스킬 (조준 중 및 발동)
        if (this.isAimingMagicDagger) {
            this.magicDaggerAimTimer -= gameManager.gameSpeed;
            if (this.magicDaggerAimTimer <= 0) { // 조준 시간 끝나면 발동
                this.isAimingMagicDagger = false;
                this.magicDaggerSkillCooldown = 420; // 스킬 쿨타임 (7초)
                this.attackCooldown = 30; // 공격 후 딜레이

                const startPos = { x: this.pixelX, y: this.pixelY };
                const endPos = this.magicDaggerTargetPos;

                // 경로상 적에게 데미지 및 스턴
                enemies.forEach(enemy => { /* ... 데미지 로직 ... */ });

                // 목표 위치로 순간이동
                this.pixelX = endPos.x;
                this.pixelY = endPos.y;

                // 이펙트 및 효과음
                gameManager.effects.push(new MagicDaggerDashEffect(gameManager, startPos, endPos));
                gameManager.audioManager.play('magicdagger');
                // 파티클
                for (let i = 0; i < 15; i++) { /* ... 파티클 생성 로직 ... */ }
                return; // 스킬 사용 후 종료
            }
        }
        // 마법창 스킬 (마법진 스턴 연계)
        else if (this.weapon && this.weapon.type === 'magic_spear') {
             // 마법진 생성 (쿨타임 관리)
            if (this.magicCircleCooldown <= 0) {
                gameManager.spawnMagicCircle(this.team);
                this.magicCircleCooldown = 300; // 5초
            }
            // 스턴된 적 공격
            const stunnedEnemy = gameManager.findStunnedByMagicCircleEnemy(this.team);
            if (stunnedEnemy && this.attackCooldown <= 0) {
                this.alertedCounter = 60; // 경계 상태
                this.target = stunnedEnemy;
                gameManager.createProjectile(this, stunnedEnemy, 'magic_spear_special'); // 특수 공격 발사
                gameManager.audioManager.play('spear');
                this.attackCooldown = this.cooldownTime; // 쿨타임 적용
                return; // 스킬 사용 후 종료
            }
        }
        // 부메랑 스킬 (끌어당기기)
        else if (this.weapon && this.weapon.type === 'boomerang' && this.boomerangCooldown <= 0) {
            const { item: closestEnemy } = this.findClosest(enemies);
            if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy)) {
                const dist = Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY);
                if (dist <= this.attackRange) { // 사거리 내 적 발견 시
                    this.boomerangCooldown = 480; // 스킬 쿨타임 (8초)
                    gameManager.createProjectile(this, closestEnemy, 'boomerang_projectile'); // 특수 부메랑 발사
                    gameManager.audioManager.play('boomerang');
                    this.state = 'IDLE'; // 상태 초기화
                    this.moveTarget = null;
                    this.attackCooldown = 60; // 공격 후 딜레이
                    this.applyPhysics(); // 충돌 처리
                    return; // 스킬 사용 후 종료
                }
            }
        }
        // [🪓 ADDED] 도끼 스킬 (회전 베기)
        else if (this.weapon && this.weapon.type === 'axe' && this.axeSkillCooldown <= 0) {
            const { item: closestEnemy } = this.findClosest(enemies);
            // 근접한 적이 있을 때 발동
            if (closestEnemy && Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY) < GRID_SIZE * 3) {
                this.axeSkillCooldown = 240; // 스킬 쿨타임 (4초)
                this.spinAnimationTimer = 30; // 회전 애니메이션 타이머 (0.5초)
                gameManager.audioManager.play('axe'); // axe 효과음
                gameManager.createEffect('axe_spin_effect', this.pixelX, this.pixelY, this); // 회전 이펙트 생성

                // 주변 범위 데미지
                const damageRadius = GRID_SIZE * 3.5;
                enemies.forEach(enemy => {
                    if (Math.hypot(this.pixelX - enemy.pixelX, this.pixelY - enemy.pixelY) < damageRadius) {
                        enemy.takeDamage(this.attackPower * 1.5 + this.specialAttackLevelBonus, {}, this); // 레벨 보너스 추가
                    }
                });
                // 넥서스에도 데미지
                gameManager.nexuses.forEach(nexus => {
                    if (nexus.team !== this.team && !nexus.isDestroying && Math.hypot(this.pixelX - nexus.pixelX, this.pixelY - nexus.pixelY) < damageRadius) {
                        nexus.takeDamage(this.attackPower * 1.5 + this.specialAttackLevelBonus); // 레벨 보너스 추가
                    }
                });
                // 일반 공격 효과음도 재생 (타격감)
                gameManager.audioManager.play('swordHit');
                this.attackCooldown = this.cooldownTime; // 공격 쿨타임 적용
                return; // 스킬 사용 후 종료
            }
        }
        // 표창 스킬 (3방향 발사)
        else if (this.weapon && this.weapon.type === 'shuriken' && this.shurikenSkillCooldown <= 0) {
             const { item: closestEnemy } = this.findClosest(enemies);
             if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy)) {
                 const dist = Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY);
                 if (dist <= this.attackRange) { // 사거리 내
                     this.weapon.use(this, closestEnemy); // use 함수에서 스킬 발동
                     return; // 스킬 사용 후 종료
                 }
             }
        }
        // 불 지팡이 스킬 (화염구)
        else if (this.weapon && this.weapon.type === 'fire_staff' && this.fireStaffSpecialCooldown <= 0) {
            const { item: closestEnemy } = this.findClosest(enemies);
             if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy)) {
                 const dist = Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY);
                 if (dist <= this.attackRange) { // 사거리 내
                    gameManager.createProjectile(this, closestEnemy, 'fireball_projectile'); // 화염구 발사
                    gameManager.audioManager.play('fireball');
                    this.fireStaffSpecialCooldown = 240; // 쿨타임 (4초)
                    this.attackCooldown = 60; // 공격 후 딜레이
                    return; // 스킬 사용 후 종료
                 }
             }
        }
        // 쌍검 스킬 (튕기는 검 + 순간이동)
        else if (this.weapon && this.weapon.type === 'dual_swords' && this.dualSwordSkillCooldown <= 0) {
             const { item: closestEnemy } = this.findClosest(enemies);
             if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy)) {
                 const distanceToTarget = Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY);
                 if (distanceToTarget <= this.detectionRange * 1.2) { // 탐지 범위보다 넓게
                     gameManager.audioManager.play('shurikenShoot'); // 임시 효과음
                     gameManager.createProjectile(this, closestEnemy, 'bouncing_sword'); // 튕기는 검 발사
                     this.dualSwordSkillCooldown = 300; // 쿨타임 (5초)
                     this.attackCooldown = 60; // 공격 후 딜레이
                     this.moveTarget = null; // 이동 멈춤
                     this.facingAngle = Math.atan2(closestEnemy.pixelY - this.pixelY, closestEnemy.pixelX - this.pixelX); // 방향 전환
                     return; // 스킬 사용 후 종료
                 }
             }
        }


        // --- 상태 결정 로직 (스킬 사용 안 했을 경우) ---
        let newState = 'IDLE';
        let newTarget = null;
        let targetEnemyForAlert = null;

        const currentGridXBeforeMove = Math.floor(this.pixelX / GRID_SIZE);
        const currentGridYBeforeMove = Math.floor(this.pixelY / GRID_SIZE);
        this.isInMagneticField = gameManager.isPosInAnyField(currentGridXBeforeMove, currentGridYBeforeMove);
        this.isInLava = gameManager.isPosInLavaForUnit(currentGridXBeforeMove, currentGridYBeforeMove);

        // 자기장/용암 회피 우선
        if (this.isInMagneticField) { /* ... 회피 로직 ... */ }
        else if (gameManager.isLavaAvoidanceEnabled && this.isInLava) { /* ... 회피 로직 ... */ }
        // 회피 필요 없을 때
        else if (this.fleeingCooldown <= 0) {
            /* ... 적/넥서스/무기/타일 탐색 및 상태 결정 로직 (이전과 동일) ... */
             const enemyNexus = gameManager.nexuses.find(n => n.team !== this.team && !n.isDestroying);
            const { item: closestEnemy, distance: enemyDist } = this.findClosest(enemies);
            const visibleWeapons = weapons.filter(w => !w.isEquipped && gameManager.hasLineOfSightForWeapon(this, w));
            const { item: targetWeapon, distance: weaponDist } = this.findClosest(visibleWeapons);
            let closestQuestionMark = null;
            let questionMarkDist = Infinity;
            if (!this.weapon) {
                const questionMarkTiles = gameManager.getTilesOfType(TILE.QUESTION_MARK);
                const questionMarkPositions = questionMarkTiles.map(pos => ({ pixelX: pos.x * GRID_SIZE + GRID_SIZE / 2, pixelY: pos.y * GRID_SIZE + GRID_SIZE / 2 }));
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
                    const healPackPositions = healPacks.map(pos => ({ pixelX: pos.x * GRID_SIZE + GRID_SIZE / 2, pixelY: pos.y * GRID_SIZE + GRID_SIZE / 2 }));
                    const { item: closestPack, distance: packDist } = this.findClosest(healPackPositions);
                    if (closestPack && packDist < this.detectionRange * 1.5) {
                        newState = 'SEEKING_HEAL_PACK'; newTarget = closestPack;
                    }
                }
            }

            if (newState === 'IDLE') {
                 if (closestQuestionMark && questionMarkDist <= this.detectionRange) {
                    newState = 'SEEKING_QUESTION_MARK'; newTarget = closestQuestionMark;
                } else if (!this.weapon && targetWeapon && weaponDist <= this.detectionRange) {
                    newState = 'SEEKING_WEAPON'; newTarget = targetWeapon;
                } else if (targetEnemy) {
                    newState = 'AGGRESSIVE'; newTarget = targetEnemy;
                } else if (enemyNexus && gameManager.hasLineOfSight(this, enemyNexus) && Math.hypot(this.pixelX - enemyNexus.pixelX, this.pixelY - enemyNexus.pixelY) <= this.detectionRange) {
                    newState = 'ATTACKING_NEXUS'; newTarget = enemyNexus;
                }
            }
        }
        // 회피 쿨타임 중
        else { /* ... 이전 상태 유지 로직 ... */ }

        // 상태 변경 시 경계 상태 활성화
        if (this.state !== newState && newState !== 'IDLE' && newState !== 'FLEEING_FIELD' && newState !== 'FLEEING_LAVA') {
             if (!(this.weapon && this.weapon.type === 'magic_spear' && this.target instanceof Unit && this.target.stunnedByMagicCircle)) {
                this.alertedCounter = 60;
            }
        }
        this.state = newState;
        this.target = newTarget;

        // --- 상태별 행동 처리 (이전과 동일) ---
        switch (this.state) { /* ... 각 상태별 moveTarget 설정 및 행동 로직 ... */ }

        // 이동 실행
        this.move();

        // 물리 효과 적용
        this.applyPhysics();

        // 유닛 막힘 감지 및 처리
        /* ... 막힘 처리 로직 ... */

        // 현재 위치 타일 효과 처리
        /* ... 타일 효과 처리 로직 (회복, 텔포, 복제, 물음표, 돌진, 각성 등) ... */
    }


    // [🪓 MODIFIED] 특수 공격 준비 상태 업데이트 함수 (도끼 추가)
    updateSpecialAttackReadyStatus() {
        if (!this.weapon) {
            this.isSpecialAttackReady = false;
            return;
        }

        switch (this.weapon.type) {
            case 'sword':
            case 'bow':
                this.isSpecialAttackReady = this.attackCount >= 2;
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
            case 'axe': // [🪓 ADDED] 도끼 추가
                this.isSpecialAttackReady = this.axeSkillCooldown <= 0;
                break;
            default:
                this.isSpecialAttackReady = false;
        }
    }

    // [🎨 REMOVED] draw 함수 내 빛 이펙트 그리는 로직 제거 (weaponary.js로 이동)
    draw(ctx, isOutlineEnabled, outlineWidth) {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        // --- 유닛 기본 그리기, 크기 조정, 상태 효과 등 (이전과 동일) ---
        ctx.save();
        const scale = 1 + this.awakeningEffect.stacks * 0.2;
        const levelScale = 1 + (this.level - 1) * 0.08;
        const totalScale = scale * levelScale;

        // 각성 오라
        if (this.awakeningEffect.active) { /* ... 오라 그리기 ... */ }
        // 마법 단검 조준선
        if (this.isAimingMagicDagger) { /* ... 조준선 그리기 ... */ }
        // 대시 궤적
        if (this.isDashing) { /* ... 궤적 그리기 ... */ }

        // 유닛 몸통 스케일 적용
        ctx.translate(this.pixelX, this.pixelY);
        ctx.scale(totalScale, totalScale);
        ctx.translate(-this.pixelX, -this.pixelY);

        // 스턴 시 투명도
        if (this.isStunned > 0) ctx.globalAlpha = 0.7;
        // 쌍검 표식
        if (this.isMarkedByDualSword.active) { /* ... 표식 그리기 ... */ }

        // 유닛 몸통 색칠 및 테두리
        switch(this.team) { /* ... 팀 색상 적용 ... */ }
        ctx.beginPath(); ctx.arc(this.pixelX, this.pixelY, GRID_SIZE / 1.67, 0, Math.PI * 2); ctx.fill();
        if (isOutlineEnabled) { /* ... 테두리 그리기 ... */ }

        // 눈 그리기
        { /* ... 눈 그리기 로직 (이전과 동일) ... */ }

        ctx.restore(); // 몸통 스케일 복원

        // 이름표
        if (this.name) { /* ... 이름표 그리기 ... */ }
        // 부메랑 선
        if (this.isBeingPulled && this.puller) { /* ... 선 그리기 ... */ }
        // 스턴 이펙트
        if (this.isStunned > 0) { /* ... 스턴 아이콘 그리기 ... */ }


        // --- 무기 그리기 (weaponary.js의 drawEquipped 호출) ---
        ctx.save();
        ctx.translate(this.pixelX, this.pixelY); // 유닛 위치 원점
        if (this.isKing) { // 왕관 그리기
            /* ... 왕관 그리기 로직 (스케일 적용 포함) ... */
             const kingDrawScale = 1.2; // 왕관 자체 크기
            ctx.translate(0, -GRID_SIZE * 0.5 * totalScale); // 위치 조정 (스케일 고려)
            ctx.scale(kingDrawScale * totalScale, kingDrawScale * totalScale); // 최종 스케일 적용
            ctx.fillStyle = '#facc15'; ctx.strokeStyle = 'black'; ctx.lineWidth = 1 / (kingDrawScale * totalScale); // 스케일 역보정
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.4, -GRID_SIZE * 0.1); ctx.lineTo(-GRID_SIZE * 0.4, GRID_SIZE * 0.2);
            ctx.lineTo(GRID_SIZE * 0.4, GRID_SIZE * 0.2); ctx.lineTo(GRID_SIZE * 0.4, -GRID_SIZE * 0.1);
            ctx.lineTo(GRID_SIZE * 0.2, 0); ctx.lineTo(0, -GRID_SIZE * 0.1);
            ctx.lineTo(-GRID_SIZE * 0.2, 0); ctx.closePath();
            ctx.fill(); ctx.stroke();
        } else if (this.weapon) {
            // [🎨 REMOVED] 여기서 빛 이펙트 그리는 로직 제거
            // weaponary.js의 drawEquipped 함수가 빛 이펙트 포함하여 무기를 그림
            this.weapon.drawEquipped(ctx, { ...this, pixelX: 0, pixelY: 0 }); // 상대 좌표 전달
        }
        ctx.restore(); // 유닛 위치 원점 복원


        // --- 상태 바 그리기 (쿨타임 원형 테두리 포함, 이전과 동일) ---
        /* ... 체력바, 공격 쿨타임 바, 스폰 바, 스킬 쿨타임 원형 테두리 그리기 로직 ... */
        const barWidth = GRID_SIZE * 0.8 * totalScale;
        const barHeight = 4;
        const barGap = 1;
        const barX = this.pixelX - barWidth / 2;
        const healthBarIsVisible = this.hp < this.maxHp || this.hpBarVisibleTimer > 0;
        const normalAttackIsVisible = (this.isCasting && this.weapon?.type === 'poison_potion') || (this.attackCooldown > 0);
        const kingSpawnBarIsVisible = this.isKing && this.spawnCooldown > 0;
        let specialSkillIsVisible =
            (this.weapon?.type === 'magic_dagger' && this.magicDaggerSkillCooldown > 0) ||
            (this.weapon?.type === 'axe' && this.axeSkillCooldown > 0) || // 도끼 추가
            (this.weapon?.type === 'ice_diamond' && this.iceDiamondChargeTimer > 0 && this.iceDiamondCharges < 5) ||
            (this.weapon?.type === 'magic_spear' && this.magicCircleCooldown > 0) ||
            (this.weapon?.type === 'boomerang' && this.boomerangCooldown > 0) ||
            (this.weapon?.type === 'shuriken' && this.shurikenSkillCooldown > 0) ||
            (this.weapon?.type === 'fire_staff' && this.fireStaffSpecialCooldown > 0) ||
            (this.weapon?.type === 'dual_swords' && this.dualSwordSkillCooldown > 0) ||
            (this.isCasting);
        if (this.attackCooldown > 0 && !this.isCasting) specialSkillIsVisible = false;

        const barsToShow = [];
        if (normalAttackIsVisible) barsToShow.push('attack');
        if (healthBarIsVisible) barsToShow.push('health');

        if (barsToShow.length > 0) {
             const kingYOffset = this.isKing ? GRID_SIZE * 0.4 * totalScale : 0;
            const totalBarsHeight = (barsToShow.length * barHeight) + ((barsToShow.length - 1) * barGap);
            let currentBarY = this.pixelY - (GRID_SIZE * 0.9 * totalScale) - totalBarsHeight - kingYOffset;

            if (normalAttackIsVisible) { /* ... 공격 쿨타임 바 그리기 ... */ }
            if (healthBarIsVisible) { /* ... 체력 바 및 레벨 그리기 ... */ }
        }
        if (kingSpawnBarIsVisible) { /* ... 스폰 바 그리기 ... */ }
        if (specialSkillIsVisible) { /* ... 스킬 쿨타임 원형 테두리 그리기 (도끼 포함) ... */
             let fgColor, progress = 0, max = 1;
             if (this.weapon?.type === 'fire_staff') { /* ... */ }
             else if (this.weapon?.type === 'magic_spear') { /* ... */ }
             else if (['boomerang', 'shuriken', 'poison_potion', 'magic_dagger', 'dual_swords', 'axe'].includes(this.weapon?.type)) { // 도끼 추가
                fgColor = '#94a3b8';
                if(this.weapon.type === 'boomerang') { /* ... */ }
                else if(this.weapon.type === 'shuriken') { /* ... */ }
                else if(this.weapon.type === 'magic_dagger') { /* ... */ }
                else if(this.weapon.type === 'dual_swords') { /* ... */ }
                else if(this.weapon.type === 'axe') { progress = max - this.axeSkillCooldown; max = 240; } // 도끼 쿨타임
                else { /* 독 포션 캐스팅 */ }
             }
             else if (this.weapon?.type === 'ice_diamond') { /* ... */ }

             if (fgColor) { /* ... 원형 테두리 그리기 ... */ }
        }


        // 경계 상태 표시 (!)
        /* ... 경계 표시 로직 ... */
    }

    // ... (performDualSwordTeleportAttack 함수는 이전과 동일) ...
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
