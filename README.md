# SVG Editor for Obsidian

This plugin integrates a fully functional SVG editor (based on https://github.com/svg-edit/svgedit) directly into Obsidian. It allows you to create, edit, and manage vector graphics natively within your vault.

![](screenshot.png)

## Features

- **Direct Editing**: Open any `.svg` file via the file menu ("Edit with SVGEdit") or the ribbon icon.
- **Canvas Tools**: Full support for selection, rectangles, ellipses, lines, freehand paths, and text.
- **Shape Library**: Extensive library featuring categories such as Basic, Arrows, Flowchart, Music, Mathematics, Animals, and more.
- **Rulers & Grid**: High-precision rulers with multiple unit support (px, cm, mm, in, pt, pc) and a customizable grid.
- **Layer Management**: Support for layers (visibility, locking, and sorting).
- **Styling Options**: Comprehensive options for fills, strokes, markers (arrowheads), and opacity.
- **Automation**:
    - Automatically creates "Untitled.svg" if no SVG is currently active.
    - Saves changes directly back to the file in your vault.
    - Support for "Dynamic Size" when adjusting the SVG source code.

## Usage

1. **Create an SVG**: Click the image icon in the ribbon or use the command `SVG Editor: Create new SVG`.
2. **Edit an SVG**: 
    - Right-click an SVG file in the File Explorer -> `Edit with SVGEdit`.
    - Or click the ribbon icon while an SVG file is currently focused.
3. **Editor Functions**:
    - Use the toolbar for drawing tools.
    - Use the source code modal for direct manual adjustments to the SVG XML.

## Technical Details

Unlike simple iframe embeds, this plugin utilizes the `SvgCanvas` from SVG-Edit directly within an Obsidian modal for deeper integration.
- **State Management**: Uses drafts to buffer changes before they are committed to the file.
- **Deep Integration**: Leverages the Obsidian API (`TFile`, `Workspace`, `Menu`) to ensure a seamless workflow.

## Disclaimer

This plugin is **Vibe Coded** – created to fill a specific gap in my personal workflow. If you are a professional developer and want to take this project to the next level (e.g., integrating it as a regular workspace view instead of a modal), feel free to reach out or open a PR!