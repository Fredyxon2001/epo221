'use client';
import Image from 'next/image';
import { useState, type CSSProperties } from 'react';
import { helpAppearance, type HelpRole } from '@/lib/help/catalog';
import styles from './GuideAvatar.module.css';

const tiles: Record<HelpRole, number> = { alumno: 0, profesor: 1, finanzas: 2, director: 3, admin: 4, staff: 5, publico: 7 };

/** Fictional educational characters. The role is provided by the authorized shell. */
export function GuideAvatar({ role, orientador = false, compact = false }: { role: HelpRole; orientador?: boolean; compact?: boolean }) {
  const [speaking, setSpeaking] = useState(false);
  const tile = role === 'profesor' && orientador ? 6 : tiles[role];
  const title = orientador && role === 'profesor' ? 'Docente · Orientación' : helpAppearance[role].title;
  const intro = orientador && role === 'profesor'
    ? 'Te acompaño en tus clases y en la orientación de tus grupos asignados. Verás solamente las herramientas autorizadas para tu cuenta.'
    : helpAppearance[role].intro;
  const position = { left: `${-(tile % 4) * 100}%`, top: `${-Math.floor(tile / 4) * 100}%` } as CSSProperties;
  return <div className={`${styles.assistant} ${compact ? styles.compact : ''}`} data-avatar-role={orientador && role === 'profesor' ? 'orientacion' : role}>
    <button type="button" className={styles.character} aria-label={`¿Qué puede hacer mi rol? ${title}`} aria-expanded={speaking} onClick={() => setSpeaking(value => !value)}>
      <Image src="/img/guide/role-avatars.png" alt="" width={1774} height={887} sizes="(max-width: 639px) 384px, 512px" className={styles.sprite} style={position} />
    </button>
    <div className={styles.bubble}>
      <strong>Tu asistente · {title}</strong>
      <p aria-live="polite">{speaking ? intro : 'Te acompaño módulo por módulo. Tócame para conocer qué puedes hacer con tu rol.'}</p>
    </div>
  </div>;
}
