import SvgCanvas from '@svgedit/svgcanvas';
import { SvgCanvasWithExtras } from '../svg/types';

type Axis = 'x' | 'y';

type RulerElements = {
	workarea: HTMLElement;
	rulerX: HTMLElement;
	rulerY: HTMLElement;
	rulerCorner: HTMLElement;
};

const UNIT_FACTORS: Record<string, number> = {
	px: 1,
	in: 96,
	cm: 96 / 2.54,
	mm: 96 / 25.4,
	pt: 96 / 72,
	pc: 16,
	em: 16,
	ex: 8
};

export class Rulers {
	private readonly rulerIntervals: number[] = [];
	private readonly svgCanvas: SvgCanvasWithExtras;
	private readonly workarea: HTMLElement;
	private readonly rulerX: HTMLElement;
	private readonly rulerY: HTMLElement;
	private readonly rulerCorner: HTMLElement;
	private readonly baseUnit: string;
	private readonly scrollHandler = () => this.manageScroll();
	private readonly resizeObserver: ResizeObserver;
	private animationFrame = 0;

	constructor(svgCanvas: SvgCanvasWithExtras, elements: RulerElements, baseUnit = 'px') {
		for (let interval = 0.1; interval < 1e5; interval *= 10) {
			this.rulerIntervals.push(interval, 2 * interval, 5 * interval);
		}

		this.svgCanvas = svgCanvas;
		this.workarea = elements.workarea;
		this.rulerX = elements.rulerX;
		this.rulerY = elements.rulerY;
		this.rulerCorner = elements.rulerCorner;
		this.baseUnit = baseUnit;
		this.workarea.addEventListener('scroll', this.scrollHandler);
		this.resizeObserver = new ResizeObserver(() => this.requestUpdate());
		this.resizeObserver.observe(this.workarea);
		this.resizeObserver.observe(this.rulerX);
		this.resizeObserver.observe(this.rulerY);
	}

	destroy(): void {
		this.workarea.removeEventListener('scroll', this.scrollHandler);
		this.resizeObserver.disconnect();
		if (this.animationFrame) {
			cancelAnimationFrame(this.animationFrame);
			this.animationFrame = 0;
		}
	}

	display(on: boolean): void {
		[this.rulerX, this.rulerY, this.rulerCorner].forEach((element) => {
			element.toggleClass('is-hidden', !on);
		});
	}

	manageScroll(): void {
		this.rulerX.scrollLeft = this.workarea.scrollLeft;
		this.rulerY.scrollTop = this.workarea.scrollTop;
	}

	requestUpdate(): void {
		if (this.animationFrame) {
			cancelAnimationFrame(this.animationFrame);
		}
		this.animationFrame = requestAnimationFrame(() => {
			this.animationFrame = requestAnimationFrame(() => {
				this.animationFrame = 0;
				this.updateRulers();
			});
		});
	}

	updateRulers(zoom = this.svgCanvas.getZoom()): void {
		this.drawAxis('x', zoom);
		this.drawAxis('y', zoom);
		this.manageScroll();
	}

	private drawAxis(axis: Axis, zoom: number): void {
		const isX = axis === 'x';
		const rulerEl = isX ? this.rulerX : this.rulerY;
		const canvas = this.prepareCanvas(rulerEl, axis);
		const totalLength = isX
			? Math.max(this.workarea.scrollWidth, this.workarea.clientWidth)
			: Math.max(this.workarea.scrollHeight, this.workarea.clientHeight);
		if (!Number.isFinite(totalLength) || totalLength <= 0) {
			return;
		}

		if (isX) {
			canvas.width = Math.ceil(totalLength);
			canvas.height = 15;
			canvas.style.width = `${Math.ceil(totalLength)}px`;
			canvas.style.height = '15px';
			(canvas.parentElement as HTMLElement).style.width = `${Math.ceil(totalLength)}px`;
		} else {
			canvas.width = 15;
			canvas.height = Math.ceil(totalLength);
			canvas.style.width = '15px';
			canvas.style.height = `${Math.ceil(totalLength)}px`;
			(canvas.parentElement as HTMLElement).style.height = `${Math.ceil(totalLength)}px`;
		}

		const context = canvas.getContext('2d');
		if (!context) {
			return;
		}
		this.paintAxis(context, canvas, axis, totalLength, zoom);
	}

	private prepareCanvas(rulerEl: HTMLElement, axis: Axis): HTMLCanvasElement {
		let inner = rulerEl.querySelector<HTMLElement>('.svg-edit-ruler-inner');
		if (!inner) {
			inner = rulerEl.createDiv({ cls: 'svg-edit-ruler-inner' });
		}

		const oldCanvas = inner.querySelector('canvas');
		const canvas = document.createElement('canvas');
		if (oldCanvas) {
			oldCanvas.replaceWith(canvas);
		} else {
			inner.append(canvas);
		}
		canvas.width = axis === 'x' ? Math.max(this.workarea.clientWidth, 1) : 15;
		canvas.height = axis === 'x' ? 15 : Math.max(this.workarea.clientHeight, 1);
		return canvas;
	}

	private paintAxis(
		context: CanvasRenderingContext2D,
		canvas: HTMLCanvasElement,
		axis: Axis,
		totalLength: number,
		zoom: number
	): void {
		const isX = axis === 'x';
		const contentElem = this.svgCanvas.getSvgContent();
		const contentPosition = Number(contentElem.getAttribute(axis)) || 0;
		const unit = UNIT_FACTORS[this.baseUnit] ?? UNIT_FACTORS.px;
		const unitZoom = unit * zoom || 1;
		const rawMajorInterval = 50 / unitZoom;
		let majorInterval = 1;

		for (const interval of this.rulerIntervals) {
			majorInterval = interval;
			if (rawMajorInterval <= interval) {
				break;
			}
		}

		const majorPixels = majorInterval * unitZoom;
		let rulerPosition = ((contentPosition / unitZoom) % majorInterval) * unitZoom;
		let labelPosition = rulerPosition - majorPixels;

		context.clearRect(0, 0, canvas.width, canvas.height);
		context.fillStyle = '#d7d7d7';
		context.fillRect(0, 0, canvas.width, canvas.height);
		context.strokeStyle = '#777';
		context.beginPath();
		if (isX) {
			context.moveTo(0, 15.5);
			context.lineTo(totalLength, 15.5);
		} else {
			context.moveTo(15.5, 0);
			context.lineTo(15.5, totalLength);
		}
		context.stroke();
		context.strokeStyle = '#111';
		context.fillStyle = '#111';
		context.lineWidth = 1;
		context.font = '9px sans-serif';
		context.beginPath();

		while (rulerPosition < totalLength) {
			labelPosition += majorPixels;
			const current = Math.round(rulerPosition) + 0.5;
			if (isX) {
				context.moveTo(current, 15);
				context.lineTo(current, 0);
			} else {
				context.moveTo(15, current);
				context.lineTo(0, current);
			}

			const label = this.formatLabel((labelPosition - contentPosition) / unitZoom, majorInterval);
			if (isX) {
				context.fillText(label, rulerPosition + 2, 8);
			} else {
				String(label).split('').forEach((character, index) => {
					context.fillText(character, 1, rulerPosition + 9 + index * 9);
				});
			}

			const minorPixels = majorPixels / 10;
			for (let index = 1; index < 10; index++) {
				const minor = Math.round(rulerPosition + minorPixels * index) + 0.5;
				const lineLength = index % 2 ? 12 : 10;
				if (isX) {
					context.moveTo(minor, 15);
					context.lineTo(minor, lineLength);
				} else {
					context.moveTo(15, minor);
					context.lineTo(lineLength, minor);
				}
			}

			rulerPosition += majorPixels;
		}

		context.stroke();
	}

	private formatLabel(value: number, majorInterval: number): string {
		let label: number | string;
		if (majorInterval >= 1) {
			label = Math.round(value);
		} else {
			const decimals = String(majorInterval).split('.')[1]?.length ?? 0;
			label = value.toFixed(decimals);
		}

		if (Number(label) !== 0 && Number(label) !== 1000 && Number(label) % 1000 === 0) {
			return `${Number(label) / 1000}K`;
		}

		return String(label);
	}
}
