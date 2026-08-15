// Renderizador de markdown ligero para artículos públicos (noticias, convocatorias).
// Sin dependencias externas. Soporta: ## H2, ### H3, **negrita**, *cursiva*,
// listas (- y 1.), > cita, --- separador, [enlaces](url) y párrafos.
//
// Existe aparte de ReglamentoView porque aquel numera cada H2 como "capítulo",
// lo cual no aplica a una noticia.
import React from 'react';

function inline(text: string, keyBase: string): React.ReactNode[] {
  // Se parte por negrita, cursiva y enlaces en una sola pasada.
  const partes = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);
  return partes.map((p, i) => {
    const k = `${keyBase}-i${i}`;
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) {
      return <strong key={k} className="font-semibold text-verde-oscuro">{p.slice(2, -2)}</strong>;
    }
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) {
      return <em key={k}>{p.slice(1, -1)}</em>;
    }
    const enlace = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (enlace) {
      const externo = /^https?:\/\//.test(enlace[2]);
      return (
        <a
          key={k}
          href={enlace[2]}
          {...(externo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="text-verde font-medium underline underline-offset-2 hover:text-verde-oscuro"
        >
          {enlace[1]}
        </a>
      );
    }
    return <React.Fragment key={k}>{p}</React.Fragment>;
  });
}

export function ArticuloMarkdown({ md }: { md: string }) {
  const lineas = (md ?? '').replace(/\r/g, '').split('\n');
  const bloques: React.ReactNode[] = [];
  let lista: { tipo: 'ul' | 'ol'; items: string[] } | null = null;

  const cerrarLista = (key: string) => {
    if (!lista) return;
    const Tag = lista.tipo === 'ol' ? 'ol' : 'ul';
    bloques.push(
      <Tag
        key={key}
        className={`${lista.tipo === 'ol' ? 'list-decimal' : 'list-disc'} pl-6 space-y-1.5 my-4 text-gray-700 marker:text-verde`}
      >
        {lista.items.map((it, i) => (
          <li key={`${key}-li${i}`} className="leading-relaxed">{inline(it, `${key}-li${i}`)}</li>
        ))}
      </Tag>,
    );
    lista = null;
  };

  lineas.forEach((cruda, idx) => {
    const linea = cruda.trimEnd();
    const key = `l${idx}`;

    if (!linea.trim()) { cerrarLista(`${key}-c`); return; }

    if (/^---+$/.test(linea.trim())) {
      cerrarLista(`${key}-c`);
      bloques.push(<hr key={key} className="my-8 border-t border-verde/20" />);
      return;
    }

    if (linea.startsWith('#### ')) {
      cerrarLista(`${key}-c`);
      bloques.push(
        <h4 key={key} className="text-base font-semibold text-verde-oscuro mt-5 mb-1.5">
          {inline(linea.slice(5), key)}
        </h4>,
      );
      return;
    }

    if (linea.startsWith('### ')) {
      cerrarLista(`${key}-c`);
      bloques.push(
        <h3 key={key} className="text-lg md:text-xl font-semibold text-verde mt-7 mb-2">
          {inline(linea.slice(4), key)}
        </h3>,
      );
      return;
    }

    // Los H1 y H2 del cuerpo se muestran igual: el título real del artículo
    // ya va como encabezado de la página.
    if (linea.startsWith('## ') || linea.startsWith('# ')) {
      cerrarLista(`${key}-c`);
      const texto = linea.startsWith('## ') ? linea.slice(3) : linea.slice(2);
      bloques.push(
        <h2 key={key} className="font-serif text-xl md:text-2xl text-verde-oscuro font-bold mt-9 mb-3 pb-2 border-b border-verde/15">
          {inline(texto, key)}
        </h2>,
      );
      return;
    }

    if (linea.startsWith('> ')) {
      cerrarLista(`${key}-c`);
      bloques.push(
        <blockquote key={key} className="my-5 border-l-4 border-verde/40 bg-crema/60 rounded-r-lg px-5 py-3 italic text-verde-oscuro">
          {inline(linea.slice(2), key)}
        </blockquote>,
      );
      return;
    }

    const ol = linea.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) {
      if (!lista || lista.tipo !== 'ol') { cerrarLista(`${key}-c`); lista = { tipo: 'ol', items: [] }; }
      lista.items.push(ol[1]);
      return;
    }

    const ul = linea.match(/^\s*[-*·]\s+(.*)$/);
    if (ul) {
      if (!lista || lista.tipo !== 'ul') { cerrarLista(`${key}-c`); lista = { tipo: 'ul', items: [] }; }
      lista.items.push(ul[1]);
      return;
    }

    cerrarLista(`${key}-c`);
    bloques.push(
      <p key={key} className="leading-relaxed text-gray-700 my-3">{inline(linea, key)}</p>,
    );
  });

  cerrarLista('final');

  return <div className="text-[15px] md:text-base">{bloques}</div>;
}
