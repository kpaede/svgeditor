import SvgCanvas from '@svgedit/svgcanvas';
import { App, Modal, Notice, TFile, setIcon } from 'obsidian';
import { SVG_MIME_PLACEHOLDER } from '../svg/blank-svg';
import { getSvgDimensions } from '../svg/dimensions';
import { modeLabel } from '../svg/modes';
import { SvgCanvasWithExtras, SvgCanvasZoomBox } from '../svg/types';
import { Rulers } from './rulers';

type AlignRelativeTo = 'selected' | 'largest' | 'smallest' | 'page';
type MarkerPosition = 'start' | 'mid' | 'end';
type MarkerType = 'nomarker' | 'leftarrow' | 'rightarrow' | 'box' | 'mcircle' | 'leftarrow_o' | 'rightarrow_o' | 'box_o' | 'mcircle_o';
type LayerInfo = {
	name: string;
	index: number;
	visible: boolean;
	current: boolean;
};

export class SvgEditModal extends Modal {
	private canvas: SvgCanvasWithExtras | null = null;
	private readonly file: TFile;
	private readonly fallbackSvg: string;
	private dirty = false;
	private wireframe = false;
	private gridVisible = true;
	private canvasWidth = 800;
	private canvasHeight = 600;
	private statusEl: HTMLElement | null = null;
	private selectedPanelEl: HTMLElement | null = null;
	private contextRowEl: HTMLElement | null = null;
	private elementContextPanels = new Map<string, HTMLElement>();
	private elementAttributeInputs: Array<{ panel: HTMLElement; attribute: string; input: HTMLInputElement }> = [];
	private pathNodePanelEl: HTMLElement | null = null;
	private pathNodeInputs = new Map<'x' | 'y', HTMLInputElement>();
	private pathSegmentSelectEl: HTMLSelectElement | null = null;
	private addSubpathActive = false;
	private markerPanelEl: HTMLElement | null = null;
	private markerSelects = new Map<MarkerPosition, HTMLSelectElement>();
	private starPanelEl: HTMLElement | null = null;
	private polygonPanelEl: HTMLElement | null = null;
	private polystarInputs = new Map<string, HTMLInputElement>();
	private textPanelEl: HTMLElement | null = null;
	private textRowEl: HTMLElement | null = null;
	private textInputEl: HTMLInputElement | null = null;
	private bodyEl: HTMLElement | null = null;
	private canvasHostEl: HTMLElement | null = null;
	private rulers: Rulers | null = null;
	private layerPanelEl: HTMLElement | null = null;
	private layerListEl: HTMLElement | null = null;
	private contextMenuEl: HTMLElement | null = null;
	private layerPanelVisible = false;
	private zoomPointerDown: { x: number; y: number } | null = null;
	private panPointerDown: { x: number; y: number; scrollLeft: number; scrollTop: number; previousMode: string } | null = null;
	private keydownHandler = (event: KeyboardEvent) => this.handleKeydown(event);
	private workareaWheelHandler = (event: WheelEvent) => this.handleWorkareaWheel(event);
	private workareaMouseDownHandler = (event: MouseEvent) => this.handleWorkareaMouseDown(event);
	private workareaMouseUpHandler = (event: MouseEvent) => this.handleWorkareaMouseUp(event);
	private workareaMouseMoveHandler = (event: MouseEvent) => this.handleWorkareaMouseMove(event);
	private workareaContextMenuHandler = (event: MouseEvent) => this.handleWorkareaContextMenu(event);
	private contextMenuClickAwayHandler = (event: MouseEvent) => this.handleContextMenuClickAway(event);
	private windowMouseUpHandler = (event: MouseEvent) => this.handleWindowMouseUp(event);

	constructor(app: App, file: TFile, fallbackSvg = SVG_MIME_PLACEHOLDER) {
		super(app);
		this.file = file;
		this.fallbackSvg = fallbackSvg;
	}

	async onOpen() {
		this.modalEl.addClass('svg-edit-modal');
		this.modalEl.setAttribute('tabindex', '-1');
		this.titleEl.setText('');

		const source = await this.app.vault.read(this.file);
		this.buildLayout(source.trim() ? source : this.fallbackSvg);
		window.addEventListener('keydown', this.keydownHandler, true);
		window.addEventListener('mousemove', this.workareaMouseMoveHandler, true);
		window.addEventListener('mouseup', this.windowMouseUpHandler, true);
		window.addEventListener('mousedown', this.contextMenuClickAwayHandler, true);
		document.addEventListener('keydown', this.keydownHandler, true);
		this.modalEl.addEventListener('keydown', this.keydownHandler, true);
		window.requestAnimationFrame(() => this.modalEl.focus());
	}

	onClose() {
		window.removeEventListener('keydown', this.keydownHandler, true);
		window.removeEventListener('mousemove', this.workareaMouseMoveHandler, true);
		window.removeEventListener('mouseup', this.windowMouseUpHandler, true);
		window.removeEventListener('mousedown', this.contextMenuClickAwayHandler, true);
		document.removeEventListener('keydown', this.keydownHandler, true);
		this.modalEl.removeEventListener('keydown', this.keydownHandler, true);
		this.rulers?.destroy();
		this.rulers = null;
		this.contentEl.empty();
		this.canvas = null;
	}

	close() {
		if (this.dirty && !window.confirm('This SVG has unsaved changes. Close the editor anyway?')) {
			return;
		}

		super.close();
	}

	private buildLayout(source: string): void {
		const dimensions = getSvgDimensions(source);
		this.canvasWidth = dimensions.width;
		this.canvasHeight = dimensions.height;

		const shellEl = this.contentEl.createDiv({ cls: 'svg-edit-shell' });
		const topEl = shellEl.createDiv({ cls: 'svg-edit-top', attr: { id: 'tools_top' } });
		const mainTopEl = topEl.createDiv({ cls: 'svg-edit-top-main' });
		const contextTopEl = topEl.createDiv({ cls: 'svg-edit-top-context' });
		this.contextRowEl = contextTopEl;
		const textTopEl = topEl.createDiv({ cls: 'svg-edit-top-text' });
		this.textRowEl = textTopEl;
		const bodyEl = shellEl.createDiv({ cls: 'svg-edit-body' });
		this.bodyEl = bodyEl;
		const leftEl = bodyEl.createDiv({ cls: 'svg-edit-left', attr: { id: 'tools_left' } });
		const canvasFrameEl = bodyEl.createDiv({ cls: 'svg-edit-canvas-frame' });
		const rulerCornerEl = canvasFrameEl.createDiv({ cls: 'svg-edit-ruler-corner', attr: { id: 'ruler_corner' } });
		const rulerXEl = canvasFrameEl.createDiv({ cls: 'svg-edit-ruler svg-edit-ruler-x', attr: { id: 'ruler_x' } });
		rulerXEl.createDiv({ cls: 'svg-edit-ruler-inner' }).createEl('canvas', { attr: { width: '1', height: '15' } });
		const rulerYEl = canvasFrameEl.createDiv({ cls: 'svg-edit-ruler svg-edit-ruler-y', attr: { id: 'ruler_y' } });
		rulerYEl.createDiv({ cls: 'svg-edit-ruler-inner' }).createEl('canvas', { attr: { width: '15', height: '1' } });
		this.canvasHostEl = canvasFrameEl.createDiv({ cls: 'svg-edit-canvas-host is-grid-visible', attr: { id: 'workarea' } });
		this.contextMenuEl = shellEl.createDiv({ cls: 'svg-edit-context-menu' });
		const layerEl = bodyEl.createDiv({ cls: 'svg-edit-layer-panel', attr: { id: 'layer_view_panel' } });
		this.layerPanelEl = layerEl;
		const bottomEl = shellEl.createDiv({ cls: 'svg-edit-bottom', attr: { id: 'tools_bottom' } });

		this.textInputEl = shellEl.createEl('input', {
			cls: 'svg-edit-text-input',
			attr: {
				type: 'text',
				placeholder: 'Text'
			}
		});

		this.canvas = new SvgCanvas(this.canvasHostEl, {
			initFill: { color: 'ffffff', opacity: 1 },
			initStroke: { color: '111111', opacity: 1, width: 2 },
			text: { stroke_width: 0, font_size: 24, font_family: 'Arial, sans-serif' },
			initOpacity: 1,
			dimensions: [dimensions.width, dimensions.height],
			baseUnit: 'px',
			show_outside_canvas: true,
			selectNew: true
		}) as SvgCanvasWithExtras;

		this.canvas.updateCanvas(dimensions.width, dimensions.height);
		this.loadSvg(source);
		this.rulers = new Rulers(this.canvas, {
			workarea: this.canvasHostEl,
			rulerX: rulerXEl,
			rulerY: rulerYEl,
			rulerCorner: rulerCornerEl
		});
		this.connectCanvasEvents();
		this.connectWorkareaNavigation();
		this.buildTopToolbar(mainTopEl, contextTopEl, textTopEl);
		this.buildLeftToolbar(leftEl);
		this.buildLayerPanel(layerEl);
		this.buildBottomToolbar(bottomEl);
		this.setMode('select');
		window.requestAnimationFrame(() => this.updateCanvasViewport({ center: true }));
	}

	private buildTopToolbar(toolbarEl: HTMLElement, contextEl: HTMLElement, textEl: HTMLElement): void {
		const brandPanel = toolbarEl.createDiv({ cls: 'svg-edit-brand-panel' });
		const brandIcon = brandPanel.createSpan({ cls: 'svg-edit-brand-icon' });
		setIcon(brandIcon, 'paintbrush-vertical');
		brandPanel.createSpan({ text: 'SVG-Edit' });
		brandPanel.createSpan({ cls: 'svg-edit-brand-caret', text: '▾' });

		const titlePanel = toolbarEl.createDiv({ cls: 'svg-edit-title-panel', attr: { id: 'title_panel' } });
		titlePanel.createEl('p', { text: this.file.name });

		const editorPanel = this.addPanel(toolbarEl, 'editor_panel');
		this.addActionButton(editorPanel, 'Edit Source [U]', 'code-2', () => this.openSourceEditor());
		this.addActionButton(editorPanel, 'Wireframe Mode [F]', 'scan-line', () => this.toggleWireframe());
		this.addActionButton(editorPanel, 'Show/Hide Grid', 'grid-3x3', () => this.toggleGrid());
		this.addActionButton(editorPanel, 'Layer View', 'layers-3', () => this.toggleLayerPanel());

		const historyPanel = this.addPanel(toolbarEl, 'history_panel');
		this.addActionButton(historyPanel, 'Undo [Ctrl+Z]', 'undo-2', () => this.canvas?.undo());
		this.addActionButton(historyPanel, 'Redo [Ctrl+Y]', 'redo-2', () => this.canvas?.redo());

		const selectedPanel = this.addPanel(toolbarEl, 'selected_panel');
		selectedPanel.addClass('svg-edit-selection-panel');
		this.selectedPanelEl = selectedPanel;
		this.addActionButton(selectedPanel, 'Duplicate [D]', 'copy-plus', () => this.withDirtyAction('Duplicated', () => this.canvas?.cloneSelectedElements(20, 20)));
		this.addActionButton(selectedPanel, 'Delete [Delete]', 'trash-2', () => this.deleteSelection());
		this.addActionButton(selectedPanel, 'Bring to Front', 'bring-to-front', () => this.withDirtyAction('Bring to Front', () => this.canvas?.moveToTopSelectedElement()));
		this.addActionButton(selectedPanel, 'Send to Back', 'send-to-back', () => this.withDirtyAction('Send to Back', () => this.canvas?.moveToBottomSelectedElement()));
		this.addActionButton(selectedPanel, 'Move Up', 'move-up', () => this.withDirtyAction('Move Up', () => this.canvas?.moveUpDownSelected('Up')));
		this.addActionButton(selectedPanel, 'Move Down', 'move-down', () => this.withDirtyAction('Move Down', () => this.canvas?.moveUpDownSelected('Down')));
		this.addActionButton(selectedPanel, 'Convert to Path', 'route', () => this.convertSelectionToPath());
		this.addActionButton(selectedPanel, 'Flip Horizontally', 'flip-horizontal-2', () => this.withDirtyAction('Flipped horizontally', () => this.canvas?.flipSelectedElements(-1, 1)));
		this.addActionButton(selectedPanel, 'Flip Vertically', 'flip-vertical-2', () => this.withDirtyAction('Flipped vertically', () => this.canvas?.flipSelectedElements(1, -1)));
		this.addActionButton(selectedPanel, 'Group [G]', 'group', () => this.withDirtyAction('Grouped', () => this.canvas?.groupSelectedElements()));
		this.addActionButton(selectedPanel, 'Ungroup', 'ungroup', () => this.withDirtyAction('Ungrouped', () => this.canvas?.ungroupSelectedElement()));
		this.addActionButton(selectedPanel, 'Create Link', 'link', () => this.createOrEditLink());
		this.addActionButton(selectedPanel, 'Remove Link', 'unlink', () => this.withDirtyAction('Link removed', () => this.canvas?.removeHyperlink()));
		this.addActionButton(selectedPanel, 'Image URL', 'image-up', () => this.setSelectedImageUrl());
		this.addActionButton(selectedPanel, 'Element ID', 'badge', () => this.setSelectedAttribute('id', 'Element ID'));
		this.addActionButton(selectedPanel, 'Element Class', 'tags', () => this.setSelectedAttribute('class', 'Element Class'));

		const transformPanel = this.addPanel(contextEl, 'transform_panel', 'svg-edit-context-panel svg-edit-transform-panel');
		transformPanel.addClass('is-visible');
		this.addNumberInput(transformPanel, 'Angle', 0, -360, 360, 1, (value) => {
			this.canvas?.setRotationAngle(value);
			this.markDirty('Rotation changed');
		});
		this.addNumberInput(transformPanel, 'Blur', 0, 0, 100, 1, (value) => {
			this.canvas?.setBlur(value, true);
			this.markDirty('Blur changed');
		});
		this.addNumberInput(transformPanel, 'Corner', 0, 0, 1000, 1, (value) => {
			this.canvas?.setRectRadius(value);
			this.markDirty('Corner radius changed');
		});
		this.addAlignControls(transformPanel);
		this.buildElementContextPanels(contextEl);
		this.buildPathNodePanel(contextEl);
		this.buildMarkerPanel(contextEl);
		this.buildPolystarPanels(contextEl);

		const textPanel = this.addPanel(textEl, 'text_panel', 'svg-edit-context-panel');
		this.textPanelEl = textPanel;
		this.addActionButton(textPanel, 'Bold [B]', 'bold', () => this.withDirtyAction('Text bold changed', () => this.toggleTextStyle('bold')));
		this.addActionButton(textPanel, 'Italic [I]', 'italic', () => this.withDirtyAction('Text italic changed', () => this.toggleTextStyle('italic')));
		this.addActionButton(textPanel, 'Underline', 'underline', () => this.withDirtyAction('Text decoration changed', () => this.toggleTextDecoration('underline')));
		this.addActionButton(textPanel, 'Line-through', 'strikethrough', () => this.withDirtyAction('Text decoration changed', () => this.toggleTextDecoration('line-through')));
		this.addActionButton(textPanel, 'Overline', 'square-menu', () => this.withDirtyAction('Text decoration changed', () => this.toggleTextDecoration('overline')));
		this.addActionButton(textPanel, 'Text left', 'align-left', () => this.withDirtyAction('Text left', () => this.canvas?.setTextAnchor('start')));
		this.addActionButton(textPanel, 'Text center', 'align-center', () => this.withDirtyAction('Text center', () => this.canvas?.setTextAnchor('middle')));
		this.addActionButton(textPanel, 'Text right', 'align-right', () => this.withDirtyAction('Text right', () => this.canvas?.setTextAnchor('end')));
		this.addSelectInput(textPanel, 'Font', [
			{ label: 'Serif', value: 'serif' },
			{ label: 'Sans', value: 'Arial, sans-serif' },
			{ label: 'Mono', value: 'monospace' },
			{ label: 'Cursive', value: 'cursive' },
			{ label: 'Fantasy', value: 'fantasy' }
		], (value) => {
			this.canvas?.setFontFamily(value);
			this.markDirty('Font changed');
		});
		this.addNumberInput(textPanel, 'Size', 24, 1, 1000, 1, (value) => {
			this.canvas?.setFontSize(value);
			this.markDirty('Font size changed');
		});
		this.addNumberInput(textPanel, 'Letters', 0, 0, 100, 1, (value) => {
			this.canvas?.setLetterSpacing(value);
			this.markDirty('Letter spacing changed');
		});
		this.addNumberInput(textPanel, 'Words', 0, 0, 1000, 1, (value) => {
			this.canvas?.setWordSpacing(value);
			this.markDirty('Word spacing changed');
		});
		this.addNumberInput(textPanel, 'Length', 0, 0, 1000, 1, (value) => {
			this.canvas?.setTextLength(value);
			this.markDirty('Text length changed');
		});
		this.addSelectInput(textPanel, 'Adjust', [
			{ label: 'Spacing', value: 'spacing' },
			{ label: 'Spacing+Glyphs', value: 'spacingAndGlyphs' }
		], (value) => {
			this.canvas?.setLengthAdjust(value as 'spacing' | 'spacingAndGlyphs');
			this.markDirty('Text length adjustment changed');
		});

		const documentPanel = this.addPanel(toolbarEl, 'document_panel');
		this.addNumberInput(documentPanel, 'Width', this.canvasWidth, 1, 10000, 10, (value) => this.resizeCanvas(value, this.canvasHeight));
		this.addNumberInput(documentPanel, 'Height', this.canvasHeight, 1, 10000, 10, (value) => this.resizeCanvas(this.canvasWidth, value));
		this.addActionButton(documentPanel, 'Document Title', 'file-pen-line', () => this.setDocumentTitle());
		this.addActionButton(documentPanel, 'Background Color', 'paint-bucket', () => this.setBackgroundColor());
		this.addActionButton(documentPanel, 'Copy SVG Source', 'clipboard-copy', () => this.copySvgSource());
		this.addActionButton(documentPanel, 'Save [Ctrl+S]', 'save', () => this.save());
		this.statusEl = documentPanel.createDiv({ cls: 'svg-edit-status', text: 'Ready' });
		this.updateContextPanels();
	}

	private buildLeftToolbar(toolbarEl: HTMLElement): void {
		this.addToolButton(toolbarEl, 'Select [V]', 'mouse-pointer-2', 'select', 'tool_select');
		const zoomButton = this.addToolButton(toolbarEl, 'Zoom [Z]', 'zoom-in', 'zoom', 'tool_zoom');
		zoomButton.addEventListener('dblclick', (event) => {
			event.preventDefault();
			event.stopPropagation();
			this.resetZoom();
		});
		this.addActionButton(toolbarEl, 'Panning [Space]', 'hand', () => this.setMode('ext-panning'), 'ext-panning');
		this.addToolButton(toolbarEl, 'Freehand [Q]', 'pencil', 'fhpath', 'tool_fhpath');
		this.addToolButton(toolbarEl, 'Line [L]', 'slash', 'line', 'tool_line');
		this.addToolButton(toolbarEl, 'Path [P]', 'pen-tool', 'path', 'tool_path');
		this.addFlyingToolGroup(toolbarEl, 'tools_rect', [
			{ label: 'Rectangle [R]', icon: 'rectangle-horizontal', mode: 'rect', id: 'tool_rect' },
			{ label: 'Square', icon: 'square', mode: 'square', id: 'tool_square' },
			{ label: 'Freehand Rectangle', icon: 'box-select', mode: 'fhrect', id: 'tool_fhrect' }
		]);
		this.addFlyingToolGroup(toolbarEl, 'tools_ellipse', [
			{ label: 'Ellipse [E]', icon: 'circle', mode: 'ellipse', id: 'tool_ellipse' },
			{ label: 'Circle', icon: 'circle-dot', mode: 'circle', id: 'tool_circle' },
			{ label: 'Freehand Ellipse', icon: 'badge', mode: 'fhellipse', id: 'tool_fhellipse' }
		]);
		this.addToolButton(toolbarEl, 'Text [T]', 'type', 'text', 'tool_text');
		this.addShapeLibraryFlyout(toolbarEl);
		this.addFlyingToolGroup(toolbarEl, 'tools_polygon', [
			{ label: 'Star', icon: 'star', mode: 'star', id: 'tool_star' },
			{ label: 'Polygon', icon: 'hexagon', mode: 'polygon', id: 'tool_polygon' }
		]);
		this.addActionButton(toolbarEl, 'Image', 'image-plus', () => this.importImage(), 'tool_image');
		this.addActionButton(toolbarEl, 'Eyedropper', 'pipette', () => this.pickColorFromSelection(), 'tool_eyedropper');
		this.addActionButton(toolbarEl, 'Connector', 'workflow', () => this.createConnector(), 'tool_connect');
	}

	private buildLayerPanel(panelEl: HTMLElement): void {
		const headerEl = panelEl.createDiv({ cls: 'svg-edit-layer-header' });
		headerEl.createDiv({ cls: 'svg-edit-layer-title', text: 'Layers' });
		this.addActionButton(headerEl, 'Close Layer View', 'panel-right-close', () => this.toggleLayerPanel());

		const actionsEl = panelEl.createDiv({ cls: 'svg-edit-layer-actions' });
		this.addActionButton(actionsEl, 'New Layer', 'plus', () => this.createLayer());
		this.addActionButton(actionsEl, 'Rename Layer', 'pencil', () => this.renameLayer());
		this.addActionButton(actionsEl, 'Duplicate Layer', 'copy-plus', () => this.cloneLayer());
		this.addActionButton(actionsEl, 'Delete Layer', 'trash-2', () => this.deleteLayer());
		this.addActionButton(actionsEl, 'Move Layer Up', 'arrow-up', () => this.moveLayer(1));
		this.addActionButton(actionsEl, 'Move Layer Down', 'arrow-down', () => this.moveLayer(-1));
		this.addActionButton(actionsEl, 'Merge Down', 'git-merge', () => this.mergeLayer());
		this.addActionButton(actionsEl, 'Merge All Layers', 'combine', () => this.mergeAllLayers());
		this.addActionButton(actionsEl, 'Move Selection to Current Layer', 'corner-down-right', () => this.moveSelectionToCurrentLayer());

		this.layerListEl = panelEl.createDiv({ cls: 'svg-edit-layer-list' });
		this.refreshLayerPanel();
	}

	private buildBottomToolbar(toolbarEl: HTMLElement): void {
		this.addSelectInput(toolbarEl, 'Zoom', [
			{ label: '1000%', value: '10' },
			{ label: '400%', value: '4' },
			{ label: '200%', value: '2' },
			{ label: '100%', value: '1' },
			{ label: '50%', value: '0.5' },
			{ label: '25%', value: '0.25' },
			{ label: 'Canvas', value: 'canvas' },
			{ label: 'Selection', value: 'selection' },
			{ label: 'Layer', value: 'layer' },
			{ label: 'All', value: 'content' }
		], (value) => this.setZoomValue(value));
		this.addColorInput(toolbarEl, 'Fill', '#ffffff', (value) => {
			this.canvas?.setColor('fill', value);
			this.markDirty('Fill changed');
		});
		this.addColorInput(toolbarEl, 'Stroke', '#111111', (value) => {
			this.canvas?.setColor('stroke', value);
			this.markDirty('Stroke changed');
		});
		this.addNumberInput(toolbarEl, 'Stroke', 2, 0, 99, 1, (value) => {
			this.canvas?.setStrokeWidth(value);
			this.markDirty('Stroke width changed');
		});
		this.addSelectInput(toolbarEl, 'Style', [
			{ label: '—', value: 'none' },
			{ label: '...', value: '2,2' },
			{ label: '--', value: '5,5' },
			{ label: '-.', value: '5,2,2,2' },
			{ label: '-..', value: '5,2,2,2,2,2' }
		], (value) => {
			this.canvas?.setStrokeAttr('stroke-dasharray', value);
			this.markDirty('Stroke style changed');
		});
		this.addSelectInput(toolbarEl, 'Join', [
			{ label: 'Miter', value: 'miter' },
			{ label: 'Round', value: 'round' },
			{ label: 'Bevel', value: 'bevel' }
		], (value) => {
			this.canvas?.setStrokeAttr('stroke-linejoin', value);
			this.markDirty('Line join changed');
		});
		this.addSelectInput(toolbarEl, 'Cap', [
			{ label: 'Butt', value: 'butt' },
			{ label: 'Square', value: 'square' },
			{ label: 'Round', value: 'round' }
		], (value) => {
			this.canvas?.setStrokeAttr('stroke-linecap', value);
			this.markDirty('Line cap changed');
		});
		this.addNumberInput(toolbarEl, 'Opacity', 100, 0, 100, 5, (value) => {
			this.canvas?.setOpacity(value / 100);
			this.markDirty('Opacity changed');
		});
		this.addPalette(toolbarEl);
	}

	private addAlignControls(parentEl: HTMLElement): void {
		this.addActionButton(parentEl, 'Align Left', 'align-horizontal-justify-start', () => this.align('left'));
		this.addActionButton(parentEl, 'Align Center', 'align-horizontal-justify-center', () => this.align('center'));
		this.addActionButton(parentEl, 'Align Right', 'align-horizontal-justify-end', () => this.align('right'));
		this.addActionButton(parentEl, 'Align Top', 'align-vertical-justify-start', () => this.align('top'));
		this.addActionButton(parentEl, 'Align Middle', 'align-vertical-justify-center', () => this.align('middle'));
		this.addActionButton(parentEl, 'Align Bottom', 'align-vertical-justify-end', () => this.align('bottom'));
		this.addActionButton(parentEl, 'Distribute Horizontally', 'columns-3', () => this.align('distrib_horiz'));
		this.addActionButton(parentEl, 'Distribute Vertically', 'rows-3', () => this.align('distrib_verti'));
		this.addSelectInput(parentEl, 'Relative to', [
			{ label: 'Selection', value: 'selected' },
			{ label: 'Largest', value: 'largest' },
			{ label: 'Smallest', value: 'smallest' },
			{ label: 'Page', value: 'page' }
		], (value) => {
			this.contentEl.dataset.alignRelativeTo = value;
		});
		this.contentEl.dataset.alignRelativeTo = 'selected';
	}

	private addPalette(parentEl: HTMLElement): void {
		const paletteEl = parentEl.createDiv({ cls: 'svg-edit-palette', attr: { id: 'palette' } });
		['#000000', '#ffffff', '#e03131', '#f08c00', '#f2c94c', '#2f9e44', '#228be6', '#7048e8', '#d6336c', 'none'].forEach((color) => {
			const swatch = paletteEl.createEl('button', {
				cls: 'svg-edit-swatch',
				attr: {
					type: 'button',
					title: color === 'none' ? 'No Color' : color,
					'aria-label': color === 'none' ? 'No Color' : color
				}
			});
			swatch.style.background = color === 'none' ? 'transparent' : color;
			swatch.toggleClass('is-none', color === 'none');
			swatch.addEventListener('click', (event) => {
				if (event.shiftKey) {
					this.canvas?.setColor('stroke', color);
					this.markDirty('Stroke changed');
					return;
				}
				this.canvas?.setColor('fill', color);
				this.markDirty('Fill changed');
			});
		});
	}

	private addPanel(parentEl: HTMLElement, id: string, extraClass = ''): HTMLElement {
		const panelEl = parentEl.createDiv({ cls: `svg-edit-panel ${extraClass}`.trim(), attr: { id } });
		panelEl.createDiv({ cls: 'tool_sep' });
		return panelEl;
	}

	private addFlyingToolGroup(
		parentEl: HTMLElement,
		id: string,
		tools: Array<{ label: string; icon: string; mode: string; id: string }>
	): void {
		const groupEl = parentEl.createDiv({ cls: 'svg-edit-flying-tool', attr: { id } });
		const primary = tools[0];
		this.addToolButton(groupEl, primary.label, primary.icon, primary.mode, primary.id);
		const flyoutEl = groupEl.createDiv({ cls: 'svg-edit-flyout' });
		tools.slice(1).forEach((tool) => {
			this.addToolButton(flyoutEl, tool.label, tool.icon, tool.mode, tool.id);
		});
	}

	private addShapeLibraryFlyout(parentEl: HTMLElement): void {
		const groupEl = parentEl.createDiv({ cls: 'svg-edit-shape-tool', attr: { id: 'tool_shapelib' } });
		const button = this.createIconButton(groupEl, 'Shape Library', 'shapes');
		button.addEventListener('click', () => groupEl.toggleClass('is-open', !groupEl.hasClass('is-open')));

		const flyoutEl = groupEl.createDiv({ cls: 'svg-edit-shape-flyout' });
		const gridEl = flyoutEl.createDiv({ cls: 'svg-edit-shape-grid' });
		const categoryEl = flyoutEl.createDiv({ cls: 'svg-edit-shape-categories' });
		const libraries: Record<string, Array<{ label: string; icon: string; value: string }>> = {
			basic: [
				{ label: 'Heart', icon: 'heart', value: 'heart' },
				{ label: 'Rectangle', icon: 'square', value: 'rectangle' },
				{ label: 'Circle', icon: 'circle', value: 'circle' },
				{ label: 'Triangle', icon: 'triangle', value: 'triangle' },
				{ label: 'Right Triangle', icon: 'play', value: 'right-triangle' },
				{ label: 'Diamond', icon: 'diamond', value: 'diamond' },
				{ label: 'Pentagon', icon: 'pentagon', value: 'pentagon' },
				{ label: 'Hexagon', icon: 'hexagon', value: 'hexagon' },
				{ label: 'Star', icon: 'star', value: 'star' },
				{ label: 'Arrow Up', icon: 'arrow-up', value: 'arrow-up' },
				{ label: 'Smile', icon: 'smile', value: 'smile' },
				{ label: 'Speech Bubble', icon: 'message-square', value: 'bubble' }
			],
			animal: [
				{ label: 'Bug', icon: 'bug', value: 'bug' },
				{ label: 'Fish', icon: 'fish', value: 'fish' },
				{ label: 'Rabbit', icon: 'rabbit', value: 'rabbit' }
			],
			arrow: [
				{ label: 'Arrow Up', icon: 'arrow-up', value: 'arrow-up' },
				{ label: 'Arrow Right', icon: 'arrow-right', value: 'arrow-right' },
				{ label: 'Arrow Down', icon: 'arrow-down', value: 'arrow-down' },
				{ label: 'Arrow Left', icon: 'arrow-left', value: 'arrow-left' }
			],
			dialog_balloon: [
				{ label: 'Speech Bubble', icon: 'message-square', value: 'bubble' },
				{ label: 'Rounded Bubble', icon: 'message-circle', value: 'round-bubble' }
			],
			electronics: [
				{ label: 'Battery', icon: 'battery', value: 'battery' },
				{ label: 'Cpu', icon: 'cpu', value: 'chip' },
				{ label: 'Plug', icon: 'plug', value: 'plug' }
			],
			flowchart: [
				{ label: 'Process', icon: 'square', value: 'rectangle' },
				{ label: 'Decision', icon: 'diamond', value: 'diamond' },
				{ label: 'Terminator', icon: 'circle', value: 'round-bubble' }
			],
			game: [
				{ label: 'Dice', icon: 'dice-5', value: 'dice' },
				{ label: 'Club', icon: 'club', value: 'club' },
				{ label: 'Spade', icon: 'spade', value: 'spade' }
			],
			math: [
				{ label: 'Plus', icon: 'plus', value: 'plus' },
				{ label: 'Minus', icon: 'minus', value: 'minus' },
				{ label: 'Pi', icon: 'pi', value: 'pi' }
			],
			misc: [
				{ label: 'Star', icon: 'star', value: 'star' },
				{ label: 'Smile', icon: 'smile', value: 'smile' },
				{ label: 'Heart', icon: 'heart', value: 'heart' }
			],
			music: [
				{ label: 'Music', icon: 'music', value: 'music' },
				{ label: 'Audio', icon: 'audio-lines', value: 'audio' }
			],
			object: [
				{ label: 'Home', icon: 'house', value: 'house' },
				{ label: 'Camera', icon: 'camera', value: 'camera' },
				{ label: 'Flag', icon: 'flag', value: 'flag' }
			],
			symbol: [
				{ label: 'Link', icon: 'link', value: 'link' },
				{ label: 'Tag', icon: 'tag', value: 'tag' },
				{ label: 'Pin', icon: 'map-pin', value: 'pin' }
			]
		};

		const renderShapes = (category: string) => {
			gridEl.empty();
			(libraries[category] ?? libraries.basic).forEach((shape) => {
				const shapeButton = this.createIconButton(gridEl, shape.label, shape.icon);
				shapeButton.addEventListener('click', () => {
					this.insertLibraryShape(shape.value);
					groupEl.removeClass('is-open');
				});
			});
			categoryEl.querySelectorAll('.svg-edit-shape-category').forEach((categoryButton) => {
				categoryButton.toggleClass('is-active', (categoryButton as HTMLElement).dataset.category === category);
			});
		};

		Object.keys(libraries).forEach((category, index) => {
			const categoryButton = categoryEl.createEl('button', {
				cls: index === 0 ? 'svg-edit-shape-category is-active' : 'svg-edit-shape-category',
				text: category,
				attr: { type: 'button' }
			});
			categoryButton.dataset.category = category;
			categoryButton.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				renderShapes(category);
			});
		});
		renderShapes('basic');
	}

	private addToolButton(parentEl: HTMLElement, label: string, icon: string, mode: string, id?: string): HTMLButtonElement {
		const button = this.createIconButton(parentEl, label, icon, id);
		button.dataset.mode = mode;
		button.addEventListener('click', () => this.setMode(mode));
		return button;
	}

	private addActionButton(parentEl: HTMLElement, label: string, icon: string, callback: () => void, id?: string): void {
		const button = this.createIconButton(parentEl, label, icon, id);
		button.addEventListener('click', callback);
	}

	private createIconButton(parentEl: HTMLElement, label: string, icon: string, id?: string): HTMLButtonElement {
		const button = parentEl.createEl('button', {
			cls: 'svg-edit-icon-button',
			attr: {
				type: 'button',
				title: label,
				'aria-label': label
			}
		});
		if (id) {
			button.id = id;
		}
		setIcon(button, icon);
		return button;
	}

	private addColorInput(parentEl: HTMLElement, label: string, initialValue: string, onChange: (value: string) => void): void {
		const wrapper = parentEl.createDiv({ cls: 'svg-edit-control svg-edit-color-control' });
		wrapper.createSpan({ text: label });
		const input = wrapper.createEl('input', {
			attr: {
				type: 'color',
				value: initialValue,
				title: label,
				'aria-label': label
			}
		});
		input.addEventListener('input', () => onChange(input.value));
	}

	private addNumberInput(
		parentEl: HTMLElement,
		label: string,
		initialValue: number,
		min: number,
		max: number,
		step: number,
		onChange: (value: number) => void
	): void {
		const wrapper = parentEl.createDiv({ cls: 'svg-edit-control svg-edit-number-control' });
		wrapper.createSpan({ text: label });
		const input = wrapper.createEl('input', {
			attr: {
				type: 'number',
				min: String(min),
				max: String(max),
				step: String(step),
				value: String(initialValue),
				title: label,
				'aria-label': label
			}
		});
		input.addEventListener('input', () => {
			const value = Number(input.value);
			if (Number.isFinite(value)) {
				onChange(value);
			}
		});
	}

	private buildElementContextPanels(contextEl: HTMLElement): void {
		const rectPanel = this.addElementContextPanel(contextEl, 'rect');
		this.addElementAttributeInput(rectPanel, 'W', 'width', 1, 10000, 1);
		this.addElementAttributeInput(rectPanel, 'H', 'height', 1, 10000, 1);
		this.addElementAttributeInput(rectPanel, 'Rx', 'rx', 0, 1000, 1);

		const imagePanel = this.addElementContextPanel(contextEl, 'image');
		this.addElementAttributeInput(imagePanel, 'W', 'width', 1, 10000, 1);
		this.addElementAttributeInput(imagePanel, 'H', 'height', 1, 10000, 1);
		this.addActionButton(imagePanel, 'Image URL', 'image-up', () => this.setSelectedImageUrl());

		const circlePanel = this.addElementContextPanel(contextEl, 'circle');
		this.addElementAttributeInput(circlePanel, 'Cx', 'cx', -10000, 10000, 1);
		this.addElementAttributeInput(circlePanel, 'Cy', 'cy', -10000, 10000, 1);
		this.addElementAttributeInput(circlePanel, 'R', 'r', 1, 10000, 1);

		const ellipsePanel = this.addElementContextPanel(contextEl, 'ellipse');
		this.addElementAttributeInput(ellipsePanel, 'Cx', 'cx', -10000, 10000, 1);
		this.addElementAttributeInput(ellipsePanel, 'Cy', 'cy', -10000, 10000, 1);
		this.addElementAttributeInput(ellipsePanel, 'Rx', 'rx', 1, 10000, 1);
		this.addElementAttributeInput(ellipsePanel, 'Ry', 'ry', 1, 10000, 1);

		const linePanel = this.addElementContextPanel(contextEl, 'line');
		this.addElementAttributeInput(linePanel, 'X1', 'x1', -10000, 10000, 1);
		this.addElementAttributeInput(linePanel, 'Y1', 'y1', -10000, 10000, 1);
		this.addElementAttributeInput(linePanel, 'X2', 'x2', -10000, 10000, 1);
		this.addElementAttributeInput(linePanel, 'Y2', 'y2', -10000, 10000, 1);
	}

	private addElementContextPanel(parentEl: HTMLElement, elementName: string): HTMLElement {
		const panel = this.addPanel(parentEl, `${elementName}_panel`, 'svg-edit-context-panel svg-edit-element-context-panel');
		this.elementContextPanels.set(elementName, panel);
		return panel;
	}

	private addElementAttributeInput(
		parentEl: HTMLElement,
		label: string,
		attribute: string,
		min: number,
		max: number,
		step: number
	): void {
		const wrapper = parentEl.createDiv({ cls: 'svg-edit-control svg-edit-number-control' });
		wrapper.createSpan({ text: label });
		const input = wrapper.createEl('input', {
			attr: {
				type: 'number',
				min: String(min),
				max: String(max),
				step: String(step),
				title: label,
				'aria-label': label
			}
		});
		input.addEventListener('input', () => {
			const value = Number(input.value);
			if (!Number.isFinite(value)) {
				return;
			}
			this.changeSelectedNumericAttribute(attribute, value);
		});
		this.elementAttributeInputs.push({ panel: parentEl, attribute, input });
	}

	private buildPathNodePanel(contextEl: HTMLElement): void {
		const panel = this.addPanel(contextEl, 'path_node_panel', 'svg-edit-context-panel');
		this.pathNodePanelEl = panel;
		this.addActionButton(panel, 'Link Control Points', 'link-2', () => this.togglePathControlPointLink());
		this.addPathNodeInput(panel, 'X', 'x');
		this.addPathNodeInput(panel, 'Y', 'y');
		this.pathSegmentSelectEl = this.addSelectInput(panel, 'Segment', [
			{ label: 'Straight', value: '4' },
			{ label: 'Curve', value: '6' }
		], (value) => this.changePathSegmentType(Number(value)));
		this.addActionButton(panel, 'Clone Node', 'copy-plus', () => this.clonePathNode());
		this.addActionButton(panel, 'Delete Node', 'trash-2', () => this.deletePathNode());
		this.addActionButton(panel, 'Open/Close Sub-path', 'git-commit-horizontal', () => this.openCloseSubPath());
		this.addActionButton(panel, 'Add Sub-path', 'plus', () => this.toggleAddSubPath());
	}

	private buildMarkerPanel(contextEl: HTMLElement): void {
		const panel = this.addPanel(contextEl, 'marker_panel', 'svg-edit-context-panel');
		this.markerPanelEl = panel;
		(['start', 'mid', 'end'] as MarkerPosition[]).forEach((position) => {
			const select = this.addSelectInput(panel, position, [
				{ label: 'None', value: 'nomarker' },
				{ label: 'Left arrow', value: 'leftarrow' },
				{ label: 'Right arrow', value: 'rightarrow' },
				{ label: 'Box', value: 'box' },
				{ label: 'Circle', value: 'mcircle' },
				{ label: 'Left arrow outline', value: 'leftarrow_o' },
				{ label: 'Right arrow outline', value: 'rightarrow_o' },
				{ label: 'Box outline', value: 'box_o' },
				{ label: 'Circle outline', value: 'mcircle_o' }
			], (value) => this.setMarker(position, value as MarkerType));
			this.markerSelects.set(position, select);
		});
	}

	private buildPolystarPanels(contextEl: HTMLElement): void {
		const starPanel = this.addPanel(contextEl, 'star_panel', 'svg-edit-context-panel');
		this.starPanelEl = starPanel;
		this.addPolystarInput(starPanel, 'Points', 'point', 1, 64, 1, (value) => this.changeStarPoints(value));
		this.addPolystarInput(starPanel, 'Pointiness', 'starRadiusMultiplier', 1, 20, 0.5, (value) => this.changePolystarAttribute('starRadiusMultiplier', value));
		this.addPolystarInput(starPanel, 'Shift', 'radialshift', -360, 360, 1, (value) => this.changePolystarAttribute('radialshift', value));

		const polygonPanel = this.addPanel(contextEl, 'polygon_panel', 'svg-edit-context-panel');
		this.polygonPanelEl = polygonPanel;
		this.addPolystarInput(polygonPanel, 'Sides', 'sides', 3, 64, 1, (value) => this.changePolygonSides(value));
	}

	private addPolystarInput(
		parentEl: HTMLElement,
		label: string,
		attribute: string,
		min: number,
		max: number,
		step: number,
		onChange: (value: number) => void
	): void {
		const wrapper = parentEl.createDiv({ cls: 'svg-edit-control svg-edit-number-control' });
		wrapper.createSpan({ text: label });
		const input = wrapper.createEl('input', {
			attr: {
				type: 'number',
				min: String(min),
				max: String(max),
				step: String(step),
				title: label,
				'aria-label': label
			}
		});
		input.addEventListener('input', () => {
			const value = Number(input.value);
			if (Number.isFinite(value)) {
				onChange(value);
			}
		});
		this.polystarInputs.set(attribute, input);
	}

	private addPathNodeInput(parentEl: HTMLElement, label: string, axis: 'x' | 'y'): void {
		const wrapper = parentEl.createDiv({ cls: 'svg-edit-control svg-edit-number-control' });
		wrapper.createSpan({ text: label });
		const input = wrapper.createEl('input', {
			attr: {
				type: 'number',
				step: '1',
				title: `Path node ${label}`,
				'aria-label': `Path node ${label}`
			}
		});
		input.addEventListener('input', () => {
			const value = Number(input.value);
			if (!Number.isFinite(value)) {
				return;
			}
			this.movePathNode(axis, value);
		});
		this.pathNodeInputs.set(axis, input);
	}

	private addSelectInput(
		parentEl: HTMLElement,
		label: string,
		options: Array<{ label: string; value: string }>,
		onChange: (value: string) => void
	): HTMLSelectElement {
		const wrapper = parentEl.createDiv({ cls: 'svg-edit-control svg-edit-select-control' });
		wrapper.createSpan({ text: label });
		const select = wrapper.createEl('select', {
			attr: {
				title: label,
				'aria-label': label
			}
		});
		options.forEach((option) => {
			select.createEl('option', {
				text: option.label,
				value: option.value
			});
		});
		select.addEventListener('change', () => onChange(select.value));
		return select;
	}

	private toggleLayerPanel(force?: boolean): void {
		this.layerPanelVisible = force ?? !this.layerPanelVisible;
		this.layerPanelEl?.toggleClass('is-visible', this.layerPanelVisible);
		this.bodyEl?.toggleClass('has-layer-panel', this.layerPanelVisible);
		this.refreshLayerPanel();
		this.setStatus(this.layerPanelVisible ? 'Layer view on' : 'Layer view off');
	}

	private refreshLayerPanel(): void {
		if (!this.layerListEl || !this.canvas) {
			return;
		}

		this.layerListEl.empty();
		const layers = this.getLayerInfos().slice().reverse();
		if (!layers.length) {
			this.layerListEl.createDiv({ cls: 'svg-edit-layer-empty', text: 'No layers' });
			return;
		}

		layers.forEach((layer) => {
			const rowEl = this.layerListEl?.createEl('button', {
				cls: 'svg-edit-layer-row',
				attr: {
					type: 'button',
					title: `Select ${layer.name}`,
					'aria-label': `Select ${layer.name}`
				}
			});
			if (!rowEl) {
				return;
			}
			rowEl.toggleClass('is-current', layer.current);
			rowEl.addEventListener('click', () => {
				this.canvas?.setCurrentLayer(layer.name);
				this.refreshLayerPanel();
				this.setStatus(`Current layer: ${layer.name}`);
			});

			const visibilityButton = rowEl.createEl('span', { cls: 'svg-edit-layer-visibility' });
			setIcon(visibilityButton, layer.visible ? 'eye' : 'eye-off');
			const nameEl = rowEl.createSpan({ cls: 'svg-edit-layer-name', text: layer.name });
			if (!layer.visible) {
				nameEl.addClass('is-muted');
			}
			const toggleButton = rowEl.createEl('span', { cls: 'svg-edit-layer-toggle', attr: { title: 'Toggle visibility' } });
			setIcon(toggleButton, 'circle-dot');
			toggleButton.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				this.canvas?.setLayerVisibility(layer.name, !layer.visible);
				this.markDirty('Layer visibility changed');
				this.refreshLayerPanel();
			});
		});
	}

	private getLayerInfos(): LayerInfo[] {
		if (!this.canvas) {
			return [];
		}

		const drawing = this.canvas.getCurrentDrawing();
		const currentName = this.canvas.getCurrentLayerName();
		const layers: Array<{ getName(): string; isVisible(): boolean }> = drawing.all_layers ?? [];
		return layers.map((layer, index) => {
			const name = layer.getName();
			return {
				name,
				index,
				visible: layer.isVisible(),
				current: name === currentName
			};
		});
	}

	private currentLayerInfo(): LayerInfo | null {
		return this.getLayerInfos().find((layer) => layer.current) ?? null;
	}

	private createLayer(): void {
		const fallback = `Layer ${this.getLayerInfos().length + 1}`;
		const name = window.prompt('Layer name', fallback);
		if (!name || !this.canvas) {
			return;
		}
		this.canvas.createLayer(name.trim());
		this.markDirty('Layer created');
		this.refreshLayerPanel();
		this.toggleLayerPanel(true);
	}

	private renameLayer(): void {
		const current = this.currentLayerInfo();
		const name = window.prompt('Layer name', current?.name ?? '');
		if (!name || !this.canvas) {
			return;
		}
		this.canvas.renameCurrentLayer(name.trim());
		this.markDirty('Layer renamed');
		this.refreshLayerPanel();
	}

	private cloneLayer(): void {
		const current = this.currentLayerInfo();
		const name = window.prompt('Duplicate layer name', current ? `${current.name} copy` : 'Layer copy');
		if (!name || !this.canvas) {
			return;
		}
		this.canvas.cloneLayer(name.trim());
		this.markDirty('Layer duplicated');
		this.refreshLayerPanel();
	}

	private deleteLayer(): void {
		if (!this.canvas || this.getLayerInfos().length <= 1) {
			new Notice('The document must keep at least one layer.');
			return;
		}
		if (!window.confirm('Delete the current layer?')) {
			return;
		}
		this.canvas.deleteCurrentLayer();
		this.markDirty('Layer deleted');
		this.refreshLayerPanel();
	}

	private moveLayer(direction: 1 | -1): void {
		const current = this.currentLayerInfo();
		if (!current || !this.canvas) {
			return;
		}
		const nextIndex = current.index + direction;
		if (nextIndex < 0 || nextIndex >= this.getLayerInfos().length) {
			return;
		}
		this.canvas.setCurrentLayerPosition(nextIndex);
		this.markDirty('Layer moved');
		this.refreshLayerPanel();
	}

	private mergeLayer(): void {
		if (!this.canvas) {
			return;
		}
		this.canvas.mergeLayer();
		this.markDirty('Layer merged');
		this.refreshLayerPanel();
	}

	private mergeAllLayers(): void {
		if (!this.canvas) {
			return;
		}
		this.canvas.mergeAllLayers();
		this.markDirty('Layers merged');
		this.refreshLayerPanel();
	}

	private moveSelectionToCurrentLayer(): void {
		const current = this.currentLayerInfo();
		if (!current || !this.canvas) {
			return;
		}
		this.canvas.moveSelectedToLayer(current.name);
		this.markDirty('Selection moved to layer');
		this.refreshLayerPanel();
	}

	private connectCanvasEvents(): void {
		if (!this.canvas || !this.textInputEl) {
			return;
		}

		this.canvas.textActions.setInputElem(this.textInputEl);
		this.textInputEl.addEventListener('input', () => {
			this.canvas?.setTextContent(this.textInputEl?.value ?? '');
			this.markDirty('Text changed');
		});
		this.canvas.bind('changed', () => {
			this.markDirty('Changed');
			this.refreshLayerPanel();
			this.updateContextPanels();
			this.updateCanvasViewport();
		});
		this.canvas.bind('selected', () => this.updateContextPanels());
		this.canvas.bind('zoomed', (_window: Window, bbox: SvgCanvasZoomBox) => this.handleCanvasZoomed(bbox));
	}

	private connectWorkareaNavigation(): void {
		if (!this.canvasHostEl) {
			return;
		}

		this.canvasHostEl.addEventListener('wheel', this.workareaWheelHandler, { capture: true, passive: false });
		this.canvasHostEl.addEventListener('mousedown', this.workareaMouseDownHandler, true);
		this.canvasHostEl.addEventListener('mouseup', this.workareaMouseUpHandler, true);
		this.canvasHostEl.addEventListener('contextmenu', this.workareaContextMenuHandler, true);
	}

	private loadSvg(source: string): void {
		if (!this.canvas) {
			return;
		}

		try {
			const loaded = this.canvas.setSvgString(source, true);
			if (!loaded) {
				throw new Error('SVG could not be loaded.');
			}
			this.dirty = false;
			this.updateRulers();
		} catch (error) {
			console.error(error);
			this.canvas.setSvgString(this.fallbackSvg, true);
			this.markDirty('Invalid SVG replaced');
			new Notice('SVG could not be read. A new document was opened.');
			this.updateRulers();
		}
	}

	private setMode(mode: string): void {
		if (!this.canvas) {
			return;
		}

		this.canvas.setMode(mode);
		this.contentEl.querySelectorAll<HTMLButtonElement>('.svg-edit-icon-button[data-mode]').forEach((button) => {
			button.toggleClass('is-active', button.dataset.mode === mode);
		});
		this.canvasHostEl?.toggleClass('is-zoom-mode', mode === 'zoom');
		this.canvasHostEl?.toggleClass('is-pan-mode', mode === 'ext-panning');
		this.updateContextPanels(mode);
		this.setStatus(modeLabel(mode));
	}

	private updateContextPanels(mode = this.canvas?.getMode()): void {
		const selectedElements = this.canvas?.getSelectedElements().filter(Boolean) ?? [];
		const hasSelection = selectedElements.length > 0;
		const selectedText = this.getSelectedTextElements();
		const showTextPanel = mode === 'text' || selectedText.length > 0;
		this.selectedPanelEl?.toggleClass('is-visible', hasSelection);
		this.contextRowEl?.toggleClass('is-visible', hasSelection);
		this.updateElementContextPanels(selectedElements);
		this.updatePathNodePanel(mode);
		this.updateMarkerPanel(selectedElements);
		this.updatePolystarPanels(selectedElements);
		this.textPanelEl?.toggleClass('is-visible', showTextPanel);
		this.textRowEl?.toggleClass('is-visible', showTextPanel);
	}

	private updateElementContextPanels(selectedElements: Element[]): void {
		this.elementContextPanels.forEach((panel) => panel.removeClass('is-visible'));
		if (selectedElements.length !== 1) {
			return;
		}

		const element = selectedElements[0];
		const elementName = element.tagName.toLowerCase();
		const panel = this.elementContextPanels.get(elementName);
		if (!panel) {
			return;
		}

		panel.addClass('is-visible');
		this.elementAttributeInputs.forEach(({ panel: inputPanel, attribute, input }) => {
			if (inputPanel !== panel) {
				return;
			}
			input.value = element.getAttribute(attribute) ?? '0';
		});
	}

	private updatePolystarPanels(selectedElements: Element[]): void {
		const element = selectedElements.length === 1 ? selectedElements[0] : null;
		const shape = element?.getAttribute('shape');
		const isStar = element?.tagName === 'polygon' && shape === 'star';
		const isPolygon = element?.tagName === 'polygon' && shape === 'regularPoly';
		this.starPanelEl?.toggleClass('is-visible', isStar);
		this.polygonPanelEl?.toggleClass('is-visible', isPolygon);
		if (!element) {
			return;
		}

		if (isStar) {
			this.setPolystarInputValue('point', element.getAttribute('point') ?? '5');
			this.setPolystarInputValue('starRadiusMultiplier', element.getAttribute('starRadiusMultiplier') ?? '2.5');
			this.setPolystarInputValue('radialshift', element.getAttribute('radialshift') ?? '0');
		}
		if (isPolygon) {
			this.setPolystarInputValue('sides', element.getAttribute('sides') ?? '5');
		}
	}

	private setPolystarInputValue(attribute: string, value: string): void {
		const input = this.polystarInputs.get(attribute);
		if (input) {
			input.value = value;
		}
	}

	private updatePathNodePanel(mode = this.canvas?.getMode()): void {
		const showPathNodePanel = mode === 'pathedit' || this.addSubpathActive;
		this.pathNodePanelEl?.toggleClass('is-visible', showPathNodePanel);
		if (!this.canvas || !showPathNodePanel) {
			return;
		}

		const point = this.canvas.pathActions.getNodePoint() as { x: number; y: number; type?: number } | null;
		if (!point) {
			return;
		}

		const xInput = this.pathNodeInputs.get('x');
		const yInput = this.pathNodeInputs.get('y');
		if (xInput) {
			xInput.value = String(point.x);
		}
		if (yInput) {
			yInput.value = String(point.y);
		}
		if (this.pathSegmentSelectEl) {
			const segmentType = point.type ? String(point.type) : '4';
			this.pathSegmentSelectEl.value = segmentType;
			this.pathSegmentSelectEl.disabled = !point.type;
		}
	}

	private updateMarkerPanel(selectedElements: Element[]): void {
		const element = selectedElements.length === 1 ? selectedElements[0] : null;
		const supportsMarkers = Boolean(element && ['line', 'path', 'polyline', 'polygon'].includes(element.tagName));
		this.markerPanelEl?.toggleClass('is-visible', supportsMarkers);
		if (!element || !supportsMarkers) {
			return;
		}

		(['start', 'mid', 'end'] as MarkerPosition[]).forEach((position) => {
			const select = this.markerSelects.get(position);
			if (!select) {
				return;
			}
			const marker = this.getLinkedMarker(element, `marker-${position}`);
			select.value = marker?.getAttribute('se_type') as MarkerType ?? 'nomarker';
		});
	}

	private deleteSelection(): void {
		this.canvas?.deleteSelectedElements();
		this.markDirty('Selection deleted');
	}

	private copySelection(): void {
		this.canvas?.copySelectedElements();
		this.setStatus('Selection copied');
	}

	private cutSelection(): void {
		this.canvas?.cutSelectedElements();
		this.markDirty('Selection cut');
	}

	private pasteSelection(): void {
		this.canvas?.pasteElements();
		this.markDirty('Pasted');
	}

	private duplicateSelection(): void {
		this.withDirtyAction('Duplicated', () => this.canvas?.cloneSelectedElements(20, 20));
	}

	private withDirtyAction(message: string, action: () => void): void {
		action();
		this.markDirty(message);
	}

	private toggleTextStyle(style: 'bold' | 'italic'): void {
		const selectedText = this.getSelectedTextElements();
		if (!selectedText.length) {
			return;
		}

		if (style === 'bold') {
			const enabled = selectedText.every((element) => element.getAttribute('font-weight') === 'bold');
			this.canvas?.setBold(!enabled);
			return;
		}

		const enabled = selectedText.every((element) => element.getAttribute('font-style') === 'italic');
		this.canvas?.setItalic(!enabled);
	}

	private toggleTextDecoration(decoration: string): void {
		const selectedText = this.getSelectedTextElements();
		if (!selectedText.length || !this.canvas) {
			return;
		}

		if (this.canvas.hasTextDecoration(decoration)) {
			this.canvas.removeTextDecoration(decoration);
			return;
		}

		this.canvas.addTextDecoration(decoration);
	}

	private getSelectedTextElements(): Element[] {
		return this.canvas?.getSelectedElements().filter((element) => element?.tagName === 'text') ?? [];
	}

	private convertSelectionToPath(): void {
		const selectedElements = this.canvas?.getSelectedElements().filter(Boolean) ?? [];
		selectedElements.forEach((element) => this.canvas?.convertToPath(element));
		this.markDirty('Converted to path');
	}

	private align(type: string): void {
		const relativeTo = (this.contentEl.dataset.alignRelativeTo ?? 'selected') as AlignRelativeTo;
		this.canvas?.alignSelectedElements(type, relativeTo);
		this.markDirty('Alignment changed');
	}

	private createOrEditLink(): void {
		if (!this.canvas) {
			return;
		}

		const url = window.prompt('Link URL', 'https://');
		if (!url) {
			return;
		}

		this.canvas.makeHyperlink(url.trim());
		this.markDirty('Link created');
	}

	private setSelectedImageUrl(): void {
		if (!this.canvas) {
			return;
		}

		const url = window.prompt('Image URL');
		if (!url) {
			return;
		}

		this.canvas.setImageURL(url.trim());
		this.markDirty('Image URL changed');
	}

	private setSelectedAttribute(attribute: string, label: string): void {
		if (!this.canvas) {
			return;
		}

		const selected = this.canvas.getSelectedElements().filter(Boolean);
		if (!selected.length) {
			new Notice('Select an element first.');
			return;
		}

		const current = selected[0].getAttribute(attribute) ?? '';
		const value = window.prompt(label, current);
		if (value === null) {
			return;
		}

		this.canvas.changeSelectedAttribute(attribute, value, selected);
		this.markDirty(`${label} changed`);
	}

	private changeSelectedNumericAttribute(attribute: string, value: number): void {
		if (!this.canvas) {
			return;
		}

		const selected = this.canvas.getSelectedElements().filter(Boolean);
		if (!selected.length) {
			return;
		}

		this.canvas.changeSelectedAttribute(attribute, value, selected);
		this.markDirty(`${attribute} changed`);
		this.updateContextPanels();
	}

	private togglePathControlPointLink(): void {
		if (!this.canvas) {
			return;
		}

		const linked = !this.canvasHostEl?.hasClass('is-path-control-linked');
		this.canvas.pathActions.linkControlPoints(linked);
		this.canvasHostEl?.toggleClass('is-path-control-linked', linked);
		this.setStatus(linked ? 'Path control points linked' : 'Path control points unlinked');
	}

	private movePathNode(axis: 'x' | 'y', value: number): void {
		if (!this.canvas) {
			return;
		}

		this.canvas.changeSelectedAttribute(axis, value);
		this.markDirty(`Path node ${axis.toUpperCase()} changed`);
		this.updateContextPanels();
	}

	private changePathSegmentType(type: number): void {
		if (!this.canvas || !Number.isFinite(type)) {
			return;
		}

		this.canvas.pathActions.setSegType(type);
		this.markDirty('Path segment changed');
		this.updateContextPanels();
	}

	private clonePathNode(): void {
		if (!this.canvas?.pathActions.getNodePoint()) {
			return;
		}

		this.canvas.pathActions.clonePathNode();
		this.markDirty('Path node cloned');
		this.updateContextPanels();
	}

	private deletePathNode(): void {
		if (!this.canvas?.pathActions.getNodePoint()) {
			return;
		}

		this.canvas.pathActions.deletePathNode();
		this.markDirty('Path node deleted');
		this.updateContextPanels();
	}

	private openCloseSubPath(): void {
		if (!this.canvas) {
			return;
		}

		this.canvas.pathActions.opencloseSubPath();
		this.markDirty('Sub-path changed');
		this.updateContextPanels();
	}

	private toggleAddSubPath(): void {
		if (!this.canvas) {
			return;
		}

		this.addSubpathActive = !this.addSubpathActive;
		this.canvas.pathActions.addSubPath(this.addSubpathActive);
		this.markDirty(this.addSubpathActive ? 'Add sub-path mode' : 'Path edit mode');
		this.updateContextPanels();
	}

	private setMarker(position: MarkerPosition, markerType: MarkerType): void {
		if (!this.canvas) {
			return;
		}

		const selected = this.canvas.getSelectedElements().filter(Boolean);
		const element = selected[0];
		if (!element || !['line', 'path', 'polyline', 'polygon'].includes(element.tagName)) {
			return;
		}

		const markerAttribute = `marker-${position}`;
		this.getLinkedMarker(element, markerAttribute)?.remove();
		element.removeAttribute(markerAttribute);

		if (markerType !== 'nomarker') {
			const markerId = `mkr_${position}_${element.id || Date.now()}`;
			this.createMarker(markerId, markerType, element);
			this.canvas.changeSelectedAttribute(markerAttribute, `url(#${markerId})`, [element]);
		} else {
			this.canvas.call('changed', selected);
		}

		this.markDirty('Marker changed');
		this.updateContextPanels();
	}

	private getLinkedMarker(element: Element, attribute: string): Element | null {
		const value = element.getAttribute(attribute);
		const markerId = value?.match(/\(#([^)]+)\)/)?.[1];
		if (!markerId || !this.canvas) {
			return null;
		}

		return this.canvas.getSvgContent().querySelector(`#${CSS.escape(markerId)}`);
	}

	private createMarker(id: string, markerType: MarkerType, targetElement: Element): SVGMarkerElement {
		const svgNS = 'http://www.w3.org/2000/svg';
		const defs = this.ensureDefsElement();
		const marker = document.createElementNS(svgNS, 'marker');
		marker.setAttribute('id', id);
		marker.setAttribute('markerUnits', 'strokeWidth');
		marker.setAttribute('orient', 'auto');
		marker.setAttribute('style', 'pointer-events:none');
		marker.setAttribute('se_type', markerType);
		marker.setAttribute('viewBox', '0 0 100 100');
		marker.setAttribute('markerWidth', '5');
		marker.setAttribute('markerHeight', '5');
		marker.setAttribute('refX', '50');
		marker.setAttribute('refY', '50');

		const shape = this.createMarkerShape(markerType);
		const color = targetElement.getAttribute('stroke') || '#000000';
		shape.setAttribute('fill', markerType.endsWith('_o') ? 'none' : color);
		shape.setAttribute('stroke', color);
		shape.setAttribute('stroke-width', '10');
		marker.append(shape);
		defs.append(marker);
		return marker;
	}

	private createMarkerShape(markerType: MarkerType): SVGElement {
		const svgNS = 'http://www.w3.org/2000/svg';
		const baseType = markerType.replace(/_o$/, '') as MarkerType;
		if (baseType === 'mcircle') {
			const circle = document.createElementNS(svgNS, 'circle');
			circle.setAttribute('r', '30');
			circle.setAttribute('cx', '50');
			circle.setAttribute('cy', '50');
			return circle;
		}

		const path = document.createElementNS(svgNS, 'path');
		const pathDataByType: Partial<Record<MarkerType, string>> = {
			leftarrow: 'M0,50 L100,90 L70,50 L100,10 Z',
			rightarrow: 'M100,50 L0,90 L30,50 L0,10 Z',
			box: 'M20,20 L20,80 L80,80 L80,20 Z'
		};
		path.setAttribute('d', pathDataByType[baseType] ?? pathDataByType.rightarrow ?? '');
		return path;
	}

	private ensureDefsElement(): SVGDefsElement {
		const svgNS = 'http://www.w3.org/2000/svg';
		const svgContent = this.canvas?.getSvgContent();
		const existing = svgContent?.querySelector('defs');
		if (existing instanceof SVGDefsElement) {
			return existing;
		}

		const defs = document.createElementNS(svgNS, 'defs');
		svgContent?.prepend(defs);
		return defs;
	}

	private changeStarPoints(points: number): void {
		this.changePolystarAttribute('point', Math.max(1, Math.round(points)));
	}

	private changePolygonSides(sides: number): void {
		this.changePolystarAttribute('sides', Math.max(3, Math.round(sides)));
	}

	private changePolystarAttribute(attribute: string, value: number): void {
		if (!this.canvas) {
			return;
		}

		const selected = this.canvas.getSelectedElements().filter((element) => element?.tagName === 'polygon');
		if (!selected.length) {
			return;
		}

		this.canvas.changeSelectedAttribute(attribute, value, selected);
		selected.forEach((element) => this.rebuildPolystarPoints(element));
		this.canvas.call('changed', selected);
		this.markDirty('Polygon shape changed');
		this.updateContextPanels();
	}

	private rebuildPolystarPoints(element: Element): void {
		const shape = element.getAttribute('shape');
		if (shape !== 'star' && shape !== 'regularPoly') {
			return;
		}

		const center = this.getPolygonCenter(element);
		const outerRadius = Number(element.getAttribute('r')) || this.getPolygonRadius(element, center) || 40;
		if (shape === 'star') {
			const pointCount = Math.max(1, Number(element.getAttribute('point')) || 5);
			const multiplier = Math.max(1, Number(element.getAttribute('starRadiusMultiplier')) || 2.5);
			const radialShift = Number(element.getAttribute('radialshift')) || 0;
			const innerRadius = outerRadius / multiplier;
			element.setAttribute('points', this.buildStarPoints(center.x, center.y, outerRadius, innerRadius, pointCount, radialShift));
			return;
		}

		const sides = Math.max(3, Number(element.getAttribute('sides')) || 5);
		element.setAttribute('points', this.buildRegularPolygonPoints(center.x, center.y, outerRadius, sides));
	}

	private getPolygonCenter(element: Element): { x: number; y: number } {
		const cx = Number(element.getAttribute('cx'));
		const cy = Number(element.getAttribute('cy'));
		if (Number.isFinite(cx) && Number.isFinite(cy)) {
			return { x: cx, y: cy };
		}

		const points = this.parsePoints(element.getAttribute('points') ?? '');
		if (!points.length) {
			return { x: this.canvasWidth / 2, y: this.canvasHeight / 2 };
		}

		const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
		return { x: sum.x / points.length, y: sum.y / points.length };
	}

	private getPolygonRadius(element: Element, center: { x: number; y: number }): number {
		return this.parsePoints(element.getAttribute('points') ?? '').reduce((radius, point) => {
			const distance = Math.hypot(point.x - center.x, point.y - center.y);
			return Math.max(radius, distance);
		}, 0);
	}

	private parsePoints(pointsAttribute: string): Array<{ x: number; y: number }> {
		return pointsAttribute
			.trim()
			.split(/\s+/)
			.map((pair) => pair.split(',').map(Number))
			.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
			.map(([x, y]) => ({ x, y }));
	}

	private buildRegularPolygonPoints(cx: number, cy: number, radius: number, sides: number): string {
		return Array.from({ length: sides }, (_unused, index) => {
			const angle = (2 * Math.PI * index) / sides - Math.PI / 2;
			return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
		}).join(' ');
	}

	private buildStarPoints(cx: number, cy: number, outerRadius: number, innerRadius: number, points: number, radialShift: number): string {
		const vertices: string[] = [];
		for (let index = 0; index < points; index += 1) {
			const outerAngle = (2 * Math.PI * index) / points - Math.PI / 2;
			const innerAngle = outerAngle + Math.PI / points + radialShift;
			vertices.push(`${cx + outerRadius * Math.cos(outerAngle)},${cy + outerRadius * Math.sin(outerAngle)}`);
			vertices.push(`${cx + innerRadius * Math.cos(innerAngle)},${cy + innerRadius * Math.sin(innerAngle)}`);
		}
		return vertices.join(' ');
	}

	private insertLibraryShape(shape: string): void {
		if (!this.canvas) {
			return;
		}

		const x = Math.round(this.canvasWidth / 2 - 40);
		const y = Math.round(this.canvasHeight / 2 - 40);
		const common = {
			fill: '#f2c94c',
			stroke: '#111111',
			'stroke-width': 2
		};
			const shapes: Record<string, { element: string; attr: Record<string, string | number>; children?: string[] }> = {
				rectangle: {
					element: 'rect',
					attr: { ...common, x, y, width: 82, height: 62 }
				},
				circle: {
					element: 'circle',
					attr: { ...common, cx: x + 40, cy: y + 40, r: 36 }
				},
				triangle: {
					element: 'polygon',
					attr: { ...common, points: `${x + 40},${y} ${x + 80},${y + 80} ${x},${y + 80}` }
				},
				'right-triangle': {
					element: 'polygon',
					attr: { ...common, points: `${x},${y} ${x + 82},${y + 82} ${x},${y + 82}` }
				},
				diamond: {
					element: 'polygon',
					attr: { ...common, points: `${x + 40},${y} ${x + 80},${y + 40} ${x + 40},${y + 80} ${x},${y + 40}` }
				},
				pentagon: {
					element: 'polygon',
					attr: { ...common, shape: 'regularPoly', sides: 5, cx: x + 40, cy: y + 40, r: 40, points: `${x + 40},${y} ${x + 80},${y + 30} ${x + 66},${y + 78} ${x + 14},${y + 78} ${x},${y + 30}` }
				},
				hexagon: {
					element: 'polygon',
					attr: { ...common, shape: 'regularPoly', sides: 6, cx: x + 40, cy: y + 40, r: 42, points: `${x + 20},${y} ${x + 62},${y} ${x + 84},${y + 40} ${x + 62},${y + 80} ${x + 20},${y + 80} ${x - 2},${y + 40}` }
				},
				star: {
					element: 'polygon',
					attr: { ...common, shape: 'star', point: 5, cx: x + 40, cy: y + 40, r: 40, starRadiusMultiplier: 2.5, radialshift: 0, points: `${x + 40},${y} ${x + 51},${y + 27} ${x + 80},${y + 30} ${x + 58},${y + 49} ${x + 64},${y + 78} ${x + 40},${y + 62} ${x + 16},${y + 78} ${x + 22},${y + 49} ${x},${y + 30} ${x + 29},${y + 27}` }
				},
				arrow: {
					element: 'path',
					attr: { ...common, d: `M${x},${y + 30} H${x + 48} V${y + 8} L${x + 88},${y + 40} L${x + 48},${y + 72} V${y + 50} H${x} Z` }
				},
				'arrow-up': {
					element: 'path',
					attr: { ...common, d: `M${x + 30},${y + 88} V${y + 40} H${x + 8} L${x + 44},${y} L${x + 80},${y + 40} H${x + 58} V${y + 88} Z` }
				},
				'arrow-right': {
					element: 'path',
					attr: { ...common, d: `M${x},${y + 30} H${x + 48} V${y + 8} L${x + 88},${y + 40} L${x + 48},${y + 72} V${y + 50} H${x} Z` }
				},
				'arrow-down': {
					element: 'path',
					attr: { ...common, d: `M${x + 30},${y} V${y + 48} H${x + 8} L${x + 44},${y + 88} L${x + 80},${y + 48} H${x + 58} V${y} Z` }
				},
				'arrow-left': {
					element: 'path',
					attr: { ...common, d: `M${x + 88},${y + 30} H${x + 40} V${y + 8} L${x},${y + 40} L${x + 40},${y + 72} V${y + 50} H${x + 88} Z` }
				},
				heart: {
					element: 'path',
					attr: { ...common, d: `M${x + 40},${y + 72} C${x - 8},${y + 36} ${x + 2},${y} ${x + 30},${y + 12} C${x + 36},${y + 15} ${x + 40},${y + 22} ${x + 40},${y + 22} C${x + 40},${y + 22} ${x + 44},${y + 15} ${x + 50},${y + 12} C${x + 78},${y} ${x + 88},${y + 36} ${x + 40},${y + 72} Z` }
				},
				bubble: {
					element: 'path',
					attr: { ...common, d: `M${x + 8},${y + 8} H${x + 88} V${y + 54} H${x + 48} L${x + 30},${y + 76} V${y + 54} H${x + 8} Z` }
				},
				'round-bubble': {
					element: 'path',
					attr: { ...common, d: `M${x + 12},${y + 10} Q${x + 12},${y} ${x + 22},${y} H${x + 78} Q${x + 88},${y} ${x + 88},${y + 10} V${y + 50} Q${x + 88},${y + 60} ${x + 78},${y + 60} H${x + 50} L${x + 32},${y + 82} V${y + 60} H${x + 22} Q${x + 12},${y + 60} ${x + 12},${y + 50} Z` }
				},
				smile: {
					element: 'path',
					attr: { ...common, d: `M${x + 40},${y} A40,40 0 1 1 ${x + 39.9},${y} M${x + 25},${y + 28} A4,4 0 1 1 ${x + 24.9},${y + 28} M${x + 58},${y + 28} A4,4 0 1 1 ${x + 57.9},${y + 28} M${x + 22},${y + 50} Q${x + 40},${y + 68} ${x + 58},${y + 50}` }
				},
				plus: {
					element: 'path',
					attr: { ...common, d: `M${x + 30},${y} H${x + 54} V${y + 30} H${x + 84} V${y + 54} H${x + 54} V${y + 84} H${x + 30} V${y + 54} H${x} V${y + 30} H${x + 30} Z` }
				},
				minus: {
					element: 'rect',
					attr: { ...common, x, y: y + 32, width: 84, height: 22 }
				},
				pi: {
					element: 'text',
					attr: { ...common, x: x + 12, y: y + 68, 'font-size': 72, 'stroke-width': 0 },
					children: ['π']
				},
				music: {
					element: 'text',
					attr: { ...common, x: x + 12, y: y + 68, 'font-size': 72, 'stroke-width': 0 },
					children: ['♪']
				}
			};

			const spec = shapes[shape] ?? shapes.rectangle;
		if (!spec) {
			return;
		}

		const element = this.canvas.addSVGElementsFromJson(spec);
		this.canvas.selectOnly([element]);
		this.markDirty('Shape inserted');
	}

	private pickColorFromSelection(): void {
		if (!this.canvas) {
			return;
		}

		const selected = this.canvas.getSelectedElements().filter(Boolean);
		const source = selected[0];
		if (!source) {
			new Notice('Select an element to pick its color.');
			return;
		}

		const fill = source.getAttribute('fill');
		const stroke = source.getAttribute('stroke');
		if (fill && fill !== 'none') {
			this.canvas.setColor('fill', fill);
		}
		if (stroke && stroke !== 'none') {
			this.canvas.setColor('stroke', stroke);
		}
		this.setStatus('Color picked from selection');
	}

	private createConnector(): void {
		if (!this.canvas) {
			return;
		}

		const selected = this.canvas.getSelectedElements().filter((element): element is SVGGraphicsElement => element instanceof SVGGraphicsElement);
		if (selected.length < 2) {
			new Notice('Select two shapes to connect.');
			return;
		}

		const [first, second] = selected;
		const firstBox = first.getBBox();
		const secondBox = second.getBBox();
		const line = this.canvas.addSVGElementsFromJson({
			element: 'line',
			attr: {
				x1: firstBox.x + firstBox.width / 2,
				y1: firstBox.y + firstBox.height / 2,
				x2: secondBox.x + secondBox.width / 2,
				y2: secondBox.y + secondBox.height / 2,
				fill: 'none',
				stroke: '#111111',
				'stroke-width': 2
			}
		});
		this.canvas.selectOnly([line]);
		this.markDirty('Connector created');
	}

	private setDocumentTitle(): void {
		if (!this.canvas) {
			return;
		}

		const title = window.prompt('Document title', this.file.basename);
		if (title === null) {
			return;
		}

		this.canvas.setDocumentTitle(title);
		this.markDirty('Document title changed');
	}

	private setBackgroundColor(): void {
		if (!this.canvas) {
			return;
		}

		const color = window.prompt('Background color', '#ffffff');
		if (color === null) {
			return;
		}

		this.canvas.setBackground(color.trim() || 'none');
		this.markDirty('Background changed');
	}

	private async copySvgSource(): Promise<void> {
		if (!this.canvas) {
			return;
		}

		try {
			await navigator.clipboard.writeText(this.canvas.getSvgString());
			this.setStatus('SVG source copied');
			new Notice('SVG source copied to clipboard.');
		} catch (error) {
			console.error(error);
			new Notice('Clipboard access is unavailable. Open Edit Source to copy manually.');
		}
	}

	private resizeCanvas(width: number, height: number): void {
		if (!this.canvas) {
			return;
		}

		this.canvasWidth = width;
		this.canvasHeight = height;
		this.canvas.setResolution(width, height);
		this.updateCanvasViewport({ center: true });
		this.markDirty('Canvas size changed');
	}

	private setZoomValue(value: string): void {
		if (!this.canvas) {
			return;
		}

		if (['canvas', 'selection', 'layer', 'content'].includes(value)) {
			const box = this.canvas.setBBoxZoom(value as 'canvas' | 'selection' | 'layer' | 'content', this.workareaWidth(), this.workareaHeight());
			this.updateCanvasViewport(box ? { centerAt: this.zoomBoxCenter(box.bbox, box.zoom) } : { center: true });
			this.setStatus(`Zoom: ${value}`);
			return;
		}

		this.setZoom(Number(value));
	}

	private setZoom(zoom: number): void {
		if (!this.canvas || !Number.isFinite(zoom) || zoom <= 0) {
			return;
		}

		this.canvas.setCurrentZoom(zoom);
		this.updateCanvasViewport();
		this.setStatus(`Zoom ${Math.round(zoom * 100)}%`);
	}

	private resetZoom(): void {
		if (!this.canvas) {
			return;
		}

		this.canvas.setCurrentZoom(1);
		this.updateCanvasViewport({ center: true });
		this.setStatus('Zoom 100%');
	}

	private zoomAtPoint(zoom: number, clientX: number, clientY: number): void {
		if (!this.canvas || !this.canvasHostEl || !Number.isFinite(zoom) || zoom <= 0) {
			return;
		}

		const rect = this.canvasHostEl.getBoundingClientRect();
		const canvasSize = this.currentCanvasDisplaySize();
		const offsetX = clientX - rect.left;
		const offsetY = clientY - rect.top;
		this.canvas.setCurrentZoom(zoom);
		this.updateCanvasViewport({
			preserve: {
				xRatio: (this.canvasHostEl.scrollLeft + offsetX) / canvasSize.width,
				yRatio: (this.canvasHostEl.scrollTop + offsetY) / canvasSize.height,
				offsetX,
				offsetY
			}
		});
		this.setStatus(`Zoom ${Math.round(zoom * 100)}%`);
	}

	private updateCanvasViewport(options: {
		center?: boolean;
		centerAt?: { x: number; y: number };
		preserve?: { xRatio: number; yRatio: number; offsetX: number; offsetY: number };
	} = {}): void {
		if (!this.canvas || !this.canvasHostEl) {
			return;
		}

		const zoom = this.canvas.getZoom();
		const width = Math.max(this.canvasHostEl.clientWidth, this.canvasWidth * zoom * 3);
		const height = Math.max(this.canvasHostEl.clientHeight, this.canvasHeight * zoom * 3);
		const canvasEl = this.canvasHostEl.querySelector<HTMLElement>('#svgcanvas');
		if (canvasEl) {
			canvasEl.style.width = `${width}px`;
			canvasEl.style.height = `${height}px`;
		}

		this.canvas.updateCanvas(width, height);

		if (options.centerAt) {
			this.canvasHostEl.scrollLeft = options.centerAt.x - this.canvasHostEl.clientWidth / 2;
			this.canvasHostEl.scrollTop = options.centerAt.y - this.canvasHostEl.clientHeight / 2;
		} else if (options.preserve) {
			this.canvasHostEl.scrollLeft = width * options.preserve.xRatio - options.preserve.offsetX;
			this.canvasHostEl.scrollTop = height * options.preserve.yRatio - options.preserve.offsetY;
		} else if (options.center) {
			this.canvasHostEl.scrollLeft = width / 2 - this.canvasHostEl.clientWidth / 2;
			this.canvasHostEl.scrollTop = height / 2 - this.canvasHostEl.clientHeight / 2;
		}

		this.updateRulers();
	}

	private currentCanvasDisplaySize(): { width: number; height: number } {
		const canvasEl = this.canvasHostEl?.querySelector<HTMLElement>('#svgcanvas');
		return {
			width: Math.max(canvasEl?.offsetWidth ?? this.canvasHostEl?.scrollWidth ?? 1, 1),
			height: Math.max(canvasEl?.offsetHeight ?? this.canvasHostEl?.scrollHeight ?? 1, 1)
		};
	}

	private workareaWidth(): number {
		return Math.max((this.canvasHostEl?.clientWidth ?? 0) - 15, 1);
	}

	private workareaHeight(): number {
		return Math.max((this.canvasHostEl?.clientHeight ?? 0) - 15, 1);
	}

	private zoomBoxCenter(box: SvgCanvasZoomBox, zoom: number): { x: number; y: number } {
		return {
			x: (box.x + box.width / 2) * zoom,
			y: (box.y + box.height / 2) * zoom
		};
	}

	private handleCanvasZoomed(box: SvgCanvasZoomBox): void {
		if (!this.canvas || !box) {
			return;
		}

		const zoomInfo = this.canvas.setBBoxZoom(box, this.workareaWidth(), this.workareaHeight());
		if (!zoomInfo) {
			return;
		}

		this.updateCanvasViewport({ centerAt: this.zoomBoxCenter(zoomInfo.bbox, zoomInfo.zoom) });
		if (box.width > 0 && this.canvas.getMode() === 'zoom') {
			this.setMode('select');
		}
		this.setStatus(`Zoom ${Math.round(this.canvas.getZoom() * 100)}%`);
	}

	private handleWorkareaWheel(event: WheelEvent): void {
		if (!this.canvas || !this.canvasHostEl) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		if (event.altKey || event.ctrlKey || event.metaKey) {
			const factor = event.deltaY > 0 ? 0.9 : 1.1;
			this.zoomAtPoint(this.canvas.getZoom() * factor, event.clientX, event.clientY);
			return;
		}

		this.canvasHostEl.scrollLeft += event.shiftKey ? event.deltaY : event.deltaX;
		this.canvasHostEl.scrollTop += event.shiftKey ? 0 : event.deltaY;
	}

	private handleWorkareaMouseDown(event: MouseEvent): void {
		if (!this.canvas || !this.canvasHostEl) {
			return;
		}

		const mode = this.canvas.getMode();
		if (event.button === 1 || mode === 'ext-panning') {
			event.preventDefault();
			event.stopPropagation();
			event.stopImmediatePropagation();
			this.panPointerDown = {
				x: event.clientX,
				y: event.clientY,
				scrollLeft: this.canvasHostEl.scrollLeft,
				scrollTop: this.canvasHostEl.scrollTop,
				previousMode: mode
			};
			this.canvasHostEl.addClass('is-panning');
			return;
		}

		if (mode === 'zoom' && event.button === 0) {
			this.zoomPointerDown = { x: event.clientX, y: event.clientY };
		}
	}

	private handleWorkareaMouseUp(event: MouseEvent): void {
		if (!this.canvas || !this.zoomPointerDown || this.canvas.getMode() !== 'zoom' || event.button !== 0) {
			this.zoomPointerDown = null;
			return;
		}

		const distance = Math.hypot(event.clientX - this.zoomPointerDown.x, event.clientY - this.zoomPointerDown.y);
		this.zoomPointerDown = null;
		if (distance > 4) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
		this.zoomAtPoint(this.canvas.getZoom() * (event.shiftKey ? 0.5 : 2), event.clientX, event.clientY);
	}

	private handleWorkareaContextMenu(event: MouseEvent): void {
		if (!this.canvas || !this.contextMenuEl) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
		this.openContextMenu(event.clientX, event.clientY);
	}

	private openContextMenu(clientX: number, clientY: number): void {
		if (!this.contextMenuEl) {
			return;
		}

		const hasSelection = (this.canvas?.getSelectedElements().filter(Boolean).length ?? 0) > 0;
		const items: Array<{ label: string; action?: () => void; disabled?: boolean; separator?: boolean }> = [
			{ label: 'Copy', action: () => this.copySelection(), disabled: !hasSelection },
			{ label: 'Cut', action: () => this.cutSelection(), disabled: !hasSelection },
			{ label: 'Paste', action: () => this.pasteSelection() },
			{ separator: true, label: '' },
			{ label: 'Duplicate', action: () => this.duplicateSelection(), disabled: !hasSelection },
			{ label: 'Delete', action: () => this.deleteSelection(), disabled: !hasSelection },
			{ separator: true, label: '' },
			{ label: 'Bring to Front', action: () => this.withDirtyAction('Bring to Front', () => this.canvas?.moveToTopSelectedElement()), disabled: !hasSelection },
			{ label: 'Send to Back', action: () => this.withDirtyAction('Send to Back', () => this.canvas?.moveToBottomSelectedElement()), disabled: !hasSelection },
			{ label: 'Group', action: () => this.withDirtyAction('Grouped', () => this.canvas?.groupSelectedElements()), disabled: !hasSelection },
			{ label: 'Ungroup', action: () => this.withDirtyAction('Ungrouped', () => this.canvas?.ungroupSelectedElement()), disabled: !hasSelection },
			{ separator: true, label: '' },
			{ label: 'Zoom In', action: () => this.zoomAtPoint((this.canvas?.getZoom() ?? 1) * 2, clientX, clientY) },
			{ label: 'Zoom Out', action: () => this.zoomAtPoint((this.canvas?.getZoom() ?? 1) * 0.5, clientX, clientY) },
			{ label: 'Reset Zoom', action: () => this.resetZoom() },
			{ separator: true, label: '' },
			{ label: 'Edit Source', action: () => this.openSourceEditor() }
		];

		this.contextMenuEl.empty();
		items.forEach((item) => {
			if (item.separator) {
				this.contextMenuEl?.createDiv({ cls: 'svg-edit-context-menu-separator' });
				return;
			}

			const button = this.contextMenuEl?.createEl('button', {
				cls: item.disabled ? 'svg-edit-context-menu-item is-disabled' : 'svg-edit-context-menu-item',
				text: item.label,
				attr: { type: 'button' }
			});
			button?.addEventListener('click', (event) => {
				event.preventDefault();
				event.stopPropagation();
				if (item.disabled) {
					return;
				}
				this.closeContextMenu();
				item.action?.();
			});
		});

		this.contextMenuEl.addClass('is-open');
		const modalRect = this.modalEl.getBoundingClientRect();
		const menuRect = this.contextMenuEl.getBoundingClientRect();
		const left = Math.min(clientX - modalRect.left, modalRect.width - menuRect.width - 8);
		const top = Math.min(clientY - modalRect.top, modalRect.height - menuRect.height - 8);
		this.contextMenuEl.style.left = `${Math.max(left, 8)}px`;
		this.contextMenuEl.style.top = `${Math.max(top, 8)}px`;
	}

	private closeContextMenu(): void {
		this.contextMenuEl?.removeClass('is-open');
	}

	private handleContextMenuClickAway(event: MouseEvent): void {
		if (!this.contextMenuEl?.hasClass('is-open')) {
			return;
		}

		const target = event.target instanceof Node ? event.target : null;
		if (target && this.contextMenuEl.contains(target)) {
			return;
		}

		this.closeContextMenu();
	}

	private handleWorkareaMouseMove(event: MouseEvent): void {
		if (!this.canvasHostEl || !this.panPointerDown) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		this.canvasHostEl.scrollLeft = this.panPointerDown.scrollLeft - (event.clientX - this.panPointerDown.x);
		this.canvasHostEl.scrollTop = this.panPointerDown.scrollTop - (event.clientY - this.panPointerDown.y);
	}

	private handleWindowMouseUp(event: MouseEvent): void {
		if (!this.canvas || !this.panPointerDown) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		this.canvasHostEl?.removeClass('is-panning');
		if (event.button === 1 && this.panPointerDown.previousMode !== 'ext-panning') {
			this.setMode(this.panPointerDown.previousMode || 'select');
		}
		this.panPointerDown = null;
	}

	private updateRulers(): void {
		this.rulers?.requestUpdate();
	}

	private toggleWireframe(): void {
		if (!this.canvas) {
			return;
		}

		this.wireframe = !this.wireframe;
		this.canvas.setConfig({ wireframe: this.wireframe });
		this.setStatus(this.wireframe ? 'Wireframe on' : 'Wireframe off');
	}

	private toggleGrid(): void {
		this.gridVisible = !this.gridVisible;
		this.canvasHostEl?.toggleClass('is-grid-visible', this.gridVisible);
		this.setStatus(this.gridVisible ? 'Grid on' : 'Grid off');
	}

	private importImage(): void {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml';
		input.addEventListener('change', async () => {
			const file = input.files?.[0];
			if (!file || !this.canvas) {
				return;
			}

			const dataUri = await readFileAsDataUri(file);
			const image = await this.canvas.embedImage(dataUri);
			this.canvas.selectOnly([image]);
			this.markDirty('Image imported');
		});
		input.click();
	}

	private openSourceEditor(): void {
		if (!this.canvas) {
			return;
		}

		new SvgSourceModal(this.app, this.canvas.getSvgString(), (source) => {
			if (!this.canvas) {
				return;
			}
			const loaded = this.canvas.setSvgString(source, false);
			if (!loaded) {
				new Notice('SVG source could not be loaded.');
				return;
			}
			this.markDirty('Source changed');
		}).open();
	}

	private async save(): Promise<void> {
		if (!this.canvas) {
			return;
		}

		await this.app.vault.modify(this.file, this.canvas.getSvgString());
		this.dirty = false;
		this.setStatus('Saved');
		new Notice(`SVG saved: ${this.file.name}`);
	}

	private handleKeydown(event: KeyboardEvent): void {
		const target = event.target instanceof Element ? event.target : null;
		if (!this.shouldHandleKeydown(event, target)) {
			return;
		}

		const isTyping = this.isEditableKeyTarget(target);
		const key = event.key.toLowerCase();
		const modifier = event.metaKey || event.ctrlKey;

		if (modifier && key === 's') {
			this.consumeShortcut(event);
			this.save();
			return;
		}

		if (!isTyping && modifier && key === 'z') {
			this.consumeShortcut(event);
			if (event.shiftKey) {
				this.canvas?.redo();
			} else {
				this.canvas?.undo();
			}
			return;
		}

		if (!isTyping && modifier && key === 'y') {
			this.consumeShortcut(event);
			this.canvas?.redo();
			return;
		}

		if (!isTyping && modifier && key === 'c') {
			this.consumeShortcut(event);
			this.copySelection();
			return;
		}

		if (!isTyping && modifier && key === 'x') {
			this.consumeShortcut(event);
			this.cutSelection();
			return;
		}

		if (!isTyping && modifier && key === 'v') {
			this.consumeShortcut(event);
			this.pasteSelection();
			return;
		}

		if (!isTyping && modifier && key === 'a') {
			this.consumeShortcut(event);
			this.canvas?.selectAllInCurrentLayer();
			this.setStatus('Selected all in current layer');
			return;
		}

		if (!isTyping && key === 'u') {
			this.consumeShortcut(event);
			this.openSourceEditor();
			return;
		}

		if (isTyping || modifier || event.altKey) {
			return;
		}

		const modeByKey: Record<string, string> = {
			v: 'select',
			z: 'zoom',
			q: 'fhpath',
			l: 'line',
			p: 'path',
			r: 'rect',
			e: 'ellipse',
			t: 'text'
		};
		if (modeByKey[key]) {
			this.consumeShortcut(event);
			this.setMode(modeByKey[key]);
			return;
		}

		if (key === 'd') {
			this.consumeShortcut(event);
			this.withDirtyAction('Duplicated', () => this.canvas?.cloneSelectedElements(20, 20));
			return;
		}

		if (key === 'g') {
			this.consumeShortcut(event);
			this.withDirtyAction('Grouped', () => this.canvas?.groupSelectedElements());
			return;
		}

		if (event.key === 'Delete' || event.key === 'Backspace') {
			this.consumeShortcut(event);
			this.deleteSelection();
		}
	}

	private shouldHandleKeydown(event: KeyboardEvent, target: Element | null): boolean {
		if (!this.modalEl.isConnected || event.defaultPrevented) {
			return false;
		}

		if (target && this.modalEl.contains(target)) {
			return true;
		}

		if (target?.closest('.modal, .modal-container')) {
			return false;
		}

		return true;
	}

	private isEditableKeyTarget(target: Element | null): boolean {
		return Boolean(target?.closest('input, textarea, select, [contenteditable="true"]'));
	}

	private consumeShortcut(event: KeyboardEvent): void {
		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
	}

	private markDirty(message: string): void {
		this.dirty = true;
		this.setStatus(`${message} - unsaved`);
	}

	private setStatus(message: string): void {
		if (!this.statusEl) {
			return;
		}

		this.statusEl.setText(this.dirty ? `${message} *` : message);
	}
}

class SvgSourceModal extends Modal {
	private readonly source: string;
	private readonly onApply: (source: string) => void;

	constructor(app: App, source: string, onApply: (source: string) => void) {
		super(app);
		this.source = source;
		this.onApply = onApply;
	}

	onOpen() {
		this.modalEl.addClass('svg-source-modal');
		this.titleEl.setText('SVG Source');
		const textarea = this.contentEl.createEl('textarea', {
			cls: 'svg-source-editor',
			text: this.source
		});
		const actions = this.contentEl.createDiv({ cls: 'svg-source-actions' });
		const applyButton = actions.createEl('button', { text: 'Apply' });
		applyButton.addEventListener('click', () => {
			this.onApply(textarea.value);
			this.close();
		});
	}

	onClose() {
		this.contentEl.empty();
	}
}

function readFileAsDataUri(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.addEventListener('load', () => resolve(String(reader.result)));
		reader.addEventListener('error', () => reject(reader.error));
		reader.readAsDataURL(file);
	});
}
