'use client';
import { useState } from 'react';
import Image from 'next/image';
export function GobiernoBanner({className='',height=40}:{className?:string;height?:number}){
  const [failed,setFailed]=useState(false);if(failed)return null;
  return <Image src="/img/gobierno-edomex-sep@2x.png" alt="Gobierno del Estado de México · Secretaría de Educación, Ciencia, Tecnología e Innovación"
    width={1980} height={256} sizes={Math.ceil(height*1980/256)+'px'} className={'block w-auto object-contain select-none '+className}
    style={{height,imageRendering:'auto'}} draggable={false} onError={()=>setFailed(true)}/>;
}
