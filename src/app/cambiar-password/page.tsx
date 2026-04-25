// Página para cambiar la contraseña (forzado si debe_cambiar_password=true).
import { createClient } from '@/lib/supabase/server';
import { CambiarPasswordForm } from './CambiarPasswordForm';
import { redirect } from 'next/navigation';

export default async function CambiarPasswordPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: p } = await supabase.from('perfiles')
    .select('debe_cambiar_password, nombre, email').eq('id', user.id).maybeSingle();

  return (
    <div className="min-h-screen bg-gradient-to-br from-verde-claro/20 via-crema to-dorado/10 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-verde-oscuro via-verde to-verde-medio text-white p-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-verde-claro">
            {p?.debe_cambiar_password ? 'Contraseña temporal detectada' : 'Mi cuenta'}
          </div>
          <div className="font-serif text-2xl mt-1">🔐 Cambiar contraseña</div>
          {p?.debe_cambiar_password && (
            <p className="text-xs text-white/80 mt-2">
              Por seguridad, debes establecer una contraseña nueva antes de continuar.
            </p>
          )}
        </div>
        <CambiarPasswordForm sugerida={!!p?.debe_cambiar_password} />
      </div>
    </div>
  );
}
