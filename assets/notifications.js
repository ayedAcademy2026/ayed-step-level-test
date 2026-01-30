
// assets/notifications.js
import { loadJSON, toast, getLS, setLS } from './lib.js';

let cfg=null, data=null;

async function initData(){
  cfg = await loadJSON('../data/config.json');
  data = await loadJSON('../data/notifications.json');
}

function shouldPause(){
  const page = (document.body.getAttribute('data-page')||'').toLowerCase();
  if(page === 'quiz.html') return true;
  if(getLS('ayed_quiz_active_v3', false)) return true;
  return false;
}

function buildPool(){
  const tips = Array.isArray(data?.tips) ? data.tips.map(t=>({t, emoji:'💡'})) : [];
  const act = Array.isArray(data?.anonymous_activity) ? data.anonymous_activity.map(t=>({t, emoji:'✨'})) : [];
  const quotes = Array.isArray(data?.approved_quotes) ? data.approved_quotes
    .filter(x=>x?.approved===true && x?.consent===true && x?.text)
    .map(x=>({t: x.text, emoji:'💬'}))
    : [];
  // We mix with weights: activity more frequent
  const pool = [...tips, ...act, ...act, ...quotes];
  return pool.length ? pool : tips;
}

function pick(pool){
  const last = getLS('ayed_popup_last_v3', null);
  if(pool.length===1) return {idx:0, item:pool[0]};
  let idx = Math.floor(Math.random()*pool.length);
  if(last !== null && idx === last){
    idx = (idx + 1 + Math.floor(Math.random()* (pool.length-1))) % pool.length;
  }
  return {idx, item:pool[idx]};
}

function nextDelayMs(){
  const base = Math.max(25, Number(cfg?.popups?.baseIntervalSec ?? 45));
  const jitter = Math.max(0, Number(cfg?.popups?.jitterSec ?? 5));
  const j = (Math.random()*2 - 1) * jitter;
  return Math.round((base + j) * 1000);
}

function canShowNow(){
  const lastAt = getLS('ayed_popup_lastAt_v3', 0);
  const now = Date.now();
  // do not spam: minimum 20 seconds no matter what
  return (now - lastAt) > 20000;
}

async function run(){
  await initData();
  const pool = buildPool();
  let timer=null;

  const tick = ()=>{
    if(shouldPause()){ timer = setTimeout(tick, 6000); return; }
    if(!canShowNow()){ timer = setTimeout(tick, 8000); return; }

    const {idx, item} = pick(pool);
    setLS('ayed_popup_last_v3', idx);
    setLS('ayed_popup_lastAt_v3', Date.now());

    toast(item.t, item.emoji || '⭐');
    timer = setTimeout(tick, nextDelayMs());
  };

  // start later
  setTimeout(tick, 9000);

  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden){
      if(timer) clearTimeout(timer);
      timer=null;
    }else{
      if(!timer) timer = setTimeout(tick, 6000);
    }
  });
}

document.addEventListener('DOMContentLoaded', ()=>{
  run().catch(()=>{});
});
