import { TEAM, COLORS, GRID_SIZE } from './constants.js';
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

// Weapon class
export class Weapon {
    constructor(gameManager, x, y, type) {
        this.gameManager = gameManager;
        this.gridX = x; this.gridY = y;
        this.pixelX = x * GRID_SIZE + GRID_SIZE / 2;
        this.pixelY = y * GRID_SIZE + GRID_SIZE / 2;
        this.type = type;
        this.isEquipped = false;
        // [🌟 NEW] 특수 공격 이펙트 대상 무기인지 확인하는 플래그
        this.hasSpecialAttackEffect = ['sword', 'bow', 'boomerang', 'shuriken', 'fire_staff', 'magic_dagger', 'dual_swords'].includes(type);
    }

    /**
     * [MODIFIED] Handles the weapon's attack logic.
     * @param {Unit} unit - The unit using this weapon.
     * @param {Unit | Nexus} target - The attack target.
     */
    use(unit, target) {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        // 공격 애니메이션 타이머 설정 (기존 로직 유지)
        if (['sword', 'dual_swords', 'boomerang', 'poison_potion', 'magic_dagger', 'axe', 'bow'].includes(this.type)) {
            unit.attackAnimationTimer = 15;
        }

        // --- 무기별 공격 로직 (기존 로직 대부분 유지, attackCount 업데이트 위치 변경) ---
        if (this.type === 'sword') {
            // [🌟 MODIFIED] 공격 횟수 증가 로직을 공격 실행 *후* 로 이동
            target.takeDamage(unit.attackPower, {}, unit);
            gameManager.createEffect('slash', unit.pixelX, unit.pixelY, target);
            gameManager.audioManager.play('swordHit');
            unit.attackCooldown = unit.cooldownTime;

            if (unit.attackCount >= 2) { // 3타째에 특수 공격 발동
                unit.attackCount = 0; // 공격 횟수 초기화
                unit.swordSpecialAttackAnimationTimer = 30;
                gameManager.createProjectile(unit, target, 'sword_wave');
                gameManager.audioManager.play('Aurablade');

                // 파티클 효과 (기존 유지)
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
                 unit.attackCount++; // [🌟 NEW] 일반 공격 시 횟수 증가
            }
        } else if (this.type === 'bow') {
            // [🌟 MODIFIED] 공격 횟수 증가 로직을 공격 실행 *후* 로 이동
            gameManager.audioManager.play('arrowShoot');
            unit.attackCooldown = unit.cooldownTime;

            if (unit.attackCount >= 2) { // 3타째에 특수 공격 발동
                unit.attackCount = 0; // 공격 횟수 초기화

                // 반동 효과 (기존 유지)
                const recoilAngle = unit.facingAngle + Math.PI;
                const recoilForce = 4;
                unit.knockbackX += Math.cos(recoilAngle) * recoilForce;
                unit.knockbackY += Math.sin(recoilAngle) * recoilForce;

                // 화살 2발 발사 (기존 유지)
                gameManager.createProjectile(unit, target, 'arrow');
                setTimeout(() => {
                    if (unit.hp > 0) {
                        gameManager.createProjectile(unit, target, 'arrow');
                    }
                }, 150);

                // 파티클 효과 (기존 유지)
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
                gameManager.createProjectile(unit, target, 'arrow'); // 일반 공격
                unit.attackCount++; // [🌟 NEW] 일반 공격 시 횟수 증가
            }
        } else if (this.type === 'magic_dagger') {
             // 마법 단검은 unit.js에서 스킬 사용 로직 처리, 여기서는 일반 공격만
            target.takeDamage(unit.attackPower, {}, unit);
            gameManager.createEffect('slash', unit.pixelX, unit.pixelY, target);
            gameManager.audioManager.play('dualSwordHit'); // 임시 효과음
            unit.attackCooldown = unit.cooldownTime; // 일반 공격 쿨타임 적용
        } else if (this.type === 'dual_swords') {
             // 쌍검은 unit.js에서 스킬 사용 로직 처리, 여기서는 일반 공격만
            target.takeDamage(unit.attackPower, {}, unit);
            gameManager.createEffect('dual_sword_slash', unit.pixelX, unit.pixelY, target);
            gameManager.audioManager.play('dualSwordHit');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'axe') {
            // 도끼 스킬은 Unit 클래스에서 별도 처리, 여기서는 일반 공격
            target.takeDamage(unit.attackPower, {}, unit);
            gameManager.createEffect('slash', unit.pixelX, unit.pixelY, target);
            gameManager.audioManager.play('swordHit');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'ice_diamond') {
            if (unit.iceDiamondCharges > 0) { // 충전량이 있으면 특수 공격
                for (let i = 0; i < unit.iceDiamondCharges; i++) {
                    setTimeout(() => {
                        if (unit.hp > 0) {
                            gameManager.createProjectile(unit, target, 'ice_diamond_projectile');
                        }
                    }, i * 100);
                }
                gameManager.audioManager.play('Ice');
                unit.iceDiamondCharges = 0; // 충전량 소모
                unit.iceDiamondChargeTimer = 0; // 충전 타이머 초기화
            } else { // 충전량 없으면 일반 공격
                gameManager.createProjectile(unit, target, 'ice_bolt_projectile');
                gameManager.audioManager.play('punch');
            }
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'fire_staff') {
            // 불 지팡이는 unit.js에서 스킬 사용 로직 처리, 여기서는 일반 공격만
            gameManager.createProjectile(unit, target, 'black_sphere_projectile');
            gameManager.audioManager.play('punch');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'shuriken') {
            // 표창은 unit.js에서 스킬 사용 로직 처리, 여기서는 일반 공격만 (스킬 사용 가능 시 use 호출됨)
            if (unit.shurikenSkillCooldown <= 0) { // 스킬 사용 가능 시 (unit.js update에서 호출됨)
                 const angleToTarget = Math.atan2(target.pixelY - unit.pixelY, target.pixelX - unit.pixelX);
                 const spread = 0.3; // 3방향 발사 각도
                 const angles = [angleToTarget - spread, angleToTarget, angleToTarget + spread];

                 const dummyTarget = { pixelX: 0, pixelY: 0 }; // 방향만 사용

                 angles.forEach(angle => {
                     gameManager.createProjectile(unit, dummyTarget, 'returning_shuriken', {
                         angle: angle,
                         state: 'MOVING_OUT',
                         maxDistance: GRID_SIZE * 8
                     });
                 });
                 unit.shurikenSkillCooldown = 480; // 스킬 쿨타임 시작 (8초)
                 gameManager.audioManager.play('shurikenShoot');
                 unit.attackCooldown = unit.cooldownTime; // 공격 쿨타임도 적용
            } else { // 스킬 쿨타임 중일 때 일반 공격
                 gameManager.createProjectile(unit, target, 'shuriken');
                 gameManager.audioManager.play('shurikenShoot');
                 unit.attackCooldown = unit.cooldownTime;
            }
        } else if (this.type === 'hadoken') {
            // 장풍은 특수 공격이 별도로 없음 (기존 로직 유지)
            gameManager.createProjectile(unit, target, 'hadoken');
            gameManager.audioManager.play('hadokenShoot');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'lightning') {
            // 번개는 특수 공격이 별도로 없음 (기존 로직 유지)
            gameManager.createProjectile(unit, target, 'lightning_bolt');
            gameManager.audioManager.play('electricity');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'magic_spear') {
             // 마법창은 unit.js에서 스킬 사용 로직 처리, 여기서는 일반 공격만
            gameManager.createProjectile(unit, target, 'magic_spear_normal');
            gameManager.audioManager.play('punch');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'boomerang') {
             // 부메랑은 unit.js에서 스킬 사용 로직 처리, 여기서는 일반 공격만
            gameManager.createProjectile(unit, target, 'boomerang_normal_projectile');
            gameManager.audioManager.play('punch');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'poison_potion') {
            // 독 포션은 특수 공격이 자폭 (기존 로직 유지)
            // unit.js의 isCasting 부분에서 처리되므로 여기서는 일반 근접 공격
            target.takeDamage(15, {}, unit); // 약한 근접 데미지
            unit.attackCooldown = unit.cooldownTime;
        } else {
             // 기타 무기 (기본 공격)
             target.takeDamage(unit.attackPower, {}, unit);
             gameManager.audioManager.play('punch');
             unit.attackCooldown = unit.cooldownTime;
        }

        // [🌟 NEW] 공격 후 특수 공격 상태 업데이트 (unit.js 에서도 하지만 중복 호출해도 문제 없음)
        unit.updateSpecialAttackReadyStatus();
    }


    // ... (drawStaff, drawLightning, drawMagicSpear, drawBoomerang, drawPoisonPotion 함수는 그대로 유지) ...
    drawStaff(ctx, scale = 1.0) {
        designDrawStaff(ctx, scale);
    }

    drawLightning(ctx, scale = 1.0, rotation = 0) {
        designDrawLightning(ctx, scale, rotation);
    }

    drawMagicSpear(ctx, scale = 1.0, rotation = 0) {
        designDrawMagicSpear(ctx, scale, rotation);
    }

    drawBoomerang(ctx, scale = 1.0, rotation = 0, color = null) {
        designDrawBoomerang(ctx, scale, rotation, color);
    }

    drawPoisonPotion(ctx, scale = 1.0) {
        designDrawPoisonPotion(ctx, scale);
    }

    /**
     * Draws the weapon when it's on the ground.
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        if (this.isEquipped) return; // 장착된 무기는 그리지 않음

        const centerX = this.pixelX;
        const centerY = this.pixelY;
        // 무기별 크기 조정 (기존 로직 유지)
        const scale = (this.type === 'crown') ? 1.0 : (this.type === 'lightning' ? 0.6 : (this.type === 'magic_spear' ? 0.6 : (this.type === 'poison_potion' ? 0.624 : (this.type === 'boomerang' ? 0.49 : 0.8))));

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);

        // 마법 단검 외에는 검은색 테두리 추가
        if (this.type !== 'magic_dagger') {
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1 / scale;
        }

        // --- 무기별 그리기 로직 (기존 로직 유지) ---
        if (this.type === 'sword') {
            ctx.rotate(Math.PI / 4);
            const bladeGradient = ctx.createLinearGradient(0, -GRID_SIZE, 0, 0);
            bladeGradient.addColorStop(0, '#f3f4f6'); bladeGradient.addColorStop(1, '#9ca3af');
            ctx.fillStyle = bladeGradient;
            ctx.beginPath();
            ctx.moveTo(-2, GRID_SIZE * 0.3); ctx.lineTo(-2, -GRID_SIZE * 1.0);
            ctx.lineTo(0, -GRID_SIZE * 1.2); ctx.lineTo(2, -GRID_SIZE * 1.0);
            ctx.lineTo(2, GRID_SIZE * 0.3);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#374151'; // 손잡이 가드
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.4, GRID_SIZE * 0.3); ctx.lineTo(GRID_SIZE * 0.4, GRID_SIZE * 0.3);
            ctx.lineTo(GRID_SIZE * 0.5, GRID_SIZE * 0.3 + 3); ctx.lineTo(-GRID_SIZE * 0.5, GRID_SIZE * 0.3 + 3);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#1f2937'; // 손잡이
            ctx.fillRect(-1.5, GRID_SIZE * 0.3 + 3, 3, GRID_SIZE * 0.3); ctx.strokeRect(-1.5, GRID_SIZE * 0.3 + 3, 3, GRID_SIZE * 0.3);
        } else if (this.type === 'bow') {
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#f3f4f6'; // 화살 레스트
            ctx.fillRect(-GRID_SIZE * 0.7, -1, GRID_SIZE * 1.2, 2);
            ctx.strokeRect(-GRID_SIZE * 0.7, -1, GRID_SIZE * 1.2, 2);
            ctx.fillStyle = '#e5e7eb'; // 화살촉 부분 장식
            ctx.beginPath(); ctx.moveTo(GRID_SIZE * 0.5, 0); ctx.lineTo(GRID_SIZE * 0.3, -3); ctx.lineTo(GRID_SIZE * 0.3, 3); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#d1d5db'; // 활 끝 장식
            ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.6, -1); ctx.lineTo(-GRID_SIZE * 0.7, -4); ctx.lineTo(-GRID_SIZE * 0.5, -1); ctx.closePath(); ctx.fill()
            ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.6, 1); ctx.lineTo(-GRID_SIZE * 0.7, 4); ctx.lineTo(-GRID_SIZE * 0.5, 1); ctx.closePath(); ctx.fill()
            ctx.strokeStyle = 'black'; ctx.lineWidth = 6 / scale; ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.8, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke(); // 활대 (검정)
            ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 4 / scale; ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.8, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke(); // 활대 (갈색)
            ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1.5 / scale; ctx.beginPath(); // 활시위
            const arcRadius = GRID_SIZE * 0.8, arcAngle = Math.PI / 2.2;
            ctx.moveTo(Math.cos(-arcAngle) * arcRadius, Math.sin(-arcAngle) * arcRadius);
            ctx.lineTo(-GRID_SIZE * 0.4, 0); // 시위 중간점
            ctx.lineTo(Math.cos(arcAngle) * arcRadius, Math.sin(arcAngle) * arcRadius); ctx.stroke();
        } else if (this.type === 'dual_swords') {
            const drawCurvedSword = (rotation) => {
                ctx.save();
                ctx.rotate(rotation);
                ctx.fillStyle = '#6b7280'; // 손잡이
                ctx.fillRect(-GRID_SIZE * 0.1, GRID_SIZE * 0.3, GRID_SIZE * 0.2, GRID_SIZE * 0.3);
                ctx.strokeRect(-GRID_SIZE * 0.1, GRID_SIZE * 0.3, GRID_SIZE * 0.2, GRID_SIZE * 0.3);
                ctx.beginPath(); // 손잡이 가드
                ctx.moveTo(-GRID_SIZE * 0.3, GRID_SIZE * 0.3); ctx.lineTo(GRID_SIZE * 0.3, GRID_SIZE * 0.3);
                ctx.lineTo(GRID_SIZE * 0.3, GRID_SIZE * 0.2); ctx.lineTo(-GRID_SIZE * 0.3, GRID_SIZE * 0.2);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                const bladeGradient = ctx.createLinearGradient(0, -GRID_SIZE, 0, 0); // 칼날 그라데이션
                bladeGradient.addColorStop(0, '#f3f4f6'); bladeGradient.addColorStop(0.5, '#9ca3af'); bladeGradient.addColorStop(1, '#d1d5db');
                ctx.fillStyle = bladeGradient;
                ctx.beginPath(); // 칼날 모양 (곡선)
                ctx.moveTo(0, GRID_SIZE * 0.2);
                ctx.quadraticCurveTo(GRID_SIZE * 0.5, -GRID_SIZE * 0.4, 0, -GRID_SIZE * 0.9); // 곡선 제어점
                ctx.quadraticCurveTo(-GRID_SIZE * 0.1, -GRID_SIZE * 0.4, 0, GRID_SIZE * 0.2);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.restore();
            };
            drawCurvedSword(-Math.PI / 4); // 왼쪽 검
            drawCurvedSword(Math.PI / 4); // 오른쪽 검
        } else if (this.type === 'fire_staff') {
            this.drawStaff(ctx, scale);
        } else if (this.type === 'lightning') {
            this.drawLightning(ctx, 1.0, Math.PI / 4);
        } else if (this.type === 'magic_spear') {
            this.drawMagicSpear(ctx, 0.8, -Math.PI / 8);
        } else if (this.type === 'boomerang') {
            this.drawBoomerang(ctx, 1.0, -Math.PI / 6);
        } else if (this.type === 'poison_potion') {
            this.drawPoisonPotion(ctx, scale);
        } else if (this.type === 'magic_dagger') {
            ctx.rotate(Math.PI / 4);
            drawMagicDaggerIcon(ctx);
        } else if (this.type === 'axe') {
            ctx.rotate(Math.PI / 4);
            drawAxeIcon(ctx);
        } else if (this.type === 'ice_diamond') {
            drawIceDiamondIcon(ctx);
        } else if (this.type === 'hadoken') {
            ctx.rotate(Math.PI / 4);
            const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, GRID_SIZE * 1.2); // 방사형 그라데이션
            grad.addColorStop(0, '#bfdbfe'); grad.addColorStop(0.6, '#3b82f6'); grad.addColorStop(1, '#1e40af');
            ctx.fillStyle = grad;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1.5 / scale;
            ctx.beginPath(); // 장풍 모양
            ctx.arc(-GRID_SIZE * 0.2, 0, GRID_SIZE * 0.6, Math.PI / 2, -Math.PI / 2, false); // 반원
            ctx.lineTo(GRID_SIZE * 0.8, 0); // 뾰족한 부분
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'shuriken') {
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#9ca3af'; // 표창 색
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2 / scale;
            ctx.beginPath(); // 표창 모양 (별 모양)
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
            ctx.fillStyle = '#d1d5db'; // 중앙 원
            ctx.beginPath();
            ctx.arc(0, 0, GRID_SIZE * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'crown') {
            ctx.fillStyle = '#facc15'; // 왕관 색
            ctx.beginPath(); // 왕관 모양
            ctx.moveTo(-GRID_SIZE * 0.6, -GRID_SIZE * 0.25); ctx.lineTo(-GRID_SIZE * 0.6, GRID_SIZE * 0.35);
            ctx.lineTo(GRID_SIZE * 0.6, GRID_SIZE * 0.35); ctx.lineTo(GRID_SIZE * 0.6, -GRID_SIZE * 0.25);
            ctx.lineTo(GRID_SIZE * 0.3, 0); ctx.lineTo(0, -GRID_SIZE * 0.25);
            ctx.lineTo(-GRID_SIZE * 0.3, 0); ctx.closePath();
            ctx.fill(); ctx.stroke();
        }
        ctx.restore();
    }

    /**
     * [MODIFIED] Draws the weapon when it's equipped by a unit. Includes special attack glow.
     * @param {CanvasRenderingContext2D} ctx
     * @param {Unit} unit
     */
    drawEquipped(ctx, unit) {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        // 유닛 크기 스케일 (각성 효과 등 고려)
        const unitScale = 1 + (unit.awakeningEffect?.stacks || 0) * 0.2;
        const levelScale = 1 + (unit.level - 1) * 0.08;
        const totalUnitScale = unitScale * levelScale;

        // 무기 그리기 전에 저장 (좌표계 변환 복원용)
        // ctx.save()는 unit.js의 draw 메서드에서 이미 호출되었으므로 여기서는 불필요.
        // 유닛 위치(0,0)를 기준으로 그림.

        // [🌟 NEW] 특수 공격 준비 시 빛나는 이펙트 (Unit.js에서 그림)
        // Weapon 클래스에서는 그리지 않음. Unit 클래스에서 무기 그리기 직전에 그림.

        // 무기 회전 및 위치 조정 (기존 로직 유지)
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

        // 번개와 얼음 다이아는 회전 적용 안 함
        if (this.type !== 'lightning' && this.type !== 'ice_diamond') {
             ctx.rotate(rotation);
        }


        // --- 무기별 그리기 로직 (기존 로직 유지) ---
         if (this.type === 'sword') {
            ctx.translate(GRID_SIZE * 0.5, 0); // 위치 조정
            ctx.rotate(Math.PI / 4); // 각도 조정

            const bladeGradient = ctx.createLinearGradient(0, -GRID_SIZE, 0, 0);
            bladeGradient.addColorStop(0, '#f3f4f6'); bladeGradient.addColorStop(1, '#9ca3af');
            ctx.fillStyle = bladeGradient;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1 / totalUnitScale; // 스케일 역보정

            ctx.beginPath(); // 칼날
            ctx.moveTo(-2, GRID_SIZE * 0.3); ctx.lineTo(-2, -GRID_SIZE * 1.0);
            ctx.lineTo(0, -GRID_SIZE * 1.2); ctx.lineTo(2, -GRID_SIZE * 1.0);
            ctx.lineTo(2, GRID_SIZE * 0.3);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#374151'; // 손잡이 가드
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.2, GRID_SIZE * 0.3); ctx.lineTo(GRID_SIZE * 0.2, GRID_SIZE * 0.3);
            ctx.lineTo(GRID_SIZE * 0.25, GRID_SIZE * 0.3 + 3); ctx.lineTo(-GRID_SIZE * 0.25, GRID_SIZE * 0.3 + 3);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#1f2937'; // 손잡이
            ctx.fillRect(-1.5, GRID_SIZE * 0.3 + 3, 3, GRID_SIZE * 0.3);
            ctx.strokeRect(-1.5, GRID_SIZE * 0.3 + 3, 3, GRID_SIZE * 0.3);
        } else if (this.type === 'magic_dagger') {
            ctx.translate(-GRID_SIZE * 0.4, 0); // 위치 조정
            ctx.scale(0.7, 0.7); // 크기 조정
            ctx.rotate(-Math.PI / 8); // 각도 조정
            drawMagicDaggerIcon(ctx); // 아이콘 그리기 함수 호출
        } else if (this.type === 'axe') {
            ctx.translate(GRID_SIZE * 0.8, -GRID_SIZE * 0.7); // 위치 조정
            ctx.rotate(Math.PI / 4); // 각도 조정
            ctx.scale(0.8, 0.8); // 크기 조정
            drawAxeIcon(ctx); // 아이콘 그리기 함수 호출
        } else if (this.type === 'bow') {
            ctx.translate(GRID_SIZE * 0.4, 0); // 위치 조정
            ctx.rotate(-Math.PI / 4); // 각도 조정
            const bowScale = 0.56;
            ctx.scale(bowScale, bowScale); // 크기 조정
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1 / (totalUnitScale * bowScale); // 스케일 역보정

            ctx.fillStyle = '#f3f4f6'; // 화살 레스트
            ctx.fillRect(-GRID_SIZE * 0.7, -1, GRID_SIZE * 1.2, 2);
            ctx.strokeRect(-GRID_SIZE * 0.7, -1, GRID_SIZE * 1.2, 2);
            ctx.fillStyle = '#e5e7eb'; // 화살촉 부분 장식
            ctx.beginPath(); ctx.moveTo(GRID_SIZE * 0.5, 0); ctx.lineTo(GRID_SIZE * 0.3, -3); ctx.lineTo(GRID_SIZE * 0.3, 3); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#d1d5db'; // 활 끝 장식
            ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.6, -1); ctx.lineTo(-GRID_SIZE * 0.7, -4); ctx.lineTo(-GRID_SIZE * 0.5, -1); ctx.closePath(); ctx.fill()
            ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.6, 1); ctx.lineTo(-GRID_SIZE * 0.7, 4); ctx.lineTo(-GRID_SIZE * 0.5, 1); ctx.closePath(); ctx.fill()
            // 활대 그리기 (검정 -> 갈색 순서로 덮어쓰기)
            ctx.save();
            ctx.strokeStyle = 'black'; ctx.lineWidth = 6 / bowScale; ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.8, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke();
            ctx.restore();
            ctx.save();
            ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 4 / bowScale; ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.8, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke();
            ctx.restore();

            // 활시위 그리기 (애니메이션 포함)
            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 1.5 / bowScale;
            ctx.beginPath();
            const arcRadius = GRID_SIZE * 0.8, arcAngle = Math.PI / 2.2;
            const bowstringY1 = Math.sin(-arcAngle) * arcRadius;
            const bowstringY2 = Math.sin(arcAngle) * arcRadius;
            const bowstringX = Math.cos(arcAngle) * arcRadius;
            let pullBack = -GRID_SIZE * 0.4;
            if (unit.attackAnimationTimer > 0) { // 공격 애니메이션 중이면
                const pullProgress = Math.sin((15 - unit.attackAnimationTimer) / 15 * Math.PI);
                pullBack -= pullProgress * GRID_SIZE * 0.5; // 시위를 더 당김
            }
            ctx.moveTo(bowstringX, bowstringY1);
            ctx.lineTo(pullBack, 0); // 당겨진 시위 중간점
            ctx.lineTo(bowstringX, bowstringY2);
            ctx.stroke();
        } else if (this.type === 'dual_swords') {
            const drawEquippedCurvedSword = (isRightHand) => {
                ctx.save();
                const yOffset = isRightHand ? GRID_SIZE * 0.6 : -GRID_SIZE * 0.6; // 좌우 위치
                const swordRotation = isRightHand ? Math.PI / 8 : -Math.PI / 8; // 좌우 각도
                ctx.translate(GRID_SIZE * 0.1, yOffset);
                ctx.rotate(swordRotation);
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1 / totalUnitScale; // 스케일 역보정
                ctx.fillStyle = '#374151'; // 손잡이
                ctx.fillRect(-GRID_SIZE * 0.05, 0, GRID_SIZE * 0.1, GRID_SIZE * 0.2);
                ctx.strokeRect(-GRID_SIZE * 0.05, 0, GRID_SIZE * 0.1, GRID_SIZE * 0.2);
                ctx.beginPath(); // 손잡이 가드
                ctx.moveTo(-GRID_SIZE * 0.2, 0); ctx.lineTo(GRID_SIZE * 0.2, 0);
                ctx.lineTo(GRID_SIZE * 0.2, -GRID_SIZE * 0.05); ctx.lineTo(-GRID_SIZE * 0.2, -GRID_SIZE * 0.05);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                const bladeGradient = ctx.createLinearGradient(0, -GRID_SIZE*0.8, 0, 0); // 칼날 그라데이션
                bladeGradient.addColorStop(0, '#f3f4f6'); bladeGradient.addColorStop(0.5, '#9ca3af'); bladeGradient.addColorStop(1, '#4b5563');
                ctx.fillStyle = bladeGradient;
                ctx.beginPath(); // 칼날 모양 (곡선)
                ctx.moveTo(0, -GRID_SIZE * 0.05);
                ctx.quadraticCurveTo(GRID_SIZE * 0.4, -GRID_SIZE * 0.3, 0, -GRID_SIZE * 0.8);
                ctx.quadraticCurveTo(-GRID_SIZE * 0.1, -GRID_SIZE * 0.3, 0, -GRID_SIZE * 0.05);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.restore();
            };
            drawEquippedCurvedSword(true); // 오른쪽 검
            drawEquippedCurvedSword(false); // 왼쪽 검
        } else if (this.type === 'fire_staff') {
            this.drawStaff(ctx, 0.8); // 크기 조정
        } else if (this.type === 'lightning') {
            // 번개는 유닛 주위를 도는 형태로 그림
            const revolutionAngle = gameManager.animationFrameCounter * 0.05;
            const orbitRadius = GRID_SIZE * 0.8;
            const weaponX = Math.cos(revolutionAngle) * orbitRadius;
            const weaponY = Math.sin(revolutionAngle) * orbitRadius;
            ctx.save();
            ctx.translate(weaponX, weaponY); // 궤도 위치로 이동
            this.drawLightning(ctx, 0.48, 0); // 크기 조정, 회전 없음
            ctx.restore();
        } else if (this.type === 'ice_diamond') {
            ctx.translate(GRID_SIZE * 0.6, 0); // 위치 조정
            drawIceDiamondIcon(ctx, 0.6); // 장착 시 크기 조정

            // 충전된 오브 그리기
            for (let i = 0; i < unit.iceDiamondCharges; i++) {
                const angle = (gameManager.animationFrameCounter * 0.02) + (i * (Math.PI * 2 / 5)); // 회전 각도 계산
                const orbitRadius = GRID_SIZE * 1.2; // 궤도 반지름
                const orbX = Math.cos(angle) * orbitRadius;
                const orbY = Math.sin(angle) * orbitRadius;
                ctx.save();
                ctx.translate(orbX, orbY); // 궤도 위치로 이동
                drawIceDiamondIcon(ctx, 0.5); // 오브 크기 조정
                ctx.restore();
            }
        } else if (this.type === 'magic_spear') {
            ctx.translate(GRID_SIZE * 0.2, GRID_SIZE * 0.4); // 위치 조정
             // 창을 반대 방향으로 들도록 회전 추가 (Math.PI)
            this.drawMagicSpear(ctx, 0.5, -Math.PI / 8 + Math.PI); // 크기 및 각도 조정
        } else if (this.type === 'boomerang') {
            ctx.translate(0, -GRID_SIZE * 0.5); // 위치 조정 (등 뒤)
            this.drawBoomerang(ctx, 0.5); // 크기 조정
        } else if (this.type === 'poison_potion') {
            ctx.translate(0, -GRID_SIZE * 0.5); // 위치 조정 (등 뒤)
            this.drawPoisonPotion(ctx, 0.3); // 크기 조정
        } else if (this.type === 'hadoken') {
            ctx.translate(GRID_SIZE * 0.5, 0); // 위치 조정 (오른손)
            const hadokenScale = 0.7;
            ctx.scale(hadokenScale, hadokenScale); // 크기 조정
            const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, GRID_SIZE * 1.2); // 방사형 그라데이션
            grad.addColorStop(0, '#bfdbfe'); grad.addColorStop(0.6, '#3b82f6'); grad.addColorStop(1, '#1e40af');
            ctx.fillStyle = grad;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1.5 / (totalUnitScale * hadokenScale); // 스케일 역보정
            ctx.beginPath(); // 장풍 모양 (발사 직전 형태)
            ctx.arc(GRID_SIZE * 0.2, 0, GRID_SIZE * 0.6, -Math.PI / 2, Math.PI / 2, false); // 반원
            ctx.lineTo(-GRID_SIZE * 0.8, 0); // 뒤쪽 꼬리
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'shuriken') {
            ctx.translate(GRID_SIZE * 0.4, GRID_SIZE * 0.3); // 위치 조정 (오른쪽 허리춤)
            const shurikenScale = 0.5;
            ctx.scale(shurikenScale, shurikenScale); // 크기 조정
            ctx.rotate(gameManager.animationFrameCounter * 0.1); // 회전 애니메이션
            ctx.fillStyle = '#4a5568'; // 표창 색
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2 / (totalUnitScale * shurikenScale); // 스케일 역보정
            ctx.beginPath(); // 표창 모양
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
        }

        // ctx.restore()는 unit.js의 draw 메서드에서 호출됨.
    }
}

// ... (Particle, createPhysicalHitEffect, createFireballHitEffect, Projectile, Effect, MagicDaggerDashEffect, AreaEffect 클래스는 그대로 유지) ...
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

        // 속도 설정
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
        else this.speed = 6; // 기본값 (화살 등)

        // 데미지 계산 (일반/스킬 분리)
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
                this.damage = 15; // 고정 데미지
                break;
            case 'bouncing_sword':
                this.damage = 20; // 고정 데미지
                break;
            case 'boomerang_projectile':
                this.damage = 0; // 끌어당기기만 함
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
            default: // 화살, 장풍 등
                this.damage = baseNormalDamage;
                break;
        }

        this.knockback = (type === 'hadoken') ? gameManager.hadokenKnockback : 0; // 넉백 설정
        const inaccuracy = (type === 'shuriken' || type === 'lightning_bolt' || type === 'sword_wave') ? 0 : GRID_SIZE * 0.8; // 명중률 오차

        // 목표 위치 계산 (표창 스킬 예외 처리)
        let targetX, targetY;
        if (type === 'returning_shuriken') { // 방향 각도 사용
            targetX = this.pixelX + Math.cos(options.angle);
            targetY = this.pixelY + Math.sin(options.angle);
        } else { // 목표 대상 + 오차
            targetX = target.pixelX + (gameManager.random() - 0.5) * inaccuracy;
            targetY = target.pixelY + (gameManager.random() - 0.5) * inaccuracy;
        }

        // 초기 각도 설정
        this.angle = options.angle !== undefined ? options.angle : Math.atan2(targetY - this.pixelY, targetX - this.pixelX);
        this.destroyed = false; // 파괴 여부 플래그
        this.trail = []; // 궤적 배열 (이펙트용)
        this.rotationAngle = 0; // 회전 각도 (표창, 부메랑용)

        // 이미 맞은 대상 Set (관통/연쇄 공격용)
        this.hitTargets = options.hitTargets || new Set();
        this.piercing = (type === 'sword_wave'); // 검기 관통 여부
        if (type === 'lightning_bolt' && options.initialTarget) { // 번개 연쇄 초기 대상 추가
            this.hitTargets.add(options.initialTarget);
        }
    }


    update() {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        // --- 표창 스킬 (returning_shuriken) 업데이트 로직 ---
        if (this.type === 'returning_shuriken') {
            this.rotationAngle += this.lingerRotationSpeed * gameManager.gameSpeed; // 회전

            if (this.state === 'MOVING_OUT') { // 나아가는 중
                const moveX = Math.cos(this.angle) * this.speed * gameManager.gameSpeed;
                const moveY = Math.sin(this.angle) * this.speed * gameManager.gameSpeed;
                this.pixelX += moveX;
                this.pixelY += moveY;
                this.distanceTraveled += Math.hypot(moveX, moveY); // 이동 거리 누적

                // 충돌 처리
                for (const unit of gameManager.units) {
                    if (unit.team !== this.owner.team && !this.hitTargets.has(unit) && Math.hypot(this.pixelX - unit.pixelX, this.pixelY - unit.pixelY) < GRID_SIZE / 2) {
                        unit.takeDamage(this.damage, {}, this.owner);
                        this.hitTargets.add(unit); // 맞춘 대상 추가
                    }
                }

                // 최대 사거리 도달 시 상태 변경
                if (this.distanceTraveled >= this.maxDistance) {
                    this.state = 'LINGERING'; // 제자리 회전 상태로
                }
            } else if (this.state === 'LINGERING') { // 제자리 회전 중
                this.lingerDuration -= gameManager.gameSpeed; // 지속 시간 감소
                this.damageCooldown -= gameManager.gameSpeed; // 지속 데미지 쿨타임 감소

                // 지속 데미지 적용
                if (this.damageCooldown <= 0) {
                    for (const unit of gameManager.units) {
                        if (unit.team !== this.owner.team && Math.hypot(this.pixelX - unit.pixelX, this.pixelY - unit.pixelY) < GRID_SIZE * 2) { // 주변 범위
                            unit.takeDamage(this.damage * 0.15, {}, this.owner); // 약한 데미지
                        }
                    }
                    this.damageCooldown = this.damageInterval; // 쿨타임 초기화
                }

                // 지속 시간 종료 시 상태 변경
                if (this.lingerDuration <= 0) {
                    this.state = 'RETURNING'; // 돌아오는 상태로
                }
            } else if (this.state === 'RETURNING') { // 돌아오는 중
                // 주인이 없거나 죽었으면 소멸
                if (!this.owner || this.owner.hp <= 0) {
                    this.destroyed = true;
                    return;
                }
                // 주인 방향으로 이동
                const dx = this.owner.pixelX - this.pixelX;
                const dy = this.owner.pixelY - this.pixelY;
                const dist = Math.hypot(dx, dy);

                // 주인에게 도달 시 소멸
                if (dist < this.speed * gameManager.gameSpeed) {
                    this.destroyed = true;
                    return;
                }

                // 이동 각도 계산 및 이동
                const returnAngle = Math.atan2(dy, dx);
                this.pixelX += Math.cos(returnAngle) * this.speed * gameManager.gameSpeed;
                this.pixelY += Math.sin(returnAngle) * this.speed * gameManager.gameSpeed;

                // 돌아오는 경로 충돌 처리
                for (const unit of gameManager.units) {
                    // 돌아올 때 아직 안 맞은 적에게만 데미지
                    if (unit.team !== this.owner.team && !this.alreadyDamagedOnReturn.has(unit) && Math.hypot(this.pixelX - unit.pixelX, this.pixelY - unit.pixelY) < GRID_SIZE / 2) {
                        unit.takeDamage(this.damage, {}, this.owner);
                        this.alreadyDamagedOnReturn.add(unit); // 돌아올 때 맞춘 대상 추가
                    }
                }
            }
            return; // 표창 스킬 업데이트 종료
        }

        // --- 다른 투사체 업데이트 로직 ---

        // 유도 기능 (얼음 다이아, 부메랑)
        if (this.type === 'ice_diamond_projectile' || this.type === 'boomerang_projectile') {
            if (this.target && this.target.hp > 0) { // 목표가 살아있으면
                const targetAngle = Math.atan2(this.target.pixelY - this.pixelY, this.target.pixelX - this.pixelX); // 목표 방향 각도
                let angleDiff = targetAngle - this.angle; // 현재 각도와의 차이

                // 각도 차이 정규화 (-PI ~ PI)
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

                const turnSpeed = 0.03; // 회전 속도
                // 각도 차이가 회전 속도보다 크면 회전
                if (Math.abs(angleDiff) > turnSpeed * gameManager.gameSpeed) {
                    this.angle += Math.sign(angleDiff) * turnSpeed * gameManager.gameSpeed;
                } else { // 작으면 목표 각도로 바로 설정
                    this.angle = targetAngle;
                }
            }
        }

        // 궤적 추가 (특정 투사체만)
        if (['hadoken', 'lightning_bolt', 'magic_spear', 'ice_diamond_projectile', 'fireball_projectile', 'mini_fireball_projectile', 'black_sphere_projectile'].some(t => this.type.startsWith(t))) {
            this.trail.push({x: this.pixelX, y: this.pixelY});
            if (this.trail.length > 10) this.trail.shift(); // 최대 10개 유지
        }
        // 회전 애니메이션 (표창, 부메랑, 쌍검 투사체)
        if (this.type.includes('shuriken') || this.type.includes('boomerang') || this.type.includes('bouncing_sword')) {
            this.rotationAngle += 0.4 * gameManager.gameSpeed;
        }

        // 얼음 다이아 파티클 효과
        if (this.type === 'ice_diamond_projectile' && gameManager.random() > 0.4) {
            gameManager.addParticle({
                x: this.pixelX, y: this.pixelY,
                vx: (gameManager.random() - 0.5) * 1, vy: (gameManager.random() - 0.5) * 1,
                life: 0.6, color: '#3b82f6', size: gameManager.random() * 2 + 1,
            });
        }

        // 다음 위치 계산
        const nextX = this.pixelX + Math.cos(this.angle) * gameManager.gameSpeed * this.speed;
        const nextY = this.pixelY + Math.sin(this.angle) * gameManager.gameSpeed * this.speed;
        const gridX = Math.floor(nextX / GRID_SIZE);
        const gridY = Math.floor(nextY / GRID_SIZE);

        // 벽 충돌 처리
        if (gridY >= 0 && gridY < gameManager.ROWS && gridX >= 0 && gridX < gameManager.COLS) {
            const tile = gameManager.map[gridY][gridX];
            const isCollidableWall = tile.type === 'WALL' || tile.type === 'CRACKED_WALL';
            // 마법창 특수 공격, 검기는 벽 통과
            if (this.type !== 'magic_spear_special' && this.type !== 'sword_wave' && isCollidableWall) {
                if (tile.type === 'CRACKED_WALL') { // 부서지는 벽이면 파괴
                    gameManager.damageTile(gridX, gridY, 999);
                }
                this.destroyed = true; // 투사체 소멸
                // [🌟 MODIFIED] 화염구 벽 충돌 시 폭발 이펙트 추가
                if (this.type === 'fireball_projectile' || this.type === 'mini_fireball_projectile') {
                    createFireballHitEffect(gameManager, this.pixelX, this.pixelY); // 현재 위치에서 폭발
                }
                return; // 업데이트 종료
            }
        }
        // 이동
        this.pixelX = nextX;
        this.pixelY = nextY;
    }


    draw(ctx) {
        // --- 표창 그리기 ---
        if (this.type === 'shuriken' || this.type === 'returning_shuriken') {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.rotationAngle); // 회전 적용
            const scale = 0.8; // 크기 조정
            ctx.scale(scale, scale);
            ctx.fillStyle = '#9ca3af'; // 표창 색
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2 / scale; // 스케일 역보정

            ctx.beginPath(); // 표창 모양
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

            ctx.fillStyle = '#d1d5db'; // 중앙 원
            ctx.beginPath();
            ctx.arc(0, 0, GRID_SIZE * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
            return; // 표창 그리기 종료
        }

        // --- 화살 그리기 ---
        if (this.type === 'arrow') {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.angle); // 각도 적용
            ctx.scale(1.2, 1.2); // 크기 조정

            ctx.fillStyle = '#FFFFFF'; // 흰색
            ctx.strokeStyle = '#000000'; // 검정 테두리
            ctx.lineWidth = 1;

            // 화살 몸통
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.7, 0); // 뒤쪽 끝
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
            ctx.lineTo(GRID_SIZE * 0.9, 0); // 뾰족한 끝
            ctx.lineTo(GRID_SIZE * 0.6, 2.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 깃털
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.7, 0);
            ctx.lineTo(-GRID_SIZE * 0.8, -3); // 위쪽 깃털
            ctx.moveTo(-GRID_SIZE * 0.7, 0);
            ctx.lineTo(-GRID_SIZE * 0.8, 3); // 아래쪽 깃털
            ctx.stroke();

            ctx.restore();
        }
        // --- 검기 그리기 ---
        else if (this.type === 'sword_wave') {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.angle - Math.PI / 2); // 날아가는 방향과 수직으로

            ctx.strokeStyle = '#ef4444'; // 빨간색
            ctx.lineWidth = 4;
            ctx.shadowColor = 'rgba(255, 0, 0, 0.7)'; // 붉은 그림자
            ctx.shadowBlur = 10;

            ctx.beginPath(); // 반원 모양
            ctx.arc(0, 0, GRID_SIZE * 0.7, 0, Math.PI, false);
            ctx.stroke();

            ctx.restore();
        }
        // --- 쌍검 투사체 그리기 ---
        else if (this.type === 'bouncing_sword') {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.rotationAngle); // 회전 적용
            ctx.scale(0.72, 0.72); // 크기 조정

            ctx.fillStyle = '#6b7280'; // 손잡이 색
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1.5;

            // 손잡이 및 가드
            ctx.fillRect(-GRID_SIZE * 0.1, GRID_SIZE * 0.3, GRID_SIZE * 0.2, GRID_SIZE * 0.3);
            ctx.strokeRect(-GRID_SIZE * 0.1, GRID_SIZE * 0.3, GRID_SIZE * 0.2, GRID_SIZE * 0.3);
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.3, GRID_SIZE * 0.3); ctx.lineTo(GRID_SIZE * 0.3, GRID_SIZE * 0.3);
            ctx.lineTo(GRID_SIZE * 0.3, GRID_SIZE * 0.2); ctx.lineTo(-GRID_SIZE * 0.3, GRID_SIZE * 0.2);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            // 칼날
            const bladeGradient = ctx.createLinearGradient(0, -GRID_SIZE, 0, 0);
            bladeGradient.addColorStop(0, '#f3f4f6'); bladeGradient.addColorStop(0.5, '#9ca3af'); bladeGradient.addColorStop(1, '#d1d5db');
            ctx.fillStyle = bladeGradient;
            ctx.beginPath();
            ctx.moveTo(0, GRID_SIZE * 0.2);
            ctx.quadraticCurveTo(GRID_SIZE * 0.5, -GRID_SIZE * 0.4, 0, -GRID_SIZE * 0.9);
            ctx.quadraticCurveTo(-GRID_SIZE * 0.1, -GRID_SIZE * 0.4, 0, GRID_SIZE * 0.2);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.restore();
        }
        // --- 장풍 그리기 ---
        else if (this.type === 'hadoken') {
            // 궤적 그리기
            for (let i = 0; i < this.trail.length; i++) {
                const pos = this.trail[i];
                const alpha = (i / this.trail.length) * 0.5; // 점점 투명하게
                ctx.fillStyle = `rgba(139, 92, 246, ${alpha})`; // 보라색 궤적
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, (GRID_SIZE / 2) * (i / this.trail.length), 0, Math.PI * 2); // 점점 작아짐
                ctx.fill();
            }
            // 본체 그리기
            ctx.fillStyle = '#c4b5fd'; // 밝은 보라
            ctx.beginPath();
            ctx.arc(this.pixelX, this.pixelY, GRID_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#8b5cf6'; // 진한 보라 (중심)
            ctx.beginPath();
            ctx.arc(this.pixelX, this.pixelY, GRID_SIZE / 3, 0, Math.PI * 2);
            ctx.fill();
        }
        // --- 번개 그리기 ---
        else if (this.type === 'lightning_bolt') {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.angle); // 각도 적용
            ctx.strokeStyle = '#fef08a'; // 노란색
            ctx.lineWidth = 3;
            ctx.beginPath(); // 지그재그 모양
            ctx.moveTo(-GRID_SIZE * 0.5, 0);
            for(let i = -GRID_SIZE * 0.5; i < GRID_SIZE * 0.5; i += 4) {
                ctx.lineTo(i, (this.gameManager.random() - 0.5) * 4); // 랜덤하게 위아래로 꺾임
            }
            ctx.lineTo(GRID_SIZE * 0.5, 0);
            ctx.stroke();
            ctx.restore();
        }
        // --- 마법창 그리기 ---
        else if (this.type.startsWith('magic_spear')) {
            const isSpecial = this.type === 'magic_spear_special';
            const mainColor = isSpecial ? '#a855f7' : '#111827'; // 스킬/일반 색 구분
            const trailColor = isSpecial ? 'rgba(192, 132, 252, 0.4)' : 'rgba(107, 114, 128, 0.4)';
            const spearLength = isSpecial ? GRID_SIZE * 1.2 : GRID_SIZE * 1.0;
            const spearWidth = isSpecial ? GRID_SIZE * 0.25 : GRID_SIZE * 0.2;

            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.angle); // 각도 적용

            // 궤적 그리기
            for (let i = 0; i < this.trail.length; i++) {
                const pos = this.trail[i];
                const alpha = (i / this.trail.length) * 0.3;
                // 궤적 위치를 현재 투사체 기준 상대 좌표로 변환
                const trailX = (pos.x - this.pixelX) * Math.cos(-this.angle) - (pos.y - this.pixelY) * Math.sin(-this.angle);
                const trailY = (pos.x - this.pixelX) * Math.sin(-this.angle) + (pos.y - this.pixelY) * Math.cos(-this.angle);
                ctx.fillStyle = trailColor.replace('0.4', alpha.toFixed(2)); // 투명도 적용
                ctx.beginPath();
                ctx.arc(trailX, trailY, (GRID_SIZE / 4) * (i / this.trail.length), 0, Math.PI * 2); // 점점 작아짐
                ctx.fill();
            }

            // 창 본체 그리기
            ctx.fillStyle = mainColor;
            ctx.beginPath(); // 삼각형 모양
            ctx.moveTo(spearLength, 0); // 창 끝
            ctx.lineTo(0, -spearWidth); // 왼쪽 뒤
            ctx.lineTo(0, spearWidth); // 오른쪽 뒤
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }
        // --- 부메랑 (특수 공격) 그리기 ---
        else if (this.type === 'boomerang_projectile') {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.rotationAngle); // 회전 적용
            this.owner.weapon.drawBoomerang(ctx, 0.6); // 크기 조정하여 그리기 함수 호출
            ctx.restore();
        }
        // --- 부메랑 (일반 공격) 그리기 ---
        else if (this.type === 'boomerang_normal_projectile') {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.rotationAngle); // 회전 적용
            this.owner.weapon.drawBoomerang(ctx, 0.3, 0, '#18181b'); // 작고 검은색으로 그리기
            ctx.restore();
        }
        // --- 얼음 다이아 (특수 공격) 그리기 ---
        else if (this.type === 'ice_diamond_projectile') {
            // 궤적 그리기
            for (let i = 0; i < this.trail.length; i++) {
                const pos = this.trail[i];
                const alpha = (i / this.trail.length) * 0.5;
                ctx.fillStyle = `rgba(165, 243, 252, ${alpha})`; // 하늘색 궤적
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, (GRID_SIZE / 1.67) * (i / this.trail.length), 0, Math.PI * 2); // 점점 작아짐
                ctx.fill();
            }
            // 본체 그리기
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.angle); // 각도 적용 (유도되므로)

            const size = GRID_SIZE * 0.6; // 크기 조정
            const grad = ctx.createLinearGradient(-size, -size, size, size); // 그라데이션
            grad.addColorStop(0, '#e0f2fe'); grad.addColorStop(0.5, '#7dd3fc'); grad.addColorStop(1, '#0ea5e9');
            ctx.fillStyle = grad;
            ctx.strokeStyle = '#0284c7'; // 진한 파랑 테두리
            ctx.lineWidth = 2;

            ctx.beginPath(); // 다이아몬드 모양
            ctx.moveTo(size * 0.8, 0);
            ctx.lineTo(0, -size * 0.6);
            ctx.lineTo(-size * 0.8, 0);
            ctx.lineTo(0, size * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        }
        // --- 얼음 다이아 (일반 공격) 그리기 ---
        else if (this.type === 'ice_bolt_projectile') {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.angle); // 각도 적용
            ctx.fillStyle = '#000000'; // 검정
            ctx.strokeStyle = '#FFFFFF'; // 흰색 테두리
            ctx.lineWidth = 1;
            ctx.beginPath(); // 작은 원
            ctx.arc(0, 0, GRID_SIZE / 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
        // --- 화염구 / 미니 화염구 그리기 ---
        else if (this.type === 'fireball_projectile' || this.type === 'mini_fireball_projectile') {
            const size = this.type === 'fireball_projectile' ? GRID_SIZE / 1.67 : GRID_SIZE / 4; // 크기 구분
            // 궤적 그리기
            for (let i = 0; i < this.trail.length; i++) {
                const pos = this.trail[i];
                const alpha = (i / this.trail.length) * 0.4;
                ctx.fillStyle = `rgba(255, 100, 0, ${alpha})`; // 주황색 궤적
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, size * (i / this.trail.length), 0, Math.PI * 2); // 점점 작아짐
                ctx.fill();
            }
            // 본체 그리기
            const grad = ctx.createRadialGradient(this.pixelX, this.pixelY, size * 0.2, this.pixelX, this.pixelY, size); // 방사형 그라데이션
            grad.addColorStop(0, '#ffff99'); grad.addColorStop(0.6, '#ff9900'); grad.addColorStop(1, '#ff4500');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(this.pixelX, this.pixelY, size, 0, Math.PI * 2); // 원
            ctx.fill();
        }
        // --- 불 지팡이 (일반 공격) 그리기 ---
        else if (this.type === 'black_sphere_projectile') {
            const size = GRID_SIZE / 3; // 크기
            // 궤적 그리기
            for (let i = 0; i < this.trail.length; i++) {
                const pos = this.trail[i];
                const alpha = (i / this.trail.length) * 0.2;
                ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`; // 검은색 궤적
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, size * (i / this.trail.length), 0, Math.PI * 2); // 점점 작아짐
                ctx.fill();
            }
            // 본체 그리기
            ctx.fillStyle = '#000000'; // 검정
            ctx.strokeStyle = '#4a5568'; // 회색 테두리
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.pixelX, this.pixelY, size, 0, Math.PI * 2); // 원
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
        this.duration = 20; // 기본 지속 시간
        this.angle = this.gameManager.random() * Math.PI * 2; // 랜덤 각도 (베기 효과용)

        // 타입별 초기 설정
        if (this.type === 'question_mark_effect') {
            this.duration = 60; // 물음표 효과 지속 시간
            this.particles = []; // 파티클 배열
            for (let i = 0; i < 20; i++) { // 파티클 생성
                this.particles.push({
                    x: this.x, y: this.y,
                    angle: this.gameManager.random() * Math.PI * 2, // 랜덤 방향
                    speed: this.gameManager.random() * 2 + 1, // 랜덤 속도
                    radius: this.gameManager.random() * 3 + 1, // 랜덤 크기
                    lifespan: 40, // 파티클 수명
                });
            }
        } else if (this.type === 'level_up') {
            this.duration = 40; // 레벨업 효과 지속 시간
        } else if (this.type === 'axe_spin_effect') {
             this.duration = 20; // 도끼 회전 효과 지속 시간 (기존 유지)
        }
    }
    update() {
        const gameManager = this.gameManager;
        if (!gameManager) return;
        this.duration -= gameManager.gameSpeed; // 지속 시간 감소

        // 물음표 효과 파티클 업데이트
        if (this.type === 'question_mark_effect') {
            this.particles.forEach(p => {
                p.x += Math.cos(p.angle) * p.speed * gameManager.gameSpeed;
                p.y += Math.sin(p.angle) * p.speed * gameManager.gameSpeed;
                p.lifespan -= gameManager.gameSpeed;
            });
            this.particles = this.particles.filter(p => p.lifespan > 0); // 수명 다한 파티클 제거
        }
    }
    draw(ctx) {
        const opacity = Math.max(0, this.duration / 20); // 기본 투명도 계산

        // 베기 효과 (검, 쌍검 등)
        if (this.type === 'slash' || this.type === 'dual_sword_slash') {
            ctx.save();
            ctx.translate(this.target.pixelX, this.target.pixelY); // 대상 위치로 이동
            ctx.rotate(this.angle); // 랜덤 각도 적용
            ctx.strokeStyle = `rgba(220, 38, 38, ${opacity})`; // 빨간색, 투명도 적용
            ctx.lineWidth = this.type === 'slash' ? 3 : 2; // 검/쌍검 두께 구분
            const arcSize = this.type === 'slash' ? GRID_SIZE : GRID_SIZE * 0.7; // 크기 구분
            ctx.beginPath(); // 호(arc) 모양
            ctx.arc(0, 0, arcSize, -0.5, 0.5); // 짧은 호
            ctx.stroke();
            ctx.restore();
        }
        // 번개 연쇄 효과
        else if (this.type === 'chain_lightning') {
            ctx.strokeStyle = `rgba(254, 240, 138, ${opacity})`; // 노란색, 투명도 적용
            ctx.lineWidth = 2;
            ctx.beginPath(); // 직선
            ctx.moveTo(this.x, this.y); // 시작점
            ctx.lineTo(this.target.pixelX, this.target.pixelY); // 끝점 (대상 유닛)
            ctx.stroke();
        }
        // 물음표 효과
        else if (this.type === 'question_mark_effect') {
            // 파티클 그리기
            this.particles.forEach(p => {
                // 파티클 수명과 효과 전체 수명에 따른 투명도 조절
                ctx.globalAlpha = Math.max(0, (p.lifespan / 40) * (this.duration / 60));
                ctx.fillStyle = '#facc15'; // 노란색
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); // 원
                ctx.fill();
            });
            ctx.globalAlpha = 1.0; // 투명도 복원
        }
        // 도끼 회전 효과
        else if (this.type === 'axe_spin_effect') {
            const progress = 1 - (this.duration / 20); // 진행률 (0 -> 1)
            const radius = GRID_SIZE * 3.5 * progress; // 점점 커지는 반지름
            ctx.save();
            ctx.translate(this.x, this.y); // 효과 발생 위치
            ctx.strokeStyle = `rgba(220, 38, 38, ${opacity})`; // 빨간색, 투명도 적용
            ctx.lineWidth = 4;
            ctx.beginPath(); // 원
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        // 레벨업 효과
        else if (this.type === 'level_up') {
            const initialDuration = 40;
            const yOffset = -GRID_SIZE - (initialDuration - this.duration); // 위로 올라가는 효과
             // 서서히 나타났다 사라지는 투명도 (처음 절반 동안 나타나고, 나머지 절반 동안 사라짐)
            const fadeDuration = initialDuration / 2;
            const opacity = this.duration > fadeDuration
                            ? (initialDuration - this.duration) / fadeDuration // Fade in
                            : this.duration / fadeDuration; // Fade out
            ctx.save();
            ctx.translate(this.target.pixelX, this.target.pixelY + yOffset); // 대상 유닛 위쪽
            ctx.scale(1.05, 1.05); // 약간 확대
            ctx.fillStyle = `rgba(255, 215, 0, ${opacity})`; // 금색, 투명도 적용
            ctx.font = 'bold 12px Arial'; // 폰트 설정
            ctx.textAlign = 'center';
            ctx.fillText('LEVEL UP!', 0, 0); // 텍스트 그리기
            ctx.restore();
        }
    }
}


// MagicDaggerDashEffect class
export class MagicDaggerDashEffect {
    constructor(gameManager, startPos, endPos) {
        this.gameManager = gameManager;
        this.startPos = startPos; // 시작 위치
        this.endPos = endPos; // 끝 위치
        this.life = 20; // 지속 시간 (프레임)
        this.initialLife = 20;
    }

    isAlive() {
        return this.life > 0;
    }

    update() {
        this.life--; // 수명 감소
        // 2프레임마다 파티클 생성
        if (this.life > 0 && this.life % 2 === 0) {
            const progress = 1 - (this.life / this.initialLife); // 진행률 (0 -> 1)
            // 현재 진행률에 따른 파티클 위치 계산
            const particleX = this.startPos.x + (this.endPos.x - this.startPos.x) * progress;
            const particleY = this.startPos.y + (this.endPos.y - this.startPos.y) * progress;

            // 파티클 생성 요청
            this.gameManager.addParticle({
                x: particleX,
                y: particleY,
                vx: (this.gameManager.random() - 0.5) * 2, // 랜덤 방향 속도
                vy: (this.gameManager.random() - 0.5) * 2,
                life: 0.5, // 파티클 수명
                color: '#ffffff', // 흰색
                size: this.gameManager.random() * 2 + 1, // 랜덤 크기
            });
        }
    }

    draw(ctx) {
        const opacity = Math.max(0, this.life / this.initialLife); // 투명도 계산

        ctx.save();
        ctx.globalAlpha = opacity; // 투명도 적용
        ctx.strokeStyle = '#ffffff'; // 흰색 선
        ctx.lineWidth = 4;
        ctx.shadowColor = '#d8b4fe'; // 연보라 그림자
        ctx.shadowBlur = 10;

        ctx.beginPath(); // 직선 그리기
        ctx.moveTo(this.startPos.x, this.startPos.y);
        ctx.lineTo(this.endPos.x, this.endPos.y);
        ctx.stroke();

        ctx.restore();
    }
}

// AreaEffect class
export class AreaEffect {
    constructor(gameManager, x, y, type, options = {}) {
        this.gameManager = gameManager;
        this.pixelX = x; this.pixelY = y; this.type = type;
        this.duration = 30; // 기본 지속 시간
        this.maxRadius = GRID_SIZE * 2.5; // 최대 반지름
        this.currentRadius = 0; // 현재 반지름
        this.damage = options.damage || 0; // 데미지
        this.ownerTeam = options.ownerTeam || null; // 시전자 팀
        this.particles = []; // 파티클 배열
        this.damagedUnits = new Set(); // 이미 데미지 입은 유닛 Set
        this.damagedNexuses = new Set(); // 이미 데미지 입은 넥서스 Set

        // 불기둥 효과 초기 설정
        if (this.type === 'fire_pillar') {
            for (let i = 0; i < 50; i++) { // 파티클 생성
                this.particles.push({
                    x: (this.gameManager.random() - 0.5) * this.maxRadius * 1.5, // 랜덤 x 위치 (효과 범위 내)
                    y: (this.gameManager.random() - 0.5) * this.maxRadius * 0.5, // 랜덤 y 위치 (아래쪽 집중)
                    size: this.gameManager.random() * 4 + 2, // 랜덤 크기
                    speed: this.gameManager.random() * 1.5 + 1, // 랜덤 상승 속도
                    lifespan: this.gameManager.random() * 20 + 10, // 랜덤 수명
                    color: ['#ffcc00', '#ff9900', '#ff6600', '#ef4444'][Math.floor(this.gameManager.random() * 4)] // 랜덤 불꽃색
                });
            }
        }
    }
    update() {
        const gameManager = this.gameManager;
        if (!gameManager) return;
        this.duration -= gameManager.gameSpeed; // 지속 시간 감소
        // 현재 반지름 계산 (점점 커짐)
        this.currentRadius = this.maxRadius * (1 - Math.max(0, this.duration / 30));

        // 불기둥 효과 업데이트
        if (this.type === 'fire_pillar') {
            // 파티클 업데이트 (위로 이동, 수명 감소)
            this.particles.forEach(p => {
                p.y -= p.speed * gameManager.gameSpeed;
                p.lifespan -= gameManager.gameSpeed;
                p.x += (this.gameManager.random() - 0.5) * 0.5; // 좌우 흔들림
            });
            this.particles = this.particles.filter(p => p.lifespan > 0); // 수명 다한 파티클 제거

            // 범위 내 적 유닛에게 데미지 (한 번만)
            gameManager.units.forEach(unit => {
                if (unit.team !== this.ownerTeam && !this.damagedUnits.has(unit)) {
                    const dist = Math.hypot(unit.pixelX - this.pixelX, unit.pixelY - this.pixelY);
                    if (dist < this.currentRadius) { // 범위 안에 있으면
                         // 시전자를 찾아서 데미지 정보 전달 (레벨업 등)
                        const attacker = this.gameManager.units.find(u => u.team === this.ownerTeam);
                        unit.takeDamage(this.damage, {}, attacker);
                        this.damagedUnits.add(unit); // 데미지 입음 표시
                    }
                }
            });

            // 범위 내 적 넥서스에게 데미지 (한 번만)
            gameManager.nexuses.forEach(nexus => {
                if (nexus.team !== this.ownerTeam && !this.damagedNexuses.has(nexus)) {
                    const dist = Math.hypot(nexus.pixelX - this.pixelX, nexus.pixelY - this.pixelY);
                    if (dist < this.currentRadius) { // 범위 안에 있으면
                        nexus.takeDamage(this.damage);
                        this.damagedNexuses.add(nexus); // 데미지 입음 표시
                    }
                }
            });
        }
    }
    draw(ctx) {
        const opacity = Math.max(0, this.duration / 30); // 투명도 계산

        // 불기둥 효과 그리기
        if (this.type === 'fire_pillar') {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY); // 효과 위치로 이동

            // 배경 그라데이션 (점점 커지는 원)
            const grad = ctx.createRadialGradient(0, 0, this.currentRadius * 0.3, 0, 0, this.currentRadius);
            grad.addColorStop(0, `rgba(255, 100, 0, ${opacity * 0.4})`); // 중심 (주황)
            grad.addColorStop(0.6, `rgba(255, 0, 0, ${opacity * 0.3})`); // 중간 (빨강)
            grad.addColorStop(1, `rgba(200, 0, 0, 0)`); // 가장자리 (투명)
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, this.currentRadius, 0, Math.PI * 2);
            ctx.fill();

            // 파티클 그리기
            this.particles.forEach(p => {
                ctx.globalAlpha = Math.max(0, (p.lifespan / 20) * opacity); // 수명과 전체 지속시간 고려한 투명도
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); // 파티클 원
                ctx.fill();
            });
            ctx.restore();
            ctx.globalAlpha = 1.0; // 투명도 복원

        }
        // 독구름 효과 그리기 (참고용 - 실제 독구름은 PoisonCloud 클래스에서 그림)
        else if (this.type === 'poison_cloud') {
            ctx.fillStyle = `rgba(132, 204, 22, ${opacity * 0.4})`; // 녹색, 투명도 적용
            // 사각형 범위
            ctx.fillRect(this.pixelX - GRID_SIZE * 2.5, this.pixelY - GRID_SIZE * 2.5, GRID_SIZE * 5, GRID_SIZE * 5);
        }
    }
}
