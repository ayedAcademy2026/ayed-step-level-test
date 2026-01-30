
// assets/reviews.js
import { $, $$, loadJSON, escapeHtml, toast, copyText, hashInt, getLS, setLS, qsParam, safeText } from './lib.js';

const REQ_KEY = 'ayed_review_requests_v3';
const AVATAR_TOTAL = 60;

let CFG=null, NAMEPOOL=null;

async function loadAll(){
  CFG = await loadJSON('../data/config.json');
  NAMEPOOL = await loadJSON('../data/name-pool.json');
}

function getGenderByName(name){
  const n = safeText(name).trim();
  const pool = NAMEPOOL?.names || [];
  const hit = pool.find(x=>x?.name===n);
  if(hit?.gender) return hit.gender;
  // heuristic
  if(n.endsWith('ة') || ['سارة','نورة','شهد','رغد','هيا','مي','فاطمة','شذى','جود','ريم','منال','دانة','مشاعل','نوف'].includes(n)) return 'f';
  return 'm';
}

function avatarFor(key, genderHint=null){
  const h = hashInt(key);
  const idx = (h % 30) + 1;
  const gender = genderHint || (h % 2 === 0 ? 'm' : 'f');
  return `../assets/avatars/avatar_${gender}_${String(idx).padStart(2,'0')}.svg`;
}

function starSvg(on){
  return `<svg class="star ${on?'on':''}" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="${on?'#F7C948':'#FFFFFF'}" d="M12 17.3l-6.2 3.7 1.7-7.1L2 9.2l7.3-.6L12 2l2.7 6.6 7.3.6-5.5 4.7 1.7 7.1z"/>
  </svg>`;
}

function renderChat(reviews){
  const host = $('#reviewsChat');
  if(!host) return;

  host.innerHTML = '';
  reviews.forEach((r, i)=>{
    if(!(r?.approved===true && r?.consent===true)) return;

    const name = safeText(r.name || 'طالب/ـة');
    const city = safeText(r.city || '');
    const tag = safeText(r.tag || '');
    const rating = Math.max(1, Math.min(5, Number(r.rating||5)));
    const side = (i % 2 === 0) ? 'me' : '';
    const gender = getGenderByName(name);
    const avatar = avatarFor(r.id || name, gender);

    const el = document.createElement('div');
    el.className = `chat-msg ${side}`.trim();
    el.innerHTML = `
      <div class="avatar" aria-hidden="true"><img src="${avatar}" alt=""></div>
      <div class="bubble">
        <div class="meta">
          <span style="color:rgba(255,255,255,.82)">${escapeHtml(name)}</span>
          ${city ? `<span>• ${escapeHtml(city)}</span>`:''}
          ${tag ? `<span class="tag">${escapeHtml(tag)}</span>`:''}
          <span class="stars" aria-hidden="true">${Array.from({length:5},(_,k)=>starSvg(k<rating)).join('')}</span>
          ${r.createdAt ? `<span>• ${escapeHtml(r.createdAt)}</span>`:''}
        </div>
        <div style="color:rgba(255,255,255,.82); font-weight:800; line-height:1.9">${escapeHtml(r.text || '')}</div>
      </div>
    `;
    host.appendChild(el);
  });

  host.scrollTop = host.scrollHeight;
}

function openModal(){
  $('.modal-backdrop')?.classList.add('open');
  $('.modal')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(){
  $('.modal-backdrop')?.classList.remove('open');
  $('.modal')?.classList.remove('open');
  document.body.style.overflow = '';
}

function genReviewId(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const da = String(d.getDate()).padStart(2,'0');
  const rnd = Math.floor(Math.random()*9000)+1000;
  return `RV-${y}${m}${da}-${rnd}`;
}

function buildIssueUrl(payload){
  const owner = CFG?.reviews?.issueOwner;
  const repo = CFG?.reviews?.issueRepo;
  const template = 'review-submission.md'; // prefilled-friendly
  const title = `Review Submission: ${payload.id}`;
  const bodyLines = [
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
    payload.text,
    ``,
    `### موافقة النشر`,
    `- [x] أوافق على نشر تقييمي داخل الموقع`
  ];
  const body = bodyLines.join('\n');
  const url = new URL(`https://github.com/${owner}/${repo}/issues/new`);
  url.searchParams.set('template', template);
  url.searchParams.set('title', title);
  url.searchParams.set('body', body);
  return url.toString();
}

function storeRequest(payload){
  const all = getLS(REQ_KEY, {});
  all[payload.id] = {
    ...payload,
    status:'pending',
    createdAt: new Date().toISOString()
  };
  setLS(REQ_KEY, all);
}

function renderStarsInput(value){
  $$('.star-btn').forEach(btn=>{
    const v = Number(btn.getAttribute('data-v'));
    if(v<=value) btn.classList.add('on'); else btn.classList.remove('on');
  });
  $('#r_rating_value').value = String(value);
}

function wireForm(){
  $('#openReviewModal')?.addEventListener('click', openModal);
  $('[data-close-modal]')?.addEventListener('click', closeModal);
  $('.modal-backdrop')?.addEventListener('click', closeModal);

  // stars
  $$('.star-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const v = Number(btn.getAttribute('data-v'));
      if(!v) return;
      renderStarsInput(v);
    });
  });
  renderStarsInput(5);

  $('#reviewForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();

    const name = safeText($('#r_name')?.value).trim();
    const city = safeText($('#r_city')?.value).trim();
    const rating = Number($('#r_rating_value')?.value);
    const tag = safeText($('#r_tag')?.value).trim();
    const text = safeText($('#r_text')?.value).trim();
    const consent = $('#r_consent')?.checked === true;

    if(!rating || rating<1 || rating>5){
      toast('اختر التقييم بالنجوم (إجباري).','⭐');
      return;
    }
    if(!text || text.length < 12){
      toast('اكتب تقييم واضح (12 حرف على الأقل).','✍️');
      return;
    }
    if(!consent){
      toast('لازم توافق على نشر تقييمك داخل الموقع.','🛡️');
      return;
    }

    const id = genReviewId();
    const payload = {id, name, city, rating, tag: tag||'General', text, consent:true};
    storeRequest(payload);

    // success UI
    closeModal();
    const box = $('#submitSuccess');
    box?.classList.remove('hidden');
    $('#reviewIdText') && ($('#reviewIdText').textContent = id);

    $('#btnCopyReviewId')?.addEventListener('click', async ()=>{
      await copyText(id);
      toast('تم نسخ رقم الطلب ✅','📎');
    });

    $('#btnTrack')?.addEventListener('click', ()=>{
      location.href = `../pages/review-status.html?id=${encodeURIComponent(id)}`;
    });

    $('#btnSendIssue')?.addEventListener('click', ()=>{
      const url = buildIssueUrl(payload);
      window.open(url, '_blank', 'noopener');
      toast('فتحنا لك صفحة الإرسال ✅','🚀');
    });

    toast('تم إرسال تقييمك بنجاح ✅','✅');
    // reset form
    e.target.reset();
    renderStarsInput(5);
    $('#r_tag').value = 'General';
  });
}

document.addEventListener('DOMContentLoaded', async ()=>{
  await loadAll();
  const data = await loadJSON('../data/reviews.json');
  const list = (data.reviews || []).filter(r=>r.approved===true && r.consent===true);
  renderChat(list);
  wireForm();

  // if query says open modal
  if(qsParam('new')==='1') openModal();
});
