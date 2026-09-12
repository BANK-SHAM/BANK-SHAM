<?php
// السماح بقبول الطلبات
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // استقبال البيانات المرسلة من النموذج
    $service = htmlspecialchars($_POST['service'] ?? '');
    $link = filter_var($_POST['link'] ?? '', FILTER_SANITIZE_URL);
    $quantity = intval($_POST['quantity'] ?? 0);

    // التحقق من صحة البيانات الأساسية
    if (empty($service) || empty($link) || $quantity <= 0) {
        echo json_encode([
            'status' => 'error',
            'message' => 'الرجاء التأكد من تعبئة جميع الحقول بشكل صحيح.'
        ]);
        exit;
    }

    // هنا يمكنك لاحقاً إضافة الكود الخاص بإرسال الطلب إلى API مزود الخدمة (SMM Panel API)
    // أو حفظه في قاعدة بيانات (Database)

    // إرسال رد نجاح مؤقت للواجهة
    echo json_encode([
        'status' => 'success',
        'message' => 'تم استلام طلبك بنجاح وجاري معالجته!',
        'data' => [
            'service' => $service,
            'link' => $link,
            'quantity' => $quantity
        ]
    ]);
    exit;
} else {
    echo json_encode([
        'status' => 'error',
        'message' => 'طريقة الطلب غير مسموحة.'
    ]);
}
?>

