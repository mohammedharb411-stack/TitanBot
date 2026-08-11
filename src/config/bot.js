import { logger } from '../utils/logger.js';

export const botConfig = {
  // =========================
  // حالة البوت (ما يراه المستخدمون تحت اسم البوت)
  // =========================
  // خيارات `status`:
  // - "online"    = نقطة خضراء
  // - "idle"      = هلال أصفر
  // - "dnd"       = أحمر عدم الإزعاج
  // - "invisible" = يظهر غير متصل
  presence: {
    // الحالة الحالية المعروضة على ديسكورد.
    status: "dnd",

    // سطور النشاط المعروضة تحت اسم البوت.
    // رقم `type` من ديسكورد:
    // 0 = يلعب
    // 1 = يبث
    // 2 = يستمع
    // 3 = يشاهد
    // 4 = مخصص
    // 5 = يتنافس
    activities: [
      {
        name: "Custom Status", // مطلوب من Discord API، لا يُعرض في العميل
        state: "أراقبك",     // هذا ما يراه الناس فعلياً
        type: 0,               // مخصص
      },
    ],
  },

  // =========================
  // سلوك الأوامر
  // =========================
  commands: {
    // معرفات مالكي البوت (مفصولة بفواصل في متغير البيئة OWNER_IDS).
    // يمكن للمالكين الوصول إلى أوامر البوت الخاصة بالمالك/المسؤول.
    owners: process.env.OWNER_IDS?.split(",").map((id) => id.trim()).filter(Boolean) || [],

    // وقت الانتظار الافتراضي بين استخدام الأوامر (بالثواني).
    defaultCooldown: 3,

    // إذا كان true، تُحذف الأوامر القديمة قبل إعادة التسجيل.
    deleteCommands: false,

    // معرف سيرفر اختياري محتفظ به لتوافق البرنامج التعليمي؛ لا يُستخدم لتسجيل الأوامر.
    testGuildId: process.env.TEST_GUILD_ID,

    // عندما يكون true (أو MAINTENANCE_MODE=true)، يمكن لمالكي البوت فقط تشغيل الأوامر.
    maintenanceMode: process.env.MAINTENANCE_MODE === "true",

    // بادئة الأمر للأوامر النصية (مثلاً "!" لأمر "!ping").
    // يدعم أوامر الشرطة المائلة (Slash) والأوامر النصية.
    prefix: process.env.PREFIX || "!",
  },

  // =========================
  // نظام الطلبات
  // =========================
  applications: {
    // الأسئلة الافتراضية المعروضة عندما يملأ شخص ما طلب الانضمام.
    defaultQuestions: [
      { question: "ما اسمك؟", required: true },
      { question: "كم عمرك؟", required: true },
      { question: "لماذا تريد الانضمام؟", required: true },
    ],

    // ألوان الـ Embed حسب حالة الطلب.
    statusColors: {
      pending: "#FFA500",
      approved: "#00FF00",
      denied: "#FF0000",
    },

    // مدة الانتظار قبل أن يتمكن المستخدم من إرسال طلب آخر (بالساعات).
    applicationCooldown: 24,

    // حذف الطلبات المرفوضة تلقائياً بعد هذا العدد من الأيام.
    deleteDeniedAfter: 7,

    // حذف الطلبات المقبولة تلقائياً بعد هذا العدد من الأيام.
    deleteApprovedAfter: 30,

    // معرفات الأدوار المسموح لها بإدارة الطلبات.
    managerRoles: [], // سيتم ملؤها من البيئة أو قاعدة البيانات
  },

  // =========================
  // ألوان الـ Embed والعلامة التجارية
  // =========================
  // مهم: هذا هو المصدر الوحيد الحقيقي لجميع ألوان البوت
  embeds: {
    colors: {
      // الألوان الرئيسية للعلامة التجارية.
      primary: "#336699",
      secondary: "#2F3136",

      // ألوان الحالة القياسية لرسائل النجاح/الخطأ/التحذير/المعلومات.
      success: "#57F287",
      error: "#ED4245",
      warning: "#FEE75C",
      info: "#3498DB",

      // ألوان مساعدة محايدة.
      light: "#FFFFFF",
      dark: "#202225",
      gray: "#99AAB5",

      // اختصارات لوحة ألوان ديسكورد.
      blurple: "#5865F2",
      green: "#57F287",
      yellow: "#FEE75C",
      fuchsia: "#EB459E",
      red: "#ED4245",
      black: "#000000",

      // ألوان خاصة بالميزات.
      giveaway: {
        active: "#57F287",
        ended: "#ED4245",
      },
      ticket: {
        open: "#57F287",
        claimed: "#FAA61A",
        closed: "#ED4245",
        pending: "#99AAB5",
      },
      economy: "#F1C40F",
      birthday: "#E91E63",
      moderation: "#9B59B6",

      // تعيين ألوان أولوية التذاكر.
      priority: {
        none: "#95A5A6",
        low: "#3498db",
        medium: "#2ecc71",
        high: "#f1c40f",
        urgent: "#e74c3c",
      },
    },
    footer: {
      // نص التذييل الافتراضي المستخدم في embeds البوت.
      text: "Titan Bot",
      // رابط أيقونة التذييل (null = بدون أيقونة).
      icon: null,
    },
    // رابط الصورة المصغرة الافتراضية للـ embeds (null = بدون صورة مصغرة).
    thumbnail: null,
    author: {
      // كتلة مؤلف الـ embed الافتراضية الاختيارية.
      name: null,
      icon: null,
      url: null,
    },
  },

  // =========================
  // إعدادات الاقتصاد
  // =========================
  economy: {
    currency: {
      // اسم العملة المعروض.
      name: "كوينز",
      // اسم الجمع المعروض.
      namePlural: "كوينز",
      // رمز العملة المعروض في الأرصدة.
      symbol: "$"。
    },

    // الرصيد الابتدائي للمستخدمين الجدد.
    startingBalance: 0,

    // الحد الأقصى لمبلغ البنك قبل الترقيات (إذا كانت الترقيات مستخدمة).
    baseBankCapacity: 100000,

    // مقدار مكافأة اليومية.
    dailyAmount: 100,

    // نطاق الدفع العشوائي لأمر العمل.
    workMin: 10,
    workMax: 100,

    // نطاق الدفع العشوائي لأمر التسول.
    begMin: 5,
    begMax: 50,

    // فترات تبريد الأوامر (بالملي ثانية).
    cooldowns: {
      daily: 24 * 60 * 60 * 1000,
      work: 60 * 60 * 1000,
      crime: 2 * 60 * 60 * 1000,
      rob: 4 * 60 * 60 * 1000,
    },

    // فرصة النجاح عند السطو (0.4 = 40%).
    robSuccessRate: 0.4,

    // مدة السجن بعد فشل السطو (بالملي ثانية).
    // 3600000 = 1 ساعة.
    robFailJailTime: 3600000,
  },

  // =========================
  // إعدادات المتجر
  // =========================
  // أضف الإعدادات الافتراضية للمتجر هنا عند الحاجة.
  shop: {

  },

  // =========================
  // نظام التذاكر
  // =========================
  tickets: {
    // معرف الفئة حيث تُنشأ التذاكر الجديدة (null = بدون فئة إجبارية).
    defaultCategory: null,

    // معرفات الأدوار المسموح لها بإدارة/دعم التذاكر.
    supportRoles: [],

    // خيارات الأولوية التي يمكن للمستخدمين/الطاقم تعيينها.
    priorities: {
      none: {
        emoji: "⚪",
        color: "#95A5A6",
        label: "بدون",
      },
      low: {
        emoji: "🟢",
        color: "#2ECC71",
        label: "منخفضة",
      },
      medium: {
        emoji: "🟡",
        color: "#F1C40F",
        label: "متوسطة",
      },
      high: {
        emoji: "🔴",
        color: "#E74C3C",
        label: "عالية",
      },
      urgent: {
        emoji: "🚨",
        color: "#E91E63",
        label: "عاجلة",
      },
    },

    // الأولوية الافتراضية للتذاكر الجديدة.
    defaultPriority: "none",

    // معرف الفئة حيث تُؤرشف التذاكر المغلقة.
    archiveCategory: null,

    // معرف القناة حيث تُرسل سجلات التذاكر.
    logChannel: null,
  },

  // =========================
  // إعدادات الهدايا
  // =========================
  giveaways: {
    // المدة الافتراضية للهدايا بالملي ثانية.
    // 86400000 = 24 ساعة.
    defaultDuration: 86400000,

    // نطاق عدد الفائزين المسموح به.
    minimumWinners: 1,
    maximumWinners: 10,

    // نطاق مدة الهدايا المسموح به بالملي ثانية.
    // 300000 = 5 دقائق.
    minimumDuration: 300000,
    // 2592000000 = 30 يوماً.
    maximumDuration: 2592000000,

    // معرفات الأدوار المسموح لها بإجراء الهدايا.
    allowedRoles: [],

    // معرفات الأدوار التي تتجاوز قيود الهدايا.
    bypassRoles: [],
  },

  // =========================
  // إعدادات أعياد الميلاد
  // =========================
  birthday: {
    // معرف الدور الممنوح للمستخدمين في عيد ميلادهم.
    defaultRole: null,

    // معرف القناة حيث تُنشر إعلانات أعياد الميلاد.
    announcementChannel: null,

    // المنطقة الزمنية المستخدمة لحساب تواريخ أعياد الميلاد.
    timezone: "UTC",
  },

  // =========================
  // إعدادات التحقق
  // =========================
  verification: {
    // الرسالة المعروضة عند نشر لوحة التحقق.
    defaultMessage: "اضغط على الزر أدناه للتحقق من نفسك والحصول على صلاحية الوصول إلى السيرفر!",

    // النص على زر التحقق.
    defaultButtonText: "تحقق",

    // سلوك التحقق التلقائي.
    autoVerify: {
      // كيف يقرر التحقق التلقائي من يتم الموافقة عليه تلقائياً:
      // - "none"        = الجميع يتم التحقق منهم فوراً
      // - "account_age" = يجب أن يكون الحساب أقدم من الأيام المحددة
      // - "server_size" = التحقق التلقائي من الجميع فقط في السيرفرات الأصغر
      defaultCriteria: "none",

      // الأيام المستخدمة عندما يكون `defaultCriteria` هو `account_age`.
      defaultAccountAgeDays: 7,

      // عتبة عدد الأعضاء المستخدمة عندما يكون `defaultCriteria` هو `server_size`.
      // مثال: 1000 يعني التحقق التلقائي إذا كان السيرفر يحتوي على أقل من 1000 عضو.
      serverSizeThreshold: 1000,

      // حدود السلامة المسموح بها لمتطلبات عمر الحساب.
      // 1 = الحد الأدنى لليوم، 365 = الحد الأقصى للأيام.
      minAccountAge: 1,
      maxAccountAge: 365,

      // إذا كان true، يتلقى المستخدم رسالة خاصة بعد التحقق.
      sendDMNotification: true,

      // أوصاف قابلة للقراءة البشرية لكل وضع معايير.
      criteria: {
        account_age: "يجب أن يكون الحساب أقدم من الأيام المحددة",
        server_size: "جميع المستخدمين إذا كان السيرفر يحتوي على أقل من 1000 عضو",
        none: "جميع المستخدمين فوراً"
      }
    },

    // الحد الأدنى للوقت بين محاولات التحقق (بالملي ثانية).
    // 5000 = 5 ثوانٍ.
    verificationCooldown: 5000,

    // الحد الأقصى للمحاولات الفاشلة المسموح بها في نافذة الوقت أدناه.
    maxVerificationAttempts: 3,

    // نافذة الوقت لحساب المحاولات (بالملي ثانية).
    // 60000 = 1 دقيقة.
    attemptWindow: 60000,

    // حدود السلامة في الذاكرة (تساعد في تجنب نمو الذاكرة غير المحدود).
    maxCooldownEntries: 10000,
    maxAttemptEntries: 10000,
    // تكرار تنظيف خرائط فترات التبريد/المحاولات (بالملي ثانية).
    // 300000 = 5 دقائق.
    cooldownCleanupInterval: 300000,
    // الحجم الأقصى لبيانات التعريف لإدخالات التدقيق (بالبايت).
    maxAuditMetadataBytes: 4096,
    // الحد الأقصى لعدد إدخالات التدقيق المحفوظة في الذاكرة.
    maxInMemoryAuditEntries: 1000,
    // إذا كان true، سجّل كل إجراء تحقق.
    logAllVerifications: true,
    // إذا كان true، احتفظ بسجل تدقيق التحقق.
    keepAuditTrail: true,
  },

  // =========================
  // رسائل الترحيب / الوداع
  // =========================
  welcome: {
    // قالب الترحيب المنشور عند انضمام مستخدم.
    // العناصر النائبة: {user}, {server}, {memberCount}
    defaultWelcomeMessage:
      "أهلاً بك {user} في {server}! أصبح لدينا الآن {memberCount} عضو!",
    // قالب الوداع المنشور عند مغادرة مستخدم.
    // العناصر النائبة: {user}, {memberCount}
    defaultGoodbyeMessage:
      "غادر {user} السيرفر. أصبح لدينا الآن {memberCount} عضو.",
    // معرف القناة لرسائل الترحيب.
    defaultWelcomeChannel: null,
    // معرف القناة لرسائل الوداع.
    defaultGoodbyeChannel: null,
  },

  // =========================
  // قنوات العدادات
  // =========================
  counters: {
    defaults: {
      // قوالب التسمية/الوصف الافتراضية لإدخالات العداد.
      name: "عداد {name}",
      description: "عداد {name} في السيرفر",
      // نوع القناة المستخدم للعدادات (عادةً "voice").
      type: "voice",
      // تنسيق اسم القناة. يتم استبدال `{count}` تلقائياً.
      channelName: "{name}-{count}",
    },
    permissions: {
      // الصلاحيات المرفوضة افتراضياً لقناة العداد.
      deny: ["VIEW_CHANNEL"],
      // الصلاحيات المسموح بها افتراضياً لقناة العداد.
      allow: ["VIEW_CHANNEL", "CONNECT", "SPEAK"],
    },
    messages: {
      // رسائل الاستجابة الافتراضية لإجراءات العداد.
      created: "✅ تم إنشاء العداد **{name}**",
      deleted: "🗑️ تم حذف العداد **{name}**",
      updated: "🔄 تم تحديث العداد **{name}**",
    },
    types: {
      // أنواع العدادات المدمجة وكيفية حساب كل عدد.
      members: {
        name: "👥 الأعضاء",
        description: "إجمالي الأعضاء في السيرفر",
        getCount: (guild) => guild.memberCount.toString(),
      },
      bots: {
        name: "🤖 البوتات",
        description: "إجمالي حسابات البوتات في السيرفر",
        getCount: (guild) =>
          guild.members.cache.filter((m) => m.user.bot).size.toString(),
      },
      members_only: {
        name: "👤 البشر",
        description: "إجمالي الأعضاء البشر (غير البوتات)",
        getCount: (guild) =>
          guild.members.cache.filter((m) => !m.user.bot).size.toString(),
      },
    },
  },

  // =========================
  // رسائل البوت العامة
  // =========================
  messages: {
    noPermission: "ليس لديك صلاحية لاستخدام هذا الأمر.",
    cooldownActive: "يرجى الانتظار {time} قبل استخدام هذا الأمر مرة أخرى.",
    errorOccurred: "حدث خطأ أثناء تنفيذ هذا الأمر.",
    missingPermissions:
      "أفتقر إلى الصلاحيات المطلوبة لأداء هذا الإجراء.",
    commandDisabled: "تم تعطيل هذا الأمر.",
    maintenanceMode: "البوت في وضع الصيانة حالياً.",
  },

  // =========================
  // تبديل الميزات
  // =========================
  // عيّن أي ميزة إلى `false` لتعطيلها عالمياً.
  features: {
    // الأنظمة الأساسية.
    economy: true,
    leveling: true,
    moderation: true,
    logging: true,
    welcome: true,

    // أنظمة تفاعل المجتمع.
    tickets: true,
    giveaways: true,
    birthday: true,
    counter: true,

    // أنظمة الأمان والخدمة الذاتية.
    verification: true,
    reactionRoles: true,
    joinToCreate: true,

    // وحدات الأدوات/جودة الحياة.
    voice: true,
    search: true,
    tools: true,
    utility: true,
    community: true,
    fun: true,
    music: true,
  },
};

export function validateConfig(config) {
  const errors = [];

  if (process.env.NODE_ENV !== 'production') {
    logger.debug('فحص متغيرات البيئة:');
    logger.debug('DISCORD_TOKEN موجود:', !!process.env.DISCORD_TOKEN);
    logger.debug('TOKEN موجود:', !!process.env.TOKEN);
    logger.debug('CLIENT_ID موجود:', !!process.env.CLIENT_ID);
    logger.debug('GUILD_ID موجود:', !!process.env.GUILD_ID);
    logger.debug('POSTGRES_HOST موجود:', !!process.env.POSTGRES_HOST);
    logger.debug('NODE_ENV:', process.env.NODE_ENV);
  }

  if (!process.env.DISCORD_TOKEN && !process.env.TOKEN) {
    errors.push("رمز البوت مطلوب (متغير البيئة DISCORD_TOKEN أو TOKEN)");
  }

  if (!process.env.CLIENT_ID) {
    errors.push("معرف العميل مطلوب (متغير البيئة CLIENT_ID)");
  }

  if (process.env.NODE_ENV === 'production') {
    // رابط اتصال كامل (DATABASE_URL / POSTGRES_URL) يفي بجميع متطلبات
    // Postgres، مطابقاً لكيفية حل تكوين المجموعة في src/config/database/postgres.js.
    const hasConnectionUrl = Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL);

    if (!hasConnectionUrl) {
      if (!process.env.POSTGRES_HOST) {
        errors.push("اتصال PostgreSQL مطلوب في بيئة الإنتاج (عيّن DATABASE_URL/POSTGRES_URL، أو POSTGRES_HOST)");
      }
      if (!process.env.POSTGRES_USER) {
        errors.push("مستخدم PostgreSQL مطلوب في بيئة الإنتاج (عيّن DATABASE_URL/POSTGRES_URL، أو POSTGRES_USER)");
      }
      if (!process.env.POSTGRES_PASSWORD) {
        errors.push("كلمة مرور PostgreSQL مطلوبة في بيئة الإنتاج (عيّن DATABASE_URL/POSTGRES_URL، أو POSTGRES_PASSWORD)");
      }
    }
  }

  return errors;
}

const configErrors = validateConfig(botConfig);
if (configErrors.length > 0) {
  logger.error("أخطاء في تكوين البوت:", configErrors.join("\n"));
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}

export const BotConfig = botConfig;

const COMMAND_CATEGORY_FEATURE_MAP = {
  birthday: "birthday",
  community: "community",
  economy: "economy",
  fun: "fun",
  giveaway: "giveaways",
  jointocreate: "joinToCreate",
  leveling: "leveling",
  logging: "logging",
  moderation: "moderation",
  music: "music",
  reaction_roles: "reactionRoles",
  search: "search",
  serverstats: "counter",
  ticket: "tickets",
  tools: "tools",
  utility: "utility",
  verification: "verification",
  welcome: "welcome",
};

function normalizeCategoryKey(category) {
  return String(category || "").trim().toLowerCase().replace(/\s+/g, "_");
}

export function getCommandPrefix() {
  return botConfig.commands?.prefix ?? "!";
}

export function getBotOwners() {
  return (botConfig.commands?.owners ?? [])
    .map((id) => String(id).trim())
    .filter(Boolean);
}

export function isBotOwner(userId) {
  if (!userId) {
    return false;
  }

  return getBotOwners().includes(String(userId));
}

export function isMaintenanceMode() {
  return botConfig.commands?.maintenanceMode === true;
}

export function getBotMessage(key, replacements = {}) {
  let message = botConfig.messages?.[key] || key;

  for (const [placeholder, value] of Object.entries(replacements)) {
    message = message.replace(new RegExp(`\\{${placeholder}\\}`, "g"), String(value));
  }

  return message;
}

export function isFeatureEnabled(featureKey) {
  if (!featureKey) {
    return true;
  }

  return botConfig.features?.[featureKey] !== false;
}

export function isCommandCategoryEnabled(category) {
  const normalized = normalizeCategoryKey(category);

  if (!normalized || normalized === "core") {
    return true;
  }

  const featureKey = COMMAND_CATEGORY_FEATURE_MAP[normalized];
  if (!featureKey) {
    return true;
  }

  return isFeatureEnabled(featureKey);
}

export function getApplicationStatusColor(status) {
  const colors = botConfig.applications?.statusColors || {};
  const hex = colors[status];
  return hex ? getColor(hex) : getColor(status === "approved" ? "success" : status === "denied" ? "error" : "warning");
}

export function getDefaultApplicationQuestions() {
  return (botConfig.applications?.defaultQuestions || []).map((entry) =>
    typeof entry === "string" ? entry : entry.question,
  ).filter(Boolean);
}

export function getColor(path, fallback = "#99AAB5") {
  
  if (typeof path === "number") return path;
  if (typeof path === "string" && path.startsWith("#")) {
    
    return parseInt(path.replace("#", ""), 16);
  }
  const result = path
    .split(".")
    .reduce(
      (obj, key) => (obj && obj[key] !== undefined ? obj[key] : fallback),
      botConfig.embeds.colors,
    );
  
  if (typeof result === "string" && result.startsWith("#")) {
    return parseInt(result.replace("#", ""), 16);
  }
  return result;
}

export function getRandomColor() {
  const colors = Object.values(botConfig.embeds.colors).flatMap((color) =>
    typeof color === "string" ? color : Object.values(color),
  );
  return colors[Math.floor(Math.random() * colors.length)];
}

export default botConfig;
