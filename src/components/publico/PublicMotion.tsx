import type { ReactNode } from 'react';
export function PublicMotion({children}:{children:ReactNode}) {
  // Public effects now use native CSS, with reduced motion applied by globals.css.
  return children;
}
