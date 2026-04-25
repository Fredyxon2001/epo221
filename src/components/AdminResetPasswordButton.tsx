'use client';
// Botón reutilizable para /admin/alumnos/[id] y /admin/profesores/[id]
// que resetea la contraseña del usuario a EPO221! y marca flag de cambio obligatorio.
import { useState, useTransition } from 'react';
import { adminResetPassword } from '@/app/admin/usuarios/reset-actions';

export function AdminResetPasswordButton({ perfilId, nombre }: { perfilId: string; nombre: string }) {
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setErr(null); setTemp(null); }}
        className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold px-3 py-1.5 rounded-lg border border-amber-300"
        title="Restablecer contraseña"
      >
        🔑 Restablecer contraseña
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !pending && !temp && setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-amber-600 text-white p-4">
              <div className="font-serif text-lg">🔑 Restablecer contraseña</div>
              <div className="text-xs opacity-90">Usuario: {nombre}</div>
            </div>
            <div className="p-5 space-y-3 text-sm">
              {!temp ? (
                <>
                  <p className="text-gray-700">
                    ⚠️ <strong>Solo usa esto en urgencias</strong> (el usuario no puede acceder y el
                    autoservicio falló). El usuario deberá cambiar la contraseña al entrar.
                  </p>
                  <p className="text-gray-600 text-xs">
                    La nueva contraseña temporal será <code className="bg-gray-100 px-1 rounded">EPO221!</code>.
                  </p>
                  {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded p-2">⚠️ {err}</div>}
                  <div className="flex gap-2 justify-end pt-2">
                    <button type="button" onClick={() => setOpen(false)} disabled={pending} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        const fd = new FormData();
                        fd.set('perfil_id', perfilId);
                        start(async () => {
                          const r = await adminResetPassword(fd);
                          if (r?.error) setErr(r.error);
                          else if (r?.temporal) setTemp(r.temporal);
                        });
                      }}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      {pending ? 'Reseteando…' : 'Sí, restablecer'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="text-4xl mb-2">✅</div>
                    <div className="font-serif text-lg text-verde-oscuro">Contraseña restablecida</div>
                    <div className="mt-3 bg-crema/60 border border-dorado rounded-xl p-4 font-mono text-xl tracking-widest text-verde-oscuro">
                      {temp}
                    </div>
                    <p className="text-xs text-gray-600 mt-3">
                      Comunícala al usuario. Al entrar, el sistema le pedirá cambiarla.
                    </p>
                    <button onClick={() => setOpen(false)} className="mt-4 bg-verde text-white font-semibold px-5 py-2 rounded-lg">Cerrar</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
