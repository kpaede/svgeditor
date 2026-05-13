export type SvgEditMode = 'select' | 'rect' | 'ellipse' | 'line' | 'fhpath' | 'text';

export function modeLabel(mode: string): string {
	switch (mode) {
		case 'select':
			return 'Select';
		case 'rect':
			return 'Rectangle';
		case 'ellipse':
			return 'Ellipse';
		case 'line':
			return 'Line';
		case 'fhpath':
			return 'Freehand';
		case 'text':
			return 'Text';
		case 'zoom':
			return 'Zoom';
		case 'path':
			return 'Path';
		case 'ext-panning':
			return 'Panning';
		case 'eyedropper':
			return 'Eyedropper';
		default:
			return mode;
	}
}
