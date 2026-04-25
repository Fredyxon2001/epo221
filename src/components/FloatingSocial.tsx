type Props = {
  facebook?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  spotify?: string | null;
  youtube?: string | null;
};

// Iconos SVG inline (24x24 viewBox, se escalan vía className)
const FB = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
    <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z" />
  </svg>
);
const IG = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
    <path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4A5.8 5.8 0 0 1 16.2 22H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8Zm4.2 3.2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6Zm0 2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6ZM17.5 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
  </svg>
);
const TT = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
    <path d="M19.6 8.3a6.4 6.4 0 0 1-3.7-1.2v7.2a5.4 5.4 0 1 1-5.4-5.4c.2 0 .4 0 .6.05v2.8a2.7 2.7 0 1 0 2 2.6V2h2.8a3.7 3.7 0 0 0 3.7 3.3v3Z" />
  </svg>
);
const SP = (
  // Spotify
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.58 14.43a.62.62 0 0 1-.86.21c-2.35-1.44-5.3-1.76-8.79-.96a.63.63 0 0 1-.28-1.22c3.82-.87 7.1-.5 9.73 1.11.3.18.39.57.2.86Zm1.23-2.74a.78.78 0 0 1-1.07.26c-2.69-1.65-6.79-2.13-9.97-1.17a.78.78 0 1 1-.45-1.49c3.63-1.1 8.14-.56 11.23 1.33.37.23.48.71.26 1.07Zm.1-2.85c-3.22-1.91-8.54-2.09-11.61-1.16a.94.94 0 1 1-.55-1.8c3.52-1.07 9.39-.86 13.09 1.34a.94.94 0 1 1-.93 1.62Z" />
  </svg>
);
const YT = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
    <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1C4.5 20.5 12 20.5 12 20.5s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8ZM9.75 15.5v-7l6.5 3.5-6.5 3.5Z" />
  </svg>
);

export function FloatingSocial({ facebook, instagram, tiktok, spotify, youtube }: Props) {
  const links = [
    { href: facebook,  label: 'Facebook',  icon: FB, bg: 'bg-[#1877F2]' },
    { href: instagram, label: 'Instagram', icon: IG, bg: 'bg-gradient-to-tr from-[#feda75] via-[#d62976] to-[#4f5bd5]' },
    { href: tiktok,    label: 'TikTok',    icon: TT, bg: 'bg-black' },
    { href: spotify,   label: 'Spotify',   icon: SP, bg: 'bg-[#1DB954]' },
    { href: youtube,   label: 'YouTube',   icon: YT, bg: 'bg-[#FF0000]' },
  ].filter((l) => !!l.href);

  if (links.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-3 md:bottom-6 md:right-5 z-40 flex flex-col gap-2 md:gap-3">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href!}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={l.label}
          title={l.label}
          className={`${l.bg} text-white w-11 h-11 md:w-14 md:h-14 [&_svg]:w-5 [&_svg]:h-5 md:[&_svg]:w-7 md:[&_svg]:h-7 rounded-full shadow-xl shadow-black/20 flex items-center justify-center hover:scale-110 hover:shadow-2xl transition ring-2 ring-white/50`}
        >
          {l.icon}
        </a>
      ))}
    </div>
  );
}
