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
    }

    /**
     * [NEW] Handles the weapon's attack logic.
     * @param {Unit} unit - The unit using this weapon.
     * @param {Unit | Nexus} target - The attack target.
     */
    use(unit, target) {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        if (['sword', 'dual_swords', 'boomerang', 'poison_potion', 'magic_dagger', 'axe'].includes(this.type)) {
            unit.attackAnimationTimer = 15;
        }

        if (this.type === 'sword') {
            unit.attackCount++;
            target.takeDamage(unit.attackPower, {}, unit);
            gameManager.createEffect('slash', unit.pixelX, unit.pixelY, target);
            gameManager.audioManager.play('swordHit');
            unit.attackCooldown = unit.cooldownTime;
            
            if (unit.attackCount >= 3) {
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
            gameManager.audioManager.play('dualSwordHit');
            unit.attackCooldown = 120;
        } else if (this.type === 'dual_swords') {
            target.takeDamage(unit.attackPower, {}, unit);
            gameManager.createEffect('dual_sword_slash', unit.pixelX, unit.pixelY, target);
            gameManager.audioManager.play('dualSwordHit');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'axe') {
            target.takeDamage(unit.attackPower, {}, unit);
            gameManager.createEffect('slash', unit.pixelX, unit.pixelY, target);
            gameManager.audioManager.play('swordHit');
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
            } else {
                gameManager.createProjectile(unit, target, 'shuriken');
            }
            gameManager.audioManager.play('shurikenShoot');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'hadoken') {
            gameManager.createProjectile(unit, target, 'hadoken');
            gameManager.audioManager.play('hadokenShoot');
            unit.attackCooldown = unit.cooldownTime; 
        } else if (this.type === 'lightning') {
            gameManager.createProjectile(unit, target, 'lightning_bolt');
            gameManager.audioManager.play('electricity');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'magic_spear') {
            gameManager.createProjectile(unit, target, 'magic_spear_normal');
            gameManager.audioManager.play('punch');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'boomerang') {
            gameManager.createProjectile(unit, target, 'boomerang_normal_projectile');
            gameManager.audioManager.play('punch');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'poison_potion') {
            target.takeDamage(15, {}, unit);
            unit.attackCooldown = unit.cooldownTime;
        }
    }

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
        const scale = (this.type === 'crown') ? 1.0 : (this.type === 'lightning' ? 0.6 : (this.type === 'magic_spear' ? 0.6 : (this.type === 'poison_potion' ? 0.624 : (this.type === 'boomerang' ? 0.49 : 0.8))));
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        
        if (this.type !== 'magic_dagger') {
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1 / scale;
        }


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
            ctx.strokeStyle = 'black'; ctx.lineWidth = 6 / scale; ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.8, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke();
            ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 4 / scale; ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.8, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke();
            ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1.5 / scale; ctx.beginPath();
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
            const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, GRID_SIZE * 1.2);
            grad.addColorStop(0, '#bfdbfe');
            grad.addColorStop(0.6, '#3b82f6');
            grad.addColorStop(1, '#1e40af');
            ctx.fillStyle = grad;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1.5 / scale;
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
        
        const scale = 1 + (unit.awakeningEffect?.stacks || 0) * 0.2;

        ctx.save(); 
        ctx.translate(unit.pixelX, unit.pixelY);
        ctx.scale(scale, scale);
        
        let rotation = unit.facingAngle;
        if (unit.attackAnimationTimer > 0) {
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

        if (this.type !== 'lightning' && this.type !== 'ice_diamond') {
            ctx.rotate(rotation);
        }

        if (this.type === 'sword') {
            ctx.translate(GRID_SIZE * 0.5, 0);
            ctx.rotate(Math.PI / 4);
            
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

            ctx.fillStyle = '#374151';
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.2, GRID_SIZE * 0.3);
            ctx.lineTo(GRID_SIZE * 0.2, GRID_SIZE * 0.3);
            ctx.lineTo(GRID_SIZE * 0.25, GRID_SIZE * 0.3 + 3);
            ctx.lineTo(-GRID_SIZE * 0.25, GRID_SIZE * 0.3 + 3);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#1f2937';
            ctx.fillRect(-1.5, GRID_SIZE * 0.3 + 3, 3, GRID_SIZE * 0.3);
            ctx.strokeRect(-1.5, GRID_SIZE * 0.3 + 3, 3, GRID_SIZE * 0.3);
        } else if (this.type === 'magic_dagger') {
            ctx.translate(-GRID_SIZE * 0.4, 0);
            ctx.scale(0.7, 0.7);
            ctx.rotate(-Math.PI / 8);
            drawMagicDaggerIcon(ctx);
        } else if (this.type === 'axe') {
            ctx.translate(GRID_SIZE * 0.8, -GRID_SIZE * 0.7);
            ctx.rotate(Math.PI / 4);
            ctx.scale(0.8, 0.8);
            drawAxeIcon(ctx);
        } else if (this.type === 'bow') {
            ctx.translate(GRID_SIZE * 0.4, 0);
            ctx.rotate(-Math.PI / 4);
            const bowScale = 0.8;
            ctx.scale(bowScale, bowScale);
            ctx.fillStyle = '#f3f4f6';
            ctx.fillRect(-GRID_SIZE * 0.7, -1, GRID_SIZE * 1.2, 2);
            ctx.strokeRect(-GRID_SIZE * 0.7, -1, GRID_SIZE * 1.2, 2);
            ctx.fillStyle = '#e5e7eb';
            ctx.beginPath(); ctx.moveTo(GRID_SIZE * 0.5, 0); ctx.lineTo(GRID_SIZE * 0.3, -3); ctx.lineTo(GRID_SIZE * 0.3, 3); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#d1d5db';
            ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.6, -1); ctx.lineTo(-GRID_SIZE * 0.7, -4); ctx.lineTo(-GRID_SIZE * 0.5, -1); ctx.closePath(); ctx.fill()
            ctx.beginPath(); ctx.moveTo(-GRID_SIZE * 0.6, 1); ctx.lineTo(-GRID_SIZE * 0.7, 4); ctx.lineTo(-GRID_SIZE * 0.5, 1); ctx.closePath(); ctx.fill()
            ctx.strokeStyle = 'black'; ctx.lineWidth = 6 / bowScale; ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.8, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke();
            ctx.strokeStyle = '#854d0e'; ctx.lineWidth = 4 / bowScale; ctx.beginPath(); ctx.arc(0, 0, GRID_SIZE * 0.8, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke();
            ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1.5 / bowScale; ctx.beginPath();
            const arcRadius = GRID_SIZE * 0.8, arcAngle = Math.PI / 2.2;
            ctx.moveTo(Math.cos(-arcAngle) * arcRadius, Math.sin(-arcAngle) * arcRadius);
            ctx.lineTo(-GRID_SIZE * 0.4, 0);
            ctx.lineTo(Math.cos(arcAngle) * arcRadius, Math.sin(arcAngle) * arcRadius); ctx.stroke();
        } else if (this.type === 'dual_swords') {
            const drawEquippedCurvedSword = (isRightHand) => {
                ctx.save();
                const yOffset = isRightHand ? GRID_SIZE * 0.6 : -GRID_SIZE * 0.6;
                const swordRotation = isRightHand ? Math.PI / 8 : -Math.PI / 8;
                ctx.translate(GRID_SIZE * 0.1, yOffset);
                ctx.rotate(swordRotation);
                ctx.fillStyle = '#374151';
                ctx.fillRect(-GRID_SIZE * 0.05, 0, GRID_SIZE * 0.1, GRID_SIZE * 0.2);
                ctx.strokeRect(-GRID_SIZE * 0.05, 0, GRID_SIZE * 0.1, GRID_SIZE * 0.2);
                ctx.beginPath();
                ctx.moveTo(-GRID_SIZE * 0.2, 0); ctx.lineTo(GRID_SIZE * 0.2, 0);
                ctx.lineTo(GRID_SIZE * 0.2, -GRID_SIZE * 0.05); ctx.lineTo(-GRID_SIZE * 0.2, -GRID_SIZE * 0.05);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                const bladeGradient = ctx.createLinearGradient(0, -GRID_SIZE*0.8, 0, 0);
                bladeGradient.addColorStop(0, '#f3f4f6'); bladeGradient.addColorStop(0.5, '#9ca3af'); bladeGradient.addColorStop(1, '#4b5563');
                ctx.fillStyle = bladeGradient;
                ctx.beginPath();
                ctx.moveTo(0, -GRID_SIZE * 0.05);
                ctx.quadraticCurveTo(GRID_SIZE * 0.4, -GRID_SIZE * 0.3, 0, -GRID_SIZE * 0.8);
                ctx.quadraticCurveTo(-GRID_SIZE * 0.1, -GRID_SIZE * 0.3, 0, -GRID_SIZE * 0.05);
                ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.restore();
            };
            drawEquippedCurvedSword(true);
            drawEquippedCurvedSword(false);
        } else if (this.type === 'fire_staff') {
            this.drawStaff(ctx, 0.8);
        } else if (this.type === 'lightning') {
            const revolutionAngle = gameManager.animationFrameCounter * 0.05;
            const orbitRadius = GRID_SIZE * 0.8;
            const weaponX = Math.cos(revolutionAngle) * orbitRadius;
            const weaponY = Math.sin(revolutionAngle) * orbitRadius;
            
            ctx.save();
            ctx.translate(weaponX, weaponY);
            this.drawLightning(ctx, 0.48, 0); 
            ctx.restore();
        } else if (this.type === 'ice_diamond') {
            ctx.translate(GRID_SIZE * 0.6, 0);
            drawIceDiamondIcon(ctx, 0.6); // 60% size when equipped
            for (let i = 0; i < unit.iceDiamondCharges; i++) {
                const angle = (gameManager.animationFrameCounter * 0.02) + (i * (Math.PI * 2 / 5));
                const orbitRadius = GRID_SIZE * 1.2;
                const orbX = Math.cos(angle) * orbitRadius;
                const orbY = Math.sin(angle) * orbitRadius;
                ctx.save();
                ctx.translate(orbX, orbY);
                drawIceDiamondIcon(ctx, 0.5); // 50% size for orbiting orbs
                ctx.restore();
            }
        } else if (this.type === 'magic_spear') {
            ctx.translate(GRID_SIZE * 0.2, GRID_SIZE * 0.4);
            this.drawMagicSpear(ctx, 0.5, -Math.PI / 8 + Math.PI);
        } else if (this.type === 'boomerang') {
            ctx.translate(0, -GRID_SIZE * 0.5); 
            this.drawBoomerang(ctx, 0.5);
        } else if (this.type === 'poison_potion') {
            ctx.translate(0, -GRID_SIZE * 0.5); 
            this.drawPoisonPotion(ctx, 0.3);
        } else if (this.type === 'hadoken') {
            ctx.translate(GRID_SIZE * 0.5, 0);
            const hadokenScale = 0.7;
            ctx.scale(hadokenScale, hadokenScale);
            const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, GRID_SIZE * 1.2);
            grad.addColorStop(0, '#bfdbfe');
            grad.addColorStop(0.6, '#3b82f6');
            grad.addColorStop(1, '#1e40af');
            ctx.fillStyle = grad;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1.5 / hadokenScale;
            ctx.beginPath();
            ctx.arc(GRID_SIZE * 0.2, 0, GRID_SIZE * 0.6, -Math.PI / 2, Math.PI / 2, false);
            ctx.lineTo(-GRID_SIZE * 0.8, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (this.type === 'shuriken') {
            ctx.translate(GRID_SIZE * 0.4, GRID_SIZE * 0.3);
            const shurikenScale = 0.5;
            ctx.scale(shurikenScale, shurikenScale);
            ctx.rotate(gameManager.animationFrameCounter * 0.1);
            ctx.fillStyle = '#4a5568';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2 / shurikenScale;
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
        }
        ctx.restore();
    }
}

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

        let baseDamage = owner.baseAttackPower + (owner.specialAttackLevelBonus || 0);
    
        // [MODIFIED] 요청사항에 맞춰 특수 공격 데미지 재조정
        switch (type) {
            case 'magic_spear_special':
                this.damage = baseDamage + (owner.weapon?.specialAttackPowerBonus || 0);
                break;
            case 'magic_spear_normal':
                this.damage = baseDamage + (owner.weapon?.normalAttackPowerBonus || 0);
                break;
            case 'ice_diamond_projectile':
                this.damage = baseDamage + 15; // 최종 데미지 20 목표 (5 + 15)
                break;
            case 'fireball_projectile':
                this.damage = baseDamage + 15; // 최종 데미지 20 목표 (5 + 15)
                break;
            case 'mini_fireball_projectile':
                this.damage = baseDamage + 10;  // 최종 데미지 15 목표 (5 + 10)
                break;
            case 'boomerang_normal_projectile':
                this.damage = baseDamage + 10;  // 최종 데미지 15 목표 (5 + 10)
                break;
            case 'bouncing_sword':
                this.damage = baseDamage + 10;  // 최종 데미지 15 목표 (5 + 10)
                break;
            case 'black_sphere_projectile':
                this.damage = baseDamage + 7;  // 최종 데미지 12 목표 (5 + 7)
                break;
            case 'boomerang_projectile':
                this.damage = 0; 
                break;
            default:
                this.damage = baseDamage + (owner.weapon?.attackPowerBonus || 0);
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
                ctx.arc(pos.x, pos.y, (GRID_SIZE / 2.5) * (i / this.trail.length), 0, Math.PI * 2);
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
            const size = this.type === 'fireball_projectile' ? GRID_SIZE / 2.5 : GRID_SIZE / 4;
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
                        unit.takeDamage(this.damage, {}, this.gameManager.units.find(u => u.team === this.ownerTeam));
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


