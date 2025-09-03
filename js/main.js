// js/main.js

import { GRID_SIZE, TILE, COLORS } from './constants.js';
import { GameManager } from './gameManager.js';
import { initializeFirebase, setupGameRoom, writeGameState, readGameState, leaveRoom } from './firebase.js';
import { maps } from './maps/index.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    const roomIdInput = document.getElementById('room-id');
    const joinRoomBtn = document.getElementById('join-room-btn');
    const leaveRoomBtn = document.getElementById('leave-room-btn');
    const playerSelect = document.getElementById('player-select');
    const playerStatsDiv = document.getElementById('player-stats');
    const turnInfo = document.getElementById('turn-info');
    const moveBtn = document.getElementById('move-btn');
    const attackBtn = document.getElementById('attack-btn');
    const endTurnBtn = document.getElementById('end-turn-btn');

    const mapEditorControls = document.getElementById('map-editor-controls');
    const saveMapBtn = document.getElementById('save-map-btn');
    const tileButtons = document.querySelectorAll('.tile-button');
    const mapSelect = document.getElementById('map-select');

    // 돌진 타일 방향 UI 요소 추가
    const dashTileDirectionControls = document.getElementById('dash-tile-direction-controls');
    const dashDirectionButtons = dashTileDirectionControls.querySelectorAll('button');

    let gameManager = new GameManager(updateUI);
    let isMapEditorMode = false;
    let currentTileType = TILE.FLOOR;
    let currentDashDirection = 'right'; // 돌진 타일 기본 방향

    let db;
    let currentRoomId = null;
    let localPlayerId = null;

    function init() {
        try {
            db = initializeFirebase();
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            alert("Could not connect to the game server.");
            return;
        }

        setupMapSelection();
        loadMap(maps[Object.keys(maps)[0]]); // Load the first map by default
        
        joinRoomBtn.addEventListener('click', handleJoinRoom);
        leaveRoomBtn.addEventListener('click', handleLeaveRoom);
        playerSelect.addEventListener('change', () => updatePlayerStats());
        
        moveBtn.addEventListener('click', () => gameManager.startMoving());
        attackBtn.addEventListener('click', () => gameManager.startAttacking());
        endTurnBtn.addEventListener('click', () => gameManager.endTurn());

        canvas.addEventListener('click', handleCanvasClick);

        setupMapEditor();
        draw();
    }

    function setupMapSelection() {
        for (const mapName in maps) {
            const option = document.createElement('option');
            option.value = mapName;
            option.textContent = mapName;
            mapSelect.appendChild(option);
        }
        mapSelect.addEventListener('change', (e) => {
            const selectedMap = maps[e.target.value];
            if (selectedMap) {
                loadMap(selectedMap);
            }
        });
    }

    function loadMap(mapData) {
        if (currentRoomId && localPlayerId === 'player1') {
            gameManager.loadMap(mapData);
            writeGameState(db, currentRoomId, gameManager.getState());
        } else if (!currentRoomId) {
            gameManager.loadMap(mapData);
        }
        draw();
    }

    function handleJoinRoom() {
        const roomId = roomIdInput.value.trim();
        if (!roomId) {
            alert('Please enter a Room ID.');
            return;
        }
        currentRoomId = roomId;
        setupGameRoom(db, currentRoomId, (playerCount) => {
            if (playerCount < 4) {
                localPlayerId = `player${playerCount + 1}`;
                joinRoomBtn.disabled = true;
                leaveRoomBtn.style.display = 'inline-block';
                roomIdInput.disabled = true;
                
                if (localPlayerId === 'player1') {
                    mapEditorControls.style.display = 'block';
                    isMapEditorMode = true;
                    gameManager.isGameMaster = true;
                }
                
                document.getElementById('player-info').textContent = `You are ${localPlayerId}`;

                readGameState(db, currentRoomId, (newState) => {
                    gameManager.setState(newState);
                    draw();
                });
            } else {
                alert('Room is full.');
            }
        });
    }

    function handleLeaveRoom() {
        if (currentRoomId && localPlayerId) {
            leaveRoom(db, currentRoomId, localPlayerId);
            currentRoomId = null;
            localPlayerId = null;
            joinRoomBtn.disabled = false;
            leaveRoomBtn.style.display = 'none';
            roomIdInput.disabled = false;
            mapEditorControls.style.display = 'none';
            isMapEditorMode = false;
            gameManager.isGameMaster = false;
            document.getElementById('player-info').textContent = 'You are not in a room.';
        }
    }

    function setupMapEditor() {
        saveMapBtn.addEventListener('click', () => {
             if (gameManager.isGameMaster) {
                const mapState = gameManager.getState();
                writeGameState(db, currentRoomId, mapState);
                alert('Map saved and synchronized!');
            }
        });

        tileButtons.forEach(button => {
            button.addEventListener('click', () => {
                currentTileType = button.dataset.tileType;
                // 돌진 타일 버튼을 클릭하면 방향 설정 UI를 표시
                if (currentTileType === TILE.DASH_TILE) {
                    dashTileDirectionControls.style.display = 'block';
                } else {
                    dashTileDirectionControls.style.display = 'none';
                }
            });
        });

        // 돌진 타일 방향 버튼 이벤트 리스너
        dashDirectionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                currentDashDirection = e.target.dataset.direction;
                // 선택된 버튼 강조 (선택 사항)
                dashDirectionButtons.forEach(btn => btn.classList.remove('selected'));
                e.target.classList.add('selected');
            });
        });
    }

    function handleCanvasClick(event) {
        const rect = canvas.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / GRID_SIZE);
        const y = Math.floor((event.clientY - rect.top) / GRID_SIZE);

        if (isMapEditorMode) {
             if (gameManager.isGameMaster) {
                if (currentTileType === TILE.DASH_TILE) {
                    // 돌진 타일은 타입과 방향 정보를 함께 저장
                    gameManager.setTile(x, y, { type: TILE.DASH_TILE, direction: currentDashDirection });
                } else {
                    gameManager.setTile(x, y, currentTileType);
                }
                writeGameState(db, currentRoomId, gameManager.getState());
            }
        } else {
            gameManager.handleGridClick(x, y, localPlayerId);
        }
    }

    function updateUI(state) {
        turnInfo.textContent = `Turn: ${state.turn}`;
        updatePlayerSelect(state.players);
        updatePlayerStats();
        draw();
    }

    function updatePlayerSelect(players) {
        playerSelect.innerHTML = '<option value="">Select Player</option>';
        players.forEach(player => {
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = `Player ${player.id} (${player.team})`;
            playerSelect.appendChild(option);
        });
        if (gameManager.selectedPlayer) {
            playerSelect.value = gameManager.selectedPlayer.id;
        }
    }

    function updatePlayerStats() {
        const selectedId = playerSelect.value;
        const player = gameManager.players.find(p => p.id === selectedId);
        if (player) {
            playerStatsDiv.innerHTML = `
                <p>HP: ${player.hp}/${player.maxHp}</p>
                <p>AP: ${player.ap}</p>
                <p>Weapon: ${player.weapon ? player.weapon.name : 'None'}</p>
            `;
        } else {
            playerStatsDiv.innerHTML = '';
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const grid = gameManager.grid;
        if (!grid) return;

        canvas.width = grid[0].length * GRID_SIZE;
        canvas.height = grid.length * GRID_SIZE;

        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[y].length; x++) {
                const tile = grid[y][x];
                let tileType = tile;
                
                // 타일 데이터가 객체인 경우(돌진 타일 등) 타입만 추출
                if (typeof tile === 'object' && tile !== null) {
                    tileType = tile.type;
                }
                
                ctx.fillStyle = COLORS[tileType] || COLORS.FLOOR;
                ctx.fillRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);

                // 돌진 타일인 경우 화살표를 그림
                if (tileType === TILE.DASH_TILE) {
                    drawArrow(ctx, x, y, tile.direction);
                }

                ctx.strokeStyle = COLORS.GRID;
                ctx.strokeRect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
            }
        }
        
        gameManager.players.forEach(player => {
            ctx.fillStyle = COLORS[`TEAM_${player.team}`];
            ctx.beginPath();
            ctx.arc(player.x * GRID_SIZE + GRID_SIZE / 2, player.y * GRID_SIZE + GRID_SIZE / 2, GRID_SIZE / 2 - 2, 0, 2 * Math.PI);
            ctx.fill();
        });

        if (gameManager.selectedPlayer) {
            ctx.strokeStyle = '#FFFF00';
            ctx.lineWidth = 3;
            ctx.strokeRect(gameManager.selectedPlayer.x * GRID_SIZE, gameManager.selectedPlayer.y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
            ctx.lineWidth = 1;
        }
    }

    // 화살표를 그리는 함수
    function drawArrow(ctx, x, y, direction) {
        ctx.fillStyle = '#000000'; // 검은색 화살표
        ctx.beginPath();
        const centerX = x * GRID_SIZE + GRID_SIZE / 2;
        const centerY = y * GRID_SIZE + GRID_SIZE / 2;
        const arrowSize = GRID_SIZE / 4;

        switch (direction) {
            case 'up':
                ctx.moveTo(centerX, centerY - arrowSize);
                ctx.lineTo(centerX - arrowSize, centerY + arrowSize);
                ctx.lineTo(centerX + arrowSize, centerY + arrowSize);
                break;
            case 'down':
                ctx.moveTo(centerX, centerY + arrowSize);
                ctx.lineTo(centerX - arrowSize, centerY - arrowSize);
                ctx.lineTo(centerX + arrowSize, centerY - arrowSize);
                break;
            case 'left':
                ctx.moveTo(centerX - arrowSize, centerY);
                ctx.lineTo(centerX + arrowSize, centerY - arrowSize);
                ctx.lineTo(centerX + arrowSize, centerY + arrowSize);
                break;
            case 'right':
                ctx.moveTo(centerX + arrowSize, centerY);
                ctx.lineTo(centerX - arrowSize, centerY - arrowSize);
                ctx.lineTo(centerX - arrowSize, centerY + arrowSize);
                break;
        }
        ctx.closePath();
        ctx.fill();
    }


    init();
});
