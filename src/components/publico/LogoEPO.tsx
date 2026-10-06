import Image from 'next/image';
export function LogoEPO({url,size=44,glow=false,className='',priority=false,responsive=false}:{url?:string|null;size?:number;glow?:boolean;className?:string;priority?:boolean;responsive?:boolean}){
  const optimize=!!url && (url.startsWith('/img/') || /^https:\/\/[^/]+\.supabase\.co\//.test(url));
  const wrapper=responsive?'w-[min(110px,22vh)] h-[min(110px,22vh)] sm:w-[min(140px,22vh)] sm:h-[min(140px,22vh)] md:w-[min(180px,22vh)] md:h-[min(180px,22vh)]':'';
  return <span className={'inline-flex items-center justify-center '+wrapper+' '+(glow?'drop-shadow-[0_0_12px_rgba(240,200,74,0.6)] ':'')+(url?'':'rounded-full bg-dorado shadow-lg ')+className} style={responsive?undefined:{width:size,height:size}}>
    {url?(optimize?<Image src={url} alt="EPO 221 Nicolás Bravo" width={size} height={size} sizes={responsive?'(max-width:639px) 110px, (max-width:767px) 140px, 180px':size+'px'} fetchPriority={priority?'high':undefined} loading={priority?'eager':'lazy'} className="object-contain w-full h-full"/>:<img src={url} alt="EPO 221 Nicolás Bravo" width={size} height={size} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':undefined} className="object-contain w-full h-full"/>):<span className="font-serif font-black text-verde" style={{fontSize:size*.36}}>221</span>}
  </span>;
}
