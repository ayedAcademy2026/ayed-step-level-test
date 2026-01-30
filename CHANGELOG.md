# CHANGELOG — v3 (2026-01-30)

- إضافة Root Wrappers/Redirects: صفحات الجذر تعيد التوجيه إلى `/pages/*` (متوافق مع GitHub Pages داخل repo subpath).
- إضافة ملفات PWA في الجذر: `manifest.json` + `sw.js` + `.nojekyll`.
- تحديث SW caching: كاش بسيط للصفحات/الـ assets/البيانات + fallback للـ 404 عند انقطاع الشبكة.
- ضبط `data-page` في كل صفحات `/pages` لإيقاف Popups داخل صفحة الاختبار (quiz) ثم العودة بعد النتائج.
- تحسين تنظيم التغليف: فصل التسليم إلى ZIP للـ assets+data و ZIP للـ pages+root.
- اعتماد قيود الخصوصية: التقييمات لا تُعرض إلا إذا `approved=true` و `consent=true` (افتراضيًا قائمة التقييمات تبدأ فارغة).
- تحديث `data/notifications.json`: فصل القوائم (tips / anonymous_activity / approved_quotes) مع إبقاء approved_quotes فارغة افتراضيًا.
- تحديث `data/success-stories.json`: حالات طويلة بدون بيانات شخصية (مقبولة للنشر) + gating ثابت.
- إضافة أيقونة PWA 192px مشتقة من حزمة brand.
- تدقيق المسارات: لا روابط مطلقة `/` داخل صفحات `/pages`، وكل مراجع CSS/JS/JSON موجودة.
- تحديث ربط GitHub Issues: Issue Template موجود داخل `.github/ISSUE_TEMPLATE`.
- اختبار فحص تلقائي للملفات المشار إليها داخل HTML (بدون مفقودات).
