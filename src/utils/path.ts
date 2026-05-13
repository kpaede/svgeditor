import { normalizePath } from 'obsidian';

export function buildVaultPath(folder: string, fileName: string): string {
	return normalizePath(folder ? `${folder}/${fileName}` : fileName);
}
