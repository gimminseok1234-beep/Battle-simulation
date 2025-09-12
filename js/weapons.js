// js/weapons.js

import { GRID_SIZE } from './constants.js';

/**
 * [MODIFIED] Function to draw the magic dagger icon.
 * Modified to a fluorescent purple design similar to a magic spear as requested.
 */
function drawMagicDaggerIcon(ctx) {
    ctx.save();
    
    const scale = GRID_SIZE * 0.075; 
    
    // --- Added glow effect ---
    ctx.shadowColor = 'rgba(192, 132, 252, 0.9)';
    ctx.shadowBlur = 15;

    ctx.strokeStyle = '#2e1065'; // Dark purple border
    ctx.lineWidth = 2;

    // --- Handle ---
    ctx.fillStyle = '#5b21b6'; // Purple handle
    const handleWidth = 2.5 * scale;
    const handleHeight = 7 * scale;
    const handleX = -handleWidth / 2;
    const handleY = 0;
    ctx.fillRect(handleX, handleY, handleWidth, handleHeight);
    ctx.strokeRect(handleX, handleY, handleWidth, handleHeight);

    // --- Guard ---
    ctx.fillStyle = '#c084fc'; // Light purple guard
    const guardWidth = 5 * scale;
    const guardHeight = 1.5 * scale;
    const guardX = -guardWidth / 2;
    const guardY = -guardHeight / 2;
    ctx.fillRect(guardX, guardY, guardWidth, guardHeight);
    ctx.strokeRect(guardX, guardY, guardWidth, guardHeight);

    // --- Blade ---
    const bladeBaseY = -guardHeight / 2;
    const bladeTipY = -10 * scale; // Modified to make the blade less sharp
    const bladeWidth = 3.5 * scale;
    const tipWidth = 0.5 * scale; // Added a slight width to the blade tip
    
    // Added a glowing effect with a gradient
    const bladeGradient = ctx.createLinearGradient(0, bladeTipY, 0, bladeBaseY);
    bladeGradient.addColorStop(0, '#f5d0fe');   // Bright fluorescent purple
    bladeGradient.addColorStop(0.5, '#e9d5ff');
    bladeGradient.addColorStop(1, '#a855f7');   // Dark purple

    ctx.fillStyle = bladeGradient; 
    
    ctx.beginPath();
    ctx.moveTo(-bladeWidth / 2, bladeBaseY);
    ctx.lineTo(bladeWidth / 2, bladeBaseY); 
    ctx.lineTo(tipWidth / 2, bladeTipY);      // Right side of the tip        
    ctx.lineTo(-tipWidth / 2, bladeTipY);     // Left side of the tip
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}

/**
 * [NEW] Function to draw the axe icon.
 * Draws a double-bladed axe with a black handle and silver blades.
 */
function drawAxeIcon(ctx) {
    ctx.save();
    
    const scale = GRID_SIZE * 0.08; // Increased size

    // --- Handle ---
    ctx.fillStyle = '#1f2937'; // Black
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    const handleWidth = 2.5 * scale;
    const handleHeight = 18 * scale;
    const handleX = -handleWidth / 2;
    const handleY = -5 * scale;
    ctx.fillRect(handleX, handleY, handleWidth, handleHeight);
    ctx.strokeRect(handleX, handleY, handleWidth, handleHeight);

    // --- Blade ---
    const bladeGradient = ctx.createLinearGradient(-12 * scale, 0, 12 * scale, 0); // Extended gradient range
    bladeGradient.addColorStop(0, '#d1d5db'); // Light silver
    bladeGradient.addColorStop(0.5, '#f9fafb'); // Highlight
    bladeGradient.addColorStop(1, '#9ca3af'); // Dark silver

    ctx.fillStyle = bladeGradient;
    
    // Left blade
    ctx.beginPath();
    ctx.moveTo(0, -6 * scale); // Increased height
    ctx.quadraticCurveTo(-16 * scale, 0, 0, 6 * scale); // Increased width and curvature
    ctx.quadraticCurveTo(-7 * scale, 0, 0, -6 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right blade
    ctx.beginPath();
    ctx.moveTo(0, -6 * scale);
    ctx.quadraticCurveTo(16 * scale, 0, 0, 6 * scale);
    ctx.quadraticCurveTo(7 * scale, 0, 0, -6 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}

// [MODIFIED] Function to draw the ice diamond icon.
function drawIceDiamondIcon(ctx, customScale = 1.0) {
    ctx.save();
    ctx.scale(customScale, customScale);
    ctx.shadowColor = 'rgba(56, 189, 248, 0.7)';
    ctx.shadowBlur = 15 / customScale;

    const size = GRID_SIZE * 0.8;

    const grad = ctx.createLinearGradient(0, -size, 0, size);
    grad.addColorStop(0, '#e0f2fe');
    grad.addColorStop(0.5, '#7dd3fc');
    grad.addColorStop(1, '#0ea5e9');

    ctx.fillStyle = grad;
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2 / customScale;

    ctx.beginPath();
    ctx.moveTo(0, -size); // Top point
    ctx.lineTo(size * 0.7, 0); // Right point
    ctx.lineTo(0, size); // Bottom point
    ctx.lineTo(-size * 0.7, 0); // Left point
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner facets
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 1 / customScale;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(0, size);
    ctx.moveTo(size * 0.7, 0);
    ctx.lineTo(-size * 0.7, 0);
    ctx.stroke();

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

        // Set default attack animation timer, individual weapons can override
        if (['sword', 'dual_swords', 'boomerang', 'poison_potion', 'magic_dagger', 'axe'].includes(this.type)) {
            unit.attackAnimationTimer = 15;
        }

        if (this.type === 'sword') {
            target.takeDamage(unit.attackPower);
            gameManager.createEffect('slash', unit.pixelX, unit.pixelY, target);
            gameManager.audioManager.play('swordHit');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'magic_dagger') {
            target.takeDamage(unit.attackPower);
            gameManager.createEffect('slash', unit.pixelX, unit.pixelY, target);
            gameManager.audioManager.play('swordHit');
            unit.attackCooldown = 120; // 2 second cooldown
        } else if (this.type === 'bow') {
            gameManager.createProjectile(unit, target, 'arrow');
            gameManager.audioManager.play('arrowShoot');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'dual_swords') {
            target.takeDamage(unit.attackPower);
            gameManager.createEffect('dual_sword_slash', unit.pixelX, unit.pixelY, target);
            gameManager.audioManager.play('dualSwordHit');
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'axe') {
            target.takeDamage(unit.attackPower);
            gameManager.createEffect('slash', unit.pixelX, unit.pixelY, target);
            gameManager.audioManager.play('swordHit'); // Temporarily using sword sound
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'ice_diamond') {
            if (unit.iceDiamondCharges > 0) { // Special attack
                for (let i = 0; i < unit.iceDiamondCharges; i++) {
                    setTimeout(() => {
                        if (unit.hp > 0) {
                            gameManager.createProjectile(unit, target, 'ice_diamond_projectile');
                        }
                    }, i * 100);
                }
                unit.iceDiamondCharges = 0;
                unit.iceDiamondChargeTimer = 0;
            } else { // Normal attack
                gameManager.createProjectile(unit, target, 'ice_bolt_projectile');
            }
            unit.attackCooldown = unit.cooldownTime;
        } else if (this.type === 'fire_staff') {
             if (!unit.isCasting) {
                unit.isCasting = true;
                unit.castingProgress = 0;
                unit.castDuration = 180;
                unit.castTargetPos = { x: target.pixelX, y: target.pixelY };
                unit.target = target; // Make sure the unit remembers its target
            }
        } else if (this.type === 'shuriken') {
            if (unit.shurikenSkillCooldown <= 0) {
                // --- MODIFIED: Special Attack Logic ---
                const angleToTarget = Math.atan2(target.pixelY - unit.pixelY, target.pixelX - unit.pixelX);
                const spread = 0.3;
                const angles = [angleToTarget - spread, angleToTarget, angleToTarget + spread];
                
                angles.forEach(angle => {
                    gameManager.createProjectile(unit, target, 'returning_shuriken', {
                        angle: angle,
                        state: 'MOVING_OUT',
                        maxDistance: GRID_SIZE * 6 // Flies out 6 tiles
                    });
                });
                unit.shurikenSkillCooldown = 480; // 8 second cooldown for the powerful new skill
            } else {
                // Normal attack
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
            target.takeDamage(15);
            unit.attackCooldown = unit.cooldownTime;
            // The poison potion's death effect is handled in Unit.handleDeath()
        }
    }

    drawStaff(ctx, scale = 1.0) {
        ctx.save();
        ctx.rotate(Math.PI / 4);
        
        ctx.fillStyle = '#5C3317';
        ctx.strokeStyle = '#2F1A0C';
        ctx.lineWidth = 3 / scale;
        ctx.beginPath();
        ctx.moveTo(0, GRID_SIZE * 1.2 * scale);
        ctx.lineTo(0, -GRID_SIZE * 0.8 * scale);
        ctx.stroke();
    
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 2 / scale;
        ctx.beginPath();
        ctx.arc(0, -GRID_SIZE * 0.8 * scale, GRID_SIZE * 0.4 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    
        const grad = ctx.createRadialGradient(0, -GRID_SIZE * 0.8 * scale, GRID_SIZE * 0.1 * scale, 0, -GRID_SIZE * 0.8 * scale, GRID_SIZE * 0.4 * scale);
        grad.addColorStop(0, '#FFC0CB'); 
        grad.addColorStop(1, '#DC143C'); 
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, -GRID_SIZE * 0.8 * scale, GRID_SIZE * 0.35 * scale, 0, Math.PI * 2);
        ctx.fill();
    
        ctx.restore();
    }
    
    drawLightning(ctx, scale = 1.0, rotation = 0) {
        ctx.save();
        ctx.rotate(rotation);
        ctx.scale(scale, scale);
        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.5 / scale;
    
        ctx.beginPath();
        ctx.moveTo(0, -GRID_SIZE * 1.2);
        ctx.lineTo(GRID_SIZE * 0.3, -GRID_SIZE * 0.2);
        ctx.lineTo(-GRID_SIZE * 0.1, -GRID_SIZE * 0.2);
        ctx.lineTo(GRID_SIZE * 0.1, GRID_SIZE * 0.4);
        ctx.lineTo(-GRID_SIZE * 0.3, -GRID_SIZE * 0.1);
        ctx.lineTo(GRID_SIZE * 0.1, -GRID_SIZE * 0.1);
        ctx.lineTo(0, GRID_SIZE * 1.2);
        ctx.lineTo(-0.1, -GRID_SIZE * 0.1);
        ctx.lineTo(0.3, -GRID_SIZE * 0.1);
        ctx.lineTo(-0.1, GRID_SIZE * 0.4);
        ctx.lineTo(0.1, -GRID_SIZE * 0.2);
        ctx.lineTo(-0.3, -GRID_SIZE * 0.2);
        ctx.closePath();
    
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    drawMagicSpear(ctx, scale = 1.0, rotation = 0) {
        ctx.save();
        ctx.rotate(rotation);
        ctx.scale(scale, scale);

        ctx.shadowColor = 'rgba(192, 132, 252, 0.8)';
        ctx.shadowBlur = 15 / scale;

        const shaftLength = GRID_SIZE * 2.5;
        const shaftWidth = GRID_SIZE * 0.15;
        ctx.fillStyle = '#5b21b6';
        ctx.strokeStyle = '#2e1065';
        ctx.lineWidth = 1.5 / scale;
        ctx.fillRect(-shaftLength / 2, -shaftWidth, shaftLength, shaftWidth * 2);
        ctx.strokeRect(-shaftLength / 2, -shaftWidth, shaftLength, shaftWidth * 2);

        const headLength = GRID_SIZE * 0.8;
        const headWidth = GRID_SIZE * 0.4;
        const headBaseX = shaftLength / 2;
        
        const grad = ctx.createLinearGradient(headBaseX, 0, headBaseX + headLength, 0);
        grad.addColorStop(0, '#e9d5ff');
        grad.addColorStop(1, '#a855f7');
        
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2 / scale;
        ctx.beginPath();
        ctx.moveTo(headBaseX, -headWidth);
        ctx.lineTo(headBaseX + headLength, 0);
        ctx.lineTo(headBaseX, headWidth);
        ctx.quadraticCurveTo(headBaseX - headLength * 0.2, 0, headBaseX, -headWidth);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        const gemX = -GRID_SIZE * 0.4;
        const gemRadius = GRID_SIZE * 0.25;
        const gemGrad = ctx.createRadialGradient(gemX, 0, gemRadius * 0.1, gemX, 0, gemRadius);
        gemGrad.addColorStop(0, '#f5d0fe');
        gemGrad.addColorStop(1, '#9333ea');
        ctx.fillStyle = gemGrad;
        ctx.beginPath();
        ctx.arc(gemX, 0, gemRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d8b4fe';
        ctx.stroke();

        ctx.restore();
    }
    
    drawBoomerang(ctx, scale = 1.0, rotation = 0, color = null) {
        ctx.save();
        ctx.rotate(rotation);
        ctx.scale(scale, scale);

        const grad = ctx.createLinearGradient(0, -GRID_SIZE * 1.2, 0, GRID_SIZE * 0.6);
        grad.addColorStop(0, '#e5e7eb');
        grad.addColorStop(1, '#9ca3af');

        ctx.fillStyle = color || grad;
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 2 / scale;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(0, GRID_SIZE * 0.6);
        ctx.lineTo(-GRID_SIZE * 1.2, -GRID_SIZE * 0.5);
        ctx.quadraticCurveTo(-GRID_SIZE * 1.3, -GRID_SIZE * 0.6, -GRID_SIZE * 1.1, -GRID_SIZE * 0.7);
        ctx.lineTo(0, -GRID_SIZE * 0.2);
        ctx.lineTo(GRID_SIZE * 1.1, -GRID_SIZE * 0.7);
        ctx.quadraticCurveTo(GRID_SIZE * 1.3, -GRID_SIZE * 0.6, GRID_SIZE * 1.2, -GRID_SIZE * 0.5);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }

    drawPoisonPotion(ctx, scale = 1.0) {
        ctx.save();
        ctx.scale(scale, scale);
        ctx.fillStyle = 'rgba(173, 216, 230, 0.7)'; 
        ctx.strokeStyle = '#4a5568';
        ctx.lineWidth = 3 / scale;
        ctx.beginPath();
        ctx.arc(0, GRID_SIZE * 0.2, GRID_SIZE * 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-GRID_SIZE * 0.5, -GRID_SIZE * 0.5);
        ctx.lineTo(-GRID_SIZE * 0.5, -GRID_SIZE * 1.2);
        ctx.lineTo(GRID_SIZE * 0.5, -GRID_SIZE * 1.2);
        ctx.lineTo(GRID_SIZE * 0.5, -GRID_SIZE * 0.5);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(129, 207, 224, 0.8)';
        ctx.beginPath();
        ctx.rect(-GRID_SIZE*0.6, -GRID_SIZE * 1.5, GRID_SIZE*1.2, GRID_SIZE*0.3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#D2B48C'; 
        ctx.strokeStyle = '#8B4513'; 
        ctx.beginPath();
        ctx.ellipse(0, -GRID_SIZE * 1.6, GRID_SIZE * 0.5, GRID_SIZE*0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#84cc16'; 
        ctx.beginPath();
        ctx.arc(0, 0, GRID_SIZE * 0.9, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }


    /**
     * Draws the weapon when it's on the ground.
     * @param {CanvasRenderingContext2D} ctx 
     */
    draw(ctx) {
        if (this.isEquipped) return;
        const centerX = this.pixelX; const centerY = this.pixelY;
        const scale = (this.type === 'crown') ? 1.0 : (this.type === 'lightning' ? 0.6 : (this.type === 'magic_spear' ? 0.6 : (this.type === 'poison_potion' ? 0.624 : (this.type === 'boomerang' ? 0.49 : 0.8))));
        ctx.save(); ctx.translate(centerX, centerY); ctx.scale(scale, scale);
        ctx.strokeStyle = 'black'; ctx.lineWidth = 1 / scale;

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
        
        ctx.save(); 
        ctx.translate(unit.pixelX, unit.pixelY);
        
        let rotation = unit.facingAngle;
        if (unit.attackAnimationTimer > 0) {
            const swingProgress = Math.sin((15 - unit.attackAnimationTimer) / 15 * Math.PI);
            rotation += swingProgress * Math.PI / 4;
        }

        if (this.type === 'axe' && unit.spinAnimationTimer > 0) {
            rotation += ((30 - unit.spinAnimationTimer) / 30) * Math.PI * 2;
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
            ctx.translate(GRID_SIZE * 0.5, 0);
            ctx.rotate(Math.PI / 4);
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

