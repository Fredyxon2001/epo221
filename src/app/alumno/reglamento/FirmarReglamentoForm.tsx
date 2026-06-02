'use client';
import { useState, useTransition } from 'react';

export function FirmarReglamentoForm({
  reglamentoId,
  firmar,
}: {
  reglamentoId: string;
  firmar: (fd: FormData) => Promise<any> | void;
}) {
  const [acepto, setAcepto] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="bg-gradient-to-br from-amber-50 to-white border-2 border-amber-300 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="text-3xl">✍️</div>
        <div>
          <h3 className="font-bold text-lg text-[#6b4d05]">Firma de conformidad</h3>
          <p className="text-sm text-gray-600 mt-0.5">
            Para continuar usando el sistema, lee y firma el reglamento institucional.
          </p>
        </div>
      </div>

      <form
        action={(fd) => {
          fd.set('reglamento_id', reglamentoId);
          start(async () => { await firmar(fd); });
        }}
      >
        <label className="flex items-start gap-3 text-sm bg-white rounded-xl border border-amber-200 p-4 cursor-pointer hover:border-amber-400 transition">
          <input
            type="checkbox"
            required
            checked={acepto}
            onChange={(e) => setAcepto(e.target.checked)}
            className="mt-0.5 w-5 h-5 accent-verde shrink-0"
          />
          <span className="text-gray-700 leading-relaxed">
            He leído y <strong className="text-verde-oscuro">acepto en su totalidad</strong> el reglamento institucional de la EPO 221.
            Entiendo que esta firma digital tiene validez para fines internos y queda registrada con fecha y hora.
          </span>
        </label>

        <button
          type="submit"
          disabled={!acepto || pending}
          className="mt-4 w-full md:w-auto bg-verde hover:bg-verde-oscuro text-white font-bold px-8 py-3 rounded-xl shadow-md shadow-verde/30 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {pending ? 'Firmando…' : '✍️ Firmar digitalmente'}
        </button>
      </form>
    </div>
  );
}
