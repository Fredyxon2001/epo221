'use client';
// Botón "Eliminar" con confirmación del navegador. Se usa dentro de un <form action={...}>.
export function ConfirmDeleteButton({ label = 'Eliminar', message = '¿Eliminar esta asignación?' }: { label?: string; message?: string }) {
  return (
    <button
      type="submit"
      className="text-xs text-red-500 hover:underline"
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {label}
    </button>
  );
}
