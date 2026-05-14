# SVG Web Editor Porting

Diese Datei ist die Arbeitsliste fuer den systematischen Abgleich mit `svg_web_editor_for_info`.

Status:
- `done`: im Plugin umgesetzt oder bewusst vollstaendig uebernommen.
- `partial`: teilweise umgesetzt, weitere Details offen.
- `reviewed`: geprueft, keine direkte Uebernahme noetig.
- `todo`: noch zu pruefen oder umzusetzen.

| Status | Original | Funktion / Bereich | Umsetzung bei uns |
| --- | --- | --- | --- |
| done | `extensions/ext-shapes/shapelib/*.json` | Shape-Library-Daten | `src/svg/shapelib/*.json`, `src/svg/shapelib.ts` |
| done | `extensions/ext-shapes/ext-shapes.js` | Shape-Kategorien, Vorschau, Einfuegen | `src/svg/shapelib.ts`, `src/ui/svg-edit-modal.ts` |
| done | `components/seZoom.js` | Zoom-Eingabe, Presets, Stepper | `src/ui/svg-edit-modal.ts`, `styles.css` |
| done | `components/seSpinInput.js` | Zahlenfelder mit Steppern | `src/ui/svg-edit-modal.ts`, `styles.css` |
| done | `dialogs/se-elix/*NumberSpinBox.js` | Basis fuer Spinbox-Komponente | `src/ui/svg-edit-modal.ts`, `styles.css` |
| done | `components/sePalette.js` | Vollstaendige 42-Farben-Palette inkl. `none`, Klick fuer Fill, Shift/Rechtsklick fuer Stroke; Popup-Pfeil im Plugin bewusst durch direkt sichtbare Palette ersetzt | `src/ui/svg-edit-modal.ts`, `styles.css` |
| done | `dialogs/seConfirmDialog.js` | Confirm-Dialog statt Browser-Confirm | `src/ui/svg-edit-modal.ts` |
| done | `dialogs/sePromptDialog.js` | Prompt-Dialog statt Browser-Prompt | `src/ui/svg-edit-modal.ts` |
| done | `dialogs/imagePropertiesDialog.js` | Dokumenteigenschaften, Presets, Fit-to-content | `src/ui/svg-edit-modal.ts` |
| done | `dialogs/exportDialog.js` | Export-Typ und Qualitaet | `src/ui/svg-edit-modal.ts` |
| done | `extensions/ext-panning/ext-panning.js` | Pan-Modus inkl. linkem Toolbar-Button und eigenem Editor-Modus, damit Drag-Panning auch ohne SVGCanvas-Extension-Registry greift | `src/ui/svg-edit-modal.ts`, `styles.css` |
| done | `extensions/ext-eyedropper/ext-eyedropper.js` | Stil aufnehmen/anwenden, Hilfscursor, Escape-Reset | `src/ui/svg-edit-modal.ts`, `styles.css` |
| done | `extensions/ext-polystar/ext-polystar.js` | Stern/Polygon-Werkzeuge, Kontextwerte und vollstaendige Flyout-Auswahl wie im Original | `src/ui/svg-edit-modal.ts` |
| done | `extensions/ext-markers/ext-markers.js` | Marker-Auswahl, Markerfarben, Line-to-Polyline fuer Mid-Marker, eigene Marker beim Klonen | `src/ui/svg-edit-modal.ts` |
| done | `extensions/ext-connector/ext-connector.js` | Connectoren zwischen Formen per Auswahl oder Drag, Duplikat-Schutz, Auto-Update, `se:connector`-Kompatibilitaet | `src/ui/svg-edit-modal.ts` |
| done | `extensions/ext-layer_view/ext-layer_view.js`, `panels/LayersPanel.*` | Layer-Panel, Sichtbarkeit, Solo Current Layer, Kontextmenue, Merge/Duplicate/Move/Rename; Layer-Liste nutzt Original-API-Fallbacks und steht vor Overview | `src/ui/svg-edit-modal.ts`, `styles.css` |
| done | `extensions/ext-overview_window/ext-overview_window.js`, `extensions/ext-overview_window/dragmove/dragmove.js` | Overview/Minimap, Viewport-Anzeige, Klick/Drag zum Scrollen | `src/ui/svg-edit-modal.ts`, `styles.css` |
| done | `extensions/ext-grid/ext-grid.js` | Grid-Anzeige mit Grid3x3-Icon, Farbe, Zoom-angepasste Intervalle, Snapping | `src/ui/svg-edit-modal.ts`, `styles.css` |
| reviewed | `extensions/ext-helloworld/ext-helloworld.js` | Demo-/Tutorial-Extension; fuer produktives Obsidian-Plugin nicht sinnvoll | nicht portiert |
| done | `panels/BottomPanel.*` | Bottom-Paint-/Zoom-/Palette-Bereich, Fill/Stroke-Paintboxen, Linien-Stroke-Breite-Schutz | `src/ui/svg-edit-modal.ts`, `styles.css` |
| done | `panels/TopPanel.*` | Top-Toolbar, Wireframe-Modus, Kontextleisten, Auswahl-/Text-/Path-/Elementpanels, Undo/Redo-State | `src/ui/svg-edit-modal.ts`, `styles.css` |
| done | `panels/LeftPanel.*` | Werkzeugleiste, aktive Toolstates, Flyout-Gruppen inkl. Hauptwerkzeug im Popup, Zoom/Pan/Shape/Text/Path-Werkzeuge | `src/ui/svg-edit-modal.ts`, `styles.css` |
| done | `contextmenu.js`, `dialogs/cmenu*.js/html` | Kontextmenues fuer Canvas und Layer, Click-away/Escape-Schliessen, disabled Items | `src/ui/svg-edit-modal.ts`, `styles.css` |
| done | `components/PaintBox.js`, `components/seColorPicker.js`, `components/jgraduate/*` | PaintBox-Swatches fuer Fill/Stroke, Solid-Dialog mit RGB/HSV/Alpha/Hex, `none`/transparent, Schnellpalette sowie native Linear/Radial-Gradient-Paints umgesetzt; jGraduate selbst bewusst nicht 1:1 uebernommen | `src/ui/svg-edit-modal.ts`, `styles.css` |
| reviewed | `components/seInput.js` | Textinput-Komponente | native Inputs in `src/ui/svg-edit-modal.ts` |
| reviewed | `components/seText.js` | Label/Text-Komponente | native Labels in `src/ui/svg-edit-modal.ts` |
| reviewed | `components/seSelect.js`, `components/seDropdown.js` | Select/Dropdown-Komponenten | native Selects in `src/ui/svg-edit-modal.ts` |
| reviewed | `components/seButton.js`, `sePlainBorderButton.js`, `sePlainMenuButton.js`, `seFlyingButton.js`, `seExplorerButton.js`, `seList.js`, `seListItem.js`, `seMenu.js`, `seMenuItem.js` | Web Components fuer Buttons/Menues/Listitems | Obsidian/lucide/native DOM in `src/ui/svg-edit-modal.ts`, `styles.css` |
| reviewed | `dialogs/seSelectDialog.js`, `dialogs/seAlertDialog.js`, `dialogs/SePlainAlertDialog.js` | Auswahl-/Alert-Basisdialoge | Obsidian `Modal`/`Notice` in `src/ui/svg-edit-modal.ts` |
| reviewed | `ConfigObj.js` | SVG-Edit-Defaultconfig; relevante Defaults direkt in `SvgCanvas`-Init und Preferences gesetzt | `src/ui/svg-edit-modal.ts` |
| reviewed | `EditorStartup.js`, `Editor.js` | Standalone-Bootstrap, Extension-Lifecycle, Event-Bindings; durch Obsidian-Modal-Integration ersetzt | `src/ui/svg-edit-modal.ts`, `src/svg/types.ts` |
| reviewed | `MainMenu.js` | Export, Doc Properties, Preferences, Homepage umgesetzt; Open/Save sinnvoll durch Vault-Workflow ersetzt | `src/ui/svg-edit-modal.ts` |
| reviewed | `Rulers.js`, `templates/rulersTemplate.html` | Ruler-Intervalle, Labels, Scroll-Sync, Units umgesetzt; Multi-Canvas-Splitting fuer >30000px Standalone-Extremfall im Modal nicht sinnvoll | `src/ui/rulers.ts`, `styles.css` |
| reviewed | `extensions/ext-opensave/ext-opensave.js` | New/Open/Import/Save/Save As; Browser-FS-Access durch Obsidian-Vault, Import und Export ersetzt | `src/ui/svg-edit-modal.ts` |
| reviewed | `extensions/ext-storage/*` | Local-storage/cookie prompt; durch lokalen Draft pro Vault-Datei ersetzt | `src/ui/svg-edit-modal.ts` |
| done | `dialogs/svgSourceDialog.*` | SVG-Source-Dialog, Copy, Dynamic Size, Fokus, kein Spellcheck | `src/ui/svg-edit-modal.ts`, `styles.css` |
| reviewed | `dialogs/editorPreferencesDialog.*` | Editor-Preferences, Background, Grid, Snapping, Rulers, Units inkl. `em`/`ex`; SVG-Edit-Sprachauswahl im Obsidian-Plugin bewusst nicht uebernommen | `src/ui/svg-edit-modal.ts`, `src/ui/rulers.ts`, `styles.css` |
| reviewed | `browser-not-supported.*`, `index.html`, `iife-index.html`, `xdomain-index.html`, `templates/editorTemplate.html` | Standalone-Webapp-Huelle; in Obsidian-Plugin nicht direkt portiert | `src/ui/svg-edit-modal.ts`, `main.ts` |
| reviewed | `locale/*`, `extensions/*/locale/*`, `locale.js` | SVG-Edit-i18next-Uebersetzungen; Plugin nutzt aktuell feste UI-Strings/Obsidian-Kontext | nicht direkt portiert |
| reviewed | `images/*` | Original-Toolbar-Icons; groesstenteils durch lucide/Obsidian-Icons ersetzt, Shape/Marker-Logik separat portiert | `src/ui/svg-edit-modal.ts`, `styles.css` |
| reviewed | `components/jgraduate/images/*` | Assets fuer jGraduate-Gradient-Picker; nicht noetig fuer nativen Gradient-Dialog | nicht portiert |
| reviewed | `tests/*`, `typedefs.js`, `components/index.js`, `dialogs/index.js`, `svgedit.css` | Standalone-Test/Typedef/Export/CSS-Infrastruktur; relevante CSS-Regeln manuell in Plugin-CSS uebernommen | `styles.css`, `src/svg/types.ts` |

## Laufende Notizen

- Die Shape-Library ist bewusst als JSON-Kopie eingebunden, statt die Daten abzutippen.
- Browser-native `prompt`/`confirm` sind im Editor-Modal durch Obsidian-Modals ersetzt.
- Bottom-Panel wird vor Layer/Overview aufgebaut, damit es sichtbar bleibt; die Palette darf hoeher werden, damit die Original-Farbmatrix direkt erreichbar ist.

## Ordnerabdeckung

Stand der zweiten Abgleichrunde: alle Dateien unter `svg_web_editor_for_info` sind ueber die Tabelle oben als `done` oder `reviewed` abgedeckt. Es gibt keine offenen `todo`- oder `partial`-Eintraege.

| Bereich | Dateien | Abdeckung |
| --- | ---: | --- |
| Top-Level JS/HTML/CSS | 13 | `ConfigObj`, `Editor`, `EditorStartup`, `MainMenu`, `Rulers`, Standalone-Huellen, CSS, Typedefs geprueft |
| `components/` inkl. `jgraduate/` | 38 | native UI/Obsidian-DOM umgesetzt; jGraduate durch nativen Gradient-Dialog ersetzt |
| `dialogs/` inkl. `se-elix/` | 21 | Obsidian-Modals, Notices, Source/Export/Properties/Preferences umgesetzt oder bewusst ersetzt |
| `extensions/` inkl. Locale/Storage/Shape-Unterordnern | 88 | sinnvolle Extensions umgesetzt; Demo/Locale/Storage-Dialoge geprueft oder ersetzt |
| `images/` | 149 | Icons durch lucide/Obsidian-Icons ersetzt; Shape/Marker-relevante Semantik umgesetzt |
| `locale/` | 59 | i18next-Sprachdateien geprueft, nicht direkt portiert |
| `panels/` | 8 | Top/Left/Bottom/Layers in Modal-UI umgesetzt |
| `templates/` | 2 | Standalone-Templates durch Modal-Layout/Rulers ersetzt |
| `tests/` | 1 | Standalone-Testharness geprueft |
