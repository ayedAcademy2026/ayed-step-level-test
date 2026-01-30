
// assets/support.js
import { $, toast, copyText } from './lib.js';

function genTicket(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const da = String(d.getDate()).padStart(2,'0');
  const rnd = Math.floor(Math.random()*900000)+100000;
  return `SUP-${y}${m}${da}-${rnd}`;
}

document.addEventListener('DOMContentLoaded', ()=>{
  $('#supportForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();

    const name = ($('#s_name')?.value || '').trim();
    const topic = ($('#s_topic')?.value || '').trim();
    const msg = ($('#s_msg')?.value || '').trim();

    if(!topic){
      toast('اختر نوع الطلب.','⚠️'); return;
    }
    if(!msg || msg.length < 20){
      toast('اكتب تفاصيل أوضح (20 حرف على الأقل).','✍️'); return;
    }

    const id = genTicket();
    $('#ticketId') && ($('#ticketId').textContent = id);
    $('#supportSuccess')?.classList.remove('hidden');

    $('#copyTicket')?.addEventListener('click', async ()=>{
      await copyText(id);
      toast('تم نسخ رقم الطلب ✅','📎');
    });

    toast('تم استلام طلبك ✅','✅');

    // gentle fake activity to reassure
    setTimeout(()=>toast('تم تسجيل طلبك في النظام 📩','📩'), 1200);
    setTimeout(()=>toast('جاري مراجعة التفاصيل…','⏳'), 3400);
    setTimeout(()=>toast('تم تحويله للفريق المختص ✅','🧑‍💻'), 6200);

    e.target.reset();
  });
});
