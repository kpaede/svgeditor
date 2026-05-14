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
	updateCanvas(width: number, height: number): { x: number; y: number; old_x: number; old_y: number; d_x: number; d_y: number };
	clear(): void;
	setCurrentZoom(zoomLevel: number): void;
	getResolution(): { w: number; h: number; zoom?: number };
	setBBoxZoom(
		value: 'selection' | 'canvas' | 'content' | 'layer' | SvgCanvasZoomBox,
		editorWidth?: number,
		editorHeight?: number
	): { zoom: number; bbox: SvgCanvasZoomBox } | undefined;
	getStrokedBBox(elements?: Element[]): { x: number; y: number; width: number; height: number } | null;
	getRotationAngle(element?: Element, toRad?: boolean): number;
	getHref(element: Element): string;
	getSelectedElements(): Element[];
	clearSelection(noCall?: boolean): void;
	cycleElement(next: 0 | 1): void;
	moveSelectedElements(dx: number, dy: number, undoable?: boolean): void;
	deleteSelectedElements(): void;
	cutSelectedElements(): void;
	copySelectedElements(): void;
	pasteElements(type?: string, x?: number, y?: number): void;
	selectAllInCurrentLayer(): void;
	getColor(type: 'fill' | 'stroke'): string;
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
	changeSelectedAttributeNoUndo(attr: string, value: string | number, elements?: Element[]): void;
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
		getNumLayers?(): number;
		getLayerName?(index: number): string;
		getCurrentLayerName?(): string;
		hasLayer?(name: string): boolean;
		setLayerOpacity?(name: string, opacity: number): void;
		indexCurrentLayer?(): number;
	};
	getCurrentLayerName?(): string;
	setCurrentLayer(name: string): boolean;
	setCurrentLayerPosition(position: number): boolean;
	setLayerVisibility(name: string, visible: boolean): void;
	moveSelectedToLayer(layerName: string): void;
	mergeLayer(): void;
	mergeAllLayers(): void;
	getCurrentGroup(): Element | null;
	setContext(element: Element | string): void;
	leaveContext(): void;
	setImageURL(value: string): void;
	setLinkURL(value: string): void;
	makeHyperlink(url: string): Element | null;
	removeHyperlink(): void;
	setBackground(color: string, url?: string): void;
	getDocumentTitle(): string;
	setDocumentTitle(value: string): void;
	getTitle(element?: Element): string | undefined;
	setGroupTitle(value: string): void;
	embedImage(dataUri: string): Promise<Element>;
	importSvgString(source: string, preserveDimension?: boolean): Element | null;
	rasterExport(
		imageType?: string,
		quality?: number,
		windowName?: string,
		options?: { avoidEvent?: boolean }
	): Promise<{ datauri?: string; bloburl?: string; issues?: string[]; type?: string; mimeType?: string }>;
	exportPDF(
		windowName?: string,
		outputType?: 'save' | 'dataurlstring' | 'bloburl'
	): Promise<{ output?: string; issues?: string[]; windowName?: string; outputType?: string }>;
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
		reorient(): void;
	};
	undoMgr: {
		getUndoStackSize(): number;
		getRedoStackSize(): number;
		undo(): void;
		redo(): void;
		addCommandToHistory(command: unknown): void;
	};
	history: Record<string, unknown>;
	contentW: number;
	contentH: number;
};

export type SvgCanvasZoomBox = {
	x: number;
	y: number;
	width: number;
	height: number;
	factor?: number;
	zoom?: number;
};
