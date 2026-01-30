# Ayed STEP Level Test (v3)

موقع مستقل لاختبار تحديد المستوى + خطة مذاكرة + نظام تقييمات (Submit Review عبر GitHub Issues) — جاهز للنشر على GitHub Pages.

## رفع الملفات على GitHub (سريع)
1) افتح مستودعك: `ayedAcademy2026/ayed-step-level-test`
2) ارفع/استبدل المجلدات في جذر المستودع:
   - `assets/`
   - `data/`
   - `pages/`
3) تأكد وجود ملفات الجذر:
   - `index.html`, `quiz.html`, `results.html`, `reviews.html`, `review-status.html`, `support.html`, `faq.html`, `404.html`
   - `manifest.json`, `sw.js`, `.nojekyll`
4) فعل GitHub Pages:
   - Settings → Pages → Source: `Deploy from a branch`
   - Branch: `main` / Folder: `/ (root)`

## اختبار سريع (5 نقاط)
1) افتح: `/index.html` وتأكد التحويل تلقائيًا إلى `/pages/index.html`
2) افتح: `/quiz.html` وابدأ الاختبار — تأكد أن الإشعارات المنبثقة **تتوقف** أثناء الاختبار
3) بعد إنهاء الاختبار: تأكد ظهور النتائج + الخطة + زر مشاركة الخطة
4) افتح صفحة التقييمات: `/reviews.html` → اضغط “شارك تقييمك” → أرسل → تأكد يظهر Review ID وزر فتح GitHub Issue
5) افتح: `/review-status.html?id=...` → تظهر حالة الطلب (Pending) + زر نسخ رقم الطلب

## اعتماد التقييمات (Workflow)
- كل تقييم جديد يفتح GitHub Issue (Review Submission) تلقائيًا.
- بعد المراجعة:
  1) انسخ البيانات المعتمدة إلى `data/reviews.json`
  2) **لا يظهر** في الواجهة إلا إذا: `approved=true` و `consent=true`

## تعديل التوقيت/الخصائص
- `data/config.json`:
  - `popups.intervalMs` (45 ثانية افتراضيًا) + `jitterMs`
  - إعدادات GitHub Issues (`github.owner/repo`)
