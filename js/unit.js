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
        this.displayHp = 100; // 화면 표시용 체력
        this.damageFlash = 0; // 피격 효과

        // 레벨업 시스템 속성
        this.level = 1;
        this.maxLevel = 5;
        this.killedBy = null;
        this.specialAttackLevelBonus = 0;
        this.levelUpParticleCooldown = 0;

        // 기본 능력치 및 상태
        this.baseSpeed = 1.0; this.facingAngle = gameManager.random() * Math.PI * 2;
        this.baseAttackPower = 5; this.baseAttackRange = 1.5 * GRID_SIZE;
        this.baseDetectionRange = 6 * GRID_SIZE;
        this.attackCooldown = 0; this.baseCooldownTime = 80;
        this.state = 'IDLE'; this.alertedCounter = 0;
        this.weapon = null; this.target = null; this.moveTarget = null;

        // 스킬 및 특수 상태 관련 속성
        this.isCasting = false; this.castingProgress = 0; this.castTargetPos = null;
        this.castDuration = 180; // 독 포션 캐스팅 시간 등
        this.teleportCooldown = 0;
        this.isKing = false; this.spawnCooldown = 0; this.spawnInterval = 720; // 왕 유닛 스폰 간격
        this.knockbackX = 0; this.knockbackY = 0; // 넉백
        this.isInMagneticField = false; // 자기장 영향 여부
        this.evasionCooldown = 0; // 회피 쿨다운 (표창, 번개)
        this.attackAnimationTimer = 0; // 공격 모션 타이머
        this.magicCircleCooldown = 0; // 마법창 스킬 쿨다운
        this.boomerangCooldown = 0; // 부메랑 스킬 쿨다운
        this.shurikenSkillCooldown = 0; // 표창 스킬 쿨다운
        this.isStunned = 0; // 스턴 지속 시간
        this.stunnedByMagicCircle = false; // 마법진 스턴 여부
        this.poisonEffect = { active: false, duration: 0, damage: 0 }; // 독 효과
        this.isBeingPulled = false; this.puller = null; this.pullTargetPos = null; // 부메랑 끌려감
        this.hpBarVisibleTimer = 0; // 체력바 표시 시간
        this.isDashing = false; this.dashSpeed = 8; this.dashDistanceRemaining = 0; this.dashDirection = null; this.dashTrail = []; // 돌진
        this.name = ''; this.nameColor = '#000000'; // 이름표
        this.awakeningEffect = { active: false, stacks: 0, timer: 0 }; // 각성 효과
        this.magicDaggerSkillCooldown = 0; this.isAimingMagicDagger = false; this.magicDaggerAimTimer = 0; this.magicDaggerTargetPos = null; // 마법 단검 스킬
        this.axeSkillCooldown = 0; // [🪓 MODIFIED] 도끼 스킬 쿨다운
        this.spinAnimationTimer = 0; // 도끼/쌍검 회전 애니메이션
        this.iceDiamondCharges = 0; this.iceDiamondChargeTimer = 0; // 얼음 다이아 충전
        this.fireStaffSpecialCooldown = 0; // 불 지팡이 스킬 쿨다운
        this.isSlowed = 0; // 둔화 지속 시간
        this.attackCount = 0; // 검/활 3타 카운트
        this.swordSpecialAttackAnimationTimer = 0; // 검기 애니메이션

        this.dualSwordSkillCooldown = 0; this.dualSwordTeleportTarget = null; this.dualSwordTeleportDelayTimer = 0; this.dualSwordSpinAttackTimer = 0; // 쌍검 스킬
        this.isMarkedByDualSword = { active: false, timer: 0 }; // 쌍검 표식

        this.isInLava = false; // 용암 위에 있는지
        this.fleeingCooldown = 0; // 용암 회피 후 쿨다운

        // 길찾기 막힘 감지용
        this.stuckTimer = 0;
        this.lastPosition = { x: this.pixelX, y: this.pixelY };

        // 특수 공격 준비 상태 플래그
        this.isSpecialAttackReady = false;
    }

    // --- Getters ---
    get speed() {
        const gameManager = this.gameManager;
        if (!gameManager || this.isStunned > 0) return 0;

        let speedModifier = 0;
        if (this.isInMagneticField) speedModifier -= 0.7; // 자기장 둔화
        if (this.poisonEffect.active) speedModifier -= 0.7; // 독 둔화
        if (this.isSlowed > 0) speedModifier -= 0.3; // 얼음 둔화 등

        // 현재 타일 확인 (용암 둔화)
        const gridX = Math.floor(this.pixelX / GRID_SIZE);
        const gridY = Math.floor(this.pixelY / GRID_SIZE);
        if (gridY >= 0 && gridY < gameManager.ROWS && gridX >= 0 && gridX < gameManager.COLS) {
            const tile = gameManager.map[gridY]?.[gridX]; // Optional chaining for safety
            if (tile?.type === TILE.LAVA) speedModifier = -0.5;
        }

        // 쌍검 전투 시 이속 증가
        let combatSpeedBoost = 0;
        if (this.weapon?.type === 'dual_swords' && (this.state === 'AGGRESSIVE' || this.state === 'ATTACKING_NEXUS')) {
            combatSpeedBoost = 0.5;
        }

        // 최종 속도 계산 (기본 + 무기 보너스 + 전투 보너스 + 둔화 효과) * 레벨 보너스
        let finalSpeed = (this.baseSpeed + (this.weapon?.speedBonus || 0) + combatSpeedBoost) + speedModifier;
        finalSpeed *= (1 + (this.level - 1) * 0.06); // 레벨당 6% 증가

        return Math.max(0.1, finalSpeed); // 최소 속도 보장
    }

    get attackPower() {
        // 기본 공격력 + 무기 보너스 + 레벨업 스킬 보너스
        // Ensure weapon exists before accessing its properties
        return this.baseAttackPower + (this.weapon?.attackPowerBonus || 0) + this.specialAttackLevelBonus;
    }

    get attackRange() {
        return this.baseAttackRange + (this.weapon?.attackRangeBonus || 0);
    }

    get detectionRange() {
        return this.baseDetectionRange + (this.weapon?.detectionRangeBonus || 0);
    }

    // [🪓 MODIFIED] 도끼 쿨타임 조정 포함
    get cooldownTime() {
        let finalCooldown = this.baseCooldownTime + (this.weapon?.attackCooldownBonus || 0);
        finalCooldown *= (1 - (this.level - 1) * 0.04); // 레벨당 쿨타임 4% 감소

        // 특정 무기 쿨타임 상/하한선 설정
        if (this.weapon?.type === 'fire_staff') return Math.max(20, Math.min(finalCooldown, 120));
        if (this.weapon?.type === 'hadoken') return Math.max(20, Math.min(finalCooldown, 120));
        if (this.weapon?.type === 'axe') return Math.max(20, Math.min(finalCooldown, 120)); // 도끼
        if (this.weapon?.type === 'ice_diamond') return Math.max(20, Math.min(finalCooldown, 180));

        return Math.max(20, finalCooldown); // 기본 쿨타임 하한선
    }

    // --- Methods ---
    equipWeapon(weaponType, isClone = false) {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        this.weapon = gameManager.createWeapon(0, 0, weaponType); // Weapon 인스턴스 생성
        gameManager.audioManager.play('equip'); // 장착 효과음
        if (this.weapon.type === 'crown' && !isClone) { // 왕관 장착 시 왕 설정
            this.isKing = true;
        }
        this.state = 'IDLE'; // 상태 초기화
        this.attackCount = 0; // 3타 카운트 초기화
    }

    // [🪓 MODIFIED] 레벨업 시 도끼도 스킬 공격력 보너스 받도록 수정
    levelUp(killedUnitLevel = 0) {
        const previousLevel = this.level;
        let newLevel = this.level;

        // 상대 레벨이 더 높으면 그 레벨 따라감, 아니면 1 증가
        if (killedUnitLevel > this.level) {
            newLevel = killedUnitLevel;
        } else {
            newLevel++;
        }
        this.level = Math.min(this.maxLevel, newLevel); // 최대 레벨 제한

        if (this.level > previousLevel) { // 레벨이 올랐으면
            const levelGained = this.level - previousLevel;

            // 능력치 상승
            this.maxHp += 10 * levelGained;
            this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.3); // 최대 체력의 30% 회복

            const weaponType = this.weapon?.type;
            const skillAttackWeapons = [ // 스킬 공격력 보너스를 받는 무기 목록
                'magic_dagger', 'poison_potion', 'ice_diamond', 'fire_staff',
                'magic_spear', 'boomerang', 'hadoken', 'shuriken', 'axe' // 도끼 추가
            ];

            // 스킬 무기면 스킬 공격력 증가, 아니면 기본 공격력 증가
            if (skillAttackWeapons.includes(weaponType)) {
                if (weaponType === 'shuriken') { // 표창은 보너스 절반
                    this.specialAttackLevelBonus += 5 * levelGained;
                } else {
                    this.specialAttackLevelBonus += 10 * levelGained;
                }
            } else { // 검, 활 등
                this.baseAttackPower += 5 * levelGained;
            }

            // 레벨업 이펙트 생성
            this.gameManager.createEffect('level_up', this.pixelX, this.pixelY, this);
        }
    }

    // 가장 가까운 아이템 찾기 (유닛, 무기 등)
    findClosest(items) {
        let closestItem = null, minDistance = Infinity;
        for (const item of items) {
            // Ensure item has position properties before calculating distance
            if (item && typeof item.pixelX === 'number' && typeof item.pixelY === 'number') {
                const distance = Math.hypot(this.pixelX - item.pixelX, this.pixelY - item.pixelY);
                if (distance < minDistance) { minDistance = distance; closestItem = item; }
            }
        }
        return { item: closestItem, distance: minDistance };
    }


    // 물리 효과 적용 (넉백, 유닛 충돌, 맵 경계 충돌)
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
                const tile = gameManager.map[gridY]?.[gridX]; // Optional chaining
                if (tile && (tile.type === TILE.WALL || tile.type === TILE.CRACKED_WALL || (tile.type === TILE.GLASS_WALL && !this.isBeingPulled))) {
                    this.knockbackX = 0; this.knockbackY = 0;
                } else {
                    this.pixelX = nextX; this.pixelY = nextY; // 이동
                }
            } else { // 맵 밖으로 밀려나면 그대로 이동
                this.pixelX = nextX; this.pixelY = nextY;
            }
        }
        // 넉백 점차 감소
        this.knockbackX *= 0.9; this.knockbackY *= 0.9;
        if (Math.abs(this.knockbackX) < 0.1) this.knockbackX = 0;
        if (Math.abs(this.knockbackY) < 0.1) this.knockbackY = 0;

        // 유닛 간 충돌 처리
        gameManager.units.forEach(otherUnit => {
            if (this !== otherUnit) {
                const dx = otherUnit.pixelX - this.pixelX;
                const dy = otherUnit.pixelY - this.pixelY;
                const distance = Math.hypot(dx, dy);
                const minDistance = (GRID_SIZE / 1.67) * 2; // 유닛 반지름 * 2

                if (distance < minDistance && distance > 0) { // 겹쳤으면
                    const angle = Math.atan2(dy, dx);
                    const overlap = minDistance - distance; // 겹친 거리
                    // 서로 밀어냄
                    const moveX = (overlap / 2) * Math.cos(angle);
                    const moveY = (overlap / 2) * Math.sin(angle);

                    // 다음 예상 위치 및 벽 충돌 확인
                    const myNextX = this.pixelX - moveX; const myNextY = this.pixelY - moveY;
                    const otherNextX = otherUnit.pixelX + moveX; const otherNextY = otherUnit.pixelY + moveY;
                    const myGridX = Math.floor(myNextX / GRID_SIZE); const myGridY = Math.floor(myNextY / GRID_SIZE);
                    const otherGridX = Math.floor(otherNextX / GRID_SIZE); const otherGridY = Math.floor(otherNextY / GRID_SIZE);
                    // Use optional chaining for map access
                    const isMyNextPosWall = (myGridY < 0 || myGridY >= gameManager.ROWS || myGridX < 0 || myGridX >= gameManager.COLS) || (gameManager.map[myGridY]?.[myGridX]?.type === TILE.WALL || gameManager.map[myGridY]?.[myGridX]?.type === TILE.CRACKED_WALL);
                    const isOtherNextPosWall = (otherGridY < 0 || otherGridY >= gameManager.ROWS || otherGridX < 0 || otherGridX >= gameManager.COLS) || (gameManager.map[otherGridY]?.[otherGridX]?.type === TILE.WALL || gameManager.map[otherGridY]?.[otherGridX]?.type === TILE.CRACKED_WALL);

                    // 벽 아니면 위치 조정
                    if (!isMyNextPosWall) { this.pixelX = myNextX; this.pixelY = myNextY; }
                    if (!isOtherNextPosWall) { otherUnit.pixelX = otherNextX; otherUnit.pixelY = otherNextY; }
                }
            }
        });

        // 맵 경계 충돌 처리
        const radius = GRID_SIZE / 1.67;
        let bounced = false;
        if (this.pixelX < radius) { this.pixelX = radius; this.knockbackX = Math.abs(this.knockbackX) * 0.5 || 1; bounced = true; }
        else if (this.pixelX > gameManager.canvas.width - radius) { this.pixelX = gameManager.canvas.width - radius; this.knockbackX = -Math.abs(this.knockbackX) * 0.5 || -1; bounced = true; }
        if (this.pixelY < radius) { this.pixelY = radius; this.knockbackY = Math.abs(this.knockbackY) * 0.5 || 1; bounced = true; }
        else if (this.pixelY > gameManager.canvas.height - radius) { this.pixelY = gameManager.canvas.height - radius; this.knockbackY = -Math.abs(this.knockbackY) * 0.5 || -1; bounced = true; }

        if (bounced && this.state === 'IDLE') this.moveTarget = null; // 튕겨나갔으면 배회 중지
    }

    // 이동 처리
    move() {
        if (!this.moveTarget || this.isCasting || this.isStunned > 0 || this.isAimingMagicDagger) return; // 이동 불가 상태
        const gameManager = this.gameManager;
        if (!gameManager) return;

        const dx = this.moveTarget.x - this.pixelX, dy = this.moveTarget.y - this.pixelY;
        const distance = Math.hypot(dx, dy);
        const currentSpeed = this.speed * gameManager.gameSpeed;
        if (distance < currentSpeed) { // 목표 도달
            this.pixelX = this.moveTarget.x; this.pixelY = this.moveTarget.y;
            this.moveTarget = null; return;
        }

        let angle = Math.atan2(dy, dx); // 목표 방향 각도

        // 용암 회피 로직
        if (gameManager.isLavaAvoidanceEnabled && this.state !== 'FLEEING_FIELD' && this.state !== 'FLEEING_LAVA') {
            const lookAheadDist = GRID_SIZE * 1.2;
            const lookAheadX = this.pixelX + Math.cos(angle) * lookAheadDist;
            const lookAheadY = this.pixelY + Math.sin(angle) * lookAheadDist;
            const lookAheadGridX = Math.floor(lookAheadX / GRID_SIZE);
            const lookAheadGridY = Math.floor(lookAheadY / GRID_SIZE);

            if (gameManager.isPosInLavaForUnit(lookAheadGridX, lookAheadGridY)) { // 예측 지점이 용암이면
                // 우회 시도
                const detourAngle = Math.PI / 3;
                let bestAngle = -1;
                const leftAngle = angle - detourAngle; const rightAngle = angle + detourAngle;
                // Use optional chaining for map access
                const isLeftSafe = !gameManager.isPosInLavaForUnit(Math.floor((this.pixelX + Math.cos(leftAngle) * lookAheadDist) / GRID_SIZE), Math.floor((this.pixelY + Math.sin(leftAngle) * lookAheadDist) / GRID_SIZE));
                const isRightSafe = !gameManager.isPosInLavaForUnit(Math.floor((this.pixelX + Math.cos(rightAngle) * lookAheadDist) / GRID_SIZE), Math.floor((this.pixelY + Math.sin(rightAngle) * lookAheadDist) / GRID_SIZE));

                if (isLeftSafe && isRightSafe) bestAngle = Math.abs(leftAngle - angle) < Math.abs(rightAngle - angle) ? leftAngle : rightAngle;
                else if (isLeftSafe) bestAngle = leftAngle;
                else if (isRightSafe) bestAngle = rightAngle;

                if (bestAngle !== -1) angle = bestAngle; // 우회 각도 적용
            }
        }

        // 다음 위치 계산 및 벽 충돌 처리
        const nextPixelX = this.pixelX + Math.cos(angle) * currentSpeed;
        const nextPixelY = this.pixelY + Math.sin(angle) * currentSpeed;
        const nextGridX = Math.floor(nextPixelX / GRID_SIZE);
        const nextGridY = Math.floor(nextPixelY / GRID_SIZE);

        if (nextGridY >= 0 && nextGridY < gameManager.ROWS && nextGridX >= 0 && nextGridX < gameManager.COLS) {
            const collidedTile = gameManager.map[nextGridY]?.[nextGridX]; // Optional chaining
            if (collidedTile && (collidedTile.type === TILE.WALL || collidedTile.type === TILE.CRACKED_WALL || collidedTile.type === TILE.GLASS_WALL)) {
                if (collidedTile.type === TILE.CRACKED_WALL) gameManager.damageTile(nextGridX, nextGridY, this.attackPower * 0.5); // 벽 파괴 시도 (약하게)
                // 튕겨나감
                const bounceAngle = this.facingAngle + Math.PI + (gameManager.random() - 0.5);
                this.knockbackX += Math.cos(bounceAngle) * 1.5; this.knockbackY += Math.sin(bounceAngle) * 1.5;
                this.moveTarget = null; return; // 이동 중지
            }
        } else { // 맵 밖으로 이동 시도
             this.moveTarget = null; return; // 이동 중지 (applyPhysics에서 튕겨냄)
        }

        // 이동 및 방향 전환
        this.facingAngle = angle; this.pixelX = nextPixelX; this.pixelY = nextPixelY;
    }

    // 공격 처리
    attack(target) {
        if (!target || this.attackCooldown > 0 || this.isStunned > 0 || this.isCasting) return; // 공격 불가 상태
        const gameManager = this.gameManager;
        if (!gameManager) return;

        // 타겟 위치 및 타일 확인
        const targetGridX = Math.floor(target.pixelX / GRID_SIZE);
        const targetGridY = Math.floor(target.pixelY / GRID_SIZE);
        if (targetGridY < 0 || targetGridY >= gameManager.ROWS || targetGridX < 0 || targetGridX >= gameManager.COLS) return; // 맵 밖 타겟
        const tile = gameManager.map[targetGridY]?.[targetGridX]; // Optional chaining

        // 부서지는 벽 공격
        if (tile?.type === TILE.CRACKED_WALL) {
            gameManager.damageTile(targetGridX, targetGridY, this.attackPower);
            this.attackCooldown = this.cooldownTime;
            this.attackAnimationTimer = 15;
        }
        // 유닛 또는 넥서스 공격
        else if (target instanceof Unit || target instanceof Nexus) {
            if (this.weapon) this.weapon.use(this, target); // 무기 사용
            else { // 맨손 공격
                target.takeDamage(this.attackPower, {}, this);
                gameManager.audioManager.play('punch');
                this.attackCooldown = this.cooldownTime;
                this.attackAnimationTimer = 15;
            }
        }
    }

    // 데미지 처리
    takeDamage(damage, effectInfo = {}, attacker = null) {
        const gameManager = this.gameManager;
        // 물리 피격 이펙트 (타일 데미지 제외)
        if (gameManager && damage > 0 && !effectInfo.isTileDamage) createPhysicalHitEffect(gameManager, this);

        this.hp -= damage; // 체력 감소
        this.hpBarVisibleTimer = 180; // 체력바 표시
        this.damageFlash = 1.0; // 피격 플래시

        // 마지막 공격자 기록
        if (attacker instanceof Unit) this.killedBy = attacker;
        if (this.hp <= 0 && !this.killedBy && attacker) this.killedBy = attacker; // Ensure killer is recorded if hp drops to 0

        // 부가 효과 처리
        if (effectInfo.interrupt && (!['shuriken', 'lightning'].includes(this.weapon?.type) || effectInfo.force > 0)) { this.isCasting = false; this.castingProgress = 0; } // 캐스팅 방해
        if (effectInfo.force > 0) { this.knockbackX += Math.cos(effectInfo.angle) * effectInfo.force; this.knockbackY += Math.sin(effectInfo.angle) * effectInfo.force; } // 넉백
        if (effectInfo.stun) { // 스턴
            if (this.isStunned <= 0 && gameManager) gameManager.audioManager.play('stern'); // Play sound only when initially stunned
            this.isStunned = Math.max(this.isStunned, effectInfo.stun);
            if (effectInfo.stunSource === 'magic_circle') this.stunnedByMagicCircle = true;
        }
        if (effectInfo.poison) { this.poisonEffect = { active: true, duration: 180, damage: effectInfo.poison.damage }; } // 독
        if (effectInfo.slow) { this.isSlowed = Math.max(this.isSlowed, effectInfo.slow); } // 둔화
    }


    // 사망 처리
    handleDeath() {
        const gameManager = this.gameManager;
        if (!gameManager) return;
        // 독 포션 사망 시 독구름 생성
        if (this.weapon?.type === 'poison_potion') {
            gameManager.castAreaSpell({ x: this.pixelX, y: this.pixelY }, 'poison_cloud', this.team, this.specialAttackLevelBonus);
        }
    }

    // --- Main Update Logic ---
    update(enemies, weapons, projectiles) {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        // --- 효과 업데이트 ---
        // 체력바 부드럽게
        if (this.displayHp > this.hp) { this.displayHp -= (this.displayHp - this.hp) * 0.1 * gameManager.gameSpeed; if(this.displayHp < this.hp) this.displayHp = this.hp; } else { this.displayHp = this.hp; }
        // 피격 플래시 감소
        if (this.damageFlash > 0) this.damageFlash -= 0.05 * gameManager.gameSpeed;
        // 레벨업 파티클 생성
        if (this.level >= 2 && gameManager.isLevelUpEnabled) {
             this.levelUpParticleCooldown -= gameManager.gameSpeed;
            if (this.levelUpParticleCooldown <= 0) {
                this.levelUpParticleCooldown = 15 - this.level; // 레벨 높을수록 자주
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
                        x: spawnX, y: spawnY,
                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                        life: 0.6, color: teamColor, size: this.level * 0.5 + gameManager.random() * this.level, gravity: -0.02
                    });
                }
            }
        }

        // --- 상태별 행동 중지 조건 ---
        // 대시 중
        if (this.isDashing) {
            this.dashTrail.push({ x: this.pixelX, y: this.pixelY });
            if (this.dashTrail.length > 5) this.dashTrail.shift();
            let moveX = 0, moveY = 0;
            switch (this.dashDirection) { case 'RIGHT': moveX = this.dashSpeed; break; case 'LEFT': moveX = -this.dashSpeed; break; case 'DOWN': moveY = this.dashSpeed; break; case 'UP': moveY = -this.dashSpeed; break; }
            for (let i = 0; i < gameManager.gameSpeed; i++) {
                const nextX = this.pixelX + moveX; const nextY = this.pixelY + moveY;
                const gridX = Math.floor(nextX / GRID_SIZE); const gridY = Math.floor(nextY / GRID_SIZE);
                if (gridY < 0 || gridY >= gameManager.ROWS || gridX < 0 || gridX >= gameManager.COLS) { this.isDashing = false; break; }
                const tile = gameManager.map[gridY]?.[gridX];
                if (tile?.type === TILE.WALL) { this.isDashing = false; break; }
                if (tile?.type === TILE.CRACKED_WALL) gameManager.damageTile(gridX, gridY, 999);
                this.pixelX = nextX; this.pixelY = nextY;
                this.dashDistanceRemaining -= this.dashSpeed;
                if (this.dashDistanceRemaining <= 0) { this.isDashing = false; break; }
            }
            if (!this.isDashing) this.dashTrail = [];
            return;
        }
        // 체력바 타이머
        if (this.hpBarVisibleTimer > 0) this.hpBarVisibleTimer--;
        // 끌려가는 중
        if (this.isBeingPulled && this.puller) {
            const dx = this.pullTargetPos.x - this.pixelX; const dy = this.pullTargetPos.y - this.pixelY; const dist = Math.hypot(dx, dy); const pullSpeed = 4;
            if (dist < pullSpeed * gameManager.gameSpeed) {
                this.pixelX = this.pullTargetPos.x; this.pixelY = this.pullTargetPos.y; this.isBeingPulled = false;
                const damage = 20 + (this.puller.specialAttackLevelBonus || 0); this.takeDamage(damage, { stun: 120 }, this.puller); this.puller = null;
            } else { const angle = Math.atan2(dy, dx); this.pixelX += Math.cos(angle) * pullSpeed * gameManager.gameSpeed; this.pixelY += Math.sin(angle) * pullSpeed * gameManager.gameSpeed; this.knockbackX = 0; this.knockbackY = 0; }
            this.applyPhysics(); return;
        }
        // 스턴 중
        if (this.isStunned > 0) { this.isStunned -= gameManager.gameSpeed; if (this.isStunned <= 0) this.stunnedByMagicCircle = false; this.applyPhysics(); return; }
        // 둔화 시간 감소
        if (this.isSlowed > 0) this.isSlowed -= gameManager.gameSpeed;
        // 쌍검 표식 시간 감소
        if (this.isMarkedByDualSword.active) { this.isMarkedByDualSword.timer -= gameManager.gameSpeed; if (this.isMarkedByDualSword.timer <= 0) this.isMarkedByDualSword.active = false; }
        // 각성 스택 증가
        if (this.awakeningEffect.active && this.awakeningEffect.stacks < 3) {
            this.awakeningEffect.timer += gameManager.gameSpeed;
            if (this.awakeningEffect.timer >= 300) {
                this.awakeningEffect.timer = 0; this.awakeningEffect.stacks++; this.maxHp += 20; this.hp = Math.min(this.maxHp, this.hp + 20); this.baseAttackPower += 3;
                gameManager.audioManager.play('Arousal');
                for (let i = 0; i < 30; i++) {
                    const angle = gameManager.random() * Math.PI * 2; const speed = 1 + gameManager.random() * 3; const color = gameManager.random() > 0.5 ? '#FFFFFF' : '#3b82f6';
                    gameManager.addParticle({ x: this.pixelX, y: this.pixelY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.8, color: color, size: gameManager.random() * 2 + 1.5, gravity: 0.05 });
                }
            }
        }

        // --- 쿨타임 감소 ---
        if (this.magicDaggerSkillCooldown > 0) this.magicDaggerSkillCooldown -= gameManager.gameSpeed;
        if (this.axeSkillCooldown > 0) this.axeSkillCooldown -= gameManager.gameSpeed; // [🪓 ADDED] 도끼
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

        // 회피 로직 (표창, 번개)
        if (this.weapon && ['shuriken', 'lightning'].includes(this.weapon.type) && this.evasionCooldown <= 0) {
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
        // 독 효과 데미지
        if (this.poisonEffect.active) { this.poisonEffect.duration -= gameManager.gameSpeed; this.takeDamage(this.poisonEffect.damage * gameManager.gameSpeed, { isTileDamage: true }); if (this.poisonEffect.duration <= 0) this.poisonEffect.active = false; }
        // 얼음 다이아 충전
        if (this.weapon?.type === 'ice_diamond' && this.iceDiamondCharges < 5) { this.iceDiamondChargeTimer += gameManager.gameSpeed; if (this.iceDiamondChargeTimer >= 240) { this.iceDiamondCharges++; this.iceDiamondChargeTimer = 0; } }
        // 쌍검 순간이동 딜레이 후 공격 (딜레이 끝나기 직전에 실행되도록 수정)
        if (this.dualSwordTeleportDelayTimer > 0 && this.dualSwordTeleportDelayTimer - gameManager.gameSpeed <= 0) { this.performDualSwordTeleportAttack(enemies); }
        // 왕 유닛 스폰
        if (this.isKing && this.spawnCooldown <= 0) { this.spawnCooldown = this.spawnInterval; gameManager.spawnUnit(this, false); }
        // 캐스팅 (독 포션 자폭)
        if (this.isCasting) {
             this.castingProgress += gameManager.gameSpeed;
            if (!this.target || (this.target instanceof Unit && this.target.hp <= 0)) { this.isCasting = false; this.castingProgress = 0; return; }
            if (this.castingProgress >= this.castDuration) {
                this.isCasting = false; this.castingProgress = 0;
                if (this.weapon.type === 'poison_potion') { gameManager.audioManager.play('poison'); this.hp = 0; }
            }
            this.applyPhysics(); return;
        }

        // --- 스킬 사용 시도 ---
        let skillUsed = false; // 스킬 사용 여부 플래그
        // 마법 단검
        if (this.weapon?.type === 'magic_dagger' && !this.isAimingMagicDagger && this.magicDaggerSkillCooldown <= 0 && this.attackCooldown <= 0) {
            const { item: closestEnemy } = this.findClosest(enemies);
            if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy) && Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY) < this.detectionRange) {
                this.isAimingMagicDagger = true; this.magicDaggerAimTimer = 60; const angle = Math.atan2(closestEnemy.pixelY - this.pixelY, closestEnemy.pixelX - this.pixelX); const dashDistance = GRID_SIZE * 4; this.magicDaggerTargetPos = { x: this.pixelX + Math.cos(angle) * dashDistance, y: this.pixelY + Math.sin(angle) * dashDistance };
            }
        }
        if (this.isAimingMagicDagger) {
            this.magicDaggerAimTimer -= gameManager.gameSpeed;
            if (this.magicDaggerAimTimer <= 0) {
                this.isAimingMagicDagger = false; this.magicDaggerSkillCooldown = 420; this.attackCooldown = 30; const startPos = { x: this.pixelX, y: this.pixelY }; const endPos = this.magicDaggerTargetPos;
                enemies.forEach(enemy => {
                    const distToLine = Math.abs((endPos.y - startPos.y) * enemy.pixelX - (endPos.x - startPos.x) * enemy.pixelY + endPos.x * startPos.y - endPos.y * startPos.x) / Math.hypot(endPos.y - startPos.y, endPos.x - startPos.x);
                     if (distToLine < GRID_SIZE) {
                         const dotProduct = (enemy.pixelX - startPos.x) * (endPos.x - startPos.x) + (enemy.pixelY - startPos.y) * (endPos.y - startPos.y);
                         const squaredLength = Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2);
                         if (dotProduct >= 0 && dotProduct <= squaredLength) enemy.takeDamage(this.attackPower * 1.2 + this.specialAttackLevelBonus, { stun: 60 }, this);
                     }
                });
                this.pixelX = endPos.x; this.pixelY = endPos.y;
                gameManager.effects.push(new MagicDaggerDashEffect(gameManager, startPos, endPos)); gameManager.audioManager.play('magicdagger');
                for (let i = 0; i < 15; i++) { /* ... 파티클 ... */ }
                skillUsed = true;
            } else { skillUsed = true; } // 조준 중에도 다른 행동 X
        }
        // 마법창
        else if (this.weapon?.type === 'magic_spear') {
            if (this.magicCircleCooldown <= 0) { gameManager.spawnMagicCircle(this.team); this.magicCircleCooldown = 300; }
            const stunnedEnemy = gameManager.findStunnedByMagicCircleEnemy(this.team);
            if (stunnedEnemy && this.attackCooldown <= 0) { this.alertedCounter = 60; this.target = stunnedEnemy; gameManager.createProjectile(this, stunnedEnemy, 'magic_spear_special'); gameManager.audioManager.play('spear'); this.attackCooldown = this.cooldownTime; skillUsed = true; }
        }
        // 부메랑
        else if (this.weapon?.type === 'boomerang' && this.boomerangCooldown <= 0) {
            const { item: closestEnemy } = this.findClosest(enemies);
            if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy) && Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY) <= this.attackRange) {
                this.boomerangCooldown = 480; gameManager.createProjectile(this, closestEnemy, 'boomerang_projectile'); gameManager.audioManager.play('boomerang'); this.state = 'IDLE'; this.moveTarget = null; this.attackCooldown = 60; this.applyPhysics(); skillUsed = true;
            }
        }
        // 도끼 [🪓 ADDED]
        else if (this.weapon?.type === 'axe' && this.axeSkillCooldown <= 0) {
            const { item: closestEnemy } = this.findClosest(enemies);
            if (closestEnemy && Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY) < GRID_SIZE * 3) {
                this.axeSkillCooldown = 240; this.spinAnimationTimer = 30; gameManager.audioManager.play('axe'); gameManager.createEffect('axe_spin_effect', this.pixelX, this.pixelY, this);
                const damageRadius = GRID_SIZE * 3.5;
                enemies.forEach(enemy => { if (Math.hypot(this.pixelX - enemy.pixelX, this.pixelY - enemy.pixelY) < damageRadius) enemy.takeDamage(this.attackPower * 1.5 + this.specialAttackLevelBonus, {}, this); });
                gameManager.nexuses.forEach(nexus => { if (nexus.team !== this.team && !nexus.isDestroying && Math.hypot(this.pixelX - nexus.pixelX, this.pixelY - nexus.pixelY) < damageRadius) nexus.takeDamage(this.attackPower * 1.5 + this.specialAttackLevelBonus); });
                gameManager.audioManager.play('swordHit'); this.attackCooldown = this.cooldownTime; skillUsed = true;
            }
        }
        // 표창
        else if (this.weapon?.type === 'shuriken' && this.shurikenSkillCooldown <= 0) {
             const { item: closestEnemy } = this.findClosest(enemies);
             if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy) && Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY) <= this.attackRange) { this.weapon.use(this, closestEnemy); skillUsed = true; }
        }
        // 불 지팡이
        else if (this.weapon?.type === 'fire_staff' && this.fireStaffSpecialCooldown <= 0) {
            const { item: closestEnemy } = this.findClosest(enemies);
             if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy) && Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY) <= this.attackRange) { gameManager.createProjectile(this, closestEnemy, 'fireball_projectile'); gameManager.audioManager.play('fireball'); this.fireStaffSpecialCooldown = 240; this.attackCooldown = 60; skillUsed = true; }
        }
        // 쌍검
        else if (this.weapon?.type === 'dual_swords' && this.dualSwordSkillCooldown <= 0) {
             const { item: closestEnemy } = this.findClosest(enemies);
             if (closestEnemy && gameManager.hasLineOfSight(this, closestEnemy) && Math.hypot(this.pixelX - closestEnemy.pixelX, this.pixelY - closestEnemy.pixelY) <= this.detectionRange * 1.2) { gameManager.audioManager.play('shurikenShoot'); gameManager.createProjectile(this, closestEnemy, 'bouncing_sword'); this.dualSwordSkillCooldown = 300; this.attackCooldown = 60; this.moveTarget = null; this.facingAngle = Math.atan2(closestEnemy.pixelY - this.pixelY, closestEnemy.pixelX - this.pixelX); skillUsed = true; }
        }

        // 스킬 사용 시 update 종료
        if (skillUsed) return;

        // --- AI 상태 결정 (스킬 사용 안 했을 경우) ---
        let newState = 'IDLE'; let newTarget = null; let targetEnemyForAlert = null;
        const currentGridXBeforeMove = Math.floor(this.pixelX / GRID_SIZE); const currentGridYBeforeMove = Math.floor(this.pixelY / GRID_SIZE);
        this.isInMagneticField = gameManager.isPosInAnyField(currentGridXBeforeMove, currentGridYBeforeMove);
        this.isInLava = gameManager.isPosInLavaForUnit(currentGridXBeforeMove, currentGridYBeforeMove);
        if (this.isInMagneticField) newState = 'FLEEING_FIELD';
        else if (gameManager.isLavaAvoidanceEnabled && this.isInLava) { newState = 'FLEEING_LAVA'; this.fleeingCooldown = 60; }
        else if (this.fleeingCooldown <= 0) {
            const enemyNexus = gameManager.nexuses.find(n => n.team !== this.team && !n.isDestroying);
            const { item: closestEnemy, distance: enemyDist } = this.findClosest(enemies);
            const visibleWeapons = weapons.filter(w => !w.isEquipped && gameManager.hasLineOfSightForWeapon(this, w));
            const { item: targetWeapon, distance: weaponDist } = this.findClosest(visibleWeapons);
            let closestQuestionMark = null; let questionMarkDist = Infinity;
            if (!this.weapon) {
                const qTiles = gameManager.getTilesOfType(TILE.QUESTION_MARK);
                const qPos = qTiles.map(p => ({ gridX: p.x, gridY: p.y, pixelX: p.x * GRID_SIZE + GRID_SIZE / 2, pixelY: p.y * GRID_SIZE + GRID_SIZE / 2 }));
                ({ item: closestQuestionMark, distance: questionMarkDist } = this.findClosest(qPos));
            }
            let targetEnemy = null;
            if (closestEnemy && enemyDist <= this.detectionRange && gameManager.hasLineOfSight(this, closestEnemy)) { targetEnemy = closestEnemy; targetEnemyForAlert = closestEnemy; }

            if (this.isKing && targetEnemy) { newState = 'FLEEING'; newTarget = targetEnemy; }
            else if (this.hp < this.maxHp / 2) {
                const hPacks = gameManager.getTilesOfType(TILE.HEAL_PACK);
                if (hPacks.length > 0) {
                    const hPos = hPacks.map(p => ({ gridX: p.x, gridY: p.y, pixelX: p.x * GRID_SIZE + GRID_SIZE / 2, pixelY: p.y * GRID_SIZE + GRID_SIZE / 2 }));
                    const { item: closestPack, distance: packDist } = this.findClosest(hPos);
                    if (closestPack && packDist < this.detectionRange * 1.5) { newState = 'SEEKING_HEAL_PACK'; newTarget = closestPack; }
                }
            }
            if (newState === 'IDLE') {
                if (closestQuestionMark && questionMarkDist <= this.detectionRange) { newState = 'SEEKING_QUESTION_MARK'; newTarget = closestQuestionMark; }
                else if (!this.weapon && targetWeapon && weaponDist <= this.detectionRange) { newState = 'SEEKING_WEAPON'; newTarget = targetWeapon; }
                else if (targetEnemy) { newState = 'AGGRESSIVE'; newTarget = targetEnemy; }
                else if (enemyNexus && gameManager.hasLineOfSight(this, enemyNexus) && Math.hypot(this.pixelX - enemyNexus.pixelX, this.pixelY - enemyNexus.pixelY) <= this.detectionRange) { newState = 'ATTACKING_NEXUS'; newTarget = enemyNexus; }
            }
        } else { if (this.moveTarget) newState = this.state; else newState = 'IDLE'; }

        if (this.state !== newState && newState !== 'IDLE' && newState !== 'FLEEING_FIELD' && newState !== 'FLEEING_LAVA') { if (!(this.weapon?.type === 'magic_spear' && this.target instanceof Unit && this.target.stunnedByMagicCircle)) this.alertedCounter = 60; }
        this.state = newState; this.target = newTarget;

        // --- 상태별 행동 처리 ---
        switch (this.state) {
            case 'FLEEING_FIELD': this.moveTarget = gameManager.findClosestSafeSpot(this.pixelX, this.pixelY); break;
            case 'FLEEING_LAVA': this.moveTarget = gameManager.findClosestSafeSpotFromLava(this.pixelX, this.pixelY); break;
            case 'FLEEING': if (this.target) { const a = Math.atan2(this.pixelY - this.target.pixelY, this.pixelX - this.target.pixelX); this.moveTarget = { x: this.pixelX + Math.cos(a) * GRID_SIZE * 5, y: this.pixelY + Math.sin(a) * GRID_SIZE * 5 }; } break;
            case 'SEEKING_HEAL_PACK': case 'SEEKING_QUESTION_MARK': if (this.target) this.moveTarget = { x: this.target.pixelX, y: this.target.pixelY }; break;
            case 'SEEKING_WEAPON': if (this.target) { if (Math.hypot(this.pixelX - this.target.pixelX, this.pixelY - this.target.pixelY) < GRID_SIZE * 0.8 && !this.target.isEquipped) { this.equipWeapon(this.target.type); this.target.isEquipped = true; this.target = null; } else { this.moveTarget = { x: this.target.pixelX, y: this.target.pixelY }; } } break;
            case 'ATTACKING_NEXUS': case 'AGGRESSIVE': if (this.target) { let atkDist = this.attackRange; if (this.weapon?.type === 'poison_potion') atkDist = this.baseAttackRange; if (Math.hypot(this.pixelX - this.target.pixelX, this.pixelY - this.target.pixelY) <= atkDist) { this.moveTarget = null; this.attack(this.target); this.facingAngle = Math.atan2(this.target.pixelY - this.pixelY, this.target.pixelX - this.pixelX); } else { this.moveTarget = { x: this.target.pixelX, y: this.target.pixelY }; } } break;
            case 'IDLE': default: if (!this.moveTarget || Math.hypot(this.pixelX - this.moveTarget.x, this.pixelY - this.moveTarget.y) < GRID_SIZE) { const a = gameManager.random() * Math.PI * 2; this.moveTarget = { x: this.pixelX + Math.cos(a) * GRID_SIZE * 8, y: this.pixelY + Math.sin(a) * GRID_SIZE * 8 }; } break;
        }

        // 이동 실행
        this.move();
        // 물리 효과 적용
        this.applyPhysics();
        // 막힘 감지 및 처리
        if (this.moveTarget) {
            const distMoved = Math.hypot(this.pixelX - this.lastPosition.x, this.pixelY - this.lastPosition.y);
            if (distMoved < 0.2 * gameManager.gameSpeed) this.stuckTimer += 1; else this.stuckTimer = 0;
            if (this.stuckTimer > 30) {
                const angle = gameManager.random() * Math.PI * 2; const radius = GRID_SIZE * 3; const newTargetX = this.pixelX + Math.cos(angle) * radius; const newTargetY = this.pixelY + Math.sin(angle) * radius;
                const gridX = Math.floor(newTargetX / GRID_SIZE); const gridY = Math.floor(newTargetY / GRID_SIZE);
                if (gridY >= 0 && gridY < gameManager.ROWS && gridX >= 0 && gridX < gameManager.COLS && gameManager.map[gridY]?.[gridX]?.type !== TILE.WALL && gameManager.map[gridY]?.[gridX]?.type !== TILE.CRACKED_WALL) { this.moveTarget = { x: newTargetX, y: newTargetY }; }
                this.stuckTimer = 0;
            }
        } else { this.stuckTimer = 0; }
        this.lastPosition = { x: this.pixelX, y: this.pixelY };

        // --- 현재 위치 타일 효과 처리 ---
        const finalGridX = Math.floor(this.pixelX / GRID_SIZE); const finalGridY = Math.floor(this.pixelY / GRID_SIZE);
        if (this.isInMagneticField) { this.takeDamage(0.3 * gameManager.gameSpeed, { isTileDamage: true }); }
        if (finalGridY >= 0 && finalGridY < gameManager.ROWS && finalGridX >= 0 && finalGridX < gameManager.COLS) {
            const currentTile = gameManager.map[finalGridY]?.[finalGridX]; // Optional chaining
            if (currentTile) { // Ensure tile exists
                if (currentTile.type === TILE.LAVA) this.takeDamage(0.2 * gameManager.gameSpeed, { isTileDamage: true });
                if (currentTile.type === TILE.HEAL_PACK) { this.hp = this.maxHp; gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor }; gameManager.audioManager.play('heal'); }
                if (currentTile.type === TILE.TELEPORTER && this.teleportCooldown <= 0) { const tp = gameManager.getTilesOfType(TILE.TELEPORTER); if (tp.length > 1) { const other = tp.find(t => t.x !== finalGridX || t.y !== finalGridY); if (other) { this.pixelX = other.x * GRID_SIZE + GRID_SIZE / 2; this.pixelY = other.y * GRID_SIZE + GRID_SIZE / 2; this.teleportCooldown = 120; gameManager.audioManager.play('teleport'); } } }
                if (currentTile.type === TILE.REPLICATION_TILE && !this.isKing) { for (let i = 0; i < currentTile.replicationValue; i++) gameManager.spawnUnit(this, true); gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor }; gameManager.audioManager.play('replication'); }
                if (currentTile.type === TILE.QUESTION_MARK) { gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor }; gameManager.createEffect('question_mark_effect', this.pixelX, this.pixelY); gameManager.audioManager.play('questionmark'); gameManager.spawnRandomWeaponNear({ x: this.pixelX, y: this.pixelY }); }
                if (currentTile.type === TILE.DASH_TILE) { this.isDashing = true; this.dashDirection = currentTile.direction; this.dashDistanceRemaining = 5 * GRID_SIZE; this.state = 'IDLE'; this.moveTarget = null; gameManager.audioManager.play('rush'); return; }
                if (currentTile.type === TILE.AWAKENING_POTION && !this.awakeningEffect.active) { this.awakeningEffect.active = true; this.awakeningEffect.stacks = 0; this.awakeningEffect.timer = 0; gameManager.map[finalGridY][finalGridX] = { type: TILE.FLOOR, color: gameManager.currentFloorColor }; gameManager.audioManager.play('Arousal'); for (let i = 0; i < 30; i++) { /* ... 각성 파티클 ... */ } }
            }
        }
    }


    // [🪓 MODIFIED] 특수 공격 준비 상태 업데이트 (도끼 포함)
    updateSpecialAttackReadyStatus() {
        if (!this.weapon) { this.isSpecialAttackReady = false; return; }
        switch (this.weapon.type) {
            case 'sword': case 'bow': this.isSpecialAttackReady = this.attackCount >= 2; break;
            case 'boomerang': this.isSpecialAttackReady = this.boomerangCooldown <= 0; break;
            case 'shuriken': this.isSpecialAttackReady = this.shurikenSkillCooldown <= 0; break;
            case 'fire_staff': this.isSpecialAttackReady = this.fireStaffSpecialCooldown <= 0; break;
            case 'magic_dagger': this.isSpecialAttackReady = this.magicDaggerSkillCooldown <= 0; break;
            case 'dual_swords': this.isSpecialAttackReady = this.dualSwordSkillCooldown <= 0; break;
            case 'axe': this.isSpecialAttackReady = this.axeSkillCooldown <= 0; break; // 도끼 추가
            default: this.isSpecialAttackReady = false;
        }
    }

    // [🎨 REMOVED] draw 함수 내 빛 이펙트 그리는 로직 제거
    draw(ctx, isOutlineEnabled, outlineWidth) {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        // --- 유닛 기본 그리기, 크기 조정, 상태 효과 등 ---
        ctx.save();
        const scale = 1 + (this.awakeningEffect.stacks || 0) * 0.2; // Use default 0 if stacks is undefined
        const levelScale = 1 + (this.level - 1) * 0.08;
        const totalScale = scale * levelScale;

        // 각성 오라
        if (this.awakeningEffect.active) {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.scale(totalScale, totalScale);
            const auraRadius = (GRID_SIZE / 1.4);
            const gradient = ctx.createRadialGradient(0, 0, auraRadius * 0.5, 0, 0, auraRadius);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath(); ctx.arc(0, 0, auraRadius, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
        // 마법 단검 조준선
        if (this.isAimingMagicDagger && this.magicDaggerTargetPos) {
            const aimProgress = 1 - (this.magicDaggerAimTimer / 60);
            const currentEndX = this.pixelX + (this.magicDaggerTargetPos.x - this.pixelX) * aimProgress;
            const currentEndY = this.pixelY + (this.magicDaggerTargetPos.y - this.pixelY) * aimProgress;
            ctx.save(); // Save context before applying alpha and line dash
            ctx.globalAlpha = 0.7; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.setLineDash([10, 5]);
            ctx.beginPath(); ctx.moveTo(this.pixelX, this.pixelY); ctx.lineTo(currentEndX, currentEndY); ctx.stroke();
            ctx.restore(); // Restore alpha and line dash
        }
        // 대시 궤적
        if (this.isDashing) {
            this.dashTrail.forEach((pos, index) => {
                const opacity = (index / this.dashTrail.length) * 0.5;
                ctx.save(); ctx.globalAlpha = opacity;
                switch(this.team) { case TEAM.A: ctx.fillStyle = COLORS.TEAM_A; break; case TEAM.B: ctx.fillStyle = COLORS.TEAM_B; break; case TEAM.C: ctx.fillStyle = COLORS.TEAM_C; break; case TEAM.D: ctx.fillStyle = COLORS.TEAM_D; break; }
                ctx.beginPath(); ctx.arc(pos.x, pos.y, (GRID_SIZE / 1.67) * totalScale, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            });
        }

        // 유닛 몸통 스케일 적용
        ctx.translate(this.pixelX, this.pixelY); ctx.scale(totalScale, totalScale); ctx.translate(-this.pixelX, -this.pixelY);
        // 스턴 투명도
        if (this.isStunned > 0) ctx.globalAlpha = 0.7;
        // 쌍검 표식
        if (this.isMarkedByDualSword.active) {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY - GRID_SIZE * 1.2 * totalScale);
            const markScale = 0.4 + Math.sin(this.gameManager.animationFrameCounter * 0.1) * 0.05;
            ctx.scale(markScale, markScale); ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 2.5; const L = GRID_SIZE * 0.5;
            ctx.beginPath(); ctx.moveTo(-L, -L); ctx.lineTo(L, L); ctx.moveTo(L, -L); ctx.lineTo(-L, L); ctx.stroke();
            ctx.restore();
        }
        // 유닛 몸통 색칠 및 테두리
        switch(this.team) { case TEAM.A: ctx.fillStyle = COLORS.TEAM_A; break; case TEAM.B: ctx.fillStyle = COLORS.TEAM_B; break; case TEAM.C: ctx.fillStyle = COLORS.TEAM_C; break; case TEAM.D: ctx.fillStyle = COLORS.TEAM_D; break; default: ctx.fillStyle = '#9ca3af'; break; }
        ctx.beginPath(); ctx.arc(this.pixelX, this.pixelY, GRID_SIZE / 1.67, 0, Math.PI * 2); ctx.fill();
        if (isOutlineEnabled) { ctx.strokeStyle = 'black'; ctx.lineWidth = outlineWidth / totalScale; ctx.stroke(); }

        // 눈 그리기
        {
            const headRadius = GRID_SIZE / 1.67; const eyeScale = this.gameManager?.unitEyeScale ?? 1.0; const faceWidth = headRadius * 1.1 * eyeScale; const faceHeight = headRadius * 0.7 * eyeScale; const gap = headRadius * 0.3; const eyeWidth = (faceWidth - gap) / 2; const eyeHeight = faceHeight;
            const isDead = this.hp <= 0; const isFighting = this.attackAnimationTimer > 0 || this.isCasting || (this.target && this.weapon); const isMoving = !!this.moveTarget && !isFighting && !this.isDashing;
            ctx.save(); ctx.translate(this.pixelX, this.pixelY);
            if (isDead) {
                ctx.strokeStyle = '#0f172a'; ctx.lineWidth = headRadius * 0.5; const xo = headRadius * 0.5; const yo = headRadius * 0.5;
                ctx.beginPath(); ctx.moveTo(-xo, -yo); ctx.lineTo(xo, yo); ctx.moveTo(xo, -yo); ctx.lineTo(-xo, yo); ctx.stroke();
            } else {
                const leftX = -faceWidth / 2; const rightX = gap / 2; const topY = -eyeHeight / 2; ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#0f172a'; ctx.lineWidth = headRadius * 0.12; const rx = Math.min(eyeWidth, eyeHeight) * 0.35;
                // Left eye
                ctx.beginPath(); ctx.moveTo(leftX + rx, topY); ctx.lineTo(leftX + eyeWidth - rx, topY); ctx.quadraticCurveTo(leftX + eyeWidth, topY, leftX + eyeWidth, topY + rx); ctx.lineTo(leftX + eyeWidth, topY + eyeHeight - rx); ctx.quadraticCurveTo(leftX + eyeWidth, topY + eyeHeight, leftX + eyeWidth - rx, topY + eyeHeight); ctx.lineTo(leftX + rx, topY + eyeHeight); ctx.quadraticCurveTo(leftX, topY + eyeHeight, leftX, topY + eyeHeight - rx); ctx.lineTo(leftX, topY + rx); ctx.quadraticCurveTo(leftX, topY, leftX + rx, topY); ctx.closePath(); ctx.fill(); ctx.stroke();
                // Right eye
                ctx.beginPath(); ctx.moveTo(rightX + rx, topY); ctx.lineTo(rightX + eyeWidth - rx, topY); ctx.quadraticCurveTo(rightX + eyeWidth, topY, rightX + eyeWidth, topY + rx); ctx.lineTo(rightX + eyeWidth, topY + eyeHeight - rx); ctx.quadraticCurveTo(rightX + eyeWidth, topY + eyeHeight, rightX + eyeWidth - rx, topY + eyeHeight); ctx.lineTo(rightX + rx, topY + eyeHeight); ctx.quadraticCurveTo(rightX, topY + eyeHeight, rightX, topY + eyeHeight - rx); ctx.lineTo(rightX, topY + rx); ctx.quadraticCurveTo(rightX, topY, rightX + rx, topY); ctx.closePath(); ctx.fill(); ctx.stroke();
                // Pupils
                let targetX = 0, targetY = 0;
                if (isFighting && this.target) { targetX = this.target.pixelX - this.pixelX; targetY = this.target.pixelY - this.pixelY; }
                else if (isMoving && this.moveTarget) { targetX = this.moveTarget.x - this.pixelX; targetY = this.moveTarget.y - this.pixelY; }
                else { const t = this.gameManager.animationFrameCounter * 0.09 + (this.pixelX + this.pixelY) * 0.001; targetX = Math.cos(t); targetY = Math.sin(t * 1.4); }
                const ang = Math.atan2(targetY, targetX); const maxOffX = eyeWidth * 0.18; const maxOffY = eyeHeight * 0.18; const offX = Math.cos(ang) * maxOffX; const offY = Math.sin(ang) * maxOffY;
                if (isFighting) { switch(this.team) { case TEAM.A: ctx.fillStyle = DEEP_COLORS.TEAM_A; break; case TEAM.B: ctx.fillStyle = DEEP_COLORS.TEAM_B; break; case TEAM.C: ctx.fillStyle = DEEP_COLORS.TEAM_C; break; case TEAM.D: ctx.fillStyle = DEEP_COLORS.TEAM_D; break; default: ctx.fillStyle = '#0b1020'; break; } } else { ctx.fillStyle = '#0b1020'; }
                const basePR = Math.min(eyeWidth, eyeHeight) * (isFighting ? 0.34 : 0.42);
                ctx.beginPath(); ctx.arc(leftX + eyeWidth / 2 + offX * 0.6, topY + eyeHeight / 2 + offY * 0.6, basePR, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(rightX + eyeWidth / 2 + offX * 0.6, topY + eyeHeight / 2 + offY * 0.6, basePR, 0, Math.PI * 2); ctx.fill();
                // Eyebrows when fighting
                if (isFighting) {
                    ctx.strokeStyle = '#0b1020'; ctx.lineWidth = headRadius * 0.25; const browY = topY - headRadius * 0.15;
                    ctx.beginPath(); ctx.moveTo(leftX + eyeWidth * 0.15, browY + headRadius * 0.12); ctx.lineTo(leftX + eyeWidth * 0.85, browY - headRadius * 0.12); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(rightX + eyeWidth * 0.15, browY - headRadius * 0.12); ctx.lineTo(rightX + eyeWidth * 0.85, browY + headRadius * 0.12); ctx.stroke();
                }
            }
            ctx.restore();
        }

        ctx.restore(); // 몸통 스케일 복원

        // --- 부가 요소 그리기 (이름표, 부메랑 선, 스턴 아이콘) ---
        if (this.name) { ctx.fillStyle = this.nameColor; ctx.font = `bold 10px Arial`; ctx.textAlign = 'center'; ctx.fillText(this.name, this.pixelX, this.pixelY + GRID_SIZE * 0.8 * totalScale); }
        if (this.isBeingPulled && this.puller) { ctx.save(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(this.puller.pixelX, this.puller.pixelY); ctx.lineTo(this.pixelX, this.pixelY); ctx.stroke(); ctx.restore(); }
        if (this.isStunned > 0) {
            ctx.save(); ctx.translate(this.pixelX, this.pixelY - GRID_SIZE * 0.8 * totalScale); const rotation = gameManager.animationFrameCounter * 0.1; ctx.rotate(rotation); ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.4, 0, Math.PI * 1.5); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.2, Math.PI, Math.PI * 2.5); ctx.stroke(); ctx.restore();
        }

        // --- 무기 그리기 (weaponary.js 호출) ---
        ctx.save();
        ctx.translate(this.pixelX, this.pixelY); // 유닛 위치 원점
        if (this.isKing) { // 왕관
            const kingDrawScale = 1.2;
            ctx.translate(0, -GRID_SIZE * 0.5 * totalScale);
            ctx.scale(kingDrawScale * totalScale, kingDrawScale * totalScale);
            ctx.fillStyle = '#facc15'; ctx.strokeStyle = 'black'; ctx.lineWidth = 1 / (kingDrawScale * totalScale);
            ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.4, -GRID_SIZE * 0.1); ctx.lineTo(-GRID_SIZE * 0.4, GRID_SIZE * 0.2); ctx.lineTo(GRID_SIZE * 0.4, GRID_SIZE * 0.2); ctx.lineTo(GRID_SIZE * 0.4, -GRID_SIZE * 0.1); ctx.lineTo(GRID_SIZE * 0.2, 0); ctx.lineTo(0, -GRID_SIZE * 0.1); ctx.lineTo(-GRID_SIZE * 0.2, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        else if (this.weapon) {
            // [🎨 REMOVED] 빛 이펙트 그리기 로직 제거
            this.weapon.drawEquipped(ctx, { ...this, pixelX: 0, pixelY: 0 }); // 상대 좌표로 무기 그리기 호출
        }
        ctx.restore(); // 유닛 위치 원점 복원

        // --- 상태 바 그리기 (쿨타임 원형 테두리 포함) ---
        const barWidth = GRID_SIZE * 0.8 * totalScale; const barHeight = 4; const barGap = 1; const barX = this.pixelX - barWidth / 2;
        const healthBarIsVisible = this.hp < this.maxHp || this.hpBarVisibleTimer > 0;
        const normalAttackIsVisible = (this.isCasting && this.weapon?.type === 'poison_potion') || (this.attackCooldown > 0);
        const kingSpawnBarIsVisible = this.isKing && this.spawnCooldown > 0;
        let specialSkillIsVisible =
            (this.weapon?.type === 'magic_dagger' && this.magicDaggerSkillCooldown > 0) ||
            (this.weapon?.type === 'axe' && this.axeSkillCooldown > 0) || // 도끼
            (this.weapon?.type === 'ice_diamond' && this.iceDiamondChargeTimer > 0 && this.iceDiamondCharges < 5) ||
            (this.weapon?.type === 'magic_spear' && this.magicCircleCooldown > 0) ||
            (this.weapon?.type === 'boomerang' && this.boomerangCooldown > 0) ||
            (this.weapon?.type === 'shuriken' && this.shurikenSkillCooldown > 0) ||
            (this.weapon?.type === 'fire_staff' && this.fireStaffSpecialCooldown > 0) ||
            (this.weapon?.type === 'dual_swords' && this.dualSwordSkillCooldown > 0) ||
            (this.isCasting);
        if (this.attackCooldown > 0 && !this.isCasting) specialSkillIsVisible = false;

        const barsToShow = []; if (normalAttackIsVisible) barsToShow.push('attack'); if (healthBarIsVisible) barsToShow.push('health');
        if (barsToShow.length > 0) {
            const kingYOffset = this.isKing ? GRID_SIZE * 0.4 * totalScale : 0;
            const totalBarsHeight = (barsToShow.length * barHeight) + ((barsToShow.length - 1) * barGap);
            let currentBarY = this.pixelY - (GRID_SIZE * 0.9 * totalScale) - totalBarsHeight - kingYOffset;
            // 공격 쿨타임 바
            if (normalAttackIsVisible) {
                ctx.fillStyle = '#0c4a6e'; ctx.fillRect(barX, currentBarY, barWidth, barHeight);
                let progress = 0;
                if (this.isCasting && this.weapon?.type === 'poison_potion') progress = this.castingProgress / this.castDuration; else progress = Math.max(0, 1 - (this.attackCooldown / this.cooldownTime));
                ctx.fillStyle = '#38bdf8'; ctx.fillRect(barX, currentBarY, barWidth * progress, barHeight);
                currentBarY += barHeight + barGap;
            }
            // 체력 바 & 레벨
            if (healthBarIsVisible) {
                ctx.fillStyle = '#111827'; ctx.fillRect(barX, currentBarY, barWidth, barHeight);
                if (this.displayHp > this.hp) { ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; ctx.fillRect(barX, currentBarY, barWidth * (this.displayHp / this.maxHp), barHeight); } // 부드러운 감소
                ctx.fillStyle = '#10b981'; ctx.fillRect(barX, currentBarY, barWidth * (this.hp / this.maxHp), barHeight); // 실제 체력
                if (this.damageFlash > 0) { ctx.fillStyle = `rgba(255, 255, 255, ${this.damageFlash * 0.6})`; ctx.fillRect(barX, currentBarY, barWidth * (this.hp / this.maxHp), barHeight); } // 피격 플래시
                if (gameManager.isLevelUpEnabled && this.level > 0) { // 레벨 표시
                    const levelCircleRadius = 8; const levelX = barX + barWidth + levelCircleRadius + 4; const levelY = currentBarY + barHeight / 2;
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; ctx.beginPath(); ctx.arc(levelX, levelY, levelCircleRadius, 0, Math.PI * 2); ctx.fill();
                    const fontSize = 10; ctx.font = `bold ${fontSize}px Arial`; ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(this.level, levelX, levelY);
                }
            }
        }
        // 왕 스폰 바
        if (kingSpawnBarIsVisible) {
             const spawnBarY = this.pixelY + GRID_SIZE * 0.8 * totalScale + (this.name ? 12 : 2);
             ctx.fillStyle = '#450a0a'; ctx.fillRect(barX, spawnBarY, barWidth, barHeight);
             const progress = 1 - (this.spawnCooldown / this.spawnInterval);
             ctx.fillStyle = '#ef4444'; ctx.fillRect(barX, spawnBarY, barWidth * progress, barHeight);
        }
        // 스킬 쿨타임 원형 테두리
        if (specialSkillIsVisible) {
            let fgColor, progress = 0, max = 1;
            // 무기별 색상 및 진행률 계산 (도끼 포함)
            if (this.weapon?.type === 'fire_staff') { fgColor = '#ef4444'; progress = max - this.fireStaffSpecialCooldown; max = 240; }
            else if (this.weapon?.type === 'magic_spear') { fgColor = '#a855f7'; progress = max - this.magicCircleCooldown; max = 300; }
            else if (['boomerang', 'shuriken', 'poison_potion', 'magic_dagger', 'dual_swords', 'axe'].includes(this.weapon?.type)) {
                fgColor = '#94a3b8';
                if(this.weapon.type === 'boomerang') { progress = max - this.boomerangCooldown; max = 480; }
                else if(this.weapon.type === 'shuriken') { progress = max - this.shurikenSkillCooldown; max = 300; }
                else if(this.weapon.type === 'magic_dagger') { progress = max - this.magicDaggerSkillCooldown; max = 420; }
                else if(this.weapon.type === 'dual_swords') { progress = max - this.dualSwordSkillCooldown; max = 300; }
                else if(this.weapon.type === 'axe') { progress = max - this.axeSkillCooldown; max = 240; } // 도끼
                else { progress = this.castingProgress; max = this.castDuration; } // 독 포션
            }
            else if (this.weapon?.type === 'ice_diamond') { fgColor = '#38bdf8'; progress = this.iceDiamondChargeTimer; max = 240; }

            if (fgColor) { // 원형 테두리 그리기
                 ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'; const radius = (GRID_SIZE / 1.67 + 3) * totalScale;
                 ctx.beginPath(); ctx.arc(this.pixelX, this.pixelY, radius, 0, Math.PI * 2); ctx.stroke(); // 배경
                 ctx.strokeStyle = fgColor; ctx.beginPath(); const startAngle = -Math.PI / 2; const endAngle = startAngle + (progress / max) * Math.PI * 2;
                 ctx.arc(this.pixelX, this.pixelY, radius, startAngle, endAngle); ctx.stroke(); // 진행률
                 ctx.restore();
            }
        }

        // 경계 상태 표시 (!)
        const showAlert = this.alertedCounter > 0 || (this.weapon?.type === 'magic_spear' && this.target instanceof Unit && this.target.stunnedByMagicCircle);
        if (showAlert && this.state !== 'FLEEING_FIELD' && this.state !== 'FLEEING_LAVA') {
            const yOffset = -GRID_SIZE * totalScale;
            ctx.fillStyle = 'yellow'; ctx.font = `bold ${20 * totalScale}px Arial`; ctx.textAlign = 'center';
            ctx.fillText(this.state === 'SEEKING_HEAL_PACK' ? '+' : '!', this.pixelX, this.pixelY + yOffset);
        }
    }


    // 쌍검 순간이동 공격
    performDualSwordTeleportAttack(enemies) {
        const target = this.dualSwordTeleportTarget;
        if (target && target.hp > 0) { // 타겟이 유효하면
            const teleportPos = this.gameManager.findEmptySpotNear(target); // 타겟 주변 빈 공간 찾기
            this.pixelX = teleportPos.x; this.pixelY = teleportPos.y; // 순간이동
            this.dualSwordSpinAttackTimer = 20; // 회전 애니메이션 시작

            const damageRadius = GRID_SIZE * 2; // 공격 범위
            // 범위 내 적 유닛 공격
            enemies.forEach(enemy => { if (Math.hypot(this.pixelX - enemy.pixelX, this.pixelY - enemy.pixelY) < damageRadius) enemy.takeDamage(this.attackPower * 1.5 + this.specialAttackLevelBonus, {}, this); });
            // 범위 내 적 넥서스 공격
            this.gameManager.nexuses.forEach(nexus => { if (nexus.team !== this.team && !nexus.isDestroying && Math.hypot(this.pixelX - nexus.pixelX, this.pixelY - nexus.pixelY) < damageRadius) nexus.takeDamage(this.attackPower * 1.5 + this.specialAttackLevelBonus); });
            this.gameManager.audioManager.play('rotaryknife'); // 효과음
        }
        this.dualSwordTeleportTarget = null; // 타겟 초기화
        this.state = 'IDLE'; // 상태 초기화
    }

}
