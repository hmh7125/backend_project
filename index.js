// index.js
require('dotenv').config(); // تحميل متغيرات البيئة من ملف .env

const express = require('express');
const mysql = require('mysql2/promise'); // استخدام mysql2 مع Promise API
const morgan = require('morgan');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// إعداد الـ Middleware
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// إعداد مصادقة بسيطة (مثال)
// إذا كنت تريد حماية بعض نقاط النهاية الحساسة، يمكنك تحديد API_KEY في ملف .env
function simpleAuth(req, res, next) {
  const token = req.headers['x-api-key'];
  if (process.env.API_KEY && token !== process.env.API_KEY) {
    return res.status(401).json({ error: 'غير مصرح بالوصول' });
  }
  next();
}

// إنشاء pool للاتصالات بقاعدة البيانات مع بعض الإعدادات
const pool = mysql.createPool({
  host: process.env.DB_HOST,           // عنوان قاعدة البيانات (RDS)
  user: process.env.DB_USER,           // اسم المستخدم
  password: process.env.DB_PASSWORD,   // كلمة المرور
  database: process.env.DB_NAME,       // اسم قاعدة البيانات
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000 // مهلة الاتصال 10 ثواني
  // ssl: { rejectUnauthorized: false } // فعّل هذا الخيار إذا كان الخادم يتطلب SSL
});

// دالة مساعدة لتغليف الاستعلامات مع مؤقت (timeout)
async function queryWithTimeout(query, params, timeout = 10000) {
  return Promise.race([
    pool.query(query, params),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('انتهت مهلة الاستعلام')), timeout)
    )
  ]);
}

// دالة اختبار الاتصال بقاعدة البيانات مع آلية إعادة المحاولة
async function testDBConnection(retries = 3, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await pool.getConnection();
      console.log("✅ تم الاتصال بقاعدة البيانات!");
      connection.release();
      return;
    } catch (error) {
      console.error(`❌ فشل الاتصال بقاعدة البيانات (محاولة ${i + 1}):`, error.message);
      if (i < retries - 1) {
        console.log(`إعادة المحاولة بعد ${delay / 1000} ثانية...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        process.exit(1);
      }
    }
  }
}
testDBConnection();

// إضافة مستمع SIGTERM للتعامل مع الإنهاء بلطف
process.on('SIGTERM', () => {
  console.log("استلام إشارة SIGTERM، جاري الإنهاء بلطف...");
  process.exit(0);
});

// نقطة نهاية أساسية لاختبار عمل الـ API
app.get("/", (req, res) => {
  res.send("🚀 API يعمل بنجاح!");
});

// --- نقاط النهاية الخاصة بجهات الاتصال ---

// Endpoint للبحث في جدول nambers_thabeet
app.get("/api/contacts/search", simpleAuth, async (req, res, next) => {
  let { q, page, limit, type } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'يجب تقديم معلمة البحث "q".' });
  }
  // تحقق من نوع البحث إذا كان 'phone' أو 'name'
  let searchField = "phone";
  if (type && type.toLowerCase() === "name") {
    searchField = "names";
  }
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 100;
  const offset = (page - 1) * limit;
  console.log("طلب بحث وارد:", { q, type, page, limit });
  try {
    const searchTerm = `%${q}%`;
    const query = `
      SELECT * FROM nambers_thabeet 
      WHERE ${searchField} LIKE ?
      LIMIT ? OFFSET ?
    `;
    const [results] = await queryWithTimeout(query, [searchTerm, limit, offset]);
    res.json({ page, limit, results });
  } catch (error) {
    console.error("❌ خطأ أثناء البحث:", error.message);
    next(error);
  }
});

// Endpoint لاقتراح جهات الاتصال (يُرجع قائمة الاقتراحات مباشرة)
app.get("/api/contacts/suggestions", simpleAuth, async (req, res, next) => {
  let { q, limit } = req.query;
  if (!q) {
    return res.status(400).send("يجب تقديم معلمة البحث 'q'.");
  }
  limit = parseInt(limit) || 5;
  try {
    const searchTerm = `%${q}%`;
    const query = `
      SELECT * FROM nambers_thabeet 
      WHERE phone LIKE ? OR names LIKE ?
      LIMIT ?
    `;
    const [results] = await queryWithTimeout(query, [searchTerm, searchTerm, limit]);
    // إرجاع القائمة مباشرة
    res.json(results);
  } catch (error) {
    console.error("❌ خطأ أثناء استرجاع الاقتراحات:", error.message);
    next(error);
  }
});

// Endpoint لاسترجاع قائمة الأرقام مع الترقيم
app.get("/api/numbers", simpleAuth, async (req, res, next) => {
  let { page, limit } = req.query;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 100;
  const offset = (page - 1) * limit;
  try {
    const query = "SELECT phone FROM nambers_thabeet LIMIT ? OFFSET ?";
    const [results] = await queryWithTimeout(query, [limit, offset]);
    res.json({ page, limit, numbers: results });
  } catch (error) {
    console.error("❌ خطأ أثناء جلب الأرقام:", error.message);
    next(error);
  }
});

// Endpoint لإضافة جهة اتصال فردية
app.post("/api/contacts", simpleAuth, async (req, res, next) => {
  const { phone, names } = req.body;
  if (!phone || !names) {
    return res.status(400).json({ error: "يجب توفير رقم الهاتف والاسم." });
  }
  try {
    const query = "INSERT INTO nambers_thabeet (phone, names) VALUES (?, ?)";
    const [result] = await queryWithTimeout(query, [phone, names]);
    res.status(201).json({ message: "تمت إضافة جهة الاتصال بنجاح", id: result.insertId });
  } catch (error) {
    console.error("❌ خطأ أثناء إضافة جهة الاتصال:", error.message);
    next(error);
  }
});

// Endpoint لرفع دفعات جهات الاتصال (Sync) مع تحديث السجلات الموجودة لتجنب التكرار
app.post("/api/contacts/sync", simpleAuth, async (req, res, next) => {
  console.log("🔔 تم استلام طلب رفع جهات الاتصال:", req.body);
  const { contacts } = req.body;
  if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ error: "يجب توفير قائمة جهات اتصال غير فارغة." });
  }
  try {
    const values = contacts.map(contact => [contact.phone, contact.names]);
    const query = `
      INSERT INTO nambers_thabeet (phone, names)
      VALUES ?
      ON DUPLICATE KEY UPDATE names = VALUES(names)
    `;
    const [result] = await queryWithTimeout(query, [values]);
    console.log("✅ رفع وتحديث دفعة جهات الاتصال بنجاح:", result);
    res.status(201).json({ message: "تم رفع وتحديث دفعة جهات الاتصال بنجاح", affectedRows: result.affectedRows });
  } catch (error) {
    console.error("❌ خطأ أثناء رفع دفعة جهات الاتصال:", error.message);
    next(error);
  }
});

// Middleware لمعالجة الأخطاء العامة
app.use((err, req, res, next) => {
  console.error("❌ خطأ داخلي:", err.message);
  res.status(500).json({ error: "خطأ داخلي في الخادم", details: err.message });
});

// بدء تشغيل الخادم والاستماع لجميع الأجهزة
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ الخادم يعمل على http://0.0.0.0:${PORT}`);
});
