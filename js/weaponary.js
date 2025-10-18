import { TEAM, COLORS, GRID_SIZE, DEEP_COLORS } from './constants.js'; // [수정] DEEP_COLORS 추가
import {
    drawMagicDaggerIcon,
    drawAxeIcon,
    drawIceDiamondIcon,
    drawStaff as designDrawStaff,
    drawLightning as designDrawLightning,
    drawMagicSpear as designDrawMagicSpear,
    drawBoomerang as designDrawBoomerang,
    drawPoisonPotion as designDrawPoisonPotion,
} from './weaponDesigns.js';

// Drawing implementations moved to js/weaponDesigns.js

// [신규] 무기 테두리 그리기 함수
function drawWeaponOutline(ctx, unit, weaponDrawFn) {
    let teamColor;
    // 유닛 팀에 맞는 DEEP_COLORS 사용
    switch(unit.team) {
        case TEAM.A: teamColor = DEEP_COLORS.TEAM_A; break;
        case TEAM.B: teamColor = DEEP_COLORS.TEAM_B; break;
        case TEAM.C: teamColor = DEEP_COLORS.TEAM_C; break;
        case TEAM.D: teamColor = DEEP_COLORS.TEAM_D; break;
        default: teamColor = '#FFFFFF'; break; // 기본 흰색
    }

    ctx.save();
    // 빛나는 효과 설정
    ctx.shadowColor = teamColor;
    ctx.shadowBlur = 15; // 빛나는 정도 조절
    ctx.strokeStyle = teamColor;
    ctx.lineWidth = 3.5; // 테두리 두께 조절
    ctx.lineCap = 'round'; // 선 끝을 둥글게 처리
    ctx.lineJoin = 'round'; // 선 연결 부분을 둥글게 처리

    // 기존 무기 그리기 함수를 호출하되, stroke()만 실행하여 테두리만 그림
    // weaponDrawFn 함수 내에서 fill() 대신 stroke()를 사용하도록 수정 필요
    // 또는, 간단하게 동일한 경로를 다시 그리고 stroke()만 호출
    // 여기서는 후자의 방식을 가정하고, 각 무기 그리기 로직 내에서 경로만 다시 그림
    weaponDrawFn(ctx, true); // isOutline=true 플래그 전달

    ctx.restore();
}


// Weapon class
export class Weapon {
    constructor(gameManager, x, y, type) {
        this.gameManager = gameManager;
        this.gridX = x; this.gridY = y;
        this.pixelX = x * GRID_SIZE + GRID_SIZE / 2;
        this.pixelY = y * GRID_SIZE + GRID_SIZE / 2;
        this.type = type;
        this.isEquipped = false;
    }

    /**
     * [NEW] Handles the weapon's attack logic.
     * @param {Unit} unit - The unit using this weapon.
     * @param {Unit | Nexus} target - The attack target.
     */
    use(unit, target) {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        // [수정] 검과 활의 3타 카운트 로직 위치 변경 (use 함수 내에서 처리)
        let isThirdAttackSword = false;
        let isThirdAttackBow = false;

        if (['sword', 'dual_swords', 'boomerang', 'poison_potion', 'magic_dagger', 'axe', 'bow'].includes(this.type)) {
            unit.attackAnimationTimer = 15;
        }

        if (this.type === 'sword') {
            unit.attackCount++;
            target.takeDamage(unit.attackPower, {}, unit);
            gameManager.createEffect('slash', unit.pixelX, unit.pixelY, target);
            gameManager.audioManager.play('swordHit');
            unit.attackCooldown = unit.cooldownTime;

            if (unit.attackCount >= 3) {
                isThirdAttackSword = true; // 3타 확인
                unit.attackCount = 0;
                unit.swordSpecialAttackAnimationTimer = 30;
                gameManager.createProjectile(unit, target, 'sword_wave');
                gameManager.audioManager.play('Aurablade');

                for (let i = 0; i < 20; i++) {
                    const angle = gameManager.random() * Math.PI * 2;
                    const speed = 1 + gameManager.random() * 3;
                    gameManager.addParticle({
                        x: unit.pixelX, y: unit.pixelY,
                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                        life: 0.8, color: 'white', size: gameManager.random() * 2 + 1,
                        gravity: 0.05
                    });
                }
            }
        } else if (this.type === 'bow') {
            unit.attackCount++;
            gameManager.audioManager.play('arrowShoot');
            unit.attackCooldown = unit.cooldownTime;

            if (unit.attackCount >= 3) {
                isThirdAttackBow = true; // 3타 확인
                unit.attackCount = 0;

                const recoilAngle = unit.facingAngle + Math.PI;
                const recoilForce = 4;
                unit.knockbackX += Math.cos(recoilAngle) * recoilForce;
                unit.knockbackY += Math.sin(recoilAngle) * recoilForce;

                gameManager.createProjectile(unit, target, 'arrow');
                setTimeout(() => {
                    if (unit.hp > 0) {
                        gameManager.createProjectile(unit, target, 'arrow');
                    }
                }, 150);

                for (let i = 0; i < 20; i++) {
                    const angle = gameManager.random() * Math.PI * 2;
                    const speed = 1 + gameManager.random() * 3;
                    gameManager.addParticle({
                        x: unit.pixelX, y: unit.pixelY,
                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                        life: 0.8, color: 'white', size: gameManager.random() * 2 + 1,
                        gravity: 0.05
                    });
                }
            } else {
                gameManager.createProjectile(unit, target, 'arrow');
            }
        } else if (this.type === 'magic_dagger') {
            // [수정] 스킬 사용 로직 추가 (use 메서드 내에서 스킬 쿨다운 확인)
            if (unit.magicDaggerSkillCooldown <= 0) {
                 // isAimingMagicDagger 로직은 Unit 클래스 update에서 처리되므로 여기서는 특별한 동작 없음
                 // 스킬 사용 후 쿨다운 설정은 Unit 클래스에서 처리
            } else {
                 // 일반 공격
                 target.takeDamage(unit.attackPower, {}, unit);
                 gameManager.createEffect('slash', unit.pixelX, unit.pixelY, target);
                 gameManager.audioManager.play('dualSwordHit'); // 적절한 사운드로 변경 필요 시 수정
            }
            unit.attackCooldown = unit.cooldownTime; // 일반 공격이든 스킬이든 공격 쿨다운은 적용
        } else if (this.type === 'dual_swords') {
             // [수정] 스킬 사용 로직 추가
            if (unit.dualSwordSkillCooldown <= 0 && target instanceof Unit) { // 넥서스는 타겟 불가
                 gameManager.audioManager.play('shurikenShoot'); // 사운드 변경 필요 시 수정
                 gameManager.createProjectile(unit, target, 'bouncing_sword');
                 unit.dualSwordSkillCooldown = 300; // 스킬 쿨다운 설정
                 unit.attackCooldown = 60; // 스킬 사용 시 짧은 공격 쿨다운
                 unit.moveTarget = null;
                 unit.facingAngle = Math.atan2(target.pixelY - unit.pixelY, target.pixelX - unit.pixelX);
            } else {
                 // 일반 공격
                 target.takeDamage(unit.attackPower, {}, unit);
                 gameManager.createEffect('dual_sword_slash', unit.pixelX, unit.pixelY, target);
                 gameManager.audioManager.play('dualSwordHit');
                 unit.attackCooldown = unit.cooldownTime;
            }
        } else if (this.type === 'axe') {
             // [수정] 스킬 사용 로직 추가
            if (unit.axeSkillCooldown <= 0) {
                 unit.axeSkillCooldown = 240; // 스킬 쿨다운 설정
                 unit.spinAnimationTimer = 30;
                 gameManager.audioManager.play('axe');
                 gameManager.createEffect('axe_spin_effect', unit.pixelX, unit.pixelY, unit); // 타겟 대신 유닛 자신

                 const damageRadius = GRID_SIZE * 3.5;
                 // 주변 적 유닛 데미지
                 gameManager.units.forEach(enemy => {
                     if (enemy.team !== unit.team && Math.hypot(unit.pixelX - enemy.pixelX, unit.pixelY - enemy.pixelY) < damageRadius) {
                         enemy.takeDamage(unit.attackPower * 1.5, {}, unit);
                     }
                 });
                 // 주변 적 넥서스 데미지
                 gameManager.nexuses.forEach(nexus => {
                     if (nexus.team !== unit.team && !nexus.isDestroying && Math.hypot(unit.pixelX - nexus.pixelX, unit.pixelY - nexus.pixelY) < damageRadius) {
                         nexus.takeDamage(unit.attackPower * 1.5); // 넥서스는 attacker 정보 필요 없음
                     }
                 });
                 gameManager.audioManager.play('swordHit'); // 피격 효과음
                 unit.attackCooldown = 60; // 스킬 사용 시 짧은 공격 쿨다운
            } else {
                 // 일반 공격
                 target.takeDamage(unit.attackPower, {}, unit);
                 gameManager.createEffect('slash', unit.pixelX, unit.pixelY, target);
                 gameManager.audioManager.play('swordHit');
                 unit.attackCooldown = unit.cooldownTime;
            }
        } else if (this.type === 'ice_diamond') {
            if (unit.iceDiamondCharges > 0) {
                for (let i = 0; i < unit.iceDiamondCharges; i++) {
                    setTimeout(() => {
                        if (unit.hp > 0) {
                            gameManager.createProjectile(unit, target, 'ice_diamond_projectile');
                        }
                    }, i * 100);
                }
                gameManager.audioManager.play('Ice');
                unit.iceDiamondCharges = 0;
                unit.iceDiamondChargeTimer = 0;
            } else {
                gameManager.createProjectile(unit, target, 'ice_bolt_projectile');
                gameManager.audioManager.play('punch');
            }
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'fire_staff') {
             // [수정] 스킬 사용 로직 추가
             if (unit.fireStaffSpecialCooldown <= 0 && target) { // 타겟이 있을 때만 스킬 사용
                 gameManager.createProjectile(unit, target, 'fireball_projectile');
                 gameManager.audioManager.play('fireball');
                 unit.fireStaffSpecialCooldown = 240; // 스킬 쿨다운 설정
                 unit.attackCooldown = 60; // 스킬 사용 시 짧은 공격 쿨다운
             } else {
                 // 일반 공격
                 gameManager.createProjectile(unit, target, 'black_sphere_projectile');
                 gameManager.audioManager.play('punch');
                 unit.attackCooldown = unit.cooldownTime;
             }
        } else if (this.type === 'shuriken') {
            if (unit.shurikenSkillCooldown <= 0 && target) { // [수정] 타겟이 있을 때 스킬 사용
                const angleToTarget = Math.atan2(target.pixelY - unit.pixelY, target.pixelX - unit.pixelX);
                const spread = 0.3;
                const angles = [angleToTarget - spread, angleToTarget, angleToTarget + spread];

                const dummyTarget = { pixelX: 0, pixelY: 0 };

                angles.forEach(angle => {
                    gameManager.createProjectile(unit, dummyTarget, 'returning_shuriken', {
                        angle: angle,
                        state: 'MOVING_OUT',
                        maxDistance: GRID_SIZE * 8
                    });
                });
                unit.shurikenSkillCooldown = 480; // 스킬 쿨다운 설정
                unit.attackCooldown = 60; // 스킬 사용 시 짧은 공격 쿨다운
                gameManager.audioManager.play('shurikenShoot'); // 표창 던지는 소리 한 번만
            } else {
                 // 일반 공격
                gameManager.createProjectile(unit, target, 'shuriken');
                gameManager.audioManager.play('shurikenShoot');
                unit.attackCooldown = unit.cooldownTime;
            }
        } else if (this.type === 'hadoken') {
            gameManager.createProjectile(unit, target, 'hadoken');
            gameManager.audioManager.play('hadokenShoot');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'lightning') {
            gameManager.createProjectile(unit, target, 'lightning_bolt');
            gameManager.audioManager.play('electricity');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'magic_spear') {
             // [수정] 스턴된 적 공격 로직 추가
            const stunnedEnemy = gameManager.findStunnedByMagicCircleEnemy(unit.team);
             if (stunnedEnemy && unit.attackCooldown <= 0) { // 스턴된 적이 있고 공격 가능하면
                 unit.target = stunnedEnemy; // 타겟을 스턴된 적으로 변경
                 gameManager.createProjectile(unit, stunnedEnemy, 'magic_spear_special');
                 gameManager.audioManager.play('spear');
                 unit.attackCooldown = unit.cooldownTime; // 공격 쿨다운 설정
             } else {
                 // 일반 공격
                 gameManager.createProjectile(unit, target, 'magic_spear_normal');
                 gameManager.audioManager.play('punch');
                 unit.attackCooldown = unit.cooldownTime;
             }
        } else if (this.type === 'boomerang') {
             // [수정] 스킬 사용 로직 추가
            if (unit.boomerangCooldown <= 0 && target instanceof Unit) { // 넥서스는 타겟 불가
                 gameManager.createProjectile(unit, target, 'boomerang_projectile');
                 gameManager.audioManager.play('boomerang');
                 unit.boomerangCooldown = 480; // 스킬 쿨다운 설정
                 unit.attackCooldown = 60; // 스킬 사용 시 짧은 공격 쿨다운
                 unit.state = 'IDLE'; // 공격 후 잠시 멈춤
                 unit.moveTarget = null;
             } else {
                 // 일반 공격
                 gameManager.createProjectile(unit, target, 'boomerang_normal_projectile');
                 gameManager.audioManager.play('punch');
                 unit.attackCooldown = unit.cooldownTime;
             }
        } else if (this.type === 'poison_potion') {
            // 독 포션은 Unit의 update에서 isCasting으로 처리
            if (!unit.isCasting && unit.attackCooldown <= 0) {
                 unit.isCasting = true;
                 unit.castingProgress = 0;
                 unit.castTargetPos = { x: unit.pixelX, y: unit.pixelY };
                 unit.attackCooldown = unit.cooldownTime; // 시전 시작 시 쿨다운 적용
            }
            // 실제 데미지나 효과는 isCasting 완료 시 Unit 클래스에서 처리
        }

        // [신규] 검/활 3타 준비 상태 업데이트
        unit.isSwordReady = (this.type === 'sword' && unit.attackCount === 2);
        unit.isBowReady = (this.type === 'bow' && unit.attackCount === 2);
    }

    // [수정] drawStaff, drawLightning 등 개별 그리기 함수에 isOutline 파라미터 추가
    // 각 함수는 isOutline이 true일 때 fill() 대신 stroke()를 호출하도록 수정 필요
    // 여기서는 weaponDesigns.js에 해당 함수가 있다고 가정하고 호출만 수정
    drawStaff(ctx, scale = 1.0, isOutline = false) {
        designDrawStaff(ctx, scale, isOutline); // isOutline 전달
    }

    drawLightning(ctx, scale = 1.0, rotation = 0, isOutline = false) {
        designDrawLightning(ctx, scale, rotation, isOutline); // isOutline 전달
    }

    drawMagicSpear(ctx, scale = 1.0, rotation = 0, isOutline = false) {
        designDrawMagicSpear(ctx, scale, rotation, isOutline); // isOutline 전달
    }

    drawBoomerang(ctx, scale = 1.0, rotation = 0, color = null, isOutline = false) {
        designDrawBoomerang(ctx, scale, rotation, color, isOutline); // isOutline 전달
    }

    drawPoisonPotion(ctx, scale = 1.0, isOutline = false) {
        designDrawPoisonPotion(ctx, scale, isOutline); // isOutline 전달
    }


    /**
     * Draws the weapon when it's on the ground.
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        if (this.isEquipped) return;
        const centerX = this.pixelX; const centerY = this.pixelY;
        const scale = (this.type === 'crown') ? 1.0 : (this.type === 'lightning' ? 0.6 : (this.type === 'magic_spear' ? 0.6 : (this.type === 'poison_potion' ? 0.624 : (this.type === 'boomerang' ? 0.49 : 0.8))));
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);

        if (this.type !== 'magic_dagger') {
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1 / scale;
        }

        // --- 각 무기별 그리기 로직 (기존과 동일) ---
        // ... (검, 활, 쌍검 등 기존 그리기 코드) ...
        if (this.type === 'sword') {
            ctx.rotate(Math.PI / 4);
            const bladeGradient = ctx.createLinearGradient(0, -GRID_SIZE, 0, 0);
            bladeGradient.addColorStop(0, '#f3f4f6'); bladeGradient.addColorStop(1, '#9ca3af');
            ctx.fillStyle = bladeGradient;
            ctx.beginPath(); // 경로 시작
            ctx.moveTo(-2, GRID_SIZE * 0.3); ctx.lineTo(-2, -GRID_SIZE * 1.0);
            ctx.lineTo(0, -GRID_SIZE * 1.2); ctx.lineTo(2, -GRID_SIZE * 1.0);
            ctx.lineTo(2, GRID_SIZE * 0.3);
            ctx.closePath(); ctx.fill(); ctx.stroke(); // 채우고 외곽선 그리기
            ctx.fillStyle = '#374151';
            ctx.beginPath(); // 경로 시작
            ctx.moveTo(-GRID_SIZE * 0.4, GRID_SIZE * 0.3); ctx.lineTo(GRID_SIZE * 0.4, GRID_SIZE * 0.3);
            ctx.lineTo(GRID_SIZE * 0.5, GRID_SIZE * 0.3 + 3); ctx.lineTo(-GRID_SIZE * 0.5, GRID_SIZE * 0.3 + 3);
            ctx.closePath(); ctx.fill(); ctx.stroke(); // 채우고 외곽선 그리기
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(-1.5, GRID_SIZE * 0.3 + 3, 3, GRID_SIZE * 0.3); ctx.strokeRect(-1.5, GRID_SIZE * 0.3 + 3, 3, GRID_SIZE * 0.3);
        } else if (this.type === 'bow') {
             ctx.rotate(Math.PI / 4);
             // ... (기존 활 그리기 코드) ...
             ctx.fillStyle = '#f3f4f6';
             ctx.fillRect(-GRID_SIZE * 0.7, -1, GRID_SIZE * 1.2, 2);
             ctx.strokeRect(-GRID_SIZE * 0.7, -1, GRID_SIZE * 1.2, 2);
             ctx.fillStyle = '#e5e7eb';
             ctx.beginPath(); ctx.moveTo(GRID_SIZE * 0.5, 0); ctx.lineTo(GRID_SIZE * 0.3, -3); ctx.lineTo(GRID_SIZE * 0.3, 3); ctx.closePath(); ctx.fill();
             ctx.fillStyle = '#d1d5db';
             ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.6, -1); ctx.lineTo(-GRID_SIZE * 0.7, -4); ctx.lineTo(-GRID_SIZE * 0.5, -1); ctx.closePath(); ctx.fill()
             ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.6, 1); ctx.lineTo(-GRID_SIZE * 0.7, 4); ctx.lineTo(-GRID_SIZE * 0.5, 1); ctx.closePath(); ctx.fill()
             ctx.strokeStyle = 'black'; ctx.lineWidth = 6 / scale; ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.8, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke();
             ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 4 / scale; ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.8, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke();
             ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1.5 / scale; ctx.beginPath();
             const arcRadius = GRID_SIZE * 0.8, arcAngle = Math.PI / 2.2;
             ctx.moveTo(Math.cos(-arcAngle) * arcRadius, Math.sin(-arcAngle) * arcRadius);
             ctx.lineTo(-GRID_SIZE * 0.4, 0);
             ctx.lineTo(Math.cos(arcAngle) * arcRadius, Math.sin(arcAngle) * arcRadius); ctx.stroke();
        } else if (this.type === 'dual_swords') {
             const drawCurvedSword = (rotation, isOutline = false) => { // isOutline 추가
                 ctx.save();
                 ctx.rotate(rotation);
                 // 경로 정의
                 ctx.beginPath();
                 ctx.rect(-GRID_SIZE * 0.1, GRID_SIZE * 0.3, GRID_SIZE * 0.2, GRID_SIZE * 0.3); // 손잡이 사각형
                 ctx.moveTo(-GRID_SIZE * 0.3, GRID_SIZE * 0.3); ctx.lineTo(GRID_SIZE * 0.3, GRID_SIZE * 0.3); // 가드 위
                 ctx.lineTo(GRID_SIZE * 0.3, GRID_SIZE * 0.2); ctx.lineTo(-GRID_SIZE * 0.3, GRID_SIZE * 0.2); // 가드 아래
                 ctx.closePath(); // 가드 경로 닫기
                 ctx.moveTo(0, GRID_SIZE * 0.2); // 칼날 시작
                 ctx.quadraticCurveTo(GRID_SIZE * 0.5, -GRID_SIZE * 0.4, 0, -GRID_SIZE * 0.9);
                 ctx.quadraticCurveTo(-GRID_SIZE * 0.1, -GRID_SIZE * 0.4, 0, GRID_SIZE * 0.2);
                 ctx.closePath(); // 칼날 경로 닫기

                 if (isOutline) {
                     ctx.stroke(); // 외곽선만 그리기
                 } else {
                     ctx.fillStyle = '#6b7280'; // 손잡이 색
                     ctx.fill(); ctx.stroke(); // 채우고 외곽선
                     // 칼날 그라데이션 및 채우기
                     const bladeGradient = ctx.createLinearGradient(0, -GRID_SIZE, 0, 0);
                     bladeGradient.addColorStop(0, '#f3f4f6'); bladeGradient.addColorStop(0.5, '#9ca3af'); bladeGradient.addColorStop(1, '#d1d5db');
                     ctx.fillStyle = bladeGradient;
                     // 칼날 부분만 다시 경로 정의하고 채우기 (stroke는 이미 위에서 함)
                     ctx.beginPath();
                     ctx.moveTo(0, GRID_SIZE * 0.2);
                     ctx.quadraticCurveTo(GRID_SIZE * 0.5, -GRID_SIZE * 0.4, 0, -GRID_SIZE * 0.9);
                     ctx.quadraticCurveTo(-GRID_SIZE * 0.1, -GRID_SIZE * 0.4, 0, GRID_SIZE * 0.2);
                     ctx.closePath();
                     ctx.fill();
                 }
                 ctx.restore();
             };
             drawCurvedSword(-Math.PI / 4);
             drawCurvedSword(Math.PI / 4);
        } else if (this.type === 'fire_staff') {
             this.drawStaff(ctx, scale); // isOutline은 drawEquipped에서만 필요
        } else if (this.type === 'lightning') {
             this.drawLightning(ctx, 1.0, Math.PI / 4); // isOutline은 drawEquipped에서만 필요
        } else if (this.type === 'magic_spear') {
             this.drawMagicSpear(ctx, 0.8, -Math.PI / 8); // isOutline은 drawEquipped에서만 필요
        } else if (this.type === 'boomerang') {
             this.drawBoomerang(ctx, 1.0, -Math.PI / 6); // isOutline은 drawEquipped에서만 필요
        } else if (this.type === 'poison_potion') {
             this.drawPoisonPotion(ctx, scale); // isOutline은 drawEquipped에서만 필요
        } else if (this.type === 'magic_dagger') {
             ctx.rotate(Math.PI / 4);
             drawMagicDaggerIcon(ctx); // weaponDesigns.js 함수 사용 (isOutline 수정 필요 시 해당 파일 수정)
        } else if (this.type === 'axe') {
             ctx.rotate(Math.PI / 4);
             drawAxeIcon(ctx); // weaponDesigns.js 함수 사용 (isOutline 수정 필요 시 해당 파일 수정)
        } else if (this.type === 'ice_diamond') {
             drawIceDiamondIcon(ctx); // weaponDesigns.js 함수 사용 (isOutline 수정 필요 시 해당 파일 수정)
        } else if (this.type === 'hadoken') {
             ctx.rotate(Math.PI / 4);
             // ... (기존 장풍 그리기 코드) ...
        } else if (this.type === 'shuriken') {
             ctx.rotate(Math.PI / 4);
             // 경로 정의
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
             // 채우기 및 외곽선
             ctx.fillStyle = '#9ca3af';
             ctx.strokeStyle = 'black';
             ctx.lineWidth = 2 / scale;
             ctx.fill();
             ctx.stroke();
             // 중앙 원
             ctx.fillStyle = '#d1d5db';
             ctx.beginPath();
             ctx.arc(0, 0, GRID_SIZE * 0.2, 0, Math.PI * 2);
             ctx.fill();
             ctx.stroke();
        } else if (this.type === 'crown') {
             // ... (기존 왕관 그리기 코드) ...
        }

        ctx.restore();
    }

    /**
     * [NEW] Draws the weapon when it's equipped by a unit.
     * @param {CanvasRenderingContext2D} ctx
     * @param {Unit} unit
     */
    drawEquipped(ctx, unit) {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        // [신규] 특수 공격 활성화 상태 확인
        const isSpecialReady =
            (this.type === 'sword' && unit.isSwordReady) ||
            (this.type === 'bow' && unit.isBowReady) ||
            (this.type === 'axe' && unit.axeSkillCooldown <= 0) ||
            (this.type === 'fire_staff' && unit.fireStaffSpecialCooldown <= 0) ||
            (this.type === 'boomerang' && unit.boomerangCooldown <= 0) ||
            (this.type === 'shuriken' && unit.shurikenSkillCooldown <= 0) ||
            (this.type === 'magic_dagger' && unit.magicDaggerSkillCooldown <= 0) ||
            (this.type === 'dual_swords' && unit.dualSwordSkillCooldown <= 0);

        const baseScale = 1 + (unit.awakeningEffect?.stacks || 0) * 0.2;

        // --- 기존 무기 위치, 회전 계산 ---
        ctx.save();
        ctx.translate(unit.pixelX, unit.pixelY);
        ctx.scale(baseScale, baseScale);

        let rotation = unit.facingAngle;
        if (this.type !== 'bow' && unit.attackAnimationTimer > 0) {
            const swingProgress = Math.sin((15 - unit.attackAnimationTimer) / 15 * Math.PI);
            rotation += swingProgress * Math.PI / 4;
        }
        if (this.type === 'axe' && unit.spinAnimationTimer > 0) {
            rotation += ((30 - unit.spinAnimationTimer) / 30) * Math.PI * 2;
        }
        if (this.type === 'sword' && unit.swordSpecialAttackAnimationTimer > 0) {
            rotation += ((30 - unit.swordSpecialAttackAnimationTimer) / 30) * Math.PI * 2;
        }
        if (this.type === 'dual_swords' && unit.dualSwordSpinAttackTimer > 0) {
            const spinProgress = (20 - unit.dualSwordSpinAttackTimer) / 20;
            rotation += spinProgress * Math.PI * 4;
        }

        // 번개와 얼음 다이아는 회전하지 않음
        const applyRotation = !['lightning', 'ice_diamond'].includes(this.type);

        // --- 무기 그리기 함수 정의 (drawWeaponOutline에서 사용) ---
        const weaponDrawFn = (context, isOutline = false) => {
            context.save();
            if (applyRotation) {
                context.rotate(rotation);
            }

            // 각 무기별 그리기 로직 (경로 정의 위주)
            if (this.type === 'sword') {
                context.translate(GRID_SIZE * 0.5, 0);
                context.rotate(Math.PI / 4);
                // 검 경로 정의
                context.beginPath();
                context.moveTo(-2, GRID_SIZE * 0.3); context.lineTo(-2, -GRID_SIZE * 1.0);
                context.lineTo(0, -GRID_SIZE * 1.2); context.lineTo(2, -GRID_SIZE * 1.0);
                context.lineTo(2, GRID_SIZE * 0.3); context.closePath(); // 칼날
                context.moveTo(-GRID_SIZE * 0.2, GRID_SIZE * 0.3); context.lineTo(GRID_SIZE * 0.2, GRID_SIZE * 0.3);
                context.lineTo(GRID_SIZE * 0.25, GRID_SIZE * 0.3 + 3); context.lineTo(-GRID_SIZE * 0.25, GRID_SIZE * 0.3 + 3);
                context.closePath(); // 가드
                context.rect(-1.5, GRID_SIZE * 0.3 + 3, 3, GRID_SIZE * 0.3); // 손잡이

                if (isOutline) { context.stroke(); }
                else {
                    // 채우기 로직 (기존 코드)
                    const bladeGradient = context.createLinearGradient(0, -GRID_SIZE, 0, 0);
                    bladeGradient.addColorStop(0, '#f3f4f6'); bladeGradient.addColorStop(1, '#9ca3af');
                    context.fillStyle = bladeGradient;
                    // 칼날 경로 다시 그리고 채우기
                    context.beginPath();
                    context.moveTo(-2, GRID_SIZE * 0.3); context.lineTo(-2, -GRID_SIZE * 1.0);
                    context.lineTo(0, -GRID_SIZE * 1.2); context.lineTo(2, -GRID_SIZE * 1.0);
                    context.lineTo(2, GRID_SIZE * 0.3); context.closePath();
                    context.fill(); context.stroke(); // 외곽선 포함

                    context.fillStyle = '#374151';
                    // 가드 경로 다시 그리고 채우기
                    context.beginPath();
                    context.moveTo(-GRID_SIZE * 0.2, GRID_SIZE * 0.3); context.lineTo(GRID_SIZE * 0.2, GRID_SIZE * 0.3);
                    context.lineTo(GRID_SIZE * 0.25, GRID_SIZE * 0.3 + 3); context.lineTo(-GRID_SIZE * 0.25, GRID_SIZE * 0.3 + 3);
                    context.closePath();
                    context.fill(); context.stroke(); // 외곽선 포함

                    context.fillStyle = '#1f2937';
                    // 손잡이 경로 다시 그리고 채우기
                    context.beginPath();
                    context.rect(-1.5, GRID_SIZE * 0.3 + 3, 3, GRID_SIZE * 0.3);
                    context.fill(); context.stroke(); // 외곽선 포함
                }
            } else if (this.type === 'magic_dagger') {
                 context.translate(-GRID_SIZE * 0.4, 0);
                 context.scale(0.7, 0.7);
                 context.rotate(-Math.PI / 8);
                 // drawMagicDaggerIcon 호출 (내부에서 isOutline 처리 필요)
                 drawMagicDaggerIcon(context); // isOutline 인자 추가 필요 (weaponDesigns.js 수정)
            } else if (this.type === 'axe') {
                 context.translate(GRID_SIZE * 0.8, -GRID_SIZE * 0.7);
                 context.rotate(Math.PI / 4);
                 context.scale(0.8, 0.8);
                 // drawAxeIcon 호출 (내부에서 isOutline 처리 필요)
                 drawAxeIcon(context); // isOutline 인자 추가 필요 (weaponDesigns.js 수정)
            } else if (this.type === 'bow') {
                 context.translate(GRID_SIZE * 0.4, 0);
                 context.rotate(-Math.PI / 4);
                 const bowScale = 0.56;
                 context.scale(bowScale, bowScale);
                 // 활 경로 정의
                 context.beginPath();
                 context.rect(-GRID_SIZE * 0.7, -1, GRID_SIZE * 1.2, 2); // 몸통
                 context.moveTo(GRID_SIZE * 0.5, 0); context.lineTo(GRID_SIZE * 0.3, -3); context.lineTo(GRID_SIZE * 0.3, 3); context.closePath(); // 오른쪽 끝 장식
                 context.moveTo(-GRID_SIZE * 0.6, -1); context.lineTo(-GRID_SIZE * 0.7, -4); context.lineTo(-GRID_SIZE * 0.5, -1); context.closePath(); // 왼쪽 위 장식
                 context.moveTo(-GRID_SIZE * 0.6, 1); context.lineTo(-GRID_SIZE * 0.7, 4); context.lineTo(-GRID_SIZE * 0.5, 1); context.closePath(); // 왼쪽 아래 장식
                 // 활대 (arc)는 stroke만 사용하므로 isOutline에서만 그림
                 const arcRadius = GRID_SIZE * 0.8, arcAngle = Math.PI / 2.2;
                 const bowstringY1 = Math.sin(-arcAngle) * arcRadius;
                 const bowstringY2 = Math.sin(arcAngle) * arcRadius;
                 const bowstringX = Math.cos(arcAngle) * arcRadius;
                 let pullBack = -GRID_SIZE * 0.4;
                 if (unit.attackAnimationTimer > 0) {
                     const pullProgress = Math.sin((15 - unit.attackAnimationTimer) / 15 * Math.PI);
                     pullBack -= pullProgress * GRID_SIZE * 0.5;
                 }
                 context.moveTo(bowstringX, bowstringY1); // 활시위 시작
                 context.lineTo(pullBack, 0);
                 context.lineTo(bowstringX, bowstringY2); // 활시위 끝

                 if (isOutline) {
                     context.arc(0, 0, arcRadius, -arcAngle, arcAngle); // 활대 추가
                     context.stroke();
                 } else {
                     // 채우기 로직 (기존 코드)
                     context.fillStyle = '#f3f4f6';
                     context.fillRect(-GRID_SIZE * 0.7, -1, GRID_SIZE * 1.2, 2);
                     context.strokeRect(-GRID_SIZE * 0.7, -1, GRID_SIZE * 1.2, 2);
                     context.fillStyle = '#e5e7eb';
                     context.beginPath(); context.moveTo(GRID_SIZE * 0.5, 0); context.lineTo(GRID_SIZE * 0.3, -3); context.lineTo(GRID_SIZE * 0.3, 3); context.closePath(); context.fill();
                     context.fillStyle = '#d1d5db';
                     context.beginPath(); context.moveTo(-GRID_SIZE * 0.6, -1); context.lineTo(-GRID_SIZE * 0.7, -4); context.lineTo(-GRID_SIZE * 0.5, -1); context.closePath(); context.fill();
                     context.beginPath(); context.moveTo(-GRID_SIZE * 0.6, 1); context.lineTo(-GRID_SIZE * 0.7, 4); context.lineTo(-GRID_SIZE * 0.5, 1); context.closePath(); context.fill();
                     // 활대 그리기 (stroke)
                     context.strokeStyle = 'black'; context.lineWidth = 6 / bowScale; context.beginPath(); context.arc(0, 0, arcRadius, -arcAngle, arcAngle); context.stroke();
                     context.strokeStyle = '#854d0e'; context.lineWidth = 4 / bowScale; context.beginPath(); context.arc(0, 0, arcRadius, -arcAngle, arcAngle); context.stroke();
                     // 활시위 그리기 (stroke)
                     context.strokeStyle = '#e5e7eb'; context.lineWidth = 1.5 / bowScale; context.beginPath();
                     context.moveTo(bowstringX, bowstringY1); context.lineTo(pullBack, 0); context.lineTo(bowstringX, bowstringY2); context.stroke();
                 }

             } else if (this.type === 'dual_swords') {
                 // 쌍검 그리기 함수 (drawEquippedCurvedSword) 호출
                 // 이 함수 내에서 isOutline 처리 필요
                 const drawEquippedCurvedSword = (isRightHand, outlineOnly = false) => {
                     context.save();
                     const yOffset = isRightHand ? GRID_SIZE * 0.6 : -GRID_SIZE * 0.6;
                     const swordRotation = isRightHand ? Math.PI / 8 : -Math.PI / 8;
                     context.translate(GRID_SIZE * 0.1, yOffset);
                     context.rotate(swordRotation);
                     // 경로 정의
                     context.beginPath();
                     context.rect(-GRID_SIZE * 0.05, 0, GRID_SIZE * 0.1, GRID_SIZE * 0.2); // 손잡이 사각형
                     context.moveTo(-GRID_SIZE * 0.2, 0); context.lineTo(GRID_SIZE * 0.2, 0); // 가드 위
                     context.lineTo(GRID_SIZE * 0.2, -GRID_SIZE * 0.05); context.lineTo(-GRID_SIZE * 0.2, -GRID_SIZE * 0.05); // 가드 아래
                     context.closePath(); // 가드 경로 닫기
                     context.moveTo(0, -GRID_SIZE * 0.05); // 칼날 시작
                     context.quadraticCurveTo(GRID_SIZE * 0.4, -GRID_SIZE * 0.3, 0, -GRID_SIZE * 0.8);
                     context.quadraticCurveTo(-GRID_SIZE * 0.1, -GRID_SIZE * 0.3, 0, -GRID_SIZE * 0.05);
                     context.closePath(); // 칼날 경로 닫기

                     if (outlineOnly) {
                         context.stroke();
                     } else {
                         context.fillStyle = '#374151'; // 손잡이/가드 색
                         context.fill(); context.stroke();
                         // 칼날 채우기
                         const bladeGradient = context.createLinearGradient(0, -GRID_SIZE*0.8, 0, 0);
                         bladeGradient.addColorStop(0, '#f3f4f6'); bladeGradient.addColorStop(0.5, '#9ca3af'); bladeGradient.addColorStop(1, '#4b5563');
                         context.fillStyle = bladeGradient;
                         // 칼날 경로 다시 그리고 채우기
                         context.beginPath();
                         context.moveTo(0, -GRID_SIZE * 0.05);
                         context.quadraticCurveTo(GRID_SIZE * 0.4, -GRID_SIZE * 0.3, 0, -GRID_SIZE * 0.8);
                         context.quadraticCurveTo(-GRID_SIZE * 0.1, -GRID_SIZE * 0.3, 0, -GRID_SIZE * 0.05);
                         context.closePath();
                         context.fill();
                     }
                     context.restore();
                 };
                 drawEquippedCurvedSword(true, isOutline);
                 drawEquippedCurvedSword(false, isOutline);
             } else if (this.type === 'fire_staff') {
                 // this.drawStaff 호출 (내부에서 isOutline 처리 필요)
                 this.drawStaff(context, 0.8, isOutline);
             } else if (this.type === 'lightning') {
                 // 번개는 회전이 적용되지 않으므로 별도 처리
                 const revolutionAngle = gameManager.animationFrameCounter * 0.05;
                 const orbitRadius = GRID_SIZE * 0.8;
                 const weaponX = Math.cos(revolutionAngle) * orbitRadius;
                 const weaponY = Math.sin(revolutionAngle) * orbitRadius;
                 context.save();
                 context.translate(weaponX, weaponY);
                 // this.drawLightning 호출 (내부에서 isOutline 처리 필요)
                 this.drawLightning(context, 0.48, 0, isOutline);
                 context.restore();
             } else if (this.type === 'ice_diamond') {
                 // 얼음 다이아도 회전 미적용
                 context.translate(GRID_SIZE * 0.6, 0);
                 // drawIceDiamondIcon 호출 (내부에서 isOutline 처리 필요)
                 drawIceDiamondIcon(context, 0.6); // isOutline 인자 추가 필요 (weaponDesigns.js 수정)
                 for (let i = 0; i < unit.iceDiamondCharges; i++) {
                     const angle = (gameManager.animationFrameCounter * 0.02) + (i * (Math.PI * 2 / 5));
                     const orbitRadius = GRID_SIZE * 1.2;
                     const orbX = Math.cos(angle) * orbitRadius;
                     const orbY = Math.sin(angle) * orbitRadius;
                     context.save();
                     context.translate(orbX, orbY);
                     // drawIceDiamondIcon 호출 (내부에서 isOutline 처리 필요)
                     drawIceDiamondIcon(context, 0.5); // isOutline 인자 추가 필요
                     context.restore();
                 }
             } else if (this.type === 'magic_spear') {
                 context.translate(GRID_SIZE * 0.2, GRID_SIZE * 0.4);
                 // this.drawMagicSpear 호출 (내부에서 isOutline 처리 필요)
                 this.drawMagicSpear(context, 0.5, -Math.PI / 8 + Math.PI, isOutline);
             } else if (this.type === 'boomerang') {
                 context.translate(0, -GRID_SIZE * 0.5);
                 // this.drawBoomerang 호출 (내부에서 isOutline 처리 필요)
                 this.drawBoomerang(context, 0.5, 0, null, isOutline);
             } else if (this.type === 'poison_potion') {
                 context.translate(0, -GRID_SIZE * 0.5);
                 // this.drawPoisonPotion 호출 (내부에서 isOutline 처리 필요)
                 this.drawPoisonPotion(context, 0.3, isOutline);
             } else if (this.type === 'hadoken') {
                 context.translate(GRID_SIZE * 0.5, 0);
                 const hadokenScale = 0.7;
                 context.scale(hadokenScale, hadokenScale);
                 // 장풍 경로 정의
                 context.beginPath();
                 context.arc(GRID_SIZE * 0.2, 0, GRID_SIZE * 0.6, -Math.PI / 2, Math.PI / 2, false);
                 context.lineTo(-GRID_SIZE * 0.8, 0);
                 context.closePath();

                 if (isOutline) { context.stroke(); }
                 else {
                     // 채우기 로직
                     const grad = context.createRadialGradient(0, 0, 1, 0, 0, GRID_SIZE * 1.2);
                     grad.addColorStop(0, '#bfdbfe'); grad.addColorStop(0.6, '#3b82f6'); grad.addColorStop(1, '#1e40af');
                     context.fillStyle = grad;
                     context.strokeStyle = 'black'; context.lineWidth = 1.5 / hadokenScale;
                     context.fill(); context.stroke();
                 }
             } else if (this.type === 'shuriken') {
                 context.translate(GRID_SIZE * 0.4, GRID_SIZE * 0.3);
                 const shurikenScale = 0.5;
                 context.scale(shurikenScale, shurikenScale);
                 context.rotate(gameManager.animationFrameCounter * 0.1);
                 // 표창 경로 정의
                 context.beginPath();
                 context.moveTo(0, -GRID_SIZE * 0.8); context.lineTo(GRID_SIZE * 0.2, -GRID_SIZE * 0.2);
                 context.lineTo(GRID_SIZE * 0.8, 0); context.lineTo(GRID_SIZE * 0.2, GRID_SIZE * 0.2);
                 context.lineTo(0, GRID_SIZE * 0.8); context.lineTo(-GRID_SIZE * 0.2, GRID_SIZE * 0.2);
                 context.lineTo(-GRID_SIZE * 0.8, 0); context.lineTo(-GRID_SIZE * 0.2, -GRID_SIZE * 0.2);
                 context.closePath();

                 if (isOutline) { context.stroke(); }
                 else {
                     // 채우기 로직
                     context.fillStyle = '#4a5568'; context.strokeStyle = 'black'; context.lineWidth = 2 / shurikenScale;
                     context.fill(); context.stroke();
                 }
            }

            context.restore();
        };

        // --- 실제 무기 그리기 및 테두리 적용 ---
        // 1. 기본 무기 그리기
        weaponDrawFn(ctx, false);

        // 2. 특수 공격 준비 시 테두리 그리기
        if (isSpecialReady) {
            drawWeaponOutline(ctx, unit, weaponDrawFn);
        }

        ctx.restore(); // 맨 처음 save() 복원
    }
}

// ... (Particle, createPhysicalHitEffect, createFireballHitEffect, Projectile, Effect, MagicDaggerDashEffect, AreaEffect 클래스 정의는 기존과 동일) ...
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
export function createPhysicalHitEffect(gameManager, target) {
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

// Projectile class
export class Projectile {
    constructor(gameManager, owner, target, type = 'arrow', options = {}) {
        this.gameManager = gameManager;
        this.owner = owner;
        this.target = target;
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
        else if (type === 'black_sphere_projectile') this.speed = 6;
        else if (type === 'sword_wave') this.speed = 4.5;
        else if (type === 'bouncing_sword') this.speed = 7;
        else this.speed = 6;

        // [MODIFIED] 일반 공격과 스킬 공격의 데미지 계산을 완벽히 분리
        let baseNormalDamage = owner.baseAttackPower;
        let baseSpecialDamage = owner.specialAttackLevelBonus;

        const weaponType = owner.weapon ? owner.weapon.type : null;
        const skillAttackWeapons = [
            'magic_dagger', 'poison_potion', 'ice_diamond', 'fire_staff',
            'magic_spear', 'boomerang', 'hadoken', 'shuriken'
        ];

        if (skillAttackWeapons.includes(weaponType)) {
            baseSpecialDamage += owner.weapon.attackPowerBonus || 0;
        } else {
            baseNormalDamage += owner.weapon.attackPowerBonus || 0;
        }

        switch (type) {
            // --- 스킬 공격력 기반 ---
            case 'shuriken':
            case 'returning_shuriken':
                this.damage = baseSpecialDamage;
                break;
            case 'magic_spear_special':
                this.damage = baseSpecialDamage + 15;
                break;
            case 'ice_diamond_projectile':
                this.damage = baseSpecialDamage + 15;
                break;
            case 'fireball_projectile':
                this.damage = baseSpecialDamage;
                break;
            case 'mini_fireball_projectile':
                this.damage = 15; // 고정 데미지로 변경
                break;
            case 'bouncing_sword':
                this.damage = 20; // 고정 데미지로 변경
                break;
            case 'boomerang_projectile':
                this.damage = 0;
                break;

            // --- 일반 공격력 기반 ---
            case 'magic_spear_normal':
                this.damage = baseNormalDamage + 5;
                break;
            case 'boomerang_normal_projectile':
                this.damage = baseNormalDamage + 10;
                break;
            case 'black_sphere_projectile':
                this.damage = baseNormalDamage + 7;
                break;
            default:
                this.damage = baseNormalDamage;
                break;
        }

        this.knockback = (type === 'hadoken') ? gameManager.hadokenKnockback : 0;
        const inaccuracy = (type === 'shuriken' || type === 'lightning_bolt' || type === 'sword_wave') ? 0 : GRID_SIZE * 0.8;

        let targetX, targetY;
        if (type === 'returning_shuriken') {
            targetX = this.pixelX + Math.cos(options.angle);
            targetY = this.pixelY + Math.sin(options.angle);
        } else {
            targetX = target.pixelX + (gameManager.random() - 0.5) * inaccuracy;
            targetY = target.pixelY + (gameManager.random() - 0.5) * inaccuracy;
        }

        const dx = targetX - this.pixelX; const dy = targetY - this.pixelY;
        this.angle = options.angle !== undefined ? options.angle : Math.atan2(dy, dx);
        this.destroyed = false;
        this.trail = [];
        this.rotationAngle = 0;

        this.hitTargets = options.hitTargets || new Set();
        this.piercing = (type === 'sword_wave');
        if (type === 'lightning_bolt' && options.initialTarget) {
            this.hitTargets.add(options.initialTarget);
        }
    }

    update() {
        const gameManager = this.gameManager;
        if (!gameManager) return;

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
                        unit.takeDamage(this.damage, {}, this.owner);
                        this.hitTargets.add(unit);
                    }
                }

                if (this.distanceTraveled >= this.maxDistance) {
                    this.state = 'LINGERING';
                }
            } else if (this.state === 'LINGERING') {
                this.lingerDuration -= gameManager.gameSpeed;
                this.damageCooldown -= gameManager.gameSpeed;

                if (this.damageCooldown <= 0) {
                    for (const unit of gameManager.units) {
                        if (unit.team !== this.owner.team && Math.hypot(this.pixelX - unit.pixelX, this.pixelY - unit.pixelY) < GRID_SIZE * 2) {
                            unit.takeDamage(this.damage * 0.15, {}, this.owner); // Reduced lingering damage
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
                        unit.takeDamage(this.damage, {}, this.owner);
                        this.alreadyDamagedOnReturn.add(unit);
                    }
                }
            }
            return;
        }

        // [MODIFIED] 얼음 다이아와 부메랑 특수 공격 투사체에 유도 기능 추가
        if (this.type === 'ice_diamond_projectile' || this.type === 'boomerang_projectile') {
            if (this.target && this.target.hp > 0) {
                const targetAngle = Math.atan2(this.target.pixelY - this.pixelY, this.target.pixelX - this.pixelX);
                let angleDiff = targetAngle - this.angle;

                // 각도 차이를 -PI ~ PI 범위로 정규화
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

                const turnSpeed = 0.03; // 프레임당 회전 속도 (라디안)
                if (Math.abs(angleDiff) > turnSpeed) {
                    this.angle += Math.sign(angleDiff) * turnSpeed * gameManager.gameSpeed;
                } else {
                    this.angle = targetAngle;
                }
            }
        }

        if (['hadoken', 'lightning_bolt', 'magic_spear', 'ice_diamond_projectile', 'fireball_projectile', 'mini_fireball_projectile', 'black_sphere_projectile'].some(t => this.type.startsWith(t))) {
            this.trail.push({x: this.pixelX, y: this.pixelY});
            if (this.trail.length > 10) this.trail.shift();
        }
        if (this.type.includes('shuriken') || this.type.includes('boomerang') || this.type.includes('bouncing_sword')) {
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
            const isCollidableWall = tile.type === 'WALL' || tile.type === 'CRACKED_WALL';
            if (this.type !== 'magic_spear_special' && this.type !== 'sword_wave' && isCollidableWall) {
                if (tile.type === 'CRACKED_WALL') {
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

        if (this.type === 'arrow') {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.angle);
            ctx.scale(1.2, 1.2);

            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;

            // 화살 몸통
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.7, 0);
            ctx.lineTo(GRID_SIZE * 0.4, 0);
            ctx.lineTo(GRID_SIZE * 0.4, -1.5);
            ctx.lineTo(GRID_SIZE * 0.6, -1.5);
            ctx.lineTo(GRID_SIZE * 0.6, 1.5);
            ctx.lineTo(GRID_SIZE * 0.4, 1.5);
            ctx.lineTo(GRID_SIZE * 0.4, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 화살촉
            ctx.beginPath();
            ctx.moveTo(GRID_SIZE * 0.6, -2.5);
            ctx.lineTo(GRID_SIZE * 0.9, 0);
            ctx.lineTo(GRID_SIZE * 0.6, 2.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 깃털
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.7, 0);
            ctx.lineTo(-GRID_SIZE * 0.8, -3);
            ctx.moveTo(-GRID_SIZE * 0.7, 0);
            ctx.lineTo(-GRID_SIZE * 0.8, 3);
            ctx.stroke();

            ctx.restore();
        } else if (this.type === 'sword_wave') {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.angle - Math.PI / 2);

            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 4;
            ctx.shadowColor = 'rgba(255, 0, 0, 0.7)';
            ctx.shadowBlur = 10;

            ctx.beginPath();
            ctx.arc(0, 0, GRID_SIZE * 0.7, 0, Math.PI, false);
            ctx.stroke();

            ctx.restore();
        } else if (this.type === 'bouncing_sword') {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.rotationAngle);
            ctx.scale(0.72, 0.72);

            ctx.fillStyle = '#6b7280';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1.5;

            ctx.fillRect(-GRID_SIZE * 0.1, GRID_SIZE * 0.3, GRID_SIZE * 0.2, GRID_SIZE * 0.3);
            ctx.strokeRect(-GRID_SIZE * 0.1, GRID_SIZE * 0.3, GRID_SIZE * 0.2, GRID_SIZE * 0.3);
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.3, GRID_SIZE * 0.3); ctx.lineTo(GRID_SIZE * 0.3, GRID_SIZE * 0.3);
            ctx.lineTo(GRID_SIZE * 0.3, GRID_SIZE * 0.2); ctx.lineTo(-GRID_SIZE * 0.3, GRID_SIZE * 0.2);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            const bladeGradient = ctx.createLinearGradient(0, -GRID_SIZE, 0, 0);
            bladeGradient.addColorStop(0, '#f3f4f6'); bladeGradient.addColorStop(0.5, '#9ca3af'); bladeGradient.addColorStop(1, '#d1d5db');
            ctx.fillStyle = bladeGradient;
            ctx.beginPath();
            ctx.moveTo(0, GRID_SIZE * 0.2);
            ctx.quadraticCurveTo(GRID_SIZE * 0.5, -GRID_SIZE * 0.4, 0, -GRID_SIZE * 0.9);
            ctx.quadraticCurveTo(-GRID_SIZE * 0.1, -GRID_SIZE * 0.4, 0, GRID_SIZE * 0.2);
            ctx.closePath(); ctx.fill(); ctx.stroke();
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
                ctx.arc(pos.x, pos.y, (GRID_SIZE / 1.67) * (i / this.trail.length), 0, Math.PI * 2);
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
            const size = this.type === 'fireball_projectile' ? GRID_SIZE / 1.67 : GRID_SIZE / 4;
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
        } else if (this.type === 'black_sphere_projectile') {
            const size = GRID_SIZE / 3;
            for (let i = 0; i < this.trail.length; i++) {
                const pos = this.trail[i];
                const alpha = (i / this.trail.length) * 0.2;
                ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, size * (i / this.trail.length), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.fillStyle = '#000000';
            ctx.strokeStyle = '#4a5568';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.pixelX, this.pixelY, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }
}

// Effect class
export class Effect {
    constructor(gameManager, x, y, type, target, options = {}) {
        this.gameManager = gameManager;
        this.x = x; this.y = y; this.type = type; this.target = target;
        this.duration = 20; this.angle = this.gameManager.random() * Math.PI * 2;

        if (this.type === 'question_mark_effect') {
            this.duration = 60;
            this.particles = [];
            for (let i = 0; i < 20; i++) {
                this.particles.push({
                    x: this.x, y: this.y,
                    angle: this.gameManager.random() * Math.PI * 2,
                    speed: this.gameManager.random() * 2 + 1,
                    radius: this.gameManager.random() * 3 + 1,
                    lifespan: 40,
                });
            }
        } else if (this.type === 'level_up') {
            // [NEW] 레벨업 이펙트 지속 시간 설정
            this.duration = 40;
        }
    }
    update() {
        const gameManager = this.gameManager;
        if (!gameManager) return;
        this.duration -= gameManager.gameSpeed;

        if (this.type === 'question_mark_effect') {
            this.particles.forEach(p => {
                p.x += Math.cos(p.angle) * p.speed;
                p.y += Math.sin(p.angle) * p.speed;
                p.lifespan--;
            });
            this.particles = this.particles.filter(p => p.lifespan > 0);
        }
    }
    draw(ctx) {
        const opacity = this.duration / 20;
        if (this.type === 'slash' || this.type === 'dual_sword_slash') {
            ctx.save();
            ctx.translate(this.target.pixelX, this.target.pixelY);
            ctx.rotate(this.angle);
            ctx.strokeStyle = `rgba(220, 38, 38, ${opacity})`;
            ctx.lineWidth = this.type === 'slash' ? 3 : 2;
            const arcSize = this.type === 'slash' ? GRID_SIZE : GRID_SIZE * 0.7;
            ctx.beginPath();
            ctx.arc(0, 0, arcSize, -0.5, 0.5);
            ctx.stroke();
            ctx.restore();
        } else if (this.type === 'chain_lightning') {
            ctx.strokeStyle = `rgba(254, 240, 138, ${opacity})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.target.pixelX, this.target.pixelY);
            ctx.stroke();
        } else if (this.type === 'question_mark_effect') {
            this.particles.forEach(p => {
                ctx.globalAlpha = (p.lifespan / 40) * (this.duration / 60);
                ctx.fillStyle = '#facc15';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1.0;
        } else if (this.type === 'axe_spin_effect') {
            const progress = 1 - (this.duration / 20);
            const radius = GRID_SIZE * 3.5 * progress;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.strokeStyle = `rgba(220, 38, 38, ${opacity})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        } else if (this.type === 'level_up') {
            const initialDuration = 40;
            const yOffset = -GRID_SIZE - (initialDuration - this.duration);
            const opacity = Math.min(1, this.duration / (initialDuration / 2));
            ctx.save();
            ctx.translate(this.target.pixelX, this.target.pixelY + yOffset);
            // [MODIFIED] 레벨업 글자 크기를 기존보다 30% 작게 조정했습니다.
            ctx.scale(1.05, 1.05);
            ctx.fillStyle = `rgba(255, 215, 0, ${opacity})`;
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            // [MODIFIED] 가독성을 위해 검은색 테두리를 제거했습니다.
            ctx.fillText('LEVEL UP!', 0, 0);
            ctx.restore();
        }
    }
}

export class MagicDaggerDashEffect {
    constructor(gameManager, startPos, endPos) {
        this.gameManager = gameManager;
        this.startPos = startPos;
        this.endPos = endPos;
        this.life = 20;
        this.initialLife = 20;
    }

    isAlive() {
        return this.life > 0;
    }

    update() {
        this.life--;
        if (this.life > 0 && this.life % 2 === 0) {
            const progress = 1 - (this.life / this.initialLife);
            const particleX = this.startPos.x + (this.endPos.x - this.startPos.x) * progress;
            const particleY = this.startPos.y + (this.endPos.y - this.startPos.y) * progress;

            this.gameManager.addParticle({
                x: particleX,
                y: particleY,
                vx: (this.gameManager.random() - 0.5) * 2,
                vy: (this.gameManager.random() - 0.5) * 2,
                life: 0.5,
                color: '#ffffff',
                size: this.gameManager.random() * 2 + 1,
            });
        }
    }

    draw(ctx) {
        const opacity = this.life / this.initialLife;

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#d8b4fe';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.moveTo(this.startPos.x, this.startPos.y);
        ctx.lineTo(this.endPos.x, this.endPos.y);
        ctx.stroke();

        ctx.restore();
    }
}

// [수정] AreaEffect 클래스를 export 합니다.
export class AreaEffect {
    constructor(gameManager, x, y, type, options = {}) {
        this.gameManager = gameManager;
        this.pixelX = x; this.pixelY = y; this.type = type;
        this.duration = 30; this.maxRadius = GRID_SIZE * 2.5; this.currentRadius = 0;
        this.damage = options.damage || 0;
        this.ownerTeam = options.ownerTeam || null;
        this.particles = [];
        this.damagedUnits = new Set();
        this.damagedNexuses = new Set();

        if (this.type === 'fire_pillar') {
            for (let i = 0; i < 50; i++) {
                this.particles.push({
                    x: (this.gameManager.random() - 0.5) * this.maxRadius * 1.5,
                    y: (this.gameManager.random() - 0.5) * this.maxRadius * 0.5,
                    size: this.gameManager.random() * 4 + 2,
                    speed: this.gameManager.random() * 1.5 + 1,
                    lifespan: this.gameManager.random() * 20 + 10,
                    color: ['#ffcc00', '#ff9900', '#ff6600', '#ef4444'][Math.floor(this.gameManager.random() * 4)]
                });
            }
        }
    }
    update() {
        const gameManager = this.gameManager;
        if (!gameManager) return;
        this.duration -= gameManager.gameSpeed;
        this.currentRadius = this.maxRadius * (1 - (this.duration / 30));

        if (this.type === 'fire_pillar') {
            this.particles.forEach(p => {
                p.y -= p.speed * gameManager.gameSpeed;
                p.lifespan -= gameManager.gameSpeed;
                p.x += (this.gameManager.random() - 0.5) * 0.5;
            });
            this.particles = this.particles.filter(p => p.lifespan > 0);

            gameManager.units.forEach(unit => {
                if (unit.team !== this.ownerTeam && !this.damagedUnits.has(unit)) {
                    const dist = Math.hypot(unit.pixelX - this.pixelX, unit.pixelY - this.pixelY);
                    if (dist < this.currentRadius) {
                        // 수정: attacker 정보를 찾아서 전달
                        const attacker = gameManager.units.find(u => u.team === this.ownerTeam);
                        unit.takeDamage(this.damage, {}, attacker);
                        this.damagedUnits.add(unit);
                    }
                }
            });

            gameManager.nexuses.forEach(nexus => {
                if (nexus.team !== this.ownerTeam && !this.damagedNexuses.has(nexus)) {
                    const dist = Math.hypot(nexus.pixelX - this.pixelX, nexus.pixelY - this.pixelY);
                    if (dist < this.currentRadius) {
                        nexus.takeDamage(this.damage);
                        this.damagedNexuses.add(nexus);
                    }
                }
            });
        }
    }
    draw(ctx) {
        const opacity = this.duration / 30;
        if (this.type === 'fire_pillar') {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);

            const grad = ctx.createRadialGradient(0, 0, this.currentRadius * 0.3, 0, 0, this.currentRadius);
            grad.addColorStop(0, `rgba(255, 100, 0, ${opacity * 0.4})`);
            grad.addColorStop(0.6, `rgba(255, 0, 0, ${opacity * 0.3})`);
            grad.addColorStop(1, `rgba(200, 0, 0, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, this.currentRadius, 0, Math.PI * 2);
            ctx.fill();

            this.particles.forEach(p => {
                ctx.globalAlpha = (p.lifespan / 20) * opacity;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
            ctx.globalAlpha = 1.0;

        } else if (this.type === 'poison_cloud') {
            ctx.fillStyle = `rgba(132, 204, 22, ${opacity * 0.4})`;
            ctx.fillRect(this.pixelX - GRID_SIZE * 2.5, this.pixelY - GRID_SIZE * 2.5, GRID_SIZE * 5, GRID_SIZE * 5);
        }
    }
}
