import Link from 'next/link';
import { logoutAction } from '@/app/login/actions';

type Item = { href: string; label: string; icon: string };

export function Sidebar({ items, titulo }: { items: Item[]; titulo: string }) {
  return (
    <aside className="w-64 bg-verde text-white min-h-screen flex flex-col">
      <div className="p-5 border-b border-verde-medio flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-dorado flex items-center justify-center">
          <span className="font-serif font-black text-verde">221</span>
        </div>
        <div>
          <div className="font-serif text-dorado-claro text-sm">EPO 221</div>
          <div className="text-xs text-white/70">{titulo}</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-verde-medio text-sm transition"
          >
            <span className="text-lg">{it.icon}</span>
            <span>{it.label}</span>
          </Link>
        ))}
      </nav>
      <form action={logoutAction} className="p-3 border-t border-verde-medio">
        <button
          type="submit"
          className="w-full text-left px-3 py-2 rounded-md hover:bg-verde-medio text-sm text-white/80"
        >
          ↩ Cerrar sesión
        </button>
      </form>
    </aside>
  );
}
