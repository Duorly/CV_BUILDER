# Architecture

CV Builder is a single-page React application with no backend. Everything (CVs, cover letters, job applications,
settings, API keys) lives in the user's browser. This document explains how the code is organised and the rules that
keep the printed and downloaded CVs reliable.

- [Stack](#stack)
- [Project structure](#project-structure)
- [Data](#data)
- [Templates](#templates)
- [Printing and page geometry](#printing-and-page-geometry)
- [Text extraction rules](#text-extraction-rules)
- [Direct ATS PDF](#direct-ats-pdf)
- [Fonts](#fonts)
- [AI features](#ai-features)
- [Tests](#tests)

## Stack

- **React 18** and **Vite 5**, plain JavaScript (JSX), plain CSS (one stylesheet per area, no CSS framework).
- **@react-pdf/renderer** for the direct ATS PDF download.
- **@dnd-kit** for drag and drop, **lucide-react** for icons, **@fontsource/** packages for the bundled fonts.
- **Vitest** for unit tests, **Playwright** (driving the installed Google Chrome) for end-to-end tests, **poppler**
  to read the generated PDFs.

## Project structure

```
src/
├── main.jsx                 # entry point, ErrorBoundary around <App/>
├── fonts.js                 # bundled fonts (one static file per weight)
├── App.jsx                  # shared state (library, view, open dialog) and screen assembly
├── app/                     # app-level hooks and blocks: import/export, versions, AI, printing,
│                            #   undo/redo, welcome screen, workspace, banners, dialogs
├── components/
│   ├── shell/               # toolbar, version menu, Appearance pane, template picker, preview frame,
│   │                        #   dialogs, autosave
│   ├── editor/              # CV editing form
│   ├── templates/           # CV templates, page-break indicator, print styles
│   ├── letter/              # cover letter (editor + A4 rendering)
│   ├── tracker/             # job application tracker
│   ├── ai/                  # job-offer tailoring, translation, AI settings
│   ├── pdf/                 # direct PDF document (@react-pdf/renderer)
│   └── ErrorBoundary.jsx    # fallback screen
├── lib/
│   ├── schema.js            # data shape, defaults, normalizeData / normalizeSettings, template styles, fonts
│   ├── storage.js           # library, localStorage, import / export formats
│   ├── libraryActions.js    # operations on versions (add, duplicate, merge…)
│   ├── useHistory.js        # undo / redo
│   ├── labels.js            # CV labels in French and English
│   ├── pageGeometry.js      # A4 geometry shared by the preview and printing
│   ├── files.js             # file names, downloads, photo compression
│   ├── backup.js            # last export date, backup reminder
│   ├── typography.js        # French non-breaking spaces (display and PDF)
│   ├── pdfExport.js         # direct ATS PDF download
│   ├── ai/                  # Claude / Gemini: providers and keys, client, anonymisation,
│   │                        #   offer analysis, proposed changes, translation, cover letter
│   └── csv.js               # tracker CSV export
├── data/exampleResume.json  # fictional example CV (Camille Martin)
└── styles/                  # one stylesheet per area; app.css imports the UI ones in order
e2e/                         # Playwright specs, one file per feature; shared helpers in e2e/support/
docs/                        # user guide (French), deployment, architecture
```

The UI text and the existing code comments are in French: the app is written for French-speaking job seekers.

## Data

- Everything is stored in `localStorage` under `cv-builder:library:v2`:
  `{ version, currentId, cvs: [...], applications: [...] }`. Each CV version holds `data` (the CV content),
  `settings` (appearance) and `coverLetter`.
- Other keys: `cv-builder:backup` (date of the last full export), the AI settings and keys (`lib/ai/providers.js`),
  and UI preferences (`cv-builder:appearance-open`, `appearance-width`, `editor-width`, `preview-zoom`).
- Every piece of external data (localStorage, imported file, AI response) goes through `normalizeData` /
  `normalizeSettings`: rendering code can assume every field exists and has the right type. Unknown values fall back
  to defaults.
- Imports accept a full backup, a single exported version, or the legacy v1 format (the raw CV object). Photos are
  only accepted as embedded images (`data:image/…`) and are re-encoded (cropped, EXIF metadata removed).
- Importing into an existing library merges by id (`mergeLibraries`): the most recent copy (`updatedAt`) wins.
- Autosave runs 500 ms after the last change, and immediately when the tab is hidden or closed. Two open tabs
  coordinate through the `storage` event; conflicting edits pause saving and let the user choose.

## Templates

`settings.template` is `'design'` (a colour template, printed by the browser) or `'ats'` (one sober column). The
colour template's look is `settings.designStyle`, listed in `DESIGN_STYLES` (`lib/schema.js`):

| `designStyle` | UI name   | Layout                                                                      | Component           |
| ------------- | --------- | --------------------------------------------------------------------------- | ------------------- |
| `modern`      | Design    | sidebar with name, contact details, skills (tags or list); main column      | `ResumeDesign.jsx`  |
| `classic`     | Classique | full-height dark sidebar; job title opens the page; keywords as text        | `ResumeClassic.jsx` |
| `focus`       | Focus     | full-width header; education in the sidebar; main column for experience     | `ResumeFocus.jsx`   |
| `expert`      | Expert    | one full-width column; dates in the left margin; built for two-page CVs     | `ResumeExpert.jsx`  |

The ATS template is `ResumeATS.jsx`. `components/templates/registry.js` maps settings to the component; the preview
and the template picker's thumbnails both use it.

- **Defaults per style**: `STYLE_DEFAULTS` holds each style's colours and font. `designStylePatch` switches style and
  replaces colours and font only if the user had not changed them.
- **Columns**: `SECTION_COLUMNS` gives each built-in section's column; `STYLE_COLUMNS` overrides it per style (Focus
  moves education to the sidebar); custom sections carry their own `column`. `isSingleColumn` tells the editor when
  column placement does not apply (ATS, Expert).
- **Shared rendering helpers** live in `templates/shared.js` (`prepare`, `renderableSections`, `themeStyle`,
  `displayColors`…) and `templates/parts.jsx` (`SrLabel`, `BreakableText`, `KeepCompounds`, `ContactItems`).
  Nothing empty or hidden is rendered: empty items, bullets and sections are filtered out before rendering.
- **Colours** are adjusted for contrast (`displayColors`): text and accents that would be unreadable on their
  background are darkened or lightened in the same hue. The Appearance pane lists which ones were adjusted.
- **Thumbnails**: every template accepts a `thumbnail` prop, which drops the `#resume-root` id and the page-break
  indicator. `components/shell/TemplatePicker.jsx` renders the first page of the CV in each template, scaled down.

### Adding a template

1. Add an entry to `DESIGN_STYLES` and `STYLE_DEFAULTS` (`lib/schema.js`), and `STYLE_COLUMNS` if sections move.
2. Write `components/templates/ResumeXxx.jsx` and `styles/resume-xxx.css`, starting from the closest existing
   template. Keep `id="resume-root"` (unless `thumbnail`), `PageBreakOverlay` with the template's print columns, and
   `.print-sidebar-bg` if the template has a coloured sidebar.
3. Register it in `components/templates/registry.js` and give it a tagline in `TemplatePicker.jsx`.
4. Update the copy that lists templates (Appearance pane hints, editor hints, the French user guide).
5. Add it to the template loop in `templates/__tests__/templates.test.js`, write a `describe` block for its
   specifics, an e2e spec, and a multi-page print test in `e2e/telechargement.spec.js`.

## Printing and page geometry

The colour templates and the cover letter are printed by the browser ("Save as PDF"). `lib/pageGeometry.js` holds the
geometry shared by the preview and print styles:

- **`design` mode** (colour templates): no `@page` margin, so a coloured sidebar can reach the page edges. The top
  and bottom margins are column padding, repeated on every page with `box-decoration-break: clone`. A fixed
  `.print-sidebar-bg` element paints the sidebar background on every page.
- **`ats` mode**: `@page` margins (14 mm × the Margins setting); the on-screen padding that stands for them is
  removed when printing.
- **Page count and page-break indicator**: `measurePrintLayout` clones the document into a hidden multi-column
  container whose columns are the size of a printed page. Chrome fragments it with the same engine it uses for
  printing, so the number of columns is the number of pages, and the position of each element gives the page
  breaks drawn in the preview (`PageBreakOverlay`).
- Before calling `window.print()`, the app waits for the displayed fonts to load (at most 3 s), so a font picked just
  before printing is not replaced by a fallback.

The layout is tuned for Chrome and Edge; Safari does not repeat the top margin on pages 2+. The download dialog warns
users of other browsers.

## Text extraction rules

Recruiting software (ATS) reads the text of the PDF. The templates follow a few rules, each backed by a test:

- Links and e-mail addresses break after `/` or `@`, or before a hyphen, never right after it (`BreakableText`):
  a hyphen at the end of a line is taken for a hyphenation and removed (`camille-martin-exemple` →
  `camille-martinexemple`).
- In narrow columns, hyphenated words stay on one line (`KeepCompounds`): `Information-Communication` must not become
  `InformationCommunication`. Date ranges break before the dash, never after it.
- Icons are hidden from extraction, and visually hidden labels (`SrLabel`, e.g. "E-mail : ") keep the extracted text
  meaningful.
- Uppercase headings keep a moderate letter spacing (≤ 0.06 em): wider spacing can be extracted as
  `F O R M A T I O N`, depending on the system's text rendering (seen on Linux with 0.08 em).

## Direct ATS PDF

`components/pdf/ResumePdfDocument.jsx` renders the ATS layout with `@react-pdf/renderer` (one column, same order and
titles), downloaded directly without the print dialog (`lib/pdfExport.js`). It uses the standard PDF font Helvetica,
so it does not depend on the browser, but only covers the Windows-1252 character set: `pdf/pdfCoverage.js` lists the
characters it would alter, and the download dialog then recommends printing instead. Its real page count is computed
when the dialog opens.

## Fonts

- The fonts offered in the Appearance pane are listed in `FONT_OPTIONS` (`lib/schema.js`), grouped by `FONT_GROUPS`.
  Except Helvetica / Arial and Georgia (system fonts), they are bundled with the app (`@fontsource/…` packages,
  imported in `src/fonts.js`): no request to Google Fonts, and the browser only downloads the fonts being displayed.
- They are **static files, one per weight**: Chrome embeds them as TrueType in printed PDFs. Variable fonts (such as
  Google Fonts' Inter) end up as Type 3 fonts, which some ATS read badly. Check with `pdffonts CV.pdf`: no "Type 3".
- Font files must stay files, never `data:` URLs (`assetsInlineLimit` in `vite.config.js`): the CSP would block them.
- There is no "system font" option: on macOS, Chrome embeds San Francisco as Type 3, without spaces between words.
- **Adding a font**: import its weights 400 to 800 and its 400 italic in `src/fonts.js`, add it to `FONT_OPTIONS`,
  then run `e2e/telechargement.spec.js`, which prints every font with three templates and checks that the PDF embeds
  it and that words are still separated. Lato, Source Sans 3, EB Garamond and Poppins were rejected: their narrow
  spaces disappear when the text is extracted ("CamilleMartin").

## AI features

The AI features (tailoring a CV to a job offer, translation, cover letter draft) are optional and call the provider
directly from the browser with the user's own API key: Anthropic (Claude) or Google (Gemini). Code is in `lib/ai/`.

- `providers.js` lists providers, models and cost estimates, and stores the API keys and settings in `localStorage`
  (a key can be forgotten from the settings); `client.js` performs the calls.
- `privacy.js` builds what is sent: the CV **without photo or contact details**, with the person's name, e-mail and
  phone replaced by placeholders (`[NOM]`, `[E-MAIL]`, `[TÉLÉPHONE]`) and restored in the answer. Hidden items are
  not sent.
- `changes.js` turns the model's answer into individual proposals the user accepts one by one. Proposals that change
  numbers, add bullets or mention keywords the user did not confirm are flagged and left unchecked.
- `translation.js` translates into a new version and lists items whose numbers changed.
- Every AI response goes through `normalizeData` before reaching the app.

## Tests

```bash
npm test            # unit tests (Vitest), about 1 s
npm run e2e         # end-to-end tests (Playwright + installed Google Chrome + poppler)
```

- **Unit tests** sit next to the code in `__tests__/` folders. Template tests render each template to static HTML and
  check what is (and is not) displayed; PDF tests render real PDFs and read their text.
- **End-to-end tests** build the app into a temporary folder (never `dist/`), serve it with `vite preview` on port
  4300 and drive Google Chrome. Each test starts from an empty browser and fails on any console error, uncaught
  exception or request to another server. Claude and Gemini are mocked (`e2e/support/ai-mock.js`): no real key, no
  billed call.
- `vite preview` serves the same security headers as production, so a resource blocked by the CSP fails the tests.
- PDF checks use poppler (`pdftotext`, `pdfinfo`, `pdffonts`); without it, download and letter tests are skipped.
- Useful variables: `E2E_PORT` (other port), `E2E_DIST_DIR` (build folder), `E2E_CHANNEL=chromium` (Playwright's
  Chromium instead of Google Chrome, e.g. on Linux ARM: run `npx playwright install chromium` first).
- **Privacy guard**: drop an export of a real CV (yours) into `examples/`, which git ignores. Unit and e2e tests then
  check that none of its data (name, e-mail, phone, profile URLs) ends up in the source files or the production
  build. Without that file, these tests are skipped.
