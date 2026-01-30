
// assets/review-status.js
import { $, getLS, qsParam, loadJSON, toast, copyText, safeText } from './lib.js';

const REQ_KEY = 'ayed_review_requests_v3';

function render(status){
  const host = $('#statusHost');
  if(!host) return;
  host.innerHTML = status;
}

async function buildIssueUrlFromStored(cfg, payload){
  const owner = cfg?.reviews?.issueOwner;
  const repo = cfg?.reviews?.issueRepo;
  const template = 'review-submission.md';
  const title = `Review Submission: ${payload.id}`;
  const body = [
    `### Review ID`,
    payload.id,
    ``,
    `### الاسم (اختياري)`,
    payload.name || '',
    ``,
    `### المدينة (اختياري)`,
    payload.city || '',
    ``,
    `### التقييم (1-5)`,
    String(payload.rating),
    ``,
    `### القسم (اختياري)`,
    payload.tag || '',
    ``,
    `### نص التقييم`,
    payload.text || '',
    ``,
    `### موافقة النشر`,
    `- [x] أوافق على نشر تقييمي داخل الموقع`
  ].join('\n');
  const url = new URL(`https://github.com/${owner}/${repo}/issues/new`);
  url.searchParams.set('template', template);
  url.searchParams.set('title', title);
  url.searchParams.set('body', body);
  return url.toString();
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const id = qsParam('id') || '';
  $('#rid') && ($('#rid').textContent = id || '—');

  const cfg = await loadJSON('../data/config.json');

  const all = getLS(REQ_KEY, {});
  const req = id ? all[id] : null;

  if(!id){
    render(`<div class="card glass" style="padding:16px">
      <b>اكتب رقم الطلب</b>
      <p style="margin:8px 0 0; color:rgba(255,255,255,.70); line-height:1.9; font-weight:800">
        افتح الصفحة برابط فيه رقم الطلب: <span class="pill">review-status.html?id=RV-...</span>
      </p>
    </div>`);
    return;
  }

  if(!req){
    render(`<div class="card glass" style="padding:16px">
      <b>ما لقينا الطلب داخل جهازك</b>
      <p style="margin:8px 0 0; color:rgba(255,255,255,.70); line-height:1.9; font-weight:800">
        إذا قد أرسلته من جهاز ثاني، افتح نفس الجهاز اللي أرسلت منه أو أعد الإرسال من صفحة التقييمات.
      </p>
      <div class="sep"></div>
      <a class="btn primary" href="../pages/reviews.html?new=1">إرسال تقييم جديد</a>
    </div>`);
    return;
  }

  const status = safeText(req.status || 'pending');
  const label = status==='approved' ? 'تم الاعتماد ✅' : (status==='rejected' ? 'مرفوض' : 'قيد المراجعة ⏳');
  const hint = status==='approved'
    ? 'مبروك — تقييمك ظهر للزوار داخل صفحة التقييمات.'
    : 'طلبك وصل… يتم مراجعته ثم اعتماده عند استيفاء الشروط (consent + محتوى مناسب).';

  render(`
    <div class="card glass" style="padding:16px">
      <b>حالة الطلب: ${label}</b>
      <p style="margin:8px 0 0; color:rgba(255,255,255,.70); line-height:1.9; font-weight:800">${hint}</p>
      <div class="sep"></div>
      <div style="display:flex; gap:10px; flex-wrap:wrap">
        <button class="btn outline" id="copyId" type="button">نسخ رقم الطلب</button>
        <button class="btn primary" id="sendIssue" type="button">إرسال الطلب الآن</button>
        <a class="btn ghost" href="../pages/reviews.html">رجوع للتقييمات</a>
      </div>
    </div>
    <div class="card glass" style="padding:16px; margin-top:12px">
      <b>ملخص التقييم</b>
      <div class="sep"></div>
      <p style="margin:0; color:rgba(255,255,255,.78); line-height:1.9; font-weight:800">${safeText(req.text||'')}</p>
    </div>
  `);

  $('#copyId')?.addEventListener('click', async ()=>{
    await copyText(id);
    toast('تم النسخ ✅','📎');
  });

  $('#sendIssue')?.addEventListener('click', async ()=>{
    const url = await buildIssueUrlFromStored(cfg, req);
    window.open(url, '_blank', 'noopener');
    toast('فتحنا لك صفحة الإرسال ✅','🚀');
  });
});
