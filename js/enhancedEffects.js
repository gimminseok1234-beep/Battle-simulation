import { TILE, TEAM, COLORS, GRID_SIZE } from './constants.js';
// [수정] 순환 참조 오류를 유발하는 아래 줄을 삭제했습니다.
// import { GameManager } from './gameManager.js'; 

// 향상된 발사체 클래스
export class EnhancedProjectile {
    constructor(owner, target, type = 'arrow', options = {}) {
        const gameManager = GameManager.getInstance();
        this.owner = owner;
        this.pixelX = owner.pixelX;
        this.pixelY = owner.pixelY;
        this.type = type;
        
        // 기본 속성 설정
        this.setupProjectileProperties();
        
        // 시각 효과 속성
        this.trail = [];
        this.particles = [];
        this.rotationAngle = 0;
        this.animationTimer = 0;
        this.glowIntensity = 1.0;
        this.pulseTimer = 0;
        
        // 충돌 감지
        this.hitTargets = options.hitTargets || new Set();
        this.destroyed = false;
        
        // 목표 설정
        const inaccuracy = this.getInaccuracy();
        const targetX = target.pixelX + (Math.random() - 0.5) * inaccuracy;
        const targetY = target.pixelY + (Math.random() - 0.5) * inaccuracy;
        const dx = targetX - this.pixelX;
        const dy = targetY - this.pixelY;
        this.angle = options.angle !== undefined ? options.angle : Math.atan2(dy, dx);
        
        // 타입별 초기화
        this.initializeTypeSpecific();
        
        if (type === 'lightning_bolt' && options.initialTarget) {
            this.hitTargets.add(options.initialTarget);
        }
    }
    
    setupProjectileProperties() {
        const gameManager = GameManager.getInstance();
        const projectileData = {
            'arrow': { speed: 6, damage: this.owner.attackPower },
            'hadoken': { speed: 4, damage: this.owner.attackPower, knockback: gameManager.hadokenKnockback },
            'shuriken': { speed: 2, damage: this.owner.attackPower },
            'lightning_bolt': { speed: 8, damage: this.owner.attackPower },
            'boomerang_projectile': { speed: 5, damage: 0 },
            'boomerang_normal_projectile': { speed: 5, damage: 12 },
            'magic_spear_special': { speed: 6, damage: (this.owner.weapon?.specialAttackPowerBonus || 0) + this.owner.baseAttackPower },
            'magic_spear_normal': { speed: 6, damage: (this.owner.weapon?.normalAttackPowerBonus || 0) + this.owner.baseAttackPower }
        };
        
        const data = projectileData[this.type] || { speed: 6, damage: this.owner.attackPower };
        this.speed = data.speed;
        this.damage = data.damage;
        this.knockback = data.knockback || 0;
    }
    
    getInaccuracy() {
        const noInaccuracyTypes = ['shuriken', 'lightning_bolt'];
        return noInaccuracyTypes.includes(this.type) ? 0 : GRID_SIZE * 0.8;
    }
    
    initializeTypeSpecific() {
        switch(this.type) {
            case 'hadoken':
                // 파동권 초기 파티클 생성
                for (let i = 0; i < 15; i++) {
                    this.particles.push({
                        x: 0, y: 0,
                        vx: (Math.random() - 0.5) * 2,
                        vy: (Math.random() - 0.5) * 2,
                        life: 1.0,
                        decay: 0.02,
                        size: Math.random() * 3 + 2,
                        color: `hsl(${240 + Math.random() * 60}, 80%, ${60 + Math.random() * 30}%)`
                    });
                }
                break;
                
            case 'lightning_bolt':
                // 번개 지그재그 패턴 생성
                this.lightningPoints = this.generateLightningPath();
                this.sparkParticles = [];
                break;
                
            case 'magic_spear_special':
            case 'magic_spear_normal':
                // 마법창 오라 파티클
                for (let i = 0; i < 8; i++) {
                    this.particles.push({
                        x: 0, y: 0,
                        angle: (i / 8) * Math.PI * 2,
                        radius: GRID_SIZE * 0.3,
                        life: 1.0,
                        size: 2
                    });
                }
                break;
        }
    }
    
    generateLightningPath() {
        const points = [{x: -GRID_SIZE * 0.5, y: 0}];
        const segments = 8;
        
        for (let i = 1; i < segments; i++) {
            const x = (-GRID_SIZE * 0.5) + (i / segments) * GRID_SIZE;
            const y = (Math.random() - 0.5) * GRID_SIZE * 0.3;
            points.push({x, y});
        }
        
        points.push({x: GRID_SIZE * 0.5, y: 0});
        return points;
    }

    update() {
        const gameManager = GameManager.getInstance();
        if (!gameManager) return;
        
        this.animationTimer += gameManager.gameSpeed;
        this.pulseTimer += gameManager.gameSpeed * 0.1;
        
        // 트레일 업데이트
        if (['hadoken', 'lightning_bolt', 'magic_spear_special', 'magic_spear_normal'].includes(this.type)) {
            this.trail.push({x: this.pixelX, y: this.pixelY, life: 1.0});
            if (this.trail.length > 12) this.trail.shift();
            
            this.trail.forEach(point => {
                point.life -= 0.08;
            });
            this.trail = this.trail.filter(point => point.life > 0);
        }
        
        // 회전 애니메이션
        if (['shuriken', 'boomerang_projectile', 'boomerang_normal_projectile'].includes(this.type)) {
            this.rotationAngle += 0.4 * gameManager.gameSpeed;
        }
        
        // 타입별 특수 업데이트
        this.updateTypeSpecific(gameManager);
        
        // 이동 및 충돌 검사
        this.moveAndCheckCollision(gameManager);
    }
    
    updateTypeSpecific(gameManager) {
        switch(this.type) {
            case 'hadoken':
                // 파동권 파티클 업데이트
                this.particles.forEach(p => {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.life -= p.decay;
                    p.vx *= 0.98;
                    p.vy *= 0.98;
                });
                this.particles = this.particles.filter(p => p.life > 0);
                
                // 새 파티클 생성
                if (Math.random() < 0.3) {
                    this.particles.push({
                        x: 0, y: 0,
                        vx: (Math.random() - 0.5) * 3,
                        vy: (Math.random() - 0.5) * 3,
                        life: 1.0,
                        decay: 0.03,
                        size: Math.random() * 4 + 1,
                        color: `hsl(${240 + Math.random() * 60}, 80%, ${60 + Math.random() * 30}%)`
                    });
                }
                break;
                
            case 'lightning_bolt':
                // 번개 스파크 생성
                if (Math.random() < 0.4) {
                    this.sparkParticles.push({
                        x: (Math.random() - 0.5) * GRID_SIZE,
                        y: (Math.random() - 0.5) * GRID_SIZE * 0.3,
                        vx: (Math.random() - 0.5) * 4,
                        vy: (Math.random() - 0.5) * 4,
                        life: 0.5,
                        size: Math.random() * 2 + 1
                    });
                }
                
                this.sparkParticles.forEach(spark => {
                    spark.x += spark.vx;
                    spark.y += spark.vy;
                    spark.life -= 0.05;
                    spark.vx *= 0.95;
                    spark.vy *= 0.95;
                });
                this.sparkParticles = this.sparkParticles.filter(spark => spark.life > 0);
                
                // 번개 경로 재생성 (불안정한 효과)
                if (this.animationTimer % 3 === 0) {
                    this.lightningPoints = this.generateLightningPath();
                }
                break;
                
            case 'magic_spear_special':
            case 'magic_spear_normal':
                // 마법창 오라 회전
                this.particles.forEach((p, index) => {
                    p.angle += 0.1;
                    p.x = Math.cos(p.angle) * p.radius;
                    p.y = Math.sin(p.angle) * p.radius;
                });
                break;
        }
    }
    
    moveAndCheckCollision(gameManager) {
        const nextX = this.pixelX + Math.cos(this.angle) * gameManager.gameSpeed * this.speed;
        const nextY = this.pixelY + Math.sin(this.angle) * gameManager.gameSpeed * this.speed;
        const gridX = Math.floor(nextX / GRID_SIZE);
        const gridY = Math.floor(nextY / GRID_SIZE);

        if (gridY >= 0 && gridY < gameManager.ROWS && gridX >= 0 && gridX < gameManager.COLS) {
            const tile = gameManager.map[gridY][gridX];
            
            if (this.type !== 'magic_spear_special' && (tile.type === TILE.WALL || tile.type === TILE.CRACKED_WALL)) {
                if (tile.type === TILE.CRACKED_WALL) {
                    gameManager.damageTile(gridX, gridY, this.damage);
                }
                this.createImpactEffect();
                this.destroyed = true;
                return;
            }
        }
        
        this.pixelX = nextX;
        this.pixelY = nextY;
    }
    
    createImpactEffect() {
        const gameManager = GameManager.getInstance();
        if (!gameManager) return;
        
        // 충돌 시 파티클 효과 생성
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            gameManager.addParticle({
                x: this.pixelX,
                y: this.pixelY,
                vx: Math.cos(angle) * 3,
                vy: Math.sin(angle) * 3,
                life: 0.5,
                color: this.getImpactColor(),
                size: Math.random() * 3 + 1
            });
        }
    }
    
    getImpactColor() {
        const colors = {
            'arrow': '#8b5cf6',
            'hadoken': '#3b82f6',
            'shuriken': '#6b7280',
            'lightning_bolt': '#fef08a',
            'magic_spear_special': '#a855f7',
            'magic_spear_normal': '#6b7280'
        };
        return colors[this.type] || '#ffffff';
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.pixelX, this.pixelY);
        
        // 글로우 효과
        if (['hadoken', 'lightning_bolt', 'magic_spear_special'].includes(this.type)) {
            this.drawGlow(ctx);
        }
        
        switch(this.type) {
            case 'arrow':
                this.drawEnhancedArrow(ctx);
                break;
            case 'hadoken':
                this.drawEnhancedHadoken(ctx);
                break;
            case 'shuriken':
                this.drawEnhancedShuriken(ctx);
                break;
            case 'lightning_bolt':
                this.drawEnhancedLightning(ctx);
                break;
            case 'magic_spear_special':
            case 'magic_spear_normal':
                this.drawEnhancedMagicSpear(ctx);
                break;
            case 'boomerang_projectile':
            case 'boomerang_normal_projectile':
                this.drawEnhancedBoomerang(ctx);
                break;
        }
        
        ctx.restore();
    }
    
    drawGlow(ctx) {
        const glowSize = GRID_SIZE * (0.8 + Math.sin(this.pulseTimer) * 0.2);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
        
        const glowColor = this.getGlowColor();
        gradient.addColorStop(0, glowColor.replace('1)', '0.6)'));
        gradient.addColorStop(0.5, glowColor.replace('1)', '0.3)'));
        gradient.addColorStop(1, glowColor.replace('1)', '0)'));
        
        ctx.fillStyle = gradient;
        ctx.fillRect(-glowSize, -glowSize, glowSize * 2, glowSize * 2);
    }
    
    getGlowColor() {
        const colors = {
            'hadoken': 'rgba(59, 130, 246, 1)',
            'lightning_bolt': 'rgba(254, 240, 138, 1)',
            'magic_spear_special': 'rgba(168, 85, 247, 1)'
        };
        return colors[this.type] || 'rgba(255, 255, 255, 1)';
    }
    
    drawEnhancedArrow(ctx) {
        // 트레일 효과
        this.trail.forEach((point, index) => {
            const alpha = point.life * 0.5;
            ctx.fillStyle = `rgba(139, 69, 19, ${alpha})`;
            const size = (index / this.trail.length) * 3;
            ctx.beginPath();
            ctx.arc(point.x - this.pixelX, point.y - this.pixelY, size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.rotate(this.angle);
        
        // 화살 몸체 (그라데이션)
        const bodyGradient = ctx.createLinearGradient(-GRID_SIZE * 0.6, 0, 0, 0);
        bodyGradient.addColorStop(0, '#8b4513');
        bodyGradient.addColorStop(1, '#d2691e');
        
        ctx.fillStyle = bodyGradient;
        ctx.fillRect(-GRID_SIZE * 0.6, -2, GRID_SIZE * 0.6, 4);
        
        // 화살촉 (금속 광택)
        const headGradient = ctx.createLinearGradient(-5, -4, 5, 4);
        headGradient.addColorStop(0, '#c0c0c0');
        headGradient.addColorStop(0.5, '#ffffff');
        headGradient.addColorStop(1, '#808080');
        
        ctx.fillStyle = headGradient;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-6, -4);
        ctx.lineTo(-6, 4);
        ctx.closePath();
        ctx.fill();
        
        // 깃털 (더 화려하게)
        const featherColors = ['#ff6b6b', '#4ecdc4', '#45b7d1'];
        featherColors.forEach((color, index) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.6, -2 + index * 2);
            ctx.lineTo(-GRID_SIZE * 0.7, -4 + index * 2);
            ctx.lineTo(-GRID_SIZE * 0.5, -2 + index * 2);
            ctx.closePath();
            ctx.fill();
        });
    }
    
    drawEnhancedHadoken(ctx) {
        // 트레일 그리기
        this.trail.forEach((point, index) => {
            const alpha = point.life;
            const size = (GRID_SIZE / 3) * (index / this.trail.length) * alpha;
            
            const gradient = ctx.createRadialGradient(
                point.x - this.pixelX, point.y - this.pixelY, 0,
                point.x - this.pixelX, point.y - this.pixelY, size
            );
            gradient.addColorStop(0, `rgba(139, 92, 246, ${alpha * 0.8})`);
            gradient.addColorStop(1, `rgba(139, 92, 246, 0)`);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(point.x - this.pixelX, point.y - this.pixelY, size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // 파티클 그리기
        this.particles.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        
        // 중앙 코어 (펄스 효과)
        const coreSize = GRID_SIZE / 2 * (1 + Math.sin(this.pulseTimer) * 0.3);
        
        const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize);
        coreGradient.addColorStop(0, '#e0e7ff');
        coreGradient.addColorStop(0.3, '#c4b5fd');
        coreGradient.addColorStop(0.7, '#8b5cf6');
        coreGradient.addColorStop(1, '#6d28d9');
        
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
        ctx.fill();
        
        // 에너지 링
        ctx.strokeStyle = `rgba(196, 181, 253, ${0.8 + Math.sin(this.pulseTimer * 2) * 0.2})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, coreSize * 1.2, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    drawEnhancedShuriken(ctx) {
        ctx.rotate(this.rotationAngle);
        
        // 회전 모션 블러 효과
        for (let i = 0; i < 3; i++) {
            ctx.save();
            ctx.rotate(-i * 0.3);
            ctx.globalAlpha = 0.3 - i * 0.1;
            this.drawShurikenShape(ctx, 0.8 + i * 0.1);
            ctx.restore();
        }
        
        // 메인 수리검
        ctx.globalAlpha = 1;
        this.drawShurikenShape(ctx, 0.8);
    }
    
    drawShurikenShape(ctx, scale) {
        ctx.scale(scale, scale);
        
        // 메탈릭 그라데이션
        const metalGradient = ctx.createLinearGradient(-GRID_SIZE * 0.8, -GRID_SIZE * 0.8, GRID_SIZE * 0.8, GRID_SIZE * 0.8);
        metalGradient.addColorStop(0, '#e5e7eb');
        metalGradient.addColorStop(0.3, '#ffffff');
        metalGradient.addColorStop(0.7, '#9ca3af');
        metalGradient.addColorStop(1, '#6b7280');
        
        ctx.fillStyle = metalGradient;
        ctx.strokeStyle = '#374151';
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

        // 중앙 구멍 (더 디테일하게)
        const centerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, GRID_SIZE * 0.2);
        centerGradient.addColorStop(0, '#1f2937');
        centerGradient.addColorStop(1, '#9ca3af');
        
        ctx.fillStyle = centerGradient;
        ctx.beginPath();
        ctx.arc(0, 0, GRID_SIZE * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    
    drawEnhancedLightning(ctx) {
        ctx.rotate(this.angle);
        
        // 스파크 파티클
        this.sparkParticles.forEach(spark => {
            ctx.save();
            ctx.globalAlpha = spark.life;
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        
        // 메인 번개 (여러 겹으로)
        const lightningColors = [
            { color: '#fef08a', width: 6, alpha: 0.9 },
            { color: '#facc15', width: 4, alpha: 0.7 },
            { color: '#ffffff', width: 2, alpha: 1.0 }
        ];
        
        lightningColors.forEach(lightning => {
            ctx.strokeStyle = lightning.color;
            ctx.lineWidth = lightning.width;
            ctx.globalAlpha = lightning.alpha;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.beginPath();
            this.lightningPoints.forEach((point, index) => {
                if (index === 0) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            });
            ctx.stroke();
        });
        
        // 전기 방전 효과
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = '#a3e635';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(-GRID_SIZE * 0.5, (Math.random() - 0.5) * 6);
            ctx.lineTo(GRID_SIZE * 0.5, (Math.random() - 0.5) * 6);
            ctx.stroke();
        }
    }
    
    drawEnhancedMagicSpear(ctx) {
        const isSpecial = this.type === 'magic_spear_special';
        
        ctx.rotate(this.angle);
        
        // 트레일 그리기
        this.trail.forEach((point, index) => {
            const alpha = point.life * 0.4;
            const color = isSpecial ? `rgba(192, 132, 252, ${alpha})` : `rgba(107, 114, 128, ${alpha})`;
            const size = (GRID_SIZE / 4) * (index / this.trail.length);
            
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(point.x - this.pixelX, point.y - this.pixelY, size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // 오라 파티클 (특수 공격만)
        if (isSpecial) {
            this.particles.forEach(p => {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.fillStyle = 'rgba(192, 132, 252, 0.6)';
                ctx.beginPath();
                ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            });
        }
        
        const mainColor = isSpecial ? '#a855f7' : '#374151';
        const spearLength = isSpecial ? GRID_SIZE * 1.4 : GRID_SIZE * 1.0;
        const spearWidth = isSpecial ? GRID_SIZE * 0.3 : GRID_SIZE * 0.2;

        // 창날 (그라데이션과 글로우)
        if (isSpecial) {
            ctx.shadowColor = 'rgba(168, 85, 247, 0.8)';
            ctx.shadowBlur = 20;
        }
        
        const spearGradient = ctx.createLinearGradient(0, -spearWidth, 0, spearWidth);
        if (isSpecial) {
            spearGradient.addColorStop(0, '#e9d5ff');
            spearGradient.addColorStop(0.5, '#a855f7');
            spearGradient.addColorStop(1, '#7c3aed');
        } else {
            spearGradient.addColorStop(0, '#6b7280');
            spearGradient.addColorStop(0.5, '#374151');
            spearGradient.addColorStop(1, '#111827');
        }
        
        ctx.fillStyle = spearGradient;
        ctx.beginPath();
        ctx.moveTo(spearLength, 0);
        ctx.lineTo(0, -spearWidth);
        ctx.lineTo(spearLength * 0.2, 0);
        ctx.lineTo(0, spearWidth);
        ctx.closePath();
        ctx.fill();
        
        // 창자루
        ctx.fillStyle = isSpecial ? '#5b21b6' : '#4b5563';
        ctx.fillRect(-spearLength * 0.8, -spearWidth * 0.3, spearLength * 0.8, spearWidth * 0.6);
        
        ctx.shadowBlur = 0;
    }
    
    drawEnhancedBoomerang(ctx) {
        ctx.rotate(this.rotationAngle);
        
        // 회전 모션 트레일
        for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate(-i * 0.5);
            ctx.globalAlpha = 0.3 - i * 0.05;
            this.owner.weapon.drawBoomerang(ctx, 0.6 - i * 0.05);
            ctx.restore();
        }
        
        // 메인 부메랑
        ctx.globalAlpha = 1;
        if (this.type === 'boomerang_normal_projectile') {
            this.owner.weapon.drawBoomerang(ctx, 0.3, 0, '#18181b');
        } else {
            this.owner.weapon.drawBoomerang(ctx, 0.6);
        }
    }
}

// 향상된 전투 애니메이션 클래스
export class EnhancedCombatAnimations {
    static createAttackAnimation(attacker, target, weaponType) {
        const gameManager = GameManager.getInstance();
        if (!gameManager) return;
        
        switch(weaponType) {
            case 'sword':
                this.createSwordSlash(attacker, target);
                break;
            case 'dual_swords':
                this.createDualSwordCombo(attacker, target);
                break;
            case 'staff':
                this.createMagicCasting(attacker, target);
                break;
            case 'poison_potion':
                this.createPoisonExplosion(attacker, target);
                break;
        }
    }
    
    static createSwordSlash(attacker, target) {
        const gameManager = GameManager.getInstance();
        
        // 검기 효과
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                gameManager.addParticle({
                    x: target.pixelX + (Math.random() - 0.5) * GRID_SIZE,
                    y: target.pixelY + (Math.random() - 0.5) * GRID_SIZE,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    life: 0.8,
                    color: '#dc2626',
                    size: Math.random() * 3 + 2,
                    gravity: -0.1
                });
            }, i * 50);
        }
        
        // 충격파 효과
        gameManager.addShockwave({
            x: target.pixelX,
            y: target.pixelY,
            maxRadius: GRID_SIZE * 2,
            color: 'rgba(220, 38, 38, 0.6)',
            duration: 30
        });
    }
    
    static createDualSwordCombo(attacker, target) {
        const gameManager = GameManager.getInstance();
        
        // 연속 베기 효과
        const slashAngles = [Math.PI / 4, -Math.PI / 4, 0];
        
        slashAngles.forEach((angle, index) => {
            setTimeout(() => {
                // 각 베기마다 다른 색상의 검기
                const colors = ['#dc2626', '#f59e0b', '#3b82f6'];
                
                for (let i = 0; i < 8; i++) {
                    const particleAngle = angle + (Math.random() - 0.5) * 0.5;
                    gameManager.addParticle({
                        x: target.pixelX,
                        y: target.pixelY,
                        vx: Math.cos(particleAngle) * (3 + Math.random() * 2),
                        vy: Math.sin(particleAngle) * (3 + Math.random() * 2),
                        life: 0.6,
                        color: colors[index],
                        size: Math.random() * 4 + 2,
                        trail: true
                    });
                }
                
                // 크로스 베기 라인 효과
                gameManager.addLineEffect({
                    startX: target.pixelX - Math.cos(angle) * GRID_SIZE,
                    startY: target.pixelY - Math.sin(angle) * GRID_SIZE,
                    endX: target.pixelX + Math.cos(angle) * GRID_SIZE,
                    endY: target.pixelY + Math.sin(angle) * GRID_SIZE,
                    color: colors[index],
                    width: 4,
                    duration: 20
                });
                
            }, index * 150);
        });
    }
    
    static createMagicCasting(attacker, target) {
        const gameManager = GameManager.getInstance();
        
        // 시전 중 마법진 효과
        const castingEffect = {
            x: attacker.pixelX,
            y: attacker.pixelY,
            radius: 0,
            maxRadius: GRID_SIZE * 2,
            duration: 180,
            particles: []
        };
        
        // 마법진 파티클 생성
        for (let i = 0; i < 20; i++) {
            castingEffect.particles.push({
                angle: (i / 20) * Math.PI * 2,
                distance: GRID_SIZE * 0.5,
                speed: 0.02,
                color: `hsl(${280 + Math.random() * 40}, 80%, ${60 + Math.random() * 20}%)`,
                size: Math.random() * 3 + 2
            });
        }
        
        gameManager.addCastingEffect(castingEffect);
        
        // 에너지 충전 효과
        const chargeInterval = setInterval(() => {
            if (attacker.isCasting) {
                // 충전 파티클
                for (let i = 0; i < 3; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = GRID_SIZE * (2 + Math.random() * 2);
                    
                    gameManager.addParticle({
                        x: attacker.pixelX + Math.cos(angle) * distance,
                        y: attacker.pixelY + Math.sin(angle) * distance,
                        vx: -Math.cos(angle) * 2,
                        vy: -Math.sin(angle) * 2,
                        life: 1.0,
                        color: '#a855f7',
                        size: Math.random() * 2 + 1,
                        target: { x: attacker.pixelX, y: attacker.pixelY },
                        homing: true
                    });
                }
            } else {
                clearInterval(chargeInterval);
            }
        }, 100);
    }
    
    static createPoisonExplosion(attacker, target) {
        const gameManager = GameManager.getInstance();
        
        // 독 가스 확산 효과
        for (let i = 0; i < 25; i++) {
            const angle = (i / 25) * Math.PI * 2;
            const distance = Math.random() * GRID_SIZE * 2;
            
            gameManager.addParticle({
                x: attacker.pixelX,
                y: attacker.pixelY,
                vx: Math.cos(angle) * (1 + Math.random()),
                vy: Math.sin(angle) * (1 + Math.random()) - 0.5,
                life: 2.0,
                decay: 0.005,
                color: `rgba(132, 204, 22, ${0.7 + Math.random() * 0.3})`,
                size: Math.random() * 8 + 4,
                expansion: 0.02,
                gravity: -0.02
            });
        }
        
        // 중독 기포 효과
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                gameManager.addParticle({
                    x: attacker.pixelX + (Math.random() - 0.5) * GRID_SIZE * 3,
                    y: attacker.pixelY + (Math.random() - 0.5) * GRID_SIZE * 3,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: -Math.random() * 2,
                    life: 1.5,
                    color: 'rgba(163, 230, 53, 0.8)',
                    size: Math.random() * 4 + 2,
                    bubble: true
                });
            }, i * 100);
        }
    }
    
    // 타격 임팩트 효과
    static createHitImpact(target, damageAmount, damageType = 'normal') {
        const gameManager = GameManager.getInstance();
        if (!gameManager) return;
        
        // 데미지 텍스트 애니메이션
        const damageText = {
            x: target.pixelX,
            y: target.pixelY - GRID_SIZE,
            text: Math.round(damageAmount).toString(),
            life: 60,
            vx: (Math.random() - 0.5) * 2,
            vy: -2,
            color: this.getDamageColor(damageType),
            size: 16 + (damageAmount / 10)
        };
        
        gameManager.addFloatingText(damageText);
        
        // 타격 파티클
        const particleCount = Math.min(15, Math.floor(damageAmount / 2) + 5);
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            
            gameManager.addParticle({
                x: target.pixelX,
                y: target.pixelY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.8,
                color: this.getImpactParticleColor(damageType),
                size: Math.random() * 3 + 1,
                gravity: 0.1
            });
        }
        
        // 화면 흔들림 효과 (큰 데미지시)
        if (damageAmount > 20) {
            gameManager.addScreenShake({
                intensity: Math.min(10, damageAmount / 5),
                duration: 15
            });
        }
    }
    
    static getDamageColor(damageType) {
        const colors = {
            'normal': '#ffffff',
            'critical': '#ffd700',
            'poison': '#84cc16',
            'magic': '#a855f7',
            'fire': '#f97316'
        };
        return colors[damageType] || '#ffffff';
    }
    
    static getImpactParticleColor(damageType) {
        const colors = {
            'normal': '#ef4444',
            'critical': '#fbbf24',
            'poison': '#65a30d',
            'magic': '#8b5cf6',
            'fire': '#ea580c'
        };
        return colors[damageType] || '#ef4444';
    }

    // [신규] 물음표 타일 효과
    static createQuestionMarkEffect(x, y) {
        const gameManager = GameManager.getInstance();
        if (!gameManager) return;

        for (let i = 0; i < 20; i++) {
            gameManager.addParticle({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 1.0,
                decay: 0.025,
                color: '#facc15',
                size: Math.random() * 3 + 1,
            });
        }
    }
}

// 환경 효과 클래스 (향상된 광역 효과)
export class EnhancedEnvironmentalEffects {
    // 향상된 불기둥
    static createEnhancedFirePillar(x, y, damage, ownerTeam) {
        return new EnhancedFirePillar(x, y, damage, ownerTeam);
    }
    
    // 향상된 독 구름
    static createEnhancedPoisonCloud(x, y, ownerTeam) {
        return new EnhancedPoisonCloud(x, y, ownerTeam);
    }
}

class EnhancedFirePillar {
    constructor(x, y, damage, ownerTeam) {
        this.pixelX = x;
        this.pixelY = y;
        this.damage = damage;
        this.ownerTeam = ownerTeam;
        this.duration = 120; // 2초
        this.maxRadius = GRID_SIZE * 2.5;
        this.currentRadius = 0;
        this.particles = [];
        this.sparks = [];
        this.damagedUnits = new Set();
        this.damagedNexuses = new Set();
        this.heat = 1.0;
        
        this.initializeParticles();
    }
    
    initializeParticles() {
        // 메인 화염 파티클
        for (let i = 0; i < 40; i++) {
            this.particles.push({
                x: (Math.random() - 0.5) * this.maxRadius * 0.8,
                y: Math.random() * this.maxRadius,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 4 - 2,
                life: 1.0,
                decay: 0.015 + Math.random() * 0.01,
                size: Math.random() * 6 + 3,
                color: this.getFlameColor(),
                heat: Math.random()
            });
        }
        
        // 불꽃 스파크
        for (let i = 0; i < 20; i++) {
            this.sparks.push({
                x: (Math.random() - 0.5) * this.maxRadius,
                y: (Math.random() - 0.5) * this.maxRadius * 0.3,
                vx: (Math.random() - 0.5) * 6,
                vy: -Math.random() * 8,
                life: 0.8,
                size: Math.random() * 2 + 1
            });
        }
    }
    
    getFlameColor() {
        const colors = [
            '#fef08a', '#facc15', '#f59e0b', '#ea580c', '#dc2626', '#7f1d1d'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    update() {
        const gameManager = GameManager.getInstance();
        if (!gameManager) return;
        
        this.duration -= gameManager.gameSpeed;
        this.currentRadius = this.maxRadius * (1 - (this.duration / 120));
        this.heat = Math.max(0, this.duration / 120);
        
        // 파티클 업데이트
        this.particles.forEach(p => {
            p.x += p.vx * gameManager.gameSpeed;
            p.y += p.vy * gameManager.gameSpeed;
            p.life -= p.decay * gameManager.gameSpeed;
            p.vy -= 0.1; // 상승 가속
            p.vx *= 0.98; // 공기 저항
            
            p.x += (Math.random() - 0.5) * this.heat;
        });
        
        this.particles = this.particles.filter(p => p.life > 0);
        
        if (this.duration > 60 && Math.random() < 0.6) {
            this.particles.push({
                x: (Math.random() - 0.5) * this.currentRadius,
                y: this.currentRadius * 0.3,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 3 - 1,
                life: 1.0,
                decay: 0.02,
                size: Math.random() * 5 + 2,
                color: this.getFlameColor(),
                heat: Math.random()
            });
        }
        
        this.sparks.forEach(s => {
            s.x += s.vx * gameManager.gameSpeed;
            s.y += s.vy * gameManager.gameSpeed;
            s.vy += 0.2;
            s.life -= 0.02 * gameManager.gameSpeed;
            s.vx *= 0.95;
        });
        
        this.sparks = this.sparks.filter(s => s.life > 0);
        
        this.applyDamage(gameManager);
    }
    
    applyDamage(gameManager) {
        const applyFireDamage = (target) => {
            if (target.team !== this.ownerTeam) {
                const dist = Math.hypot(target.pixelX - this.pixelX, target.pixelY - this.pixelY);
                if (dist < this.currentRadius) {
                    if (target instanceof Unit && !this.damagedUnits.has(target)) {
                        target.takeDamage(this.damage, { 
                            interrupt: true, 
                            force: 2, 
                            angle: Math.atan2(target.pixelY - this.pixelY, target.pixelX - this.pixelX),
                            damageType: 'fire'
                        });
                        this.damagedUnits.add(target);
                    } else if (target instanceof Nexus && !this.damagedNexuses.has(target) && !target.isDestroying) {
                        target.takeDamage(this.damage);
                        this.damagedNexuses.add(target);
                    }
                }
            }
        };

        gameManager.units.forEach(applyFireDamage);
        gameManager.nexuses.forEach(applyFireDamage);
    }
    
    draw(ctx) {
        const opacity = this.heat;
        
        ctx.save();
        ctx.translate(this.pixelX, this.pixelY);
        
        const distortionGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.currentRadius * 1.5);
        distortionGradient.addColorStop(0, `rgba(255, 100, 0, ${opacity * 0.1})`);
        distortionGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
        ctx.fillStyle = distortionGradient;
        ctx.fillRect(-this.currentRadius * 1.5, -this.currentRadius * 1.5, this.currentRadius * 3, this.currentRadius * 3);
        
        const baseGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.currentRadius);
        baseGradient.addColorStop(0, `rgba(255, 200, 0, ${opacity * 0.8})`);
        baseGradient.addColorStop(0.7, `rgba(255, 100, 0, ${opacity * 0.6})`);
        baseGradient.addColorStop(1, `rgba(200, 0, 0, 0)`);
        ctx.fillStyle = baseGradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.currentRadius, 0, Math.PI * 2);
        ctx.fill();
        
        this.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life * opacity;
            ctx.fillStyle = p.color;
            
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.size, p.size * 1.5, 0, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.globalAlpha = p.life * opacity * 0.5;
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        
        this.sparks.forEach(s => {
            ctx.globalAlpha = s.life * opacity;
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.restore();
    }
}

class EnhancedPoisonCloud {
    constructor(x, y, ownerTeam) {
        this.pixelX = x;
        this.pixelY = y;
        this.ownerTeam = ownerTeam;
        this.duration = 300;
        this.damage = 0.2;
        this.animationTimer = 0;
        this.bubbles = [];
        this.miasma = [];
        
        this.initializeEffects();
    }
    
    initializeEffects() {
        for (let i = 0; i < 15; i++) {
            this.bubbles.push({
                x: (Math.random() - 0.5) * GRID_SIZE * 4,
                y: (Math.random() - 0.5) * GRID_SIZE * 4,
                vx: (Math.random() - 0.5) * 0.5,
                vy: -Math.random() * 1.5,
                size: Math.random() * 8 + 4,
                life: 1.0,
                bob: Math.random() * Math.PI * 2
            });
        }
        
        for (let i = 0; i < 25; i++) {
            this.miasma.push({
                x: (Math.random() - 0.5) * GRID_SIZE * 5,
                y: (Math.random() - 0.5) * GRID_SIZE * 5,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                size: Math.random() * 12 + 8,
                alpha: Math.random() * 0.3 + 0.1,
                swirl: Math.random() * Math.PI * 2
            });
        }
    }
    
    update() {
        const gameManager = GameManager.getInstance();
        if (!gameManager) return;
        
        this.duration -= gameManager.gameSpeed;
        this.animationTimer += gameManager.gameSpeed;
        
        this.bubbles.forEach(bubble => {
            bubble.x += bubble.vx;
            bubble.y += bubble.vy;
            bubble.bob += 0.05;
            bubble.y += Math.sin(bubble.bob) * 0.1;
            bubble.life -= 0.005;
            
            if (bubble.life <= 0 && Math.random() < 0.3) {
                for (let i = 0; i < 3; i++) {
                    this.miasma.push({
                        x: bubble.x,
                        y: bubble.y,
                        vx: (Math.random() - 0.5) * 2,
                        vy: (Math.random() - 0.5) * 2,
                        size: Math.random() * 4 + 2,
                        alpha: 0.4,
                        swirl: Math.random() * Math.PI * 2
                    });
                }
            }
        });
        
        this.bubbles = this.bubbles.filter(b => b.life > 0);
        
        this.miasma.forEach(m => {
            m.swirl += 0.02;
            m.x += Math.cos(m.swirl) * 0.2 + m.vx;
            m.y += Math.sin(m.swirl) * 0.2 + m.vy;
            m.vx *= 0.99;
            m.vy *= 0.99;
        });
        
        if (Math.random() < 0.1 && this.bubbles.length < 20) {
            this.bubbles.push({
                x: (Math.random() - 0.5) * GRID_SIZE * 4,
                y: GRID_SIZE * 2,
                vx: (Math.random() - 0.5) * 0.5,
                vy: -Math.random() * 1.5 - 0.5,
                size: Math.random() * 6 + 3,
                life: 1.0,
                bob: Math.random() * Math.PI * 2
            });
        }
        
        this.applyPoisonDamage(gameManager);
    }
    
    applyPoisonDamage(gameManager) {
        const applyPoison = (target) => {
            if (target.team !== this.ownerTeam) {
                const dx = Math.abs(target.pixelX - this.pixelX);
                const dy = Math.abs(target.pixelY - this.pixelY);
                if (dx < GRID_SIZE * 2.5 && dy < GRID_SIZE * 2.5) {
                    if (target instanceof Unit) {
                        target.takeDamage(0, { 
                            poison: { damage: this.damage * gameManager.gameSpeed },
                            damageType: 'poison'
                        });
                    } else if (target instanceof Nexus && !target.isDestroying) {
                        target.takeDamage(this.damage * gameManager.gameSpeed);
                    }
                }
            }
        };

        gameManager.units.forEach(applyPoison);
        gameManager.nexuses.forEach(applyPoison);
    }
    
    draw(ctx) {
        const opacity = Math.min(1, this.duration / 60) * 0.6;
        
        ctx.save();
        ctx.translate(this.pixelX, this.pixelY);
        
        const cloudGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, GRID_SIZE * 3);
        cloudGradient.addColorStop(0, `rgba(132, 204, 22, ${opacity})`);
        cloudGradient.addColorStop(0.6, `rgba(101, 163, 13, ${opacity * 0.8})`);
        cloudGradient.addColorStop(1, `rgba(65, 105, 8, 0)`);
        ctx.fillStyle = cloudGradient;
        ctx.fillRect(-GRID_SIZE * 3, -GRID_SIZE * 3, GRID_SIZE * 6, GRID_SIZE * 6);
        
        this.miasma.forEach(m => {
            ctx.globalAlpha = m.alpha * opacity;
            ctx.fillStyle = 'rgba(163, 230, 53, 0.3)';
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        this.bubbles.forEach(bubble => {
            ctx.globalAlpha = bubble.life * opacity;
            
            const bubbleGradient = ctx.createRadialGradient(
                bubble.x, bubble.y, 0,
                bubble.x, bubble.y, bubble.size
            );
            bubbleGradient.addColorStop(0, 'rgba(163, 230, 53, 0.8)');
            bubbleGradient.addColorStop(0.7, 'rgba(132, 204, 22, 0.6)');
            bubbleGradient.addColorStop(1, 'rgba(101, 163, 13, 0.2)');
            
            ctx.fillStyle = bubbleGradient;
            ctx.beginPath();
            ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(bubble.x - bubble.size * 0.3, bubble.y - bubble.size * 0.3, bubble.size * 0.3, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.restore();
    }
}

