'use client';
import { useEffect,type RefObject } from 'react';
export function useModalFocus(open:boolean,ref:RefObject<HTMLElement|null>,close:()=>void) {
  useEffect(()=>{
    if(!open || !ref.current)return;
    const previous=document.activeElement as HTMLElement|null;
    const getControls=()=>Array.from(ref.current!.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea,[tabindex="0"]')).filter(el=>el.getClientRects().length>0);
    getControls()[0]?.focus();
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();close();return;}
      if(e.key!=='Tab')return;
      const controls=getControls(),first=controls[0],last=controls.at(-1);
      if(!first)return;
      if(e.shiftKey && (document.activeElement===first || !ref.current?.contains(document.activeElement))){e.preventDefault();last?.focus();}
      else if(!e.shiftKey && (document.activeElement===last || !ref.current?.contains(document.activeElement))){e.preventDefault();first.focus();}
    };
    const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    document.addEventListener('keydown',key);
    return ()=>{document.removeEventListener('keydown',key);document.body.style.overflow=overflow;previous?.focus();};
  },[open,ref,close]);
}
