const express = require("express");
const mysql = require("mysql");

const app = express();
const PORT = process.env.PORT || 3000;

// إعداد اتصال MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // ضع كلمة المرور هنا إذا كانت مُعينة
  database: 'contactsdb',
  charset: 'utf8mb4'
});

db.connect(err => {
    if (err) {
        console.error("❌ فشل الاتصال بقاعدة البيانات:", err);
    } else {
        console.log("✅ تم الاتصال بقاعدة البيانات!");
    }
});

app.get("/", (req, res) => {
    res.send("🚀 API يعمل بنجاح!");
});

app.listen(PORT, () => {
    console.log(`✅ الخادم يعمل على http://localhost:${PORT}`);
});
