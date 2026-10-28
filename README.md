# Des Wade | Portfolio

A personal portfolio focused on web content strategy, CMS implementation, UX and the technical craft of building better content experiences.

## Site map

| File | Purpose |
| --- | --- |
| `index.html` | Five chapter homepage and Universe navigation |
| `home.css` | Homepage visual system, responsive layouts and motion |
| `home.js` | Chapter navigation, Universe and featured work interactions |
| `case-studies.css` / `case-studies.js` | Gallery presentation, carousel behavior and keyboard navigation |
| `resume.css` / `philosophy.css` / `component-lab.css` | Page-specific layouts and responsive styling |
| `case-studies.html` | Three completed work stories in an interactive gallery |
| `resume.html` | Professional background and skills |
| `philosophy.html` | Personal philosophy, work approach and creative perspective |
| `component-lab.html` | Public experimental component sketchbook |
| `theme.css` / `theme.js` | Shared dark and light appearance controls |
| `site-shell.css` / `site-shell.js` | Shared headers, compact footer and horizontal gesture protection |

Everything is a static file and runs without a build step. Each portfolio page keeps its content separate from its styles, and interactive pages keep their behavior in dedicated JavaScript files.

## Local preview

From the repository root:

```bash
python3 -m http.server 8765
```

Then open `http://localhost:8765/index.html`. Use a local server rather than opening files directly so navigation works as it does on GitHub Pages.

## Quality checks

The GitHub Actions workflow in `.github/workflows/portfolio-visual-qa.yml` runs browser layout and accessibility checks on mobile, tablet, desktop and WebKit. Its source is `qa/portfolio-qa.mjs`.

For local testing, install `playwright` and `@axe-core/playwright`, install their browsers, start the local server on port 8765, and run:

```bash
node qa/portfolio-qa.mjs
```

## Project boundaries

The Component Lab intentionally contains concepts in progress. Finished work is presented separately in the selected case studies.

The root also contains older, independent site experiments and assets retained for reference. The portfolio pages above do not depend on those files; they should be reviewed individually before deletion to avoid breaking older URLs.

## Deployment

GitHub Pages serves the files from `main`. Links between the active portfolio pages use relative paths so they work in the project site's subdirectory.
