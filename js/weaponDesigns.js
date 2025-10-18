import { GRID_SIZE } from './constants.js';
import { Assets } from './assets.js';

// Standalone weapon design functions (visuals only). Colors preserved; shapes/gradients subtly improved.

export function drawMagicDaggerIcon(ctx) {
	ctx.save();
	const img = Assets.get('magic_dagger');
	if (img) {
		const size = GRID_SIZE * 1.2;
		ctx.drawImage(img, -size / 2, -size / 2, size, size);
		ctx.restore();
		return;
	}

	const scale = GRID_SIZE * 0.1;

	ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
	ctx.shadowBlur = 10;

	ctx.strokeStyle = '#111827';
	ctx.lineWidth = 2;

	// Handle
	const handleGradient = ctx.createLinearGradient(0, 0, 0, 10 * scale);
	handleGradient.addColorStop(0, '#374151');
	handleGradient.addColorStop(1, '#1f2937');
	ctx.fillStyle = handleGradient;
	const handleWidth = 2.5 * scale;
	const handleHeight = 9 * scale;
	ctx.beginPath();
	ctx.rect(-handleWidth / 2, 0, handleWidth, handleHeight);
	ctx.fill();
	ctx.stroke();

	// Guard
	ctx.fillStyle = '#e5e7eb';
	const guardWidth = 5 * scale;
	const guardHeight = 1.6 * scale;
	const guardY = -guardHeight / 2;
	ctx.fillRect(-guardWidth / 2, guardY, guardWidth, guardHeight);
	ctx.strokeRect(-guardWidth / 2, guardY, guardWidth, guardHeight);

	// Blade
	const bladeGradient = ctx.createLinearGradient(0, -12 * scale, 0, guardY);
	bladeGradient.addColorStop(0, '#ffffff');
	bladeGradient.addColorStop(0.5, '#f3f4f6');
	bladeGradient.addColorStop(1, '#d1d5db');
	ctx.fillStyle = bladeGradient;
	ctx.beginPath();
	ctx.moveTo(-guardWidth / 2, guardY);
	ctx.lineTo(1.5 * scale, -11 * scale);
	ctx.quadraticCurveTo(3 * scale, -5 * scale, guardWidth / 2, guardY);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();

	// Inner bevel
	ctx.beginPath();
	ctx.moveTo(0.5 * scale, guardY);
	ctx.quadraticCurveTo(0, -5 * scale, 1.2 * scale, -8 * scale);
	ctx.strokeStyle = 'rgba(17,24,39,0.45)';
	ctx.lineWidth = 1.2;
	ctx.stroke();

	ctx.restore();
}

export function drawAxeIcon(ctx) {
	ctx.save();
	const scale = GRID_SIZE * 0.08;

	const img = Assets.get('axe');
	if (img) {
		const size = GRID_SIZE * 1.6;
		ctx.drawImage(img, -size / 2, -size / 2, size, size);
		ctx.restore();
		return;
	}

	// Handle
	ctx.fillStyle = '#1f2937';
	ctx.strokeStyle = '#000000';
	ctx.lineWidth = 2;
	const handleWidth = 2.5 * scale;
	const handleHeight = 18 * scale;
	ctx.fillRect(-handleWidth / 2, -5 * scale, handleWidth, handleHeight);
	ctx.strokeRect(-handleWidth / 2, -5 * scale, handleWidth, handleHeight);

	// Double blade
	const bladeGradient = ctx.createLinearGradient(-12 * scale, 0, 12 * scale, 0);
	bladeGradient.addColorStop(0, '#d1d5db');
	bladeGradient.addColorStop(0.5, '#f9fafb');
	bladeGradient.addColorStop(1, '#9ca3af');
	ctx.fillStyle = bladeGradient;

	ctx.beginPath();
	ctx.moveTo(0, -6 * scale);
	ctx.quadraticCurveTo(-16 * scale, 0, 0, 6 * scale);
	ctx.quadraticCurveTo(-7 * scale, 0, 0, -6 * scale);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();

	ctx.beginPath();
	ctx.moveTo(0, -6 * scale);
	ctx.quadraticCurveTo(16 * scale, 0, 0, 6 * scale);
	ctx.quadraticCurveTo(7 * scale, 0, 0, -6 * scale);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();

	ctx.restore();
}

export function drawIceDiamondIcon(ctx, customScale = 1.0) {
	ctx.save();
	ctx.scale(customScale, customScale);
	const img = Assets.get('ice_diamond');
	if (img) {
		const size = GRID_SIZE * 1.2;
		ctx.drawImage(img, -size / 2, -size / 2, size, size);
		ctx.restore();
		return;
	}
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
	ctx.moveTo(0, -size);
	ctx.lineTo(size * 0.7, 0);
	ctx.lineTo(0, size);
	ctx.lineTo(-size * 0.7, 0);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();

	ctx.globalAlpha = 0.6;
	ctx.strokeStyle = '#e0f2fe';
	ctx.lineWidth = 1 / customScale;
	ctx.beginPath();
	ctx.moveTo(0, -size);
	ctx.lineTo(0, size);
	ctx.moveTo(size * 0.7, 0);
	ctx.lineTo(-size * 0.7, 0);
	ctx.stroke();
	ctx.globalAlpha = 1;

	ctx.restore();
}

export function drawStaff(ctx, scale = 1.0) {
	ctx.save();
	ctx.rotate(Math.PI / 4);
	const img = Assets.get('fire_staff');
	if (img) {
		const size = GRID_SIZE * 1.8 * scale;
		ctx.drawImage(img, -size / 2, -size / 2, size, size);
		ctx.restore();
		return;
	}
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

export function drawLightning(ctx, scale = 1.0, rotation = 0) {
	ctx.save();
	ctx.rotate(rotation);
	ctx.scale(scale, scale);
	const img = Assets.get('lightning');
	if (img) {
		const size = GRID_SIZE * 1.6;
		ctx.drawImage(img, -size / 2, -size / 2, size, size);
		ctx.restore();
		return;
	}
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

export function drawMagicSpear(ctx, scale = 1.0, rotation = 0) {
	ctx.save();
	ctx.rotate(rotation);
	ctx.scale(scale, scale);
	const img = Assets.get('magic_spear');
	if (img) {
		const size = GRID_SIZE * 1.8;
		ctx.drawImage(img, -size / 2, -size / 2, size, size);
		ctx.restore();
		return;
	}
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

export function drawBoomerang(ctx, scale = 1.0, rotation = 0, color = null) {
	ctx.save();
	ctx.rotate(rotation);
	ctx.scale(scale, scale);
	const img = Assets.get('boomerang');
	if (img) {
		const size = GRID_SIZE * 1.6;
		ctx.drawImage(img, -size / 2, -size / 2, size, size);
		ctx.restore();
		return;
	}
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

export function drawPoisonPotion(ctx, scale = 1.0) {
	ctx.save();
	ctx.scale(scale, scale);
	const img = Assets.get('poison_potion');
	if (img) {
		const size = GRID_SIZE * 2.0;
		ctx.drawImage(img, -size / 2, -size / 2, size, size);
		ctx.restore();
		return;
	}
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
	ctx.rect(-GRID_SIZE * 0.6, -GRID_SIZE * 1.5, GRID_SIZE * 1.2, GRID_SIZE * 0.3);
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = '#D2B48C';
	ctx.strokeStyle = '#8B4513';
	ctx.beginPath();
	ctx.ellipse(0, -GRID_SIZE * 1.6, GRID_SIZE * 0.5, GRID_SIZE * 0.2, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = '#84cc16';
	ctx.beginPath();
	ctx.arc(0, 0, GRID_SIZE * 0.9, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}


