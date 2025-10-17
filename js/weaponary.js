import { TILE, TEAM, COLORS, DEEP_COLORS, GRID_SIZE } from './constants.js';

// Base Weapon class
export class Weapon {
    constructor(gameManager, x, y, type) {
        this.gameManager = gameManager;
        this.pixelX = x;
        this.pixelY = y;
        this.gridX = Math.floor(x / GRID_SIZE);
        this.gridY = Math.floor(y / GRID_SIZE);
        this.type = type;
        this.isEquipped = false;
        this.attackPowerBonus = 0;
        this.attackRangeBonus = 0;
        this.attackCooldownBonus = 0;
        this.speedBonus = 0;
        this.detectionRangeBonus = 0;
        this.projectileSpeed = 10;
        this.projectileDamage = 10;
        this.knockbackForce = 0;
        this.piercing = 0;
        this.bounces = 0;
        this.areaDamage = 0;
        this.stunDuration = 0;
        this.specialAttackCooldown = 0;
        this.hasSpecialAttack = false;
        this.setStats();
    }

    setStats() {
        switch (this.type) {
            case 'sword':
                this.attackPowerBonus = 10;
                this.attackRangeBonus = GRID_SIZE * 0.7;
                this.attackCooldownBonus = 0;
                this.hasSpecialAttack = true;
                break;
            case 'bow':
                this.attackPowerBonus = 7;
                this.attackRangeBonus = GRID_SIZE * 5;
                this.attackCooldownBonus = 20;
                this.projectileSpeed = 15;
                this.projectileDamage = 10;
                this.hasSpecialAttack = true;
                break;
            case 'axe':
                this.attackPowerBonus = 15;
                this.attackRangeBonus = GRID_SIZE * 1.0;
                this.attackCooldownBonus = 10;
                this.knockbackForce = 5;
                this.hasSpecialAttack = true;
                this.specialAttackCooldown = 240; // 4초
                break;
            case 'boomerang':
                this.attackPowerBonus = 8;
                this.attackRangeBonus = GRID_SIZE * 6;
                this.attackCooldownBonus = 30;
                this.projectileSpeed = 10;
                this.projectileDamage = 12;
                this.bounces = 2; // 부메랑은 되돌아오므로 튕김 횟수를 2회 이상으로 설정
                this.hasSpecialAttack = true;
                this.specialAttackCooldown = 480; // 8초
                break;
            case 'shuriken':
                this.attackPowerBonus = 6;
                this.attackRangeBonus = GRID_SIZE * 4;
                this.attackCooldownBonus = -10;
                this.projectileSpeed = 20;
                this.projectileDamage = 8;
                this.piercing = 1;
                this.hasSpecialAttack = true;
                this.specialAttackCooldown = 300; // 5초
                break;
            case 'magic_dagger':
                this.attackPowerBonus = 10;
                this.attackRangeBonus = GRID_SIZE * 1.5;
                this.attackCooldownBonus = -10;
                this.speedBonus = 0.2;
                this.hasSpecialAttack = true;
                this.specialAttackCooldown = 420; // 7초
                break;
            case 'fire_staff':
                this.attackPowerBonus = 8;
                this.attackRangeBonus = GRID_SIZE * 4;
                this.attackCooldownBonus = 30;
                this.projectileSpeed = 12;
                this.projectileDamage = 10;
                this.areaDamage = GRID_SIZE * 1.5;
                this.hasSpecialAttack = true;
                this.specialAttackCooldown = 240; // 4초
                break;
            case 'ice_diamond':
                this.attackPowerBonus = 6;
                this.attackRangeBonus = GRID_SIZE * 3;
                this.attackCooldownBonus = 40;
                this.projectileSpeed = 8;
                this.projectileDamage = 8;
                this.stunDuration = 90; // 1.5초 기절
                this.hasSpecialAttack = true; // 스택 시스템이 특수 공격
                this.specialAttackCooldown = 240; // 스택 충전 시간
                break;
            case 'poison_potion':
                this.attackPowerBonus = 0; // 직접 공격력 없음
                this.attackRangeBonus = GRID_SIZE * 0.5;
                this.attackCooldownBonus = 0;
                this.hasSpecialAttack = true;
                this.specialAttackCooldown = 180; // 3초 캐스팅
                break;
            case 'lightning':
                this.attackPowerBonus = 5;
                this.attackRangeBonus = GRID_SIZE * 5;
                this.attackCooldownBonus = 10;
                this.projectileSpeed = 25;
                this.projectileDamage = 7;
                this.piercing = 2;
                this.stunDuration = 30;
                this.hasSpecialAttack = true;
                this.specialAttackCooldown = 180; // 3초
                break;
            case 'hadoken':
                this.attackPowerBonus = 12;
                this.attackRangeBonus = GRID_SIZE * 3;
                this.attackCooldownBonus = 20;
                this.projectileSpeed = 10;
                this.projectileDamage = 15;
                this.knockbackForce = 10;
                this.areaDamage = GRID_SIZE * 1;
                this.hasSpecialAttack = true;
                this.specialAttackCooldown = 300; // 5초
                break;
            case 'magic_spear':
                this.attackPowerBonus = 10;
                this.attackRangeBonus = GRID_SIZE * 7;
                this.attackCooldownBonus = 10;
                this.projectileSpeed = 18;
                this.projectileDamage = 15;
                this.piercing = 0;
                this.stunDuration = 0;
                this.hasSpecialAttack = true;
                this.specialAttackCooldown = 300; // 5초 (마법진 생성 쿨다운)
                break;
            case 'dual_swords':
                this.attackPowerBonus = 8;
                this.attackRangeBonus = GRID_SIZE * 0.8;
                this.attackCooldownBonus = -5;
                this.speedBonus = 0.5; // 전투 시 이속 증가
                this.hasSpecialAttack = true;
                this.specialAttackCooldown = 300; // 5초
                break;
            case 'crown':
                this.attackPowerBonus = 0;
                this.attackRangeBonus = GRID_SIZE * 0.5;
                this.attackCooldownBonus = 0;
                this.detectionRangeBonus = GRID_SIZE * 3;
                this.hasSpecialAttack = false;
                break;
            default: // Default weapon (no weapon)
                this.attackPowerBonus = 0;
                this.attackRangeBonus = GRID_SIZE * 0.5;
                this.attackCooldownBonus = 0;
                this.type = 'none';
                break;
        }
    }

    use(caster, target) {
        if (!caster || !target) return;

        const gameManager = this.gameManager;
        if (!gameManager) return;

        caster.attackAnimationTimer = 10; // 공격 애니메이션 타이머 설정
        caster.facingAngle = Math.atan2(target.pixelY - caster.pixelY, target.pixelX - caster.pixelX);

        switch (this.type) {
            case 'sword':
                this.useSword(caster, target);
                break;
            case 'bow':
                this.useBow(caster, target);
                break;
            case 'axe':
                this.useAxe(caster, target);
                break;
            case 'boomerang':
                gameManager.createProjectile(caster, target, 'boomerang_projectile');
                gameManager.audioManager.play('boomerang');
                break;
            case 'shuriken':
                gameManager.createProjectile(caster, target, 'shuriken_projectile');
                gameManager.audioManager.play('shurikenShoot');
                break;
            case 'magic_dagger':
                target.takeDamage(caster.attackPower, {}, caster);
                gameManager.audioManager.play('daggerHit');
                break;
            case 'fire_staff':
                gameManager.createProjectile(caster, target, 'fireball_projectile');
                gameManager.audioManager.play('fireball');
                break;
            case 'ice_diamond':
                if (caster.iceDiamondCharges > 0) {
                    caster.iceDiamondCharges--;
                    gameManager.createProjectile(caster, target, 'ice_shard_projectile', { stunDuration: 90 });
                    gameManager.audioManager.play('iceHit');
                } else {
                    target.takeDamage(caster.attackPower * 0.5, {}, caster);
                    gameManager.audioManager.play('punch');
                }
                break;
            case 'poison_potion':
                caster.isCasting = true;
                caster.castingProgress = 0;
                caster.castTargetPos = { x: target.pixelX, y: target.pixelY };
                caster.castDuration = this.specialAttackCooldown;
                break;
            case 'lightning':
                gameManager.createProjectile(caster, target, 'lightning_bolt');
                gameManager.audioManager.play('lightning');
                break;
            case 'hadoken':
                gameManager.createProjectile(caster, target, 'hadoken_projectile');
                gameManager.audioManager.play('hadoken');
                break;
            case 'magic_spear':
                gameManager.createProjectile(caster, target, 'magic_spear_projectile');
                gameManager.audioManager.play('spear');
                break;
            case 'dual_swords':
                this.useDualSwords(caster, target);
                break;
            default:
                target.takeDamage(caster.attackPower, {}, caster);
                gameManager.audioManager.play('punch');
                break;
        }
        caster.attackCooldown = caster.cooldownTime;
    }

    useSword(caster, target) {
        const gameManager = this.gameManager;
        caster.attackCount = (caster.attackCount + 1) % 3;
        let damageMultiplier = 1;
        let stunDuration = 0;
        let knockbackForce = 0;
        let swordAudio = 'swordHit';
        let swordEffectType = 'sword_swing_effect';

        if (caster.attackCount === 0) { // 세 번째 공격 (강력한 공격)
            damageMultiplier = 2.5;
            stunDuration = 60;
            knockbackForce = 15;
            swordAudio = 'swordHeavy';
            swordEffectType = 'sword_heavy_swing_effect';
            caster.swordSpecialAttackAnimationTimer = 20; // 특수 공격 애니메이션 시작
        }

        const angle = Math.atan2(target.pixelY - caster.pixelY, target.pixelX - caster.pixelX);
        const effectInfo = {
            angle: angle,
            stun: stunDuration,
            force: knockbackForce
        };
        target.takeDamage(caster.attackPower * damageMultiplier, effectInfo, caster);
        gameManager.audioManager.play(swordAudio);
        gameManager.createEffect(swordEffectType, caster.pixelX, caster.pixelY, caster, angle);
    }

    useBow(caster, target) {
        const gameManager = this.gameManager;
        caster.attackCount = (caster.attackCount + 1) % 3;
        let projectileType = 'arrow_projectile';
        let arrowDamageMultiplier = 1;
        let additionalPiercing = 0;
        let bowAudio = 'bowShoot';

        if (caster.attackCount === 0) { // 세 번째 공격 (강력한 화살)
            projectileType = 'power_arrow_projectile';
            arrowDamageMultiplier = 1.5;
            additionalPiercing = 1;
            bowAudio = 'bowPowerShoot';
        }

        gameManager.createProjectile(caster, target, projectileType, {
            damageMultiplier: arrowDamageMultiplier,
            piercing: additionalPiercing
        });
        gameManager.audioManager.play(bowAudio);
    }

    useAxe(caster, target) {
        const gameManager = this.gameManager;
        const angle = Math.atan2(target.pixelY - caster.pixelY, target.pixelX - caster.pixelX);
        const effectInfo = {
            angle: angle,
            force: this.knockbackForce
        };
        target.takeDamage(caster.attackPower, effectInfo, caster);
        gameManager.audioManager.play('axeHit');
        gameManager.createEffect('physical_hit', target.pixelX, target.pixelY);
    }

    useDualSwords(caster, target) {
        const gameManager = this.gameManager;
        caster.attackCount = (caster.attackCount + 1) % 3;
        let damageMultiplier = 1;
        let audio = 'dualSwordHit1';

        if (caster.attackCount === 0) { // 세 번째 공격 (텔레포트 공격)
            damageMultiplier = 0.5; // 실제 데미지는 텔레포트 후 광역으로 들어감
            audio = 'dualSwordTeleportCharge';
            caster.dualSwordTeleportTarget = target;
            caster.dualSwordTeleportDelayTimer = 30; // 0.5초 후 텔레포트
            target.isMarkedByDualSword = { active: true, timer: 60 };
        } else if (caster.attackCount === 1) {
            audio = 'dualSwordHit2';
        }

        target.takeDamage(caster.attackPower * damageMultiplier, {}, caster);
        gameManager.audioManager.play(audio);
        gameManager.createEffect('physical_hit', target.pixelX, target.pixelY);
    }


    draw(ctx, isOutlineEnabled, outlineWidth) {
        if (this.isEquipped) return;

        const { pixelX: x, pixelY: y } = this;
        const radius = GRID_SIZE * 0.4;
        const outlineColor = isOutlineEnabled ? 'black' : 'transparent';

        // Background circle
        ctx.fillStyle = '#4a5568';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        if (isOutlineEnabled) {
            ctx.strokeStyle = outlineColor;
            ctx.lineWidth = outlineWidth;
            ctx.stroke();
        }

        // Weapon icon
        ctx.save();
        ctx.translate(x, y);

        switch (this.type) {
            case 'sword':
                ctx.fillStyle = '#cbd5e0';
                ctx.strokeStyle = '#2d3748';
                ctx.lineWidth = 2;
                // Blade
                ctx.beginPath();
                ctx.moveTo(-5, -20);
                ctx.lineTo(5, -20);
                ctx.lineTo(5, 10);
                ctx.lineTo(-5, 10);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                // Hilt
                ctx.fillRect(-10, 10, 20, 5); ctx.strokeRect(-10, 10, 20, 5);
                ctx.fillRect(-3, 15, 6, 10); ctx.strokeRect(-3, 15, 6, 10);
                break;
            case 'bow':
                ctx.strokeStyle = '#a0522d';
                ctx.lineWidth = 3;
                // Bow curve
                ctx.beginPath();
                ctx.arc(0, 0, 20, Math.PI * 0.7, Math.PI * 0.3, true);
                ctx.stroke();
                // String
                ctx.beginPath();
                ctx.moveTo(20 * Math.cos(Math.PI * 0.3), 20 * Math.sin(Math.PI * 0.3));
                ctx.lineTo(20 * Math.cos(Math.PI * 0.7), 20 * Math.sin(Math.PI * 0.7));
                ctx.stroke();
                break;
            case 'axe':
                ctx.fillStyle = '#a0aec0';
                ctx.strokeStyle = '#2d3748';
                ctx.lineWidth = 2;
                // Blade
                ctx.beginPath();
                ctx.moveTo(0, -15);
                ctx.lineTo(15, -5);
                ctx.lineTo(15, 5);
                ctx.lineTo(0, 15);
                ctx.lineTo(0, -15);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                // Handle
                ctx.fillRect(-5, -10, 10, 25);
                ctx.strokeRect(-5, -10, 10, 25);
                break;
            case 'boomerang':
                ctx.strokeStyle = '#e07b39';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(-5, -5, 15, Math.PI * 0.2, Math.PI * 0.8);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(5, 5, 15, Math.PI * 1.2, Math.PI * 1.8);
                ctx.stroke();
                break;
            case 'shuriken':
                ctx.fillStyle = '#a0aec0';
                ctx.strokeStyle = '#2d3748';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                for (let i = 0; i < 8; i++) {
                    const angle = i * Math.PI / 4;
                    const outerX = Math.cos(angle) * 20;
                    const outerY = Math.sin(angle) * 20;
                    const innerX = Math.cos(angle + Math.PI / 8) * 10;
                    const innerY = Math.sin(angle + Math.PI / 8) * 10;
                    if (i === 0) ctx.moveTo(outerX, outerY);
                    else ctx.lineTo(outerX, outerY);
                    ctx.lineTo(innerX, innerY);
                }
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                break;
            case 'magic_dagger':
                ctx.fillStyle = '#dbeafe';
                ctx.strokeStyle = '#60a5fa';
                ctx.lineWidth = 2;
                // Blade
                ctx.beginPath();
                ctx.moveTo(0, -20);
                ctx.lineTo(8, 0);
                ctx.lineTo(0, 20);
                ctx.lineTo(-8, 0);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                // Hilt
                ctx.fillStyle = '#6b7280';
                ctx.fillRect(-10, 0, 20, 5);
                ctx.strokeRect(-10, 0, 20, 5);
                break;
            case 'fire_staff':
                ctx.strokeStyle = '#8b4513';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(0, 25);
                ctx.lineTo(0, -25);
                ctx.stroke();
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath();
                ctx.arc(0, -25, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ef4444';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-5, -20);
                ctx.lineTo(0, -30);
                ctx.lineTo(5, -20);
                ctx.stroke();
                break;
            case 'ice_diamond':
                ctx.fillStyle = '#e0f2fe';
                ctx.strokeStyle = '#38bdf8';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -20);
                ctx.lineTo(15, 0);
                ctx.lineTo(0, 20);
                ctx.lineTo(-15, 0);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                break;
            case 'poison_potion':
                ctx.fillStyle = '#dcfce7';
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, 15, 0, Math.PI * 2);
                ctx.fill(); ctx.stroke();
                ctx.fillRect(-5, -20, 10, 10);
                ctx.strokeRect(-5, -20, 10, 10);
                ctx.fillStyle = '#86efad';
                ctx.beginPath();
                ctx.arc(-5, 5, 5, 0, Math.PI * 2); ctx.fill();
                ctx.arc(5, 5, 5, 0, Math.PI * 2); ctx.fill();
                ctx.arc(0, 10, 5, 0, Math.PI * 2); ctx.fill();
                break;
            case 'lightning':
                ctx.strokeStyle = '#fde047';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(0, -20);
                ctx.lineTo(-10, 0);
                ctx.lineTo(10, 0);
                ctx.lineTo(0, 20);
                ctx.stroke();
                break;
            case 'hadoken':
                ctx.fillStyle = '#3b82f6';
                ctx.strokeStyle = '#60a5fa';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, 18, 0, Math.PI * 2);
                ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#bfdbfe';
                ctx.beginPath();
                ctx.arc(0, 0, 8, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'magic_spear':
                ctx.strokeStyle = '#c084fc';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(0, 20);
                ctx.lineTo(0, -20);
                ctx.stroke();
                ctx.fillStyle = '#e9d5ff';
                ctx.beginPath();
                ctx.moveTo(0, -25);
                ctx.lineTo(10, -15);
                ctx.lineTo(-10, -15);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                break;
            case 'dual_swords':
                // Left sword
                ctx.save();
                ctx.rotate(-Math.PI / 8);
                ctx.fillStyle = '#a0aec0';
                ctx.strokeStyle = '#2d3748';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-8, -15);
                ctx.lineTo(-2, -15);
                ctx.lineTo(-2, 5);
                ctx.lineTo(-8, 5);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                ctx.fillRect(-10, 5, 10, 3);
                ctx.strokeRect(-10, 5, 10, 3);
                ctx.restore();

                // Right sword
                ctx.save();
                ctx.rotate(Math.PI / 8);
                ctx.fillStyle = '#a0aec0';
                ctx.strokeStyle = '#2d3748';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(2, -15);
                ctx.lineTo(8, -15);
                ctx.lineTo(8, 5);
                ctx.lineTo(2, 5);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                ctx.fillRect(0, 5, 10, 3);
                ctx.strokeRect(0, 5, 10, 3);
                ctx.restore();
                break;
            case 'crown':
                ctx.fillStyle = '#facc15'; ctx.strokeStyle = 'black'; ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-15, -5); ctx.lineTo(-15, 5);
                ctx.lineTo(15, 5); ctx.lineTo(15, -5);
                ctx.lineTo(5, -2); ctx.lineTo(0, -5);
                ctx.lineTo(-5, -2); ctx.closePath();
                ctx.fill(); ctx.stroke();
                break;
        }
        ctx.restore();
    }

    // 유닛에 장착된 무기를 그리는 메서드
    drawEquipped(ctx, unit, isChargingSpecial) {
        const gameManager = this.gameManager;
        const x = unit.pixelX;
        const y = unit.pixelY;
        const angle = unit.facingAngle;
        const attackAnimationOffset = unit.attackAnimationTimer > 0 ? -5 : 0; // 공격 시 뒤로 당겨지는 효과
        const swordSpecialAttackOffset = unit.swordSpecialAttackAnimationTimer > 0 ? 10 : 0; // 검 특수 공격 시 앞으로 내미는 효과
        const kingTotalScale = unit.isKing ? 1.2 : 1;
        const levelScale = 1 + (unit.level - 1) * 0.08;
        const totalUnitScale = kingTotalScale * levelScale;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // 무기가 빛나는 효과 (테두리와 내부 색상 포함)
        if (isChargingSpecial) {
            let glowColor;
            switch (unit.team) {
                case TEAM.A: glowColor = DEEP_COLORS.TEAM_A; break;
                case TEAM.B: glowColor = DEEP_COLORS.TEAM_B; break;
                case TEAM.C: glowColor = DEEP_COLORS.TEAM_C; break;
                case TEAM.D: glowColor = DEEP_COLORS.TEAM_D; break;
                default: glowColor = '#FFFFFF'; break;
            }

            const glowIntensity = 0.6 + Math.sin(gameManager.animationFrameCounter * 0.1) * 0.3; // 맥박처럼 빛나도록
            ctx.shadowBlur = 10;
            ctx.shadowColor = glowColor;
            ctx.globalAlpha = glowIntensity;
        }

        switch (this.type) {
            case 'sword':
                ctx.translate(attackAnimationOffset + swordSpecialAttackOffset, 0); // 공격 시 칼이 움직이도록
                ctx.fillStyle = '#cbd5e0';
                ctx.strokeStyle = '#2d3748'; // 기본 검정 테두리
                ctx.lineWidth = 2 / totalUnitScale;
                if (isChargingSpecial) { // 강력한 공격 준비 시
                    ctx.strokeStyle = gameManager.getTeamColor(unit.team);
                    ctx.lineWidth = 3 / totalUnitScale;
                    ctx.fillStyle = gameManager.getLightTeamColor(unit.team);
                }
                // Blade
                ctx.beginPath();
                ctx.moveTo(-5, -20);
                ctx.lineTo(5, -20);
                ctx.lineTo(5, 10);
                ctx.lineTo(-5, 10);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                // Hilt
                ctx.fillRect(-10, 10, 20, 5); ctx.strokeRect(-10, 10, 20, 5);
                ctx.fillRect(-3, 15, 6, 10); ctx.strokeRect(-3, 15, 6, 10);
                break;
            case 'bow':
                ctx.translate(attackAnimationOffset, 0);
                ctx.strokeStyle = '#a0522d'; // 기본 활 색상
                ctx.lineWidth = 3 / totalUnitScale;
                if (isChargingSpecial) { // 강력한 공격 준비 시
                    ctx.strokeStyle = gameManager.getTeamColor(unit.team);
                    ctx.lineWidth = 4 / totalUnitScale;
                }
                // Bow curve
                ctx.beginPath();
                ctx.arc(0, 0, 20, Math.PI * 0.7, Math.PI * 0.3, true);
                ctx.stroke();
                // String
                ctx.beginPath();
                ctx.moveTo(20 * Math.cos(Math.PI * 0.3), 20 * Math.sin(Math.PI * 0.3));
                ctx.lineTo(20 * Math.cos(Math.PI * 0.7), 20 * Math.sin(Math.PI * 0.7));
                ctx.stroke();
                break;
            case 'axe':
                ctx.translate(attackAnimationOffset, 0);
                ctx.rotate(unit.spinAnimationTimer > 0 ? gameManager.animationFrameCounter * 0.5 : 0); // 스킬 사용 시 회전
                ctx.fillStyle = '#a0aec0';
                ctx.strokeStyle = '#2d3748';
                ctx.lineWidth = 2 / totalUnitScale;
                if (isChargingSpecial) { // 스킬 준비 시
                    ctx.strokeStyle = gameManager.getTeamColor(unit.team);
                    ctx.lineWidth = 3 / totalUnitScale;
                    ctx.fillStyle = gameManager.getLightTeamColor(unit.team);
                }
                // Blade
                ctx.beginPath();
                ctx.moveTo(0, -15);
                ctx.lineTo(15, -5);
                ctx.lineTo(15, 5);
                ctx.lineTo(0, 15);
                ctx.lineTo(0, -15);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                // Handle
                ctx.fillRect(-5, -10, 10, 25);
                ctx.strokeRect(-5, -10, 10, 25);
                break;
            case 'boomerang':
                ctx.translate(attackAnimationOffset, 0);
                ctx.strokeStyle = '#e07b39';
                ctx.lineWidth = 4 / totalUnitScale;
                if (isChargingSpecial) { // 스킬 준비 시
                    ctx.strokeStyle = gameManager.getTeamColor(unit.team);
                    ctx.lineWidth = 5 / totalUnitScale;
                }
                ctx.beginPath();
                ctx.arc(-5, -5, 15, Math.PI * 0.2, Math.PI * 0.8);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(5, 5, 15, Math.PI * 1.2, Math.PI * 1.8);
                ctx.stroke();
                break;
            case 'shuriken':
                ctx.translate(attackAnimationOffset, 0);
                ctx.rotate(gameManager.animationFrameCounter * 0.2); // 항상 약간 회전
                ctx.fillStyle = '#a0aec0';
                ctx.strokeStyle = '#2d3748';
                ctx.lineWidth = 1.5 / totalUnitScale;
                if (isChargingSpecial) { // 스킬 준비 시
                    ctx.strokeStyle = gameManager.getTeamColor(unit.team);
                    ctx.lineWidth = 2.5 / totalUnitScale;
                    ctx.fillStyle = gameManager.getLightTeamColor(unit.team);
                }
                ctx.beginPath();
                for (let i = 0; i < 8; i++) {
                    const angle = i * Math.PI / 4;
                    const outerX = Math.cos(angle) * 20;
                    const outerY = Math.sin(angle) * 20;
                    const innerX = Math.cos(angle + Math.PI / 8) * 10;
                    const innerY = Math.sin(angle + Math.PI / 8) * 10;
                    if (i === 0) ctx.moveTo(outerX, outerY);
                    else ctx.lineTo(outerX, outerY);
                    ctx.lineTo(innerX, innerY);
                }
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                break;
            case 'fire_staff':
                ctx.translate(attackAnimationOffset, 0);
                ctx.strokeStyle = '#8b4513';
                ctx.lineWidth = 4 / totalUnitScale;
                if (isChargingSpecial) { // 스킬 준비 시
                    ctx.strokeStyle = gameManager.getTeamColor(unit.team);
                    ctx.lineWidth = 5 / totalUnitScale;
                }
                ctx.beginPath();
                ctx.moveTo(0, 25);
                ctx.lineTo(0, -25);
                ctx.stroke();
                ctx.fillStyle = '#f59e0b'; // 불꽃 부분
                if (isChargingSpecial) {
                    ctx.fillStyle = gameManager.getLightTeamColor(unit.team);
                }
                ctx.beginPath();
                ctx.arc(0, -25, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ef4444'; // 불꽃 테두리
                ctx.lineWidth = 2 / totalUnitScale;
                if (isChargingSpecial) {
                    ctx.strokeStyle = gameManager.getTeamColor(unit.team);
                    ctx.lineWidth = 3 / totalUnitScale;
                }
                ctx.beginPath();
                ctx.moveTo(-5, -20);
                ctx.lineTo(0, -30);
                ctx.lineTo(5, -20);
                ctx.stroke();
                break;
            case 'magic_dagger':
                ctx.translate(attackAnimationOffset, 0);
                ctx.fillStyle = '#dbeafe';
                ctx.strokeStyle = '#60a5fa';
                ctx.lineWidth = 2 / totalUnitScale;
                if (isChargingSpecial) { // 스킬 준비 시
                    ctx.strokeStyle = gameManager.getTeamColor(unit.team);
                    ctx.lineWidth = 3 / totalUnitScale;
                    ctx.fillStyle = gameManager.getLightTeamColor(unit.team);
                }
                // Blade
                ctx.beginPath();
                ctx.moveTo(0, -20);
                ctx.lineTo(8, 0);
                ctx.lineTo(0, 20);
                ctx.lineTo(-8, 0);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                // Hilt
                ctx.fillStyle = '#6b7280';
                if (isChargingSpecial) { ctx.fillStyle = gameManager.getLightTeamColor(unit.team); }
                ctx.fillRect(-10, 0, 20, 5);
                ctx.strokeRect(-10, 0, 20, 5);
                break;
            case 'dual_swords':
                ctx.translate(attackAnimationOffset, 0);
                if (unit.dualSwordSpinAttackTimer > 0) {
                    ctx.rotate(gameManager.animationFrameCounter * 0.8);
                }
                ctx.fillStyle = '#a0aec0';
                ctx.strokeStyle = '#2d3748';
                ctx.lineWidth = 2 / totalUnitScale;
                if (isChargingSpecial) { // 스킬 준비 시
                    ctx.strokeStyle = gameManager.getTeamColor(unit.team);
                    ctx.lineWidth = 3 / totalUnitScale;
                    ctx.fillStyle = gameManager.getLightTeamColor(unit.team);
                }
                // Left sword
                ctx.save();
                ctx.rotate(-Math.PI / 8);
                ctx.beginPath();
                ctx.moveTo(-8, -15);
                ctx.lineTo(-2, -15);
                ctx.lineTo(-2, 5);
                ctx.lineTo(-8, 5);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                ctx.fillRect(-10, 5, 10, 3);
                ctx.strokeRect(-10, 5, 10, 3);
                ctx.restore();

                // Right sword
                ctx.save();
                ctx.rotate(Math.PI / 8);
                ctx.beginPath();
                ctx.moveTo(2, -15);
                ctx.lineTo(8, -15);
                ctx.lineTo(8, 5);
                ctx.lineTo(2, 5);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                ctx.fillRect(0, 5, 10, 3);
                ctx.strokeRect(0, 5, 10, 3);
                ctx.restore();
                break;
            // 다른 무기들의 drawEquipped 로직...
            // 예시: Crown은 Unit 클래스에서 직접 그립니다.
        }
        ctx.restore(); // restore globalAlpha
        ctx.shadowBlur = 0; // reset shadow
        ctx.globalAlpha = 1;
    }
}

// ... (Projectile, MagicDaggerDashEffect, createPhysicalHitEffect 클래스는 변경 없음)
// Projectile class (변경 없음)
export class Projectile {
    constructor(gameManager, owner, target, type, options = {}) {
        this.gameManager = gameManager;
        this.owner = owner;
        this.pixelX = owner.pixelX;
        this.pixelY = owner.pixelY;
        this.target = target;
        this.type = type;
        this.damage = owner.attackPower * (options.damageMultiplier || 1);
        this.speed = owner.weapon.projectileSpeed;
        this.piercing = owner.weapon.piercing + (options.piercing || 0);
        this.bounces = owner.weapon.bounces;
        this.knockbackForce = owner.weapon.knockbackForce;
        this.stunDuration = owner.weapon.stunDuration + (options.stunDuration || 0);
        this.areaDamage = owner.weapon.areaDamage;
        this.team = owner.team;
        this.hitUnits = new Set();
        this.life = 300; // projectiles expire after some time

        if (this.target) {
            this.angle = Math.atan2(target.pixelY - this.pixelY, target.pixelX - this.pixelX);
        } else {
            this.angle = owner.facingAngle;
        }

        if (this.type === 'hadoken_projectile') {
            this.pixelX += Math.cos(this.angle) * GRID_SIZE;
            this.pixelY += Math.sin(this.angle) * GRID_SIZE;
        }

        if (options.pullTargetPos) {
            this.pullTargetPos = options.pullTargetPos;
        }
    }

    update() {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        this.life -= gameManager.gameSpeed;
        if (this.life <= 0) {
            this.gameManager.removeProjectile(this);
            return;
        }

        const prevX = this.pixelX;
        const prevY = this.pixelY;

        this.pixelX += Math.cos(this.angle) * this.speed * gameManager.gameSpeed;
        this.pixelY += Math.sin(this.angle) * this.speed * gameManager.gameSpeed;

        const currentGridX = Math.floor(this.pixelX / GRID_SIZE);
        const currentGridY = Math.floor(this.pixelY / GRID_SIZE);

        if (currentGridY < 0 || currentGridY >= gameManager.ROWS || currentGridX < 0 || currentGridX >= gameManager.COLS) {
            this.gameManager.removeProjectile(this);
            return;
        }

        const tile = gameManager.map[currentGridY][currentGridX];
        if (tile.type === TILE.WALL || tile.type === TILE.CRACKED_WALL || tile.type === TILE.GLASS_WALL) {
            if (tile.type === TILE.CRACKED_WALL) {
                gameManager.damageTile(currentGridX, currentGridY, this.damage * 0.5);
            }
            if (this.bounces > 0) {
                this.bounces--;
                const hitAngle = Math.atan2(this.pixelY - prevY, this.pixelX - prevX);
                const wallAngle = gameManager.getWallNormalAngle(currentGridX, currentGridY, prevX, prevY);
                this.angle = 2 * wallAngle - hitAngle + Math.PI;
                this.pixelX = prevX;
                this.pixelY = prevY; // Prevent getting stuck in wall
                if (this.type === 'shuriken_projectile') {
                    gameManager.audioManager.play('shurikenHit');
                } else {
                    gameManager.audioManager.play('arrowHit');
                }
            } else {
                this.gameManager.removeProjectile(this);
                if (this.type === 'fireball_projectile') {
                    gameManager.castAreaSpell({ x: this.pixelX, y: this.pixelY }, 'fire_explosion', this.team, this.owner.specialAttackLevelBonus);
                } else if (this.type === 'ice_shard_projectile') {
                    gameManager.castAreaSpell({ x: this.pixelX, y: this.pixelY }, 'ice_explosion', this.team, this.owner.specialAttackLevelBonus);
                } else if (this.type === 'hadoken_projectile') {
                    gameManager.castAreaSpell({ x: this.pixelX, y: this.pixelY }, 'hadoken_explosion', this.team, this.owner.specialAttackLevelBonus);
                } else if (this.type === 'bouncing_sword') {
                    gameManager.castAreaSpell({ x: this.pixelX, y: this.pixelY }, 'dual_sword_explosion', this.team, this.owner.specialAttackLevelBonus);
                }
            }
        }

        let targetsHitThisFrame = new Set();

        // Check for unit collision
        for (const unit of gameManager.units) {
            if (unit.team === this.team || unit.hp <= 0 || this.hitUnits.has(unit)) continue;

            const dist = Math.hypot(this.pixelX - unit.pixelX, this.pixelY - unit.pixelY);
            const collisionRadius = GRID_SIZE / 2;
            if (dist < collisionRadius) {
                targetsHitThisFrame.add(unit);
                const effectInfo = {
                    force: this.knockbackForce,
                    angle: this.angle,
                    stun: this.stunDuration
                };

                if (this.type === 'bouncing_sword' && unit.isMarkedByDualSword.active) {
                    unit.takeDamage(this.damage * 2, effectInfo, this.owner);
                    unit.isMarkedByDualSword.active = false;
                } else {
                    unit.takeDamage(this.damage, effectInfo, this.owner);
                }

                if (this.type === 'magic_spear_special') {
                    unit.isBeingPulled = true;
                    unit.puller = this.owner;
                    unit.pullTargetPos = this.pullTargetPos;
                }

                if (this.piercing > 0) {
                    this.piercing--;
                    this.hitUnits.add(unit);
                } else {
                    this.gameManager.removeProjectile(this);
                    if (this.type === 'fireball_projectile') {
                        gameManager.castAreaSpell({ x: this.pixelX, y: this.pixelY }, 'fire_explosion', this.team, this.owner.specialAttackLevelBonus);
                    } else if (this.type === 'ice_shard_projectile') {
                        gameManager.castAreaSpell({ x: this.pixelX, y: this.pixelY }, 'ice_explosion', this.team, this.owner.specialAttackLevelBonus);
                    } else if (this.type === 'hadoken_projectile') {
                        gameManager.castAreaSpell({ x: this.pixelX, y: this.pixelY }, 'hadoken_explosion', this.team, this.owner.specialAttackLevelBonus);
                    } else if (this.type === 'bouncing_sword') {
                        gameManager.castAreaSpell({ x: this.pixelX, y: this.pixelY }, 'dual_sword_explosion', this.team, this.owner.specialAttackLevelBonus);
                    }
                    return;
                }
            }
        }

        // Check for nexus collision
        for (const nexus of gameManager.nexuses) {
            if (nexus.team === this.team || nexus.isDestroying) continue;

            const dist = Math.hypot(this.pixelX - nexus.pixelX, this.pixelY - nexus.pixelY);
            const collisionRadius = GRID_SIZE * 0.7; // Nexus is larger
            if (dist < collisionRadius) {
                nexus.takeDamage(this.damage, {}, this.owner);
                this.gameManager.removeProjectile(this);
                if (this.type === 'fireball_projectile') {
                    gameManager.castAreaSpell({ x: this.pixelX, y: this.pixelY }, 'fire_explosion', this.team, this.owner.specialAttackLevelBonus);
                } else if (this.type === 'ice_shard_projectile') {
                    gameManager.castAreaSpell({ x: this.pixelX, y: this.pixelY }, 'ice_explosion', this.team, this.owner.specialAttackLevelBonus);
                } else if (this.type === 'hadoken_projectile') {
                    gameManager.castAreaSpell({ x: this.pixelX, y: this.pixelY }, 'hadoken_explosion', this.team, this.owner.specialAttackLevelBonus);
                } else if (this.type === 'bouncing_sword') {
                    gameManager.castAreaSpell({ x: this.pixelX, y: this.pixelY }, 'dual_sword_explosion', this.team, this.owner.specialAttackLevelBonus);
                }
                return;
            }
        }
    }

    draw(ctx) {
        const gameManager = this.gameManager;
        if (!gameManager) return;

        ctx.save();
        ctx.translate(this.pixelX, this.pixelY);
        ctx.rotate(this.angle);

        let teamColor = gameManager.getTeamColor(this.team);

        switch (this.type) {
            case 'arrow_projectile':
            case 'power_arrow_projectile':
                ctx.strokeStyle = teamColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(20, 0);
                ctx.stroke();
                ctx.fillStyle = teamColor;
                ctx.beginPath();
                ctx.moveTo(20, 0);
                ctx.lineTo(15, -3);
                ctx.lineTo(15, 3);
                ctx.closePath();
                ctx.fill();
                break;
            case 'boomerang_projectile':
                ctx.strokeStyle = teamColor;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(-5, -5, 15, Math.PI * 0.2, Math.PI * 0.8);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(5, 5, 15, Math.PI * 1.2, Math.PI * 1.8);
                ctx.stroke();
                break;
            case 'shuriken_projectile':
                ctx.fillStyle = teamColor;
                ctx.strokeStyle = teamColor;
                ctx.lineWidth = 1.5;
                ctx.rotate(gameManager.animationFrameCounter * 0.3);
                ctx.beginPath();
                for (let i = 0; i < 8; i++) {
                    const angle = i * Math.PI / 4;
                    const outerX = Math.cos(angle) * 15;
                    const outerY = Math.sin(angle) * 15;
                    const innerX = Math.cos(angle + Math.PI / 8) * 7;
                    const innerY = Math.sin(angle + Math.PI / 8) * 7;
                    if (i === 0) ctx.moveTo(outerX, outerY);
                    else ctx.lineTo(outerX, outerY);
                    ctx.lineTo(innerX, innerY);
                }
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                break;
            case 'fireball_projectile':
                ctx.fillStyle = gameManager.getLightTeamColor(this.team);
                ctx.shadowColor = teamColor;
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(0, 0, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0; // Reset shadow for other drawings
                break;
            case 'ice_shard_projectile':
                ctx.fillStyle = gameManager.getLightTeamColor(this.team);
                ctx.strokeStyle = teamColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -15);
                ctx.lineTo(10, 0);
                ctx.lineTo(0, 15);
                ctx.lineTo(-10, 0);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                break;
            case 'lightning_bolt':
                ctx.strokeStyle = teamColor;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(0, -15);
                ctx.lineTo(-8, 0);
                ctx.lineTo(8, 0);
                ctx.lineTo(0, 15);
                ctx.stroke();
                break;
            case 'hadoken_projectile':
                ctx.fillStyle = gameManager.getLightTeamColor(this.team);
                ctx.shadowColor = teamColor;
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(0, 0, 18, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.fillStyle = teamColor;
                ctx.beginPath();
                ctx.arc(0, 0, 8, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'magic_spear_projectile':
            case 'magic_spear_special':
                ctx.strokeStyle = teamColor;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(0, 20);
                ctx.lineTo(0, -20);
                ctx.stroke();
                ctx.fillStyle = gameManager.getLightTeamColor(this.team);
                ctx.beginPath();
                ctx.moveTo(0, -25);
                ctx.lineTo(10, -15);
                ctx.lineTo(-10, -15);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                break;
            case 'bouncing_sword':
                ctx.fillStyle = gameManager.getLightTeamColor(this.team);
                ctx.strokeStyle = teamColor;
                ctx.lineWidth = 2;
                ctx.rotate(gameManager.animationFrameCounter * 0.5);
                ctx.beginPath();
                ctx.moveTo(-5, -15);
                ctx.lineTo(5, -15);
                ctx.lineTo(5, 5);
                ctx.lineTo(-5, 5);
                ctx.closePath();
                ctx.fill(); ctx.stroke();
                ctx.fillRect(-8, 5, 16, 3);
                ctx.strokeRect(-8, 5, 16, 3);
                break;
        }
        ctx.restore();
    }
}

// MagicDaggerDashEffect class (변경 없음)
export class MagicDaggerDashEffect {
    constructor(gameManager, startPos, endPos) {
        this.gameManager = gameManager;
        this.startPos = { ...startPos };
        this.endPos = { ...endPos };
        this.life = 30; // 0.5초
        this.maxLife = 30;
    }

    update() {
        this.life -= this.gameManager.gameSpeed;
        if (this.life <= 0) {
            this.gameManager.removeEffect(this);
        }
    }

    draw(ctx) {
        const progress = 1 - (this.life / this.maxLife);
        const currentX = this.startPos.x + (this.endPos.x - this.startPos.x) * progress;
        const currentY = this.startPos.y + (this.endPos.y - this.startPos.y) * progress;

        ctx.save();
        ctx.globalAlpha = 1 - progress;
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(this.startPos.x, this.startPos.y);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }
}

// createPhysicalHitEffect function (변경 없음)
export function createPhysicalHitEffect(gameManager, unit) {
    if (!gameManager) return;

    for (let i = 0; i < 5; i++) {
        const angle = gameManager.random() * Math.PI * 2;
        const speed = 2 + gameManager.random() * 3;
        gameManager.addParticle({
            x: unit.pixelX,
            y: unit.pixelY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.3,
            color: '#FFFFFF',
            size: gameManager.random() * 2 + 1,
            gravity: 0.1
        });
    }
}
