const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');

const app = express();
const port = 3000;

// إعداد رفع الملفات مؤقتاً
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// إعداد عميل واتساب
const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    console.log('امسح رمز الـ QR التالي برقم الواتساب الخاص بك:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('تم اتصال الواتساب بنجاح وجاهز للإرسال!');
});

client.initialize();

// نقطة اختبار للسيرفر
app.get('/', (req, res) => {
    res.send('مرحباً بك، نظام ربط الواتساب والإكسل يعمل بنجاح.');
});

app.listen(port, () => {
    console.log(`السيرفر يعمل على الرابط: http://localhost:${port}`);
});

