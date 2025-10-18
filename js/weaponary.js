// js/weaponary.js

import { TEAM, COLORS, DEEP_COLORS, GRID_SIZE, TILE } from './constants.js';
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
import { Assets } from './assets.js';
import { Unit } from './unit.js';
import { Nexus } from './entities.js';


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

        // 근접 공격 애니메이션 트리거 무기 목록 확장
        if (['sword', 'dual_swords', 'boomerang', 'poison_potion', 'magic_dagger', 'axe'].includes(this.type)) {
            unit.attackAnimationTimer = 15;
        }

        if (this.type === 'sword') {
            unit.attackCount++;
            target.takeDamage(unit.attackPower, {}, unit);
            gameManager.createEffect('slash', unit.pixelX, unit.pixelY, target);
            gameManager.audioManager.play('swordHit');
            unit.attackCooldown = unit.cooldownTime;

            if (unit.attackCount >= 3) { // 3타 특수 공격
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

            if (unit.attackCount >= 3) { // 3타 특수 공격
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
            target.takeDamage(unit.attackPower, {}, unit);
            gameManager.createEffect('slash', unit.pixelX, unit.pixelY, target);
            gameManager.audioManager.play('magicdagger');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'dual_swords') {
            target.takeDamage(unit.attackPower, {}, unit);
            gameManager.createEffect('dual_sword_slash', unit.pixelX, unit.pixelY, target);
            gameManager.audioManager.play('dualSwordHit');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'axe') {
            target.takeDamage(unit.attackPower, {}, unit);
            gameManager.createEffect('slash', unit.pixelX, unit.pixelY, target);
            gameManager.audioManager.play('axe');
            unit.attackCooldown = unit.cooldownTime;
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
            gameManager.createProjectile(unit, target, 'black_sphere_projectile');
            gameManager.audioManager.play('punch');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'shuriken') {
            if (unit.shurikenSkillCooldown <= 0) {
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
                unit.shurikenSkillCooldown = 480;
                gameManager.audioManager.play('shurikenShoot');
            } else {
                gameManager.createProjectile(unit, target, 'shuriken');
                gameManager.audioManager.play('shurikenShoot');
            }
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'hadoken') {
            gameManager.createProjectile(unit, target, 'hadoken');
            gameManager.audioManager.play('hadokenShoot');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'lightning') {
            gameManager.createProjectile(unit, target, 'lightning_bolt', { initialTarget: target });
            gameManager.audioManager.play('electricity');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'magic_spear') {
            gameManager.createProjectile(unit, target, 'magic_spear_normal');
            gameManager.audioManager.play('punch');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'boomerang') {
            gameManager.createProjectile(unit, target, 'boomerang_normal_projectile');
            gameManager.audioManager.play('boomerang');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'poison_potion') {
            target.takeDamage(15, { poison: { damage: 0.2 + (unit.specialAttackLevelBonus * 0.02) } }, unit);
            gameManager.audioManager.play('poison');
            unit.attackCooldown = unit.cooldownTime;
        }
    }

    // --- 무기 디자인 그리는 함수들 ---
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
        let baseScale = 0.8;
        if (this.type === 'crown') baseScale = 1.0;
        else if (['lightning', 'magic_spear', 'poison_potion'].includes(this.type)) baseScale = 0.6;
        else if (this.type === 'boomerang') baseScale = 0.49;
        else if (this.type === 'magic_dagger') baseScale = 0.8;
        else if (this.type === 'axe') baseScale = 0.8;
        else if (this.type === 'ice_diamond') baseScale = 0.8;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(baseScale, baseScale);

        if (this.type !== 'magic_dagger') {
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1 / baseScale;
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
            ctx.fillStyle = '#374151';
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.4, GRID_SIZE * 0.3); ctx.lineTo(GRID_SIZE * 0.4, GRID_SIZE * 0.3);
            ctx.lineTo(GRID_SIZE * 0.5, GRID_SIZE * 0.3 + 3); ctx.lineTo(-GRID_SIZE * 0.5, GRID_SIZE * 0.3 + 3);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(-1.5, GRID_SIZE * 0.3 + 3, 3, GRID_SIZE * 0.3); ctx.strokeRect(-1.5, GRID_SIZE * 0.3 + 3, 3, GRID_SIZE * 0.3);
        } else if (this.type === 'bow') {
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#f3f4f6';
            ctx.fillRect(-GRID_SIZE * 0.7, -1, GRID_SIZE * 1.2, 2);
            ctx.strokeRect(-GRID_SIZE * 0.7, -1, GRID_SIZE * 1.2, 2);
            ctx.fillStyle = '#e5e7eb';
            ctx.beginPath(); ctx.moveTo(GRID_SIZE * 0.5, 0); ctx.lineTo(GRID_SIZE * 0.3, -3); ctx.lineTo(GRID_SIZE * 0.3, 3); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#d1d5db';
            ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.6, -1); ctx.lineTo(-GRID_SIZE * 0.7, -4); ctx.lineTo(-GRID_SIZE * 0.5, -1); ctx.closePath(); ctx.fill()
            ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.6, 1); ctx.lineTo(-GRID_SIZE * 0.7, 4); ctx.lineTo(-GRID_SIZE * 0.5, 1); ctx.closePath(); ctx.fill()
            ctx.strokeStyle = 'black'; ctx.lineWidth = 6 / baseScale; ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.8, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke();
            ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 4 / baseScale; ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.8, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke();
            ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1.5 / baseScale; ctx.beginPath();
            const arcRadius = GRID_SIZE * 0.8, arcAngle = Math.PI / 2.2;
            ctx.moveTo(Math.cos(-arcAngle) * arcRadius, Math.sin(-arcAngle) * arcRadius);
            ctx.lineTo(-GRID_SIZE * 0.4, 0);
            ctx.lineTo(Math.cos(arcAngle) * arcRadius, Math.sin(arcAngle) * arcRadius); ctx.stroke();
        } else if (this.type === 'dual_swords') {
            const drawCurvedSword = (rotation) => {
                ctx.save();
                ctx.rotate(rotation);
                ctx.fillStyle = '#6b7280';
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
            };
            drawCurvedSword(-Math.PI / 4);
            drawCurvedSword(Math.PI / 4);
        } else if (this.type === 'fire_staff') {
            this.drawStaff(ctx, baseScale);
        } else if (this.type === 'lightning') {
            this.drawLightning(ctx, 1.0, Math.PI / 4);
        } else if (this.type === 'magic_spear') {
            this.drawMagicSpear(ctx, 0.8, -Math.PI / 8);
        } else if (this.type === 'boomerang') {
            this.drawBoomerang(ctx, 1.0, -Math.PI / 6);
        } else if (this.type === 'poison_potion') {
            this.drawPoisonPotion(ctx, baseScale);
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
            const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, GRID_SIZE * 1.2);
            grad.addColorStop(0, '#bfdbfe');
            grad.addColorStop(0.6, '#3b82f6');
            grad.addColorStop(1, '#1e40af');
            ctx.fillStyle = grad;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1.5 / baseScale;
            ctx.beginPath();
            ctx.arc(-GRID_SIZE * 0.2, 0, GRID_SIZE * 0.6, Math.PI / 2, -Math.PI / 2, false);
            ctx.lineTo(GRID_SIZE * 0.8, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'shuriken') {
            ctx.rotate(Math.PI / 4);
            ctx.fillStyle = '#9ca3af';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2 / baseScale;

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
        } else if (this.type === 'crown') {
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
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

        ctx.save(); // 전체 상태 저장 (빛 효과, 변환 등)

        // --- 특수 공격 준비 상태 확인 ---
        let isSpecialReady = false;
        const weaponType = this.type;
        const attackCountNeeded = 2; // 3타째

        // [수정] 3타 검/활 및 충전 무기 준비 상태 확인
        if ((weaponType === 'sword' || weaponType === 'bow') && unit.attackCount >= attackCountNeeded) {
            isSpecialReady = true;
        } else if (weaponType === 'axe' && unit.axeSkillCooldown <= 0) {
            isSpecialReady = true;
        } else if (weaponType === 'fire_staff' && unit.fireStaffSpecialCooldown <= 0) {
            isSpecialReady = true;
        } else if (weaponType === 'boomerang' && unit.boomerangCooldown <= 0) {
            isSpecialReady = true;
        } else if (weaponType === 'shuriken' && unit.shurikenSkillCooldown <= 0) {
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

        // --- 빛나는 효과 설정 ---
        if (isSpecialReady) {
            let glowColor = COLORS[`TEAM_${unit.team}`] || DEEP_COLORS[`TEAM_${unit.team}`] || '#FFFFFF';
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 15;
        }

        // --- 기본 변환 설정 (위치, 각성 스케일) ---
        const scale = 1 + (unit.awakeningEffect?.stacks || 0) * 0.2;
        ctx.translate(unit.pixelX, unit.pixelY); // 유닛 위치로 이동
        ctx.scale(scale, scale); // 각성 스케일 적용

        // --- 무기 회전 계산 ---
        let rotation = unit.facingAngle; // 기본 방향
        // 공격 애니메이션
        if (this.type !== 'bow' && unit.attackAnimationTimer > 0) {
            const swingProgress = Math.sin((15 - unit.attackAnimationTimer) / 15 * Math.PI);
            rotation += swingProgress * Math.PI / 4;
        }
        // 도끼 회전
        if (this.type === 'axe' && unit.spinAnimationTimer > 0) {
            rotation += ((30 - unit.spinAnimationTimer) / 30) * Math.PI * 2;
        }
        // 검 회전 (특수 공격)
        if (this.type === 'sword' && unit.swordSpecialAttackAnimationTimer > 0) {
            rotation += ((30 - unit.swordSpecialAttackAnimationTimer) / 30) * Math.PI * 2;
        }
        // 쌍검 회전
        if (this.type === 'dual_swords' && unit.dualSwordSpinAttackTimer > 0) {
            const spinProgress = (20 - unit.dualSwordSpinAttackTimer) / 20;
            rotation += spinProgress * Math.PI * 4;
        }

        // --- 무기별 그리기 로직 (각 무기별로 save/restore) ---
        // 번개와 얼음 다이아는 유닛 방향과 별개로 그려지므로, 먼저 회전 적용 안 함
        if (this.type !== 'lightning' && this.type !== 'ice_diamond') {
             ctx.rotate(rotation);
        }

        // [추가] 각 무기 테두리 그리기 함수
        const drawOutlineIfNeeded = () => {
            if (!isSpecialReady) return; // 특수 공격 준비 상태일 때만 그림

            ctx.save(); // 테두리 그리기를 위한 상태 저장
            ctx.strokeStyle = COLORS[`TEAM_${unit.team}`] || DEEP_COLORS[`TEAM_${unit.team}`] || '#FFFFFF'; // 팀 색상으로 테두리
            ctx.lineWidth = 2.5 / scale; // 테두리 두께 (스케일 고려)
            ctx.shadowColor = 'transparent'; // 테두리 자체에는 그림자 없앰
            ctx.shadowBlur = 0;

            // 각 무기별 외곽선만 그림 (stroke 사용)
            // fill을 사용하는 로직은 제외하고 stroke만 호출
            // 주의: 각 무기 그리기 함수 내부 구조를 알아야 정확히 외곽선만 그릴 수 있음
            if (this.type === 'sword') {
                // Blade Outline
                ctx.beginPath();
                ctx.moveTo(-2, GRID_SIZE * 0.3); ctx.lineTo(-2, -GRID_SIZE * 1.0);
                ctx.lineTo(0, -GRID_SIZE * 1.2); ctx.lineTo(2, -GRID_SIZE * 1.0);
                ctx.lineTo(2, GRID_SIZE * 0.3);
                ctx.closePath(); ctx.stroke(); // fill 대신 stroke
                // Guard Outline
                ctx.beginPath();
                ctx.moveTo(-GRID_SIZE * 0.2, GRID_SIZE * 0.3); ctx.lineTo(GRID_SIZE * 0.2, GRID_SIZE * 0.3);
                ctx.lineTo(GRID_SIZE * 0.25, GRID_SIZE * 0.3 + 3); ctx.lineTo(-GRID_SIZE * 0.25, GRID_SIZE * 0.3 + 3);
                ctx.closePath(); ctx.stroke(); // fill 대신 stroke
                // Handle Outline
                ctx.strokeRect(-1.5, GRID_SIZE * 0.3 + 3, 3, GRID_SIZE * 0.3); // fillRect 대신 strokeRect
            } else if (this.type === 'bow') {
                // 활은 구조가 복잡하여 외곽선 그리기가 어려움. 빛 효과로 대체하거나,
                // drawEquipped 내부의 그리기 코드를 복사하여 stroke()로 변경해야 함.
                // 여기서는 간단하게 활대 부분만 외곽선 추가
                const bowScale = 0.56;
                ctx.lineWidth = 4 / bowScale / scale; // 테두리 두께 조정
                ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.8, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke();
                // 활 시위는 그리지 않음 (선택 사항)

            } else if (this.type === 'magic_dagger') {
                 // drawMagicDaggerIcon 내부 로직을 stroke() 버전으로 구현
                 const mdScale = GRID_SIZE * 0.1;
                 // Handle Outline
                 const handleWidth = 2.5 * mdScale;
                 const handleHeight = 9 * mdScale;
                 ctx.strokeRect(-handleWidth / 2, 0, handleWidth, handleHeight);
                 // Guard Outline
                 const guardWidth = 5 * mdScale;
                 const guardHeight = 1.6 * mdScale;
                 const guardY = -guardHeight / 2;
                 ctx.strokeRect(-guardWidth / 2, guardY, guardWidth, guardHeight);
                 // Blade Outline
                 ctx.beginPath();
                 ctx.moveTo(-guardWidth / 2, guardY);
                 ctx.lineTo(1.5 * mdScale, -11 * mdScale);
                 ctx.quadraticCurveTo(3 * mdScale, -5 * mdScale, guardWidth / 2, guardY);
                 ctx.closePath(); ctx.stroke();

            } else if (this.type === 'axe') {
                // drawAxeIcon 내부 로직을 stroke() 버전으로 구현
                const axeScale = GRID_SIZE * 0.08;
                 // Handle Outline
                 const handleWidth = 2.5 * axeScale;
                 const handleHeight = 18 * axeScale;
                 ctx.strokeRect(-handleWidth / 2, -5 * axeScale, handleWidth, handleHeight);
                 // Blade Outline
                ctx.beginPath();
                ctx.moveTo(0, -6 * axeScale); ctx.quadraticCurveTo(-16 * axeScale, 0, 0, 6 * axeScale);
                ctx.quadraticCurveTo(-7 * axeScale, 0, 0, -6 * axeScale); ctx.closePath(); ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, -6 * axeScale); ctx.quadraticCurveTo(16 * axeScale, 0, 0, 6 * axeScale);
                ctx.quadraticCurveTo(7 * axeScale, 0, 0, -6 * axeScale); ctx.closePath(); ctx.stroke();

            } else if (this.type === 'dual_swords') {
                 // drawEquippedCurvedSword 로직을 stroke 버전으로 구현
                 const drawOutlineCurvedSword = (isRightHand) => {
                     ctx.save();
                     const yOffset = isRightHand ? GRID_SIZE * 0.6 : -GRID_SIZE * 0.6;
                     const swordRotation = isRightHand ? Math.PI / 8 : -Math.PI / 8;
                     ctx.translate(GRID_SIZE * 0.1, yOffset);
                     ctx.rotate(swordRotation);
                     // 핸들/가드/블레이드 외곽선 그리기 (stroke 사용)
                     ctx.strokeRect(-GRID_SIZE * 0.05, 0, GRID_SIZE * 0.1, GRID_SIZE * 0.2); // Handle
                     ctx.beginPath(); // Guard
                     ctx.moveTo(-GRID_SIZE * 0.2, 0); ctx.lineTo(GRID_SIZE * 0.2, 0);
                     ctx.lineTo(GRID_SIZE * 0.2, -GRID_SIZE * 0.05); ctx.lineTo(-GRID_SIZE * 0.2, -GRID_SIZE * 0.05);
                     ctx.closePath(); ctx.stroke();
                     ctx.beginPath(); // Blade
                     ctx.moveTo(0, -GRID_SIZE * 0.05);
                     ctx.quadraticCurveTo(GRID_SIZE * 0.4, -GRID_SIZE * 0.3, 0, -GRID_SIZE * 0.8);
                     ctx.quadraticCurveTo(-GRID_SIZE * 0.1, -GRID_SIZE * 0.3, 0, -GRID_SIZE * 0.05);
                     ctx.closePath(); ctx.stroke();
                     ctx.restore();
                 };
                 drawOutlineCurvedSword(true);
                 drawOutlineCurvedSword(false);
            } else if (this.type === 'fire_staff') {
                 // drawStaff 내부 로직 stroke 버전
                const staffScale = 0.8;
                ctx.lineWidth = 3 / scale / staffScale; // 샤프트 두께
                ctx.beginPath(); ctx.moveTo(0, GRID_SIZE * 1.2 * staffScale); ctx.lineTo(0, -GRID_SIZE * 0.8 * staffScale); ctx.stroke(); // Shaft
                ctx.lineWidth = 2 / scale / staffScale; // 보석 홀더/보석 두께
                ctx.beginPath(); ctx.arc(0, -GRID_SIZE * 0.8 * staffScale, GRID_SIZE * 0.4 * staffScale, 0, Math.PI * 2); ctx.stroke(); // Orb holder
                ctx.beginPath(); ctx.arc(0, -GRID_SIZE * 0.8 * staffScale, GRID_SIZE * 0.35 * staffScale, 0, Math.PI * 2); ctx.stroke(); // Orb

            } else if (this.type === 'lightning') {
                // 번개는 형태가 불규칙하여 외곽선 효과를 주기 어려움. 빛 효과로 대체.
                // 필요하다면 drawLightning 함수를 복사하여 stroke 버전으로 수정해야 함.
            } else if (this.type === 'ice_diamond') {
                 // drawIceDiamondIcon 내부 로직 stroke 버전
                const diamondScale = 0.6;
                const size = GRID_SIZE * 0.8;
                ctx.lineWidth = 2 / scale / diamondScale; // 다이아몬드 테두리 두께
                ctx.beginPath();
                ctx.moveTo(0, -size); ctx.lineTo(size * 0.7, 0); ctx.lineTo(0, size);
                ctx.lineTo(-size * 0.7, 0); ctx.closePath(); ctx.stroke();
                // 주변 도는 오브젝트는 테두리 생략

            } else if (this.type === 'magic_spear') {
                // drawMagicSpear 내부 로직 stroke 버전
                const spearScale = 0.5;
                ctx.lineWidth = 1.5 / scale / spearScale; // 샤프트 두께
                const shaftLength = GRID_SIZE * 2.5; const shaftWidth = GRID_SIZE * 0.15;
                ctx.strokeRect(-shaftLength / 2, -shaftWidth, shaftLength, shaftWidth * 2); // Shaft
                ctx.lineWidth = 2 / scale / spearScale; // 창날/보석 두께
                const headLength = GRID_SIZE * 0.8; const headWidth = GRID_SIZE * 0.4; const headBaseX = shaftLength / 2;
                ctx.beginPath(); // Head
                ctx.moveTo(headBaseX, -headWidth); ctx.lineTo(headBaseX + headLength, 0); ctx.lineTo(headBaseX, headWidth);
                ctx.quadraticCurveTo(headBaseX - headLength * 0.2, 0, headBaseX, -headWidth); ctx.closePath(); ctx.stroke();
                const gemX = -GRID_SIZE * 0.4; const gemRadius = GRID_SIZE * 0.25;
                ctx.beginPath(); ctx.arc(gemX, 0, gemRadius, 0, Math.PI * 2); ctx.stroke(); // Gem

            } else if (this.type === 'boomerang') {
                // drawBoomerang 내부 로직 stroke 버전
                const boomerangScale = 0.5;
                 ctx.lineWidth = 2 / scale / boomerangScale; // 부메랑 테두리 두께
                 ctx.lineJoin = 'round'; ctx.lineCap = 'round';
                 ctx.beginPath();
                 ctx.moveTo(0, GRID_SIZE * 0.6); ctx.lineTo(-GRID_SIZE * 1.2, -GRID_SIZE * 0.5);
                 ctx.quadraticCurveTo(-GRID_SIZE * 1.3, -GRID_SIZE * 0.6, -GRID_SIZE * 1.1, -GRID_SIZE * 0.7);
                 ctx.lineTo(0, -GRID_SIZE * 0.2); ctx.lineTo(GRID_SIZE * 1.1, -GRID_SIZE * 0.7);
                 ctx.quadraticCurveTo(GRID_SIZE * 1.3, -GRID_SIZE * 0.6, GRID_SIZE * 1.2, -GRID_SIZE * 0.5);
                 ctx.closePath(); ctx.stroke();

            } else if (this.type === 'poison_potion') {
                 // drawPoisonPotion 내부 로직 stroke 버전
                 const potionScale = 0.3;
                 ctx.lineWidth = 3 / scale / potionScale; // 포션 병 테두리 두께
                 ctx.beginPath(); ctx.arc(0, GRID_SIZE * 0.2, GRID_SIZE * 1, 0, Math.PI * 2); ctx.stroke(); // Bottle body
                 ctx.beginPath(); // Bottle neck
                 ctx.moveTo(-GRID_SIZE * 0.5, -GRID_SIZE * 0.5); ctx.lineTo(-GRID_SIZE * 0.5, -GRID_SIZE * 1.2);
                 ctx.lineTo(GRID_SIZE * 0.5, -GRID_SIZE * 1.2); ctx.lineTo(GRID_SIZE * 0.5, -GRID_SIZE * 0.5);
                 ctx.stroke();
                 ctx.strokeRect(-GRID_SIZE * 0.6, -GRID_SIZE * 1.5, GRID_SIZE * 1.2, GRID_SIZE * 0.3); // Lid base
                 ctx.beginPath(); ctx.ellipse(0, -GRID_SIZE * 1.6, GRID_SIZE * 0.5, GRID_SIZE * 0.2, 0, 0, Math.PI * 2); ctx.stroke(); // Cork

            } else if (this.type === 'hadoken') {
                 // 장풍은 발사체이므로 장착 시 외곽선 표시 안 함 (선택 사항)
            } else if (this.type === 'shuriken') {
                 // 표창 외곽선
                 const shurikenScale = 0.5;
                 ctx.lineWidth = 2 / scale / shurikenScale; // 표창 테두리 두께
                 ctx.beginPath();
                 ctx.moveTo(0, -GRID_SIZE * 0.8); ctx.lineTo(GRID_SIZE * 0.2, -GRID_SIZE * 0.2);
                 ctx.lineTo(GRID_SIZE * 0.8, 0); ctx.lineTo(GRID_SIZE * 0.2, GRID_SIZE * 0.2);
                 ctx.lineTo(0, GRID_SIZE * 0.8); ctx.lineTo(-GRID_SIZE * 0.2, GRID_SIZE * 0.2);
                 ctx.lineTo(-GRID_SIZE * 0.8, 0); ctx.lineTo(-GRID_SIZE * 0.2, -GRID_SIZE * 0.2);
                 ctx.closePath(); ctx.stroke();
                 ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.2, 0, Math.PI * 2); ctx.stroke(); // Center circle
            }
            // 다른 무기 타입에 대한 외곽선 그리기 로직 추가...
            ctx.restore(); // 테두리 그리기 상태 복원
        };

        // --- 각 무기 타입별 그리기 ---
        if (this.type === 'sword') {
            ctx.save(); // 검 그리기 상태 저장
            ctx.translate(GRID_SIZE * 0.5, 0);
            ctx.rotate(Math.PI / 4);
            drawOutlineIfNeeded(); // [호출] 테두리 먼저 그리기

            const bladeGradient = ctx.createLinearGradient(0, -GRID_SIZE, 0, 0);
            bladeGradient.addColorStop(0, '#f3f4f6'); bladeGradient.addColorStop(1, '#9ca3af');
            ctx.fillStyle = bladeGradient; ctx.strokeStyle = 'black'; ctx.lineWidth = 1 / scale; // 원래 검은 테두리 두께 복원
            ctx.beginPath();
            ctx.moveTo(-2, GRID_SIZE * 0.3); ctx.lineTo(-2, -GRID_SIZE * 1.0); ctx.lineTo(0, -GRID_SIZE * 1.2);
            ctx.lineTo(2, -GRID_SIZE * 1.0); ctx.lineTo(2, GRID_SIZE * 0.3); ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#374151';
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.2, GRID_SIZE * 0.3); ctx.lineTo(GRID_SIZE * 0.2, GRID_SIZE * 0.3);
            ctx.lineTo(GRID_SIZE * 0.25, GRID_SIZE * 0.3 + 3); ctx.lineTo(-GRID_SIZE * 0.25, GRID_SIZE * 0.3 + 3);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(-1.5, GRID_SIZE * 0.3 + 3, 3, GRID_SIZE * 0.3);
            ctx.strokeRect(-1.5, GRID_SIZE * 0.3 + 3, 3, GRID_SIZE * 0.3);
            ctx.restore(); // 검 그리기 상태 복원
        } else if (this.type === 'magic_dagger') {
            ctx.save();
            ctx.translate(-GRID_SIZE * 0.4, 0); ctx.scale(0.7, 0.7); ctx.rotate(-Math.PI / 8);
            drawOutlineIfNeeded(); // [호출] 테두리
            drawMagicDaggerIcon(ctx); // 실제 단검 그리기
            ctx.restore();
        } else if (this.type === 'axe') {
            ctx.save();
            ctx.translate(GRID_SIZE * 0.8, -GRID_SIZE * 0.7); ctx.rotate(Math.PI / 4); ctx.scale(0.8, 0.8);
            drawOutlineIfNeeded(); // [호출] 테두리
            drawAxeIcon(ctx); // 실제 도끼 그리기
            ctx.restore();
        } else if (this.type === 'bow') {
            ctx.save();
            ctx.translate(GRID_SIZE * 0.4, 0); ctx.rotate(-Math.PI / 4);
            const bowScale = 0.56; ctx.scale(bowScale, bowScale);
            drawOutlineIfNeeded(); // [호출] 테두리 (활대는 그림)

            // 실제 활 그리기
            ctx.fillStyle = '#f3f4f6'; ctx.strokeStyle = 'black'; ctx.lineWidth = 1 / bowScale / scale; // 원래 검은 테두리 복원
            ctx.fillRect(-GRID_SIZE * 0.7, -1, GRID_SIZE * 1.2, 2); ctx.strokeRect(-GRID_SIZE * 0.7, -1, GRID_SIZE * 1.2, 2);
            ctx.fillStyle = '#e5e7eb'; ctx.beginPath(); ctx.moveTo(GRID_SIZE * 0.5, 0); ctx.lineTo(GRID_SIZE * 0.3, -3); ctx.lineTo(GRID_SIZE * 0.3, 3); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#d1d5db'; ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.6, -1); ctx.lineTo(-GRID_SIZE * 0.7, -4); ctx.lineTo(-GRID_SIZE * 0.5, -1); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.6, 1); ctx.lineTo(-GRID_SIZE * 0.7, 4); ctx.lineTo(-GRID_SIZE * 0.5, 1); ctx.closePath(); ctx.fill();
            // 활대 그리기 (검은색 -> 갈색)
            ctx.strokeStyle = 'black'; ctx.lineWidth = 6 / bowScale; ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.8, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke();
            ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 4 / bowScale; ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.8, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke();
            // 활 시위 그리기
            ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1.5 / bowScale; ctx.beginPath();
            const arcRadius = GRID_SIZE * 0.8, arcAngle = Math.PI / 2.2; const bowstringY1 = Math.sin(-arcAngle) * arcRadius;
            const bowstringY2 = Math.sin(arcAngle) * arcRadius; const bowstringX = Math.cos(arcAngle) * arcRadius;
            let pullBack = -GRID_SIZE * 0.4;
            if (unit.attackAnimationTimer > 0) { const pullProgress = Math.sin((15 - unit.attackAnimationTimer) / 15 * Math.PI); pullBack -= pullProgress * GRID_SIZE * 0.5; }
            ctx.moveTo(bowstringX, bowstringY1); ctx.lineTo(pullBack, 0); ctx.lineTo(bowstringX, bowstringY2); ctx.stroke();
            ctx.restore();
        } else if (this.type === 'dual_swords') {
            ctx.save(); // 쌍검 전체 상태 저장
            // 테두리 먼저 그리기 (좌표 변환 전에)
            drawOutlineIfNeeded(); // [호출] 테두리

            // 실제 쌍검 그리기
            const drawEquippedCurvedSword = (isRightHand) => {
                ctx.save();
                const yOffset = isRightHand ? GRID_SIZE * 0.6 : -GRID_SIZE * 0.6; const swordRotation = isRightHand ? Math.PI / 8 : -Math.PI / 8;
                ctx.translate(GRID_SIZE * 0.1, yOffset); ctx.rotate(swordRotation);
                ctx.fillStyle = '#374151'; ctx.strokeStyle = 'black'; ctx.lineWidth = 1 / scale; // 원래 검은 테두리
                ctx.fillRect(-GRID_SIZE * 0.05, 0, GRID_SIZE * 0.1, GRID_SIZE * 0.2); ctx.strokeRect(-GRID_SIZE * 0.05, 0, GRID_SIZE * 0.1, GRID_SIZE * 0.2);
                ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.2, 0); ctx.lineTo(GRID_SIZE * 0.2, 0); ctx.lineTo(GRID_SIZE * 0.2, -GRID_SIZE * 0.05); ctx.lineTo(-GRID_SIZE * 0.2, -GRID_SIZE * 0.05); ctx.closePath(); ctx.fill(); ctx.stroke();
                const bladeGradient = ctx.createLinearGradient(0, -GRID_SIZE*0.8, 0, 0); bladeGradient.addColorStop(0, '#f3f4f6'); bladeGradient.addColorStop(0.5, '#9ca3af'); bladeGradient.addColorStop(1, '#4b5563');
                ctx.fillStyle = bladeGradient; ctx.beginPath(); ctx.moveTo(0, -GRID_SIZE * 0.05);
                ctx.quadraticCurveTo(GRID_SIZE * 0.4, -GRID_SIZE * 0.3, 0, -GRID_SIZE * 0.8); ctx.quadraticCurveTo(-GRID_SIZE * 0.1, -GRID_SIZE * 0.3, 0, -GRID_SIZE * 0.05);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.restore();
            };
            drawEquippedCurvedSword(true);
            drawEquippedCurvedSword(false);
            ctx.restore(); // 쌍검 전체 상태 복원
        } else if (this.type === 'fire_staff') {
            ctx.save();
            drawOutlineIfNeeded(); // [호출] 테두리
            this.drawStaff(ctx, 0.8); // 실제 지팡이 그리기
            ctx.restore();
        } else if (this.type === 'lightning') {
            const revolutionAngle = gameManager.animationFrameCounter * 0.05; const orbitRadius = GRID_SIZE * 0.8;
            const weaponX = Math.cos(revolutionAngle) * orbitRadius; const weaponY = Math.sin(revolutionAngle) * orbitRadius;
            ctx.save();
            ctx.translate(weaponX, weaponY);
            // 번개는 회전하므로 테두리 그리기가 복잡함. 빛 효과로 대체.
            // drawOutlineIfNeeded(); // 필요시 추가 구현
            this.drawLightning(ctx, 0.48, 0); // 실제 번개 그리기
            ctx.restore();
        } else if (this.type === 'ice_diamond') {
            ctx.save();
            ctx.translate(GRID_SIZE * 0.6, 0);
             // 얼음 다이아는 여러 개가 돌기 때문에 각 오브젝트에 테두리 적용 어려움. 빛 효과로 대체.
            // drawOutlineIfNeeded();
            drawIceDiamondIcon(ctx, 0.6); // 실제 다이아 그리기
            // 주변 도는 오브젝트는 테두리 생략
            for (let i = 0; i < unit.iceDiamondCharges; i++) {
                const angle = (gameManager.animationFrameCounter * 0.02) + (i * (Math.PI * 2 / 5)); const orbitRadius = GRID_SIZE * 1.2;
                const orbX = Math.cos(angle) * orbitRadius; const orbY = Math.sin(angle) * orbitRadius;
                ctx.save(); ctx.translate(orbX, orbY); drawIceDiamondIcon(ctx, 0.5); ctx.restore();
            }
            ctx.restore();
        } else if (this.type === 'magic_spear') {
            ctx.save();
            ctx.translate(GRID_SIZE * 0.2, GRID_SIZE * 0.4);
            drawOutlineIfNeeded(); // [호출] 테두리
            this.drawMagicSpear(ctx, 0.5, -Math.PI / 8 + Math.PI); // 실제 창 그리기
            ctx.restore();
        } else if (this.type === 'boomerang') {
            ctx.save();
            ctx.translate(0, -GRID_SIZE * 0.5);
            drawOutlineIfNeeded(); // [호출] 테두리
            this.drawBoomerang(ctx, 0.5); // 실제 부메랑 그리기
            ctx.restore();
        } else if (this.type === 'poison_potion') {
            ctx.save();
            ctx.translate(0, -GRID_SIZE * 0.5);
            drawOutlineIfNeeded(); // [호출] 테두리
            this.drawPoisonPotion(ctx, 0.3); // 실제 포션 그리기
            ctx.restore();
        } else if (this.type === 'hadoken') {
            // 장풍은 발사체이므로 장착 시 그리지 않음 (기존 로직 유지)
        } else if (this.type === 'shuriken') {
            ctx.save();
            ctx.translate(GRID_SIZE * 0.4, GRID_SIZE * 0.3);
            const shurikenScale = 0.5; ctx.scale(shurikenScale, shurikenScale); ctx.rotate(gameManager.animationFrameCounter * 0.1);
            drawOutlineIfNeeded(); // [호출] 테두리

            // 실제 표창 그리기
            ctx.fillStyle = '#4a5568'; ctx.strokeStyle = 'black'; ctx.lineWidth = 1 / shurikenScale / scale; // 원래 검은 테두리
            ctx.beginPath(); ctx.moveTo(0, -GRID_SIZE * 0.8); ctx.lineTo(GRID_SIZE * 0.2, -GRID_SIZE * 0.2); ctx.lineTo(GRID_SIZE * 0.8, 0); ctx.lineTo(GRID_SIZE * 0.2, GRID_SIZE * 0.2);
            ctx.lineTo(0, GRID_SIZE * 0.8); ctx.lineTo(-GRID_SIZE * 0.2, GRID_SIZE * 0.2); ctx.lineTo(-GRID_SIZE * 0.8, 0); ctx.lineTo(-GRID_SIZE * 0.2, -GRID_SIZE * 0.2); ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.restore();
        }
        // --- 각 무기 타입별 그리기 끝 ---


        // --- 빛나는 효과 초기화 ---
        if (isSpecialReady) {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }

        ctx.restore(); // 전체 상태 복원
    }
}


// Particle class (변경 없음)
export class Particle {
    constructor(gameManager, options) {
        this.gameManager = gameManager;
        this.x = options.x;
        this.y = options.y;
        this.vx = options.vx;
        this.vy = options.vy;
        this.life = options.life;
        this.initialLife = options.life;
        this.color = options.color;
        this.size = options.size;
        this.gravity = options.gravity || 0;
    }

    isAlive() { return this.life > 0; }

    update(gameSpeed = 1) {
        this.x += this.vx * gameSpeed;
        this.y += this.vy * gameSpeed;
        this.vy += this.gravity * gameSpeed;
        this.life -= (1 / 60) * gameSpeed;
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

// createPhysicalHitEffect 함수 (변경 없음)
export function createPhysicalHitEffect(gameManager, target) {
    const particleCount = 6;
    for (let i = 0; i < particleCount; i++) {
        const angle = gameManager.random() * Math.PI * 2;
        const speed = 2 + gameManager.random() * 3;
        gameManager.addParticle({
            x: target.pixelX, y: target.pixelY,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            life: 0.7, color: '#ef4444', size: gameManager.random() * 2.5 + 1.5,
            gravity: 0.1
        });
    }
}

// createFireballHitEffect 함수 (변경 없음)
export function createFireballHitEffect(gameManager, x, y) {
    const particleCount = 20;
    for (let i = 0; i < particleCount; i++) {
        const angle = gameManager.random() * Math.PI * 2;
        const speed = 1 + gameManager.random() * 4;
        gameManager.addParticle({
            x: x, y: y,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            life: 0.6, color: ['#ffcc00', '#ff9900', '#ff6600', '#ef4444'][Math.floor(gameManager.random() * 4)],
            size: gameManager.random() * 3 + 2, gravity: -0.05
        });
    }
}

// Projectile class (변경 없음)
export class Projectile {
    constructor(gameManager, owner, target, type = 'arrow', options = {}) {
        this.gameManager = gameManager;
        this.owner = owner;
        this.target = target;
        this.pixelX = options.startX !== undefined ? options.startX : owner.pixelX;
        this.pixelY = options.startY !== undefined ? options.startY : owner.pixelY;
        this.type = type;

        this.state = options.state || 'DEFAULT';
        this.lingerDuration = options.lingerDuration || 60;
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
            case 'shuriken': case 'returning_shuriken': this.damage = baseSpecialDamage; break;
            case 'magic_spear_special': this.damage = baseSpecialDamage + 15; break;
            case 'ice_diamond_projectile': this.damage = baseSpecialDamage + 15; break;
            case 'fireball_projectile': this.damage = baseSpecialDamage; break;
            case 'mini_fireball_projectile': this.damage = 15; break;
            case 'bouncing_sword': this.damage = 20; break;
            case 'boomerang_projectile': this.damage = 0; break;
            case 'magic_spear_normal': this.damage = baseNormalDamage + 5; break;
            case 'boomerang_normal_projectile': this.damage = baseNormalDamage + 10; break;
            case 'black_sphere_projectile': this.damage = baseNormalDamage + 7; break;
            default: this.damage = baseNormalDamage; break;
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
                            unit.takeDamage(this.damage * 0.15, {}, this.owner);
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

        if (this.type === 'ice_diamond_projectile' || this.type === 'boomerang_projectile') {
            if (this.target && this.target.hp > 0) {
                const targetAngle = Math.atan2(this.target.pixelY - this.pixelY, this.target.pixelX - this.pixelX);
                let angleDiff = targetAngle - this.angle;
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

                const turnSpeed = 0.03;
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
            const isCollidableWall = tile.type === TILE.WALL || tile.type === TILE.CRACKED_WALL || tile.type === TILE.GLASS_WALL;
            if (this.type !== 'magic_spear_special' && this.type !== 'sword_wave' && isCollidableWall) {
                if (tile.type === TILE.CRACKED_WALL) {
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
            ctx.moveTo(0, -GRID_SIZE * 0.8); ctx.lineTo(GRID_SIZE * 0.2, -GRID_SIZE * 0.2); ctx.lineTo(GRID_SIZE * 0.8, 0);
            ctx.lineTo(GRID_SIZE * 0.2, GRID_SIZE * 0.2); ctx.lineTo(0, GRID_SIZE * 0.8); ctx.lineTo(-GRID_SIZE * 0.2, GRID_SIZE * 0.2);
            ctx.lineTo(-GRID_SIZE * 0.8, 0); ctx.lineTo(-GRID_SIZE * 0.2, -GRID_SIZE * 0.2); ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#d1d5db';
            ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.restore();
            return;
        }

        if (this.type === 'arrow') {
            ctx.save(); ctx.translate(this.pixelX, this.pixelY); ctx.rotate(this.angle); ctx.scale(1.2, 1.2);
            ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.7, 0); ctx.lineTo(GRID_SIZE * 0.4, 0); ctx.lineTo(GRID_SIZE * 0.4, -1.5);
            ctx.lineTo(GRID_SIZE * 0.6, -1.5); ctx.lineTo(GRID_SIZE * 0.6, 1.5); ctx.lineTo(GRID_SIZE * 0.4, 1.5); ctx.lineTo(GRID_SIZE * 0.4, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(GRID_SIZE * 0.6, -2.5); ctx.lineTo(GRID_SIZE * 0.9, 0); ctx.lineTo(GRID_SIZE * 0.6, 2.5); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.7, 0); ctx.lineTo(-GRID_SIZE * 0.8, -3); ctx.moveTo(-GRID_SIZE * 0.7, 0); ctx.lineTo(-GRID_SIZE * 0.8, 3); ctx.stroke();
            ctx.restore();
        } else if (this.type === 'sword_wave') {
            ctx.save(); ctx.translate(this.pixelX, this.pixelY); ctx.rotate(this.angle - Math.PI / 2);
            ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 4; ctx.shadowColor = 'rgba(255, 0, 0, 0.7)'; ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.7, 0, Math.PI, false); ctx.stroke();
            ctx.restore();
        } else if (this.type === 'bouncing_sword') {
            ctx.save(); ctx.translate(this.pixelX, this.pixelY); ctx.rotate(this.rotationAngle); ctx.scale(0.72, 0.72);
            ctx.fillStyle = '#6b7280'; ctx.strokeStyle = 'black'; ctx.lineWidth = 1.5;
            ctx.fillRect(-GRID_SIZE * 0.1, GRID_SIZE * 0.3, GRID_SIZE * 0.2, GRID_SIZE * 0.3); ctx.strokeRect(-GRID_SIZE * 0.1, GRID_SIZE * 0.3, GRID_SIZE * 0.2, GRID_SIZE * 0.3);
            ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.3, GRID_SIZE * 0.3); ctx.lineTo(GRID_SIZE * 0.3, GRID_SIZE * 0.3); ctx.lineTo(GRID_SIZE * 0.3, GRID_SIZE * 0.2); ctx.lineTo(-GRID_SIZE * 0.3, GRID_SIZE * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
            const bladeGradient = ctx.createLinearGradient(0, -GRID_SIZE, 0, 0); bladeGradient.addColorStop(0, '#f3f4f6'); bladeGradient.addColorStop(0.5, '#9ca3af'); bladeGradient.addColorStop(1, '#d1d5db');
            ctx.fillStyle = bladeGradient; ctx.beginPath(); ctx.moveTo(0, GRID_SIZE * 0.2); ctx.quadraticCurveTo(GRID_SIZE * 0.5, -GRID_SIZE * 0.4, 0, -GRID_SIZE * 0.9); ctx.quadraticCurveTo(-GRID_SIZE * 0.1, -GRID_SIZE * 0.4, 0, GRID_SIZE * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.restore();
        } else if (this.type === 'hadoken') {
            for (let i = 0; i < this.trail.length; i++) {
                const pos = this.trail[i]; const alpha = (i / this.trail.length) * 0.5;
                ctx.fillStyle = `rgba(139, 92, 246, ${alpha})`; ctx.beginPath(); ctx.arc(pos.x, pos.y, (GRID_SIZE / 2) * (i / this.trail.length), 0, Math.PI * 2); ctx.fill();
            }
            ctx.fillStyle = '#c4b5fd'; ctx.beginPath(); ctx.arc(this.pixelX, this.pixelY, GRID_SIZE / 2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#8b5cf6'; ctx.beginPath(); ctx.arc(this.pixelX, this.pixelY, GRID_SIZE / 3, 0, Math.PI * 2); ctx.fill();
        } else if (this.type === 'lightning_bolt') {
            ctx.save(); ctx.translate(this.pixelX, this.pixelY); ctx.rotate(this.angle);
            ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.5, 0);
            for(let i = -GRID_SIZE * 0.5; i < GRID_SIZE * 0.5; i += 4) { ctx.lineTo(i, (this.gameManager.random() - 0.5) * 4); }
            ctx.lineTo(GRID_SIZE * 0.5, 0); ctx.stroke(); ctx.restore();
        } else if (this.type.startsWith('magic_spear')) {
            const isSpecial = this.type === 'magic_spear_special'; const mainColor = isSpecial ? '#a855f7' : '#111827';
            const trailColor = isSpecial ? 'rgba(192, 132, 252, 0.4)' : 'rgba(107, 114, 128, 0.4)';
            const spearLength = isSpecial ? GRID_SIZE * 1.2 : GRID_SIZE * 1.0; const spearWidth = isSpecial ? GRID_SIZE * 0.25 : GRID_SIZE * 0.2;
            ctx.save(); ctx.translate(this.pixelX, this.pixelY); ctx.rotate(this.angle);
            for (let i = 0; i < this.trail.length; i++) {
                const pos = this.trail[i]; const alpha = (i / this.trail.length) * 0.3;
                const trailX = (pos.x - this.pixelX) * Math.cos(-this.angle) - (pos.y - this.pixelY) * Math.sin(-this.angle); const trailY = (pos.x - this.pixelX) * Math.sin(-this.angle) + (pos.y - this.pixelY) * Math.cos(-this.angle);
                ctx.fillStyle = trailColor.replace('0.4', alpha); ctx.beginPath(); ctx.arc(trailX, trailY, (GRID_SIZE / 4) * (i / this.trail.length), 0, Math.PI * 2); ctx.fill();
            }
            ctx.fillStyle = mainColor; ctx.beginPath(); ctx.moveTo(spearLength, 0); ctx.lineTo(0, -spearWidth); ctx.lineTo(0, spearWidth); ctx.closePath(); ctx.fill();
            ctx.restore();
        } else if (this.type === 'boomerang_projectile') {
            ctx.save(); ctx.translate(this.pixelX, this.pixelY); ctx.rotate(this.rotationAngle); this.owner.weapon.drawBoomerang(ctx, 0.6); ctx.restore();
        } else if (this.type === 'boomerang_normal_projectile') {
            ctx.save(); ctx.translate(this.pixelX, this.pixelY); ctx.rotate(this.rotationAngle); this.owner.weapon.drawBoomerang(ctx, 0.3, 0, '#18181b'); ctx.restore();
        } else if (this.type === 'ice_diamond_projectile') {
            for (let i = 0; i < this.trail.length; i++) {
                const pos = this.trail[i]; const alpha = (i / this.trail.length) * 0.5;
                ctx.fillStyle = `rgba(165, 243, 252, ${alpha})`; ctx.beginPath(); ctx.arc(pos.x, pos.y, (GRID_SIZE / 1.67) * (i / this.trail.length), 0, Math.PI * 2); ctx.fill();
            }
            ctx.save(); ctx.translate(this.pixelX, this.pixelY); ctx.rotate(this.angle);
            const size = GRID_SIZE * 0.6; const grad = ctx.createLinearGradient(-size, -size, size, size); grad.addColorStop(0, '#e0f2fe'); grad.addColorStop(0.5, '#7dd3fc'); grad.addColorStop(1, '#0ea5e9');
            ctx.fillStyle = grad; ctx.strokeStyle = '#0284c7'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(size * 0.8, 0); ctx.lineTo(0, -size * 0.6); ctx.lineTo(-size * 0.8, 0); ctx.lineTo(0, size * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.restore();
        } else if (this.type === 'ice_bolt_projectile') {
            ctx.save(); ctx.translate(this.pixelX, this.pixelY); ctx.rotate(this.angle);
            ctx.fillStyle = '#000000'; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE / 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
        } else if (this.type === 'fireball_projectile' || this.type === 'mini_fireball_projectile') {
            const size = this.type === 'fireball_projectile' ? GRID_SIZE / 1.67 : GRID_SIZE / 4;
            for (let i = 0; i < this.trail.length; i++) {
                const pos = this.trail[i]; const alpha = (i / this.trail.length) * 0.4;
                ctx.fillStyle = `rgba(255, 100, 0, ${alpha})`; ctx.beginPath(); ctx.arc(pos.x, pos.y, size * (i / this.trail.length), 0, Math.PI * 2); ctx.fill();
            }
            const grad = ctx.createRadialGradient(this.pixelX, this.pixelY, size * 0.2, this.pixelX, this.pixelY, size); grad.addColorStop(0, '#ffff99'); grad.addColorStop(0.6, '#ff9900'); grad.addColorStop(1, '#ff4500');
            ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(this.pixelX, this.pixelY, size, 0, Math.PI * 2); ctx.fill();
        } else if (this.type === 'black_sphere_projectile') {
            const size = GRID_SIZE / 3;
            for (let i = 0; i < this.trail.length; i++) {
                const pos = this.trail[i]; const alpha = (i / this.trail.length) * 0.2;
                ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`; ctx.beginPath(); ctx.arc(pos.x, pos.y, size * (i / this.trail.length), 0, Math.PI * 2); ctx.fill();
            }
            ctx.fillStyle = '#000000'; ctx.strokeStyle = '#4a5568'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(this.pixelX, this.pixelY, size, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
    }
} // Projectile 클래스 끝


// Effect class (변경 없음)
export class Effect {
    constructor(gameManager, x, y, type, target, options = {}) {
        this.gameManager = gameManager;
        this.x = x; this.y = y; this.type = type; this.target = target;
        this.duration = 20; this.angle = this.gameManager.random() * Math.PI * 2;

        if (this.type === 'question_mark_effect') {
            this.duration = 60; this.particles = [];
            for (let i = 0; i < 20; i++) {
                this.particles.push({ x: this.x, y: this.y, angle: this.gameManager.random() * Math.PI * 2, speed: this.gameManager.random() * 2 + 1, radius: this.gameManager.random() * 3 + 1, lifespan: 40, });
            }
        } else if (this.type === 'level_up') { this.duration = 40; }
        else if (this.type === 'axe_spin_effect') { this.duration = 20; }
        else if (this.type === 'chain_lightning') { this.duration = 15; }
    }
    update() {
        const gameManager = this.gameManager; if (!gameManager) return;
        this.duration -= gameManager.gameSpeed;
        if (this.type === 'question_mark_effect') {
            this.particles.forEach(p => { p.x += Math.cos(p.angle) * p.speed; p.y += Math.sin(p.angle) * p.speed; p.lifespan--; });
            this.particles = this.particles.filter(p => p.lifespan > 0);
        }
    }
    draw(ctx) {
        if(this.duration <= 0) return;
        const opacity = Math.max(0, this.duration / 20);
        if (this.type === 'slash' || this.type === 'dual_sword_slash') {
            ctx.save(); ctx.translate(this.target.pixelX, this.target.pixelY); ctx.rotate(this.angle);
            ctx.strokeStyle = `rgba(220, 38, 38, ${opacity})`; ctx.lineWidth = this.type === 'slash' ? 3 : 2;
            const arcSize = this.type === 'slash' ? GRID_SIZE : GRID_SIZE * 0.7; ctx.beginPath(); ctx.arc(0, 0, arcSize, -0.5, 0.5); ctx.stroke(); ctx.restore();
        } else if (this.type === 'chain_lightning') {
            const effectOpacity = Math.max(0, this.duration / 15); ctx.strokeStyle = `rgba(254, 240, 138, ${effectOpacity})`; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.target.pixelX, this.target.pixelY); ctx.stroke();
        } else if (this.type === 'question_mark_effect') {
            const effectOpacity = Math.max(0, this.duration / 60);
            this.particles.forEach(p => { ctx.globalAlpha = Math.max(0, (p.lifespan / 40) * effectOpacity); ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); });
            ctx.globalAlpha = 1.0;
        } else if (this.type === 'axe_spin_effect') {
            const progress = 1 - opacity; const radius = GRID_SIZE * 3.5 * progress;
            ctx.save(); ctx.translate(this.x, this.y); ctx.strokeStyle = `rgba(220, 38, 38, ${opacity})`; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        } else if (this.type === 'level_up') {
            const initialDuration = 40; const yOffset = -GRID_SIZE - (initialDuration - this.duration) * 0.5; const effectOpacity = Math.max(0, Math.min(1, this.duration / (initialDuration / 2)));
            ctx.save(); ctx.translate(this.target.pixelX, this.target.pixelY + yOffset); ctx.scale(1.05, 1.05);
            ctx.fillStyle = `rgba(255, 215, 0, ${effectOpacity})`; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.fillText('LEVEL UP!', 0, 0); ctx.restore();
        }
    }
}

// MagicDaggerDashEffect 클래스 (변경 없음)
export class MagicDaggerDashEffect {
    constructor(gameManager, startPos, endPos) {
        this.gameManager = gameManager; this.startPos = startPos; this.endPos = endPos; this.life = 20; this.initialLife = 20;
    }
    isAlive() { return this.life > 0; }
    update() {
        this.life--;
        if (this.life > 0 && this.life % 2 === 0) {
            const progress = 1 - (this.life / this.initialLife); const particleX = this.startPos.x + (this.endPos.x - this.startPos.x) * progress; const particleY = this.startPos.y + (this.endPos.y - this.startPos.y) * progress;
            this.gameManager.addParticle({ x: particleX, y: particleY, vx: (this.gameManager.random() - 0.5) * 2, vy: (this.gameManager.random() - 0.5) * 2, life: 0.5, color: '#ffffff', size: this.gameManager.random() * 2 + 1, });
        }
    }
    draw(ctx) {
        if(this.life <= 0) return;
        const opacity = Math.max(0, this.life / this.initialLife);
        ctx.save(); ctx.globalAlpha = opacity; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.shadowColor = '#d8b4fe'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(this.startPos.x, this.startPos.y); ctx.lineTo(this.endPos.x, this.endPos.y); ctx.stroke(); ctx.restore();
    }
}

// AreaEffect class (변경 없음)
export class AreaEffect {
    constructor(gameManager, x, y, type, options = {}) {
        this.gameManager = gameManager; this.pixelX = x; this.pixelY = y; this.type = type;
        this.duration = 30; this.maxRadius = GRID_SIZE * 2.5; this.currentRadius = 0; this.damage = options.damage || 0;
        this.ownerTeam = options.ownerTeam || null; this.particles = []; this.damagedUnits = new Set(); this.damagedNexuses = new Set();
        if (this.type === 'fire_pillar') {
            for (let i = 0; i < 50; i++) {
                this.particles.push({ x: (this.gameManager.random() - 0.5) * this.maxRadius * 1.5, y: (this.gameManager.random() - 0.5) * this.maxRadius * 0.5, size: this.gameManager.random() * 4 + 2, speed: this.gameManager.random() * 1.5 + 1, lifespan: this.gameManager.random() * 20 + 10, color: ['#ffcc00', '#ff9900', '#ff6600', '#ef4444'][Math.floor(this.gameManager.random() * 4)] });
            }
        }
    }
    update() {
        const gameManager = this.gameManager; if (!gameManager) return; this.duration -= gameManager.gameSpeed; this.currentRadius = this.maxRadius * (1 - (this.duration / 30));
        if (this.type === 'fire_pillar') {
            this.particles.forEach(p => { p.y -= p.speed * gameManager.gameSpeed; p.lifespan -= gameManager.gameSpeed; p.x += (this.gameManager.random() - 0.5) * 0.5; });
            this.particles = this.particles.filter(p => p.lifespan > 0);
            gameManager.units.forEach(unit => { if (unit.team !== this.ownerTeam && !this.damagedUnits.has(unit)) { const dist = Math.hypot(unit.pixelX - this.pixelX, unit.pixelY - this.pixelY); if (dist < this.currentRadius) { unit.takeDamage(this.damage, {}, this.gameManager.units.find(u => u.team === this.ownerTeam)); this.damagedUnits.add(unit); } } });
            gameManager.nexuses.forEach(nexus => { if (nexus.team !== this.ownerTeam && !this.damagedNexuses.has(nexus)) { const dist = Math.hypot(nexus.pixelX - this.pixelX, nexus.pixelY - this.pixelY); if (dist < this.currentRadius) { nexus.takeDamage(this.damage); this.damagedNexuses.add(nexus); } } });
        }
    }
    draw(ctx) {
        if(this.duration <= 0) return;
        const opacity = Math.max(0, this.duration / 30);
        if (this.type === 'fire_pillar') {
            ctx.save(); ctx.translate(this.pixelX, this.pixelY);
            const grad = ctx.createRadialGradient(0, 0, this.currentRadius * 0.3, 0, 0, this.currentRadius); grad.addColorStop(0, `rgba(255, 100, 0, ${opacity * 0.4})`); grad.addColorStop(0.6, `rgba(255, 0, 0, ${opacity * 0.3})`); grad.addColorStop(1, `rgba(200, 0, 0, 0)`);
            ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(0, 0, this.currentRadius, 0, Math.PI * 2); ctx.fill();
            this.particles.forEach(p => { ctx.globalAlpha = Math.max(0, (p.lifespan / 20) * opacity); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
            ctx.restore(); ctx.globalAlpha = 1.0;
        } else if (this.type === 'poison_cloud') {
            ctx.fillStyle = `rgba(132, 204, 22, ${opacity * 0.4})`; ctx.fillRect(this.pixelX - GRID_SIZE * 2.5, this.pixelY - GRID_SIZE * 2.5, GRID_SIZE * 5, GRID_SIZE * 5);
        }
    }
}
