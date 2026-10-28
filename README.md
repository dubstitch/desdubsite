# Des Wade | Portfolio

A personal portfolio focused on web content strategy, CMS implementation, UX and the technical craft of building better content experiences.

## Site map

| File | Purpose |
| --- | --- |
| `index.html` | Five chapter homepage and Universe navigation |
| `home.css` | Homepage visual system, responsive layouts and motion |
| `home.js` | Chapter navigation, Universe and featured work interactions |
| `case-studies.css` / `case-studies.js` | Gallery presentation, carousel behavior and keyboard navigation |
| `case-flow.css` | Two vertical snap sections: introduction and combined gallery / invitation |
| `resume.css` / `philosophy.css` / `component-lab.css` | Page-specific layouts and responsive styling |
| `case-studies.html` | Three completed work stories in an interactive gallery |
| `resume.html` | Professional background and skills |
| `philosophy.html` | Personal philosophy, work approach and creative perspective |
| `component-lab.html` | Public experimental component sketchbook |
| `theme.css` / `theme.js` | Shared dark and light appearance controls |
| `site-shell.css` / `site-shell.js` | Shared headers, compact footer and horizontal gesture protection |
| `component-lab-light.css` | Dedicated high-contrast light appearance for the experimental component collection |

Everything is a static file and runs without a build step. Each portfolio page keeps its content separate from its styles, and interactive pages keep their behavior in dedicated JavaScript files.

## Local preview

From the repository root:

```bash
python3 -m http.server 8765
```

Then open `http://localhost:8765/index.html`. Use a local server rather than opening files directly so navigation works as it does on GitHub Pages.

## Quality checks

The GitHub Actions workflow in `.github/workflows/portfolio-visual-qa.yml` runs browser layout and accessibility checks on mobile, tablet, desktop and WebKit. Its source is `qa/portfolio-qa.mjs`.

For local testing, install the browser dependencies and run both quality checks while the local server is on port 8765:

```bash
npm install --no-save --no-package-lock playwright@1.56.1 @axe-core/playwright@4.11.0
npx playwright install chromium webkit
node qa/portfolio-qa.mjs
node qa/application-audit.mjs
```

The first suite tests responsive geometry, card navigation, and Safari-style behavior. The second checks all five active portfolio pages in light and dark themes, including contrast, landmarks, internal resources and links. The tools do not prove every interaction or layout is perfect, so visual review remains part of the process.

## Project boundaries

The Component Lab intentionally contains concepts in progress. Finished work is presented separately in the selected case studies.

The root also contains older, independent site experiments and assets retained for reference. These are not required by the five active portfolio pages. The portfolio pages above do not depend on those files; they should be reviewed individually before deletion to avoid breaking older URLs.

## Deployment

GitHub Pages serves the files from `main`. Links between the active portfolio pages use relative paths so they work in the project site's subdirectory.
