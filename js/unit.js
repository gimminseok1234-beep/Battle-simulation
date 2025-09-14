// ... existing code ...
        this.swordSpecialAttackAnimationTimer = 0; // [추가] 검 3타 공격 모션 타이머

        // [수정] 쌍검 스킬 관련 변수 변경
        this.dualSwordSkillCooldown = 0;
        this.dualSwordTeleportTarget = null; // 순간이동할 단일 대상
        this.dualSwordTeleportDelayTimer = 0; // 순간이동까지의 딜레이
        this.dualSwordSpinAttackTimer = 0; // 순간이동 후 회전 공격 애니메이션
        this.isMarkedByDualSword = { active: false, timer: 0 }; // 자신이 표식에 걸렸는지 여부
    }
    
    get speed() {
// ... existing code ...
        if (this.isStunned > 0) {
            this.isStunned -= gameManager.gameSpeed;
            if (this.isStunned <= 0) { // [추가] 기절이 풀리면 상태 초기화
                this.stunnedByMagicCircle = false;
            }
            this.applyPhysics();
            return;
        }

        if (this.isSlowed > 0) {
            this.isSlowed -= gameManager.gameSpeed;
        }

        if (this.isMarkedByDualSword.active) {
            this.isMarkedByDualSword.timer -= gameManager.gameSpeed;
            if (this.isMarkedByDualSword.timer <= 0) {
                this.isMarkedByDualSword.active = false;
            }
        }

        if (this.awakeningEffect.active && this.awakeningEffect.stacks < 2) {
            this.awakeningEffect.timer += gameManager.gameSpeed;
            if (this.awakeningEffect.timer >= 300) {
// ... existing code ...
                }
            }
        }
        
        // [삭제] 기존 쌍검 스킬 발동 로직을 AGGRESSIVE 상태로 이전합니다.

        // [수정] 쌍검 순간이동 로직 변경
        if (this.dualSwordTeleportDelayTimer > 0) {
            this.dualSwordTeleportDelayTimer -= gameManager.gameSpeed;
            if (this.dualSwordTeleportDelayTimer <= 0) {
                this.performDualSwordTeleportAttack(enemies);
            }
        }

        if (this.weapon && this.weapon.type === 'magic_dagger' && !this.isAimingMagicDagger && this.magicDaggerSkillCooldown <= 0 && this.attackCooldown <= 0) {
            const { item: closestEnemy } = this.findClosest(enemies);
// ... existing code ...
            case 'ATTACKING_NEXUS':
            case 'AGGRESSIVE':
                if (this.target) {
                    // [추가] 쌍검 특수 공격 우선 로직
                    if (this.weapon && this.weapon.type === 'dual_swords' && this.dualSwordSkillCooldown <= 0) {
                        const distanceToTarget = Math.hypot(this.pixelX - this.target.pixelX, this.pixelY - this.target.pixelY);
                        // 감지 사거리 내에 있으면 특수 공격 발동
                        if (distanceToTarget <= this.detectionRange && gameManager.hasLineOfSight(this, this.target)) {
                            gameManager.createProjectile(this, this.target, 'bouncing_sword');
                            this.dualSwordSkillCooldown = 300; // 5초 쿨다운
                            this.attackCooldown = 60; // 스킬 사용 후 짧은 딜레이
                            this.moveTarget = null;
                            this.facingAngle = Math.atan2(this.target.pixelY - this.pixelY, this.target.pixelX - this.pixelX);
                            break; // 특수 공격 후 행동 종료
                        }
                    }

                    // 일반 공격 로직 (특수 공격이 쿨타임이거나 조건이 맞지 않을 때 실행)
                    let attackDistance = this.attackRange;
                    if (this.weapon && this.weapon.type === 'poison_potion') {
                        attackDistance = this.baseAttackRange;
                    }
                    if (Math.hypot(this.pixelX - this.target.pixelX, this.pixelY - this.target.pixelY) <= attackDistance) {
                        this.moveTarget = null;
                        this.attack(this.target);
                        this.facingAngle = Math.atan2(this.target.pixelY - this.pixelY, this.target.pixelX - this.pixelX);
                    } else { this.moveTarget = { x: this.target.pixelX, y: this.target.pixelY }; }
                }
                break;
            case 'IDLE': default:
                if (!this.moveTarget || Math.hypot(this.pixelX - this.moveTarget.x, this.pixelY - this.moveTarget.y) < GRID_SIZE) {
// ... existing code ...
        if (this.isStunned > 0) {
            ctx.globalAlpha = 0.7;
        }

        if (this.isMarkedByDualSword.active) {
            ctx.save();
            ctx.translate(this.pixelX, this.pixelY - GRID_SIZE * 1.2);
            const scale = 0.4 + Math.sin(this.gameManager.animationFrameCounter * 0.1) * 0.05; // [수정] 크기 50% 감소 및 약간의 애니메이션
            ctx.scale(scale, scale);
            // ctx.rotate(this.gameManager.animationFrameCounter * 0.05); // [수정] 회전 제거

            ctx.strokeStyle = '#9ca3af'; // gray-400
            ctx.lineWidth = 2.5;
            
            // 두 개의 교차된 칼날 모양 그리기
            const L = GRID_SIZE * 0.5;
            ctx.beginPath();
            ctx.moveTo(-L, -L);
            ctx.lineTo(L, L);
            ctx.moveTo(L, -L);
            ctx.lineTo(-L, L);
            ctx.stroke();

            ctx.restore();
        }

        switch(this.team) {
            case TEAM.A: ctx.fillStyle = COLORS.TEAM_A; break;
// ... existing code ...
    // [수정] 쌍검 순간이동 공격 로직 변경
    performDualSwordTeleportAttack(enemies) {
        const target = this.dualSwordTeleportTarget;
        if (target && target.hp > 0) {
            const teleportPos = this.gameManager.findEmptySpotNear(target);
            this.pixelX = teleportPos.x;
            this.pixelY = teleportPos.y;
            this.dualSwordSpinAttackTimer = 20; // 회전 공격 애니메이션 시작
            
            // 주변 적에게 15 데미지 (데미지 상향)
            const damageRadius = GRID_SIZE * 2;
            enemies.forEach(enemy => {
                if (Math.hypot(this.pixelX - enemy.pixelX, this.pixelY - enemy.pixelY) < damageRadius) {
                    enemy.takeDamage(15);
                }
            });
            this.gameManager.audioManager.play('swordHit');
        }
        this.dualSwordTeleportTarget = null; // 타겟 초기화
        this.state = 'IDLE'; // 공격 후 IDLE 상태로 전환
    }
}
