'use client';
// Widget reutilizable: botón 😊 (emojis) + 📎 (archivo) con vista previa.
// Inserta emojis en el textarea por `targetName` (name del textarea del form).
import { useRef, useState } from 'react';

const EMOJIS = [
  '😀','😁','😂','🤣','😊','😍','🥰','😎','🤓','🤔',
  '😅','😢','😭','😡','😴','🤗','👍','👎','👏','🙌',
  '🙏','💪','✅','❌','⭐','🔥','💡','🎉','📚','📝',
  '📎','📷','🎥','🎧','🏆','🌟','❤️','💚','💛','💜',
];

export function EmojiFilePicker({
  onInsertEmoji,
  onFileChange,
  file,
  fileInputName = 'adjunto',
  accept = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,audio/*,video/*',
}: {
  onInsertEmoji: (e: string) => void;
  onFileChange: (f: File | null) => void;
  file: File | null;
  fileInputName?: string;
  accept?: string;
}) {
  const [showEmojis, setShowEmojis] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null;

  return (
    <div className="space-y-2">
      {file && (
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs">
          {preview ? (
            <img src={preview} alt="preview" className="h-12 w-12 object-cover rounded" />
          ) : (
            <span className="text-2xl">📎</span>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{file.name}</div>
            <div className="text-gray-500">{(file.size / 1024).toFixed(0)} KB · {file.type || 'archivo'}</div>
          </div>
          <button
            type="button"
            onClick={() => { onFileChange(null); if (inputRef.current) inputRef.current.value = ''; }}
            className="text-rose-500 hover:text-rose-700 text-lg px-1"
          >✕</button>
        </div>
      )}

      <div className="flex gap-2 items-center relative">
        <button
          type="button"
          onClick={() => setShowEmojis((v) => !v)}
          className="text-lg bg-white border border-gray-300 rounded-lg px-2 py-1 hover:bg-gray-50"
          title="Emojis"
        >😊</button>
        <label className="text-lg bg-white border border-gray-300 rounded-lg px-2 py-1 hover:bg-gray-50 cursor-pointer" title="Adjuntar archivo">
          📎
          <input
            ref={inputRef}
            type="file"
            name={fileInputName}
            className="hidden"
            accept={accept}
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
        </label>
        {showEmojis && (
          <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg p-2 grid grid-cols-10 gap-1 z-20 w-[320px]">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => onInsertEmoji(e)}
                className="text-xl hover:bg-gray-100 rounded p-1"
              >{e}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
