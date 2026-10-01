"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
export default function ProductGallery({images,name}:{images?:string[]|null;name:string}){
 const imgs=(images??[]).filter(Boolean).length ? (images??[]).filter(Boolean) : ["/product-images/placeholder.svg"];
 const [active,setActive]=useState(0); const [open,setOpen]=useState(false);
 useEffect(()=>{ if(!open)return; const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);if(e.key==='ArrowRight')setActive(v=>(v+1)%imgs.length);if(e.key==='ArrowLeft')setActive(v=>(v-1+imgs.length)%imgs.length)};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[open,imgs.length]);
 return <>
  <div className="space-y-4">
   <button type="button" onClick={()=>setOpen(true)} className="group relative block aspect-[4/5] w-full overflow-hidden bg-[var(--ivory)]" aria-label="Open image gallery">
    <img src={imgs[active]} alt={name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"/>
    <img src="/logo.jpg" alt="" aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-[1] w-1/3 -translate-x-1/2 -translate-y-1/2 object-contain opacity-50 mix-blend-multiply" />
    <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 bg-white/90 px-3 py-2 text-xs uppercase tracking-wider"><ZoomIn size={14}/> View large</span>
   </button>
   {imgs.length>1 && <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
    {imgs.slice(0,12).map((src,i)=><button type="button" key={`${src}-${i}`} onClick={()=>setActive(i)} className={`relative aspect-square overflow-hidden border-2 ${active===i?'border-[var(--burgundy)]':'border-transparent'}`} aria-label={`View image ${i+1}`}><img src={src} alt={`${name} image ${i+1}`} className="h-full w-full object-cover"/><img src="/logo.jpg" alt="" aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-[1] w-1/2 -translate-x-1/2 -translate-y-1/2 object-contain opacity-50 mix-blend-multiply" /></button>)}
   </div>}
  </div>
  {open && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label={`${name} image viewer`} onClick={()=>setOpen(false)}>
    <div className="relative flex h-full w-full max-w-7xl items-center justify-center" onClick={e=>e.stopPropagation()}>
      <div className="relative flex max-h-[90vh] max-w-[92vw] items-center justify-center"><img src={imgs[active]} alt={name} className="max-h-[90vh] max-w-[92vw] object-contain"/><img src="/logo.jpg" alt="" aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-[1] w-1/3 -translate-x-1/2 -translate-y-1/2 object-contain opacity-50 mix-blend-multiply" /></div>
      {imgs.length>1 && <><button type="button" onClick={()=>setActive(v=>(v-1+imgs.length)%imgs.length)} className="absolute left-0 rounded-full bg-white/90 p-3" aria-label="Previous image"><ChevronLeft/></button><button type="button" onClick={()=>setActive(v=>(v+1)%imgs.length)} className="absolute right-0 rounded-full bg-white/90 p-3" aria-label="Next image"><ChevronRight/></button></>}
      <button type="button" onClick={()=>setOpen(false)} className="absolute right-0 top-0 rounded-full bg-white px-4 py-3" aria-label="Close image viewer"><X/></button>
    </div>
  </div>}
 </>;
}
