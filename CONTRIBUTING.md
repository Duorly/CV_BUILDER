# Contributing to CV Builder

Thanks for your interest! Bug reports, ideas, translations, new templates and fixes are all welcome. Issues and pull
requests can be written in English or French.

By taking part, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Who the app is for

CV Builder is used by French-speaking job seekers, most of them not technical. Keep that in mind in every change:

- **Interface text is in French**, plain and friendly, with no jargon ("Télécharger", not "Exporter le build").
  Explain consequences in the UI rather than in the docs.
- **Data never leaves the browser**, except the optional AI calls the user sets up with their own key. Don't add
  analytics, remote fonts, CDNs or any other third-party request (the Content-Security-Policy would block them
  anyway; see [docs/deployment.md](docs/deployment.md#security-headers)).
- **A CV must survive recruiting software (ATS).** Printed and downloaded PDFs must keep real, extractable text:
  read [Text extraction rules](docs/architecture.md#text-extraction-rules) before touching templates.
- **Accessibility matters**: keyboard access, visible focus, labels on every control, enough contrast.

## Getting started

Requirements: Node.js 20 or newer (CI uses 22), Google Chrome, and [poppler](https://poppler.freedesktop.org/) for
the PDF checks (`brew install poppler` or `sudo apt install poppler-utils`).

```bash
git clone https://github.com/Duorly/CV_BUILDER.git
cd CV_BUILDER
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm test           # unit tests (Vitest)
npm run e2e        # end-to-end tests (Playwright, in Google Chrome)
npm run build      # production build in dist/
npm run preview    # serves dist/ as is (run npm run build first)
```

On Linux ARM (no Google Chrome), use Playwright's Chromium: `npx playwright install chromium`, then
`E2E_CHANNEL=chromium npm run e2e`.

[docs/architecture.md](docs/architecture.md) explains how the code is organised: read it before a larger change.

## Making a change

1. For anything bigger than a small fix, open an issue first to agree on the approach.
2. Create a branch from `main`.
3. Write the code **and the tests**:
   - a unit test for logic and rendering (`__tests__/` next to the code);
   - an end-to-end test in `e2e/` for anything a user does through the interface;
   - for templates, fonts or printing, a print test in `e2e/telechargement.spec.js` that reads the PDF.
4. Run `npm test` and `npm run e2e`; both must pass.
5. Update the docs: the French user guide ([docs/guide-utilisateur.md](docs/guide-utilisateur.md)) for anything a
   user sees, `docs/architecture.md` for internals.
6. Open a pull request and fill in the template. Screenshots are welcome for visual changes.

### Code style

- React function components and hooks, plain JavaScript, plain CSS. No new dependency without a good reason.
- Follow the surrounding code: 2-space indentation, single quotes, semicolons, lines up to about 120 characters.
- Existing comments are in French; new comments may be in French or English. Explain *why*, not *what*.
- External data (localStorage, imported files, AI answers) always goes through `normalizeData` /
  `normalizeSettings`.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `feat: …`, `fix: …`,
  `docs: …`, `refactor: …`, `test: …`.

### Never commit personal data

Use the fictional example CV (`src/data/exampleResume.json`, Camille Martin) or made-up data in tests and
screenshots. To check that your own data cannot leak, put an export of your real CV in `examples/` (ignored by git):
the test suites then make sure none of it appears in the source files or the production build.

## Reporting bugs and suggesting features

Use the [issue templates](https://github.com/Duorly/CV_BUILDER/issues/new/choose). For a bug, say which browser and
system you use, what you did, and what you expected. Attach a CV export only if it contains no real personal data.

Security issues must not be reported in public issues: see [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
