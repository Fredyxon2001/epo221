'use client';
import { useEffect, useState } from 'react';

/**
 * Toggle modo oscuro. Persiste en localStorage ('epo221-theme').
 * Aplica `dark` en <html> (Tailwind darkMode: 'class').
 */
export function DarkModeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('epo221-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = saved ? saved === 'dark' : prefersDark;
    setDark(initial);
    document.documentElement.classList.toggle('dark', initial);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('epo221-theme', next ? 'dark' : 'light');
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-700 flex items-center justify-center text-base transition"
      aria-label="Cambiar tema"
    >
      {dark ? '☀️' : '🌙'}
    </button>
  );
}
