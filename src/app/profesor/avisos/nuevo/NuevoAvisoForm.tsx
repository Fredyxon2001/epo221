'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { crearAviso } from '@/app/avisos/actions';
import { EmojiFilePicker } from '@/components/EmojiFilePicker';

export function NuevoAvisoForm({ grupos }: { grupos: any[] }) {
  const router = useRouter();
  const [cuerpo, setCuerpo] = useState('');
  const [gruposSel, setGruposSel] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [alcance, setAlcance] = useState('todos');
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const insertEmoji = (e: string) => setCuerpo((c) => c + e);

  return (
    <form
      action={(fd) => {
        setErr(null);
        fd.set('cuerpo', cuerpo);
        fd.set('alcance', alcance);
        if (alcance === 'grupos') fd.set('grupo_ids', gruposSel.join(','));
        if (file) fd.set('adjunto', file);
        start(async () => {
          const r = await crearAviso(fd);
          if (r?.error) setErr(r.error);
          else router.push('/profesor/avisos');
        });
      }}
      encType="multipart/form-data"
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Título</span>
          <input name="titulo" required minLength={3} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-verde outline-none" />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Prioridad</span>
          <select name="prioridad" defaultValue="normal" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="normal">Normal</option>
            <option value="importante">Importante</option>
            <option value="urgente">Urgente</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Alcance</span>
        <select value={alcance} onChange={(e) => setAlcance(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="todos">Todos mis alumnos y docentes</option>
          <option value="grupos">Grupos específicos</option>
          <option value="tutores">Solo tutores</option>
        </select>
      </label>

      {alcance === 'grupos' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {grupos.map((g) => (
            <label key={g.id} className="flex items-center gap-2 text-xs border rounded p-2 cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={gruposSel.includes(g.id)}
                onChange={(e) => setGruposSel((s) => e.target.checked ? [...s, g.id] : s.filter((x) => x !== g.id))}
              />
              <span>{g.semestre}° {g.grupo} {g.turno}</span>
            </label>
          ))}
        </div>
      )}

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Cuerpo del aviso</span>
        <textarea
          value={cuerpo}
          onChange={(e) => setCuerpo(e.target.value)}
          rows={6}
          required
          minLength={10}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-verde outline-none"
        />
      </label>

      <EmojiFilePicker onInsertEmoji={insertEmoji} onFileChange={setFile} file={file} />

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">Vigencia hasta (opcional)</span>
        <input name="vence_at" type="datetime-local" className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </label>

      {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">⚠️ {err}</div>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-5 py-2 rounded-lg disabled:opacity-50">
          {pending ? 'Publicando…' : 'Publicar aviso'}
        </button>
      </div>
    </form>
  );
}
