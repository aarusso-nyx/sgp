const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { getRequiredEnv } = require('../playwright/support/env');
const { maybeLogin } = require('../playwright/support/auth');

function safeSnippet(value, max = 300) {
  if (value == null) return '';
  return String(value).replace(/\s+/g, ' ').slice(0, max);
}

(async () => {
  const env = getRequiredEnv();
  const targetUrl = 'https://sgp.detran.am.gov.br/detran-am/#!/page/home';
  const reportDir = path.resolve(process.cwd(), 'playwright/reports');
  fs.mkdirSync(reportDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const responseHits = [];
  page.on('response', async (response) => {
    try {
      const url = response.url();
      const status = response.status();
      if (!/menu|nav|perfil|notific|home|modul|sistema|usuario/i.test(url)) return;

      let bodySnippet = '';
      const ct = response.headers()['content-type'] || '';
      if (/json|javascript|text/i.test(ct)) {
        const txt = await response.text().catch(() => '');
        bodySnippet = safeSnippet(txt, 450);
      }

      responseHits.push({ url, status, contentType: ct, bodySnippet });
    } catch {}
  });

  try {
    await maybeLogin(page, env);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

    // Wait window for AngularJS async menu binding / API completion.
    await page.waitForTimeout(12000);

    const domAndAngular = await page.evaluate(() => {
      function txt(v) {
        return (v || '').replace(/\s+/g, ' ').trim();
      }

      const nav = document.querySelector('ul#nav.nav');
      const liNodes = nav ? Array.from(nav.querySelectorAll('li')) : [];
      const anchorNodes = nav ? Array.from(nav.querySelectorAll('a[href]')) : [];

      const navLis = liNodes.map((li) => ({
        className: li.className || '',
        text: txt(li.textContent || '')
      }));

      const navLinks = anchorNodes.map((a) => ({
        text: txt(a.textContent || ''),
        href: a.getAttribute('href') || ''
      }));

      const ngInfo = {
        hasAngular: Boolean(window.angular),
        scopeMenusLength: null,
        rootMenusLength: null,
        menuSample: [],
        errors: []
      };

      try {
        if (window.angular) {
          const bodyEl = document.body;
          const ngEl = window.angular.element(bodyEl);
          const injector = ngEl.injector && ngEl.injector();

          if (injector) {
            const $rootScope = injector.get('$rootScope');
            if (Array.isArray($rootScope.menus)) {
              ngInfo.rootMenusLength = $rootScope.menus.length;
              ngInfo.menuSample = $rootScope.menus.slice(0, 5).map((m) => ({
                nome: m.nome || m.name || '',
                link: m.link || m.url || m.route || '',
                children: Array.isArray(m.subMenus) ? m.subMenus.length : Array.isArray(m.children) ? m.children.length : null
              }));
            }

            const navEl = document.querySelector('#nav');
            if (navEl) {
              const navScope = window.angular.element(navEl).scope && window.angular.element(navEl).scope();
              if (navScope && Array.isArray(navScope.menus)) {
                ngInfo.scopeMenusLength = navScope.menus.length;
                if (ngInfo.menuSample.length === 0) {
                  ngInfo.menuSample = navScope.menus.slice(0, 5).map((m) => ({
                    nome: m.nome || m.name || '',
                    link: m.link || m.url || m.route || '',
                    children: Array.isArray(m.subMenus) ? m.subMenus.length : Array.isArray(m.children) ? m.children.length : null
                  }));
                }
              }
            }
          }
        }
      } catch (e) {
        ngInfo.errors.push(String(e && e.message ? e.message : e));
      }

      return {
        title: document.title,
        location: window.location.href,
        navExists: Boolean(nav),
        navLiCount: liNodes.length,
        navLinkCount: anchorNodes.length,
        navLis,
        navLinks,
        ngInfo
      };
    });

    await page.screenshot({ path: path.join(reportDir, 'angular-nav-inspect.png'), fullPage: true });

    const report = {
      generatedAt: new Date().toISOString(),
      targetUrl,
      finalUrl: page.url(),
      domAndAngular,
      responseHits: responseHits.slice(0, 80),
      evidence: 'playwright/reports/angular-nav-inspect.png'
    };

    fs.writeFileSync(path.join(reportDir, 'angular-nav-inspect.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({
      finalUrl: report.finalUrl,
      navExists: domAndAngular.navExists,
      navLiCount: domAndAngular.navLiCount,
      navLinkCount: domAndAngular.navLinkCount,
      scopeMenusLength: domAndAngular.ngInfo.scopeMenusLength,
      rootMenusLength: domAndAngular.ngInfo.rootMenusLength,
      responseHits: report.responseHits.length
    }, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
})().catch((err) => {
  console.error(err && err.message ? err.message : String(err));
  process.exit(1);
});
