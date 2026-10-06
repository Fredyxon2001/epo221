'use client';
import { useEffect,useRef } from 'react';
export function CustomCursor() {
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const media=matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)');
    let raf=0;
    const move=(e:MouseEvent)=>{
      if(!media.matches)return;
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{if(ref.current)ref.current.style.transform='translate3d('+e.clientX+'px,'+e.clientY+'px,0) translate(-50%,-50%)';});
    };
    const over=(e:MouseEvent)=>{ref.current?.classList.toggle('hover',e.target instanceof Element && !!e.target.closest('a,button,[role="button"],.cursor-hover'));};
    window.addEventListener('mousemove',move,{passive:true});window.addEventListener('mouseover',over);
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener('mousemove',move);window.removeEventListener('mouseover',over);};
  },[]);
  return <div ref={ref} className="custom-cursor" style={{left:0,top:0,transform:'translate(-100px,-100px)'}} aria-hidden/>;
}
