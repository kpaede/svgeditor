import SvgCanvas from '@svgedit/svgcanvas';

export type SvgCanvasWithExtras = SvgCanvas & {
	addSVGElementsFromJson(data: {
		element: string;
		attr?: Record<string, string | number>;
		children?: Array<string | {
			element: string;
			text?: string;
			attr?: Record<string, string | number>;
		}>;
	}): Element;
	setConfig(options: Record<string, unknown>): void;
	updateCanvas(width: number, height: number): void;
	setCurrentZoom(zoomLevel: number): void;
	setBBoxZoom(
		value: 'selection' | 'canvas' | 'content' | 'layer' | SvgCanvasZoomBox,
		editorWidth?: number,
		editorHeight?: number
	): { zoom: number; bbox: SvgCanvasZoomBox } | undefined;
	getSelectedElements(): Element[];
	deleteSelectedElements(): void;
	cutSelectedElements(): void;
	copySelectedElements(): void;
	pasteElements(type?: string, x?: number, y?: number): void;
	selectAllInCurrentLayer(): void;
	setColor(type: 'fill' | 'stroke', value: string, preventUndo?: boolean): void;
	setPaintOpacity(type: 'fill' | 'stroke', value: number, preventUndo?: boolean): void;
	setOpacity(value: number): void;
	setBlur(value: number, complete?: boolean): void;
	setStrokeWidth(value: number): void;
	setStrokeAttr(attr: string, value: string | number): void;
	setRectRadius(value: number): void;
	setRotationAngle(value: number): void;
	flipSelectedElements(scaleX: number, scaleY: number): void;
	alignSelectedElements(type: string, relativeTo: 'selected' | 'largest' | 'smallest' | 'page'): void;
	cloneSelectedElements(x: number, y: number): void;
	moveToTopSelectedElement(): void;
	moveToBottomSelectedElement(): void;
	moveUpDownSelected(direction: 'Up' | 'Down'): void;
	changeSelectedAttribute(attr: string, value: string | number, elements?: Element[]): void;
	convertToPath(element?: Element): Element | null;
	setBold(value: boolean): void;
	setItalic(value: boolean): void;
	hasTextDecoration(value: string): boolean;
	addTextDecoration(value: string): void;
	removeTextDecoration(value: string): void;
	setTextAnchor(value: 'start' | 'middle' | 'end'): void;
	setLetterSpacing(value: string | number): void;
	setWordSpacing(value: string | number): void;
	setTextLength(value: string | number): void;
	setLengthAdjust(value: 'spacing' | 'spacingAndGlyphs'): void;
	setFontFamily(value: string): void;
	setFontSize(value: number): void;
	setFontColor(value: string): void;
	setTextContent(value: string): void;
	getText(): string;
	groupSelectedElements(): Element | null;
	ungroupSelectedElement(): void;
	createLayer(name?: string): void;
	cloneLayer(name?: string): void;
	deleteCurrentLayer(): boolean;
	getCurrentDrawing(): {
		all_layers?: Array<{
			getName(): string;
			isVisible(): boolean;
		}>;
		indexCurrentLayer?(): number;
	};
	getCurrentLayerName(): string;
	setCurrentLayer(name: string): boolean;
	setCurrentLayerPosition(position: number): boolean;
	setLayerVisibility(name: string, visible: boolean): void;
	moveSelectedToLayer(layerName: string): void;
	mergeLayer(): void;
	mergeAllLayers(): void;
	setImageURL(value: string): void;
	setLinkURL(value: string): void;
	makeHyperlink(url: string): Element | null;
	removeHyperlink(): void;
	setBackground(color: string, url?: string): void;
	setDocumentTitle(value: string): void;
	setGroupTitle(value: string): void;
	embedImage(dataUri: string): Promise<Element>;
	pathActions: {
		canDeleteNodes?: boolean;
		closed_subpath?: boolean;
		clear(force?: boolean): void;
		getNodePoint(): { x: number; y: number; type?: number } | null;
		linkControlPoints(linkPoints: boolean): void;
		clonePathNode(): void;
		deletePathNode(): void;
		setSegType(type: number): void;
		moveNode(attr: string, newValue: number): void;
		opencloseSubPath(): void;
		addSubPath(on: boolean): void;
	};
};

export type SvgCanvasZoomBox = {
	x: number;
	y: number;
	width: number;
	height: number;
	factor?: number;
	zoom?: number;
};
