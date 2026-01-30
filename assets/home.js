
// assets/home.js
import { $, loadJSON, escapeHtml } from './lib.js';

function storyCard(s){
  const name = s.name ? `${s.name}${s.city ? ` • ${s.city}`:''}` : 'قصة طالب/ـة';
  const head = `${escapeHtml(name)}${s.before && s.after ? ` — من ${escapeHtml(s.before)} إلى ${escapeHtml(s.after)}`:''}`;
  return `
    <div class="card glass" style="padding:16px">
      <b>${head}</b>
      <div class="sep"></div>
      ${(s.story||[]).map(p=>`<p style="margin:0 0 10px; color:rgba(255,255,255,.74); line-height:1.95; font-weight:800">${escapeHtml(p)}</p>`).join('')}
      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:6px">
        ${s.goal ? `<span class="pill">الهدف: <b style="color:var(--text)">${escapeHtml(s.goal)}</b></span>`:''}
        ${s.before ? `<span class="pill">قبل: <b style="color:var(--text)">${escapeHtml(s.before)}</b></span>`:''}
        ${s.after ? `<span class="pill">بعد: <b style="color:var(--text)">${escapeHtml(s.after)}</b></span>`:''}
      </div>
    </div>
  `;
}

function reviewPreview(r){
  return `
    <div class="feature">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px">
        <b>${escapeHtml(r.name||'طالب/ـة')} • ${escapeHtml(r.city||'')}</b>
        <span class="pill">${escapeHtml(r.tag||'General')}</span>
      </div>
      <p style="margin:8px 0 0">${escapeHtml(r.text||'')}</p>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const storiesData = await loadJSON('../data/success-stories.json');
  const host = $('#storiesHost');
  if(host){
    const stories = (storiesData.stories||[])
      .filter(s => (s.approved===true && s.consent===true) || (!s.name));
    host.innerHTML = `<div class="grid-2">
      ${stories.map(storyCard).join('')}
    </div>`;
  }

  const reviewsData = await loadJSON('../data/reviews.json');
  const rhost = $('#reviewsPreview');
  if(rhost){
    const list = (reviewsData.reviews||[]).filter(r=>r.approved===true && r.consent===true).slice(0,4);
    rhost.innerHTML = `<div class="grid-2">${list.map(reviewPreview).join('')}</div>`;
  }
});
