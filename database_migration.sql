-- ================================================================================
-- مرحلة توحيد المراحل الكشفية
-- تحديث جميع السجلات لتوحيد أسماء المراحل
-- ================================================================================

-- 1. تحديث جدول leaders (قادة الفرق)
-- تحويل أشبال وزهرات
UPDATE leaders SET troop = 'أشبال وزهرات' WHERE troop IN ('أشبال', 'زهرات');

-- تحويل مبتدئ ومرشدات
UPDATE leaders SET troop = 'مبتدئ ومرشدات' WHERE troop IN ('كشاف مبتدئ', 'مرشدات');

-- تحويل متقدم ورائدات
UPDATE leaders SET troop = 'متقدم ورائدات' WHERE troop IN ('كشاف متقدم', 'رائدات');

-- 2. تحديث جدول patrols (الفرق/الطليعات)
-- تحويل أشبال وزهرات
UPDATE patrols SET troop = 'أشبال وزهرات' WHERE troop IN ('أشبال', 'زهرات');

-- تحويل مبتدئ ومرشدات
UPDATE patrols SET troop = 'مبتدئ ومرشدات' WHERE troop IN ('كشاف مبتدئ', 'مرشدات');

-- تحويل متقدم ورائدات
UPDATE patrols SET troop = 'متقدم ورائدات' WHERE troop IN ('كشاف متقدم', 'رائدات');

-- 3. تحديث جدول patrol_requests (طلبات إضافة الفرق)
-- تحويل أشبال وزهرات
UPDATE patrol_requests SET troop = 'أشبال وزهرات' WHERE troop IN ('أشبال', 'زهرات');

-- تحويل مبتدئ ومرشدات
UPDATE patrol_requests SET troop = 'مبتدئ ومرشدات' WHERE troop IN ('كشاف مبتدئ', 'مرشدات');

-- تحويل متقدم ورائدات
UPDATE patrol_requests SET troop = 'متقدم ورائدات' WHERE troop IN ('كشاف متقدم', 'رائدات');

-- 4. تحديث جدول scouts (الكشافين) - إن وُجدت عمود troop
-- تحويل أشبال وزهرات
UPDATE scouts SET troop = 'أشبال وزهرات' WHERE troop IN ('أشبال', 'زهرات');

-- تحويل مبتدئ ومرشدات
UPDATE scouts SET troop = 'مبتدئ ومرشدات' WHERE troop IN ('كشاف مبتدئ', 'مرشدات');

-- تحويل متقدم ورائدات
UPDATE scouts SET troop = 'متقدم ورائدات' WHERE troop IN ('كشاف متقدم', 'رائدات');

-- التحقق من الخرائط المحدثة:
SELECT 'leaders' AS table_name, troop, COUNT(*) AS count FROM leaders WHERE troop IN ('أشبال وزهرات', 'مبتدئ ومرشدات', 'متقدم ورائدات', 'براعم') GROUP BY troop
UNION ALL
SELECT 'patrols', troop, COUNT(*) FROM patrols WHERE troop IN ('أشبال وزهرات', 'مبتدئ ومرشدات', 'متقدم ورائدات', 'براعم') GROUP BY troop
UNION ALL
SELECT 'patrol_requests', troop, COUNT(*) FROM patrol_requests WHERE troop IN ('أشبال وزهرات', 'مبتدئ ومرشدات', 'متقدم ورائدات', 'براعم') GROUP BY troop;
