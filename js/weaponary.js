import { TEAM, COLORS, DEEP_COLORS, GRID_SIZE } from './constants.js'; // [수정] DEEP_COLORS 추가
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
import { Assets } from './assets.js'; // Assets import 추가
import { Unit } from './unit.js'; // Unit import 추가 (타입 힌트 및 instanceof 확인용)
import { Nexus } from './entities.js'; // Nexus import 추가 (타입 힌트 및 instanceof 확인용)

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

        // [추가] 무기별 속성 초기화 (weaponary.js에서 createWeapon으로 이동됨)
        // this.attackPowerBonus = 0;
        // this.attackRangeBonus = 0;
        // this.detectionRangeBonus = 0;
        // this.speedBonus = 0;
        // this.attackCooldownBonus = 0;
    }

    /**
     * [NEW] Handles the weapon's attack logic.
     * @param {Unit} unit - The unit using this weapon.
     * @param {Unit | Nexus} target - The attack target.
     */
    use(unit, target) {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        // 근접 공격 애니메이션 트리거 무기 목록 확장
        if (['sword', 'dual_swords', 'boomerang', 'poison_potion', 'magic_dagger', 'axe'].includes(this.type)) {
            unit.attackAnimationTimer = 15;
        }
        // 활은 별도 애니메이션 로직 사용

        if (this.type === 'sword') {
            unit.attackCount++;
            target.takeDamage(unit.attackPower, {}, unit);
            gameManager.createEffect('slash', unit.pixelX, unit.pixelY, target);
            gameManager.audioManager.play('swordHit');
            unit.attackCooldown = unit.cooldownTime;

            if (unit.attackCount >= 3) { // 3타 특수 공격
                unit.attackCount = 0;
                unit.swordSpecialAttackAnimationTimer = 30; // 검 회전 애니메이션 타이머
                gameManager.createProjectile(unit, target, 'sword_wave'); // 검기 발사
                gameManager.audioManager.play('Aurablade'); // 특수 공격 사운드

                // 검기 발사 시 파티클 효과
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

            if (unit.attackCount >= 3) { // 3타 특수 공격
                unit.attackCount = 0;

                // 유닛 뒤로 밀려남 (반동)
                const recoilAngle = unit.facingAngle + Math.PI;
                const recoilForce = 4;
                unit.knockbackX += Math.cos(recoilAngle) * recoilForce;
                unit.knockbackY += Math.sin(recoilAngle) * recoilForce;

                // 화살 2연사
                gameManager.createProjectile(unit, target, 'arrow');
                setTimeout(() => {
                    // 유닛이 죽지 않았을 경우에만 두 번째 화살 발사
                    if (unit.hp > 0) {
                        gameManager.createProjectile(unit, target, 'arrow');
                    }
                }, 150); // 0.15초 간격

                // 2연사 시 파티클 효과
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
                // 일반 공격
                gameManager.createProjectile(unit, target, 'arrow');
            }
        } else if (this.type === 'magic_dagger') {
            // 마법 단검: 기본 공격은 일반 베기, 특수 공격(돌진)은 unit.js에서 처리
            target.takeDamage(unit.attackPower, {}, unit);
            gameManager.createEffect('slash', unit.pixelX, unit.pixelY, target);
            gameManager.audioManager.play('magicdagger'); // 마법 단검 사운드
            unit.attackCooldown = unit.cooldownTime; // 기본 공격 쿨다운 적용
            // 돌진 쿨다운은 unit.js에서 별도 관리 (magicDaggerSkillCooldown)
        } else if (this.type === 'dual_swords') {
            // 쌍검: 기본 공격은 베기, 특수 공격(표창 던지고 순간이동)은 unit.js에서 처리
            target.takeDamage(unit.attackPower, {}, unit);
            gameManager.createEffect('dual_sword_slash', unit.pixelX, unit.pixelY, target);
            gameManager.audioManager.play('dualSwordHit');
            unit.attackCooldown = unit.cooldownTime;
            // 특수 공격 쿨다운은 unit.js에서 별도 관리 (dualSwordSkillCooldown)
        } else if (this.type === 'axe') {
            // 도끼: 기본 공격은 베기, 특수 공격(회전)은 unit.js에서 처리
            target.takeDamage(unit.attackPower, {}, unit);
            gameManager.createEffect('slash', unit.pixelX, unit.pixelY, target);
            gameManager.audioManager.play('axe'); // 도끼 사운드
            unit.attackCooldown = unit.cooldownTime;
            // 특수 공격 쿨다운은 unit.js에서 별도 관리 (axeSkillCooldown)
        } else if (this.type === 'ice_diamond') {
            // 얼음 다이아: 충전된 다이아 있으면 여러 발 발사 (특수), 없으면 단일 볼트 (일반)
            if (unit.iceDiamondCharges > 0) { // 충전된 다이아 사용 (특수 공격)
                for (let i = 0; i < unit.iceDiamondCharges; i++) {
                    setTimeout(() => {
                        if (unit.hp > 0) { // 유닛 생존 시에만 발사
                            gameManager.createProjectile(unit, target, 'ice_diamond_projectile');
                        }
                    }, i * 100); // 0.1초 간격으로 발사
                }
                gameManager.audioManager.play('Ice'); // 얼음 특수 공격 사운드
                unit.iceDiamondCharges = 0; // 충전량 초기화
                unit.iceDiamondChargeTimer = 0; // 충전 타이머 초기화
            } else { // 기본 얼음 볼트 발사
                gameManager.createProjectile(unit, target, 'ice_bolt_projectile');
                gameManager.audioManager.play('punch'); // 임시 사운드
            }
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'fire_staff') {
            // 불 지팡이: 기본 공격은 검은 구체, 특수 공격(화염구)은 unit.js에서 처리
            gameManager.createProjectile(unit, target, 'black_sphere_projectile');
            gameManager.audioManager.play('punch'); // 임시 사운드
            unit.attackCooldown = unit.cooldownTime;
            // 특수 공격 쿨다운은 unit.js에서 별도 관리 (fireStaffSpecialCooldown)
        } else if (this.type === 'shuriken') {
            // 표창: 기본 공격은 단일 표창, 특수 공격(3방향)은 unit.js에서 처리
            if (unit.shurikenSkillCooldown <= 0) { // 특수 공격 사용 가능 시
                const angleToTarget = Math.atan2(target.pixelY - unit.pixelY, target.pixelX - unit.pixelX);
                const spread = 0.3; // 3방향 각도 차이
                const angles = [angleToTarget - spread, angleToTarget, angleToTarget + spread];

                const dummyTarget = { pixelX: 0, pixelY: 0 }; // 방향만 사용하기 위한 더미 타겟

                angles.forEach(angle => {
                    gameManager.createProjectile(unit, dummyTarget, 'returning_shuriken', {
                        angle: angle,
                        state: 'MOVING_OUT', // 초기 상태: 밖으로 이동
                        maxDistance: GRID_SIZE * 8 // 최대 이동 거리
                    });
                });
                unit.shurikenSkillCooldown = 480; // 특수 공격 쿨다운 설정 (8초)
                gameManager.audioManager.play('shurikenShoot'); // 특수 공격 사운드 (일반과 동일)
            } else { // 기본 공격
                gameManager.createProjectile(unit, target, 'shuriken');
                gameManager.audioManager.play('shurikenShoot');
            }
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'hadoken') {
            // 장풍: 기본 공격만 있음 (넉백 효과)
            gameManager.createProjectile(unit, target, 'hadoken');
            gameManager.audioManager.play('hadokenShoot');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'lightning') {
            // 번개: 기본 공격만 있음 (연쇄 효과는 Projectile 클래스에서 처리)
            gameManager.createProjectile(unit, target, 'lightning_bolt', { initialTarget: target }); // 첫 타겟 설정
            gameManager.audioManager.play('electricity');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'magic_spear') {
            // 마법창: 기본 공격은 일반 창 투사체, 특수 공격(마법진 연계)은 unit.js에서 처리
            gameManager.createProjectile(unit, target, 'magic_spear_normal');
            gameManager.audioManager.play('punch'); // 임시 사운드
            unit.attackCooldown = unit.cooldownTime;
            // 특수 공격 쿨다운은 unit.js에서 별도 관리 (magicCircleCooldown)
        } else if (this.type === 'boomerang') {
            // 부메랑: 기본 공격은 작은 부메랑, 특수 공격(끌어당기기)은 unit.js에서 처리
            gameManager.createProjectile(unit, target, 'boomerang_normal_projectile');
            gameManager.audioManager.play('boomerang'); // 부메랑 사운드
            unit.attackCooldown = unit.cooldownTime;
            // 특수 공격 쿨다운은 unit.js에서 별도 관리 (boomerangCooldown)
        } else if (this.type === 'poison_potion') {
            // 독 포션: 기본 공격(지속 피해) 및 특수 공격(사망 시 독안개)은 unit.js에서 처리
            target.takeDamage(15, { poison: { damage: 0.2 + (unit.specialAttackLevelBonus * 0.02) } }, unit); // 즉시 피해 + 독 효과 부여
            gameManager.audioManager.play('poison'); // 독 사운드
            unit.attackCooldown = unit.cooldownTime;
            // 특수 공격은 사망 시 발동
        }
    }

    // --- 무기 디자인 그리는 함수들 (weaponDesigns.js로 이동됨) ---
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
        if (this.isEquipped) return;
        const centerX = this.pixelX; const centerY = this.pixelY;
        // 무기별 크기 조절값 통합 관리
        let baseScale = 0.8;
        if (this.type === 'crown') baseScale = 1.0;
        else if (['lightning', 'magic_spear', 'poison_potion'].includes(this.type)) baseScale = 0.6;
        else if (this.type === 'boomerang') baseScale = 0.49;
        else if (this.type === 'magic_dagger') baseScale = 0.8; // 마법 단검 크기 조정
        else if (this.type === 'axe') baseScale = 0.8; // 도끼 크기 조정
        else if (this.type === 'ice_diamond') baseScale = 0.8; // 얼음 다이아 크기 조정

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(baseScale, baseScale);

        // 검은 테두리 (마법 단검 제외)
        if (this.type !== 'magic_dagger') {
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1 / baseScale; // 스케일에 반비례하여 두께 조절
        }


        // --- 각 무기별 그리기 로직 ---
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
            ctx.fillStyle = '#f3f4f6'; // 화살대
            ctx.fillRect(-GRID_SIZE * 0.7, -1, GRID_SIZE * 1.2, 2);
            ctx.strokeRect(-GRID_SIZE * 0.7, -1, GRID_SIZE * 1.2, 2);
            ctx.fillStyle = '#e5e7eb'; // 화살촉
            ctx.beginPath(); ctx.moveTo(GRID_SIZE * 0.5, 0); ctx.lineTo(GRID_SIZE * 0.3, -3); ctx.lineTo(GRID_SIZE * 0.3, 3); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#d1d5db'; // 활 끝 장식
            ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.6, -1); ctx.lineTo(-GRID_SIZE * 0.7, -4); ctx.lineTo(-GRID_SIZE * 0.5, -1); ctx.closePath(); ctx.fill()
            ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.6, 1); ctx.lineTo(-GRID_SIZE * 0.7, 4); ctx.lineTo(-GRID_SIZE * 0.5, 1); ctx.closePath(); ctx.fill()
            ctx.strokeStyle = 'black'; ctx.lineWidth = 6 / baseScale; ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.8, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke(); // 활대 (굵은 검정)
            ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 4 / baseScale; ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.8, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke(); // 활대 (갈색)
            ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1.5 / baseScale; ctx.beginPath(); // 활시위
            const arcRadius = GRID_SIZE * 0.8, arcAngle = Math.PI / 2.2;
            ctx.moveTo(Math.cos(-arcAngle) * arcRadius, Math.sin(-arcAngle) * arcRadius);
            ctx.lineTo(-GRID_SIZE * 0.4, 0); // 시위 당기지 않은 상태
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
                const bladeGradient = ctx.createLinearGradient(0, -GRID_SIZE, 0, 0); // 칼날
                bladeGradient.addColorStop(0, '#f3f4f6'); bladeGradient.addColorStop(0.5, '#9ca3af'); bladeGradient.addColorStop(1, '#d1d5db');
                ctx.fillStyle = bladeGradient;
                ctx.beginPath();
                ctx.moveTo(0, GRID_SIZE * 0.2);
                ctx.quadraticCurveTo(GRID_SIZE * 0.5, -GRID_SIZE * 0.4, 0, -GRID_SIZE * 0.9); // 곡선 칼날
                ctx.quadraticCurveTo(-GRID_SIZE * 0.1, -GRID_SIZE * 0.4, 0, GRID_SIZE * 0.2);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.restore();
            };
            drawCurvedSword(-Math.PI / 4); // 왼쪽 검
            drawCurvedSword(Math.PI / 4); // 오른쪽 검
        } else if (this.type === 'fire_staff') {
            this.drawStaff(ctx, baseScale); // weaponDesigns.js 함수 호출
        } else if (this.type === 'lightning') {
            this.drawLightning(ctx, 1.0, Math.PI / 4); // weaponDesigns.js 함수 호출
        } else if (this.type === 'magic_spear') {
            this.drawMagicSpear(ctx, 0.8, -Math.PI / 8); // weaponDesigns.js 함수 호출
        } else if (this.type === 'boomerang') {
            this.drawBoomerang(ctx, 1.0, -Math.PI / 6); // weaponDesigns.js 함수 호출
        } else if (this.type === 'poison_potion') {
            this.drawPoisonPotion(ctx, baseScale); // weaponDesigns.js 함수 호출
        } else if (this.type === 'magic_dagger') {
            ctx.rotate(Math.PI / 4);
            drawMagicDaggerIcon(ctx); // weaponDesigns.js 함수 호출
        } else if (this.type === 'axe') {
            ctx.rotate(Math.PI / 4);
            drawAxeIcon(ctx); // weaponDesigns.js 함수 호출
        } else if (this.type === 'ice_diamond') {
            drawIceDiamondIcon(ctx); // weaponDesigns.js 함수 호출
        } else if (this.type === 'hadoken') {
            ctx.rotate(Math.PI / 4);
            const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, GRID_SIZE * 1.2); // 에너지 구체
            grad.addColorStop(0, '#bfdbfe');
            grad.addColorStop(0.6, '#3b82f6');
            grad.addColorStop(1, '#1e40af');
            ctx.fillStyle = grad;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1.5 / baseScale;
            ctx.beginPath(); // 반원 + 삼각형 모양
            ctx.arc(-GRID_SIZE * 0.2, 0, GRID_SIZE * 0.6, Math.PI / 2, -Math.PI / 2, false);
            ctx.lineTo(GRID_SIZE * 0.8, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'shuriken') {
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#9ca3af'; // 표창 색상
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2 / baseScale;

            ctx.beginPath(); // 8각 별 모양
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
            ctx.fillStyle = '#facc15'; // 왕관 색상
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
     * [NEW] Draws the weapon when it's equipped by a unit.
     * @param {CanvasRenderingContext2D} ctx
     * @param {Unit} unit
     */
    drawEquipped(ctx, unit) {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        ctx.save();

        // --- [수정 시작] 특수 공격 활성화 시 빛나는 효과 추가 ---
        let isSpecialReady = false;
        const weaponType = this.type;
        const attackCountNeeded = 2; // 3타째가 특수 공격 (0, 1 다음 2)

        if ((weaponType === 'sword' || weaponType === 'bow') && unit.attackCount >= attackCountNeeded) {
            isSpecialReady = true;
        } else if (weaponType === 'shuriken' && unit.shurikenSkillCooldown <= 0) {
            isSpecialReady = true;
        } else if (weaponType === 'axe' && unit.axeSkillCooldown <= 0) {
            isSpecialReady = true;
        } else if (weaponType === 'boomerang' && unit.boomerangCooldown <= 0) {
            isSpecialReady = true;
        } else if (weaponType === 'fire_staff' && unit.fireStaffSpecialCooldown <= 0) {
            isSpecialReady = true;
        } else if (weaponType === 'magic_dagger' && unit.magicDaggerSkillCooldown <= 0) {
            isSpecialReady = true;
        } else if (weaponType === 'dual_swords' && unit.dualSwordSkillCooldown <= 0) {
            isSpecialReady = true;
        }
        // 얼음 다이아는 충전 개수로 판단 (선택 사항)
        // else if (weaponType === 'ice_diamond' && unit.iceDiamondCharges > 0) {
        //     isSpecialReady = true;
        // }


        if (isSpecialReady) {
            let glowColor = COLORS[`TEAM_${unit.team}`] || DEEP_COLORS[`TEAM_${unit.team}`] || '#FFFFFF'; // 팀 색상 또는 기본 흰색
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 15; // 빛나는 강도
        }
        // --- [수정 끝] ---


        const scale = 1 + (unit.awakeningEffect?.stacks || 0) * 0.2; // 각성 효과 스케일

        ctx.translate(unit.pixelX, unit.pixelY); // 유닛 위치로 이동
        ctx.scale(scale, scale); // 각성 스케일 적용

        let rotation = unit.facingAngle; // 기본 회전은 유닛 방향

        // 공격 애니메이션 회전 (활 제외)
        if (this.type !== 'bow' && unit.attackAnimationTimer > 0) {
            const swingProgress = Math.sin((15 - unit.attackAnimationTimer) / 15 * Math.PI);
            rotation += swingProgress * Math.PI / 4; // 공격 시 추가 회전
        }

        // 도끼 회전 공격 애니메이션
        if (this.type === 'axe' && unit.spinAnimationTimer > 0) {
            rotation += ((30 - unit.spinAnimationTimer) / 30) * Math.PI * 2;
        }

        // 검 특수 공격 회전 애니메이션
        if (this.type === 'sword' && unit.swordSpecialAttackAnimationTimer > 0) {
            rotation += ((30 - unit.swordSpecialAttackAnimationTimer) / 30) * Math.PI * 2;
        }

        // 쌍검 회전 공격 애니메이션
        if (this.type === 'dual_swords' && unit.dualSwordSpinAttackTimer > 0) {
            const spinProgress = (20 - unit.dualSwordSpinAttackTimer) / 20;
            rotation += spinProgress * Math.PI * 4; // 더 빠르게 회전
        }

        // 번개, 얼음 다이아는 유닛 방향과 별개로 회전하므로 먼저 회전 적용 안 함
        if (this.type !== 'lightning' && this.type !== 'ice_diamond') {
            ctx.rotate(rotation);
        }

        // --- 각 무기별 장착 시 그리기 로직 ---
        if (this.type === 'sword') {
            ctx.translate(GRID_SIZE * 0.5, 0); // 유닛 옆으로 이동
            ctx.rotate(Math.PI / 4); // 살짝 기울이기

            const bladeGradient = ctx.createLinearGradient(0, -GRID_SIZE, 0, 0);
            bladeGradient.addColorStop(0, '#f3f4f6');
            bladeGradient.addColorStop(1, '#9ca3af');
            ctx.fillStyle = bladeGradient;
            ctx.strokeStyle = 'black';

            ctx.beginPath();
            ctx.moveTo(-2, GRID_SIZE * 0.3);
            ctx.lineTo(-2, -GRID_SIZE * 1.0);
            ctx.lineTo(0, -GRID_SIZE * 1.2);
            ctx.lineTo(2, -GRID_SIZE * 1.0);
            ctx.lineTo(2, GRID_SIZE * 0.3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#374151'; // 손잡이 가드
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.2, GRID_SIZE * 0.3);
            ctx.lineTo(GRID_SIZE * 0.2, GRID_SIZE * 0.3);
            ctx.lineTo(GRID_SIZE * 0.25, GRID_SIZE * 0.3 + 3);
            ctx.lineTo(-GRID_SIZE * 0.25, GRID_SIZE * 0.3 + 3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#1f2937'; // 손잡이
            ctx.fillRect(-1.5, GRID_SIZE * 0.3 + 3, 3, GRID_SIZE * 0.3);
            ctx.strokeRect(-1.5, GRID_SIZE * 0.3 + 3, 3, GRID_SIZE * 0.3);
        } else if (this.type === 'magic_dagger') {
            ctx.translate(-GRID_SIZE * 0.4, 0); // 위치 조정
            ctx.scale(0.7, 0.7); // 크기 조정
            ctx.rotate(-Math.PI / 8); // 각도 조정
            drawMagicDaggerIcon(ctx); // weaponDesigns.js 함수 호출
        } else if (this.type === 'axe') {
            ctx.translate(GRID_SIZE * 0.8, -GRID_SIZE * 0.7); // 위치 조정
            ctx.rotate(Math.PI / 4); // 각도 조정
            ctx.scale(0.8, 0.8); // 크기 조정
            drawAxeIcon(ctx); // weaponDesigns.js 함수 호출
        } else if (this.type === 'bow') {
            ctx.translate(GRID_SIZE * 0.4, 0); // 위치 조정
            ctx.rotate(-Math.PI / 4); // 각도 조정
            const bowScale = 0.56; // 장착 시 크기
            ctx.scale(bowScale, bowScale);
            ctx.fillStyle = '#f3f4f6'; // 화살대
            ctx.fillRect(-GRID_SIZE * 0.7, -1, GRID_SIZE * 1.2, 2);
            ctx.strokeRect(-GRID_SIZE * 0.7, -1, GRID_SIZE * 1.2, 2);
            ctx.fillStyle = '#e5e7eb'; // 화살촉
            ctx.beginPath(); ctx.moveTo(GRID_SIZE * 0.5, 0); ctx.lineTo(GRID_SIZE * 0.3, -3); ctx.lineTo(GRID_SIZE * 0.3, 3); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#d1d5db'; // 활 끝 장식
            ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.6, -1); ctx.lineTo(-GRID_SIZE * 0.7, -4); ctx.lineTo(-GRID_SIZE * 0.5, -1); ctx.closePath(); ctx.fill()
            ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.6, 1); ctx.lineTo(-GRID_SIZE * 0.7, 4); ctx.lineTo(-GRID_SIZE * 0.5, 1); ctx.closePath(); ctx.fill()
            ctx.strokeStyle = 'black'; ctx.lineWidth = 6 / bowScale; ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.8, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke(); // 활대 (굵은 검정)
            ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 4 / bowScale; ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.8, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke(); // 활대 (갈색)

            // 활시위 당기는 애니메이션
            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 1.5 / bowScale;
            ctx.beginPath();
            const arcRadius = GRID_SIZE * 0.8, arcAngle = Math.PI / 2.2;
            const bowstringY1 = Math.sin(-arcAngle) * arcRadius;
            const bowstringY2 = Math.sin(arcAngle) * arcRadius;
            const bowstringX = Math.cos(arcAngle) * arcRadius;

            let pullBack = -GRID_SIZE * 0.4; // 기본 시위 위치
            if (unit.attackAnimationTimer > 0) { // 공격 중일 때
                const pullProgress = Math.sin((15 - unit.attackAnimationTimer) / 15 * Math.PI);
                pullBack -= pullProgress * GRID_SIZE * 0.5; // 더 당김
            }

            ctx.moveTo(bowstringX, bowstringY1);
            ctx.lineTo(pullBack, 0); // 당겨진 위치로
            ctx.lineTo(bowstringX, bowstringY2);
            ctx.stroke();

        } else if (this.type === 'dual_swords') {
            const drawEquippedCurvedSword = (isRightHand) => {
                ctx.save();
                const yOffset = isRightHand ? GRID_SIZE * 0.6 : -GRID_SIZE * 0.6; // 양손 위치
                const swordRotation = isRightHand ? Math.PI / 8 : -Math.PI / 8; // 각도
                ctx.translate(GRID_SIZE * 0.1, yOffset);
                ctx.rotate(swordRotation);
                ctx.fillStyle = '#374151'; // 손잡이
                ctx.fillRect(-GRID_SIZE * 0.05, 0, GRID_SIZE * 0.1, GRID_SIZE * 0.2);
                ctx.strokeRect(-GRID_SIZE * 0.05, 0, GRID_SIZE * 0.1, GRID_SIZE * 0.2);
                ctx.beginPath(); // 손잡이 가드
                ctx.moveTo(-GRID_SIZE * 0.2, 0); ctx.lineTo(GRID_SIZE * 0.2, 0);
                ctx.lineTo(GRID_SIZE * 0.2, -GRID_SIZE * 0.05); ctx.lineTo(-GRID_SIZE * 0.2, -GRID_SIZE * 0.05);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                const bladeGradient = ctx.createLinearGradient(0, -GRID_SIZE*0.8, 0, 0); // 칼날
                bladeGradient.addColorStop(0, '#f3f4f6'); bladeGradient.addColorStop(0.5, '#9ca3af'); bladeGradient.addColorStop(1, '#4b5563');
                ctx.fillStyle = bladeGradient;
                ctx.beginPath();
                ctx.moveTo(0, -GRID_SIZE * 0.05);
                ctx.quadraticCurveTo(GRID_SIZE * 0.4, -GRID_SIZE * 0.3, 0, -GRID_SIZE * 0.8); // 곡선 칼날
                ctx.quadraticCurveTo(-GRID_SIZE * 0.1, -GRID_SIZE * 0.3, 0, -GRID_SIZE * 0.05);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.restore();
            };
            drawEquippedCurvedSword(true); // 오른손 검
            drawEquippedCurvedSword(false); // 왼손 검
        } else if (this.type === 'fire_staff') {
            this.drawStaff(ctx, 0.8); // weaponDesigns.js 함수 호출 (크기 조정)
        } else if (this.type === 'lightning') {
            // 번개는 유닛 주위를 돌도록 그림
            const revolutionAngle = gameManager.animationFrameCounter * 0.05; // 회전 속도
            const orbitRadius = GRID_SIZE * 0.8; // 궤도 반지름
            const weaponX = Math.cos(revolutionAngle) * orbitRadius;
            const weaponY = Math.sin(revolutionAngle) * orbitRadius;

            ctx.save();
            ctx.translate(weaponX, weaponY); // 궤도 위치로 이동
            this.drawLightning(ctx, 0.48, 0); // weaponDesigns.js 함수 호출 (크기, 회전 고정)
            ctx.restore();
        } else if (this.type === 'ice_diamond') {
            ctx.translate(GRID_SIZE * 0.6, 0); // 위치 조정
            drawIceDiamondIcon(ctx, 0.6); // 장착 시 크기 조정

            // 충전된 다이아 궤도 그리기
            for (let i = 0; i < unit.iceDiamondCharges; i++) {
                const angle = (gameManager.animationFrameCounter * 0.02) + (i * (Math.PI * 2 / 5)); // 회전 및 간격
                const orbitRadius = GRID_SIZE * 1.2;
                const orbX = Math.cos(angle) * orbitRadius;
                const orbY = Math.sin(angle) * orbitRadius;
                ctx.save();
                ctx.translate(orbX, orbY);
                drawIceDiamondIcon(ctx, 0.5); // 궤도 다이아 크기
                ctx.restore();
            }
        } else if (this.type === 'magic_spear') {
            ctx.translate(GRID_SIZE * 0.2, GRID_SIZE * 0.4); // 위치 조정
            this.drawMagicSpear(ctx, 0.5, -Math.PI / 8 + Math.PI); // weaponDesigns.js 함수 호출 (크기, 각도 조정)
        } else if (this.type === 'boomerang') {
            ctx.translate(0, -GRID_SIZE * 0.5); // 위치 조정
            this.drawBoomerang(ctx, 0.5); // weaponDesigns.js 함수 호출 (크기 조정)
        } else if (this.type === 'poison_potion') {
            ctx.translate(0, -GRID_SIZE * 0.5); // 위치 조정
            this.drawPoisonPotion(ctx, 0.3); // weaponDesigns.js 함수 호출 (크기 조정)
        } else if (this.type === 'hadoken') {
            ctx.translate(GRID_SIZE * 0.5, 0); // 위치 조정
            const hadokenScale = 0.7; // 장착 시 크기
            ctx.scale(hadokenScale, hadokenScale);
            const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, GRID_SIZE * 1.2); // 에너지 구체
            grad.addColorStop(0, '#bfdbfe');
            grad.addColorStop(0.6, '#3b82f6');
            grad.addColorStop(1, '#1e40af');
            ctx.fillStyle = grad;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1.5 / hadokenScale;
            ctx.beginPath(); // 삼각형 + 반원 모양
            ctx.arc(GRID_SIZE * 0.2, 0, GRID_SIZE * 0.6, -Math.PI / 2, Math.PI / 2, false);
            ctx.lineTo(-GRID_SIZE * 0.8, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'shuriken') {
            ctx.translate(GRID_SIZE * 0.4, GRID_SIZE * 0.3); // 위치 조정
            const shurikenScale = 0.5; // 장착 시 크기
            ctx.scale(shurikenScale, shurikenScale);
            ctx.rotate(gameManager.animationFrameCounter * 0.1); // 회전 애니메이션
            ctx.fillStyle = '#4a5568'; // 표창 색상
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2 / shurikenScale;
            ctx.beginPath(); // 8각 별 모양
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
        // --- 각 무기별 장착 시 그리기 로직 끝 ---

        // --- [수정 시작] 빛나는 효과 초기화 ---
        if (isSpecialReady) {
            ctx.shadowColor = 'transparent'; // 그림자 색상 초기화
            ctx.shadowBlur = 0; // 그림자 흐림 효과 초기화
        }
        // --- [수정 끝] ---

        ctx.restore(); // 최초의 ctx.save() 복원
    }
}

// Particle class (파티클 효과)
export class Particle {
    constructor(gameManager, options) {
        this.gameManager = gameManager; // GameManager 인스턴스 저장
        this.x = options.x;
        this.y = options.y;
        this.vx = options.vx; // x 속도
        this.vy = options.vy; // y 속도
        this.life = options.life; // 수명 (초)
        this.initialLife = options.life; // 초기 수명
        this.color = options.color; // 색상
        this.size = options.size; // 크기
        this.gravity = options.gravity || 0; // 중력 효과
    }

    isAlive() {
        return this.life > 0;
    }

    update(gameSpeed = 1) {
        this.x += this.vx * gameSpeed;
        this.y += this.vy * gameSpeed;
        this.vy += this.gravity * gameSpeed; // 중력 적용
        this.life -= (1 / 60) * gameSpeed; // 수명 감소 (60 FPS 기준)
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life / this.initialLife); // 수명에 따라 투명도 조절
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); // 원형 파티클
        ctx.fill();
        ctx.restore();
    }
}

/**
 * Function to create a physical hit effect (물리 타격 효과 생성 함수)
 * @param {object} gameManager
 * @param {Unit | Nexus} target
 */
export function createPhysicalHitEffect(gameManager, target) {
    const particleCount = 6; // 파티클 개수
    for (let i = 0; i < particleCount; i++) {
        const angle = gameManager.random() * Math.PI * 2; // 무작위 방향
        const speed = 2 + gameManager.random() * 3; // 무작위 속도
        gameManager.addParticle({
            x: target.pixelX,
            y: target.pixelY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.7, // 수명
            color: '#ef4444', // 붉은색
            size: gameManager.random() * 2.5 + 1.5, // 무작위 크기
            gravity: 0.1 // 약간의 중력
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
    const particleCount = 20; // 파티클 수
    for (let i = 0; i < particleCount; i++) {
        const angle = gameManager.random() * Math.PI * 2; // 무작위 방향
        const speed = 1 + gameManager.random() * 4; // 무작위 속도
        gameManager.addParticle({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.6, // 수명
            color: ['#ffcc00', '#ff9900', '#ff6600', '#ef4444'][Math.floor(gameManager.random() * 4)], // 무작위 불꽃색
            size: gameManager.random() * 3 + 2, // 무작위 크기
            gravity: -0.05 // 위로 솟구치는 효과
        });
    }
}

// Projectile class (투사체)
export class Projectile {
    constructor(gameManager, owner, target, type = 'arrow', options = {}) {
        this.gameManager = gameManager;
        this.owner = owner; // 발사 주체
        this.target = target; // 목표 대상
        this.pixelX = options.startX !== undefined ? options.startX : owner.pixelX; // 시작 X 좌표
        this.pixelY = options.startY !== undefined ? options.startY : owner.pixelY; // 시작 Y 좌표
        this.type = type; // 투사체 종류

        // --- 표창 특수 공격 관련 속성 ---
        this.state = options.state || 'DEFAULT'; // 현재 상태 (DEFAULT, MOVING_OUT, LINGERING, RETURNING)
        this.lingerDuration = options.lingerDuration || 60; // 머무는 시간 (프레임)
        this.maxDistance = options.maxDistance || 0; // 최대 이동 거리
        this.distanceTraveled = 0; // 이동한 거리
        this.turnPoint = null; // 방향 전환 지점 (사용 안 함)
        this.damageInterval = 30; // 머무는 동안 피해 간격 (프레임)
        this.damageCooldown = 0; // 다음 피해까지 남은 시간
        this.alreadyDamagedOnReturn = new Set(); // 돌아올 때 이미 피해 입힌 유닛 집합
        this.lingerRotationSpeed = 0.5; // 머무는 동안 회전 속도

        // --- 투사체 속도 설정 ---
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
        else this.speed = 6; // 기본 속도 (화살 등)

        // --- 투사체 피해량 계산 ---
        let baseNormalDamage = owner.baseAttackPower; // 기본 일반 공격력
        let baseSpecialDamage = owner.specialAttackLevelBonus; // 스킬 레벨 보너스

        const weaponType = owner.weapon ? owner.weapon.type : null;
        // 스킬 공격력에 영향을 주는 무기 목록
        const skillAttackWeapons = [
            'magic_dagger', 'poison_potion', 'ice_diamond', 'fire_staff',
            'magic_spear', 'boomerang', 'hadoken', 'shuriken'
        ];

        // 무기 보너스를 일반/스킬 공격력에 분배
        if (skillAttackWeapons.includes(weaponType)) {
            baseSpecialDamage += owner.weapon.attackPowerBonus || 0; // 스킬 무기면 스킬 공격력에 보너스 추가
        } else {
            baseNormalDamage += owner.weapon.attackPowerBonus || 0; // 일반 무기면 일반 공격력에 보너스 추가
        }

        // 투사체 종류별 최종 피해량 설정
        switch (type) {
            // --- 스킬 공격력 기반 ---
            case 'shuriken':
            case 'returning_shuriken':
                this.damage = baseSpecialDamage;
                break;
            case 'magic_spear_special': // 마법창 특수 공격
                this.damage = baseSpecialDamage + 15; // 추가 피해
                break;
            case 'ice_diamond_projectile': // 얼음 다이아 특수 공격
                this.damage = baseSpecialDamage + 15; // 추가 피해
                break;
            case 'fireball_projectile': // 불 지팡이 특수 공격
                this.damage = baseSpecialDamage;
                break;
            case 'mini_fireball_projectile': // 화염구 폭발 시 생성되는 작은 화염구
                this.damage = 15; // 고정 피해
                break;
            case 'bouncing_sword': // 쌍검 특수 공격 (튕기는 검)
                this.damage = 20; // 고정 피해
                break;
            case 'boomerang_projectile': // 부메랑 특수 공격 (끌어당기기)
                this.damage = 0; // 피해 없음 (끌어당기기 효과만)
                break;

            // --- 일반 공격력 기반 ---
            case 'magic_spear_normal': // 마법창 일반 공격
                this.damage = baseNormalDamage + 5; // 추가 피해
                break;
            case 'boomerang_normal_projectile': // 부메랑 일반 공격
                this.damage = baseNormalDamage + 10; // 추가 피해
                break;
            case 'black_sphere_projectile': // 불 지팡이 일반 공격
                this.damage = baseNormalDamage + 7; // 추가 피해
                break;
            default: // 화살, 기본 검기, 장풍 등 나머지
                this.damage = baseNormalDamage;
                break;
        }

        this.knockback = (type === 'hadoken') ? gameManager.hadokenKnockback : 0; // 장풍만 넉백 적용
        const inaccuracy = (type === 'shuriken' || type === 'lightning_bolt' || type === 'sword_wave') ? 0 : GRID_SIZE * 0.8; // 명중률 보정 (일부 무기는 정확히 발사)

        let targetX, targetY;
        if (type === 'returning_shuriken') { // 돌아오는 표창은 지정된 각도로 발사
            targetX = this.pixelX + Math.cos(options.angle);
            targetY = this.pixelY + Math.sin(options.angle);
        } else { // 나머지는 목표 대상 주변으로 약간 부정확하게 발사
            targetX = target.pixelX + (gameManager.random() - 0.5) * inaccuracy;
            targetY = target.pixelY + (gameManager.random() - 0.5) * inaccuracy;
        }

        const dx = targetX - this.pixelX; const dy = targetY - this.pixelY;
        this.angle = options.angle !== undefined ? options.angle : Math.atan2(dy, dx); // 발사 각도 계산
        this.destroyed = false; // 파괴 여부
        this.trail = []; // 잔상 효과 배열
        this.rotationAngle = 0; // 회전 각도 (표창, 부메랑 등)

        this.hitTargets = options.hitTargets || new Set(); // 이미 맞춘 대상 집합 (관통, 연쇄 등)
        this.piercing = (type === 'sword_wave'); // 관통 여부 (검기만)
        if (type === 'lightning_bolt' && options.initialTarget) {
            this.hitTargets.add(options.initialTarget); // 번개는 첫 타겟을 제외하고 연쇄
        }
    }

    update() {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        // --- 돌아오는 표창 로직 ---
        if (this.type === 'returning_shuriken') {
            this.rotationAngle += this.lingerRotationSpeed * gameManager.gameSpeed; // 회전

            if (this.state === 'MOVING_OUT') { // 밖으로 이동 중
                const moveX = Math.cos(this.angle) * this.speed * gameManager.gameSpeed;
                const moveY = Math.sin(this.angle) * this.speed * gameManager.gameSpeed;
                this.pixelX += moveX;
                this.pixelY += moveY;
                this.distanceTraveled += Math.hypot(moveX, moveY); // 이동 거리 누적

                // 이동 중 충돌 판정
                for (const unit of gameManager.units) {
                    if (unit.team !== this.owner.team && !this.hitTargets.has(unit) && Math.hypot(this.pixelX - unit.pixelX, this.pixelY - unit.pixelY) < GRID_SIZE / 2) {
                        unit.takeDamage(this.damage, {}, this.owner);
                        this.hitTargets.add(unit); // 맞춘 대상 추가
                    }
                }

                // 최대 거리 도달 시 상태 변경
                if (this.distanceTraveled >= this.maxDistance) {
                    this.state = 'LINGERING'; // 머무는 상태로
                }
            } else if (this.state === 'LINGERING') { // 최대 거리에서 머무는 중
                this.lingerDuration -= gameManager.gameSpeed; // 머무는 시간 감소
                this.damageCooldown -= gameManager.gameSpeed; // 피해 쿨다운 감소

                // 주기적으로 주변 적에게 약한 피해
                if (this.damageCooldown <= 0) {
                    for (const unit of gameManager.units) {
                        if (unit.team !== this.owner.team && Math.hypot(this.pixelX - unit.pixelX, this.pixelY - unit.pixelY) < GRID_SIZE * 2) {
                            unit.takeDamage(this.damage * 0.15, {}, this.owner); // 약한 피해
                        }
                    }
                    this.damageCooldown = this.damageInterval; // 피해 쿨다운 초기화
                }

                // 머무는 시간 종료 시 상태 변경
                if (this.lingerDuration <= 0) {
                    this.state = 'RETURNING'; // 돌아가는 상태로
                }
            } else if (this.state === 'RETURNING') { // 주인에게 돌아가는 중
                if (!this.owner || this.owner.hp <= 0) { // 주인이 죽으면 소멸
                    this.destroyed = true;
                    return;
                }
                const dx = this.owner.pixelX - this.pixelX;
                const dy = this.owner.pixelY - this.pixelY;
                const dist = Math.hypot(dx, dy); // 주인까지의 거리

                if (dist < this.speed * gameManager.gameSpeed) { // 주인에게 도달하면 소멸
                    this.destroyed = true;
                    return;
                }

                const returnAngle = Math.atan2(dy, dx); // 주인 방향 각도
                this.pixelX += Math.cos(returnAngle) * this.speed * gameManager.gameSpeed; // 주인 방향으로 이동
                this.pixelY += Math.sin(returnAngle) * this.speed * gameManager.gameSpeed;

                // 돌아가는 중 충돌 판정
                for (const unit of gameManager.units) {
                    if (unit.team !== this.owner.team && !this.alreadyDamagedOnReturn.has(unit) && Math.hypot(this.pixelX - unit.pixelX, this.pixelY - unit.pixelY) < GRID_SIZE / 2) {
                        unit.takeDamage(this.damage, {}, this.owner);
                        this.alreadyDamagedOnReturn.add(unit); // 돌아올 때 맞춘 대상 추가
                    }
                }
            }
            return; // 돌아오는 표창 로직은 여기서 종료
        }

        // --- 일반 투사체 로직 ---

        // 유도 기능 (얼음 다이아, 부메랑 특수 공격)
        if (this.type === 'ice_diamond_projectile' || this.type === 'boomerang_projectile') {
            if (this.target && this.target.hp > 0) { // 목표가 살아있으면
                const targetAngle = Math.atan2(this.target.pixelY - this.pixelY, this.target.pixelX - this.pixelX); // 목표 방향 각도
                let angleDiff = targetAngle - this.angle; // 현재 각도와의 차이

                // 각도 차이 정규화 (-PI ~ PI)
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

                const turnSpeed = 0.03; // 회전 속도
                // 각도 차이가 회전 속도보다 크면 회전
                if (Math.abs(angleDiff) > turnSpeed) {
                    this.angle += Math.sign(angleDiff) * turnSpeed * gameManager.gameSpeed;
                } else { // 작으면 목표 각도로 바로 설정
                    this.angle = targetAngle;
                }
            }
        }

        // 잔상 효과 추가 (일부 투사체)
        if (['hadoken', 'lightning_bolt', 'magic_spear', 'ice_diamond_projectile', 'fireball_projectile', 'mini_fireball_projectile', 'black_sphere_projectile'].some(t => this.type.startsWith(t))) {
            this.trail.push({x: this.pixelX, y: this.pixelY});
            if (this.trail.length > 10) this.trail.shift(); // 최대 10개 유지
        }
        // 회전 애니메이션 (표창, 부메랑, 튕기는 검)
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

        // --- 이동 및 벽 충돌 처리 ---
        const nextX = this.pixelX + Math.cos(this.angle) * gameManager.gameSpeed * this.speed;
        const nextY = this.pixelY + Math.sin(this.angle) * gameManager.gameSpeed * this.speed;
        const gridX = Math.floor(nextX / GRID_SIZE);
        const gridY = Math.floor(nextY / GRID_SIZE);

        // 맵 범위 내에 있는지 확인
        if (gridY >= 0 && gridY < gameManager.ROWS && gridX >= 0 && gridX < gameManager.COLS) {
            const tile = gameManager.map[gridY][gridX];
            // 충돌 가능한 벽인지 확인 (일반 벽, 부서지는 벽, 유리벽)
            const isCollidableWall = tile.type === TILE.WALL || tile.type === TILE.CRACKED_WALL || tile.type === TILE.GLASS_WALL;

            // 특정 투사체(마법창 특수, 검기) 제외하고 벽과 충돌 시 처리
            if (this.type !== 'magic_spear_special' && this.type !== 'sword_wave' && isCollidableWall) {
                // 부서지는 벽이면 벽에 피해
                if (tile.type === TILE.CRACKED_WALL) {
                    gameManager.damageTile(gridX, gridY, 999); // 충분한 피해로 즉시 파괴
                }
                this.destroyed = true; // 투사체 파괴
                return;
            }
        }
        // 충돌하지 않으면 이동
        this.pixelX = nextX; this.pixelY = nextY;
    }

    draw(ctx) {
        // --- 돌아오는 표창 그리기 ---
        if (this.type === 'shuriken' || this.type === 'returning_shuriken') {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.rotationAngle); // 회전 적용
            const scale = 0.8; // 크기 조절
            ctx.scale(scale, scale);
            ctx.fillStyle = '#9ca3af'; // 표창 색상
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2 / scale;

            ctx.beginPath(); // 8각 별 모양
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
            return; // 표창 그리기는 여기서 종료
        }

        // --- 다른 투사체 그리기 ---
        if (this.type === 'arrow') {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.angle); // 각도 적용
            ctx.scale(1.2, 1.2); // 크기 조정

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
        } else if (this.type === 'sword_wave') { // 검기
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.angle - Math.PI / 2); // 날아가는 방향과 수직으로

            ctx.strokeStyle = '#ef4444'; // 붉은색
            ctx.lineWidth = 4;
            ctx.shadowColor = 'rgba(255, 0, 0, 0.7)'; // 빛나는 효과
            ctx.shadowBlur = 10;

            ctx.beginPath();
            ctx.arc(0, 0, GRID_SIZE * 0.7, 0, Math.PI, false); // 반원 모양
            ctx.stroke();

            ctx.restore();
        } else if (this.type === 'bouncing_sword') { // 튕기는 검 (쌍검 특수)
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.rotationAngle); // 회전 적용
            ctx.scale(0.72, 0.72); // 크기 조정

            ctx.fillStyle = '#6b7280'; // 손잡이
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1.5;

            ctx.fillRect(-GRID_SIZE * 0.1, GRID_SIZE * 0.3, GRID_SIZE * 0.2, GRID_SIZE * 0.3);
            ctx.strokeRect(-GRID_SIZE * 0.1, GRID_SIZE * 0.3, GRID_SIZE * 0.2, GRID_SIZE * 0.3);
            ctx.beginPath(); // 손잡이 가드
            ctx.moveTo(-GRID_SIZE * 0.3, GRID_SIZE * 0.3); ctx.lineTo(GRID_SIZE * 0.3, GRID_SIZE * 0.3);
            ctx.lineTo(GRID_SIZE * 0.3, GRID_SIZE * 0.2); ctx.lineTo(-GRID_SIZE * 0.3, GRID_SIZE * 0.2);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            const bladeGradient = ctx.createLinearGradient(0, -GRID_SIZE, 0, 0); // 칼날
            bladeGradient.addColorStop(0, '#f3f4f6'); bladeGradient.addColorStop(0.5, '#9ca3af'); bladeGradient.addColorStop(1, '#d1d5db');
            ctx.fillStyle = bladeGradient;
            ctx.beginPath(); // 곡선 칼날
            ctx.moveTo(0, GRID_SIZE * 0.2);
            ctx.quadraticCurveTo(GRID_SIZE * 0.5, -GRID_SIZE * 0.4, 0, -GRID_SIZE * 0.9);
            ctx.quadraticCurveTo(-GRID_SIZE * 0.1, -GRID_SIZE * 0.4, 0, GRID_SIZE * 0.2);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.restore();
        } else if (this.type === 'hadoken') { // 장풍
            // 잔상 효과
            for (let i = 0; i < this.trail.length; i++) {
                const pos = this.trail[i];
                const alpha = (i / this.trail.length) * 0.5; // 점점 투명하게
                ctx.fillStyle = `rgba(139, 92, 246, ${alpha})`; // 보라색 계열
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, (GRID_SIZE / 2) * (i / this.trail.length), 0, Math.PI * 2); // 점점 작아지게
                ctx.fill();
            }
            // 본체
            ctx.fillStyle = '#c4b5fd'; // 밝은 보라색
            ctx.beginPath();
            ctx.arc(this.pixelX, this.pixelY, GRID_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#8b5cf6'; // 진한 보라색 (중심)
            ctx.beginPath();
            ctx.arc(this.pixelX, this.pixelY, GRID_SIZE / 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'lightning_bolt') { // 번개
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.angle);
            ctx.strokeStyle = '#fef08a'; // 노란색
            ctx.lineWidth = 3;
            ctx.beginPath(); // 지그재그 모양
            ctx.moveTo(-GRID_SIZE * 0.5, 0);
            for(let i = -GRID_SIZE * 0.5; i < GRID_SIZE * 0.5; i += 4) {
                ctx.lineTo(i, (this.gameManager.random() - 0.5) * 4); // 무작위 Y 변동
            }
            ctx.lineTo(GRID_SIZE * 0.5, 0);
            ctx.stroke();
            ctx.restore();
        } else if (this.type.startsWith('magic_spear')) { // 마법창 (일반/특수)
            const isSpecial = this.type === 'magic_spear_special';
            const mainColor = isSpecial ? '#a855f7' : '#111827'; // 특수 공격은 보라색, 일반은 검정
            const trailColor = isSpecial ? 'rgba(192, 132, 252, 0.4)' : 'rgba(107, 114, 128, 0.4)';
            const spearLength = isSpecial ? GRID_SIZE * 1.2 : GRID_SIZE * 1.0;
            const spearWidth = isSpecial ? GRID_SIZE * 0.25 : GRID_SIZE * 0.2;

            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.angle);

            // 잔상 효과
            for (let i = 0; i < this.trail.length; i++) {
                const pos = this.trail[i];
                const alpha = (i / this.trail.length) * 0.3;
                // 잔상 위치를 현재 투사체 기준으로 변환
                const trailX = (pos.x - this.pixelX) * Math.cos(-this.angle) - (pos.y - this.pixelY) * Math.sin(-this.angle);
                const trailY = (pos.x - this.pixelX) * Math.sin(-this.angle) + (pos.y - this.pixelY) * Math.cos(-this.angle);

                ctx.fillStyle = trailColor.replace('0.4', alpha);
                ctx.beginPath();
                ctx.arc(trailX, trailY, (GRID_SIZE / 4) * (i / this.trail.length), 0, Math.PI * 2);
                ctx.fill();
            }

            // 창 본체 (삼각형)
            ctx.fillStyle = mainColor;
            ctx.beginPath();
            ctx.moveTo(spearLength, 0); // 창끝
            ctx.lineTo(0, -spearWidth); // 밑변 왼쪽
            ctx.lineTo(0, spearWidth); // 밑변 오른쪽
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        } else if (this.type === 'boomerang_projectile') { // 부메랑 (특수)
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.rotationAngle); // 회전 적용
            this.owner.weapon.drawBoomerang(ctx, 0.6); // weaponDesigns.js 함수 호출 (크기 조정)
            ctx.restore();
        } else if (this.type === 'boomerang_normal_projectile') { // 부메랑 (일반)
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.rotationAngle); // 회전 적용
            this.owner.weapon.drawBoomerang(ctx, 0.3, 0, '#18181b'); // weaponDesigns.js 함수 호출 (작게, 검정색)
            ctx.restore();
        } else if (this.type === 'ice_diamond_projectile') { // 얼음 다이아 (특수)
            // 잔상 효과
            for (let i = 0; i < this.trail.length; i++) {
                const pos = this.trail[i];
                const alpha = (i / this.trail.length) * 0.5;
                ctx.fillStyle = `rgba(165, 243, 252, ${alpha})`; // 하늘색
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, (GRID_SIZE / 1.67) * (i / this.trail.length), 0, Math.PI * 2);
                ctx.fill();
            }
            // 본체
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.angle);

            const size = GRID_SIZE * 0.6; // 크기
            const grad = ctx.createLinearGradient(-size, -size, size, size); // 그라데이션
            grad.addColorStop(0, '#e0f2fe');
            grad.addColorStop(0.5, '#7dd3fc');
            grad.addColorStop(1, '#0ea5e9');

            ctx.fillStyle = grad;
            ctx.strokeStyle = '#0284c7'; // 테두리
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
        } else if (this.type === 'ice_bolt_projectile') { // 얼음 볼트 (일반)
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY);
            ctx.rotate(this.angle);
            ctx.fillStyle = '#000000'; // 검정색
            ctx.strokeStyle = '#FFFFFF'; // 흰색 테두리
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(0, 0, GRID_SIZE / 4, 0, Math.PI * 2); // 작은 원
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        } else if (this.type === 'fireball_projectile' || this.type === 'mini_fireball_projectile') { // 화염구 (특수, 미니)
            const size = this.type === 'fireball_projectile' ? GRID_SIZE / 1.67 : GRID_SIZE / 4; // 크기 구분
            // 잔상 효과
            for (let i = 0; i < this.trail.length; i++) {
                const pos = this.trail[i];
                const alpha = (i / this.trail.length) * 0.4;
                ctx.fillStyle = `rgba(255, 100, 0, ${alpha})`; // 주황색 계열
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, size * (i / this.trail.length), 0, Math.PI * 2);
                ctx.fill();
            }
            // 본체
            const grad = ctx.createRadialGradient(this.pixelX, this.pixelY, size * 0.2, this.pixelX, this.pixelY, size); // 방사형 그라데이션
            grad.addColorStop(0, '#ffff99'); // 중심은 밝게
            grad.addColorStop(0.6, '#ff9900');
            grad.addColorStop(1, '#ff4500'); // 외곽은 붉게
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(this.pixelX, this.pixelY, size, 0, Math.PI * 2); // 원형
            ctx.fill();
        } else if (this.type === 'black_sphere_projectile') { // 검은 구체 (불 지팡이 일반)
            const size = GRID_SIZE / 3; // 크기
            // 잔상 효과
            for (let i = 0; i < this.trail.length; i++) {
                const pos = this.trail[i];
                const alpha = (i / this.trail.length) * 0.2;
                ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`; // 검정색
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, size * (i / this.trail.length), 0, Math.PI * 2);
                ctx.fill();
            }
            // 본체
            ctx.fillStyle = '#000000'; // 검정색
            ctx.strokeStyle = '#4a5568'; // 회색 테두리
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.pixelX, this.pixelY, size, 0, Math.PI * 2); // 원형
            ctx.fill();
            ctx.stroke();
        }
    }
}

// Effect class (단발성 시각 효과)
export class Effect {
    constructor(gameManager, x, y, type, target, options = {}) {
        this.gameManager = gameManager;
        this.x = x; this.y = y; this.type = type; this.target = target;
        this.duration = 20; // 기본 지속 시간 (프레임)
        this.angle = this.gameManager.random() * Math.PI * 2; // 무작위 각도 (베기 효과 등)

        if (this.type === 'question_mark_effect') { // 물음표 효과
            this.duration = 60; // 더 긴 지속 시간
            this.particles = []; // 파티클 배열
            for (let i = 0; i < 20; i++) { // 파티클 생성
                this.particles.push({
                    x: this.x, y: this.y,
                    angle: this.gameManager.random() * Math.PI * 2,
                    speed: this.gameManager.random() * 2 + 1,
                    radius: this.gameManager.random() * 3 + 1,
                    lifespan: 40,
                });
            }
        } else if (this.type === 'level_up') { // 레벨업 효과
            this.duration = 40; // 지속 시간
        } else if (this.type === 'axe_spin_effect') { // 도끼 회전 효과
             this.duration = 20;
        } else if (this.type === 'chain_lightning') { // 연쇄 번개 효과
             this.duration = 15;
        }
    }
    update() {
        const gameManager = this.gameManager;
        if (!gameManager) return;
        this.duration -= gameManager.gameSpeed; // 지속 시간 감소

        if (this.type === 'question_mark_effect') {
            this.particles.forEach(p => {
                p.x += Math.cos(p.angle) * p.speed; // 파티클 이동
                p.y += Math.sin(p.angle) * p.speed;
                p.lifespan--; // 파티클 수명 감소
            });
            this.particles = this.particles.filter(p => p.lifespan > 0); // 수명 다한 파티클 제거
        }
    }
    draw(ctx) {
        const opacity = this.duration / 20; // 남은 시간에 따른 투명도

        if (this.type === 'slash' || this.type === 'dual_sword_slash') { // 베기 효과
            ctx.save();
            ctx.translate(this.target.pixelX, this.target.pixelY); // 목표 위치로 이동
            ctx.rotate(this.angle); // 무작위 각도 회전
            ctx.strokeStyle = `rgba(220, 38, 38, ${opacity})`; // 붉은색, 투명도 적용
            ctx.lineWidth = this.type === 'slash' ? 3 : 2; // 쌍검은 약간 얇게
            const arcSize = this.type === 'slash' ? GRID_SIZE : GRID_SIZE * 0.7; // 크기
            ctx.beginPath();
            ctx.arc(0, 0, arcSize, -0.5, 0.5); // 짧은 호 모양
            ctx.stroke();
            ctx.restore();
        } else if (this.type === 'chain_lightning') { // 연쇄 번개 효과
            ctx.strokeStyle = `rgba(254, 240, 138, ${opacity})`; // 노란색, 투명도 적용
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y); // 시작점
            ctx.lineTo(this.target.pixelX, this.target.pixelY); // 끝점
            ctx.stroke();
        } else if (this.type === 'question_mark_effect') { // 물음표 효과
            this.particles.forEach(p => { // 파티클 그리기
                ctx.globalAlpha = (p.lifespan / 40) * (this.duration / 60); // 파티클, 효과 수명 둘 다 고려한 투명도
                ctx.fillStyle = '#facc15'; // 노란색
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1.0; // 투명도 복원
        } else if (this.type === 'axe_spin_effect') { // 도끼 회전 효과
            const progress = 1 - (this.duration / 20); // 진행률 (0 -> 1)
            const radius = GRID_SIZE * 3.5 * progress; // 점점 커지는 반지름
            ctx.save();
            ctx.translate(this.x, this.y); // 효과 중심으로 이동
            ctx.strokeStyle = `rgba(220, 38, 38, ${opacity})`; // 붉은색, 투명도 적용
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2); // 원 그리기
            ctx.stroke();
            ctx.restore();
        } else if (this.type === 'level_up') { // 레벨업 효과
            const initialDuration = 40;
            const yOffset = -GRID_SIZE - (initialDuration - this.duration); // 위로 떠오르는 효과
            const opacity = Math.min(1, this.duration / (initialDuration / 2)); // 나타났다가 사라지는 투명도
            ctx.save();
            ctx.translate(this.target.pixelX, this.target.pixelY + yOffset); // 대상 유닛 위로 이동
            ctx.scale(1.05, 1.05); // 약간 크게
            ctx.fillStyle = `rgba(255, 215, 0, ${opacity})`; // 금색, 투명도 적용
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            // ctx.strokeStyle = 'black'; ctx.lineWidth = 2; // 테두리 제거
            // ctx.strokeText('LEVEL UP!', 0, 0);
            ctx.fillText('LEVEL UP!', 0, 0); // 텍스트 그리기
            ctx.restore();
        }
    }
}

// 마법 단검 돌진 효과 클래스
export class MagicDaggerDashEffect {
    constructor(gameManager, startPos, endPos) {
        this.gameManager = gameManager;
        this.startPos = startPos; // 시작 위치
        this.endPos = endPos; // 끝 위치
        this.life = 20; // 수명 (프레임)
        this.initialLife = 20;
    }

    isAlive() {
        return this.life > 0;
    }

    update() {
        this.life--; // 수명 감소
        // 수명이 남아있고 짝수 프레임마다 파티클 생성
        if (this.life > 0 && this.life % 2 === 0) {
            const progress = 1 - (this.life / this.initialLife); // 진행률 (0 -> 1)
            // 현재 위치 계산
            const particleX = this.startPos.x + (this.endPos.x - this.startPos.x) * progress;
            const particleY = this.startPos.y + (this.endPos.y - this.startPos.y) * progress;

            // 잔상 파티클 생성
            this.gameManager.addParticle({
                x: particleX,
                y: particleY,
                vx: (this.gameManager.random() - 0.5) * 2, // 무작위 방향
                vy: (this.gameManager.random() - 0.5) * 2,
                life: 0.5, // 짧은 수명
                color: '#ffffff', // 흰색
                size: this.gameManager.random() * 2 + 1, // 무작위 크기
            });
        }
    }

    draw(ctx) {
        const opacity = this.life / this.initialLife; // 남은 수명에 따른 투명도

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = '#ffffff'; // 흰색 선
        ctx.lineWidth = 4;
        ctx.shadowColor = '#d8b4fe'; // 연보라색 빛 효과
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.moveTo(this.startPos.x, this.startPos.y); // 시작점에서
        ctx.lineTo(this.endPos.x, this.endPos.y); // 끝점까지 선 그리기
        ctx.stroke();

        ctx.restore();
    }
}

// AreaEffect class (장판형 효과 - 화염 기둥, 독안개 등)
export class AreaEffect {
    constructor(gameManager, x, y, type, options = {}) {
        this.gameManager = gameManager;
        this.pixelX = x; this.pixelY = y; this.type = type;
        this.duration = 30; // 기본 지속 시간 (프레임)
        this.maxRadius = GRID_SIZE * 2.5; // 최대 반지름
        this.currentRadius = 0; // 현재 반지름 (화염 기둥)
        this.damage = options.damage || 0; // 피해량
        this.ownerTeam = options.ownerTeam || null; // 시전자 팀
        this.particles = []; // 파티클 배열 (화염 기둥)
        this.damagedUnits = new Set(); // 이미 피해 입은 유닛 집합
        this.damagedNexuses = new Set(); // 이미 피해 입은 넥서스 집합

        if (this.type === 'fire_pillar') { // 화염 기둥 초기화
            for (let i = 0; i < 50; i++) { // 파티클 생성
                this.particles.push({
                    x: (this.gameManager.random() - 0.5) * this.maxRadius * 1.5, // 무작위 x 위치
                    y: (this.gameManager.random() - 0.5) * this.maxRadius * 0.5, // 무작위 y 위치
                    size: this.gameManager.random() * 4 + 2, // 무작위 크기
                    speed: this.gameManager.random() * 1.5 + 1, // 무작위 상승 속도
                    lifespan: this.gameManager.random() * 20 + 10, // 무작위 수명
                    color: ['#ffcc00', '#ff9900', '#ff6600', '#ef4444'][Math.floor(this.gameManager.random() * 4)] // 무작위 불꽃색
                });
            }
        }
    }
    update() {
        const gameManager = this.gameManager;
        if (!gameManager) return;
        this.duration -= gameManager.gameSpeed; // 지속 시간 감소
        // 화염 기둥 반지름 증가 (0 -> maxRadius)
        this.currentRadius = this.maxRadius * (1 - (this.duration / 30));

        if (this.type === 'fire_pillar') {
            // 파티클 업데이트
            this.particles.forEach(p => {
                p.y -= p.speed * gameManager.gameSpeed; // 위로 이동
                p.lifespan -= gameManager.gameSpeed; // 수명 감소
                p.x += (this.gameManager.random() - 0.5) * 0.5; // 좌우 흔들림
            });
            this.particles = this.particles.filter(p => p.lifespan > 0); // 수명 다한 파티클 제거

            // 범위 내 적 유닛에게 피해 (한 번만)
            gameManager.units.forEach(unit => {
                if (unit.team !== this.ownerTeam && !this.damagedUnits.has(unit)) {
                    const dist = Math.hypot(unit.pixelX - this.pixelX, unit.pixelY - this.pixelY);
                    if (dist < this.currentRadius) {
                        unit.takeDamage(this.damage, {}, this.gameManager.units.find(u => u.team === this.ownerTeam)); // 시전자 정보 전달
                        this.damagedUnits.add(unit);
                    }
                }
            });

            // 범위 내 적 넥서스에게 피해 (한 번만)
            gameManager.nexuses.forEach(nexus => {
                if (nexus.team !== this.ownerTeam && !this.damagedNexuses.has(nexus)) {
                    const dist = Math.hypot(nexus.pixelX - this.pixelX, nexus.pixelY - this.pixelY);
                    if (dist < this.currentRadius) {
                        nexus.takeDamage(this.damage); // 넥서스는 시전자 정보 필요 없음
                        this.damagedNexuses.add(nexus);
                    }
                }
            });
        }
    }
    draw(ctx) {
        const opacity = this.duration / 30; // 남은 시간에 따른 투명도
        if (this.type === 'fire_pillar') { // 화염 기둥 그리기
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY); // 효과 중심으로 이동

            // 바닥 원 그라데이션
            const grad = ctx.createRadialGradient(0, 0, this.currentRadius * 0.3, 0, 0, this.currentRadius);
            grad.addColorStop(0, `rgba(255, 100, 0, ${opacity * 0.4})`);
            grad.addColorStop(0.6, `rgba(255, 0, 0, ${opacity * 0.3})`);
            grad.addColorStop(1, `rgba(200, 0, 0, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, this.currentRadius, 0, Math.PI * 2);
            ctx.fill();

            // 파티클 그리기
            this.particles.forEach(p => {
                ctx.globalAlpha = (p.lifespan / 20) * opacity; // 파티클 수명, 효과 수명 둘 다 고려
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.restore();
            ctx.globalAlpha = 1.0; // 투명도 복원

        } else if (this.type === 'poison_cloud') { // 독안개 그리기 (단순 사각형)
            ctx.fillStyle = `rgba(132, 204, 22, ${opacity * 0.4})`; // 녹색, 투명도 적용
            ctx.fillRect(this.pixelX - GRID_SIZE * 2.5, this.pixelY - GRID_SIZE * 2.5, GRID_SIZE * 5, GRID_SIZE * 5); // 고정 크기
        }
    }
}
