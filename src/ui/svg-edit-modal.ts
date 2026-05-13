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
type PickedStyle = Record<string, string>;
type StoredDraft = {
	source: string;
	updatedAt: number;
	filePath: string;
};

const GRID_UNIT_FACTORS: Record<string, number> = {
	px: 1,
	in: 96,
	cm: 96 / 2.54,
	mm: 96 / 25.4,
	pt: 96 / 72,
	pc: 16
};

const GRID_INTERVALS = [0.01, 0.1, 1, 10, 100, 1000];

const BASIC_SHAPE_PATHS: Record<string, string> = {
	heart: 'm150,73c61,-175 300,0 0,225c-300,-225 -61,-400 0,-225z',
	frame: 'm0,300l0,-300l300,0l0,300-300,0z',
	donut: 'm1,150l0,0c0,-82.29042 66.70958,-149 149,-149l0,0c39.51724,0 77.41599,15.69816 105.35889,43.64108c27.94293,27.94293 43.64111,65.84165 43.64111,105.35892l0,0c0,82.29041 -66.70958,149 -149,149l0,0c-82.29041,0 -149,-66.70959 -149,-149zm74.5,0l0,0c0,41.1452 33.35481,74.5 74.5,74.5c41.14522,0 74.5,-33.3548 74.5,-74.5c0,-41.1452 -33.3548,-74.5 -74.5,-74.5l0,0c-41.14519,0 -74.5,33.35481 -74.5,74.5z',
	triangle: 'm1,280.375l149,-260.75l149,260.75z',
	right_triangle: 'm1,299l0,-298l298,298z',
	diamond: 'm1,150l149,-149l149,149l-149,149l-149,-149z',
	pentagon: 'm1.00035,116.97758l148.99963,-108.4053l148.99998,108.4053l-56.91267,175.4042l-184.1741,0l-56.91284,-175.4042z',
	hexagon: 'm1,149.99944l63.85715,-127.71428l170.28572,0l63.85713,127.71428l-63.85713,127.71428l-170.28572,0l-63.85715,-127.71428z',
	star_points_5: 'm1,116.58409l113.82668,0l35.17332,-108.13487l35.17334,108.13487l113.82666,0l-92.08755,66.83026l35.17514,108.13487l-92.08759,-66.83208l-92.08757,66.83208l35.17515,-108.13487l-92.08758,-66.83026z',
	trapezoid: 'm1,299l55.875,-298l186.25001,0l55.87498,298z',
	arrow_up: 'm1.49805,149.64304l148.50121,-148.00241l148.50121,148.00241l-74.25061,0l0,148.71457l-148.5012,0l0,-148.71457z',
	smiley: 'm68.49886,214.78838q81.06408,55.67332 161.93891,0m-144.36983,-109.9558c0,-8.60432 6.97517,-15.57949 15.57948,-15.57949c8.60431,0 15.57948,6.97517 15.57948,15.57949c0,8.60431 -6.97517,15.57947 -15.57948,15.57947c-8.60431,0 -15.57948,-6.97516 -15.57948,-15.57947m95.83109,0c0,-8.60432 6.97517,-15.57949 15.57948,-15.57949c8.60431,0 15.57947,6.97517 15.57947,15.57949c0,8.60431 -6.97516,15.57947 -15.57947,15.57947c-8.60429,0 -15.57948,-6.97516 -15.57948,-15.57947m-181.89903,44.73038l0,0c0,-82.60133 66.96162,-149.56296 149.56296,-149.56296c82.60135,0 149.56296,66.96162 149.56296,149.56296c0,82.60135 -66.96161,149.56296 -149.56296,149.56296c-82.60133,0 -149.56296,-66.96161 -149.56296,-149.56296z',
	cloud: 'm182.05086,34.31005c-0.64743,0.02048 -1.27309,0.07504 -1.92319,0.13979c-10.40161,1.03605 -19.58215,7.63722 -24.24597,17.4734c-8.31731,-8.61741 -19.99149,-12.59487 -31.52664,-10.72866c-11.53516,1.8662 -21.55294,9.3505 -27.02773,20.19925c-15.45544,-9.51897 -34.72095,-8.94245 -49.62526,1.50272c-14.90431,10.44516 -22.84828,28.93916 -20.43393,47.59753c-12.95573,1.4119 -23.58103,11.46413 -26.34088,24.91708c-2.75985,13.45294 2.9789,27.25658 14.21789,34.21291c-8.66903,9.71078 -10.6639,24.08736 -4.94535,35.96027c5.71854,11.87289 17.93128,18.70935 30.53069,17.15887c7.15259,13.16728 19.01251,22.77237 32.93468,26.5945c13.92217,3.82214 28.70987,1.56322 41.03957,-6.25546c10.05858,15.86252 27.91113,24.19412 45.81322,21.38742c17.90208,-2.8067 32.66954,-16.26563 37.91438,-34.52742c12.31329,8.07489 27.80199,8.52994 40.52443,1.18819c12.72244,-7.34175 20.6609,-21.34155 20.77736,-36.58929c16.5202,0.17313 30.55292,-13.98268 36.84976,-30.22897c6.29684,-16.24631 3.91486,-34.76801 -6.2504,-48.68089c4.21637,-10.35873 3.96622,-22.14172 -0.68683,-32.29084c-4.65308,-10.14912 -13.23602,-17.69244 -23.55914,-20.65356c-2.31018,-13.45141 -11.83276,-24.27162 -24.41768,-27.81765c-12.58492,-3.54603 -25.98557,0.82654 -34.41142,11.25287c-5.93959,-8.19432 -15.2556,-12.8181 -24.96718,-12.51096z',
	flowchart_process: 'm1,51.87891l298,0l0,196.24391l-298,0zm37.25,-196.24391l0,196.24391m223.5,-196.24391l0,196.24391',
	flowchart_decision: 'm0.99837,149.99953l148.79352,-102.86476l148.79387,102.86476l-148.79387,102.86476l-148.79352,-102.86476z',
	flowchart_terminal: 'm48.94167,99.12235l202.11729,0l0,0c26.47794,0 47.9425,22.7794 47.9425,50.8792c0,28.09979 -21.46457,50.87918 -47.9425,50.87918l-202.11729,0l0,0c-26.47791,0 -47.9425,-22.77939 -47.9425,-50.87918c0,-28.09981 21.46459,-50.8792 47.9425,-50.8792z',
	flowchart_document: 'm1.00064,1.00098l298,0l0,242.19891c-149,0 -149,92.28223 -298,39.84915z',
	flowchart_data: 'm1.00038,249.33351l59.60001,-198.66668l238.40001,0l-59.60001,198.66668z',
	dialog_speech: 'm0.99786,35.96579l0,0c0,-19.31077 15.28761,-34.96524 34.14583,-34.96524l15.52084,0l0,0l74.50001,0l139.68748,0c9.05606,0 17.74118,3.68382 24.14478,10.24108c6.40356,6.55726 10.00107,15.45081 10.00107,24.72416l0,87.41311l0,0l0,52.44785l0,0c0,19.31078 -15.2876,34.96524 -34.14584,34.96524l-139.68748,0l-97.32507,88.90848l22.82506,-88.90848l-15.52084,0c-18.85822,0 -34.14583,-15.65446 -34.14583,-34.96524l0,0l0,-52.44785l0,0z',
	dialog_rect: 'm1,1l49.66667,0l0,0l74.5,0l173.83334,0l0,115.8889l0,0l0,49.66666l0,33.11111l-173.83334,0l-123.68433,97.37498l49.18433,-97.37498l-49.66667,0l0,-33.11111l0,-49.66666l0,0z',
	dialog_thought: 'm12,1c-6.094,0 -11,4.906 -11,11l0,147c0,6.09399 4.906,11 11,11l49.15625,0c-2.03143,2.32526 -3.15625,4.84886 -3.15625,7.5c0,11.32597 20.36188,20.5 45.5,20.5c25.13812,0 45.5,-9.17403 45.5,-20.5c0,-2.65114 -1.12482,-5.17474 -3.15625,-7.5l142.15625,0c6.09399,0 11,-4.90601 11,-11l0,-147c0,-6.094 -4.90601,-11 -11,-11l-276,0zm54,199c-13.81215,0 -25,5.37016 -25,12c0,6.62984 11.18785,12 25,12c13.81216,0 25,-5.37016 25,-12c0,-6.62984 -11.18784,-12 -25,-12zm-25,30c-7.73481,0 -14,4.02762 -14,9c0,4.97238 6.26519,9 14,9c7.73481,0 14,-4.02762 14,-9c0,-4.97238 -6.26519,-9 -14,-9zm-24,22c-4.97238,0 -9,2.23756 -9,5c0,2.76242 4.02762,5 9,5c4.97238,0 9,-2.23758 9,-5c0,-2.76244 -4.02762,-5 -9,-5z',
	math_plus: 'm1.00211,102.40185l101.39974,0l0,-101.39975l95.45412,0l0,101.39975l101.3997,0l0,95.45412l-101.3997,0l0,101.3997l-95.45412,0l0,-101.3997l-101.39974,0z',
	math_minus: 'm0.99887,102.39503l297.49445,0l0,95.2112l-297.49445,0z',
	math_equal: 'm0.99915,31.03476l297.3767,0l0,95.17349l-297.3767,0zm0,47.58677l297.3767,0l0,95.17349l-297.3767,0z',
	math_times: 'm1.00089,73.36786l72.36697,-72.36697l76.87431,76.87368l76.87431,-76.87368l72.36765,72.36697l-76.87433,76.87431l76.87433,76.87431l-72.36765,72.36765l-76.87431,-76.87433l-76.87431,76.87433l-72.36697,-72.36765l76.87368,-76.87431l-76.87368,-76.87431z',
	math_divide: 'm150,0.99785l0,0c25.17819,0 45.58916,20.41097 45.58916,45.58916c0,25.17821 -20.41096,45.58916 -45.58916,45.58916c-25.17822,0 -45.58916,-20.41093 -45.58916,-45.58916c0,-25.1782 20.41093,-45.58916 45.58916,-45.58916zm0,296.25203c-25.17822,0 -45.58916,-20.41095 -45.58916,-45.58917c0,-25.17819 20.41093,-45.58916 45.58916,-45.58916c25.17819,0 45.58916,20.41096 45.58916,45.58916c0,25.17822 -20.41096,45.58917 -45.58916,45.58917zm-134.06754,-193.71518l268.13507,0l0,91.17833l-268.13507,0z',
	object_bolt: 'm178.14388,74.00616l-108.49727,68.79685l107.15599,23.63498l-99.04335,73.85934l-39.98779,-12.47227l28.36194,71.19228l112.7131,-31.06076l-47.58928,-12.98325l129.22581,-106.08589l-118.12698,-19.22734l114.07071,-71.6874l-65.0681,-10.76349l70.86891,-45.56109l-26.03423,-0.65478l-109.97452,62.50492l51.92505,10.50792z',
	object_drop: 'm115.15536,295.759c-42.01334,-15.78687 -72.12711,-65.94934 -65.28346,-108.74701c4.3154,-26.98718 95.35947,-190.81818 103.3105,-185.90417c2.59511,1.60386 25.68835,39.79974 51.31831,84.87975c41.0565,72.21342 46.5999,85.67899 46.5999,113.19665c0,55.77716 -44.6394,101.46498 -98.23825,100.54555c-15.6409,-0.26834 -32.60906,-2.05518 -37.707,-3.97076zm42.09262,-28.05386c1.39066,-7.22116 -1.85785,-10.74289 -9.90955,-10.74289c-18.35065,0 -43.80598,-23.24161 -49.49309,-45.18889c-6.0666,-23.41179 -22.15186,-26.19615 -24.52774,-4.24574c-4.57746,42.29059 76.21872,100.22086 83.93037,60.17752z',
	object_sun: 'm238.69324,135.65587c0,46.60593 -40.30034,84.38748 -90.01332,84.38748c-49.71299,0 -90.01332,-37.78156 -90.01332,-84.38748c0,-46.6059 40.30033,-84.38747 90.01332,-84.38747c49.71298,0 90.01332,37.78154 90.01332,84.38747zm-7.30318,120.56636c-4.20586,5.25757 -51.12886,-47.27794 -57.30507,-44.69331c-6.17622,2.58458 -15.51068,86.52086 -22.0425,87.47173c-6.53188,0.9509 -17.76118,-85.09837 -24.12714,-87.15329c-6.36602,-2.05495 -43.23042,49.74286 -48.75608,45.85272c-5.52563,-3.89009 13.12091,-67.11951 10.04803,-73.73549c-3.07288,-6.61595 -73.34953,-9.72229 -74.79697,-17.10284c-1.44742,-7.38055 63.69369,-26.7453 64.2322,-34.0554c0.53854,-7.31011 -43.73452,-48.6129 -41.1993,-55.02096c2.53526,-6.40806 61.81988,21.03078 65.82475,15.40928c4.00487,-5.62149 -7.80805,-76.34053 -1.73039,-78.4587c6.07763,-2.11818 42.59449,47.54089 49.0827,47.30339c6.48817,-0.23753 26.02002,-62.46352 32.64861,-61.00949c6.62865,1.45401 3.32251,66.01247 8.45366,70.32287c5.13113,4.31043 55.87381,-16.15842 59.63792,-10.29998c3.76414,5.85843 -29.09575,62.86814 -27.11681,69.62658c1.97902,6.75845 62.18188,13.20758 61.3595,20.19514c-0.82245,6.98758 -75.2742,9.96732 -78.37666,16.73535c-3.10245,6.76802 28.36942,83.35484 24.16354,88.6124z'
};

export class SvgEditModal extends Modal {
	private canvas: SvgCanvasWithExtras | null = null;
	private readonly file: TFile;
	private readonly fallbackSvg: string;
	private dirty = false;
	private wireframe = false;
	private dynamicSourceOutput = false;
	private gridVisible = true;
	private gridSnapping = false;
	private snappingStep = 10;
	private gridColor = '#000000';
	private showRulers = true;
	private baseUnit = 'px';
	private backgroundColor = '#ffffff';
	private backgroundUrl = '';
	private canvasWidth = 800;
	private canvasHeight = 600;
	private statusEl: HTMLElement | null = null;
	private selectedPanelEl: HTMLElement | null = null;
	private contextRowEl: HTMLElement | null = null;
	private contextPathEl: HTMLElement | null = null;
	private elementContextPanels = new Map<string, HTMLElement>();
	private elementAttributeInputs: Array<{ panel: HTMLElement; attribute: string; input: HTMLInputElement }> = [];
	private xyPanelEl: HTMLElement | null = null;
	private selectedPositionInputs = new Map<'x' | 'y', HTMLInputElement>();
	private pathNodePanelEl: HTMLElement | null = null;
	private pathNodeInputs = new Map<'x' | 'y', HTMLInputElement>();
	private pathSegmentSelectEl: HTMLSelectElement | null = null;
	private addSubpathActive = false;
	private reorientButtonEl: HTMLButtonElement | null = null;
	private markerPanelEl: HTMLElement | null = null;
	private markerSelects = new Map<MarkerPosition, HTMLSelectElement>();
	private starPanelEl: HTMLElement | null = null;
	private polygonPanelEl: HTMLElement | null = null;
	private polystarInputs = new Map<string, HTMLInputElement>();
	private linkPanelEl: HTMLElement | null = null;
	private linkInputEl: HTMLInputElement | null = null;
	private groupTitlePanelEl: HTMLElement | null = null;
	private groupTitleInputEl: HTMLInputElement | null = null;
	private unlinkUseButtonEl: HTMLButtonElement | null = null;
	private textPanelEl: HTMLElement | null = null;
	private textRowEl: HTMLElement | null = null;
	private textInputEl: HTMLInputElement | null = null;
	private bodyEl: HTMLElement | null = null;
	private canvasHostEl: HTMLElement | null = null;
	private rulerXEl: HTMLElement | null = null;
	private rulerYEl: HTMLElement | null = null;
	private rulerCornerEl: HTMLElement | null = null;
	private rulers: Rulers | null = null;
	private layerPanelEl: HTMLElement | null = null;
	private layerListEl: HTMLElement | null = null;
	private overviewSvgEl: SVGSVGElement | null = null;
	private overviewViewportEl: HTMLElement | null = null;
	private contextMenuEl: HTMLElement | null = null;
	private undoButtonEl: HTMLButtonElement | null = null;
	private redoButtonEl: HTMLButtonElement | null = null;
	private layerPanelVisible = false;
	private layerViewActive = false;
	private pickedStyle: PickedStyle | null = null;
	private zoomPointerDown: { x: number; y: number } | null = null;
	private panPointerDown: { x: number; y: number; scrollLeft: number; scrollTop: number; previousMode: string } | null = null;
	private spacePanPreviousMode: string | null = null;
	private draftSaveTimer: number | null = null;
	private keydownHandler = (event: KeyboardEvent) => this.handleKeydown(event);
	private keyupHandler = (event: KeyboardEvent) => this.handleKeyup(event);
	private workareaWheelHandler = (event: WheelEvent) => this.handleWorkareaWheel(event);
	private workareaMouseDownHandler = (event: MouseEvent) => this.handleWorkareaMouseDown(event);
	private workareaMouseUpHandler = (event: MouseEvent) => this.handleWorkareaMouseUp(event);
	private workareaMouseMoveHandler = (event: MouseEvent) => this.handleWorkareaMouseMove(event);
	private workareaScrollHandler = () => this.updateOverviewViewport();
	private workareaContextMenuHandler = (event: MouseEvent) => this.handleWorkareaContextMenu(event);
	private workareaDragOverHandler = (event: DragEvent) => this.handleWorkareaDragOver(event);
	private workareaDropHandler = (event: DragEvent) => this.handleWorkareaDrop(event);
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
		window.addEventListener('keyup', this.keyupHandler, true);
		window.addEventListener('mousemove', this.workareaMouseMoveHandler, true);
		window.addEventListener('mouseup', this.windowMouseUpHandler, true);
		window.addEventListener('mousedown', this.contextMenuClickAwayHandler, true);
		document.addEventListener('keydown', this.keydownHandler, true);
		this.modalEl.addEventListener('keydown', this.keydownHandler, true);
		this.modalEl.addEventListener('keyup', this.keyupHandler, true);
		window.requestAnimationFrame(() => this.modalEl.focus());
	}

	onClose() {
		this.flushStoredDraft();
		window.removeEventListener('keydown', this.keydownHandler, true);
		window.removeEventListener('keyup', this.keyupHandler, true);
		window.removeEventListener('mousemove', this.workareaMouseMoveHandler, true);
		window.removeEventListener('mouseup', this.windowMouseUpHandler, true);
		window.removeEventListener('mousedown', this.contextMenuClickAwayHandler, true);
		document.removeEventListener('keydown', this.keydownHandler, true);
		this.modalEl.removeEventListener('keydown', this.keydownHandler, true);
		this.modalEl.removeEventListener('keyup', this.keyupHandler, true);
		this.rulers?.destroy();
		this.rulers = null;
		if (this.draftSaveTimer !== null) {
			window.clearTimeout(this.draftSaveTimer);
			this.draftSaveTimer = null;
		}
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
		this.contextPathEl = topEl.createDiv({ cls: 'svg-edit-context-path' });
		const textTopEl = topEl.createDiv({ cls: 'svg-edit-top-text' });
		this.textRowEl = textTopEl;
		const bodyEl = shellEl.createDiv({ cls: 'svg-edit-body' });
		this.bodyEl = bodyEl;
		const leftEl = bodyEl.createDiv({ cls: 'svg-edit-left', attr: { id: 'tools_left' } });
		const canvasFrameEl = bodyEl.createDiv({ cls: 'svg-edit-canvas-frame' });
		const rulerCornerEl = canvasFrameEl.createDiv({ cls: 'svg-edit-ruler-corner', attr: { id: 'ruler_corner' } });
		this.rulerCornerEl = rulerCornerEl;
		const rulerXEl = canvasFrameEl.createDiv({ cls: 'svg-edit-ruler svg-edit-ruler-x', attr: { id: 'ruler_x' } });
		this.rulerXEl = rulerXEl;
		rulerXEl.createDiv({ cls: 'svg-edit-ruler-inner' }).createEl('canvas', { attr: { width: '1', height: '15' } });
		const rulerYEl = canvasFrameEl.createDiv({ cls: 'svg-edit-ruler svg-edit-ruler-y', attr: { id: 'ruler_y' } });
		this.rulerYEl = rulerYEl;
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
			baseUnit: this.baseUnit,
			gridSnapping: this.gridSnapping,
			snappingStep: this.snappingStep,
			gridColor: this.gridColor,
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
		}, this.baseUnit);
		this.connectCanvasEvents();
		this.connectWorkareaNavigation();
		this.buildTopToolbar(mainTopEl, contextTopEl, textTopEl);
		this.buildLeftToolbar(leftEl);
		this.buildLayerPanel(layerEl);
		this.buildBottomToolbar(bottomEl);
		this.setMode('select');
		this.updateToolButtonState();
		this.restoreStoredDraftIfWanted(source);
		window.requestAnimationFrame(() => this.updateCanvasViewport({ center: true }));
	}

	private buildTopToolbar(toolbarEl: HTMLElement, contextEl: HTMLElement, textEl: HTMLElement): void {
		const brandPanel = toolbarEl.createDiv({
			cls: 'svg-edit-brand-panel',
			attr: {
				role: 'button',
				tabindex: '0',
				title: 'SVG-Edit menu',
				'aria-label': 'SVG-Edit menu'
			}
		});
		const brandIcon = brandPanel.createSpan({ cls: 'svg-edit-brand-icon' });
		setIcon(brandIcon, 'paintbrush-vertical');
		brandPanel.createSpan({ text: 'SVG-Edit' });
		brandPanel.createSpan({ cls: 'svg-edit-brand-caret', text: '▾' });
		brandPanel.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			this.openEditorMenu(event.clientX, event.clientY);
		});
		brandPanel.addEventListener('keydown', (event) => {
			if (event.key !== 'Enter' && event.code !== 'Space') {
				return;
			}
			this.consumeShortcut(event);
			const rect = brandPanel.getBoundingClientRect();
			this.openEditorMenu(rect.left, rect.bottom);
		});

		const titlePanel = toolbarEl.createDiv({ cls: 'svg-edit-title-panel', attr: { id: 'title_panel' } });
		titlePanel.createEl('p', { text: this.file.name });

		const editorPanel = this.addPanel(toolbarEl, 'editor_panel');
		this.addActionButton(editorPanel, 'New Document', 'file-plus-2', () => this.newDocument());
		this.addActionButton(editorPanel, 'Import SVG', 'file-input', () => this.importSvgFile());
		this.addActionButton(editorPanel, 'Edit Source [U]', 'code-2', () => this.openSourceEditor());
		this.addActionButton(editorPanel, 'Editor Preferences', 'settings', () => this.openEditorPreferences());
		this.addActionButton(editorPanel, 'Wireframe Mode [F]', 'scan-line', () => this.toggleWireframe());
		this.addActionButton(editorPanel, 'Show/Hide Grid', 'grid-3x3', () => this.toggleGrid());
		this.addActionButton(editorPanel, 'Layer View', 'layers-3', () => this.toggleLayerPanel());
		this.addActionButton(editorPanel, 'Solo Current Layer', 'panel-top', () => this.toggleLayerView());

		const historyPanel = this.addPanel(toolbarEl, 'history_panel');
		this.undoButtonEl = this.createIconButton(historyPanel, 'Undo [Ctrl+Z]', 'undo-2');
		this.undoButtonEl.addEventListener('click', () => this.undo());
		this.redoButtonEl = this.createIconButton(historyPanel, 'Redo [Ctrl+Y]', 'redo-2');
		this.redoButtonEl.addEventListener('click', () => this.redo());

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
		this.reorientButtonEl = this.createIconButton(selectedPanel, 'Reorient Path', 'refresh-cw');
		this.reorientButtonEl.addClass('svg-edit-reorient-button');
		this.reorientButtonEl.addEventListener('click', () => this.reorientPath());
		this.addActionButton(selectedPanel, 'Flip Horizontally', 'flip-horizontal-2', () => this.withDirtyAction('Flipped horizontally', () => this.canvas?.flipSelectedElements(-1, 1)));
		this.addActionButton(selectedPanel, 'Flip Vertically', 'flip-vertical-2', () => this.withDirtyAction('Flipped vertically', () => this.canvas?.flipSelectedElements(1, -1)));
		this.addActionButton(selectedPanel, 'Group [G]', 'group', () => this.withDirtyAction('Grouped', () => this.canvas?.groupSelectedElements()));
		this.addActionButton(selectedPanel, 'Ungroup', 'ungroup', () => this.withDirtyAction('Ungrouped', () => this.canvas?.ungroupSelectedElement()));
		this.unlinkUseButtonEl = this.createIconButton(selectedPanel, 'Unlink Use', 'unlink');
		this.unlinkUseButtonEl.addClass('svg-edit-use-only-button');
		this.unlinkUseButtonEl.addEventListener('click', () => this.withDirtyAction('Use unlinked', () => this.canvas?.ungroupSelectedElement()));
		this.addActionButton(selectedPanel, 'Enter Group Context', 'square-mouse-pointer', () => this.enterSelectedContext());
		this.addActionButton(selectedPanel, 'Leave Group Context', 'corner-up-left', () => this.leaveCurrentContext());
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
		this.buildSelectedPositionPanel(contextEl);
		this.buildElementContextPanels(contextEl);
		this.buildContainerContextPanels(contextEl);
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
		this.addActionButton(documentPanel, 'Document Properties', 'file-cog', () => this.openDocumentProperties());
		this.addActionButton(documentPanel, 'Document Title', 'file-pen-line', () => this.setDocumentTitle());
		this.addActionButton(documentPanel, 'Background Color', 'paint-bucket', () => this.setBackgroundColor());
		this.addActionButton(documentPanel, 'Copy SVG Source', 'clipboard-copy', () => this.copySvgSource());
		this.addActionButton(documentPanel, 'Export Image', 'download', () => this.openExportDialog());
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
		this.addToolButton(toolbarEl, 'Eyedropper', 'pipette', 'eyedropper', 'tool_eyedropper');
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

		this.buildOverviewPanel(panelEl);
		this.layerListEl = panelEl.createDiv({ cls: 'svg-edit-layer-list' });
		this.refreshLayerPanel();
	}

	private buildOverviewPanel(panelEl: HTMLElement): void {
		const overviewEl = panelEl.createDiv({ cls: 'svg-edit-overview' });
		const headerEl = overviewEl.createDiv({ cls: 'svg-edit-overview-header' });
		headerEl.createSpan({ text: 'Overview' });
		const stageEl = overviewEl.createDiv({ cls: 'svg-edit-overview-stage' });
		this.overviewSvgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		this.overviewSvgEl.classList.add('svg-edit-overview-svg');
		this.overviewSvgEl.setAttribute('aria-hidden', 'true');
		stageEl.appendChild(this.overviewSvgEl);
		this.overviewViewportEl = stageEl.createDiv({ cls: 'svg-edit-overview-viewport' });

		const centerOverview = (event: PointerEvent | MouseEvent) => {
			event.preventDefault();
			this.scrollCanvasFromOverview(event.clientX, event.clientY);
		};
		stageEl.addEventListener('pointerdown', (event) => {
			stageEl.setPointerCapture(event.pointerId);
			centerOverview(event);
		});
		stageEl.addEventListener('pointermove', (event) => {
			if ((event.buttons & 1) === 0) {
				return;
			}
			centerOverview(event);
		});
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
			this.updateToolButtonState();
		});
		this.addColorInput(toolbarEl, 'Stroke', '#111111', (value) => {
			this.canvas?.setColor('stroke', value);
			this.markDirty('Stroke changed');
			this.updateToolButtonState();
		});
		this.addActionButton(toolbarEl, 'No Fill', 'ban', () => this.setPaintColor('fill', 'none'));
		this.addActionButton(toolbarEl, 'No Stroke', 'slash', () => this.setPaintColor('stroke', 'none'));
		this.addActionButton(toolbarEl, 'Swap Fill and Stroke', 'repeat-2', () => this.swapFillAndStroke());
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

	private setPaintColor(type: 'fill' | 'stroke', color: string): void {
		this.canvas?.setColor(type, color);
		this.markDirty(`${type === 'fill' ? 'Fill' : 'Stroke'} changed`);
		this.updateToolButtonState();
	}

	private swapFillAndStroke(): void {
		if (!this.canvas) {
			return;
		}

		const fill = this.canvas.getColor('fill');
		const stroke = this.canvas.getColor('stroke');
		this.canvas.setColor('fill', stroke);
		this.canvas.setColor('stroke', fill);
		this.markDirty('Fill and stroke swapped');
		this.updateToolButtonState();
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
					this.updateToolButtonState();
					return;
				}
				this.canvas?.setColor('fill', color);
				this.markDirty('Fill changed');
				this.updateToolButtonState();
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
				{ label: 'Frame', icon: 'square-dashed', value: 'frame' },
				{ label: 'Donut', icon: 'circle-dot', value: 'donut' },
				{ label: 'Rectangle', icon: 'square', value: 'rectangle' },
				{ label: 'Circle', icon: 'circle', value: 'circle' },
				{ label: 'Triangle', icon: 'triangle', value: 'triangle' },
				{ label: 'Right Triangle', icon: 'play', value: 'right_triangle' },
				{ label: 'Diamond', icon: 'diamond', value: 'diamond' },
				{ label: 'Pentagon', icon: 'pentagon', value: 'pentagon' },
				{ label: 'Hexagon', icon: 'hexagon', value: 'hexagon' },
				{ label: 'Star', icon: 'star', value: 'star_points_5' },
				{ label: 'Trapezoid', icon: 'trapezoid', value: 'trapezoid' },
				{ label: 'Arrow Up', icon: 'arrow-up', value: 'arrow_up' },
				{ label: 'Smile', icon: 'smile', value: 'smiley' },
				{ label: 'Cloud', icon: 'cloud', value: 'cloud' },
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
				{ label: 'Speech Bubble', icon: 'message-square', value: 'dialog_speech' },
				{ label: 'Rect Bubble', icon: 'message-square-text', value: 'dialog_rect' },
				{ label: 'Thought Bubble', icon: 'message-circle', value: 'dialog_thought' }
			],
			electronics: [
				{ label: 'Battery', icon: 'battery', value: 'battery' },
				{ label: 'Cpu', icon: 'cpu', value: 'chip' },
				{ label: 'Plug', icon: 'plug', value: 'plug' }
			],
			flowchart: [
				{ label: 'Process', icon: 'square', value: 'flowchart_process' },
				{ label: 'Decision', icon: 'diamond', value: 'flowchart_decision' },
				{ label: 'Terminator', icon: 'circle', value: 'flowchart_terminal' },
				{ label: 'Document', icon: 'file', value: 'flowchart_document' },
				{ label: 'Data', icon: 'database', value: 'flowchart_data' }
			],
			game: [
				{ label: 'Dice', icon: 'dice-5', value: 'dice' },
				{ label: 'Club', icon: 'club', value: 'club' },
				{ label: 'Spade', icon: 'spade', value: 'spade' }
			],
			math: [
				{ label: 'Plus', icon: 'plus', value: 'math_plus' },
				{ label: 'Minus', icon: 'minus', value: 'math_minus' },
				{ label: 'Equal', icon: 'equal', value: 'math_equal' },
				{ label: 'Times', icon: 'x', value: 'math_times' },
				{ label: 'Divide', icon: 'divide', value: 'math_divide' },
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
				{ label: 'Flag', icon: 'flag', value: 'flag' },
				{ label: 'Bolt', icon: 'zap', value: 'object_bolt' },
				{ label: 'Drop', icon: 'droplet', value: 'object_drop' },
				{ label: 'Sun', icon: 'sun', value: 'object_sun' }
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

	private buildSelectedPositionPanel(contextEl: HTMLElement): void {
		const panel = this.addPanel(contextEl, 'xy_panel', 'svg-edit-context-panel');
		this.xyPanelEl = panel;
		this.addSelectedPositionInput(panel, 'X', 'x');
		this.addSelectedPositionInput(panel, 'Y', 'y');
	}

	private addSelectedPositionInput(parentEl: HTMLElement, label: string, axis: 'x' | 'y'): void {
		const wrapper = parentEl.createDiv({ cls: 'svg-edit-control svg-edit-number-control' });
		wrapper.createSpan({ text: label });
		const input = wrapper.createEl('input', {
			attr: {
				type: 'number',
				step: '1',
				title: `Selected ${label}`,
				'aria-label': `Selected ${label}`
			}
		});
		input.addEventListener('input', () => {
			const value = Number(input.value);
			if (!Number.isFinite(value)) {
				return;
			}
			this.changeSelectedNumericAttribute(axis, value);
		});
		this.selectedPositionInputs.set(axis, input);
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

	private buildContainerContextPanels(contextEl: HTMLElement): void {
		const groupPanel = this.addPanel(contextEl, 'container_panel', 'svg-edit-context-panel svg-edit-text-control-panel');
		this.groupTitlePanelEl = groupPanel;
		this.groupTitleInputEl = this.addTextControl(groupPanel, 'Label', 'Group label', (value) => {
			this.canvas?.setGroupTitle(value);
			this.markDirty('Group label changed');
		});

		const linkPanel = this.addPanel(contextEl, 'a_panel', 'svg-edit-context-panel svg-edit-text-control-panel');
		this.linkPanelEl = linkPanel;
		this.linkInputEl = this.addTextControl(linkPanel, 'Link', 'Link URL', (value) => {
			if (!this.canvas) {
				return;
			}
			if (value.trim().length) {
				this.canvas.setLinkURL(value.trim());
				this.markDirty('Link URL changed');
				return;
			}
			this.canvas.removeHyperlink();
			this.markDirty('Link removed');
			this.updateContextPanels();
		});
	}

	private addTextControl(parentEl: HTMLElement, label: string, title: string, onChange: (value: string) => void): HTMLInputElement {
		const wrapper = parentEl.createDiv({ cls: 'svg-edit-control svg-edit-text-control' });
		wrapper.createSpan({ text: label });
		const input = wrapper.createEl('input', {
			attr: {
				type: 'text',
				title,
				'aria-label': title
			}
		});
		input.addEventListener('change', () => onChange(input.value));
		return input;
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

	private toggleLayerView(force?: boolean): void {
		this.layerViewActive = force ?? !this.layerViewActive;
		this.applyLayerView();
		this.refreshLayerPanel();
		this.setStatus(this.layerViewActive ? 'Solo current layer on' : 'Solo current layer off');
	}

	private applyLayerView(): void {
		if (!this.canvas) {
			return;
		}

		const currentName = this.canvas.getCurrentLayerName();
		this.getLayerInfos().forEach((layer) => {
			this.canvas?.setLayerVisibility(layer.name, !this.layerViewActive || layer.name === currentName);
		});
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
				this.applyLayerView();
				this.refreshLayerPanel();
				this.setStatus(`Current layer: ${layer.name}`);
			});
			rowEl.addEventListener('mouseenter', () => this.highlightLayer(layer.name));
			rowEl.addEventListener('mouseleave', () => this.highlightLayer(null));

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
				if (this.layerViewActive) {
					this.layerViewActive = false;
				}
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

	private hasLayer(name: string): boolean {
		const trimmedName = name.trim();
		if (!trimmedName || !this.canvas) {
			return false;
		}

		const drawing = this.canvas.getCurrentDrawing();
		return Boolean(drawing.hasLayer?.(trimmedName) || this.getLayerInfos().some((layer) => layer.name === trimmedName));
	}

	private promptUniqueLayerName(message: string, fallback: string, currentName?: string): string | null {
		const name = window.prompt(message, fallback)?.trim();
		if (!name) {
			return null;
		}

		if (name !== currentName && this.hasLayer(name)) {
			new Notice('A layer with that name already exists.');
			return null;
		}

		return name;
	}

	private highlightLayer(layerName: string | null): void {
		if (!this.canvas) {
			return;
		}

		const drawing = this.canvas.getCurrentDrawing();
		if (!drawing.setLayerOpacity) {
			return;
		}

		this.getLayerInfos().forEach((layer) => {
			drawing.setLayerOpacity?.(layer.name, !layerName || layer.name === layerName ? 1 : 0.5);
		});
	}

	private createLayer(): void {
		const fallback = `Layer ${this.getLayerInfos().length + 1}`;
		const name = this.promptUniqueLayerName('Layer name', fallback);
		if (!name || !this.canvas) {
			return;
		}
		this.canvas.createLayer(name);
		this.markDirty('Layer created');
		this.refreshLayerPanel();
		this.toggleLayerPanel(true);
	}

	private renameLayer(): void {
		const current = this.currentLayerInfo();
		const name = this.promptUniqueLayerName('Layer name', current?.name ?? '', current?.name);
		if (!name || !this.canvas) {
			return;
		}
		this.canvas.renameCurrentLayer(name);
		this.markDirty('Layer renamed');
		this.refreshLayerPanel();
	}

	private cloneLayer(): void {
		const current = this.currentLayerInfo();
		const name = this.promptUniqueLayerName('Duplicate layer name', current ? `${current.name} copy` : 'Layer copy');
		if (!name || !this.canvas) {
			return;
		}
		this.canvas.cloneLayer(name);
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
			this.syncMarkerColors();
			this.updateConnectors();
			this.refreshLayerPanel();
			this.updateOverview();
			this.updateContextPanels();
			this.updateCanvasViewport();
		});
		this.canvas.bind('selected', () => this.updateContextPanels());
		this.canvas.bind('contextset', (_window: Window, context: Element | null) => this.updateContextPath(context));
		this.canvas.bind('zoomed', (_window: Window, bbox: SvgCanvasZoomBox) => this.handleCanvasZoomed(bbox));
	}

	private connectWorkareaNavigation(): void {
		if (!this.canvasHostEl) {
			return;
		}

		this.canvasHostEl.addEventListener('wheel', this.workareaWheelHandler, { capture: true, passive: false });
		this.canvasHostEl.addEventListener('mousedown', this.workareaMouseDownHandler, true);
		this.canvasHostEl.addEventListener('mouseup', this.workareaMouseUpHandler, true);
		this.canvasHostEl.addEventListener('scroll', this.workareaScrollHandler);
		this.canvasHostEl.addEventListener('contextmenu', this.workareaContextMenuHandler, true);
		this.canvasHostEl.addEventListener('dragover', this.workareaDragOverHandler);
		this.canvasHostEl.addEventListener('drop', this.workareaDropHandler);
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
		if (mode !== 'eyedropper') {
			this.pickedStyle = null;
		}
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
		this.updateHistoryButtonState();
		this.selectedPanelEl?.toggleClass('is-visible', hasSelection);
		this.contextRowEl?.toggleClass('is-visible', hasSelection);
		this.updateSelectedPositionPanel(selectedElements);
		this.updateElementContextPanels(selectedElements);
		this.updateContainerContextPanels(selectedElements);
		this.updateUsePanel(selectedElements);
		this.updatePathNodePanel(mode);
		this.updateMarkerPanel(selectedElements);
		this.updatePolystarPanels(selectedElements);
		this.textPanelEl?.toggleClass('is-visible', showTextPanel);
		this.textRowEl?.toggleClass('is-visible', showTextPanel);
	}

	private updateHistoryButtonState(): void {
		if (!this.canvas) {
			return;
		}

		this.setButtonDisabled(this.undoButtonEl, this.canvas.undoMgr.getUndoStackSize() === 0);
		this.setButtonDisabled(this.redoButtonEl, this.canvas.undoMgr.getRedoStackSize() === 0);
	}

	private setButtonDisabled(button: HTMLButtonElement | null, disabled: boolean): void {
		if (!button) {
			return;
		}

		button.disabled = disabled;
		button.toggleClass('is-disabled', disabled);
	}

	private updateSelectedPositionPanel(selectedElements: Element[]): void {
		const element = selectedElements.length === 1 ? selectedElements[0] : null;
		const elementName = element?.tagName.toLowerCase() ?? '';
		const hasOwnPositionPanel = ['line', 'circle', 'ellipse', 'polygon'].includes(elementName);
		const showPanel = Boolean(element && !hasOwnPositionPanel);
		this.xyPanelEl?.toggleClass('is-visible', showPanel);

		const isReorientablePath = Boolean(element && elementName === 'path');
		const angle = element && this.canvas ? this.canvas.getRotationAngle(element) : 0;
		if (this.reorientButtonEl) {
			this.reorientButtonEl.toggleClass('is-visible', isReorientablePath);
			this.reorientButtonEl.disabled = !isReorientablePath || angle === 0;
			this.reorientButtonEl.toggleClass('is-disabled', this.reorientButtonEl.disabled);
		}

		if (!element || !showPanel || !this.canvas) {
			return;
		}

		let x = Number(element.getAttribute('x'));
		let y = Number(element.getAttribute('y'));
		if (['g', 'polyline', 'path'].includes(elementName)) {
			const bbox = this.canvas.getStrokedBBox([element]);
			if (bbox) {
				x = bbox.x;
				y = bbox.y;
			}
		}

		this.setSelectedPositionInputValue('x', x);
		this.setSelectedPositionInputValue('y', y);
	}

	private setSelectedPositionInputValue(axis: 'x' | 'y', value: number): void {
		const input = this.selectedPositionInputs.get(axis);
		if (input && Number.isFinite(value)) {
			input.value = String(Math.round(value * 100) / 100);
		}
	}

	private updateContainerContextPanels(selectedElements: Element[]): void {
		const element = selectedElements.length === 1 ? selectedElements[0] : null;
		const groupLike = Boolean(element && ['g', 'use'].includes(element.tagName.toLowerCase()));
		this.groupTitlePanelEl?.toggleClass('is-visible', groupLike);
		if (this.groupTitleInputEl && element && groupLike && this.canvas) {
			this.groupTitleInputEl.value = this.canvas.getTitle(element) ?? '';
			this.groupTitleInputEl.disabled = element.tagName.toLowerCase() === 'use';
		}

		const linkElement = element ? this.getOwningLinkElement(element) : null;
		this.linkPanelEl?.toggleClass('is-visible', Boolean(linkElement));
		if (this.linkInputEl && linkElement && this.canvas) {
			this.linkInputEl.value = this.canvas.getHref(linkElement);
		}
	}

	private updateUsePanel(selectedElements: Element[]): void {
		const element = selectedElements.length === 1 ? selectedElements[0] : null;
		this.unlinkUseButtonEl?.toggleClass('is-visible', element?.tagName.toLowerCase() === 'use');
	}

	private getOwningLinkElement(element: Element): Element | null {
		if (element.tagName.toLowerCase() === 'a') {
			return element;
		}

		const parent = element.parentElement;
		if (parent?.tagName.toLowerCase() === 'a' && parent.children.length === 1) {
			return parent;
		}

		return null;
	}

	private updateToolButtonState(): void {
		if (!this.canvas) {
			return;
		}

		const noFill = this.canvas.getColor('fill') === 'none';
		const noStroke = this.canvas.getColor('stroke') === 'none';
		const strokeRequiredIds = ['tool_fhpath', 'tool_line'];
		const paintRequiredIds = [
			'tool_rect',
			'tool_square',
			'tool_fhrect',
			'tool_ellipse',
			'tool_circle',
			'tool_fhellipse',
			'tool_text',
			'tool_path',
			'tool_star',
			'tool_polygon'
		];

		this.setToolButtonsDisabled(strokeRequiredIds, noStroke);
		this.setToolButtonsDisabled(paintRequiredIds, noStroke && noFill);

		const activeButton = this.contentEl.querySelector<HTMLButtonElement>('.svg-edit-icon-button.is-active:disabled');
		if (activeButton) {
			this.setMode('select');
		}
	}

	private setToolButtonsDisabled(ids: string[], disabled: boolean): void {
		ids.forEach((id) => {
			const button = this.contentEl.querySelector<HTMLButtonElement>(`#${id}`);
			if (!button) {
				return;
			}
			button.disabled = disabled;
			button.toggleClass('is-disabled', disabled);
		});
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

	private undo(): void {
		if (!this.canvas || this.canvas.undoMgr.getUndoStackSize() === 0) {
			return;
		}

		this.canvas.undo();
		this.refreshLayerPanel();
		this.updateContextPanels();
	}

	private redo(): void {
		if (!this.canvas || this.canvas.undoMgr.getRedoStackSize() === 0) {
			return;
		}

		this.canvas.redo();
		this.refreshLayerPanel();
		this.updateContextPanels();
	}

	private copySelection(): void {
		this.canvas?.copySelectedElements();
		this.setStatus('Selection copied');
	}

	private cutSelection(): void {
		this.canvas?.cutSelectedElements();
		this.markDirty('Selection cut');
	}

	private pasteSelection(inPlace = false): void {
		if (!this.canvas || !this.canvasHostEl) {
			return;
		}

		if (inPlace) {
			this.canvas.pasteElements('in_place');
			this.markDirty('Pasted in place');
			return;
		}

		const zoom = this.canvas.getZoom();
		const x = (this.canvasHostEl.scrollLeft + this.canvasHostEl.clientWidth / 2) / zoom - (this.canvas.contentW ?? this.canvasWidth);
		const y = (this.canvasHostEl.scrollTop + this.canvasHostEl.clientHeight / 2) / zoom - (this.canvas.contentH ?? this.canvasHeight);
		this.canvas.pasteElements('point', x, y);
		this.markDirty('Pasted');
	}

	private duplicateSelection(): void {
		this.withDirtyAction('Duplicated', () => this.canvas?.cloneSelectedElements(20, 20));
	}

	private enterSelectedContext(): void {
		if (!this.canvas) {
			return;
		}

		const selected = this.canvas.getSelectedElements().filter(Boolean);
		const element = selected.length === 1 ? selected[0] : null;
		if (!element || !['g', 'a'].includes(element.tagName.toLowerCase())) {
			new Notice('Select a group or link to enter its context.');
			return;
		}

		this.canvas.setContext(element);
		this.setStatus(`Context: ${element.id || element.tagName}`);
	}

	private leaveCurrentContext(): void {
		if (!this.canvas?.getCurrentGroup()) {
			return;
		}

		this.canvas.leaveContext();
		this.updateContextPath(null);
		this.updateContextPanels();
		this.setStatus('Left group context');
	}

	private updateContextPath(context: Element | null): void {
		if (!this.contextPathEl || !this.canvas) {
			return;
		}

		this.contextPathEl.empty();
		this.contextPathEl.toggleClass('is-visible', Boolean(context));
		if (!context) {
			return;
		}

		const rootButton = this.contextPathEl.createEl('button', {
			text: this.canvas.getCurrentLayerName(),
			attr: { type: 'button' }
		});
		rootButton.addEventListener('click', () => this.leaveCurrentContext());

		this.getContextAncestors(context).forEach((element) => {
			this.contextPathEl?.createSpan({ text: '>' });
			const id = element.id || element.tagName.toLowerCase();
			if (element === context) {
				this.contextPathEl?.createSpan({ text: id });
				return;
			}
			const button = this.contextPathEl?.createEl('button', {
				text: id,
				attr: { type: 'button' }
			});
			button?.addEventListener('click', () => this.canvas?.setContext(element));
		});
	}

	private getContextAncestors(context: Element): Element[] {
		const ancestors: Element[] = [];
		let current: Element | null = context;
		const svgContent = this.canvas?.getSvgContent();
		while (current && current !== svgContent) {
			ancestors.unshift(current);
			current = current.parentElement;
		}
		return ancestors;
	}

	private moveSelectionBy(dx: number, dy: number): void {
		if (!this.hasSelection() || !this.canvas) {
			return;
		}

		this.canvas.moveSelectedElements(dx, dy);
		this.markDirty('Selection moved');
	}

	private cloneSelectionBy(dx: number, dy: number): void {
		if (!this.hasSelection()) {
			return;
		}

		this.withDirtyAction('Selection cloned', () => this.canvas?.cloneSelectedElements(dx, dy));
	}

	private rotateSelectionBy(step: number): void {
		if (!this.canvas) {
			return;
		}

		const selected = this.canvas.getSelectedElements().filter(Boolean);
		if (selected.length !== 1) {
			return;
		}

		const currentAngle = this.canvas.getRotationAngle(selected[0]) || 0;
		this.canvas.setRotationAngle(currentAngle + step);
		this.markDirty('Selection rotated');
		this.updateContextPanels();
	}

	private cycleSelection(next: 0 | 1): void {
		this.canvas?.cycleElement(next);
		this.updateContextPanels();
		this.setStatus(next ? 'Selected next element' : 'Selected previous element');
	}

	private cancelCurrentTool(): void {
		const mode = this.canvas?.getMode();
		const modesToCancel = ['zoom', 'rect', 'square', 'circle', 'ellipse', 'line', 'text', 'star', 'polygon', 'shapelib', 'image'];
		if (mode && modesToCancel.includes(mode)) {
			this.setMode('select');
		}
	}

	private hasSelection(): boolean {
		return (this.canvas?.getSelectedElements().filter(Boolean).length ?? 0) > 0;
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

	private reorientPath(): void {
		if (!this.canvas) {
			return;
		}

		const selected = this.canvas.getSelectedElements().filter(Boolean);
		if (selected.length !== 1 || selected[0].tagName.toLowerCase() !== 'path') {
			return;
		}

		this.canvas.pathActions.reorient();
		this.markDirty('Path reoriented');
		this.updateContextPanels();
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
			const markerTarget = position === 'mid' && element.tagName === 'line'
				? this.convertLineToPolyline(element)
				: element;
			const markerId = `mkr_${position}_${markerTarget.id || Date.now()}`;
			this.createMarker(markerId, markerType, markerTarget);
			this.canvas.changeSelectedAttribute(markerAttribute, `url(#${markerId})`, [markerTarget]);
		} else {
			this.canvas.call('changed', selected);
		}

		this.markDirty('Marker changed');
		this.updateContextPanels();
	}

	private convertLineToPolyline(element: Element): Element {
		if (!this.canvas || element.tagName !== 'line') {
			return element;
		}

		const x1 = Number(element.getAttribute('x1')) || 0;
		const y1 = Number(element.getAttribute('y1')) || 0;
		const x2 = Number(element.getAttribute('x2')) || 0;
		const y2 = Number(element.getAttribute('y2')) || 0;
		const midpoint = `${(x1 + x2) / 2},${(y1 + y2) / 2}`;
		const originalId = element.id || `line_${Date.now()}`;
		const polyline = this.canvas.addSVGElementsFromJson({
			element: 'polyline',
			attr: {
				id: `${originalId}_polyline`,
				points: `${x1},${y1} ${midpoint} ${x2},${y2}`,
				fill: 'none',
				stroke: element.getAttribute('stroke') || '#111111',
				'stroke-width': element.getAttribute('stroke-width') || 2,
				opacity: element.getAttribute('opacity') || 1
			}
		});
		(['start', 'mid', 'end'] as MarkerPosition[]).forEach((position) => {
			const attribute = `marker-${position}`;
			const marker = element.getAttribute(attribute);
			if (marker) {
				polyline.setAttribute(attribute, marker);
			}
		});
		element.insertAdjacentElement('afterend', polyline);
		element.remove();
		polyline.id = originalId;
		this.canvas.selectOnly([polyline]);
		return polyline;
	}

	private syncMarkerColors(): void {
		if (!this.canvas) {
			return;
		}

		const markerOwners = this.canvas.getSvgContent().querySelectorAll('line, path, polyline, polygon');
		markerOwners.forEach((element) => {
			const color = element.getAttribute('stroke') || '#000000';
			(['marker-start', 'marker-mid', 'marker-end'] as const).forEach((attribute) => {
				const marker = this.getLinkedMarker(element, attribute);
				const shape = marker?.lastElementChild;
				if (!shape || !marker?.getAttribute('se_type')) {
					return;
				}
				if (shape.getAttribute('fill') !== 'none') {
					shape.setAttribute('fill', color);
				}
				if (shape.getAttribute('stroke') !== 'none') {
					shape.setAttribute('stroke', color);
				}
			});
		});
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

		const originalPath = BASIC_SHAPE_PATHS[shape];
		if (originalPath) {
			this.insertLibraryPath(originalPath);
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

	private insertLibraryPath(pathData: string): void {
		if (!this.canvas) {
			return;
		}

		const x = Math.round(this.canvasWidth / 2 - 60);
		const y = Math.round(this.canvasHeight / 2 - 60);
		const element = this.canvas.addSVGElementsFromJson({
			element: 'path',
			attr: {
				d: pathData,
				fill: '#f2c94c',
				stroke: '#111111',
				'stroke-width': 2,
				transform: `translate(${x},${y}) scale(0.4)`
			}
		});
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
		const firstId = this.ensureElementId(first);
		const secondId = this.ensureElementId(second);
		const firstBox = this.canvas.getStrokedBBox([first]) ?? first.getBBox();
		const secondBox = this.canvas.getStrokedBBox([second]) ?? second.getBBox();
		const points = this.connectorPoints(firstBox, secondBox);
		const line = this.canvas.addSVGElementsFromJson({
			element: 'polyline',
			attr: {
				points: `${points.start.x},${points.start.y} ${(points.start.x + points.end.x) / 2},${(points.start.y + points.end.y) / 2} ${points.end.x},${points.end.y}`,
				fill: 'none',
				stroke: '#111111',
				'stroke-width': 2,
				'data-connector': `${firstId} ${secondId}`
			}
		});
		this.canvas.selectOnly([line]);
		this.markDirty('Connector created');
	}

	private ensureElementId(element: Element): string {
		if (element.id) {
			return element.id;
		}

		element.id = `svg_edit_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
		return element.id;
	}

	private updateConnectors(): void {
		if (!this.canvas) {
			return;
		}

		const connectors = this.canvas.getSvgContent().querySelectorAll<SVGPolylineElement>('polyline[data-connector]');
		connectors.forEach((connector) => {
			const [startId, endId] = (connector.getAttribute('data-connector') ?? '').split(/\s+/);
			const startElement = startId ? this.canvas?.getSvgContent().querySelector<SVGGraphicsElement>(`#${CSS.escape(startId)}`) : null;
			const endElement = endId ? this.canvas?.getSvgContent().querySelector<SVGGraphicsElement>(`#${CSS.escape(endId)}`) : null;
			if (!startElement || !endElement) {
				connector.remove();
				return;
			}

			const startBox = this.canvas?.getStrokedBBox([startElement]) ?? startElement.getBBox();
			const endBox = this.canvas?.getStrokedBBox([endElement]) ?? endElement.getBBox();
			const points = this.connectorPoints(startBox, endBox);
			connector.setAttribute('points', `${points.start.x},${points.start.y} ${(points.start.x + points.end.x) / 2},${(points.start.y + points.end.y) / 2} ${points.end.x},${points.end.y}`);
		});
	}

	private connectorPoints(
		startBox: { x: number; y: number; width: number; height: number },
		endBox: { x: number; y: number; width: number; height: number }
	): { start: { x: number; y: number }; end: { x: number; y: number } } {
		const startCenter = this.boxCenter(startBox);
		const endCenter = this.boxCenter(endBox);
		return {
			start: this.boxIntersectionToward(startBox, endCenter),
			end: this.boxIntersectionToward(endBox, startCenter)
		};
	}

	private boxCenter(box: { x: number; y: number; width: number; height: number }): { x: number; y: number } {
		return {
			x: box.x + box.width / 2,
			y: box.y + box.height / 2
		};
	}

	private boxIntersectionToward(
		box: { x: number; y: number; width: number; height: number },
		target: { x: number; y: number }
	): { x: number; y: number } {
		const center = this.boxCenter(box);
		const dx = target.x - center.x;
		const dy = target.y - center.y;
		if (dx === 0 && dy === 0) {
			return center;
		}

		const scaleX = dx === 0 ? Number.POSITIVE_INFINITY : (box.width / 2) / Math.abs(dx);
		const scaleY = dy === 0 ? Number.POSITIVE_INFINITY : (box.height / 2) / Math.abs(dy);
		const scale = Math.min(scaleX, scaleY);
		return {
			x: center.x + dx * scale,
			y: center.y + dy * scale
		};
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

	private openDocumentProperties(): void {
		if (!this.canvas) {
			return;
		}

		const resolution = this.canvas.getResolution();
		new SvgDocumentPropertiesModal(
			this.app,
			{
				title: this.canvas.getDocumentTitle() || this.file.basename,
				width: resolution.w,
				height: resolution.h
			},
			(properties) => this.applyDocumentProperties(properties)
		).open();
	}

	private applyDocumentProperties(properties: { title: string; width: number | 'fit'; height: number | 'fit' }): void {
		if (!this.canvas) {
			return;
		}

		this.canvas.setDocumentTitle(properties.title);
		if (properties.width === 'fit' || properties.height === 'fit') {
			if (!this.canvas.setResolution('fit', 'fit')) {
				new Notice('No content found to fit the document to.');
				return;
			}
			const resolution = this.canvas.getResolution();
			this.canvasWidth = resolution.w;
			this.canvasHeight = resolution.h;
		} else {
			this.resizeCanvas(properties.width, properties.height);
		}
		this.updateCanvasViewport({ center: true });
		this.markDirty('Document properties changed');
	}

	private setBackgroundColor(): void {
		if (!this.canvas) {
			return;
		}

		const color = window.prompt('Background color', '#ffffff');
		if (color === null) {
			return;
		}

		this.backgroundColor = color.trim() || 'none';
		this.backgroundUrl = '';
		this.canvas.setBackground(this.backgroundColor);
		this.markDirty('Background changed');
	}

	private openEditorPreferences(): void {
		new SvgEditorPreferencesModal(
			this.app,
			{
				backgroundColor: this.backgroundColor,
				backgroundUrl: this.backgroundUrl,
				gridSnapping: this.gridSnapping,
				snappingStep: this.snappingStep,
				gridColor: this.gridColor,
				showRulers: this.showRulers,
				baseUnit: this.baseUnit
			},
			(preferences) => this.applyEditorPreferences(preferences)
		).open();
	}

	private applyEditorPreferences(preferences: EditorPreferences): void {
		if (!this.canvas) {
			return;
		}

		this.gridSnapping = preferences.gridSnapping;
		this.snappingStep = preferences.snappingStep;
		this.gridColor = preferences.gridColor;
		this.showRulers = preferences.showRulers;
		this.baseUnit = preferences.baseUnit;
		this.backgroundColor = preferences.backgroundColor;
		this.backgroundUrl = preferences.backgroundUrl;
		this.canvas.setConfig({
			gridSnapping: this.gridSnapping,
			snappingStep: this.snappingStep,
			gridColor: this.gridColor,
			showRulers: this.showRulers,
			baseUnit: this.baseUnit
		});
		this.canvas.setBackground(preferences.backgroundColor, preferences.backgroundUrl || undefined);
		this.updateGridAppearance();
		this.rebuildRulers();
		this.rulers?.display(this.showRulers);
		this.updateCanvasViewport();
		this.markDirty('Editor preferences changed');
	}

	private rebuildRulers(): void {
		if (!this.canvas || !this.canvasHostEl || !this.rulerXEl || !this.rulerYEl || !this.rulerCornerEl) {
			return;
		}

		this.rulers?.destroy();
		this.rulers = new Rulers(this.canvas, {
			workarea: this.canvasHostEl,
			rulerX: this.rulerXEl,
			rulerY: this.rulerYEl,
			rulerCorner: this.rulerCornerEl
		}, this.baseUnit);
	}

	private colorWithAlpha(color: string, alpha: number): string {
		const normalized = color.trim();
		const match = normalized.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
		if (!match) {
			return normalized;
		}

		const hex = match[1].length === 3
			? match[1].split('').map((character) => character + character).join('')
			: match[1];
		const red = Number.parseInt(hex.slice(0, 2), 16);
		const green = Number.parseInt(hex.slice(2, 4), 16);
		const blue = Number.parseInt(hex.slice(4, 6), 16);
		return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
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

	private openExportDialog(): void {
		new SvgExportModal(this.app, async (options) => {
			await this.exportDocument(options);
		}).open();
	}

	private async exportDocument(options: { type: ExportType; quality: number }): Promise<void> {
		if (!this.canvas) {
			return;
		}

		try {
			if (options.type === 'SVG') {
				const svgBlob = new Blob([this.canvas.getSvgString()], { type: 'image/svg+xml;charset=utf-8' });
				this.downloadUrl(URL.createObjectURL(svgBlob), this.exportFileName('svg'), true);
				this.setStatus('SVG exported');
				return;
			}

			if (options.type === 'PDF') {
				const pdf = await this.canvas.exportPDF(this.exportFileName('pdf'), 'dataurlstring');
				if (pdf.output) {
					this.downloadUrl(pdf.output, this.exportFileName('pdf'));
					this.reportExportIssues(pdf.issues);
				}
				this.setStatus('PDF exported');
				return;
			}

			const result = await this.canvas.rasterExport(options.type, options.quality, this.exportFileName(options.type.toLowerCase()), { avoidEvent: true });
			const url = result.bloburl || result.datauri;
			if (!url) {
				throw new Error('Export did not produce a downloadable URL.');
			}
			this.downloadUrl(url, this.exportFileName(options.type.toLowerCase()), Boolean(result.bloburl));
			this.reportExportIssues(result.issues);
			this.setStatus(`${options.type} exported`);
		} catch (error) {
			console.error(error);
			new Notice('Export failed.');
		}
	}

	private exportFileName(extension: string): string {
		const baseName = this.file.basename.replace(/[\\/:*?"<>|]+/g, '-');
		return `${baseName}.${extension}`;
	}

	private downloadUrl(url: string, filename: string, revoke = false): void {
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = filename;
		anchor.rel = 'noopener';
		document.body.append(anchor);
		anchor.click();
		anchor.remove();
		if (revoke) {
			window.setTimeout(() => URL.revokeObjectURL(url), 1000);
		}
	}

	private reportExportIssues(issues?: string[]): void {
		if (issues?.length) {
			new Notice(`Export completed with ${issues.length} warning(s).`);
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
		this.updateGridAppearance(zoom);

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
		this.updateOverview();
	}

	private updateOverview(): void {
		if (!this.canvas || !this.overviewSvgEl) {
			return;
		}

		this.overviewSvgEl.replaceChildren();
		this.overviewSvgEl.setAttribute('viewBox', `0 0 ${this.canvasWidth} ${this.canvasHeight}`);
		this.overviewSvgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
		this.overviewSvgEl.setAttribute('width', String(this.canvasWidth));
		this.overviewSvgEl.setAttribute('height', String(this.canvasHeight));

		const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		background.setAttribute('x', '0');
		background.setAttribute('y', '0');
		background.setAttribute('width', String(this.canvasWidth));
		background.setAttribute('height', String(this.canvasHeight));
		background.setAttribute('fill', this.backgroundColor || '#ffffff');
		this.overviewSvgEl.appendChild(background);

		const content = this.canvas.getSvgContent();
		Array.from(content.children).forEach((child) => {
			if (child.id === 'selectorParentGroup' || child.id === 'canvasBackground') {
				return;
			}
			const clone = child.cloneNode(true) as SVGElement;
			clone.removeAttribute('id');
			clone.style.pointerEvents = 'none';
			this.overviewSvgEl?.appendChild(clone);
		});

		this.updateOverviewViewport();
	}

	private updateOverviewViewport(): void {
		if (!this.canvasHostEl || !this.overviewViewportEl || !this.overviewSvgEl) {
			return;
		}

		const stage = this.overviewSvgEl.parentElement;
		const canvasEl = this.canvasHostEl.querySelector<HTMLElement>('#svgcanvas');
		if (!stage || !canvasEl || canvasEl.clientWidth <= 0 || canvasEl.clientHeight <= 0) {
			return;
		}

		const stageWidth = stage.clientWidth;
		const stageHeight = stage.clientHeight;
		const viewportWidth = Math.max(8, this.canvasHostEl.clientWidth / canvasEl.clientWidth * stageWidth);
		const viewportHeight = Math.max(8, this.canvasHostEl.clientHeight / canvasEl.clientHeight * stageHeight);
		const left = this.canvasHostEl.scrollLeft / canvasEl.clientWidth * stageWidth;
		const top = this.canvasHostEl.scrollTop / canvasEl.clientHeight * stageHeight;

		this.overviewViewportEl.style.width = `${Math.min(stageWidth, viewportWidth)}px`;
		this.overviewViewportEl.style.height = `${Math.min(stageHeight, viewportHeight)}px`;
		this.overviewViewportEl.style.transform = `translate(${Math.min(stageWidth - viewportWidth, Math.max(0, left))}px, ${Math.min(stageHeight - viewportHeight, Math.max(0, top))}px)`;
	}

	private scrollCanvasFromOverview(clientX: number, clientY: number): void {
		if (!this.canvasHostEl || !this.overviewSvgEl) {
			return;
		}

		const stage = this.overviewSvgEl.parentElement;
		const canvasEl = this.canvasHostEl.querySelector<HTMLElement>('#svgcanvas');
		if (!stage || !canvasEl) {
			return;
		}

		const rect = stage.getBoundingClientRect();
		const xRatio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
		const yRatio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
		this.canvasHostEl.scrollLeft = xRatio * canvasEl.clientWidth - this.canvasHostEl.clientWidth / 2;
		this.canvasHostEl.scrollTop = yRatio * canvasEl.clientHeight - this.canvasHostEl.clientHeight / 2;
		this.updateOverviewViewport();
	}

	private updateGridAppearance(zoom = this.canvas?.getZoom() ?? 1): void {
		if (!this.canvasHostEl) {
			return;
		}

		const unit = GRID_UNIT_FACTORS[this.baseUnit] ?? GRID_UNIT_FACTORS.px;
		const unitZoom = unit * zoom || 1;
		const rawMajorInterval = 100 / unitZoom;
		let majorInterval = 1;
		for (const interval of GRID_INTERVALS) {
			majorInterval = interval;
			if (rawMajorInterval <= interval) {
				break;
			}
		}

		const majorPixels = Math.max(majorInterval * unitZoom, 4);
		this.canvasHostEl.style.setProperty('--svg-edit-grid-minor-size', `${majorPixels / 10}px`);
		this.canvasHostEl.style.setProperty('--svg-edit-grid-major-size', `${majorPixels}px`);
		this.canvasHostEl.style.setProperty('--svg-edit-grid-color', this.colorWithAlpha(this.gridColor, 0.22));
		this.canvasHostEl.style.setProperty('--svg-edit-grid-major-color', this.colorWithAlpha(this.gridColor, 0.48));
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
		if (mode === 'eyedropper' && event.button === 0) {
			this.handleEyedropperMouseDown(event);
			return;
		}

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

	private handleEyedropperMouseDown(event: MouseEvent): void {
		if (!this.canvas) {
			return;
		}

		const target = event.target instanceof Element ? event.target : null;
		const element = this.getPaintableTarget(target);
		if (!element) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		event.stopImmediatePropagation();
		if (this.pickedStyle) {
			this.applyPickedStyle(element);
			return;
		}

		this.pickedStyle = this.readPickedStyle(element);
		this.setStatus('Style picked');
	}

	private getPaintableTarget(target: Element | null): Element | null {
		if (!target) {
			return null;
		}

		const element = target.closest('path, rect, circle, ellipse, line, polyline, polygon, text, image');
		if (!element || !this.canvas?.getSvgContent().contains(element)) {
			return null;
		}

		return element;
	}

	private readPickedStyle(element: Element): PickedStyle {
		const attributes = ['fill', 'fill-opacity', 'stroke', 'stroke-opacity', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity'];
		return attributes.reduce<PickedStyle>((style, attribute) => {
			const value = element.getAttribute(attribute);
			if (value !== null) {
				style[attribute] = value;
			}
			return style;
		}, {});
	}

	private applyPickedStyle(element: Element): void {
		if (!this.pickedStyle || !this.canvas) {
			return;
		}

		Object.entries(this.pickedStyle).forEach(([attribute, value]) => {
			element.setAttribute(attribute, value);
		});
		this.canvas.call('changed', [element]);
		this.markDirty('Style applied');
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

	private handleWorkareaDragOver(event: DragEvent): void {
		if (!event.dataTransfer?.types.includes('Files')) {
			return;
		}

		event.preventDefault();
		event.dataTransfer.dropEffect = 'copy';
	}

	private async handleWorkareaDrop(event: DragEvent): Promise<void> {
		const file = event.dataTransfer?.files?.[0];
		if (!file) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		await this.importDroppedFile(file);
	}

	private async importDroppedFile(file: File): Promise<void> {
		if (file.type.includes('svg') || file.name.toLowerCase().endsWith('.svg')) {
			await this.importSvgSource(await file.text());
			return;
		}

		if (file.type.includes('image')) {
			await this.importBitmapFile(file);
			return;
		}

		new Notice('Drop an SVG or image file to import it.');
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
			{ label: 'Paste in Place', action: () => this.pasteSelection(true) },
			{ separator: true, label: '' },
			{ label: 'Duplicate', action: () => this.duplicateSelection(), disabled: !hasSelection },
			{ label: 'Delete', action: () => this.deleteSelection(), disabled: !hasSelection },
			{ separator: true, label: '' },
			{ label: 'Bring to Front', action: () => this.withDirtyAction('Bring to Front', () => this.canvas?.moveToTopSelectedElement()), disabled: !hasSelection },
			{ label: 'Move Up', action: () => this.withDirtyAction('Move Up', () => this.canvas?.moveUpDownSelected('Up')), disabled: !hasSelection },
			{ label: 'Move Down', action: () => this.withDirtyAction('Move Down', () => this.canvas?.moveUpDownSelected('Down')), disabled: !hasSelection },
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

		this.renderContextMenu(items, clientX, clientY);
	}

	private openEditorMenu(clientX: number, clientY: number): void {
		const items: Array<{ label: string; action?: () => void; disabled?: boolean; separator?: boolean }> = [
			{ label: 'Export Image', action: () => this.openExportDialog() },
			{ label: 'Document Properties', action: () => this.openDocumentProperties() },
			{ label: 'Editor Preferences', action: () => this.openEditorPreferences() },
			{ separator: true, label: '' },
			{ label: 'SVG-Edit Homepage', action: () => this.openSvgEditHomepage() }
		];
		this.renderContextMenu(items, clientX, clientY);
	}

	private renderContextMenu(
		items: Array<{ label: string; action?: () => void; disabled?: boolean; separator?: boolean }>,
		clientX: number,
		clientY: number
	): void {
		if (!this.contextMenuEl) {
			return;
		}

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

	private openSvgEditHomepage(): void {
		window.open('https://github.com/SVG-Edit/svgedit', '_blank');
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

	private newDocument(): void {
		if (!this.canvas || !window.confirm('Clear the current SVG and start a new document?')) {
			return;
		}

		this.canvas.clear();
		this.canvas.setResolution(this.canvasWidth, this.canvasHeight);
		this.setMode('select');
		this.refreshLayerPanel();
		this.updateContextPanels();
		this.updateCanvasViewport({ center: true });
		this.markDirty('New document');
	}

	private importSvgFile(): void {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/svg+xml,.svg';
		input.addEventListener('change', async () => {
			const file = input.files?.[0];
			if (!file) {
				return;
			}

			await this.importSvgSource(await file.text());
		});
		input.click();
	}

	private async importSvgSource(source: string): Promise<void> {
		if (!this.canvas) {
			return;
		}

		const imported = this.canvas.importSvgString(source, false);
		if (!imported) {
			new Notice('SVG could not be imported.');
			return;
		}
		this.canvas.alignSelectedElements('middle', 'page');
		this.canvas.alignSelectedElements('center', 'page');
		this.canvas.selectOnly([imported]);
		this.markDirty('SVG imported');
		this.updateContextPanels();
		this.updateCanvasViewport();
	}

	private async importBitmapFile(file: File): Promise<void> {
		if (!this.canvas) {
			return;
		}

		const dataUri = await readFileAsDataUri(file);
		const image = await this.canvas.embedImage(dataUri);
		this.canvas.selectOnly([image]);
		this.canvas.alignSelectedElements('middle', 'page');
		this.canvas.alignSelectedElements('center', 'page');
		this.markDirty('Image imported');
		this.updateContextPanels();
		this.updateCanvasViewport();
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

			await this.importBitmapFile(file);
		});
		input.click();
	}

	private openSourceEditor(): void {
		if (!this.canvas) {
			return;
		}

		new SvgSourceModal(this.app, this.canvas.getSvgString(), this.dynamicSourceOutput, (source) => {
			if (!this.canvas) {
				return;
			}
			this.canvas.clearSelection();
			const loaded = this.canvas.setSvgString(source, false);
			if (!loaded) {
				new Notice('SVG source could not be loaded.');
				return;
			}
			this.markDirty('Source changed');
		}, (enabled) => {
			if (!this.canvas) {
				return '';
			}
			this.dynamicSourceOutput = enabled;
			this.canvas.setConfig({ dynamicOutput: enabled });
			return this.canvas.getSvgString();
		}).open();
	}

	private async save(): Promise<void> {
		if (!this.canvas) {
			return;
		}

		await this.app.vault.modify(this.file, this.canvas.getSvgString());
		this.dirty = false;
		this.clearStoredDraft();
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
				this.redo();
			} else {
				this.undo();
			}
			return;
		}

		if (!isTyping && modifier && key === 'y') {
			this.consumeShortcut(event);
			this.redo();
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

		if (!isTyping && modifier && key === 'arrowleft') {
			this.consumeShortcut(event);
			this.rotateSelectionBy(event.shiftKey ? -5 : -1);
			return;
		}

		if (!isTyping && modifier && key === 'arrowright') {
			this.consumeShortcut(event);
			this.rotateSelectionBy(event.shiftKey ? 5 : 1);
			return;
		}

		if (!isTyping && modifier && key === ']') {
			this.consumeShortcut(event);
			this.withDirtyAction('Moved up', () => this.canvas?.moveUpDownSelected('Up'));
			return;
		}

		if (!isTyping && modifier && key === '[') {
			this.consumeShortcut(event);
			this.withDirtyAction('Moved down', () => this.canvas?.moveUpDownSelected('Down'));
			return;
		}

		if (!isTyping && key === 'u') {
			this.consumeShortcut(event);
			this.openSourceEditor();
			return;
		}

		if (isTyping) {
			return;
		}

		if (event.code === 'Space' && !event.repeat) {
			this.consumeShortcut(event);
			this.startTemporaryPanning();
			return;
		}

		if (key === 'escape') {
			this.consumeShortcut(event);
			if (this.canvas?.getCurrentGroup()) {
				this.leaveCurrentContext();
				return;
			}
			this.cancelCurrentTool();
			return;
		}

		if (key === 'tab') {
			this.consumeShortcut(event);
			this.cycleSelection(event.shiftKey ? 0 : 1);
			return;
		}

		if (key.startsWith('arrow')) {
			this.consumeShortcut(event);
			const distance = event.shiftKey ? 10 : 1;
			const deltaByKey: Record<string, { x: number; y: number }> = {
				arrowup: { x: 0, y: -distance },
				arrowdown: { x: 0, y: distance },
				arrowleft: { x: -distance, y: 0 },
				arrowright: { x: distance, y: 0 }
			};
			const delta = deltaByKey[key];
			if (delta) {
				if (event.altKey) {
					this.cloneSelectionBy(delta.x, delta.y);
				} else if (!modifier) {
					this.moveSelectionBy(delta.x, delta.y);
				}
			}
			return;
		}

		if (modifier || event.altKey) {
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

	private handleKeyup(event: KeyboardEvent): void {
		const target = event.target instanceof Element ? event.target : null;
		if (!this.shouldHandleKeydown(event, target) || this.isEditableKeyTarget(target)) {
			return;
		}

		if (event.code === 'Space') {
			this.consumeShortcut(event);
			this.stopTemporaryPanning();
		}
	}

	private startTemporaryPanning(): void {
		if (!this.canvas || this.spacePanPreviousMode !== null) {
			return;
		}

		const mode = this.canvas.getMode();
		if (mode === 'ext-panning') {
			return;
		}

		this.spacePanPreviousMode = mode;
		this.setMode('ext-panning');
	}

	private stopTemporaryPanning(): void {
		if (!this.canvas || this.spacePanPreviousMode === null) {
			return;
		}

		const previousMode = this.spacePanPreviousMode || 'select';
		this.spacePanPreviousMode = null;
		if (this.canvas.getMode() === 'ext-panning') {
			this.setMode(previousMode);
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
		this.scheduleStoredDraft();
		this.setStatus(`${message} - unsaved`);
	}

	private setStatus(message: string): void {
		if (!this.statusEl) {
			return;
		}

		this.statusEl.setText(this.dirty ? `${message} *` : message);
	}

	private storedDraftKey(): string {
		return `svgeditor:draft:${this.file.path}`;
	}

	private restoreStoredDraftIfWanted(currentSource: string): void {
		const draft = this.readStoredDraft();
		if (!draft || !this.canvas || draft.source.trim() === currentSource.trim()) {
			return;
		}

		const date = new Date(draft.updatedAt);
		const restore = window.confirm(`A local SVG draft from ${date.toLocaleString()} was found for ${this.file.name}. Restore it?`);
		if (!restore) {
			this.clearStoredDraft();
			return;
		}

		const loaded = this.canvas.setSvgString(draft.source, true);
		if (!loaded) {
			this.clearStoredDraft();
			new Notice('Stored SVG draft could not be restored.');
			return;
		}

		this.dirty = true;
		this.setStatus('Restored local draft');
		this.updateRulers();
		this.updateOverview();
		this.updateContextPanels();
	}

	private readStoredDraft(): StoredDraft | null {
		try {
			const raw = window.localStorage.getItem(this.storedDraftKey());
			if (!raw) {
				return null;
			}
			const parsed = JSON.parse(raw) as Partial<StoredDraft>;
			if (typeof parsed.source !== 'string' || typeof parsed.updatedAt !== 'number') {
				return null;
			}
			return {
				source: parsed.source,
				updatedAt: parsed.updatedAt,
				filePath: typeof parsed.filePath === 'string' ? parsed.filePath : this.file.path
			};
		} catch (error) {
			console.error(error);
			return null;
		}
	}

	private scheduleStoredDraft(): void {
		if (this.draftSaveTimer !== null) {
			window.clearTimeout(this.draftSaveTimer);
		}
		this.draftSaveTimer = window.setTimeout(() => {
			this.draftSaveTimer = null;
			this.flushStoredDraft();
		}, 500);
	}

	private flushStoredDraft(): void {
		if (!this.canvas || !this.dirty) {
			return;
		}

		const draft: StoredDraft = {
			source: this.canvas.getSvgString(),
			updatedAt: Date.now(),
			filePath: this.file.path
		};
		try {
			window.localStorage.setItem(this.storedDraftKey(), JSON.stringify(draft));
		} catch (error) {
			console.error(error);
		}
	}

	private clearStoredDraft(): void {
		if (this.draftSaveTimer !== null) {
			window.clearTimeout(this.draftSaveTimer);
			this.draftSaveTimer = null;
		}
		try {
			window.localStorage.removeItem(this.storedDraftKey());
		} catch (error) {
			console.error(error);
		}
	}
}

type DocumentProperties = {
	title: string;
	width: number | 'fit';
	height: number | 'fit';
};

type EditorPreferences = {
	backgroundColor: string;
	backgroundUrl: string;
	gridSnapping: boolean;
	snappingStep: number;
	gridColor: string;
	showRulers: boolean;
	baseUnit: string;
};

type ExportType = 'SVG' | 'PNG' | 'JPEG' | 'BMP' | 'WEBP' | 'PDF';

class SvgDocumentPropertiesModal extends Modal {
	private readonly properties: DocumentProperties;
	private readonly onApply: (properties: DocumentProperties) => void;

	constructor(app: App, properties: DocumentProperties, onApply: (properties: DocumentProperties) => void) {
		super(app);
		this.properties = properties;
		this.onApply = onApply;
	}

	onOpen() {
		this.modalEl.addClass('svg-document-properties-modal');
		this.titleEl.setText('Document Properties');

		const form = this.contentEl.createDiv({ cls: 'svg-document-properties-form' });
		const titleInput = this.addTextField(form, 'Title', this.properties.title);
		const widthInput = this.addNumberField(form, 'Width', this.properties.width === 'fit' ? 100 : this.properties.width);
		const heightInput = this.addNumberField(form, 'Height', this.properties.height === 'fit' ? 100 : this.properties.height);
		const presetSelect = form.createEl('select', {
			attr: {
				'aria-label': 'Predefined resolution'
			}
		});
		[
			{ label: 'Custom', value: '' },
			{ label: '640x480', value: '640x480' },
			{ label: '800x600', value: '800x600' },
			{ label: '1024x768', value: '1024x768' },
			{ label: '1280x960', value: '1280x960' },
			{ label: '1600x1200', value: '1600x1200' },
			{ label: 'Fit to content', value: 'content' }
		].forEach((option) => {
			presetSelect.createEl('option', { text: option.label, value: option.value });
		});
		presetSelect.addEventListener('change', () => {
			if (presetSelect.value === 'content') {
				widthInput.value = 'fit';
				heightInput.value = 'fit';
				widthInput.disabled = true;
				heightInput.disabled = true;
				return;
			}
			widthInput.disabled = false;
			heightInput.disabled = false;
			if (!presetSelect.value) {
				return;
			}
			const [width, height] = presetSelect.value.split('x');
			widthInput.value = width;
			heightInput.value = height;
		});

		const actions = this.contentEl.createDiv({ cls: 'svg-document-properties-actions' });
		const cancelButton = actions.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => this.close());
		const applyButton = actions.createEl('button', { text: 'OK' });
		applyButton.addEventListener('click', () => {
			const width = widthInput.value === 'fit' ? 'fit' : Number(widthInput.value);
			const height = heightInput.value === 'fit' ? 'fit' : Number(heightInput.value);
			if ((width !== 'fit' && (!Number.isFinite(width) || width <= 0)) || (height !== 'fit' && (!Number.isFinite(height) || height <= 0))) {
				new Notice('Document dimensions must be positive numbers.');
				return;
			}
			this.onApply({
				title: titleInput.value,
				width,
				height
			});
			this.close();
		});
	}

	onClose() {
		this.contentEl.empty();
	}

	private addTextField(parentEl: HTMLElement, label: string, value: string): HTMLInputElement {
		const wrapper = parentEl.createEl('label', { cls: 'svg-document-properties-field' });
		wrapper.createSpan({ text: label });
		return wrapper.createEl('input', {
			attr: {
				type: 'text',
				value
			}
		});
	}

	private addNumberField(parentEl: HTMLElement, label: string, value: number): HTMLInputElement {
		const wrapper = parentEl.createEl('label', { cls: 'svg-document-properties-field' });
		wrapper.createSpan({ text: label });
		return wrapper.createEl('input', {
			attr: {
				type: 'text',
				inputmode: 'numeric',
				value: String(value)
			}
		});
	}
}

class SvgEditorPreferencesModal extends Modal {
	private readonly preferences: EditorPreferences;
	private readonly onApply: (preferences: EditorPreferences) => void;

	constructor(app: App, preferences: EditorPreferences, onApply: (preferences: EditorPreferences) => void) {
		super(app);
		this.preferences = preferences;
		this.onApply = onApply;
	}

	onOpen() {
		this.modalEl.addClass('svg-editor-preferences-modal');
		this.titleEl.setText('Editor Preferences');

		const form = this.contentEl.createDiv({ cls: 'svg-editor-preferences-form' });
		const backgroundColorInput = this.addColorField(form, 'Background', this.preferences.backgroundColor);
		const backgroundUrlInput = this.addTextField(form, 'Background URL', this.preferences.backgroundUrl);
		const gridSnappingInput = this.addCheckboxField(form, 'Grid snapping', this.preferences.gridSnapping);
		const snappingStepInput = this.addNumberField(form, 'Snap step', this.preferences.snappingStep, 1);
		const gridColorInput = this.addColorField(form, 'Grid color', this.preferences.gridColor);
		const showRulersInput = this.addCheckboxField(form, 'Show rulers', this.preferences.showRulers);
		const baseUnitSelect = this.addSelectField(form, 'Base unit', [
			{ label: 'Pixels', value: 'px' },
			{ label: 'Centimeters', value: 'cm' },
			{ label: 'Millimeters', value: 'mm' },
			{ label: 'Inches', value: 'in' },
			{ label: 'Points', value: 'pt' },
			{ label: 'Picas', value: 'pc' }
		], this.preferences.baseUnit);

		const actions = this.contentEl.createDiv({ cls: 'svg-editor-preferences-actions' });
		const cancelButton = actions.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => this.close());
		const applyButton = actions.createEl('button', { text: 'OK' });
		applyButton.addEventListener('click', () => {
			const snappingStep = Number(snappingStepInput.value);
			if (!Number.isFinite(snappingStep) || snappingStep <= 0) {
				new Notice('Snap step must be a positive number.');
				return;
			}

			this.onApply({
				backgroundColor: backgroundColorInput.value,
				backgroundUrl: backgroundUrlInput.value.trim(),
				gridSnapping: gridSnappingInput.checked,
				snappingStep,
				gridColor: gridColorInput.value,
				showRulers: showRulersInput.checked,
				baseUnit: baseUnitSelect.value
			});
			this.close();
		});
	}

	onClose() {
		this.contentEl.empty();
	}

	private addTextField(parentEl: HTMLElement, label: string, value: string): HTMLInputElement {
		const wrapper = parentEl.createEl('label', { cls: 'svg-editor-preferences-field' });
		wrapper.createSpan({ text: label });
		return wrapper.createEl('input', {
			attr: {
				type: 'text',
				value
			}
		});
	}

	private addNumberField(parentEl: HTMLElement, label: string, value: number, min: number): HTMLInputElement {
		const wrapper = parentEl.createEl('label', { cls: 'svg-editor-preferences-field' });
		wrapper.createSpan({ text: label });
		return wrapper.createEl('input', {
			attr: {
				type: 'number',
				min: String(min),
				step: '1',
				value: String(value)
			}
		});
	}

	private addColorField(parentEl: HTMLElement, label: string, value: string): HTMLInputElement {
		const wrapper = parentEl.createEl('label', { cls: 'svg-editor-preferences-field' });
		wrapper.createSpan({ text: label });
		return wrapper.createEl('input', {
			attr: {
				type: 'color',
				value: /^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'
			}
		});
	}

	private addCheckboxField(parentEl: HTMLElement, label: string, checked: boolean): HTMLInputElement {
		const wrapper = parentEl.createEl('label', { cls: 'svg-editor-preferences-field svg-editor-preferences-checkbox' });
		wrapper.createSpan({ text: label });
		const input = wrapper.createEl('input', {
			attr: {
				type: 'checkbox'
			}
		});
		input.checked = checked;
		return input;
	}

	private addSelectField(
		parentEl: HTMLElement,
		label: string,
		options: Array<{ label: string; value: string }>,
		value: string
	): HTMLSelectElement {
		const wrapper = parentEl.createEl('label', { cls: 'svg-editor-preferences-field' });
		wrapper.createSpan({ text: label });
		const select = wrapper.createEl('select');
		options.forEach((option) => {
			select.createEl('option', { text: option.label, value: option.value });
		});
		select.value = value;
		return select;
	}
}

class SvgExportModal extends Modal {
	private readonly onExport: (options: { type: ExportType; quality: number }) => Promise<void>;

	constructor(app: App, onExport: (options: { type: ExportType; quality: number }) => Promise<void>) {
		super(app);
		this.onExport = onExport;
	}

	onOpen() {
		this.modalEl.addClass('svg-export-modal');
		this.titleEl.setText('Export');

		const form = this.contentEl.createDiv({ cls: 'svg-export-form' });
		const typeField = form.createEl('label', { cls: 'svg-export-field' });
		typeField.createSpan({ text: 'Type' });
		const typeSelect = typeField.createEl('select');
		(['SVG', 'PNG', 'JPEG', 'BMP', 'WEBP', 'PDF'] as ExportType[]).forEach((type) => {
			typeSelect.createEl('option', { text: type, value: type });
		});

		const qualityField = form.createEl('label', { cls: 'svg-export-field' });
		qualityField.createSpan({ text: 'Quality' });
		const qualityInput = qualityField.createEl('input', {
			attr: {
				type: 'number',
				min: '0',
				max: '100',
				step: '5',
				value: '100'
			}
		});
		const updateQualityVisibility = () => {
			qualityField.toggleClass('is-hidden', ['SVG', 'PDF', 'BMP', 'PNG'].includes(typeSelect.value));
		};
		typeSelect.addEventListener('change', updateQualityVisibility);
		updateQualityVisibility();

		const actions = this.contentEl.createDiv({ cls: 'svg-export-actions' });
		const cancelButton = actions.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => this.close());
		const exportButton = actions.createEl('button', { text: 'Export' });
		exportButton.addEventListener('click', async () => {
			const quality = Math.max(0, Math.min(100, Number(qualityInput.value) || 100)) / 100;
			await this.onExport({ type: typeSelect.value as ExportType, quality });
			this.close();
		});
	}

	onClose() {
		this.contentEl.empty();
	}
}

class SvgSourceModal extends Modal {
	private readonly source: string;
	private readonly dynamicOutput: boolean;
	private readonly onApply: (source: string) => void;
	private readonly onDynamicOutputChange: (enabled: boolean) => string;

	constructor(
		app: App,
		source: string,
		dynamicOutput: boolean,
		onApply: (source: string) => void,
		onDynamicOutputChange: (enabled: boolean) => string
	) {
		super(app);
		this.source = source;
		this.dynamicOutput = dynamicOutput;
		this.onApply = onApply;
		this.onDynamicOutputChange = onDynamicOutputChange;
	}

	onOpen() {
		this.modalEl.addClass('svg-source-modal');
		this.titleEl.setText('SVG Source');
		const textarea = this.contentEl.createEl('textarea', {
			cls: 'svg-source-editor',
			text: this.source
		});
		const optionRow = this.contentEl.createDiv({ cls: 'svg-source-options' });
		const dynamicLabel = optionRow.createEl('label', { cls: 'svg-source-option' });
		const dynamicCheckbox = dynamicLabel.createEl('input', {
			attr: {
				type: 'checkbox'
			}
		});
		dynamicCheckbox.checked = this.dynamicOutput;
		dynamicLabel.createSpan({ text: 'Dynamic size' });
		dynamicCheckbox.addEventListener('change', () => {
			textarea.value = this.onDynamicOutputChange(dynamicCheckbox.checked);
		});

		const actions = this.contentEl.createDiv({ cls: 'svg-source-actions' });
		const copyButton = actions.createEl('button', { text: 'Copy' });
		copyButton.addEventListener('click', async () => {
			try {
				await navigator.clipboard.writeText(textarea.value);
				new Notice('SVG source copied to clipboard.');
			} catch (error) {
				console.error(error);
				new Notice('Clipboard access is unavailable.');
			}
		});
		const cancelButton = actions.createEl('button', { text: 'Cancel' });
		cancelButton.addEventListener('click', () => this.close());
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
