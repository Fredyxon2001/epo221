// Read-only public traversal: uses only explicit tour controls, never target actions.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.FLOW_BASE_URL ?? 'http://localhost:3002';
(async () => {
  const browser = await chromium.launch({ headless: false });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const errors = [], writes = [], resources = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { resources.push(request.url()); });
    await page.goto(base + '/publico');
    const reject = page.getByRole('button', { name: 'Rechazar opcionales', exact: true });
    if (await reject.isVisible()) await reject.click();
    assert.equal(resources.some(url => url.includes('role-avatars')), false, 'Public avatar loaded before opening guide');
    const launch = page.getByRole('button', { name: 'Abrir Guía de uso: Visitantes y familias', exact: true });
    await launch.click();
    const overview = page.getByRole('dialog', { name: 'Tu guía del sistema' });
    await overview.waitFor();
    await overview.getByRole('button', { name: '¿Qué puede hacer mi rol? Visitantes y familias', exact: true }).click();
    const routes = await overview.locator('ul a[href]').evaluateAll(anchors => anchors.map(anchor => anchor.getAttribute('href')));
    assert.ok(routes.includes('/app-movil') && routes.includes('/login'), 'Cross-layout modules missing');
    page.on('request', request => { if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method())) writes.push(request.method()); });
    await overview.getByRole('button', { name: 'Recorrer mis secciones', exact: true }).click();
    const reports = [];
    for (let module = 0; module < routes.length; module++) {
      await page.waitForURL(url => url.pathname === routes[module].split('?')[0]);
      const dialog = page.getByRole('dialog', { name: 'Conoce tus secciones' });
      await dialog.waitFor();
      await dialog.getByText(new RegExp('^Módulo ' + (module + 1) + ' de ' + routes.length + ' ·')).waitFor();
      await dialog.getByText(/^Paso 1 de .*Introducción del módulo/).waitFor();
      // Collection occurs after the navigation commit. The introduction always leads.
      await dialog.getByRole('button', { name: 'Siguiente', exact: true }).waitFor();
      let controls = 0;
      for (let step = 0; step < 1000; step++) {
        const next = dialog.getByRole('button', { name: 'Siguiente', exact: true });
        if (!await next.isVisible()) break;
        await next.click(); controls++;
        assert.equal(new URL(page.url()).pathname, routes[module].split('?')[0], 'Explaining a control changed route');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Guide overflow at 390px');
        const focused = await dialog.evaluate(element => element.contains(document.activeElement));
        assert.equal(focused, true, 'Focus escaped the guide');
      }
      assert.ok(controls > 0, 'Controls omitted');
      await dialog.getByText(/^Fin del módulo\./).waitFor();
      reports.push({ route: routes[module], explainedControls: controls });
      await dialog.getByRole('button', { name: module === routes.length - 1 ? 'Terminar recorrido' : 'Siguiente módulo', exact: true }).click();
    }
    await page.getByRole('dialog', { name: 'Tu guía del sistema' }).getByRole('status').waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal(await page.evaluate(() => document.body.style.overflow), '');
    assert.equal(await launch.evaluate(element => element === document.activeElement), true);
    assert.deepEqual(writes, [], 'Tour submitted a form or target action');
    assert.deepEqual(errors, []);
    // Browser-memory transition must not reopen the tour after a reload.
    await page.reload();
    assert.equal(await page.getByRole('dialog').count(), 0);
    console.log(JSON.stringify({ base, publicModules: reports, mutations: writes.length, runtimeErrors: errors.length, overflow: false, reducedMotion: true, crossLayoutContinuation: true, reloadClosed: true }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
