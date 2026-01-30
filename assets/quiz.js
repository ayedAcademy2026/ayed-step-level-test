
// assets/quiz.js
import { $, $$, loadJSON, toast, setLS, getLS, safeText } from './lib.js';

const LS_KEY = 'ayed_quiz_state_v3';
const ACTIVE_KEY = 'ayed_quiz_active_v3';

let CONFIG=null;
let QUESTIONS=[];

async function loadAll(){
  CONFIG = await loadJSON('../data/config.json');
  const q = await loadJSON('../data/questions.json');
  QUESTIONS = q.questions || [];
}

function pickQuestions(){
  const by = (sec)=> QUESTIONS.filter(x=>x.section===sec);
  const pickN = (arr,n)=>{
    const a=[...arr];
    // Fisher–Yates shuffle
    for(let i=a.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a.slice(0,n);
  };

  const total = Number(CONFIG?.quiz?.questionCount ?? 50);
  // Balanced mix
  const plan = {grammar:15, reading:15, vocab:10, listening:10};
  // If total differs, adjust
  let sum = Object.values(plan).reduce((a,b)=>a+b,0);
  if(sum !== total){
    const diff = total - sum;
    plan.grammar += diff;
  }

  return [
    ...pickN(by('grammar'), plan.grammar),
    ...pickN(by('reading'), plan.reading),
    ...pickN(by('vocab'), plan.vocab),
    ...pickN(by('listening'), plan.listening),
  ].slice(0,total);
}

function emptyState(){
  return {
    version:'v3',
    startedAt: new Date().toISOString(),
    step:'intro',
    profile:{},
    items:[],
    idx:0
  };
}

function save(state){
  setLS(LS_KEY, state);
}

function load(){
  return getLS(LS_KEY, null);
}

function reset(){
  localStorage.removeItem(LS_KEY);
}

function show(el){ el?.classList.remove('hidden'); }
function hide(el){ el?.classList.add('hidden'); }

function bindIntro(state){
  const intro = $('#introCard');
  const wizard = $('#wizardCard');
  const btnStart = $('#btnStartWizard');
  const btnContinue = $('#btnContinueQuiz');
  const btnReset = $('#btnReset');
  const resumeCard = $('#resumeCard');

  const existing = load();

  if(existing && existing.items?.length && existing.step==='quiz'){
    show(resumeCard);
  }else{
    hide(resumeCard);
  }

  btnStart?.addEventListener('click', ()=>{
    hide(intro); show(wizard);
    state.step='wizard';
    save(state);
  });

  $('#btnResume')?.addEventListener('click', ()=>{
    // resume existing
    location.reload();
  });

  btnReset?.addEventListener('click', ()=>{
    reset();
    toast('تم مسح التقدم — ابدأ من جديد ✅','🧹');
    setTimeout(()=>location.reload(), 400);
  });

  btnContinue?.addEventListener('click', ()=>{
    const profile = collectProfile();
    const ok = validateProfile(profile);
    if(!ok) return;

    const qs = pickQuestions();
    state.step='quiz';
    state.profile = profile;
    state.items = qs.map(q=>({
      id:q.id,
      section:q.section,
      stem:q.stem,
      choices:q.choices,
      answerIndex:q.answerIndex,
      explanation:q.explanation,
      selectedIndex:null,
      correct:null
    }));
    state.idx = 0;
    save(state);
    hide(wizard);
    show($('#quizCard'));
    renderQuiz(state);
    toast('بالتوفيق… خلك مركز ✨','🎯');
  });
}

function collectProfile(){
  const get = (id)=> safeText($(id)?.value).trim();
  const val = (name)=> safeText($(`[name="${name}"]:checked`)?.value);

  return {
    displayName: get('#p_name'),
    tookBefore: val('tookBefore') || 'no',
    prevScore: get('#p_prevScore'),
    targetScore: get('#p_targetScore'),
    daysToExam: val('daysToExam') || '30',
    dailyTime: val('dailyTime') || '60',
    bestTime: val('bestTime') || 'night',
    stage: val('stage') || 'university',
    stageDetail: get('#p_stageDetail'),
    studyPreference: val('studyPreference') || 'short',
  };
}

function validateProfile(p){
  const target = Number(p.targetScore);
  if(!target || target<40 || target>100){
    toast('حدّد الدرجة المستهدفة (بين 40 و 100).','⚠️');
    return false;
  }
  if(p.tookBefore==='yes'){
    const prev = Number(p.prevScore);
    if(!prev || prev<40 || prev>100){
      toast('إذا سبق اختبرت — اكتب درجتك السابقة (بين 40 و 100).','⚠️');
      return false;
    }
  }
  return true;
}

function togglePrevScore(){
  const took = safeText($('[name="tookBefore"]:checked')?.value);
  const box = $('#prevScoreBox');
  if(took==='yes') show(box); else hide(box);
}

function toggleStageDetail(){
  const st = safeText($('[name="stage"]:checked')?.value);
  const box = $('#stageDetailBox');
  if(st==='university' || st==='postgrad' || st==='other') show(box); else hide(box);
}

function renderQuiz(state){
  const host = $('#quizHost');
  const progressBar = $('#progressFill');
  if(!host) return;

  const total = state.items.length;
  const idx = state.idx;
  const item = state.items[idx];

  const pct = Math.round(((idx)/total)*100);
  if(progressBar) progressBar.style.width = `${pct}%`;

  const sectionLabel = {
    grammar:'Grammar',
    reading:'Reading',
    listening:'Listening',
    vocab:'Vocab'
  }[item.section] || 'Section';

  host.innerHTML = `
    <div class="q-head">
      <div class="q-num">سؤال <b>${idx+1}</b> من ${total} <span class="pill" style="margin-inline-start:10px">${sectionLabel}</span></div>
      <div style="display:flex; gap:8px">
        <button class="btn small ghost" id="btnBack" ${idx===0?'disabled':''}>السابق</button>
        <button class="btn small primary" id="btnNext" disabled>${idx===total-1?'إنهاء':'التالي'}</button>
      </div>
    </div>
    <div class="sep"></div>
    <div style="white-space:pre-wrap; line-height:1.9; color:rgba(255,255,255,.88); font-weight:800">${item.stem}</div>
    <div class="choices" role="list">
      ${item.choices.map((c,i)=>`
        <div class="choice ${item.selectedIndex===i?'selected':''}" data-i="${i}" role="listitem">${c}</div>
      `).join('')}
    </div>
    <div id="explainBox" class="card glass hidden" style="margin-top:12px; padding:14px"></div>
  `;

  const explainBox = $('#explainBox');
  const btnNext = $('#btnNext');
  const btnBack = $('#btnBack');

  $$('.choice').forEach(ch=>{
    ch.addEventListener('click', ()=>{
      const i = Number(ch.getAttribute('data-i'));
      if(Number.isNaN(i)) return;

      item.selectedIndex = i;
      item.correct = (i === item.answerIndex);

      // mark styles
      $$('.choice').forEach(c=>c.classList.remove('selected','correct','wrong'));
      $(`.choice[data-i="${i}"]`)?.classList.add('selected');
      // show correction immediately
      $(`.choice[data-i="${item.answerIndex}"]`)?.classList.add('correct');
      if(!item.correct) $(`.choice[data-i="${i}"]`)?.classList.add('wrong');

      if(explainBox){
        explainBox.classList.remove('hidden');
        explainBox.innerHTML = `
          <b>${item.correct ? 'إجابة صحيحة ✅' : 'إجابة غير صحيحة ❌'}</b>
          <p style="margin:8px 0 0; color:rgba(255,255,255,.70); line-height:1.9; font-weight:800">${item.explanation}</p>
        `;
      }
      btnNext?.removeAttribute('disabled');
      save(state);
    });
  });

  btnBack?.addEventListener('click', ()=>{
    if(state.idx>0){
      state.idx -= 1;
      save(state);
      renderQuiz(state);
    }
  });

  btnNext?.addEventListener('click', ()=>{
    if(state.idx < total-1){
      state.idx += 1;
      save(state);
      renderQuiz(state);
    }else{
      finish(state);
    }
  });
}

function finish(state){
  // compute scores
  const total = state.items.length;
  const correct = state.items.filter(x=>x.correct===true).length;
  const percent = Math.round((correct/total)*100);

  const sectionStats = {};
  for(const it of state.items){
    sectionStats[it.section] ||= {total:0, correct:0};
    sectionStats[it.section].total++;
    if(it.correct) sectionStats[it.section].correct++;
  }
  const report = {
    percent,
    correct,
    total,
    sectionStats,
    profile: state.profile,
    finishedAt: new Date().toISOString()
  };

  setLS('ayed_results_v3', report);
  // stop flag
  setLS(ACTIVE_KEY, false);
  // keep state but mark finished
  state.step='done';
  save(state);
  toast('تم — بنطلع لك الخطة الآن ✅','✨');
  setTimeout(()=> location.href = '../pages/results.html', 380);
}

function resumeOrStart(){
  const existing = load();
  if(existing && existing.step==='quiz' && existing.items?.length){
    // resume
    $('#introCard')?.classList.add('hidden');
    $('#wizardCard')?.classList.add('hidden');
    $('#resumeCard')?.classList.add('hidden');
    $('#quizCard')?.classList.remove('hidden');
    renderQuiz(existing);
    return;
  }
  if(existing && existing.step==='wizard'){
    $('#introCard')?.classList.add('hidden');
    $('#wizardCard')?.classList.remove('hidden');
    $('#resumeCard')?.classList.add('hidden');
  }
}

function wireProfileDynamics(){
  $$('[name="tookBefore"]').forEach(r=>r.addEventListener('change', togglePrevScore));
  $$('[name="stage"]').forEach(r=>r.addEventListener('change', toggleStageDetail));
  togglePrevScore();
  toggleStageDetail();
}

document.addEventListener('DOMContentLoaded', async ()=>{
  // mark quiz active to pause popups
  setLS(ACTIVE_KEY, true);

  window.addEventListener('beforeunload', ()=>{
    // keep active true if still in quiz
  });

  await loadAll();
  const state = load() || emptyState();
  bindIntro(state);
  wireProfileDynamics();
  resumeOrStart();
});
