#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// This script scans Images/PhotoGallery for image files and injects them
// into the carousel viewport in index.html. Run from the repository root:
// node scripts/populatePhotoGallery.js

const repoRoot = path.resolve(__dirname, '..');
const galleryDir = path.join(repoRoot, 'Images', 'PhotoGallery');
const indexFile = path.join(repoRoot, 'index.html');

function isImageFile(name) {
	return /\.(jpe?g|png|gif|webp|jfif|bmp)$/i.test(name);
}

function makeSlideHtml(filename, isActive) {
	const safeAlt = filename.replace(/[-_]+/g, ' ');
	return `    <article class="mini-gallery__slide${isActive ? ' is-active' : ''}">
						<img src="Images/PhotoGallery/${filename}" alt="${safeAlt}" />
					</article>`;
}

function main() {
	if (!fs.existsSync(galleryDir)) {
		console.error(`Gallery directory not found: ${galleryDir}`);
		process.exitCode = 1;
		return;
	}

	const items = fs.readdirSync(galleryDir).filter((f) => isImageFile(f)).sort();
	if (!items.length) {
		console.log('No images found in PhotoGallery — no changes made.');
		return;
	}

	const slides = items.map((f, i) => makeSlideHtml(f, i === 0)).join('\n');
	const newViewport = `<div class="mini-gallery__viewport" data-carousel="featured">\n${slides}\n                </div>`;

	const indexHtml = fs.readFileSync(indexFile, 'utf8');

	const regex = /<div[^>]*data-carousel="featured"[^>]*>[\s\S]*?<\/div>/i;
	if (!regex.test(indexHtml)) {
		console.error('Could not find carousel viewport in index.html');
		process.exitCode = 1;
		return;
	}

	const updated = indexHtml.replace(regex, newViewport);
	fs.writeFileSync(indexFile, updated, 'utf8');
	console.log(`Inserted ${items.length} image(s) into carousel from Images/PhotoGallery.`);
}

main();
