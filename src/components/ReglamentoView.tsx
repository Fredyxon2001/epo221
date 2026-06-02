// Renderizador bonito del reglamento (markdown ligero, sin dependencias).
// Soporta: # H1, ## H2 (capítulos), ### H3, **negrita**, listas (-, 1.), --- separador, párrafos.
import React from 'react';

function inline(text: string, keyBase: string): React.ReactNode[] {
  // Negritas **...**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={`${keyBase}-b${i}`} className="font-bold text-verde-oscuro">{p.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={`${keyBase}-t${i}`}>{p}</React.Fragment>;
  });
}

export function ReglamentoView({ md }: { md: string }) {
  const lines = md.replace(/\r/g, '').split('\n');
  const blocks: React.ReactNode[] = [];
  let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let capIndex = 0;

  const flushList = (key: string) => {
    if (!listBuffer) return;
    const Tag = listBuffer.type === 'ol' ? 'ol' : 'ul';
    blocks.push(
      <Tag key={key} className={`${listBuffer.type === 'ol' ? 'list-decimal' : 'list-disc'} pl-6 space-y-1.5 my-3 text-gray-700`}>
        {listBuffer.items.map((it, i) => (
          <li key={`${key}-li${i}`} className="leading-relaxed">{inline(it, `${key}-li${i}`)}</li>
        ))}
      </Tag>,
    );
    listBuffer = null;
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const key = `l${idx}`;

    if (!line.trim()) { flushList(`${key}-fl`); return; }

    // Separador ---
    if (/^---+$/.test(line.trim())) {
      flushList(`${key}-fl`);
      blocks.push(<hr key={key} className="my-6 border-t-2 border-dashed border-verde/20" />);
      return;
    }

    // H1
    if (line.startsWith('# ')) {
      flushList(`${key}-fl`);
      blocks.push(
        <h1 key={key} className="font-serif text-3xl md:text-4xl text-verde-oscuro font-bold leading-tight mb-2">
          {inline(line.slice(2), key)}
        </h1>,
      );
      return;
    }

    // H2 = Capítulo (tarjeta con barra lateral)
    if (line.startsWith('## ')) {
      flushList(`${key}-fl`);
      capIndex++;
      blocks.push(
        <div key={key} className="flex items-center gap-3 mt-8 mb-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-verde to-verde-medio text-white flex items-center justify-center font-bold shadow-md shrink-0 text-sm">
            {capIndex}
          </div>
          <h2 className="font-serif text-xl md:text-2xl text-verde-oscuro font-semibold leading-snug">
            {inline(line.slice(3), key)}
          </h2>
        </div>,
      );
      return;
    }

    // H3
    if (line.startsWith('### ')) {
      flushList(`${key}-fl`);
      blocks.push(
        <h3 key={key} className="text-base md:text-lg font-semibold text-verde mt-4 mb-1">
          {inline(line.slice(4), key)}
        </h3>,
      );
      return;
    }

    // Lista numerada "1. ..."
    const olMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (olMatch) {
      if (!listBuffer || listBuffer.type !== 'ol') { flushList(`${key}-fl`); listBuffer = { type: 'ol', items: [] }; }
      listBuffer.items.push(olMatch[1]);
      return;
    }

    // Lista con viñeta "- ..."
    const ulMatch = line.match(/^\s*[-•]\s+(.*)$/);
    if (ulMatch) {
      if (!listBuffer || listBuffer.type !== 'ul') { flushList(`${key}-fl`); listBuffer = { type: 'ul', items: [] }; }
      listBuffer.items.push(ulMatch[1]);
      return;
    }

    // Párrafo. Si empieza con "Artículo N." resaltar el número.
    flushList(`${key}-fl`);
    const art = line.match(/^\*\*(Art[íi]culo\s+[\w.]+)\.?\*\*\s*(.*)$/i) || line.match(/^(Art[íi]culo\s+[\w.]+)\.?\s+(.*)$/i);
    if (art) {
      blocks.push(
        <p key={key} className="my-2 leading-relaxed text-gray-700">
          <span className="inline-block bg-dorado/15 text-[#6b4d05] font-bold text-xs px-2 py-0.5 rounded mr-2 align-middle">
            {art[1]}
          </span>
          {inline(art[2], key)}
        </p>,
      );
      return;
    }

    blocks.push(<p key={key} className="my-2 leading-relaxed text-gray-700">{inline(line, key)}</p>);
  });

  flushList('end-fl');

  return <div className="reglamento-body">{blocks}</div>;
}
