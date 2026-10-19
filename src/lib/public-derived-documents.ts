import variants from './public-derived-documents.json';

/** Supplemental copies of four versioned historical public PDFs. No official content change. */
export function historicalPdfWithTitle(source: string, title: string) {
  return variants.find(variant => variant.source === source && variant.title === title) ?? null;
}
