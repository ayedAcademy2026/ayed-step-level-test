
// assets/counters.js
import { $$ } from './lib.js';

function animate(el, to){
  const from = Number(el.getAttribute('data-from')||0);
  const dur = Number(el.getAttribute('data-dur')||1100);
  const start = performance.now();
  function tick(t){
    const p = Math.min(1, (t-start)/dur);
    const val = Math.round(from + (to-from)*p);
    el.textContent = val.toLocaleString('ar-SA');
    if(p<1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

document.addEventListener('DOMContentLoaded', ()=>{
  const els = $$('[data-count-to]');
  if(!els.length) return;

  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        const el = e.target;
        io.unobserve(el);
        const to = Number(el.getAttribute('data-count-to')||0);
        animate(el, to);
      }
    });
  }, {threshold:0.35});

  els.forEach(el=>io.observe(el));
});
