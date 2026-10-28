import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const base = 'http://127.0.0.1:8765/';
const pages = [
  'index.html#home',
  'resume.html',
  'philosophy.html',
  'case-studies.html?project=anniversary#gallery',
  'component-lab.html'
];
const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'landscape', width: 844, height: 390 }
];
const issues = [];
const audited = [];
const checkedUrls = new Map();
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

for (const theme of ['light', 'dark']) {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.width < 500,
      hasTouch: viewport.width < 500,
      reducedMotion: 'reduce'
    });
    await context.addInitScript(value => localStorage.setItem('des-theme', value), theme);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    for (const path of pages) {
      const url = new URL(path, base);
      const label = theme + '/' + viewport.name + '/' + url.pathname.split('/').pop();
      await page.goto(url.toString(), { waitUntil: 'domcontentloaded' });
      await page.locator('.site-header-shell').waitFor({ state: 'visible' });
      const content = await page.evaluate(() => {
        const current = new URL(location.href);
        const links = [...document.querySelectorAll('a[href]')].map(link => link.getAttribute('href'));
        const resources = [
          ...document.querySelectorAll('script[src], link[rel="stylesheet"][href]')
        ].map(element => element.getAttribute('src') || element.getAttribute('href'));
        const icon = document.querySelector('.resume-action.primary-action svg');
        return {
          title: document.title,
          h1: document.querySelectorAll('h1').length,
          main: document.querySelectorAll('main').length,
          footer: document.querySelectorAll('.site-footer').length,
          header: document.querySelectorAll('.site-header-shell').length,
          theme: document.documentElement.dataset.theme,
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
          lang: document.documentElement.lang,
          links,
          resources,
          icon: icon ? {
            color: getComputedStyle(icon).color,
            stroke: getComputedStyle(icon).stroke,
            parentColor: getComputedStyle(icon.closest('a')).color
          } : null
        };
      });
      if (!content.title || !content.lang || content.h1 < 1 || content.main !== 1 ||
          content.header !== 1 || content.footer !== 1) {
        issues.push('STRUCTURE ' + label + ' ' + JSON.stringify({
          title: content.title, h1: content.h1, main: content.main,
          header: content.header, footer: content.footer, lang: content.lang
        }));
      }
      if (content.theme !== theme) issues.push('THEME ' + label + ' unexpected ' + content.theme);
      if (content.pageWidth > content.viewportWidth + 3)
        issues.push('HORIZONTAL OVERFLOW ' + label + ' ' + content.pageWidth + '/' + content.viewportWidth);
      if (url.pathname.endsWith('resume.html') && theme === 'light') {
        if (!content.icon || !content.icon.stroke.includes('255, 255, 255'))
          issues.push('CONTACT ICON CONTRAST ' + label + ' ' + JSON.stringify(content.icon));
      }
      if (theme === 'light' && viewport.name === 'desktop') {
        for (const item of [...content.links, ...content.resources]) {
          if (!item || item.startsWith('mailto:') || item.startsWith('tel:') || item.startsWith('javascript:')) continue;
          const linked = new URL(item, url);
          if (linked.origin !== url.origin) continue;
          const key = linked.pathname + linked.search;
          if (!checkedUrls.has(key)) {
            const response = await context.request.get(linked.origin + key);
            checkedUrls.set(key, response.status());
          }
          if (checkedUrls.get(key) >= 400)
            issues.push('BROKEN INTERNAL RESOURCE ' + label + ' ' + key + ' HTTP ' + checkedUrls.get(key));
          if (linked.hash && key === url.pathname + url.search) {
            const exists = await page.evaluate(hash =>
              !!document.getElementById(decodeURIComponent(hash.slice(1))), linked.hash);
            if (!exists) issues.push('MISSING LOCAL ANCHOR ' + label + ' ' + linked.hash);
          }
        }
      }
      // The existing full responsive suite exercises many more screen sizes.
      // This pass explicitly covers all five portfolio pages in both themes.
      if (viewport.name !== 'landscape') {
        try {
          const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();
          for (const violation of results.violations) {
            issues.push('ACCESSIBILITY ' + label + ' ' + violation.id + ' (' +
              violation.impact + ') ' + violation.nodes.slice(0, 3)
                .map(node => node.target.join(' ')).join(', '));
          }
        } catch (error) {
          issues.push('ACCESSIBILITY SCAN ERROR ' + label + ' ' + error.message);
        }
      }
      audited.push(label);
    }
    if (errors.length) issues.push('JAVASCRIPT ' + theme + '/' + viewport.name + ' ' + errors.join(' | '));
    await context.close();
  }
}
await browser.close();
console.log('AUDIT_PAGES=' + JSON.stringify(audited));
console.log('AUDIT_ISSUES=' + JSON.stringify(issues));
console.log('AUDIT_TOTAL_ISSUES=' + issues.length);
if (issues.length) process.exitCode = 1;
