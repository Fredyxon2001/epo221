// Real browser layout + synthetic content only; never loads an account or school data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { chromium } = require('playwright');
const { load } = require('./security-loader.cjs');
const { safeHelpHref, authorizedHelpLinks } = load('src/lib/help/walkthrough.ts');
const { describeModule, describeControl, describeField } = load('src/lib/help/catalog.ts');
assert.ok(!/administra|borrador/i.test(describeModule('/publico', 'publico', 'Inicio')), 'Visitor introduction used admin instructions');
assert.ok(/administra/i.test(describeModule('/admin/publico', 'admin', 'Sitio público')), 'Admin CMS context lost');
assert.ok(/bloqueado/i.test(describeControl('Rechazar opcionales', null, 'publico', '/publico')));
assert.ok(!/registro seleccionado/.test(describeControl('Aceptar opcionales', null, 'publico', '/publico')));
assert.ok(/llamadas/.test(describeControl('Teléfono', 'tel:000', 'publico', '/publico/contacto')));
assert.ok(/correo/.test(describeControl('Correo', 'mailto:example@example.invalid', 'publico', '/publico/contacto')));
assert.ok(/DOCX/.test(describeControl('Descargar formato en DOCX', '/api/public/documents/1?format=docx', 'publico', '/publico/descargas')));
assert.ok(/periodo escolar/.test(describeField('Ciclo del documento', 'publico', '/publico/descargas', false)));
assert.ok(/resultado académico/.test(describeField('Campo: Parcial 1', 'profesor', '/profesor/clases', false, 'number')));
for (const href of ['https://evil.invalid/', '//evil.invalid/', '/\\evil.invalid', '/publico/%0aevil', '/admin/%61pi/exportar', '/admin/logout', '/alumno/kardex/pdf', '/app-movil/descargar', '/publico/file.pdf', '/login?next=https://evil.invalid', '/publico/../api/delete']) assert.equal(safeHelpHref(href), null, 'Unsafe tour destination');
assert.equal(safeHelpHref('/publico/guia?ciclo=2026'), '/publico/guia?ciclo=2026');
const links = [{ href: '/publico', label: 'Inicio' }, { href: '/alumno/pendientes', label: 'Pendientes' }, { href: '/admin/ciclos', label: 'Ciclos' }, { href: '/admin/pagos', label: 'Pagos' }, { href: '/profesor/clases', label: 'Clases' }];
assert.deepEqual(Array.from(authorizedHelpLinks(links, 'publico'), l => l.href), ['/publico']);
assert.deepEqual(Array.from(authorizedHelpLinks(links, 'finanzas'), l => l.href), ['/publico', '/admin/pagos']);
assert.deepEqual(Array.from(authorizedHelpLinks(links, 'alumno'), l => l.href), ['/publico', '/alumno/pendientes']);
assert.deepEqual(Array.from(authorizedHelpLinks([...links, links[0]], 'profesor'), l => l.href), ['/publico', '/profesor/clases']);
function compiled(file) { return ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText; }
(async () => {
  const browser = await chromium.launch({ headless: false });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const rows = Array.from({ length: 100 }, (_, i) => `<tr><td>StudentSAMPLE_NAME_${i}</td><td><a href="/admin/alumnos/${i + 1}">StudentSAMPLE_NAME_${i}</a></td><td><button>Editar StudentSAMPLE_NAME_${i}</button><button>Editar StudentSAMPLE_NAME_${i}</button></td><td><input type="number" value="SECRET_VALUE" /></td></tr>`).join('');
    await page.setContent(`<nav><details><summary>Más secciones</summary><a href="/admin/pagos">Pagos</a></details><summary>StudentSAMPLE_NAME_ACCOUNT</summary></nav><main><form><label for="secret">Contraseña</label><input id="secret" type="password" value="SECRET_VALUE"><button>Guardar</button></form><form><button>Guardar</button></form><table><thead><tr><th>Alumno</th><th>Ficha</th><th>Acciones</th><th>Parcial 1</th></tr></thead><tbody>${rows}</tbody></table><a href="/alumno/mensajes/abc">StudentSAMPLE_NAME_CHAT</a><button disabled>Deshabilitado</button><div hidden><button>Oculto</button></div><div inert><button>Bloqueado por otro diálogo</button></div><div inert data-help-background><button>Disponible bajo la guía</button></div><button style="margin-top:1400px">Acción única al final</button><button></button></main><div data-help-root><button>La guía</button></div>`);
    await page.addScriptTag({ content: 'window.__catalog = (() => { const exports={};' + compiled('src/lib/help/catalog.ts') + ';return exports;})();window.__guide = (() => { const exports={}; const require=()=>window.__catalog;' + compiled('src/lib/help/walkthrough.ts') + ';return exports;})();' });
    const result = await page.evaluate(() => {
      let mutations = 0;
      document.addEventListener('click', () => mutations++); document.addEventListener('submit', event => { event.preventDefault(); mutations++; });
      const steps = window.__guide.collectHelpControls('admin', '/admin/alumnos', [{ href: '/admin/pagos', label: 'Pagos' }]);
      return { mutations, steps: steps.map(step => ({ title: step.title, explanation: step.explanation, tag: step.element.tagName })) };
    });
    const text = JSON.stringify(result.steps);
    assert.equal(result.mutations, 0);
    assert.equal(text.includes('StudentSAMPLE_NAME'), false, 'Private record/account/chat names leaked into guide');
    assert.equal(text.includes('SECRET_VALUE'), false, 'Field values leaked into guide');
    assert.equal(result.steps.filter(step => step.title === 'Editar registro').length, 2, 'Distinct row actions must survive while 100 repeated rows collapse');
    assert.equal(result.steps.filter(step => step.title === 'Campo: Parcial 1').length, 1);
    assert.equal(result.steps.filter(step => step.title === 'Guardar').length, 2, 'Different forms keep their unique save action');
    assert.ok(result.steps.some(step => step.title === 'Acción única al final'), 'Below-fold unique action omitted');
    assert.ok(result.steps.some(step => step.title === 'Control de esta pantalla'), 'Unlabelled enabled control omitted');
    assert.ok(result.steps.some(step => step.title === 'Más secciones' && step.explanation.includes('Pagos')));
    assert.ok(result.steps.some(step => step.title === 'Disponible bajo la guía'));
    for (const excluded of ['Deshabilitado', 'Oculto', 'Bloqueado por otro diálogo', 'La guía']) assert.ok(!result.steps.some(step => step.title === excluded));
    assert.equal(await page.locator('details').getAttribute('open'), null, 'Guide opened a menu');
    await page.addScriptTag({content: 'window.__helpNow=Date.now();window.__transition=(()=>{const exports={};const Date={now:()=>window.__helpNow};'+compiled('src/lib/help/transition.ts')+';return exports;})();'});
    const transitions=await page.evaluate(()=>{
      const guide=window.__transition,links=[{href:'/alumno/pendientes',label:'Pendientes'},{href:'/app-movil',label:'App móvil'}];
      guide.resetHelpIdentity('alumno',false,'fixture-A');
      guide.rememberHelpTransition({role:'alumno',orientador:false,identityKey:'fixture-A',links,moduleIndex:1,controlIndex:0});
      const unverified=guide.peekHelpTransition()===null;
      const otherAccount=guide.peekHelpTransition({id:'fixture-B',role:'alumno'})===null;
      const otherRole=guide.peekHelpTransition({id:'fixture-A',role:'admin'})===null;
      const verified=guide.peekHelpTransition({id:'fixture-A',role:'alumno'})?.moduleIndex===1;
      const notTakenByOther=guide.takeHelpTransition('alumno',false,'fixture-B')===null;
      const resumed=guide.takeHelpTransition('alumno',false,'fixture-A')?.moduleIndex===1;
      const once=guide.takeHelpTransition('alumno',false,'fixture-A')===null;
      guide.rememberHelpTransition({role:'alumno',orientador:false,identityKey:'fixture-A',links,moduleIndex:1,controlIndex:0});
      guide.resetHelpIdentity('alumno',false,'fixture-B');
      const changedAccountCleared=guide.peekHelpTransition({id:'fixture-A',role:'alumno'})===null;
      guide.rememberHelpTransition({role:'publico',orientador:false,links:[{href:'/login',label:'Acceso'}],moduleIndex:0,controlIndex:0});
      const publicResume=guide.peekHelpTransition()!==null;
      window.__helpNow+=30001;
      const expired=guide.peekHelpTransition()===null;
      return {unverified,otherAccount,otherRole,verified,notTakenByOther,resumed,once,changedAccountCleared,publicResume,expired};
    });
    assert.ok(Object.values(transitions).every(Boolean),'Shared transitions bypassed identity/role/expiry/one-time validation');
    console.log('PASS guide controls: local role allowlists/action URL rejection; real DOM below-fold controls; 100-row dedup with distinct actions/forms; hidden/disabled/modal exclusions; private names/field values redacted; no clicks/submits/menu opening; shared transitions require matching viewer identity/role, expire, consume once and reset for another account.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
