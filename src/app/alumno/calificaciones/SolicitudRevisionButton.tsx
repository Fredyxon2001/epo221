'use client';
import { useRef, useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { crearSolicitudRevision } from '@/app/alumno/solicitudes/actions';
import { EmojiFilePicker } from '@/components/EmojiFilePicker';

type Parcial = { n: number; valor: number | null; yaSolicitado: boolean };

export function SolicitudRevisionButton({
  asignacionId,
  materiaNombre,
  docente,
  parciales,
}: {
  asignacionId: string;
  materiaNombre: string;
  docente: string;
  parciales: Parcial[];
}) {
  const [open, setOpen] = useState(false);
  const [parcial, setParcial] = useState<number>(parciales.find((p) => p.valor != null && !p.yaSolicitado)?.n ?? parciales[0].n);
  const [motivo, setMotivo] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertEmoji(e: string) {
    const ta = textareaRef.current;
    if (!ta) { setMotivo((m) => m + e); return; }
    const start = ta.selectionStart ?? motivo.length;
    const end = ta.selectionEnd ?? motivo.length;
    const nuevo = motivo.slice(0, start) + e + motivo.slice(end);
    setMotivo(nuevo);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + e.length;
    });
  }

  const pendAnyOpen = parciales.some((p) => p.yaSolicitado);

  return (
    <>
      <button
        onClick={() => { setOpen(true); setErr(null); setOk(false); }}
        className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition ${
          pendAnyOpen
            ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            : 'bg-white text-verde border-verde/30 hover:bg-verde hover:text-white'
        }`}
        title="Solicitar revisión"
      >
        {pendAnyOpen ? '⏳ En revisión' : '💬 Solicitar'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => !pending && setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 6 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="bg-gradient-to-r from-verde-oscuro via-verde to-verde-medio text-white p-5">
                <div className="text-[10px] uppercase tracking-[0.3em] text-verde-claro">Solicitud de revisión</div>
                <div className="font-serif text-xl mt-1">{materiaNombre}</div>
                <div className="text-xs text-white/70 mt-0.5">Docente: {docente}</div>
              </div>

              {ok ? (
                <div className="p-8 text-center">
                  <div className="text-5xl mb-3">✅</div>
                  <div className="font-serif text-lg text-verde-oscuro">Solicitud enviada</div>
                  <p className="text-sm text-gray-600 mt-2">
                    El docente recibirá la notificación y responderá por este mismo canal.
                    Puedes ver el estado en <strong>Mis solicitudes</strong>.
                  </p>
                  <button
                    onClick={() => { setOpen(false); setMotivo(''); setFile(null); }}
                    className="mt-5 bg-verde text-white font-semibold px-5 py-2 rounded-lg hover:bg-verde-oscuro"
                  >
                    Entendido
                  </button>
                </div>
              ) : (
                <form
                  action={(fd) => {
                    setErr(null);
                    fd.set('asignacion_id', asignacionId);
                    fd.set('parcial', String(parcial));
                    fd.set('motivo', motivo);
                    if (file) fd.set('adjunto', file);
                    start(async () => {
                      const res = await crearSolicitudRevision(fd);
                      if (res?.error) setErr(res.error);
                      else setOk(true);
                    });
                  }}
                  encType="multipart/form-data"
                  className="p-5 space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">Parcial a revisar</label>
                    <div className="flex gap-2 flex-wrap">
                      {parciales.map((p) => {
                        const disabled = p.yaSolicitado;
                        const active = parcial === p.n;
                        return (
                          <button
                            key={p.n}
                            type="button"
                            disabled={disabled}
                            onClick={() => setParcial(p.n)}
                            className={`flex-1 min-w-[90px] p-2.5 rounded-lg border-2 text-center transition ${
                              disabled
                                ? 'bg-amber-50 border-amber-200 text-amber-700 cursor-not-allowed opacity-70'
                                : active
                                  ? 'border-verde bg-verde-claro/20 text-verde-oscuro'
                                  : 'border-gray-200 hover:border-verde/40'
                            }`}
                          >
                            <div className="text-[10px] uppercase tracking-wider opacity-70">Parcial {p.n}</div>
                            <div className="font-serif text-xl tabular-nums">
                              {p.valor != null ? p.valor.toFixed(1) : '—'}
                            </div>
                            {disabled && <div className="text-[9px] mt-0.5">⏳ En revisión</div>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">
                      ¿Por qué solicitas la revisión?
                    </label>
                    <textarea
                      ref={textareaRef}
                      name="motivo"
                      required
                      minLength={15}
                      rows={5}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Explica con detalle el motivo: ej. 'Entregué el proyecto final el 14 de mayo y no aparece registrado, adjunto evidencia…'"
                      className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:border-verde focus:ring-4 focus:ring-verde/10 outline-none transition"
                    />
                    <div className="flex justify-between text-[11px] text-gray-500 mt-1">
                      <span>Sé específico y respetuoso.</span>
                      <span className={motivo.length < 15 ? 'text-rose-500' : 'text-verde'}>{motivo.length}/15 mín.</span>
                    </div>
                    <div className="mt-2">
                      <EmojiFilePicker
                        onInsertEmoji={insertEmoji}
                        onFileChange={setFile}
                        file={file}
                      />
                    </div>
                  </div>

                  {err && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg p-3 flex items-start gap-2">
                      <span>⚠️</span><span>{err}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      disabled={pending}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={pending || motivo.length < 15}
                      className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-5 py-2 rounded-lg shadow-md shadow-verde/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {pending ? 'Enviando…' : 'Enviar solicitud'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
