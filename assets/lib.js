
// assets/lib.js
export const $ = (sel, root=document) => root.querySelector(sel);
export const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
export const safeText = (v) => (v ?? "").toString();

export function escapeHtml(str){
  return safeText(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

export async function loadJSON(url){
  const res = await fetch(url, {cache:'no-store'});
  if(!res.ok) throw new Error(`Failed to load ${url}`);
  return await res.json();
}

export function toast(text, emoji="⭐"){
  const host = $('.toast-container');
  if(!host) return;
  const wrap = document.createElement('div');
  wrap.className = 'toast';
  wrap.innerHTML = `
    <div class="bubble" aria-hidden="true">${escapeHtml(emoji)}</div>
    <div>
      <p>${escapeHtml(text)}</p>
      <small>قبل لحظات</small>
    </div>
  `;
  host.appendChild(wrap);
  setTimeout(()=>{ wrap.style.opacity='0'; wrap.style.transform='translateY(6px)'; }, 5200);
  setTimeout(()=>{ wrap.remove(); }, 6100);
}

export async function copyText(txt){
  const t = safeText(txt);
  try{
    await navigator.clipboard.writeText(t);
    return true;
  }catch(_){
    // fallback
    const ta = document.createElement('textarea');
    ta.value = t;
    ta.setAttribute('readonly','');
    ta.style.position='fixed'; ta.style.top='-1000px';
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand('copy'); }catch(_e){}
    ta.remove();
    return true;
  }
}

// Deterministic hash -> int
export function hashInt(str){
  const s = safeText(str);
  let h = 2166136261;
  for(let i=0;i<s.length;i++){
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

export function formatISODate(iso){
  try{
    const d = new Date(iso);
    return d.toLocaleDateString('ar-SA', {year:'numeric', month:'short', day:'numeric'});
  }catch(_){ return safeText(iso); }
}

export function qsParam(name){
  const u = new URL(location.href);
  return u.searchParams.get(name);
}

export function setLS(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}
export function getLS(key, fallback=null){
  try{
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  }catch(_){ return fallback; }
}
