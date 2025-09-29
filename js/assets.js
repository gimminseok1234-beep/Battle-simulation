// Simple image asset loader used by weapon illustrations

const imageManifest = {
	sword: 'assets/weapons/sword.png',
	bow: 'assets/weapons/bow.png',
	magic_dagger: 'assets/weapons/magic_dagger.png',
	axe: 'assets/weapons/axe.png',
	ice_diamond: 'assets/weapons/ice_diamond.png',
	fire_staff: 'assets/weapons/fire_staff.png',
	shuriken: 'assets/weapons/shuriken.png',
	hadoken: 'assets/weapons/hadoken.png',
	lightning: 'assets/weapons/lightning.png',
	magic_spear: 'assets/weapons/magic_spear.png',
	boomerang: 'assets/weapons/boomerang.png',
	poison_potion: 'assets/weapons/poison_potion.png',
	crown: 'assets/weapons/crown.png'
};

const images = new Map();

function loadImage(src) {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => resolve(null);
		img.src = src;
	});
}

export async function loadAssets() {
	const entries = Object.entries(imageManifest);
	await Promise.all(entries.map(async ([key, src]) => {
		const img = await loadImage(src);
		if (img) images.set(key, img);
	}));
}

export const Assets = {
	has(key) { return images.has(key); },
	get(key) { return images.get(key) || null; }
};


