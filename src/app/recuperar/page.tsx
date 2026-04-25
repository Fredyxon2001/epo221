import { RecuperarForm } from './RecuperarForm';
import Link from 'next/link';

export default function RecuperarPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-verde-claro/20 via-crema to-dorado/10 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-br from-verde-oscuro via-verde to-verde-medio text-white p-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-verde-claro">Ayuda de acceso</div>
          <div className="font-serif text-2xl mt-1">¿Olvidaste tu contraseña?</div>
          <p className="text-xs text-white/80 mt-2">
            Verifica tus datos y te entregamos una contraseña temporal.
          </p>
        </div>
        <RecuperarForm />
        <div className="border-t px-6 py-4 text-center text-xs text-gray-500">
          <Link href="/login" className="text-verde hover:underline font-semibold">← Volver al inicio de sesión</Link>
        </div>
      </div>
    </div>
  );
}
