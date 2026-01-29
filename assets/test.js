// assets/test.js
// اختبار تحديد المستوى (50 سؤال) — سحب عشوائي من بنك الأسئلة + حفظ تقدم + تصحيح فوري
// ملاحظة: هذا الموقع “اختبار مستوى” فقط — بدون ربط تلقائي بحسابات تواصل.
// يعتمد على ملف: assets/questions.json

(function () {
  "use strict";

  const SD = window.SITE_DATA || {};
  const LS_STATE = "ayed_leveltest_state_v2";   // حفظ التقدم
  const LS_RESULT = "ayed_leveltest_result_v2"; // النتيجة النهائية
  const TEST_SIZE = 50;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const safe = (v) => (v ?? "").toString();

  // توزيع الأسئلة (تقدر تغيرها بسهولة)
  // نجمع Grammar+Vocabulary سوا (أسئلة لغوية مباشرة)، وReading وListening
  const DEFAULT_DISTRIBUTION = {
    Lang: 20,      // Grammar + Vocabulary
    Reading: 15,
    Listening: 15,
  };

  function loadJSON(url) {
    return fetch(url, { cache: "no-store" }).then((r) => {
      if (!r.ok) throw new Error("Failed to load questions.json");
      return r.json();
    });
  }

  function readFormMeta() {
    // نجمع أي حقول موجودة بدون ما نفرض أسماء ثابتة (مرن)
    const meta = {};
    const form = $("#startForm") || $("form[data-start-form]") || null;
    if (!form) return meta;

    const fields = $$("input, select, textarea", form);
    fields.forEach((el) => {
      const name = el.name || el.id;
      if (!name) return;

      if (el.type === "checkbox") {
        meta[name] = !!el.checked;
      } else if (el.type === "radio") {
        if (el.checked) meta[name] = el.value;
      } else {
        meta[name] = el.value;
      }
    });

    return meta;
  }

  function normalizeSection(section) {
    const s = safe(section).toLowerCase();
    if (s.includes("read")) return "Reading";
    if (s.includes("listen")) return "Listening";
    if (s.includes("grammar")) return "Lang";
    if (s.includes("vocab")) return "Lang";
    return "Lang";
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickBalancedQuestions(bank, size = TEST_SIZE) {
    const dist = DEFAULT_DISTRIBUTION;
    const groups = { Lang: [], Reading: [], Listening: [] };

    bank.forEach((q) => {
      const g = normalizeSection(q.section);
      if (!groups[g]) groups[g] = [];
      groups[g].push(q);
    });

    // خلط لكل قسم
    Object.keys(groups).forEach((k) => (groups[k] = shuffle(groups[k])));

    // سحب حسب التوزيع
    const picks = [];
    const take = (k, n) => {
      const slice = groups[k].slice(0, n);
      groups[k] = groups[k].slice(n);
      picks.push(...slice);
    };

    take("Lang", dist.Lang);
    take("Reading", dist.Reading);
    take("Listening", dist.Listening);

    // لو نقص قسم (بسبب قلة البنك)، نعوّض من الباقي
    if (picks.length < size) {
      const rest = shuffle([
        ...groups.Lang,
        ...groups.Reading,
        ...groups.Listening,
      ]);
      picks.push(...rest.slice(0, size - picks.length));
    }

    return shuffle(picks).slice(0, size);
  }

  function saveState(state) {
    localStorage.setItem(LS_STATE, JSON.stringify(state));
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_STATE);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function clearState() {
    localStorage.removeItem(LS_STATE);
  }

  function saveResult(result) {
    localStorage.setItem(LS_RESULT, JSON.stringify(result));
  }

  function escapeHtml(str) {
    return safe(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // UI: إذا الصفحة ما فيها عناصر جاهزة — نبني واجهة كاملة داخل #testHost
  function ensureUI() {
    let host = $("#testHost");
    if (!host) {
      host = document.createElement("div");
      host.id = "testHost";
      host.className = "container";
      document.body.appendChild(host);
    }

    let screen = $("#testScreen");
    if (!screen) {
      host.innerHTML = `
        <section class="card glass" style="padding:16px; margin-top:14px">
          <div id="introBlock">
            <div class="kicker"><span class="dot"></span>اختبار تحديد المستوى</div>
            <h1 style="margin:8px 0 0">ابدأ اختبار المستوى</h1>
            <p style="margin:10px 0 0; color:var(--muted); line-height:1.95">
              50 سؤال موزعة (Grammar/Reading/Listening) — محاكاة تدريبية مبنية على “نمط” النماذج الحديثة
              حتى ${escapeHtml((SD.exam?.modelsReference || ["49","50","51"]).join("، "))}.
            </p>

            <form id="startForm" style="margin-top:14px">
              <div class="grid-2">
                <div>
                  <label class="lbl">اسمك (ضروري)</label>
                  <input id="name" name="name" class="input" autocomplete="name" placeholder="اكتب اسمك" required />
                </div>
                <div>
                  <label class="lbl">موعد اختبارك</label>
                  <select id="examWindow" name="examWindow" class="input">
                    <option value="">ما بعد حجزت</option>
                    <option value="<24h">أقل من 24 ساعة</option>
                    <option value="<3d">خلال 3 أيام</option>
                    <option value="<7d">خلال 7 أيام</option>
                    <option value="<30d">خلال شهر</option>
                    <option value=">30d">أكثر من شهر</option>
                  </select>
                </div>
              </div>

              <div style="margin-top:10px">
                <label class="lbl">هدفك (اختياري)</label>
                <select id="purpose" name="purpose" class="input">
                  <option value="">—</option>
                  <option value="university">متطلب جامعة / إعفاء</option>
                  <option value="bridging">تجسير / قبول</option>
                  <option value="job">وظيفة</option>
                  <option value="personal">تطوير شخصي</option>
                </select>
              </div>

              <div class="inline-actions" style="margin-top:12px">
                <button id="btnStart" class="btn primary" type="submit">ابدأ الاختبار الآن</button>
                <button id="btnResume" class="btn outline" type="button" style="display:none">أكمل من آخر حفظ</button>
              </div>

              <p class="hint" style="margin-top:10px">
                * التقدم يُحفظ تلقائيًا على نفس الجهاز والمتصفح.
              </p>
            </form>
          </div>
        </section>

        <section id="testScreen" class="card glass hidden" style="padding:16px; margin-top:14px">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap">
            <div>
              <div class="kicker"><span class="dot"></span>اختبار المستوى • 50 سؤال</div>
              <div id="progressText" style="margin-top:6px; font-weight:900">—</div>
            </div>

            <div style="display:flex; gap:8px; align-items:center">
              <button id="btnMap" class="btn small ghost" type="button">خريطة الأسئلة</button>
              <button id="btnReset" class="btn small ghost" type="button">إعادة من الصفر</button>
            </div>
          </div>

          <div class="sep"></div>

          <div class="progress" aria-label="شريط التقدم">
            <div id="progressBar" class="bar"></div>
          </div>

          <div class="sep"></div>

          <div id="questionMeta" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center">
            <span class="pill" id="pillSection">—</span>
            <span class="pill" id="pillDifficulty">—</span>
            <span class="pill" id="pillTag">—</span>
          </div>

          <h2 id="questionText" style="margin:12px 0 0; line-height:1.6">—</h2>

          <div id="optionsHost" class="options" style="margin-top:12px"></div>

          <div id="explainHost" class="card" style="display:none; margin-top:12px; padding:12px"></div>

          <div class="sep"></div>

          <div class="inline-actions">
            <button id="btnPrev" class="btn outline" type="button">السابق</button>
            <button id="btnNext" class="btn primary" type="button" disabled>التالي</button>
            <button id="btnFinish" class="btn primary hidden" type="button">إنهاء وإظهار الخطة</button>
          </div>

          <p class="hint" style="margin-top:10px">
            * تقدر ترجع لأي سؤال وتغير إجابتك — النظام يحسب آخر اختيار.
          </p>
        </section>

        <div id="mapModal" class="modal hidden" role="dialog" aria-modal="true" aria-label="خريطة الأسئلة">
          <div class="modal-card">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px">
              <b>خريطة الأسئلة</b>
              <button id="mapClose" class="btn small ghost" type="button">إغلاق</button>
            </div>
            <p style="margin:8px 0 10px; color:var(--muted); line-height:1.8">
              المربعات: ✅ تمّت الإجابة • ⭕ بدون إجابة • 🔁 عدّل إجابتك بأي وقت.
            </p>
            <div id="mapGrid" class="map-grid"></div>
          </div>
        </div>
      `;
      screen = $("#testScreen");
    }

    return {
      introForm: $("#startForm"),
      btnStart: $("#btnStart"),
      btnResume: $("#btnResume"),
      btnReset: $("#btnReset"),
      btnPrev: $("#btnPrev"),
      btnNext: $("#btnNext"),
      btnFinish: $("#btnFinish"),
      btnMap: $("#btnMap"),
      mapModal: $("#mapModal"),
      mapGrid: $("#mapGrid"),
      mapClose: $("#mapClose"),
      progressText: $("#progressText"),
      progressBar: $("#progressBar"),
      pillSection: $("#pillSection"),
      pillDifficulty: $("#pillDifficulty"),
      pillTag: $("#pillTag"),
      questionText: $("#questionText"),
      optionsHost: $("#optionsHost"),
      explainHost: $("#explainHost"),
      introBlock: $("#introBlock"),
      testScreen: $("#testScreen"),
      nameInput: $("#name"),
      examWindow: $("#examWindow"),
    };
  }

  function setHidden(el, hidden) {
    if (!el) return;
    el.classList.toggle("hidden", !!hidden);
  }

  function showModal(modal, show) {
    if (!modal) return;
    modal.classList.toggle("hidden", !show);
    document.body.style.overflow = show ? "hidden" : "";
  }

  function buildOptionButton(optText, idx, onClick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option";
    btn.setAttribute("data-idx", String(idx));
    btn.innerHTML = `
      <span class="k">${String.fromCharCode(65 + idx)}</span>
      <span class="t">${escapeHtml(optText)}</span>
    `;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function renderQuestion(ui, state) {
    const q = state.questions[state.current];
    if (!q) return;

    // Meta pills
    ui.pillSection.textContent = q.section || "—";
    ui.pillDifficulty.textContent = `صعوبة: ${q.difficulty ?? "—"}`;
    ui.pillTag.textContent = q.skillTag ? `Tag: ${q.skillTag}` : "—";

    // Title
    ui.questionText.innerHTML = escapeHtml(q.prompt || "");

    // Progress
    const idx = state.current + 1;
    ui.progressText.textContent = `سؤال ${idx} من ${state.questions.length}`;
    const pct = Math.round((idx / state.questions.length) * 100);
    ui.progressBar.style.width = `${pct}%`;

    // Options
    ui.optionsHost.innerHTML = "";
    const picked = state.answers[state.current]; // selectedIndex or null
    const graded = state.graded[state.current];  // { isCorrect, correctIndex } or null

    (q.options || []).forEach((t, i) => {
      const btn = buildOptionButton(t, i, () => {
        // اختيار/تغيير
        state.answers[state.current] = i;

        // تصحيح فوري
        const correctIndex = Number(q.correctIndex);
        const isCorrect = i === correctIndex;
        state.graded[state.current] = { isCorrect, correctIndex };

        saveState(state);
        renderQuestion(ui, state);
      });

      // styles for selected/correct/wrong
      if (picked === i) btn.classList.add("selected");

      if (graded) {
        const ci = graded.correctIndex;
        if (i === ci) btn.classList.add("correct");
        if (picked === i && picked !== ci) btn.classList.add("wrong");
      }

      ui.optionsHost.appendChild(btn);
    });

    // Explanation (بعد اختيار إجابة)
    if (picked !== null && picked !== undefined && state.graded[state.current]) {
      const isCorrect = state.graded[state.current].isCorrect;
      ui.explainHost.style.display = "block";
      ui.explainHost.classList.toggle("ok", !!isCorrect);
      ui.explainHost.classList.toggle("bad", !isCorrect);

      ui.explainHost.innerHTML = `
        <b>${isCorrect ? "إجابة صحيحة ✅" : "إجابة غير صحيحة ❌"}</b>
        <p style="margin:8px 0 0; color:var(--muted); line-height:1.9">
          ${escapeHtml(q.explanationShort || "تم التصحيح.")}
        </p>
      `;
      ui.btnNext.disabled = false;
    } else {
      ui.explainHost.style.display = "none";
      ui.explainHost.innerHTML = "";
      ui.btnNext.disabled = true;
    }

    // Prev/Next/Finish
    ui.btnPrev.disabled = state.current === 0;

    const last = state.current === state.questions.length - 1;
    setHidden(ui.btnNext, last);
    setHidden(ui.btnFinish, !last);
    ui.btnFinish.disabled = !(state.answers[state.current] !== null && state.answers[state.current] !== undefined);

    // Update map
    renderMap(ui, state);
  }

  function renderMap(ui, state) {
    if (!ui.mapGrid) return;
    ui.mapGrid.innerHTML = "";

    for (let i = 0; i < state.questions.length; i++) {
      const has = state.answers[i] !== null && state.answers[i] !== undefined;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "map-cell";
      b.textContent = String(i + 1);
      if (i === state.current) b.classList.add("active");
      if (has) b.classList.add("done");

      b.addEventListener("click", () => {
        state.current = i;
        saveState(state);
        showModal(ui.mapModal, false);
        renderQuestion(ui, state);
      });

      ui.mapGrid.appendChild(b);
    }
  }

  function computeResult(state) {
    // حساب نقاط عامة + تحليل الأقسام
    const totals = { Grammar: 0, Vocabulary: 0, Reading: 0, Listening: 0, Lang: 0, All: 0 };
    const corrects = { Grammar: 0, Vocabulary: 0, Reading: 0, Listening: 0, Lang: 0, All: 0 };

    state.questions.forEach((q, i) => {
      const sec = safe(q.section) || "Lang";
      const secNorm = normalizeSection(sec); // Lang/Reading/Listening
      const sel = state.answers[i];
      const isCorrect = sel === q.correctIndex;

      totals.All++;
      if (isCorrect) corrects.All++;

      totals[secNorm] = (totals[secNorm] || 0) + 1;
      if (isCorrect) corrects[secNorm] = (corrects[secNorm] || 0) + 1;

      // تفصيل Grammar/Vocab إذا موجود بالنص
      if (sec.toLowerCase().includes("grammar")) {
        totals.Grammar++;
        if (isCorrect) corrects.Grammar++;
      } else if (sec.toLowerCase().includes("vocab")) {
        totals.Vocabulary++;
        if (isCorrect) corrects.Vocabulary++;
      }
    });

    const percentAll = totals.All ? Math.round((corrects.All / totals.All) * 100) : 0;

    let level = "متوسط";
    if (percentAll >= 80) level = "متقدم";
    else if (percentAll < 55) level = "مبتدئ";

    // أضعف قسم من الثلاثة الرئيسية
    const secScores = [
      { k: "Lang", p: totals.Lang ? (corrects.Lang / totals.Lang) : 0 },
      { k: "Reading", p: totals.Reading ? (corrects.Reading / totals.Reading) : 0 },
      { k: "Listening", p: totals.Listening ? (corrects.Listening / totals.Listening) : 0 },
    ].sort((a, b) => a.p - b.p);
    const weak = secScores[0]?.k || "Lang";

    return {
      meta: state.meta || {},
      finishedAt: new Date().toISOString(),
      totalQuestions: totals.All,
      correct: corrects.All,
      percent: percentAll,
      level,
      weakSection: weak,
      breakdown: {
        lang: {
          total: totals.Lang,
          correct: corrects.Lang,
          percent: totals.Lang ? Math.round((corrects.Lang / totals.Lang) * 100) : 0,
          grammar: { total: totals.Grammar, correct: corrects.Grammar },
          vocab: { total: totals.Vocabulary, correct: corrects.Vocabulary },
        },
        reading: {
          total: totals.Reading,
          correct: corrects.Reading,
          percent: totals.Reading ? Math.round((corrects.Reading / totals.Reading) * 100) : 0,
        },
        listening: {
          total: totals.Listening,
          correct: corrects.Listening,
          percent: totals.Listening ? Math.round((corrects.Listening / totals.Listening) * 100) : 0,
        },
      },
      modelsReference: SD.exam?.modelsReference || ["49", "50", "51"],
      updatesNote: SD.exam?.updatesNote || "",
    };
  }

  function confirmReset() {
    return confirm("تبغى تبدأ من الصفر؟ (راح ينحذف التقدم المحفوظ)");
  }

  async function boot() {
    const ui = ensureUI();

    // Resume availability
    const existing = loadState();
    if (existing && Array.isArray(existing.questions) && existing.questions.length) {
      ui.btnResume.style.display = "inline-flex";
      ui.btnResume.addEventListener("click", () => {
        ui.introBlock && setHidden(ui.introBlock, true);
        setHidden(ui.testScreen, false);

        // ensure keys
        existing.current = clamp(existing.current ?? 0, 0, existing.questions.length - 1);
        existing.answers = Array.isArray(existing.answers) ? existing.answers : new Array(existing.questions.length).fill(null);
        existing.graded = Array.isArray(existing.graded) ? existing.graded : new Array(existing.questions.length).fill(null);

        saveState(existing);
        renderQuestion(ui, existing);
      });
    }

    // Load bank once on start
    async function startNewTest() {
      const meta = readFormMeta();
      const name = safe(meta.name || meta.studentName || meta.fullName).trim();

      if (!name) {
        alert("فضلاً اكتب اسمك أولاً 🙏");
        ui.nameInput?.focus();
        return;
      }

      const cacheBust = SD.ui?.cacheVersion ? `?v=${encodeURIComponent(SD.ui.cacheVersion)}` : "";
      const bank = await loadJSON(`assets/questions.json${cacheBust}`);

      if (!Array.isArray(bank) || bank.length < 50) {
        alert("بنك الأسئلة غير جاهز أو ناقص. تأكد من ملف questions.json");
        return;
      }

      const picked = pickBalancedQuestions(bank, TEST_SIZE);

      const state = {
        version: 2,
        createdAt: new Date().toISOString(),
        meta: {
          ...meta,
          name,
        },
        // حفظ الأسئلة نفسها (كائنات) عشان النتائج تشتغل حتى لو تغير البنك لاحقاً
        questions: picked,
        current: 0,
        answers: new Array(picked.length).fill(null),
        graded: new Array(picked.length).fill(null),
      };

      saveState(state);

      ui.introBlock && setHidden(ui.introBlock, true);
      setHidden(ui.testScreen, false);
      renderQuestion(ui, state);
    }

    ui.introForm?.addEventListener("submit", (e) => {
      e.preventDefault();
      startNewTest().catch((err) => {
        console.error(err);
        alert("صار خطأ أثناء تشغيل الاختبار. تأكد من رفع الملفات بشكل صحيح.");
      });
    });

    ui.btnReset?.addEventListener("click", () => {
      if (!confirmReset()) return;
      clearState();
      location.reload();
    });

    ui.btnPrev?.addEventListener("click", () => {
      const st = loadState();
      if (!st) return;
      st.current = clamp((st.current ?? 0) - 1, 0, st.questions.length - 1);
      saveState(st);
      renderQuestion(ui, st);
    });

    ui.btnNext?.addEventListener("click", () => {
      const st = loadState();
      if (!st) return;
      st.current = clamp((st.current ?? 0) + 1, 0, st.questions.length - 1);
      saveState(st);
      renderQuestion(ui, st);
    });

    ui.btnFinish?.addEventListener("click", () => {
      const st = loadState();
      if (!st) return;

      // تحقق: هل فيه أسئلة بدون إجابة؟
      const missing = st.answers.findIndex((a) => a === null || a === undefined);
      if (missing !== -1) {
        alert(`باقي سؤال بدون إجابة: رقم ${missing + 1}\nروح له من "خريطة الأسئلة" وكمله.`);
        return;
      }

      const result = computeResult(st);
      saveResult(result);

      // نترك التقدم محفوظ (احتياط)، لكن نقدر نمسحه لو تبغى:
      // clearState();

      // تحويل لصفحة النتائج
      location.href = "results.html";
    });

    // Map modal
    ui.btnMap?.addEventListener("click", () => {
      const st = loadState();
      if (!st) return;
      renderMap(ui, st);
      showModal(ui.mapModal, true);
    });
    ui.mapClose?.addEventListener("click", () => showModal(ui.mapModal, false));
    ui.mapModal?.addEventListener("click", (e) => {
      if (e.target === ui.mapModal) showModal(ui.mapModal, false);
    });

    // لو المستخدم داخل الصفحة وما كان في intro جاهز (حسب بناء صفحتك)، نخلي الشاشة على وضع intro
    // ولا نفتح الاختبار إلا بزر start/resume
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
