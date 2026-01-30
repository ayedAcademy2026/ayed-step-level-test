
// assets/results.js
import { $, $$, loadJSON, toast, copyText, safeText, setLS, getLS } from './lib.js';

const ACTIVE_KEY = 'ayed_quiz_active_v3';

function levelFromPercent(p){
  if(p>=85) return {label:'متقدم', note:'مستواك قوي — ركّز على السرعة وتقليل الأخطاء.'};
  if(p>=70) return {label:'متوسط', note:'مستواك ممتاز — نحتاج شد بسيط على نقاط الضعف.'};
  if(p>=55) return {label:'مبتدئ-متوسط', note:'نبدأ بخطة مرتبة: تثبيت الأساس ثم رفع الدرجة.'};
  return {label:'مبتدئ', note:'لا تشيل هم — بالبداية نثبت الأساس ونرتب مذاكرتك يوم بيوم.'};
}

function pickWeak(stats){
  const secs = Object.keys(stats||{});
  let worst=null, worstP=999;
  for(const s of secs){
    const st = stats[s];
    const p = st.total ? (st.correct/st.total)*100 : 0;
    if(p < worstP){ worstP=p; worst=s; }
  }
  return worst || 'grammar';
}

function secLabel(sec){
  return ({grammar:'Grammar',reading:'Reading',listening:'Listening',vocab:'Vocab'})[sec] || sec;
}

function buildPlan(profile, percent, sectionStats){
  const name = safeText(profile?.displayName).trim() || 'يا بطل';
  const days = Number(profile?.daysToExam || 30);
  const daily = Number(profile?.dailyTime || 60);
  const best = profile?.bestTime || 'night';
  const weak = pickWeak(sectionStats);

  const timeHint = best==='morning' ? 'الصباح غالبًا تركيزه أعلى — خله وقت المهام الثقيلة.' :
                   best==='afternoon' ? 'الظهر مناسب للتدريب الخفيف + مراجعة الأخطاء.' :
                   'الليل ممتاز للتجميعات + نماذج قصيرة بهدوء.';

  const blocks = daily<=45 ? ['25د (مركز)','15د (أخطاء)','10د (مفردات)']
                : daily<=60 ? ['30د (مركز)','20د (تطبيق)','10د (مفردات)']
                : daily<=90 ? ['40د (مركز)','30د (تطبيق)','20د (مراجعة)']
                : ['50د (مركز)','40د (تطبيق)','30د (مراجعة)'];

  const focusMap = {
    grammar:[
      "قواعد متكررة (Tenses / Conditionals / Modals) مع أمثلة قصيرة.",
      "تدريب سريع: 15 سؤال Grammar مع تصحيح فوري + تسجيل الأخطاء.",
      "مراجعة: أخطاء أمس + قاعدة واحدة فقط بإتقان."
    ],
    reading:[
      "تقنية Skim/Scan + تحديد الكلمات المفتاحية قبل ما تغوص بالتفاصيل.",
      "تدريب Timed Reading: نصين قصار بزمن محدد + تحليل سبب الخطأ.",
      "مراجعة: أسئلة inference و main idea لأنها تجيب فرق كبير."
    ],
    listening:[
      "أسلوب التقاط الفكرة العامة أول 10 ثواني ثم التفاصيل.",
      "تدريب: مقاطع قصيرة (Transcript-based) + تدوين كلمات مفتاحية.",
      "مراجعة: ركّز على distractors (خيارات تشبه الصح لكنها مو هي)."
    ],
    vocab:[
      "مفردات عالية التكرار + Collocations (take/make/do).",
      "تدريب: 20 كلمة/يوم + 10 جمل تطبيقية.",
      "مراجعة: الكلمات اللي غلطت فيها فقط — لا تعيد كل شيء."
    ]
  };

  const generalDays = days<=7 ? 7 : (days<=14 ? 14 : (days<=30 ? 30 : 60));
  const planDays = generalDays;

  const weeklyMock = planDays>=14 ? "نهاية كل أسبوع: نموذج كامل + مراجعة أخطاء." : "اليوم الأخير: نموذج كامل + مراجعة أخطاء.";
  const accountability = "قاعدة التحاسب: بعد كل جلسة… اكتب 3 أشياء: (وش غلطت؟ ليه غلطت؟ وش تسوي بكرة؟).";

  const dailyTable = [];
  for(let d=1; d<=planDays; d++){
    const dayType =
      (planDays===7 && d===7) ? 'Mock' :
      (planDays===14 && (d===7 || d===14)) ? 'Mock' :
      (planDays===30 && (d%7===0)) ? 'Mock' :
      (planDays===60 && (d%7===0)) ? 'Mock' :
      (d%3===0) ? 'Mixed' : 'Focus';

    let tasks=[];
    if(dayType==='Mock'){
      tasks=[
        "اختبار تجريبي (Timed) — كامل أو نصف حسب وقتك.",
        "مراجعة الأخطاء: لا تترك أي سؤال بدون سبب واضح.",
        "أعد كتابة 5 أخطاء (قاعدة/كلمة/فكرة) بصيغة صح."
      ];
    }else if(dayType==='Mixed'){
      tasks=[
        `مزيج سريع: 8 Grammar + 1 Reading + 1 Listening.`,
        "ركز على سرعة الإجابة بدون تسرع.",
        "مراجعة أخطاء آخر 48 ساعة."
      ];
    }else{
      tasks=[...focusMap[weak]];
    }
    dailyTable.push({day:d, blocks, tasks});
  }

  const plan = {
    name,
    weak,
    timeHint,
    blocks,
    planDays,
    weeklyMock,
    accountability,
    dailyTable
  };
  return plan;
}

function renderStars(rating){
  const wrap = document.createElement('span');
  wrap.className='stars';
  for(let i=1;i<=5;i++){
    const s=document.createElementNS('http://www.w3.org/2000/svg','svg');
    s.setAttribute('viewBox','0 0 24 24');
    s.classList.add('star');
    if(i<=rating) s.classList.add('on');
    s.innerHTML = `<path fill="${i<=rating?'#F7C948':'#FFFFFF'}" d="M12 17.3l-6.2 3.7 1.7-7.1L2 9.2l7.3-.6L12 2l2.7 6.6 7.3.6-5.5 4.7 1.7 7.1z"/>`;
    wrap.appendChild(s);
  }
  return wrap;
}

function formatSectionCard(sec, st){
  const pct = st.total ? Math.round((st.correct/st.total)*100) : 0;
  const name = secLabel(sec);
  const hint = {
    grammar:"زود مراجعة قواعد متكررة + أمثلة قصيرة.",
    reading:"تمرّن على السرعة + main idea/inference.",
    listening:"اسمع للفكرة العامة أولاً ثم التفاصيل.",
    vocab:"ثبت كلمات متكررة مع جمل تطبيقية."
  }[sec] || "ركز على أخطاءك المتكررة.";
  return `
    <div class="card glass" style="padding:14px">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px">
        <b>${name}</b>
        <span class="pill">${pct}%</span>
      </div>
      <p style="margin:8px 0 0; color:rgba(255,255,255,.68); line-height:1.9; font-weight:800">${hint}</p>
    </div>
  `;
}

function shareText(cfg, report, plan){
  const url = cfg.links?.levelTestUrl || location.origin + '/';
  const n = safeText(report.profile?.displayName).trim();
  const head = "﴿ وَقُلْ رَبِّ زِدْنِي عِلْمًا ﴾";
  const lineName = n ? `أنا ${n} جربت برنامج تحديد مستوى STEP وطلع لي تحليل + خطة.` : "جربت برنامج تحديد مستوى STEP وطلع لي تحليل + خطة.";
  const marketing = [
    head,
    lineName,
    `نتيجتي: ${report.percent}% — وأضعف قسم عندي: ${secLabel(plan.weak)}.`,
    "الميزة اللي أعجبتني: التصحيح الفوري + خطة يوم/يوم (تحاسب لطيف).",
    "إذا عندك اختبار قريب… جربه وخذ خطتك فورًا:",
    url,
    "",
    "نصيحة: شارك خطتك مع صديقك — الالتزام يصير أسهل 👌"
  ].join("\n");
  return marketing;
}

function buildPlanHTML(cfg, report, plan){
  const rows = plan.dailyTable.slice(0, plan.planDays).map(r=>{
    return `
      <div class="card glass" style="padding:14px; margin-top:10px">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px">
          <b>اليوم ${r.day}</b>
          <span class="pill">${r.blocks.join(' + ')}</span>
        </div>
        <ul style="margin:10px 0 0; padding-inline-start:18px; color:rgba(255,255,255,.78); line-height:2; font-weight:800">
          ${r.tasks.map(t=>`<li>${t}</li>`).join('')}
        </ul>
      </div>
    `;
  }).join('');

  return `
    <div class="card glass" style="padding:16px">
      <b>ملخص الخطة</b>
      <div class="sep"></div>
      <div style="display:flex; gap:10px; flex-wrap:wrap">
        <span class="pill">أضعف قسم: <b style="color:var(--text)">${secLabel(plan.weak)}</b></span>
        <span class="pill">مدة الخطة: <b style="color:var(--text)">${plan.planDays} يوم</b></span>
        <span class="pill">نظام الجلسات: <b style="color:var(--text)">${plan.blocks.join(' + ')}</b></span>
      </div>
      <p style="margin:10px 0 0; color:rgba(255,255,255,.70); line-height:1.95; font-weight:800">
        ${plan.timeHint}<br>
        ${plan.weeklyMock}<br>
        ${plan.accountability}
      </p>
    </div>
    <div style="margin-top:12px">${rows}</div>
  `;
}

function openPrint(cfg, report, plan, planHtml){
  const w = window.open('', '_blank');
  if(!w) return;
  const title = 'خطة مذاكرة STEP';
  const url = cfg.links?.levelTestUrl || '';
  w.document.write(`
    <!doctype html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
      <title>${title}</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
      <style>
        body{font-family:Tajawal, Arial; margin:24px; color:#111;}
        h1{margin:0 0 6px}
        .meta{color:#444; margin-bottom:16px}
        .box{border:1px solid #ddd; border-radius:14px; padding:14px; margin:10px 0}
        .pill{display:inline-block; border:1px solid #ddd; border-radius:999px; padding:6px 10px; margin:3px 6px 3px 0; color:#333; font-weight:800}
        ul{line-height:1.9}
        a{color:#0B1220}
        .brand{display:flex; align-items:center; gap:10px; margin-bottom:12px}
        .logo{width:42px;height:42px;border-radius:14px;background:#0B1220; display:inline-block}
      </style>
    </head>
    <body>
      <div class="brand">
        <div class="logo"></div>
        <div>
          <div style="font-weight:900">أكاديمية عايد STEP</div>
          <div style="color:#666; font-weight:800; font-size:12px">خطة مذاكرة مخصصة — برنامج تحديد المستوى</div>
        </div>
      </div>

      <h1>${safeText(report.profile?.displayName || 'طالب/ـة')} — خطتك</h1>
      <div class="meta">نتيجة الاختبار: <b>${report.percent}%</b> • أضعف قسم: <b>${secLabel(plan.weak)}</b> • تاريخ: ${new Date().toLocaleDateString('ar-SA')}</div>

      <div class="box">
        <div class="pill">مدة الخطة: ${plan.planDays} يوم</div>
        <div class="pill">نظام الجلسات: ${plan.blocks.join(' + ')}</div>
        <div class="pill">رابط البرنامج: ${url}</div>
      </div>

      ${plan.dailyTable.slice(0, plan.planDays).map(r=>`
        <div class="box">
          <div style="display:flex; justify-content:space-between; gap:10px; align-items:center">
            <b>اليوم ${r.day}</b>
            <span style="color:#555; font-weight:800">${r.blocks.join(' + ')}</span>
          </div>
          <ul>
            ${r.tasks.map(t=>`<li>${t}</li>`).join('')}
          </ul>
        </div>
      `).join('')}

      <div style="margin-top:14px; color:#666; font-weight:800">
        للتذكير: (وش غلطت؟ ليه غلطت؟ وش تسوي بكرة؟) — التحاسب اليومي يفرق.
      </div>

      <script>window.onload=()=>{setTimeout(()=>window.print(), 400)}</script>
    </body></html>
  `);
  w.document.close();
}

function buildCourseSuggestion(cfg, report, plan){
  const days = Number(report.profile?.daysToExam || 30);
  const pref = report.profile?.studyPreference || 'short';
  const intensive = cfg.links?.intensiveCourseUrl;
  const comprehensive = cfg.links?.comprehensiveCourseUrl;

  let headline='اقتراحات تناسب وضعك';
  let msg='اختر اللي يناسب وقتك وهدفك… أهم شيء تمشي بخطة واضحة.';
  let rec1 = {title:'الدورة المكثفة 2026', url:intensive, tag:'للي وقته ضيق أو يبي دفعة قوية', emoji:'🔥'};
  let rec2 = {title:'الدورة الشاملة الحديثة', url:comprehensive, tag:'للي يبي تأسيس أوسع وتنظيم شامل', emoji:'📚'};

  if(days<=14){
    msg='بما أن وقتك قريب… الأفضل تمشي على مكثف مختصر + تدريب مركز.';
  }else if(plan.weak==='grammar' && report.percent<70){
    msg='مستواك يحتاج ترتيب أساس + تطبيق — خلك على برنامج منظم.';
  }

  if(pref==='live'){
    msg += " (ملاحظة: لو تحب شرح مباشر، خلك على مقاطع قصيرة مرتبة + تطبيق — نفس الفكرة لكن بدون زحمة.)";
  }

  return `
    <div class="grid-2">
      <div class="feature">
        <div class="icon">${rec1.emoji}</div>
        <h3 style="margin:0 0 6px">${rec1.title}</h3>
        <p style="margin:0">${rec1.tag}</p>
        <div style="margin-top:12px">
          <a class="btn primary" href="${rec1.url}" target="_blank" rel="noopener">فتح صفحة الدورة</a>
        </div>
      </div>
      <div class="feature">
        <div class="icon">${rec2.emoji}</div>
        <h3 style="margin:0 0 6px">${rec2.title}</h3>
        <p style="margin:0">${rec2.tag}</p>
        <div style="margin-top:12px">
          <a class="btn accent" href="${rec2.url}" target="_blank" rel="noopener">فتح صفحة الدورة</a>
        </div>
      </div>
    </div>
    <div class="card glass" style="padding:14px; margin-top:12px">
      <b>${headline}</b>
      <p style="margin:8px 0 0; color:rgba(255,255,255,.70); line-height:1.95; font-weight:800">${msg}</p>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', async ()=>{
  setLS(ACTIVE_KEY, false);

  const report = getLS('ayed_results_v3', null);
  if(!report){
    $('#emptyState')?.classList.remove('hidden');
    return;
  }

  const cfg = await loadJSON('../data/config.json');
  const lvl = levelFromPercent(report.percent);
  const plan = buildPlan(report.profile, report.percent, report.sectionStats);

  $('#userName') && ($('#userName').textContent = safeText(report.profile?.displayName || '—') || '—');
  $('#overallPercent') && ($('#overallPercent').textContent = `${report.percent}%`);
  $('#overallLevel') && ($('#overallLevel').textContent = lvl.label);
  $('#weakSection') && ($('#weakSection').textContent = secLabel(plan.weak));
  $('#motivation') && ($('#motivation').textContent = `${lvl.note} — ${safeText(plan.name)}، خطتك تحت مرتبة يوم بيوم.`);
  const ratingHost = $('#ratingStars');
  if(ratingHost){
    ratingHost.innerHTML = '';
    ratingHost.appendChild(renderStars(Math.max(3, Math.min(5, Math.round(report.percent/20)))));
  }

  // section cards
  $('#cardGrammar') && ($('#cardGrammar').innerHTML = formatSectionCard('grammar', report.sectionStats.grammar || {total:0,correct:0}));
  $('#cardReading') && ($('#cardReading').innerHTML = formatSectionCard('reading', report.sectionStats.reading || {total:0,correct:0}));
  $('#cardListening') && ($('#cardListening').innerHTML = formatSectionCard('listening', report.sectionStats.listening || {total:0,correct:0}));

  // render plan
  const planHost = $('#planHost');
  const planHtml = buildPlanHTML(cfg, report, plan);
  if(planHost) planHost.innerHTML = planHtml;

  // tabs
  $$('.top-tabs a').forEach(a=>{
    a.addEventListener('click', (e)=>{
      e.preventDefault();
      const id = a.getAttribute('href') || '';
      const el = document.querySelector(id);
      if(!el) return;
      el.scrollIntoView({behavior:'smooth', block:'start'});
      $$('.top-tabs a').forEach(x=>x.classList.remove('active'));
      a.classList.add('active');
    });
  });

  // share
  const btnShare = $('#btnShare');
  btnShare?.addEventListener('click', async ()=>{
    const txt = shareText(cfg, report, plan);
    try{
      if(navigator.share){
        await navigator.share({title:'خطة مذاكرة STEP', text: txt, url: cfg.links?.levelTestUrl});
        toast('تمت المشاركة ✅','📤');
      }else{
        await copyText(txt);
        toast('تم نسخ نص المشاركة ✅','📎');
      }
    }catch(_){
      toast('جرّب مرة ثانية 🙏','⚡');
    }
  });

  // download (print)
  $('#btnDownload')?.addEventListener('click', ()=>{
    openPrint(cfg, report, plan, planHtml);
    toast('تقدر تحفظه PDF من نافذة الطباعة ✅','🧾');
  });

  // restart
  $('#btnRestart')?.addEventListener('click', ()=>{
    localStorage.removeItem('ayed_quiz_state_v3');
    localStorage.removeItem('ayed_results_v3');
    toast('تم — تقدر تعيد الاختبار ✅','🔁');
    setTimeout(()=>location.href='../pages/quiz.html', 350);
  });

  // course suggestion
  const sug = $('#courseSuggest');
  if(sug){
    sug.innerHTML = buildCourseSuggestion(cfg, report, plan);
  }

  // show content
  $('#resultsContent')?.classList.remove('hidden');
});
