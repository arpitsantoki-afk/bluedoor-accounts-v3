// BDA Estimates — shared calculation core.
// Used by worker.js (server totals) and estimate.html (UI). Keep pure: no DOM, no globals.

export const CATS=['Civil','Interior','MEP','Other'];
export const UNITS=['sqft','sqm','rft','rmt','cum','cft','nos','point','kg','ltr','set','job','LS'];
export const CT={M:'Material',L:'Labour',E:'Equipment'};
export const QB={item:'Item rate',ls:'Lumpsum',unit:'Unit rate only'};
export const num=v=>{const n=parseFloat(String(v??'').replace(/,/g,''));return isFinite(n)?n:0};
export const r2=n=>Math.round((n+Number.EPSILON)*100)/100;
export const rnd=(v,s)=>s?Math.round(v/s)*s:r2(v);
export const hasV=v=>v!==undefined&&v!==null&&v!=='';
export const locOf=l=>(l.loc||'').trim();
export function bill(p){p.bill=p.bill||{};p.bill.exec=p.bill.exec||{};p.bill.extras=p.bill.extras||[];return p.bill}
export function rateCalc(r){const t={M:0,L:0,E:0};(r.comps||[]).forEach(c=>{t[c.t]=(t[c.t]||0)+num(c.qty)*num(c.rate)});
  // Rates are pure cost; overhead and profit are applied once per project (quote.oh / quote.profit).
  const base=t.M+t.L+t.E;return{...t,base,oh:0,pr:0,rate:r2(base)}}
export function estCalc(p){const rows=(p.lines||[]).map(l=>({l,u:l.qb==='unit',a:l.qb==='unit'?0:r2(num(l.qty)*num(l.rate))}));const total=r2(rows.reduce((s,r)=>s+r.a,0));
  const gst=r2(total*num(p.gst)/100);return{rows,total,gst,grand:r2(total+gst)}}
export function qset(p){p.quote=p.quote||{};const q=p.quote;q.ind=q.ind||[];q.ovr=q.ovr||{};
  if(q.oh==null)q.oh=0;if(q.profit==null)q.profit=0;q.pmode=q.pmode||'markup';if(q.rr==null)q.rr=1;if(q.lr==null)q.lr=100;return q}
export function quoteCalc(p){const q=qset(p),lines=p.lines||[],qb=l=>l.qb||'item';
  const D=r2(lines.filter(l=>qb(l)!=='unit').reduce((s,l)=>s+num(l.qty)*num(l.rate),0));
  const I=r2(q.ind.reduce((s,x)=>s+num(x.amt),0)),O=r2(D*num(q.oh)/100),C=r2(D+I+O),pp=num(q.profit);
  const Q=q.pmode==='margin'?(pp<100?C/(1-pp/100):C):C*(1+pp/100);const k=D?Q/D:1;
  const L={},rowsA=[],rowsB=[],groups={};
  lines.forEach(l=>{const t=qb(l),cr=num(l.rate);
    if(t==='ls'){const g=(l.lsg||'').trim();const key=g?'g:'+g:l.id;
      if(!groups[key]){groups[key]={type:'ls',key,cat:l.cat||'Other',loc:locOf(l),desc:g||l.desc,unit:'LS',raw:0,ids:[],edited:hasV(q.ovr[key])};rowsA.push(groups[key])}else if(groups[key].loc!==locOf(l))groups[key].loc='';
      groups[key].raw+=num(l.qty)*cr*k;groups[key].ids.push(l.id);L[l.id]={qb:t,rate:null,amt:0,key};return}
    const auto=rnd(cr*k,num(q.rr)),ov=q.ovr[l.id],rate=hasV(ov)?num(ov):auto;
    if(t==='unit'){L[l.id]={qb:t,rate,amt:0};rowsB.push({type:'unit',key:l.id,cat:l.cat||'Other',loc:locOf(l),desc:l.desc,unit:l.unit,rate,auto,edited:hasV(ov)});return}
    const amt=r2(num(l.qty)*rate);L[l.id]={qb:t,rate,amt};rowsA.push({type:'item',key:l.id,cat:l.cat||'Other',loc:locOf(l),desc:l.desc,unit:l.unit,qty:num(l.qty),rate,auto,amt,edited:hasV(ov)})});
  Object.values(groups).forEach(g=>{g.auto=rnd(g.raw,num(q.lr));g.amt=hasV(q.ovr[g.key])?num(q.ovr[g.key]):g.auto;
    g.ids.forEach(id=>{const l=lines.find(x=>x.id===id);const share=g.raw?(num(l.qty)*num(l.rate)*k)/g.raw:1/g.ids.length;L[id].amt=r2(g.amt*share)})});
  const total=r2(rowsA.reduce((s,r)=>s+r.amt,0)),gst=r2(total*num(p.gst)/100);
  return{q,D,I,O,C,Q,k,L,rowsA,rowsB,total,gst,grand:r2(total+gst),profit:r2(total-C),margin:total?(total-C)/total*100:0}}
export function billCalc(p){const b=bill(p),qc=quoteCalc(p);const rows=(p.lines||[]).map(l=>{const ql=qc.L[l.id],qb=ql.qb,v=b.exec[l.id];
  const has=qb!=='ls'&&hasV(v),estQ=qb==='unit'?0:num(l.qty),rate=ql.rate;let eq,ea,ba;
  if(qb==='ls'){eq=estQ;ea=ql.amt;ba=ql.amt}else{eq=has?num(v):estQ;ea=r2(estQ*rate);ba=r2(eq*rate)}
  return{l,qb,has,estQ,eq,rate,ea,ba,v:r2(ba-ea)}});
  const est=r2(rows.reduce((s,r)=>s+r.ea,0)),exec=r2(rows.reduce((s,r)=>s+r.ba,0)),ext=r2(b.extras.reduce((s,x)=>s+r2(num(x.qty)*num(x.rate)),0));
  const sub=r2(exec+ext),gst=r2(sub*num(p.gst)/100),total=r2(sub+gst);
  return{rows,est,exec,ext,sub,gst,total,dev:r2(sub-est),devPct:est?(sub-est)/est*100:0,net:r2(total-num(b.received)),
    over:rows.filter(r=>r.v>0).length,under:rows.filter(r=>r.v<0).length,measured:rows.filter(r=>r.has).length}}

/** Totals stored alongside each estimate so lists and reports don't need to re-open it. */
export function summarize(p){
  const e=estCalc(p),q=quoteCalc(p),b=billCalc(p);
  return{estimate_total:e.total,quote_total:q.total,quote_grand:q.grand,bill_total:b.total,net_payable:b.net,lines:(p.lines||[]).length};
}
