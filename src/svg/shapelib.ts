import * as animal from './shapelib/animal.json';
import * as arrow from './shapelib/arrow.json';
import * as basic from './shapelib/basic.json';
import * as dialogBalloon from './shapelib/dialog_balloon.json';
import * as electronics from './shapelib/electronics.json';
import * as flowchart from './shapelib/flowchart.json';
import * as game from './shapelib/game.json';
import * as math from './shapelib/math.json';
import * as misc from './shapelib/misc.json';
import * as music from './shapelib/music.json';
import * as object from './shapelib/object.json';
import * as raphael1 from './shapelib/raphael_1.json';
import * as raphael2 from './shapelib/raphael_2.json';
import * as symbol from './shapelib/symbol.json';

type ShapeLibraryFile = {
	data: Record<string, string>;
	fill?: boolean;
	size?: number;
};

export type ShapeLibraryItem = {
	fill: boolean;
	label: string;
	icon: string;
	pathData: string;
	size: number;
	value: string;
};

export type ShapeLibraryPath = {
	fill: boolean;
	pathData: string;
	size: number;
};

const SHAPE_LIBRARY_PREFIX = 'shapelib:';

const SHAPE_LIBRARY_FILES: Record<string, ShapeLibraryFile> = {
	basic: basic as ShapeLibraryFile,
	animal: animal as ShapeLibraryFile,
	arrow: arrow as ShapeLibraryFile,
	dialog_balloon: dialogBalloon as ShapeLibraryFile,
	electronics: electronics as ShapeLibraryFile,
	flowchart: flowchart as ShapeLibraryFile,
	game: game as ShapeLibraryFile,
	math: math as ShapeLibraryFile,
	misc: misc as ShapeLibraryFile,
	music: music as ShapeLibraryFile,
	object: object as ShapeLibraryFile,
	raphael_1: raphael1 as ShapeLibraryFile,
	raphael_2: raphael2 as ShapeLibraryFile,
	symbol: symbol as ShapeLibraryFile
};

const SHAPE_LIBRARY_ORDER = [
	'basic',
	'animal',
	'arrow',
	'dialog_balloon',
	'electronics',
	'flowchart',
	'game',
	'math',
	'misc',
	'music',
	'object',
	'raphael_1',
	'raphael_2',
	'symbol'
];

const CATEGORY_ICONS: Record<string, string> = {
	animal: 'cat',
	arrow: 'arrow-right',
	basic: 'shapes',
	dialog_balloon: 'message-square',
	electronics: 'circuit-board',
	flowchart: 'workflow',
	game: 'dice-5',
	math: 'sigma',
	misc: 'sparkles',
	music: 'music',
	object: 'box',
	raphael_1: 'palette',
	raphael_2: 'palette',
	symbol: 'circle-dot'
};

const formatShapeLabel = (key: string): string => key
	.replace(/_/g, ' ')
	.replace(/\b\w/g, (letter) => letter.toUpperCase());

export const SHAPE_LIBRARY_CATEGORIES: Record<string, ShapeLibraryItem[]> = SHAPE_LIBRARY_ORDER.reduce((libraries, category) => {
	const library = SHAPE_LIBRARY_FILES[category];
	if (!library) {
		return libraries;
	}

	libraries[category] = Object.keys(library.data).map((key) => ({
		fill: Boolean(library.fill),
		label: formatShapeLabel(key),
		icon: CATEGORY_ICONS[category] ?? 'shapes',
		pathData: library.data[key],
		size: library.size ?? 300,
		value: `${SHAPE_LIBRARY_PREFIX}${category}:${key}`
	}));

	return libraries;
}, {} as Record<string, ShapeLibraryItem[]>);

export const getShapeLibraryPath = (value: string): ShapeLibraryPath | null => {
	if (!value.startsWith(SHAPE_LIBRARY_PREFIX)) {
		return null;
	}

	const [category, key] = value.slice(SHAPE_LIBRARY_PREFIX.length).split(':');
	if (!category || !key) {
		return null;
	}

	const library = SHAPE_LIBRARY_FILES[category];
	const pathData = library?.data[key];
	if (!library || !pathData) {
		return null;
	}

	return {
		fill: Boolean(library.fill),
		pathData,
		size: library.size ?? 300
	};
};
