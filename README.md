# Des Wade | Portfolio

A personal portfolio focused on web content strategy, CMS implementation, UX and the technical craft of building better content experiences.

## Site map

| File | Purpose |
| --- | --- |
| `index.html` | Five chapter homepage and Universe navigation |
| `home.css` | Homepage visual system, responsive layouts and motion |
| `home.js` | Chapter navigation, Universe and featured work interactions |
| `universe-planets.css` / `universe-orbit-final.css` | Accessible seven-planet circular navigation and responsive orbit layout |
| `case-studies.css` / `case-studies.js` | Gallery presentation, carousel behavior and keyboard navigation |
| `case-flow.css` | Two vertical snap sections: introduction and combined gallery / invitation |
| `resume.css` / `philosophy.css` / `component-lab.css` | Page-specific layouts and responsive styling |
| `case-studies.html` | Four selected case studies: WCFCC, Wade List, ASCE 175th Toolkit, and ASCE 2027 |
| `resume.html` | Professional background and skills |
| `philosophy.html` | Personal philosophy, work approach and creative perspective |
| `component-lab.html` | Component library in progress, currently showing a functioning constellation navigation demo |
| `theme.css` / `theme.js` / `theme-control.css` | Shared accessible light and dark themes and celestial toggle |
| `site-shell.css` / `site-shell.js` | Shared headers, compact footer and horizontal gesture protection |
| `constellation-demo.js` / `constellation-lab-finish.css` | Live constellation demonstration, keyboard navigation, and documented source |

Everything is a static file and runs without a build step. Each portfolio page keeps its content separate from its styles, and interactive pages keep their behavior in dedicated JavaScript files.

## Featured projects

The portfolio highlights four projects in this order:

1. WCFCC Football and Cheer, archived website implementation.
2. Wade List, an actively developed personal wishlist web app.
3. ASCE 175th Anniversary Toolkit, enterprise CMS and component work.
4. ASCE 2027, event website implementation and content experience.

The gallery links to public project demonstrations where available. Professional CMS work is described at the case study level without publishing private employer source code.

## Local preview

From the repository root:

```bash
python3 -m http.server 8765
```

Then open `http://localhost:8765/index.html`. Use a local server rather than opening files directly so navigation works as it does on GitHub Pages.

## Quality checks

The GitHub Actions workflow in `.github/workflows/portfolio-visual-qa.yml` tests the portfolio in Chromium and WebKit, including phones, tablets, desktop, circular Universe geometry, case study navigation, keyboard behavior, contrast, and the live Component Lab. The suites are in `qa/`.

For local testing, install the browser dependencies and run both quality checks while the local server is on port 8765:

```bash
npm install --no-save --no-package-lock playwright@1.56.1 @axe-core/playwright@4.11.0
npx playwright install chromium webkit
node qa/portfolio-qa.mjs
node qa/application-audit.mjs
```

The first suite tests responsive geometry, card navigation, and Safari-style behavior. The second checks all five active portfolio pages in light and dark themes, including contrast, landmarks, internal resources and links. The tools do not prove every interaction or layout is perfect, so visual review remains part of the process.

## Project boundaries

The Component Lab is visibly marked work in progress and currently contains only a real, functioning constellation navigation implementation with its public HTML, CSS and JavaScript source. Finished work is presented separately in the selected case studies.

The root also contains older, independent site experiments and assets retained for reference. These are not required by the five active portfolio pages. The portfolio pages above do not depend on those files; they should be reviewed individually before deletion to avoid breaking older URLs.

## Deployment

GitHub Pages serves the files from `main`. Links between the active portfolio pages use relative paths so they work in the project site's subdirectory.
