'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-verde text-white px-4 py-2 rounded hover:bg-verde-medio text-sm"
    >
      🖨 Imprimir / Guardar PDF
    </button>
  );
}
