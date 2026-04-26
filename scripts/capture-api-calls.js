const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { getRequiredEnv } = require('../playwright/support/env');
const { maybeLogin, saveStorageState } = require('../playwright/support/auth');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function clean(v) {
  return (v || '').replace(/\s+/g, ' ').trim();
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function looksSensitiveKey(k) {
  return /authorization|cookie|set-cookie|token|secret|password|passwd|jwt|bearer|apikey|api-key|x-auth|session/i.test(String(k || ''));
}

function redactValueByKey(key, value) {
  if (looksSensitiveKey(key)) return '[REDACTED]';
  if (typeof value === 'string' && value.length > 200) return `${value.slice(0, 200)}...[truncated]`;
  return value;
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = sanitizeObject(v);
      continue;
    }
    if (Array.isArray(v)) {
      out[k] = v.map((x) => (typeof x === 'object' ? sanitizeObject(x) : redactValueByKey(k, x)));
      continue;
    }
    out[k] = redactValueByKey(k, v);
  }
  return out;
}

function summarizePayload(payload) {
  if (!payload) return { kind: 'none', keys: [] };

  if (typeof payload === 'string') {
    const asJson = tryParseJson(payload);
    if (asJson && typeof asJson === 'object') {
      return {
        kind: 'json',
        keys: Object.keys(asJson).sort(),
        sample: sanitizeObject(asJson)
      };
    }

    const params = new URLSearchParams(payload);
    const entries = Array.from(params.entries());
    if (entries.length > 0) {
      const sample = {};
      for (const [k, v] of entries) sample[k] = redactValueByKey(k, v);
      return { kind: 'form-urlencoded', keys: Object.keys(sample).sort(), sample };
    }

    return { kind: 'text', keys: [], sample: payload.length > 300 ? `${payload.slice(0, 300)}...[truncated]` : payload };
  }

  if (typeof payload === 'object') {
    return {
      kind: Array.isArray(payload) ? 'json-array' : 'json',
      keys: Array.isArray(payload) ? [] : Object.keys(payload).sort(),
      sample: sanitizeObject(payload)
    };
  }

  return { kind: typeof payload, keys: [] };
}

function classifyAuth(headers) {
  const lower = Object.fromEntries(Object.entries(headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
  const out = {
    usesAuthorizationHeader: Boolean(lower.authorization),
    authorizationScheme: '',
    usesCookieHeader: Boolean(lower.cookie),
    tokenLikeHeaders: Object.keys(lower).filter((k) => /token|jwt|x-auth|authorization|apikey|api-key/i.test(k))
  };

  if (lower.authorization) {
    const a = String(lower.authorization);
    if (/^bearer\s+/i.test(a)) out.authorizationScheme = 'Bearer';
    else if (/^basic\s+/i.test(a)) out.authorizationScheme = 'Basic';
    else out.authorizationScheme = 'Other';
  }

  return out;
}

function hashRouteFromUrl(url) {
  try {
    const u = new URL(url);
    if (u.hash && u.hash.startsWith('#!')) return u.hash;
  } catch {
    // noop
  }
  return '';
}

function inferMethodFromActionText(text) {
  const t = clean(String(text || '')).toLowerCase();
  if (!t) return '';
  if (/(excluir|remover|deletar|apagar|delete|remove)/i.test(t)) return 'DELETE';
  if (/(editar|alterar|atualizar|update|save changes|salvar altera)/i.test(t)) return 'PUT';
  if (/(criar|novo|adicionar|incluir|cadastrar|registrar|save|salvar)/i.test(t)) return 'POST';
  if (/(restaurar|patch)/i.test(t)) return 'PATCH';
  return '';
}

function extractApiPath(urlOrPath) {
  if (!urlOrPath) return '';
  try {
    const u = new URL(urlOrPath);
    return /\/api\//i.test(u.pathname) ? u.pathname : '';
  } catch {
    const s = String(urlOrPath);
    if (/^\/.+/.test(s) && /\/api\//i.test(s)) return s.split('?')[0];
    return '';
  }
}

function moduleFromRoute(route) {
  const m = String(route || '').match(/^#!\/([^/?#]+)/);
  return m ? m[1] : '';
}

function isLikelyEditContext(route) {
  const s = String(route || '').toLowerCase();
  return /(editar|alterar|update|\/\d+($|[/?#])|[?&](id|codigo|cd|pk)=\d+)/i.test(s);
}

function inferMethodFromAction(action, route) {
  const text = clean(`${action.label || ''} ${action.ngClick || ''} ${action.formNgSubmit || ''} ${action.type || ''}`).toLowerCase();
  const score = { POST: 0, PUT: 0, PATCH: 0, DELETE: 0 };
  const reasons = [];
  const add = (method, points, reason) => {
    score[method] += points;
    reasons.push(`${method}+${points}:${reason}`);
  };

  if (/(excluir|remover|deletar|apagar|delete|remove|destroy)/i.test(text)) add('DELETE', 9, 'destructive verb');
  if (/(inativar|desativar|ativar|restaurar|reanalisar|aprovar parcialmente|patch)/i.test(text)) add('PATCH', 6, 'partial state-change verb');
  if (/(editar|alterar|atualizar|update)/i.test(text)) add('PUT', 7, 'update verb');
  if (/(criar|novo|adicionar|incluir|cadastrar|registrar)/i.test(text)) add('POST', 8, 'create verb');
  if (/(salvar|save|confirmar|enviar)/i.test(text)) {
    if (isLikelyEditContext(route)) add('PUT', 5, 'save in edit context');
    else add('POST', 5, 'save in create context');
  }
  if (/\bbtn-danger\b|\bdanger\b/i.test(action.className || '')) add('DELETE', 4, 'danger style');
  if ((action.type || '').toLowerCase() === 'submit') {
    if (isLikelyEditContext(route)) add('PUT', 3, 'submit in edit context');
    else add('POST', 3, 'submit likely create');
  }
  if ((action.href || '').toLowerCase().includes('excluir')) add('DELETE', 6, 'href indicates delete');
  if ((action.ngClick || '').toLowerCase().includes('excluir')) add('DELETE', 6, 'ng-click indicates delete');
  if ((action.ngClick || '').toLowerCase().includes('alterar') || (action.ngClick || '').toLowerCase().includes('atualizar')) {
    add('PUT', 6, 'ng-click indicates update');
  }
  if ((action.ngClick || '').toLowerCase().includes('salvar')) {
    if (isLikelyEditContext(route)) add('PUT', 4, 'ng-click save in edit context');
    else add('POST', 4, 'ng-click save in create context');
  }

  const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const topMethod = ranked[0][0];
  const topScore = ranked[0][1];
  const secondScore = ranked[1][1];
  let confidence = 'low';
  if (topScore >= 9 && topScore - secondScore >= 3) confidence = 'high';
  else if (topScore >= 6) confidence = 'medium';

  return {
    inferredMethod: topScore > 0 ? topMethod : (inferMethodFromActionText(text) || 'UNKNOWN'),
    confidence,
    score,
    reasons
  };
}

function inferPathHintsFromAction(action, route, observedModulePaths) {
  const hints = new Set();
  const direct = [
    extractApiPath(action.href),
    extractApiPath(action.formAction),
    extractApiPath(action.ngClick)
  ].filter(Boolean);
  for (const p of direct) hints.add(p);

  const module = moduleFromRoute(route);
  if (observedModulePaths && observedModulePaths.length > 0) {
    for (const p of observedModulePaths) hints.add(p);
  } else if (module) {
    hints.add(`/detran-am/api/${module}`);
  }
  return Array.from(hints);
}

function inferPathHintFromRoute(route) {
  // Heuristic only; actual method/path captured by probe is preferred.
  const m = String(route || '').match(/^#!\/([^/]+)/);
  if (!m) return '';
  return `/detran-am/api/${m[1]}`;
}

(async () => {
  const env = getRequiredEnv();
  const routesInventory = readJson(path.resolve(process.cwd(), 'inventories/routes.json'));
  const routeList = (routesInventory.routes || [])
    .map((r) => r.path)
    .filter((r) => typeof r === 'string' && r.startsWith('#!'))
    .filter((r) => !['#!/login'].includes(r));

  const baseRoot = env.baseUrl.includes('#') ? env.baseUrl.split('#')[0] : env.baseUrl;
  const origin = new URL(baseRoot).origin;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const callMap = new Map();
  const mutationProbeMap = new Map();
  const mutationCandidates = [];
  const prefillEvidence = [];
  let probeContext = null;

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    if (probeContext && isMutating) {
      try {
        const url = request.url();
        if (url.startsWith(origin)) {
          const u = new URL(url);
          const key = `${method} ${u.pathname}`;
          if (!mutationProbeMap.has(key)) {
            mutationProbeMap.set(key, {
              method,
              path: u.pathname,
              sampleUrl: url,
              hitCount: 0,
              statuses: new Set(),
              queryKeys: new Set(),
              calledFromRoutes: new Set(),
              requestHeadersObserved: {},
              authInference: {
                usesAuthorizationHeader: false,
                authorizationScheme: '',
                usesCookieHeader: false,
                tokenLikeHeaders: new Set()
              },
              payloadKinds: new Set(),
              payloadKeys: new Set(),
              payloadSamples: [],
              inferredFromActions: new Set(),
              source: 'mutating-action-probe-aborted'
            });
          }

          const rec = mutationProbeMap.get(key);
          rec.hitCount += 1;
          rec.calledFromRoutes.add(probeContext.route);
          rec.inferredFromActions.add(`${probeContext.label} | ${probeContext.ngClick || ''}`.trim());
          for (const [k] of u.searchParams.entries()) rec.queryKeys.add(k);

          const reqHeaders = request.headers();
          for (const [k, v] of Object.entries(reqHeaders || {})) {
            if (!(k in rec.requestHeadersObserved)) rec.requestHeadersObserved[k] = redactValueByKey(k, v);
          }

          const ai = classifyAuth(reqHeaders || {});
          rec.authInference.usesAuthorizationHeader = rec.authInference.usesAuthorizationHeader || ai.usesAuthorizationHeader;
          rec.authInference.usesCookieHeader = rec.authInference.usesCookieHeader || ai.usesCookieHeader;
          if (!rec.authInference.authorizationScheme && ai.authorizationScheme) rec.authInference.authorizationScheme = ai.authorizationScheme;
          for (const h of ai.tokenLikeHeaders) rec.authInference.tokenLikeHeaders.add(h);

          const postData = request.postData();
          const parsedPayload = postData ? (tryParseJson(postData) || postData) : null;
          const p = summarizePayload(parsedPayload);
          rec.payloadKinds.add(p.kind);
          for (const k of p.keys || []) rec.payloadKeys.add(k);
          if (p.sample && rec.payloadSamples.length < 3) {
            rec.payloadSamples.push(sanitizeObject(p.sample));
          }

          // We abort mutating calls during probe to avoid side effects.
          rec.statuses.add(0);
        }
      } catch {
        // noop
      }
      await route.abort();
      return;
    }

    await route.continue();
  });

  page.on('requestfinished', async (request) => {
    try {
      const url = request.url();
      if (!url.startsWith(origin)) return;
      if (!/\/api\//i.test(url)) return;

      const method = request.method();
      const routeAtCapture = hashRouteFromUrl(page.url()) || page.url();
      const response = await request.response();
      const status = response ? response.status() : null;
      const reqHeaders = request.headers();
      const resHeaders = response ? response.headers() : {};

      const postData = request.postData();
      let parsedPayload = null;
      if (postData) {
        parsedPayload = tryParseJson(postData);
        if (!parsedPayload) parsedPayload = postData;
      }

      const u = new URL(url);
      const key = `${method} ${u.pathname}`;

      if (!callMap.has(key)) {
        callMap.set(key, {
          method,
          path: u.pathname,
          sampleUrl: url,
          statuses: new Set(),
          queryKeys: new Set(),
          calledFromRoutes: new Set(),
          hitCount: 0,
          requestHeadersObserved: {},
          responseHeadersObserved: {},
          authInference: {
            usesAuthorizationHeader: false,
            authorizationScheme: '',
            usesCookieHeader: false,
            tokenLikeHeaders: new Set()
          },
          payloadKinds: new Set(),
          payloadKeys: new Set(),
          payloadSamples: []
        });
      }

      const rec = callMap.get(key);
      rec.hitCount += 1;
      if (status != null) rec.statuses.add(status);
      rec.calledFromRoutes.add(routeAtCapture);
      for (const [k] of u.searchParams.entries()) rec.queryKeys.add(k);

      for (const [k, v] of Object.entries(reqHeaders || {})) {
        if (!(k in rec.requestHeadersObserved)) rec.requestHeadersObserved[k] = redactValueByKey(k, v);
      }
      for (const [k, v] of Object.entries(resHeaders || {})) {
        if (!(k in rec.responseHeadersObserved)) rec.responseHeadersObserved[k] = redactValueByKey(k, v);
      }

      const ai = classifyAuth(reqHeaders || {});
      rec.authInference.usesAuthorizationHeader = rec.authInference.usesAuthorizationHeader || ai.usesAuthorizationHeader;
      rec.authInference.usesCookieHeader = rec.authInference.usesCookieHeader || ai.usesCookieHeader;
      if (!rec.authInference.authorizationScheme && ai.authorizationScheme) rec.authInference.authorizationScheme = ai.authorizationScheme;
      for (const h of ai.tokenLikeHeaders) rec.authInference.tokenLikeHeaders.add(h);

      const p = summarizePayload(parsedPayload);
      rec.payloadKinds.add(p.kind);
      for (const k of p.keys || []) rec.payloadKeys.add(k);
      if (p.sample && rec.payloadSamples.length < 3) {
        rec.payloadSamples.push(sanitizeObject(p.sample));
      }
    } catch {
      // ignore noisy request failures
    }
  });

  try {
    await maybeLogin(page, env);

    for (const route of routeList) {
      const target = `${baseRoot}${route}`;
      await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(300);

      // Discover mutating actions visible in current route.
      const discovered = await page.evaluate(() => {
        const cleanTxt = (v) => (v || '').replace(/\s+/g, ' ').trim();
        const visible = (el) => {
          if (!el) return false;
          const st = window.getComputedStyle(el);
          if (st.display === 'none' || st.visibility === 'hidden') return false;
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        };
        const nodes = Array.from(
          document.querySelectorAll('button, [role=\"button\"], a[ng-click], button[ng-click], input[type=\"submit\"], .btn, md-button')
        ).filter((n) => visible(n));

        let seq = 0;
        const out = [];
        for (const n of nodes) {
          const label = cleanTxt(n.textContent || n.getAttribute('aria-label') || n.getAttribute('title') || n.value || '');
          const ngClick = n.getAttribute('ng-click') || '';
          const className = n.getAttribute('class') || '';
          const form = n.closest('form');
          const hostComponent = n.closest('[ng-controller],[ui-view],[data-ui-view],[ng-include]');
          const attrs = `${label} ${ngClick}`.toLowerCase();
          if (!/(salvar|save|criar|novo|adicionar|incluir|cadastrar|editar|alterar|atualizar|update|excluir|remover|deletar|apagar|delete|remove|patch)/i.test(attrs)) {
            continue;
          }
          const probeId = `api-probe-${Date.now()}-${seq += 1}`;
          n.setAttribute('data-api-probe-id', probeId);
          out.push({
            probeId,
            label,
            ngClick,
            href: n.getAttribute('href') || '',
            tag: n.tagName.toLowerCase(),
            type: n.getAttribute('type') || '',
            className,
            formId: form ? (form.getAttribute('id') || '') : '',
            formName: form ? (form.getAttribute('name') || '') : '',
            formAction: form ? (form.getAttribute('action') || '') : '',
            formMethod: form ? (form.getAttribute('method') || '') : '',
            formNgSubmit: form ? (form.getAttribute('ng-submit') || '') : '',
            hostComponent: hostComponent ? (hostComponent.getAttribute('ng-controller') || hostComponent.getAttribute('id') || hostComponent.tagName.toLowerCase()) : ''
          });
          if (out.length >= 8) break;
        }
        return out;
      });

      const module = moduleFromRoute(route);
      const observedModulePaths = Array.from(callMap.values())
        .map((r) => r.path)
        .filter((p) => typeof p === 'string' && p.includes('/api/'))
        .filter((p) => !module || p.toLowerCase().includes(`/${module.toLowerCase()}`))
        .slice(0, 8);

      for (const c of discovered) {
        const methodInference = inferMethodFromAction(c, route);
        const pathHints = inferPathHintsFromAction(c, route, observedModulePaths);
        mutationCandidates.push({
          route,
          label: c.label,
          ngClick: c.ngClick,
          href: c.href,
          tag: c.tag,
          type: c.type,
          className: c.className,
          formId: c.formId,
          formName: c.formName,
          formAction: c.formAction,
          formMethod: c.formMethod,
          formNgSubmit: c.formNgSubmit,
          hostComponent: c.hostComponent,
          inferredMethod: methodInference.inferredMethod || 'UNKNOWN',
          methodScore: methodInference.score,
          methodReasons: methodInference.reasons,
          inferredPathHint: pathHints[0] || inferPathHintFromRoute(route),
          inferredPathHints: pathHints,
          confidence: methodInference.confidence
        });
      }

      // Seed required form fields with safe dummy values before probing action clicks.
      for (const c of discovered) {
        const seeded = await page.evaluate((probeId) => {
          const node = document.querySelector(`[data-api-probe-id="${probeId}"]`);
          if (!node) return null;
          const form = node.closest('form');
          if (!form) return null;

          const isVisible = (el) => {
            const st = window.getComputedStyle(el);
            if (st.display === 'none' || st.visibility === 'hidden') return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          };
          const emit = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
          const controls = Array.from(form.querySelectorAll('input, select, textarea'));
          const touched = [];

          const requiredLike = (el) => {
            const a = `${el.getAttribute('required') || ''} ${el.getAttribute('ng-required') || ''} ${el.getAttribute('aria-required') || ''}`.toLowerCase();
            return el.required || /true|required/.test(a);
          };

          for (const el of controls) {
            if (el.disabled || el.readOnly || !isVisible(el)) continue;

            const tag = el.tagName.toLowerCase();
            const type = (el.getAttribute('type') || '').toLowerCase();
            const mustFill = requiredLike(el);
            const empty = tag === 'select'
              ? !el.value
              : type === 'checkbox'
                ? !el.checked
                : !String(el.value || '').trim();
            if (!mustFill && !empty) continue;
            if (!mustFill && !['text', 'number', 'email', 'tel', 'date', 'datetime-local'].includes(type) && tag !== 'textarea' && tag !== 'select') {
              continue;
            }

            let changed = false;
            if (tag === 'select') {
              const options = Array.from(el.options || []).filter((o) => !o.disabled && String(o.value || '').trim() !== '');
              if (options.length > 0) {
                el.value = options[0].value;
                changed = true;
              }
            } else if (type === 'checkbox') {
              if (!el.checked) {
                el.checked = true;
                changed = true;
              }
            } else if (type === 'radio') {
              if (el.name) {
                const group = Array.from(form.querySelectorAll('input[type="radio"]'))
                  .filter((r) => r.getAttribute('name') === el.name && !r.disabled && isVisible(r));
                const first = group[0];
                if (first && !first.checked) {
                  first.checked = true;
                  emit(first, 'change');
                  changed = true;
                }
              } else if (!el.checked) {
                el.checked = true;
                changed = true;
              }
            } else if (type === 'number') {
              if (!String(el.value || '').trim()) {
                el.value = '1';
                changed = true;
              }
            } else if (type === 'email') {
              if (!String(el.value || '').trim()) {
                el.value = 'crawler@example.invalid';
                changed = true;
              }
            } else if (type === 'date') {
              if (!String(el.value || '').trim()) {
                el.value = '2026-01-01';
                changed = true;
              }
            } else if (type === 'datetime-local') {
              if (!String(el.value || '').trim()) {
                el.value = '2026-01-01T10:00';
                changed = true;
              }
            } else {
              if (!String(el.value || '').trim()) {
                el.value = 'x';
                changed = true;
              }
            }

            if (changed) {
              emit(el, 'input');
              emit(el, 'change');
              emit(el, 'blur');
              touched.push({
                name: el.getAttribute('name') || '',
                id: el.getAttribute('id') || '',
                tag,
                type
              });
            }
          }

          return {
            formName: form.getAttribute('name') || '',
            formId: form.getAttribute('id') || '',
            seededControls: touched
          };
        }, c.probeId).catch(() => null);

        if (seeded && Array.isArray(seeded.seededControls) && seeded.seededControls.length > 0) {
          prefillEvidence.push({
            route,
            actionLabel: c.label || '',
            actionNgClick: c.ngClick || '',
            formName: seeded.formName || '',
            formId: seeded.formId || '',
            seededControls: seeded.seededControls
          });
        }
      }

      // Probe mutating actions safely by aborting outgoing mutating API requests.
      for (const c of discovered) {
        const locator = page.locator(`[data-api-probe-id=\"${c.probeId}\"]`).first();
        if (!(await locator.isVisible().catch(() => false))) continue;
        probeContext = { route, label: c.label || '(unnamed action)', ngClick: c.ngClick || '' };
        await locator.click({ timeout: 1500, force: true }).catch(() => {});
        await page.evaluate((probeId) => {
          const node = document.querySelector(`[data-api-probe-id="${probeId}"]`);
          const form = node ? node.closest('form') : null;
          if (!form) return false;
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          return true;
        }, c.probeId).catch(() => false);
        await page.waitForTimeout(400);
        probeContext = null;
      }
    }

    await saveStorageState(context);
  } finally {
    probeContext = null;
    await context.close();
    await browser.close();
  }

  const records = Array.from(callMap.values())
    .map((r) => ({
      method: r.method,
      path: r.path,
      sampleUrl: r.sampleUrl,
      hitCount: r.hitCount,
      statuses: Array.from(r.statuses).sort((a, b) => a - b),
      queryKeys: Array.from(r.queryKeys).sort(),
      calledFromRoutes: Array.from(r.calledFromRoutes).sort(),
      requestHeadersObserved: sanitizeObject(r.requestHeadersObserved),
      responseHeadersObserved: sanitizeObject(r.responseHeadersObserved),
      authInference: {
        ...r.authInference,
        tokenLikeHeaders: Array.from(r.authInference.tokenLikeHeaders).sort()
      },
      payloadKinds: Array.from(r.payloadKinds).sort(),
      payloadKeys: Array.from(r.payloadKeys).sort(),
      payloadSamples: r.payloadSamples
    }))
    .sort((a, b) => (a.path === b.path ? a.method.localeCompare(b.method) : a.path.localeCompare(b.path)));

  const mutationInferredCalls = Array.from(mutationProbeMap.values())
    .map((r) => ({
      method: r.method,
      path: r.path,
      sampleUrl: r.sampleUrl,
      hitCount: r.hitCount,
      statuses: Array.from(r.statuses).sort((a, b) => a - b),
      queryKeys: Array.from(r.queryKeys).sort(),
      calledFromRoutes: Array.from(r.calledFromRoutes).sort(),
      requestHeadersObserved: sanitizeObject(r.requestHeadersObserved),
      authInference: {
        ...r.authInference,
        tokenLikeHeaders: Array.from(r.authInference.tokenLikeHeaders).sort()
      },
      payloadKinds: Array.from(r.payloadKinds).sort(),
      payloadKeys: Array.from(r.payloadKeys).sort(),
      payloadSamples: r.payloadSamples,
      inferredFromActions: Array.from(r.inferredFromActions).sort(),
      source: r.source
    }))
    .sort((a, b) => (a.path === b.path ? a.method.localeCompare(b.method) : a.path.localeCompare(b.path)));

  const outJson = {
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'playwright-route-api-capture',
      origin,
      totalApiMethodPathCalls: records.length,
      inferredMutatingMethodPathCalls: mutationInferredCalls.length,
      routesCrawled: routeList.length,
      note: 'Sensitive values redacted.'
    },
    calls: records,
    inferredMutatingCalls: mutationInferredCalls,
    mutationActionCandidates: mutationCandidates
      .sort((a, b) => a.route.localeCompare(b.route) || String(a.label).localeCompare(String(b.label)))
  };
  outJson.meta.prefilledFormActions = prefillEvidence.length;
  outJson.prefillEvidence = prefillEvidence;

  fs.writeFileSync(path.resolve(process.cwd(), 'inventories/api-calls.json'), JSON.stringify(outJson, null, 2));

  const md = [];
  md.push('# Backend API Call Catalog');
  md.push('');
  md.push(`Generated at: ${outJson.meta.generatedAt}`);
  md.push(`Origin: ${origin}`);
  md.push(`Routes crawled: ${routeList.length}`);
  md.push(`Unique API method+path entries: ${records.length}`);
  md.push(`Inferred mutating API method+path entries: ${mutationInferredCalls.length}`);
  md.push('');
  md.push('## Calls');
  md.push('| Method | Path | Statuses | Hits | Query Keys | Auth/Token Inference | Payload Keys |');
  md.push('|---|---|---|---:|---|---|---|');

  for (const c of records) {
    const auth = [];
    if (c.authInference.usesAuthorizationHeader) auth.push(`Authorization(${c.authInference.authorizationScheme || 'present'})`);
    if (c.authInference.usesCookieHeader) auth.push('Cookie');
    if (c.authInference.tokenLikeHeaders.length > 0) auth.push(`token-headers:${c.authInference.tokenLikeHeaders.join(';')}`);
    md.push(`| ${c.method} | ${c.path} | ${c.statuses.join(', ')} | ${c.hitCount} | ${c.queryKeys.join(', ')} | ${auth.join(' / ')} | ${c.payloadKeys.join(', ')} |`);
  }

  md.push('');
  md.push('## Inferred Mutating Calls (Safe Probe, Aborted)');
  md.push('| Method | Path | Probe Hits | Called From Routes | Inferred From Actions | Payload Keys |');
  md.push('|---|---|---:|---|---|---|');
  for (const c of mutationInferredCalls) {
    md.push(`| ${c.method} | ${c.path} | ${c.hitCount} | ${c.calledFromRoutes.join(', ')} | ${c.inferredFromActions.join(' ; ')} | ${c.payloadKeys.join(', ')} |`);
  }
  if (mutationInferredCalls.length === 0) {
    md.push('| (none) |  | 0 |  |  |  |');
  }

  md.push('');
  md.push('## Mutating Action Candidates (Heuristic)');
  md.push('| Route | Label | ng-click | Form | Host Component | Inferred Method | Path Hint | Confidence |');
  md.push('|---|---|---|---|---|---|---|---|');
  for (const c of mutationCandidates) {
    const formRef = [c.formId, c.formName].filter(Boolean).join('/');
    md.push(`| ${c.route} | ${c.label} | ${c.ngClick} | ${formRef} | ${c.hostComponent || ''} | ${c.inferredMethod} | ${c.inferredPathHint} | ${c.confidence} |`);
  }
  if (mutationCandidates.length === 0) {
    md.push('| (none) |  |  |  |  |  |  |  |');
  }

  md.push('');
  md.push('## Prefill Evidence (Safe Probe)');
  md.push('| Route | Action | Form | Seeded Controls |');
  md.push('|---|---|---|---:|');
  for (const e of prefillEvidence) {
    const formRef = [e.formId, e.formName].filter(Boolean).join('/');
    md.push(`| ${e.route} | ${clean(`${e.actionLabel} ${e.actionNgClick}`)} | ${formRef} | ${e.seededControls.length} |`);
  }
  if (prefillEvidence.length === 0) {
    md.push('| (none) |  |  | 0 |');
  }

  md.push('');
  md.push('## Notes');
  md.push('- Header/payload values are redacted where sensitive.');
  md.push('- Inference is based on observed request metadata during automated route traversal.');
  md.push('- Mutating call probes abort POST/PUT/PATCH/DELETE requests to avoid side effects.');
  md.push('- Safe probe mode pre-fills visible required fields with dummy values to trigger submit flows.');
  md.push('- Full machine-readable details in `inventories/api-calls.json`.');

  fs.writeFileSync(path.resolve(process.cwd(), 'docs/api-calls.md'), `${md.join('\n')}\n`);

  console.log(JSON.stringify({
    routesCrawled: routeList.length,
    uniqueApiMethodPathCalls: records.length,
    inferredMutatingMethodPathCalls: mutationInferredCalls.length,
    mutationActionCandidates: mutationCandidates.length,
    prefilledFormActions: prefillEvidence.length,
    json: 'inventories/api-calls.json',
    md: 'docs/api-calls.md'
  }, null, 2));
})();
