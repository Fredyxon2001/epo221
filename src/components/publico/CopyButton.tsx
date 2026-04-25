'use client';
import { useState } from 'react';

export function CopyButton({ value, label = 'Copiar', className = '' }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };
  return (
    <button
      type="button"
      onClick={handle}
      className={`text-xs bg-verde text-white px-3 py-1.5 rounded hover:bg-verde-medio transition inline-flex items-center gap-1 ${className}`}
    >
      {copied ? '✓ Copiado' : `📋 ${label}`}
    </button>
  );
}
