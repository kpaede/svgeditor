import { App, Menu, Plugin, PluginSettingTab, Setting, TAbstractFile, TFile, setIcon } from 'obsidian';
import { DEFAULT_SETTINGS, SvgEditorSettings } from './settings';
import { createBlankSvg } from './svg/blank-svg';
import { SvgEditModal } from './ui/svg-edit-modal';
import { buildVaultPath } from './utils/path';

export default class SvgEditPlugin extends Plugin {
	settings!: SvgEditorSettings;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('image', 'SVG bearbeiten', async () => {
			const activeSvg = this.getActiveSvgFile();
			if (activeSvg) {
				await this.openSvgEditor(activeSvg);
				return;
			}

			await this.createAndOpenSvg();
		});

		this.addCommand({
			id: 'open-active-svg-editor',
			name: 'Edit currently active SVG',
			checkCallback: (checking) => {
				const file = this.getActiveSvgFile();
				if (!file) {
					return false;
				}

				if (!checking) {
					void this.openSvgEditor(file);
				}

				return true;
			}
		});

		this.addCommand({
			id: 'create-svg',
			name: 'Create new SVG',
			callback: () => {
				void this.createAndOpenSvg();
			}
		});

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu: Menu, file: TAbstractFile) => {
				if (file instanceof TFile && file.extension.toLowerCase() === 'svg') {
					menu.addItem((item) => {
						item
							.setTitle('Mit SVGEdit bearbeiten')
							.setIcon('image')
							.onClick(() => { void this.openSvgEditor(file); });
					});
				}
			})
		);

		this.registerMarkdownPostProcessor((el, ctx) => {
			this.decorateSvgEditButtons(el, ctx.sourcePath);
		});
		this.registerEvent(this.app.workspace.on('layout-change', () => {
			this.decorateSvgEditButtons(activeDocument.body);
		}));
		this.addSettingTab(new SvgEditorSettingTab(this.app, this));
	}

	async loadSettings() {
		const savedData = await this.loadData() as Partial<SvgEditorSettings>;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	refreshInlineEditButtons(): void {
		this.removeInlineEditButtons(activeDocument.body);
		if (this.settings.showInlineEditButton) {
			this.decorateSvgEditButtons(activeDocument.body);
		}
	}

	private getActiveSvgFile(): TFile | null {
		const file = this.app.workspace.getActiveFile();
		return file instanceof TFile && file.extension.toLowerCase() === 'svg' ? file : null;
	}

	private async createAndOpenSvg(): Promise<void> {
		const folder = this.app.workspace.getActiveFile()?.parent?.path ?? '';
		const path = await this.getAvailableSvgPath(folder);
		const file = await this.app.vault.create(path, createBlankSvg(this.settings));
		await this.openSvgEditor(file);
	}

	private async getAvailableSvgPath(folder: string): Promise<string> {
		let index = 1;
		let path = buildVaultPath(folder, 'Untitled.svg');

		while (this.app.vault.getAbstractFileByPath(path)) {
			index += 1;
			path = buildVaultPath(folder, `Untitled ${index}.svg`);
		}

		return path;
	}

	private async openSvgEditor(file: TFile): Promise<void> {
		new SvgEditModal(this.app, file, createBlankSvg(this.settings)).open();
	}

	private decorateSvgEditButtons(containerEl: HTMLElement, sourcePath = ''): void {
		if (!this.settings.showInlineEditButton) {
			return;
		}

		containerEl.querySelectorAll<HTMLImageElement>('img').forEach((imgEl) => {
			if (imgEl.closest('.svg-editor-inline-wrapper') || imgEl.closest('.svg-editor-inline-host')?.querySelector('.svg-editor-inline-edit-button')) {
				return;
			}

			const targetFile = this.resolveSvgFileForImage(imgEl, sourcePath);
			if (!targetFile) {
				return;
			}

			const hostEl = imgEl.closest<HTMLElement>('.internal-embed, .image-embed, .markdown-embed, a') ?? imgEl.parentElement;
			if (!hostEl) {
				return;
			}
			hostEl.addClass('svg-editor-inline-host');

			const buttonEl = activeDocument.createElement('button');
			buttonEl.type = 'button';
			buttonEl.className = 'svg-editor-inline-edit-button';
			buttonEl.setAttribute('aria-label', `Edit ${targetFile.basename}`);
			buttonEl.setAttribute('title', `Edit ${targetFile.basename}`);
			setIcon(buttonEl, 'pencil');
			let opened = false;
			const stopEmbedClick = (event: Event) => {
				event.preventDefault();
				event.stopPropagation();
				event.stopImmediatePropagation();
			};
			buttonEl.addEventListener('pointerdown', (event: PointerEvent) => {
				stopEmbedClick(event);
				if (opened) {
					return;
				}
				opened = true;
				window.setTimeout(() => {
					void this.openSvgEditor(targetFile);
					opened = false;
				}, 0);
			}, { capture: true });
			['mousedown', 'mouseup', 'dblclick'].forEach((eventName) => {
				buttonEl.addEventListener(eventName, stopEmbedClick, { capture: true });
			});
			buttonEl.addEventListener('click', (event: MouseEvent) => {
				stopEmbedClick(event);
			}, { capture: true });
			hostEl.appendChild(buttonEl);
		});
	}

	private removeInlineEditButtons(containerEl: HTMLElement): void {
		containerEl.querySelectorAll<HTMLElement>('.svg-editor-inline-edit-button').forEach((buttonEl) => buttonEl.remove());
		containerEl.querySelectorAll<HTMLElement>('.svg-editor-inline-host').forEach((hostEl) => hostEl.removeClass('svg-editor-inline-host'));
		containerEl.querySelectorAll<HTMLElement>('.svg-editor-inline-wrapper').forEach((wrapperEl) => {
			const wrappedEl = wrapperEl.querySelector<HTMLElement>('a, img');
			if (wrappedEl && wrapperEl.parentElement) {
				wrapperEl.parentElement.insertBefore(wrappedEl, wrapperEl);
			}
			wrapperEl.remove();
		});
	}

	private resolveSvgFileForImage(imgEl: HTMLImageElement, sourcePath: string): TFile | null {
		const linkEl = imgEl.closest('a');
		const candidates = [
			imgEl.getAttribute('alt'),
			imgEl.getAttribute('data-href'),
			imgEl.getAttribute('src'),
			linkEl?.getAttribute('href')
		].filter((value): value is string => Boolean(value));

		for (const candidate of candidates) {
			const file = this.resolveSvgFile(candidate, sourcePath);
			if (file) {
				return file;
			}
		}

		return null;
	}

	private resolveSvgFile(candidate: string, sourcePath: string): TFile | null {
		const normalized = this.extractSvgPathCandidate(candidate);
		const direct = this.app.metadataCache.getFirstLinkpathDest(normalized, sourcePath);
		if (direct instanceof TFile && direct.extension.toLowerCase() === 'svg') {
			return direct;
		}

		const decoded = decodeURIComponent(normalized).replace(/^\/+/, '');
		return this.app.vault.getFiles().find((file) => {
			if (file.extension.toLowerCase() !== 'svg') {
				return false;
			}
			return file.path === decoded
				|| file.path.endsWith(`/${decoded}`)
				|| decoded.endsWith(`/${file.path}`)
				|| file.name === decoded;
		}) ?? null;
	}

	private extractSvgPathCandidate(candidate: string): string {
		const withoutQuery = candidate.split(/[?#]/)[0];
		const decoded = decodeURIComponent(withoutQuery);
		const svgIndex = decoded.toLowerCase().indexOf('.svg');
		if (svgIndex === -1) {
			return decoded;
		}
		const throughExtension = decoded.slice(0, svgIndex + 4);
		const appPathMatch = throughExtension.match(/app:\/\/[^/]+\/(.+)$/);
		return (appPathMatch?.[1] ?? throughExtension).replace(/^\/+/, '');
	}
}

class SvgEditorSettingTab extends PluginSettingTab {
	constructor(app: App, private readonly plugin: SvgEditPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		new Setting(containerEl).setName('SVG Editor').setHeading();

		new Setting(containerEl)
			.setName('Show inline edit button')
			.setDesc('Show a pencil button at the top-right of rendered SVG files so they can be opened directly in the SVG editor.')
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.showInlineEditButton)
					.onChange(async (value) => {
						this.plugin.settings.showInlineEditButton = value;
						await this.plugin.saveSettings();
						this.plugin.refreshInlineEditButtons();
					});
			});
	}
}
