import Image from 'next/image';
// Card title supplies the accessible name; the cover is decorative.
export function PublicCover({url,className='',sizes}:{url?:string|null;className?:string;sizes:string}) {
  const optimized=!!url && (/^\/(?!\/)/.test(url) || /^https:\/\/[^/]+\.supabase\.co\//.test(url));
  return <div className={'relative overflow-hidden bg-linear-to-br from-verde to-verde-oscuro '+className}>
    {url&&<Image src={url} alt="" fill sizes={sizes} unoptimized={!optimized} className="object-cover" />}
  </div>;
}
