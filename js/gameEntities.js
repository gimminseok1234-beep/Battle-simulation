import { TILE, TEAM, COLORS, GRID_SIZE } from './constants.js';
import { GameManager } from './gameManager.js'; // GameManager 클래스만 import

// 성장형 자기장 클래스
export class GrowingMagneticField {
    constructor(id, x, y, width, height, settings) {
        this.id = id;
        this.gridX = x; this.gridY = y;
        this.width = width; this.height = height;
        
        this.direction = settings.direction;
        this.totalFrames = settings.speed * 60;
        this.delay = settings.delay * 60;
        
        this.delayTimer = 0;
        this.animationTimer = 0;
        this.progress = 0;
    }

    update() {
        if (this.delayTimer < this.delay) {
            this.delayTimer++;
            return;
        }
        if (this.animationTimer < this.totalFrames) {
            this.animationTimer++;
        }
        const linearProgress = this.animationTimer / this.totalFrames;
        this.progress = -(Math.cos(Math.PI * linearProgress) - 1) / 2;
    }

    draw(ctx) {
        const gameManager = GameManager.getInstance(); // GameManager 인스턴스 가져오기
        if (!gameManager) return;

        const startX = this.gridX * GRID_SIZE;
        const startY = this.gridY * GRID_SIZE;
        const totalWidth = this.width * GRID_SIZE;
        const totalHeight = this.height * GRID_SIZE;
        
        ctx.fillStyle = 'rgba(168, 85, 247, 0.1)';
        ctx.fillRect(startX, startY, totalWidth, totalHeight);
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
        ctx.strokeRect(startX, startY, totalWidth, totalHeight);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        const centerX = startX + totalWidth / 2;
        const centerY = startY + totalHeight / 2;
        if (this.direction === 'DOWN') ctx.fillText('↓', centerX, startY + totalHeight - 5);
        if (this.direction === 'UP') ctx.fillText('↑', centerX, startY + 15);
        if (this.direction === 'RIGHT') ctx.fillText('→', startX + totalWidth - 10, centerY + 5);
        if (this.direction === 'LEFT') ctx.fillText('←', startX + 10, centerY + 5);
    }
}

export class Unit {
    constructor(x, y, team) {
        this.gridX = x;
        this.gridY = y;
        this.pixelX = this.gridX * GRID_SIZE + GRID_SIZE / 2;
        this.pixelY = this.gridY * GRID_SIZE + GRID_SIZE / 2;
        this.team = team;
        this.hp = 100;
        this.isKing = false;
        this.spawnInterval = 300; // 왕이 유닛을 소환하는 간격 (프레임 단위)
        this.spawnCooldown = 0;
        this.speed = 1.2;
        this.detectionRange = 6 * GRID_SIZE;
        this.attackRange = 1.5 * GRID_SIZE;
        this.attackPower = 10;
        this.attackCooldown = 0;
        this.cooldownTime = 120; // 기본 쿨다운 시간
        this.target = null;
        this.isStunned = false;
        this.stunTimer = 0;
        this.weapon = null; // 무기 객체
        this.isCasting = false; // 스킬 시전 중인가?
        this.castingProgress = 0; // 스킬 시전 진행도
        this.castDuration = 180; // 스킬 시전 시간
        this.path = []; // 이동 경로
        this.pathUpdateCounter = 0;
    }

    // ====================================================================
    // ===== 수정된 부분 (START) ==========================================
    // ====================================================================
    update() {
        if (this.isStunned) {
            this.stunTimer--;
            if (this.stunTimer <= 0) {
                this.isStunned = false;
            }
            return;
        }

        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }
        
        const gameManager = GameManager.getInstance();

        if (this.isKing && this.spawnCooldown > 0) {
            this.spawnCooldown--;
        }

        // 1. 타겟 탐색 및 상태 결정
        if (!this.target || this.target.hp <= 0) {
            this.target = this.findTarget(gameManager.units, gameManager.nexuses);
            this.isCasting = false;
            this.castingProgress = 0;
        }

        if (this.target) {
            const distance = Math.hypot(this.pixelX - this.target.pixelX, this.pixelY - this.target.pixelY);
            if (distance <= this.attackRange) {
                this.attack(gameManager);
            } else {
                this.isCasting = false;
                this.castingProgress = 0;
                this.moveTowardsTarget(this.target, gameManager);
            }
        } else if (!this.weapon) {
            // 무기가 없으면 무기 찾기
            const closestWeapon = this.findClosestWeapon(gameManager.weapons);
            if (closestWeapon) {
                this.moveTowardsTarget(closestWeapon, gameManager);
            }
        }
        
        // 무기 줍기 로직
        if (!this.weapon) {
            const closestWeapon = this.findClosestWeapon(gameManager.weapons);
            if (closestWeapon && Math.hypot(this.pixelX - closestWeapon.pixelX, this.pixelY - closestWeapon.pixelY) < GRID_SIZE / 2) {
                this.equipWeapon(closestWeapon);
                gameManager.audioManager.play('equip');
                // 무기를 주웠으므로 weapons 배열에서 제거
                gameManager.weapons = gameManager.weapons.filter(w => w !== closestWeapon);
            }
        }
        
        this.handleTileEffects(gameManager);
        
        // 유닛 겹침 방지 로직 적용
        this.applySeparation(gameManager.units);

        // 왕 유닛의 유닛 생성 로직
        if (this.isKing && this.spawnCooldown <= 0) {
            gameManager.spawnUnitNearKing(this);
            this.spawnCooldown = this.spawnInterval;
        }

        // 그리드 위치 업데이트
        this.gridX = Math.floor(this.pixelX / GRID_SIZE);
        this.gridY = Math.floor(this.pixelY / GRID_SIZE);
    }
    
    // 유닛 겹침 방지를 위한 분리 로직 함수
    applySeparation(allUnits) {
        let separationX = 0;
        let separationY = 0;
        let neighborsCount = 0;
        const desiredSeparation = (GRID_SIZE / 2) * 1.2; // 유닛 반지름의 1.2배

        for (const otherUnit of allUnits) {
            if (this === otherUnit) continue;

            const distance = Math.hypot(this.pixelX - otherUnit.pixelX, this.pixelY - otherUnit.pixelY);

            if (distance > 0 && distance < desiredSeparation) {
                let diffX = this.pixelX - otherUnit.pixelX;
                let diffY = this.pixelY - otherUnit.pixelY;
                diffX /= distance; // 정규화
                diffY /= distance; // 정규화
                separationX += diffX;
                separationY += diffY;
                neighborsCount++;
            }
        }

        if (neighborsCount > 0) {
            separationX /= neighborsCount;
            separationY /= neighborsCount;

            // 분리 힘을 현재 속도보다 약간 강하게 적용하여 밀어내도록 함
            const separationForce = this.speed * 0.5;
            this.pixelX += separationX * separationForce;
            this.pixelY += separationY * separationForce;
        }
    }
    
    attack(gameManager) {
        if (this.attackCooldown <= 0) {
            if (this.weapon && (this.weapon.type === 'hadoken' || this.weapon.type === 'staff')) {
                // 원거리 공격 (캐스팅 필요)
                this.isCasting = true;
                this.castingProgress++;
                
                if (this.castingProgress >= this.castDuration) {
                    gameManager.createProjectile(this, this.target);
                    this.attackCooldown = this.cooldownTime;
                    this.isCasting = false;
                    this.castingProgress = 0;
                }
            } else if (this.weapon && this.weapon.type === 'shuriken') {
                 gameManager.createProjectile(this, this.target);
                 this.attackCooldown = this.cooldownTime;
            } else {
                // 근접 공격
                this.target.takeDamage(this.attackPower);
                this.attackCooldown = this.cooldownTime;
                
                let sound = 'punch';
                if(this.weapon){
                    if(this.weapon.type === 'sword') sound = 'sword';
                    else if(this.weapon.type === 'dual_swords') sound = 'doubleSword';
                }
                gameManager.audioManager.play(sound);
            }
        }
    }
    // ====================================================================
    // ===== 수정된 부분 (END) ============================================
    // ====================================================================

    findTarget(units, nexuses) {
        let closestTarget = null;
        let minDistance = this.detectionRange;

        // 적 넥서스를 최우선 타겟으로 설정
        for (const nexus of nexuses) {
            if (nexus.team !== this.team) {
                const distance = Math.hypot(this.pixelX - nexus.pixelX, this.pixelY - nexus.pixelY);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestTarget = nexus;
                }
            }
        }
        
        // 적 넥서스가 없으면 적 유닛을 타겟으로 설정
        if (!closestTarget) {
            for (const unit of units) {
                if (unit.team !== this.team) {
                    const distance = Math.hypot(this.pixelX - unit.pixelX, this.pixelY - unit.pixelY);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestTarget = unit;
                    }
                }
            }
        }
        
        return closestTarget;
    }

    moveTowardsTarget(target, gameManager) {
        // A* 경로 탐색 (매 30프레임마다 경로 재계산)
        this.pathUpdateCounter++;
        if (this.path.length === 0 || this.pathUpdateCounter >= 30) {
            this.path = gameManager.findPath(this, target);
            this.pathUpdateCounter = 0;
        }

        if (this.path.length > 0) {
            const nextNode = this.path[0];
            const targetPixelX = nextNode.x * GRID_SIZE + GRID_SIZE / 2;
            const targetPixelY = nextNode.y * GRID_SIZE + GRID_SIZE / 2;
            
            const angle = Math.atan2(targetPixelY - this.pixelY, targetPixelX - this.pixelX);
            this.pixelX += Math.cos(angle) * this.speed;
            this.pixelY += Math.sin(angle) * this.speed;

            if (Math.hypot(this.pixelX - targetPixelX, this.pixelY - targetPixelY) < GRID_SIZE / 2) {
                this.path.shift();
            }
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
             // 왕관 드랍 로직
            if (this.isKing) {
                const gameManager = GameManager.getInstance();
                gameManager.weapons.push(new Weapon(this.gridX, this.gridY, 'crown'));
            }
        }
    }
    
    equipWeapon(weapon) {
        this.weapon = weapon;
        // 무기 종류에 따라 스탯 변경
        this.attackPower = weapon.attackPower;
        this.attackRange = weapon.attackRange;
        this.detectionRange = weapon.detectionRange;
        this.cooldownTime = weapon.attackCooldown;
        this.speed = weapon.speed;
        this.castDuration = weapon.castDuration || 180;
        if (weapon.type === 'crown') {
            this.isKing = true;
        }
    }

    findClosestWeapon(weapons) {
        let closestWeapon = null;
        let minDistance = Infinity;

        for (const weapon of weapons) {
            // 왕은 왕관만 주울 수 있음
            if (this.isKing && weapon.type !== 'crown') continue;
            // 일반 유닛은 왕관을 주울 수 없음
            if (!this.isKing && weapon.type === 'crown') continue;

            const distance = Math.hypot(this.pixelX - weapon.pixelX, weapon.pixelY - weapon.pixelY);
            if (distance < minDistance) {
                minDistance = distance;
                closestWeapon = weapon;
            }
        }
        return closestWeapon;
    }

    handleTileEffects(gameManager) {
        const currentTile = gameManager.map[this.gridY][this.gridX];

        if (gameManager.isPosInMagneticField(this.gridX, this.gridY)) {
            this.takeDamage(0.3);
            const safeSpot = gameManager.findClosestSafeSpot(this.pixelX, this.pixelY);
            if(safeSpot){
                 this.moveTowardsTarget({pixelX: safeSpot.x, pixelY: safeSpot.y}, gameManager);
            }
        }

        if (currentTile.type === TILE.LAVA) {
            this.takeDamage(0.5);
        } else if (currentTile.type === TILE.HEAL_PACK) {
            this.hp = Math.min(100, this.hp + 0.8);
        } else if (currentTile.type === TILE.TELEPORTER && (!currentTile.cooldown || gameManager.frameCounter > currentTile.cooldown)) {
            const teleporters = gameManager.getTeleporterPads();
            if (teleporters.length > 1) {
                const currentIndex = teleporters.findIndex(pad => pad.x === this.gridX && pad.y === this.gridY);
                const targetPad = teleporters[(currentIndex + 1) % teleporters.length];
                
                this.pixelX = targetPad.x * GRID_SIZE + GRID_SIZE / 2;
                this.pixelY = targetPad.y * GRID_SIZE + GRID_SIZE / 2;
                
                // 텔레포트 쿨다운 설정
                currentTile.cooldown = gameManager.frameCounter + 180; // 3초
                gameManager.map[targetPad.y][targetPad.x].cooldown = gameManager.frameCounter + 180;
                gameManager.audioManager.play('teleport');
            }
        }
         else if (currentTile.type === TILE.REPLICATION_TILE) {
            // 복제 타일 위에 있고, 타일 쿨다운이 없음
            if (!currentTile.cooldown || gameManager.frameCounter > currentTile.cooldown) {
                for(let i=0; i<currentTile.value; i++){
                     gameManager.spawnUnitNearKing(this);
                }
                currentTile.cooldown = gameManager.frameCounter + 300; // 5초 쿨다운
                gameManager.audioManager.play('2+');
            }
        }
    }

    draw(ctx) {
        // 유닛 색상
        let color = COLORS.DEFAULT;
        if(this.team === TEAM.A) color = COLORS.TEAM_A;
        else if(this.team === TEAM.B) color = COLORS.TEAM_B;
        else if(this.team === TEAM.C) color = COLORS.TEAM_C;
        else if(this.team === TEAM.D) color = COLORS.TEAM_D;
        ctx.fillStyle = color;

        ctx.beginPath();
        ctx.arc(this.pixelX, this.pixelY, GRID_SIZE / 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        if (this.isKing) {
            ctx.fillStyle = 'gold';
            ctx.font = '15px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('👑', this.pixelX, this.pixelY - 10);
        }

        const hpBarWidth = GRID_SIZE;
        const hpBarX = this.pixelX - hpBarWidth / 2;
        const hpBarY = this.pixelY - GRID_SIZE / 2 - 10;
        
        ctx.fillStyle = '#3f3f46'; ctx.fillRect(hpBarX, hpBarY, hpBarWidth, 5);
        ctx.fillStyle = '#10b981'; ctx.fillRect(hpBarX, hpBarY, hpBarWidth * (this.hp / 100), 5);
        
        const skillBarY = hpBarY - 6;
        if (this.isCasting) {
            ctx.fillStyle = '#450a0a';
            ctx.fillRect(hpBarX, skillBarY, hpBarWidth, 4);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(hpBarX, skillBarY, hpBarWidth * (this.castingProgress / this.castDuration), 4);
        } else if (this.weapon && this.weapon.type === 'shuriken' && this.attackCooldown > 0) {
            ctx.fillStyle = '#450a0a';
            ctx.fillRect(hpBarX, skillBarY, hpBarWidth, 4);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(hpBarX, skillBarY, hpBarWidth * ((this.cooldownTime - this.attackCooldown) / this.cooldownTime), 4);
        } else if (this.isKing && this.spawnCooldown > 0) {
            ctx.fillStyle = '#450a0a';
            ctx.fillRect(hpBarX, skillBarY, hpBarWidth, 4);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(hpBarX, skillBarY, hpBarWidth * ((this.spawnInterval - this.spawnCooldown) / this.spawnInterval), 4);
        }
    }
}

export class Nexus {
    constructor(x, y, team) {
        this.gridX = x;
        this.gridY = y;
        this.pixelX = this.gridX * GRID_SIZE + GRID_SIZE;
        this.pixelY = this.gridY * GRID_SIZE + GRID_SIZE;
        this.team = team;
        this.hp = 500;
        this.maxHp = 500;
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
    }

    draw(ctx) {
        let color = COLORS.DEFAULT;
        if(this.team === TEAM.A) color = COLORS.TEAM_A;
        else if(this.team === TEAM.B) color = COLORS.TEAM_B;
        else if(this.team === TEAM.C) color = COLORS.TEAM_C;
        else if(this.team === TEAM.D) color = COLORS.TEAM_D;
        ctx.fillStyle = color;

        ctx.fillRect(this.gridX * GRID_SIZE, this.gridY * GRID_SIZE, GRID_SIZE * 2, GRID_SIZE * 2);
        
        // HP 바
        const hpBarWidth = GRID_SIZE * 2;
        const hpBarX = this.gridX * GRID_SIZE;
        const hpBarY = this.gridY * GRID_SIZE - 10;
        
        ctx.fillStyle = '#3f3f46';
        ctx.fillRect(hpBarX, hpBarY, hpBarWidth, 5);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(hpBarX, hpBarY, hpBarWidth * (this.hp / this.maxHp), 5);
    }
}

export class Projectile {
    constructor(owner, target) {
        this.owner = owner;
        this.pixelX = owner.pixelX;
        this.pixelY = owner.pixelY;
        this.type = owner.weapon.type;
        this.speed = this.type === 'shuriken' ? 8 : 6;
        this.damage = owner.attackPower;
        
        // 투사체 방향 계산
        const angle = Math.atan2(target.pixelY - this.pixelY, target.pixelX - this.pixelX);
        this.velocityX = Math.cos(angle) * this.speed;
        this.velocityY = Math.sin(angle) * this.speed;
        
        this.knockback = 15; // 장풍 넉백
    }

    update(gameManager) {
        this.pixelX += this.velocityX;
        this.pixelY += this.velocityY;
        
        // 맵 경계 체크
        if (this.pixelX < 0 || this.pixelX > gameManager.canvas.width || this.pixelY < 0 || this.pixelY > gameManager.canvas.height) {
            return false; // 삭제 표시
        }
        
        const gridX = Math.floor(this.pixelX / GRID_SIZE);
        const gridY = Math.floor(this.pixelY / GRID_SIZE);

        if(gameManager.map[gridY][gridX].type === TILE.WALL || gameManager.map[gridY][gridX].type === TILE.CRACKED_WALL){
             if(gameManager.map[gridY][gridX].type === TILE.CRACKED_WALL){
                gameManager.map[gridY][gridX].hp -= this.damage;
                 if(gameManager.map[gridY][gridX].hp <= 0){
                     gameManager.map[gridY][gridX].type = TILE.FLOOR;
                      gameManager.audioManager.play('boxcrash');
                 }
             }
             return false;
        }

        // 충돌 체크 (유닛)
        for (const unit of gameManager.units) {
            if (unit.team !== this.owner.team) {
                const distance = Math.hypot(this.pixelX - unit.pixelX, this.pixelY - unit.pixelY);
                if (distance < GRID_SIZE / 2) {
                    unit.takeDamage(this.damage);
                     if(this.type === 'hadoken'){
                          const angle = Math.atan2(unit.pixelY - this.pixelY, unit.pixelX - this.pixelX);
                          unit.pixelX += Math.cos(angle) * this.knockback;
                          unit.pixelY += Math.sin(angle) * this.knockback;
                          unit.isCasting = false;
                          unit.castingProgress = 0;
                     }
                    return false; // 삭제 표시
                }
            }
        }
        
         // 충돌 체크 (넥서스)
        for (const nexus of gameManager.nexuses) {
            if (nexus.team !== this.owner.team) {
                if (this.pixelX > nexus.pixelX - GRID_SIZE && this.pixelX < nexus.pixelX + GRID_SIZE &&
                    this.pixelY > nexus.pixelY - GRID_SIZE && this.pixelY < nexus.pixelY + GRID_SIZE) {
                    nexus.takeDamage(this.damage);
                    return false; // 삭제 표시
                }
            }
        }
        
        return true; // 계속 유지
    }

    draw(ctx) {
        if (this.type === 'hadoken') {
            const grd = ctx.createRadialGradient(this.pixelX, this.pixelY, 2, this.pixelX, this.pixelY, 12);
            grd.addColorStop(0, 'rgba(147, 197, 253, 1)');
            grd.addColorStop(1, 'rgba(59, 130, 246, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(this.pixelX, this.pixelY, 12, 0, 2 * Math.PI);
            ctx.fill();
        } else if (this.type === 'staff') {
            const grd = ctx.createRadialGradient(this.pixelX, this.pixelY, 3, this.pixelX, this.pixelY, 10);
            grd.addColorStop(0, 'rgba(252, 165, 165, 1)');
            grd.addColorStop(1, 'rgba(239, 68, 68, 0)');
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(this.pixelX, this.pixelY, 10, 0, 2 * Math.PI);
            ctx.fill();
        } else if (this.type === 'shuriken') {
            ctx.fillStyle = '#9ca3af';
            ctx.beginPath();
            ctx.arc(this.pixelX, this.pixelY, 5, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
}

export class Weapon {
    constructor(x, y, type) {
        this.gridX = x;
        this.gridY = y;
        this.pixelX = this.gridX * GRID_SIZE + GRID_SIZE / 2;
        this.pixelY = this.gridY * GRID_SIZE + GRID_SIZE / 2;
        this.type = type;
        
        // 무기 스탯 설정
        switch(type) {
            case 'sword':
                this.attackPower = 25; this.attackRange = 1.5 * GRID_SIZE; this.attackCooldown = 80; this.speed = 1.2;
                break;
            case 'bow':
                this.attackPower = 15; this.attackRange = 7 * GRID_SIZE; this.attackCooldown = 100; this.speed = 1.2;
                break;
            case 'dual_swords':
                this.attackPower = 15; this.attackRange = 1.5 * GRID_SIZE; this.attackCooldown = 40; this.speed = 1.6;
                break;
            case 'staff':
                this.attackPower = 35; this.attackRange = 8 * GRID_SIZE; this.attackCooldown = 200; this.speed = 1.2; this.castDuration = 200;
                break;
            case 'hadoken':
                this.attackPower = 30; this.attackRange = 7 * GRID_SIZE; this.attackCooldown = 150; this.speed = 1.2; this.castDuration = 150;
                break;
            case 'shuriken':
                 this.attackPower = 12; this.attackRange = 7 * GRID_SIZE; this.attackCooldown = 20; this.speed = 1.4;
                 break;
            case 'crown':
                this.attackPower = 10; this.attackRange = 1.5 * GRID_SIZE; this.attackCooldown = 120; this.speed = 1.2;
                break;
            default:
                this.attackPower = 10; this.attackRange = 1.5 * GRID_SIZE; this.attackCooldown = 120; this.speed = 1.2;
                break;
        }
        this.detectionRange = 6 * GRID_SIZE; // 모든 무기 공통
    }

    draw(ctx) {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(this.pixelX, this.pixelY, GRID_SIZE / 3, 0, 2 * Math.PI);
        ctx.fill();
    }
}
