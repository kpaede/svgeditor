import { DEFAULT_SETTINGS, SvgEditorSettings } from '../settings';

export const SVG_MIME_PLACEHOLDER = createBlankSvg(DEFAULT_SETTINGS);

export function createBlankSvg(settings: SvgEditorSettings): string {
	const { defaultWidth, defaultHeight } = settings;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${defaultWidth}" height="${defaultHeight}" viewBox="0 0 ${defaultWidth} ${defaultHeight}">
  <rect width="100%" height="100%" fill="#ffffff"/>
</svg>
`;
}
