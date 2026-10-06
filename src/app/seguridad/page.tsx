import { redirect } from 'next/navigation';
import { sessionIdentity } from '@/lib/security/access';
import { panelForRole, safeRedirect } from '@/lib/security/policy';
import { MFAForm } from './MFAForm';
import { logoutAction } from '@/app/login/actions';

export const dynamic = 'force-dynamic';
export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const identity = await sessionIdentity();
  if (!identity) redirect('/login');
  const params = await searchParams;
  const destination = identity.profile.debe_cambiar_password || params.next === 'cambiar-password' ? '/cambiar-password'
    : safeRedirect(params.next ?? '', panelForRole(identity.profile.rol));
  if (identity.aal === 'aal2') redirect(destination);
  const { data, error } = await identity.client.auth.mfa.listFactors();
  if (error) throw new Error('No se pudo comprobar la verificación en dos pasos.');
  const factor = data.totp.find(f => f.status === 'verified');
  return <main className="min-h-screen flex items-center justify-center bg-crema p-6">
    <section className="w-full max-w-md bg-white p-6 rounded-2xl shadow-lg space-y-4">
      <h1 className="font-serif text-2xl text-verde-oscuro">Verificación en dos pasos</h1>
      <p className="text-sm text-gray-600">Protege tu cuenta con una aplicación autenticadora. Conserva el acceso a esa aplicación; si pierdes el dispositivo, solicita ayuda a Control Escolar para verificar tu identidad.</p>
      <MFAForm factorId={factor?.id ?? null} destination={destination} />
      <form action={logoutAction}><button className="text-sm underline text-verde">Cerrar sesión</button></form>
    </section>
  </main>;
}
