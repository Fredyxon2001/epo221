// Keep institutional figures readable immediately and stable for assistive technologies.
export function Counter({to,suffix='',className=''}:{to:number;suffix?:string;duration?:number;className?:string}) {
  return <span className={className}>{to.toLocaleString('es-MX')}{suffix}</span>;
}
