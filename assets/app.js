
// assets/app.js
import { $, $$, loadJSON, toast, safeText } from './lib.js';

let CONFIG = null;

async function loadConfig(){
  if(CONFIG) return CONFIG;
  CONFIG = await loadJSON('../data/config.json');
  return CONFIG;
}

function setupDrawer(){
  const btn = $('[data-open-drawer]');
  const closeBtn = $('[data-close-drawer]');
  const backdrop = $('.drawer-backdrop');
  const drawer = $('.drawer');

  const open = ()=>{
    backdrop?.classList.add('open');
    drawer?.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  const close = ()=>{
    backdrop?.classList.remove('open');
    drawer?.classList.remove('open');
    document.body.style.overflow = '';
  };

  btn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);
  $$('.drawer a').forEach(a=>a.addEventListener('click', close));
}

function setActiveNav(){
  const page = (document.body.getAttribute('data-page') || '').toLowerCase();
  if(!page) return;
  $$('.nav a, .drawer nav a').forEach(a=>{
    const href = (a.getAttribute('href')||'').toLowerCase();
    if(href.endsWith(page)) a.classList.add('active');
  });
}

function registerSW(){
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('../sw.js').catch(()=>{});
  }
}

function setupInstallBanner(){
  const banner = $('.install-banner');
  const btn = $('#installBtn');
  const close = $('#installClose');
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault();
    deferredPrompt = e;
    banner?.classList.add('show');
  });

  btn?.addEventListener('click', async ()=>{
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    try{ await deferredPrompt.userChoice; }catch(_){}
    deferredPrompt = null;
    banner?.classList.remove('show');
    toast('تم — إذا ما ظهر لك، جرّب مرة ثانية بعد ثواني ✨','📲');
  });

  close?.addEventListener('click', ()=> banner?.classList.remove('show'));

  // iOS gentle hint
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if(isIOS && !isInStandalone){
    const key = 'ayed_install_ios_hint_v3';
    if(!localStorage.getItem(key)){
      localStorage.setItem(key,'1');
      setTimeout(()=>{
        banner?.classList.add('show');
        const p = banner?.querySelector('.txt .t p');
        if(p){
          p.textContent = 'على iPhone: افتح مشاركة Safari ثم اختر “Add to Home Screen” لتثبيت البرنامج.';
        }
        btn?.classList.add('hidden');
      }, 1400);
    }
  }
}

async function hydrateBrand(){
  const cfg = await loadConfig();
  const nameAr = cfg.brand?.academyNameAr || 'أكاديمية عايد STEP';
  const tagline = cfg.brand?.tagline || '';
  const logoImg = $('.brand .logo img');
  const academyEl = $('.brand .titles .a');
  const courseEl = $('.brand .titles .b');
  if(academyEl) academyEl.textContent = nameAr;
  if(courseEl) courseEl.textContent = tagline;
  if(logoImg) logoImg.src = '../assets/brand/app-icon-256.png';
  document.title = document.title.replace('أكاديمية عايد STEP', nameAr);
}

function wireGlobalShare(){
  const btn = $('[data-share-program]');
  if(!btn) return;
  btn.addEventListener('click', async ()=>{
    try{
      const cfg = await loadConfig();
      const url = cfg.links?.levelTestUrl || location.origin + location.pathname;
      const shareText = safeText(btn.getAttribute('data-share-text')) || `﴿ وَقُلْ رَبِّ زِدْنِي عِلْمًا ﴾\nبرنامج تحديد مستوى STEP + خطة مذاكرة فورية.\nجرّبه هنا: ${url}`;
      if(navigator.share){
        await navigator.share({title:'برنامج تحديد المستوى STEP', text:shareText, url});
        toast('تمت المشاركة ✅','📤');
      }else{
        await navigator.clipboard.writeText(shareText);
        toast('تم نسخ نص المشاركة ✅','📎');
      }
    }catch(_){
      toast('جرّب مرة ثانية 🙏','⚡');
    }
  });
}

document.addEventListener('DOMContentLoaded', async ()=>{
  try{ await hydrateBrand(); }catch(_){}
  setActiveNav();
  setupDrawer();
  setupInstallBanner();
  wireGlobalShare();
  registerSW();
});
