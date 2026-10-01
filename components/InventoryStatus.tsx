export default function InventoryStatus({stock=0,sold=false}:{stock?:number;sold?:boolean}){
  if(sold || stock<=0) return <span className="inline-flex border border-[var(--burgundy)] px-3 py-1 text-[10px] uppercase tracking-[.18em] text-[var(--burgundy)]">SOLD</span>;
  if(stock<=3) return <span className="inline-flex border border-[var(--terracotta)] px-3 py-1 text-[10px] uppercase tracking-[.18em] text-[var(--terracotta)]">ONLY {stock} LEFT</span>;
  return <span className="inline-flex border border-[var(--line)] px-3 py-1 text-[10px] uppercase tracking-[.18em] text-[var(--muted)]">AVAILABLE</span>;
}
