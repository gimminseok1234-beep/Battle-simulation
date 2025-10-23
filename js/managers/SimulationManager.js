import { TEAM, GRID_SIZE } from '../constants.js';
import { Projectile, createFireballHitEffect } from '../weaponary.js';
import { SeededRandom } from '../utils.js';

export class SimulationManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.lastSimulationResult = null;
    }

    startSimulation() {
        const gm = this.gameManager;
        if (gm.state !== 'EDIT') return;

        gm.units.forEach(unit => unit.level = 1);

        if (!gm.isReplayMode) {
            gm.simulationSeed = Date.now();
        }
        gm.prng = new SeededRandom(gm.simulationSeed);
        gm.enableDeterministicRng();
        
        gm.usedNametagsInSim.clear();

        if (gm.isNametagEnabled && gm.nametagList.length > 0) {
            gm.units.forEach(unit => {
                unit.name = '';
                unit.nameColor = gm.nametagColor;
            });

            const shuffledNames = [...gm.nametagList].sort(() => 0.5 - gm.uiPrng.next());
            const assignmentCount = Math.min(gm.units.length, shuffledNames.length);

            for (let i = 0; i < assignmentCount; i++) {
                gm.units[i].name = shuffledNames[i];
                gm.usedNametagsInSim.add(shuffledNames[i]);
            }
        } else {
            gm.units.forEach(unit => unit.name = '');
        }

        const cleanDataForJSON = (obj) => {
            const data = { ...obj };
            delete data.gameManager;
            return data;
        };
        
        const cleanUnits = gm.units.map(u => {
            const unitData = cleanDataForJSON(u);
            unitData.weapon = u.weapon ? { type: u.weapon.type } : null;
            return unitData;
        });
        const cleanWeapons = gm.weapons.map(cleanDataForJSON);
        const cleanNexuses = gm.nexuses.map(cleanDataForJSON);
        const cleanGrowingFields = gm.growingFields.map(cleanDataForJSON);

        gm.initialUnitsState = JSON.stringify(cleanUnits);
        gm.initialWeaponsState = JSON.stringify(cleanWeapons);
        gm.initialNexusesState = JSON.stringify(cleanNexuses);
        gm.initialMapState = JSON.stringify(gm.map);
        gm.initialGrowingFieldsState = JSON.stringify(cleanGrowingFields);
        gm.initialAutoFieldState = JSON.stringify(gm.autoMagneticField);
        
        gm.initialNexusCount = gm.nexuses.length;
        gm.winnerTeam = null;
        gm.magicCircles = [];
        gm.poisonClouds = [];
        gm.particles = [];

        gm.state = 'SIMULATE';
        document.getElementById('statusText').textContent = "시뮬레이션 진행 중...";
        document.getElementById('simStartBtn').classList.add('hidden');
        document.getElementById('saveReplayBtn').classList.add('hidden');
        document.getElementById('simPauseBtn').classList.remove('hidden');
        document.getElementById('simPlayBtn').classList.add('hidden');
        
        gm.simulationTime = 0;
        if (gm.timerElement) {
            gm.timerElement.style.display = 'block';
            gm.timerElement.textContent = '00:00';
        }
        
        if (!gm.isReplayMode) {
            document.getElementById('toolbox').style.pointerEvents = 'none';
        }
        gm.gameLoop();
    }

    pauseSimulation() {
        const gm = this.gameManager;
        if (gm.state !== 'SIMULATE') return;
        gm.state = 'PAUSED';
        document.getElementById('statusText').textContent = "일시정지됨";
        document.getElementById('simPauseBtn').classList.add('hidden');
        document.getElementById('simPlayBtn').classList.remove('hidden');
    }

    playSimulation() {
        const gm = this.gameManager;
        if (gm.state !== 'PAUSED') return;
        gm.state = 'SIMULATE';
        document.getElementById('statusText').textContent = "시뮬레이션 진행 중...";
        document.getElementById('simPauseBtn').classList.remove('hidden');
        document.getElementById('simPlayBtn').classList.add('hidden');
        gm.gameLoop();
    }

    checkGameOver() {
        const gm = this.gameManager;
        if (gm.state !== 'SIMULATE') return;

        const activeNexuses = gm.nexuses.filter(n => !n.isDestroying);
        const activeNexusTeams = new Set(activeNexuses.map(n => n.team));
        const activeUnitTeams = new Set(gm.units.map(u => u.team));
        
        let gameOver = false;
        let winner = null;

        if (gm.initialNexusCount >= 2) {
            if (activeNexusTeams.size < 2 || activeUnitTeams.size <= 1) {
                gameOver = true;
                if (activeNexusTeams.size < 2) {
                    winner = activeNexusTeams.values().next().value || null;
                }
                else {
                    winner = activeUnitTeams.values().next().value || null;
                }
            }
        } else {
            const allRemainingTeams = new Set([...activeNexusTeams, ...activeUnitTeams]);
            if (allRemainingTeams.size <= 1) {
                const initialTeams = new Set(JSON.parse(gm.initialNexusesState).map(n => n.team).concat(JSON.parse(gm.initialUnitsState).map(u => u.team)));
                if (initialTeams.size > 1) {
                    gameOver = true;
                    winner = allRemainingTeams.size === 1 ? allRemainingTeams.values().next().value : null;
                }
            }
        }

        if (gameOver) {
            gm.state = 'ENDING';
            gm.winnerTeam = winner;
        }
    }

    handleEnding() {
        const gm = this.gameManager;
        if (gm.state !== 'ENDING') return;

        const explosionsFinished = gm.nexuses.every(n => !n.isDestroying || n.explosionParticles.length === 0);
        if (explosionsFinished) {
            gm.state = 'DONE';
            this.lastSimulationResult = {
                initialMapState: gm.initialMapState,
                initialUnitsState: gm.initialUnitsState,
                initialWeaponsState: gm.initialWeaponsState,
                initialNexusesState: gm.initialNexusesState,
                initialGrowingFieldsState: gm.initialGrowingFieldsState,
                initialAutoFieldState: gm.initialAutoFieldState,
                simulationSeed: gm.simulationSeed,
                mapName: gm.currentMapName || '기본 맵',
                mapWidth: gm.canvas.width,
                mapHeight: gm.canvas.height,
                floorColor: gm.currentFloorColor,
                wallColor: gm.currentWallColor,
                isLevelUpEnabled: gm.isLevelUpEnabled,
                hadokenKnockback: gm.hadokenKnockback,
                isLavaAvoidanceEnabled: gm.isLavaAvoidanceEnabled,
            };

            if (!gm.isReplayMode) {
                document.getElementById('saveReplayBtn').classList.remove('hidden');
            }

            let winnerName = "무승부";
            if(gm.winnerTeam) {
                switch(gm.winnerTeam) {
                    case TEAM.A: winnerName = "빨강 팀"; break;
                    case TEAM.B: winnerName = "파랑 팀"; break;
                    case TEAM.C: winnerName = "초록 팀"; break;
                    case TEAM.D: winnerName = "노랑 팀"; break;
                }
                document.getElementById('statusText').textContent = `${winnerName} 승리!`;
            } else {
                document.getElementById('statusText').textContent = "무승부!";
            }
            document.getElementById('simPauseBtn').classList.add('hidden');
            document.getElementById('simPlayBtn').classList.add('hidden');
            gm.resetActionCam(false);
        }
    }

    update() {
        const gm = this.gameManager;
        if (gm.state === 'PAUSED' || gm.state === 'DONE') return;

        if (gm.state === 'SIMULATE') {
            gm.simulationTime += 1 / 60;
        }

        if (gm.state === 'ENDING') {
            gm.nexuses.forEach(n => n.update());
            gm.projectiles.forEach(p => p.update());
            gm.projectiles = gm.projectiles.filter(p => !p.destroyed);
            return;
        }

        gm.gameSpeed = 1;

        if (gm.autoMagneticField.isActive) {
            gm.autoMagneticField.simulationTime++;
            const progress = Math.min(1, gm.autoMagneticField.simulationTime / gm.autoMagneticField.totalShrinkTime);

            if (gm.autoMagneticField.shrinkType === 'vertical') {
                const finalHeight = gm.autoMagneticField.safeZoneSize;
                const finalMinY = (gm.ROWS - finalHeight) / 2;
                const finalMaxY = (gm.ROWS + finalHeight) / 2;
                gm.autoMagneticField.currentBounds = {
                    minX: 0,
                    maxX: gm.COLS,
                    minY: 0 + (finalMinY - 0) * progress,
                    maxY: gm.ROWS - (gm.ROWS - finalMaxY) * progress,
                };
            } else { // 'all'
                const finalWidth = gm.autoMagneticField.safeZoneSize;
                const finalHeight = gm.autoMagneticField.safeZoneSize;
                const finalMinX = (gm.COLS - finalWidth) / 2;
                const finalMaxX = (gm.COLS + finalWidth) / 2;
                const finalMinY = (gm.ROWS - finalHeight) / 2;
                const finalMaxY = (gm.ROWS + finalHeight) / 2;
                gm.autoMagneticField.currentBounds = {
                    minX: 0 + (finalMinX - 0) * progress,
                    maxX: gm.COLS - (gm.COLS - finalMaxX) * progress,
                    minY: 0 + (finalMinY - 0) * progress,
                    maxY: gm.ROWS - (gm.ROWS - finalMaxY) * progress,
                };
            }
        }
        
        gm.growingFields.forEach(field => field.update());
        
        const unitsBeforeUpdate = gm.units.length;

        const unitsByTeam = {};
        for (const unit of gm.units) {
            if (!unitsByTeam[unit.team]) {
                unitsByTeam[unit.team] = [];
            }
            unitsByTeam[unit.team].push(unit);
        }
        const allTeamKeys = Object.keys(unitsByTeam);
        
        gm.units.forEach(unit => {
            const enemyTeams = allTeamKeys.filter(key => key !== unit.team);
            const enemies = enemyTeams.flatMap(key => unitsByTeam[key]);
            unit.update(enemies, gm.weapons, gm.projectiles);
        });
        
        const deadUnits = gm.units.filter(u => u.hp <= 0);

        if (gm.isLevelUpEnabled) {
            deadUnits.forEach(deadUnit => {
                if (deadUnit.killedBy && deadUnit.killedBy.hp > 0) {
                    deadUnit.killedBy.levelUp(deadUnit.level);
                }
            });
        }

        deadUnits.forEach(u => u.handleDeath());
        
        gm.units = gm.units.filter(u => u.hp > 0);
        if (gm.units.length < unitsBeforeUpdate) {
            gm.audioManager.play('unitDeath');
        }
        
        gm.nexuses.forEach(n => n.update());

        gm.projectiles.forEach(p => p.update());
        gm.projectiles = gm.projectiles.filter(p => !p.destroyed);

        for (let i = gm.projectiles.length - 1; i >= 0; i--) {
            const p = gm.projectiles[i];
            let hit = false;
        
            for (const unit of gm.units) {
                if (p.owner.team !== unit.team && !p.hitTargets.has(unit) && Math.hypot(p.pixelX - unit.pixelX, p.pixelY - unit.pixelY) < GRID_SIZE / 2) {
                    
                    if (p.type === 'bouncing_sword') {
                        unit.takeDamage(p.damage, {}, p.owner);
                        p.owner.dualSwordTeleportTarget = unit;
                        p.owner.dualSwordTeleportDelayTimer = 60;
                        p.destroyed = true;
                        hit = true;
                        break; 
                    }

                    p.hitTargets.add(unit);
                    hit = true;
        
                    if (p.type === 'boomerang_projectile') {
                        unit.isBeingPulled = true;
                        unit.puller = p.owner;
                        const pullToX = p.owner.pixelX + Math.cos(p.owner.facingAngle) * GRID_SIZE;
                        const pullToY = p.owner.pixelY + Math.sin(p.owner.facingAngle) * GRID_SIZE;
                        unit.pullTargetPos = { x: pullToX, y: pullToY };
                    } else if (p.type === 'ice_diamond_projectile') {
                        unit.takeDamage(p.damage, { slow: 120 }, p.owner);
                    } else if (p.type === 'fireball_projectile') {
                        unit.takeDamage(p.damage, {}, p.owner);
                        createFireballHitEffect(gm, unit.pixelX, unit.pixelY);
                        p.destroyed = true;
                        
                        const initialHitTargets = new Set([unit]);
                        for (let j = 0; j < 4; j++) {
                            const angle = j * Math.PI / 2;
                            const dummyTarget = {
                                pixelX: unit.pixelX + Math.cos(angle) * 100,
                                pixelY: unit.pixelY + Math.sin(angle) * 100
                            };
                            gm.createProjectile(p.owner, dummyTarget, 'mini_fireball_projectile', { 
                                angle: angle,
                                startX: unit.pixelX,
                                startY: unit.pixelY,
                                hitTargets: initialHitTargets
                             });
                        }
                    } else if (p.type === 'lightning_bolt') {
                        unit.takeDamage(p.damage, {}, p.owner);
                        p.destroyed = true;
        
                        const potentialTargets = gm.units.filter(u =>
                            u.team !== p.owner.team && !p.hitTargets.has(u) && u.hp > 0
                        );
        
                        if (potentialTargets.length > 0) {
                            let closestEnemy = potentialTargets[0];
                            let minDistance = Math.hypot(unit.pixelX - closestEnemy.pixelX, unit.pixelY - closestEnemy.pixelY);
        
                            for (let j = 1; j < potentialTargets.length; j++) {
                                const distance = Math.hypot(unit.pixelX - potentialTargets[j].pixelX, unit.pixelY - potentialTargets[j].pixelY);
                                if (distance < minDistance) {
                                    minDistance = distance;
                                    closestEnemy = potentialTargets[j];
                                }
                            }
        
                            const newProjectile = new Projectile(gm, p.owner, closestEnemy, 'lightning_bolt', {
                                hitTargets: p.hitTargets
                            });
                            newProjectile.pixelX = unit.pixelX;
                            newProjectile.pixelY = unit.pixelY;
                            gm.projectiles.push(newProjectile);
                        }
                    } else {
                        const effectInfo = {
                            interrupt: p.type === 'hadoken',
                            force: p.knockback,
                            angle: p.angle
                        };
                        unit.takeDamage(p.damage, effectInfo, p.owner);
                        if (p.type === 'hadoken') gm.audioManager.play('hadokenHit');
                    }
        
                    if (!p.piercing) {
                        if (p.type !== 'lightning_bolt' && p.type !== 'fireball_projectile') {
                            p.destroyed = true;
                            break;
                        }
                    }
                }
            }
        
            if (!hit) {
                for (const nexus of gm.nexuses) {
                    if (p.owner.team !== nexus.team && Math.hypot(p.pixelX - nexus.pixelX, p.pixelY - nexus.pixelY) < GRID_SIZE) {
                        if (p.type === 'ice_diamond_projectile') {
                           nexus.takeDamage(p.damage, p.owner);
                        } else if (p.type === 'fireball_projectile') {
                            nexus.takeDamage(p.damage, p.owner);
                            createFireballHitEffect(gm, nexus.pixelX, nexus.pixelY);
                            p.destroyed = true;
                            
                            const initialHitTargets = new Set([nexus]);
                            for (let j = 0; j < 4; j++) {
                                const angle = j * Math.PI / 2;
                                 const dummyTarget = {
                                    pixelX: nexus.pixelX + Math.cos(angle) * 100,
                                    pixelY: nexus.pixelY + Math.sin(angle) * 100
                                };
                                gm.createProjectile(p.owner, dummyTarget, 'mini_fireball_projectile', { 
                                    angle: angle,
                                    startX: nexus.pixelX,
                                    startY: nexus.pixelY,
                                    hitTargets: initialHitTargets
                                });
                            }
                        } else {
                            nexus.takeDamage(p.damage, p.owner);
                            if (p.type === 'hadoken') gm.audioManager.play('hadokenHit');
                        }
                        hit = true;
                        if (!p.piercing) {
                           p.destroyed = true;
                        }
                        break;
                    }
                }
            }
        
            if (p.pixelX < 0 || p.pixelX > gm.canvas.width || p.pixelY < 0 || p.pixelY > gm.canvas.height) {
                p.destroyed = true;
            }

            if (hit && p.type === 'fireball_projectile' && !p.destroyed) {
                createFireballHitEffect(gm, p.pixelX, p.pixelY);
                p.destroyed = true;
            }
        }
        
        gm.projectiles = gm.projectiles.filter(p => !p.destroyed);
        
        gm.magicCircles.forEach(circle => circle.update());
        gm.magicCircles = gm.magicCircles.filter(c => c.duration > 0);
        
        gm.poisonClouds.forEach(cloud => cloud.update());
        gm.poisonClouds = gm.poisonClouds.filter(c => c.duration > 0);

        for (const unit of gm.units) {
            const gridX = Math.floor(unit.pixelX / GRID_SIZE);
            const gridY = Math.floor(unit.pixelY / GRID_SIZE);
            for (let i = gm.magicCircles.length - 1; i >= 0; i--) {
                const circle = gm.magicCircles[i];
                if (circle.gridX === gridX && circle.gridY === gridY && circle.team !== unit.team) {
                    unit.takeDamage(15, { stun: 120, stunSource: 'magic_circle' });
                    gm.magicCircles.splice(i, 1);
                }
            }
        }

        gm.weapons = gm.weapons.filter(w => !w.isEquipped);

        gm.effects.forEach(e => e.update());
        gm.effects = gm.effects.filter(e => e.duration > 0);
        gm.areaEffects.forEach(e => e.update());
        gm.areaEffects = gm.areaEffects.filter(e => e.duration > 0);

        gm.particles.forEach(p => p.update(gm.gameSpeed));
        gm.particles = gm.particles.filter(p => p.isAlive());
    }
}