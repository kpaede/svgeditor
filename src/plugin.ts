import { Menu, Plugin, TAbstractFile, TFile } from 'obsidian';
import { DEFAULT_SETTINGS, SvgEditorSettings } from './settings';
import { createBlankSvg } from './svg/blank-svg';
import { SvgEditModal } from './ui/svg-edit-modal';
import { buildVaultPath } from './utils/path';

export default class SvgEditPlugin extends Plugin {
	settings: SvgEditorSettings;

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
			name: 'Aktuelle SVG bearbeiten',
			checkCallback: (checking) => {
				const file = this.getActiveSvgFile();
				if (!file) {
					return false;
				}

				if (!checking) {
					this.openSvgEditor(file);
				}

				return true;
			}
		});

		this.addCommand({
			id: 'create-svg',
			name: 'Neue SVG erstellen',
			callback: () => {
				this.createAndOpenSvg();
			}
		});

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu: Menu, file: TAbstractFile) => {
				if (file instanceof TFile && file.extension.toLowerCase() === 'svg') {
					menu.addItem((item) => {
						item
							.setTitle('Mit SVGEdit bearbeiten')
							.setIcon('image')
							.onClick(() => this.openSvgEditor(file));
					});
				}
			})
		);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
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
}
