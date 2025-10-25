import { GRID_SIZE } from '../constants.js';

export class InputManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.canvas = gameManager.canvas;
        this.isPainting = false;
        this.dragStartPos = null;
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const transform = this.gameManager.ctx.getTransform();
        const invTransform = transform.inverse();

        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;

        const worldX = canvasX * invTransform.a + canvasY * invTransform.c + invTransform.e;
        const worldY = canvasX * invTransform.b + canvasY * invTransform.d + invTransform.f;
       
        return {
            pixelX: worldX,
            pixelY: worldY,
            gridX: Math.floor(worldX / GRID_SIZE),
            gridY: Math.floor(worldY / GRID_SIZE)
        };
    }

    handleMouseDown(e) {
        const gm = this.gameManager;
        if (gm.isActionCam) {
            gm.handleActionCamClick(this.getMousePos(e));
            return;
        }
        if (gm.state === 'EDIT') {
            const pos = this.getMousePos(e);
            
            if (gm.currentTool.tool === 'nametag') {
                const clickedUnit = gm.units.find(u => Math.hypot(u.pixelX - pos.pixelX, u.pixelY - pos.pixelY) < GRID_SIZE / 2);
                if (clickedUnit) {
                    gm.editingUnit = clickedUnit;
                    document.getElementById('unitNameInput').value = clickedUnit.name || '';
                    gm.uiManager.openModal('unitNameModal');
                    return;
                }
            }

            this.isPainting = true;
            if (gm.currentTool.tool === 'growing_field') this.dragStartPos = pos;
            else gm.applyTool(pos);
        }
    }

    handleMouseUp(e) {
        if (this.gameManager.state === 'EDIT' && this.gameManager.currentTool.tool === 'growing_field' && this.dragStartPos) {
            this.gameManager.applyTool(this.getMousePos(e));
        }
        this.isPainting = false;
        this.dragStartPos = null;
    }

    handleMouseMove(e) {
        if (this.isPainting && this.gameManager.state === 'EDIT' && this.gameManager.currentTool.tool !== 'growing_field') {
            this.gameManager.applyTool(this.getMousePos(e));
        }
        if (this.gameManager.state === 'EDIT' && this.dragStartPos) this.gameManager.draw(e);
    }

    handleMouseLeave() {
        this.isPainting = false;
        this.dragStartPos = null;
        this.gameManager.draw();
    }
}