// assets/results.js
// Results page logic: render score + analysis + smart plan + share text (viral) + recommend courses
// ملاحظة: هذا الموقع "اختبار تحديد المستوى" فقط — بدون تيليجرام داخل الموقع.

(function () {
  "use strict";

  const SD = window.SITE_DATA || {};
  const $ = (sel, root = document) => root.querySelector(sel);

  // عناصر results.html
  const elResults = $("#resultsContent");
  const elEmpty = $("#emptyState");
  const elName = $("#userName");
  const elOverallPercent = $("#overallPercent");
  const elOverallLevel = $("#overallLevel");
  const elWeak = $("#weakSection");
  const elMotivation = $("#motivation");
  const elStars = $("#ratingStars");

  const elGrammar = $("#cardGrammar");
  const elReading = $("#cardReading");
  const elListening = $("#cardListening");
  const elPlanHost = $("#planHost");

  const btnShare = $("#btnShare");
  const btnRegister = $("#btnRegister");

  // Helpers
  const safeText = (v) => (v ?? "").toString();
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const fmtPct = (n) => `${Math.round(n)}%`;

  function escapeHtml(str) {
    return safeText(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function toast(msg) {
    const host = $(".toast-container");
    if (!host) return;
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `
      <div class="bubble" aria-hidden="true">✅</div>
      <div>
        <p>${escapeHtml(msg)}</p>
        <small>تم</small>
      </div>
    `;
    host.appendChild(t);
    setTimeout(() => {
      t.style.opacity = "0";
      t.style.transform = "translateY(6px)";
    }, 3600);
    setTimeout(() => t.remove(), 4300);
  }

  // ====== Storage schema (اعتمدناها للموقع الجديد) ======
  // session: بيانات الطالب + اختياراته قبل الاختبار
  // result: نتيجة الاختبار + تفصيل الأقسام + إجابات (اختياري)
  const KEY_SESSION = "ayed_leveltest_session_v1";
  const KEY_RESULT = "ayed_leveltest_result_v1";

  // Fallback keys (لو كان عندك نسخ سابقة)
  const FALLBACK_KEYS = ["ayed_test_result_v1", "ayed_step_result_v1", "ayed_level_result"];

  function readJSON(key) {
    try {
      const v = localStorage.getItem(key);
      if (!v) return null;
      return JSON.parse(v);
    } catch (_) {
      return null;
    }
  }

  function getSession() {
    return readJSON(KEY_SESSION) || {};
  }

  function getResult() {
    let r = readJSON(KEY_RESULT);
    if (r) return r;
    for (const k of FALLBACK_KEYS) {
      r = readJSON(k);
      if (r) return r;
    }
    return null;
  }

  function sectionLabel(k) {
    if (k === "grammar") return "Grammar (القواعد)";
    if (k === "reading") return "Reading (القراءة)";
    if (k === "listening") return "Listening (الاستماع)";
    return k;
  }

  function levelFromPercent(p) {
    if (p >= 85) return "متقدم";
    if (p >= 70) return "فوق المتوسط";
    if (p >= 55) return "متوسط";
    if (p >= 40) return "مبتدئ قوي";
    return "مبتدئ";
  }

  function starsFromPercent(p) {
    // تقييم “متجر” شكلي/تحفيزي (مو تقييم رسمي)، يبان للطالب كتحفيز
    // 0..100 => 3.6..5.0 تقريبًا
    const s = 3.6 + (clamp(p, 0, 100) / 100) * 1.4;
    return Math.round(s * 10) / 10; // 4.8
  }

  function buildStarsSVG(ratingOutOf5) {
    const full = Math.floor(ratingOutOf5);
    const half = ratingOutOf5 - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;

    const starOn = `<svg class="star-on" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.3l-6.2 3.7 1.7-7.1L2 9.2l7.3-.6L12 2l2.7 6.6 7.3.6-5.5 4.7 1.7 7.1z"/></svg>`;
    const starOff = `<svg class="star-off" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.3l-6.2 3.7 1.7-7.1L2 9.2l7.3-.6L12 2l2.7 6.6 7.3.6-5.5 4.7 1.7 7.1z"/></svg>`;
    const starHalf = `<svg class="star-half" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.3l-6.2 3.7 1.7-7.1L2 9.2l7.3-.6L12 2l2.7 6.6 7.3.6-5.5 4.7 1.7 7.1z"/><path d="M12 2v15.3l-6.2 3.7 1.7-7.1L2 9.2l7.3-.6L12 2z"/></svg>`;

    return `
      <div class="pill" style="display:inline-flex; align-items:center; gap:10px">
        <span style="font-weight:900">تقييم الخطة: ${ratingOutOf5}/5</span>
        <span class="stars" aria-hidden="true">
          ${starOn.repeat(full)}${half ? starHalf : ""}${starOff.repeat(empty)}
        </span>
      </div>
    `;
  }

  function buildSectionCard(title, pct, hint, focusBullets) {
    const bullets = (focusBullets || [])
      .map((b) => `<li>${escapeHtml(b)}</li>`)
      .join("");
    return `
      <div class="card glass" style="padding:14px">
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:center">
          <div>
            <div style="font-weight:900">${escapeHtml(title)}</div>
            <div style="color:var(--muted); font-size:12.5px; margin-top:2px; line-height:1.7">${escapeHtml(hint)}</div>
          </div>
          <div class="pill"><b style="color:var(--text)">${escapeHtml(fmtPct(pct))}</b></div>
        </div>
        <div class="sep"></div>
        <div style="color:var(--muted); font-size:12.8px; line-height:1.85">
          <b style="color:var(--text)">وش تسوي الآن؟</b>
          <ul style="margin:8px 0 0; padding:0 18px">${bullets}</ul>
        </div>
      </div>
    `;
  }

  // ====== Plan generator (مربوط بفهرس الدورة “منطقياً” بدون روابط داخل القنوات) ======
  // examWindow choices:
  // lt24h | lt3d | lt7d | lt15d | lt30d | lt60d | lt90d | notBooked
  function planByWindow(examWindow) {
    const map = {
      lt24h: { id: "day1", title: "خطة يوم واحد (إنقاذ)", days: 1 },
      lt3d: { id: "day3", title: "خطة 3 أيام", days: 3 },
      lt7d: { id: "day7", title: "خطة 7 أيام", days: 7 },
      lt15d: { id: "day15", title: "خطة 15 يوم", days: 15 },
      lt30d: { id: "day30", title: "خطة 30 يوم", days: 30 },
      lt60d: { id: "day60", title: "خطة 60 يوم", days: 60 },
      lt90d: { id: "day90", title: "خطة 90 يوم", days: 90 },
      notBooked: { id: "notBooked", title: "خطة بدون موعد (ترتيب ثم احجز)", days: 30 },
    };
    return map[examWindow] || map.lt7d;
  }

  function buildPlanLines(planId, weakKey) {
    // الهدف: خطة “مقنعة + قابلة للتنفيذ” + تذكير بنماذج حديثة
    const models = (SD.exam?.modelsReference || ["49", "50", "51"]).join("، ");
    const weak = weakKey || "grammar";

    // Boost حسب الضعف
    const boost = {
      grammar: "القواعد",
      reading: "القراءة",
      listening: "الاستماع",
    }[weak];

    // عناصر مشتركة “من فهرس الدورة” بصياغة تعليمية
    const common = [
      "ثبت وقت ثابت يوميًا (حتى لو 20 دقيقة) — أهم شيء الاستمرارية.",
      "بعد كل تدريب: دوّن 3 أخطاء متكررة وارجع لها نهاية اليوم.",
      `لا تذاكر من مصادر كثيرة… خلك على مسار واحد (نمط حديث حتى ${models}).`,
    ];

    const plans = {
      day1: [
        `صباحًا (60 دقيقة): مراجعة “استراتيجيات القراءة + الاستماع” + كلمات الربط.`,
        `منتصف اليوم (120 دقيقة): نموذج قراءة سريع + تدريب Listening قصير + تصحيح أخطاءك.`,
        `المساء (60 دقيقة): مراجعة أهم قواعد ${boost} + أخطاء شائعة + راحة مبكرة.`,
        ...common,
      ],
      day3: [
        `اليوم 1: تأسيس سريع (قواعد + قراءة) + تدريب قصير وتصحيح.`,
        `اليوم 2: تركيز على ${boost} + نموذجين مصغرين + تثبيت الأخطاء.`,
        `اليوم 3: محاكاة مختصرة + إدارة وقت + مراجعة ملخصات سريعة.`,
        ...common,
      ],
      day7: [
        `يوم 1–2: تمهيد + ترتيب الأساسيات (قواعد/قراءة/استماع).`,
        `يوم 3–4: تركيز على ${boost} (تمارين كثيرة + تصحيح فوري).`,
        `يوم 5: قراءة بالوقت (Skim/Scan) + مفردات متكررة.`,
        `يوم 6: Listening drills + تدوين كلمات مفتاحية.`,
        `يوم 7: محاكاة أقرب للاختبار + مراجعة نهائية للأخطاء.`,
        ...common,
      ],
      day15: [
        `الأيام 1–3: تأسيس وتمهيد + بناء روتين ثابت.`,
        `الأيام 4–7: قواعد (أزمنة/شرط/ضمائر وصل) + نماذج قصيرة.`,
        `الأيام 8–10: استثناءات + تثبيت القاعدة بتطبيق.`,
        `الأيام 11–13: Reading (استراتيجيات + قطع متكررة).`,
        `اليوم 14: Listening (استراتيجيات + تدريب مكثف).`,
        `اليوم 15: محاكاة + تحليل أخطاء + خطة آخر أسبوع.`,
        ...common,
      ],
      day30: [
        `الأسبوع 1: تمهيد + أساسيات + ضبط روتين مذاكرة.`,
        `الأسبوع 2: Grammar + تمارين كثيرة + تصحيح.`,
        `الأسبوع 3: Reading + مفردات + قطع متكررة.`,
        `الأسبوع 4: Listening + نماذج كاملة + مراجعات.`,
        ...common,
      ],
      day60: [
        `الشهر الأول: تأسيس قوي + تطبيق يومي.`,
        `الشهر الثاني: نماذج كاملة + مراجعة أخطاء + تثبيت السرعة.`,
        ...common,
      ],
      day90: [
        `الشهر 1: تأسيس + Grammar + مفردات.`,
        `الشهر 2: استثناءات + Reading مكثف.`,
        `الشهر 3: Listening + نماذج كاملة أسبوعيًا + مراجعات.`,
        ...common,
      ],
      notBooked: [
        `أول 7 أيام: جرعات تأسيس + تطبيق يومي + قياس تحسنك.`,
        `بعد 10–14 يوم: إذا صرت ثابت على روتين — احجز موعد مناسب.`,
        `إذا تبغى ترفع بسرعة: خذ مسار مكثف “حسب مستواك” بعد النتيجة.`,
        ...common,
      ],
    };

    return plans[planId] || plans.day7;
  }

  // ====== Course recommendation (مكثفة vs شاملة) ======
  function recommendCourses(session = {}, result = {}) {
    // مدخلات مقترحة من صفحة البيانات قبل الاختبار (بنحطها لاحقاً في test.html)
    // goalType: university | exemption | job | personal
    // priorCourses: none | ayed | hilm | other
    // painPoints: array e.g. ["old-models","no-organization","support","too-much-talk"]
    const goalType = safeText(session.goalType);
    const prior = safeText(session.priorCourses);

    let primary = "intensive";
    let why = "لأنك تحتاج دفعة مركزة وخطة واضحة مرتبطة بنتيجتك.";

    // إذا هدفه إعفاء/متطلبات جامعة أو يبي تأسيس أوسع
    if (goalType === "university" || goalType === "exemption") {
      primary = "comprehensive";
      why = "لأن هدفك مرتبط بمتطلبات (جامعة/إعفاء) وغالبًا تحتاج تأسيس وتوسّع أكثر من مجرد دفعة سريعة.";
    }

    // إذا سبق اشترك بدورات وواجه مشاكل تنظيم/نماذج قديمة — نعطيه خيارين واضحين
    if (prior && prior !== "none") {
      why =
        "واضح إنك جرّبت قبل… هنا الفكرة: مسار مختصر (مكثفة) أو تأسيس كامل (شاملة) — اختر اللي يناسب وقتك وهدفك.";
    }

    const weak = result.weakSection || "grammar";
    const weakAr = { grammar: "القواعد", reading: "القراءة", listening: "الاستماع" }[weak] || "القواعد";

    return {
      primary,
      why,
      weakAr,
      links: {
        intensive: window.AYED?.share?.LINKS?.intensiveCourseSite || "https://ayedacademy2026.github.io/ayed-step-academy2026/",
        comprehensive: window.AYED?.share?.LINKS?.comprehensiveCourseSite || "https://studentservices241445-rgb.github.io/Hilm-STEP-Academy/",
      },
    };
  }

  function renderCourseCards(rec) {
    return `
      <div class="card glass" style="padding:16px; margin-top:14px">
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; flex-wrap:wrap">
          <div>
            <div class="kicker"><span class="dot"></span>اقتراح ذكي بعد النتيجة</div>
            <h3 style="margin:6px 0 0">وش الأنسب لك الآن؟</h3>
            <p style="margin:8px 0 0; color:var(--muted); line-height:1.9">
              ${escapeHtml(rec.why)}<br>
              <b style="color:var(--text)">أضعف قسم عندك:</b> ${escapeHtml(rec.weakAr)} — فاختيارك لازم يدعم هذا القسم بقوة.
            </p>
          </div>
          <div class="pill">🔍 توصية حسب بياناتك</div>
        </div>

        <div class="sep"></div>

        <div class="grid-2">
          <div class="card glass" style="padding:14px">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px">
              <b>الدورة المكثفة</b>
              <span class="pill">الأكثر اختيارًا</span>
            </div>
            <p style="margin:10px 0 0; color:var(--muted); line-height:1.9">
              مناسبة إذا وقتك محدود وتبي “دفعة مركزة” + تدريب محاكي + تنظيم واضح.
            </p>
            <div class="sep"></div>
            <a class="btn primary" href="${escapeHtml(rec.links.intensive)}" target="_blank" rel="noopener">روح لموقع المكثفة</a>
          </div>

          <div class="card glass" style="padding:14px">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px">
              <b>الدورة الشاملة الحديثة</b>
              <span class="pill">تأسيس + توسّع</span>
            </div>
            <p style="margin:10px 0 0; color:var(--muted); line-height:1.9">
              مناسبة إذا هدفك متطلبات جامعة/إعفاء أو تبي تبني مستوى قوي على مهل وبعمق.
            </p>
            <div class="sep"></div>
            <a class="btn outline" href="${escapeHtml(rec.links.comprehensive)}" target="_blank" rel="noopener">روح لموقع الشاملة</a>
          </div>
        </div>

        <p class="hint" style="margin-top:12px">
          * النصيحة الذهبية: لا تختار بعاطفة… خل نتيجتك تقود قرارك ✅
        </p>
      </div>
    `;
  }

  // ====== Main render ======
  function render() {
    const result = getResult();
    if (!result) {
      elEmpty?.classList.remove("hidden");
      elResults?.classList.add("hidden");
      return;
    }

    const session = getSession();

    const name = safeText(result.name || session.name || "—");
    const total = Number(result.total || 50);
    const correct = Number(result.correct || 0);

    const sec = result.sections || {};
    const g = Number(sec.grammar ?? 0);
    const r = Number(sec.reading ?? 0);
    const l = Number(sec.listening ?? 0);

    const overall = total > 0 ? (correct / total) * 100 : 0;

    // ضعف القسم: الأقل نسبة
    const weakKey = result.weakSection || (() => {
      const arr = [
        { k: "grammar", v: g },
        { k: "reading", v: r },
        { k: "listening", v: l },
      ];
      arr.sort((a, b) => a.v - b.v);
      return arr[0].k;
    })();

    const level = levelFromPercent(overall);
    const rating = starsFromPercent(overall);

    elResults?.classList.remove("hidden");
    elEmpty?.classList.add("hidden");

    if (elName) elName.textContent = name;
    if (elOverallPercent) elOverallPercent.textContent = fmtPct(overall);
    if (elOverallLevel) elOverallLevel.textContent = level;
    if (elWeak) elWeak.textContent = sectionLabel(weakKey);

    // تحفيز + “تحاسب” لطيف
    const dua = "الله يفتح عليك… وصدقني: الالتزام اليومي يغيّر النتيجة بسرعة 💛";
    const accountability =
      overall >= 70
        ? "مستواك جميل… بس لا تتساهل. ثبّت روتينك وخلك ذكي في التصحيح."
        : "هنا يجي الفرق: لا تكمل بعشوائية. تبغى ترتفع؟ لازم تصحيح + تكرار لنفس نوع السؤال.";

    const models = (SD.exam?.modelsReference || ["49", "50", "51"]).join("، ");
    const note =
      `ملاحظة: الأسئلة محاكاة تدريبية مبنية على نمط النماذج الحديثة حتى ${models} ` +
      `عشان نطلع لك “خطة واقعية” تمشي عليها…`;

    if (elMotivation) {
      elMotivation.innerHTML = `
        <b>رسالة لك:</b><br>
        ${escapeHtml(accountability)}<br>
        ${escapeHtml(note)}<br>
        <span style="color:var(--text); font-weight:900">${escapeHtml(dua)}</span>
      `;
    }

    if (elStars) elStars.innerHTML = buildStarsSVG(rating);

    // تحليل الأقسام: نصائح قوية + “وش تسوي الآن؟”
    const tips = {
      grammar: {
        hint: "مشاكل القواعد غالبًا من القاعدة + التطبيق تحت وقت.",
        bullets: [
          "راجع قاعدة واحدة فقط ثم حل 20 سؤال عليها مباشرة.",
          "ركز على الأزمنة + If + Passive + Subject-Verb Agreement.",
          "اكتب الأخطاء المتكررة بورقة وحدة وراجعها يوميًا.",
        ],
      },
      reading: {
        hint: "القراءة تحتاج تقنية + إدارة وقت، مو قراءة بطيئة.",
        bullets: [
          "ابدأ بـ Skim ثم Scan للكلمات المفتاحية.",
          "حدد الفكرة العامة قبل التفاصيل.",
          "تمرن بالوقت: قطعة/أسئلة/تصحيح — يوميًا.",
        ],
      },
      listening: {
        hint: "الاستماع يتحسن بالتدريب العملي… مو بالنصائح فقط.",
        bullets: [
          "ركز على الفكرة العامة أول ثم التفاصيل.",
          "اكتب كلمات مفتاحية بسرعة (Keywords).",
          "كرر نفس النوع 3 مرات لين يصير تلقائي.",
        ],
      },
    };

    if (elGrammar) {
      elGrammar.innerHTML = buildSectionCard(
        "Grammar (القواعد)",
        g,
        tips.grammar.hint,
        tips.grammar.bullets
      );
    }
    if (elReading) {
      elReading.innerHTML = buildSectionCard(
        "Reading (القراءة)",
        r,
        tips.reading.hint,
        tips.reading.bullets
      );
    }
    if (elListening) {
      elListening.innerHTML = buildSectionCard(
        "Listening (الاستماع)",
        l,
        tips.listening.hint,
        tips.listening.bullets
      );
    }

    // خطة حسب الموعد
    const examWindow = safeText(session.examWindow || result.examWindow || "lt7d");
    const planMeta = planByWindow(examWindow);
    const planLines = buildPlanLines(planMeta.id, weakKey);

    // Render plan block (جميل + متجر/قالب)
    const planHtml = `
      <div class="card glass" style="padding:16px; margin-top:14px">
        <div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; flex-wrap:wrap">
          <div>
            <div class="kicker"><span class="dot"></span>خطة مذاكرة تظهر لك فورًا</div>
            <h3 style="margin:6px 0 0">${escapeHtml(planMeta.title)}</h3>
            <p style="margin:8px 0 0; color:var(--muted); line-height:1.9">
              هذه الخطة مبنية على نتيجتك + وقتك + أضعف قسم عندك.
              <br>التزم فيها… وبتلاحظ الفرق بإذن الله من أول أسبوع.
            </p>
          </div>
          <div class="pill">🗓️ ${escapeHtml(String(planMeta.days))} يوم</div>
        </div>

        <div class="sep"></div>

        <div class="card glass" style="padding:14px">
          <b>جدولك المختصر (جاهز للتطبيق)</b>
          <ul style="margin:10px 0 0; padding:0 18px; color:var(--muted); line-height:1.95">
            ${planLines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}
          </ul>
        </div>

        <div class="sep"></div>

        <div class="inline-actions">
          <button id="btnShare2" class="btn outline" type="button">مشاركة الخطة (نص مرتب)</button>
          <a class="btn primary" href="${escapeHtml(window.AYED?.share?.LINKS?.intensiveCourseSite || "https://ayedacademy2026.github.io/ayed-step-academy2026/")}" target="_blank" rel="noopener">
            روح لموقع الدورة المكثفة
          </a>
        </div>

        <p class="hint" style="margin-top:10px">
          *مشاركة الخطة = التزام + تحفيز لغيرك. كثير ناس بدأوا من مشاركة بسيطة.
        </p>
      </div>
    `;

    // توصية الدورات (مكثفة/شاملة)
    const rec = recommendCourses(session, { weakSection: weakKey });
    const cards = renderCourseCards(rec);

    if (elPlanHost) {
      elPlanHost.innerHTML = planHtml + cards;
    }

    // Share text (viral)
    function getShareText() {
      const share = window.AYED?.share;
      if (!share) {
        // fallback نص بسيط
        return `خطة مذاكرة من اختبار تحديد المستوى\nنتيجتي: ${fmtPct(overall)}\nجرّب الاختبار: ${location.href}`;
      }

      const text = share.buildShareText({
        name,
        percent: fmtPct(overall),
        level,
        weak: sectionLabel(weakKey),
        planTitle: planMeta.title,
        planLines: planLines.slice(0, 8), // نخليها مختصرة للمشاركة
      });

      return text;
    }

    async function doShare() {
      const share = window.AYED?.share;
      const txt = getShareText();

      if (share?.smartShare) {
        const res = await share.smartShare(txt, "خطة مذاكرة STEP");
        if (res.ok) {
          toast(res.mode === "native" ? "تمت المشاركة ✅" : "تم نسخ الخطة ✅ الصقها بأي مكان");
        } else {
          toast("ما قدرت أشارك… انسخها يدويًا من المتصفح.");
        }
      } else {
        try {
          await navigator.clipboard.writeText(txt);
          toast("تم نسخ الخطة ✅");
        } catch (_) {
          toast("النسخ غير متاح… جرّب من متصفح أحدث.");
        }
      }
    }

    btnShare?.addEventListener("click", doShare);

    // زر مشاركة داخل الخطة
    const btnShare2 = $("#btnShare2");
    btnShare2?.addEventListener("click", doShare);

    // زر "أكمل التسجيل" هنا = يوجّه لموقع المكثفة (بدون تيليجرام داخل هذا الموقع)
    btnRegister?.addEventListener("click", () => {
      const url = window.AYED?.share?.LINKS?.intensiveCourseSite || "https://ayedacademy2026.github.io/ayed-step-academy2026/";
      window.open(url, "_blank", "noopener");
    });
  }

  // ====== Boot ======
  document.addEventListener("DOMContentLoaded", render);
})();
