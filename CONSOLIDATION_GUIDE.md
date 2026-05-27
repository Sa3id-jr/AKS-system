# تعليمات توحيد المراحل الكشفية

## الخطوات المنفذة ✅

تم توحيد جميع أسماء المراحل الكشفية في المشروع:

### 1. التحديثات في الكود (مكتملة):
- ✅ `app.js` - دوال التحويل والخرائط
- ✅ `home.html` - لوحة التحكم الرئيسية
- ✅ `dashboard.html` - أزرار الفلترة
- ✅ `add-patrol.html` - قوائم الفرق
- ✅ `index.html` - قوائم التسجيل
- ✅ `leader_requests.html` - قائمة الفرق
- ✅ `fast_attendance.html` - خريطة التحويل
- ✅ `sector_requests.html` - الفلترة حسب القطاع

### 2. التحويلات المطبقة:
- `'أشبال'` و `'زهرات'` → `'أشبال وزهرات'`
- `'كشاف مبتدئ'` و `'مرشدات'` → `'مبتدئ ومرشدات'`
- `'كشاف متقدم'` و `'رائدات'` → `'متقدم ورائدات'`

### 3. دالة التطبيع (normalization):
تمت إضافة دالة `normalizeScoutGroup()` في `app.js` لتحويل الأسماء المنفصلة من قاعدة البيانات إلى الموحدة.

---

## الخطوة التالية: تحديث قاعدة البيانات

### ⚠️ مهم: تحديث البيانات المخزنة

البيانات الموجودة حالياً في قاعدة البيانات قد تحتوي على الأسماء المنفصلة. يجب تحديثها لتتطابق مع الأسماء الموحدة.

#### الخيار 1: استخدام Supabase Studio (الأسهل)

1. افتح [Supabase Dashboard](https://app.supabase.com)
2. اذهب إلى **SQL Editor** من القائمة اليسرى
3. أنشئ query جديد (New query)
4. انسخ والصق الكود من ملف `database_migration.sql`
5. اضغط **Run** (الزر الأسود)

#### الخيار 2: استخدام command line

إذا كان لديك `psql` مثبت:

```bash
psql -h xbdprjxvtwfieiqncbez.db.supabase.co -U postgres -d postgres -f database_migration.sql
```

يسألك للـ password - استخدم كلمة المرور الخاصة بـ Supabase

---

## SQL Queries المطبقة

الأوامر ستحدث هذه الجداول:

### 1. جدول `leaders` (قادة الفرق)
```sql
UPDATE leaders SET troop = 'أشبال وزهرات' WHERE troop IN ('أشبال', 'زهرات');
UPDATE leaders SET troop = 'مبتدئ ومرشدات' WHERE troop IN ('كشاف مبتدئ', 'مرشدات');
UPDATE leaders SET troop = 'متقدم ورائدات' WHERE troop IN ('كشاف متقدم', 'رائدات');
```

### 2. جدول `patrols` (الفرق/الطليعات)
```sql
UPDATE patrols SET troop = 'أشبال وزهرات' WHERE troop IN ('أشبال', 'زهرات');
UPDATE patrols SET troop = 'مبتدئ ومرشدات' WHERE troop IN ('كشاف مبتدئ', 'مرشدات');
UPDATE patrols SET troop = 'متقدم ورائدات' WHERE troop IN ('كشاف متقدم', 'رائدات');
```

### 3. جدول `patrol_requests` (طلبات الفرق)
```sql
UPDATE patrol_requests SET troop = 'أشبال وزهرات' WHERE troop IN ('أشبال', 'زهرات');
UPDATE patrol_requests SET troop = 'مبتدئ ومرشدات' WHERE troop IN ('كشاف مبتدئ', 'مرشدات');
UPDATE patrol_requests SET troop = 'متقدم ورائدات' WHERE troop IN ('كشاف متقدم', 'رائدات');
```

### 4. جدول `scouts` (إن وُجدت عمود troop)
```sql
UPDATE scouts SET troop = 'أشبال وزهرات' WHERE troop IN ('أشبال', 'زهرات');
UPDATE scouts SET troop = 'مبتدئ ومرشدات' WHERE troop IN ('كشاف مبتدئ', 'مرشدات');
UPDATE scouts SET troop = 'متقدم ورائدات' WHERE troop IN ('كشاف متقدم', 'رائدات');
```

---

## التحقق من النتائج

بعد تشغيل الـ migration، يمكنك التحقق:

```sql
-- عرض جميع الفرق الموحدة
SELECT DISTINCT troop FROM leaders WHERE troop IN ('أشبال وزهرات', 'مبتدئ ومرشدات', 'متقدم ورائدات', 'براعم');

-- عدد السجلات لكل فرقة
SELECT troop, COUNT(*) as count FROM leaders GROUP BY troop;
```

---

## نصائح مهمة

1. **النسخ الاحتياطي**: تأكد من عمل نسخة احتياطية قبل تشغيل الـ UPDATE
2. **الاختبار**: جرب تحديث جدول واحد أولاً (مثل `leaders`) ثم باقي الجداول
3. **التحقق**: بعد كل تحديث، تحقق من الجدول للتأكد من نجاح العملية

---

## الخطوات التالية

بعد تحديث قاعدة البيانات:
1. ✅ إعادة تحميل التطبيق (F5)
2. ✅ اختبار الفلترة حسب المرحلة
3. ✅ التحقق من إضافة فرقة جديدة
4. ✅ اختبار طلبات الفرق الجديدة

---

## الملفات المعدلة

- `app.js` - دالة `normalizeScoutGroup()` و `getScoutStage()`
- `home.html` - خريطة `troopToSector` و `troopMap`
- `dashboard.html` - أزرار الفلترة
- `add-patrol.html` - قائمة الفرق
- `index.html` - قائمة التسجيل
- `leader_requests.html` - قائمة الفرق
- `fast_attendance.html` - خريطة التحويل
- `sector_requests.html` - الفلترة
- `database_migration.sql` - ملف الـ migration

