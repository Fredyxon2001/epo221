// Disposable data only. Sessions/passwords stay in memory and are never logged.
const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { createServerClient } = require('@supabase/ssr');
require('@next/env').loadEnvConfig(process.cwd());
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
function otp(secret) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = 0, value = 0; const bytes = [];
  for (const char of secret.toUpperCase().replace(/=+$/, '')) { value = (value << 5) | alphabet.indexOf(char); bits += 5; if (bits >= 8) { bits -= 8; bytes.push((value >> bits) & 255); } }
  const time = Buffer.alloc(8); time.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = crypto.createHmac('sha1', Buffer.from(bytes)).update(time).digest();
  return String((digest.readUInt32BE(digest[19] & 15) & 0x7fffffff) % 1000000).padStart(6, '0');
}
function createFixtures() {
  const cleanups = [];
  async function row(table, values) {
    const { data, error } = await admin.from(table).insert(values).select('id').single();
    if (error) throw Error(`Fixture ${table}: ${error.code}`);
    cleanups.push(async () => { const r = await admin.from(table).delete().eq('id', data.id); if (r.error) throw Error(`Cleanup ${table}: ${r.error.code}`); });
    return data.id;
  }
  async function account(role, index = 0) {
    const email = `flow-fixture-${crypto.randomUUID()}@example.invalid`, password = crypto.randomBytes(24).toString('base64url');
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nombre: 'Flow Fixture' } });
    if (error) throw Error(`Fixture auth: ${error.code}`);
    const id = data.user.id;
    cleanups.push(async () => {
      for (const bucket of ['security-uploads','avatares']) {
        const files = await admin.storage.from(bucket).list(id);
        if (files.data?.length) {
          const removed = await admin.storage.from(bucket).remove(files.data.map(file => `${id}/${file.name}`));
          if (removed.error) throw Error(`Cleanup storage ${bucket} failed`);
        }
      }
      await admin.from('notificaciones').delete().eq('user_id', id);
      const r = await admin.auth.admin.deleteUser(id); if (r.error) throw Error('Cleanup auth failed');
    });
    const profile = await admin.from('perfiles').upsert({ id, email, nombre: 'Flow Fixture', rol: role, activo: true, debe_cambiar_password: false });
    if (profile.error) throw Error(`Fixture profile: ${profile.error.code}`);
    const cookies = new Map();
    const client = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: { getAll: () => [...cookies.values()], setAll: list => list.forEach(c => cookies.set(c.name, c)) },
    });
    const signed = await client.auth.signInWithPassword({ email, password });
    if (signed.error) throw Error('Fixture login failed');
    const fixture = { id, role, client, cookies, email, password };
    if (role === 'alumno') fixture.studentId = await row('alumnos', { perfil_id: id, curp: `ZZZZ010101HMCXXX${index}`, nombre: 'Flow', apellido_paterno: 'Fixture', matricula: `FLOW${crypto.randomBytes(4).toString('hex')}` });
    if (role === 'profesor') fixture.professorId = await row('profesores', { perfil_id: id, nombre: 'Flow', apellido_paterno: 'Fixture', rfc: `FIX${crypto.randomBytes(5).toString('hex')}`, email });
    return fixture;
  }
  async function enroll(fixture) {
    const result = await fixture.client.auth.mfa.enroll({ factorType: 'totp', issuer: 'EPO221 Flow Test' });
    if (result.error) throw Error('Fixture MFA enrollment failed');
    fixture.factorId = result.data.id; fixture.totp = result.data.totp.secret;
    const verified = await fixture.client.auth.mfa.challengeAndVerify({ factorId: fixture.factorId, code: otp(fixture.totp) });
    if (verified.error) throw Error('Fixture MFA verification failed');
  }
  async function cleanup() {
    const errors = [];
    for (const callback of cleanups.reverse()) { try { await callback(); } catch (error) { errors.push(error.message); } }
    if (errors.length) throw Error(errors.join('; '));
    console.log('PASS: disposable flow data cleaned.');
  }
  return { admin, account, row, enroll, cleanup, cleanups };
}
module.exports = { createFixtures, otp };
