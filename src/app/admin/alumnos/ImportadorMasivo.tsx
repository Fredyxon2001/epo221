'use client';
import { useState, useRef, useTransition } from 'react';
import { importarAlumnosExcel } from './actions';

export function ImportadorMasivo() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setArchivo(f);
  };

  const sizeMB = archivo ? (archivo.size / 1024 / 1024).toFixed(2) : null;
  const tipoOk = archivo && /\.(xlsx|xls|csv)$/i.test(archivo.name);

  return (
    <div className="space-y-3">
      {/* Botón descargar plantilla */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="flex-1 min-w-[200px]">
          <div className="font-semibold text-amber-900 text-sm">📥 ¿Primera vez? Descarga la plantilla</div>
          <div className="text-xs text-amber-700">XLSX con 3 filas de ejemplo y hoja de instrucciones.</div>
        </div>
        <a
          href="/api/plantilla-alumnos"
          className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow"
          download
        >
          📥 Descargar plantilla XLSX
        </a>
      </div>

      {/* Drag & drop */}
      <form
        action={(fd) => {
          if (!archivo) return;
          fd.set('archivo', archivo);
          start(async () => {
            await importarAlumnosExcel(fd);
          });
        }}
      >
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded-lg p-6 text-center transition ${
            dragOver ? 'border-verde bg-verde-claro/10' :
            archivo ? 'border-verde-medio bg-verde-claro/5' :
            'border-gray-300 hover:border-verde'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          />
          {!archivo ? (
            <>
              <div className="text-5xl mb-2">📤</div>
              <div className="font-semibold text-gray-700">Arrastra tu archivo aquí o haz clic para seleccionar</div>
              <div className="text-xs text-gray-500 mt-1">.xlsx, .xls o .csv · máx 5 MB · ~5,000 alumnos por carga</div>
            </>
          ) : (
            <>
              <div className="text-3xl mb-2">{tipoOk ? '✅' : '⚠️'}</div>
              <div className="font-semibold text-gray-800 break-all">{archivo.name}</div>
              <div className="text-xs text-gray-500 mt-1">{sizeMB} MB</div>
              {!tipoOk && <div className="text-xs text-rose-700 mt-2">⚠️ Solo se aceptan .xlsx, .xls o .csv</div>}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-3">
          {archivo && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setArchivo(null); if (inputRef.current) inputRef.current.value = ''; }}
              className="text-xs text-gray-600 hover:text-rose-700 font-semibold px-3 py-2"
            >
              Quitar archivo
            </button>
          )}
          <button
            type="submit"
            disabled={!archivo || !tipoOk || pending}
            className="bg-verde hover:bg-verde-oscuro text-white font-semibold px-5 py-2 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pending ? 'Importando…' : '📥 Importar alumnos'}
          </button>
        </div>
      </form>

      <div className="text-[11px] text-gray-600 leading-relaxed bg-sky-50 border border-sky-200 rounded p-2 space-y-1">
        <p>💡 <strong>Cómo funciona la cuenta de login:</strong></p>
        <p>• <strong>Email:</strong> se genera como <code className="bg-white px-1">nombre.apellido@epo221.local</code></p>
        <p>• <strong>Password:</strong> <code className="bg-white px-1">TEMPORALEPO221!</code> (igual para todos)</p>
        <p>• <strong>Vinculación:</strong> si re-importas el mismo CURP, se actualiza email y password sin romper la cuenta.</p>
        <p>• Al terminar verás un <strong>botón para descargar las credenciales</strong> en XLSX listo para imprimir.</p>
      </div>
    </div>
  );
}

export function ResultadoImportacion({ creados, actualizados, errores, detalle, importId }: {
  creados?: string;
  actualizados?: string;
  errores?: string;
  detalle?: string;
  importId?: string;
}) {
  if (!creados && !actualizados && !errores) return null;

  let detalleParsed: Array<{ fila: number; curp?: string; razon: string }> = [];
  try { if (detalle) detalleParsed = JSON.parse(detalle); } catch {}

  const tieneErrores = Number(errores ?? 0) > 0;

  return (
    <div className={`rounded-lg p-4 border ${tieneErrores ? 'bg-amber-50 border-amber-300' : 'bg-verde-claro/20 border-verde'}`}>
      <div className="font-semibold text-sm mb-2">
        {tieneErrores ? '⚠️ Importación completada con errores' : '✅ Importación exitosa'}
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-white rounded p-2 text-center">
          <div className="text-2xl font-bold text-verde-oscuro">{creados ?? 0}</div>
          <div className="text-[10px] uppercase text-gray-500">Creados</div>
        </div>
        <div className="bg-white rounded p-2 text-center">
          <div className="text-2xl font-bold text-sky-700">{actualizados ?? 0}</div>
          <div className="text-[10px] uppercase text-gray-500">Actualizados</div>
        </div>
        <div className="bg-white rounded p-2 text-center">
          <div className={`text-2xl font-bold ${tieneErrores ? 'text-rose-700' : 'text-gray-400'}`}>{errores ?? 0}</div>
          <div className="text-[10px] uppercase text-gray-500">Errores</div>
        </div>
      </div>

      {importId && (
        <div className="bg-white rounded p-3 mb-3 border border-verde/30">
          <div className="text-sm font-semibold text-verde-oscuro mb-1">📋 Credenciales generadas</div>
          <p className="text-xs text-gray-600 mb-2">
            Descarga el XLSX con email y contraseña inicial de cada alumno para imprimirlo y entregarlo.
          </p>
          <a
            href={`/api/credenciales-import/${importId}`}
            className="inline-flex items-center gap-2 bg-verde hover:bg-verde-oscuro text-white text-sm font-semibold px-4 py-2 rounded-lg shadow"
            download
          >
            📥 Descargar credenciales XLSX
          </a>
          <p className="text-[10px] text-gray-500 mt-2">
            Patrón de email: <code className="bg-gray-100 px-1">nombre.apellido@epo221.local</code> ·
            Password: <code className="bg-gray-100 px-1">TEMPORALEPO221!</code>
          </p>
        </div>
      )}

      {detalleParsed.length > 0 && (
        <div className="bg-white rounded p-2 text-xs">
          <div className="font-semibold mb-1 text-rose-700">Filas con problemas (primeras 10):</div>
          <ul className="space-y-1">
            {detalleParsed.map((d, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-mono text-gray-500">Fila {d.fila}:</span>
                {d.curp && <span className="font-mono text-gray-700">{d.curp}</span>}
                <span className="text-rose-700 flex-1">{d.razon}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
