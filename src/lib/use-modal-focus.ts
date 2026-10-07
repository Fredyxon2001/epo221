'use client';
import { useEffect,type RefObject } from 'react';
// Multiple dialogs (for example mobile navigation + help) share one scroll lock.
const modalStacks = new WeakMap<Document, { roots: HTMLElement[]; overflow: string }>();
export function useModalFocus(open:boolean,ref:RefObject<HTMLElement|null>,close:()=>void) {
  useEffect(()=>{
    if(!open || !ref.current)return;
    const modal = ref.current;
    const stack = modalStacks.get(document) ?? {roots:[],overflow:document.body.style.overflow};
    stack.roots.push(modal);modalStacks.set(document,stack);
    const previous=document.activeElement as HTMLElement|null;
    const getControls=()=>Array.from(ref.current!.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea,[tabindex="0"]')).filter(el=>el.getClientRects().length>0);
    getControls()[0]?.focus();
    const key=(e:KeyboardEvent)=>{
      if(stack.roots.at(-1)!==modal)return;
      if(e.key==='Escape'){e.preventDefault();close();return;}
      if(e.key!=='Tab')return;
      const controls=getControls(),first=controls[0],last=controls.at(-1);
      if(!first)return;
      if(e.shiftKey && (document.activeElement===first || !ref.current?.contains(document.activeElement))){e.preventDefault();last?.focus();}
      else if(!e.shiftKey && (document.activeElement===last || !ref.current?.contains(document.activeElement))){e.preventDefault();first.focus();}
    };
    document.body.style.overflow='hidden';
    document.addEventListener('keydown',key);
    return ()=>{
      document.removeEventListener('keydown',key);
      const wasTop=stack.roots.at(-1)===modal;
      const index=stack.roots.indexOf(modal);if(index>=0)stack.roots.splice(index,1);
      if(!stack.roots.length){document.body.style.overflow=stack.overflow;modalStacks.delete(document);}
      if(wasTop && previous?.isConnected)previous.focus();
    };
  },[open,ref,close]);
}
