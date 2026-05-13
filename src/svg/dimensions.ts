import { DEFAULT_SETTINGS } from '../settings';

export interface SvgDimensions {
	width: number;
	height: number;
}

export function getSvgDimensions(source: string): SvgDimensions {
	const parser = new DOMParser();
	const document = parser.parseFromString(source, 'image/svg+xml');
	const svg = document.querySelector('svg');

	if (!svg) {
		return {
			width: DEFAULT_SETTINGS.defaultWidth,
			height: DEFAULT_SETTINGS.defaultHeight
		};
	}

	const width = toPositiveNumber(svg.getAttribute('width'));
	const height = toPositiveNumber(svg.getAttribute('height'));
	const viewBox = svg.getAttribute('viewBox')?.split(/[\s,]+/).map(Number);

	return {
		width: width ?? (viewBox && viewBox.length === 4 ? viewBox[2] : DEFAULT_SETTINGS.defaultWidth),
		height: height ?? (viewBox && viewBox.length === 4 ? viewBox[3] : DEFAULT_SETTINGS.defaultHeight)
	};
}

function toPositiveNumber(value: string | null): number | null {
	if (!value) {
		return null;
	}

	const number = Number.parseFloat(value);
	return Number.isFinite(number) && number > 0 ? number : null;
}
