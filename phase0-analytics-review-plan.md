# خطة المرحلة 0 — التحليلات الأساسية + طلب التقييم داخل التطبيق

**الفرع المستهدف:** `main` (الإصدار 1.0 أو أول تحديث 1.0.x) · **الجهد التقديري:** 6–9 ساعات إجمالًا

---

## البند 1: قمع التحليلات الأساسي

**الهدف:** قياس القمع: تنزيل ← إتمام التهيئة ← إنشاء أول روتين ← التفاعل مع إشعار ← العودة بالأسبوع الثاني.

### قرار مطلوب أولًا: أداة التحليلات

| الخيار | المزايا | العيوب |
|---|---|---|
| **Firebase Analytics** (المقترح) | مجاني، يعطيك الاحتفاظ D1/D7/D30 والقمع تلقائيًا، معيار السوق | يضيف جمع بيانات من Google — يجب تحديث سياسة الخصوصية ونموذج Data Safety في المتجر |
| بدون SDK (عدّادات محلية فقط) | يحافظ على وعد «لا تتبع» بالكامل | لا ترى شيئًا عن المستخدمين الفعليين — لا يحقق هدف البند |

**التوصية:** Firebase Analytics بإعدادات الحد الأدنى (تعطيل Advertising ID، تعطيل التخصيص الإعلاني). الصياغة الصادقة في سياسة الخصوصية: «إحصاءات استخدام مجهولة الهوية لتحسين التطبيق — بيانات مهامك لا تغادر جهازك أبدًا».

### الأحداث الخمسة

| # | الحدث | الاسم البرمجي | أين يُطلق |
|---|---|---|---|
| 1 | التنزيل / أول فتح | `first_open` (تلقائي من Firebase) | لا يحتاج كودًا |
| 2 | إتمام التهيئة | `onboarding_complete` | `onboarding.page.ts` عند إنهاء آخر شريحة |
| 3 | إنشاء أول روتين | `first_routine_created` | `task.service.ts` بعد أول إنشاء ناجح (مع علم `hasCreatedFirstTask` في التخزين حتى لا يتكرر) |
| 4 | التفاعل مع إشعار | `notification_action` | `notification.service.ts` في معالج نقر الإشعار (`localNotificationActionPerformed`) |
| 5 | العودة بالأسبوع الثاني | لا حدث مخصص — تقرير الاحتفاظ D7/D14 في Firebase يغطيها تلقائيًا | — |

### خطوات التنفيذ

1. أنشئ مشروع Firebase وأضف تطبيق أندرويد بمعرّف `io.alhessan.routineloop`، ونزّل `google-services.json` إلى `android/app/`.
2. ثبّت الإضافة: `npm i @capacitor-firebase/analytics firebase` ثم `npx cap sync android`.
3. انسخ `analytics.service.ts` الموجود في فرع `V2updates` إلى `main` (هيكله جاهز)، واستبدل جسم `logEvent()` باستدعاء `FirebaseAnalytics.logEvent()` مع إبقاء `console.log` في وضع التطوير.
4. أطلق الأحداث 2–4 من المواضع المذكورة في الجدول (سطر واحد لكل موضع + حقن الخدمة).
5. في `android/app/src/main/AndroidManifest.xml` أضف:
   `<meta-data android:name="google_analytics_adid_collection_enabled" android:value="false"/>`
6. حدّث `docs/privacy-policy.html` و`docs/privacy-policy.md` ونموذج **Data Safety** في Play Console.

### التحقق

- فعّل وضع DebugView في Firebase (`adb shell setprop debug.firebase.analytics.app io.alhessan.routineloop`) وتأكد من وصول الأحداث الأربعة أثناء تجربة كاملة: تهيئة ← إنشاء روتين ← نقر إشعار.

---

## البند 2: طلب التقييم داخل التطبيق (In-App Review)

**الهدف:** إظهار نافذة تقييم Google الرسمية بعد لحظة إيجابية = **إكمال الدورة الثالثة**.

### خطوات التنفيذ

1. ثبّت الإضافة: `npm i @capacitor-community/in-app-review` ثم `npx cap sync android`.
2. أنشئ خدمة صغيرة `review.service.ts`:
   - عدّاد `totalCyclesCompleted` محفوظ في التخزين المحلي (يزداد عند كل إكمال دورة).
   - علم `reviewRequested` حتى لا يُطلب أكثر من مرة.
   - عند بلوغ العدّاد 3 والعلم غير مفعّل ← `InAppReview.requestReview()` ثم فعّل العلم.
3. اربط الاستدعاء في موضع إكمال الدورة داخل `task-cycle.service.ts` (أو معالج زر الإكمال في صفحة المهمة).
4. أطلق أيضًا حدث تحليلات `review_prompt_shown` في نفس اللحظة (يربط البندين ويقيس التوقيت).

### قيود يجب معرفتها

- **Google لا تضمن ظهور النافذة** — لديها حصة (quota) داخلية، والاستدعاء قد يمرّ بصمت. لذلك لا تعرض أي رسالة «قيّمنا!» خاصة بك قبل الاستدعاء؛ اتركه صامتًا.
- النافذة لا تظهر غالبًا في نسخ Debug — اختبرها عبر **Internal Testing track** على Play.
- لا تكرر الطلب في كل دورة: مرة عند الدورة الثالثة، ويمكن لاحقًا (اختياريًا) مرة ثانية بعد الدورة العشرين لمن لم يقيّم.

### التحقق

- بناء Internal Testing ← أكمل 3 دورات ← تظهر نافذة التقييم ← أعد فتح التطبيق وأكمل دورة رابعة ← لا تظهر مجددًا.

---

## قائمة الإنجاز المختصرة

- [ ] مشروع Firebase + `google-services.json`
- [ ] تثبيت `@capacitor-firebase/analytics` وتفعيل `analytics.service.ts`
- [ ] الأحداث: `onboarding_complete` · `first_routine_created` · `notification_action`
- [ ] تعطيل Advertising ID في الـ Manifest
- [ ] تحديث سياسة الخصوصية + Data Safety
- [ ] تثبيت `@capacitor-community/in-app-review` + `review.service.ts`
- [ ] ربط الطلب بإكمال الدورة الثالثة + حدث `review_prompt_shown`
- [ ] اختبار كامل عبر DebugView وInternal Testing
