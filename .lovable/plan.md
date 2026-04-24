## التشخيص

من خلال فحص `src/components/Pager.tsx` و `src/components/Navbar.tsx` تبيّن أن سبب المشاكل التي ذكرتها هو **معماري** وليس مجرد ضبط Animation:

1. **الصفحتان متداخلتان والتمرير يطلع لتحت في صفحة التعليقات**: المسار الحالي يضع الصفحتين جنباً إلى جنب في track عرضه `200vw` داخل تدفق المستند العادي، فيستخدمان نفس `window.scrollY`. ولأن `HomePage` طويلة جداً، فإن `document.body` يصبح طويلاً دائماً — حتى عندما تكون "على Comments" يمكنك التمرير لأسفل ضمن مساحة Home، فترى محتواها يظهر.
2. **لا يوجد إحساس بالسلاسة**: spring بـ stiffness 340 + scale + blur + counter-parallax + perspective 1600px = حمل GPU كبير وحركة مبالغ بها لا تشبه WhatsApp أبداً.
3. **الرأس (Navbar) لا يعكس التبويب النشط بصرياً**: الرابط النشط مجرد لون مختلف — لا يوجد مؤشر منزلق (pill indicator) يربط التبويبين.

## الخطة المقترحة (تنفيذها يحتاج وضع التعديل)

### 1) عزل التمرير لكل صفحة (حل المشكلة الجذرية)
- تحويل الـ Pager إلى **مرحلة ثابتة** بارتفاع `100dvh` و `overflow: hidden`، لا تشارك في تمرير المستند.
- كل صفحة تصبح حاوية مستقلة `h-[100dvh] overflow-y-auto overscroll-contain` مع تمريرها الخاص.
- نتيجة: تمرير صفحة التعليقات لن يكشف Home أبداً، ولن يحدث "تداخل" بصري.
- إدارة ذاكرة التمرير ستنتقل من `window.scrollY` إلى `scrollTop` لكل حاوية (مرجع لكل صفحة).
- تعديل `Navbar` لتعتمد scrolled-state على scroll الحاوية النشطة بدل `window` (عبر CustomEvent خفيف من الـ Pager).

### 2) حركة WhatsApp نقية: Slide + Fade فقط
إزالة كل ما يضيف ضوضاء بصرية:
- ❌ حذف `scale`, `blur`, `counter-parallax`, `perspective`, `transformOrigin`, `backfaceVisibility`.
- ✅ الإبقاء على `translate3d` للـ track فقط (GPU خالص).
- ✅ إضافة **fade خفيف** للصفحة الخارجة (opacity من 1 إلى 0.6) ليطابق إحساس WhatsApp بدون مبالغة.
- ✅ Easing احترافي بدل spring: `cubic-bezier(0.32, 0.72, 0, 1)` — وهو نفس منحنى iOS / WhatsApp tab — مدة `260ms` للنقر و `220ms` لإكمال السحب.
- ✅ إزالة rubber-band المبالغ به (0.12) وتقليله إلى مقاومة بسيطة عند الحواف.

### 3) ضبط فيزياء اللمس (سلسة لكن حازمة)
- threshold الإلتقاط الأفقي: `8px` للاستجابة السريعة.
- نسبة `|dx| > |dy| * 1.2` لتمييز السحب الأفقي عن العمودي.
- commit fraction: `0.18` من العرض (حواف أصغر = استجابة أسرع كـ WhatsApp).
- flick velocity: `0.35 px/ms` — أي flick خفيف يكمل التحويل.
- إلغاء haptic `vibrate` (يسبب توتر بصري على بعض الأجهزة).

### 4) مؤشر التبويب المنزلق في الـ Navbar
- إضافة مجموعة Tabs نظيفة داخل Navbar تحتوي زرّي **Portfolio** و **Comments**.
- pill indicator (طبقة `absolute` خلفية) ينزلق بين الزرّين عبر `framer-motion`'s `layoutId` — حركة مرتبطة بنفس easing curve.
- المؤشر يتحرك **فوراً** عند بدء السحب (متابعة قيمة `idxMV` نفسها) بدل انتظار الاستقرار → إحساس tabs حي ومتزامن.
- النقر على التبويب يستدعي نفس animation engine (لا navigation فعلي) → نفس النعومة بالضبط في كل مكان.

### 5) تنظيف وأداء
- إزالة الـ `AnimatePresence` غير المستخدم والـ Link المخفي.
- إزالة الأزرار الجانبية على الديسكتوب وعلامة الحافة على الموبايل (التبويبات الجديدة في الـ Navbar تغني عنها وتعطي إحساساً أنظف).
- إبقاء التحديث الصامت للـ URL عبر `history.replaceState` + `navigate({replace:true, resetScroll:false})` — لا remount.
- إبقاء الكيبورد (Arrow keys) مع نفس engine الجديد.
- إضافة `prefers-reduced-motion`: حركة فورية بدون animation.

### 6) الملفات المتأثرة
- **`src/components/Pager.tsx`**: إعادة كتابة كاملة — حاويات تمرير مستقلة، track ثابت ارتفاعه `100dvh`، tween بدل spring، إزالة depth effects، تصدير hook صغير `usePagerIndex()` لمشاركة `idxMV` مع Navbar.
- **`src/components/Navbar.tsx`**: استبدال رابط Comments برابطين كـ Tabs مع pill indicator يتحرك مع `idxMV`.
- **`src/components/HomePage.tsx`** و **`src/components/CommentsPage.tsx`**: لا تعديل بنيوي، فقط التأكد من أن `min-h-screen` يعمل ضمن حاوية ذات تمرير داخلي (تغيير `min-h-screen` إلى `min-h-full` إذا لزم).
- **`src/components/CommentsPage.tsx`**: تصحيح parallax blobs لتستخدم scroll الحاوية بدلاً من `window.scrollY`.

## النتيجة المتوقعة
- التبويبتان تحسّان كأنهما جزء من تطبيق واحد، بانتقال **260ms** ناعم بمنحنى iOS.
- تمرير تماماً معزول لكل صفحة — لا تداخل، لا "كشف" للصفحة الأخرى.
- مؤشر pill ينساب بين Portfolio و Comments في الـ Navbar فوراً مع السحب.
- لا scale/blur/overshoot — هدوء بصري احترافي مطابق لتجربة WhatsApp tabs.
- 60fps ثابتة على الموبايل (translate3d فقط على عنصر واحد).

هل توافق على تنفيذ هذه الخطة؟