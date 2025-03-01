-- جدول جهات الاتصال (استخدم النسخة المحدثة)
DROP TABLE IF EXISTS contacts;
CREATE TABLE IF NOT EXISTS contacts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    photo_url VARCHAR(255),
    is_public BOOLEAN DEFAULT 0, -- هل الرقم متاح للجميع؟
    owner_id INT -- ID المستخدم الذي أضاف الرقم
);

-- جدول الأرقام المحظورة
DROP TABLE IF EXISTS blocked_numbers;
CREATE TABLE IF NOT EXISTS blocked_numbers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    reason VARCHAR(255)
);

-- جدول سجل المكالمات
DROP TABLE IF EXISTS call_logs;
CREATE TABLE IF NOT EXISTS call_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone_number VARCHAR(20) NOT NULL,
    call_type ENUM('incoming', 'outgoing', 'missed') NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    duration INT
);

-- جدول الرسائل النصية
DROP TABLE IF EXISTS sms_messages;
CREATE TABLE IF NOT EXISTS sms_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone_number VARCHAR(20) NOT NULL,
    message_text TEXT NOT NULL,
    category ENUM('personal', 'promo', 'spam') DEFAULT 'personal',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول إعدادات الخصوصية
DROP TABLE IF EXISTS privacy_settings;
CREATE TABLE IF NOT EXISTS privacy_settings (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    is_number_hidden BOOLEAN DEFAULT 0,
    allowed_users JSON
);

-- جدول الأذونات (جديد)
DROP TABLE IF EXISTS contact_sharing_permissions;
CREATE TABLE IF NOT EXISTS contact_sharing_permissions (
    user_id INT PRIMARY KEY,
    allow_contact_access BOOLEAN DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول جهات الاتصال المشتركة (جديد)
DROP TABLE IF EXISTS shared_contacts;
CREATE TABLE IF NOT EXISTS shared_contacts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    contact_id INT,
    shared_by_user_id INT,
    shared_with_user_id INT,
    FOREIGN KEY (contact_id) REFERENCES contacts(id)
);
