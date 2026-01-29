// assets/app.js
// Core UI (Drawer + Soft Nav + Watermark + Toasts + Assistant + Install Banner + SW)
// نسخة “موقع اختبار تحديد المستوى” (بدون تيليجرام داخل الموقع)

(function () {
  "use strict";

  const SD = window.SITE_DATA || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // روابط خارجية (للتوجيه بعد النتائج فقط)
  const LINKS = {
    levelTestSite: (SD.links && SD.links.levelTestSite) || (location.origin + location.pathname.replace(/\/[^/]*$/, "/")),
    intensiveCourseSite: (SD.links && SD.links.intensiveCourseSite) || "https://ayedacademy2026.github.io/ayed-step-academy2026/",
    comprehensiveCourseSite: (SD.links && SD.links.comprehensiveCourseSite) || "https://studentservices241445-rgb.github.io/Hilm-STEP-Academy/",
  };

  function safeText(v) {
    return (v ?? "").toString();
  }

  function escapeHtml(str) {
    return safeText(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ============== Watermark ==============
  function setWatermark() {
    const wm = SD.brand?.watermarkText || SD.brand?.academyName || "أكاديمية عايد";
    document.body.setAttribute("data-watermark", wm);
  }

  // ============== Active Nav ==============
  function setActiveNav() {
    const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    $$(".nav a, .drawer nav a").forEach((a) => {
      const href = (a.getAttribute("href") || "").toLowerCase();
      if (!href) return;
      if (href === path) a.classList.add("active");
    });
  }

  // ============== Soft Navigation ==============
  function setupSoftNav() {
    if (!SD.ui?.enableSoftNav) return;

    document.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;

      const href = a.getAttribute("href") || "";
      if (!href) return;

      // external
      if (href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      // anchors
      if (href.startsWith("#")) return;
      // modifier keys
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // Only html internal pages
      if (!href.endsWith(".html") && !href.includes(".html#")) return;

      const current = (location.pathname.split("/").pop() || "index.html");
      if (href.split("#")[0] === current) return;

      e.preventDefault();
      const go = () => (window.location.href = href);

      if (document.startViewTransition) {
        try {
          document.startViewTransition(() => go());
        } catch (_) {
          go();
        }
      } else {
        document.documentElement.style.opacity = "0.985";
        setTimeout(go, 60);
      }
    });
  }

  // ============== Drawer ==============
  function setupDrawer() {
    const btn = $("[data-open-drawer]");
    const closeBtn = $("[data-close-drawer]");
    const backdrop = $(".drawer-backdrop");
    const drawer = $(".drawer");

    const open = () => {
      backdrop?.classList.add("open");
      drawer?.classList.add("open");
      document.body.style.overflow = "hidden";
    };
    const close = () => {
      backdrop?.classList.remove("open");
      drawer?.classList.remove("open");
      document.body.style.overflow = "";
    };

    btn?.addEventListener("click", open);
    closeBtn?.addEventListener("click", close);
    backdrop?.addEventListener("click", close);
    $$(".drawer a").forEach((a) => a.addEventListener("click", close));
  }

  // ============== Toasts (Social proof) ==============
  function createToast(text) {
    const host = $(".toast-container");
    if (!host) return;

    const wrap = document.createElement("div");
    wrap.className = "toast";
    wrap.innerHTML = `
      <div class="bubble" aria-hidden="true">⭐</div>
      <div>
        <p>${escapeHtml(text)}</p>
        <small>قبل لحظات</small>
      </div>
    `;
    host.appendChild(wrap);

    setTimeout(() => {
      wrap.style.opacity = "0";
      wrap.style.transform = "translateY(6px)";
    }, 5200);

    setTimeout(() => wrap.remove(), 6100);
  }

  function setupToasts() {
    if (!SD.ui?.enableToasts) return;
    const list = window.NOTIFICATIONS_TEXT || [];
    if (!Array.isArray(list) || list.length === 0) return;

    // إجبار “حد أدنى” 30 ثانية (حسب طلبك)
    const configured = Number(SD.ui?.toastsIntervalMs || 30000);
    const interval = Math.max(30000, isFinite(configured) ? configured : 30000);

    let timer = null;

    const tick = () => {
      const item = list[Math.floor(Math.random() * list.length)];
      if (item) createToast(item);
      timer = setTimeout(tick, interval);
    };

    // تأخير البداية عشان ما يزعج أول دخول
    setTimeout(tick, 6000);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (timer) clearTimeout(timer);
        timer = null;
      } else {
        if (!timer) setTimeout(tick, 2500);
      }
    });
  }

  // ============== Share helpers (used by results.js) ==============
  async function copyToClipboard(text) {
    const t = safeText(text);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(t);
        return true;
      }
    } catch (_) {}

    // Fallback
    try {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch (_) {
      return false;
    }
  }

  async function smartShare(text, title = "") {
    const payload = { text: safeText(text) };
    if (title) payload.title = safeText(title);

    if (navigator.share) {
      try {
        await navigator.share(payload);
        return { ok: true, mode: "native" };
      } catch (_) {
        // user cancelled or blocked — fallback to copy
      }
    }
    const ok = await copyToClipboard(payload.text);
    return { ok, mode: "copy" };
  }

  function buildShareText(data = {}) {
    const name = safeText(data.name || "طالب STEP");
    const percent = safeText(data.percent || "");
    const level = safeText(data.level || "");
    const weak = safeText(data.weak || "");
    const planTitle = safeText(data.planTitle || "خطة مذاكرة مخصصة");
    const planLines = Array.isArray(data.planLines) ? data.planLines : [];

    const models = (SD.exam?.modelsReference || ["49", "50", "51"]).join("، ");
    const academy = SD.brand?.academyName || "أكاديمية عايد";

    // نص مشاركة “مقنع + تسويقي”
    return [
      `✨ ${name} — طلّعت خطتي من اختبار تحديد المستوى`,
      percent ? `📊 النتيجة: ${percent}` : `📊 النتيجة: (حسب الاختبار)`,
      level ? `🧠 المستوى التقريبي: ${level}` : "",
      weak ? `🎯 أضعف قسم عندي: ${weak}` : "",
      "",
      `✅ ${planTitle}`,
      ...planLines.map((l) => `• ${safeText(l)}`),
      "",
      `🔥 ملاحظة: الأسئلة محاكاة تدريبية “على نمط النماذج الحديثة” حتى نموذج ${models} — الهدف تشخيص + خطة (مو حفظ عشوائي).`,
      "",
      `🎯 جرّب الاختبار وخذ خطتك الآن:`,
      `${LINKS.levelTestSite || "افتح موقع اختبار تحديد المستوى"}`,
      "",
      `📌 إذا تبي تمشي بخطة منظمة ومحتوى مرتب (مكثفة):`,
      `${LINKS.intensiveCourseSite}`,
      "",
      `📌 وإذا هدفك تأسيس وتوسع أكثر (الشاملة):`,
      `${LINKS.comprehensiveCourseSite}`,
      "",
      `🤍 الله يوفقك… والالتزام اليومي 15 دقيقة يفرق أكثر مما تتوقع.`,
      `— ${academy}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  // expose helpers
  window.AYED = window.AYED || {};
  window.AYED.share = {
    buildShareText,
    copyToClipboard,
    smartShare,
    LINKS,
  };

  // ============== Assistant (Canned + guiding inside the site) ==============
  function setupAssistant() {
    const fab = $(".assistant-fab");
    const panel = $(".assistant-panel");
    const close = $("[data-close-assistant]");
    const chat = $(".chat");
    const input = $("#assistantInput");
    const send = $("#assistantSend");

    if (!fab || !panel) return;

    const push = (text, who = "bot") => {
      if (!chat) return;
      const b = document.createElement("div");
      b.className = "bubble" + (who === "me" ? " me" : "");
      b.innerHTML = escapeHtml(text).replace(/\n/g, "<br>");
      chat.appendChild(b);
      chat.scrollTop = chat.scrollHeight;
    };

    const open = () => {
      panel.classList.add("open");
      if (chat && chat.children.length === 0) {
        const academy = SD.brand?.academyName || "أكاديمية عايد";
        const models = (SD.exam?.modelsReference || ["49", "50", "51"]).join("، ");
        push(
          `هلا وغلا 👋\nأنا مساعدك داخل موقع اختبار تحديد المستوى.\nالاختبار 50 سؤال (Grammar/Reading/Listening) ومحاكاة مبنية على نمط النماذج الحديثة حتى ${models}.\nبعد النتيجة تطلع لك خطة + زر مشاركة + توجيه للدورة المناسبة.`
        );
        push(`تبغاني أوجهك؟ اكتب: موعد اختبارك + هدفك + أضعف قسم تحسّه عندك.`);
      }
    };
    const shut = () => panel.classList.remove("open");

    fab.addEventListener("click", () => (panel.classList.contains("open") ? shut() : open()));
    close?.addEventListener("click", shut);

    const quick = $$(".chip[data-q]", panel);
    quick.forEach((btn) => {
      btn.addEventListener("click", () => handleQuestion(btn.getAttribute("data-q") || ""));
    });

    function handleQuestion(q) {
      const qq = safeText(q).trim();
      const low = qq.toLowerCase();
      if (!qq) return;

      push(qq, "me");

      const models = (SD.exam?.modelsReference || ["49", "50", "51"]).join("، ");
      let answer = "";

      if (low.includes("كم سؤال") || low.includes("اختبار") || low.includes("تحديد")) {
        answer =
          `اختبار تحديد المستوى = 50 سؤال.\n` +
          `الأقسام: Grammar / Reading / Listening.\n` +
          `الأسئلة محاكاة تدريبية “على نمط النماذج الحديثة” حتى ${models}.\n` +
          `بعد ما تخلص: تطلع لك نتيجة + أضعف قسم + خطة مناسبة لوقت اختبارك.`;
      } else if (low.includes("مشاركة") || low.includes("شارك")) {
        answer =
          `مشاركة الخطة تساعدك تلتزم + تساعد غيرك يبدأ صح ✅\n` +
          `بعد ظهور النتيجة اضغط “مشاركة الخطة” — بيطلع لك نص مرتب جاهز للإرسال.\n` +
          `ملاحظة: مشاركة الخطة ما تطلع بياناتك الحساسة، فقط مسار مذاكرة ونصائح.`;
      } else if (low.includes("الدورة") || low.includes("مكثفة") || low.includes("شاملة")) {
        answer =
          `إذا تبي تكمل بخطة منظمة ومحتوى مرتب:\n` +
          `• المكثفة (للي يبي دفعة قوية): ${LINKS.intensiveCourseSite}\n` +
          `• الشاملة (للتأسيس والتوسع): ${LINKS.comprehensiveCourseSite}\n` +
          `نصيحة: لا تختار عشوائي — خل نتيجتك هي اللي تقرر لك.`;
      } else if (low.includes("وش اسوي") || low.includes("ابدأ") || low.includes("خطوات")) {
        answer =
          `خطواتك ببساطة:\n` +
          `1) جاوب 50 سؤال بهدوء.\n` +
          `2) اقرأ التحليل وخذ الخطة.\n` +
          `3) شارك الخطة (عشان تلزم نفسك).\n` +
          `4) لو تبي تدريب ومحتوى منظم — ادخل موقع الدورة المناسب لك من زر “التسجيل/الدورات” بعد النتيجة.`;
      } else if (low.includes("نصب") || low.includes("احتيال") || low.includes("خايف")) {
        answer =
          `وعيّك مهم 🛡️\n` +
          `لا ترسل بياناتك لأي جهة غير واضحة، وخل تعاملك عبر المواقع الرسمية فقط.\n` +
          `إذا واجهت محاولة احتيال: وثّق الأدلة وقدّم بلاغ عبر القنوات الرسمية في المملكة.`;
      } else {
        answer =
          `تمام ✅\n` +
          `عطني 3 أشياء: (موعد اختبارك؟ هدفك كم؟ أضعف قسم تحسّه؟)\n` +
          `وأوجهك لمسار مناسب + وش تركز عليه أول أسبوع.`;
      }

      setTimeout(() => push(answer, "bot"), 280);
    }

    function handleFreeText() {
      const v = safeText(input?.value).trim();
      if (!v) return;
      if (input) input.value = "";
      handleQuestion(v);
    }

    send?.addEventListener("click", handleFreeText);
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleFreeText();
    });
  }

  // ============== Install Banner (PWA prompt) ==============
  function setupInstallBanner() {
    if (!SD.ui?.enableInstallBanner) return;

    const banner = $(".install-banner");
    const btn = $("#installBtn");
    const close = $("#installClose");

    if (!banner) return;

    let deferredPrompt = null;

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      banner.classList.add("show");
    });

    btn?.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch (_) {}
      deferredPrompt = null;
      banner.classList.remove("show");
    });

    close?.addEventListener("click", () => banner.classList.remove("show"));

    // iOS (no prompt) — hint once
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone;

    if (isIOS && !isStandalone) {
      const key = "ayed_install_ios_hint_v2";
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, "1");
        setTimeout(() => {
          banner.classList.add("show");
          const p = banner.querySelector(".txt .t p");
          if (p) {
            p.textContent = "على iPhone: افتح مشاركة Safari ثم اختر “Add to Home Screen” لتثبيت الموقع كتطبيق.";
          }
          if (btn) btn.classList.add("hidden");
        }, 1700);
      }
    }
  }

  // ============== SW register ==============
  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  // ============== Boot ==============
  document.addEventListener("DOMContentLoaded", () => {
    setWatermark();
    setActiveNav();
    setupSoftNav();
    setupDrawer();
    setupToasts();
    setupAssistant();
    setupInstallBanner();
    registerSW();
  });
})();
