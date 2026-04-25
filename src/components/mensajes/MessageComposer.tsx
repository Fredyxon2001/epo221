'use client';
import { useRef, useState } from 'react';

// Compositor reutilizable para mensajes: textarea + emoji picker + adjunto.
// Recibe el `action` del server action y los hidden fields (`hidden`).
export function MessageComposer({
  action,
  hidden,
}: {
  action: (fd: FormData) => void | Promise<void>;
  hidden: Record<string, string>;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [sending, setSending] = useState(false);

  const EMOJIS = [
    '😀','😁','😂','🤣','😊','😍','🥰','😎','🤓','🤔',
    '😅','😢','😭','😡','😴','🤗','👍','👎','👏','🙌',
    '🙏','💪','✅','❌','⭐','🔥','💡','🎉','📚','📝',
    '📎','📷','🎥','🎧','🏆','🌟','❤️','💚','💛','💜',
  ];

  function insertEmoji(e: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    ta.value = ta.value.slice(0, start) + e + ta.value.slice(end);
    ta.focus();
    ta.selectionStart = ta.selectionEnd = start + e.length;
  }

  const preview = file
    ? (file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
    : null;

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={() => setSending(true)}
      className="mt-4 border-t border-gray-200 pt-4 space-y-2"
      encType="multipart/form-data"
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}

      {file && (
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs">
          {preview ? (
            <img src={preview} alt="preview" className="h-12 w-12 object-cover rounded" />
          ) : (
            <span className="text-2xl">📎</span>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{file.name}</div>
            <div className="text-gray-500">
              {(file.size / 1024).toFixed(0)} KB · {file.type || 'archivo'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFile(null)}
            className="text-rose-500 hover:text-rose-700 text-lg px-1"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            name="cuerpo"
            placeholder="Escribe tu mensaje…"
            rows={2}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:border-verde focus:ring-2 focus:ring-verde/20 outline-none"
          />
          {showEmojis && (
            <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg p-2 grid grid-cols-10 gap-1 z-10 w-[320px]">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { insertEmoji(e); }}
                  className="text-xl hover:bg-gray-100 rounded p-1"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setShowEmojis((v) => !v)}
            className="text-xl bg-white border border-gray-300 rounded-lg px-2 py-1 hover:bg-gray-50"
            title="Emojis"
          >
            😊
          </button>
          <label className="text-xl bg-white border border-gray-300 rounded-lg px-2 py-1 hover:bg-gray-50 cursor-pointer text-center" title="Adjuntar archivo">
            📎
            <input
              type="file"
              name="adjunto"
              className="hidden"
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,audio/*,video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={sending}
          className="bg-gradient-to-r from-verde to-verde-medio text-white rounded-xl px-4 py-2 font-semibold shadow hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? '…' : 'Enviar →'}
        </button>
      </div>
    </form>
  );
}
