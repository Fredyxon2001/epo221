'use client';
// Buscador global Cmd+K. Indexa rutas admin y permite navegar.
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Item = { label: string; href: string; group: string; icon?: string; keywords?: string };

const DEFAULT_ITEMS: Item[] = [
  // Personas
  { group: 'Personas', label: 'Alumnos', href: '/admin/alumnos', icon: '🎓' },
  { group: 'Personas', label: 'Solicitudes de ficha', href: '/admin/alumnos/solicitudes-ficha', icon: '📝' },
  { group: 'Personas', label: 'Profesores', href: '/admin/profesores', icon: '👨‍🏫' },
  { group: 'Personas', label: 'Usuarios y contraseñas', href: '/admin/usuarios', icon: '🔑' },
  // Académico
  { group: 'Académico', label: 'Grupos', href: '/admin/grupos', icon: '🏫' },
  { group: 'Académico', label: 'Materias', href: '/admin/materias', icon: '📚' },
  { group: 'Académico', label: 'Asignaciones', href: '/admin/asignaciones', icon: '🔗' },
  { group: 'Académico', label: 'Horarios', href: '/admin/horarios', icon: '🗓️' },
  { group: 'Académico', label: 'Calificaciones', href: '/admin/calificaciones', icon: '📝' },
  { group: 'Académico', label: 'Ciclos', href: '/admin/ciclos', icon: '📅' },
  { group: 'Académico', label: 'Parciales', href: '/admin/parciales', icon: '⏱️' },
  { group: 'Académico', label: 'Solicitudes de parcial', href: '/admin/parciales/solicitudes', icon: '📋' },
  { group: 'Académico', label: 'Planeaciones', href: '/admin/planeaciones', icon: '📝' },
  { group: 'Académico', label: 'Banco de preguntas', href: '/admin/banco-preguntas', icon: '🧠' },
  { group: 'Académico', label: 'Aprendizajes esperados (NEM)', href: '/admin/aprendizajes', icon: '🎯' },
  // Analítica
  { group: 'Analítica', label: 'Generaciones', href: '/admin/generaciones', icon: '📊' },
  { group: 'Analítica', label: 'Alertas', href: '/admin/alertas', icon: '🚨' },
  { group: 'Analítica', label: 'Detección de riesgo', href: '/admin/riesgo', icon: '🧠' },
  { group: 'Analítica', label: 'PMI (Planes de Mejora)', href: '/admin/pmi', icon: '🎯' },
  { group: 'Analítica', label: 'Correos a tutores', href: '/admin/correos', icon: '📧' },
  // Finanzas
  { group: 'Finanzas', label: 'Pagos', href: '/admin/pagos', icon: '💰' },
  { group: 'Finanzas', label: 'Conceptos', href: '/admin/conceptos', icon: '🏷️' },
  { group: 'Finanzas', label: 'Extraordinarios', href: '/admin/extraordinarios', icon: '📘' },
  // Difusión
  { group: 'Difusión', label: 'Noticias', href: '/admin/noticias', icon: '📣' },
  { group: 'Difusión', label: 'Convocatorias', href: '/admin/convocatorias', icon: '📢' },
  { group: 'Difusión', label: 'Anuncios internos', href: '/admin/anuncios', icon: '🔔' },
  { group: 'Difusión', label: 'Avisos con lectura', href: '/admin/avisos', icon: '✅' },
  { group: 'Difusión', label: 'Calendario', href: '/admin/calendario', icon: '📅' },
  { group: 'Difusión', label: 'Sitio público', href: '/admin/publico', icon: '🌐' },
  // Sistema
  { group: 'Sistema', label: 'Auditoría', href: '/admin/auditoria', icon: '🔍' },
  { group: 'Sistema', label: 'Mi perfil', href: '/admin/perfil', icon: '👤' },
  { group: 'Sistema', label: 'Reportes SEIEM', href: '/admin/seiem', icon: '📑' },
];

export function CommandPalette({ items = DEFAULT_ITEMS }: { items?: Item[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((it) =>
      `${it.label} ${it.group} ${it.keywords ?? ''}`.toLowerCase().includes(term),
    );
  }, [q, items]);

  useEffect(() => setCursor(0), [q, open]);

  if (!open) return null;

  const go = (it: Item) => {
    setOpen(false);
    setQ('');
    router.push(it.href);
  };

  const onKeyInput = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[cursor]) go(filtered[cursor]); }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyInput}
          placeholder="Buscar páginas, módulos…  (↑↓ Enter)"
          className="w-full px-4 py-3 text-sm outline-none border-b border-gray-100 dark:border-gray-800 bg-transparent dark:text-white"
        />
        <div className="max-h-[60vh] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">Sin resultados</div>
          ) : (
            filtered.map((it, idx) => (
              <button
                key={it.href}
                onMouseEnter={() => setCursor(idx)}
                onClick={() => go(it)}
                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 ${
                  idx === cursor ? 'bg-verde/10 dark:bg-verde/20' : ''
                }`}
              >
                <span className="text-lg">{it.icon}</span>
                <span className="flex-1 dark:text-white">{it.label}</span>
                <span className="text-[10px] uppercase text-gray-400">{it.group}</span>
              </button>
            ))
          )}
        </div>
        <div className="px-4 py-2 text-[10px] text-gray-400 border-t border-gray-100 dark:border-gray-800 flex justify-between">
          <span>↑↓ navegar · Enter abrir · Esc cerrar</span>
          <span>Cmd/Ctrl + K</span>
        </div>
      </div>
    </div>
  );
}
