
// assets/faq.js
import { $$ } from './lib.js';

document.addEventListener('DOMContentLoaded', ()=>{
  $$('.faq-item button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const item = btn.closest('.faq-item');
      if(!item) return;
      const open = item.classList.toggle('open');
      // close others
      $$('.faq-item').forEach(it=>{
        if(it !== item) it.classList.remove('open');
      });
      btn.setAttribute('aria-expanded', open ? 'true':'false');
    });
  });
});
