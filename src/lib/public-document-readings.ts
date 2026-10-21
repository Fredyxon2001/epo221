import readings from './public-document-readings.json';

/** Companions of exact, versioned historical sources; never substitutes a new upload. */
export function historicalDocumentReading(sourcePdf: string, sourceDocx: string, title: string) {
  return readings.find(item => item.sourcePdf === sourcePdf && item.sourceDocx === sourceDocx && item.title === title) ?? null;
}
export function documentReadingBySlug(slug: string) {
  return readings.find(item => item.slug === slug) ?? null;
}
type Block = { kind: string; text: string; listId?: string; listStyle?: string; listNumber?: number };
export function readingGroups(blocks: Block[]) {
  const groups: { kind: string; texts: string[]; index: number; listId?: string; listStyle?: string; listNumber?: number }[] = [];
  blocks.forEach((block, index) => {
    const previous = groups.at(-1);
    if (block.kind === 'item' && previous?.kind === 'item' && previous.listId === block.listId && (block.listStyle === 'bullet' || block.listNumber === (previous.listNumber ?? 1) + previous.texts.length)) previous.texts.push(block.text);
    else groups.push({ ...block, texts: [block.text], index });
  });
  return groups;
}
export function sourceListLabel(style?: string, number?: number) {
  if (!number || style === 'bullet' || !style) return '';
  if (style === 'a') return String.fromCharCode(96 + number) + '.';
  if (style === '1') return number + '.';
  if (style === 'I') {
    let value = number, label = '';
    for (const [amount, roman] of [[100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']] as const) while (value >= amount) { label += roman; value -= amount; }
    return label + '.';
  }
  return '';
}
