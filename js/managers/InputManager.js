import { GRID_SIZE } from '../constants.js';

export class InputManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.canvas = gameManager.canvas;
        this.isDragging = false;
        this.dragStartPos = null;

        const canvas = this.gameManager.canvas;
        canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        canvas.addEventListener('contextmenu', this.handleRightClick.bind(this));
    }

    getMousePos(evt) {
        const rect = this.gameManager.canvas.getBoundingClientRect();
        const scaleX = this.gameManager.canvas.width / rect.width;
        const scaleY = this.gameManager.canvas.height / rect.height;

        // 카메라 변환을 고려한 월드 좌표 계산
        const cam = this.gameManager.actionCam.current;
        const canvasX = (evt.clientX - rect.left) * scaleX;
        const canvasY = (evt.clientY - rect.top) * scaleY;
        const worldX = (canvasX - this.gameManager.canvas.width / 2) / cam.scale + cam.x;
        const worldY = (canvasY - this.gameManager.canvas.height / 2) / cam.scale + cam.y;

        return {
            pixelX: worldX,
            pixelY: worldY,
            gridX: Math.floor(worldX / GRID_SIZE),
            gridY: Math.floor(worldY / GRID_SIZE)
        };
    }

    getUnitUnderCursor(pos) {
        // 이름표 영역을 포함하여 유닛을 더 쉽게 선택할 수 있도록 y축 범위를 넓힙니다.
        const nametagHeight = 20;
        return this.gameManager.units.find(unit =>
            pos.pixelX >= unit.pixelX - GRID_SIZE / 2 &&
            pos.pixelX <= unit.pixelX + GRID_SIZE / 2 &&
            pos.pixelY >= unit.pixelY - GRID_SIZE / 2 - nametagHeight &&
            pos.pixelY <= unit.pixelY + GRID_SIZE / 2
        );
    }

    handleMouseDown(e) {
        e.preventDefault();
        const gm = this.gameManager;
        const pos = this.getMousePos(e);

        if (gm.isNametagSwapMode && e.button === 0) { // 좌클릭
            const clickedUnit = this.getUnitUnderCursor(pos);
            if (clickedUnit && clickedUnit.name) {
                gm.draggedUnitForSwap = clickedUnit;
                this.isDragging = true;
                gm.canvas.style.cursor = 'grabbing';
                return;
            }
        }

        if (gm.state === 'EDIT' && !gm.isReplayMode) {
            if (e.button === 0) { // 좌클릭
                if (gm.currentTool.tool === 'nametag') {
                    const clickedUnit = this.getUnitUnderCursor(pos);
                    if (clickedUnit) {
                        gm.editingUnit = clickedUnit;
                        document.getElementById('unitNameInput').value = clickedUnit.name || '';
                        gm.uiManager.openModal('unitNameModal');
                        return;
                    }
                }
                this.isDragging = true;
                this.dragStartPos = pos;
                gm.applyTool(pos);
            }
        } else if (gm.state === 'SIMULATE' || gm.state === 'PAUSED' || gm.isReplayMode) {
            if (e.button === 0) { // 좌클릭
                gm.handleActionCamClick(pos);
            }
        }
    }

    handleMouseMove(e) {
        const gm = this.gameManager;
        const pos = this.getMousePos(e);
        
        if (gm.isNametagSwapMode) {
            const unit = this.getUnitUnderCursor(pos);
            if (unit && unit.name) {
                gm.canvas.style.cursor = this.isDragging ? 'grabbing' : 'grab';
            } else {
                gm.canvas.style.cursor = 'default';
            }
            // [신규] 드래그 중일 때, 마우스를 따라다니는 이름표를 그리기 위해 draw 호출
            if (this.isDragging && gm.draggedUnitForSwap) {
                gm.draw(e);
            }
        } else {
             gm.canvas.style.cursor = 'default';
        }

        if (this.isDragging && gm.state === 'EDIT' && !gm.isReplayMode) {
            if (gm.currentTool.tool !== 'growing_field') {
                gm.applyTool(pos);
            } else {
                gm.draw(e); // 드래그 중인 사각형을 그리기 위해 draw 호출
            }
        }
    }

    handleMouseUp(e) {
        const gm = this.gameManager;
        if (gm.isNametagSwapMode && gm.draggedUnitForSwap) {
            const pos = this.getMousePos(e);
            const dropTargetUnit = this.getUnitUnderCursor(pos);

            if (dropTargetUnit) {
                gm.swapUnitNametags(gm.draggedUnitForSwap, dropTargetUnit);
                gm.draw(); // 변경사항 즉시 렌더링
            }
        }

        if (this.isDragging && gm.state === 'EDIT' && !gm.isReplayMode) {
            if (gm.currentTool.tool === 'growing_field' && this.dragStartPos) {
                const pos = this.getMousePos(e);
                gm.applyTool(pos);
            }
        }

        this.isDragging = false;
        this.dragStartPos = null;
        gm.draggedUnitForSwap = null;
        gm.canvas.style.cursor = 'default';
    }

    handleRightClick(e) {
        e.preventDefault();
        const gm = this.gameManager;
        if (gm.state !== 'EDIT' || gm.isReplayMode) return;

        const pos = this.getMousePos(e);
        const unit = this.getUnitUnderCursor(pos);

        if (unit) {
            gm.editingUnit = unit;
            const unitNameInput = document.getElementById('unitNameInput');
            unitNameInput.value = unit.name || '';
            gm.uiManager.openModal('unitNameModal');
        }
    }
}