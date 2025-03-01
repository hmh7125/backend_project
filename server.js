const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// استخدام body-parser لمعالجة JSON في الطلبات
app.use(bodyParser.json());

// إعداد اتصال قاعدة البيانات باستخدام pool مع تعيين charset إلى utf8mb4
const pool = mysql.createPool({
  connectionLimit: 10,
  host: 'localhost',
  user: 'root',
  password: '', // ضع كلمة المرور هنا إذا كانت مُعينة
  database: 'contactsdb',
  charset: 'utf8mb4'
});

// لكل اتصال يتم استلامه، نجبر MySQL على استخدام utf8mb4
pool.on('acquire', (connection) => {
  connection.query("SET NAMES 'utf8mb4'", (err) => {
    if (err) console.error("Error setting names on connection:", err);
  });
});

// -------------------- Endpoints --------------------

// استرجاع جميع جهات الاتصال
app.get('/api/contacts', (req, res) => {
  const sql = "SELECT * FROM contacts";
  pool.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// بحث بالاسم
app.get('/api/search/name', (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);
  const sql = "SELECT * FROM contacts WHERE name LIKE ? LIMIT 100";
  pool.query(sql, [`%${q}%`], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// بحث بالرقم
app.get('/api/search/phone', (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);
  const sql = "SELECT * FROM contacts WHERE phone_number LIKE ? LIMIT 100";
  pool.query(sql, [`%${q}%`], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// إضافة جهة اتصال جديدة (مثال)
app.post('/api/contacts', (req, res) => {
  const { name, phone_number, photo_url, is_public, owner_id } = req.body;
  const sql = "INSERT INTO contacts (name, phone_number, photo_url, is_public, owner_id) VALUES (?, ?, ?, ?, ?)";
  pool.query(sql, [name, phone_number, photo_url, is_public, owner_id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: results.insertId });
  });
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});
