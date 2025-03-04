const express = require("express");
const mysql = require("mysql");

const app = express();
const PORT = process.env.PORT || 3000;

// إعداد اتصال MySQL باستخدام بيانات RDS
const db = mysql.createConnection({
  host: "contactsdb-new.czuycocms0ib.ap-southeast-1.rds.amazonaws.com",
  user: "newuser",              // استخدام newuser الآن
  password: "newpassword",      // كلمة المرور الجديدة
  database: "contactsdb_mysql", // تأكد أن هذه القاعدة موجودة
  port: 3306,
  charset: "utf8mb4"
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
