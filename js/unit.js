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
        // --- ✨ weaponary.js에서 참조하는 상태값 ---
        this.attackCount = 0; // 검, 활의 공격 횟수
        // ------------------------------------------
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
    }

    // ... (get speed, get attackPower 등 getter 생략) ...
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
        // [수정] weaponary.js의 use 메소드에서 공격력 계산 로직이 개선되었으므로,
        // 여기서는 기본 공격력 + 스킬 레벨 보너스만 반환하도록 단순화합니다.
        // 실제 피해량은 use 메소드 내부 로직을 따릅니다.
        return this.baseAttackPower + this.specialAttackLevelBonus + (this.weapon ? this.weapon.attackPowerBonus || 0 : 0) ;
        // return this.baseAttackPower + (this.weapon ? this.weapon.attackPowerBonus || 0 : 0) + this.specialAttackLevelBonus;
    }
    get attackRange() { return this.baseAttackRange + (this.weapon ? this.weapon.attackRangeBonus || 0 : 0); }
    get detectionRange() { return this.baseDetectionRange + (this.weapon ? this.weapon.detectionRangeBonus || 0 : 0); }

    get cooldownTime() {
        let finalCooldown = this.baseCooldownTime + (this.weapon ? this.weapon.attackCooldownBonus || 0 : 0);
        finalCooldown *= (1 - (this.level - 1) * 0.04); // 레벨에 따른 쿨감

        // 무기별 최소/최대 쿨다운 제한
        if (this.weapon && this.weapon.type === 'fire_staff') return Math.max(20, Math.min(finalCooldown, 120));
        if (this.weapon && this.weapon.type === 'hadoken') return Math.max(20, Math.min(finalCooldown, 120));
        if (this.weapon && this.weapon.type === 'axe') return Math.max(20, Math.min(finalCooldown, 120));
        if (this.weapon && this.weapon.type === 'ice_diamond') return Math.max(20, Math.min(finalCooldown, 180));

        return Math.max(20, finalCooldown); // 기본 최소 쿨다운
    }

    equipWeapon(weaponType, isClone = false) {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        // gameManager의 createWeapon 메소드를 사용하여 무기 속성(보너스 등)을 받아옴
        this.weapon = gameManager.createWeapon(0, 0, weaponType);
        if (this.weapon) { // weapon 객체가 성공적으로 생성되었는지 확인
            this.weapon.isEquipped = true; // 장착 상태로 변경
            gameManager.audioManager.play('equip');
            if (this.weapon.type === 'crown' && !isClone) {
                this.isKing = true;
            }
            this.state = 'IDLE'; // 무기 획득 후 상태 초기화
        } else {
            console.error(`Failed to create weapon of type: ${weaponType}`);
        }
    }


    levelUp(killedUnitLevel = 0) {
        const previousLevel = this.level;
        let newLevel = this.level;

        // 자신보다 높은 레벨의 유닛을 잡으면 그 레벨 따라감, 아니면 +1
        if (killedUnitLevel > this.level) {
            newLevel = killedUnitLevel;
        } else {
            newLevel++;
        }

        this.level = Math.min(this.maxLevel, newLevel); // 최대 레벨 제한

        if (this.level > previousLevel) { // 레벨이 올랐다면
            const levelGained = this.level - previousLevel;

            // 스탯 상승
            this.maxHp += 10 * levelGained;
            this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.3); // 체력 회복

            const weaponType = this.weapon ? this.weapon.type : null;
            // 스킬 공격력 기반 무기 목록
            const skillAttackWeapons = [
                'magic_dagger', 'poison_potion', 'ice_diamond', 'fire_staff',
                'magic_spear', 'boomerang', 'hadoken', 'shuriken'
            ];

            // 스킬/일반 공격력 분배 상승
            if (skillAttackWeapons.includes(weaponType)) {
                if (weaponType === 'shuriken') {
                    this.specialAttackLevelBonus += 5 * levelGained; // 표창은 보너스 낮음
                } else {
                    this.specialAttackLevelBonus += 10 * levelGained;
                }
            } else { // 일반 공격력 기반 무기
                this.baseAttackPower += 5 * levelGained;
            }

            // 레벨업 시각 효과 생성
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

        // 넉백 적용
        if (this.knockbackX !== 0 || this.knockbackY !== 0) {
            const nextX = this.pixelX + this.knockbackX * gameManager.gameSpeed;
            const nextY = this.pixelY + this.knockbackY * gameManager.gameSpeed;

            const gridX = Math.floor(nextX / GRID_SIZE);
            const gridY = Math.floor(nextY / GRID_SIZE);

            // 벽 충돌 시 넉백 중지
            if (gridY >= 0 && gridY < gameManager.ROWS && gridX >= 0 && gridX < gameManager.COLS) {
                const tile = gameManager.map[gridY][gridX];
                if (tile.type === TILE.WALL || tile.type === TILE.CRACKED_WALL || (tile.type === TILE.GLASS_WALL && !this.isBeingPulled)) {
                    this.knockbackX = 0;
                    this.knockbackY = 0;
                } else {
                    this.pixelX = nextX;
                    this.pixelY = nextY;
                }
            } else { // 맵 밖으로 나가면 넉백 중지 (혹시 모를 오류 방지)
                this.knockbackX = 0;
                this.knockbackY = 0;
            }
        }

        // 넉백 감쇠
        this.knockbackX *= 0.9;
        this.knockbackY *= 0.9;
        if (Math.abs(this.knockbackX) < 0.1) this.knockbackX = 0;
        if (Math.abs(this.knockbackY) < 0.1) this.knockbackY = 0;

        // 유닛 간 충돌 처리 (밀어내기)
        gameManager.units.forEach(otherUnit => {
            if (this !== otherUnit) {
                const dx = otherUnit.pixelX - this.pixelX;
                const dy = otherUnit.pixelY - this.pixelY;
                const distance = Math.hypot(dx, dy);
                const minDistance = (GRID_SIZE / 1.67) * 2; // 유닛 반지름 * 2

                if (distance < minDistance && distance > 0) { // 겹쳤을 때
                    const angle = Math.atan2(dy, dx);
                    const overlap = minDistance - distance; // 겹친 정도
                    const moveX = (overlap / 2) * Math.cos(angle); // 밀어낼 거리 계산
                    const moveY = (overlap / 2) * Math.sin(angle);

                    // 각 유닛이 이동할 다음 위치 계산
                    const myNextX = this.pixelX - moveX;
                    const myNextY = this.pixelY - moveY;
                    const otherNextX = otherUnit.pixelX + moveX;
                    const otherNextY = otherUnit.pixelY + moveY;

                    // 다음 위치의 그리드 좌표
                    const myGridX = Math.floor(myNextX / GRID_SIZE);
                    const myGridY = Math.floor(myNextY / GRID_SIZE);
                    const otherGridX = Math.floor(otherNextX / GRID_SIZE);
                    const otherGridY = Math.floor(otherNextY / GRID_SIZE);

                    // 다음 위치가 벽인지 확인
                    const isMyNextPosWall = (myGridY < 0 || myGridY >= gameManager.ROWS || myGridX < 0 || myGridX >= gameManager.COLS) ||
                        (gameManager.map[myGridY][myGridX].type === TILE.WALL || gameManager.map[myGridY][myGridX].type === TILE.CRACKED_WALL);

                    const isOtherNextPosWall = (otherGridY < 0 || otherGridY >= gameManager.ROWS || otherGridX < 0 || otherGridX >= gameManager.COLS) ||
                        (gameManager.map[otherGridY][otherGridX].type === TILE.WALL || gameManager.map[otherGridY][otherGridX].type === TILE.CRACKED_WALL);

                    // 벽이 아니면 위치 업데이트
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
        if (this.pixelX < radius) { // 왼쪽 경계
            this.pixelX = radius;
            this.knockbackX = Math.abs(this.knockbackX) * 0.5 || 1; // 튕겨나옴
            bounced = true;
        } else if (this.pixelX > gameManager.canvas.width - radius) { // 오른쪽 경계
            this.pixelX = gameManager.canvas.width - radius;
            this.knockbackX = -Math.abs(this.knockbackX) * 0.5 || -1;
            bounced = true;
        }

        if (this.pixelY < radius) { // 위쪽 경계
            this.pixelY = radius;
            this.knockbackY = Math.abs(this.knockbackY) * 0.5 || 1;
            bounced = true;
        } else if (this.pixelY > gameManager.canvas.height - radius) { // 아래쪽 경계
            this.pixelY = gameManager.canvas.height - radius;
            this.knockbackY = -Math.abs(this.knockbackY) * 0.5 || -1;
            bounced = true;
        }

        // 벽에 튕겼을 때 IDLE 상태면 목표 초기화 (튕겨서 못 가는 경우 방지)
        if (bounced && this.state === 'IDLE') {
            this.moveTarget = null;
        }
    }


    move() {
        if (!this.moveTarget || this.isCasting || this.isStunned > 0 || this.isAimingMagicDagger) return; // 이동 불가 상태 확인
        const gameManager = this.gameManager;
        if (!gameManager) return;

        const dx = this.moveTarget.x - this.pixelX;
        const dy = this.moveTarget.y - this.pixelY;
        const distance = Math.hypot(dx, dy);
        const currentSpeed = this.speed * gameManager.gameSpeed; // 현재 속도

        // 목표 지점 도달 시 이동 중지
        if (distance < currentSpeed) {
            this.pixelX = this.moveTarget.x;
            this.pixelY = this.moveTarget.y;
            this.moveTarget = null;
            return;
        }

        let angle = Math.atan2(dy, dx); // 목표 방향 각도

        // 용암 회피 로직 (활성화 시 && 도망 상태 아닐 때)
        if (gameManager.isLavaAvoidanceEnabled && this.state !== 'FLEEING_FIELD' && this.state !== 'FLEEING_LAVA') {
            const lookAheadDist = GRID_SIZE * 1.2; // 미리 볼 거리
            const lookAheadX = this.pixelX + Math.cos(angle) * lookAheadDist;
            const lookAheadY = this.pixelY + Math.sin(angle) * lookAheadDist;

            const lookAheadGridX = Math.floor(lookAheadX / GRID_SIZE);
            const lookAheadGridY = Math.floor(lookAheadY / GRID_SIZE);

            // 미리 본 위치가 용암이면 회피 경로 탐색
            if (gameManager.isPosInLavaForUnit(lookAheadGridX, lookAheadGridY)) {
                const detourAngle = Math.PI / 3; // 60도 회피 각도
                let bestAngle = -1; // 최적 회피 각도 (-1은 못 찾음)

                // 좌/우 회피 경로 탐색
                const leftAngle = angle - detourAngle;
                const rightAngle = angle + detourAngle;

                // 좌/우 회피 경로 미리보기 위치 계산
                const leftLookAheadX = this.pixelX + Math.cos(leftAngle) * lookAheadDist;
                const leftLookAheadY = this.pixelY + Math.sin(leftAngle) * lookAheadDist;
                const isLeftSafe = !gameManager.isPosInLavaForUnit(Math.floor(leftLookAheadX / GRID_SIZE), Math.floor(leftLookAheadY / GRID_SIZE)); // 왼쪽 안전 여부

                const rightLookAheadX = this.pixelX + Math.cos(rightAngle) * lookAheadDist;
                const rightLookAheadY = this.pixelY + Math.sin(rightAngle) * lookAheadDist;
                const isRightSafe = !gameManager.isPosInLavaForUnit(Math.floor(rightLookAheadX / GRID_SIZE), Math.floor(rightLookAheadY / GRID_SIZE)); // 오른쪽 안전 여부

                // 최적 회피 각도 결정
                if (isLeftSafe && isRightSafe) { // 양쪽 다 안전하면 원래 각도와 가까운 쪽으로
                    bestAngle = Math.abs(leftAngle - angle) < Math.abs(rightAngle - angle) ? leftAngle : rightAngle;
                } else if (isLeftSafe) { // 왼쪽만 안전하면 왼쪽으로
                    bestAngle = leftAngle;
                } else if (isRightSafe) { // 오른쪽만 안전하면 오른쪽으로
                    bestAngle = rightAngle;
                }
                // (둘 다 위험하면 회피 불가, 원래 각도 유지)

                // 최적 회피 각도 적용
                if (bestAngle !== -1) {
                    angle = bestAngle;
                }
            }
        }

        // --- 벽 충돌 처리 ---
        const nextPixelX = this.pixelX + Math.cos(angle) * currentSpeed;
        const nextPixelY = this.pixelY + Math.sin(angle) * currentSpeed;
        const nextGridX = Math.floor(nextPixelX / GRID_SIZE);
        const nextGridY = Math.floor(nextPixelY / GRID_SIZE);

        if (nextGridY >= 0 && nextGridY < gameManager.ROWS && nextGridX >= 0 && nextGridX < gameManager.COLS) {
            const collidedTile = gameManager.map[nextGridY][nextGridX];
            // 벽(일반, 부서지는, 유리)과 충돌 시
            if (collidedTile.type === TILE.WALL || collidedTile.type === TILE.CRACKED_WALL || collidedTile.type === TILE.GLASS_WALL) {
                // 부서지는 벽이면 벽 파괴 시도
                if (collidedTile.type === TILE.CRACKED_WALL) {
                    gameManager.damageTile(nextGridX, nextGridY, 999); // 즉시 파괴
                }
                // 튕겨나옴 (넉백 효과)
                const bounceAngle = this.facingAngle + Math.PI + (gameManager.random() - 0.5); // 반대 방향 + 약간 무작위
                this.knockbackX += Math.cos(bounceAngle) * 1.5;
                this.knockbackY += Math.sin(bounceAngle) * 1.5;
                this.moveTarget = null; // 이동 목표 초기화
                return; // 이동 중지
            }
        }

        // 충돌 없으면 이동 및 방향 업데이트
        this.facingAngle = angle;
        this.pixelX = nextPixelX;
        this.pixelY = nextPixelY;
    }


    attack(target) {
        if (!target || this.attackCooldown > 0 || this.isStunned > 0) return; // 공격 불가 조건 확인
        // 독 포션 제외하고 캐스팅 중이면 공격 불가
        if (this.isCasting && this.weapon && this.weapon.type !== 'poison_potion') return;

        const gameManager = this.gameManager;
        if (!gameManager) return;

        // 목표가 맵 밖에 있으면 공격 불가 (오류 방지)
        const targetGridX = Math.floor(target.pixelX / GRID_SIZE);
        const targetGridY = Math.floor(target.pixelY / GRID_SIZE);
        if (targetGridY < 0 || targetGridY >= gameManager.ROWS || targetGridX < 0 || targetGridX >= gameManager.COLS) return;

        const tile = gameManager.map[targetGridY][targetGridX];

        if (tile.type === TILE.CRACKED_WALL) { // 부서지는 벽 공격
            gameManager.damageTile(targetGridX, targetGridY, this.attackPower);
            this.attackCooldown = this.cooldownTime;
        } else if (target instanceof Unit || target instanceof Nexus) { // 유닛 또는 넥서스 공격
            if (this.weapon) { // 무기가 있으면 무기의 use 메소드 호출
                this.weapon.use(this, target);
            } else { // 무기 없으면 기본 주먹 공격
                target.takeDamage(this.attackPower, {}, this);
                gameManager.audioManager.play('punch');
                this.attackCooldown = this.cooldownTime;
            }
            // 쿨다운은 각 무기의 use 메소드 내부 또는 여기서 설정됨
        }
    }


    takeDamage(damage, effectInfo = {}, attacker = null) {
        const gameManager = this.gameManager;
        // 타일 피해(용암 등) 아니면 피격 효과 생성
        if (gameManager && damage > 0 && !effectInfo.isTileDamage) {
            createPhysicalHitEffect(gameManager, this);
        }
        this.hp -= damage;
        this.hpBarVisibleTimer = 180; // 체력바 잠시 표시
        this.damageFlash = 1.0; // 피격 시 흰색 깜빡임 효과 활성화

        // 마지막 공격자 기록 (레벨업 시스템용)
        if (attacker && attacker instanceof Unit) {
            this.killedBy = attacker;
        }
        // 죽었을 때 killedBy가 없으면 attacker로 설정
        if (this.hp <= 0 && !this.killedBy && attacker) {
            this.killedBy = attacker;
        }


        // --- 추가 효과 적용 ---
        if (effectInfo.interrupt) { // 캐스팅 방해 효과
            // 표창, 번개 무기는 특정 조건 아니면 방해 안 받음
            if (!['shuriken', 'lightning'].includes(this.weapon?.type) || effectInfo.force > 0) {
                this.isCasting = false;
                this.castingProgress = 0;
            }
        }
        if (effectInfo.force && effectInfo.force > 0) { // 넉백 효과
            this.knockbackX += Math.cos(effectInfo.angle) * effectInfo.force;
            this.knockbackY += Math.sin(effectInfo.angle) * effectInfo.force;
        }
        if (effectInfo.stun) { // 기절 효과
            if (this.isStunned <= 0) { // 기절 시작 시 사운드 재생
                gameManager.audioManager.play('stern');
            }
            this.isStunned = Math.max(this.isStunned, effectInfo.stun); // 기존 기절 시간과 비교하여 더 긴 시간 적용
            if (effectInfo.stunSource === 'magic_circle') { // 마법진 기절 여부 기록
                this.stunnedByMagicCircle = true;
            }
        }
        if (effectInfo.poison) { // 독 효과
            this.poisonEffect.active = true;
            this.poisonEffect.duration = 180; // 3초 지속
            this.poisonEffect.damage = effectInfo.poison.damage; // 초당 피해량
        }
        if (effectInfo.slow) { // 둔화 효과
            this.isSlowed = Math.max(this.isSlowed, effectInfo.slow); // 기존 둔화 시간과 비교하여 더 긴 시간 적용
        }
    }


    handleDeath() {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        // 독 포션 유닛 사망 시 독안개 생성
        if (this.weapon && this.weapon.type === 'poison_potion') {
            gameManager.castAreaSpell({ x: this.pixelX, y: this.pixelY }, 'poison_cloud', this.team, this.specialAttackLevelBonus);
        }
        // 다른 사망 효과 추가 가능
    }


    update(enemies, weapons, projectiles) {
        const gameManager = this.gameManager;
        if (!gameManager) {
            return;
        }

        // 부드러운 체력바 감소 처리
        if (this.displayHp > this.hp) {
            // 차이에 비례하여 빠르게 감소 (0.1은 속도 조절 계수)
            this.displayHp -= (this.displayHp - this.hp) * 0.1 * this.gameManager.gameSpeed;
            // 최소 체력 보장
            if(this.displayHp < this.hp) this.displayHp = this.hp;
        } else {
            this.displayHp = this.hp;
        }
        // 피격 시 흰색 깜빡임 효과 감소
        if (this.damageFlash > 0) {
            this.damageFlash -= 0.05 * this.gameManager.gameSpeed;
            if(this.damageFlash < 0) this.damageFlash = 0;
        }


        // 레벨업 파티클 효과 (레벨 2 이상, 레벨업 시스템 활성화 시)
        if (this.level >= 2 && gameManager.isLevelUpEnabled) {
            this.levelUpParticleCooldown -= gameManager.gameSpeed;
            if (this.levelUpParticleCooldown <= 0) {
                this.levelUpParticleCooldown = 15 - this.level; // 레벨 높을수록 자주 생성

                let teamColor; // 팀별 진한 색상 가져오기
                switch(this.team) {
                    case TEAM.A: teamColor = DEEP_COLORS.TEAM_A; break;
                    case TEAM.B: teamColor = DEEP_COLORS.TEAM_B; break;
                    case TEAM.C: teamColor = DEEP_COLORS.TEAM_C; break;
                    case TEAM.D: teamColor = DEEP_COLORS.TEAM_D; break;
                    default: teamColor = '#FFFFFF'; break;
                }

                const particleCount = (this.level - 1) * 2; // 레벨에 비례하여 개수 증가
                for (let i = 0; i < particleCount; i++) {
                    const angle = gameManager.random() * Math.PI * 2; // 무작위 방향
                    const radius = GRID_SIZE / 1.67; // 유닛 반지름
                    const spawnX = this.pixelX + Math.cos(angle) * radius; // 유닛 주변에서 생성
                    const spawnY = this.pixelY + Math.sin(angle) * radius;
                    const speed = 0.5 + gameManager.random() * 0.5; // 무작위 속도

                    gameManager.addParticle({
                        x: spawnX, y: spawnY,
                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                        life: 0.6, // 짧은 수명
                        color: teamColor, // 팀 색상
                        size: this.level * 0.5 + gameManager.random() * this.level, // 레벨 비례 크기
                        gravity: -0.02 // 위로 떠오르는 효과
                    });
                }
            }
        }

        // 돌진 타일 이동 로직
        if (this.isDashing) {
            this.dashTrail.push({ x: this.pixelX, y: this.pixelY }); // 잔상 기록
            if (this.dashTrail.length > 5) this.dashTrail.shift(); // 최대 5개 유지

            let moveX = 0, moveY = 0; // 방향에 따른 이동량 설정
            switch (this.dashDirection) {
                case 'RIGHT': moveX = this.dashSpeed; break;
                case 'LEFT': moveX = -this.dashSpeed; break;
                case 'DOWN': moveY = this.dashSpeed; break;
                case 'UP': moveY = -this.dashSpeed; break;
            }

            // 게임 속도만큼 반복하여 이동 (프레임 드랍 시 보정)
            for (let i = 0; i < gameManager.gameSpeed; i++) {
                const nextX = this.pixelX + moveX;
                const nextY = this.pixelY + moveY;
                const gridX = Math.floor(nextX / GRID_SIZE);
                const gridY = Math.floor(nextY / GRID_SIZE);

                // 맵 밖으로 나가면 돌진 중지
                if (gridY < 0 || gridY >= gameManager.ROWS || gridX < 0 || gridX >= gameManager.COLS) {
                    this.isDashing = false;
                    break;
                }

                const tile = gameManager.map[gridY][gridX];
                // 벽 충돌 시 돌진 중지
                if (tile.type === TILE.WALL) {
                    this.isDashing = false;
                    break;
                }
                // 부서지는 벽 통과 시 파괴
                if (tile.type === TILE.CRACKED_WALL) {
                    gameManager.damageTile(gridX, gridY, 999);
                }

                // 위치 업데이트 및 남은 거리 감소
                this.pixelX = nextX;
                this.pixelY = nextY;
                this.dashDistanceRemaining -= this.dashSpeed;

                // 목표 거리 도달 시 돌진 중지
                if (this.dashDistanceRemaining <= 0) {
                    this.isDashing = false;
                    break;
                }
            }
            // 돌진 종료 시 잔상 제거
            if (!this.isDashing) this.dashTrail = [];
            this.applyPhysics(); // 돌진 중에도 충돌 처리는 적용
            return; // 돌진 중에는 다른 행동 안 함
        }

        // 체력바 표시 시간 감소
        if (this.hpBarVisibleTimer > 0) this.hpBarVisibleTimer--;

        // 부메랑 끌려가는 로직
        if (this.isBeingPulled && this.puller) {
            const dx = this.pullTargetPos.x - this.pixelX;
            const dy = this.pullTargetPos.y - this.pixelY;
            const dist = Math.hypot(dx, dy);
            const pullSpeed = 4; // 끌려가는 속도

            if (dist < pullSpeed * gameManager.gameSpeed) { // 목표 지점 도달 시
                this.pixelX = this.pullTargetPos.x;
                this.pixelY = this.pullTargetPos.y;
                this.isBeingPulled = false; // 끌려가기 종료

                // 도착 시 피해 및 기절 적용
                const damage = 20 + (this.puller.specialAttackLevelBonus || 0);
                this.takeDamage(damage, { stun: 120 }, this.puller);

                this.puller = null; // 끌어당긴 유닛 정보 초기화
            } else { // 목표 지점까지 이동
                const angle = Math.atan2(dy, dx);
                this.pixelX += Math.cos(angle) * pullSpeed * gameManager.gameSpeed;
                this.pixelY += Math.sin(angle) * pullSpeed * gameManager.gameSpeed;
                this.knockbackX = 0; // 끌려가는 동안 넉백 무시
                this.knockbackY = 0;
            }
            this.applyPhysics(); // 충돌 처리는 적용
            return; // 끌려가는 동안 다른 행동 안 함
        }

        // 기절 상태 처리
        if (this.isStunned > 0) {
            this.isStunned -= gameManager.gameSpeed; // 기절 시간 감소
            if (this.isStunned <= 0) { // 기절 풀리면 마법진 기절 상태 초기화
                this.stunnedByMagicCircle = false;
            }
            this.applyPhysics(); // 충돌 처리만 적용
            return; // 기절 중 다른 행동 안 함
        }

        // 둔화 상태 처리
        if (this.isSlowed > 0) {
            this.isSlowed -= gameManager.gameSpeed; // 둔화 시간 감소
        }

        // 쌍검 표식 상태 처리
        if (this.isMarkedByDualSword.active) {
            this.isMarkedByDualSword.timer -= gameManager.gameSpeed;
            if (this.isMarkedByDualSword.timer <= 0) {
                this.isMarkedByDualSword.active = false;
            }
        }

        // 각성 물약 효과 처리
        if (this.awakeningEffect.active && this.awakeningEffect.stacks < 3) { // 활성화 & 최대 3중첩
            this.awakeningEffect.timer += gameManager.gameSpeed;
            if (this.awakeningEffect.timer >= 300) { // 5초마다 중첩 증가
                this.awakeningEffect.timer = 0;
                this.awakeningEffect.stacks++;
                // 스탯 상승
                this.maxHp += 20;
                this.hp = Math.min(this.maxHp, this.hp + 20); // 체력 회복
                this.baseAttackPower += 3;
                gameManager.audioManager.play('Arousal'); // 각성 사운드
                // 각성 파티클 효과
                for (let i = 0; i < 30; i++) {
                    const angle = gameManager.random() * Math.PI * 2;
                    const speed = 1 + gameManager.random() * 3;
                    const color = gameManager.random() > 0.5 ? '#FFFFFF' : '#3b82f6'; // 흰색/파랑
                    gameManager.addParticle({
                        x: this.pixelX, y: this.pixelY,
                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                        life: 0.8, color: color, size: gameManager.random() * 2 + 1.5,
                        gravity: 0.05
                    });
                }
            }
        }

        // --- 각종 쿨다운 감소 ---
        if (this.magicDaggerSkillCooldown > 0) this.magicDaggerSkillCooldown -= gameManager.gameSpeed;
        if (this.axeSkillCooldown > 0) this.axeSkillCooldown -= gameManager.gameSpeed;
        if (this.spinAnimationTimer > 0) this.spinAnimationTimer -= gameManager.gameSpeed; // 도끼 회전 애니메이션
        if (this.swordSpecialAttackAnimationTimer > 0) this.swordSpecialAttackAnimationTimer -= gameManager.gameSpeed; // 검 특수 공격 애니메이션
        if (this.dualSwordSkillCooldown > 0) this.dualSwordSkillCooldown -= gameManager.gameSpeed;
        if (this.dualSwordTeleportDelayTimer > 0) this.dualSwordTeleportDelayTimer -= gameManager.gameSpeed; // 쌍검 순간이동 딜레이
        if (this.dualSwordSpinAttackTimer > 0) this.dualSwordSpinAttackTimer -= gameManager.gameSpeed; // 쌍검 회전 공격 애니메이션
        if (this.attackCooldown > 0) this.attackCooldown -= gameManager.gameSpeed; // 일반 공격 쿨다운
        if (this.teleportCooldown > 0) this.teleportCooldown -= gameManager.gameSpeed; // 텔레포터 쿨다운
        if (this.alertedCounter > 0) this.alertedCounter -= gameManager.gameSpeed; // 느낌표 표시 시간
        if (this.isKing && this.spawnCooldown > 0) this.spawnCooldown -= gameManager.gameSpeed; // 왕 유닛 생성 쿨다운
        if (this.evasionCooldown > 0) this.evasionCooldown -= gameManager.gameSpeed; // 회피 쿨다운 (표창, 번개)
        if (this.attackAnimationTimer > 0) this.attackAnimationTimer -= gameManager.gameSpeed; // 공격 모션 타이머
        if (this.magicCircleCooldown > 0) this.magicCircleCooldown -= gameManager.gameSpeed; // 마법창 마법진 쿨다운
        if (this.boomerangCooldown > 0) this.boomerangCooldown -= gameManager.gameSpeed; // 부메랑 특수 공격 쿨다운
        if (this.shurikenSkillCooldown > 0) this.shurikenSkillCooldown -= gameManager.gameSpeed; // 표창 특수 공격 쿨다운
        if (this.fireStaffSpecialCooldown > 0) this.fireStaffSpecialCooldown -= gameManager.gameSpeed; // 불 지팡이 특수 공격 쿨다운
        if (this.fleeingCooldown > 0) this.fleeingCooldown -= gameManager.gameSpeed; // 도망 상태 유지 시간 (용암 등)

        // 표창/번개 무기 회피 로직
        if (this.weapon && (this.weapon.type === 'shuriken' || this.weapon.type === 'lightning') && this.evasionCooldown <= 0) {
            for (const p of projectiles) { // 모든 투사체 검사
                if (p.owner.team === this.team) continue; // 아군 투사체 무시
                const dist = Math.hypot(this.pixelX - p.pixelX, this.pixelY - p.pixelY);
                if (dist < GRID_SIZE * 3) { // 일정 거리 내 투사체 감지 시
                    const angleToUnit = Math.atan2(this.pixelY - p.pixelY, this.pixelX - p.pixelX); // 투사체에서 유닛 방향
                    const angleDiff = Math.abs(angleToUnit - p.angle); // 투사체 진행 방향과의 각도 차이
                    // 투사체가 자신을 향하고 있으면 (약 45도 이내)
                    if (angleDiff < Math.PI / 4 || angleDiff > Math.PI * 1.75) {
                        if (gameManager.random() > 0.5) { // 50% 확률로 회피
                            const dodgeAngle = p.angle + (Math.PI / 2) * (gameManager.random() < 0.5 ? 1 : -1); // 투사체 방향의 90도 좌/우
                            const dodgeForce = 4; // 회피 넉백 힘
                            this.knockbackX += Math.cos(dodgeAngle) * dodgeForce;
                            this.knockbackY += Math.sin(dodgeAngle) * dodgeForce;
                            this.evasionCooldown = 30; // 회피 후 짧은 쿨다운
                            break; // 한 번만 회피
                        }
                    }
                }
            }
        }

        // 독 효과 처리
        if (this.poisonEffect.active) {
            this.poisonEffect.duration -= gameManager.gameSpeed; // 지속 시간 감소
            this.takeDamage(this.poisonEffect.damage * gameManager.gameSpeed, { isTileDamage: true }); // 피해 적용 (피격 효과 없음)
            if (this.poisonEffect.duration <= 0) { // 지속 시간 종료 시 비활성화
                this.poisonEffect.active = false;
            }
        }

        // 얼음 다이아 충전 로직
        if (this.weapon && this.weapon.type === 'ice_diamond') {
            if (this.iceDiamondCharges < 5) { // 최대 5개까지 충전
                this.iceDiamondChargeTimer += gameManager.gameSpeed;
                if (this.iceDiamondChargeTimer >= 240) { // 4초마다 충전
                    this.iceDiamondCharges++;
                    this.iceDiamondChargeTimer = 0;
                }
            }
        }

        // 쌍검 순간이동 딜레이 처리
        if (this.dualSwordTeleportDelayTimer > 0) {
            // this.dualSwordTeleportDelayTimer -= gameManager.gameSpeed; // 위에서 이미 감소시킴
            if (this.dualSwordTeleportDelayTimer <= 0) { // 딜레이 종료 시
                this.performDualSwordTeleportAttack(enemies); // 순간이동 및 공격 실행
            }
        }

        // 왕 유닛 생성 로직
        if (this.isKing && this.spawnCooldown <= 0) {
            this.spawnCooldown = this.spawnInterval; // 쿨다운 초기화 (12초)
            gameManager.spawnUnit(this, false); // 주변에 유닛 생성 (무기 복제 안 함)
        }

        // 캐스팅 상태 처리 (독 포션 등)
        if (this.isCasting) {
            this.castingProgress += gameManager.gameSpeed; // 캐스팅 진행
            // 캐스팅 중 목표가 죽으면 중단
            if (!this.target || (this.target instanceof Unit && this.target.hp <= 0)) {
                this.isCasting = false; this.castingProgress = 0; return;
            }
            if (this.castingProgress >= this.castDuration) { // 캐스팅 완료 시
                this.isCasting = false; this.castingProgress = 0;

                // 독 포션 캐스팅 완료 시 자폭
                if (this.weapon.type === 'poison_potion') {
                    gameManager.audioManager.play('poison'); // 독 사운드
                    this.hp = 0; // 즉시 사망 처리
                }
                // 다른 캐스팅 스킬 추가 가능
            }
            this.applyPhysics(); // 캐스팅 중에도 충돌 처리 적용
            return; // 캐스팅 중 다른 행동 안 함
        }

        // --- AI 상태 결정 및 행동 처리 ---

        // 마법 단검 특수 공격 조준 시작 조건 확인
        if (this.weapon && this.weapon.type === 'magic_dagger' && !this.isAimingMagicDagger && this.magicDaggerSkillCooldown <= 0 && this.attackCooldown <= 0) {
            const { item: closestEnemy } = this.findClosest(enemies); // 가장 가까운 적 찾기
            // 적이 있고, 시야가 확보되고, 탐지 범위 내에 있으면 조준 시작
            if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy)) {
                const dist = Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY);
                if (dist < this.detectionRange) {
                    this.isAimingMagicDagger = true; // 조준 상태로 변경
                    this.magicDaggerAimTimer = 60; // 조준 시간 (1초)
                    const angle = Math.atan2(closestEnemy.pixelY - this.pixelY, closestEnemy.pixelX - this.pixelX); // 적 방향
                    const dashDistance = GRID_SIZE * 4; // 돌진 거리
                    // 돌진 목표 위치 계산
                    this.magicDaggerTargetPos = {
                        x: this.pixelX + Math.cos(angle) * dashDistance,
                        y: this.pixelY + Math.sin(angle) * dashDistance
                    };
                }
            }
        }

        // 마법 단검 조준 중 처리
        if (this.isAimingMagicDagger) {
            this.magicDaggerAimTimer -= gameManager.gameSpeed; // 조준 시간 감소
            if (this.magicDaggerAimTimer <= 0) { // 조준 완료 시
                this.isAimingMagicDagger = false; // 조준 상태 해제
                this.magicDaggerSkillCooldown = 420; // 스킬 쿨다운 시작 (7초)
                this.attackCooldown = 30; // 짧은 후딜레이

                const startPos = { x: this.pixelX, y: this.pixelY }; // 시작 위치
                const endPos = this.magicDaggerTargetPos; // 목표 위치

                // 돌진 경로 상의 모든 적에게 피해 및 기절
                enemies.forEach(enemy => {
                    // 점과 직선 사이의 거리 공식 활용
                    const distToLine = Math.abs((endPos.y - startPos.y) * enemy.pixelX - (endPos.x - startPos.x) * enemy.pixelY + endPos.x * startPos.y - endPos.y * startPos.x) / Math.hypot(endPos.y - startPos.y, endPos.x - startPos.x);
                    if (distToLine < GRID_SIZE) { // 경로와 충분히 가까우면
                        enemy.takeDamage(this.attackPower * 1.2, { stun: 60 }, this); // 피해 및 기절
                    }
                });

                // 위치 즉시 이동
                this.pixelX = endPos.x;
                this.pixelY = endPos.y;

                // 돌진 시각 효과 생성
                gameManager.effects.push(new MagicDaggerDashEffect(gameManager, startPos, endPos));
                gameManager.audioManager.play('rush'); // 돌진 사운드

                // 도착 지점 파티클 효과
                for (let i = 0; i < 15; i++) {
                    const angle = gameManager.random() * Math.PI * 2;
                    const speed = 1 + gameManager.random() * 2;
                    gameManager.addParticle({
                        x: endPos.x, y: endPos.y,
                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                        life: 0.6,
                        color: ['#c084fc', '#a855f7', '#f5d0fe'][Math.floor(gameManager.random() * 3)], // 보라색 계열
                        size: gameManager.random() * 2 + 1, gravity: 0.05
                    });
                }
                this.applyPhysics(); // 이동 후 충돌 처리
                return; // 조준/돌진 중 다른 행동 안 함
            }
        }

        // 마법창 특수 공격 로직
        if (this.weapon && this.weapon.type === 'magic_spear') {
            // 마법진 생성 쿨다운 확인
            if (this.magicCircleCooldown <= 0) {
                gameManager.spawnMagicCircle(this.team); // 마법진 생성
                this.magicCircleCooldown = 300; // 쿨다운 시작 (5초)
            }
            // 마법진에 의해 기절한 적 탐색
            const stunnedEnemy = gameManager.findStunnedByMagicCircleEnemy(this.team);
            if (stunnedEnemy && this.attackCooldown <= 0) { // 기절한 적 있고 공격 가능하면
                this.alertedCounter = 60; // 느낌표 표시
                this.target = stunnedEnemy; // 목표 설정
                gameManager.createProjectile(this, stunnedEnemy, 'magic_spear_special'); // 특수 창 발사
                gameManager.audioManager.play('spear'); // 창 사운드
                this.attackCooldown = this.cooldownTime; // 공격 쿨다운 시작
                this.applyPhysics(); // 물리 적용
                return; // 특수 공격 사용 시 행동 종료
            }
        }
        // 부메랑 특수 공격 로직
        else if (this.weapon && this.weapon.type === 'boomerang' && this.boomerangCooldown <= 0) {
            const { item: closestEnemy } = this.findClosest(enemies); // 가장 가까운 적 탐색
            // 적이 있고, 시야 확보되고, 사거리 내에 있으면
            if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy)) {
                const dist = Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY);
                if (dist <= this.attackRange) {
                    this.boomerangCooldown = 480; // 스킬 쿨다운 시작 (8초)
                    gameManager.createProjectile(this, closestEnemy, 'boomerang_projectile'); // 특수 부메랑 발사
                    gameManager.audioManager.play('boomerang'); // 부메랑 사운드
                    this.state = 'IDLE'; // 잠시 대기
                    this.moveTarget = null;
                    this.attackCooldown = 60; // 후딜레이
                    this.applyPhysics();
                    return; // 특수 공격 사용 시 행동 종료
                }
            }
        }

        // 도끼 특수 공격 로직
        if (this.weapon && this.weapon.type === 'axe' && this.axeSkillCooldown <= 0) {
            const { item: closestEnemy } = this.findClosest(enemies); // 가장 가까운 적 탐색
            // 가까운 적 감지 시 (거리 3칸 이내)
            if (closestEnemy && Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY) < GRID_SIZE * 3) {
                this.axeSkillCooldown = 240; // 스킬 쿨다운 시작 (4초)
                this.spinAnimationTimer = 30; // 회전 애니메이션 시작 (0.5초)
                gameManager.audioManager.play('axe'); // 도끼 사운드
                gameManager.createEffect('axe_spin_effect', this.pixelX, this.pixelY, this); // 회전 시각 효과

                const damageRadius = GRID_SIZE * 3.5; // 피해 반경
                // 범위 내 모든 적에게 피해
                enemies.forEach(enemy => {
                    if (Math.hypot(this.pixelX - enemy.pixelX, this.pixelY - enemy.pixelY) < damageRadius) {
                        enemy.takeDamage(this.attackPower * 1.5, {}, this); // 1.5배 피해
                    }
                });
                // 범위 내 모든 적 넥서스에게 피해
                gameManager.nexuses.forEach(nexus => {
                    if (nexus.team !== this.team && !nexus.isDestroying && Math.hypot(this.pixelX - nexus.pixelX, this.pixelY - nexus.pixelY) < damageRadius) {
                        nexus.takeDamage(this.attackPower * 1.5, {}, this);
                    }
                });
                gameManager.audioManager.play('swordHit'); // 타격 사운드 (임시)
            }
        }


        // --- AI 상태 결정 로직 ---
        let newState = 'IDLE'; // 기본 상태
        let newTarget = null; // 새로운 목표
        let targetEnemyForAlert = null; // 느낌표 표시를 위한 적 정보 (사용 안 함)

        // 현재 위치의 타일 상태 확인
        const currentGridXBeforeMove = Math.floor(this.pixelX / GRID_SIZE);
        const currentGridYBeforeMove = Math.floor(this.pixelY / GRID_SIZE);
        this.isInMagneticField = gameManager.isPosInAnyField(currentGridXBeforeMove, currentGridYBeforeMove); // 자기장 안에 있는지
        this.isInLava = gameManager.isPosInLavaForUnit(currentGridXBeforeMove, currentGridYBeforeMove); // 용암 안에 있는지

        if (this.isInMagneticField) { // 자기장 안에 있으면 도망
            newState = 'FLEEING_FIELD';
        } else if (gameManager.isLavaAvoidanceEnabled && this.isInLava) { // 용암 안에 있고 회피 활성화 시 도망
            newState = 'FLEEING_LAVA';
            this.fleeingCooldown = 60; // 잠시 도망 상태 유지
        } else if (this.fleeingCooldown <= 0) { // 도망 상태 아니면 목표 탐색
            const enemyNexus = gameManager.nexuses.find(n => n.team !== this.team && !n.isDestroying); // 적 넥서스 탐색
            const { item: closestEnemy, distance: enemyDist } = this.findClosest(enemies); // 가장 가까운 적 탐색

            // 시야 내 보이는 무기 탐색
            const visibleWeapons = weapons.filter(w => !w.isEquipped && gameManager.hasLineOfSightForWeapon(this, w));
            const { item: targetWeapon, distance: weaponDist } = this.findClosest(visibleWeapons);

            // 시야 내 보이는 물음표 타일 탐색 (무기 없을 때만)
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
                // targetEnemyForAlert = closestEnemy; // 사용 안 함
            }

            // --- 상태 결정 우선순위 ---
            if (this.isKing && targetEnemy) { // 왕이고 적 감지 시 도망
                newState = 'FLEEING'; newTarget = targetEnemy;
            } else if (this.hp < this.maxHp / 2) { // 체력 절반 이하 시 회복 팩 탐색
                const healPacks = gameManager.getTilesOfType(TILE.HEAL_PACK);
                if (healPacks.length > 0) {
                    const healPackPositions = healPacks.map(pos => ({
                        gridX: pos.x, gridY: pos.y,
                        pixelX: pos.x * GRID_SIZE + GRID_SIZE / 2,
                        pixelY: pos.y * GRID_SIZE + GRID_SIZE / 2
                    }));
                    const { item: closestPack, distance: packDist } = this.findClosest(healPackPositions);
                    // 가까운 회복 팩 있으면 이동
                    if (closestPack && packDist < this.detectionRange * 1.5) {
                        newState = 'SEEKING_HEAL_PACK';
                        newTarget = closestPack;
                    }
                }
            }

            if (newState === 'IDLE') { // 위 조건에 해당 안 되면 다음 우선순위 탐색
                if (closestQuestionMark && questionMarkDist <= this.detectionRange) { // 물음표 타일 우선
                    newState = 'SEEKING_QUESTION_MARK';
                    newTarget = closestQuestionMark;
                } else if (!this.weapon && targetWeapon && weaponDist <= this.detectionRange) { // 무기 없으면 무기 탐색
                    newState = 'SEEKING_WEAPON';
                    newTarget = targetWeapon;
                } else if (targetEnemy) { // 적 감지 시 공격
                    newState = 'AGGRESSIVE';
                    newTarget = targetEnemy;
                } else if (enemyNexus && gameManager.hasLineOfSight(this, enemyNexus) && Math.hypot(this.pixelX - enemyNexus.pixelX, this.pixelY - enemyNexus.pixelY) <= this.detectionRange) { // 시야 내 적 넥서스 공격
                    newState = 'ATTACKING_NEXUS';
                    newTarget = enemyNexus;
                }
                // 없으면 IDLE 유지 (배회)
            }
        } else { // 도망 상태 유지 시간 남았으면
            if (this.moveTarget) { // 기존 이동 목표 유지
                newState = this.state;
            } else { // 없으면 IDLE로 (도망 완료)
                newState = 'IDLE';
            }
        }


        // 상태 변경 시 느낌표 표시 (마법창 특수 공격 제외)
        if (this.state !== newState && newState !== 'IDLE' && newState !== 'FLEEING_FIELD' && newState !== 'FLEEING_LAVA') {
            if (!(this.weapon && this.weapon.type === 'magic_spear' && this.target instanceof Unit && this.target.stunnedByMagicCircle)) {
                this.alertedCounter = 60; // 1초간 표시
            }
        }
        this.state = newState; // 상태 업데이트
        this.target = newTarget; // 목표 업데이트

        // --- 상태별 행동 처리 ---
        switch (this.state) {
            case 'FLEEING_FIELD': // 자기장 도망
                this.moveTarget = gameManager.findClosestSafeSpot(this.pixelX, this.pixelY); // 가장 가까운 안전 지대로 이동
                break;
            case 'FLEEING_LAVA': // 용암 도망
                this.moveTarget = gameManager.findClosestSafeSpotFromLava(this.pixelX, this.pixelY); // 가장 가까운 용암 아닌 지대로 이동
                break;
            case 'FLEEING': // 일반 도망 (왕)
                if (this.target) {
                    const fleeAngle = Math.atan2(this.pixelY - this.target.pixelY, this.pixelX - this.target.pixelX); // 적 반대 방향
                    this.moveTarget = { x: this.pixelX + Math.cos(fleeAngle) * GRID_SIZE * 5, y: this.pixelY + Math.sin(fleeAngle) * GRID_SIZE * 5 };
                }
                break;
            case 'SEEKING_HEAL_PACK': // 회복 팩 이동
            case 'SEEKING_QUESTION_MARK': // 물음표 이동
                if (this.target) this.moveTarget = { x: this.target.pixelX, y: this.target.pixelY };
                break;
            case 'SEEKING_WEAPON': // 무기 이동
                if (this.target) {
                    const distance = Math.hypot(this.pixelX - this.target.pixelX, this.pixelY - this.target.pixelY);
                    if (distance < GRID_SIZE * 0.8 && !this.target.isEquipped) { // 가까이 가면 획득
                        this.equipWeapon(this.target.type);
                        this.target.isEquipped = true; // 무기 비활성화
                        this.target = null; // 목표 초기화
                    } else { // 멀면 이동
                        this.moveTarget = { x: this.target.pixelX, y: this.target.pixelY };
                    }
                }
                break;
            case 'ATTACKING_NEXUS': // 넥서스 공격
            case 'AGGRESSIVE': // 적 공격
                if (this.target) {
                    // 불 지팡이 특수 공격 사용 조건 확인
                    if (this.weapon && this.weapon.type === 'fire_staff' && this.fireStaffSpecialCooldown <= 0) {
                        const distanceToTarget = Math.hypot(this.pixelX - this.target.pixelX, this.pixelY - this.target.pixelY);
                        if (distanceToTarget <= this.attackRange && gameManager.hasLineOfSight(this, this.target)) {
                            gameManager.createProjectile(this, this.target, 'fireball_projectile'); // 화염구 발사
                            gameManager.audioManager.play('fireball'); // 화염구 사운드
                            this.fireStaffSpecialCooldown = 240; // 쿨다운 시작 (4초)
                            this.attackCooldown = 60; // 후딜레이
                            break; // 행동 종료
                        }
                    }
                    // 쌍검 특수 공격 사용 조건 확인
                    else if (this.weapon && this.weapon.type === 'dual_swords' && this.dualSwordSkillCooldown <= 0) {
                         const distanceToTarget = Math.hypot(this.pixelX - this.target.pixelX, this.pixelY - this.target.pixelY);
                        // 탐지 범위 내 + 시야 확보 시 사용
                        if (distanceToTarget <= this.detectionRange && gameManager.hasLineOfSight(this, this.target)) {
                            gameManager.audioManager.play('shurikenShoot'); // 표창 사운드 (임시)
                            gameManager.createProjectile(this, this.target, 'bouncing_sword'); // 튕기는 검 발사
                            this.dualSwordSkillCooldown = 300; // 쿨다운 시작 (5초)
                            this.attackCooldown = 60; // 후딜레이
                            this.moveTarget = null; // 이동 중지
                            // 적 방향 바라보기
                            this.facingAngle = Math.atan2(this.target.pixelY - this.pixelY, this.target.pixelX - this.pixelX);
                            break; // 행동 종료
                        }
                    }


                    // 일반 공격 로직
                    let attackDistance = this.attackRange;
                    // 독 포션은 사거리 보너스 무시 (근접 캐스팅)
                    if (this.weapon && this.weapon.type === 'poison_potion') {
                        attackDistance = this.baseAttackRange;
                    }
                    // 사거리 내에 있으면 공격
                    if (Math.hypot(this.pixelX - this.target.pixelX, this.pixelY - this.target.pixelY) <= attackDistance) {
                        this.moveTarget = null; // 이동 중지
                        this.attack(this.target); // 공격 실행
                        // 적 방향 바라보기
                        this.facingAngle = Math.atan2(this.target.pixelY - this.pixelY, this.target.pixelX - this.pixelX);
                    } else { // 멀면 이동
                        this.moveTarget = { x: this.target.pixelX, y: this.target.pixelY };
                    }
                }
                break;
            case 'IDLE': default: // 배회
                // 목표 없거나 가까우면 새로운 무작위 목표 설정
                if (!this.moveTarget || Math.hypot(this.pixelX - this.moveTarget.x, this.pixelY - this.moveTarget.y) < GRID_SIZE) {
                    const angle = gameManager.random() * Math.PI * 2;
                    // 현재 위치 주변 무작위 지점
                    this.moveTarget = { x: this.pixelX + Math.cos(angle) * GRID_SIZE * 8, y: this.pixelY + Math.sin(angle) * GRID_SIZE * 8 };
                }
                break;
        }

        // --- 이동 및 물리 처리 ---
        this.move(); // 결정된 목표로 이동 시도
        this.applyPhysics(); // 충돌 및 넉백 처리

        // --- 막힘 방지 로직 ---
        if (this.moveTarget) { // 이동 목표가 있으면
            // 이전 프레임과의 거리 계산
            const distMoved = Math.hypot(this.pixelX - this.lastPosition.x, this.pixelY - this.lastPosition.y);
            if (distMoved < 0.2 * gameManager.gameSpeed) { // 거의 움직이지 않았으면
                this.stuckTimer += 1; // 막힘 타이머 증가
            } else { // 움직였으면 타이머 초기화
                this.stuckTimer = 0;
            }

            // 일정 시간(0.5초) 이상 막혔으면 새로운 목표 설정
            if (this.stuckTimer > 30) {
                const angle = gameManager.random() * Math.PI * 2; // 무작위 방향
                const radius = GRID_SIZE * 3; // 주변 거리
                const newTargetX = this.pixelX + Math.cos(angle) * radius;
                const newTargetY = this.pixelY + Math.sin(angle) * radius;

                const gridX = Math.floor(newTargetX / GRID_SIZE);
                const gridY = Math.floor(newTargetY / GRID_SIZE);

                // 새로운 목표가 벽이 아니면 설정
                if (gridY >= 0 && gridY < gameManager.ROWS && gridX >= 0 && gridX < gameManager.COLS &&
                    gameManager.map[gridY][gridX].type !== TILE.WALL &&
                    gameManager.map[gridY][gridX].type !== TILE.CRACKED_WALL) {
                    this.moveTarget = { x: newTargetX, y: newTargetY };
                }
                this.stuckTimer = 0; // 막힘 타이머 초기화
            }
        } else { // 이동 목표 없으면 막힘 타이머 초기화
            this.stuckTimer = 0;
        }
        this.lastPosition = { x: this.pixelX, y: this.pixelY }; // 현재 위치 기록


        // --- 타일 상호작용 처리 ---
        const finalGridX = Math.floor(this.pixelX / GRID_SIZE);
        const finalGridY = Math.floor(this.pixelY / GRID_SIZE);

        // 자기장 피해
        if (this.isInMagneticField) {
            this.takeDamage(0.3 * gameManager.gameSpeed, { isTileDamage: true });
        }

        // 맵 범위 내 타일 상호작용
        if (finalGridY >= 0 && finalGridY < gameManager.ROWS && finalGridX >= 0 && finalGridX < gameManager.COLS) {
            const currentTile = gameManager.map[finalGridY][finalGridX];
            // 용암 피해
            if (currentTile.type === TILE.LAVA) this.takeDamage(0.2 * gameManager.gameSpeed, { isTileDamage: true });
            // 회복 팩
            if (currentTile.type === TILE.HEAL_PACK) {
                this.hp = this.maxHp; // 체력 완전 회복
                // 타일 제거
                gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor };
                gameManager.audioManager.play('heal'); // 회복 사운드
            }
            // 텔레포터
            if (currentTile.type === TILE.TELEPORTER && this.teleportCooldown <= 0) {
                const teleporters = gameManager.getTilesOfType(TILE.TELEPORTER);
                if (teleporters.length > 1) { // 텔레포터 2개 이상일 때만 작동
                    // 다른 텔레포터 찾기
                    const otherTeleporter = teleporters.find(t => t.x !== finalGridX || t.y !== finalGridY);
                    if (otherTeleporter) { // 찾았으면 이동
                        this.pixelX = otherTeleporter.x * GRID_SIZE + GRID_SIZE / 2;
                        this.pixelY = otherTeleporter.y * GRID_SIZE + GRID_SIZE / 2;
                        this.teleportCooldown = 120; // 2초 쿨다운
                        gameManager.audioManager.play('teleport'); // 텔레포트 사운드
                    }
                }
            }
            // 복제 타일 (왕 제외)
            if (currentTile.type === TILE.REPLICATION_TILE && !this.isKing) {
                for (let i = 0; i < currentTile.replicationValue; i++) {
                    gameManager.spawnUnit(this, true); // 유닛 복제 (무기 포함)
                }
                // 타일 제거
                gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor };
                gameManager.audioManager.play('replication'); // 복제 사운드
            }
            // 물음표 타일
            if (currentTile.type === TILE.QUESTION_MARK) {
                // 타일 제거
                gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor };
                gameManager.createEffect('question_mark_effect', this.pixelX, this.pixelY); // 물음표 시각 효과
                gameManager.audioManager.play('questionmark'); // 물음표 사운드
                gameManager.spawnRandomWeaponNear({ x: this.pixelX, y: this.pixelY }); // 주변에 무작위 무기 생성
            }
            // 돌진 타일
            if (currentTile.type === TILE.DASH_TILE) {
                this.isDashing = true; // 돌진 상태로 변경
                this.dashDirection = currentTile.direction; // 방향 설정
                this.dashDistanceRemaining = 5 * GRID_SIZE; // 거리 설정
                this.state = 'IDLE'; // 상태 초기화
                this.moveTarget = null; // 이동 목표 초기화
                gameManager.audioManager.play('rush'); // 돌진 사운드
                return; // 타일 상호작용 종료 (돌진 로직은 다음 프레임부터)
            }
            // 각성 물약 (아직 각성 안 했을 때)
            if (currentTile.type === TILE.AWAKENING_POTION && !this.awakeningEffect.active) {
                this.awakeningEffect.active = true; // 각성 활성화
                this.awakeningEffect.stacks = 0; // 중첩 초기화
                this.awakeningEffect.timer = 0; // 타이머 초기화
                // 타일 제거
                gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor };
                gameManager.audioManager.play('Arousal'); // 각성 사운드
                // 각성 파티클 효과
                for (let i = 0; i < 30; i++) {
                    const angle = gameManager.random() * Math.PI * 2;
                    const speed = 1 + gameManager.random() * 3;
                    const color = gameManager.random() > 0.5 ? '#FFFFFF' : '#3b82f6';
                    gameManager.addParticle({
                        x: this.pixelX, y: this.pixelY,
                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                        life: 0.8, color: color, size: gameManager.random() * 2 + 1.5,
                        gravity: 0.05
                    });
                }
            }
        }
    }


    draw(ctx, isOutlineEnabled, outlineWidth) {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        ctx.save(); // 전체 상태 저장

        // --- 각성 효과 처리 ---
        const scale = 1 + this.awakeningEffect.stacks * 0.2; // 중첩당 크기 증가
        const levelScale = 1 + (this.level - 1) * 0.08; // 레벨당 크기 증가
        const totalScale = scale * levelScale; // 최종 크기 배율

        // 각성 오라 효과
        if (this.awakeningEffect.active) {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.scale(totalScale, totalScale); // 최종 크기 적용

            const auraRadius = (GRID_SIZE / 1.4); // 오라 반지름
            const gradient = ctx.createRadialGradient(0, 0, auraRadius * 0.5, 0, 0, auraRadius); // 방사형 그라데이션
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)'); // 중심은 밝게
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); // 외곽은 투명하게
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        // 마법 단검 조준선 그리기
        if (this.isAimingMagicDagger) {
            const aimProgress = 1 - (this.magicDaggerAimTimer / 60); // 조준 진행률 (0 -> 1)
            // 현재 조준선 끝 위치 계산
            const currentEndX = this.pixelX + (this.magicDaggerTargetPos.x - this.pixelX) * aimProgress;
            const currentEndY = this.pixelY + (this.magicDaggerTargetPos.y - this.pixelY) * aimProgress;

            ctx.globalAlpha = 0.7; // 반투명
            ctx.strokeStyle = '#FFFFFF'; // 흰색
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 5]); // 점선
            ctx.beginPath();
            ctx.moveTo(this.pixelX, this.pixelY); // 시작점
            ctx.lineTo(currentEndX, currentEndY); // 끝점
            ctx.stroke();
            ctx.setLineDash([]); // 점선 해제
            ctx.globalAlpha = 1.0; // 투명도 복원
        }

        // 돌진 잔상 그리기
        if (this.isDashing) {
            this.dashTrail.forEach((pos, index) => {
                const opacity = (index / this.dashTrail.length) * 0.5; // 점점 투명하게
                ctx.save();
                ctx.globalAlpha = opacity;
                let teamColor; // 팀 색상
                switch(this.team) {
                    case TEAM.A: teamColor = COLORS.TEAM_A; break;
                    case TEAM.B: teamColor = COLORS.TEAM_B; break;
                    case TEAM.C: teamColor = COLORS.TEAM_C; break;
                    case TEAM.D: teamColor = COLORS.TEAM_D; break;
                    default: teamColor = '#FFFFFF'; break;
                }
                ctx.fillStyle = teamColor;
                ctx.beginPath(); ctx.arc(pos.x, pos.y, (GRID_SIZE / 1.67) * totalScale, 0, Math.PI * 2); ctx.fill(); // 원형 잔상
                ctx.restore();
            });
        }

        // --- 유닛 본체 그리기 ---
        // 최종 크기 적용
        ctx.translate(this.pixelX, this.pixelY);
        ctx.scale(totalScale, totalScale);
        ctx.translate(-this.pixelX, -this.pixelY);


        // 기절 시 반투명 처리
        if (this.isStunned > 0) {
            ctx.globalAlpha = 0.7;
        }

        // 쌍검 표식 그리기 (X자)
        if (this.isMarkedByDualSword.active) {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY - GRID_SIZE * 1.2 * totalScale); // 유닛 머리 위
            const markScale = 0.4 + Math.sin(this.gameManager.animationFrameCounter * 0.1) * 0.05; // 깜빡이는 효과
            ctx.scale(markScale, markScale);

            ctx.strokeStyle = '#9ca3af'; // 회색
            ctx.lineWidth = 2.5;

            const L = GRID_SIZE * 0.5; // X자 크기
            ctx.beginPath();
            ctx.moveTo(-L, -L); ctx.lineTo(L, L);
            ctx.moveTo(L, -L); ctx.lineTo(-L, L);
            ctx.stroke();

            ctx.restore();
        }

        // 유닛 몸통 (팀 색상 원)
        let bodyColor;
        switch(this.team) {
            case TEAM.A: bodyColor = COLORS.TEAM_A; break;
            case TEAM.B: bodyColor = COLORS.TEAM_B; break;
            case TEAM.C: bodyColor = COLORS.TEAM_C; break;
            case TEAM.D: bodyColor = COLORS.TEAM_D; break;
            default: bodyColor = '#FFFFFF'; break;
        }
        ctx.fillStyle = bodyColor;
        ctx.beginPath(); ctx.arc(this.pixelX, this.pixelY, GRID_SIZE / 1.67, 0, Math.PI * 2); ctx.fill();

        // 유닛 테두리 (옵션 활성화 시)
        if (isOutlineEnabled) {
            ctx.strokeStyle = 'black';
            ctx.lineWidth = outlineWidth / totalScale; // 크기에 반비례하여 두께 조절
            ctx.stroke();
        }

        // --- 눈 그리기 ---
        { // 블록 스코프 사용
            const headRadius = GRID_SIZE / 1.67; // 머리 반지름
            const eyeScale = this.gameManager?.unitEyeScale ?? 1.0; // 눈 크기 설정값
            const faceWidth = headRadius * 1.1 * eyeScale; // 얼굴 너비
            const faceHeight = headRadius * 0.7 * eyeScale; // 얼굴 높이
            const gap = headRadius * 0.3; // 눈 사이 간격
            const eyeWidth = (faceWidth - gap) / 2; // 눈 너비
            const eyeHeight = faceHeight; // 눈 높이

            // 상태 확인
            const isDead = this.hp <= 0;
            const isFighting = this.attackAnimationTimer > 0 || this.isCasting || (this.target && this.weapon);
            const isMoving = !!this.moveTarget && !isFighting && !this.isDashing;

            ctx.save();
            ctx.translate(this.pixelX, this.pixelY); // 유닛 중심으로 이동

            if (isDead) { // 죽었을 때 X자 눈
                ctx.strokeStyle = '#0f172a'; // 어두운 색
                ctx.lineWidth = headRadius * 0.5; // 굵게
                const xo = headRadius * 0.5; // X자 크기
                const yo = headRadius * 0.5;
                ctx.beginPath();
                ctx.moveTo(-xo, -yo); ctx.lineTo(xo, yo);
                ctx.moveTo(xo, -yo); ctx.lineTo(-xo, yo);
                ctx.stroke();
            } else { // 살아있을 때
                const leftX = -faceWidth / 2; // 왼쪽 눈 시작 X
                const rightX = gap / 2; // 오른쪽 눈 시작 X
                const topY = -eyeHeight / 2; // 눈 시작 Y
                ctx.fillStyle = '#ffffff'; // 흰자
                ctx.strokeStyle = '#0f172a'; // 테두리
                ctx.lineWidth = headRadius * 0.12; // 테두리 두께

                // 둥근 사각형 눈 그리기 (왼쪽)
                const rx = Math.min(eyeWidth, eyeHeight) * 0.35; // 모서리 둥글기 반지름
                ctx.beginPath();
                ctx.moveTo(leftX + rx, topY); // 좌상단 시작
                ctx.lineTo(leftX + eyeWidth - rx, topY); // 우상단 이동
                ctx.quadraticCurveTo(leftX + eyeWidth, topY, leftX + eyeWidth, topY + rx); // 우상단 모서리
                ctx.lineTo(leftX + eyeWidth, topY + eyeHeight - rx); // 우하단 이동
                ctx.quadraticCurveTo(leftX + eyeWidth, topY + eyeHeight, leftX + eyeWidth - rx, topY + eyeHeight); // 우하단 모서리
                ctx.lineTo(leftX + rx, topY + eyeHeight); // 좌하단 이동
                ctx.quadraticCurveTo(leftX, topY + eyeHeight, leftX, topY + eyeHeight - rx); // 좌하단 모서리
                ctx.lineTo(leftX, topY + rx); // 좌상단 이동
                ctx.quadraticCurveTo(leftX, topY, leftX + rx, topY); // 좌상단 모서리
                ctx.closePath();
                ctx.fill(); ctx.stroke();

                // 둥근 사각형 눈 그리기 (오른쪽)
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

                // --- 눈동자 위치 계산 ---
                let targetX = 0, targetY = 0; // 바라볼 목표 좌표 (유닛 기준 상대 좌표)
                if (isFighting && this.target) { // 싸우는 중이면 목표를 바라봄
                    targetX = this.target.pixelX - this.pixelX;
                    targetY = this.target.pixelY - this.pixelY;
                } else if (isMoving && this.moveTarget) { // 이동 중이면 이동 목표를 바라봄
                    targetX = this.moveTarget.x - this.pixelX;
                    targetY = this.moveTarget.y - this.pixelY;
                } else { // 가만히 있으면 무작위로 두리번거림
                    const t = this.gameManager.animationFrameCounter * 0.09 + (this.pixelX + this.pixelY) * 0.001; // 시간과 위치 기반 시드
                    targetX = Math.cos(t);
                    targetY = Math.sin(t * 1.4);
                }

                const ang = Math.atan2(targetY, targetX); // 바라볼 각도
                const maxOffX = eyeWidth * 0.18; // 눈동자 최대 이동 X
                const maxOffY = eyeHeight * 0.18; // 눈동자 최대 이동 Y
                const offX = Math.cos(ang) * maxOffX; // 눈동자 X 오프셋
                const offY = Math.sin(ang) * maxOffY; // 눈동자 Y 오프셋

                // 눈동자 색상 (싸울 땐 진한 팀 색, 아니면 검정)
                if (isFighting) {
                    let pupilColor;
                    switch(this.team) {
                        case TEAM.A: pupilColor = DEEP_COLORS.TEAM_A; break;
                        case TEAM.B: pupilColor = DEEP_COLORS.TEAM_B; break;
                        case TEAM.C: pupilColor = DEEP_COLORS.TEAM_C; break;
                        case TEAM.D: pupilColor = DEEP_COLORS.TEAM_D; break;
                        default: pupilColor = '#0b1020'; break;
                    }
                    ctx.fillStyle = pupilColor;
                } else {
                    ctx.fillStyle = '#0b1020'; // 평소 눈동자 색 (진한 남색)
                }
                const basePR = Math.min(eyeWidth, eyeHeight) * (isFighting ? 0.34 : 0.42); // 눈동자 크기 (싸울 때 약간 작게)

                // 눈동자 그리기 (양쪽)
                ctx.beginPath();
                ctx.arc(leftX + eyeWidth / 2 + offX * 0.6, topY + eyeHeight / 2 + offY * 0.6, basePR, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(rightX + eyeWidth / 2 + offX * 0.6, topY + eyeHeight / 2 + offY * 0.6, basePR, 0, Math.PI * 2);
                ctx.fill();

                // 싸울 때 앵그리 눈썹 그리기
                if (isFighting) {
                    ctx.strokeStyle = '#0b1020'; // 눈썹 색
                    ctx.lineWidth = headRadius * 0.25; // 눈썹 두께
                    const browY = topY - headRadius * 0.15; // 눈썹 Y 위치
                    ctx.beginPath(); // 왼쪽 눈썹 (\)
                    ctx.moveTo(leftX + eyeWidth * 0.15, browY + headRadius * 0.12);
                    ctx.lineTo(leftX + eyeWidth * 0.85, browY - headRadius * 0.12);
                    ctx.stroke();
                    ctx.beginPath(); // 오른쪽 눈썹 (/)
                    ctx.moveTo(rightX + eyeWidth * 0.15, browY - headRadius * 0.12);
                    ctx.lineTo(rightX + eyeWidth * 0.85, browY + headRadius * 0.12);
                    ctx.stroke();
                }
            }
            ctx.restore(); // 유닛 중심으로 이동했던 상태 복원
        } // 눈 그리기 끝

        ctx.restore(); // 최종 크기 적용했던 상태 복원

        // 이름표 그리기
        if (this.name) {
            ctx.fillStyle = this.nameColor;
            ctx.font = `bold 10px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText(this.name, this.pixelX, this.pixelY + GRID_SIZE); // 유닛 아래쪽
        }

        // 부메랑 끌려가는 선 그리기
        if (this.isBeingPulled && this.puller) {
            ctx.save();
            ctx.strokeStyle = '#94a3b8'; // 회색 선
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.puller.pixelX, this.puller.pixelY); // 부메랑 시전자 위치
            ctx.lineTo(this.pixelX, this.pixelY); // 유닛 위치
            ctx.stroke();
            ctx.restore();
        }

        // 기절 효과 (빙글빙글)
        if (this.isStunned > 0) {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY - GRID_SIZE); // 유닛 머리 위
            const rotation = gameManager.animationFrameCounter * 0.1; // 회전 속도
            ctx.rotate(rotation);
            ctx.strokeStyle = '#c084fc'; // 보라색
            ctx.lineWidth = 2.5;
            ctx.beginPath(); // 큰 원호
            ctx.arc(0, 0, GRID_SIZE * 0.4, 0, Math.PI * 1.5);
            ctx.stroke();
            ctx.beginPath(); // 작은 원호 (반대 방향)
            ctx.arc(0, 0, GRID_SIZE * 0.2, Math.PI, Math.PI * 2.5);
            ctx.stroke();
            ctx.restore();
        }

        // --- 장착된 무기 그리기 ---
        ctx.save();
        ctx.translate(this.pixelX, this.pixelY); // 유닛 위치로 다시 이동 (크기 배율 적용 안 된 상태)
        if (this.isKing) { // 왕관 그리기
            const kingTotalScale = 1.2; // 왕관 크기
            ctx.translate(0, -GRID_SIZE * 0.5); // 머리 위 위치 조정
            ctx.scale(kingTotalScale * totalScale, kingTotalScale * totalScale); // 최종 크기 배율 * 왕관 배율 적용
            ctx.fillStyle = '#facc15'; ctx.strokeStyle = 'black'; ctx.lineWidth = 1 / (kingTotalScale * totalScale); // 테두리 두께 조절
            ctx.beginPath(); // 왕관 모양
            ctx.moveTo(-GRID_SIZE * 0.4, -GRID_SIZE * 0.1); ctx.lineTo(-GRID_SIZE * 0.4, GRID_SIZE * 0.2);
            ctx.lineTo(GRID_SIZE * 0.4, GRID_SIZE * 0.2); ctx.lineTo(GRID_SIZE * 0.4, -GRID_SIZE * 0.1);
            ctx.lineTo(GRID_SIZE * 0.2, 0); ctx.lineTo(0, -GRID_SIZE * 0.1);
            ctx.lineTo(-GRID_SIZE * 0.2, 0); ctx.closePath();
            ctx.fill(); ctx.stroke();
        } else if (this.weapon) { // 다른 무기 그리기
            // weaponary.js의 drawEquipped 호출 (유닛 중심으로 좌표 변환했으므로 0,0 전달)
            this.weapon.drawEquipped(ctx, { ...this, pixelX: 0, pixelY: 0 });
        }
        ctx.restore(); // 유닛 위치 이동 상태 복원

        // --- UI 바 (체력, 공격 쿨다운 등) 그리기 ---
        const barWidth = GRID_SIZE * 0.8 * totalScale; // 바 너비 (크기 배율 적용)
        const barHeight = 4; // 바 높이
        const barGap = 1; // 바 사이 간격
        const barX = this.pixelX - barWidth / 2; // 바 시작 X 좌표

        // 각 바 표시 여부 확인
        const healthBarIsVisible = this.hp < this.maxHp || this.hpBarVisibleTimer > 0; // 체력 깎였거나 잠시 표시 중
        const normalAttackIsVisible = (this.isCasting && this.weapon?.type === 'poison_potion') || (this.attackCooldown > 0 && !this.isCasting); // 독 포션 캐스팅 중 또는 공격 쿨다운 중
        const kingSpawnBarIsVisible = this.isKing && this.spawnCooldown > 0; // 왕 유닛 생성 쿨다운 중
        let specialSkillIsVisible = // 특수 공격 쿨다운 또는 충전 중
            (this.weapon?.type === 'magic_dagger' && this.magicDaggerSkillCooldown > 0) ||
            (this.weapon?.type === 'axe' && this.axeSkillCooldown > 0) ||
            (this.weapon?.type === 'ice_diamond' && this.iceDiamondChargeTimer > 0 && this.iceDiamondCharges < 5) || // 충전 중일 때만 표시
            (this.weapon?.type === 'magic_spear' && this.magicCircleCooldown > 0) ||
            (this.weapon?.type === 'boomerang' && this.boomerangCooldown > 0) ||
            (this.weapon?.type === 'shuriken' && this.shurikenSkillCooldown > 0) ||
            (this.weapon?.type === 'fire_staff' && this.fireStaffSpecialCooldown > 0) ||
            (this.weapon?.type === 'dual_swords' && this.dualSwordSkillCooldown > 0) ||
            (this.isCasting && this.weapon?.type !== 'poison_potion'); // 독 포션 외 캐스팅 중

        // 공격 쿨다운 중이면 특수 공격 쿨다운 바 숨김 (겹치지 않게)
        // if (this.attackCooldown > 0 && !this.isCasting) {
        //     specialSkillIsVisible = false;
        // }

        const barsToShow = []; // 표시할 바 목록
        if (normalAttackIsVisible) barsToShow.push('attack');
        if (healthBarIsVisible) barsToShow.push('health');
        // 순서: 공격 쿨다운 -> 체력

        // 체력/공격 바 그리기
        if (barsToShow.length > 0) {
            const kingYOffset = this.isKing ? GRID_SIZE * 0.4 * totalScale : 0; // 왕일 때 약간 아래로
            const totalBarsHeight = (barsToShow.length * barHeight) + ((barsToShow.length - 1) * barGap); // 전체 바 높이
            let currentBarY = this.pixelY - (GRID_SIZE * 0.9 * totalScale) - totalBarsHeight - kingYOffset; // 시작 Y 위치 (유닛 위쪽)

            // 공격 쿨다운 바
            if (normalAttackIsVisible) {
                ctx.fillStyle = '#0c4a6e'; // 배경 (어두운 파랑)
                ctx.fillRect(barX, currentBarY, barWidth, barHeight);
                let progress = 0; // 진행률
                if (this.isCasting && this.weapon?.type === 'poison_potion') { // 독 포션 캐스팅
                    progress = this.castingProgress / this.castDuration;
                } else { // 일반 공격 쿨다운
                    progress = Math.max(0, 1 - (this.attackCooldown / this.cooldownTime));
                }
                ctx.fillStyle = '#38bdf8'; // 진행률 (밝은 파랑)
                ctx.fillRect(barX, currentBarY, barWidth * progress, barHeight);
                currentBarY += barHeight + barGap; // 다음 바 위치로 이동
            }

            // 체력 바
            if (healthBarIsVisible) {
                ctx.fillStyle = '#111827'; // 배경 (검정)
                ctx.fillRect(barX, currentBarY, barWidth, barHeight);

                // 부드러운 체력 감소 효과 (흰색)
                if (this.displayHp > this.hp) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // 반투명 흰색
                    ctx.fillRect(barX, currentBarY, barWidth * (this.displayHp / this.maxHp), barHeight);
                }

                // 실제 체력 (녹색)
                ctx.fillStyle = '#10b981';
                ctx.fillRect(barX, currentBarY, barWidth * (this.hp / this.maxHp), barHeight);

                // 피격 시 흰색 깜빡임 효과
                if (this.damageFlash > 0) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${this.damageFlash * 0.6})`; // 투명도 조절
                    ctx.fillRect(barX, currentBarY, barWidth * (this.hp / this.maxHp), barHeight);
                }

                // 레벨 표시 (레벨업 시스템 활성화 시)
                if (gameManager.isLevelUpEnabled && this.level > 0) {
                    const levelCircleRadius = 8; // 원 반지름
                    const levelX = barX + barWidth + levelCircleRadius + 4; // 원 X 위치 (체력바 오른쪽)
                    const levelY = currentBarY + barHeight / 2; // 원 Y 위치 (체력바 중앙)

                    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; // 배경 (반투명 검정)
                    ctx.beginPath();
                    ctx.arc(levelX, levelY, levelCircleRadius, 0, Math.PI * 2);
                    ctx.fill();

                    const fontSize = 10; // 폰트 크기
                    ctx.font = `bold ${fontSize}px Arial`;
                    ctx.fillStyle = 'white'; // 글자색
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle'; // 세로 중앙 정렬
                    ctx.fillText(this.level, levelX, levelY); // 레벨 숫자 표시
                }
                // currentBarY += barHeight + barGap; // 다음 바 위치로 (현재는 마지막 바)
            }
        }

        // 왕 유닛 생성 쿨다운 바
        if (kingSpawnBarIsVisible) {
            const spawnBarY = this.pixelY + GRID_SIZE * totalScale + (this.name ? 15 : 5); // 유닛 아래쪽 (이름표 있으면 더 아래)
            ctx.fillStyle = '#450a0a'; // 배경 (어두운 빨강)
            ctx.fillRect(barX, spawnBarY, barWidth, barHeight);
            const progress = 1 - (this.spawnCooldown / this.spawnInterval); // 진행률 (0 -> 1)
            ctx.fillStyle = '#ef4444'; // 진행률 (밝은 빨강)
            ctx.fillRect(barX, spawnBarY, barWidth * progress, barHeight);
        }

        // 특수 공격 쿨다운/충전 원형 바
        if (specialSkillIsVisible) {
            let fgColor, progress = 0, max = 1; // 바 색상, 진행률, 최대값

            // 무기별 설정
            if (this.weapon?.type === 'fire_staff') {
                fgColor = '#ef4444'; // 빨강
                progress = max = 240; if(this.fireStaffSpecialCooldown > 0) progress = 240 - this.fireStaffSpecialCooldown; // 쿨다운 진행률
            } else if (this.weapon?.type === 'magic_spear') {
                fgColor = '#a855f7'; // 보라
                progress = max = 300; if(this.magicCircleCooldown > 0) progress = 300 - this.magicCircleCooldown;
            } else if (['boomerang', 'shuriken', 'magic_dagger', 'axe', 'dual_swords'].includes(this.weapon?.type)) {
                fgColor = '#94a3b8'; // 회색
                if(this.weapon.type === 'boomerang') { max = 480; if(this.boomerangCooldown > 0) progress = 480 - this.boomerangCooldown;}
                else if(this.weapon.type === 'shuriken') { max = 480; if(this.shurikenSkillCooldown > 0) progress = 480 - this.shurikenSkillCooldown;} // 표창 쿨 8초로 가정
                else if(this.weapon.type === 'magic_dagger') { max = 420; if(this.magicDaggerSkillCooldown > 0) progress = 420 - this.magicDaggerSkillCooldown;}
                else if(this.weapon.type === 'axe') { max = 240; if(this.axeSkillCooldown > 0) progress = 240 - this.axeSkillCooldown;}
                else if(this.weapon.type === 'dual_swords') { max = 300; if(this.dualSwordSkillCooldown > 0) progress = 300 - this.dualSwordSkillCooldown;}
            } else if (this.weapon?.type === 'ice_diamond') { // 얼음 다이아 (충전)
                fgColor = '#38bdf8'; // 파랑
                progress = this.iceDiamondChargeTimer; max = 240; // 충전 타이머 진행률
            } else if (this.isCasting) { // 캐스팅 (독 포션 제외)
                 if(this.weapon?.type === 'poison_potion') {
                     // 독 포션 캐스팅 바는 위에서 처리
                 } else {
                    fgColor = '#facc15'; // 노랑 (임시)
                    progress = this.castingProgress; max = this.castDuration; // 캐스팅 진행률
                 }
            }


            if (fgColor) { // 그릴 바가 있으면
                ctx.save();
                ctx.lineWidth = 3; // 선 두께
                // 배경 원 (반투명 검정)
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                const radius = (GRID_SIZE / 1.67 + 3) * totalScale; // 유닛 몸통 바깥쪽
                ctx.beginPath();
                ctx.arc(this.pixelX, this.pixelY, radius, 0, Math.PI * 2);
                ctx.stroke();

                // 진행률 원호 (무기별 색상)
                ctx.strokeStyle = fgColor;
                ctx.beginPath();
                const startAngle = -Math.PI / 2; // 12시 방향에서 시작
                const endAngle = startAngle + (progress / max) * Math.PI * 2; // 진행률만큼 그리기
                ctx.arc(this.pixelX, this.pixelY, radius, startAngle, endAngle);
                ctx.stroke();
                ctx.restore();
            }
        }

        // 느낌표 표시 (경계 상태)
        const showAlert = this.alertedCounter > 0 || (this.weapon?.type === 'magic_spear' && this.target instanceof Unit && this.target.stunnedByMagicCircle);
        // 도망 상태 아닐 때만 표시
        if (showAlert && this.state !== 'FLEEING_FIELD' && this.state !== 'FLEEING_LAVA') {
            const yOffset = -GRID_SIZE * 1.1 * totalScale; // 유닛 머리 위
            ctx.fillStyle = 'yellow'; // 노란색
            ctx.font = `bold ${16 * totalScale}px Arial`; // 크기 배율 적용
            ctx.textAlign = 'center';
            // 회복 팩 찾을 땐 +, 나머진 !
            ctx.fillText(this.state === 'SEEKING_HEAL_PACK' ? '+' : '!', this.pixelX, this.pixelY + yOffset);
        }

        ctx.globalAlpha = 1.0; // 투명도 최종 복원
        // ctx.restore(); // 전체 상태 복원 (맨 처음에 save 했음) -> 각 그리기 블록에서 restore 하므로 필요 없음

    } // draw 메소드 끝


    performDualSwordTeleportAttack(enemies) {
        const target = this.dualSwordTeleportTarget; // 튕기는 검에 맞은 대상
        if (target && target.hp > 0) { // 대상이 살아있으면
            const teleportPos = this.gameManager.findEmptySpotNear(target); // 대상 주변 빈 공간 찾기
            // 순간이동
            this.pixelX = teleportPos.x;
            this.pixelY = teleportPos.y;
            this.dualSwordSpinAttackTimer = 20; // 회전 공격 애니메이션 시작 (약 0.3초)

            // 주변 적에게 광역 피해
            const damageRadius = GRID_SIZE * 2;
            enemies.forEach(enemy => {
                if (Math.hypot(this.pixelX - enemy.pixelX, this.pixelY - enemy.pixelY) < damageRadius) {
                    enemy.takeDamage(this.attackPower * 1.5, {}, this); // 1.5배 피해
                }
            });
            this.gameManager.audioManager.play('rotaryknife'); // 회전 공격 사운드
        }
        this.dualSwordTeleportTarget = null; // 순간이동 목표 초기화
        this.state = 'IDLE'; // 상태 초기화
    }

} // Unit 클래스 끝
